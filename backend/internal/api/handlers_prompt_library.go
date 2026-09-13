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

// ── prompt libraries ─────────────────────────────────────────────────────────
//
// A prompt library is a folder of reusable prompt fragments, each with a name and a
// picture: the character library (who is in the picture) and the pose library (what
// they are doing). The two are the same shape and the same storage — an encrypted
// JSON record and an encrypted thumbnail per entry under /config — so they share one
// implementation and differ only in the directory, the AAD the records are sealed
// with, and the key the list is returned under. They are picker chrome, not library
// items: nothing here touches the media table.

// promptFragment is one entry: a name, the prompt text it contributes, and an
// optional negative. The id is the filename and is authoritative over the record.
type promptFragment struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negativePrompt,omitempty"`
}

// promptFragmentView is what lists return: the record plus whether a thumbnail
// exists, so clients don't probe the thumb endpoint per entry just to render
// placeholders.
type promptFragmentView struct {
	promptFragment
	HasThumb bool `json:"hasThumb"`
}

// promptLibrary names one folder of fragments.
type promptLibrary struct {
	dir string
	// aad and thumbAAD seal the record and its thumbnail. Fixed per library: the
	// character library's values predate this file and must not change, or every
	// existing character becomes unreadable.
	aad, thumbAAD string
	// listKey is the JSON key the list is returned under ("characters", "poses").
	listKey string
	// noun is what an error calls one entry.
	noun string
}

// Fragment ids are randomID() output; anything else in a path segment is refused
// before it can reach the filesystem.
var promptFragmentIDPattern = regexp.MustCompile(`^[0-9a-f]{32}$`)

func (l promptLibrary) recordPath(id string) string { return filepath.Join(l.dir, id+".json.enc") }
func (l promptLibrary) thumbPath(id string) string  { return filepath.Join(l.dir, id+".thumb.enc") }

func (s *Server) readPromptFragment(l promptLibrary, id string) (*promptFragment, error) {
	blob, err := os.ReadFile(l.recordPath(id))
	if err != nil {
		return nil, err
	}
	data, err := crypto.OpenBytes(s.kek, blob, []byte(l.aad))
	if err != nil {
		return nil, err
	}
	var f promptFragment
	if err := json.Unmarshal(data, &f); err != nil {
		return nil, err
	}
	f.ID = id // the filename is authoritative
	return &f, nil
}

// listPromptFragments reads every entry, sorted by name. A missing directory just
// means nobody has saved one yet.
func (s *Server) listPromptFragments(l promptLibrary) []promptFragmentView {
	out := []promptFragmentView{}
	entries, err := os.ReadDir(l.dir)
	if err != nil {
		return out
	}
	for _, e := range entries {
		id, ok := strings.CutSuffix(e.Name(), ".json.enc")
		if !ok || !promptFragmentIDPattern.MatchString(id) {
			continue
		}
		f, err := s.readPromptFragment(l, id)
		if err != nil {
			s.log.Debug("read "+l.noun, "id", id, "err", err)
			continue
		}
		_, thumbErr := os.Stat(l.thumbPath(id))
		out = append(out, promptFragmentView{promptFragment: *f, HasThumb: thumbErr == nil})
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	return out
}

func (s *Server) handleListPromptFragments(l promptLibrary) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{l.listKey: s.listPromptFragments(l)})
	}
}

type savePromptFragmentReq struct {
	ID             string `json:"id"` // empty creates, set updates
	Name           string `json:"name"`
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negativePrompt"`
	// Optional thumbnail, from either a just-generated preview or an upload; leaving
	// both empty keeps whatever thumbnail the entry already has.
	PreviewID string `json:"previewId"`
	ImageData string `json:"imageData"`
}

// resolveFragmentThumb turns the request's thumbnail choice into bytes. Done before
// anything is written so a bad upload doesn't leave a half-updated entry behind.
// Empty bytes with a nil error means "keep what is there".
func (s *Server) resolveFragmentThumb(w http.ResponseWriter, req savePromptFragmentReq) ([]byte, bool) {
	var thumb []byte
	switch {
	case req.PreviewID != "":
		p, ok := s.genCache.get(req.PreviewID)
		if !ok {
			writeErr(w, http.StatusNotFound, "preview expired or not found")
			return nil, false
		}
		thumb = p.data
	case req.ImageData != "":
		raw, err := decodeDataImage(req.ImageData)
		if err != nil {
			writeErr(w, http.StatusBadRequest, "bad image data")
			return nil, false
		}
		thumb = raw
	}
	if len(thumb) > maxModelThumbBytes {
		writeErr(w, http.StatusBadRequest, "image is too large")
		return nil, false
	}
	return thumb, true
}

// writePromptFragment seals and stores the record, and the thumbnail when one came.
func (s *Server) writePromptFragment(w http.ResponseWriter, l promptLibrary, f promptFragment, thumb []byte) bool {
	raw, _ := json.Marshal(f)
	blob, err := crypto.SealBytes(s.kek, raw, []byte(l.aad))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt failed")
		return false
	}
	if err := os.MkdirAll(l.dir, 0o755); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return false
	}
	if err := os.WriteFile(l.recordPath(f.ID), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return false
	}
	if len(thumb) > 0 {
		tblob, err := crypto.SealBytes(s.kek, thumb, []byte(l.thumbAAD))
		if err == nil {
			err = os.WriteFile(l.thumbPath(f.ID), tblob, 0o600)
		}
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "thumbnail write failed")
			return false
		}
	}
	return true
}

// handleSavePromptFragment creates (empty id) or updates an entry. prepare, when
// set, gets a look at the request and the thumbnail before the record is written —
// the character library uses it to derive a prompt from a reference picture.
func (s *Server) handleSavePromptFragment(l promptLibrary, prepare func(r *http.Request, req *savePromptFragmentReq, thumb []byte)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req savePromptFragmentReq
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
			writeErr(w, http.StatusBadRequest, l.noun+" is too large")
			return
		}
		id := req.ID
		if id == "" {
			id = randomID()
		} else if !promptFragmentIDPattern.MatchString(id) {
			writeErr(w, http.StatusBadRequest, "bad "+l.noun+" id")
			return
		}
		thumb, ok := s.resolveFragmentThumb(w, req)
		if !ok {
			return
		}
		if prepare != nil {
			prepare(r, &req, thumb)
		}
		f := promptFragment{ID: id, Name: req.Name, Prompt: strings.TrimSpace(req.Prompt), NegativePrompt: strings.TrimSpace(req.NegativePrompt)}
		if !s.writePromptFragment(w, l, f, thumb) {
			return
		}
		_, thumbErr := os.Stat(l.thumbPath(id))
		writeJSON(w, http.StatusOK, promptFragmentView{promptFragment: f, HasThumb: thumbErr == nil})
	}
}

func (s *Server) handleDeletePromptFragment(l promptLibrary) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if !promptFragmentIDPattern.MatchString(id) {
			writeErr(w, http.StatusBadRequest, "bad "+l.noun+" id")
			return
		}
		if err := os.Remove(l.recordPath(id)); err != nil {
			writeErr(w, http.StatusNotFound, "no such "+l.noun)
			return
		}
		_ = os.Remove(l.thumbPath(id)) // an entry without a thumb is fine
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	}
}

func (s *Server) handlePromptFragmentThumb(l promptLibrary) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if !promptFragmentIDPattern.MatchString(id) {
			writeErr(w, http.StatusBadRequest, "bad "+l.noun+" id")
			return
		}
		blob, err := os.ReadFile(l.thumbPath(id))
		if err != nil {
			writeErr(w, http.StatusNotFound, "no thumbnail for that "+l.noun)
			return
		}
		data, err := crypto.OpenBytes(s.kek, blob, []byte(l.thumbAAD))
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "thumbnail unreadable")
			return
		}
		w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
		w.Header().Set("Cache-Control", "private, max-age=60")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
	}
}

// ── the pose library ─────────────────────────────────────────────────────────
//
// A pose is what the subject is doing — "sitting cross-legged holding a mug", "one
// hand on her hip" — as a fragment with a picture, so the studio can offer a row of
// poses to click the way it offers characters. The outfit board has its own fixed
// pose table (one per expression and activity, so a wardrobe stays consistent);
// these are the user's own, for ordinary generations.

func (s *Server) poseLibrary() promptLibrary {
	return promptLibrary{dir: s.poseDir, aad: "pose", thumbAAD: "pose-thumb", listKey: "poses", noun: "pose"}
}
