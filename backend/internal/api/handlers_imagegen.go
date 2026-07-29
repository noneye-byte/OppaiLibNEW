package api

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
)

// decodeDataImage decodes a base64 image, tolerating a leading "data:...;base64,"
// prefix so the web UI can hand over either a bare payload or a full data URL.
func decodeDataImage(s string) ([]byte, error) {
	if i := strings.IndexByte(s, ','); i >= 0 && strings.HasPrefix(s, "data:") {
		s = s[i+1:]
	}
	return base64.StdEncoding.DecodeString(strings.TrimSpace(s))
}

// ── ephemeral preview cache ──────────────────────────────────────────────────
//
// Generated images must not land in the library unless the user saves one, so they
// live here — in memory, for a while — between /generate and /save. Nothing is
// written to disk until /save, and an unsaved preview simply expires. This is what
// makes "all generated images don't save unless manually saved" true by construction
// rather than by a flag someone has to remember to check.

const (
	// A complete outfit is sixty sequential generations. Keeping previews for six
	// hours gives a slower local generator time to finish and export the set; the hard
	// count cap below still bounds memory regardless of age.
	genPreviewTTL = 6 * time.Hour
	genCacheMax   = 96 // hard cap so a generate loop can't grow memory without bound
)

type genPreview struct {
	data     []byte
	at       time.Time
	prompt   string
	negative string
	seed     int64
	model    string
}

type genCache struct {
	mu sync.Mutex
	m  map[string]*genPreview
}

func newGenCache() *genCache { return &genCache{m: make(map[string]*genPreview)} }

// put stores a preview and returns its id, evicting anything expired (and, if still
// over the cap, the oldest) so the map can't grow without bound.
func (c *genCache) put(p *genPreview) string {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.evictLocked()
	id := randomID()
	p.at = time.Now()
	c.m[id] = p
	return id
}

func (c *genCache) get(id string) (*genPreview, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	p, ok := c.m[id]
	if !ok || time.Since(p.at) > genPreviewTTL {
		if ok {
			delete(c.m, id)
		}
		return nil, false
	}
	return p, true
}

// replaceData keeps a preview's identity and generation record while swapping in a
// hand-corrected cutout. Keeping the id stable means every open result view starts
// showing the reviewed PNG without creating an orphan preview.
func (c *genCache) replaceData(id string, data []byte) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	p, ok := c.m[id]
	if !ok || time.Since(p.at) > genPreviewTTL {
		if ok {
			delete(c.m, id)
		}
		return false
	}
	// Replace the record rather than mutating the object returned by an already-running
	// GET/save. Readers keep an immutable snapshot after get releases the cache lock.
	updated := *p
	updated.data = data
	updated.at = time.Now()
	c.m[id] = &updated
	return true
}

func (c *genCache) delete(id string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, ok := c.m[id]; !ok {
		return false
	}
	delete(c.m, id)
	return true
}

func (c *genCache) evictLocked() {
	for id, p := range c.m {
		if time.Since(p.at) > genPreviewTTL {
			delete(c.m, id)
		}
	}
	// Still over cap after dropping expired ones: shed the oldest until under it.
	for len(c.m) >= genCacheMax {
		var oldestID string
		var oldest time.Time
		for id, p := range c.m {
			if oldestID == "" || p.at.Before(oldest) {
				oldestID, oldest = id, p.at
			}
		}
		if oldestID == "" {
			break
		}
		delete(c.m, oldestID)
	}
}

func randomID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// ── status ───────────────────────────────────────────────────────────────────

func (s *Server) handleImageGenStatus(w http.ResponseWriter, r *http.Request) {
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		writeJSON(w, http.StatusOK, map[string]any{"enabled": false})
		return
	}
	// Probing the generator is a network round trip; keep it short so a misconfigured
	// URL fails the status check fast rather than hanging the screen.
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	models, err := s.imagegen.Models(ctx, set.ImageGenURL)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"enabled": true, "reachable": false, "error": err.Error()})
		return
	}
	backend, _ := s.imagegen.Backend(ctx, set.ImageGenURL)
	// Some older A1111-compatible implementations do not expose the LoRA endpoint.
	// Checkpoints still work there, so report that limitation without declaring the
	// whole generator unreachable.
	loras, loraErr := s.imagegen.Loras(ctx, set.ImageGenURL)
	out := map[string]any{"enabled": true, "reachable": true, "backend": backend, "models": models, "loras": loras}
	if loraErr != nil {
		out["loraError"] = loraErr.Error()
	}
	// VAEs and templates are conveniences, not prerequisites: a generator that lacks
	// the endpoints (A1111, older InvokeAI) just yields empty lists.
	if vaes, err := s.imagegen.Vaes(ctx, set.ImageGenURL); err == nil {
		out["vaes"] = vaes
	}
	if templates, err := s.imagegen.Templates(ctx, set.ImageGenURL); err == nil {
		out["templates"] = templates
	}
	if backend == imagegen.KindInvokeAI {
		if boards, err := s.imagegen.Boards(ctx, set.ImageGenURL); err == nil {
			out["boards"] = boards
		}
	}
	out["detailerAvailable"] = s.imagegen.SupportsADetailer(ctx, set.ImageGenURL)
	writeJSON(w, http.StatusOK, out)
}

// ── prompt optimisation ──────────────────────────────────────────────────────

type promptReq struct {
	Text string `json:"text"`
}

// handleImageGenPrompt turns a scrap of (spoken) natural language into a fuller
// prompt + negative prompt. The speech-to-text itself happens in the browser; this is
// the "optimise into a good prompt" half, done with rules (there is no LLM here).
func (s *Server) handleImageGenPrompt(w http.ResponseWriter, r *http.Request) {
	var req promptReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	prompt, negative := imagegen.BuildPrompt(req.Text)
	writeJSON(w, http.StatusOK, map[string]any{"prompt": prompt, "negativePrompt": negative})
}

// ── generate ─────────────────────────────────────────────────────────────────

type generateReq struct {
	Prompt         string      `json:"prompt"`
	NegativePrompt string      `json:"negativePrompt"`
	Checkpoint     string      `json:"checkpoint"`
	VAE            string      `json:"vae"`
	Sampler        string      `json:"sampler"`
	Steps          int         `json:"steps"`
	Width          int         `json:"width"`
	Height         int         `json:"height"`
	CfgScale       float64     `json:"cfgScale"`
	CfgRescale     float64     `json:"cfgRescale"`
	ClipSkip       int         `json:"clipSkip"`
	SeamlessX      bool        `json:"seamlessX"`
	SeamlessY      bool        `json:"seamlessY"`
	VAEPrecision   string      `json:"vaePrecision"`
	CPUNoise       *bool       `json:"cpuNoise"`
	Board          string      `json:"board"`
	Seed           int64       `json:"seed"`
	Count          int         `json:"count"`
	Loras          []loraReq   `json:"loras"`
	Detailer       detailerReq `json:"detailer"`
}

type detailerReq struct {
	Enabled        bool    `json:"enabled"`
	Model          string  `json:"model"`
	Prompt         string  `json:"prompt"`
	NegativePrompt string  `json:"negativePrompt"`
	Confidence     float64 `json:"confidence"`
	Denoise        float64 `json:"denoise"`
	MaskBlur       int     `json:"maskBlur"`
}

type loraReq struct {
	Name   string  `json:"name"`
	Weight float64 `json:"weight"`
}

func (s *Server) handleImageGenGenerate(w http.ResponseWriter, r *http.Request) {
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
		return
	}
	var req generateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Prompt == "" {
		writeErr(w, http.StatusBadRequest, "a prompt is required")
		return
	}
	clampGenerate(&req)
	// Sanitize the LoRA picks once here; each backend applies them its own way
	// (A1111 as prompt tokens, InvokeAI as graph nodes). promptRecord is the
	// human-readable account of the whole request, kept for the save notes.
	var loras []imagegen.LoraWeight
	promptRecord := req.Prompt
	for _, lora := range req.Loras {
		name := strings.TrimSpace(strings.NewReplacer("<", "", ">", "", ":", "").Replace(lora.Name))
		if name == "" {
			continue
		}
		weight := lora.Weight
		if weight < -2 {
			weight = -2
		} else if weight > 2 {
			weight = 2
		}
		loras = append(loras, imagegen.LoraWeight{Name: name, Weight: weight})
		promptRecord += fmt.Sprintf(" <lora:%s:%.2g>", name, weight)
	}

	cpuNoise := true // preserve Invoke's safe existing default for older clients
	if req.CPUNoise != nil {
		cpuNoise = *req.CPUNoise
	}
	detailPrompt := strings.TrimSpace(req.Detailer.Prompt)
	if detailPrompt == "" {
		detailPrompt = req.Prompt
	}
	detailNegative := strings.TrimSpace(req.Detailer.NegativePrompt)
	if detailNegative == "" {
		detailNegative = req.NegativePrompt
	}
	gen := imagegen.GenerateRequest{
		Prompt:         req.Prompt,
		NegativePrompt: req.NegativePrompt,
		Checkpoint:     req.Checkpoint,
		VAE:            req.VAE,
		Sampler:        req.Sampler,
		Steps:          req.Steps,
		Width:          req.Width,
		Height:         req.Height,
		CfgScale:       req.CfgScale,
		CfgRescale:     req.CfgRescale,
		ClipSkip:       req.ClipSkip,
		SeamlessX:      req.SeamlessX,
		SeamlessY:      req.SeamlessY,
		VAEPrecision:   req.VAEPrecision,
		CPUNoise:       cpuNoise,
		Board:          req.Board,
		Seed:           req.Seed,
		Count:          req.Count,
		Loras:          loras,
		Detailer: imagegen.Detailer{
			Enabled: req.Detailer.Enabled, Model: req.Detailer.Model,
			Prompt: detailPrompt, NegativePrompt: detailNegative,
			Confidence: req.Detailer.Confidence, Denoise: req.Detailer.Denoise,
			MaskBlur: req.Detailer.MaskBlur,
		},
	}
	res, err := s.imagegen.Generate(r.Context(), set.ImageGenURL, gen)
	if err != nil {
		s.log.Warn("image generate", "err", err)
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}

	type preview struct {
		ID   string `json:"id"`
		Seed int64  `json:"seed"`
	}
	out := make([]preview, 0, len(res.Images))
	for i, img := range res.Images {
		seed := res.Seed
		if i < len(res.Seeds) {
			seed = res.Seeds[i]
		}
		id := s.genCache.put(&genPreview{
			data:     img,
			prompt:   promptRecord,
			negative: req.NegativePrompt,
			seed:     seed,
			model:    req.Checkpoint,
		})
		out = append(out, preview{ID: id, Seed: seed})
	}
	writeJSON(w, http.StatusOK, map[string]any{"images": out, "prompt": promptRecord})
}

// clampGenerate forces a request into ranges a generator (and our memory) can survive,
// and fills unset fields with sane defaults. Even on the user's own box, an
// accidental 8192×8192×16 batch shouldn't be honoured verbatim.
func clampGenerate(req *generateReq) {
	if req.Steps <= 0 {
		req.Steps = 25
	}
	req.Steps = clampInt(req.Steps, 1, 80)
	if req.Width <= 0 {
		req.Width = 512
	}
	if req.Height <= 0 {
		req.Height = 768
	}
	req.Width = roundTo8(clampInt(req.Width, 64, 2048))
	req.Height = roundTo8(clampInt(req.Height, 64, 2048))
	if req.CfgScale <= 0 {
		req.CfgScale = 7
	}
	if req.CfgScale > 30 {
		req.CfgScale = 30
	}
	if req.CfgRescale < 0 {
		req.CfgRescale = 0
	} else if req.CfgRescale > 0.99 {
		req.CfgRescale = 0.99
	}
	req.ClipSkip = clampInt(req.ClipSkip, 0, 12)
	// InvokeAI's fp16 VAE decode can produce valid all-black PNGs. Keep accepting
	// the old field for client compatibility, but generation is now always safe.
	req.VAEPrecision = "fp32"
	if req.Detailer.Confidence <= 0 {
		req.Detailer.Confidence = 0.3
	}
	if req.Detailer.Confidence > 1 {
		req.Detailer.Confidence = 1
	}
	if req.Detailer.Denoise <= 0 {
		req.Detailer.Denoise = 0.4
	}
	if req.Detailer.Denoise > 1 {
		req.Detailer.Denoise = 1
	}
	req.Detailer.MaskBlur = clampInt(req.Detailer.MaskBlur, 0, 64)
	if req.Count <= 0 {
		req.Count = 1
	}
	req.Count = clampInt(req.Count, 1, 8)
	if req.Seed == 0 {
		req.Seed = -1
	}
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func roundTo8(v int) int { return (v / 8) * 8 }

// ── preview ──────────────────────────────────────────────────────────────────

func (s *Server) handleImageGenPreview(w http.ResponseWriter, r *http.Request) {
	p, ok := s.genCache.get(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "preview expired or not found")
		return
	}
	// Generators return PNG. safeInlineContentType keeps an inline image safe on our
	// origin; no-store keeps an unsaved preview from lingering in a disk cache.
	w.Header().Set("Content-Type", safeInlineContentType("image/png"))
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(p.data)
}

type genPreviewImageReq struct {
	ImageData string `json:"imageData"`
}

// handleReplaceImageGenPreview makes a manually reviewed background cutout the
// canonical bytes for an outfit square. Only PNG is accepted because transparency is
// the purpose of this route and accepting arbitrary active content on an inline origin
// would be unnecessary risk.
func (s *Server) handleReplaceImageGenPreview(w http.ResponseWriter, r *http.Request) {
	var req genPreviewImageReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<20)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid image")
		return
	}
	data, err := decodeDataImage(req.ImageData)
	if err != nil || len(data) == 0 || http.DetectContentType(data) != "image/png" {
		writeErr(w, http.StatusBadRequest, "image must be a PNG")
		return
	}
	if !s.genCache.replaceData(r.PathValue("id"), data) {
		writeErr(w, http.StatusNotFound, "preview expired or not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// Redoing an outfit state must discard its superseded in-memory image, rather than
// merely hiding it in the browser while it continues consuming the preview cache.
func (s *Server) handleDeleteImageGenPreview(w http.ResponseWriter, r *http.Request) {
	s.genCache.delete(r.PathValue("id"))
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// ── save ─────────────────────────────────────────────────────────────────────

type genSaveReq struct {
	ID    string   `json:"id"`
	Title string   `json:"title"`
	Tags  []string `json:"tags"`
}

// handleImageGenSave is the one crossing point into the library. It takes a preview
// id, stores those in-memory bytes as an encrypted blob, and files it as an image —
// same ingest path (dedupe, thumbnail, auto-tag) as any other import.
func (s *Server) handleImageGenSave(w http.ResponseWriter, r *http.Request) {
	var req genSaveReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	p, ok := s.genCache.get(req.ID)
	if !ok {
		writeErr(w, http.StatusNotFound, "preview expired or not found")
		return
	}

	put, err := s.store.Put(bytes.NewReader(p.data))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "store failed")
		return
	}

	title := req.Title
	if title == "" {
		title = "Generated image"
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(title), []byte("title"))
	// The prompt is worth keeping: it's how the image was made and how it'd be made
	// again. Stored in notes like any other free text.
	var notesEnc []byte
	if p.prompt != "" {
		notesEnc, _ = crypto.SealBytes(s.kek, []byte(p.prompt), []byte("notes"))
	}

	id, existed, err := s.db.InsertMedia(r.Context(), &db.MediaRow{
		Kind:     "image",
		SHA256:   put.SHA256,
		Size:     put.Size,
		BlobPath: put.RelPath,
		TitleEnc: titleEnc,
		NotesEnc: notesEnc,
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !existed {
		s.processIngestAsync(id, put.RelPath, "image", put.Size, 0)
	}
	// Mark its provenance so generated images are findable, then apply user tags.
	if err := s.db.AddTag(r.Context(), id, "ai-generated", "source", "generated", 0); err != nil {
		s.log.Debug("tag generated image", "err", err)
	}
	for _, t := range req.Tags {
		if t == "" {
			continue
		}
		if err := s.db.AddTag(r.Context(), id, t, "general", "manual", 0); err != nil {
			s.log.Debug("tag generated image", "tag", t, "err", err)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "existed": existed})
}

// ── model metadata (InvokeAI model manager) ──────────────────────────────────
//
// The edit dialog reads and writes the generator's own model records — name,
// description, trigger phrases, recommended settings — so edits made here are the
// same edits InvokeAI's model manager would make, and vice versa.

func (s *Server) handleGetModelMeta(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		writeErr(w, http.StatusBadRequest, "name is required")
		return
	}
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	detail, err := s.imagegen.ModelDetail(ctx, set.ImageGenURL, name)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

type modelMetaPatch struct {
	Key            string                  `json:"key"`
	Name           *string                 `json:"name"`
	Description    *string                 `json:"description"`
	TriggerPhrases *[]string               `json:"triggerPhrases"`
	Defaults       *imagegen.ModelDefaults `json:"defaults"`
}

func (s *Server) handlePatchModelMeta(w http.ResponseWriter, r *http.Request) {
	var req modelMetaPatch
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Key == "" {
		writeErr(w, http.StatusBadRequest, "key is required")
		return
	}
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	detail, err := s.imagegen.UpdateModel(ctx, set.ImageGenURL, req.Key, imagegen.ModelChanges{
		Name:           req.Name,
		Description:    req.Description,
		TriggerPhrases: req.TriggerPhrases,
		Defaults:       req.Defaults,
	})
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

// ── InvokeAI gallery ─────────────────────────────────────────────────────────
//
// InvokeAI keeps every finished generation in its own gallery, sorted into boards.
// These endpoints browse that gallery (it lives on the user's own box), stream its
// images through the server, delete from it, and copy one image into the library —
// the same one-way crossing the preview save uses.

func (s *Server) galleryBase(w http.ResponseWriter) (string, bool) {
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
		return "", false
	}
	return set.ImageGenURL, true
}

func (s *Server) handleGalleryBoards(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	boards, err := s.imagegen.Boards(ctx, base)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"boards": boards})
}

type galleryCreateBoardReq struct {
	Name string `json:"name"`
}

func (s *Server) handleGalleryCreateBoard(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	var req galleryCreateBoardReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		writeErr(w, http.StatusBadRequest, "board name is required")
		return
	}
	if len([]rune(req.Name)) > 300 {
		writeErr(w, http.StatusBadRequest, "board name is too long")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	board, err := s.imagegen.CreateBoard(ctx, base, req.Name)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, board)
}

func (s *Server) handleGalleryDeleteBoard(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	// "none" is the uncategorized pseudo-board, not a real board — it can't be deleted.
	if id == "" || id == "none" {
		writeErr(w, http.StatusBadRequest, "that gallery can't be deleted")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	if err := s.imagegen.DeleteBoard(ctx, base, id); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleGalleryImages(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	q := r.URL.Query()
	offset := clampInt(atoiDefault(q.Get("offset"), 0), 0, 1<<20)
	limit := clampInt(atoiDefault(q.Get("limit"), 60), 1, 200)
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	page, err := s.imagegen.BoardImages(ctx, base, q.Get("board"), offset, limit)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n := 0
	for _, r := range s {
		if r < '0' || r > '9' {
			return def
		}
		n = n*10 + int(r-'0')
		if n > 1<<20 {
			return def
		}
	}
	return n
}

func (s *Server) serveGalleryImage(w http.ResponseWriter, r *http.Request, thumb bool) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	name := r.PathValue("name")
	if name == "" {
		writeErr(w, http.StatusBadRequest, "image name is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	data, ct, err := s.imagegen.GalleryImage(ctx, base, name, thumb)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if ct == "" {
		ct = http.DetectContentType(data)
	}
	w.Header().Set("Content-Type", safeInlineContentType(ct))
	// Gallery images are immutable under a given name; a short private cache keeps
	// scrolling smooth without letting them outlive a delete for long.
	w.Header().Set("Cache-Control", "private, max-age=300")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) handleGalleryThumb(w http.ResponseWriter, r *http.Request) {
	s.serveGalleryImage(w, r, true)
}

func (s *Server) handleGalleryFull(w http.ResponseWriter, r *http.Request) {
	s.serveGalleryImage(w, r, false)
}

func (s *Server) handleGalleryMetadata(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	name := strings.TrimSpace(r.PathValue("name"))
	if name == "" {
		writeErr(w, http.StatusBadRequest, "image name is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	metadata, err := s.imagegen.GalleryImageMetadata(ctx, base, name)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, metadata)
}

func (s *Server) handleGalleryDelete(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	name := r.PathValue("name")
	if name == "" {
		writeErr(w, http.StatusBadRequest, "image name is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	if err := s.imagegen.DeleteGalleryImage(ctx, base, name); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

type galleryImagesReq struct {
	Names []string `json:"names"`
}

// handleGalleryDeleteBatch removes several gallery images in one request, so a
// multi-select delete in the UI is a single round-trip.
func (s *Server) handleGalleryDeleteBatch(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	var req galleryImagesReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Names) == 0 {
		writeErr(w, http.StatusBadRequest, "at least one image name is required")
		return
	}
	if len(req.Names) > 500 {
		writeErr(w, http.StatusBadRequest, "too many images in one request")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	if err := s.imagegen.DeleteGalleryImages(ctx, base, req.Names); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

type galleryBoardReq struct {
	Board string   `json:"board"`
	Names []string `json:"names"`
}

// handleGalleryAddToBoard moves the selected images onto a board (board "none"
// clears their board), so the UI can file a multi-select into a gallery at once.
func (s *Server) handleGalleryAddToBoard(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	var req galleryBoardReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Names) == 0 {
		writeErr(w, http.StatusBadRequest, "a board and at least one image name are required")
		return
	}
	if len(req.Names) > 500 {
		writeErr(w, http.StatusBadRequest, "too many images in one request")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	if err := s.imagegen.AddImagesToBoard(ctx, base, req.Board, req.Names); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

type gallerySaveReq struct {
	Name  string   `json:"name"`
	Title string   `json:"title"`
	Tags  []string `json:"tags"`
}

// handleGallerySave copies one InvokeAI gallery image into the library: fetch the
// full PNG, store it encrypted, file it through the same ingest path as any other
// image, and keep the generation prompt (when InvokeAI recorded one) as notes.
func (s *Server) handleGallerySave(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	var req gallerySaveReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		writeErr(w, http.StatusBadRequest, "an image name is required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	data, _, err := s.imagegen.GalleryImage(ctx, base, req.Name, false)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	prompt := s.imagegen.GalleryImagePrompt(ctx, base, req.Name)

	put, err := s.store.Put(bytes.NewReader(data))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "store failed")
		return
	}
	title := req.Title
	if title == "" {
		title = "Generated image"
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(title), []byte("title"))
	var notesEnc []byte
	if prompt != "" {
		notesEnc, _ = crypto.SealBytes(s.kek, []byte(prompt), []byte("notes"))
	}
	id, existed, err := s.db.InsertMedia(r.Context(), &db.MediaRow{
		Kind:     "image",
		SHA256:   put.SHA256,
		Size:     put.Size,
		BlobPath: put.RelPath,
		TitleEnc: titleEnc,
		NotesEnc: notesEnc,
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !existed {
		s.processIngestAsync(id, put.RelPath, "image", put.Size, 0)
	}
	if err := s.db.AddTag(r.Context(), id, "ai-generated", "source", "generated", 0); err != nil {
		s.log.Debug("tag generated image", "err", err)
	}
	for _, t := range req.Tags {
		if t == "" {
			continue
		}
		if err := s.db.AddTag(r.Context(), id, t, "general", "manual", 0); err != nil {
			s.log.Debug("tag generated image", "tag", t, "err", err)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "existed": existed})
}

// ── model (checkpoint) thumbnails ────────────────────────────────────────────
//
// These endpoints proxy InvokeAI's own model-manager cover art. A generated preview
// may be promoted to cover art, but it is written back to InvokeAI rather than kept
// in a separate OppaiLib thumbnail store.

func (s *Server) handleGetModelThumb(w http.ResponseWriter, r *http.Request) {
	model := r.URL.Query().Get("model")
	if model == "" {
		writeErr(w, http.StatusBadRequest, "model is required")
		return
	}
	s.servePickerThumb(w, r, model)
}

func (s *Server) handleGetLoraThumb(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		writeErr(w, http.StatusBadRequest, "LoRA name is required")
		return
	}
	s.servePickerThumb(w, r, name)
}

// servePickerThumb always reads the generator's cover art. InvokeAI is the source of
// truth for model and LoRA previews; OppaiLib no longer keeps an independent custom
// thumbnail that can drift from Invoke's model manager.
func (s *Server) servePickerThumb(w http.ResponseWriter, r *http.Request, name string) {
	set := s.settings.Get()
	if set.ImageGenEnabled {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		if data, ct, err := s.imagegen.Cover(ctx, set.ImageGenURL, name); err == nil && len(data) > 0 {
			if ct == "" {
				ct = http.DetectContentType(data)
			}
			w.Header().Set("Content-Type", safeInlineContentType(ct))
			w.Header().Set("Cache-Control", "private, max-age=300")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(data)
			return
		}
	}
	writeErr(w, http.StatusNotFound, "no thumbnail for that model")
}

type setModelThumbReq struct {
	Model string `json:"model"`
	// PreviewID reuses a just-generated image and pushes it into InvokeAI. ImageData
	// remains only to return a clear error to older clients that try a local upload.
	PreviewID string `json:"previewId"`
	ImageData string `json:"imageData"`
}

const maxModelThumbBytes = 8 << 20

func (s *Server) handleSetModelThumb(w http.ResponseWriter, r *http.Request) {
	var req setModelThumbReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Model == "" {
		writeErr(w, http.StatusBadRequest, "model is required")
		return
	}

	s.setPickerThumb(w, r, req)
}

func (s *Server) handleSetLoraThumb(w http.ResponseWriter, r *http.Request) {
	var req setModelThumbReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Model == "" {
		writeErr(w, http.StatusBadRequest, "LoRA name is required")
		return
	}
	s.setPickerThumb(w, r, req)
}

func (s *Server) setPickerThumb(w http.ResponseWriter, r *http.Request, req setModelThumbReq) {
	if req.ImageData != "" {
		writeErr(w, http.StatusBadRequest, "custom thumbnail uploads are disabled; choose an InvokeAI-generated preview")
		return
	}
	if req.PreviewID == "" {
		writeErr(w, http.StatusBadRequest, "previewId is required")
		return
	}
	p, ok := s.genCache.get(req.PreviewID)
	if !ok {
		writeErr(w, http.StatusNotFound, "preview expired or not found")
		return
	}
	data := p.data
	if len(data) == 0 || len(data) > maxModelThumbBytes {
		writeErr(w, http.StatusBadRequest, "image is empty or too large")
		return
	}

	set := s.settings.Get()
	if !set.ImageGenEnabled {
		writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	if err := s.imagegen.UpdateCover(ctx, set.ImageGenURL, req.Model, data, http.DetectContentType(data)); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}
