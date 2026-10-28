package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
)

// The categories the studio's LoRAs are filed under. The list is fixed (see
// db.LoraCategoryKeys) and the clients carry it themselves; the server keeps which
// LoRA is in which, hands each LoRA its key in the status, and files a LoRA installed
// from Civitai or trained here by what it is.

// overlayLoraCategories gives the status's LoRAs their categories. A LoRA is filed by
// the name it is picked by, or — when an install filed it before anyone picked it —
// by its record key. Best-effort: a failed read leaves the picker unsorted rather
// than failing the status.
func (s *Server) overlayLoraCategories(ctx context.Context, loras []imagegen.Lora) {
	filed, err := s.db.LoraCategories(ctx)
	if err != nil {
		s.log.Warn("lora categories", "err", err)
		return
	}
	for i := range loras {
		if key, ok := filed[loras[i].Name]; ok {
			loras[i].CategoryKey = key
		} else if key, ok := filed[loras[i].Key]; ok && loras[i].Key != "" {
			loras[i].CategoryKey = key
		}
	}
}

// civitaiLoraCategory is the category a Civitai model's tags put it in, or "" when
// it is not a LoRA or carries none of the catalogue's category tags. Civitai files
// every model under one of a fixed set of tags; the studio's list is those, with
// the rarer ones folded into the nearest.
func civitaiLoraCategory(modelType string, tags []string) string {
	switch strings.ToLower(modelType) {
	case "lora", "locon", "dora", "lycoris":
	default:
		return ""
	}
	byTag := map[string]string{
		"character": db.LoraCharacter, "celebrity": db.LoraCharacter,
		"style": db.LoraStyle,
		"concept": db.LoraConcept, "clothing": db.LoraConcept, "action": db.LoraConcept, "objects": db.LoraConcept,
		"tool": db.LoraTools,
		"poses": db.LoraPoses,
		"background": db.LoraBackground, "buildings": db.LoraBackground,
		"vehicle": db.LoraEtc, "animal": db.LoraEtc, "assets": db.LoraEtc,
	}
	for _, t := range tags {
		if key, ok := byTag[strings.ToLower(strings.TrimSpace(t))]; ok {
			return key
		}
	}
	return ""
}

type loraCategoryAssignReq struct {
	// Category "" takes the LoRAs out of whichever they are in.
	Category string   `json:"category"`
	Loras    []string `json:"loras"`
}

// handleLoraCategoryAssign files LoRAs under a category, or under none.
func (s *Server) handleLoraCategoryAssign(w http.ResponseWriter, r *http.Request) {
	var req loraCategoryAssignReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Category != "" && !db.IsLoraCategory(req.Category) {
		writeErr(w, http.StatusBadRequest, "category is one of "+strings.Join(db.LoraCategoryKeys, ", "))
		return
	}
	names := make([]string, 0, len(req.Loras))
	for _, n := range req.Loras {
		if n = strings.TrimSpace(n); n != "" {
			names = append(names, n)
		}
	}
	if len(names) == 0 || len(names) > 1000 {
		writeErr(w, http.StatusBadRequest, "name between 1 and 1000 LoRAs")
		return
	}
	if err := s.db.SetLoraCategory(r.Context(), req.Category, names); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
