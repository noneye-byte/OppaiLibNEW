package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
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
	raw, _ := json.Marshal(bg)
	blob, err := crypto.SealBytes(s.kek, raw, []byte("libby-background"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.MkdirAll(s.libbyBackgroundDir(), 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.WriteFile(s.libbyBackgroundPath(id), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, s.libbyBackgroundView(&bg))
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
	blob, err := crypto.SealBytes(s.kek, data, []byte("libby-background-image"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.WriteFile(s.libbyBackgroundImagePath(id), blob, 0o600); err != nil {
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

// sceneTag captures her moving somewhere. Loose rather than anchored, like the attach
// tag: she says where she is while talking about it, and the tag lands wherever the
// sentence put it. Read before scrubbing; deleted by strayTag afterwards.
var sceneTag = regexp.MustCompile(`(?i)\[\s*(?:scene|background|place|setting|location|room)\s*[:=-]?\s*([^\]\n]{1,80}?)\s*\]`)

// findSceneTag reads the last scene she declared, if any. The last one wins for the
// same reason the mood's does: a model that emits two is revising.
func findSceneTag(reply string) (scene string, declared bool) {
	matches := sceneTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return "", false
	}
	return strings.TrimSpace(matches[len(matches)-1][1]), true
}

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

// backgroundDirective tells her where she can be, and how to move.
//
// Only when there is somewhere to go: with no backgrounds the tag has nothing to
// resolve against and teaching it would only put a tag in her prose. Written as a
// standing fact about the place rather than a menu, for the reason the activity
// directive is: handed a list and an instruction a model works through the list.
//
// The room is asked to follow the mood as well as the plot. Left as "move when you
// move", a model moves her when the text says she walked somewhere and otherwise
// never; what is wanted is that a conversation which has turned late, tender or
// heated finds itself somewhere that fits, the way the mood tag finds a face.
func backgroundDirective(backgrounds []libbyBackgroundView, current string) string {
	var places []string
	for _, bg := range backgrounds {
		if !bg.HasImage {
			continue
		}
		entry := bg.Name
		if len(bg.Tags) > 0 {
			entry += " (" + strings.Join(bg.Tags, ", ") + ")"
		}
		places = append(places, entry)
	}
	if len(places) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("Places you can be, which is what they see behind you on a call: " + strings.Join(places, "; ") + ". ")
	b.WriteString("Write [scene: <place name>] when you move — going to bed, taking this outside, settling on the sofa — and also when the mood has moved and the room no longer fits it: " +
		"somewhere softer as it turns tender or late, somewhere more private as it heats, somewhere ordinary once it cools. It stays until you move again. Not per message; never mention it.")
	for _, bg := range backgrounds {
		if bg.ID == current {
			b.WriteString(" Right now you are in " + bg.Name + ".")
			break
		}
	}
	return b.String()
}
