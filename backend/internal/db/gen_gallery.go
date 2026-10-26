package db

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// GenFolder is one folder of the studio's gallery. See the table comment in schema.sql.
type GenFolder struct {
	ID        int64
	Name      string
	Count     int
	CreatedAt int64
}

// GenImage is one picture in the studio's gallery.
type GenImage struct {
	ID        int64
	FolderID  int64 // 0 is Unsorted
	SHA256    string
	Size      int64
	BlobPath  string
	ThumbPath string
	Width     int64
	Height    int64
	InfoEnc   []byte
	CreatedAt int64
}

// GenScope picks which pictures a listing covers: every one, the unsorted ones, or
// one folder's.
type GenScope struct {
	All      bool
	FolderID int64 // 0 with All false is Unsorted
}

func (s GenScope) where() (string, []any) {
	switch {
	case s.All:
		return "1 = 1", nil
	case s.FolderID == 0:
		return "folder_id IS NULL", nil
	}
	return "folder_id = ?", []any{s.FolderID}
}

// GenFolders lists the folders by name, each with how many pictures it holds.
func (d *DB) GenFolders(ctx context.Context) ([]GenFolder, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT f.id, f.name, f.created_at,
		(SELECT COUNT(*) FROM gen_images i WHERE i.folder_id = f.id)
		FROM gen_folders f ORDER BY lower(f.name), f.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []GenFolder
	for rows.Next() {
		var f GenFolder
		if err := rows.Scan(&f.ID, &f.Name, &f.CreatedAt, &f.Count); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

// GenCounts is how many pictures there are in all and how many are in no folder.
func (d *DB) GenCounts(ctx context.Context) (all, unsorted int, err error) {
	err = d.sql.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(folder_id IS NULL), 0) FROM gen_images`).Scan(&all, &unsorted)
	return all, unsorted, err
}

// GenFolderExists says whether there is a folder by this id.
func (d *DB) GenFolderExists(ctx context.Context, id int64) (bool, error) {
	var n int
	err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM gen_folders WHERE id = ?`, id).Scan(&n)
	return n > 0, err
}

// CreateGenFolder makes a folder, or answers with the one already by that name
// whatever its capitals: two "Portraits" folders are a typo, not a wish.
func (d *DB) CreateGenFolder(ctx context.Context, name string) (GenFolder, error) {
	name = strings.TrimSpace(name)
	var f GenFolder
	err := d.sql.QueryRowContext(ctx, `SELECT id, name, created_at FROM gen_folders WHERE lower(name) = lower(?) ORDER BY id LIMIT 1`, name).
		Scan(&f.ID, &f.Name, &f.CreatedAt)
	if err == nil {
		return f, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return f, err
	}
	n := now()
	res, err := d.sql.ExecContext(ctx, `INSERT INTO gen_folders(name, created_at) VALUES(?, ?)`, name, n)
	if err != nil {
		return f, err
	}
	id, err := res.LastInsertId()
	return GenFolder{ID: id, Name: name, CreatedAt: n}, err
}

// RenameGenFolder changes a folder's name.
func (d *DB) RenameGenFolder(ctx context.Context, id int64, name string) error {
	_, err := d.sql.ExecContext(ctx, `UPDATE gen_folders SET name = ? WHERE id = ?`, strings.TrimSpace(name), id)
	return err
}

// DeleteGenFolder removes a folder. Its pictures are not deleted with it: they go
// back to Unsorted, set here rather than left to the foreign key so it holds on a
// database opened without foreign keys on.
func (d *DB) DeleteGenFolder(ctx context.Context, id int64) error {
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `UPDATE gen_images SET folder_id = NULL WHERE folder_id = ?`, id); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM gen_folders WHERE id = ?`, id); err != nil {
		return err
	}
	return tx.Commit()
}

const genImageColumns = `id, COALESCE(folder_id, 0), sha256, size, blob_path, thumb_path, width, height, info_enc, created_at`

func scanGenImage(row interface{ Scan(...any) error }) (GenImage, error) {
	var g GenImage
	err := row.Scan(&g.ID, &g.FolderID, &g.SHA256, &g.Size, &g.BlobPath, &g.ThumbPath, &g.Width, &g.Height, &g.InfoEnc, &g.CreatedAt)
	return g, err
}

// AddGenImage keeps one picture. The same picture made twice is two rows: a run
// repeated on a fixed seed is still two runs the user may file apart.
func (d *DB) AddGenImage(ctx context.Context, g *GenImage) error {
	if g.CreatedAt == 0 {
		g.CreatedAt = now()
	}
	var folder any
	if g.FolderID > 0 {
		folder = g.FolderID
	}
	res, err := d.sql.ExecContext(ctx, `
		INSERT INTO gen_images(folder_id, sha256, size, blob_path, thumb_path, width, height, info_enc, created_at)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		folder, g.SHA256, g.Size, g.BlobPath, g.ThumbPath, g.Width, g.Height, g.InfoEnc, g.CreatedAt)
	if err != nil {
		return err
	}
	g.ID, err = res.LastInsertId()
	return err
}

// GetGenImage reads one picture; ok is false when there is none by that id.
func (d *DB) GetGenImage(ctx context.Context, id int64) (GenImage, bool, error) {
	g, err := scanGenImage(d.sql.QueryRowContext(ctx, `SELECT `+genImageColumns+` FROM gen_images WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return g, false, nil
	}
	return g, err == nil, err
}

// GenImages pages through a scope's pictures: "newest" (the default), "oldest" or
// "largest". Ties fall back to the id, so a page boundary never repeats or skips one.
func (d *DB) GenImages(ctx context.Context, scope GenScope, order string, offset, limit int) ([]GenImage, int, error) {
	where, args := scope.where()
	var total int
	if err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM gen_images WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	by := "id DESC"
	switch order {
	case "oldest":
		by = "id ASC"
	case "largest":
		by = "size DESC, id DESC"
	}
	rows, err := d.sql.QueryContext(ctx, `SELECT `+genImageColumns+` FROM gen_images WHERE `+where+
		` ORDER BY `+by+` LIMIT ? OFFSET ?`, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []GenImage
	for rows.Next() {
		g, err := scanGenImage(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, g)
	}
	return out, total, rows.Err()
}

// MoveGenImages files pictures into a folder, or back to Unsorted with folderID 0.
func (d *DB) MoveGenImages(ctx context.Context, folderID int64, ids []int64) error {
	var folder any
	if folderID > 0 {
		folder = folderID
	}
	for _, id := range ids {
		if _, err := d.sql.ExecContext(ctx, `UPDATE gen_images SET folder_id = ? WHERE id = ?`, folder, id); err != nil {
			return err
		}
	}
	return nil
}

// DeleteGenImage drops one picture's row and returns the files it used, for the
// caller to unlink the ones nothing else holds; ok is false when it was not there.
func (d *DB) DeleteGenImage(ctx context.Context, id int64) (blob, thumb string, ok bool, err error) {
	g, ok, err := d.GetGenImage(ctx, id)
	if err != nil || !ok {
		return "", "", ok, err
	}
	if _, err := d.sql.ExecContext(ctx, `DELETE FROM gen_images WHERE id = ?`, id); err != nil {
		return "", "", false, err
	}
	return g.BlobPath, g.ThumbPath, true, nil
}
