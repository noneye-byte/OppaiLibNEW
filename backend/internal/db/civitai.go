package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

// What the studio's models are on Civitai. See the table comment in schema.sql.

// CivitaiLink is one InvokeAI model's Civitai record, or the fact that it has none
// (ModelID 0), and when that was last confirmed.
type CivitaiLink struct {
	ModelKey        string
	Hash            string
	ModelID         int64
	VersionID       int64
	LatestVersionID int64
	ModelName       string
	VersionName     string
	ModelType       string
	BaseModel       string
	Creator         string
	Description     string
	TrainedWords    []string
	Previews        []string
	CheckedAt       int64
	// CoverURL is the showcase picture chosen as the InvokeAI cover, when someone
	// chose one rather than taking the first. Kept so re-fetching from the
	// catalogue does not quietly put the first picture back.
	CoverURL string
}

// PutCivitaiLink records or replaces what is known about one model.
func (d *DB) PutCivitaiLink(ctx context.Context, l CivitaiLink) error {
	words, _ := json.Marshal(nonNil(l.TrainedWords))
	previews, _ := json.Marshal(nonNil(l.Previews))
	_, err := d.sql.ExecContext(ctx, `
		INSERT INTO civitai_models(model_key, hash, model_id, version_id, latest_version_id,
			model_name, version_name, model_type, base_model, creator, description,
			trained_words, previews, checked_at, cover_url)
		VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(model_key) DO UPDATE SET
			hash = excluded.hash, model_id = excluded.model_id, version_id = excluded.version_id,
			latest_version_id = excluded.latest_version_id, model_name = excluded.model_name,
			version_name = excluded.version_name, model_type = excluded.model_type,
			base_model = excluded.base_model, creator = excluded.creator,
			description = excluded.description, trained_words = excluded.trained_words,
			previews = excluded.previews, checked_at = excluded.checked_at,
			cover_url = excluded.cover_url`,
		l.ModelKey, l.Hash, l.ModelID, l.VersionID, l.LatestVersionID,
		l.ModelName, l.VersionName, l.ModelType, l.BaseModel, l.Creator, l.Description,
		string(words), string(previews), now(), l.CoverURL)
	return err
}

// SetCivitaiCover records which picture is a model's cover. Nothing else about
// the link changes.
func (d *DB) SetCivitaiCover(ctx context.Context, modelKey, coverURL string) error {
	_, err := d.sql.ExecContext(ctx, `UPDATE civitai_models SET cover_url = ? WHERE model_key = ?`, coverURL, modelKey)
	return err
}

// CivitaiLinks returns every recorded link, keyed by InvokeAI model key.
func (d *DB) CivitaiLinks(ctx context.Context) (map[string]CivitaiLink, error) {
	rows, err := d.sql.QueryContext(ctx, `
		SELECT model_key, hash, model_id, version_id, latest_version_id, model_name,
			version_name, model_type, base_model, creator, description, trained_words,
			previews, checked_at, cover_url
		FROM civitai_models`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]CivitaiLink{}
	for rows.Next() {
		var l CivitaiLink
		var words, previews string
		if err := rows.Scan(&l.ModelKey, &l.Hash, &l.ModelID, &l.VersionID, &l.LatestVersionID,
			&l.ModelName, &l.VersionName, &l.ModelType, &l.BaseModel, &l.Creator, &l.Description,
			&words, &previews, &l.CheckedAt, &l.CoverURL); err != nil {
			return nil, err
		}
		_ = json.Unmarshal([]byte(words), &l.TrainedWords)
		_ = json.Unmarshal([]byte(previews), &l.Previews)
		l.TrainedWords, l.Previews = nonNil(l.TrainedWords), nonNil(l.Previews)
		out[l.ModelKey] = l
	}
	return out, rows.Err()
}

// CivitaiLink reads one model's record. ok is false when nothing has been recorded.
func (d *DB) CivitaiLink(ctx context.Context, modelKey string) (CivitaiLink, bool, error) {
	links, err := d.CivitaiLinks(ctx)
	if err != nil {
		return CivitaiLink{}, false, err
	}
	l, ok := links[modelKey]
	return l, ok, nil
}

// DeleteCivitaiLink forgets a model, for when InvokeAI no longer lists it.
func (d *DB) DeleteCivitaiLink(ctx context.Context, modelKey string) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM civitai_models WHERE model_key = ?`, modelKey)
	return err
}

// CivitaiInstall is a download in InvokeAI's hands that still owes its metadata.
type CivitaiInstall struct {
	Source    string
	ModelID   int64
	VersionID int64
	CreatedAt int64
	// ReplaceKey is the InvokeAI record this download supersedes — set when the
	// install is an update to a newer version — and is deleted once the new file
	// is registered and dressed. Empty for a plain install.
	ReplaceKey string
}

// AddCivitaiInstall promises to dress a model once InvokeAI has fetched it. Keyed by
// the download URL, which is also how InvokeAI names the job's source, so the two
// can be matched without InvokeAI having told us the job id first.
func (d *DB) AddCivitaiInstall(ctx context.Context, source string, modelID, versionID int64, replaceKey string) error {
	_, err := d.sql.ExecContext(ctx, `
		INSERT INTO civitai_installs(source, model_id, version_id, created_at, replace_key) VALUES(?, ?, ?, ?, ?)
		ON CONFLICT(source) DO UPDATE SET model_id = excluded.model_id,
			version_id = excluded.version_id, created_at = excluded.created_at,
			replace_key = excluded.replace_key`,
		source, modelID, versionID, now(), replaceKey)
	return err
}

// CivitaiInstalls lists the promises still outstanding.
func (d *DB) CivitaiInstalls(ctx context.Context) ([]CivitaiInstall, error) {
	rows, err := d.sql.QueryContext(ctx,
		`SELECT source, model_id, version_id, created_at, replace_key FROM civitai_installs ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CivitaiInstall
	for rows.Next() {
		var in CivitaiInstall
		if err := rows.Scan(&in.Source, &in.ModelID, &in.VersionID, &in.CreatedAt, &in.ReplaceKey); err != nil {
			return nil, err
		}
		out = append(out, in)
	}
	return out, rows.Err()
}

// DeleteCivitaiInstall retires a promise, kept or abandoned.
func (d *DB) DeleteCivitaiInstall(ctx context.Context, source string) error {
	_, err := d.sql.ExecContext(ctx, `DELETE FROM civitai_installs WHERE source = ?`, source)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	return err
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
