package api

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/gamesites"
	"github.com/youruser/oppailib/internal/models"
)

// The pairing with Launchy, the desktop game launcher: the library sync.
//
//	GET    /api/launchy/games                 every game, with its remote and launcher state, for the sync
//	POST   /api/launchy/games                 multipart meta + cover: a launcher entry becomes a library game
//	PUT    /api/launchy/games/{id}            the launcher's state and any metadata it changed
//	DELETE /api/launchy/games/{id}            unpair
//
// The connection itself — the long poll, the requests it carries, and the
// launcher's report about itself — is in launchy_control.go; how the launcher
// signs in is in api_keys.go.

func toLaunchyLink(row *db.GameLaunchyRow) models.GameLaunchy {
	return models.GameLaunchy{
		LaunchyID: row.LaunchyID, Installed: row.Installed, Version: row.Version,
		PlaySeconds: row.PlaySeconds, LastPlayed: row.LastPlayed, LaunchCount: row.LaunchCount, UpdatedAt: row.UpdatedAt,
	}
}

// launchyGame is one game as the sync sees it: the library's view plus both
// side-tables, so the launcher reads everything it needs in one pass.
type launchyGame struct {
	models.Media
	Developer string `json:"developer,omitempty"`
	Saves     int    `json:"saves"`
}

// developerCategory is the tag category a game's developer is filed under. A
// developer is a tag rather than a column so it is searchable and filterable like
// everything else, and so the media table need not grow a games-only column.
const developerCategory = "developer"

func (s *Server) toLaunchyGame(ctx context.Context, row *db.MediaRow) launchyGame {
	g := launchyGame{Media: s.toModel(row)}
	g.Media.Tags, _ = s.db.TagsForMedia(ctx, row.ID)
	for _, t := range g.Media.Tags {
		if t.Category == developerCategory && g.Developer == "" {
			g.Developer = t.Name
		}
	}
	g.Media.Remote, g.Media.Launchy = s.gameSides(ctx, row.ID)
	if saves, err := s.db.ListGameSaves(ctx, row.ID); err == nil {
		g.Saves = len(saves)
	}
	return g
}

// gameSides is a game's remote reference and launcher link, either of which may
// be absent.
func (s *Server) gameSides(ctx context.Context, id int64) (*models.GameRemote, *models.GameLaunchy) {
	remote := s.gameRemoteFor(ctx, id)
	var link *models.GameLaunchy
	if row, err := s.db.GetGameLaunchy(ctx, id); err == nil {
		l := toLaunchyLink(row)
		link = &l
	}
	return remote, link
}

func (s *Server) handleLaunchyGames(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.ListGames(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	items := make([]launchyGame, 0, len(rows))
	for _, row := range rows {
		items = append(items, s.toLaunchyGame(r.Context(), row))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "status": s.launchy.status()})
}

// launchyMeta is what the launcher says about one of its entries. The media
// fields are pointers so a sync can send only what changed; the launcher-state
// fields are always the launcher's to set.
type launchyMeta struct {
	LaunchyID   string   `json:"launchyId"`
	Title       *string  `json:"title"`
	Developer   *string  `json:"developer"`
	Description *string  `json:"description"`
	Rating      *int     `json:"rating"`
	Favorite    *bool    `json:"favorite"`
	Tags        []string `json:"tags"`
	SourceURL   string   `json:"sourceUrl"`

	Installed   bool   `json:"installed"`
	Version     string `json:"version"`
	PlaySeconds int64  `json:"playSeconds"`
	LastPlayed  int64  `json:"lastPlayed"`
	LaunchCount int64  `json:"launchCount"`

	Remote *struct {
		Site          string `json:"site"`
		ID            string `json:"id"`
		URL           string `json:"url"`
		KnownVersion  string `json:"knownVersion"`
		LatestVersion string `json:"latestVersion"`
		Changelog     string `json:"changelog"`
	} `json:"remote"`
}

// handleLaunchyCreateGame turns a launcher entry into a library game: the cover
// becomes the blob (as a scraped game's does), the rest becomes metadata.
func (s *Server) handleLaunchyCreateGame(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<20)
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid upload")
		return
	}
	var meta launchyMeta
	if err := json.Unmarshal([]byte(r.FormValue("meta")), &meta); err != nil || meta.LaunchyID == "" || meta.Title == nil || strings.TrimSpace(*meta.Title) == "" {
		writeErr(w, http.StatusBadRequest, "meta needs a launchyId and a title")
		return
	}
	// The same launcher entry sent twice is the same game.
	if id, err := s.db.GameByLaunchyID(r.Context(), meta.LaunchyID); err == nil {
		s.applyLaunchyMeta(r.Context(), id, meta)
		row, _ := s.db.GetMedia(r.Context(), id)
		writeJSON(w, http.StatusOK, s.toLaunchyGame(r.Context(), row))
		return
	}

	var cover io.Reader
	if file, _, err := r.FormFile("cover"); err == nil {
		defer file.Close()
		cover = file
	} else {
		// No artwork in the launcher either. A game needs a blob, and two placeholders
		// must not collide on the store's hash — so the placeholder carries the
		// entry's id in its pixels.
		cover = bytes.NewReader(placeholderCover(meta.LaunchyID))
	}
	put, err := s.store.Put(cover)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(strings.TrimSpace(*meta.Title)), []byte("title"))
	row := &db.MediaRow{Kind: string(models.KindGame), SHA256: put.SHA256, Size: put.Size, BlobPath: put.RelPath, TitleEnc: titleEnc}
	if meta.Description != nil && *meta.Description != "" {
		row.NotesEnc, _ = crypto.SealBytes(s.kek, []byte(*meta.Description), []byte("notes"))
	}
	if src := strings.TrimSpace(meta.SourceURL); src != "" {
		row.SourceEnc, _ = crypto.SealBytes(s.kek, []byte(src), []byte("source"))
		row.DownloadEnc, _ = crypto.SealBytes(s.kek, []byte(src), []byte("download"))
	}
	if meta.Rating != nil {
		row.Rating = clampRating(*meta.Rating)
	}
	if meta.Favorite != nil {
		row.Favorite = *meta.Favorite
	}
	id, existed, err := s.db.InsertMedia(r.Context(), row)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !existed {
		if err := s.db.SetThumbPath(r.Context(), id, put.RelPath); err != nil {
			s.log.Warn("launchy game cover thumb", "media", id, "err", err)
		}
	}
	s.applyLaunchyMeta(r.Context(), id, meta)
	full, _ := s.db.GetMedia(r.Context(), id)
	writeJSON(w, http.StatusCreated, s.toLaunchyGame(r.Context(), full))
}

func clampRating(n int) int {
	if n < 0 {
		return 0
	}
	if n > 5 {
		return 5
	}
	return n
}

// applyLaunchyMeta writes the launcher's state and whichever metadata it sent.
func (s *Server) applyLaunchyMeta(ctx context.Context, id int64, meta launchyMeta) {
	patch := db.MediaPatch{}
	if meta.Title != nil && strings.TrimSpace(*meta.Title) != "" {
		patch.SetTitle = true
		patch.TitleEnc, _ = crypto.SealBytes(s.kek, []byte(strings.TrimSpace(*meta.Title)), []byte("title"))
	}
	if meta.Description != nil {
		patch.SetNotes = true
		if *meta.Description != "" {
			patch.NotesEnc, _ = crypto.SealBytes(s.kek, []byte(*meta.Description), []byte("notes"))
		}
	}
	if meta.Rating != nil {
		patch.SetRating, patch.Rating = true, clampRating(*meta.Rating)
	}
	if meta.Favorite != nil {
		patch.SetFavorite, patch.Favorite = true, *meta.Favorite
	}
	if patch.SetTitle || patch.SetNotes || patch.SetRating || patch.SetFavorite {
		if err := s.db.UpdateMedia(ctx, id, patch); err != nil {
			s.log.Warn("launchy sync: media patch", "media", id, "err", err)
		}
	}
	// Tags are merged in, never removed: the tagger's and the scraper's tags are
	// not the launcher's to take away.
	if len(meta.Tags) > 0 {
		for _, t := range meta.Tags {
			if t = strings.TrimSpace(t); t != "" {
				_ = s.db.AddTag(ctx, id, t, "general", "manual", 0)
			}
		}
	}
	if meta.Developer != nil && strings.TrimSpace(*meta.Developer) != "" {
		_ = s.db.AddTag(ctx, id, strings.TrimSpace(*meta.Developer), developerCategory, "manual", 0)
	}
	if meta.Remote != nil && meta.Remote.URL != "" {
		if site, ok := gamesites.ParseSite(meta.Remote.Site); ok {
			s.mergeRemote(ctx, id, site, meta)
		}
	}
	if err := s.db.UpsertGameLaunchy(ctx, &db.GameLaunchyRow{
		GameID: id, LaunchyID: meta.LaunchyID, Installed: meta.Installed, Version: strings.TrimSpace(meta.Version),
		PlaySeconds: meta.PlaySeconds, LastPlayed: meta.LastPlayed, LaunchCount: meta.LaunchCount,
	}); err != nil {
		s.log.Warn("launchy sync: link", "media", id, "err", err)
	}
	s.touchLibraryIndex()
}

// mergeRemote reconciles the launcher's idea of a game's page with ours. The
// launcher is the authority on what is installed (knownVersion); on what the
// site last said, whichever side has an answer wins, so neither side's check is
// undone by the other's silence.
func (s *Server) mergeRemote(ctx context.Context, id int64, site gamesites.Site, meta launchyMeta) {
	known := strings.TrimSpace(meta.Remote.KnownVersion)
	latest := strings.TrimSpace(meta.Remote.LatestVersion)
	changelog := meta.Remote.Changelog
	var checkedAt, seenAt int64
	if row, err := s.db.GetGameRemote(ctx, id); err == nil {
		if latest == "" {
			latest = row.LatestVersion
		}
		if changelog == "" {
			changelog = s.decrypt(row.ChangelogEnc, "notes")
		}
		checkedAt, seenAt = row.CheckedAt, row.UpdateSeenAt
	}
	if latest == "" {
		latest = known
	}
	if !gamesites.HasUpdate(known, latest) {
		seenAt = 0
	} else if seenAt == 0 {
		seenAt = time.Now().Unix()
	}
	enc, err := s.sealRef(remoteRef{ID: meta.Remote.ID, URL: strings.TrimSpace(meta.Remote.URL)})
	if err != nil {
		return
	}
	var changelogEnc []byte
	if changelog != "" {
		changelogEnc, _ = crypto.SealBytes(s.kek, []byte(changelog), []byte("notes"))
	}
	if err := s.db.UpsertGameRemote(ctx, &db.GameRemoteRow{
		GameID: id, Site: string(site), RefEnc: enc, KnownVersion: known, LatestVersion: latest,
		ChangelogEnc: changelogEnc, CheckedAt: checkedAt, UpdateSeenAt: seenAt,
	}); err != nil {
		s.log.Warn("launchy sync: remote", "media", id, "err", err)
	}
}

func (s *Server) handleLaunchySyncGame(w http.ResponseWriter, r *http.Request) {
	id, ok := s.gameID(w, r)
	if !ok {
		return
	}
	var meta launchyMeta
	if err := json.NewDecoder(r.Body).Decode(&meta); err != nil || meta.LaunchyID == "" {
		writeErr(w, http.StatusBadRequest, "need a launchyId")
		return
	}
	s.applyLaunchyMeta(r.Context(), id, meta)
	row, err := s.db.GetMedia(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, s.toLaunchyGame(r.Context(), row))
}

func (s *Server) handleLaunchyUnpairGame(w http.ResponseWriter, r *http.Request) {
	id, ok := s.gameID(w, r)
	if !ok {
		return
	}
	existed, err := s.db.DeleteGameLaunchy(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !existed {
		writeErr(w, http.StatusNotFound, "this game is not paired")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// placeholderCover draws a cover for a game that has no art: a flat tile in a
// colour picked from the entry's id, with the id's hash written along the bottom
// row as pixels so no two placeholders ever share a blob.
func placeholderCover(launchyID string) []byte {
	sum := sha256.Sum256([]byte(launchyID))
	const w, h = 320, 480
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	base := color.RGBA{R: 40 + sum[0]%80, G: 40 + sum[1]%80, B: 60 + sum[2]%100, A: 255}
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.SetRGBA(x, y, base)
		}
	}
	for i, b := range sum {
		img.SetRGBA(i*10, h-1, color.RGBA{R: b, G: 255 - b, B: b ^ 0x5a, A: 255})
	}
	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}
