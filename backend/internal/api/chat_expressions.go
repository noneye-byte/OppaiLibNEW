package api

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// A card character's expressions, the way SillyTavern has them.
//
// Libby's face comes from her wardrobe: outfits drawn for her twelve moods, picked by
// the mood she sets through her tools. A card character is not Libby and has none of
// that. What SillyTavern users have for their cards is an expression pack — a folder of
// pictures named by label (joy.png, anger.png, joy-1.png for a second joy), usually
// passed around as a zip — and SillyTavern's Character Expressions extension picks the
// label for each reply and shows that picture. This is that: the pack uploaded per
// character, the label read off each reply, and the picture drawn on the stage.
//
// Labels are SillyTavern's: the 28 of the classifier it ships with, or any the pack
// adds of its own. The read asks the model that wrote the reply, as SillyTavern's "LLM"
// classifier source does, choosing only among the labels the pack has a picture for —
// a label with no picture is a face that cannot be shown. It continues the turn's own
// prompt, so the backend has all but the question cached and the read is a few tokens.

// stExpressionLabels are SillyTavern's default expressions, in its order.
var stExpressionLabels = []string{
	"admiration", "amusement", "anger", "annoyance", "approval", "caring", "confusion",
	"curiosity", "desire", "disappointment", "disapproval", "disgust", "embarrassment",
	"excitement", "fear", "gratitude", "grief", "joy", "love", "nervousness", "neutral",
	"optimism", "pride", "realization", "relief", "remorse", "sadness", "surprise",
}

// expressionLabel is a label, SillyTavern's or a pack's own.
var expressionLabel = regexp.MustCompile(`^[a-z0-9_]{1,40}$`)

// validConversationEmotion says whether a face may be stored on a conversation with
// this character: one of Libby's moods for her, any expression label for a card
// character, whose pack may name its own.
func validConversationEmotion(characterID, emotion string) bool {
	if characterID == "libby" {
		return supportedLibbyEmotions[emotion]
	}
	return expressionLabel.MatchString(emotion)
}

// expressionFile is a sprite's file name: a label, optionally a second part after "-"
// or "." for another picture of the same expression (joy-1.png, joy.smile.png), and
// an image extension. SillyTavern reads the label off the name the same way.
var expressionFile = regexp.MustCompile(`^([a-z0-9_]{1,40})(?:[-.][a-z0-9_]{1,40})?\.(png|jpe?g|webp|gif)$`)

const (
	maxExpressionFiles  = 300
	maxExpressionBytes  = 12 << 20
	maxExpressionUpload = 160 << 20
)

func (s *Server) expressionDir(userID int64, characterID string) string {
	return filepath.Join(s.chatUserDir(userID), "expressions", characterID)
}

func expressionAAD(userID int64, characterID, file string) []byte {
	return []byte(fmt.Sprintf("chat-expression:%d:%s:%s", userID, characterID, file))
}

// expressionFiles lists a character's sprites by label, names sorted. Read from the
// directory alone: a name is not a secret worth a decryption, and the turn asks this
// after every reply.
func (s *Server) expressionFiles(userID int64, characterID string) map[string][]string {
	out := map[string][]string{}
	entries, err := os.ReadDir(s.expressionDir(userID, characterID))
	if err != nil {
		return out
	}
	for _, e := range entries {
		name := strings.TrimSuffix(e.Name(), ".enc")
		if m := expressionFile.FindStringSubmatch(name); m != nil && !e.IsDir() {
			out[m[1]] = append(out[m[1]], name)
		}
	}
	for label := range out {
		sort.Strings(out[label])
	}
	return out
}

// expressionLabels are the labels a character has a picture for, sorted.
func (s *Server) expressionLabels(userID int64, characterID string) []string {
	files := s.expressionFiles(userID, characterID)
	labels := make([]string, 0, len(files))
	for label := range files {
		labels = append(labels, label)
	}
	sort.Strings(labels)
	return labels
}

// normalExpressionName is an uploaded file's name as stored: its base, lower case,
// spaces as underscores. "" when it is not a sprite's name.
func normalExpressionName(name string) string {
	base := strings.ToLower(strings.TrimSpace(path.Base(strings.ReplaceAll(name, "\\", "/"))))
	base = strings.ReplaceAll(base, " ", "_")
	if strings.HasPrefix(base, ".") || !expressionFile.MatchString(base) {
		return ""
	}
	return base
}

// expressionCharacter is the character a request names, refused for Libby: her face is
// her wardrobe's, not a pack's.
func expressionCharacter(w http.ResponseWriter, r *http.Request) (string, bool) {
	id := r.PathValue("id")
	if id == "libby" || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "expressions are for card characters")
		return "", false
	}
	return id, true
}

func (s *Server) expressionListing(userID int64, characterID string) map[string]any {
	return map[string]any{"expressions": s.expressionFiles(userID, characterID), "labels": stExpressionLabels}
}

func (s *Server) handleListExpressions(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id, ok := expressionCharacter(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, s.expressionListing(u.ID, id))
}

// handleUploadExpressions takes pictures, a zip of them (a SillyTavern sprite pack), or
// both, as multipart "files". A picture replaces one of the same name; anything that is
// not a sprite's name or not a picture is skipped and named in the reply.
func (s *Server) handleUploadExpressions(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id, ok := expressionCharacter(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxExpressionUpload)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "upload is not a form, or is too large")
		return
	}
	defer r.MultipartForm.RemoveAll()
	headers := r.MultipartForm.File["files"]
	if len(headers) == 0 {
		writeErr(w, http.StatusBadRequest, "no files")
		return
	}
	st, err := s.newExpressionStore(u.ID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't store expressions")
		return
	}
	for _, h := range headers {
		f, err := h.Open()
		if err != nil {
			st.skipped = append(st.skipped, h.Filename)
			continue
		}
		if strings.HasSuffix(strings.ToLower(h.Filename), ".zip") {
			if err := eachZipPicture(f, h.Size, st.store); err != nil {
				st.skipped = append(st.skipped, h.Filename+" (not a readable zip)")
			}
		} else {
			data, _ := io.ReadAll(io.LimitReader(f, maxExpressionBytes+1))
			st.store(h.Filename, data)
		}
		f.Close()
	}
	writeJSON(w, http.StatusOK, st.result())
}

// expressionStore files pictures into one character's pack, counting what it kept and
// naming what it would not: an upload and a chub.ai pack go through the same checks.
type expressionStore struct {
	s              *Server
	userID         int64
	characterID    string
	dir            string
	have           int
	saved, skipped []string
}

func (s *Server) newExpressionStore(userID int64, characterID string) (*expressionStore, error) {
	dir := s.expressionDir(userID, characterID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	st := &expressionStore{s: s, userID: userID, characterID: characterID, dir: dir}
	for _, files := range s.expressionFiles(userID, characterID) {
		st.have += len(files)
	}
	return st, nil
}

func (st *expressionStore) store(name string, data []byte) {
	norm := normalExpressionName(name)
	switch {
	case norm == "":
		st.skipped = append(st.skipped, path.Base(name)+" (not named after an expression)")
		return
	case len(data) == 0 || len(data) > maxExpressionBytes:
		st.skipped = append(st.skipped, norm+" (empty or over 12 MB)")
		return
	case !strings.HasPrefix(safeInlineContentType(http.DetectContentType(data)), "image/"):
		st.skipped = append(st.skipped, norm+" (not a picture)")
		return
	}
	target := filepath.Join(st.dir, norm+".enc")
	if _, err := os.Stat(target); err != nil {
		if st.have >= maxExpressionFiles {
			st.skipped = append(st.skipped, norm+" (a character holds at most 300)")
			return
		}
		st.have++
	}
	blob, err := crypto.SealBytes(st.s.kek, data, expressionAAD(st.userID, st.characterID, norm))
	if err == nil {
		err = os.WriteFile(target, blob, 0o600)
	}
	if err != nil {
		st.skipped = append(st.skipped, norm+" (couldn't be stored)")
		return
	}
	st.saved = append(st.saved, norm)
}

func (st *expressionStore) result() map[string]any {
	out := st.s.expressionListing(st.userID, st.characterID)
	out["saved"], out["skipped"] = nonNil(st.saved), nonNil(st.skipped)
	return out
}

func nonNil(list []string) []string {
	if list == nil {
		return []string{}
	}
	return list
}

// eachZipPicture hands store every file in a zip that is not a folder or macOS litter.
// A pack is a folder of pictures, but it is zipped with the folder or without it, and
// sometimes in folders of its own; the label is in the file's name either way.
func eachZipPicture(f io.ReaderAt, size int64, store func(name string, data []byte)) error {
	zr, err := zip.NewReader(f, size)
	if err != nil {
		return err
	}
	for _, entry := range zr.File {
		name := entry.Name
		if entry.FileInfo().IsDir() || strings.Contains(name, "__MACOSX") || strings.HasPrefix(path.Base(name), ".") {
			continue
		}
		if entry.UncompressedSize64 > maxExpressionBytes {
			store(name, nil)
			continue
		}
		rc, err := entry.Open()
		if err != nil {
			continue
		}
		data, _ := io.ReadAll(io.LimitReader(rc, maxExpressionBytes+1))
		rc.Close()
		store(name, data)
	}
	return nil
}

func (s *Server) handleGetExpression(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id, ok := expressionCharacter(w, r)
	if !ok {
		return
	}
	file := r.PathValue("file")
	m := expressionFile.FindStringSubmatch(file)
	if m == nil {
		writeErr(w, http.StatusBadRequest, "bad expression")
		return
	}
	blob, err := os.ReadFile(filepath.Join(s.expressionDir(u.ID, id), file+".enc"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "no such expression")
		return
	}
	raw, err := crypto.OpenBytes(s.kek, blob, expressionAAD(u.ID, id, file))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "expression unreadable")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(raw)))
	w.Header().Set("Cache-Control", "private, max-age=300")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(raw)
}

// handleDeleteExpression removes one sprite, or with no file named, the whole pack.
func (s *Server) handleDeleteExpression(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id, ok := expressionCharacter(w, r)
	if !ok {
		return
	}
	dir := s.expressionDir(u.ID, id)
	if file := r.PathValue("file"); file != "" {
		if !expressionFile.MatchString(file) {
			writeErr(w, http.StatusBadRequest, "bad expression")
			return
		}
		if err := os.Remove(filepath.Join(dir, file+".enc")); err != nil && !errors.Is(err, os.ErrNotExist) {
			writeErr(w, http.StatusInternalServerError, "couldn't delete it")
			return
		}
	} else if err := os.RemoveAll(dir); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't delete them")
		return
	}
	writeJSON(w, http.StatusOK, s.expressionListing(u.ID, id))
}

// pruneExpressions removes the packs of characters the workspace no longer has, so a
// deleted card does not leave its pictures behind. Called with the saved workspace.
func (s *Server) pruneExpressions(userID int64, ws chatWorkspace) {
	entries, err := os.ReadDir(filepath.Join(s.chatUserDir(userID), "expressions"))
	if err != nil {
		return
	}
	keep := map[string]bool{}
	for _, c := range ws.Characters {
		keep[c.ID] = true
	}
	for _, e := range entries {
		if !e.IsDir() || keep[e.Name()] || !validChatID(e.Name(), false) {
			continue
		}
		// Not one touched in the last hour: a pack can be uploaded to a character the
		// client made a moment ago, before a save that names it has landed.
		if info, err := e.Info(); err != nil || time.Since(info.ModTime()) < time.Hour {
			continue
		}
		_ = os.RemoveAll(filepath.Join(s.chatUserDir(userID), "expressions", e.Name()))
	}
}

// expressionQuestion is what the read asks, after the reply it is about.
func expressionQuestion(labels []string) string {
	return "(Out of character: which one of these expressions is on your face in the reply you just wrote? " +
		"Answer with the one word only: " + strings.Join(labels, ", ") + ".)"
}

// expressionGrammar holds the answer to one of the labels, for the backends that take a
// grammar (text-generation-webui and llama.cpp). Labels are [a-z0-9_], so they need no
// escaping inside a GBNF string.
func expressionGrammar(labels []string) string {
	quoted := make([]string, len(labels))
	for i, l := range labels {
		quoted[i] = `"` + l + `"`
	}
	return "root ::= " + strings.Join(quoted, " | ")
}

// pickExpression reads a label out of the model's answer: the whole answer when it is
// one, else the first label it names. A backend that ignored the grammar answers in a
// sentence often enough.
func pickExpression(answer string, labels []string) (string, bool) {
	lower := strings.ToLower(strings.TrimSpace(answer))
	clean := strings.Trim(lower, " .,!*\"'`()[]")
	for _, l := range labels {
		if clean == l {
			return l, true
		}
	}
	best, at := "", -1
	words := strings.FieldsFunc(lower, func(r rune) bool { return !(r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '_') })
	for i, word := range words {
		for _, l := range labels {
			if word == l && (at < 0 || i < at) {
				best, at = l, i
			}
		}
	}
	return best, at >= 0
}

// readExpression asks which of a character's expressions its reply wears. ok is false
// when it has no pack, or the answer named nothing in it; the face then stays as it was.
func (s *Server) readExpression(ctx context.Context, userID int64, characterID string, fitted []chatMessage, said, model string) (string, bool) {
	labels := s.expressionLabels(userID, characterID)
	switch len(labels) {
	case 0:
		return "", false
	case 1:
		return labels[0], true
	}
	if len(fitted) == 0 {
		return "", false
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	messages := toLLMMessages(fitted, nil)
	messages = append(messages,
		llmMessage{Role: "assistant", Content: said},
		llmMessage{Role: "user", Content: expressionQuestion(labels)})
	payload := map[string]any{
		"stream": false, "messages": messages, "max_tokens": 12, "temperature": 0,
		"grammar_string": expressionGrammar(labels),
	}
	if model != "" {
		payload["model"] = model
	}
	began := time.Now()
	reply, err := s.postTurn(ctx, payload, nil)
	if err != nil {
		s.log.Info("expression read failed", "character", characterID, "err", err)
		return "", false
	}
	label, ok := pickExpression(reply.Text, labels)
	s.log.Info("expression read", "character", characterID, "label", label, "ms", time.Since(began).Milliseconds(), "cachedTokens", reply.Timings.CacheN)
	return label, ok
}
