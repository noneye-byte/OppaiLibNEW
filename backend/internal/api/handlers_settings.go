package api

import (
	"encoding/json"
	"net/http"

	"github.com/youruser/oppailib/internal/ai"
	"github.com/youruser/oppailib/internal/auth"
	"github.com/youruser/oppailib/internal/buildinfo"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/settings"
	"github.com/youruser/oppailib/internal/thumbnail"
)

// settingsResponse is what the Settings screen renders: the editable values plus
// the read-only facts about this install (env-only config, build, capabilities).
type settingsResponse struct {
	Settings settings.Settings `json:"settings"`
	ReadOnly readOnlyInfo      `json:"readOnly"`
}

// readOnlyInfo is environment/build state the UI shows but can't change — these
// are set by env vars and only take effect at startup.
type readOnlyInfo struct {
	Version      string   `json:"version"`
	Features     []string `json:"features"`
	AITagger     string   `json:"aiTagger"`
	AIModelDir   string   `json:"aiModelDir"`
	AIDevice     string   `json:"aiDevice"`
	MediaDir     string   `json:"mediaDir"`
	DBPath       string   `json:"dbPath"`
	FFmpeg       bool     `json:"ffmpeg"`
	SessionHours int      `json:"sessionHours"`
}

func (s *Server) readOnly() readOnlyInfo {
	return readOnlyInfo{
		Version: buildinfo.String(),
		Features: []string{
			"autonomous messaging", "private thoughts and self-talk", "Libby image identity",
			"safe link previews", "Discord relay",
		},
		AITagger:     s.ai.TaggerName(),
		AIModelDir:   s.cfg.AIModelDir,
		AIDevice:     s.cfg.AIDevice,
		MediaDir:     s.cfg.MediaDir,
		DBPath:       s.cfg.DBPath,
		FFmpeg:       thumbnail.Available(),
		SessionHours: int(s.cfg.SessionTTL.Hours()),
	}
}

func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, settingsResponse{
		Settings: s.settings.Get().Redacted(),
		ReadOnly: s.readOnly(),
	})
}

// handlePutSettings persists the edited settings and applies them live. The
// incoming JSON is decoded over the current values, so a partial body only
// changes what it names.
func (s *Server) handlePutSettings(w http.ResponseWriter, r *http.Request) {
	current := s.settings.Get()
	next := current
	if err := json.NewDecoder(r.Body).Decode(&next); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	// The password is write-only, so a GET hands the UI back an empty one — which it
	// then submits verbatim. Treat empty as "leave it as it was"; to clear the login,
	// clear the username. A non-empty value is a deliberate change and replaces it.
	if next.F95Password == "" {
		next.F95Password = current.F95Password
	}
	if next.CivitaiAPIKey == "" && next.CivitaiKeySet {
		next.CivitaiAPIKey = current.CivitaiAPIKey
	}
	if next.Rule34APIKey == "" && next.Rule34APIKeySet {
		next.Rule34APIKey = current.Rule34APIKey
	}
	if next.ChatAPIKey == "" && next.ChatAPIKeySet {
		next.ChatAPIKey = current.ChatAPIKey
	}
	next.Clamp()
	if err := s.db.PutSettings(r.Context(), next.Map()); err != nil {
		s.log.Error("settings: save failed", "err", err)
		writeErr(w, http.StatusInternalServerError, "save failed")
		return
	}
	s.ApplySettings(next)
	s.log.Info("settings: updated", "ai_enabled", next.AIEnabled, "ai_auto_tag", next.AIAutoTag,
		"scrape_delay_ms", next.ScrapeDelayMs, "respect_robots", next.ScrapeRespectRobots,
		"f95_login", next.F95Username != "")
	writeJSON(w, http.StatusOK, settingsResponse{Settings: next.Redacted(), ReadOnly: s.readOnly()})
}

// ApplySettings pushes settings into the live subsystems. Called at startup with
// the stored values and again on every save, so changes need no restart.
func (s *Server) ApplySettings(cur settings.Settings) {
	previous := s.ai.Options()
	s.settings.Set(cur)
	cur = s.settings.Get() // re-read: Set clamps
	s.ai.SetOptions(ai.Options{
		Enabled:  cur.AIEnabled,
		AutoTag:  cur.AIAutoTag,
		MinScore: cur.AIMinScore,
		MaxTags:  cur.AIMaxTags,
	})
	s.scraper.SetOptions(cur.ScrapeUserAgent, cur.ScrapeDelay(), cur.ScrapeRespectRobots)
	s.scraper.SetF95Credentials(cur.F95Username, cur.F95Password)
	s.sources.SetRule34Credentials(cur.Rule34UserID, cur.Rule34APIKey)
	if (!previous.Enabled || !previous.AutoTag) && cur.AIEnabled && cur.AIAutoTag {
		go s.backfillAutoTags()
	}
}

// handleStats summarizes the library for the Settings screen.
func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	kinds, tags, err := s.db.Stats(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	var items, bytes int64
	for _, k := range kinds {
		items += k.Count
		bytes += k.Bytes
	}
	if kinds == nil {
		kinds = []db.KindStat{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"kinds": kinds, "items": items, "bytes": bytes, "tags": tags,
	})
}

type passwordReq struct {
	Current string `json:"current"`
	New     string `json:"new"`
}

// handleChangePassword re-verifies the current password before setting a new one
// (a stolen session shouldn't be enough to lock the owner out of their library).
func (s *Server) handleChangePassword(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userKey).(*db.UserRow)
	var req passwordReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if len(req.New) < 8 {
		writeErr(w, http.StatusBadRequest, "new password must be at least 8 characters")
		return
	}
	ok, err := auth.VerifyPassword(u.PwHash, req.Current)
	if err != nil || !ok {
		writeErr(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}
	hash, err := auth.HashPassword(req.New)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	if err := s.db.SetPassword(r.Context(), u.ID, hash); err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	s.log.Info("password changed", "user", u.Username)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
