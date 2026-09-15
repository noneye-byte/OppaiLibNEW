package db

import (
	"context"
	"database/sql"
	"errors"
)

// Moments worth coming back to.
//
// Progress answers "where was I" with one number per item that is overwritten every
// few seconds of playback. A bookmark answers "where is the part I liked", which is a
// different question: chosen rather than recorded, named, and plural — a long clip has
// more than one. Kept per user like progress, because which moment is the good one is
// an opinion.

// Bookmark is one marked moment in one item, for one user.
type Bookmark struct {
	ID        int64
	MediaID   int64
	Position  float64
	LabelEnc  []byte
	ThumbPath string // "" when no frame was grabbed
	CreatedAt int64
}

// AddBookmark records a moment. Nothing stops two marks landing on the same second:
// that is a thing people do while scrubbing, and the caller collapses it if it wants to.
func (d *DB) AddBookmark(ctx context.Context, userID, mediaID int64, position float64, labelEnc []byte, thumbPath string) (int64, error) {
	if position < 0 {
		position = 0
	}
	res, err := d.sql.ExecContext(ctx, `
		INSERT INTO bookmarks(user_id, media_id, position, label_enc, thumb_path, created_at)
		VALUES(?, ?, ?, ?, ?, ?)`,
		userID, mediaID, position, labelEnc, nullIfEmpty(thumbPath), now())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// RelabelBookmark changes what a mark is called. The frame and the position stay.
func (d *DB) RelabelBookmark(ctx context.Context, userID, id int64, labelEnc []byte) error {
	_, err := d.sql.ExecContext(ctx,
		`UPDATE bookmarks SET label_enc = ? WHERE id = ? AND user_id = ?`, labelEnc, id, userID)
	return err
}

// DeleteBookmark removes one mark. Scoped to the user so an id guessed from another
// account's list does nothing.
func (d *DB) DeleteBookmark(ctx context.Context, userID, id int64) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM bookmarks WHERE id = ? AND user_id = ?`, id, userID)
	return err
}

// GetBookmark reads one mark, for serving its frame.
func (d *DB) GetBookmark(ctx context.Context, userID, id int64) (Bookmark, error) {
	var b Bookmark
	var thumb sql.NullString
	err := d.sql.QueryRowContext(ctx, `
		SELECT id, media_id, position, label_enc, thumb_path, created_at
		FROM bookmarks WHERE id = ? AND user_id = ?`, id, userID).
		Scan(&b.ID, &b.MediaID, &b.Position, &b.LabelEnc, &thumb, &b.CreatedAt)
	if err != nil {
		return Bookmark{}, err
	}
	b.ThumbPath = thumb.String
	return b, nil
}

// BookmarksForMedia lists one item's marks in timeline order, which is the order a
// list beside the player reads in.
func (d *DB) BookmarksForMedia(ctx context.Context, userID, mediaID int64) ([]Bookmark, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, media_id, position, label_enc, thumb_path, created_at
		FROM bookmarks WHERE user_id = ? AND media_id = ?
		ORDER BY position ASC, id ASC`, userID, mediaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBookmarks(rows)
}

// BookmarksForMediaBatch reads the marks on a set of items in one query, keyed by
// media id, so a chat turn that names several items can say where the good parts
// are without a round trip per item.
func (d *DB) BookmarksForMediaBatch(ctx context.Context, userID int64, mediaIDs []int64) (map[int64][]Bookmark, error) {
	out := map[int64][]Bookmark{}
	if len(mediaIDs) == 0 {
		return out, nil
	}
	args := make([]any, 0, len(mediaIDs)+1)
	args = append(args, userID)
	for _, id := range mediaIDs {
		args = append(args, id)
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, media_id, position, label_enc, thumb_path, created_at
		FROM bookmarks WHERE user_id = ? AND media_id IN (`+placeholderList(len(mediaIDs))+`)
		ORDER BY media_id, position ASC, id ASC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list, err := scanBookmarks(rows)
	if err != nil {
		return nil, err
	}
	for _, b := range list {
		out[b.MediaID] = append(out[b.MediaID], b)
	}
	return out, nil
}

// RecentBookmarks is the user's latest marks across the whole library, newest first,
// for a "moments" shelf.
func (d *DB) RecentBookmarks(ctx context.Context, userID int64, limit int) ([]Bookmark, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, media_id, position, label_enc, thumb_path, created_at
		FROM bookmarks WHERE user_id = ?
		ORDER BY created_at DESC, id DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBookmarks(rows)
}

func scanBookmarks(rows *sql.Rows) ([]Bookmark, error) {
	var out []Bookmark
	for rows.Next() {
		var b Bookmark
		var thumb sql.NullString
		if err := rows.Scan(&b.ID, &b.MediaID, &b.Position, &b.LabelEnc, &thumb, &b.CreatedAt); err != nil {
			return nil, err
		}
		b.ThumbPath = thumb.String
		out = append(out, b)
	}
	if err := rows.Err(); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	return out, nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
