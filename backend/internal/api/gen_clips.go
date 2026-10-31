package api

import (
	"context"
	"encoding/json"
	"errors"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/settings"
)

// Clips from the studio: a few seconds of video, from words or from a picture.
//
// The work is ComfyUI's, through the two workflows set up under Settings → Image
// generation → Video — each either Wan files picked there, which imagegen/comfy_wan.go
// wires, or a pasted workflow imagegen/comfy.go fills in. The Video studio picks files
// of its own the way the Image studio picks a checkpoint, starting from Settings', and
// sends them with each clip; Settings' are then only where it starts, and what her own
// clips (libby_clips.go) run. A finished clip is a preview like any other run, and on
// Automatic1111 it is kept in the studio's gallery beside the pictures (gen_gallery.go),
// so nothing reaches the library until it is saved.
//
// A clip takes minutes, longer than a reverse proxy holds a request open — and longer
// than Firefox does: it drops any request that has waited five minutes for an answer,
// as "NetworkError when attempting to fetch resource". So the studio asks for the clip
// detached: the call is answered 202 as soon as the request is checked, the clip is made
// under its job (imagegen_jobs.go), and the studio follows the job's progress polls to
// the result. A named call that is not detached still outlives its request, and the
// studio collects it from its last poll when the call is cut off.

type clipReq struct {
	JobID string `json:"jobId"`
	// From is "image" or "text": which of the two workflows runs.
	From           string `json:"from"`
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negativePrompt"`
	// InitImage is the picture to start from as a data URL; InitGallery names one in
	// the studio's gallery instead, so it is not sent back up to the server it is on.
	InitImage   string `json:"initImage"`
	InitGallery string `json:"initGallery"`
	// The knobs. Each fills its placeholder only when the workflow has one; zero is
	// "not sent", and the value written into the workflow stands.
	Width  int   `json:"width"`
	Height int   `json:"height"`
	Frames int   `json:"frames"`
	FPS    int   `json:"fps"`
	Steps  int   `json:"steps"`
	Seed   int64 `json:"seed"`
	// Loras are put on for this clip alone, over the ones Settings always puts on: a
	// built clip only, since a pasted workflow has its LoRAs written in.
	Loras []settings.ClipLora `json:"loras"`
	// Models are the files the studio picked, over Settings' own: the whole recipe,
	// its LoRAs and numbers too, so Loras above is not merged over them. Nil, or no
	// model in it, runs what Settings has.
	Models *settings.ClipModels `json:"models"`
	// Board is the gallery folder open beside the studio, which the clip is filed in.
	Board string `json:"board"`
	// Detach answers 202 at once and makes the clip under JobID; see the top.
	Detach bool `json:"detach"`
}

// genClip is a finished clip as the studio is given it: a preview, like a picture's,
// served at /api/imagegen/preview/{id}.
type genClip struct {
	ID   string `json:"id"`
	MIME string `json:"mime"`
	Seed int64  `json:"seed"`
	// Recipe is the steps, CFG and shift a built clip ran at, said under it.
	Recipe string `json:"recipe,omitempty"`
	// Gallery is its name in the studio's gallery when it was kept there.
	Gallery string `json:"gallery,omitempty"`
	// Width and Height are its frame size when known, which an upscale goes by.
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`
}

// clipStatus is what the studio is told: which workflows are set up and what each
// takes, so it shows the length slider only over a workflow with {{frames}} in it.
type clipStatus struct {
	Image *clipWorkflowStatus `json:"image,omitempty"`
	Text  *clipWorkflowStatus `json:"text,omitempty"`
}

type clipWorkflowStatus struct {
	Takes []string `json:"takes"`
	// For a built clip, the LoRAs Settings always puts on, and whether the model is
	// Wan 2.2's pair, whose LoRAs come in halves.
	Loras []settings.ClipLora `json:"loras,omitempty"`
	Pair  bool                `json:"pair,omitempty"`
	// Models is Settings' files for a built clip, which the studio starts from.
	Models *settings.ClipModels `json:"models,omitempty"`
	// Built is what a clip of files takes, for a studio that picks files of its own
	// over a pasted workflow, or over nothing set up at all.
	Built []string `json:"built"`
	// NeedsModel says Settings has neither files nor a workflow for this direction, so
	// a clip runs only once the studio picks a model.
	NeedsModel bool `json:"needsModel,omitempty"`
}

// clipsStatus is both directions once ComfyUI's address is set. A direction Settings
// has nothing for is still offered: the studio can pick its files, as the Image studio
// picks a checkpoint without Settings naming one.
func clipsStatus(set settings.Settings) clipStatus {
	var out clipStatus
	if strings.TrimSpace(set.LibbyClipURL) == "" {
		return out
	}
	out.Image = clipRecipeFor(set, true).status(set.LibbyClipURL, true)
	out.Text = clipRecipeFor(set, false).status(set.LibbyClipURL, false)
	return out
}

func (r clipRecipe) status(clipURL string, fromImage bool) *clipWorkflowStatus {
	st := &clipWorkflowStatus{Takes: r.takes(fromImage), Built: builtTakes(fromImage)}
	if !r.ready(clipURL) {
		st.Takes, st.NeedsModel = st.Built, true
		return st
	}
	if r.built() {
		models := r.models
		st.Loras = models.Loras
		st.Pair = models.LowModel != "" && !models.Checkpoint
		st.Models = &models
	}
	return st
}

// clipRecipe is how one direction of clip is made: Wan files picked in settings, or
// failing those a pasted workflow.
type clipRecipe struct {
	models   settings.ClipModels
	workflow string
}

func clipRecipeFor(set settings.Settings, fromImage bool) clipRecipe {
	if fromImage {
		return clipRecipe{set.ClipImageModels, set.LibbyClipWorkflow}
	}
	return clipRecipe{set.ClipTextModels, set.ClipTextWorkflow}
}

func (r clipRecipe) built() bool { return r.models.Model != "" }

func (r clipRecipe) ready(clipURL string) bool {
	return strings.TrimSpace(clipURL) != "" && (r.built() || strings.TrimSpace(r.workflow) != "")
}

// takes is what the drawer may set. A built clip takes every knob but steps, which
// belong with the models: a speed-up LoRA is only right at its own few steps, and a
// slider left at 20 in the drawer would undo it.
func (r clipRecipe) takes(fromImage bool) []string {
	if !r.built() {
		return imagegen.ComfyPlaceholders(r.workflow)
	}
	return builtTakes(fromImage)
}

// builtTakes is what the drawer may set on a clip of picked files.
func builtTakes(fromImage bool) []string {
	knobs := []string{"prompt", "negative", "seed", "width", "height", "frames", "fps", "loras"}
	if fromImage {
		return append([]string{"image"}, knobs...)
	}
	return knobs
}

// run makes the clip, from the same vars a pasted workflow's placeholders take, with
// any LoRAs picked for this clip alone.
func (r clipRecipe) run(ctx context.Context, gen *imagegen.Client, clipURL string, vars map[string]string, extra []settings.ClipLora, init []byte, progress func(imagegen.Progress)) ([]imagegen.ComfyOutput, error) {
	if !r.built() {
		return gen.RunComfyWorkflow(ctx, clipURL, r.workflow, vars, init, progress)
	}
	return gen.RunWanClip(ctx, clipURL, r.wanClip(vars, extra), init, progress)
}

// recipe is the numbers a built clip runs at, or "" for a pasted workflow, whose
// numbers are its own.
func (r clipRecipe) recipe(vars map[string]string, extra []settings.ClipLora) string {
	if !r.built() {
		return ""
	}
	return r.wanClip(vars, extra).Recipe()
}

func (r clipRecipe) wanClip(vars map[string]string, extra []settings.ClipLora) imagegen.WanClip {
	m := r.models
	clip := imagegen.WanClip{
		Model: m.Model, Checkpoint: m.Checkpoint, LowModel: m.LowModel, TextEncoder: m.TextEncoder, VAE: m.VAE,
		Steps: m.Steps, CFG: m.CFG, Shift: m.Shift, Sampler: m.Sampler, Scheduler: m.Scheduler,
		Prompt: vars["prompt"], Negative: vars["negative"],
	}
	set := clip
	set.Loras = wanLoras(m.Loras)
	clip.Loras = wanLoras(mergeClipLoras(m.Loras, extra))
	// A speed LoRA put on in the studio brings its steps and CFG along, as adding one in
	// Settings does: numbers typed for a full-strength model would burn it. Settings
	// that are already distilled keep whatever they say.
	if clip.Distilled() && !set.Distilled() {
		clip.Steps, clip.CFG = 0, 0
	}
	clip.Seed, _ = strconv.ParseInt(vars["seed"], 10, 64)
	clip.Width, _ = strconv.Atoi(vars["width"])
	clip.Height, _ = strconv.Atoi(vars["height"])
	clip.Frames, _ = strconv.Atoi(vars["frames"])
	clip.FPS, _ = strconv.Atoi(vars["fps"])
	return clip
}

func wanLoras(in []settings.ClipLora) []imagegen.WanLora {
	out := make([]imagegen.WanLora, 0, len(in))
	for _, l := range in {
		out = append(out, imagegen.WanLora{Name: l.Name, Weight: l.Weight, Stage: l.Stage})
	}
	return out
}

// maxClipLoras bounds the LoRAs on one clip, Settings' and the studio's together.
const maxClipLoras = settings.MaxClipLoras

// mergeClipLoras is Settings' LoRAs with the studio's picks over them: a pick of one
// already there sets its weight for this clip, and the rest are added after.
func mergeClipLoras(base, extra []settings.ClipLora) []settings.ClipLora {
	out := append([]settings.ClipLora{}, base...)
	at := map[string]int{}
	for i, l := range out {
		at[l.Name] = i
	}
	for _, l := range extra {
		l.Name = strings.TrimSpace(l.Name)
		if l.Name == "" {
			continue
		}
		l.Weight = min(max(l.Weight, -2), 2)
		if l.Stage != "high" && l.Stage != "low" {
			l.Stage = ""
		}
		if i, ok := at[l.Name]; ok {
			out[i].Weight = l.Weight
			continue
		}
		if len(out) >= maxClipLoras {
			break
		}
		at[l.Name] = len(out)
		out = append(out, l)
	}
	return out
}

// handleComfyModels lists what the saved ComfyUI has for the settings screen's pickers.
// Unreachable is a 502, never a 401: see the web client's sign-out on 401.
func (s *Server) handleComfyModels(w http.ResponseWriter, r *http.Request) {
	set := s.settings.Get()
	if strings.TrimSpace(set.LibbyClipURL) == "" {
		writeErr(w, http.StatusConflict, "give ComfyUI's address and save first")
		return
	}
	// The first call is the one a firewall would hang, so it is the reachability probe
	// the Test makes, with its limit and its explanation.
	if _, err := s.comfyReach(r.Context(), set.LibbyClipURL); err != nil {
		writeErr(w, http.StatusBadGateway, comfyUnreachable(set.LibbyClipURL, err))
		return
	}
	models, err := s.imagegen.ListComfyModels(r.Context(), set.LibbyClipURL)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, models)
}

// clipVars is what fills the workflow's placeholders. Sizes go down to a multiple of
// 16, which every video model's latent wants; the bounds are where a typo would
// otherwise queue an hour's render.
func clipVars(req clipReq) map[string]string {
	vars := map[string]string{
		"prompt":   strings.TrimSpace(req.Prompt),
		"negative": strings.TrimSpace(req.NegativePrompt),
		"seed":     strconv.FormatInt(req.Seed, 10),
	}
	put := func(key string, v, lo, hi, step int) {
		if v > 0 {
			vars[key] = strconv.Itoa(clampInt(v, lo, hi) / step * step)
		}
	}
	put("width", req.Width, 64, 2048, 16)
	put("height", req.Height, 64, 2048, 16)
	put("frames", req.Frames, 1, 1025, 1)
	put("fps", req.FPS, 1, 120, 1)
	put("steps", req.Steps, 1, 200, 1)
	return vars
}

func (s *Server) handleImageGenClip(w http.ResponseWriter, r *http.Request) {
	set := s.settings.Get()
	var req clipReq
	// A picture to start from rides in the body, so the cap is a large PNG's worth.
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<20)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	fromImage := req.From == "image"
	recipe, extra := clipRecipeFor(set, fromImage), req.Loras
	if req.Models != nil && strings.TrimSpace(req.Models.Model) != "" {
		recipe, extra = clipRecipe{models: settings.CleanClipModels(*req.Models)}, nil
	}
	if !recipe.ready(set.LibbyClipURL) {
		what := "words"
		if fromImage {
			what = "a picture"
		}
		writeErr(w, http.StatusConflict, "clips from "+what+" have no model: pick one in the Video studio, or in Settings → Image generation → Video")
		return
	}
	req.Prompt = strings.TrimSpace(req.Prompt)
	if !fromImage && req.Prompt == "" {
		writeErr(w, http.StatusBadRequest, "say what the clip should show")
		return
	}
	var init []byte
	if fromImage {
		var err error
		if req.InitGallery != "" && req.InitImage == "" {
			init, err = s.galleryPicture(r.Context(), set.ImageGenURL, req.InitGallery)
		} else {
			init, err = decodeDataImage(req.InitImage)
		}
		if err != nil || len(init) == 0 {
			writeErr(w, http.StatusBadRequest, "a picture to start from is required")
			return
		}
	}
	if req.Seed <= 0 {
		req.Seed = rand.Int63n(1 << 32)
	}

	vars := clipVars(req)
	s.serveClipJob(w, r, req.JobID, req.Detach, "clip", func(ctx context.Context, report func(imagegen.Progress)) (genResult, error) {
		outs, err := recipe.run(ctx, s.imagegen, set.LibbyClipURL, vars, extra, init, report)
		if err != nil {
			return genResult{}, err
		}
		out := outs[0]
		mime := safeInlineContentType(out.MIME)
		rec := clipRecord(req, recipe, vars, extra, init)
		clip := &genClip{MIME: mime, Seed: req.Seed, Recipe: rec.Clip.Recipe, Width: rec.Width, Height: rec.Height}
		preview := &genPreview{data: out.Data, mime: mime, prompt: req.Prompt, negative: req.NegativePrompt, seed: req.Seed, model: rec.Model}
		s.keepClip(ctx, set, req.Board, out, rec, init, preview, clip)
		clip.ID = s.genCache.put(preview)
		return genResult{Images: []genResultImage{}, Prompt: req.Prompt, Positive: req.Prompt, Negative: req.NegativePrompt, Clip: clip}, nil
	})
}

// serveClipJob makes a clip, or an enlargement of one, under its job: answering with it
// when the call waits, or 202 at once when detached, the work going on without the
// request. Either way the card is lent for the work, not the request: a proxy that
// cuts the call off does not stop ComfyUI, and her model must not come back onto the
// card mid-render. The image generator's checkpoint steps off it too, unless Settings
// keeps it. what names the work in its errors.
func (s *Server) serveClipJob(w http.ResponseWriter, r *http.Request, jobID string, detach bool, what string,
	work func(ctx context.Context, report func(imagegen.Progress)) (genResult, error)) {
	named := genJobIDPattern.MatchString(jobID)
	if detach && !named {
		writeErr(w, http.StatusBadRequest, "a detached "+what+" needs a job id to be followed by")
		return
	}
	ctx := r.Context()
	var job *genJob
	if named {
		ctx, job = s.genJobs.start(context.WithoutCancel(r.Context()), jobID)
	}
	run := func() (genResult, int, string) {
		ctx, cancel := context.WithTimeout(ctx, clipTimeout)
		defer cancel()
		release := s.lendCardToVideo(ctx)
		defer release()
		res, err := work(ctx, func(p imagegen.Progress) {
			if job != nil {
				job.report(p)
			}
		})
		if err == nil {
			if job != nil {
				job.succeed(res)
			}
			return res, http.StatusOK, ""
		}
		if job != nil && job.wasCancelled() {
			job.fail("generation cancelled")
			return res, http.StatusConflict, "generation cancelled"
		}
		msg := err.Error()
		if errors.Is(err, context.DeadlineExceeded) {
			msg = "the " + what + " took longer than a quarter of an hour and was stopped"
		}
		s.log.Warn(what, "err", err)
		if job != nil {
			job.fail(msg)
		}
		return res, http.StatusBadGateway, msg
	}
	if detach {
		go func() {
			defer s.genJobs.finish(jobID, job)
			// Nothing above it would recover a panic here, and the whole server would go
			// down with the clip; the job says what happened instead.
			defer func() {
				if p := recover(); p != nil {
					s.log.Error(what+" panicked", "panic", p)
					job.fail("the " + what + " failed inside OppaiLib — the server log has the details")
				}
			}()
			run()
		}()
		writeJSON(w, http.StatusAccepted, map[string]any{"jobId": jobID, "accepted": true})
		return
	}
	if job != nil {
		defer s.genJobs.finish(jobID, job)
	}
	res, status, msg := run()
	if status != http.StatusOK {
		writeErr(w, status, msg)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

// keepClip files a finished clip in the studio's gallery, as a picture is as it comes
// back — on Automatic1111, whose gallery is OppaiLib's; InvokeAI's boards hold pictures
// alone, and there it stays a preview until saved. still is the picture it started
// from, the tile when ffmpeg cannot take one. The preview and the result are told
// where it went.
func (s *Server) keepClip(ctx context.Context, set settings.Settings, board string, out imagegen.ComfyOutput, rec genRecord, still []byte, preview *genPreview, clip *genClip) {
	if !set.ImageGenEnabled || !s.ownGallery(ctx, set.ImageGenURL) {
		return
	}
	g, err := s.keepGenClip(ctx, out.Data, safeInlineContentType(out.MIME), s.genFolderOf(ctx, board), rec, still)
	if err != nil {
		s.log.Warn("studio gallery: keep clip", "err", err)
		return
	}
	preview.galleryID = g.ID
	clip.Gallery = strconv.FormatInt(g.ID, 10)
	clip.Width, clip.Height = int(g.Width), int(g.Height)
}

// clipRecord is how a clip was made, as the gallery keeps it: the files and numbers it
// ran at for a built clip, the knobs alone for a pasted workflow's.
func clipRecord(req clipReq, recipe clipRecipe, vars map[string]string, extra []settings.ClipLora, init []byte) genRecord {
	from := "text"
	if req.From == "image" {
		from = "image"
	}
	rec := genRecord{
		Prompt: req.Prompt, NegativePrompt: req.NegativePrompt, Seed: req.Seed,
		Loras: []imagegen.ImageMetadataLora{}, Triggers: []string{}, Characters: []string{},
		Backend: "comfyui", At: time.Now().UnixMilli(),
		Clip: &genRecordClip{From: from},
	}
	rec.Width, _ = strconv.Atoi(vars["width"])
	rec.Height, _ = strconv.Atoi(vars["height"])
	rec.Clip.Frames, _ = strconv.Atoi(vars["frames"])
	rec.Clip.FPS, _ = strconv.Atoi(vars["fps"])
	rec.Steps, _ = strconv.Atoi(vars["steps"])
	if !recipe.built() {
		return rec
	}
	w := recipe.wanClip(vars, extra)
	rec.Clip.Recipe = w.Recipe()
	w = w.Settled()
	rec.Width, rec.Height = w.Size(init)
	rec.Model, rec.VAE, rec.Sampler, rec.Steps, rec.CfgScale = w.Model, w.VAE, w.Sampler, w.Steps, w.CFG
	rec.Clip.LowModel, rec.Clip.TextEncoder, rec.Clip.Shift, rec.Clip.Scheduler = w.LowModel, w.TextEncoder, w.Shift, w.Scheduler
	for _, l := range w.Loras {
		if l.Name != "" && l.Weight != 0 {
			rec.Loras = append(rec.Loras, imagegen.ImageMetadataLora{Name: l.Name, Weight: l.Weight})
		}
	}
	return rec
}

// ── enlarging a finished clip ───────────────────────────────────────────────

type clipUpscaleReq struct {
	JobID string `json:"jobId"`
	// The clip, by its name in the studio's gallery or by its preview's id.
	Gallery string `json:"gallery"`
	ID      string `json:"id"`
	// Upscaler is an upscale model as ComfyUI lists it; blank resizes alone.
	Upscaler string  `json:"upscaler"`
	Scale    float64 `json:"scale"`
	Board    string  `json:"board"`
	Detach   bool    `json:"detach"`
}

// clipVideoExt is the extension ComfyUI's video loader knows a clip of this type by.
// A GIF or an animated WebP is a picture to it, and it will not take one.
func clipVideoExt(mime string) (string, bool) {
	switch strings.ToLower(mime) {
	case "video/mp4":
		return ".mp4", true
	case "video/webm":
		return ".webm", true
	case "video/quicktime":
		return ".mov", true
	}
	return "", false
}

// handleClipUpscale enlarges a finished clip through ComfyUI. The enlarged clip is a
// new one beside it — a preview, and kept in the gallery as clips are — so the
// original is there to compare against and to go back to.
func (s *Server) handleClipUpscale(w http.ResponseWriter, r *http.Request) {
	set := s.settings.Get()
	if strings.TrimSpace(set.LibbyClipURL) == "" {
		writeErr(w, http.StatusConflict, "clips are not set up: Settings → Image generation → Video")
		return
	}
	var req clipUpscaleReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Scale <= 1 || req.Scale > imagegen.MaxClipUpscale {
		writeErr(w, http.StatusBadRequest, "a clip can be enlarged by more than 1× and up to 4×")
		return
	}
	src, ok := s.clipToUpscale(w, r, set, req)
	if !ok {
		return
	}
	ext, ok := clipVideoExt(src.mime)
	if !ok {
		writeErr(w, http.StatusBadRequest, "only a video clip can be enlarged — ComfyUI reads a GIF or a WebP as a picture")
		return
	}

	up := imagegen.ClipUpscale{Model: strings.TrimSpace(req.Upscaler), Scale: req.Scale, Width: src.width, Height: src.height}
	s.serveClipJob(w, r, req.JobID, req.Detach, "upscale", func(ctx context.Context, report func(imagegen.Progress)) (genResult, error) {
		outs, err := s.imagegen.RunClipUpscale(ctx, set.LibbyClipURL, src.data, ext, up, report)
		if err != nil {
			return genResult{}, err
		}
		return s.upscaledClip(ctx, set, req, src, up, outs[0]), nil
	})
}

// upscaledClip files an enlarged clip and says what it is: a preview, kept in the
// gallery beside the clip it came from, with that clip's record and how it was enlarged.
func (s *Server) upscaledClip(ctx context.Context, set settings.Settings, req clipUpscaleReq, src clipSource, up imagegen.ClipUpscale, out imagegen.ComfyOutput) genResult {
	mime := safeInlineContentType(out.MIME)
	rec := src.record
	by := up.Model
	if by == "" {
		by = "lanczos"
	}
	rec.Upscaled = &genRecordUpscale{Upscaler: by, Scale: up.Scale}
	if rec.Clip == nil {
		rec.Clip = &genRecordClip{}
	}
	rec.Clip.Recipe, rec.Clip.Source = up.Recipe(), req.Gallery
	if up.Width > 0 && up.Height > 0 {
		rec.Width, rec.Height = imagegen.ClipUpscaleSize(up.Width, up.Height, up.Scale)
	}
	rec.At = time.Now().UnixMilli()
	clip := &genClip{MIME: mime, Seed: rec.Seed, Recipe: up.Recipe(), Width: rec.Width, Height: rec.Height}
	preview := &genPreview{data: out.Data, mime: mime, prompt: rec.Prompt, negative: rec.NegativePrompt, seed: rec.Seed, model: rec.Model}
	s.keepClip(ctx, set, req.Board, out, rec, src.still, preview, clip)
	clip.ID = s.genCache.put(preview)
	return genResult{Images: []genResultImage{}, Prompt: rec.Prompt, Positive: rec.Prompt, Negative: rec.NegativePrompt, Clip: clip}
}

// clipSource is a clip to enlarge, with what is known of it.
type clipSource struct {
	data          []byte
	mime          string
	width, height int
	record        genRecord
	// still is its gallery tile, for the enlarged clip's when ffmpeg cannot take one.
	still []byte
}

// clipToUpscale reads the clip an upscale names: from the gallery, which keeps its
// record and size, or from its preview, which keeps only the prompt and seed. It
// writes the error itself when there is none.
func (s *Server) clipToUpscale(w http.ResponseWriter, r *http.Request, set settings.Settings, req clipUpscaleReq) (clipSource, bool) {
	base := genRecord{Loras: []imagegen.ImageMetadataLora{}, Triggers: []string{}, Characters: []string{}, Backend: "comfyui"}
	if req.Gallery != "" {
		if !set.ImageGenEnabled || !s.ownGallery(r.Context(), set.ImageGenURL) {
			writeErr(w, http.StatusConflict, "this gallery keeps no clips")
			return clipSource{}, false
		}
		g, err := s.genImageNamed(r.Context(), req.Gallery)
		if err != nil {
			writeErr(w, http.StatusNotFound, err.Error())
			return clipSource{}, false
		}
		if !isClip(g) {
			writeErr(w, http.StatusBadRequest, "that is a picture, not a clip")
			return clipSource{}, false
		}
		data, err := s.genImageBytes(g, false)
		if err != nil {
			writeErr(w, http.StatusNotFound, err.Error())
			return clipSource{}, false
		}
		src := clipSource{data: data, mime: g.MIME, width: int(g.Width), height: int(g.Height), record: base}
		if raw := s.genInfo(g); raw != nil {
			_ = json.Unmarshal(raw, &src.record)
		}
		if g.ThumbPath != "" {
			src.still, _ = s.genImageBytes(g, true)
		}
		return src, true
	}
	p, ok := s.genCache.get(req.ID)
	if !ok || p.mime == "" {
		writeErr(w, http.StatusNotFound, "that clip is no longer here — previews are kept for a few hours")
		return clipSource{}, false
	}
	base.Prompt, base.NegativePrompt, base.Seed, base.Model = p.prompt, p.negative, p.seed, p.model
	base.Clip = &genRecordClip{}
	return clipSource{data: p.data, mime: p.mime, record: base}, true
}
