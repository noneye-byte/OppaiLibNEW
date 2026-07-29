package db

import (
	"context"
	"database/sql"
	"errors"
)

// Resumable upload sessions.
//
// The design point of this table is that the *server* is the authority on what has
// arrived. A client — a phone that was killed mid-upload, a tab that was closed, an
// app reinstalled — can ask "what do you already have of this file?" and be told,
// rather than having to remember it itself. Client-side bookkeeping is exactly what
// gets lost in the failures this exists to survive.

// Upload session statuses.
const (
	UploadOpen       = "open"       // accepting chunks
	UploadAssembling = "assembling" // complete() is running; no further chunks
	UploadCompleted  = "completed"
	UploadFailed     = "failed"
	UploadCancelled  = "cancelled"
)

// UploadRow is one file being uploaded.
type UploadRow struct {
	ID          string
	UserID      int64
	Fingerprint string
	FilenameEnc []byte
	TitleEnc    []byte
	Size        int64
	ChunkSize   int64
	Mime        string
	Kind        string
	Status      string
	MediaID     int64 // 0 until assembled
	Error       string
	CreatedAt   int64
	UpdatedAt   int64
}

// UploadChunk is one received piece.
type UploadChunk struct {
	Index  int64
	Size   int64
	SHA256 string
}

// ErrUploadExists is returned by CreateUpload when a live session already covers
// this user + fingerprint. The caller resumes that one instead of starting a second.
var ErrUploadExists = errors.New("db: upload session already live")

func (d *DB) CreateUpload(ctx context.Context, u *UploadRow) error {
	_, err := d.sql.ExecContext(ctx, `
		INSERT INTO upload_sessions(id, user_id, fingerprint, filename_enc, title_enc,
		    size, chunk_size, mime, kind, status, created_at, updated_at)
		VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
		u.ID, u.UserID, u.Fingerprint, u.FilenameEnc, u.TitleEnc,
		u.Size, u.ChunkSize, u.Mime, u.Kind, UploadOpen, now(), now())
	if err != nil {
		// The partial unique index is the race-proof half of the duplicate guard: two
		// simultaneous "start upload" calls both see no existing row, and the index
		// decides which one wins. Translating it here lets the handler resume rather
		// than surface a constraint error.
		if isUniqueViolation(err) {
			return ErrUploadExists
		}
		return err
	}
	return nil
}

// LiveUploadByFingerprint finds the session a repeated request should resume.
func (d *DB) LiveUploadByFingerprint(ctx context.Context, userID int64, fingerprint string) (*UploadRow, error) {
	return d.scanUpload(d.sql.QueryRowContext(ctx, `
		SELECT id, user_id, fingerprint, filename_enc, title_enc, size, chunk_size,
		       mime, kind, status, COALESCE(media_id,0), COALESCE(error,''), created_at, updated_at
		FROM upload_sessions
		WHERE user_id = ? AND fingerprint = ? AND status IN ('open','assembling')`,
		userID, fingerprint))
}

// GetUpload reads one session. It is deliberately scoped by user: a session id is
// unguessable, but "unguessable" is not an authorization model.
func (d *DB) GetUpload(ctx context.Context, userID int64, id string) (*UploadRow, error) {
	return d.scanUpload(d.sql.QueryRowContext(ctx, `
		SELECT id, user_id, fingerprint, filename_enc, title_enc, size, chunk_size,
		       mime, kind, status, COALESCE(media_id,0), COALESCE(error,''), created_at, updated_at
		FROM upload_sessions WHERE id = ? AND user_id = ?`, id, userID))
}

func (d *DB) scanUpload(row *sql.Row) (*UploadRow, error) {
	var u UploadRow
	err := row.Scan(&u.ID, &u.UserID, &u.Fingerprint, &u.FilenameEnc, &u.TitleEnc,
		&u.Size, &u.ChunkSize, &u.Mime, &u.Kind, &u.Status, &u.MediaID, &u.Error,
		&u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ListUploads returns a user's sessions, newest first. Terminal rows are included:
// the upload manager's history list is this query, and "it failed and here is why"
// is worth more than a row that silently disappears.
func (d *DB) ListUploads(ctx context.Context, userID int64, limit int) ([]*UploadRow, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, user_id, fingerprint, filename_enc, title_enc, size, chunk_size,
		       mime, kind, status, COALESCE(media_id,0), COALESCE(error,''), created_at, updated_at
		FROM upload_sessions WHERE user_id = ?
		ORDER BY updated_at DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*UploadRow
	for rows.Next() {
		var u UploadRow
		if err := rows.Scan(&u.ID, &u.UserID, &u.Fingerprint, &u.FilenameEnc, &u.TitleEnc,
			&u.Size, &u.ChunkSize, &u.Mime, &u.Kind, &u.Status, &u.MediaID, &u.Error,
			&u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, &u)
	}
	return out, rows.Err()
}

// RecordChunk notes that a piece arrived. Idempotent by primary key: a retry that
// re-sends a chunk the server already has overwrites the same row rather than
// double-counting it.
func (d *DB) RecordChunk(ctx context.Context, sessionID string, c UploadChunk) error {
	_, err := d.sql.ExecContext(ctx, `
		INSERT INTO upload_chunks(session_id, idx, size, sha256, created_at)
		VALUES(?,?,?,?,?)
		ON CONFLICT(session_id, idx) DO UPDATE SET size = excluded.size, sha256 = excluded.sha256`,
		sessionID, c.Index, c.Size, c.SHA256, now())
	if err != nil {
		return err
	}
	_, err = d.sql.ExecContext(ctx, `UPDATE upload_sessions SET updated_at = ? WHERE id = ?`, now(), sessionID)
	return err
}

// Chunks lists what has arrived, in order.
func (d *DB) Chunks(ctx context.Context, sessionID string) ([]UploadChunk, error) {
	rows, err := d.sql.QueryContext(ctx,
		`SELECT idx, size, sha256 FROM upload_chunks WHERE session_id = ? ORDER BY idx`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []UploadChunk{}
	for rows.Next() {
		var c UploadChunk
		if err := rows.Scan(&c.Index, &c.Size, &c.SHA256); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ClaimUploadForAssembly moves a session from open to assembling, and reports
// whether this caller is the one that moved it.
//
// It is the whole concurrency story for completion: two clients (or one client
// pressing twice) can both call complete, and exactly one gets true. The other is
// told the upload is already being assembled instead of racing it into the store.
func (d *DB) ClaimUploadForAssembly(ctx context.Context, userID int64, id string) (bool, error) {
	res, err := d.sql.ExecContext(ctx,
		`UPDATE upload_sessions SET status = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = ?`,
		UploadAssembling, now(), id, userID, UploadOpen)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	return n == 1, err
}

// FinishUpload records a terminal (or, for a failed assembly, a recoverable) state.
// Passing UploadOpen returns the session to accepting chunks, which is what a
// completion that found gaps should do — the parts already received stay valid.
func (d *DB) FinishUpload(ctx context.Context, id, status string, mediaID int64, errMsg string) error {
	_, err := d.sql.ExecContext(ctx,
		`UPDATE upload_sessions SET status = ?, media_id = ?, error = ?, updated_at = ? WHERE id = ?`,
		status, nullableID(mediaID), errMsg, now(), id)
	return err
}

// DeleteUpload removes a session row (chunks cascade). Staging files are the
// caller's to remove — the database does not know where they are.
func (d *DB) DeleteUpload(ctx context.Context, userID int64, id string) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM upload_sessions WHERE id = ? AND user_id = ?`, id, userID)
	return err
}

// StaleUploads lists sessions eligible for cleanup: live ones untouched since
// liveBefore, and terminal ones older than doneBefore.
//
// Both halves matter. A live session abandoned mid-upload is holding real disk in
// the staging area, which is the "failed upload chunks" cleanup policy. A terminal
// row is only a history entry, so it is kept far longer and pruned for tidiness.
func (d *DB) StaleUploads(ctx context.Context, liveBefore, doneBefore int64) ([]*UploadRow, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT id, user_id, fingerprint, filename_enc, title_enc, size, chunk_size,
		       mime, kind, status, COALESCE(media_id,0), COALESCE(error,''), created_at, updated_at
		FROM upload_sessions
		WHERE (status IN ('open','assembling') AND updated_at < ?)
		   OR (status NOT IN ('open','assembling') AND updated_at < ?)`,
		liveBefore, doneBefore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*UploadRow
	for rows.Next() {
		var u UploadRow
		if err := rows.Scan(&u.ID, &u.UserID, &u.Fingerprint, &u.FilenameEnc, &u.TitleEnc,
			&u.Size, &u.ChunkSize, &u.Mime, &u.Kind, &u.Status, &u.MediaID, &u.Error,
			&u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, &u)
	}
	return out, rows.Err()
}

// UploadStagingBytes totals the bytes currently parked in unfinished uploads, for
// the storage diagnostics.
func (d *DB) UploadStagingBytes(ctx context.Context) (int64, error) {
	var n sql.NullInt64
	err := d.sql.QueryRowContext(ctx, `
		SELECT SUM(c.size) FROM upload_chunks c
		JOIN upload_sessions s ON s.id = c.session_id
		WHERE s.status IN ('open','assembling')`).Scan(&n)
	if err != nil {
		return 0, err
	}
	return n.Int64, nil
}

// LiveUploadBytes totals the bytes still expected by unfinished uploads — what the
// storage warning needs in order to say "these uploads need this much more room".
func (d *DB) LiveUploadBytes(ctx context.Context) (int64, error) {
	var n sql.NullInt64
	err := d.sql.QueryRowContext(ctx,
		`SELECT SUM(size) FROM upload_sessions WHERE status IN ('open','assembling')`).Scan(&n)
	if err != nil {
		return 0, err
	}
	return n.Int64, nil
}

// AllLiveUploadIDs lists every unfinished session across users, so the sweeper can
// tell a staging directory that is in use from one that was orphaned by a crash.
func (d *DB) AllLiveUploadIDs(ctx context.Context) (map[string]bool, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT id FROM upload_sessions`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]bool{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = true
	}
	return out, rows.Err()
}

func nullableID(id int64) any {
	if id == 0 {
		return nil
	}
	return id
}
