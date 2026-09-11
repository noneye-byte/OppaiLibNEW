package db

import (
	"context"
	"database/sql"
	"strings"
)

// Cheap lookups for naming an item rather than rendering it.
//
// Libby links things out of the library by name ("go watch the one you saved on
// Tuesday"), and the browse-together session needs to know what is on screen. Both
// want the same thing: enough of a row to rank it against a query and print its
// title, for a lot more rows than a library page ever asks for. Pulling full
// MediaRows for that would drag every blob path, hash, and encrypted note along
// with it, so this is the narrow projection.
//
// Titles stay encrypted here. Decryption needs the KEK, which lives in the API
// layer, so the caller opens TitleEnc itself — see chat_library_index.go, which
// decrypts the collection once and keeps the result rather than re-reading a slice
// of it per lookup. media_index.go holds the sweep that feeds it.

// MediaBrief is the least of a row needed to name it and rank it against a query.
type MediaBrief struct {
	ID        int64
	Kind      string
	TitleEnc  []byte
	HasThumb  bool
	Favorite  bool
	Rating    int
	CreatedAt int64
}

const briefColumns = `m.id, m.kind, m.title_enc, m.thumb_path, m.favorite, m.rating, m.created_at`

func scanBriefs(rows *sql.Rows) ([]MediaBrief, error) {
	defer rows.Close()
	var out []MediaBrief
	for rows.Next() {
		var b MediaBrief
		var thumb sql.NullString
		var fav int
		if err := rows.Scan(&b.ID, &b.Kind, &b.TitleEnc, &thumb, &fav, &b.Rating, &b.CreatedAt); err != nil {
			return nil, err
		}
		b.HasThumb = thumb.Valid && thumb.String != ""
		b.Favorite = fav != 0
		out = append(out, b)
	}
	return out, rows.Err()
}

// BriefsByIDs resolves specific rows, order unspecified. Used to turn the ids a
// client says are on screen into titles and tags it cannot forge.
func (d *DB) BriefsByIDs(ctx context.Context, ids []int64) ([]MediaBrief, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	placeholders := strings.TrimPrefix(strings.Repeat(",?", len(ids)), ",")
	rows, err := d.sql.QueryContext(ctx,
		`SELECT `+briefColumns+` FROM media m WHERE m.id IN (`+placeholders+`)`, args...)
	if err != nil {
		return nil, err
	}
	return scanBriefs(rows)
}

// BriefsWithTag returns rows carrying one exact tag, newest first.
//
// Exact rather than the substring matching Libby's name lookup does: this answers
// "which items carry this specific label", which is a different question from "which
// items are about this word". Its caller is Libby's identity tag (character:libby),
// where a near-miss would be an item wrongly claimed to be a picture of her.
func (d *DB) BriefsWithTag(ctx context.Context, name string, limit int) ([]MediaBrief, error) {
	if strings.TrimSpace(name) == "" {
		return nil, nil
	}
	if limit <= 0 || limit > 5000 {
		limit = 500
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT `+briefColumns+` FROM media m
		JOIN media_tags mt ON mt.media_id = m.id
		JOIN tags t ON t.id = mt.tag_id
		WHERE lower(t.name) = lower(?)
		ORDER BY m.created_at DESC LIMIT ?`, name, limit)
	if err != nil {
		return nil, err
	}
	return scanBriefs(rows)
}
