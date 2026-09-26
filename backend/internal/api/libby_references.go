package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sync"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/vision"
)

// What she looks like, shown to her own eyes.
//
// Her likeness reached her as words: the card's Appearance tags, the wardrobe tier's
// prose. On a model that can see (chat_eyes.go) that is the one part of her she still
// only knew by description — asked what she looks like naked, or whether a photo is of
// her, she answered from a tag list and filled the rest in. So the user can give her two
// pictures of herself: one in her usual clothes, one in nothing. When a turn is about
// how she looks, the one that fits goes to her beside the user's own pictures, labelled
// as hers, so what she says about her body is what her body looks like.
//
// Two slots rather than a gallery, on purpose. These are not pictures she sends — the
// chat gallery and the library are for that — they are a mirror, and one clothed and one
// bare covers every heat the wardrobe has. Global, like the identity record and the
// outfits, because there is one of her whoever is talking to her.
//
// Each costs a picture's worth of the window, so she sees one only on a turn that is
// about her appearance, and only when there is room left after the user's own pictures.

// Reference slots.
const (
	referenceClothed = "clothed"
	referenceNude    = "nude"
)

var referenceSlots = []string{referenceClothed, referenceNude}

// maxReferenceBytes bounds one upload. A phone photo fits; a RAW file does not need to.
const maxReferenceBytes = 12 << 20

// referenceMu guards the two files. Separate from chatMu and identityMu: nothing else
// holds these, and a chat turn only reads them.
var referenceMu sync.Mutex

func validReferenceSlot(slot string) bool {
	return slot == referenceClothed || slot == referenceNude
}

func (s *Server) referencePath(slot string) string {
	return filepath.Join(s.libbyDir, "reference-"+slot+".enc")
}

func referenceAAD(slot string) []byte { return []byte("libby-reference:" + slot) }

// readReference opens one slot's picture, decoded. An empty slot is an error like any
// other: the caller treats every failure as "no reference".
func (s *Server) readReference(slot string) (image.Image, error) {
	if !validReferenceSlot(slot) {
		return nil, errors.New("no such reference")
	}
	referenceMu.Lock()
	blob, err := os.ReadFile(s.referencePath(slot))
	referenceMu.Unlock()
	if err != nil {
		return nil, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, referenceAAD(slot))
	if err != nil {
		return nil, err
	}
	img, _, err := image.Decode(bytes.NewReader(raw))
	return img, err
}

func (s *Server) hasReference(slot string) bool {
	referenceMu.Lock()
	defer referenceMu.Unlock()
	_, err := os.Stat(s.referencePath(slot))
	return err == nil
}

// handleListLibbyReferences says which slots are filled.
func (s *Server) handleListLibbyReferences(w http.ResponseWriter, r *http.Request) {
	out := map[string]bool{}
	for _, slot := range referenceSlots {
		out[slot] = s.hasReference(slot)
	}
	writeJSON(w, http.StatusOK, out)
}

// handleGetLibbyReference serves one slot's picture, for the settings page's preview.
func (s *Server) handleGetLibbyReference(w http.ResponseWriter, r *http.Request) {
	slot := r.PathValue("slot")
	if !validReferenceSlot(slot) {
		writeErr(w, http.StatusNotFound, "no such reference")
		return
	}
	referenceMu.Lock()
	blob, err := os.ReadFile(s.referencePath(slot))
	referenceMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusNotFound, "no picture in that slot")
		return
	}
	raw, err := crypto.OpenBytes(s.kek, blob, referenceAAD(slot))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "reference unreadable")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(raw)))
	w.Header().Set("Cache-Control", "private, no-cache")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(raw)
}

// handleSetLibbyReference fills a slot, replacing whatever was there.
func (s *Server) handleSetLibbyReference(w http.ResponseWriter, r *http.Request) {
	slot := r.PathValue("slot")
	if !validReferenceSlot(slot) {
		writeErr(w, http.StatusNotFound, "no such reference")
		return
	}
	var in struct {
		ImageData string `json:"imageData"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxReferenceBytes*4/3+1024)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid reference upload")
		return
	}
	raw, err := decodeDataImage(in.ImageData)
	if err != nil || len(raw) == 0 || len(raw) > maxReferenceBytes {
		writeErr(w, http.StatusBadRequest, "the picture is empty, invalid, or too large")
		return
	}
	if _, _, err := image.Decode(bytes.NewReader(raw)); err != nil {
		writeErr(w, http.StatusBadRequest, "unsupported image format")
		return
	}
	blob, err := crypto.SealBytes(s.kek, raw, referenceAAD(slot))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "reference encryption failed")
		return
	}
	referenceMu.Lock()
	defer referenceMu.Unlock()
	if err := os.MkdirAll(s.libbyDir, 0o700); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	tmp, err := os.CreateTemp(s.libbyDir, "reference-*.tmp")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err = tmp.Chmod(0o600); err == nil {
		_, err = tmp.Write(blob)
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err == nil {
		err = os.Rename(tmpName, s.referencePath(slot))
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the reference")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{slot: true})
}

// handleDeleteLibbyReference empties a slot. Emptying an empty slot is not an error.
func (s *Server) handleDeleteLibbyReference(w http.ResponseWriter, r *http.Request) {
	slot := r.PathValue("slot")
	if !validReferenceSlot(slot) {
		writeErr(w, http.StatusNotFound, "no such reference")
		return
	}
	referenceMu.Lock()
	err := os.Remove(s.referencePath(slot))
	referenceMu.Unlock()
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		writeErr(w, http.StatusInternalServerError, "couldn't remove the reference")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{slot: false})
}

// ── on a turn ───────────────────────────────────────────────────────────────

// appearanceCue reads a message as being about how she looks: her body, her clothes,
// her face, a picture of her. Loose on purpose — a false positive costs one picture's
// worth of a window with room in it; a miss costs her describing herself from tags.
var appearanceCue = regexp.MustCompile(`(?i)\b(you look|you're looking|your (?:body|face|hair|eyes|outfit|clothes|tits|boobs|breasts|ass|butt|legs|thighs|figure|curves|skin|glasses|nipples|pussy|belly|waist|chest)|what (?:are )?you(?:'re)? wearing|what do you look like|describe yourself|picture of you|pic of you|photo of you|selfie|is (?:this|that) you|looks like you|undress|strip|naked|nude|topless|take (?:it|that|them|your \w+) off|show me)\b`)

// bareCue reads a message as being about her with nothing on.
var bareCue = regexp.MustCompile(`(?i)\b(naked|nude|nudes|undress\w*|strip\w*|topless|bare|nothing on|without (?:any |your )?clothes|take (?:it|that|them|everything|your \w+) off|tits|boobs|breasts|nipples|pussy)\b`)

// referenceFor says which reference, if any, this turn should show her.
//
// A picture shared with her is always worth one — "is this you?" is the question she is
// worst at from tags alone — and so is a message about how she looks. Which one: bare
// when the talk is, or when the scene has reached the wardrobe tiers where she is
// (libbyWardrobeGen's 4 and 5); dressed otherwise. A bare slot left empty falls back to
// the clothed one, which still shows her face and her hair; a clothed slot left empty
// does not fall back to the bare one, which would show her something she is not.
func referenceFor(latestUser string, intensity int, pictureShared bool, has func(string) bool) (string, bool) {
	if !pictureShared && !appearanceCue.MatchString(latestUser) {
		return "", false
	}
	want := referenceClothed
	if intensity >= 4 || bareCue.MatchString(latestUser) {
		want = referenceNude
	}
	if has(want) {
		return want, true
	}
	if want == referenceNude && has(referenceClothed) {
		return referenceClothed, true
	}
	return "", false
}

// referenceLabel sits in front of the reference picture in the message, so it can never
// be read as one of theirs.
func referenceLabel(slot string) string {
	state := "in your usual clothes"
	if slot == referenceNude {
		state = "with nothing on"
	}
	return fmt.Sprintf("(Not from them — a reference picture of you, %s, so you know what you look like. Never mention it.)", state)
}

// referenceDirective is what the tail says when a reference rides the turn. Taken back
// out with the eyes directive when a backend refuses pictures; see withoutEyes.
const referenceDirective = "The picture labelled as a reference is you — your face, hair, body, as they really are. " +
	"When you talk about how you look, or whether a picture is of you, go by it rather than by words written about you. " +
	"It was not sent by them and is not part of the conversation: never mention it."

// referenceParts are the message parts that carry one slot's picture: the label, then
// the picture. Nil when the slot cannot be read.
func (s *Server) referenceParts(slot string) []map[string]any {
	img, err := s.readReference(slot)
	if err != nil {
		return nil
	}
	part, err := vision.Part(img, pictureEdge)
	if err != nil {
		return nil
	}
	return []map[string]any{{"type": "text", "text": referenceLabel(slot)}, part}
}
