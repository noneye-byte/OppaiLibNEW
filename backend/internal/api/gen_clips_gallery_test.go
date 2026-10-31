package api

import (
	"encoding/base64"
	"encoding/json"
	"image"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/settings"
)

// comfyRecorder is a ComfyUI that keeps what it was asked: the graph of each prompt,
// the names files were uploaded under, and how often it was told to free the card.
type comfyRecorder struct {
	mu      sync.Mutex
	graphs  []map[string]any
	uploads []string
	frees   int
}

func (c *comfyRecorder) server(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /upload/image", func(w http.ResponseWriter, r *http.Request) {
		name := ""
		if _, h, err := r.FormFile("image"); err == nil {
			name = h.Filename
		}
		c.mu.Lock()
		c.uploads = append(c.uploads, name)
		c.mu.Unlock()
		_, _ = io.WriteString(w, `{"name":"`+name+`","subfolder":""}`)
	})
	mux.HandleFunc("POST /prompt", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Prompt map[string]any `json:"prompt"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		c.mu.Lock()
		c.graphs = append(c.graphs, body.Prompt)
		c.mu.Unlock()
		_, _ = io.WriteString(w, `{"prompt_id":"p1"}`)
	})
	mux.HandleFunc("GET /history/p1", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"p1":{"outputs":{"9":{"videos":[{"filename":"clip.mp4","subfolder":"","type":"output"}]}},"status":{"status_str":"success"}}}`)
	})
	mux.HandleFunc("GET /view", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(fakeMP4)
	})
	mux.HandleFunc("POST /free", func(w http.ResponseWriter, r *http.Request) {
		c.mu.Lock()
		c.frees++
		c.mu.Unlock()
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func (c *comfyRecorder) lastGraph() map[string]any {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.graphs[len(c.graphs)-1]
}

func (c *comfyRecorder) freeCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.frees
}

// graphNode is the inputs of the one node of a class in a queued graph.
func graphNode(t *testing.T, g map[string]any, class string) map[string]any {
	t.Helper()
	var found []map[string]any
	for _, n := range g {
		if m := n.(map[string]any); m["class_type"] == class {
			found = append(found, m["inputs"].(map[string]any))
		}
	}
	if len(found) != 1 {
		t.Fatalf("%d %s nodes in %v", len(found), class, g)
	}
	return found[0]
}

var studioPair = settings.ClipModels{
	Model: "wan2.2_i2v_high_noise_14B.safetensors", LowModel: "wan2.2_i2v_low_noise_14B.safetensors",
	TextEncoder: "umt5.safetensors", VAE: "wan_2.1_vae.safetensors",
	Loras: []settings.ClipLora{{Name: "motion.safetensors", Weight: 0.8}},
}

// clipStudio is a server with an A1111 behind the Image studio, whose gallery is
// OppaiLib's own, and a ComfyUI behind the Video studio.
func clipStudio(t *testing.T) (*Server, string, *comfyRecorder, *galleryA1111) {
	t.Helper()
	s, token := newTestServer(t)
	a1111 := &galleryA1111{}
	enableImageGen(t, s, newGalleryA1111(t, a1111).URL)
	comfy := &comfyRecorder{}
	cur := s.settings.Get()
	cur.LibbyClipURL = comfy.server(t).URL
	cur.ClipImageModels = studioPair
	s.settings.Set(cur)
	return s, token, comfy, a1111
}

type clipOut struct {
	Clip struct {
		ID      string `json:"id"`
		MIME    string `json:"mime"`
		Gallery string `json:"gallery"`
		Width   int    `json:"width"`
		Height  int    `json:"height"`
		Recipe  string `json:"recipe"`
	} `json:"clip"`
}

func postClip(t *testing.T, s *Server, token, path string, body any) clipOut {
	t.Helper()
	raw, _ := json.Marshal(body)
	rec := do(t, s.Handler(), token, http.MethodPost, path, string(raw))
	if rec.Code != http.StatusOK {
		t.Fatalf("%s: %d %s", path, rec.Code, rec.Body)
	}
	var out clipOut
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return out
}

func animate(t *testing.T, s *Server, token string) clipOut {
	t.Helper()
	picture := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngOf(t, 64, 96, 200))
	return postClip(t, s, token, "/api/imagegen/clip", map[string]any{"from": "image", "prompt": "she waves", "initImage": picture})
}

func TestAClipIsKeptInTheGalleryBesideThePicturesAndPlaysFromIt(t *testing.T) {
	s, token, _, _ := clipStudio(t)
	out := animate(t, s, token)
	// The picture's shape at Wan's 832 on the long side.
	if out.Clip.Gallery == "" || out.Clip.Width != 560 || out.Clip.Height != 832 {
		t.Fatalf("clip = %+v", out.Clip)
	}

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/images?board=none", "")
	var page struct {
		Items []struct {
			Name  string `json:"name"`
			Kind  string `json:"kind"`
			Label string `json:"label"`
			Tile  bool   `json:"tile"`
		} `json:"items"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &page)
	if len(page.Items) != 1 || page.Items[0].Name != out.Clip.Gallery || page.Items[0].Kind != "video" || !page.Items[0].Tile ||
		!strings.HasPrefix(page.Items[0].Label, "Clip ") {
		t.Fatalf("Unsorted = %s", rec.Body)
	}

	// It plays from the gallery: a video, answering the range a <video> asks for.
	req := httptest.NewRequest(http.MethodGet, "/api/imagegen/gallery/image/"+out.Clip.Gallery, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Range", "bytes=4-11")
	full := httptest.NewRecorder()
	s.Handler().ServeHTTP(full, req)
	if full.Code != http.StatusPartialContent || full.Header().Get("Content-Type") != "video/mp4" || full.Body.String() != "ftypisom" {
		t.Fatalf("full: %d %q %q", full.Code, full.Header().Get("Content-Type"), full.Body.String())
	}
	// Its tile is a picture — a frame of it, or with no ffmpeg the still it started from.
	thumb := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/image/"+out.Clip.Gallery+"/thumb", "")
	if _, _, err := image.DecodeConfig(thumb.Body); thumb.Code != http.StatusOK || err != nil {
		t.Fatalf("tile: %d %v", thumb.Code, err)
	}

	meta := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/image/"+out.Clip.Gallery+"/metadata", "")
	var info genRecord
	_ = json.Unmarshal(meta.Body.Bytes(), &info)
	if info.Prompt != "she waves" || info.Model != studioPair.Model || info.Steps != 20 || info.Sampler != "euler" ||
		info.Clip == nil || info.Clip.From != "image" || info.Clip.LowModel != studioPair.LowModel || len(info.Loras) != 1 {
		t.Fatalf("record = %s", meta.Body)
	}

	// A clip is no picture to start one from.
	if _, err := s.galleryPicture(t.Context(), s.settings.Get().ImageGenURL, out.Clip.Gallery); err == nil {
		t.Fatal("a clip was handed over as a picture")
	}

	// Moved to the library, it is a video there.
	moved := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/gallery/save", `{"name":"`+out.Clip.Gallery+`"}`)
	var saved struct {
		ID int64 `json:"id"`
	}
	_ = json.Unmarshal(moved.Body.Bytes(), &saved)
	if row, err := s.db.GetMedia(t.Context(), saved.ID); err != nil || row.Kind != "video" {
		t.Fatalf("library row = %+v, %v (%s)", row, err, moved.Body)
	}
}

func TestFilesPickedInTheStudioRunInsteadOfSettingsAndNeedNothingThere(t *testing.T) {
	s, token, comfy, _ := clipStudio(t)
	st := clipsStatus(s.settings.Get())
	if st.Image == nil || st.Image.Models == nil || st.Image.Models.Model != studioPair.Model || st.Image.NeedsModel {
		t.Fatalf("picture status = %+v", st.Image)
	}
	// Words have nothing in Settings: offered still, but a clip needs a model picked.
	if st.Text == nil || !st.Text.NeedsModel || !strings.Contains(strings.Join(st.Text.Built, ","), "loras") {
		t.Fatalf("words status = %+v", st.Text)
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/clip", `{"from":"text","prompt":"rain"}`)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "Video studio") {
		t.Fatalf("no model: %d %s", rec.Code, rec.Body)
	}

	out := postClip(t, s, token, "/api/imagegen/clip", map[string]any{"from": "text", "prompt": "rain", "models": settings.ClipModels{
		Model: "wan2.2-rapid-aio-v10.safetensors", Checkpoint: true, Sampler: "uni_pc", Scheduler: "beta",
		Loras: []settings.ClipLora{{Name: "rain.safetensors", Weight: 0.6}},
	}})
	g := comfy.lastGraph()
	if graphNode(t, g, "CheckpointLoaderSimple")["ckpt_name"] != "wan2.2-rapid-aio-v10.safetensors" {
		t.Fatalf("the studio's checkpoint was not loaded: %v", g)
	}
	sampler := graphNode(t, g, "KSampler")
	if sampler["sampler_name"] != "uni_pc" || sampler["scheduler"] != "beta" || sampler["steps"] != 4.0 || sampler["cfg"] != 1.0 {
		t.Fatalf("sampled with %v", sampler)
	}
	if lora := graphNode(t, g, "LoraLoaderModelOnly"); lora["lora_name"] != "rain.safetensors" || lora["strength_model"] != 0.6 {
		t.Fatalf("lora = %v", lora)
	}
	if out.Clip.Recipe != "4 steps · CFG 1 · shift 8 · uni_pc/beta · 1 LoRA" {
		t.Fatalf("recipe = %q", out.Clip.Recipe)
	}

	// Picked files are the whole recipe: Settings' LoRAs do not ride along on them.
	picture := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngOf(t, 64, 64, 9))
	studio := studioPair
	studio.Loras = []settings.ClipLora{}
	postClip(t, s, token, "/api/imagegen/clip", map[string]any{"from": "image", "prompt": "waves", "initImage": picture, "models": studio})
	for _, n := range comfy.lastGraph() {
		if n.(map[string]any)["class_type"] == "LoraLoaderModelOnly" {
			t.Fatal("Settings' LoRA went on over the studio's picks")
		}
	}
}

func TestAClipCanBeEnlargedAndComesBackAsANewClipBesideIt(t *testing.T) {
	s, token, comfy, _ := clipStudio(t)
	first := animate(t, s, token)

	up := postClip(t, s, token, "/api/imagegen/clip/upscale", map[string]any{"gallery": first.Clip.Gallery, "upscaler": "4x-UltraSharp.pth", "scale": 2})
	comfy.mu.Lock()
	uploaded := comfy.uploads[len(comfy.uploads)-1]
	comfy.mu.Unlock()
	if !strings.HasSuffix(uploaded, ".mp4") {
		t.Fatalf("the clip went up as %q, which ComfyUI's video loader would not offer", uploaded)
	}
	g := comfy.lastGraph()
	if graphNode(t, g, "LoadVideo")["file"] != uploaded {
		t.Fatal("the graph does not load the uploaded clip")
	}
	if size := graphNode(t, g, "ImageScale"); size["width"] != 1120.0 || size["height"] != 1664.0 {
		t.Fatalf("enlarged to %v×%v", size["width"], size["height"])
	}
	if up.Clip.Gallery == "" || up.Clip.Gallery == first.Clip.Gallery || up.Clip.Width != 1120 ||
		up.Clip.Recipe != "upscaled 2× with 4x-UltraSharp to 1120×1664" {
		t.Fatalf("upscaled = %+v", up.Clip)
	}
	meta := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/image/"+up.Clip.Gallery+"/metadata", "")
	var info genRecord
	_ = json.Unmarshal(meta.Body.Bytes(), &info)
	if info.Prompt != "she waves" || info.Upscaled == nil || info.Upscaled.Scale != 2 || info.Clip == nil || info.Clip.Source != first.Clip.Gallery {
		t.Fatalf("record = %s", meta.Body)
	}

	// From its preview alone it is enlarged too, by the model's own factor.
	postClip(t, s, token, "/api/imagegen/clip/upscale", map[string]any{"id": first.Clip.ID, "scale": 1.5})
	if by := graphNode(t, comfy.lastGraph(), "ImageScaleBy")["scale_by"]; by != 1.5 {
		t.Fatalf("resized by %v", by)
	}

	for _, bad := range []string{
		`{"gallery":"` + first.Clip.Gallery + `","scale":5}`,
		`{"gallery":"` + first.Clip.Gallery + `","scale":1}`,
		`{"gallery":"` + generateOn(t, s, token, `{"prompt":"a fox"}`).Images[0].Gallery + `","scale":2}`,
	} {
		if rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/clip/upscale", bad); rec.Code != http.StatusBadRequest {
			t.Fatalf("%s: %d %s", bad, rec.Code, rec.Body)
		}
	}
}

func TestAClipTakesTheCardFromTheImageModelAndThePictureAfterItGivesItBack(t *testing.T) {
	s, token, comfy, a1111 := clipStudio(t)
	calls := func() string {
		a1111.mu.Lock()
		defer a1111.mu.Unlock()
		return strings.Join(a1111.calls, ",")
	}
	animate(t, s, token)
	if calls() != "unload" || comfy.freeCount() != 0 {
		t.Fatalf("after a clip: A1111 %q, ComfyUI freed %d times", calls(), comfy.freeCount())
	}
	generateOn(t, s, token, `{"prompt":"a fox"}`)
	if calls() != "unload,reload" || comfy.freeCount() != 1 {
		t.Fatalf("after a picture: A1111 %q, ComfyUI freed %d times", calls(), comfy.freeCount())
	}
	generateOn(t, s, token, `{"prompt":"a fox"}`)
	if calls() != "unload,reload" || comfy.freeCount() != 1 {
		t.Fatalf("a second picture moved models again: A1111 %q, ComfyUI freed %d times", calls(), comfy.freeCount())
	}

	// Kept by Settings, the checkpoint stays where it is and ComfyUI keeps Wan.
	cur := s.settings.Get()
	cur.ClipKeepImageModel = true
	s.settings.Set(cur)
	animate(t, s, token)
	generateOn(t, s, token, `{"prompt":"a fox"}`)
	if calls() != "unload,reload" || comfy.freeCount() != 1 {
		t.Fatalf("with the model kept: A1111 %q, ComfyUI freed %d times", calls(), comfy.freeCount())
	}
}

func TestADetachedClipIsAnsweredAtOnceAndCollectedFromItsJob(t *testing.T) {
	s, token, _, _ := clipStudio(t)
	picture := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngOf(t, 64, 96, 7))
	body, _ := json.Marshal(map[string]any{"from": "image", "prompt": "she waves", "initImage": picture, "jobId": "clip-detached-1", "detach": true})
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/clip", string(body))
	if rec.Code != http.StatusAccepted || !strings.Contains(rec.Body.String(), `"accepted":true`) {
		t.Fatalf("detached clip: %d %s", rec.Code, rec.Body)
	}
	var state genProgressResponse
	deadline := time.Now().Add(10 * time.Second)
	for !state.Done && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
		poll := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/progress/clip-detached-1?seen=-1", "")
		_ = json.Unmarshal(poll.Body.Bytes(), &state)
	}
	if !state.Done || state.Result == nil || state.Result.Clip == nil || state.Result.Clip.Gallery == "" {
		t.Fatalf("job = %+v", state)
	}

	// A bad request is still refused there and then, not left for the job to say.
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/clip", `{"from":"image","prompt":"x","jobId":"clip-detached-2","detach":true}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("no picture: %d %s", rec.Code, rec.Body)
	}
	// Detached with nothing to follow it by is refused too.
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/clip", string(body[:len(body)-1])+`,"jobId":""}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("no job id: %d %s", rec.Code, rec.Body)
	}
}

func TestALoopingClipIsAskedOfComfyUIAndSaysSoInItsRecord(t *testing.T) {
	s, token, comfy, _ := clipStudio(t)
	picture := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngOf(t, 64, 96, 200))
	out := postClip(t, s, token, "/api/imagegen/clip", map[string]any{"from": "image", "prompt": "she blinks", "initImage": picture, "loop": true})
	graphNode(t, comfy.lastGraph(), "WanFirstLastFrameToVideo")
	if !strings.HasSuffix(out.Clip.Recipe, " · loop") {
		t.Fatalf("recipe = %q", out.Clip.Recipe)
	}
	if rec := galleryRecordOf(t, s, token, out.Clip.Gallery); rec.Clip == nil || !rec.Clip.Loop {
		t.Fatalf("record = %+v", rec.Clip)
	}
	// From words there is no picture to come back to, and the flag is dropped.
	words := postClip(t, s, token, "/api/imagegen/clip", map[string]any{"from": "text", "prompt": "rain on a window", "loop": true,
		"models": studioPair})
	if strings.Contains(words.Clip.Recipe, "loop") {
		t.Fatalf("a clip from words looped: %q", words.Clip.Recipe)
	}
}
