package api

import (
	"bytes"
	"encoding/json"
	"image"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
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

func TestACutHandedToComfyUIWithoutItsAddressOrWithAModelItLacksSaysSoAndIsNotRun(t *testing.T) {
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.LibbyClipURL, cur.ClipCutComfy = "", true
	s.settings.Set(cur)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/clip/matte", `{"id":"x"}`)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "ComfyUI needs its address") {
		t.Fatalf("no address: %d %s", rec.Code, rec.Body)
	}
	cur.LibbyClipURL, cur.ClipCutModel = "http://127.0.0.1:1", "u2net"
	s.settings.Set(cur)
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/clip/matte", `{"id":"x"}`)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "is not one of the models") {
		t.Fatalf("unknown model: %d %s", rec.Code, rec.Body)
	}
	// ComfyUI needs no model on this server, so its problem is the only one said.
	set := s.settings.Get()
	if s.clipCutProblem(set) == s.matteProblem() || clipCutBy(set) != "comfy" {
		t.Fatalf("problem %q, by %q", s.clipCutProblem(set), clipCutBy(set))
	}
}

func TestComfyUIsCutComesBackOnItsScreenAndIsKeyedIntoATakeOnThePixelGrid(t *testing.T) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("needs ffmpeg")
	}
	if _, err := exec.LookPath("ffprobe"); err != nil {
		t.Skip("needs ffprobe")
	}
	// Her clip, on a blue screen; and what ComfyUI sends back, her on flat blue.
	dir := t.TempDir()
	clip := func(name, colour string) []byte {
		path := filepath.Join(dir, name)
		if out, err := exec.Command(ffmpeg, "-v", "error", "-f", "lavfi", "-i", "color=c="+colour+":size=64x48:rate=8", "-t", "1",
			"-vf", "drawbox=x=20:y=10:w=24:h=30:color=0xC85A14:t=fill", "-c:v", "mpeg4", "-pix_fmt", "yuv420p", path).CombinedOutput(); err != nil {
			t.Fatalf("making the clip: %v %s", err, out)
		}
		data, _ := os.ReadFile(path)
		return data
	}
	source, cutOut := clip("src.mp4", "0x1838E6"), clip("cut.mp4", "0x0000FF")
	var mu sync.Mutex
	var graph map[string]any
	mux := http.NewServeMux()
	mux.HandleFunc("POST /upload/image", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"name":"up.mp4","subfolder":""}`)
	})
	mux.HandleFunc("POST /prompt", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Prompt map[string]any `json:"prompt"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		mu.Lock()
		graph = body.Prompt
		mu.Unlock()
		_, _ = io.WriteString(w, `{"prompt_id":"p1"}`)
	})
	mux.HandleFunc("GET /history/p1", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"p1":{"outputs":{"3":{"images":[{"filename":"cut.mp4","subfolder":"","type":"output"}]}},"status":{"status_str":"success"}}}`)
	})
	mux.HandleFunc("GET /view", func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write(cutOut) })
	comfy := httptest.NewServer(mux)
	t.Cleanup(comfy.Close)

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.LibbyClipURL, cur.ClipCutComfy = comfy.URL, true
	s.settings.Set(cur)
	id := s.genCache.put(&genPreview{data: source, mime: "video/mp4", prompt: "she waves", seed: 7})
	out := postClip(t, s, token, "/api/imagegen/clip/matte", map[string]any{"id": id, "grid": map[string]any{"cols": 16, "rows": 12}})
	if !strings.Contains(out.Clip.Recipe, "by BiRefNet_toonout in ComfyUI") || !strings.Contains(out.Clip.Recipe, "16×12 pixel grid") {
		t.Fatalf("cut clip: %+v", out.Clip)
	}
	mu.Lock()
	defer mu.Unlock()
	cutBy := 0
	for _, raw := range graph {
		n := raw.(map[string]any)
		if n["class_type"] == "BiRefNetRMBG" {
			cutBy++
			if n["inputs"].(map[string]any)["background_color"] != "#0000FF" {
				t.Fatalf("a clip on blue was cut onto %v", n["inputs"])
			}
		}
	}
	if cutBy != 1 {
		t.Fatalf("the default model's node was not in the graph: %v", graph)
	}
	p, _ := s.genCache.get(out.Clip.ID)
	if p == nil || !bytes.HasPrefix(p.data, []byte{0x1a, 0x45, 0xdf, 0xa3}) {
		t.Fatal("the cut clip is not a WebM")
	}
}
