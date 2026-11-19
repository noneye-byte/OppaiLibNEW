package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/png"
	"io"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/matte"
	"github.com/youruser/oppailib/internal/settings"
)

// Background removal, for sprites and clips (internal/matte).
//
// A picture's cut is quick enough to answer in the call: the sprite editor sends the
// picture it has open and gets the model's mask back, which it takes as the starting
// mask its brushes then correct. A clip's is a frame at a time on the CPU — minutes for
// a long one — so it runs as a clip's enlargement does, detached and followed by its
// job, and lands beside the clip it came from as a take of its own.
//
// A clip can instead be cut in ComfyUI, on the card, when Settings say so
// (ClipCutComfy): the ComfyUI-RMBG nodes put her on a flat screen and the screen is
// keyed out here, so the model is not needed for it, only ffmpeg. Which screen is the
// one she was drawn on, green unless that was blue: a screen is chosen to be a colour
// she is not.

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
	// Grid is a pixel-art sprite's cells, which every cut frame is put back on: see
	// matte/grid.go.
	Grid *matte.Grid `json:"grid,omitempty"`
}

// clipCutProblem says why a clip cannot have its background cut, "" when it can.
func (s *Server) clipCutProblem(set settings.Settings) string {
	if !set.ClipCutComfy {
		return s.matteProblem()
	}
	if strings.TrimSpace(set.LibbyClipURL) == "" {
		return "cutting clips in ComfyUI needs its address — set it under Image generation → Video"
	}
	if name := clipCutModel(set); !slices.ContainsFunc(imagegen.ClipCutModels, func(m imagegen.ClipCutModel) bool { return m.Name == name }) {
		return fmt.Sprintf("%q is not one of the models a clip can be cut with — pick one under Image generation → Video", name)
	}
	return matte.ToolsProblem()
}

// clipCutModel is the ComfyUI model Settings cut clips with.
func clipCutModel(set settings.Settings) string {
	if set.ClipCutModel == "" {
		return imagegen.DefaultClipCutModel
	}
	return set.ClipCutModel
}

// clipCutBy names what cuts a clip, for the studio to say so.
func clipCutBy(set settings.Settings) string {
	if set.ClipCutComfy {
		return "comfy"
	}
	return "server"
}

// handleClipMatte cuts the background off a finished clip. The cut clip is a new one
// beside it, as an enlargement is, so the original is there to go back to.
func (s *Server) handleClipMatte(w http.ResponseWriter, r *http.Request) {
	set := s.settings.Get()
	if p := s.clipCutProblem(set); p != "" {
		writeErr(w, http.StatusConflict, p)
		return
	}
	var req clipMatteReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	var cut matte.ClipCut
	if req.Grid != nil {
		if req.Grid.Cols > 4096 || req.Grid.Rows > 4096 || req.Grid.Cols < 0 || req.Grid.Rows < 0 {
			writeErr(w, http.StatusBadRequest, "a pixel grid is up to 4096 cells a side")
			return
		}
		cut.Grid = *req.Grid
	}
	src, ok := s.clipToUpscale(w, r, set, clipUpscaleReq{Gallery: req.Gallery, ID: req.ID, Outfit: req.Outfit})
	if !ok {
		return
	}
	ext, ok := clipVideoExt(src.mime)
	if !ok {
		writeErr(w, http.StatusBadRequest, "only a video clip can have its background cut — a GIF or WebP is a picture")
		return
	}
	if set.ClipCutComfy {
		// The cut is on the card, in ComfyUI. Her chat model steps off it as for any
		// generation, but the image generator's checkpoint stays, unlike for a clip: the
		// pack's models are a gigabyte or so, which fits beside it, and sending it away
		// would cost the next picture a reload for nothing.
		s.serveLongJob(w, r, req.JobID, req.Detach, "background cut", s.lendSwap, func(ctx context.Context, report func(imagegen.Progress)) (genResult, error) {
			data, err := s.comfyCut(ctx, set, src.data, ext, cut, report)
			if err != nil {
				return genResult{}, err
			}
			return s.cutClip(ctx, req, src, data, "background removed by "+clipCutModel(set)+" in ComfyUI"), nil
		})
		return
	}
	// The model here runs on this box's CPU, so the card is not lent.
	s.serveLongJob(w, r, req.JobID, req.Detach, "background cut", nil, func(ctx context.Context, report func(imagegen.Progress)) (genResult, error) {
		data, err := s.matte.CutClip(ctx, src.data, ext, cut, func(done float64) { report(imagegen.Progress{Percent: done}) })
		if err != nil {
			return genResult{}, err
		}
		return s.cutClip(ctx, req, src, data, "background removed"), nil
	})
}

// comfyCut has ComfyUI put her on the screen she was drawn on and keys it out.
// ComfyUI's half is the wait, so it has most of the bar.
func (s *Server) comfyCut(ctx context.Context, set settings.Settings, clip []byte, ext string, cut matte.ClipCut, report func(imagegen.Progress)) ([]byte, error) {
	screen, err := matte.ClipScreen(ctx, clip, ext)
	if err != nil {
		return nil, err
	}
	outs, err := s.imagegen.RunClipCut(ctx, set.LibbyClipURL, clip, ext, clipCutModel(set), screen, func(p imagegen.Progress) {
		report(imagegen.Progress{Percent: p.Percent * 0.8})
	})
	if err != nil {
		return nil, err
	}
	out := outs[0]
	outExt, ok := clipVideoExt(out.MIME)
	if !ok {
		return nil, fmt.Errorf("ComfyUI's cut came back as %s, not a video", out.MIME)
	}
	return matte.KeyClip(ctx, out.Data, outExt, cut, func(done float64) {
		report(imagegen.Progress{Percent: 0.8 + done*0.2})
	})
}

// cutClip files a clip with its background cut away: a preview, kept in the gallery
// beside the clip it came from, with that clip's record.
func (s *Server) cutClip(ctx context.Context, req clipMatteReq, src clipSource, data []byte, recipe string) genResult {
	set := s.settings.Get()
	const mime = "video/webm"
	rec := src.record
	if rec.Clip == nil {
		rec.Clip = &genRecordClip{}
	}
	if req.Grid != nil && req.Grid.Active() {
		recipe += fmt.Sprintf(" · on a %d×%d pixel grid", req.Grid.Cols, req.Grid.Rows)
	}
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
