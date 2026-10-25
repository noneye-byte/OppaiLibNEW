package db

import (
	"context"
	"database/sql"
	"errors"
)

// ModelDefaults are the recommended settings a model has that its generator cannot
// keep. See the table comment in schema.sql.
type ModelDefaults struct {
	ModelKey  string
	Positive  string
	Negative  string
	ClipSkip  int
	WeightMin float64
	WeightMax float64
}

// Empty says there is nothing worth a row.
func (m ModelDefaults) Empty() bool {
	return m.Positive == "" && m.Negative == "" && m.ClipSkip == 0 && m.WeightMin == 0 && m.WeightMax == 0
}

// PutModelDefaults records a model's settings, or forgets them when they are empty.
func (d *DB) PutModelDefaults(ctx context.Context, m ModelDefaults) error {
	if m.Empty() {
		return d.DeleteModelDefaults(ctx, m.ModelKey)
	}
	_, err := d.sql.ExecContext(ctx, `
		INSERT INTO model_defaults(model_key, positive, negative, clip_skip, weight_min, weight_max, updated_at)
		VALUES(?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(model_key) DO UPDATE SET
			positive = excluded.positive, negative = excluded.negative, clip_skip = excluded.clip_skip,
			weight_min = excluded.weight_min, weight_max = excluded.weight_max, updated_at = excluded.updated_at`,
		m.ModelKey, m.Positive, m.Negative, m.ClipSkip, m.WeightMin, m.WeightMax, now())
	return err
}

// GetModelDefaults reads one model's settings; a model with none reads as empty.
func (d *DB) GetModelDefaults(ctx context.Context, key string) (ModelDefaults, error) {
	m := ModelDefaults{ModelKey: key}
	err := d.sql.QueryRowContext(ctx, `
		SELECT positive, negative, clip_skip, weight_min, weight_max FROM model_defaults WHERE model_key = ?`, key).
		Scan(&m.Positive, &m.Negative, &m.ClipSkip, &m.WeightMin, &m.WeightMax)
	if errors.Is(err, sql.ErrNoRows) {
		return m, nil
	}
	return m, err
}

// AllModelDefaults reads every model's settings, keyed by model key.
func (d *DB) AllModelDefaults(ctx context.Context) (map[string]ModelDefaults, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT model_key, positive, negative, clip_skip, weight_min, weight_max FROM model_defaults`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]ModelDefaults{}
	for rows.Next() {
		var m ModelDefaults
		if err := rows.Scan(&m.ModelKey, &m.Positive, &m.Negative, &m.ClipSkip, &m.WeightMin, &m.WeightMax); err != nil {
			return nil, err
		}
		out[m.ModelKey] = m
	}
	return out, rows.Err()
}

// DeleteModelDefaults forgets a model's settings, for when the model goes.
func (d *DB) DeleteModelDefaults(ctx context.Context, key string) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM model_defaults WHERE model_key = ?`, key)
	return err
}
