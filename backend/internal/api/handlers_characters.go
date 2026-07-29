package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/youruser/oppailib/internal/crypto"
)

// ── character library ────────────────────────────────────────────────────────
//
// A character is a reusable prompt fragment with a face: a name, the prompt text that
// conjures them, and a thumbnail. They exist so a recurring subject doesn't have to be
// retyped into every generation. Like model thumbnails they are picker chrome, not
// library items — stored encrypted under /config/characters, never in the media table.

type character struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negativePrompt,omitempty"`
}

// charView is what lists return: the record plus whether a thumbnail exists, so
// clients don't probe the thumb endpoint per character just to render placeholders.
type charView struct {
	character
	HasThumb bool `json:"hasThumb"`
}

// Character ids are randomID() output; anything else in a path segment is refused
// before it can reach the filesystem.
var charIDPattern = regexp.MustCompile(`^[0-9a-f]{32}$`)

func (s *Server) charRecordPath(id string) string {
	return filepath.Join(s.characterDir, id+".json.enc")
}

func (s *Server) charThumbPath(id string) string {
	return filepath.Join(s.characterDir, id+".thumb.enc")
}

func (s *Server) readCharacter(id string) (*character, error) {
	blob, err := os.ReadFile(s.charRecordPath(id))
	if err != nil {
		return nil, err
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("character"))
	if err != nil {
		return nil, err
	}
	var c character
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, err
	}
	c.ID = id // the filename is authoritative
	return &c, nil
}

func (s *Server) handleListCharacters(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(s.characterDir)
	if err != nil {
		// No directory yet just means nobody has saved a character.
		writeJSON(w, http.StatusOK, map[string]any{"characters": []charView{}})
		return
	}
	out := []charView{}
	for _, e := range entries {
		id, ok := strings.CutSuffix(e.Name(), ".json.enc")
		if !ok || !charIDPattern.MatchString(id) {
			continue
		}
		c, err := s.readCharacter(id)
		if err != nil {
			s.log.Debug("read character", "id", id, "err", err)
			continue
		}
		_, thumbErr := os.Stat(s.charThumbPath(id))
		out = append(out, charView{character: *c, HasThumb: thumbErr == nil})
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	writeJSON(w, http.StatusOK, map[string]any{"characters": out})
}

type saveCharacterReq struct {
	ID             string `json:"id"` // empty creates, set updates
	Name           string `json:"name"`
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negativePrompt"`
	// Optional thumbnail, from either a just-generated preview or an upload; leaving
	// both empty keeps whatever thumbnail the character already has.
	PreviewID string `json:"previewId"`
	ImageData string `json:"imageData"`
}

func (s *Server) handleSaveCharacter(w http.ResponseWriter, r *http.Request) {
	var req saveCharacterReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeErr(w, http.StatusBadRequest, "a name is required")
		return
	}
	if len(req.Name) > 120 || len(req.Prompt) > 4000 || len(req.NegativePrompt) > 4000 {
		writeErr(w, http.StatusBadRequest, "character is too large")
		return
	}
	id := req.ID
	if id == "" {
		id = randomID()
	} else if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad character id")
		return
	}

	// The thumbnail bytes, if any, are resolved before anything is written so a bad
	// upload doesn't leave a half-updated character behind.
	var thumb []byte
	switch {
	case req.PreviewID != "":
		p, ok := s.genCache.get(req.PreviewID)
		if !ok {
			writeErr(w, http.StatusNotFound, "preview expired or not found")
			return
		}
		thumb = p.data
	case req.ImageData != "":
		raw, err := decodeDataImage(req.ImageData)
		if err != nil {
			writeErr(w, http.StatusBadRequest, "bad image data")
			return
		}
		thumb = raw
	}
	if len(thumb) > maxModelThumbBytes {
		writeErr(w, http.StatusBadRequest, "image is too large")
		return
	}
	// When the user supplies a reference image but no manual prompt, derive only
	// stable appearance tags. AnalyzeAppearance intentionally excludes objects,
	// actions, scene details, identities, and content ratings.
	if len(thumb) > 0 && strings.TrimSpace(req.Prompt) == "" {
		if suggestions, err := s.ai.AnalyzeAppearance(r.Context(), bytes.NewReader(thumb)); err == nil {
			tags := make([]string, 0, len(suggestions))
			for _, suggestion := range suggestions {
				tags = append(tags, suggestion.Name)
			}
			req.Prompt = strings.Join(tags, ", ")
		}
	}

	c := character{ID: id, Name: req.Name, Prompt: strings.TrimSpace(req.Prompt), NegativePrompt: strings.TrimSpace(req.NegativePrompt)}
	raw, _ := json.Marshal(c)
	blob, err := crypto.SealBytes(s.kek, raw, []byte("character"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return
	}
	if err := os.MkdirAll(s.characterDir, 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.WriteFile(s.charRecordPath(id), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	if len(thumb) > 0 {
		tblob, err := crypto.SealBytes(s.kek, thumb, []byte("character-thumb"))
		if err == nil {
			err = os.WriteFile(s.charThumbPath(id), tblob, 0o600)
		}
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "thumbnail write failed")
			return
		}
	}
	_, thumbErr := os.Stat(s.charThumbPath(id))
	writeJSON(w, http.StatusOK, charView{character: c, HasThumb: thumbErr == nil})
}

func (s *Server) handleDeleteCharacter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad character id")
		return
	}
	if err := os.Remove(s.charRecordPath(id)); err != nil {
		writeErr(w, http.StatusNotFound, "no such character")
		return
	}
	_ = os.Remove(s.charThumbPath(id)) // a character without a thumb is fine
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleCharacterThumb(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad character id")
		return
	}
	blob, err := os.ReadFile(s.charThumbPath(id))
	if err != nil {
		writeErr(w, http.StatusNotFound, "no thumbnail for that character")
		return
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte("character-thumb"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "thumbnail unreadable")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
	w.Header().Set("Cache-Control", "private, max-age=60")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
