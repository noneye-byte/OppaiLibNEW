package matte

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// realClip is a second of her (an orange block) in front of colour, as ffmpeg encodes
// it in H.264 4:2:0 — the noise and half-resolution colour of what Bria hands back.
func realClip(t *testing.T, colour string) []byte {
	t.Helper()
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("needs ffmpeg")
	}
	if _, err := exec.LookPath("ffprobe"); err != nil {
		t.Skip("needs ffprobe")
	}
	path := filepath.Join(t.TempDir(), "bria.mp4")
	if out, err := exec.Command(ffmpeg, "-v", "error", "-f", "lavfi", "-i", "color=c="+colour+":size=96x64:rate=8", "-t", "1",
		"-vf", "drawbox=x=32:y=16:w=32:h=40:color=0xC85A14:t=fill", "-c:v", "libx264", "-pix_fmt", "yuv420p", path).CombinedOutput(); err != nil {
		t.Fatalf("making the clip: %v %s", err, out)
	}
	data, _ := os.ReadFile(path)
	return data
}

// decoded is a cut WebM's frames as straight RGBA, decoded with its alpha.
func decoded(t *testing.T, webm []byte, w, h int) []byte {
	t.Helper()
	path := filepath.Join(t.TempDir(), "cut.webm")
	_ = os.WriteFile(path, webm, 0o600)
	// libvpx's own decoder is the one that reads VP9's alpha.
	out, err := exec.Command("ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgba", "-").Output()
	if err != nil || len(out) < w*h*4 {
		t.Fatalf("decoding the cut: %v, %d bytes", err, len(out))
	}
	return out[:w*h*4]
}

func TestAClipOnBriasScreenIsKeyedClearRoundHerAndSolidInHer(t *testing.T) {
	const w, h = 96, 64
	cut, err := KeyClip(context.Background(), realClip(t, "0x00FF00"), ".mp4", ClipCut{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	f := decoded(t, cut, w, h)
	alpha := func(x, y int) byte { return f[(y*w+x)*4+3] }
	for _, p := range [][2]int{{4, 4}, {90, 60}, {20, 32}, {72, 32}} {
		if a := alpha(p[0], p[1]); a > 8 {
			t.Errorf("the screen at %v kept alpha %d", p, a)
		}
	}
	for _, p := range [][2]int{{48, 36}, {36, 20}, {60, 52}} {
		if a := alpha(p[0], p[1]); a < 247 {
			t.Errorf("her pixel at %v came out alpha %d", p, a)
		}
	}
	// Nothing of the screen's green is left in her.
	if px := f[(36*w+48)*4:]; px[1] > px[0] {
		t.Errorf("her middle came out %v", px[:4])
	}
}

func TestAKeyedClipOnAPixelGridHasWholeCells(t *testing.T) {
	const w, h = 96, 64
	// 12×8 cells of 8 pixels; her block starts and ends on cell lines.
	cut, err := KeyClip(context.Background(), realClip(t, "0x0000FF"), ".mp4", ClipCut{Grid: Grid{Cols: 12, Rows: 8}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	f := decoded(t, cut, w, h)
	alpha := func(x, y int) int { return int(f[(y*w+x)*4+3]) }
	// Inside a cell the alpha is one value; VP9's own loss moves it a few levels.
	for cy := 0; cy < 8; cy++ {
		for cx := 0; cx < 12; cx++ {
			lo, hi := 255, 0
			for y := cy*8 + 1; y < cy*8+7; y++ {
				for x := cx*8 + 1; x < cx*8+7; x++ {
					lo, hi = min(lo, alpha(x, y)), max(hi, alpha(x, y))
				}
			}
			if hi-lo > 24 || (lo > 24 && hi < 231) {
				t.Fatalf("cell %d,%d has alpha from %d to %d", cx, cy, lo, hi)
			}
		}
	}
	if alpha(48, 36) < 231 || alpha(4, 4) > 24 {
		t.Fatalf("her cell %d, the screen's %d", alpha(48, 36), alpha(4, 4))
	}
}
