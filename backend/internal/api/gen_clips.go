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
// generation → Video, and imagegen/comfy.go runs them; this side picks the workflow,
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
}

// genClip is a finished clip as the studio is given it: a preview, like a picture's,
// served at /api/imagegen/preview/{id}.
type genClip struct {
	ID   string `json:"id"`
	MIME string `json:"mime"`
	Seed int64  `json:"seed"`
}

// clipStatus is what the studio is told: which workflows are set up and what each
// takes, so it shows the length slider only over a workflow with {{frames}} in it.
type clipStatus struct {
	Image *clipWorkflowStatus `json:"image,omitempty"`
	Text  *clipWorkflowStatus `json:"text,omitempty"`
}

type clipWorkflowStatus struct {
	Takes []string `json:"takes"`
}

func clipsStatus(set settings.Settings) clipStatus {
	var out clipStatus
	if clipsEnabled(set.LibbyClipURL, set.LibbyClipWorkflow) {
		out.Image = &clipWorkflowStatus{Takes: imagegen.ComfyPlaceholders(set.LibbyClipWorkflow)}
	}
	if clipsEnabled(set.LibbyClipURL, set.ClipTextWorkflow) {
		out.Text = &clipWorkflowStatus{Takes: imagegen.ComfyPlaceholders(set.ClipTextWorkflow)}
	}
	return out
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
	workflow := set.ClipTextWorkflow
	if fromImage {
		workflow = set.LibbyClipWorkflow
	}
	if !clipsEnabled(set.LibbyClipURL, workflow) {
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
	outs, err := s.imagegen.RunComfyWorkflow(ctx, set.LibbyClipURL, workflow, clipVars(req), init, func(p imagegen.Progress) {
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
		Clip: &genClip{ID: id, MIME: mime, Seed: req.Seed},
	}
	if job != nil {
		job.succeed(result)
	}
	writeJSON(w, http.StatusOK, result)
}
