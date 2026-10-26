package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
)

// TrainSet is a pile of pictures a LoRA is trained on, apart from the library. See
// the table comment in schema.sql.
type TrainSet struct {
	ID        int64
	Name      string
	Count     int
	CoverID   int64 // the newest picture, for the set's tile; 0 when empty
	CreatedAt int64
	UpdatedAt int64
}

// TrainTag is one tag on a training picture: the tagger's ("ai") or typed ("manual").
type TrainTag struct {
	Name     string  `json:"name"`
	Category string  `json:"category,omitempty"`
	Source   string  `json:"source,omitempty"`
	Score    float64 `json:"score,omitempty"`
}

// TrainPicture is one picture of a set.
type TrainPicture struct {
	ID        int64
	SetID     int64
	SHA256    string
	Size      int64
	BlobPath  string
	ThumbPath string
	SourceEnc []byte
	Width     int64
	Height    int64
	Tags      []TrainTag
	CreatedAt int64
}

const trainSetColumns = `s.id, s.name, s.created_at, s.updated_at,
	(SELECT COUNT(*) FROM train_pictures p WHERE p.set_id = s.id),
	COALESCE((SELECT MAX(p.id) FROM train_pictures p WHERE p.set_id = s.id), 0)`

func scanTrainSet(row interface{ Scan(...any) error }) (TrainSet, error) {
	var t TrainSet
	err := row.Scan(&t.ID, &t.Name, &t.CreatedAt, &t.UpdatedAt, &t.Count, &t.CoverID)
	return t, err
}

// TrainSets lists the sets, the one changed last first.
func (d *DB) TrainSets(ctx context.Context) ([]TrainSet, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT `+trainSetColumns+` FROM train_sets s ORDER BY s.updated_at DESC, s.id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TrainSet
	for rows.Next() {
		t, err := scanTrainSet(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// GetTrainSet reads one set; ok is false when there is no such set.
func (d *DB) GetTrainSet(ctx context.Context, id int64) (TrainSet, bool, error) {
	t, err := scanTrainSet(d.sql.QueryRowContext(ctx, `SELECT `+trainSetColumns+` FROM train_sets s WHERE s.id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return t, false, nil
	}
	return t, err == nil, err
}

// TrainSetNamed finds a set by name whatever its capitals; ok is false for none.
func (d *DB) TrainSetNamed(ctx context.Context, name string) (TrainSet, bool, error) {
	t, err := scanTrainSet(d.sql.QueryRowContext(ctx,
		`SELECT `+trainSetColumns+` FROM train_sets s WHERE lower(s.name) = lower(?) ORDER BY s.id LIMIT 1`, strings.TrimSpace(name)))
	if errors.Is(err, sql.ErrNoRows) {
		return t, false, nil
	}
	return t, err == nil, err
}

// CreateTrainSet makes an empty set.
func (d *DB) CreateTrainSet(ctx context.Context, name string) (TrainSet, error) {
	n := now()
	res, err := d.sql.ExecContext(ctx, `INSERT INTO train_sets(name, created_at, updated_at) VALUES(?, ?, ?)`, name, n, n)
	if err != nil {
		return TrainSet{}, err
	}
	id, err := res.LastInsertId()
	return TrainSet{ID: id, Name: name, CreatedAt: n, UpdatedAt: n}, err
}

// RenameTrainSet changes a set's name.
func (d *DB) RenameTrainSet(ctx context.Context, id int64, name string) error {
	_, err := d.sql.ExecContext(ctx, `UPDATE train_sets SET name = ?, updated_at = ? WHERE id = ?`, name, now(), id)
	return err
}

func (d *DB) touchTrainSet(ctx context.Context, id int64) {
	_, _ = d.sql.ExecContext(ctx, `UPDATE train_sets SET updated_at = ? WHERE id = ?`, now(), id)
}

// DeleteTrainSet removes a set and its pictures, and returns the files those
// pictures used, for the caller to unlink the ones nothing else holds.
func (d *DB) DeleteTrainSet(ctx context.Context, id int64) ([]string, error) {
	pics, err := d.TrainPictures(ctx, id)
	if err != nil {
		return nil, err
	}
	if _, err := d.sql.ExecContext(ctx, `DELETE FROM train_pictures WHERE set_id = ?`, id); err != nil {
		return nil, err
	}
	if _, err := d.sql.ExecContext(ctx, `DELETE FROM train_sets WHERE id = ?`, id); err != nil {
		return nil, err
	}
	var paths []string
	for _, p := range pics {
		paths = append(paths, p.BlobPath)
		if p.ThumbPath != "" {
			paths = append(paths, p.ThumbPath)
		}
	}
	return paths, nil
}

const trainPictureColumns = `id, set_id, sha256, size, blob_path, thumb_path, source_enc, width, height, tags, created_at`

func scanTrainPicture(row interface{ Scan(...any) error }) (TrainPicture, error) {
	var p TrainPicture
	var tags string
	err := row.Scan(&p.ID, &p.SetID, &p.SHA256, &p.Size, &p.BlobPath, &p.ThumbPath, &p.SourceEnc, &p.Width, &p.Height, &tags, &p.CreatedAt)
	if err == nil {
		_ = json.Unmarshal([]byte(tags), &p.Tags)
	}
	return p, err
}

// AddTrainPicture puts a picture in a set. The same picture twice in one set is
// one picture: existed says it was there already, and p.ID is that one.
func (d *DB) AddTrainPicture(ctx context.Context, p *TrainPicture) (existed bool, err error) {
	if p.Tags == nil {
		p.Tags = []TrainTag{}
	}
	tags, _ := json.Marshal(p.Tags)
	p.CreatedAt = now()
	res, err := d.sql.ExecContext(ctx, `
		INSERT INTO train_pictures(set_id, sha256, size, blob_path, thumb_path, source_enc, width, height, tags, created_at)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(set_id, sha256) DO NOTHING`,
		p.SetID, p.SHA256, p.Size, p.BlobPath, p.ThumbPath, p.SourceEnc, p.Width, p.Height, string(tags), p.CreatedAt)
	if err != nil {
		return false, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		err = d.sql.QueryRowContext(ctx, `SELECT id FROM train_pictures WHERE set_id = ? AND sha256 = ?`, p.SetID, p.SHA256).Scan(&p.ID)
		return true, err
	}
	p.ID, err = res.LastInsertId()
	d.touchTrainSet(ctx, p.SetID)
	return false, err
}

// TrainSetHas says whether a set holds a picture, by its content hash.
func (d *DB) TrainSetHas(ctx context.Context, setID int64, sha256 string) (bool, error) {
	var n int
	err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM train_pictures WHERE set_id = ? AND sha256 = ?`, setID, sha256).Scan(&n)
	return n > 0, err
}

// TrainPictures lists a set's pictures in the order they were added.
func (d *DB) TrainPictures(ctx context.Context, setID int64) ([]TrainPicture, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT `+trainPictureColumns+` FROM train_pictures WHERE set_id = ? ORDER BY id`, setID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TrainPicture
	for rows.Next() {
		p, err := scanTrainPicture(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// GetTrainPicture reads one picture. The set is part of the lookup, so a picture id
// from one set never reads another's.
func (d *DB) GetTrainPicture(ctx context.Context, setID, id int64) (TrainPicture, bool, error) {
	p, err := scanTrainPicture(d.sql.QueryRowContext(ctx,
		`SELECT `+trainPictureColumns+` FROM train_pictures WHERE set_id = ? AND id = ?`, setID, id))
	if errors.Is(err, sql.ErrNoRows) {
		return p, false, nil
	}
	return p, err == nil, err
}

// SetTrainPictureTags replaces a picture's tags.
func (d *DB) SetTrainPictureTags(ctx context.Context, setID, id int64, tags []TrainTag) error {
	if tags == nil {
		tags = []TrainTag{}
	}
	b, _ := json.Marshal(tags)
	_, err := d.sql.ExecContext(ctx, `UPDATE train_pictures SET tags = ? WHERE set_id = ? AND id = ?`, string(b), setID, id)
	if err == nil {
		d.touchTrainSet(ctx, setID)
	}
	return err
}

// SetTrainPictureSize records a picture's dimensions, read when it was decoded.
func (d *DB) SetTrainPictureSize(ctx context.Context, id, width, height int64) error {
	_, err := d.sql.ExecContext(ctx, `UPDATE train_pictures SET width = ?, height = ? WHERE id = ?`, width, height, id)
	return err
}

// DeleteTrainPicture takes a picture out of its set and returns the files it used.
func (d *DB) DeleteTrainPicture(ctx context.Context, setID, id int64) (blob, thumb string, ok bool, err error) {
	p, ok, err := d.GetTrainPicture(ctx, setID, id)
	if err != nil || !ok {
		return "", "", ok, err
	}
	if _, err := d.sql.ExecContext(ctx, `DELETE FROM train_pictures WHERE id = ?`, id); err != nil {
		return "", "", false, err
	}
	d.touchTrainSet(ctx, setID)
	return p.BlobPath, p.ThumbPath, true, nil
}

// BlobInUse says whether any library item, training picture, studio gallery
// picture or game save still holds a stored file — as its picture or its thumbnail
// — so the one deleting a row knows whether the file can go too. The store is
// content-addressed, so the same picture in the library and in a set is one file.
func (d *DB) BlobInUse(ctx context.Context, rel string) (bool, error) {
	if rel == "" {
		return false, nil
	}
	var n int
	err := d.sql.QueryRowContext(ctx, `SELECT
		(SELECT COUNT(*) FROM media WHERE blob_path = ?1 OR thumb_path = ?1) +
		(SELECT COUNT(*) FROM train_pictures WHERE blob_path = ?1 OR thumb_path = ?1) +
		(SELECT COUNT(*) FROM gen_images WHERE blob_path = ?1 OR thumb_path = ?1) +
		(SELECT COUNT(*) FROM game_saves WHERE blob_path = ?1)`, rel).Scan(&n)
	return n > 0, err
}
