package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

// Managing the studio's models from the catalogue's side: choosing which of a
// version's showcase pictures is the cover, moving a model to another version,
// and deleting one.
//
// An update is an install with a promise attached: the new version is handed to
// InvokeAI like any install, and the promise (civitai_installs.replace_key) says
// which record it supersedes. Once the download completes and the new record is
// dressed, the old record is deleted — file and all, when InvokeAI manages the
// file — so the studio ends up with one copy of the model at the newer version
// rather than two tiles with the same name. The old one stays until then: a
// download that fails leaves what was there.

type civitaiCoverReq struct {
	Key string `json:"key"`
	URL string `json:"url"`
}

// handleCivitaiCover makes one of the catalogue's pictures the InvokeAI cover of
// a model, and remembers the choice so fetching the catalogue again keeps it.
func (s *Server) handleCivitaiCover(w http.ResponseWriter, r *http.Request) {
	var req civitaiCoverReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Key == "" {
		writeErr(w, http.StatusBadRequest, "key is required")
		return
	}
	if !civitaiHostAllowed(req.URL) {
		writeErr(w, http.StatusBadRequest, "not a Civitai image URL")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	data, ct, err := s.civitaiFetchImage(ctx, req.URL)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if err := s.imagegen.UpdateCover(ctx, base, req.Key, data, ct); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	// A model with no catalogue record has nowhere to keep the choice; the cover
	// is still set, it just will not survive a later fetch.
	if err := s.db.SetCivitaiCover(ctx, req.Key, req.URL); err != nil {
		s.log.Warn("civitai: remember cover", "model", req.Key, "err", err)
	}
	w.WriteHeader(http.StatusNoContent)
}

type civitaiUpdateReq struct {
	Key string `json:"key"`
	// VersionID is the version to move to; the newest when left out.
	VersionID int64 `json:"versionId"`
}

// handleCivitaiUpdate installs another version of a linked model and arranges
// for the current record to be deleted once the new one is in.
func (s *Server) handleCivitaiUpdate(w http.ResponseWriter, r *http.Request) {
	var req civitaiUpdateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Key == "" {
		writeErr(w, http.StatusBadRequest, "key is required")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	link, found, err := s.db.CivitaiLink(ctx, req.Key)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !found || link.ModelID == 0 {
		writeErr(w, http.StatusBadRequest, "this model is not linked to Civitai; fetch it from Civitai first")
		return
	}
	versionID := req.VersionID
	if versionID == 0 {
		versionID = link.LatestVersionID
	}
	if versionID == 0 || versionID == link.VersionID {
		writeErr(w, http.StatusBadRequest, "the model is already at that version")
		return
	}
	m, err := s.civitaiModel(ctx, link.ModelID)
	if err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	source := civitaiDownloadURLOf(m, versionID)
	if source == "" {
		writeErr(w, http.StatusBadRequest, "that version has no file to download")
		return
	}
	job, err := s.imagegen.InstallModel(ctx, base, source)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if err := s.db.AddCivitaiInstall(ctx, source, m.ID, versionID, req.Key); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	s.civitaiWatchInstalls()
	writeJSON(w, http.StatusOK, job)
}

// civitaiDownloadURLOf is the file to fetch for one version of a model: the
// primary file's, else the version's own link. "" when the version is not on
// the page or has nothing Civitai will serve.
func civitaiDownloadURLOf(m *civitaiRawModel, versionID int64) string {
	for _, v := range m.ModelVersions {
		if v.ID != versionID {
			continue
		}
		for _, f := range v.Files {
			if f.Primary && civitaiHostAllowed(f.DownloadURL) {
				return f.DownloadURL
			}
		}
		if civitaiHostAllowed(v.DownloadURL) {
			return v.DownloadURL
		}
		return ""
	}
	return ""
}

// handleDeleteModel removes a model or LoRA from InvokeAI, with its file when
// InvokeAI manages it, and forgets what the catalogue said about it.
//
//	key=   the InvokeAI record (a LoRA's display name is accepted too)
func (s *Server) handleDeleteModel(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimSpace(r.URL.Query().Get("key"))
	if key == "" {
		writeErr(w, http.StatusBadRequest, "key is required")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	// The picker names a LoRA by its display name; resolve that to the record so
	// the right one goes.
	detail, err := s.imagegen.ModelDetail(ctx, base, key)
	if err != nil {
		writeErr(w, http.StatusNotFound, "InvokeAI has no such model")
		return
	}
	if err := s.imagegen.DeleteModel(ctx, base, detail.Key); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	s.civitaiForgetModel(ctx, detail.Key)
	w.WriteHeader(http.StatusNoContent)
}

// civitaiForgetModel drops what was kept about a record InvokeAI no longer has.
func (s *Server) civitaiForgetModel(ctx context.Context, key string) {
	if err := s.db.DeleteCivitaiLink(ctx, key); err != nil && !errors.Is(err, context.Canceled) {
		s.log.Warn("civitai: forget link", "model", key, "err", err)
	}
	s.installedHashCache.forget(s.settings.Get().ImageGenURL)
}

// civitaiRetireReplaced deletes the record an update superseded, once the new one
// is registered and dressed. A failure is logged, not fatal: the new model is in
// either way, and the old one can be deleted by hand.
func (s *Server) civitaiRetireReplaced(ctx context.Context, base, oldKey, newKey string) {
	if oldKey == "" || oldKey == newKey {
		return
	}
	if err := s.imagegen.DeleteModel(ctx, base, oldKey); err != nil {
		s.log.Warn("civitai: delete replaced model", "model", oldKey, "replacedBy", newKey, "err", err)
		return
	}
	s.civitaiForgetModel(ctx, oldKey)
	s.log.Info("civitai: model updated", "from", oldKey, "to", newKey)
}
