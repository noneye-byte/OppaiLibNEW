package api

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/gamesites"
	"github.com/youruser/oppailib/internal/models"
)

// The pairing with Launchy, the desktop game launcher.
//
//	GET    /api/launchy                       is the launcher connected, and what is it running
//	GET    /api/launchy/commands?wait=&running=  the launcher's long poll: check in, collect launch requests
//	POST   /api/launchy/commands/{cmd}        {ok, error}  the launcher reports a request's outcome
//	POST   /api/launchy/launch                {gameId}  ask the launcher to start a game
//	GET    /api/launchy/launch/{cmd}          how that request went
//	GET    /api/launchy/games                 every game, with its remote and launcher state, for the sync
//	POST   /api/launchy/games                 multipart meta + cover: a launcher entry becomes a library game
//	PUT    /api/launchy/games/{id}            the launcher's state and any metadata it changed
//	DELETE /api/launchy/games/{id}            unpair
//
// The launcher is the client throughout. It holds an ordinary session, syncs on
// its own schedule, and long-polls for launch requests; the server never reaches
// out to it, so there is nothing to configure on this side and the launcher works
// from behind any NAT. A launch request from the web or the phone is queued here
// and picked up on the next poll, which is at most a few seconds away while the
// launcher is up — and answered with "Launchy is not connected" when it is not,
// rather than queued into a void.

// launchyStale is how long after its last poll the launcher counts as gone. A poll
// waits up to 25 seconds, so a healthy launcher is never more than ~30 away.
const launchyStale = 75 * time.Second

// launchCommand is one request queued for the launcher.
type launchCommand struct {
	ID        string `json:"id"`
	Action    string `json:"action"`
	GameID    int64  `json:"gameId"`
	Status    string `json:"status"` // pending|sent|done|failed
	Error     string `json:"error,omitempty"`
	CreatedAt int64  `json:"createdAt"`
	DoneAt    int64  `json:"doneAt,omitempty"`
}

type launchyRuntime struct {
	mu       sync.Mutex
	name     string
	lastSeen time.Time
	running  map[int64]bool
	queue    []*launchCommand
	// Every command by id, so a client can ask how its request went. Swept of
	// anything older than a few minutes on each new request.
	commands map[string]*launchCommand
	// wake is closed and replaced whenever a command is queued, so a poll blocked
	// waiting can return at once.
	wake chan struct{}
}

func newLaunchyRuntime() *launchyRuntime {
	return &launchyRuntime{running: map[int64]bool{}, commands: map[string]*launchCommand{}, wake: make(chan struct{})}
}

func (l *launchyRuntime) connected() bool {
	return !l.lastSeen.IsZero() && time.Since(l.lastSeen) < launchyStale
}

// launchyStatus is what every client sees.
type launchyStatus struct {
	Connected bool    `json:"connected"`
	Name      string  `json:"name,omitempty"`
	LastSeen  int64   `json:"lastSeen,omitempty"`
	Running   []int64 `json:"running"`
	Pending   int     `json:"pending"`
}

func (l *launchyRuntime) status() launchyStatus {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := launchyStatus{Connected: l.connected(), Name: l.name, Running: []int64{}, Pending: len(l.queue)}
	if !l.lastSeen.IsZero() {
		out.LastSeen = l.lastSeen.Unix()
	}
	for id := range l.running {
		out.Running = append(out.Running, id)
	}
	return out
}

// checkIn records a poll from the launcher: its name and what it is running.
func (l *launchyRuntime) checkIn(name string, running []int64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if name != "" {
		l.name = name
	}
	l.lastSeen = time.Now()
	l.running = map[int64]bool{}
	for _, id := range running {
		l.running[id] = true
	}
}

// enqueue adds a command and wakes any waiting poll.
func (l *launchyRuntime) enqueue(action string, gameID int64) *launchCommand {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	cmd := &launchCommand{ID: hex.EncodeToString(b), Action: action, GameID: gameID, Status: "pending", CreatedAt: time.Now().Unix()}
	l.mu.Lock()
	defer l.mu.Unlock()
	for id, old := range l.commands {
		if time.Since(time.Unix(old.CreatedAt, 0)) > 10*time.Minute {
			delete(l.commands, id)
		}
	}
	l.commands[cmd.ID] = cmd
	l.queue = append(l.queue, cmd)
	close(l.wake)
	l.wake = make(chan struct{})
	return cmd
}

// take hands every queued command to the launcher and marks them sent.
func (l *launchyRuntime) take() []*launchCommand {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := l.queue
	l.queue = nil
	for _, cmd := range out {
		cmd.Status = "sent"
	}
	if out == nil {
		out = []*launchCommand{}
	}
	return out
}

func (l *launchyRuntime) waiter() <-chan struct{} {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.wake
}

func (l *launchyRuntime) finish(id string, ok bool, errText string) *launchCommand {
	l.mu.Lock()
	defer l.mu.Unlock()
	cmd := l.commands[id]
	if cmd == nil {
		return nil
	}
	cmd.DoneAt = time.Now().Unix()
	if ok {
		cmd.Status, cmd.Error = "done", ""
	} else {
		cmd.Status, cmd.Error = "failed", errText
	}
	return cmd
}

func (l *launchyRuntime) get(id string) *launchCommand {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.commands[id]
}

func (s *Server) handleLaunchyStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.launchy.status())
}

// handleLaunchyCommands is the launcher's long poll. It doubles as the heartbeat:
// the query carries what the launcher is running, and its arrival is what makes
// the launcher "connected".
func (s *Server) handleLaunchyCommands(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var running []int64
	for _, part := range strings.Split(q.Get("running"), ",") {
		if id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64); err == nil {
			running = append(running, id)
		}
	}
	s.launchy.checkIn(strings.TrimSpace(q.Get("name")), running)

	wait, _ := strconv.Atoi(q.Get("wait"))
	if wait < 0 {
		wait = 0
	}
	if wait > 25 {
		wait = 25
	}
	deadline := time.After(time.Duration(wait) * time.Second)
	for {
		cmds := s.launchy.take()
		if len(cmds) > 0 || wait == 0 {
			writeJSON(w, http.StatusOK, map[string]any{"commands": cmds})
			return
		}
		select {
		case <-s.launchy.waiter():
		case <-deadline:
			writeJSON(w, http.StatusOK, map[string]any{"commands": []*launchCommand{}})
			return
		case <-r.Context().Done():
			return
		}
	}
}

func (s *Server) handleLaunchyCommandDone(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OK    bool   `json:"ok"`
		Error string `json:"error"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	cmd := s.launchy.finish(r.PathValue("cmd"), req.OK, req.Error)
	if cmd == nil {
		writeErr(w, http.StatusNotFound, "no such request")
		return
	}
	writeJSON(w, http.StatusOK, cmd)
}

// handleLaunchyLaunch asks the launcher to start a game. Refused outright when
// the launcher is not connected: a request that sits in a queue until a launcher
// shows up hours later and starts a game unbidden is worse than an error.
func (s *Server) handleLaunchyLaunch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GameID int64 `json:"gameId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.GameID <= 0 {
		writeErr(w, http.StatusBadRequest, "need a gameId")
		return
	}
	if !s.launchy.status().Connected {
		writeErr(w, http.StatusConflict, "Launchy is not connected")
		return
	}
	link, err := s.db.GetGameLaunchy(r.Context(), req.GameID)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "this game is not in Launchy")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !link.Installed {
		writeErr(w, http.StatusConflict, "this game is in Launchy but has no executable set")
		return
	}
	writeJSON(w, http.StatusAccepted, s.launchy.enqueue("launch", req.GameID))
}

func (s *Server) handleLaunchyLaunchStatus(w http.ResponseWriter, r *http.Request) {
	cmd := s.launchy.get(r.PathValue("cmd"))
	if cmd == nil {
		writeErr(w, http.StatusNotFound, "no such request")
		return
	}
	writeJSON(w, http.StatusOK, cmd)
}

/* ------------------------------------------------------------------ the sync */

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
