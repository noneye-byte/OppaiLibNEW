package matte

import (
	"bytes"
	"context"
	"testing"
)

// cutFrame is a frame as ComfyUI hands a cut one back: her (a square of hair with a patch of
// green eye in it) in front of a flat screen with an encoder's few levels of noise,
// and a ring a pixel wide round her that is half her, half the screen.
func cutFrame(w, h int, screen [3]byte) []byte {
	hair, eye := [3]byte{200, 90, 20}, [3]byte{60, 160, 90}
	rgb := make([]byte, w*h*3)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			c := screen
			noise := byte((x*7 + y*13) % 4)
			for k := range c {
				if c[k] > 128 {
					c[k] -= noise
				} else {
					c[k] += noise
				}
			}
			switch {
			case x >= 26 && x < 30 && y >= 26 && y < 30:
				c = eye
			case x >= 16 && x < 40 && y >= 16 && y < 40:
				c = hair
			case x >= 15 && x < 41 && y >= 15 && y < 41:
				for k := range c {
					c[k] = byte((int(hair[k]) + int(screen[k])) / 2)
				}
			}
			copy(rgb[(y*w+x)*3:], c[:])
		}
	}
	return rgb
}

func keyed(t *testing.T, w, h int, frames ...[]byte) []byte {
	t.Helper()
	var out bytes.Buffer
	info := ClipInfo{Width: w, Height: h, FPS: "16/1"}
	if err := cutFrames(context.Background(), bytes.NewReader(bytes.Join(frames, nil)), &out, info, len(frames), ClipCut{}, nil, keyFrames()); err != nil {
		t.Fatal(err)
	}
	return out.Bytes()[len(out.Bytes())-w*h*4:]
}

func TestTheCutsScreenIsKeyedOutAndEverythingOfHersIsKept(t *testing.T) {
	const w, h = 56, 56
	for _, screen := range [][3]byte{{0, 255, 0}, {0, 0, 255}} {
		frame := keyed(t, w, h, cutFrame(w, h, screen))
		px := func(x, y int) []byte { return frame[(y*w+x)*4 : (y*w+x)*4+4] }
		if a := px(3, 3)[3]; a != 0 {
			t.Fatalf("%v: the screen kept alpha %d", screen, a)
		}
		if p := px(22, 22); p[3] != 255 || p[0] != 200 || p[1] != 90 || p[2] != 20 {
			t.Fatalf("%v: her hair came out %v", screen, p)
		}
		// Green eyes lean the screen's way, and are hers all the same.
		if p := px(27, 27); p[3] != 255 || p[0] != 60 || p[1] != 160 || p[2] != 90 {
			t.Fatalf("%v: her green eye came out %v", screen, p)
		}
		// The ring is half her: about half solid, in her own colour.
		if p := px(15, 28); p[3] < 90 || p[3] > 170 || p[0] != 200 || p[1] != 90 || p[2] != 20 {
			t.Fatalf("%v: the edge half of her came out %v", screen, p)
		}
	}
}

func TestAFrameWithNoScreenRoundItsEdgeCannotBeKeyed(t *testing.T) {
	const w, h = 16, 16
	grey := bytes.Repeat([]byte{128}, w*h*3)
	var out bytes.Buffer
	info := ClipInfo{Width: w, Height: h, FPS: "16/1"}
	if err := cutFrames(context.Background(), bytes.NewReader(grey), &out, info, 1, ClipCut{}, nil, keyFrames()); err == nil {
		t.Fatal("a grey frame was keyed")
	}
}

func TestAFrameSheFillsKeepsTheLastFramesScreen(t *testing.T) {
	const w, h = 56, 56
	full := bytes.Repeat([]byte{200, 90, 20}, w*h)
	frame := keyed(t, w, h, cutFrame(w, h, [3]byte{0, 255, 0}), full)
	if a := frame[(3*w+3)*4+3]; a != 255 {
		t.Fatalf("her hair across the whole frame came out alpha %d", a)
	}
}

func TestAClipOnABlueScreenIsCutOntoBlueAndAnythingElseOntoGreen(t *testing.T) {
	const w, h = 56, 56
	for want, screen := range map[string][3]byte{"blue": {24, 56, 230}, "green": {16, 235, 24}} {
		if got := screenName(cutFrame(w, h, screen), w, h); got != want {
			t.Errorf("a %s screen read as %s", want, got)
		}
	}
	white := cutFrame(w, h, [3]byte{250, 250, 250})
	if got := screenName(white, w, h); got != "green" {
		t.Errorf("a white backdrop read as %s", got)
	}
}
