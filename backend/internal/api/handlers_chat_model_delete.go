package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

// Deleting a text-generation model from disk.
//
// text-generation-webui exposes no delete endpoint, so this is a filesystem operation:
// the operator maps the same models directory into this container and names it in
// Settings. That mapping is required and there is no fallback — guessing a path and
// deleting what we find there is not something to do on someone's model collection.
//
// Everything here is built around one assumption being wrong: that the name arriving
// over HTTP is trustworthy. It is a name the *backend* reported, which means it is not
// user input in the ordinary sense, but it arrives via the client and so has to be
// treated as though the client made it up. Every check below exists for that.
//
// Three properties are worth stating outright, because each is a way this could go
// badly and each is tested:
//
//   - Nothing outside the configured directory can be touched. The name is resolved
//     against the root and the *resolved* path is required to still be inside it —
//     which also closes the symlink case, where a legal-looking name points elsewhere.
//   - The loaded model cannot be deleted. Removing the weights out from under a
//     resident model leaves the backend alive and broken in a way that survives until
//     someone restarts it.
//   - Deleting moves to a trash directory first. A model is gigabytes fetched over
//     someone's connection; "prefer moving to a recoverable location" is in the brief
//     and it is the right default regardless.

// trashDirName is where deleted models go, inside the models root.
//
// Inside the root rather than elsewhere on purpose: a rename within one filesystem is
// instant and atomic, while moving across a mount point copies gigabytes. It is also
// the only directory we can be sure exists and is writable.
const trashDirName = ".oppailib-trash"

// modelFileExts are the weight-file extensions recognised as a model in a flat
// directory layout.
var modelFileExts = map[string]bool{
	".gguf": true, ".ggml": true, ".bin": true, ".safetensors": true, ".pth": true, ".pt": true,
}

// sidecarExts are metadata files that belong to a single-file model and are removed
// with it. Leaving these behind litters the directory with orphans that some loaders
// then try to use.
var sidecarExts = map[string]bool{
	".json": true, ".yaml": true, ".yml": true, ".txt": true, ".md": true, ".sha256": true,
}

// modelTarget is one resolvable model on disk.
type modelTarget struct {
	Name string `json:"name"`
	// Path is what will actually be removed — a directory for an HF-style model, or
	// the weight file for a single-file one.
	Path string `json:"path"`
	// Files are every path that will go, so a confirmation dialog can show exactly
	// what is being lost rather than a count.
	Files []string `json:"files"`
	Bytes int64    `json:"bytes"`
	// Directory says whether this is a multi-file model laid out as a folder.
	Directory bool `json:"directory"`
	// Split marks a model whose weights are shards (model-00001-of-00003.gguf).
	// Deleting one shard of a set leaves a model that looks present and cannot load,
	// so the whole set is resolved together and the UI says so.
	Split bool `json:"split"`
}

// modelsRoot returns the configured models directory, or an error explaining what is
// missing. Deliberately not defaulted: there is no safe guess.
func (s *Server) modelsRoot() (string, error) {
	dir := strings.TrimSpace(s.settings.Get().ChatModelDir)
	if dir == "" {
		return "", errors.New("no text-generation model directory is configured — set it in Settings → Libby, mapping the same folder text-generation-webui loads from")
	}
	abs, err := filepath.Abs(dir)
	if err != nil {
		return "", fmt.Errorf("model directory %q is not a usable path", dir)
	}
	info, err := os.Stat(abs)
	if err != nil {
		return "", fmt.Errorf("model directory %s is not reachable from this container: %v", abs, err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("%s is not a directory", abs)
	}
	return abs, nil
}

// resolveModel maps a backend-reported model name onto what is on disk.
//
// The containment check is done on the *resolved* path, after symlinks, which is the
// only version that holds: a name can be free of ".." and still land outside the root
// by way of a symlink somebody put there.
func resolveModel(root, name string) (*modelTarget, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("a model name is required")
	}
	// Refused before any path work, so the error names the real problem rather than
	// surfacing as a confusing "not found".
	if strings.ContainsAny(name, `/\`) || name == "." || name == ".." {
		return nil, fmt.Errorf("model name %q is not a plain name", name)
	}
	if strings.HasPrefix(name, ".") {
		// Also keeps the trash directory itself from being addressed as a model.
		return nil, fmt.Errorf("model name %q is not addressable", name)
	}

	candidate := filepath.Join(root, name)
	resolved, err := filepath.EvalSymlinks(candidate)
	if err != nil {
		// Not a directory or extensionless file; try it as a weight file with each
		// known extension, which is how a GGUF is usually named in the backend's list.
		for ext := range modelFileExts {
			if r, e := filepath.EvalSymlinks(candidate + ext); e == nil {
				resolved = r
				candidate += ext
				err = nil
				break
			}
		}
		if err != nil {
			return nil, fmt.Errorf("no model called %q is in %s", name, root)
		}
	}
	if !withinRoot(root, resolved) {
		return nil, fmt.Errorf("model %q resolves outside the configured model directory", name)
	}

	info, err := os.Stat(resolved)
	if err != nil {
		return nil, fmt.Errorf("cannot read %s: %v", resolved, err)
	}

	target := &modelTarget{Name: name, Path: resolved, Directory: info.IsDir()}
	if info.IsDir() {
		// An HF-style model: the whole directory is the model.
		err := filepath.WalkDir(resolved, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}
			if fi, err := d.Info(); err == nil {
				target.Bytes += fi.Size()
			}
			rel, _ := filepath.Rel(resolved, path)
			target.Files = append(target.Files, filepath.ToSlash(rel))
			return nil
		})
		if err != nil {
			return nil, fmt.Errorf("reading %s: %v", resolved, err)
		}
		sort.Strings(target.Files)
		return target, nil
	}

	// A single-file model: the weights, its shard siblings, and its sidecars.
	group, split, err := fileGroup(root, resolved)
	if err != nil {
		return nil, err
	}
	target.Split = split
	for _, path := range group {
		if fi, err := os.Stat(path); err == nil {
			target.Bytes += fi.Size()
		}
		rel, _ := filepath.Rel(root, path)
		target.Files = append(target.Files, filepath.ToSlash(rel))
	}
	sort.Strings(target.Files)
	return target, nil
}

// shardPattern recognises "…-00002-of-00005.gguf" and captures the stem before the
// shard numbering, so every part of one model can be found from any one of them.
//
// Written as an explicit scan rather than a regexp because the shape varies between
// tools ("-00001-of-00003", ".part1of3") and a half-matching regexp that groups two
// different models together would delete something the user did not ask about.
func shardStem(base string) (stem string, ok bool) {
	lower := strings.ToLower(base)
	ext := filepath.Ext(lower)
	trimmed := strings.TrimSuffix(lower, ext)
	i := strings.LastIndex(trimmed, "-of-")
	if i <= 0 {
		return "", false
	}
	// Everything after "-of-" must be digits, and the segment before it must end in
	// digits preceded by a dash.
	if !allDigits(trimmed[i+len("-of-"):]) {
		return "", false
	}
	head := trimmed[:i]
	j := strings.LastIndex(head, "-")
	if j <= 0 || !allDigits(head[j+1:]) {
		return "", false
	}
	return head[:j], true
}

func allDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// fileGroup returns every file belonging to a single-file model: the weights, the
// other shards of the same set if it is split, and same-stem sidecars.
func fileGroup(root, weights string) ([]string, bool, error) {
	dir := filepath.Dir(weights)
	base := filepath.Base(weights)
	stem := strings.TrimSuffix(base, filepath.Ext(base))

	shard, isSplit := shardStem(base)

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, false, fmt.Errorf("reading %s: %v", dir, err)
	}
	out := []string{weights}
	seen := map[string]bool{weights: true}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		path := filepath.Join(dir, e.Name())
		if seen[path] || !withinRoot(root, path) {
			continue
		}
		name := e.Name()
		nameStem := strings.TrimSuffix(name, filepath.Ext(name))
		ext := strings.ToLower(filepath.Ext(name))

		switch {
		case isSplit:
			// Another shard of the same set. Deleting one shard leaves a model that
			// looks present and cannot load, so they go together.
			if s, ok := shardStem(name); ok && s == shard {
				out = append(out, path)
				seen[path] = true
			}
		case nameStem == stem && sidecarExts[ext]:
			// "model.gguf" and "model.json".
			out = append(out, path)
			seen[path] = true
		}
	}
	sort.Strings(out)
	return out, isSplit, nil
}

// withinRoot reports whether path is root or inside it. filepath.Rel is used rather
// than a string prefix so "/models-old" is not treated as inside "/models".
func withinRoot(root, path string) bool {
	rel, err := filepath.Rel(root, path)
	if err != nil {
		return false
	}
	if rel == "." {
		return true
	}
	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

// ── endpoints ──────────────────────────────────────────────────────────

type modelInspectResponse struct {
	// Embedded by value, not by pointer: encoding/json cannot unmarshal into an
	// embedded pointer to an unexported type, which makes the response untestable.
	modelTarget
	// Loaded is true when this is the resident model, which cannot be deleted.
	Loaded bool `json:"loaded"`
	// FreeBytes is what is available on the models filesystem, so "will free 14 GB"
	// can be read against how much room there is.
	FreeBytes int64 `json:"freeBytes"`
	// TrashPath is where a delete will move it, named so the offer to recover is
	// concrete rather than a promise.
	TrashPath string `json:"trashPath"`
}

// handleInspectChatModel answers "what exactly would deleting this remove".
//
// A separate read-only endpoint rather than fields on the delete call, because the
// confirmation dialog has to show the name, the path and the space to be freed
// *before* anything is asked for, and asking a delete endpoint to also mean "tell me
// about it" is how a stray retry becomes a deletion.
func (s *Server) handleInspectChatModel(w http.ResponseWriter, r *http.Request) {
	root, err := s.modelsRoot()
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	target, err := resolveModel(root, r.URL.Query().Get("model"))
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	resp := modelInspectResponse{
		modelTarget: *target,
		Loaded:      s.modelIsLoaded(ctx, target.Name),
		TrashPath:   filepath.Join(root, trashDirName),
	}
	if free, err := freeBytes(root); err == nil {
		resp.FreeBytes = free
	}
	writeJSON(w, http.StatusOK, resp)
}

type deleteModelRequest struct {
	Model string `json:"model"`
	// Confirm must repeat the model's name exactly.
	//
	// Not a boolean. A boolean confirmation is satisfied by any client that sends
	// {"confirm":true} — including a retry, a replayed request, or a well-meaning
	// script — and proves nothing about the user having seen which model it was.
	// Echoing the name is the cheapest check that carries actual intent.
	Confirm string `json:"confirm"`
	// Permanent skips the trash. Off by default; the recoverable path is the default
	// for a reason.
	Permanent bool `json:"permanent"`
}

type deleteModelResponse struct {
	Name string `json:"name"`
	// MovedTo is where it went, or empty when it was permanently removed.
	MovedTo string `json:"movedTo,omitempty"`
	Bytes   int64  `json:"bytes"`
	Files   int    `json:"files"`
	// Models is the refreshed list, so the client does not have to make a second
	// call to find out what is left.
	Models []string `json:"models"`
}

func (s *Server) handleDeleteChatModel(w http.ResponseWriter, r *http.Request) {
	var in deleteModelRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 8<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid delete request")
		return
	}
	root, err := s.modelsRoot()
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	target, err := resolveModel(root, in.Model)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	if strings.TrimSpace(in.Confirm) != target.Name {
		writeErr(w, http.StatusBadRequest, "to delete a model, repeat its name in the confirmation field")
		return
	}

	// Serialized with load/unload. A delete racing a load is the one ordering that
	// could remove the weights of a model in the middle of being read.
	if !s.modelMu.TryLock() {
		writeErr(w, http.StatusConflict, "another model operation is already in progress")
		return
	}
	defer s.modelMu.Unlock()

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	if s.modelIsLoaded(ctx, target.Name) {
		writeErr(w, http.StatusConflict, "that model is loaded right now — unload it first, or the backend will keep serving a model whose files are gone")
		return
	}

	moved, err := s.removeModel(root, target, in.Permanent)
	if err != nil {
		s.log.Error("model delete failed", "model", target.Name, "path", target.Path, "err", err)
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Logged at info with everything needed to reconstruct what happened, because a
	// deletion is the one action here that cannot be inspected afterwards.
	s.log.Info("text-generation model deleted",
		"model", target.Name,
		"path", target.Path,
		"bytes", target.Bytes,
		"files", len(target.Files),
		"permanent", in.Permanent,
		"moved_to", moved,
		"user", userFrom(r),
	)

	writeJSON(w, http.StatusOK, deleteModelResponse{
		Name:    target.Name,
		MovedTo: moved,
		Bytes:   target.Bytes,
		Files:   len(target.Files),
		Models:  s.listModelsOnDisk(root),
	})
}

// removeModel trashes or deletes the target, returning where it went.
func (s *Server) removeModel(root string, target *modelTarget, permanent bool) (string, error) {
	if permanent {
		if target.Directory {
			return "", os.RemoveAll(target.Path)
		}
		for _, rel := range target.Files {
			if err := os.Remove(filepath.Join(root, filepath.FromSlash(rel))); err != nil && !os.IsNotExist(err) {
				return "", err
			}
		}
		return "", nil
	}

	// The trash entry is stamped, so deleting two models of the same name (a file and
	// a re-downloaded copy) doesn't overwrite the earlier recovery.
	stamp := time.Now().UTC().Format("20060102-150405")
	dest := filepath.Join(root, trashDirName, stamp+"-"+target.Name)
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return "", fmt.Errorf("could not create the trash directory: %w", err)
	}

	if target.Directory {
		if err := os.Rename(target.Path, dest); err != nil {
			return "", fmt.Errorf("could not move %s to the trash: %w", target.Name, err)
		}
		return dest, nil
	}
	// A single-file model may bring shards and sidecars, so it becomes a folder in the
	// trash — moving five files to five stamped names would make recovery guesswork.
	if err := os.MkdirAll(dest, 0o755); err != nil {
		return "", err
	}
	for _, rel := range target.Files {
		src := filepath.Join(root, filepath.FromSlash(rel))
		if err := os.Rename(src, filepath.Join(dest, filepath.Base(rel))); err != nil && !os.IsNotExist(err) {
			return "", fmt.Errorf("could not move %s to the trash: %w", rel, err)
		}
	}
	return dest, nil
}

// modelIsLoaded asks the backend what is resident.
//
// A backend that cannot answer is treated as "yes, it might be". Failing closed is
// right here: the alternative is deleting the weights under a running model because a
// probe timed out.
func (s *Server) modelIsLoaded(ctx context.Context, name string) bool {
	probe := s.probeChatBackend(ctx)
	if !probe.Ready {
		if probe.Detail != "" && strings.Contains(probe.Detail, "No model is loaded") {
			return false
		}
		return true
	}
	loaded := strings.TrimSpace(probe.Loaded)
	if loaded == "" {
		return false
	}
	// The backend may report "model.gguf" where the list says "model", or the other
	// way round, so compare with extensions stripped.
	return strings.EqualFold(stripModelExt(loaded), stripModelExt(name))
}

func stripModelExt(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	if modelFileExts[ext] {
		return strings.TrimSuffix(name, filepath.Ext(name))
	}
	return name
}

// listModelsOnDisk enumerates what the directory holds now, so the response can hand
// back a refreshed list without waiting for the backend to rescan.
func (s *Server) listModelsOnDisk(root string) []string {
	entries, err := os.ReadDir(root)
	if err != nil {
		return []string{}
	}
	out := []string{}
	seenShard := map[string]bool{}
	for _, e := range entries {
		name := e.Name()
		if strings.HasPrefix(name, ".") {
			continue // the trash, and anything else hidden
		}
		if e.IsDir() {
			out = append(out, name)
			continue
		}
		ext := strings.ToLower(filepath.Ext(name))
		if !modelFileExts[ext] {
			continue
		}
		// A split model is one entry, not five.
		if stem, ok := shardStem(name); ok {
			if seenShard[stem] {
				continue
			}
			seenShard[stem] = true
		}
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

// userFrom names the requester for the audit line.
func userFrom(r *http.Request) string {
	if u, ok := r.Context().Value(userKey).(*db.UserRow); ok && u != nil {
		return u.Username
	}
	return "unknown"
}
