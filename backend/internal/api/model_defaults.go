package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
)

// A model's recommended settings, from wherever they are kept.
//
// Steps, CFG, sampler, size and VAE are the generator's: InvokeAI keeps them in a
// model's default_settings and A1111 in the sidecar beside the file, and each one's
// own UI reads them there. A recommended positive and negative prompt, clip skip and
// a LoRA's weight range have no field on either, so they are kept here
// (db.ModelDefaults) and laid over the generator's record wherever a model's
// defaults are read — the studio's listing, the editor — so a client sees one set
// of defaults and does not need to know which half lives where.

// modelExtraFields are the JSON names of the defaults kept here rather than on the
// generator.
var modelExtraFields = []string{"positive", "negative", "clipSkip", "weightMin", "weightMax"}

// nativeDefaults is d without the fields the generator cannot keep.
func nativeDefaults(d imagegen.ModelDefaults) imagegen.ModelDefaults {
	d.Positive, d.Negative, d.ClipSkip, d.WeightMin, d.WeightMax = "", "", 0, 0, 0
	return d
}

// overlayDefaults lays the settings kept here over what the generator returned.
func overlayDefaults(d *imagegen.ModelDefaults, x db.ModelDefaults) *imagegen.ModelDefaults {
	if x.Empty() {
		return d
	}
	out := imagegen.ModelDefaults{}
	if d != nil {
		out = *d
	}
	out.Positive, out.Negative, out.ClipSkip, out.WeightMin, out.WeightMax =
		x.Positive, x.Negative, x.ClipSkip, x.WeightMin, x.WeightMax
	return &out
}

// overlayStatusDefaults gives the studio's listing the settings kept here.
func (s *Server) overlayStatusDefaults(ctx context.Context, models []imagegen.Model, loras []imagegen.Lora) {
	all, err := s.db.AllModelDefaults(ctx)
	if err != nil || len(all) == 0 {
		return
	}
	for i := range models {
		key := models[i].Key
		if key == "" {
			key = models[i].Title
		}
		if x, ok := all[key]; ok {
			models[i].Defaults = overlayDefaults(models[i].Defaults, x)
		}
	}
	for i := range loras {
		key := loras[i].Key
		if key == "" {
			key = loras[i].Name
		}
		if x, ok := all[key]; ok {
			loras[i].Negative, loras[i].WeightMin, loras[i].WeightMax = x.Negative, x.WeightMin, x.WeightMax
		}
	}
}

// overlayDetailDefaults gives one record the settings kept here.
func (s *Server) overlayDetailDefaults(ctx context.Context, detail *imagegen.ModelDetail) {
	if detail == nil {
		return
	}
	if x, err := s.db.GetModelDefaults(ctx, detail.Key); err == nil {
		detail.Defaults = overlayDefaults(detail.Defaults, x)
	}
}

// saveExtraDefaults records the fields of d the patch named. A field it left out
// keeps its value: a client from before these fields existed sends the generator's
// settings alone, and must not clear a negative it never saw.
func (s *Server) saveExtraDefaults(ctx context.Context, key string, d imagegen.ModelDefaults, named map[string]bool) error {
	cur, err := s.db.GetModelDefaults(ctx, key)
	if err != nil {
		return err
	}
	if named["positive"] {
		cur.Positive = strings.TrimSpace(d.Positive)
	}
	if named["negative"] {
		cur.Negative = strings.TrimSpace(d.Negative)
	}
	if named["clipSkip"] {
		cur.ClipSkip = clampInt(d.ClipSkip, 0, 12)
	}
	if named["weightMin"] {
		cur.WeightMin = d.WeightMin
	}
	if named["weightMax"] {
		cur.WeightMax = d.WeightMax
	}
	return s.db.PutModelDefaults(ctx, cur)
}

// ── what Civitai suggests ───────────────────────────────────────────────────

// civitaiIsLora says whether a catalogue type is applied as a LoRA.
func civitaiIsLora(t string) bool {
	return civitaiInstallType(t) == "lora"
}

// civitaiSuggestionFor reads one version's recommendations off its model page.
func civitaiSuggestionFor(m *civitaiRawModel, versionID int64) civitaiSuggestion {
	in := civitaiSuggestInput{IsLora: civitaiIsLora(m.Type), VersionID: versionID}
	var version *civitaiRawVersion
	for i := range m.ModelVersions {
		if m.ModelVersions[i].ID == versionID || (versionID == 0 && i == 0) {
			version = &m.ModelVersions[i]
			break
		}
	}
	if version != nil {
		in.VersionID = version.ID
		in.TrainedWords = version.TrainedWords
		in.Descriptions = append(in.Descriptions, civitaiPlainText(version.Description))
		for _, img := range version.Images {
			if img.Meta != nil {
				in.Examples = append(in.Examples, img.Meta)
			}
		}
		for _, f := range version.Files {
			if f.Primary || (in.FileStem == "" && f.Type == "Model") {
				in.FileStem = strings.TrimSuffix(f.Name, path.Ext(f.Name))
			}
		}
	}
	in.Descriptions = append(in.Descriptions, civitaiPlainText(m.Description))
	return civitaiSuggest(in)
}

// handleCivitaiSuggest answers what the catalogue recommends for a model: an
// installed one by its record (key=, which must be linked) or any version by id
// (versionId=). Nothing is written; the editor shows it and saves what is kept.
func (s *Server) handleCivitaiSuggest(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	versionID, _ := strconv.ParseInt(q.Get("versionId"), 10, 64)
	var modelID int64
	if key := strings.TrimSpace(q.Get("key")); key != "" && versionID == 0 {
		link, ok, err := s.db.CivitaiLink(ctx, key)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if !ok || link.ModelID == 0 {
			// Never looked up, or not since its hash changed: ask the catalogue by
			// hash now, which links it without touching its record.
			if found, err := s.civitaiLinkNow(ctx, key); err == nil {
				link = found
			}
		}
		if link.ModelID == 0 {
			writeErr(w, http.StatusNotFound, "this model isn't on Civitai, or hasn't been hashed yet — link it from the Civitai tab by picking its version")
			return
		}
		modelID, versionID = link.ModelID, link.VersionID
	}
	if modelID == 0 && versionID > 0 {
		var v civitaiRawVersion
		if err := s.civitaiGet(ctx, "/model-versions/"+strconv.FormatInt(versionID, 10), nil, &v, 4<<20); err != nil {
			writeErr(w, civitaiStatus(err), err.Error())
			return
		}
		modelID = v.ModelID
	}
	if modelID <= 0 {
		writeErr(w, http.StatusBadRequest, "key or versionId is required")
		return
	}
	m, err := s.civitaiModel(ctx, modelID)
	if err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"suggestion": civitaiSuggestionFor(m, versionID),
		"modelName":  m.Name,
		// The showcase's settings come only with a key; without one the suggestion
		// is the card alone, and the editor says so.
		"keySet": s.settings.Get().CivitaiAPIKey != "",
	})
}

// civitaiLinkNow looks one installed model up on the catalogue by its file's hash.
func (s *Server) civitaiLinkNow(ctx context.Context, key string) (db.CivitaiLink, error) {
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		return db.CivitaiLink{}, errors.New("image generation is not configured")
	}
	detail, err := s.imagegen.ModelDetail(ctx, set.ImageGenURL, key)
	if err != nil {
		return db.CivitaiLink{}, err
	}
	records, err := s.imagegen.ModelRecords(ctx, set.ImageGenURL)
	if err != nil {
		return db.CivitaiLink{}, err
	}
	for _, r := range records {
		if r.Key == detail.Key && civitaiHashOf(r.Hash) != "" {
			known, _, _ := s.db.CivitaiLink(ctx, r.Key)
			return s.civitaiLookupByHash(ctx, r, known)
		}
	}
	return db.CivitaiLink{}, errCivitaiNotFound
}

// civitaiFillDefaults gives a just-installed model the catalogue's recommendations
// for every setting it has none for. What the generator already set — InvokeAI
// fills a size in for an SDXL model on install — is left alone.
func (s *Server) civitaiFillDefaults(ctx context.Context, base, key string, sug civitaiSuggestion) error {
	detail, err := s.imagegen.ModelDetail(ctx, base, key)
	if err != nil {
		return err
	}
	cur := imagegen.ModelDefaults{}
	if detail.Defaults != nil {
		cur = *detail.Defaults
	}
	next := cur
	if detail.Type == "lora" {
		if next.Weight == 0 {
			next.Weight = sug.Weight
		}
	} else {
		if next.Steps == 0 {
			next.Steps = sug.Steps
		}
		if next.CfgScale == 0 {
			next.CfgScale = sug.CfgScale
		}
		if next.Scheduler == "" {
			next.Scheduler = sug.Scheduler
		}
		if next.Width == 0 && next.Height == 0 {
			next.Width, next.Height = sug.Width, sug.Height
		}
	}
	if next != cur {
		_, err := s.imagegen.UpdateModel(ctx, base, detail.Key, imagegen.ModelChanges{Defaults: &next})
		// Without A1111's folder there is nowhere for these; the ones kept here
		// still go in below.
		if err != nil && !errors.Is(err, imagegen.ErrNoModelsDir) {
			return err
		}
	}
	x, err := s.db.GetModelDefaults(ctx, detail.Key)
	if err != nil {
		return err
	}
	if x.Negative == "" {
		x.Negative = sug.Negative
	}
	if detail.Type == "lora" {
		if x.WeightMin == 0 && x.WeightMax == 0 {
			x.WeightMin, x.WeightMax = sug.WeightMin, sug.WeightMax
		}
	} else {
		if x.Positive == "" {
			x.Positive = sug.Positive
		}
		if x.ClipSkip == 0 {
			x.ClipSkip = sug.ClipSkip
		}
	}
	return s.db.PutModelDefaults(ctx, x)
}

// decodeDefaultsPatch reads a patch's defaults and which of the fields kept here it
// names. A missing or null defaults is no change at all.
func decodeDefaultsPatch(raw json.RawMessage) (*imagegen.ModelDefaults, map[string]bool, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil, nil
	}
	var d imagegen.ModelDefaults
	if err := json.Unmarshal(raw, &d); err != nil {
		return nil, nil, err
	}
	var keys map[string]json.RawMessage
	_ = json.Unmarshal(raw, &keys)
	named := map[string]bool{}
	for _, f := range modelExtraFields {
		_, named[f] = keys[f]
	}
	return &d, named, nil
}
