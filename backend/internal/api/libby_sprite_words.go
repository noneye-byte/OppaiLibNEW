package api

import (
	"encoding/json"
	"errors"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"unicode/utf8"

	"github.com/youruser/oppailib/internal/crypto"
)

// The Sprites board's own wording for each square, as the user has rewritten it.
//
// Every expression and MISC state comes with its words written into the studio
// (OUTFIT_FACES and OUTFIT_ACTIVITIES in views/imagegen.ts): the face and the pose as
// tags, and the same thing as a plain sentence for Anima, which reads prose. A set is
// sixty-odd pictures made over several sittings, often on more than one device, so
// what someone changes is kept here rather than in the studio's per-device draft,
// which forgets after a month. Only the changes are stored; a square left alone keeps
// the studio's words, so improving those reaches every board that never touched them.
//
// The file is sealed like the rest of her wardrobe: the intimate states' wording is as
// private as their pictures.

// spriteWords is one square's wording. A blank field is the studio's own.
type spriteWords struct {
	Face  string `json:"face,omitempty"`
	Pose  string `json:"pose,omitempty"`
	Prose string `json:"prose,omitempty"`
}

// spriteWordsMax bounds one field. A pose is a line; this is several paragraphs.
const spriteWordsMax = 1200

func (s *Server) spriteWordsPath() string { return filepath.Join(s.libbyDir, "sprite-words.enc") }

func (s *Server) readSpriteWords() (map[string]spriteWords, error) {
	blob, err := os.ReadFile(s.spriteWordsPath())
	if errors.Is(err, fs.ErrNotExist) {
		return map[string]spriteWords{}, nil
	}
	if err != nil {
		return nil, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, []byte("libby-sprite-words"))
	if err != nil {
		return nil, err
	}
	out := map[string]spriteWords{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *Server) handleGetSpriteWords(w http.ResponseWriter, r *http.Request) {
	words, err := s.readSpriteWords()
	if err != nil {
		s.log.Error("sprite words: read failed", "err", err)
		writeErr(w, http.StatusInternalServerError, "could not read the sprite wording")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"words": words})
}

// handlePutSpriteWords replaces the whole set of changes: a square missing from it goes
// back to the studio's words.
func (s *Server) handlePutSpriteWords(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Words map[string]spriteWords `json:"words"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	clean := map[string]spriteWords{}
	for id, sw := range req.Words {
		if !libbySlotValid(id) {
			writeErr(w, http.StatusBadRequest, "no square is called "+id)
			return
		}
		sw = spriteWords{Face: strings.TrimSpace(sw.Face), Pose: strings.TrimSpace(sw.Pose), Prose: strings.TrimSpace(sw.Prose)}
		for _, f := range []string{sw.Face, sw.Pose, sw.Prose} {
			if utf8.RuneCountInString(f) > spriteWordsMax {
				writeErr(w, http.StatusBadRequest, "the wording for "+id+" is too long")
				return
			}
		}
		if sw != (spriteWords{}) {
			clean[id] = sw
		}
	}
	if err := s.writeSpriteWords(clean); err != nil {
		s.log.Error("sprite words: write failed", "err", err)
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"words": clean})
}

// writeSpriteWords replaces the file whole, through a temporary one and a rename, as
// her identity and references are: a write cut off half way leaves the last good file.
func (s *Server) writeSpriteWords(words map[string]spriteWords) error {
	raw, err := json.Marshal(words)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, []byte("libby-sprite-words"))
	if err != nil {
		return err
	}
	spriteWordsMu.Lock()
	defer spriteWordsMu.Unlock()
	if err := os.MkdirAll(s.libbyDir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(s.libbyDir, "sprite-words-*.tmp")
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
	return os.Rename(tmpName, s.spriteWordsPath())
}

var spriteWordsMu sync.Mutex
