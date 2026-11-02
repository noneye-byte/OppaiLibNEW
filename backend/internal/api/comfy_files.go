package api

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
)

// A ComfyUI file as a file: linked to the Civitai version it is, and deleted.
//
// ComfyUI has an API for neither, so both work on the folders the Video settings name
// (imagegen.ComfyPlaces), the ones installs go into: a file is found there by the name
// ComfyUI lists it under. A file ComfyUI loads from somewhere else — another
// extra_model_paths.yaml share — is not OppaiLib's to delete, and is said to be.

// comfyHashLimit is the largest file hashed to find it on Civitai. A LoRA is a few
// hundred megabytes; a Wan 14B model in fp8 is fourteen gigabytes, which on a spinning
// Unraid array is minutes of reading, past where a browser gives up on the request.
const comfyHashLimit = 8 << 30

// comfyFileError is why a file can't be found, with the status it answers with.
type comfyFileError struct {
	status int
	msg    string
}

func (e *comfyFileError) Error() string { return e.msg }

// comfyFilePath is where a file ComfyUI lists under a kind is in this container: in the
// folder set for the kind, under the name ComfyUI lists it by, which carries any
// subfolder with ComfyUI's own separator.
func comfyFilePath(places imagegen.ComfyPlaces, kind, name string) (string, error) {
	f, ok := places[kind]
	if !ok {
		return "", &comfyFileError{http.StatusBadRequest, "kind is one of diffusion_models, checkpoints, loras or vae"}
	}
	if f.Dir == "" {
		msg := f.Problem
		if msg == "" {
			msg = "no folder is set for " + kind + " — set it under Settings → Image generation → Video, where installs go"
		}
		return "", &comfyFileError{http.StatusConflict, msg}
	}
	rel := filepath.FromSlash(strings.ReplaceAll(strings.TrimSpace(name), `\`, "/"))
	if rel == "" || filepath.IsAbs(rel) || filepath.VolumeName(rel) != "" {
		return "", &comfyFileError{http.StatusBadRequest, "name a file ComfyUI lists"}
	}
	p := filepath.Join(f.Dir, rel)
	if r, err := filepath.Rel(f.Dir, p); err != nil || r == ".." || strings.HasPrefix(r, ".."+string(filepath.Separator)) {
		return "", &comfyFileError{http.StatusBadRequest, "name a file ComfyUI lists"}
	}
	info, err := os.Stat(p)
	if err != nil || info.IsDir() {
		return "", &comfyFileError{http.StatusNotFound, fmt.Sprintf("%s isn't in %s — ComfyUI loads it from another folder, which OppaiLib doesn't manage", name, f.Dir)}
	}
	return p, nil
}

func writeComfyFileErr(w http.ResponseWriter, err error) {
	var fe *comfyFileError
	if errors.As(err, &fe) {
		writeErr(w, fe.status, fe.msg)
		return
	}
	writeErr(w, http.StatusInternalServerError, err.Error())
}

// handleDeleteComfyFile deletes a file from ComfyUI's folder, and what OppaiLib kept
// of it. A Wan pair is two files, so the studio asks once for each.
func (s *Server) handleDeleteComfyFile(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	name := q.Get("name")
	places := s.comfyPlaces()
	p, err := comfyFilePath(places, q.Get("kind"), name)
	if err != nil {
		writeComfyFileErr(w, err)
		return
	}
	if err := os.Remove(p); err != nil {
		writeErr(w, http.StatusConflict, "OppaiLib couldn't delete it: "+err.Error())
		return
	}
	if err := s.db.DeleteComfyNote(r.Context(), name); err != nil {
		s.log.Warn("comfy delete: note", "file", name, "err", err)
	}
	// ComfyUI drops it from its lists only once it sees the folder changed.
	places.TouchComfyFolders()
	w.WriteHeader(http.StatusNoContent)
}

type comfyLinkReq struct {
	Name string `json:"name"`
	// Kind is the folder the file is in, for finding it to hash.
	Kind string `json:"kind"`
	// A version by id, or a Civitai page or download address to read one off; with
	// neither, the file is hashed and looked up.
	VersionID int64  `json:"versionId"`
	URL       string `json:"url"`
	Unlink    bool   `json:"unlink"`
}

// handleComfyLink links a ComfyUI file to the Civitai version it is, and gives it that
// version's words, defaults and cover where it has none — what an install from the
// catalogue does, for a file that came from elsewhere. Answers the note as it is now.
func (s *Server) handleComfyLink(w http.ResponseWriter, r *http.Request) {
	var req comfyLinkReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		writeErr(w, http.StatusBadRequest, "name the file to link")
		return
	}
	// Hashing a large model off a slow disk takes a while; under five minutes, which is
	// when Firefox gives up on an answer.
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Minute)
	defer cancel()
	if req.Unlink {
		if err := s.db.PutComfyCivitai(ctx, req.Name, db.ComfyCivitai{}); err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		s.writeComfyNote(w, ctx, req.Name)
		return
	}
	versionID, modelID := req.VersionID, int64(0)
	if versionID == 0 && strings.TrimSpace(req.URL) != "" {
		var ok bool
		if modelID, versionID, ok = civitaiIDsIn(req.URL); !ok {
			writeErr(w, http.StatusBadRequest, "that isn't a Civitai model page, download link or version number")
			return
		}
	}
	if versionID == 0 && modelID == 0 {
		v, err := s.comfyVersionByHash(ctx, req.Kind, req.Name)
		if err != nil {
			writeComfyFileErr(w, err)
			return
		}
		versionID, modelID = v.ID, v.ModelID
	}
	if modelID == 0 {
		var v civitaiRawVersion
		if err := s.civitaiGet(ctx, "/model-versions/"+strconv.FormatInt(versionID, 10), nil, &v, 4<<20); err != nil {
			writeErr(w, civitaiStatus(err), err.Error())
			return
		}
		modelID = v.ModelID
	}
	m, err := s.civitaiModel(ctx, modelID)
	if err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	var version *civitaiRawVersion
	for i := range m.ModelVersions {
		// A model page with no version named links to its newest, which is first.
		if m.ModelVersions[i].ID == versionID || (versionID == 0 && i == 0) {
			version = &m.ModelVersions[i]
			break
		}
	}
	if version == nil {
		writeErr(w, http.StatusNotFound, "Civitai's page for that model has no such version")
		return
	}
	if err := s.fillComfyNote(ctx, req.Name, civitaiComfyFill(m, *version)); err != nil {
		// The link and words are in by now; only the cover's fetch is left to fail.
		s.log.Warn("comfy link: cover", "file", req.Name, "err", err)
	}
	s.writeComfyNote(w, ctx, req.Name)
}

func (s *Server) writeComfyNote(w http.ResponseWriter, ctx context.Context, name string) {
	notes, err := s.db.ComfyNotes(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"note": comfyNoteOutOf(notes[name])})
}

// comfyVersionByHash finds a file on Civitai by its SHA256, which the catalogue keeps
// for every file it hosts.
func (s *Server) comfyVersionByHash(ctx context.Context, kind, name string) (*civitaiRawVersion, error) {
	p, err := comfyFilePath(s.comfyPlaces(), kind, name)
	if err != nil {
		return nil, err
	}
	sum, err := sha256File(ctx, p, comfyHashLimit)
	if err != nil {
		return nil, &comfyFileError{http.StatusConflict, err.Error()}
	}
	v, err := s.civitaiVersionByHash(ctx, strings.ToUpper(sum))
	if errors.Is(err, errCivitaiNotFound) {
		return nil, &comfyFileError{http.StatusNotFound, "Civitai doesn't know this file — paste its page's address to link it by hand"}
	}
	if err != nil {
		return nil, &comfyFileError{civitaiStatus(err), err.Error()}
	}
	return v, nil
}

// sha256File hashes a file of at most limit bytes, giving up when ctx does.
func sha256File(ctx context.Context, path string, limit int64) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return "", err
	}
	if info.Size() > limit {
		return "", fmt.Errorf("the file is %d GB, too large to read through to find it on Civitai — paste its page's address instead", info.Size()>>30)
	}
	h := sha256.New()
	buf := make([]byte, 4<<20)
	for {
		if err := ctx.Err(); err != nil {
			return "", errors.New("reading the file took too long — paste its page's address instead")
		}
		n, err := f.Read(buf)
		h.Write(buf[:n])
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

var (
	civitaiModelPath    = regexp.MustCompile(`/models/(\d+)`)
	civitaiDownloadPath = regexp.MustCompile(`/api/download/models/(\d+)`)
)

// civitaiIDsIn reads the model and version a Civitai address names: a model page
// (/models/12, with ?modelVersionId=34 when a version is picked), a download link
// (/api/download/models/34, which is a version), or a version's number alone.
func civitaiIDsIn(raw string) (modelID, versionID int64, ok bool) {
	raw = strings.TrimSpace(raw)
	if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n > 0 {
		return 0, n, true
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil || !civitaiHostAllowed(u.String()) {
		return 0, 0, false
	}
	if m := civitaiDownloadPath.FindStringSubmatch(u.Path); m != nil {
		versionID, _ = strconv.ParseInt(m[1], 10, 64)
		return 0, versionID, versionID > 0
	}
	if m := civitaiModelPath.FindStringSubmatch(u.Path); m != nil {
		modelID, _ = strconv.ParseInt(m[1], 10, 64)
		versionID, _ = strconv.ParseInt(u.Query().Get("modelVersionId"), 10, 64)
		return modelID, versionID, modelID > 0
	}
	return 0, 0, false
}
