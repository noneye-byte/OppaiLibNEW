package api

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/recognize"
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
// live here — in memory, for a while — between /generate and /save, and an unsaved
// preview simply expires. Nothing reaches the library until /save. (On A1111 the
// studio's runs are also kept in its gallery, which is not the library: see
// gen_gallery.go.)

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
	// mime is a clip's type; blank is a picture, which generators return as PNG.
	mime string
	// galleryID is the same picture kept in the studio's gallery (gen_gallery.go), 0
	// when it was not: saving the preview to the library moves it out of there.
	galleryID int64
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
	if backend == imagegen.KindA1111 {
		s.civitaiTriggerWords(ctx, loras)
	}
	s.overlayStatusDefaults(ctx, models, loras)
	s.overlayLoraCategories(ctx, loras)
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
		out["gallery"] = "invokeai"
		out["gallerySorts"] = []string{"newest", "oldest"}
	} else {
		// A1111 keeps no gallery of its own, so the studio keeps one (gen_gallery.go).
		out["gallery"] = "oppailib"
		out["gallerySorts"] = []string{"newest", "oldest", "largest"}
	}
	out["detailerAvailable"] = s.imagegen.SupportsADetailer(ctx, set.ImageGenURL)
	// The detectors ADetailer has on A1111, including ones dropped into its folder
	// for parts of a body its own models never look for.
	if out["detailerAvailable"] == true && backend == imagegen.KindA1111 {
		if names, err := s.imagegen.Detectors(ctx, set.ImageGenURL); err == nil {
			out["detectors"] = append([]string{}, names...)
		}
	}
	out["regionsAvailable"] = s.imagegen.SupportsRegions(ctx, set.ImageGenURL)
	// Clips are ComfyUI's (gen_clips.go): read off the settings, not probed, because a
	// render box that is asleep should not take the Video drawer away.
	out["clips"] = clipsStatus(set)
	// What a picture can be enlarged with: on A1111 its upscaler models (an upscale
	// or a hires fix) and latent modes (a hires fix only). InvokeAI lists none.
	if ups, latent, err := s.imagegen.Upscalers(ctx, set.ImageGenURL); err == nil && backend == imagegen.KindA1111 {
		out["upscalers"] = append([]string{}, ups...)
		out["latentUpscalers"] = append([]string{}, latent...)
	}
	// What the studio can do to the generator's models: browse Civitai and link by
	// hash always; install, edit, re-cover and delete where the generator lets it —
	// InvokeAI always, A1111 once its models folder is mounted (a1111_models.go).
	out["civitai"] = true
	if backend == imagegen.KindA1111 {
		// The folder is read once here rather than again through ManagesModels: the
		// check probes it with a write.
		dir := s.imagegen.A1111ModelsDir()
		out["manageModels"] = dir.Dir != "" && dir.Writable
		out["modelsDirSet"] = dir.Path != ""
		out["modelsDir"] = dir.Dir
		out["modelsDirProblem"] = dir.Problem
		// LoRAs and detectors are named by their files, which need the folder to rename.
		out["canRename"] = dir.Dir != "" && dir.Writable
		// Restarting needs A1111 started with --api-server-stop (a1111_restart.go).
		out["canRestart"] = s.imagegen.CanRestart(ctx, set.ImageGenURL)
	} else {
		out["manageModels"] = s.imagegen.ManagesModels(ctx, set.ImageGenURL)
	}
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
	// JobID names the run so the studio can watch and cancel it while this request
	// is in flight. Client-made; optional. See imagegen_jobs.go.
	JobID          string      `json:"jobId"`
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
	// InitImage starts the picture from this one instead of from noise (a data URL
	// or bare base64): image to image, with Denoise saying how far it may move.
	InitImage string  `json:"initImage"`
	Denoise   float64 `json:"denoise"`
	// Mask, with InitImage, repaints only its white (paint to fix); MaskBlur softens
	// its edge into the rest. DetailOnly runs the detailer over InitImage alone.
	Mask       string `json:"mask"`
	MaskBlur   int    `json:"maskBlur"`
	DetailOnly bool   `json:"detailOnly"`
	// Upscale is a hires fix on a run drawn from noise; UpscaleOnly, with InitImage,
	// enlarges that picture with Upscale's upscaler and factor and redraws nothing.
	Upscale     upscaleReq `json:"upscale"`
	UpscaleOnly bool       `json:"upscaleOnly"`
	// InitGallery starts from a gallery picture by its name instead of InitImage's
	// bytes, so a picture that is already on the server is not sent back up to it —
	// a reverse proxy's body limit refuses that upload with a page of its own.
	InitGallery string `json:"initGallery"`
	// NoGallery leaves the run out of the studio's gallery: the LoRA comparison's
	// sheets, which are drawn to be looked at side by side and not kept.
	NoGallery bool `json:"noGallery"`
	// Regions draws each person in a part of the picture of their own, from their
	// own words and LoRAs; Prompt is then what the whole picture shares.
	Regions regionsReq `json:"regions"`
}

type regionsReq struct {
	Enabled bool            `json:"enabled"`
	Rows    bool            `json:"rows"`
	Parts   []regionPartReq `json:"parts"`
}

type regionPartReq struct {
	Prompt string    `json:"prompt"`
	Loras  []loraReq `json:"loras"`
	Share  float64   `json:"share"`
}

type detailerReq struct {
	Enabled bool   `json:"enabled"`
	Model   string `json:"model"`
	// Models is a pass per detector, in order (faces, then hands); Model is the one
	// pass of a client older than that.
	Models         []string `json:"models"`
	Prompt         string   `json:"prompt"`
	NegativePrompt string   `json:"negativePrompt"`
	Confidence     float64  `json:"confidence"`
	Denoise        float64  `json:"denoise"`
	MaskBlur       int      `json:"maskBlur"`
	// Custom is a pass per detector of the person's choosing, after the faces and
	// hands, each with a prompt and LoRAs of its own.
	Custom []detailerPassReq `json:"custom"`
}

type detailerPassReq struct {
	Model          string    `json:"model"`
	Prompt         string    `json:"prompt"`
	NegativePrompt string    `json:"negativePrompt"`
	Loras          []loraReq `json:"loras"`
	Confidence     float64   `json:"confidence"`
	Denoise        float64   `json:"denoise"`
}

type upscaleReq struct {
	Enabled  bool    `json:"enabled"`
	Upscaler string  `json:"upscaler"`
	Scale    float64 `json:"scale"`
	Denoise  float64 `json:"denoise"`
	Steps    int     `json:"steps"`
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
	// A picture to start from rides in the body, so the cap is a large PNG's worth.
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<20)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	// An upscale draws nothing, so it needs nothing to draw.
	if req.Prompt == "" && !req.UpscaleOnly {
		writeErr(w, http.StatusBadRequest, "a prompt is required")
		return
	}
	gen, promptRecord, rolled := s.prepareGenerate(&req)
	if req.InitGallery != "" && req.InitImage == "" {
		data, err := s.galleryPicture(r.Context(), set.ImageGenURL, req.InitGallery)
		if err != nil {
			writeErr(w, http.StatusNotFound, err.Error())
			return
		}
		req.InitImage = base64.StdEncoding.EncodeToString(data)
	}
	if err := decodeGenerateImages(&req, &gen); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx := r.Context()
	var job *genJob
	if genJobIDPattern.MatchString(req.JobID) {
		// A named run outlives its request. A proxy in front of the server that gives
		// up on a long one (an ADetailer pass is what pushed runs past a minute) used to
		// close the connection, which cancelled the run with it, and the studio was
		// shown the proxy's error page as "something went wrong". Now the run finishes,
		// is kept, and its result waits on the job for the studio to collect. The
		// studio's Stop still ends it, through the job's own cancel.
		ctx, job = s.genJobs.start(context.WithoutCancel(r.Context()), req.JobID)
		gen.Progress = job.report
		defer s.genJobs.finish(req.JobID, job)
	}
	// On a card shared by swapping, her model steps off it for the length of the run.
	// See gpu_share.go.
	release := s.lendCardToImages(r.Context())
	defer release()
	res, err := s.imagegen.Generate(ctx, set.ImageGenURL, gen)
	if err != nil {
		if job != nil && ctx.Err() != nil {
			// Stopped from the studio, not failed: the cancel endpoint ended it.
			job.fail("generation cancelled")
			writeErr(w, http.StatusConflict, "generation cancelled")
			return
		}
		status := http.StatusBadGateway
		if errors.Is(err, imagegen.ErrInpaintUnsupported) || errors.Is(err, imagegen.ErrUpscaleUnsupported) ||
			errors.Is(err, imagegen.ErrRegionsUnsupported) {
			status = http.StatusConflict
		} else {
			s.log.Warn("image generate", "err", err)
		}
		if job != nil {
			job.fail(err.Error())
		}
		writeErr(w, status, err.Error())
		return
	}

	// The studio's runs on A1111 are kept in its gallery as they come back, whatever
	// becomes of this response. Libby's camera never comes through here.
	var kept []int64
	if !req.NoGallery && s.ownGallery(ctx, set.ImageGenURL) {
		kept = s.keepGenerated(ctx, gen, res)
	}
	out := make([]genResultImage, 0, len(res.Images))
	for i, img := range res.Images {
		seed := res.Seed
		if i < len(res.Seeds) {
			seed = res.Seeds[i]
		}
		p := &genPreview{
			data:     img,
			prompt:   promptRecord,
			negative: req.NegativePrompt,
			seed:     seed,
			model:    req.Checkpoint,
		}
		item := genResultImage{Seed: seed}
		if i < len(kept) && kept[i] > 0 {
			p.galleryID = kept[i]
			item.Gallery = strconv.FormatInt(kept[i], 10)
		}
		item.ID = s.genCache.put(p)
		out = append(out, item)
	}
	result := genResult{
		Images: out,
		Prompt: promptRecord,
		// The prompts as they went to the generator, after wildcards. A client that
		// recorded what it typed replaces its record with these when rolled is set,
		// so the picture's metadata says what actually made it.
		Positive: req.Prompt,
		Negative: req.NegativePrompt,
		Rolled:   rolled,
	}
	if job != nil {
		job.succeed(result)
	}
	writeJSON(w, http.StatusOK, result)
}

// genResultImage is one picture of a finished run: its preview, the seed that made
// it, and its name in the studio's gallery when it was kept there.
type genResultImage struct {
	ID      string `json:"id"`
	Seed    int64  `json:"seed"`
	Gallery string `json:"gallery,omitempty"`
}

// genResult is a finished run, as the generate call answers it and as its job keeps
// it for a studio whose call did not come back.
type genResult struct {
	Images   []genResultImage `json:"images"`
	Prompt   string           `json:"prompt"`
	Positive string           `json:"positive"`
	Negative string           `json:"negative"`
	Rolled   bool             `json:"rolled"`
	// Clip is the one result of a clip run (gen_clips.go), which has no pictures.
	Clip *genClip `json:"clip,omitempty"`
}

// decodeGenerateImages reads a request's picture to start from and its mask. A mask
// or a detailer-only pass without a picture is a client mistake, said as one rather
// than quietly drawn from noise.
func decodeGenerateImages(req *generateReq, gen *imagegen.GenerateRequest) error {
	if req.InitImage == "" {
		if req.Mask != "" || req.DetailOnly || req.UpscaleOnly {
			return errors.New("painting to fix, fixing faces and upscaling need a picture to start from")
		}
		return nil
	}
	init, err := decodeDataImage(req.InitImage)
	if err != nil || !strings.HasPrefix(http.DetectContentType(init), "image/") {
		return errors.New("the picture to start from isn't an image")
	}
	gen.InitImage, gen.Denoise = init, req.Denoise
	if req.Mask != "" {
		mask, err := decodeDataImage(req.Mask)
		if err != nil || http.DetectContentType(mask) != "image/png" {
			return errors.New("the painted mask must be a PNG")
		}
		gen.Mask, gen.MaskBlur = mask, clampInt(req.MaskBlur, 0, 64)
	}
	if req.DetailOnly {
		if !req.Detailer.Enabled {
			return errors.New("fixing faces needs the detailer switched on")
		}
		gen.DetailOnly = true
	}
	if req.UpscaleOnly {
		gen.UpscaleOnly = true
		gen.Upscale.Scale = upscaleFactor(init, gen.Upscale.Scale)
	}
	return nil
}

// The largest side an upscale may come out at. A1111 will make a 16k picture if
// asked, and then the server holds it, its base64 and its PNG in memory at once.
const maxUpscaledSide = 8192

// upscaleFactor keeps an upscale of picture inside 1–4× and maxUpscaledSide. A
// picture whose size can't be read keeps the factor asked for; A1111 will say.
func upscaleFactor(picture []byte, factor float64) float64 {
	if factor <= 1 {
		factor = 2
	}
	factor = min(factor, 4)
	if cfg, _, err := image.DecodeConfig(bytes.NewReader(picture)); err == nil {
		if side := max(cfg.Width, cfg.Height); side > 0 && float64(side)*factor > maxUpscaledSide {
			factor = max(1, float64(maxUpscaledSide)/float64(side))
		}
	}
	return factor
}

// prepareGenerate turns a studio-shaped request into the generator's, filling defaults,
// rolling wildcards and sanitising LoRA picks. Shared by the studio's endpoint and
// Libby's camera, so a picture she takes is made exactly the way one made by hand is.
// promptRecord is the human-readable account of the whole request, kept for save notes.
func (s *Server) prepareGenerate(req *generateReq) (gen imagegen.GenerateRequest, promptRecord string, rolled bool) {
	clampGenerate(req)
	// Wildcards and {a|b} choices are rolled here, once per request, so every client
	// and Libby's own pictures get them. The lists are only read when the text has
	// something to expand. See handlers_wildcards.go.
	rolled = s.expandGenerateWildcards(req)
	// Sanitize the LoRA picks once here; each backend applies them its own way
	// (A1111 as prompt tokens, InvokeAI as graph nodes). promptRecord is the
	// human-readable account of the whole request, kept for the save notes.
	loras := sanitizeLoras(req.Loras)
	promptRecord = req.Prompt + loraTokens(loras)

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
	gen = imagegen.GenerateRequest{
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
			Enabled: req.Detailer.Enabled, Model: req.Detailer.Model, Models: req.Detailer.Models,
			Prompt: detailPrompt, NegativePrompt: detailNegative,
			Confidence: req.Detailer.Confidence, Denoise: req.Detailer.Denoise,
			MaskBlur: req.Detailer.MaskBlur,
		},
		Upscale: imagegen.Upscale{
			Enabled: req.Upscale.Enabled, Upscaler: req.Upscale.Upscaler, Scale: req.Upscale.Scale,
			Denoise: req.Upscale.Denoise, Steps: req.Upscale.Steps,
		},
	}
	for _, p := range req.Detailer.Custom {
		if model := strings.TrimSpace(p.Model); model != "" {
			gen.Detailer.Custom = append(gen.Detailer.Custom, imagegen.DetailerPass{
				Model: model, Prompt: strings.TrimSpace(p.Prompt), NegativePrompt: strings.TrimSpace(p.NegativePrompt),
				Loras: sanitizeLoras(p.Loras), Confidence: p.Confidence, Denoise: p.Denoise,
			})
		}
	}
	if req.Regions.Enabled && len(req.Regions.Parts) >= 2 {
		gen.Regions = imagegen.Regions{Enabled: true, Rows: req.Regions.Rows}
		for i, p := range req.Regions.Parts {
			part := imagegen.RegionPart{Prompt: strings.TrimSpace(p.Prompt), Loras: sanitizeLoras(p.Loras), Share: p.Share}
			gen.Regions.Parts = append(gen.Regions.Parts, part)
			promptRecord += fmt.Sprintf("\nPerson %d: %s%s", i+1, part.Prompt, loraTokens(part.Loras))
		}
		if !req.Regions.Rows && gen.Detailer.Enabled {
			// Side by side, the faces are in the people's order left to right, so the
			// face pass can redo each one with that person's words and LoRAs. The
			// regions keep a LoRA to its part, but one face pass over the whole
			// picture would give every face the same prompt again.
			for _, part := range gen.Regions.Parts {
				face := strings.TrimSpace(part.Prompt + loraTokens(part.Loras))
				if own := strings.TrimSpace(req.Detailer.Prompt); own != "" {
					face = own + ", " + face
				}
				gen.Detailer.FacePrompts = append(gen.Detailer.FacePrompts, face)
			}
		}
	}
	return gen, promptRecord, rolled
}

// sanitizeLoras drops the blank LoRA picks and the characters that would break out
// of a prompt token, and keeps each weight within what a LoRA means.
func sanitizeLoras(in []loraReq) []imagegen.LoraWeight {
	var out []imagegen.LoraWeight
	for _, lora := range in {
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
		out = append(out, imagegen.LoraWeight{Name: name, Weight: weight})
	}
	return out
}

// loraTokens writes LoRAs the A1111 way, each after a space: how the save notes
// record them, and how a face's own prompt carries them into ADetailer.
func loraTokens(loras []imagegen.LoraWeight) string {
	var b strings.Builder
	for _, l := range loras {
		fmt.Fprintf(&b, " <lora:%s:%.2g>", l.Name, l.Weight)
	}
	return b.String()
}

// expandGenerateWildcards rolls the wildcards in every prompt field of a request and
// reports whether any changed.
func (s *Server) expandGenerateWildcards(req *generateReq) bool {
	fields := []*string{&req.Prompt, &req.NegativePrompt, &req.Detailer.Prompt, &req.Detailer.NegativePrompt}
	for i := range req.Detailer.Custom {
		fields = append(fields, &req.Detailer.Custom[i].Prompt, &req.Detailer.Custom[i].NegativePrompt)
	}
	for i := range req.Regions.Parts {
		fields = append(fields, &req.Regions.Parts[i].Prompt)
	}
	needed := false
	for _, f := range fields {
		if strings.Contains(*f, "__") || strings.Contains(*f, "{") {
			needed = true
		}
	}
	if !needed {
		return false
	}
	lookup := s.wildcardLookup()
	rolled := false
	for _, f := range fields {
		if out, changed := imagegen.ExpandWildcards(*f, lookup, nil); changed {
			*f, rolled = out, true
		}
	}
	return rolled
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
	if len(req.Detailer.Models) > 4 {
		req.Detailer.Models = req.Detailer.Models[:4]
	}
	// ADetailer runs as many tabs as A1111's settings give it (two by default, up
	// to ten), so more passes than fit beside the faces and hands are trimmed here.
	if len(req.Detailer.Custom) > 6 {
		req.Detailer.Custom = req.Detailer.Custom[:6]
	}
	for i := range req.Detailer.Custom {
		p := &req.Detailer.Custom[i]
		p.Confidence = min(max(p.Confidence, 0), 1)
		p.Denoise = min(max(p.Denoise, 0), 1)
	}
	// Four people side by side is already a squeeze at SDXL's sizes.
	if len(req.Regions.Parts) > 4 {
		req.Regions.Parts = req.Regions.Parts[:4]
	}
	clampUpscale(req)
	if req.Count <= 0 {
		req.Count = 1
	}
	req.Count = clampInt(req.Count, 1, 8)
	if req.Seed == 0 {
		req.Seed = -1
	}
}

// clampUpscale keeps a hires fix to what a card can draw: 1–4×, the larger side
// no more than 4096 once enlarged, and a second pass that redraws enough to add
// detail without drawing a different picture.
func clampUpscale(req *generateReq) {
	up := &req.Upscale
	up.Upscaler = strings.TrimSpace(up.Upscaler)
	if up.Scale <= 1 {
		up.Scale = 2
	}
	up.Scale = min(up.Scale, 4, 4096/float64(max(req.Width, req.Height)))
	up.Scale = max(up.Scale, 1)
	up.Scale = math.Round(up.Scale*100) / 100
	if up.Denoise <= 0 {
		up.Denoise = 0.45
	}
	up.Denoise = min(up.Denoise, 1)
	up.Steps = clampInt(up.Steps, 0, 80)
	if up.Enabled && up.Upscaler == "" {
		up.Upscaler = "Latent"
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
	// Generators return PNG; a clip says what it is. safeInlineContentType keeps an
	// inline file safe on our origin; no-store keeps an unsaved preview from lingering
	// in a disk cache.
	ct := p.mime
	if ct == "" {
		ct = "image/png"
	}
	w.Header().Set("Content-Type", safeInlineContentType(ct))
	w.Header().Set("Cache-Control", "private, no-store")
	// ServeContent answers range requests, which a <video> makes to seek and which
	// Safari will not play a clip without.
	http.ServeContent(w, r, "", time.Time{}, bytes.NewReader(p.data))
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
	// Info is the client's complete record of how the image was made (the studio's
	// GenInfo), kept encrypted on the row so the picture can be opened in the studio
	// again with every control where it was. Opaque to the server. Optional.
	Info json.RawMessage `json:"info"`
}

// maxGenInfoBytes bounds the stored record; a real one is a kilobyte or two.
const maxGenInfoBytes = 64 << 10

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

	// A clip is filed as what its bytes are — a video, or an animated WebP/GIF — so it
	// gets a poster frame and plays in the viewer rather than sitting as a broken picture.
	kind := "image"
	if p.mime != "" {
		kind = string(recognize.KindFromBytes(p.data, ""))
	}
	title := req.Title
	if title == "" && kind != "image" {
		title = "Generated clip"
	} else if title == "" {
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
		Kind:     kind,
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
		s.processIngestAsync(id, put.RelPath, kind, put.Size, 0)
	}
	// The full recipe rides along when the client sent one. Only for a fresh row: a
	// duplicate save must not overwrite the record of the image that is already there.
	if !existed && len(req.Info) > 0 && len(req.Info) <= maxGenInfoBytes && json.Valid(req.Info) {
		if genEnc, err := crypto.SealBytes(s.kek, req.Info, []byte("generation")); err == nil {
			if err := s.db.SetGeneration(r.Context(), id, genEnc); err != nil {
				s.log.Debug("store generation record", "err", err)
			}
		}
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
	// Saved is moved: the picture kept in the gallery when it was made leaves it, as
	// one moved from the gallery's own panel does. The library row holds the file.
	if p.galleryID > 0 {
		if blob, thumb, ok, err := s.db.DeleteGenImage(r.Context(), p.galleryID); err == nil && ok {
			s.unlinkUnheld(r.Context(), blob, thumb)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "existed": existed})
}

// handleGetMediaGeneration answers "how was this made?" for a library image: the
// studio's stored record when the save carried one, and otherwise whatever the notes
// hold — which for anything generated here is the prompt. The studio loads either
// back into its controls, the record completely and the prompt alone as a start.
func (s *Server) handleGetMediaGeneration(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	out := map[string]any{"id": id, "kind": row.Kind, "title": s.decrypt(row.TitleEnc, "title"), "prompt": s.decrypt(row.NotesEnc, "notes")}
	if genEnc, err := s.db.Generation(r.Context(), id); err == nil && len(genEnc) > 0 {
		if raw, err := crypto.OpenBytes(s.kek, genEnc, []byte("generation")); err == nil && json.Valid(raw) {
			out["info"] = json.RawMessage(raw)
		}
	}
	tags, _ := s.db.TagsForMedia(r.Context(), id)
	names := make([]string, 0, len(tags))
	for _, t := range tags {
		names = append(names, t.Name)
	}
	out["tags"] = names
	writeJSON(w, http.StatusOK, out)
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
	s.overlayDetailDefaults(ctx, detail)
	writeJSON(w, http.StatusOK, detail)
}

type modelMetaPatch struct {
	Key            string    `json:"key"`
	Name           *string   `json:"name"`
	Description    *string   `json:"description"`
	TriggerPhrases *[]string `json:"triggerPhrases"`
	// Defaults is read twice: as settings, and for which of the fields kept on
	// this side (model_defaults.go) it names.
	Defaults json.RawMessage `json:"defaults"`
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
	defaults, named, err := decodeDefaultsPatch(req.Defaults)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid defaults")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	changes := imagegen.ModelChanges{
		Name:           req.Name,
		Description:    req.Description,
		TriggerPhrases: req.TriggerPhrases,
	}
	if defaults != nil {
		native := nativeDefaults(*defaults)
		changes.Defaults = &native
	}
	detail, err := s.imagegen.UpdateModel(ctx, set.ImageGenURL, req.Key, changes)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if defaults != nil {
		if err := s.saveExtraDefaults(ctx, detail.Key, *defaults, named); err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	s.overlayDetailDefaults(ctx, detail)
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
	if s.ownGallery(ctx, base) {
		s.ownGalleryBoards(w, r)
		return
	}
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
	if s.ownGallery(ctx, base) {
		s.ownGalleryCreateFolder(w, r, req.Name)
		return
	}
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
	if s.ownGallery(ctx, base) {
		s.ownGalleryDeleteFolder(w, r, id)
		return
	}
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
	if s.ownGallery(ctx, base) {
		s.ownGalleryImages(w, r, q.Get("board"), q.Get("sort"), offset, limit)
		return
	}
	page, err := s.imagegen.BoardImages(ctx, base, q.Get("board"), q.Get("sort"), offset, limit)
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
	if s.ownGallery(ctx, base) {
		s.ownGalleryServe(w, r, name, thumb)
		return
	}
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
	if s.ownGallery(ctx, base) {
		s.ownGalleryMetadata(w, r, name)
		return
	}
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
	if s.ownGallery(ctx, base) {
		if err := s.ownGalleryDelete(ctx, []string{name}); err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
		return
	}
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
	if s.ownGallery(ctx, base) {
		if err := s.ownGalleryDelete(ctx, req.Names); err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
		return
	}
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
	if s.ownGallery(ctx, base) {
		if err := s.ownGalleryMove(ctx, req.Board, req.Names); err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
		return
	}
	if err := s.imagegen.AddImagesToBoard(ctx, base, req.Board, req.Names); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

type gallerySaveReq struct {
	Name string `json:"name"`
	// Names moves several at once — this gallery's only; InvokeAI's are copied one
	// at a time.
	Names []string `json:"names"`
	Title string   `json:"title"`
	Tags  []string `json:"tags"`
}

// handleGallerySave copies one InvokeAI gallery image into the library: fetch the
// full PNG, store it encrypted, file it through the same ingest path as any other
// image, and keep the generation prompt (when InvokeAI recorded one) as notes. On
// A1111 the pictures are this server's own, and they are moved rather than copied:
// the library is where they go when they are worth keeping, and not before.
func (s *Server) handleGallerySave(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	var req gallerySaveReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || (req.Name == "" && len(req.Names) == 0) {
		writeErr(w, http.StatusBadRequest, "an image name is required")
		return
	}
	if len(req.Names) > 500 {
		writeErr(w, http.StatusBadRequest, "too many images in one request")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	if s.ownGallery(ctx, base) {
		s.ownGallerySave(w, r.WithContext(ctx), req)
		return
	}
	if req.Name == "" {
		writeErr(w, http.StatusBadRequest, "InvokeAI's pictures are saved one at a time")
		return
	}
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

// servePickerThumb reads the generator's cover art: InvokeAI's model manager, or the
// preview file A1111 keeps beside the model. The generator is the source of truth, so
// OppaiLib keeps no thumbnail of its own that could drift from it. A model the
// generator has no cover for but the catalogue does — an A1111 model linked by hash,
// in a folder this side cannot write to — shows the catalogue's picture instead.
func (s *Server) servePickerThumb(w http.ResponseWriter, r *http.Request, name string) {
	set := s.settings.Get()
	if set.ImageGenEnabled {
		ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
		defer cancel()
		data, ct, err := s.imagegen.Cover(ctx, set.ImageGenURL, name)
		if err != nil || len(data) == 0 {
			var ok bool
			if data, ct, ok = s.civitaiCoverFor(ctx, set.ImageGenURL, name); !ok {
				data = nil
			}
		}
		if len(data) > 0 {
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
	// GalleryName is a picture in the studio's gallery instead: one made a while ago,
	// whose preview has long expired, can still be a LoRA's or a model's cover.
	GalleryName string `json:"galleryName"`
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
		writeErr(w, http.StatusBadRequest, "custom thumbnail uploads are disabled; choose a generated preview")
		return
	}
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		writeErr(w, http.StatusServiceUnavailable, "image generation is not configured")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	var data []byte
	switch {
	case req.GalleryName != "":
		var err error
		if data, err = s.galleryPicture(ctx, set.ImageGenURL, req.GalleryName); err != nil {
			writeErr(w, http.StatusNotFound, err.Error())
			return
		}
	case req.PreviewID != "":
		p, ok := s.genCache.get(req.PreviewID)
		if !ok {
			writeErr(w, http.StatusNotFound, "preview expired or not found")
			return
		}
		data = p.data
	default:
		writeErr(w, http.StatusBadRequest, "previewId or galleryName is required")
		return
	}
	if len(data) == 0 || len(data) > maxModelThumbBytes {
		writeErr(w, http.StatusBadRequest, "image is empty or too large")
		return
	}
	if err := s.imagegen.UpdateCover(ctx, set.ImageGenURL, req.Model, data, http.DetectContentType(data)); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}
