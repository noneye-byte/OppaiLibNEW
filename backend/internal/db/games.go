package db

import (
	"context"
)

// GameRemoteRow is where a game came from and what the site said about it the
// last time anyone looked. RefEnc seals the page URL and the site's own id for
// the game: an F95zone thread number is as good as a title to anyone who can
// type it into a browser, so it is ciphertext like the title is. The site name
// and the version strings stay plain — "0.7.2" says nothing on its own, and the
// update sweep wants to read them without decrypting every row.
type GameRemoteRow struct {
	GameID        int64
	Site          string
	RefEnc        []byte
	KnownVersion  string
	LatestVersion string
	ChangelogEnc  []byte
	CheckedAt     int64
	UpdateSeenAt  int64
}

// UpsertGameRemote records (or replaces) where a game came from. A replace keeps
// nothing from the old row: pointing a game at a different page is a fresh start
// for its update history.
func (d *DB) UpsertGameRemote(ctx context.Context, r *GameRemoteRow) error {
	_, err := d.sql.ExecContext(ctx, `
		INSERT INTO game_remote(game_id, site, ref_enc, known_version, latest_version, changelog_enc, checked_at, update_seen_at)
		VALUES(?,?,?,?,?,?,?,?)
		ON CONFLICT(game_id) DO UPDATE SET
		  site=excluded.site, ref_enc=excluded.ref_enc, known_version=excluded.known_version,
		  latest_version=excluded.latest_version, changelog_enc=excluded.changelog_enc,
		  checked_at=excluded.checked_at, update_seen_at=excluded.update_seen_at`,
		r.GameID, r.Site, r.RefEnc, r.KnownVersion, r.LatestVersion, nullBytes(r.ChangelogEnc), r.CheckedAt, r.UpdateSeenAt)
	return err
}

func scanGameRemote(row interface{ Scan(...any) error }) (*GameRemoteRow, error) {
	r := &GameRemoteRow{}
	if err := row.Scan(&r.GameID, &r.Site, &r.RefEnc, &r.KnownVersion, &r.LatestVersion, &r.ChangelogEnc, &r.CheckedAt, &r.UpdateSeenAt); err != nil {
		return nil, err
	}
	return r, nil
}

const gameRemoteCols = `game_id, site, ref_enc, known_version, latest_version, changelog_enc, checked_at, update_seen_at`

// GetGameRemote returns a game's remote reference, or sql.ErrNoRows.
func (d *DB) GetGameRemote(ctx context.Context, gameID int64) (*GameRemoteRow, error) {
	return scanGameRemote(d.sql.QueryRowContext(ctx, `SELECT `+gameRemoteCols+` FROM game_remote WHERE game_id=?`, gameID))
}

// ListGameRemotes returns every remote reference. The library's games are a few
// hundred rows at most, and an update sweep or a browse page's "already on the
// shelf" marks want all of them at once.
func (d *DB) ListGameRemotes(ctx context.Context) ([]*GameRemoteRow, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT `+gameRemoteCols+` FROM game_remote ORDER BY game_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*GameRemoteRow
	for rows.Next() {
		r, err := scanGameRemote(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// DeleteGameRemote forgets where a game came from. Reports whether there was one.
func (d *DB) DeleteGameRemote(ctx context.Context, gameID int64) (bool, error) {
	res, err := d.sql.ExecContext(ctx, `DELETE FROM game_remote WHERE game_id=?`, gameID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

// RecordGameCheck stores what a page read found. An empty latest keeps the old
// one — a page that would not say is not a page that said "nothing".
func (d *DB) RecordGameCheck(ctx context.Context, gameID int64, latest string, changelogEnc []byte, checkedAt, updateSeenAt int64) error {
	_, err := d.sql.ExecContext(ctx, `
		UPDATE game_remote SET
		  latest_version = CASE WHEN ? = '' THEN latest_version ELSE ? END,
		  changelog_enc  = CASE WHEN ? IS NULL THEN changelog_enc ELSE ? END,
		  checked_at = ?, update_seen_at = ?
		WHERE game_id=?`,
		latest, latest, nullBytes(changelogEnc), nullBytes(changelogEnc), checkedAt, updateSeenAt, gameID)
	return err
}

// AcknowledgeGameUpdate marks the newest version as the one in use, which clears
// the update badge for someone who updated the game outside the app.
func (d *DB) AcknowledgeGameUpdate(ctx context.Context, gameID int64) error {
	_, err := d.sql.ExecContext(ctx, `
		UPDATE game_remote SET
		  known_version = CASE WHEN latest_version = '' THEN known_version ELSE latest_version END,
		  update_seen_at = 0
		WHERE game_id=?`, gameID)
	return err
}

// GameLaunchyRow is the desktop launcher's side of a game: that it is installed
// on the PC, how much it has been played there, and which Launchy entry it is.
// Written only by Launchy's sync; read by every client that wants to offer
// "launch on PC" or show playtime.
type GameLaunchyRow struct {
	GameID      int64
	LaunchyID   string
	Installed   bool
	Version     string
	PlaySeconds int64
	LastPlayed  int64
	LaunchCount int64
	UpdatedAt   int64
}

// UpsertGameLaunchy records the launcher's state for a game.
func (d *DB) UpsertGameLaunchy(ctx context.Context, r *GameLaunchyRow) error {
	r.UpdatedAt = now()
	_, err := d.sql.ExecContext(ctx, `
		INSERT INTO game_launchy(game_id, launchy_id, installed, version, play_seconds, last_played, launch_count, updated_at)
		VALUES(?,?,?,?,?,?,?,?)
		ON CONFLICT(game_id) DO UPDATE SET
		  launchy_id=excluded.launchy_id, installed=excluded.installed, version=excluded.version,
		  play_seconds=excluded.play_seconds, last_played=excluded.last_played,
		  launch_count=excluded.launch_count, updated_at=excluded.updated_at`,
		r.GameID, r.LaunchyID, boolToInt(r.Installed), r.Version, r.PlaySeconds, r.LastPlayed, r.LaunchCount, r.UpdatedAt)
	if err != nil {
		return err
	}
	// Paired again, so wanted on the PC again, and the entry is no longer a deleted one.
	if _, err := d.sql.ExecContext(ctx, `DELETE FROM launchy_declined WHERE game_id=?`, r.GameID); err != nil {
		return err
	}
	_, err = d.sql.ExecContext(ctx, `DELETE FROM launchy_removed WHERE launchy_id=?`, r.LaunchyID)
	return err
}

const gameLaunchyCols = `game_id, launchy_id, installed, version, play_seconds, last_played, launch_count, updated_at`

func scanGameLaunchy(row interface{ Scan(...any) error }) (*GameLaunchyRow, error) {
	r := &GameLaunchyRow{}
	var installed int
	if err := row.Scan(&r.GameID, &r.LaunchyID, &installed, &r.Version, &r.PlaySeconds, &r.LastPlayed, &r.LaunchCount, &r.UpdatedAt); err != nil {
		return nil, err
	}
	r.Installed = installed != 0
	return r, nil
}

// GetGameLaunchy returns the launcher's record for a game, or sql.ErrNoRows.
func (d *DB) GetGameLaunchy(ctx context.Context, gameID int64) (*GameLaunchyRow, error) {
	return scanGameLaunchy(d.sql.QueryRowContext(ctx, `SELECT `+gameLaunchyCols+` FROM game_launchy WHERE game_id=?`, gameID))
}

// GameByLaunchyID finds the library game a Launchy entry is paired with.
func (d *DB) GameByLaunchyID(ctx context.Context, launchyID string) (int64, error) {
	var id int64
	err := d.sql.QueryRowContext(ctx, `SELECT game_id FROM game_launchy WHERE launchy_id=?`, launchyID).Scan(&id)
	return id, err
}

// ListGameLaunchy returns every pairing.
func (d *DB) ListGameLaunchy(ctx context.Context) ([]*GameLaunchyRow, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT `+gameLaunchyCols+` FROM game_launchy ORDER BY game_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*GameLaunchyRow
	for rows.Next() {
		r, err := scanGameLaunchy(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// DeleteGameLaunchy unpairs a game because the launcher no longer has it, and
// remembers that it was taken off the PC so the next sync does not adopt it back.
// Reports whether it was paired.
func (d *DB) DeleteGameLaunchy(ctx context.Context, gameID int64) (bool, error) {
	res, err := d.sql.ExecContext(ctx, `DELETE FROM game_launchy WHERE game_id=?`, gameID)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	if n > 0 {
		if _, err := d.sql.ExecContext(ctx,
			`INSERT OR REPLACE INTO launchy_declined(game_id, declined_at) VALUES(?, ?)`, gameID, now()); err != nil {
			return true, err
		}
	}
	return n > 0, nil
}

// LaunchyRemoved reports whether a launcher entry's game was deleted from the library.
func (d *DB) LaunchyRemoved(ctx context.Context, launchyID string) (bool, error) {
	var n int
	err := d.sql.QueryRowContext(ctx, `SELECT COUNT(*) FROM launchy_removed WHERE launchy_id=?`, launchyID).Scan(&n)
	return n > 0, err
}

// LaunchyRemovedIDs lists the launcher entries whose games were deleted here.
func (d *DB) LaunchyRemovedIDs(ctx context.Context) ([]string, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT launchy_id FROM launchy_removed ORDER BY removed_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// LaunchyDeclinedIDs lists the library games taken off the PC.
func (d *DB) LaunchyDeclinedIDs(ctx context.Context) (map[int64]bool, error) {
	rows, err := d.sql.QueryContext(ctx, `SELECT game_id FROM launchy_declined`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64]bool{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out[id] = true
	}
	return out, rows.Err()
}

// ForgetLaunchyRemovals lets every deleted and declined game sync again: deleted
// launcher entries may be sent here as new, declined games are offered to the PC.
// Reports how many of each were forgotten.
func (d *DB) ForgetLaunchyRemovals(ctx context.Context) (removed, declined int64, err error) {
	res, err := d.sql.ExecContext(ctx, `DELETE FROM launchy_removed`)
	if err != nil {
		return 0, 0, err
	}
	removed, _ = res.RowsAffected()
	res, err = d.sql.ExecContext(ctx, `DELETE FROM launchy_declined`)
	if err != nil {
		return removed, 0, err
	}
	declined, _ = res.RowsAffected()
	return removed, declined, nil
}

// ListGames returns every game in the library, newest first. Games are the one
// kind small enough to hand over whole: the pairing sync and the update sweep both
// walk all of them.
func (d *DB) ListGames(ctx context.Context) ([]*MediaRow, error) {
	var out []*MediaRow
	for offset := 0; ; offset += 200 {
		page, err := d.MediaPage(ctx, MediaFilter{Kind: "game", Sort: SortNewest}, 200, offset)
		if err != nil {
			return nil, err
		}
		out = append(out, page...)
		if len(page) < 200 {
			return out, nil
		}
	}
}

// TouchMedia bumps a row's updated_at, for a change made to one of its
// side-tables that a client keys its sync off.
func (d *DB) TouchMedia(ctx context.Context, id int64) error {
	_, err := d.sql.ExecContext(ctx, `UPDATE media SET updated_at=? WHERE id=?`, now(), id)
	return err
}
