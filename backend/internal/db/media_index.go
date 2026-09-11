package db

import (
	"context"
)

// Reading the library out whole, so something above can hold an index of it.
//
// Every other lookup in media_lookup.go answers a question about a bounded slice —
// these rows, that tag, the newest N. This file answers the one question none of
// them can: what is *all* of it. That matters because titles are encrypted, so the
// only thing that can search them is a process holding the KEK, and the only way it
// can search them all is to be handed all of them once. See chat_library_index.go.
//
// Everything here is a projection, ordered by id, and paged. A library is allowed
// to be large; nothing below loads it in one slice unless the caller asks for that
// by passing a limit that covers it.

// MediaStamp is the cheap fingerprint of the library's shape.
//
// Two numbers, because between them they catch every change an index cares about
// without reading a single row: MaxID moves when something is added, and Count
// moves when something is added *or* removed. A count that has not moved while the
// max id has is an import; a count that has moved without the max id is a deletion.
// Neither notices a retitle, which is why the index that uses this also rebuilds on
// a timer and can be told outright — see libraryIndex.
type MediaStamp struct {
	Count int64
	MaxID int64
}

// Stamp reads that fingerprint. One aggregate query over the primary key, so it is
// cheap enough to ask on the chat path.
func (d *DB) MediaStamp(ctx context.Context) (MediaStamp, error) {
	var st MediaStamp
	err := d.sql.QueryRowContext(ctx,
		`SELECT COUNT(*), COALESCE(MAX(id), 0) FROM media`).Scan(&st.Count, &st.MaxID)
	return st, err
}

// BriefsAfter returns rows with an id above afterID, oldest first.
//
// Ascending and keyed on the id rather than an offset, because the caller is
// walking the whole table in pages and an OFFSET walk re-reads everything it has
// already passed. Ascending also makes the last id of a page the cursor for the
// next one, with no state kept between calls.
func (d *DB) BriefsAfter(ctx context.Context, afterID int64, limit int) ([]MediaBrief, error) {
	if limit <= 0 || limit > 20000 {
		limit = 2000
	}
	rows, err := d.sql.QueryContext(ctx,
		`SELECT `+briefColumns+` FROM media m WHERE m.id > ? ORDER BY m.id ASC LIMIT ?`, afterID, limit)
	if err != nil {
		return nil, err
	}
	return scanBriefs(rows)
}

// AllTagNames returns every media row's tag names, keyed by media id.
//
// One sweep of the join rather than TagsForMediaBatch's bounded IN clause, because
// the caller here wants the lot: batching it would be thousands of round trips and
// a placeholder list SQLite would refuse. Names only — the index ranks on words, and
// category, source and score are nothing it can use.
func (d *DB) AllTagNames(ctx context.Context) (map[int64][]string, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT mt.media_id, t.name
		FROM media_tags mt JOIN tags t ON t.id = mt.tag_id
		ORDER BY mt.media_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64][]string{}
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		out[id] = append(out[id], name)
	}
	return out, rows.Err()
}

// IDFloor is the id of the keepNewest-th newest row, or 0 when the library holds
// fewer than that. An index with a ceiling on how much it will hold walks from here
// instead of from the beginning, so what it drops is the oldest rather than whatever
// it happened to reach first.
func (d *DB) IDFloor(ctx context.Context, keepNewest int) (int64, error) {
	if keepNewest <= 0 {
		return 0, nil
	}
	var id int64
	err := d.sql.QueryRowContext(ctx,
		`SELECT id FROM media ORDER BY id DESC LIMIT 1 OFFSET ?`, keepNewest-1).Scan(&id)
	if err != nil {
		// Fewer rows than the ceiling: there is no floor, and everything is indexable.
		return 0, nil
	}
	return id - 1, nil
}
