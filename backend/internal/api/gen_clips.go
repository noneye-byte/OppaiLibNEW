package api

import (
	"context"
	"encoding/json"
	"errors"
	"math/rand"
	"net/http"
	"strconv"
	"strings"

	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/settings"
)

// Clips from the studio: a few seconds of video, from words or from a picture.
//
// The work is ComfyUI's, through the two workflows set up under Settings → Image
// generation → Video — each either Wan files picked there, which imagegen/comfy_wan.go
// wires, or a pasted workflow imagegen/comfy.go fills in; this side picks the workflow,
// fills in what the studio asked for and keeps the result as a preview like any other
// run, so nothing reaches the library until it is saved. Her own clips
// (libby_clips.go) use the same server and the same picture workflow.
//
// A clip takes minutes, longer than a reverse proxy holds a request open. A named run
// is detached from its request the way a picture's is (imagegen_jobs.go), and the
// studio collects the clip from its last poll when the call itself is cut off.

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
}

// genClip is a finished clip as the studio is given it: a preview, like a picture's,
// served at /api/imagegen/preview/{id}.
type genClip struct {
	ID   string `json:"id"`
	MIME string `json:"mime"`
	Seed int64  `json:"seed"`
	// Recipe is the steps, CFG and shift a built clip ran at, said under it.
	Recipe string `json:"recipe,omitempty"`
}

// clipStatus is what the studio is told: which workflows are set up and what each
// takes, so it shows the length slider only over a workflow with {{frames}} in it.
type clipStatus struct {
	Image *clipWorkflowStatus `json:"image,omitempty"`
	Text  *clipWorkflowStatus `json:"text,omitempty"`
}

type clipWorkflowStatus struct {
	Takes []string `json:"takes"`
	// For a built clip, the LoRAs Settings always puts on, which the studio shows above
	// its own picks, and whether the model is Wan 2.2's pair, whose LoRAs come in halves.
	Loras []settings.ClipLora `json:"loras,omitempty"`
	Pair  bool                `json:"pair,omitempty"`
}

func clipsStatus(set settings.Settings) clipStatus {
	var out clipStatus
	if r := clipRecipeFor(set, true); r.ready(set.LibbyClipURL) {
		out.Image = r.status(true)
	}
	if r := clipRecipeFor(set, false); r.ready(set.LibbyClipURL) {
		out.Text = r.status(false)
	}
	return out
}

func (r clipRecipe) status(fromImage bool) *clipWorkflowStatus {
	st := &clipWorkflowStatus{Takes: r.takes(fromImage)}
	if r.built() {
		st.Loras = r.models.Loras
		st.Pair = r.models.LowModel != "" && !r.models.Checkpoint
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
		Steps: m.Steps, CFG: m.CFG, Shift: m.Shift, Prompt: vars["prompt"], Negative: vars["negative"],
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

// maxClipLoras bounds the LoRAs on one clip, Settings' and the studio's together. A
// pair's LoRA is two files, and each is another model ComfyUI loads per expert.
const maxClipLoras = 16

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
	recipe := clipRecipeFor(set, fromImage)
	if !recipe.ready(set.LibbyClipURL) {
		what := "words"
		if fromImage {
			what = "a picture"
		}
		writeErr(w, http.StatusConflict, "clips from "+what+" are not set up: Settings → Image generation → Video")
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

	ctx := r.Context()
	var job *genJob
	if genJobIDPattern.MatchString(req.JobID) {
		ctx, job = s.genJobs.start(context.WithoutCancel(r.Context()), req.JobID)
		defer s.genJobs.finish(req.JobID, job)
	}
	ctx, cancel := context.WithTimeout(ctx, clipTimeout)
	defer cancel()
	// The card is lent for the clip, not the request: a proxy that cuts the call off
	// does not stop ComfyUI, and her model must not come back onto the card mid-render.
	release := s.lendCardToImages(ctx)
	defer release()
	vars := clipVars(req)
	outs, err := recipe.run(ctx, s.imagegen, set.LibbyClipURL, vars, req.Loras, init, func(p imagegen.Progress) {
		if job != nil {
			job.report(p)
		}
	})
	if err != nil {
		if job != nil && job.wasCancelled() {
			job.fail("generation cancelled")
			writeErr(w, http.StatusConflict, "generation cancelled")
			return
		}
		msg := err.Error()
		if errors.Is(err, context.DeadlineExceeded) {
			msg = "the clip took longer than a quarter of an hour and was stopped"
		}
		s.log.Warn("clip", "err", err)
		if job != nil {
			job.fail(msg)
		}
		writeErr(w, http.StatusBadGateway, msg)
		return
	}
	out := outs[0]
	mime := safeInlineContentType(out.MIME)
	id := s.genCache.put(&genPreview{
		data: out.Data, mime: mime, prompt: req.Prompt, negative: req.NegativePrompt, seed: req.Seed,
	})
	result := genResult{
		Images: []genResultImage{}, Prompt: req.Prompt, Positive: req.Prompt, Negative: req.NegativePrompt,
		Clip: &genClip{ID: id, MIME: mime, Seed: req.Seed, Recipe: recipe.recipe(vars, req.Loras)},
	}
	if job != nil {
		job.succeed(result)
	}
	writeJSON(w, http.StatusOK, result)
}
