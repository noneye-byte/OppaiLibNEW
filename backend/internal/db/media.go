package db

import (
	"context"
	"database/sql"
	"strings"
)

// MediaRow mirrors the media table; *_enc fields hold ciphertext.
type MediaRow struct {
	ID          int64
	Kind        string
	SHA256      string
	Size        int64
	BlobPath    string
	TitleEnc    []byte
	NotesEnc    []byte
	SourceEnc   []byte
	Rating      int
	Favorite    bool
	Duration    sql.NullFloat64
	Width       sql.NullInt64
	Height      sql.NullInt64
	PageCount   sql.NullInt64
	ThumbPath   sql.NullString
	DownloadEnc []byte
	GalleryEnc  []byte
	CreatedAt   int64
	UpdatedAt   int64
}

// InsertMedia stores a new row and returns its id. Returns the existing id and
// existed=true if a row with the same sha256 already exists (dedup).
func (d *DB) InsertMedia(ctx context.Context, m *MediaRow) (id int64, existed bool, err error) {
	err = d.sql.QueryRowContext(ctx, `SELECT id FROM media WHERE sha256 = ?`, m.SHA256).Scan(&id)
	if err == nil {
		return id, true, nil
	}
	if err != sql.ErrNoRows {
		return 0, false, err
	}
	ts := now()
	res, err := d.sql.ExecContext(ctx, `
		INSERT INTO media(kind, sha256, size, blob_path, title_enc, notes_enc, source_enc,
		                  rating, favorite, duration, width, height, page_count,
		                  download_enc, gallery_enc, created_at, updated_at)
		VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		m.Kind, m.SHA256, m.Size, m.BlobPath, m.TitleEnc, m.NotesEnc, m.SourceEnc,
		m.Rating, boolToInt(m.Favorite), m.Duration, m.Width, m.Height, m.PageCount,
		nullBytes(m.DownloadEnc), nullBytes(m.GalleryEnc), ts, ts)
	if err != nil {
		return 0, false, err
	}
	id, err = res.LastInsertId()
	return id, false, err
}

func (d *DB) GetMedia(ctx context.Context, id int64) (*MediaRow, error) {
	m := &MediaRow{}
	var fav int
	err := d.sql.QueryRowContext(ctx, `
		SELECT id, kind, sha256, size, blob_path, title_enc, notes_enc, source_enc,
		       rating, favorite, duration, width, height, page_count, thumb_path,
		       download_enc, gallery_enc, created_at, updated_at
		FROM media WHERE id = ?`, id).Scan(
		&m.ID, &m.Kind, &m.SHA256, &m.Size, &m.BlobPath, &m.TitleEnc, &m.NotesEnc, &m.SourceEnc,
		&m.Rating, &fav, &m.Duration, &m.Width, &m.Height, &m.PageCount, &m.ThumbPath,
		&m.DownloadEnc, &m.GalleryEnc, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	m.Favorite = fav != 0
	return m, nil
}

// UpdateMediaDimensions sets width/height (e.g. after AI decode).
func (d *DB) UpdateMediaDimensions(ctx context.Context, id int64, w, h int) error {
	_, err := d.sql.ExecContext(ctx,
		`UPDATE media SET width = ?, height = ?, updated_at = ? WHERE id = ?`,
		w, h, now(), id)
	return err
}

// SetThumbPath records the relative store path of a generated thumbnail blob.
func (d *DB) SetThumbPath(ctx context.Context, id int64, rel string) error {
	_, err := d.sql.ExecContext(ctx,
		`UPDATE media SET thumb_path = ?, updated_at = ? WHERE id = ?`, rel, now(), id)
	return err
}

// SetPageCount records how many pages a comic archive holds.
func (d *DB) SetPageCount(ctx context.Context, id int64, pages int) error {
	_, err := d.sql.ExecContext(ctx,
		`UPDATE media SET page_count = ?, updated_at = ? WHERE id = ?`, pages, now(), id)
	return err
}

// ComicsMissingIndex returns comics that have never been opened server-side (no
// page count, or no cover thumbnail), used to backfill both at startup.
func (d *DB) ComicsMissingIndex(ctx context.Context, limit int) ([]*MediaRow, error) {
	if limit <= 0 || limit > 1000 {
		limit = 500
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, kind, blob_path, size
		FROM media
		WHERE kind = 'comic'
		  AND (page_count IS NULL OR page_count = 0
		       OR thumb_path IS NULL OR thumb_path = '')
		ORDER BY created_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*MediaRow
	for rows.Next() {
		m := &MediaRow{}
		if err := rows.Scan(&m.ID, &m.Kind, &m.BlobPath, &m.Size); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// UpdateVideoMeta fills in probed video metadata. Zero values are left untouched
// so a partial probe (e.g. dimensions but no duration) never clobbers good data.
func (d *DB) UpdateVideoMeta(ctx context.Context, id int64, dur float64, w, h int) error {
	_, err := d.sql.ExecContext(ctx, `
		UPDATE media SET
		    duration = CASE WHEN ? > 0 THEN ? ELSE duration END,
		    width    = CASE WHEN ? > 0 THEN ? ELSE width END,
		    height   = CASE WHEN ? > 0 THEN ? ELSE height END,
		    updated_at = ?
		WHERE id = ?`,
		dur, dur, w, w, h, h, now(), id)
	return err
}

// VideosMissingThumbs returns id/blob_path for videos that have no thumbnail yet,
// used to backfill posters for items imported before thumbnailing existed.
func (d *DB) VideosMissingThumbs(ctx context.Context, limit int) ([]*MediaRow, error) {
	if limit <= 0 || limit > 1000 {
		limit = 500
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, kind, blob_path, size, duration
		FROM media
		WHERE kind = 'video' AND (thumb_path IS NULL OR thumb_path = '')
		ORDER BY created_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*MediaRow
	for rows.Next() {
		m := &MediaRow{}
		if err := rows.Scan(&m.ID, &m.Kind, &m.BlobPath, &m.Size, &m.Duration); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// MediaMissingAITags returns taggable library items with no persisted AI result.
// It powers the bounded startup/settings backfill, repairing
// imports made while tagging was disabled or by an ingest path that failed before
// it could enqueue the model. Existing manual and scraped tags do not count: the
// AI pass is independent and may add useful content tags alongside them.
func (d *DB) MediaMissingAITags(ctx context.Context, limit int) ([]*MediaRow, error) {
	if limit <= 0 || limit > 1000 {
		limit = 500
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT m.id, m.kind, m.blob_path, m.size
		FROM media m
		WHERE m.kind IN ('image', 'gif', 'video')
		  AND NOT EXISTS (
		      SELECT 1 FROM media_tags mt
		      WHERE mt.media_id = m.id AND mt.source = 'ai'
		  )
		ORDER BY m.created_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*MediaRow
	for rows.Next() {
		m := &MediaRow{}
		if err := rows.Scan(&m.ID, &m.Kind, &m.BlobPath, &m.Size); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// nullBytes stores a NULL rather than an empty blob when there's nothing to
// encrypt, keeping "no value" distinct from an empty ciphertext.
func nullBytes(b []byte) any {
	if len(b) == 0 {
		return nil
	}
	return b
}

// MediaPatch carries an editable subset of a media row. Only fields whose Set*
// flag is true are written, so a caller can update just the title (or just the
// kind) without clobbering the rest.
type MediaPatch struct {
	SetTitle    bool
	TitleEnc    []byte
	SetNotes    bool
	NotesEnc    []byte
	SetKind     bool
	Kind        string
	SetRating   bool
	Rating      int
	SetFavorite bool
	Favorite    bool
	SetDownload bool
	DownloadEnc []byte
	SetGallery  bool
	GalleryEnc  []byte
}

// UpdateMedia applies a MediaPatch, touching only the requested columns. Returns
// sql.ErrNoRows if no row matched.
func (d *DB) UpdateMedia(ctx context.Context, id int64, p MediaPatch) error {
	sets := []string{}
	args := []any{}
	if p.SetTitle {
		sets = append(sets, "title_enc = ?")
		args = append(args, nullBytes(p.TitleEnc))
	}
	if p.SetNotes {
		sets = append(sets, "notes_enc = ?")
		args = append(args, nullBytes(p.NotesEnc))
	}
	if p.SetKind {
		sets = append(sets, "kind = ?")
		args = append(args, p.Kind)
	}
	if p.SetRating {
		sets = append(sets, "rating = ?")
		args = append(args, p.Rating)
	}
	if p.SetFavorite {
		sets = append(sets, "favorite = ?")
		args = append(args, boolToInt(p.Favorite))
	}
	if p.SetDownload {
		sets = append(sets, "download_enc = ?")
		args = append(args, nullBytes(p.DownloadEnc))
	}
	if p.SetGallery {
		sets = append(sets, "gallery_enc = ?")
		args = append(args, nullBytes(p.GalleryEnc))
	}
	if len(sets) == 0 {
		return nil // nothing to do
	}
	sets = append(sets, "updated_at = ?")
	args = append(args, now(), id)
	q := "UPDATE media SET " + strings.Join(sets, ", ") + " WHERE id = ?"
	res, err := d.sql.ExecContext(ctx, q, args...)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeleteMedia removes the row (media_tags / collection_items / progress cascade
// via foreign keys) and returns the blob + thumb paths so the caller can unlink
// the underlying files. Returns sql.ErrNoRows if the id doesn't exist.
func (d *DB) DeleteMedia(ctx context.Context, id int64) (blobPath, thumbPath string, err error) {
	var thumb sql.NullString
	err = d.sql.QueryRowContext(ctx, `SELECT blob_path, thumb_path FROM media WHERE id = ?`, id).
		Scan(&blobPath, &thumb)
	if err != nil {
		return "", "", err
	}
	if _, err = d.sql.ExecContext(ctx, `DELETE FROM media WHERE id = ?`, id); err != nil {
		return "", "", err
	}
	return blobPath, thumb.String, nil
}

// CountByThumbPath reports how many rows still reference a thumbnail blob. Video
// posters are content-addressed and can dedup-collide, so the caller checks this
// before unlinking a thumb (blob_path is safe — sha256 is UNIQUE per row).
func (d *DB) CountByThumbPath(ctx context.Context, rel string) (int, error) {
	var n int
	err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM media WHERE thumb_path = ?`, rel).Scan(&n)
	return n, err
}

// ListMedia returns rows filtered by kind (empty = all), newest first.
func (d *DB) ListMedia(ctx context.Context, kind string, limit, offset int) ([]*MediaRow, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	q := `SELECT id, kind, sha256, size, blob_path, title_enc, notes_enc, source_enc,
	             rating, favorite, duration, width, height, page_count, thumb_path,
	             download_enc, gallery_enc, created_at, updated_at
	      FROM media`
	args := []any{}
	if kind != "" {
		q += ` WHERE kind = ?`
		args = append(args, kind)
	}
	q += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := d.sql.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*MediaRow
	for rows.Next() {
		m := &MediaRow{}
		var fav int
		if err := rows.Scan(&m.ID, &m.Kind, &m.SHA256, &m.Size, &m.BlobPath,
			&m.TitleEnc, &m.NotesEnc, &m.SourceEnc, &m.Rating, &fav,
			&m.Duration, &m.Width, &m.Height, &m.PageCount, &m.ThumbPath,
			&m.DownloadEnc, &m.GalleryEnc, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.Favorite = fav != 0
		out = append(out, m)
	}
	return out, rows.Err()
}
