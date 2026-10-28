package api

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"math"
	"strings"

	"golang.org/x/image/draw"

	"github.com/youruser/oppailib/internal/imagegen"
)

// Fitting a training picture to the size it is trained at.
//
// The trainer runs sd-scripts with --bucket_no_upscale, which trains a picture at its
// own size rounded down to 64 when that fits in resolution², and shrinks it to fit
// otherwise. So a 400-pixel crop out of a comic panel trained at 384×384 for an SDXL
// LoRA that wants a million pixels, and a 4000-pixel photo was shrunk by OpenCV's
// area filter in the middle of the run. The server now hands over every picture
// already at its bucket: as large as resolution² allows in its own shape, each side a
// multiple of 64. A picture that has to grow goes through the generator's upscaler
// first (an ESRGAN-type model, which draws detail rather than smearing pixels) when
// there is one, and every resize after that is Catmull-Rom.

// trainFit is how a run's pictures are fitted, settled once when it starts.
type trainFit struct {
	// Resolution is the side of the square whose area a bucket may fill.
	Resolution int
	// GenBase and Upscaler are the A1111 that enlarges a small picture and the model
	// it does it with; "" upscales by resampling alone.
	GenBase  string
	Upscaler string
}

// loraFitMinSide and loraFitMaxSide are the trainer's --min_bucket_reso and the most
// --max_bucket_reso can be for a resolution: a bucket outside them would be changed
// again by sd-scripts.
const loraFitMinSide = 256

func loraFitMaxSide(res int) int { return max(res*2, 1024) }

// loraBucket is the size a w×h picture is trained at: its shape, scaled to fill
// res×res pixels, each side rounded down to 64 so the area stays under it.
func loraBucket(w, h, res int) (int, int) {
	if w <= 0 || h <= 0 || res <= 0 {
		return 0, 0
	}
	scale := math.Sqrt(float64(res*res) / float64(w*h))
	clamp := func(v float64) int {
		n := int(v) / 64 * 64
		return min(max(n, loraFitMinSide), loraFitMaxSide(res))
	}
	bw, bh := clamp(float64(w)*scale), clamp(float64(h)*scale)
	// A shape so long that one side hit the clamp: the other gives back area.
	for bw*bh > res*res && (bw > loraFitMinSide || bh > loraFitMinSide) {
		if bw >= bh {
			bw -= 64
		} else {
			bh -= 64
		}
	}
	return bw, bh
}

// loraUpscaleFactor is how much a picture must grow to cover its bucket, 1 when it
// covers it already.
func loraUpscaleFactor(w, h, bw, bh int) float64 {
	return max(1, float64(bw)/float64(w), float64(bh)/float64(h))
}

// loraPickUpscaler is the upscaler a training picture is enlarged with: an anime
// ESRGAN for the drawn pictures most sets are, then a general one, never a plain
// resampler (Lanczos, Nearest) — those are no better than resampling here.
func loraPickUpscaler(names []string) string {
	prefer := []string{"anime6b", "ultrasharp", "4x-animesharp", "r-esrgan 4x+", "esrgan_4x", "swinir", "scunet", "ldsr", "esrgan"}
	for _, want := range prefer {
		for _, n := range names {
			if strings.Contains(strings.ToLower(n), want) {
				return n
			}
		}
	}
	for _, n := range names {
		switch strings.ToLower(n) {
		case "lanczos", "nearest", "none", "":
		default:
			return n
		}
	}
	return ""
}

// loraFitImage resizes a picture to cover w×h and crops it there, from the middle.
// Transparency is laid on white: sd-scripts drops the alpha channel, which turns a
// cut-out's clear background into whatever colour the pixels happened to hold.
func loraFitImage(src image.Image, w, h int) *image.RGBA {
	b := src.Bounds()
	scale := max(float64(w)/float64(b.Dx()), float64(h)/float64(b.Dy()))
	sw, sh := int(math.Ceil(float64(b.Dx())*scale)), int(math.Ceil(float64(b.Dy())*scale))
	scaled := image.NewRGBA(image.Rect(0, 0, sw, sh))
	draw.Draw(scaled, scaled.Bounds(), image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.CatmullRom.Scale(scaled, scaled.Bounds(), src, b, draw.Over, nil)
	out := image.NewRGBA(image.Rect(0, 0, w, h))
	off := image.Pt((sw-w)/2, (sh-h)/2)
	draw.Draw(out, out.Bounds(), scaled, off, draw.Src)
	return out
}

// trainFitPicture is a picture as the trainer gets it: at its bucket, or as it came
// when it is already there or cannot be read. The bytes in are never changed.
func (s *Server) trainFitPicture(ctx context.Context, fit trainFit, data []byte) ([]byte, string) {
	if fit.Resolution <= 0 {
		return data, loraPictureExt(data)
	}
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return data, loraPictureExt(data)
	}
	b := src.Bounds()
	bw, bh := loraBucket(b.Dx(), b.Dy(), fit.Resolution)
	if bw == 0 || (b.Dx() == bw && b.Dy() == bh && opaque(src)) {
		return data, loraPictureExt(data)
	}
	// Enlarged by the generator first when it has to grow by more than a little;
	// a quarter or less is as well done by resampling, and costs no round trip.
	if grow := loraUpscaleFactor(b.Dx(), b.Dy(), bw, bh); grow > 1.25 && fit.GenBase != "" && fit.Upscaler != "" {
		if up := s.trainUpscale(ctx, fit, data, grow); up != nil {
			src = up
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, loraFitImage(src, bw, bh)); err != nil {
		return data, loraPictureExt(data)
	}
	return buf.Bytes(), ".png"
}

// trainUpscale enlarges a picture through the generator's upscaler, by the next
// whole factor up to four; nil when it could not, and the picture is resampled.
func (s *Server) trainUpscale(ctx context.Context, fit trainFit, data []byte, grow float64) image.Image {
	factor := min(math.Ceil(grow), 4)
	res, err := s.imagegen.Generate(ctx, fit.GenBase, imagegen.GenerateRequest{
		UpscaleOnly: true, InitImage: data,
		Upscale: imagegen.Upscale{Upscaler: fit.Upscaler, Scale: factor},
	})
	if err != nil || len(res.Images) == 0 {
		if err != nil {
			s.log.Warn("train: upscale a small picture", "err", err)
		}
		return nil
	}
	img, _, err := image.Decode(bytes.NewReader(res.Images[0]))
	if err != nil {
		return nil
	}
	return img
}

// opaque reports whether a picture has no transparency to lay on white.
func opaque(img image.Image) bool {
	if o, ok := img.(interface{ Opaque() bool }); ok {
		return o.Opaque()
	}
	return false
}

// trainFitFor settles how a run's pictures are fitted: the resolution the trainer
// will use, and the generator's upscaler. The trainer reads the checkpoint's family
// itself, at run time, so this goes by the family the generator lists for it; one it
// cannot tell is taken as SDXL, since fitting an SD 1.5 run's pictures to 1024 costs
// only a resize the trainer does again, and fitting an SDXL run's to 512 loses half
// of every picture.
func (s *Server) trainFitFor(ctx context.Context, genBase string, req trainRequest) trainFit {
	if req.NoFit {
		return trainFit{}
	}
	res := req.Resolution
	if res <= 0 {
		res = 1024
		if models, err := s.imagegen.Models(ctx, genBase); err == nil {
			for _, m := range models {
				if m.Title == req.Base || m.Name == req.Base {
					if trainLooksSD1(m.Base + " " + m.Title) {
						res = 512
					}
					break
				}
			}
		}
	}
	if req.LowVRAM && res > 768 {
		res = 768
	}
	fit := trainFit{Resolution: res / 64 * 64}
	if ups, _, err := s.imagegen.Upscalers(ctx, genBase); err == nil {
		if u := loraPickUpscaler(ups); u != "" {
			fit.GenBase, fit.Upscaler = genBase, u
		}
	}
	return fit
}

// trainLooksSD1 is a checkpoint whose family or name says SD 1.x.
func trainLooksSD1(s string) bool {
	s = strings.ToLower(s)
	if strings.Contains(s, "xl") || strings.Contains(s, "pony") || strings.Contains(s, "illustrious") || strings.Contains(s, "noob") {
		return false
	}
	return strings.Contains(s, "sd 1") || strings.Contains(s, "sd1") || strings.Contains(s, "1.5") || strings.Contains(s, "sd15")
}
