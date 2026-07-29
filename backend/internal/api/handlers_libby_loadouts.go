package api

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/youruser/oppailib/internal/crypto"
)

// ── Libby outfit loadouts ────────────────────────────────────────────────────
//
// A loadout is the *recipe* for an outfit: which garment sits in each equipment slot,
// what colour it is, and the studio settings that go with it. It is deliberately not
// the same record as a libbyOutfit, which is the finished wardrobe — sixty rendered
// sprites the mascot actually wears.
//
// Keeping them apart is what lets one recipe produce several wardrobes (a re-render on
// a new checkpoint is a new outfit, not an edit of the old one) and lets a recipe exist
// before a single image has been generated from it. The studio pairs them by choosing a
// target wardrobe when it starts filing sprites; nothing here holds that link, because a
// loadout outlives any particular render of it.
//
// The body is stored opaquely. The server has no opinion about what a slot means, so
// the web and phone clients can add axes without a server release; all it enforces is
// that the thing is JSON, is not enormous, and belongs to this user's encrypted config.

// maxLoadoutBytes caps one stored recipe. Generous for a description of ten garments
// and small enough that the list endpoint cannot be made to read megabytes per entry.
const maxLoadoutBytes = 64 << 10

type libbyLoadout struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Loadout is the client's own description of the board, passed through untouched.
	Loadout json.RawMessage `json:"loadout"`
	// UpdatedAt is a client-supplied millisecond timestamp, used only for ordering
	// ties in the picker. Nothing depends on it being accurate.
	UpdatedAt int64 `json:"updatedAt"`
}

// libbyLoadoutView adds whether a cover exists, so a card grid can draw placeholders
// without a request per loadout that 404s.
type libbyLoadoutView struct {
	libbyLoadout
	HasThumb bool `json:"hasThumb"`
}

func (s *Server) libbyLoadoutDir() string {
	return filepath.Join(s.libbyDir, "loadouts")
}

func (s *Server) libbyLoadoutPath(id string) string {
	return filepath.Join(s.libbyLoadoutDir(), id+".json.enc")
}

func (s *Server) libbyLoadoutThumbPath(id string) string {
	return filepath.Join(s.libbyLoadoutDir(), id+".thumb.enc")
}

func (s *Server) readLibbyLoadout(id string) (*libbyLoadout, error) {
	blob, err := os.ReadFile(s.libbyLoadoutPath(id))
	if err != nil {
		return nil, err
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-loadout"))
	if err != nil {
		return nil, err
	}
	var l libbyLoadout
	if err := json.Unmarshal(data, &l); err != nil {
		return nil, err
	}
	l.ID = id // the filename is authoritative
	return &l, nil
}

func (s *Server) libbyLoadoutView(l *libbyLoadout) libbyLoadoutView {
	v := libbyLoadoutView{libbyLoadout: *l}
	// A loadout has no art of its own to fall back on, unlike a wardrobe: an unset
	// cover means the card draws its own placeholder.
	if _, err := os.Stat(s.libbyLoadoutThumbPath(l.ID)); err == nil {
		v.HasThumb = true
	}
	if v.Loadout == nil {
		v.Loadout = json.RawMessage("{}")
	}
	return v
}

func (s *Server) handleListLibbyLoadouts(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(s.libbyLoadoutDir())
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"loadouts": []libbyLoadoutView{}})
		return
	}
	out := []libbyLoadoutView{}
	for _, e := range entries {
		id, ok := strings.CutSuffix(e.Name(), ".json.enc")
		if !ok || !charIDPattern.MatchString(id) {
			continue
		}
		l, err := s.readLibbyLoadout(id)
		if err != nil {
			s.log.Debug("read libby loadout", "id", id, "err", err)
			continue
		}
		out = append(out, s.libbyLoadoutView(l))
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	writeJSON(w, http.StatusOK, map[string]any{"loadouts": out})
}

type saveLibbyLoadoutReq struct {
	ID        string          `json:"id"` // empty creates, set overwrites
	Name      string          `json:"name"`
	Loadout   json.RawMessage `json:"loadout"`
	UpdatedAt int64           `json:"updatedAt"`
}

func (s *Server) handleSaveLibbyLoadout(w http.ResponseWriter, r *http.Request) {
	var req saveLibbyLoadoutReq
	// The body is capped before decoding rather than after: a recipe is small, and the
	// point of the limit is to never hold an arbitrary upload in memory at all.
	if err := json.NewDecoder(io.LimitReader(r.Body, maxLoadoutBytes+1)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 80 {
		writeErr(w, http.StatusBadRequest, "a loadout needs a name (up to 80 characters)")
		return
	}
	if len(req.Loadout) > maxLoadoutBytes {
		writeErr(w, http.StatusBadRequest, "loadout is too large")
		return
	}
	// The body is opaque but not shapeless: every client spreads it over its own
	// defaults, so a scalar or an array would be stored happily here and then fail in
	// the browser. Requiring an object is the one structural promise worth keeping.
	if len(req.Loadout) == 0 {
		req.Loadout = json.RawMessage("{}")
	} else {
		var probe map[string]json.RawMessage
		if err := json.Unmarshal(req.Loadout, &probe); err != nil {
			writeErr(w, http.StatusBadRequest, "loadout must be a JSON object")
			return
		}
	}
	id := req.ID
	if id == "" {
		id = randomID()
	} else if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad loadout id")
		return
	}
	l := libbyLoadout{ID: id, Name: req.Name, Loadout: req.Loadout, UpdatedAt: req.UpdatedAt}
	raw, err := json.Marshal(l)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "loadout could not be stored")
		return
	}
	blob, err := crypto.SealBytes(s.kek, raw, []byte("libby-loadout"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.MkdirAll(s.libbyLoadoutDir(), 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.WriteFile(s.libbyLoadoutPath(id), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, s.libbyLoadoutView(&l))
}

func (s *Server) handleDeleteLibbyLoadout(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad loadout id")
		return
	}
	if err := os.Remove(s.libbyLoadoutPath(id)); err != nil {
		writeErr(w, http.StatusNotFound, "no such loadout")
		return
	}
	_ = os.Remove(s.libbyLoadoutThumbPath(id))
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleGetLibbyLoadoutThumb(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad loadout id")
		return
	}
	blob, err := os.ReadFile(s.libbyLoadoutThumbPath(id))
	if err != nil {
		writeErr(w, http.StatusNotFound, "this loadout has no cover")
		return
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-loadout-thumb"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "this loadout has no cover")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
	w.Header().Set("Cache-Control", "private, max-age=60")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) handleSetLibbyLoadoutThumb(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad loadout id")
		return
	}
	if _, err := s.readLibbyLoadout(id); err != nil {
		writeErr(w, http.StatusNotFound, "no such loadout")
		return
	}
	var req setLibbyEmotionReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ImageData == "" {
		writeErr(w, http.StatusBadRequest, "imageData is required")
		return
	}
	data, err := decodeDataImage(req.ImageData)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad image data")
		return
	}
	if len(data) == 0 || len(data) > maxModelThumbBytes {
		writeErr(w, http.StatusBadRequest, "image is empty or too large")
		return
	}
	blob, err := crypto.SealBytes(s.kek, data, []byte("libby-loadout-thumb"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.MkdirAll(s.libbyLoadoutDir(), 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.WriteFile(s.libbyLoadoutThumbPath(id), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

// handleDeleteLibbyLoadoutThumb drops a cover. Not an error when there was none: the
// outcome the caller asked for already holds.
func (s *Server) handleDeleteLibbyLoadoutThumb(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad loadout id")
		return
	}
	_ = os.Remove(s.libbyLoadoutThumbPath(id))
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}
