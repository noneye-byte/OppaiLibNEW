package db

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// PasskeyRow is one registered WebAuthn credential.
//
// Everything here is public by construction — the private key never leaves the
// authenticator — so this struct is safe to hand to the client, minus CredentialID and
// PublicKey which are simply of no use to it.
type PasskeyRow struct {
	ID             int64
	UserID         int64
	CredentialID   []byte
	PublicKey      []byte
	AAGUID         []byte
	SignCount      uint32
	Transports     string
	Attestation    string
	BackupEligible bool
	BackupState    bool
	Name           string
	CreatedAt      int64
	LastUsedAt     int64
}

// ErrPasskeyExists is returned when a credential is already registered — to this
// account or another. Distinguished from a generic failure because the two have very
// different messages: "you already added this key" versus a real error.
var ErrPasskeyExists = errors.New("that passkey is already registered")

// AddPasskey stores a newly registered credential.
func (d *DB) AddPasskey(ctx context.Context, p *PasskeyRow) (int64, error) {
	res, err := d.sql.ExecContext(ctx, `
		INSERT INTO passkeys(user_id, credential_id, public_key, aaguid, sign_count,
		                     transports, attestation, backup_eligible, backup_state,
		                     name, created_at, last_used_at)
		VALUES(?,?,?,?,?,?,?,?,?,?,?,0)`,
		p.UserID, p.CredentialID, p.PublicKey, p.AAGUID, p.SignCount,
		p.Transports, p.Attestation, boolInt(p.BackupEligible), boolInt(p.BackupState),
		p.Name, now())
	if err != nil {
		// The UNIQUE constraint on credential_id is what stops one authenticator being
		// claimed by two accounts, so hitting it is expected rather than exceptional.
		if isUniqueViolation(err) {
			return 0, ErrPasskeyExists
		}
		return 0, err
	}
	return res.LastInsertId()
}

// PasskeysForUser lists a user's credentials, newest first.
func (d *DB) PasskeysForUser(ctx context.Context, userID int64) ([]*PasskeyRow, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, user_id, credential_id, public_key, aaguid, sign_count, transports,
		       attestation, backup_eligible, backup_state, name, created_at, last_used_at
		FROM passkeys WHERE user_id = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPasskeys(rows)
}

// PasskeyByCredentialID finds a credential by its raw id.
//
// Deliberately not scoped to a user: this is what makes a usernameless ("discoverable")
// login work, where the authenticator picks the credential and the server learns who is
// signing in from it.
func (d *DB) PasskeyByCredentialID(ctx context.Context, credentialID []byte) (*PasskeyRow, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, user_id, credential_id, public_key, aaguid, sign_count, transports,
		       attestation, backup_eligible, backup_state, name, created_at, last_used_at
		FROM passkeys WHERE credential_id = ?`, credentialID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out, err := scanPasskeys(rows)
	if err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return nil, sql.ErrNoRows
	}
	return out[0], nil
}

// TouchPasskey records a successful assertion: the new signature counter and the time.
//
// The counter is what detects a cloned authenticator, so it is stored on every success
// rather than periodically — a counter that is only sometimes written cannot be
// meaningfully compared on the next login.
func (d *DB) TouchPasskey(ctx context.Context, id int64, signCount uint32, backupState bool) error {
	_, err := d.sql.ExecContext(ctx,
		`UPDATE passkeys SET sign_count = ?, backup_state = ?, last_used_at = ? WHERE id = ?`,
		signCount, boolInt(backupState), now(), id)
	return err
}

// RenamePasskey sets a credential's label, scoped to its owner so one user cannot
// rename another's.
func (d *DB) RenamePasskey(ctx context.Context, userID, id int64, name string) error {
	res, err := d.sql.ExecContext(ctx,
		`UPDATE passkeys SET name = ? WHERE id = ? AND user_id = ?`, name, id, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// DeletePasskey revokes a credential. Scoped to its owner: the id comes from the
// client, and without the user_id clause any signed-in user could revoke anyone's key.
func (d *DB) DeletePasskey(ctx context.Context, userID, id int64) error {
	res, err := d.sql.ExecContext(ctx, `DELETE FROM passkeys WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// CountPasskeys reports how many a user has.
func (d *DB) CountPasskeys(ctx context.Context, userID int64) (int, error) {
	var n int
	err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM passkeys WHERE user_id = ?`, userID).Scan(&n)
	return n, err
}

func scanPasskeys(rows *sql.Rows) ([]*PasskeyRow, error) {
	var out []*PasskeyRow
	for rows.Next() {
		p := &PasskeyRow{}
		var eligible, state int
		if err := rows.Scan(&p.ID, &p.UserID, &p.CredentialID, &p.PublicKey, &p.AAGUID,
			&p.SignCount, &p.Transports, &p.Attestation, &eligible, &state,
			&p.Name, &p.CreatedAt, &p.LastUsedAt); err != nil {
			return nil, err
		}
		p.BackupEligible = eligible != 0
		p.BackupState = state != 0
		out = append(out, p)
	}
	return out, rows.Err()
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// isUniqueViolation reports whether err is a UNIQUE constraint failure.
//
// Matched on the message rather than a driver error type: modernc.org/sqlite does not
// export a typed constraint error, and a driver swap would break a type assertion just
// as readily as this. The alternative — a SELECT before the INSERT — is a race.
func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(strings.ToLower(err.Error()), "unique constraint failed")
}
