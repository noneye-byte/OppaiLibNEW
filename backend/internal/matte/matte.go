// Package matte cuts the background off a picture with a segmentation model, for
// sprites and for clips.
//
// The sprite studio's own cutout (web/src/cutout.ts) removes a flat backdrop by its
// colour, which is right for a picture made against a green screen and no help for
// anything else: a clip's background drifts as the camera breathes, a picture from
// the gallery has a room behind her, and a colour key cannot tell her white blouse
// from a white wall. A matting model can, because it was taught what a figure is
// rather than what a backdrop looks like.
//
// The model is skytnt's anime-seg (ISNet, trained on drawn characters), baked into
// the onnx image as one file and run on this box's CPU by the same ONNX Runtime as the
// tagger and Kokoro. Nothing goes to the generators: the card is theirs, a picture is
// a second or two here, and it works when ComfyUI is asleep. Its contract is the
// reference app's (huggingface.co/spaces/skytnt/anime-remove-background): RGB scaled
// to 0–1, letterboxed onto a black square, NCHW, one channel back in 0–1 where 1 is
// her.
//
// The answer is a mask, not a finished cutout. The sprite editor composes its own
// edge (feather, spill) and lets a brush correct what the model got wrong, so it
// takes the mask as a starting point; a clip has no editor, so CutClip composes each
// frame here.
package matte

import (
	"context"
	"errors"
	"fmt"
	"image"
	"image/color"
	"math"
	"os"
	"sync"

	"golang.org/x/image/draw"
)

// DefaultSide is the square the model is fed when its graph does not fix one: what
// the reference app uses, and what ISNet was trained at.
const DefaultSide = 1024

// ErrUnavailable is a box that cannot run the model: a build without ONNX Runtime,
// or no model file. The message says which.
var ErrUnavailable = errors.New("background removal is unavailable")

type unavailable struct{ msg string }

func (e unavailable) Error() string        { return e.msg }
func (e unavailable) Is(target error) bool { return target == ErrUnavailable }

// runner is one forward pass: a 1×3×side×side input in, a side×side mask out. The
// onnx build provides the real one; tests provide their own.
type runner interface {
	run(in []float32, side int) ([]float32, error)
	side() int
}

// Matter loads the model on first use and runs one picture at a time: ISNet at 1024
// holds over a gigabyte of activations, and two at once on a lean Unraid box is a
// good way to meet the OOM killer.
type Matter struct {
	path string

	loadOnce sync.Once
	loadErr  error
	model    runner

	mu sync.Mutex
}

// New is a Matter over the model file at path. Nothing is read until the first mask.
func New(path string) *Matter { return &Matter{path: path} }

// newWith is a Matter over a runner already loaded, for tests.
func newWith(r runner) *Matter {
	m := &Matter{model: r}
	m.loadOnce.Do(func() {})
	return m
}

// NewFunc is a Matter whose forward pass is fn, for tests in other packages: fn gets
// the letterboxed input and returns the mask, side×side.
func NewFunc(side int, fn func(in []float32, side int) ([]float32, error)) *Matter {
	return newWith(funcRunner{s: side, fn: fn})
}

type funcRunner struct {
	s  int
	fn func([]float32, int) ([]float32, error)
}

func (f funcRunner) run(in []float32, side int) ([]float32, error) { return f.fn(in, side) }
func (f funcRunner) side() int                                     { return f.s }

// Problem says why the model cannot run, "" when it can — checked without loading it,
// for the studio's status.
func (m *Matter) Problem() string {
	if m == nil {
		return "background removal is not set up on this server"
	}
	if m.model != nil {
		return ""
	}
	if !built {
		return "background removal needs the default (onnx) OppaiLib image — this one was built without ONNX Runtime"
	}
	if m.path == "" {
		return "no background-removal model is configured (OPPAI_MATTE_MODEL)"
	}
	if _, err := os.Stat(m.path); err != nil {
		return fmt.Sprintf("the background-removal model is missing (%s) — pull the current OppaiLib image", m.path)
	}
	if m.loadErr != nil {
		return m.loadErr.Error()
	}
	return ""
}

func (m *Matter) load() error {
	m.loadOnce.Do(func() {
		if p := m.Problem(); p != "" {
			m.loadErr = unavailable{p}
			return
		}
		m.model, m.loadErr = loadModel(m.path)
		if m.loadErr != nil {
			m.loadErr = unavailable{"the background-removal model would not load: " + m.loadErr.Error()}
		}
	})
	return m.loadErr
}

// Mask is how much of each pixel is her, 0 (background) to 255, at the picture's own
// size.
func (m *Matter) Mask(ctx context.Context, img image.Image) (*image.Gray, error) {
	if err := m.load(); err != nil {
		return nil, err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	side := m.model.side()
	if side <= 0 {
		side = DefaultSide
	}
	in, box := letterbox(img, side)
	out, err := m.model.run(in, side)
	if err != nil {
		return nil, err
	}
	if len(out) < side*side {
		return nil, fmt.Errorf("the background-removal model answered %d values for a %d×%d mask", len(out), side, side)
	}
	b := img.Bounds()
	return unletterbox(out[:side*side], side, box, b.Dx(), b.Dy()), nil
}

// letterbox is the model's input: the picture scaled so its longer side is side,
// centred on a black square, as 0–1 floats in channel-first order. box is where the
// picture sits on the square.
func letterbox(src image.Image, side int) ([]float32, image.Rectangle) {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 {
		return make([]float32, 3*side*side), image.Rectangle{}
	}
	sw, sh := side, side
	if w > h {
		sh = max(1, int(math.Round(float64(side)*float64(h)/float64(w))))
	} else {
		sw = max(1, int(math.Round(float64(side)*float64(w)/float64(h))))
	}
	x0, y0 := (side-sw)/2, (side-sh)/2
	box := image.Rect(x0, y0, x0+sw, y0+sh)
	scaled := image.NewRGBA(image.Rect(0, 0, sw, sh))
	draw.BiLinear.Scale(scaled, scaled.Bounds(), src, b, draw.Src, nil)

	plane := side * side
	in := make([]float32, 3*plane)
	for y := 0; y < sh; y++ {
		row := scaled.Pix[y*scaled.Stride:]
		for x := 0; x < sw; x++ {
			at := (y0+y)*side + x0 + x
			p := row[x*4:]
			// A transparent pixel is background whatever colour it holds; drawn onto
			// black it reads as the padding does.
			in[at] = float32(p[0]) / 255
			in[plane+at] = float32(p[1]) / 255
			in[2*plane+at] = float32(p[2]) / 255
		}
	}
	return in, box
}

// unletterbox is the model's mask cut back to where the picture sat and scaled to
// the picture's size. An export that ends at logits rather than a sigmoid is squashed
// here, so either kind of file gives a mask in 0–255.
func unletterbox(out []float32, side int, box image.Rectangle, w, h int) *image.Gray {
	logits := false
	for _, v := range out {
		if v < -0.01 || v > 1.01 {
			logits = true
			break
		}
	}
	crop := image.NewGray(image.Rect(0, 0, max(1, box.Dx()), max(1, box.Dy())))
	for y := 0; y < box.Dy(); y++ {
		for x := 0; x < box.Dx(); x++ {
			v := float64(out[(box.Min.Y+y)*side+box.Min.X+x])
			if logits {
				v = 1 / (1 + math.Exp(-v))
			}
			crop.Pix[y*crop.Stride+x] = uint8(math.Round(min(max(v, 0), 1) * 255))
		}
	}
	if box.Dx() == w && box.Dy() == h {
		return crop
	}
	mask := image.NewGray(image.Rect(0, 0, w, h))
	draw.BiLinear.Scale(mask, mask.Bounds(), crop, crop.Bounds(), draw.Src, nil)
	return mask
}

// Cut is the picture with the mask as its alpha: her on transparency.
func Cut(img image.Image, mask *image.Gray) *image.NRGBA {
	b := img.Bounds()
	out := image.NewNRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	for y := 0; y < b.Dy(); y++ {
		for x := 0; x < b.Dx(); x++ {
			c := color.NRGBAModel.Convert(img.At(b.Min.X+x, b.Min.Y+y)).(color.NRGBA)
			a := mask.GrayAt(x, y).Y
			if c.A < a {
				a = c.A
			}
			i := y*out.Stride + x*4
			out.Pix[i], out.Pix[i+1], out.Pix[i+2], out.Pix[i+3] = c.R, c.G, c.B, a
		}
	}
	return out
}
