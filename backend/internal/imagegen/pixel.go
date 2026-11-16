package imagegen

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

// Pixel-art pictures, by Forge's sd-pixel extension (github.com/Leodotpy/sd-pixel).
//
// sd-pixel is a postprocessing script — one of the Extras tab's — named "pixel". It
// shrinks a picture by a whole factor, can hold it to a palette, and blows it back up
// to its own size with nearest-neighbour, so the picture keeps its size and every
// cell of the grid is one flat colour. Kept at its size, everything after it — the
// cutout, the reference square, the clip's start frame — takes it as any other
// picture.
//
// The Extras API cannot drive it: /sdapi/v1/extra-single-image hands arguments to the
// upscalers and face restorers only, and every other postprocessing script is run with
// None for each of its controls. What can is Forge's setting "Enable Postprocessing
// operations in txt2img and img2img" (postprocessing_enable_in_main_ui): a script
// named there is also an always-on script of txt2img and img2img, titled by its name,
// that runs on each finished picture after everything else (after ADetailer, after the
// hires fix). Forge builds that list once, when it starts. So a run that wants pixel
// art and finds no "pixel" script adds it to the setting and asks for Forge to be
// restarted, once; after that the script is there.

// Pixel makes a picture pixel art.
type Pixel struct {
	// Size is the side of a cell, in the picture's pixels; under 2 is off.
	Size int
	// Palette is how many colours the picture is held to; under 2 leaves them be.
	Palette int
}

// Active says whether the picture is to be made pixel art.
func (p Pixel) Active() bool { return p.Size > 1 }

// MaxPixelSize and MaxPixelPalette are sd-pixel's own sliders' ends.
const (
	MaxPixelSize    = 32
	MaxPixelPalette = 256
)

// pixelScript is sd-pixel's script, by the name Forge titles it in txt2img.
const pixelScript = "pixel"

// pixelArgs are sd-pixel's controls, in its ui()'s order: pixelate, rescale, downscale,
// mode, palette on, palette size, grey threshold on, threshold. The picture is always
// blown back up, so it keeps its size. Bicubic shrinks it by what each cell covers —
// nearest would pick one pixel in sixty-four and break every thin line.
func pixelArgs(p Pixel) []any {
	palette := min(max(p.Palette, 0), MaxPixelPalette)
	return []any{true, true, min(p.Size, MaxPixelSize), "Bicubic", palette > 1, palette, false, 0}
}

// ErrPixelUnsupported is pixel art asked of a generator without sd-pixel.
var ErrPixelUnsupported = errors.New("pixel-art sprites are made by Forge's sd-pixel extension, so they need Forge or Automatic1111 — not InvokeAI or ComfyUI mode")

// ErrPixelMissing is pixel art asked of a Forge that has not loaded sd-pixel.
var ErrPixelMissing = errors.New("Forge has not loaded sd-pixel")

// pixelSetting is Forge's list of postprocessing scripts it also runs in txt2img.
const pixelSetting = "postprocessing_enable_in_main_ui"

// a1111PixelReady says whether sd-pixel will run with a txt2img call, and when it will
// not, puts it in Forge's setting so it does after a restart.
func (c *Client) a1111PixelReady(ctx context.Context, base string) error {
	if c.a1111HasScript(ctx, base, pixelScript) {
		return nil
	}
	var opts map[string]any
	if err := c.getJSON(ctx, base+"/sdapi/v1/options", &opts); err != nil {
		return fmt.Errorf("%w, and its settings could not be read to turn it on: %v", ErrPixelMissing, err)
	}
	named, ok := withPixel(opts[pixelSetting])
	if !ok {
		return fmt.Errorf("%w. It is in Forge's setting “Enable Postprocessing operations in txt2img and img2img” already, so either Forge "+
			"has not been restarted since, or sd-pixel is not installed — install https://github.com/Leodotpy/sd-pixel from Forge's Extensions tab, "+
			"then restart Forge (the graphics-card menu at the top of the studio has a restart)", ErrPixelMissing)
	}
	if err := c.postJSON(ctx, base+"/sdapi/v1/options", map[string]any{pixelSetting: named}, nil); err != nil {
		return fmt.Errorf("%w, and turning it on in Forge's settings failed: %v", ErrPixelMissing, err)
	}
	return fmt.Errorf("%w for pictures yet. OppaiLib has turned sd-pixel on for txt2img (Forge's setting “Enable Postprocessing operations in "+
		"txt2img and img2img” now names pixel), and Forge reads that when it starts: restart Forge — the graphics-card menu at the top of the "+
		"studio has a restart — and draw again", ErrPixelMissing)
}

// withPixel is the setting's list with sd-pixel added, and false when it named it
// already. A setting Forge has never saved is absent, which is an empty list.
func withPixel(v any) ([]string, bool) {
	var names []string
	if list, ok := v.([]any); ok {
		for _, n := range list {
			if s, ok := n.(string); ok {
				if strings.EqualFold(strings.TrimSpace(s), pixelScript) {
					return nil, false
				}
				names = append(names, s)
			}
		}
	}
	return append(names, pixelScript), true
}
