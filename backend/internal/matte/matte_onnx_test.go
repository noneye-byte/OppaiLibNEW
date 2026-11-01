//go:build onnx

package matte

import (
	"context"
	"image"
	_ "image/jpeg"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// The real model on a real picture, and a real clip through ffmpeg. Needs the model
// file and a picture of a character (OPPAI_TEST_MATTE, OPPAI_TEST_MATTE_PIC), and
// writes what it made to OPPAI_TEST_MATTE_OUT when set, to be looked at.
func TestTheRealModelCutsHerOut(t *testing.T) {
	model, picPath := os.Getenv("OPPAI_TEST_MATTE"), os.Getenv("OPPAI_TEST_MATTE_PIC")
	if model == "" || picPath == "" {
		t.Skip("set OPPAI_TEST_MATTE and OPPAI_TEST_MATTE_PIC")
	}
	f, err := os.Open(picPath)
	if err != nil {
		t.Fatal(err)
	}
	img, _, err := image.Decode(f)
	f.Close()
	if err != nil {
		t.Fatal(err)
	}
	m := New(model)
	if p := m.Problem(); p != "" {
		t.Fatal(p)
	}
	start := time.Now()
	mask, err := m.Mask(context.Background(), img)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("first mask (with load) %v", time.Since(start))
	start = time.Now()
	if _, err := m.Mask(context.Background(), img); err != nil {
		t.Fatal(err)
	}
	t.Logf("second mask %v", time.Since(start))

	b := mask.Bounds()
	kept := 0
	for _, v := range mask.Pix {
		if v >= 128 {
			kept++
		}
	}
	share := float64(kept) / float64(len(mask.Pix))
	t.Logf("kept %.0f%% of the picture", share*100)
	if share < 0.1 || share > 0.9 {
		t.Fatalf("kept %.0f%% — the model found no figure, or took the whole picture", share*100)
	}
	if mask.GrayAt(2, 2).Y > 64 || mask.GrayAt(b.Dx()-3, 2).Y > 64 {
		t.Fatalf("the top corners should be background: %d %d", mask.GrayAt(2, 2).Y, mask.GrayAt(b.Dx()-3, 2).Y)
	}
	out := os.Getenv("OPPAI_TEST_MATTE_OUT")
	if out != "" {
		save := func(name string, im image.Image) {
			w, _ := os.Create(filepath.Join(out, name))
			_ = png.Encode(w, im)
			w.Close()
		}
		save("mask.png", mask)
		save("cut.png", Cut(img, mask))
	}

	// A clip: two seconds of the picture drifting, made by ffmpeg, cut frame by frame.
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("no ffmpeg for the clip")
	}
	dir := t.TempDir()
	src := filepath.Join(dir, "src.mp4")
	if o, err := exec.Command(ffmpeg, "-v", "error", "-loop", "1", "-i", picPath, "-t", "2", "-r", "8",
		"-vf", "scale=480:-2,zoompan=z='1+0.002*on':d=16:s=480x668:fps=8", "-c:v", "libx264", "-pix_fmt", "yuv420p", src).CombinedOutput(); err != nil {
		t.Fatalf("making the clip: %v %s", err, o)
	}
	data, _ := os.ReadFile(src)
	start = time.Now()
	var last float64
	cut, err := m.CutClip(context.Background(), data, ".mp4", func(p float64) { last = p })
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("clip cut in %v, %d bytes, progress reached %.2f", time.Since(start), len(cut), last)
	webm := filepath.Join(dir, "cut.webm")
	_ = os.WriteFile(webm, cut, 0o644)
	if out != "" {
		_ = os.WriteFile(filepath.Join(out, "cut.webm"), cut, 0o644)
	}
	probe, err := exec.Command("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name:stream_tags=alpha_mode", "-of", "default=nw=1", webm).Output()
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("ffprobe: %s", strings.TrimSpace(string(probe)))
	if !strings.Contains(string(probe), "codec_name=vp9") || !strings.Contains(string(probe), "alpha_mode=1") {
		t.Fatalf("the cut clip should be VP9 with alpha: %s", probe)
	}
	// Decoded with libvpx (which keeps the alpha), a corner of the first frame is clear.
	frame := filepath.Join(dir, "f.png")
	if o, err := exec.Command(ffmpeg, "-v", "error", "-c:v", "libvpx-vp9", "-i", webm, "-frames:v", "1", "-pix_fmt", "rgba", frame).CombinedOutput(); err != nil {
		t.Fatalf("decoding a frame: %v %s", err, o)
	}
	ff, _ := os.Open(frame)
	fr, err := png.Decode(ff)
	ff.Close()
	if err != nil {
		t.Fatal(err)
	}
	if _, _, _, a := fr.At(2, 2).RGBA(); a > 0x4000 {
		t.Fatalf("the corner of a cut frame should be transparent, alpha %d", a>>8)
	}
}
