package matte

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"io"
	"os"
	"os/exec"
)

// Keying a clip that something else has already cut.
//
// ComfyUI (imagegen/comfy_rmbg.go) takes her off her background and hands the clip back
// in front of one flat colour asked of it, in H.264, which has no alpha. Its verdict on
// where she is, is in that colour: every pixel of the backdrop is the one colour,
// give or take the encoder's noise, and every pixel of her is something else. So no
// model runs here. A frame's mask is read off how far each pixel is from the screen,
// and the frame then goes through the same keyer as a clip Wan drew on a screen
// (screen.go): her edge taken apart against the screen around it, its glow taken out.
//
// Distance, not lean, is what marks her. Green eyes lean the screen's way and are
// hers all the same; what makes a pixel the screen is being the screen's exact colour,
// which nothing of hers is. A pixel at her edge, part her, part screen, is far enough
// from the screen to count as doubtful and gets taken apart by the keyer, which reads
// how much of her is left in it.

const (
	// keyNear is how close to the screen's colour, as the summed difference of its
	// channels, a pixel is the screen: H.264 moves a flat colour a few levels a channel,
	// and further where her colour bleeds a pixel out at half resolution.
	keyNear = 48
	// keyFar is how far from it a pixel is certainly her. A mix with as little as a
	// third of the screen in it is nearer than this, so it is taken apart rather than
	// kept whole.
	keyFar = 160
)

// KeyClip is a clip in front of a flat green or blue screen with the screen keyed
// out, as a VP9 WebM with alpha. It needs ffmpeg and nothing else.
func KeyClip(ctx context.Context, src []byte, ext string, cut ClipCut, progress func(float64)) ([]byte, error) {
	return runClip(ctx, src, ext, cut, progress, keyFrames())
}

// keyFrames judges a clip's frames by their distance from the screen. A frame whose
// edge she covers keeps the last frame's screen.
func keyFrames() frameMask {
	var screen [3]byte
	found := false
	return func(_ context.Context, frame *image.RGBA, rgb []byte) ([]uint8, error) {
		w, h := frame.Rect.Dx(), frame.Rect.Dy()
		if s, ok := borderScreen(rgb, w, h); ok {
			screen, found = s, true
		} else if !found {
			return nil, errors.New("the cut clip came back without a flat screen behind her to key out")
		}
		return keyMask(rgb, screen), nil
	}
}

// keyMask is a frame's mask read off its distance from the screen: 0 on the screen,
// 255 from keyFar away.
func keyMask(rgb []byte, screen [3]byte) []uint8 {
	mask := make([]uint8, len(rgb)/3)
	for i := range mask {
		d := 0
		for c := 0; c < 3; c++ {
			v := int(rgb[i*3+c]) - int(screen[c])
			if v < 0 {
				v = -v
			}
			d += v
		}
		switch {
		case d <= keyNear:
			mask[i] = 0
		case d >= keyFar:
			mask[i] = 255
		default:
			mask[i] = uint8((d - keyNear) * 255 / (keyFar - keyNear))
		}
	}
	return mask
}

// borderScreen is the colour of the screen round a frame's edge: the middle value of
// each channel over the edge pixels that lean towards green or blue as a screen does,
// whichever there are more of. She can stand on the bottom edge or reach out of the
// frame; the rest of the edge is the screen.
func borderScreen(rgb []byte, w, h int) ([3]byte, bool) {
	var hist [3][3][256]int // by screen channel (1, 2), then colour channel
	var count [3]int
	look := func(x, y int) {
		p := rgb[(y*w+x)*3 : (y*w+x)*3+3]
		for _, ch := range []int{1, 2} {
			if lean(p, ch) >= screenLead {
				count[ch]++
				for c := 0; c < 3; c++ {
					hist[ch][c][p[c]]++
				}
			}
		}
	}
	for x := 0; x < w; x++ {
		look(x, 0)
		look(x, h-1)
	}
	for y := 1; y < h-1; y++ {
		look(0, y)
		look(w-1, y)
	}
	ch := 1
	if count[2] > count[1] {
		ch = 2
	}
	// A screen's worth of the edge, not a few green pixels of her.
	if count[ch] < (w+h)/4 {
		return [3]byte{}, false
	}
	var out [3]byte
	for c := 0; c < 3; c++ {
		half, seen := count[ch]/2, 0
		for v := 0; v < 256; v++ {
			if seen += hist[ch][c][v]; seen > half {
				out[c] = byte(v)
				break
			}
		}
	}
	return out, true
}

// ClipScreen says what a clip was drawn on, from its first frame: "blue" for a blue
// screen and "green" for anything else, which is the screen to cut it onto. A clip of
// her on blue is one where she wears green.
func ClipScreen(ctx context.Context, src []byte, ext string) (string, error) {
	ffmpeg, ffprobe, err := tools()
	if err != nil {
		return "", err
	}
	dir, err := os.MkdirTemp("", "oppailib-screen-*")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(dir)
	in, err := writeClip(dir, src, ext)
	if err != nil {
		return "", err
	}
	info, _, err := probe(ctx, ffprobe, in)
	if err != nil {
		return "", err
	}
	if info.Width <= 0 || info.Height <= 0 || info.Width > 4096 || info.Height > 4096 {
		return "", fmt.Errorf("the clip is %d×%d, which is not a size this cuts", info.Width, info.Height)
	}
	cmd := exec.CommandContext(ctx, ffmpeg, "-v", "error", "-i", in, "-map", "0:v:0", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	raw, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("ffmpeg could not read the clip: %s", lastLine(stderr.String(), err))
	}
	rgb := make([]byte, info.Width*info.Height*3)
	if _, err := io.ReadFull(bytes.NewReader(raw), rgb); err != nil {
		return "", errors.New("ffmpeg found no frames in the clip")
	}
	return screenName(rgb, info.Width, info.Height), nil
}

// screenName is "blue" when a frame's edge is a blue screen, else "green".
func screenName(rgb []byte, w, h int) string {
	if s, ok := borderScreen(rgb, w, h); ok && screenChannel(s) == 2 {
		return "blue"
	}
	return "green"
}

// ToolsProblem says why a clip cannot be keyed here, "" when it can: ffmpeg is all a
// key needs.
func ToolsProblem() string {
	if _, _, err := tools(); err != nil {
		return err.Error()
	}
	return ""
}
