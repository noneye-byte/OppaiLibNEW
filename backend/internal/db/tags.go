package db

import (
	"context"
	"strings"

	"github.com/youruser/oppailib/internal/models"
)

// SearchTagNames feeds prompt autocomplete from tags this installation has already
// seen. The imagegen package merges these with its built-in Booru baseline.
func (d *DB) SearchTagNames(ctx context.Context, query string, limit int) ([]string, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT DISTINCT name FROM tags
		WHERE lower(name) LIKE '%' || lower(?) || '%'
		ORDER BY CASE WHEN lower(name) LIKE lower(?) || '%' THEN 0 ELSE 1 END, name
		LIMIT ?`, query, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		out = append(out, name)
	}
	return out, rows.Err()
}

// ensureTag returns the id of the (name, category) tag, creating it if absent.
func (d *DB) ensureTag(ctx context.Context, name, category string) (int64, error) {
	var tagID int64
	err := d.sql.QueryRowContext(ctx,
		`SELECT id FROM tags WHERE name = ? AND category = ?`, name, category).Scan(&tagID)
	if err == nil {
		return tagID, nil
	}
	res, err := d.sql.ExecContext(ctx,
		`INSERT INTO tags(name, category) VALUES(?,?)`, name, category)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// AddTag ensures the (name, category) tag exists and links it to a media row.
// source is manual|ai|scrape; score is optional AI confidence.
func (d *DB) AddTag(ctx context.Context, mediaID int64, name, category, source string, score float64) error {
	if category == "" {
		category = "general"
	}
	tagID, err := d.ensureTag(ctx, name, category)
	if err != nil {
		return err
	}
	_, err = d.sql.ExecContext(ctx, `
		INSERT INTO media_tags(media_id, tag_id, source, score) VALUES(?,?,?,?)
		ON CONFLICT(media_id, tag_id) DO UPDATE SET source=excluded.source, score=excluded.score`,
		mediaID, tagID, source, nullFloat(score))
	return err
}

// RemoveTag unlinks a tag (by name, any category) from a media row. The tags
// row itself is left in place — it may still be referenced by other media.
// Any timeline moments recorded for that tag go with it.
func (d *DB) RemoveTag(ctx context.Context, mediaID int64, name string) error {
	_, err := d.sql.ExecContext(ctx, `
		DELETE FROM media_tags
		WHERE media_id = ? AND tag_id IN (SELECT id FROM tags WHERE name = ?)`,
		mediaID, name)
	if err != nil {
		return err
	}
	_, err = d.sql.ExecContext(ctx, `
		DELETE FROM media_tag_frames
		WHERE media_id = ? AND tag_id IN (SELECT id FROM tags WHERE name = ?)`,
		mediaID, name)
	return err
}

// Moment is one timestamp at which a tag was detected in a time-based item.
type Moment struct {
	At    float64 // seconds from the start of the clip
	Score float64 // ai confidence at that frame
}

// ClearTagMoments drops every recorded timeline moment for a media row. Called
// before a re-tag so offsets from an earlier run (a different model, a different
// frame count) can't survive alongside the new tags.
func (d *DB) ClearTagMoments(ctx context.Context, mediaID int64) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM media_tag_frames WHERE media_id = ?`, mediaID)
	return err
}

// SetTagMoments records the timestamps at which one tag was seen. The tag must
// already be linked to the media row (AddTag) for it to surface in the API.
func (d *DB) SetTagMoments(ctx context.Context, mediaID int64, name, category string, moments []Moment) error {
	if category == "" {
		category = "general"
	}
	tagID, err := d.ensureTag(ctx, name, category)
	if err != nil {
		return err
	}
	for _, m := range moments {
		_, err := d.sql.ExecContext(ctx, `
			INSERT INTO media_tag_frames(media_id, tag_id, t, score) VALUES(?,?,?,?)
			ON CONFLICT(media_id, tag_id, t) DO UPDATE SET score=excluded.score`,
			mediaID, tagID, m.At, nullFloat(m.Score))
		if err != nil {
			return err
		}
	}
	return nil
}

// momentsForMedia returns, per tag id, the ascending timestamps recorded for it.
func (d *DB) momentsForMedia(ctx context.Context, mediaID int64) (map[int64][]float64, error) {
	rows, err := d.sql.QueryContext(ctx,
		`SELECT tag_id, t FROM media_tag_frames WHERE media_id = ? ORDER BY t`, mediaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64][]float64)
	for rows.Next() {
		var tagID int64
		var t float64
		if err := rows.Scan(&tagID, &t); err != nil {
			return nil, err
		}
		out[tagID] = append(out[tagID], t)
	}
	return out, rows.Err()
}

// TagsForMedia returns all tags attached to a media row, each carrying the
// timeline moments (if any) where the AI detected it.
func (d *DB) TagsForMedia(ctx context.Context, mediaID int64) ([]models.Tag, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT t.id, t.name, t.category, mt.source, COALESCE(mt.score, 0)
		FROM media_tags mt JOIN tags t ON t.id = mt.tag_id
		WHERE mt.media_id = ? ORDER BY t.category, t.name`, mediaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Category, &t.Source, &t.Score); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// A missing moments table read is not fatal — the tags themselves are the
	// answer, and the timeline is an enhancement on top of them.
	moments, err := d.momentsForMedia(ctx, mediaID)
	if err != nil {
		return out, nil
	}
	for i := range out {
		out[i].Moments = moments[out[i].ID]
	}
	return out, nil
}

// TagsForMediaBatch resolves tags for many media rows in one query, so listing a
// library page stays a fixed number of round trips rather than one per item.
// Moments are omitted: only the single-item viewer draws a timeline.
func (d *DB) TagsForMediaBatch(ctx context.Context, ids []int64) (map[int64][]models.Tag, error) {
	out := make(map[int64][]models.Tag, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	placeholders := strings.TrimPrefix(strings.Repeat(",?", len(ids)), ",")
	rows, err := d.sql.QueryContext(ctx, `
		SELECT mt.media_id, t.id, t.name, t.category, mt.source, COALESCE(mt.score, 0)
		FROM media_tags mt JOIN tags t ON t.id = mt.tag_id
		WHERE mt.media_id IN (`+placeholders+`)
		ORDER BY mt.media_id, t.category, t.name`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var mediaID int64
		var t models.Tag
		if err := rows.Scan(&mediaID, &t.ID, &t.Name, &t.Category, &t.Source, &t.Score); err != nil {
			return nil, err
		}
		out[mediaID] = append(out[mediaID], t)
	}
	return out, rows.Err()
}

func nullFloat(f float64) any {
	if f == 0 {
		return nil
	}
	return f
}
