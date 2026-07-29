package db

import "context"

// AllSettings returns every stored override, keyed by setting name. Absent keys
// simply mean "use the env-var default" — see internal/settings.
func (d *DB) AllSettings(ctx context.Context) (map[string]string, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT key, value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, rows.Err()
}

// PutSettings upserts a batch of overrides in one transaction.
func (d *DB) PutSettings(ctx context.Context, kv map[string]string) error {
	if len(kv) == 0 {
		return nil
	}
	tx, err := d.sql.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck // no-op once committed
	ts := now()
	for k, v := range kv {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO settings(key, value, updated_at) VALUES(?,?,?)
			ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
			k, v, ts); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// SetPassword replaces a user's password hash.
func (d *DB) SetPassword(ctx context.Context, userID int64, pwHash string) error {
	_, err := d.sql.ExecContext(ctx, `UPDATE users SET pw_hash = ? WHERE id = ?`, pwHash, userID)
	return err
}

// KindStat is a per-kind row of the library summary shown on the Settings screen.
type KindStat struct {
	Kind  string `json:"kind"`
	Count int64  `json:"count"`
	Bytes int64  `json:"bytes"`
}

// Stats summarizes the library: item count and stored bytes per kind, plus the
// total number of distinct tags.
func (d *DB) Stats(ctx context.Context) (kinds []KindStat, tagCount int64, err error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT kind, COUNT(*), COALESCE(SUM(size), 0)
		FROM media GROUP BY kind ORDER BY kind`)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	for rows.Next() {
		var k KindStat
		if err := rows.Scan(&k.Kind, &k.Count, &k.Bytes); err != nil {
			return nil, 0, err
		}
		kinds = append(kinds, k)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	if err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM tags`).Scan(&tagCount); err != nil {
		return nil, 0, err
	}
	return kinds, tagCount, nil
}
