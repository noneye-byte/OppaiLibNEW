package db

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// Collections: a named, ordered list of library items.
//
// The tables have been in schema.sql since the first commit and nothing ever read or
// wrote them, which is why the ordering column exists and the API did not. What makes
// them worth wiring up rather than deleting is that "a list of items, in an order I
// chose" is the one thing tags cannot express: a tag says what something is, and says
// it about every item equally.
//
// Names stay plaintext, like tag names and unlike titles. That is the existing
// model's line, not a new judgement: a stolen database file already yields every tag
// on every row, so a plaintext "Best of Summer" beside them reveals nothing the same
// file did not already give up, and UNIQUE on the column is what makes a duplicate
// name a database error rather than a race between two checks. If opaque tags ever
// land (ARCHITECTURE §4 lists them as roadmap), collection names belong in the same
// change.

// ErrDuplicateName is returned when a collection name is already taken.
var ErrDuplicateName = errors.New("a collection with that name already exists")

// Collection is one list, with how many items are on it.
type Collection struct {
	ID        int64
	Name      string
	Count     int
	CreatedAt int64
	// Cover is the media id of the first item, for the tile the grid draws. Zero when
	// the collection is empty.
	Cover int64
}

// CreateCollection makes an empty collection.
func (d *DB) CreateCollection(ctx context.Context, name string) (int64, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, errors.New("a collection needs a name")
	}
	res, err := d.sql.ExecContext(ctx,
		`INSERT INTO collections(name, created_at) VALUES(?, ?)`, name, now())
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return 0, ErrDuplicateName
		}
		return 0, err
	}
	return res.LastInsertId()
}

// ListCollections returns every collection, newest first, each with its item count
// and the first item's id for a cover.
//
// One query with two joins rather than a count per collection: a sidebar that lists
// twenty collections should cost one round trip, not twenty-one.
func (d *DB) ListCollections(ctx context.Context) ([]Collection, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT c.id, c.name, c.created_at,
		       COUNT(ci.media_id),
		       COALESCE((SELECT ci2.media_id FROM collection_items ci2
		                 WHERE ci2.collection_id = c.id
		                 ORDER BY ci2.position ASC, ci2.media_id ASC LIMIT 1), 0)
		FROM collections c
		LEFT JOIN collection_items ci ON ci.collection_id = c.id
		GROUP BY c.id
		ORDER BY c.created_at DESC, c.id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Collection
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedAt, &c.Count, &c.Cover); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// GetCollection reads one collection's row. Returns sql.ErrNoRows if it is gone.
func (d *DB) GetCollection(ctx context.Context, id int64) (*Collection, error) {
	c := &Collection{}
	err := d.sql.QueryRowContext(ctx, `
		SELECT c.id, c.name, c.created_at,
		       (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id),
		       COALESCE((SELECT ci2.media_id FROM collection_items ci2
		                 WHERE ci2.collection_id = c.id
		                 ORDER BY ci2.position ASC, ci2.media_id ASC LIMIT 1), 0)
		FROM collections c WHERE c.id = ?`, id).
		Scan(&c.ID, &c.Name, &c.CreatedAt, &c.Count, &c.Cover)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// RenameCollection changes a collection's name.
func (d *DB) RenameCollection(ctx context.Context, id int64, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("a collection needs a name")
	}
	res, err := d.sql.ExecContext(ctx, `UPDATE collections SET name = ? WHERE id = ?`, name, id)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			return ErrDuplicateName
		}
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeleteCollection removes the list. The items are untouched — a collection is a
// view of the library, not a container for it, so deleting one must never look like
// deleting what is on it. collection_items rows cascade.
func (d *DB) DeleteCollection(ctx context.Context, id int64) error {
	res, err := d.sql.ExecContext(ctx, `DELETE FROM collections WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// AddToCollection appends media to the end of a collection, skipping anything
// already on it. Returns how many were actually added.
//
// Appending, not inserting: the position of what is already there does not move
// because something new arrived, and adding the same item twice is a no-op rather
// than an error — the caller is a multi-select that may overlap what it did last
// time.
func (d *DB) AddToCollection(ctx context.Context, collectionID int64, mediaIDs []int64) (int, error) {
	if len(mediaIDs) == 0 {
		return 0, nil
	}
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var next int64
	if err := tx.QueryRowContext(ctx,
		`SELECT COALESCE(MAX(position), -1) + 1 FROM collection_items WHERE collection_id = ?`,
		collectionID).Scan(&next); err != nil {
		return 0, err
	}
	added := 0
	for _, mediaID := range mediaIDs {
		res, err := tx.ExecContext(ctx, `
			INSERT OR IGNORE INTO collection_items(collection_id, media_id, position)
			VALUES(?, ?, ?)`, collectionID, mediaID, next)
		if err != nil {
			return 0, err
		}
		if n, _ := res.RowsAffected(); n > 0 {
			added++
			next++
		}
	}
	return added, tx.Commit()
}

// RemoveFromCollection takes one item off a list.
func (d *DB) RemoveFromCollection(ctx context.Context, collectionID, mediaID int64) error {
	res, err := d.sql.ExecContext(ctx,
		`DELETE FROM collection_items WHERE collection_id = ? AND media_id = ?`,
		collectionID, mediaID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// ReorderCollection writes a new order, given the media ids in the order wanted.
//
// The list is rewritten whole, from the named ids followed by everything else in the
// order it already had. That is what makes a partial reorder safe: the caller may
// send only the page it can see, ids that are no longer on the collection are
// dropped, and positions come out dense — 0..n-1, no gaps and no two rows sharing
// one, which is the state a "move up" needs to be able to rely on.
func (d *DB) ReorderCollection(ctx context.Context, collectionID int64, mediaIDs []int64) error {
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx,
		`SELECT media_id FROM collection_items WHERE collection_id = ?
		 ORDER BY position ASC, media_id ASC`, collectionID)
	if err != nil {
		return err
	}
	var existing []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		existing = append(existing, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	onList := make(map[int64]bool, len(existing))
	for _, id := range existing {
		onList[id] = true
	}
	placed := make(map[int64]bool, len(mediaIDs))
	order := make([]int64, 0, len(existing))
	for _, id := range mediaIDs {
		if onList[id] && !placed[id] {
			placed[id] = true
			order = append(order, id)
		}
	}
	for _, id := range existing {
		if !placed[id] {
			order = append(order, id)
		}
	}

	for i, id := range order {
		if _, err := tx.ExecContext(ctx,
			`UPDATE collection_items SET position = ? WHERE collection_id = ? AND media_id = ?`,
			i, collectionID, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// CollectionMediaIDs is the ids on a collection, in its order. Paged, because a
// collection is allowed to be as large as the library.
func (d *DB) CollectionMediaIDs(ctx context.Context, collectionID int64, limit, offset int) ([]int64, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT media_id FROM collection_items
		WHERE collection_id = ?
		ORDER BY position ASC, media_id ASC
		LIMIT ? OFFSET ?`, collectionID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// CollectionsOfMedia is which collections an item is on, so the viewer can show it
// and offer to take it off.
func (d *DB) CollectionsOfMedia(ctx context.Context, mediaID int64) ([]Collection, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT c.id, c.name, c.created_at
		FROM collections c
		JOIN collection_items ci ON ci.collection_id = c.id
		WHERE ci.media_id = ?
		ORDER BY c.name ASC`, mediaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Collection
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
