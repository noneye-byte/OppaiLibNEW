package db

import (
	"context"
	"database/sql"
	"errors"
)

// Where you were in something.
//
// The progress table is as old as the schema and was never written to. What stood in
// for it was localStorage in the browser (media-meta.ts kept comic pages there), which
// means it was per-device: the page you reached on the phone was not the page the
// desktop opened on, and a video had no memory at all — every reopen started from the
// beginning, however long the thing was.
//
// Per user rather than per install, because "where I was" is not a property of the
// item. Position is deliberately untyped — seconds for a video, page index for a
// comic — since the only thing that ever compares two of them is the reader that
// wrote them.

// Progress is one item's saved position for one user.
type Progress struct {
	MediaID   int64
	Position  float64
	Duration  float64 // 0 when unknown; lets a caller show a bar without a second read
	UpdatedAt int64
}

// SetProgress records a position, replacing any earlier one.
func (d *DB) SetProgress(ctx context.Context, userID, mediaID int64, position float64) error {
	if position < 0 {
		position = 0
	}
	_, err := d.sql.ExecContext(ctx, `
		INSERT INTO progress(user_id, media_id, position, updated_at)
		VALUES(?, ?, ?, ?)
		ON CONFLICT(user_id, media_id) DO UPDATE SET
		    position = excluded.position, updated_at = excluded.updated_at`,
		userID, mediaID, position, now())
	return err
}

// ClearProgress forgets a position — what "start again" and "mark as watched" both
// come down to.
func (d *DB) ClearProgress(ctx context.Context, userID, mediaID int64) error {
	_, err := d.sql.ExecContext(ctx,
		`DELETE FROM progress WHERE user_id = ? AND media_id = ?`, userID, mediaID)
	return err
}

// GetProgress reads one saved position. A missing row is position 0, not an error:
// "never opened" and "opened, at the start" are the same thing to a reader.
func (d *DB) GetProgress(ctx context.Context, userID, mediaID int64) (Progress, error) {
	p := Progress{MediaID: mediaID}
	err := d.sql.QueryRowContext(ctx, `
		SELECT p.position, p.updated_at, COALESCE(m.duration, 0)
		FROM progress p JOIN media m ON m.id = p.media_id
		WHERE p.user_id = ? AND p.media_id = ?`, userID, mediaID).
		Scan(&p.Position, &p.UpdatedAt, &p.Duration)
	if errors.Is(err, sql.ErrNoRows) {
		return Progress{MediaID: mediaID}, nil
	}
	if err != nil {
		return Progress{MediaID: mediaID}, err
	}
	return p, nil
}

// ProgressForMedia reads saved positions for a page of items, keyed by media id, so
// a grid can draw a resume bar on its tiles in one query rather than one per tile.
func (d *DB) ProgressForMedia(ctx context.Context, userID int64, mediaIDs []int64) (map[int64]Progress, error) {
	out := map[int64]Progress{}
	if len(mediaIDs) == 0 {
		return out, nil
	}
	args := make([]any, 0, len(mediaIDs)+1)
	args = append(args, userID)
	for _, id := range mediaIDs {
		args = append(args, id)
	}
	placeholders := placeholderList(len(mediaIDs))
	rows, err := d.sql.QueryContext(ctx, `
		SELECT p.media_id, p.position, p.updated_at, COALESCE(m.duration, 0)
		FROM progress p JOIN media m ON m.id = p.media_id
		WHERE p.user_id = ? AND p.media_id IN (`+placeholders+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var p Progress
		if err := rows.Scan(&p.MediaID, &p.Position, &p.UpdatedAt, &p.Duration); err != nil {
			return nil, err
		}
		out[p.MediaID] = p
	}
	return out, rows.Err()
}

// ResumeIDs is what to offer to carry on with: the items this user left part-way
// through, most recently touched first.
//
// Anything at or past the finish line is left out rather than ranked lower, because
// a "continue watching" row whose first tile is something you finished last night is
// worse than an empty one. A video with no known duration cannot be judged finished,
// so it stays in on the strength of having been opened at all.
func (d *DB) ResumeIDs(ctx context.Context, userID int64, limit int) ([]int64, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT p.media_id
		FROM progress p JOIN media m ON m.id = p.media_id
		WHERE p.user_id = ?
		  AND p.position > 0
		  AND (m.duration IS NULL OR m.duration <= 0 OR p.position < m.duration * 0.97)
		ORDER BY p.updated_at DESC
		LIMIT ?`, userID, limit)
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
