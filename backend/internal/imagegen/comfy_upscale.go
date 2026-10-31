package imagegen

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// Enlarging a finished clip.
//
// Wan renders at 480p or 720p because every pixel more is minutes more, so a clip
// worth keeping is enlarged afterwards rather than rendered large. ComfyUI does it with
// core nodes: the clip is uploaded, split into its frames, each frame put through an
// upscale model (ESRGAN and friends, from models/upscale_models) and the frames put
// back together at the clip's own frame rate. An upscale model enlarges by the factor
// it was trained at — 4× for most — so its result is then resized to the size asked
// for, which costs nothing next to the model and gives a sharper 2× than a 2× model.
//
// Without a model the frames are only resized, with Lanczos: quick, and softer.

// ClipUpscale is one clip to enlarge.
type ClipUpscale struct {
	// Model is an upscale model as ComfyUI lists it; blank resizes alone.
	Model string
	// Scale is how many times larger, 1.25 to 4.
	Scale float64
	// Width and Height are the clip's own size when known, so the result is an exact
	// multiple of it. Unknown, the model's factor is read off its name.
	Width  int
	Height int
}

// MaxClipUpscale bounds the scale: 4× of Wan's 720p is past 4K already, and every
// frame of it is held in ComfyUI's memory at once.
const MaxClipUpscale = 4

// clipUpscaleSide is a side of the enlarged clip: a multiple of 16, which the video
// encoders' macroblocks want and which a 4:2:0 encode needs at the very least even.
func clipUpscaleSide(side int, scale float64) int {
	return max(16, int(math.Round(float64(side)*scale/16))*16)
}

// ClipUpscaleSize is the enlarged clip's frame size, for a clip of w×h.
func ClipUpscaleSize(w, h int, scale float64) (int, int) {
	return clipUpscaleSide(w, scale), clipUpscaleSide(h, scale)
}

// upscalerFactor is what an upscale model enlarges by, read off its name the way they
// are published — 4x-UltraSharp, RealESRGAN_x4plus, 2xNomosUni — or 4, which is most.
var upscalerFactorName = regexp.MustCompile(`(?i)(?:^|[^a-z0-9])(?:x([1-8])|([1-8])x)(?:[^0-9]|$)`)

func upscalerFactor(name string) float64 {
	base := name[strings.LastIndexAny(name, `/\`)+1:]
	if m := upscalerFactorName.FindStringSubmatch(base); m != nil {
		n, _ := strconv.Atoi(m[1] + m[2])
		if n > 0 {
			return float64(n)
		}
	}
	return 4
}

// Recipe says how a clip was enlarged, beside it.
func (u ClipUpscale) Recipe() string {
	by := "Lanczos"
	if u.Model != "" {
		by = strings.TrimSuffix(u.Model[strings.LastIndexAny(u.Model, `/\`)+1:], ".pth")
		by = strings.TrimSuffix(by, ".safetensors")
	}
	s := "upscaled " + strconv.FormatFloat(u.Scale, 'f', -1, 64) + "× with " + by
	if u.Width > 0 && u.Height > 0 {
		s += fmt.Sprintf(" to %d×%d", clipUpscaleSide(u.Width, u.Scale), clipUpscaleSide(u.Height, u.Scale))
	}
	return s
}

// BuildUpscaleGraph wires the enlargement of an uploaded clip, by its name in
// ComfyUI's input folder.
func BuildUpscaleGraph(video string, u ClipUpscale) map[string]any {
	g := &comfyGraph{nodes: map[string]any{}}
	parts := g.add("GetVideoComponents", map[string]any{"video": slot(g.add("LoadVideo", map[string]any{"file": video}), 0)})
	frames := slot(parts, 0)
	factor := 1.0
	if u.Model != "" {
		model := slot(g.add("UpscaleModelLoader", map[string]any{"model_name": u.Model}), 0)
		frames = slot(g.add("ImageUpscaleWithModel", map[string]any{"upscale_model": model, "image": frames}), 0)
		factor = upscalerFactor(u.Model)
	}
	if u.Width > 0 && u.Height > 0 {
		frames = slot(g.add("ImageScale", map[string]any{
			"image": frames, "upscale_method": "lanczos", "crop": "disabled",
			"width": clipUpscaleSide(u.Width, u.Scale), "height": clipUpscaleSide(u.Height, u.Scale),
		}), 0)
	} else if by := u.Scale / factor; math.Abs(by-1) > 0.001 {
		frames = slot(g.add("ImageScaleBy", map[string]any{"image": frames, "upscale_method": "lanczos", "scale_by": by}), 0)
	}
	// The frame rate is the clip's own, read off it rather than assumed, so a clip
	// made at 24 does not come back slowed to 16.
	video2 := slot(g.add("CreateVideo", map[string]any{"images": frames, "fps": slot(parts, 2)}), 0)
	g.add("SaveVideo", map[string]any{"video": video2, "filename_prefix": "oppailib/upscaled", "format": "auto", "codec": "auto"})
	return g.nodes
}

// RunClipUpscale uploads a clip and enlarges it. ext is the clip's file extension
// (".mp4", ".webm"), which ComfyUI's video loader goes by.
func (c *Client) RunClipUpscale(ctx context.Context, base string, clip []byte, ext string, u ClipUpscale, progress func(Progress)) ([]ComfyOutput, error) {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	if base == "" {
		return nil, fmt.Errorf("clips are not set up: ComfyUI's address is needed")
	}
	if u.Scale <= 1 || u.Scale > MaxClipUpscale {
		return nil, fmt.Errorf("a clip can be enlarged by more than 1× and up to %d×", MaxClipUpscale)
	}
	name, err := c.comfyUploadAs(ctx, base, clip, ext, "the clip")
	if err != nil {
		return nil, err
	}
	return c.runComfyGraph(ctx, base, BuildUpscaleGraph(name, u), progress)
}
