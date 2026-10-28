package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

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

// ── sorting with Civitai ────────────────────────────────────────────────────

type loraCivitaiReq struct {
	Loras []string `json:"loras"`
}

// loraCivitaiResult is what became of one LoRA the catalogue was asked about.
type loraCivitaiResult struct {
	Lora string `json:"lora"`
	// Category is where it was filed, "" when it was not.
	Category string `json:"category,omitempty"`
	// Civitai is the model's name on the catalogue, when it was found there.
	Civitai string `json:"civitai,omitempty"`
	// Outcome: filed | untagged (on Civitai, under no category tag) | unknown (not
	// on Civitai) | unhashed (no hash yet to look it up by) | error.
	Outcome string `json:"outcome"`
	Error   string `json:"error,omitempty"`
}

// loraCivitaiBatch caps one request: a lookup is two catalogue calls, and the
// client asks in batches so it can say how far it has got.
const loraCivitaiBatch = 24

// handleLoraCategoryCivitai files LoRAs by what Civitai says they are. Each is found
// by its file's hash, and filed under the category its model's tags say — the way a
// LoRA installed from Civitai is filed as it arrives, for the ones that came some
// other way. A LoRA already filed is left where it is. What is learned is kept as the
// model's catalogue link, so its cover and trigger words come with it.
func (s *Server) handleLoraCategoryCivitai(w http.ResponseWriter, r *http.Request) {
	var req loraCivitaiReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if len(req.Loras) == 0 || len(req.Loras) > loraCivitaiBatch {
		writeErr(w, http.StatusBadRequest, "name between 1 and "+strconv.Itoa(loraCivitaiBatch)+" LoRAs")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 100*time.Second)
	defer cancel()
	loras, err := s.imagegen.Loras(ctx, base)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	hashes := map[string]string{}
	if records, err := s.imagegen.ModelRecords(ctx, base); err == nil {
		for _, rec := range records {
			hashes[rec.Key] = rec.Hash
		}
	}
	byName := map[string]imagegen.Lora{}
	for _, l := range loras {
		byName[l.Name] = l
	}
	links, _ := s.db.CivitaiLinks(ctx)
	filed, _ := s.db.LoraCategories(ctx)

	out := make([]loraCivitaiResult, len(req.Loras))
	sem := make(chan struct{}, 4)
	var wg sync.WaitGroup
	for i, name := range req.Loras {
		name = strings.TrimSpace(name)
		out[i] = loraCivitaiResult{Lora: name}
		if key, ok := filed[name]; ok {
			out[i].Category, out[i].Outcome = key, "filed"
			continue
		}
		l, ok := byName[name]
		if !ok {
			out[i].Outcome, out[i].Error = "error", "the generator has no LoRA called that"
			continue
		}
		wg.Add(1)
		go func(res *loraCivitaiResult, l imagegen.Lora) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			s.loraCivitaiSortOne(ctx, res, l, hashes, links)
		}(&out[i], l)
	}
	wg.Wait()
	writeJSON(w, http.StatusOK, map[string]any{"results": out})
}

// loraCivitaiSortOne finds one LoRA on the catalogue and files it.
func (s *Server) loraCivitaiSortOne(ctx context.Context, res *loraCivitaiResult, l imagegen.Lora,
	hashes map[string]string, links map[string]db.CivitaiLink) {
	key := l.Key
	if key == "" {
		key = l.Path // InvokeAI's record key
	}
	hash := civitaiHashOf(hashes[key])
	if hash == "" {
		hash = civitaiHashOf(l.Hash)
	}
	known := links[key]
	modelID, versionID := known.ModelID, known.VersionID
	if modelID == 0 {
		// A file the catalogue did not know a little while ago is not asked about again.
		if known.ModelKey != "" && known.Hash != "" && time.Since(time.Unix(known.CheckedAt, 0)) < civitaiLinkStale {
			res.Outcome = "unknown"
			return
		}
		if hash == "" {
			res.Outcome = "unhashed"
			return
		}
		v, err := s.civitaiVersionByHash(ctx, hash)
		if errors.Is(err, errCivitaiNotFound) {
			res.Outcome = "unknown"
			if key != "" {
				_ = s.db.PutCivitaiLink(ctx, db.CivitaiLink{ModelKey: key, Hash: hash})
			}
			return
		}
		if err != nil {
			res.Outcome, res.Error = "error", err.Error()
			return
		}
		modelID, versionID = v.ModelID, v.ID
	}
	m, err := s.civitaiModel(ctx, modelID)
	if err != nil {
		res.Outcome, res.Error = "error", err.Error()
		return
	}
	res.Civitai = m.Name
	if key != "" {
		link := civitaiLinkFrom(key, hash, m, versionID)
		if known.CoverURL != "" && known.VersionID == link.VersionID {
			link.CoverURL = known.CoverURL
		}
		if err := s.db.PutCivitaiLink(ctx, link); err != nil {
			s.log.Warn("lora categories: keep civitai link", "lora", l.Name, "err", err)
		}
	}
	cat := civitaiLoraCategory(m.Type, m.Tags)
	if cat == "" {
		res.Outcome = "untagged"
		return
	}
	if err := s.db.FileLoraIfUnsorted(ctx, l.Name, cat); err != nil {
		res.Outcome, res.Error = "error", err.Error()
		return
	}
	res.Category, res.Outcome = cat, "filed"
}
