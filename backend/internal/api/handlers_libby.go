package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/youruser/oppailib/internal/crypto"
)

// ── Libby outfits ────────────────────────────────────────────────────────────
//
// An outfit is a full replacement wardrobe for the mascot: one image per emotion,
// dropped in by the user. The default art ships in the client; an outfit overrides
// it per emotion, and an emotion the outfit doesn't cover falls back to the
// default art (clients handle that via the image 404).
//
// Which outfit is *worn* is a per-device choice, like hiding Libby — clients keep
// the selection locally and just ask for images by outfit id. Server-side there is
// only storage: encrypted under /config/libby, same scheme as the character
// library, because outfit art is the user's own and may be anything.

// libbyEmotions is the emotion vocabulary an outfit can supply art for.
//
// The bundled wardrobe draws all of them at every horniness tier, so each is a face
// in its own right: the character can say it feels shy rather than merely surprised,
// and an outfit can draw that shyness as its own picture.
//
// Order matters: it is the order the outfit editor lays its slots out in, with the
// five that every outfit should cover ahead of the optional extras.
var libbyEmotions = []string{
	"neutral", "happy", "surprised", "thinking", "mischievous",
	"shy", "smug", "sad", "annoyed", "sleepy", "loving", "excited",
}

// libbyNearestPose maps every emotion onto the one it is closest to, for outfits that
// cover only some of them. The first five map to themselves.
//
// This is the same table the web client (NEAREST_POSE in libby.ts) and the phone
// (nearestPose in LibbyPortrait.kt) hold. It lives here too because the server decides
// what a mood tag is allowed to mean, and a mood with no route to a picture is a mood
// that shows as a stuck face.
var libbyNearestPose = map[string]string{
	"neutral": "neutral", "happy": "happy", "surprised": "surprised",
	"thinking": "thinking", "mischievous": "mischievous",

	"shy":     "surprised",
	"smug":    "mischievous",
	"sad":     "thinking",
	"annoyed": "thinking",
	"sleepy":  "neutral",
	"loving":  "happy",
	"excited": "happy",
}

// maxLibbyLevel is the highest horniness art tier. There are five tiers, 0..4:
// level 0 is the baseline art (stored under the original filename, so existing
// outfits keep working), and 1..4 are the hornier variants shown as the session
// meter climbs. A tier that has no art for an emotion falls back to a lower tier,
// then to the bundled default (clients handle that via the image 404).
const maxLibbyLevel = 4

func libbyEmotionValid(e string) bool {
	for _, known := range libbyEmotions {
		if e == known {
			return true
		}
	}
	return false
}

// libbyLevelParam reads the ?level= tier from a request, clamped to 0..maxLibbyLevel.
// An absent or malformed value is level 0, the baseline.
func libbyLevelParam(r *http.Request) int {
	n, err := strconv.Atoi(r.URL.Query().Get("level"))
	if err != nil || n < 0 {
		return 0
	}
	if n > maxLibbyLevel {
		return maxLibbyLevel
	}
	return n
}

type libbyOutfit struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// libbyOutfitView is what lists return: the record plus which emotions have art,
// so clients can render slots without probing image URLs per outfit.
//
// Emotions keeps the level-0 poses that have art (backward compatible with older
// clients). EmotionLevels is the full picture: for each emotion, which tiers 0..4
// have art, so the editor can lay out its 5×5 grid in one round-trip.
type libbyOutfitView struct {
	libbyOutfit
	Emotions      []string         `json:"emotions"`
	EmotionLevels map[string][]int `json:"emotionLevels"`
	// HasThumb says whether GET .../thumb will return a picture, so a card grid knows
	// whether to draw art or a placeholder without a request per outfit that 404s.
	HasThumb bool `json:"hasThumb"`
	// Slots is how many (emotion, tier) squares this outfit has art in, which is the
	// one number a card can show that means anything: "3/5 emotions" undercounts an
	// outfit drawn across every tier.
	Slots int `json:"slots"`
	// Wip is how many squares have been generated into this outfit's work in progress,
	// finished or not. It is what tells a wardrobe card there is unfinished work here,
	// which "0 sprites" cannot say.
	Wip int `json:"wip"`
}

func (s *Server) libbyOutfitPath(id string) string {
	return filepath.Join(s.libbyDir, id+".json.enc")
}

// libbyEmotionPath is where one emotion's art for a given tier lives. Level 0 keeps
// the original, suffix-free filename so outfits made before tiers existed still
// resolve; higher tiers add an ".L{n}" segment.
func (s *Server) libbyEmotionPath(id, emotion string, level int) string {
	if level <= 0 {
		return filepath.Join(s.libbyDir, id+"."+emotion+".enc")
	}
	return filepath.Join(s.libbyDir, id+"."+emotion+".L"+strconv.Itoa(level)+".enc")
}

func (s *Server) readLibbyOutfit(id string) (*libbyOutfit, error) {
	blob, err := os.ReadFile(s.libbyOutfitPath(id))
	if err != nil {
		return nil, err
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-outfit"))
	if err != nil {
		return nil, err
	}
	var o libbyOutfit
	if err := json.Unmarshal(data, &o); err != nil {
		return nil, err
	}
	o.ID = id // the filename is authoritative
	return &o, nil
}

func (s *Server) libbyOutfitView(o *libbyOutfit) libbyOutfitView {
	v := libbyOutfitView{libbyOutfit: *o, Emotions: []string{}, EmotionLevels: map[string][]int{}}
	for _, e := range libbyEmotions {
		for level := 0; level <= maxLibbyLevel; level++ {
			if _, err := os.Stat(s.libbyEmotionPath(o.ID, e, level)); err == nil {
				v.EmotionLevels[e] = append(v.EmotionLevels[e], level)
				v.Slots++
				if level == 0 {
					v.Emotions = append(v.Emotions, e)
				}
			}
		}
	}
	v.Wip = s.countLibbyWIP(o.ID)
	// Any art at all is a cover, because the thumb endpoint falls back to it —
	// including an unfinished square, which is what a wardrobe mid-render has.
	v.HasThumb = v.Slots > 0 || v.Wip > 0
	if _, err := os.Stat(s.libbyOutfitThumbPath(o.ID)); err == nil {
		v.HasThumb = true
	}
	return v
}

// libbyOutfitThumbPath is the outfit's chosen cover art, when the user has picked one.
func (s *Server) libbyOutfitThumbPath(id string) string {
	return filepath.Join(s.libbyDir, id+".thumb.enc")
}

// libbyOutfitCover reads whatever should represent this outfit on a card.
//
// An explicit cover wins. Failing that it falls back to the outfit's own art, walking
// the emotion vocabulary in order and the tiers from calm upward — which lands on the
// neutral baseline for a typical outfit and on *something* for an unusual one. Making
// the user choose a cover before their outfit could be seen would be a step between
// dropping in art and having a wardrobe, and there is nothing to decide at that point.
func (s *Server) libbyOutfitCover(id string) ([]byte, bool) {
	if blob, err := os.ReadFile(s.libbyOutfitThumbPath(id)); err == nil {
		if data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-outfit-thumb")); err == nil {
			return data, true
		}
	}
	for _, e := range libbyEmotions {
		for level := 0; level <= maxLibbyLevel; level++ {
			blob, err := os.ReadFile(s.libbyEmotionPath(id, e, level))
			if err != nil {
				continue
			}
			if data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-emotion")); err == nil {
				return data, true
			}
		}
	}
	// Nothing finished yet, but a wardrobe being generated into is not a blank card:
	// the first square rendered for it is a truer picture of what it is than a
	// placeholder, and it is the picture the user is in the middle of making.
	for _, e := range libbyEmotions {
		for level := 0; level <= maxLibbyLevel; level++ {
			if sq, err := s.readLibbyWIP(id, e, level); err == nil && len(sq.Image) > 0 {
				return sq.Image, true
			}
		}
	}
	return nil, false
}

func (s *Server) handleGetLibbyOutfitThumb(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad outfit id")
		return
	}
	data, ok := s.libbyOutfitCover(id)
	if !ok {
		writeErr(w, http.StatusNotFound, "this outfit has no art yet")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
	w.Header().Set("Cache-Control", "private, max-age=60")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// handleSetLibbyOutfitThumb stores a chosen cover. Kept separate from the emotion
// slots on purpose: a cover is often a wider, posed shot that would be wrong to render
// as a portrait beside the conversation.
func (s *Server) handleSetLibbyOutfitThumb(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad outfit id")
		return
	}
	if _, err := s.readLibbyOutfit(id); err != nil {
		writeErr(w, http.StatusNotFound, "no such outfit")
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
	blob, err := crypto.SealBytes(s.kek, data, []byte("libby-outfit-thumb"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.WriteFile(s.libbyOutfitThumbPath(id), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

// handleDeleteLibbyOutfitThumb drops a chosen cover, returning the card to the
// automatic one. Not an error when there was none: the outcome the caller asked for
// (no explicit cover) already holds.
func (s *Server) handleDeleteLibbyOutfitThumb(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad outfit id")
		return
	}
	_ = os.Remove(s.libbyOutfitThumbPath(id))
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleListLibbyOutfits(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(s.libbyDir)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"outfits": []libbyOutfitView{}})
		return
	}
	out := []libbyOutfitView{}
	for _, e := range entries {
		id, ok := strings.CutSuffix(e.Name(), ".json.enc")
		if !ok || !charIDPattern.MatchString(id) {
			continue
		}
		o, err := s.readLibbyOutfit(id)
		if err != nil {
			s.log.Debug("read libby outfit", "id", id, "err", err)
			continue
		}
		out = append(out, s.libbyOutfitView(o))
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	writeJSON(w, http.StatusOK, map[string]any{"outfits": out})
}

type saveLibbyOutfitReq struct {
	ID   string `json:"id"` // empty creates, set renames
	Name string `json:"name"`
}

func (s *Server) handleSaveLibbyOutfit(w http.ResponseWriter, r *http.Request) {
	var req saveLibbyOutfitReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 80 {
		writeErr(w, http.StatusBadRequest, "an outfit needs a name (up to 80 characters)")
		return
	}
	id := req.ID
	if id == "" {
		id = randomID()
	} else if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad outfit id")
		return
	}
	o := libbyOutfit{ID: id, Name: req.Name}
	raw, _ := json.Marshal(o)
	blob, err := crypto.SealBytes(s.kek, raw, []byte("libby-outfit"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.MkdirAll(s.libbyDir, 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.WriteFile(s.libbyOutfitPath(id), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, s.libbyOutfitView(&o))
}

func (s *Server) handleDeleteLibbyOutfit(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad outfit id")
		return
	}
	if err := os.Remove(s.libbyOutfitPath(id)); err != nil {
		writeErr(w, http.StatusNotFound, "no such outfit")
		return
	}
	for _, e := range libbyEmotions {
		for level := 0; level <= maxLibbyLevel; level++ {
			_ = os.Remove(s.libbyEmotionPath(id, e, level))
		}
	}
	_ = os.Remove(s.libbyOutfitThumbPath(id))
	// Deleting the outfit is the one thing that discards its work in progress. Nothing
	// else does — not a restart, not an expiry, not a cleared workspace.
	s.removeLibbyWIP(id)
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

type setLibbyEmotionReq struct {
	ImageData string `json:"imageData"`
}

func (s *Server) handleSetLibbyEmotion(w http.ResponseWriter, r *http.Request) {
	id, emotion := r.PathValue("id"), r.PathValue("emotion")
	if !charIDPattern.MatchString(id) || !libbyEmotionValid(emotion) {
		writeErr(w, http.StatusBadRequest, "bad outfit id or emotion")
		return
	}
	if _, err := s.readLibbyOutfit(id); err != nil {
		writeErr(w, http.StatusNotFound, "no such outfit")
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
	blob, err := crypto.SealBytes(s.kek, data, []byte("libby-emotion"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.WriteFile(s.libbyEmotionPath(id, emotion, libbyLevelParam(r)), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleGetLibbyEmotion(w http.ResponseWriter, r *http.Request) {
	id, emotion := r.PathValue("id"), r.PathValue("emotion")
	if !charIDPattern.MatchString(id) || !libbyEmotionValid(emotion) {
		writeErr(w, http.StatusBadRequest, "bad outfit id or emotion")
		return
	}
	blob, err := os.ReadFile(s.libbyEmotionPath(id, emotion, libbyLevelParam(r)))
	if err != nil {
		writeErr(w, http.StatusNotFound, "this outfit has no art for that emotion")
		return
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-emotion"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "image unreadable")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
	w.Header().Set("Cache-Control", "private, max-age=60")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) handleDeleteLibbyEmotion(w http.ResponseWriter, r *http.Request) {
	id, emotion := r.PathValue("id"), r.PathValue("emotion")
	if !charIDPattern.MatchString(id) || !libbyEmotionValid(emotion) {
		writeErr(w, http.StatusBadRequest, "bad outfit id or emotion")
		return
	}
	if err := os.Remove(s.libbyEmotionPath(id, emotion, libbyLevelParam(r))); err != nil {
		writeErr(w, http.StatusNotFound, "this outfit has no art for that emotion")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}
