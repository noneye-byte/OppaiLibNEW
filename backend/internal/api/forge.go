package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/settings"
)

// The studio's side of Forge Neo: what it is told about the checkpoints there, and the
// few things it can ask for that are not a run. See imagegen/forge.go for the runs.

// forgeStatus adds what only Forge has to the studio's status. Each is a convenience,
// so one that fails leaves its field out rather than failing the status.
func (s *Server) forgeStatus(ctx context.Context, set settings.Settings, models []imagegen.Model, loras []imagegen.Lora, out map[string]any) {
	base := set.GenURL()
	mods, err := s.imagegen.ForgeModules(ctx, base)
	if err == nil {
		out["forgeModules"] = mods
		out["forgeFamilies"] = s.imagegen.ForgeFamilies(ctx, base, models, mods)
	}
	out["forgeExtras"] = append([]string{}, s.imagegen.ForgeExtras(ctx, base)...)
	samplers, schedulers := s.imagegen.SamplerNames(ctx, base)
	out["forgeSamplers"] = append([]string{}, samplers...)
	out["forgeSchedulers"] = append([]string{}, schedulers...)

	// With no ComfyUI, the Video studio runs on Forge, on whatever Wan files it has.
	// Neither direction has Settings of its own there, so a clip starts by picking one.
	if strings.TrimSpace(set.LibbyClipURL) == "" {
		for _, m := range models {
			if m.Family == imagegen.FamilyWan {
				out["clips"] = clipStatus{Image: clipRecipe{}.status("", true), Text: clipRecipe{}.status("", false)}
				out["clipsOn"] = "forge"
				break
			}
		}
	}
}

// clipsOnForge says clips are Forge's to make: ComfyUI's address is not set, and the
// image generator is a Forge. Which files it has is for the studio's pickers to find.
func (s *Server) clipsOnForge(ctx context.Context, set settings.Settings) bool {
	if strings.TrimSpace(set.LibbyClipURL) != "" || !set.ImageGenEnabled || set.GenURL() == "" {
		return false
	}
	kind, err := s.imagegen.Backend(ctx, set.GenURL())
	return err == nil && kind == imagegen.KindA1111 && s.imagegen.IsForge(ctx, set.GenURL())
}

// writeForgeClipModels answers the Video studio's model list from Forge, in the shape
// it reads from ComfyUI.
func (s *Server) writeForgeClipModels(w http.ResponseWriter, r *http.Request, set settings.Settings) {
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	base := set.GenURL()
	models, err := s.imagegen.Models(ctx, base)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	loras, err := s.imagegen.Loras(ctx, base)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	out, err := s.imagegen.ForgeClipModels(ctx, base, models, loras)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	// Left false: the studio's restart here is ComfyUI's, through its Manager.
	writeJSON(w, http.StatusOK, out)
}

// handleGetModules fetches what a family is missing into Forge's models folder. The
// jobs join the install list, so the studio follows them as it does any other.
func (s *Server) handleGetModules(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Family string `json:"family"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	jobs, err := s.imagegen.GetModules(r.Context(), base, strings.TrimSpace(req.Family))
	if err != nil {
		// 409 and never 401: see the note on third parties in api.go's writeErr callers.
		writeErr(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"jobs": jobs})
}

// overlayStatusBases gives each model the catalogue's name for what it is built on, from
// the link an install or a lookup left. A file's header can say SDXL and cannot say
// Illustrious, and a sidecar written before sidecarBase existed says SDXL too. A link
// that names a different architecture than the file's own tensors loses: it is the
// tensors that a run has to fit.
func (s *Server) overlayStatusBases(ctx context.Context, models []imagegen.Model, loras []imagegen.Lora) {
	links, err := s.db.CivitaiLinks(ctx)
	if err != nil || len(links) == 0 {
		return
	}
	settle := func(key string, base, family *string) {
		link, ok := links[key]
		if !ok || link.BaseModel == "" {
			return
		}
		linked := imagegen.FamilyOfBase(link.BaseModel)
		if *family == "" || linked == *family {
			*base = link.BaseModel
			if *family == "" {
				*family = linked
			}
		}
	}
	for i := range models {
		settle(models[i].Key, &models[i].Base, &models[i].Family)
	}
	for i := range loras {
		settle(loras[i].Key, &loras[i].Base, &loras[i].Family)
	}
}

// baseLookupBatch caps one request, for the same reason as the LoRA sorter's.
const baseLookupBatch = 24

type baseLookup struct {
	Key     string `json:"key"`
	Base    string `json:"base,omitempty"`
	Outcome string `json:"outcome"` // found | unknown | unhashed | error
	Error   string `json:"error,omitempty"`
}

// handleBasesCivitai asks the catalogue what files are built on, by their hashes. It is
// how an Illustrious checkpoint that came from somewhere else stops being sorted with
// SDXL, there being nothing in the file to tell them apart. What is learned is kept as
// the file's link, so the status shows it from then on.
func (s *Server) handleBasesCivitai(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Keys []string `json:"keys"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if len(req.Keys) == 0 || len(req.Keys) > baseLookupBatch {
		writeErr(w, http.StatusBadRequest, "name between 1 and "+strconv.Itoa(baseLookupBatch)+" models")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 100*time.Second)
	defer cancel()
	records, err := s.imagegen.ModelRecords(ctx, base)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	hashes := map[string]string{}
	for _, rec := range records {
		hashes[rec.Key] = rec.Hash
	}
	links, _ := s.db.CivitaiLinks(ctx)
	out := make([]baseLookup, len(req.Keys))
	sem := make(chan struct{}, 4)
	var wg sync.WaitGroup
	for i, key := range req.Keys {
		key = strings.TrimSpace(key)
		out[i] = baseLookup{Key: key}
		if known := links[key]; known.BaseModel != "" {
			out[i].Base, out[i].Outcome = known.BaseModel, "found"
			continue
		}
		wg.Add(1)
		go func(res *baseLookup, key string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			model, version, outcome, err := s.civitaiFindFile(ctx, key, civitaiHashOf(hashes[key]), links[key])
			if model == nil {
				res.Outcome = outcome
				if err != nil {
					res.Error = err.Error()
				}
				return
			}
			res.Outcome = "found"
			for _, v := range model.ModelVersions {
				if v.ID == version {
					res.Base = v.BaseModel
				}
			}
		}(&out[i], key)
	}
	wg.Wait()
	writeJSON(w, http.StatusOK, map[string]any{"results": out})
}
