package db

import (
	"context"
	"database/sql"
)

// GameSaveRow is one backed-up save file belonging to a game. LabelEnc is sealed
// the same way media titles are; callers decrypt it on the way out.
type GameSaveRow struct {
	ID        int64
	GameID    int64
	LabelEnc  []byte
	BlobPath  string
	SHA256    string
	Size      int64
	CreatedAt int64
}

// AddGameSave records an uploaded save against a game and returns its id.
func (d *DB) AddGameSave(ctx context.Context, row *GameSaveRow) (int64, error) {
	row.CreatedAt = now()
	res, err := d.sql.ExecContext(ctx, `
		INSERT INTO game_saves(game_id, label_enc, blob_path, sha256, size, created_at)
		VALUES(?,?,?,?,?,?)`,
		row.GameID, row.LabelEnc, row.BlobPath, row.SHA256, row.Size, row.CreatedAt)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	row.ID = id
	return id, nil
}

// ListGameSaves returns a game's saves, newest first — which is the order they are
// wanted in, because the save you want back is nearly always the last one you made.
func (d *DB) ListGameSaves(ctx context.Context, gameID int64) ([]*GameSaveRow, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, game_id, label_enc, blob_path, sha256, size, created_at
		FROM game_saves WHERE game_id=? ORDER BY created_at DESC, id DESC`, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*GameSaveRow
	for rows.Next() {
		r := &GameSaveRow{}
		if err := rows.Scan(&r.ID, &r.GameID, &r.LabelEnc, &r.BlobPath, &r.SHA256, &r.Size, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// GetGameSave reads one save. The game id is part of the lookup rather than checked
// afterwards, so a save id from one game can never be used to read another's.
func (d *DB) GetGameSave(ctx context.Context, gameID, saveID int64) (*GameSaveRow, error) {
	r := &GameSaveRow{}
	err := d.sql.QueryRowContext(ctx, `
		SELECT id, game_id, label_enc, blob_path, sha256, size, created_at
		FROM game_saves WHERE id=? AND game_id=?`, saveID, gameID).
		Scan(&r.ID, &r.GameID, &r.LabelEnc, &r.BlobPath, &r.SHA256, &r.Size, &r.CreatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// DeleteGameSave removes one save and reports whether it existed, so the handler can
// answer 404 rather than silently succeeding on an id that was never there.
//
// The blob is intentionally left to the store: it may be shared with another save
// row holding the same bytes, and deleting it here would empty that one too.
func (d *DB) DeleteGameSave(ctx context.Context, gameID, saveID int64) (bool, error) {
	res, err := d.sql.ExecContext(ctx, `DELETE FROM game_saves WHERE id=? AND game_id=?`, saveID, gameID)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	return n > 0, err
}

// CountGameSaves reports how many saves a game has, for the badge on its card.
func (d *DB) CountGameSaves(ctx context.Context, gameID int64) (int, error) {
	var n int
	err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM game_saves WHERE game_id=?`, gameID).Scan(&n)
	if err != nil && err != sql.ErrNoRows {
		return 0, err
	}
	return n, nil
}
