package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

// ComfyNote is a ComfyUI file's cover and trigger words, the defaults a LoRA goes on
// with and the Civitai entry it came from. See the table comment in schema.sql.
type ComfyNote struct {
	Name     string
	Triggers []string
	// HasCover says a cover is kept; the bytes are read on their own (ComfyCover),
	// since a listing of every note has no use for them.
	HasCover  bool
	Defaults  ComfyDefaults
	Civitai   ComfyCivitai
	UpdatedAt int64
}

// ComfyDefaults is what a LoRA goes on with in the Video studio. Zero is unsaid: a
// strength of 0 is "1", as the LoRA's own default would be.
type ComfyDefaults struct {
	Weight float64 `json:"weight,omitempty"`
	// The range its page says it works over, shown beside the slider.
	WeightMin float64 `json:"weightMin,omitempty"`
	WeightMax float64 `json:"weightMax,omitempty"`
	// Words for the clip's negative while it is on.
	Negative string `json:"negative,omitempty"`
}

// IsZero says nothing is set.
func (d ComfyDefaults) IsZero() bool { return d == ComfyDefaults{} }

// ComfyCivitai is the catalogue version a file is, by its ids and names.
type ComfyCivitai struct {
	ModelID     int64  `json:"modelId,omitempty"`
	VersionID   int64  `json:"versionId,omitempty"`
	ModelName   string `json:"modelName,omitempty"`
	VersionName string `json:"versionName,omitempty"`
}

// IsZero says the file is linked to nothing.
func (c ComfyCivitai) IsZero() bool { return c.VersionID == 0 && c.ModelID == 0 }

// ComfyNotes lists every file's note, keyed by name.
func (d *DB) ComfyNotes(ctx context.Context) (map[string]ComfyNote, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT name, triggers, cover_enc IS NOT NULL, defaults, civitai, updated_at FROM comfy_notes`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]ComfyNote{}
	for rows.Next() {
		var n ComfyNote
		var triggers, defaults, civitai string
		if err := rows.Scan(&n.Name, &triggers, &n.HasCover, &defaults, &civitai, &n.UpdatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(triggers), &n.Triggers)
		if n.Triggers == nil {
			n.Triggers = []string{}
		}
		_ = json.Unmarshal([]byte(defaults), &n.Defaults)
		_ = json.Unmarshal([]byte(civitai), &n.Civitai)
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

// PutComfyTriggers sets a file's trigger words, keeping the rest of its note.
func (d *DB) PutComfyTriggers(ctx context.Context, name string, triggers []string) error {
	if triggers == nil {
		triggers = []string{}
	}
	raw, _ := json.Marshal(triggers)
	return d.putComfyField(ctx, name, "triggers", string(raw))
}

// PutComfyDefaults sets what a LoRA goes on with, keeping the rest of its note.
func (d *DB) PutComfyDefaults(ctx context.Context, name string, defaults ComfyDefaults) error {
	raw, _ := json.Marshal(defaults)
	return d.putComfyField(ctx, name, "defaults", string(raw))
}

// PutComfyCivitai sets the catalogue entry a file is, keeping the rest of its note.
func (d *DB) PutComfyCivitai(ctx context.Context, name string, link ComfyCivitai) error {
	raw, _ := json.Marshal(link)
	return d.putComfyField(ctx, name, "civitai", string(raw))
}

// PutComfyCover sets a file's sealed cover, or with nil clears it, keeping the rest.
func (d *DB) PutComfyCover(ctx context.Context, name string, enc []byte) error {
	if _, err := d.sql.ExecContext(ctx, `
		INSERT INTO comfy_notes(name, cover_enc, updated_at) VALUES(?, ?, ?)
		ON CONFLICT(name) DO UPDATE SET cover_enc = excluded.cover_enc, updated_at = excluded.updated_at`,
		name, enc, now()); err != nil {
		return err
	}
	return d.dropEmptyComfyNote(ctx, name)
}

// putComfyField sets one of the note's JSON columns. column is one of this file's
// constants, never a caller's string.
func (d *DB) putComfyField(ctx context.Context, name, column, value string) error {
	if _, err := d.sql.ExecContext(ctx, `
		INSERT INTO comfy_notes(name, `+column+`, updated_at) VALUES(?, ?, ?)
		ON CONFLICT(name) DO UPDATE SET `+column+` = excluded.`+column+`, updated_at = excluded.updated_at`,
		name, value, now()); err != nil {
		return err
	}
	return d.dropEmptyComfyNote(ctx, name)
}

// DeleteComfyNote forgets everything kept for a file: it has been deleted.
func (d *DB) DeleteComfyNote(ctx context.Context, name string) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM comfy_notes WHERE name = ?`, name)
	return err
}

// dropEmptyComfyNote forgets a note left with nothing in it.
func (d *DB) dropEmptyComfyNote(ctx context.Context, name string) error {
	_, err := d.sql.ExecContext(ctx, `
		DELETE FROM comfy_notes WHERE name = ? AND cover_enc IS NULL AND triggers IN ('[]', '')
			AND defaults IN ('{}', '') AND civitai IN ('{}', '')`, name)
	return err
}
