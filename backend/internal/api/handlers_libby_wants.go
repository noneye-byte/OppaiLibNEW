package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// Libby's wants — the other thing she carries between conversations.
//
// Sibling to her memory (handlers_libby_memory.go) and built the same way, for the
// same reasons. Memory is what she has kept about the user; this is what she has kept
// about herself: outfits she wishes she had, media she wishes were on the shelves, how
// she wants a night to go. She raises them unprompted, and they persist, so they live
// server-side in their own encrypted file rather than in the client-owned workspace.
//
// It is written from her own replies (a [want: …] tag the model emits and the user
// never sees), so — like memory — it must not be forgeable or erasable by a client that
// simply omits a field. Only three things touch it: capture on the chat path, injection
// back into the next prompt, and the settings screen that lists and clears it.
//
// It is Libby's alone. Imported character cards are somebody else's character and have
// no desires of their own to keep, the same way memory, the self-directive, the library
// snapshot, and actions are all Libby-only.

const (
	// maxLibbyWants bounds the store. A handful of standing desires is a person with an
	// inner life; a long ledger is a to-do list, which is the opposite of the point.
	// Past this the oldest fall away.
	maxLibbyWants = 15
	// maxWantLen bounds one want. A want is a wish, not a paragraph; a model that tries
	// to store a monologue is truncated to the part that fits.
	maxWantLen = 200
)

// libbyWant is one standing desire she has kept for herself.
type libbyWant struct {
	ID   string `json:"id"`
	Text string `json:"text"`
	At   int64  `json:"at"`
}

// libbyWantStore is the whole file: a flat list, oldest first.
type libbyWantStore struct {
	Wants []libbyWant `json:"wants"`
}

func (s *Server) libbyWantsPath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "libby-wants.json.enc")
}

func libbyWantsAAD(userID int64) []byte {
	return []byte(fmt.Sprintf("libby-wants:%d", userID))
}

// readLibbyWants loads the store, treating an absent file as an empty one — a Libby who
// has never wanted anything out loud has no file, and that is not an error.
func (s *Server) readLibbyWants(userID int64) (libbyWantStore, error) {
	var store libbyWantStore
	blob, err := os.ReadFile(s.libbyWantsPath(userID))
	if errors.Is(err, os.ErrNotExist) {
		store.Wants = []libbyWant{}
		return store, nil
	}
	if err != nil {
		return store, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, libbyWantsAAD(userID))
	if err != nil {
		return store, err
	}
	if err := json.Unmarshal(raw, &store); err != nil {
		return store, err
	}
	if store.Wants == nil {
		store.Wants = []libbyWant{}
	}
	return store, nil
}

// writeLibbyWants persists the store atomically, mirroring writeLibbyMemory: a partial
// write must never replace a good file, so it lands on a temp file and renames.
func (s *Server) writeLibbyWants(userID int64, store libbyWantStore) error {
	if store.Wants == nil {
		store.Wants = []libbyWant{}
	}
	raw, err := json.Marshal(store)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, libbyWantsAAD(userID))
	if err != nil {
		return err
	}
	dir := s.chatUserDir(userID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "libby-wants-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err = tmp.Chmod(0o600); err == nil {
		_, err = tmp.Write(blob)
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmpName, s.libbyWantsPath(userID))
}

// appendLibbyWants adds new desires to the store, skipping ones it already holds and
// dropping the oldest once the cap is passed. Returns whether anything actually changed,
// so the caller can avoid a disk write for a reply that only re-voiced a want she had.
//
// Dedup is by normalized text, like memory: a model reminded it wants something will
// happily re-emit it, and storing "a black lace set" twice buys nothing but noise.
func (s *Server) appendLibbyWants(userID int64, wants []string) (bool, error) {
	if len(wants) == 0 {
		return false, nil
	}
	store, err := s.readLibbyWants(userID)
	if err != nil {
		return false, err
	}
	have := make(map[string]bool, len(store.Wants))
	for _, w := range store.Wants {
		have[strings.ToLower(strings.TrimSpace(w.Text))] = true
	}
	changed := false
	for _, want := range wants {
		want = strings.TrimSpace(want)
		if len(want) > maxWantLen {
			want = strings.TrimSpace(want[:maxWantLen])
		}
		key := strings.ToLower(want)
		if want == "" || have[key] {
			continue
		}
		have[key] = true
		store.Wants = append(store.Wants, libbyWant{ID: randomID(), Text: want, At: time.Now().UnixMilli()})
		changed = true
	}
	if !changed {
		return false, nil
	}
	if len(store.Wants) > maxLibbyWants {
		store.Wants = store.Wants[len(store.Wants)-maxLibbyWants:]
	}
	return true, s.writeLibbyWants(userID, store)
}

// wantsDirective tells her to keep her own standing desires.
//
// Framed as appetite rather than bookkeeping, for the same reason memoryDirective is
// framed as noticing: a model told to "track wants" appends a wishlist to every reply,
// which is the machinery-narration the scrubber exists to stop. What is wanted is the
// human thing — a person who wants things and says so now and then — so the instruction
// is about her own hunger, and the tag is only the plumbing that makes it last. The
// frequency cap is stated hard because this is the failure mode.
const wantsDirective = "When a genuine desire of your own surfaces, quietly keep it with [want: <desire>]—an outfit, missing media, or how you want the night to go. " +
	"It is your appetite, not a service offer. At most one, rarely, and never mention the tag."

// wantsPromptBlock renders her standing desires into the system prompt.
//
// Presented as things she simply wants, not a database dump, for the same reason memory
// and the library snapshot are: handed a labelled list a model recites it. She should
// let these colour what she reaches for and brings up — not read them aloud.
func wantsPromptBlock(store libbyWantStore) string {
	if len(store.Wants) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\n\nWhat you have been wanting lately — your own standing desires, carried over from before. " +
		"These are yours. Let them shape what you reach for and bring up, and raise one yourself now and then when it fits — " +
		"never recite them as a list or announce that you keep them.\n")
	for _, w := range store.Wants {
		b.WriteString("- " + w.Text + "\n")
	}
	return b.String()
}

// ── settings: list, clear, forget one ───────────────────────────────────────

func (s *Server) handleGetLibbyWants(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	store, err := s.readLibbyWants(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "wants unreadable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"wants": store.Wants})
}

func (s *Server) handleClearLibbyWants(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	// Removing the file is the clear: an absent file reads as empty, so there is nothing
	// left for injection to find. Not an error when it was never there — the outcome the
	// caller asked for already holds.
	err := os.Remove(s.libbyWantsPath(u.ID))
	s.chatMu.Unlock()
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		writeErr(w, http.StatusInternalServerError, "couldn't clear her wants")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleForgetLibbyWant(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad want id")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	store, err := s.readLibbyWants(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "wants unreadable")
		return
	}
	kept := store.Wants[:0]
	found := false
	for _, want := range store.Wants {
		if want.ID == id {
			found = true
		} else {
			kept = append(kept, want)
		}
	}
	if !found {
		writeErr(w, http.StatusNotFound, "no such want")
		return
	}
	store.Wants = kept
	if err := s.writeLibbyWants(u.ID, store); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't update her wants")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
