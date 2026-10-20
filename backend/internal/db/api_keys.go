package db

import "context"

// APIKeyRow is one key a program signs in with. The key itself is never stored —
// see the api_keys table for why only its hash is.
type APIKeyRow struct {
	ID         int64
	UserID     int64
	Scope      string
	Name       string
	Hint       string
	CreatedAt  int64
	LastUsedAt int64
}

// CreateAPIKey records a key by its hash and returns the new row's id.
func (d *DB) CreateAPIKey(ctx context.Context, userID int64, scope, name, hash, hint string) (int64, error) {
	res, err := d.sql.ExecContext(ctx,
		`INSERT INTO api_keys(user_id, scope, name, hash, hint, created_at) VALUES(?,?,?,?,?,?)`,
		userID, scope, name, hash, hint, now())
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// APIKeyUser returns the key a hash belongs to and the account it signs in as, or
// sql.ErrNoRows. A key does not idle out and has no expiry: it lasts until it is
// revoked, which is the point of having one instead of a session.
func (d *DB) APIKeyUser(ctx context.Context, hash string) (*APIKeyRow, *UserRow, error) {
	k := &APIKeyRow{}
	u := &UserRow{}
	var admin int
	err := d.sql.QueryRowContext(ctx, `
		SELECT k.id, k.user_id, k.scope, k.name, k.hint, k.created_at, k.last_used_at,
		       u.id, u.username, u.pw_hash, u.is_admin
		FROM api_keys k JOIN users u ON u.id = k.user_id
		WHERE k.hash = ?`, hash).
		Scan(&k.ID, &k.UserID, &k.Scope, &k.Name, &k.Hint, &k.CreatedAt, &k.LastUsedAt,
			&u.ID, &u.Username, &u.PwHash, &admin)
	if err != nil {
		return nil, nil, err
	}
	u.IsAdmin = admin != 0
	return k, u, nil
}

// TouchAPIKey records that a key was used, at most once a minute — the launcher
// polls every few seconds, and "last used" needs no finer grain than that.
func (d *DB) TouchAPIKey(ctx context.Context, id int64) error {
	_, err := d.sql.ExecContext(ctx,
		`UPDATE api_keys SET last_used_at = ? WHERE id = ? AND last_used_at < ?`,
		now(), id, now()-maxSessionTouchInterval)
	return err
}

// ListAPIKeys returns a user's keys of one scope, newest first.
func (d *DB) ListAPIKeys(ctx context.Context, userID int64, scope string) ([]*APIKeyRow, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, user_id, scope, name, hint, created_at, last_used_at
		FROM api_keys WHERE user_id = ? AND scope = ? ORDER BY created_at DESC, id DESC`, userID, scope)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*APIKeyRow{}
	for rows.Next() {
		k := &APIKeyRow{}
		if err := rows.Scan(&k.ID, &k.UserID, &k.Scope, &k.Name, &k.Hint, &k.CreatedAt, &k.LastUsedAt); err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

// DeleteAPIKey revokes one of a user's keys. Reports whether there was one to revoke;
// another user's key id answers false, exactly as a missing one does.
func (d *DB) DeleteAPIKey(ctx context.Context, userID, id int64) (bool, error) {
	res, err := d.sql.ExecContext(ctx, `DELETE FROM api_keys WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}
