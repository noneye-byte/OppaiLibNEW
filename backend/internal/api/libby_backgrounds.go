package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/youruser/oppailib/internal/crypto"
)

// Where she is.
//
// The call screen used to put her sprite on a gradient. That is a portrait, not a
// call: a video call has a room behind the person, and the room says something —
// she is on the sofa, she is in bed, she is outside. So the user can add backgrounds,
// tag them with what they are ("bedroom, night, cosy"), and she picks one the way she
// picks a mood: with a tag, from the list she is shown, when the scene moves.
//
// Same shape as the outfits, and stored beside them: an encrypted record plus one
// encrypted image, under /config/libby. The user's own art, so it gets the user's
// own encryption.
//
// The choice is client-owned state exactly like the MISC activity: the server holds
// nothing between turns, so the current background travels with the request and the
// (possibly changed) one travels back. A [scene: …] tag resolves against the names
// and tags of what exists; one that matches nothing is ignored rather than guessed.

type libbyBackground struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Tags describe the place so she can choose it by what it is rather than only by
	// what it is called: "bedroom, night, lamp", "kitchen, morning". Free text from
	// the user, normalised into short lowercase words.
	Tags []string `json:"tags"`
}

// libbyBackgroundView is the record plus whether there is a picture yet.
type libbyBackgroundView struct {
	libbyBackground
	HasImage bool `json:"hasImage"`
}

const (
	maxLibbyBackgrounds    = 40
	maxLibbyBackgroundTags = 12
)

func (s *Server) libbyBackgroundDir() string { return filepath.Join(s.libbyDir, "backgrounds") }

func (s *Server) libbyBackgroundPath(id string) string {
	return filepath.Join(s.libbyBackgroundDir(), id+".json.enc")
}

func (s *Server) libbyBackgroundImagePath(id string) string {
	return filepath.Join(s.libbyBackgroundDir(), id+".image.enc")
}

func (s *Server) readLibbyBackground(id string) (*libbyBackground, error) {
	blob, err := os.ReadFile(s.libbyBackgroundPath(id))
	if err != nil {
		return nil, err
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-background"))
	if err != nil {
		return nil, err
	}
	var bg libbyBackground
	if err := json.Unmarshal(data, &bg); err != nil {
		return nil, err
	}
	bg.ID = id
	if bg.Tags == nil {
		bg.Tags = []string{}
	}
	return &bg, nil
}

func (s *Server) libbyBackgroundView(bg *libbyBackground) libbyBackgroundView {
	v := libbyBackgroundView{libbyBackground: *bg}
	if _, err := os.Stat(s.libbyBackgroundImagePath(bg.ID)); err == nil {
		v.HasImage = true
	}
	return v
}

// listLibbyBackgrounds reads every background, by name. Best-effort: a record that
// cannot be read is skipped, since one bad file must not cost the call screen its
// whole list.
func (s *Server) listLibbyBackgrounds() []libbyBackgroundView {
	entries, err := os.ReadDir(s.libbyBackgroundDir())
	if err != nil {
		return []libbyBackgroundView{}
	}
	out := []libbyBackgroundView{}
	for _, e := range entries {
		id, ok := strings.CutSuffix(e.Name(), ".json.enc")
		if !ok || !charIDPattern.MatchString(id) {
			continue
		}
		bg, err := s.readLibbyBackground(id)
		if err != nil {
			s.log.Debug("read libby background", "id", id, "err", err)
			continue
		}
		out = append(out, s.libbyBackgroundView(bg))
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	return out
}

// normalizeBackgroundTags cleans what the user typed into the short lowercase words
// the tag resolver and the prompt both use.
func normalizeBackgroundTags(raw []string) []string {
	out := make([]string, 0, len(raw))
	seen := map[string]bool{}
	for _, tag := range raw {
		for _, part := range strings.Split(tag, ",") {
			if part = normalizeChatTag(part); part == "" || seen[part] || len(part) > 40 {
				continue
			}
			seen[part] = true
			out = append(out, part)
			if len(out) >= maxLibbyBackgroundTags {
				return out
			}
		}
	}
	return out
}

// ── the default room ─────────────────────────────────────────────────────────
//
// Where she is when nobody has said. A conversation that has never moved her used to
// open on the plain stage, which is fine for a portrait and wrong for a call: a call
// has a room behind the person. So one background can be marked the default, and a
// conversation with no room of its own is in it — for her, who is told so, and for
// the client, which draws it. Stored beside the backgrounds as one small record; the
// id only, since the record it points at is the thing that has a name and a picture.

func (s *Server) libbyDefaultBackgroundPath() string {
	return filepath.Join(s.libbyBackgroundDir(), "default.json")
}

// defaultLibbyBackground is the default room's id, or "" when none is set or the
// one that was set has since been deleted.
func (s *Server) defaultLibbyBackground() string {
	raw, err := os.ReadFile(s.libbyDefaultBackgroundPath())
	if err != nil {
		return ""
	}
	var rec struct {
		ID string `json:"id"`
	}
	if json.Unmarshal(raw, &rec) != nil || !charIDPattern.MatchString(rec.ID) {
		return ""
	}
	if _, err := s.readLibbyBackground(rec.ID); err != nil {
		return ""
	}
	return rec.ID
}

func (s *Server) handleListLibbyBackgrounds(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"backgrounds": s.listLibbyBackgrounds(),
		"default":     s.defaultLibbyBackground(),
	})
}

// handleSetLibbyDefaultBackground marks one background as the default, or clears it
// with an empty id.
func (s *Server) handleSetLibbyDefaultBackground(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.ID == "" {
		_ = os.Remove(s.libbyDefaultBackgroundPath())
		writeJSON(w, http.StatusOK, map[string]any{"default": ""})
		return
	}
	if !charIDPattern.MatchString(req.ID) {
		writeErr(w, http.StatusBadRequest, "bad background id")
		return
	}
	if _, err := s.readLibbyBackground(req.ID); err != nil {
		writeErr(w, http.StatusNotFound, "no such background")
		return
	}
	if err := os.MkdirAll(s.libbyBackgroundDir(), 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	raw, _ := json.Marshal(map[string]string{"id": req.ID})
	if err := os.WriteFile(s.libbyDefaultBackgroundPath(), raw, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"default": req.ID})
}

type saveLibbyBackgroundReq struct {
	ID   string   `json:"id"` // empty creates, set edits
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

func (s *Server) handleSaveLibbyBackground(w http.ResponseWriter, r *http.Request) {
	var req saveLibbyBackgroundReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 60 {
		writeErr(w, http.StatusBadRequest, "a background needs a name (up to 60 characters)")
		return
	}
	id := req.ID
	if id == "" {
		if len(s.listLibbyBackgrounds()) >= maxLibbyBackgrounds {
			writeErr(w, http.StatusBadRequest, "too many backgrounds")
			return
		}
		id = randomID()
	} else if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad background id")
		return
	}
	bg := libbyBackground{ID: id, Name: req.Name, Tags: normalizeBackgroundTags(req.Tags)}
	if err := s.writeLibbyBackground(bg); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the background")
		return
	}
	writeJSON(w, http.StatusOK, s.libbyBackgroundView(&bg))
}

// writeLibbyBackground stores one record, encrypted.
func (s *Server) writeLibbyBackground(bg libbyBackground) error {
	raw, _ := json.Marshal(bg)
	blob, err := crypto.SealBytes(s.kek, raw, []byte("libby-background"))
	if err != nil {
		return err
	}
	if err := os.MkdirAll(s.libbyBackgroundDir(), 0o755); err != nil {
		return err
	}
	return os.WriteFile(s.libbyBackgroundPath(bg.ID), blob, 0o600)
}

// writeLibbyBackgroundImage stores one background's picture, encrypted.
func (s *Server) writeLibbyBackgroundImage(id string, data []byte) error {
	blob, err := crypto.SealBytes(s.kek, data, []byte("libby-background-image"))
	if err != nil {
		return err
	}
	return os.WriteFile(s.libbyBackgroundImagePath(id), blob, 0o600)
}

func (s *Server) handleDeleteLibbyBackground(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad background id")
		return
	}
	if err := os.Remove(s.libbyBackgroundPath(id)); err != nil {
		writeErr(w, http.StatusNotFound, "no such background")
		return
	}
	_ = os.Remove(s.libbyBackgroundImagePath(id))
	if s.defaultLibbyBackground() == "" {
		// Deleting the default clears it; the record reads as unset once its target
		// is gone, so this only tidies the file.
		_ = os.Remove(s.libbyDefaultBackgroundPath())
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleSetLibbyBackgroundImage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad background id")
		return
	}
	if _, err := s.readLibbyBackground(id); err != nil {
		writeErr(w, http.StatusNotFound, "no such background")
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
	if err := s.writeLibbyBackgroundImage(id, data); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleGetLibbyBackgroundImage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad background id")
		return
	}
	blob, err := os.ReadFile(s.libbyBackgroundImagePath(id))
	if err != nil {
		writeErr(w, http.StatusNotFound, "this background has no picture yet")
		return
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("libby-background-image"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "image unreadable")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
	w.Header().Set("Cache-Control", "private, max-age=300")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// ── her choosing one ────────────────────────────────────────────────────────

// resolveBackground turns what she wrote into a background id, or "" for a deliberate
// clear, with ok false when it named nothing that exists.
//
// Name first, whole and exact, because a model shown the list usually quotes it. Then
// by word overlap against name and tags together, so "somewhere darker" lands on the
// background tagged "night, dark" and "my bed" on the one called "Bedroom".
func resolveBackground(label string, backgrounds []libbyBackgroundView) (id string, ok bool) {
	label = strings.ToLower(strings.TrimSpace(label))
	switch label {
	case "", "none", "nothing", "clear", "nowhere", "default", "plain":
		return "", true
	}
	for _, bg := range backgrounds {
		if strings.ToLower(bg.Name) == label {
			return bg.ID, true
		}
	}
	words := requestWords(label)
	if len(words) == 0 {
		return "", false
	}
	bestID, best := "", 0
	for _, bg := range backgrounds {
		score := 0
		for _, word := range strings.Fields(strings.ToLower(bg.Name)) {
			if len(word) >= 3 && words[word] {
				score += 2
			}
		}
		score += scoreTags(words, bg.Tags)
		if score > best {
			best, bestID = score, bg.ID
		}
	}
	if bestID == "" {
		return "", false
	}
	return bestID, true
}

// ── her making one ───────────────────────────────────────────────────────────
//
// With nowhere set up, or nowhere that fits, the scene tag had nothing to resolve
// against and she stayed put: asked to take this to the beach, she said she was on the
// beach in front of the same bedroom wall. With a generator connected she makes the
// place instead. The reply says so (makeScene) and the client runs it, the way it runs
// a picture she takes (chat_fresh_picture.go) and for the same reason: a picture takes
// longer than a reply, and her words should not wait on it. The room she makes is filed
// with the user's own, tagged as hers, so the next move there finds it rather than
// making it again.

// sceneName is a short title for a place she made: its first phrase, capitalised.
func sceneName(place string) string {
	name := strings.TrimSpace(strings.SplitN(place, ",", 2)[0])
	if len(name) > 60 {
		name = strings.TrimSpace(name[:60])
	}
	if name == "" {
		return "Somewhere new"
	}
	return strings.ToUpper(name[:1]) + name[1:]
}

// sceneMadeTag marks a background she made, so the settings screen can tell hers from
// the user's.
const sceneMadeTag = "made by libby"

// sceneTags are what a place she made is filed under: its phrases, then its words, so
// the resolver finds it by any of them next time.
func sceneTags(place string) []string {
	tags := []string{sceneMadeTag}
	for _, phrase := range strings.Split(place, ",") {
		tags = append(tags, phrase)
		for _, word := range strings.Fields(strings.ToLower(phrase)) {
			if word = strings.Trim(word, ".!?\"'()"); len(word) >= 3 && !subjectGlue[word] {
				tags = append(tags, word)
			}
		}
	}
	return normalizeBackgroundTags(tags)
}

// scenePrompt is the generation for a place: the place, as scenery, with nobody in it.
// A room with her standing in it would put two of her on the call screen.
func scenePrompt(place string) string {
	return place + ", scenery, background, no humans, empty room, detailed, wide shot"
}

// sceneNegative keeps people out, then adds whatever she keeps out of every picture.
func sceneNegative(hers string) string {
	out := "people, person, 1girl, 1boy, human, character, face, text, watermark"
	if hers = strings.TrimSpace(hers); hers != "" {
		out += ", " + hers
	}
	return out
}

// backgroundWords is a room in words: its name and what it was tagged as.
func backgroundWords(id string, backgrounds []libbyBackgroundView) string {
	for _, bg := range backgrounds {
		if bg.ID == id {
			words := strings.TrimSpace(bg.Name)
			if len(bg.Tags) > 0 {
				words += " (" + strings.Join(bg.Tags, ", ") + ")"
			}
			return words
		}
	}
	return ""
}
