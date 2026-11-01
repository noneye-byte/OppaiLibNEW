package api

import (
	"bytes"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/matte"
)

// brightMatter is a stand-in model: her wherever the red channel is bright.
func brightMatter() *matte.Matter {
	return matte.NewFunc(32, func(in []float32, side int) ([]float32, error) {
		out := make([]float32, side*side)
		copy(out, in[:side*side])
		return out, nil
	})
}

func TestAPictureSentToBeCutComesBackAsItsMask(t *testing.T) {
	s, token := newTestServer(t)
	s.matte = brightMatter()
	pic := pngOf(t, 40, 20, 255)
	req := httptest.NewRequest(http.MethodPost, "/api/imagegen/matte", bytes.NewReader(pic))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("matte: %d %s", rec.Code, rec.Body)
	}
	img, err := png.Decode(rec.Body)
	if err != nil {
		t.Fatal(err)
	}
	mask, ok := img.(*image.Gray)
	if !ok || mask.Bounds().Dx() != 40 || mask.Bounds().Dy() != 20 {
		t.Fatalf("mask %T %v, want greyscale at the picture's size", img, img.Bounds())
	}
}

func TestBackgroundRemovalSaysWhyWhenTheModelIsMissing(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/matte", "x")
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "background") {
		t.Fatalf("no model: %d %s", rec.Code, rec.Body)
	}
}

func TestAClipsBackgroundIsCutIntoATakeBesideIt(t *testing.T) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("needs ffmpeg")
	}
	if _, err := exec.LookPath("ffprobe"); err != nil {
		t.Skip("needs ffprobe")
	}
	// A real clip: a second of ffmpeg's test pattern, eight frames.
	src := filepath.Join(t.TempDir(), "src.mp4")
	if out, err := exec.Command(ffmpeg, "-v", "error", "-f", "lavfi", "-i", "testsrc=size=64x48:rate=8", "-t", "1",
		"-c:v", "mpeg4", "-pix_fmt", "yuv420p", src).CombinedOutput(); err != nil {
		t.Fatalf("making the clip: %v %s", err, out)
	}
	data, err := os.ReadFile(src)
	if err != nil {
		t.Fatal(err)
	}
	s, token := newTestServer(t)
	s.matte = brightMatter()
	id := s.genCache.put(&genPreview{data: data, mime: "video/mp4", prompt: "she waves", seed: 7})
	out := postClip(t, s, token, "/api/imagegen/clip/matte", map[string]any{"id": id})
	if out.Clip.MIME != "video/webm" || out.Clip.ID == "" || !strings.Contains(out.Clip.Recipe, "background removed") {
		t.Fatalf("cut clip: %+v", out.Clip)
	}
	p, _ := s.genCache.get(out.Clip.ID)
	// WebM starts with the EBML magic.
	if p == nil || !bytes.HasPrefix(p.data, []byte{0x1a, 0x45, 0xdf, 0xa3}) {
		t.Fatal("the cut clip is not a WebM")
	}
}
