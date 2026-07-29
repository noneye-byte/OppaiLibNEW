package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// ── Outfit work in progress ──────────────────────────────────────────────────
//
// A wardrobe is sixty generated squares, and on a home GPU that is hours of work
// spread over several sittings. Until now those squares only existed as entries in
// the in-memory preview cache: bounded by a count cap, expired after six hours, and
// gone entirely when the server restarted. The studio kept the *ids* in its local
// draft, so the board came back looking complete while every image behind it 404'd —
// which is the "blank images after a while" the squares were reported as.
//
// So generated squares are written here the moment they exist, before anyone has
// reviewed a cutout. This store is deliberately unlike the preview cache in every way
// that matters: on disk, encrypted like the rest of the wardrobe, no TTL, no cap, and
// nothing evicts from it. A square leaves only when the user replaces it (a redo), or
// deletes it, or deletes the whole outfit — see handleDeleteLibbyOutfit.
//
// It sits beside the finished sprites rather than inside them because the two answer
// different questions. An emotion slot is art Libby *wears*; a WIP square is a
// generation that may still be redone, and carries the seed, the loadout fingerprint
// and whether its cutout has been reviewed. Approving a square copies it across into
// the emotion slot and leaves the WIP copy in place, so the board stays reviewable.

// libbyWIPSquare is one generated (emotion, tier) square as it is stored.
//
// Image travels in the same envelope as the metadata: one file per square means a
// redo is a single atomic overwrite, with no way to end up with a picture whose
// record says it belongs to a different loadout. []byte marshals as base64, which is
// what makes a JSON envelope viable for image bytes at all.
type libbyWIPSquare struct {
	Emotion   string          `json:"emotion"`
	Level     int             `json:"level"`
	Filename  string          `json:"filename,omitempty"`
	Seed      int64           `json:"seed"`
	Reviewed  bool            `json:"reviewed"`
	Config    string          `json:"config,omitempty"`
	Info      json.RawMessage `json:"info,omitempty"`
	UpdatedAt int64           `json:"updatedAt"`
	Image     []byte          `json:"image,omitempty"`
}

func (s *Server) libbyWIPPath(id, emotion string, level int) string {
	return filepath.Join(s.libbyDir, id+".wip."+emotion+".L"+strconv.Itoa(level)+".enc")
}

func (s *Server) readLibbyWIP(id, emotion string, level int) (*libbyWIPSquare, error) {
	blob, err := os.ReadFile(s.libbyWIPPath(id, emotion, level))
	if err != nil {
		return nil, err
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-outfit-wip"))
	if err != nil {
		return nil, err
	}
	var sq libbyWIPSquare
	if err := json.Unmarshal(data, &sq); err != nil {
		return nil, err
	}
	// The filename is authoritative for the identity fields, exactly as it is for the
	// outfit record itself.
	sq.Emotion, sq.Level = emotion, level
	return &sq, nil
}

// removeLibbyWIP drops every square of one outfit. Called when the outfit is deleted,
// which is the only thing that removes work in progress wholesale.
func (s *Server) removeLibbyWIP(id string) {
	for _, e := range libbyEmotions {
		for level := 0; level <= maxLibbyLevel; level++ {
			_ = os.Remove(s.libbyWIPPath(id, e, level))
		}
	}
}

// countLibbyWIP is how many squares an outfit has generated but not necessarily
// finished — the number a wardrobe card can show to mean "there is work here".
func (s *Server) countLibbyWIP(id string) int {
	n := 0
	for _, e := range libbyEmotions {
		for level := 0; level <= maxLibbyLevel; level++ {
			if _, err := os.Stat(s.libbyWIPPath(id, e, level)); err == nil {
				n++
			}
		}
	}
	return n
}

// handleListLibbyOutfitWIP returns every square's record without its bytes, so the
// studio can rebuild a sixty-square board in one round trip and fetch the pictures
// lazily through the image endpoint.
func (s *Server) handleListLibbyOutfitWIP(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad outfit id")
		return
	}
	if _, err := s.readLibbyOutfit(id); err != nil {
		writeErr(w, http.StatusNotFound, "no such outfit")
		return
	}
	out := []libbyWIPSquare{}
	for _, e := range libbyEmotions {
		for level := 0; level <= maxLibbyLevel; level++ {
			sq, err := s.readLibbyWIP(id, e, level)
			if err != nil {
				continue
			}
			sq.Image = nil // the list is a manifest, not sixty megabytes of PNG
			out = append(out, *sq)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Level != out[j].Level {
			return out[i].Level < out[j].Level
		}
		return out[i].Emotion < out[j].Emotion
	})
	writeJSON(w, http.StatusOK, map[string]any{"squares": out})
}

type putLibbyWIPReq struct {
	ImageData string          `json:"imageData"`
	Filename  string          `json:"filename"`
	Seed      int64           `json:"seed"`
	Reviewed  bool            `json:"reviewed"`
	Config    string          `json:"config"`
	Info      json.RawMessage `json:"info"`
}

// handlePutLibbyOutfitWIP files one generated square. Writing the whole envelope on
// every call (rather than patching a stored one) keeps a redo from inheriting the
// review state of the take it replaced.
func (s *Server) handlePutLibbyOutfitWIP(w http.ResponseWriter, r *http.Request) {
	id, emotion := r.PathValue("id"), r.PathValue("emotion")
	if !charIDPattern.MatchString(id) || !libbyEmotionValid(emotion) {
		writeErr(w, http.StatusBadRequest, "bad outfit id or emotion")
		return
	}
	if _, err := s.readLibbyOutfit(id); err != nil {
		writeErr(w, http.StatusNotFound, "no such outfit")
		return
	}
	var req putLibbyWIPReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ImageData == "" {
		writeErr(w, http.StatusBadRequest, "imageData is required")
		return
	}
	image, err := decodeDataImage(req.ImageData)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad image data")
		return
	}
	if len(image) == 0 || len(image) > maxModelThumbBytes {
		writeErr(w, http.StatusBadRequest, "image is empty or too large")
		return
	}
	level := libbyLevelParam(r)
	sq := libbyWIPSquare{
		Emotion: emotion, Level: level,
		Filename: req.Filename, Seed: req.Seed, Reviewed: req.Reviewed, Config: req.Config,
		Info:      req.Info,
		UpdatedAt: time.Now().UnixMilli(),
		Image:     image,
	}
	raw, err := json.Marshal(sq)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encode failed")
		return
	}
	blob, err := crypto.SealBytes(s.kek, raw, []byte("libby-outfit-wip"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.MkdirAll(s.libbyDir, 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.WriteFile(s.libbyWIPPath(id, emotion, level), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	sq.Image = nil
	writeJSON(w, http.StatusOK, sq)
}

func (s *Server) handleGetLibbyOutfitWIPImage(w http.ResponseWriter, r *http.Request) {
	id, emotion := r.PathValue("id"), r.PathValue("emotion")
	if !charIDPattern.MatchString(id) || !libbyEmotionValid(emotion) {
		writeErr(w, http.StatusBadRequest, "bad outfit id or emotion")
		return
	}
	sq, err := s.readLibbyWIP(id, emotion, libbyLevelParam(r))
	if err != nil || len(sq.Image) == 0 {
		writeErr(w, http.StatusNotFound, "nothing generated for that square yet")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(sq.Image)))
	// Squares are replaced in place by a redo, so the URL alone cannot say whether the
	// bytes changed. Clients append a version; the cache stays short regardless.
	w.Header().Set("Cache-Control", "private, max-age=60")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(sq.Image)
}

// handleDeleteLibbyOutfitWIP throws one square away — the explicit "I don't want this
// take" that a redo is not. Not an error when there was nothing there: the outcome the
// caller asked for already holds.
func (s *Server) handleDeleteLibbyOutfitWIP(w http.ResponseWriter, r *http.Request) {
	id, emotion := r.PathValue("id"), r.PathValue("emotion")
	if !charIDPattern.MatchString(id) || !libbyEmotionValid(emotion) {
		writeErr(w, http.StatusBadRequest, "bad outfit id or emotion")
		return
	}
	_ = os.Remove(s.libbyWIPPath(id, emotion, libbyLevelParam(r)))
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}
