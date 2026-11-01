package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

// ComfyNote is a ComfyUI file's cover and trigger words. See the table comment in
// schema.sql.
type ComfyNote struct {
	Name     string
	Triggers []string
	// HasCover says a cover is kept; the bytes are read on their own (ComfyCover),
	// since a listing of every note has no use for them.
	HasCover  bool
	UpdatedAt int64
}

// ComfyNotes lists every file's note, keyed by name.
func (d *DB) ComfyNotes(ctx context.Context) (map[string]ComfyNote, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT name, triggers, cover_enc IS NOT NULL, updated_at FROM comfy_notes`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]ComfyNote{}
	for rows.Next() {
		var n ComfyNote
		var triggers string
		if err := rows.Scan(&n.Name, &triggers, &n.HasCover, &n.UpdatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(triggers), &n.Triggers)
		if n.Triggers == nil {
			n.Triggers = []string{}
		}
		out[n.Name] = n
	}
	return out, rows.Err()
}

// ComfyCover is a file's sealed cover, nil when it has none.
func (d *DB) ComfyCover(ctx context.Context, name string) ([]byte, error) {
	var enc []byte
	err := d.sql.QueryRowContext(ctx, `SELECT cover_enc FROM comfy_notes WHERE name = ?`, name).Scan(&enc)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return enc, err
}

// PutComfyTriggers sets a file's trigger words, keeping its cover.
func (d *DB) PutComfyTriggers(ctx context.Context, name string, triggers []string) error {
	if triggers == nil {
		triggers = []string{}
	}
	raw, _ := json.Marshal(triggers)
	if _, err := d.sql.ExecContext(ctx, `
		INSERT INTO comfy_notes(name, triggers, updated_at) VALUES(?, ?, ?)
		ON CONFLICT(name) DO UPDATE SET triggers = excluded.triggers, updated_at = excluded.updated_at`,
		name, string(raw), now()); err != nil {
		return err
	}
	return d.dropEmptyComfyNote(ctx, name)
}

// PutComfyCover sets a file's sealed cover, or with nil clears it, keeping its words.
func (d *DB) PutComfyCover(ctx context.Context, name string, enc []byte) error {
	if _, err := d.sql.ExecContext(ctx, `
		INSERT INTO comfy_notes(name, cover_enc, updated_at) VALUES(?, ?, ?)
		ON CONFLICT(name) DO UPDATE SET cover_enc = excluded.cover_enc, updated_at = excluded.updated_at`,
		name, enc, now()); err != nil {
		return err
	}
	return d.dropEmptyComfyNote(ctx, name)
}

// dropEmptyComfyNote forgets a note left with neither words nor a cover.
func (d *DB) dropEmptyComfyNote(ctx context.Context, name string) error {
	_, err := d.sql.ExecContext(ctx, `
		DELETE FROM comfy_notes WHERE name = ? AND cover_enc IS NULL AND triggers IN ('[]', '')`, name)
	return err
}
