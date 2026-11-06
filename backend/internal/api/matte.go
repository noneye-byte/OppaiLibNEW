package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/matte"
)

// Background removal, for sprites and clips (internal/matte).
//
// A picture's cut is quick enough to answer in the call: the sprite editor sends the
// picture it has open and gets the model's mask back, which it takes as the starting
// mask its brushes then correct. A clip's is a frame at a time on the CPU — minutes for
// a long one — so it runs as a clip's enlargement does, detached and followed by its
// job, and lands beside the clip it came from as a take of its own.

// matteMaxBytes bounds a picture sent to be cut; a sprite square is a few megabytes.
const matteMaxBytes = 40 << 20

// matteProblem says why background removal cannot run here, "" when it can.
func (s *Server) matteProblem() string { return s.matte.Problem() }

// handleMatte answers a picture with its mask: a greyscale PNG at the picture's size,
// white where she is. ?cut=1 answers with the cut-out picture instead.
func (s *Server) handleMatte(w http.ResponseWriter, r *http.Request) {
	if p := s.matteProblem(); p != "" {
		writeErr(w, http.StatusConflict, p)
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, matteMaxBytes))
	if err != nil || len(data) == 0 {
		writeErr(w, http.StatusBadRequest, "send the picture, up to 40 MB")
		return
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "that isn't a picture this server reads (PNG, JPEG, WebP or GIF)")
		return
	}
	if b := img.Bounds(); b.Dx() > 8192 || b.Dy() > 8192 {
		writeErr(w, http.StatusBadRequest, "the picture is larger than 8192 pixels on a side")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()
	mask, err := s.matte.Mask(ctx, img)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return
		}
		status := http.StatusInternalServerError
		if errors.Is(err, matte.ErrUnavailable) {
			status = http.StatusConflict
		}
		writeErr(w, status, err.Error())
		return
	}
	var out bytes.Buffer
	if r.URL.Query().Get("cut") == "1" {
		err = png.Encode(&out, matte.Cut(img, mask))
	} else {
		err = png.Encode(&out, mask)
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(out.Bytes())
}

type clipMatteReq struct {
	JobID string `json:"jobId"`
	// The clip, by its name in the studio's gallery or by its preview's id.
	Gallery string `json:"gallery"`
	ID      string `json:"id"`
	// Outfit is a wardrobe square's stored clip, in place of the two above.
	Outfit *outfitClipRef `json:"outfit,omitempty"`
	Board  string         `json:"board"`
	// NoGallery is as on clipReq: a sprite square's clip, cut on its way to the wardrobe.
	NoGallery bool `json:"noGallery"`
	Detach    bool `json:"detach"`
}

// handleClipMatte cuts the background off a finished clip. The cut clip is a new one
// beside it, as an enlargement is, so the original is there to go back to.
func (s *Server) handleClipMatte(w http.ResponseWriter, r *http.Request) {
	if p := s.matteProblem(); p != "" {
		writeErr(w, http.StatusConflict, p)
		return
	}
	var req clipMatteReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	set := s.settings.Get()
	src, ok := s.clipToUpscale(w, r, set, clipUpscaleReq{Gallery: req.Gallery, ID: req.ID, Outfit: req.Outfit})
	if !ok {
		return
	}
	ext, ok := clipVideoExt(src.mime)
	if !ok {
		writeErr(w, http.StatusBadRequest, "only a video clip can have its background cut — a GIF or WebP is a picture")
		return
	}
	s.serveLongJob(w, r, req.JobID, req.Detach, "background cut", nil, func(ctx context.Context, report func(imagegen.Progress)) (genResult, error) {
		data, err := s.matte.CutClip(ctx, src.data, ext, func(done float64) { report(imagegen.Progress{Percent: done}) })
		if err != nil {
			return genResult{}, err
		}
		return s.cutClip(ctx, req, src, data), nil
	})
}

// cutClip files a clip with its background cut away: a preview, kept in the gallery
// beside the clip it came from, with that clip's record.
func (s *Server) cutClip(ctx context.Context, req clipMatteReq, src clipSource, data []byte) genResult {
	set := s.settings.Get()
	const mime = "video/webm"
	rec := src.record
	if rec.Clip == nil {
		rec.Clip = &genRecordClip{}
	}
	recipe := "background removed"
	if prev := strings.TrimSpace(rec.Clip.Recipe); prev != "" {
		recipe = prev + " · " + recipe
	}
	rec.Clip.Recipe, rec.Clip.Source, rec.Clip.Cutout = recipe, req.Gallery, true
	if rec.Width == 0 && src.width > 0 {
		rec.Width, rec.Height = src.width, src.height
	}
	rec.At = time.Now().UnixMilli()
	out := imagegen.ComfyOutput{Data: data, Name: "cutout.webm", MIME: mime}
	clip := &genClip{MIME: mime, Seed: rec.Seed, Recipe: recipe, Width: rec.Width, Height: rec.Height, Cutout: true}
	preview := &genPreview{data: data, mime: mime, prompt: rec.Prompt, negative: rec.NegativePrompt, seed: rec.Seed, model: rec.Model}
	if !req.NoGallery {
		s.keepClip(ctx, set, req.Board, out, rec, src.still, preview, clip)
	}
	clip.ID = s.genCache.put(preview)
	return genResult{Images: []genResultImage{}, Prompt: rec.Prompt, Positive: rec.Prompt, Negative: rec.NegativePrompt, Clip: clip}
}
