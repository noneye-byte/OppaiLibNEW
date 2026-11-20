package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// Her reaction images.
//
//	GET    /api/libby/stickers            the shelf
//	POST   /api/libby/stickers?label=…    add one; the body is the file itself
//	PATCH  /api/libby/stickers/{id}       {label, tags} rename or retag
//	DELETE /api/libby/stickers/{id}
//	GET    /api/libby/stickers/{id}       the file
//
// Half of what people send in a chat is a picture someone else made: the facepalm, the
// dog in the burning room, the gif of a cat falling off a table. She could send pictures
// of herself and things off the shelves, never one of those — so every reaction she had
// was an emoji on a corner or words. This is a shelf of them, put together by the user,
// each with a label that says what it is for, and a tool that sends one.
//
// Called stickers in the code because "reaction" is already the emoji on a message
// (chat_reactions.go); the screens call them reaction images.
//
// The shelf is its own store, not her chat gallery with a third subject. Everything that
// reads the gallery treats a picture that is not "other" as one of her, and a reaction
// gif let into it would sooner or later be sent as a selfie. Files are sealed like every
// other picture of the chat's, and a GIF or clip is kept byte for byte — re-encoding a
// GIF is how it stops moving.

const (
	// maxStickers bounds the shelf. Past a few hundred she cannot be offered them by name
	// anyway, and the store is read every turn.
	maxStickers = 400
	// maxStickerBytes bounds one file: a long reaction gif runs to several megabytes.
	maxStickerBytes = 16 << 20
	// stickerEnumMax is how many labels the tool lists by name. Past it the label is a
	// free string matched against the shelf, because an enum of hundreds is more of her
	// window than the rest of her tools together.
	stickerEnumMax = 40
)

// stickerTypes is what a reaction image may be, read off its bytes.
var stickerTypes = map[string]bool{
	"image/gif": true, "image/png": true, "image/jpeg": true, "image/webp": true,
	"video/mp4": true, "video/webm": true,
}

type libbySticker struct {
	ID string `json:"id"`
	// Label is what it says, in a few words: "facepalm", "happy dance", "smug". It is
	// what she picks it by, so it is what the shelf asks for first.
	Label string   `json:"label"`
	Tags  []string `json:"tags,omitempty"`
	MIME  string   `json:"mime"`
	Size  int      `json:"size"`
	// Sent is how many times she has sent it, for the screen and for drawing among
	// equals: the one sent least is preferred, so a favourite does not become a tic.
	Sent      int   `json:"sent,omitempty"`
	CreatedAt int64 `json:"createdAt"`
}

type libbyStickerShelf struct {
	Items []libbySticker `json:"items"`
}

func (s *Server) libbyStickersPath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "libby-stickers.enc")
}

func (s *Server) libbyStickerFile(userID int64, id string) string {
	return filepath.Join(s.chatUserDir(userID), "stickers", id+".enc")
}

func libbyStickersAAD(userID int64) []byte { return []byte(fmt.Sprintf("libby-stickers:%d", userID)) }

func libbyStickerAAD(userID int64, id string) []byte {
	return []byte(fmt.Sprintf("libby-sticker:%d:%s", userID, id))
}

// readLibbyStickers reads the shelf. The caller holds chatMu.
func (s *Server) readLibbyStickers(userID int64) (libbyStickerShelf, error) {
	shelf := libbyStickerShelf{Items: []libbySticker{}}
	blob, err := os.ReadFile(s.libbyStickersPath(userID))
	if errors.Is(err, os.ErrNotExist) {
		return shelf, nil
	}
	if err != nil {
		return shelf, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, libbyStickersAAD(userID))
	if err != nil {
		return shelf, err
	}
	if err := json.Unmarshal(raw, &shelf); err != nil {
		return shelf, err
	}
	if shelf.Items == nil {
		shelf.Items = []libbySticker{}
	}
	return shelf, nil
}

// writeLibbyStickers writes the shelf atomically. The caller holds chatMu.
func (s *Server) writeLibbyStickers(userID int64, shelf libbyStickerShelf) error {
	raw, err := json.Marshal(shelf)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, libbyStickersAAD(userID))
	if err != nil {
		return err
	}
	return writeFileAtomic(s.libbyStickersPath(userID), blob)
}

// writeFileAtomic lands data on a temp file beside path and renames it over, so a
// partial write never replaces a good file.
func writeFileAtomic(path string, data []byte) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, filepath.Base(path)+"-*.tmp")
	if err != nil {
		return err
	}
	name := tmp.Name()
	defer os.Remove(name)
	if err = tmp.Chmod(0o600); err == nil {
		_, err = tmp.Write(data)
	}
	if cerr := tmp.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return err
	}
	return os.Rename(name, path)
}

// cleanStickerLabel is a label as it is kept: one line, lowercased, at most 40
// characters. Lowercase because it is matched against what she writes, and she does not
// capitalise a tool argument consistently.
func cleanStickerLabel(label string) string {
	label = strings.ToLower(strings.Join(strings.Fields(label), " "))
	label = strings.Trim(label, " .,;:!?\"'")
	if r := []rune(label); len(r) > 40 {
		label = strings.TrimSpace(string(r[:40]))
	}
	return label
}

// labelFromFileName is the label a file arrives with when nobody gave one: its name,
// without the extension, the separators turned to spaces. "happy_dance.gif" is a
// "happy dance".
func labelFromFileName(name string) string {
	name = strings.TrimSuffix(filepath.Base(name), filepath.Ext(name))
	return cleanStickerLabel(strings.NewReplacer("_", " ", "-", " ", ".", " ").Replace(name))
}

func cleanStickerTags(tags []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, t := range tags {
		if t = cleanStickerLabel(t); t != "" && !seen[t] && len(out) < 12 {
			seen[t] = true
			out = append(out, t)
		}
	}
	return out
}

func (s *Server) handleListLibbyStickers(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	shelf, err := s.readLibbyStickers(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the reaction images")
		return
	}
	writeJSON(w, http.StatusOK, shelf)
}

func (s *Server) handleUploadLibbySticker(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxStickerBytes+1))
	if err != nil || len(raw) > maxStickerBytes {
		writeErr(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("a reaction image can be at most %d MB", maxStickerBytes>>20))
		return
	}
	if len(raw) == 0 {
		writeErr(w, http.StatusBadRequest, "the file is empty")
		return
	}
	// The type is read off the bytes, never taken from the request: what is served back
	// on this origin is what the file actually is.
	mime := http.DetectContentType(raw)
	if !stickerTypes[mime] {
		writeErr(w, http.StatusBadRequest, "a reaction image has to be a GIF, PNG, JPEG, WebP, MP4 or WebM")
		return
	}
	q := r.URL.Query()
	label := cleanStickerLabel(q.Get("label"))
	if label == "" {
		label = labelFromFileName(q.Get("filename"))
	}
	if label == "" {
		label = "reaction"
	}
	item := libbySticker{
		ID: randomID(), Label: label, Tags: cleanStickerTags(strings.Split(q.Get("tags"), ",")),
		MIME: mime, Size: len(raw), CreatedAt: time.Now().UnixMilli(),
	}
	blob, err := crypto.SealBytes(s.kek, raw, libbyStickerAAD(u.ID, item.ID))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encryption failed")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	shelf, err := s.readLibbyStickers(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the reaction images")
		return
	}
	if len(shelf.Items) >= maxStickers {
		writeErr(w, http.StatusBadRequest, "the shelf is full — delete a few reaction images first")
		return
	}
	if err := writeFileAtomic(s.libbyStickerFile(u.ID, item.ID), blob); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't store it")
		return
	}
	shelf.Items = append(shelf.Items, item)
	if err := s.writeLibbyStickers(u.ID, shelf); err != nil {
		_ = os.Remove(s.libbyStickerFile(u.ID, item.ID))
		writeErr(w, http.StatusInternalServerError, "couldn't store it")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (s *Server) handlePatchLibbySticker(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	var req struct {
		Label *string   `json:"label"`
		Tags  *[]string `json:"tags"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	shelf, err := s.readLibbyStickers(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the reaction images")
		return
	}
	for i := range shelf.Items {
		if shelf.Items[i].ID != id {
			continue
		}
		if req.Label != nil {
			label := cleanStickerLabel(*req.Label)
			if label == "" {
				writeErr(w, http.StatusBadRequest, "a reaction image needs a label — it is what she picks it by")
				return
			}
			shelf.Items[i].Label = label
		}
		if req.Tags != nil {
			shelf.Items[i].Tags = cleanStickerTags(*req.Tags)
		}
		if err := s.writeLibbyStickers(u.ID, shelf); err != nil {
			writeErr(w, http.StatusInternalServerError, "couldn't save it")
			return
		}
		writeJSON(w, http.StatusOK, shelf.Items[i])
		return
	}
	writeErr(w, http.StatusNotFound, "no such reaction image")
}

func (s *Server) handleDeleteLibbySticker(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	shelf, err := s.readLibbyStickers(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the reaction images")
		return
	}
	kept := shelf.Items[:0]
	found := false
	for _, it := range shelf.Items {
		if it.ID == id {
			found = true
			continue
		}
		kept = append(kept, it)
	}
	if !found {
		writeErr(w, http.StatusNotFound, "no such reaction image")
		return
	}
	shelf.Items = kept
	if err := s.writeLibbyStickers(u.ID, shelf); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the shelf")
		return
	}
	// A message that sent it keeps its id and shows a gap, as a deleted gallery
	// picture does: the conversation is the record of what was said.
	_ = os.Remove(s.libbyStickerFile(u.ID, id))
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleGetLibbySticker(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	s.chatMu.Lock()
	shelf, err := s.readLibbyStickers(u.ID)
	s.chatMu.Unlock()
	var meta *libbySticker
	if err == nil {
		for i := range shelf.Items {
			if shelf.Items[i].ID == id {
				meta = &shelf.Items[i]
			}
		}
	}
	if meta == nil {
		writeErr(w, http.StatusNotFound, "no such reaction image")
		return
	}
	blob, err := os.ReadFile(s.libbyStickerFile(u.ID, id))
	if err != nil {
		writeErr(w, http.StatusNotFound, "no such reaction image")
		return
	}
	raw, err := crypto.OpenBytes(s.kek, blob, libbyStickerAAD(u.ID, id))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "unreadable")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(meta.MIME))
	// A sticker never changes under its id, and the same handful recur in a thread.
	w.Header().Set("Cache-Control", "private, max-age=86400, immutable")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(raw)
}

/* ------------------------------------------------------------- the tool */

// stickerLabels is the shelf's labels, deduplicated and sorted, for the tool's
// description. Sorted so the definition — which sits in the prefix the backend caches —
// is the same from turn to turn until the shelf itself changes.
func stickerLabels(shelf []libbySticker) []string {
	seen := map[string]bool{}
	var out []string
	for _, it := range shelf {
		if !seen[it.Label] {
			seen[it.Label] = true
			out = append(out, it.Label)
		}
	}
	sort.Strings(out)
	return out
}

// pickSticker chooses the reaction image for what she asked for, or nil when nothing on
// the shelf is close. An exact label wins; otherwise the words she used are matched
// against each label and its tags. Among equals the least-sent wins, then the dice —
// and the one she sent last is passed over while there is anything else that fits, so
// she does not answer two messages running with the same gif.
func pickSticker(shelf []libbySticker, want, lastSent string, roll func(int) int) *libbySticker {
	want = cleanStickerLabel(want)
	if want == "" || len(shelf) == 0 {
		return nil
	}
	if roll == nil {
		roll = rand.IntN
	}
	wantWords := strings.Fields(want)
	best := 0
	var top []int
	for i, it := range shelf {
		score := 0
		if it.Label == want {
			score = 100
		} else {
			hay := " " + it.Label + " " + strings.Join(it.Tags, " ") + " "
			for _, w := range wantWords {
				if len(w) < 3 {
					continue
				}
				if strings.Contains(hay, " "+w+" ") {
					score += 3
				} else if strings.Contains(hay, w) {
					score++
				}
			}
		}
		if score == 0 {
			continue
		}
		if score > best {
			best, top = score, []int{i}
		} else if score == best {
			top = append(top, i)
		}
	}
	if len(top) == 0 {
		return nil
	}
	if len(top) > 1 {
		fresh := top[:0:0]
		for _, i := range top {
			if shelf[i].ID != lastSent {
				fresh = append(fresh, i)
			}
		}
		if len(fresh) > 0 {
			top = fresh
		}
		least := shelf[top[0]].Sent
		for _, i := range top {
			least = min(least, shelf[i].Sent)
		}
		rare := top[:0:0]
		for _, i := range top {
			if shelf[i].Sent == least {
				rare = append(rare, i)
			}
		}
		top = rare
	}
	chosen := shelf[top[roll(len(top))]]
	return &chosen
}

// lastStickerSent is the reaction image she sent most recently in this conversation.
func lastStickerSent(messages []storedChatMessage) string {
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Sticker != "" {
			return messages[i].Sticker
		}
	}
	return ""
}

// stickerMessage is the stored placeholder for one: what an older client shows, and
// what she reads back in the history, so she knows which one she sent.
func stickerMessage(label string) string {
	return stageDirection(fmt.Sprintf("sends a %q reaction gif", label))
}

func (t *turnRun) execSendSticker(args map[string]any) (string, bool) {
	want := argString(args, "label")
	s := t.s
	s.chatMu.Lock()
	shelf, err := s.readLibbyStickers(t.userID)
	s.chatMu.Unlock()
	if err != nil || len(shelf.Items) == 0 {
		return "You have no reaction images.", false
	}
	chosen := pickSticker(shelf.Items, want, lastStickerSent(t.v.conv.Messages), nil)
	if chosen == nil {
		return fmt.Sprintf("None of your reaction images is %q; they are: %s.", want, strings.Join(firstN(stickerLabels(shelf.Items), 30), ", ")), false
	}
	t.post(storedChatMessage{ID: randomID(), Role: "assistant", Content: stickerMessage(chosen.Label), Sticker: chosen.ID})
	t.visible = true
	s.chatMu.Lock()
	if fresh, err := s.readLibbyStickers(t.userID); err == nil {
		for i := range fresh.Items {
			if fresh.Items[i].ID == chosen.ID {
				fresh.Items[i].Sent++
			}
		}
		if err := s.writeLibbyStickers(t.userID, fresh); err != nil {
			s.log.Debug("libby stickers: count", "err", err)
		}
	}
	s.chatMu.Unlock()
	return "Sent your " + chosen.Label + " reaction.", false
}
