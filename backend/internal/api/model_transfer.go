package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"path/filepath"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/settings"
)

// Transferring models between generators (imagegen/model_transfer.go), from Settings.
//
// The request names a side by its id and never by a path. The paths are settings, which
// an admin set, so nothing a browser sends can point this at an arbitrary folder on the
// box, in either direction.

const (
	transferModels = "models" // the picture generator's models folder
	transferForge  = "forge"  // Forge Neo's
	transferComfy  = "comfy"  // ComfyUI's folders
)

// comfyFolders is ComfyUI's folders, by the Video settings.
func (s *Server) comfyFolders(cur settings.Settings) imagegen.ComfyFolders {
	return imagegen.ComfyFolders{
		Diffusion: cur.ComfyDiffusionDir, Checkpoints: cur.ComfyCheckpointDir, Loras: cur.ComfyLoraDir, VAEs: cur.ComfyVaeDir,
	}
}

// transferSides are the places models can go between.
func (s *Server) transferSides(ctx context.Context) []imagegen.TransferSide {
	cur := s.settings.Get()
	dir := s.imagegen.A1111ModelsDir()
	// That folder is whatever the generator is, and once someone has moved over to
	// Forge, calling it Automatic1111 would have them transfer from the wrong place.
	name := "Automatic1111"
	if cur.ImageGenURL != "" {
		probe, cancel := context.WithTimeout(ctx, 3*time.Second)
		defer cancel()
		if s.imagegen.IsForge(probe, cur.ImageGenURL) {
			name = "Forge (the generator)"
		}
	}
	return []imagegen.TransferSide{
		imagegen.A1111Side(transferModels, name, dir.Dir),
		imagegen.ForgeSide(transferForge, "Forge Neo", cur.ForgeModelsDir),
		imagegen.ComfySide(transferComfy, "ComfyUI", s.comfyFolders(cur)),
	}
}

func transferSide(sides []imagegen.TransferSide, id string) (imagegen.TransferSide, bool) {
	for _, side := range sides {
		if side.ID == id {
			return side, true
		}
	}
	return imagegen.TransferSide{}, false
}

type transferReq struct {
	From  string   `json:"from"`
	To    string   `json:"to"`
	Kinds []string `json:"kinds"`
}

// transferRead reads a request and finds its two sides. It writes the error itself.
func (s *Server) transferRead(w http.ResponseWriter, r *http.Request) (from, to imagegen.TransferSide, kinds []string, ok bool) {
	var req transferReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	sides := s.transferSides(r.Context())
	if from, ok = transferSide(sides, req.From); ok {
		to, ok = transferSide(sides, req.To)
	}
	if !ok {
		writeErr(w, http.StatusBadRequest, "name two of the places models can go")
		return from, to, nil, false
	}
	if req.From == req.To {
		writeErr(w, http.StatusBadRequest, "pick two different places")
		return from, to, nil, false
	}
	kinds = []string{}
	for _, k := range req.Kinds {
		for _, known := range imagegen.TransferKinds {
			if k == known {
				kinds = append(kinds, k)
			}
		}
	}
	if len(kinds) == 0 {
		writeErr(w, http.StatusBadRequest, "pick something to transfer")
		return from, to, nil, false
	}
	return from, to, kinds, true
}

// handleTransferStatus lists the places and the running or last transfer.
func (s *Server) handleTransferStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"places": s.transferSides(r.Context()), "job": s.imagegen.TransferStatus()})
}

// handleTransferPlan says what a transfer would do, and how it fits.
func (s *Server) handleTransferPlan(w http.ResponseWriter, r *http.Request) {
	from, to, kinds, ok := s.transferRead(w, r)
	if !ok {
		return
	}
	plan, err := s.imagegen.PlanTransfer(from, to, kinds)
	if err != nil {
		writeErr(w, http.StatusConflict, err.Error())
		return
	}
	for _, kind := range kinds {
		if dir := to.Dirs[kind]; dir != "" {
			// The nearest folder that exists: a fresh Forge has no Lora folder yet.
			for probe := dir; plan.Free == 0; probe = filepath.Dir(probe) {
				if free, err := freeBytes(probe); err == nil {
					plan.Free = free
				}
				if probe == filepath.Dir(probe) {
					break
				}
			}
			break
		}
	}
	writeJSON(w, http.StatusOK, plan)
}

// handleTransferStart starts a transfer, which goes on without the request.
func (s *Server) handleTransferStart(w http.ResponseWriter, r *http.Request) {
	from, to, kinds, ok := s.transferRead(w, r)
	if !ok {
		return
	}
	job, err := s.imagegen.StartTransfer(from, to, kinds, s.transferDone)
	if err != nil {
		status := http.StatusConflict
		if !errors.Is(err, imagegen.ErrTransferRunning) {
			status = http.StatusBadRequest
		}
		writeErr(w, status, err.Error())
		return
	}
	writeJSON(w, http.StatusAccepted, job)
}

// transferDone has the generators look at their folders again. A stopped transfer has
// brought files across too. Best-effort: one that is not running looks when it starts.
func (s *Server) transferDone(imagegen.TransferJob) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	cur := s.settings.Get()
	s.comfyPlaces().TouchComfyFolders()
	if base := cur.GenURL(); base != "" {
		s.imagegen.RefreshModels(ctx, base)
	}
}

// handleTransferStop stops the running transfer. What has come across stays, and
// running it again carries on from there.
func (s *Server) handleTransferStop(w http.ResponseWriter, r *http.Request) {
	s.imagegen.StopTransfer()
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}
