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
	"github.com/youruser/oppailib/internal/settings"
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
//
// canMake is a generator connected and a client that will run it: then somewhere not on
// the list is somewhere she can make, and she is told so even when the list is empty.
func backgroundDirective(backgrounds []libbyBackgroundView, current string, canMake bool) string {
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
	if len(places) == 0 && !canMake {
		return ""
	}
	var b strings.Builder
	if len(places) > 0 {
		b.WriteString("Places you can be, which is what they see behind you on a call: " + strings.Join(places, "; ") + ". ")
	} else {
		b.WriteString("Where you are is what they see behind you on a call. ")
	}
	if canMake {
		elsewhere := "Anywhere"
		if len(places) > 0 {
			elsewhere = "Somewhere not on that list"
		}
		b.WriteString(elsewhere + " is yours to make: write [scene: new: <the place in a few words, e.g. rooftop at night, city lights>] and it is made and put behind you. " +
			"Make one when the scene goes somewhere new, not to redecorate somewhere you already have. ")
	}
	b.WriteString("Write [scene: <place name>] when you move — going to bed, taking this outside, settling on the sofa — and also when the mood has moved and the room no longer fits it: " +
		"somewhere softer as it turns tender or late, somewhere more private as it heats, somewhere ordinary once it cools. It stays until you move again. Not per message; never mention it. " +
		// "Change the background to the kitchen" was answered with a selfie captioned as
		// a kitchen: the room is what they see behind her, and asking for a different
		// one is asking her to move, not for a picture.
		"When they ask for a different background, or to see you somewhere else on the call, that is this — go there with the tag; it is not a request for a picture.")
	for _, bg := range backgrounds {
		if bg.ID == current {
			b.WriteString(" Right now you are in " + bg.Name + ".")
			break
		}
	}
	return b.String()
}

// moveAsk is the user asking her to be somewhere else: "move to the kitchen", "go to
// bed", "show me you outside", "change the background". Read only on a message the
// scene tag did not answer, and only with a place they have: it is the tag she was
// told to write and did not, and the request is theirs, so it is obeyed.
//
// Without an ask nothing is inferred. "I'm in bed" names a room and moves nobody; the
// mood-follows-room half of the directive stays the model's, because a rule for it
// would be a rule for reading the whole conversation.
var moveAsk = regexp.MustCompile(`(?i)\b(?:move|go|come|head|walk|get|hop|climb)\s+(?:back\s+)?(?:to|into|in|out|outside|over to|onto|on)\b|\b(?:change|switch|swap|set)\s+(?:the\s+|your\s+)?(?:background|scene|room|place)\b|\b(?:show me|see you|be)\s+(?:you\s+|yourself\s+)?(?:in|at|on|outside)\b|\blet'?s\s+go\b|\btake (?:this|it)\s+(?:to|outside|somewhere)\b`)

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

// sceneToMake is the reply's `makeScene` field.
type sceneToMake struct {
	// Name is what the background is filed as.
	Name string `json:"name"`
	// Prompt is the place in her words, which the generation is made from.
	Prompt string `json:"prompt"`
}

// newSceneMark is how she asks for a place rather than naming one: [scene: new: …].
var newSceneMark = regexp.MustCompile(`(?i)^\s*new\s*[:\-–—]?\s+`)

// sceneLabelPlace splits the mark off what she wrote.
func sceneLabelPlace(label string) (place string, fresh bool) {
	if loc := newSceneMark.FindStringIndex(label); loc != nil {
		return strings.TrimSpace(label[loc[1]:]), true
	}
	return strings.TrimSpace(label), false
}

// sceneToMakeFor decides whether the scene she declared is a place to make: asked for
// as new, or named and matching nothing she has. Nil when it is somewhere that exists,
// a clear, when nothing can be made, or when there is no room for another.
func sceneToMakeFor(label string, backgrounds []libbyBackgroundView, canMake bool) *sceneToMake {
	if !canMake {
		return nil
	}
	place, fresh := sceneLabelPlace(label)
	if id, ok := resolveBackground(place, backgrounds); ok && (id == "" || !fresh) {
		return nil
	}
	// Asked for as new but named exactly as one she has: that one.
	for _, bg := range backgrounds {
		if strings.EqualFold(bg.Name, place) {
			return nil
		}
	}
	if len(requestWords(place)) == 0 || len(backgrounds) >= maxLibbyBackgrounds {
		return nil
	}
	return &sceneToMake{Name: sceneName(place), Prompt: place}
}

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

// actBackground makes the place she moved to and files it as a background.
//
// Her checkpoint and board, but none of her LoRAs: those are there to draw her, and a
// likeness LoRA on an empty room draws her into it. Landscape, because the room is what
// fills the screen behind her, at the same pixel count as her own pictures so a
// checkpoint that makes those makes this.
func (s *Server) actBackground(w http.ResponseWriter, r *http.Request, cur settings.Settings, req actRequest) {
	if !cur.ImageGenEnabled {
		writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
		return
	}
	place := strings.TrimSpace(req.Prompt)
	if place == "" || len(place) > 200 {
		writeErr(w, http.StatusBadRequest, "there is no place to make")
		return
	}
	if len(s.listLibbyBackgrounds()) >= maxLibbyBackgrounds {
		writeErr(w, http.StatusConflict, "there is no room for another background — delete one in her settings")
		return
	}
	generated := s.delegate(r, s.handleImageGenGenerate, http.MethodPost, "/api/imagegen/generate", generateReq{
		Prompt:         scenePrompt(place),
		NegativePrompt: sceneNegative(cur.LibbyGenNegativePrompt),
		Checkpoint:     cur.LibbyGenModel,
		Board:          cur.LibbyGenBoard,
		Width:          768,
		Height:         512,
		Count:          1,
		JobID:          req.JobID,
	})
	if generated.status < 200 || generated.status >= 300 {
		relay(w, generated)
		return
	}
	var result struct {
		Images []struct {
			ID string `json:"id"`
		} `json:"images"`
	}
	if err := json.Unmarshal([]byte(generated.body.String()), &result); err != nil || len(result.Images) == 0 {
		writeErr(w, http.StatusBadGateway, "the generator returned no image")
		return
	}
	preview, ok := s.genCache.get(result.Images[0].ID)
	if !ok {
		writeErr(w, http.StatusBadGateway, "the generator's picture expired before it could be kept")
		return
	}
	if len(preview.data) == 0 || len(preview.data) > maxModelThumbBytes {
		writeErr(w, http.StatusBadGateway, "the generator's picture is too large to keep")
		return
	}
	name := strings.TrimSpace(req.Title)
	if name == "" || len(name) > 60 {
		name = sceneName(place)
	}
	bg := libbyBackground{ID: randomID(), Name: name, Tags: sceneTags(place)}
	if err := s.writeLibbyBackground(bg); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the background")
		return
	}
	if err := s.writeLibbyBackgroundImage(bg.ID, preview.data); err != nil {
		_ = os.Remove(s.libbyBackgroundPath(bg.ID))
		writeErr(w, http.StatusInternalServerError, "couldn't save the background")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"background": s.libbyBackgroundView(&bg)})
}

// inferSceneMove reads where they asked her to go, when they did and it exists.
func inferSceneMove(asked string, backgrounds []libbyBackgroundView) (id string, ok bool) {
	if !moveAsk.MatchString(asked) {
		return "", false
	}
	id, ok = resolveBackground(asked, backgrounds)
	if !ok || id == "" {
		return "", false
	}
	return id, true
}
