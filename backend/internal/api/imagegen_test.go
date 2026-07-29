package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// a 1×1 PNG, the smallest thing a stub generator can hand back that decodes as a real
// image (and so survives the store + thumbnail path).
const onePixelPNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

// stubA1111 stands in for a local Automatic1111 WebUI: it lists one checkpoint and
// answers txt2img with a fixed image and a resolved seed.
func stubA1111(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`[{"title":"rev.safetensors [abc123]","model_name":"rev","hash":"abc123"}]`))
		case "/sdapi/v1/loras":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`[{"name":"detail-tweaker","alias":"Detail Tweaker"}]`))
		case "/sdapi/v1/txt2img":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"images":["` + onePixelPNG + `"],"info":"{\"seed\":4242}"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func enableImageGen(t *testing.T, s *Server, url string) {
	t.Helper()
	cur := s.settings.Get()
	cur.ImageGenURL = url
	s.settings.Set(cur)
	if !s.settings.Get().ImageGenEnabled {
		t.Fatal("image generation did not enable after setting a URL")
	}
}

// The whole ephemeral path: a generate returns preview ids that stream as images and
// never touch the library until an explicit save files one as an image.
func TestImageGenGenerateThenSave(t *testing.T) {
	gen := stubA1111(t)
	s, token := newTestServer(t)
	enableImageGen(t, s, gen.URL)
	h := s.Handler()

	// Status reports the checkpoint the stub lists.
	rec := do(t, h, token, "GET", "/api/imagegen/status", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d %s", rec.Code, rec.Body)
	}
	var status struct {
		Enabled   bool `json:"enabled"`
		Reachable bool `json:"reachable"`
		Models    []struct {
			Title string `json:"title"`
		} `json:"models"`
		Loras []struct {
			Name string `json:"name"`
		} `json:"loras"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &status)
	if !status.Enabled || !status.Reachable || len(status.Models) != 1 || len(status.Loras) != 1 {
		t.Fatalf("status = %+v, want enabled+reachable with one model and one LoRA", status)
	}

	// Generate two images.
	rec = do(t, h, token, "POST", "/api/imagegen/generate",
		`{"prompt":"a test","checkpoint":"`+status.Models[0].Title+`","count":1}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("generate: %d %s", rec.Code, rec.Body)
	}
	var genOut struct {
		Images []struct {
			ID   string `json:"id"`
			Seed int64  `json:"seed"`
		} `json:"images"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &genOut)
	if len(genOut.Images) != 1 {
		t.Fatalf("got %d preview ids, want 1", len(genOut.Images))
	}
	if genOut.Images[0].Seed != 4242 {
		t.Errorf("seed = %d, want the resolved 4242 from the info blob", genOut.Images[0].Seed)
	}
	previewID := genOut.Images[0].ID

	// A generate must not have created a library item.
	rec = do(t, h, token, "GET", "/api/media", "")
	if strings.Contains(rec.Body.String(), `"id"`) && strings.Count(rec.Body.String(), `"id"`) > 0 {
		if !strings.Contains(rec.Body.String(), "[]") && strings.Contains(rec.Body.String(), `"kind"`) {
			t.Fatalf("library is not empty after a bare generate: %s", rec.Body)
		}
	}

	// The preview streams as an image from memory.
	rec = do(t, h, token, "GET", "/api/imagegen/preview/"+previewID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("preview: %d %s", rec.Code, rec.Body)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "image/") {
		t.Errorf("preview Content-Type = %q, want image/*", ct)
	}
	// The opaque, short-lived preview capability remains readable if the browser's
	// login expires during a long outfit run.
	rec = do(t, h, "", "GET", "/api/imagegen/preview/"+previewID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("logged-out preview: %d %s", rec.Code, rec.Body)
	}

	// A reviewed cutout replaces the preview bytes without changing its id.
	rec = do(t, h, token, "PUT", "/api/imagegen/preview/"+previewID,
		`{"imageData":"data:image/png;base64,`+onePixelPNG+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("replace preview: %d %s", rec.Code, rec.Body)
	}

	// Saving crosses into the library as an image.
	rec = do(t, h, token, "POST", "/api/imagegen/save",
		`{"id":"`+previewID+`","title":"my render","tags":["portrait"]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("save: %d %s", rec.Code, rec.Body)
	}
	var saved struct {
		ID int64 `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &saved)
	if saved.ID == 0 {
		t.Fatal("save returned no media id")
	}
	rec = do(t, h, token, "GET", "/api/media", "")
	if !strings.Contains(rec.Body.String(), `"kind":"image"`) {
		t.Errorf("saved generated image not in library: %s", rec.Body)
	}

	// Redo cleanup is idempotent and actually makes the superseded preview disappear.
	rec = do(t, h, token, "DELETE", "/api/imagegen/preview/"+previewID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("delete preview: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, "", "GET", "/api/imagegen/preview/"+previewID, "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("deleted preview: %d, want 404", rec.Code)
	}
}

func TestImageGenAppliesLorasToPrompt(t *testing.T) {
	var gotPrompt string
	gen := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sdapi/v1/txt2img":
			var body struct {
				Prompt string `json:"prompt"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			gotPrompt = body.Prompt
			_, _ = w.Write([]byte(`{"images":["` + onePixelPNG + `"],"info":"{\"seed\":1}"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(gen.Close)
	s, token := newTestServer(t)
	enableImageGen(t, s, gen.URL)
	rec := do(t, s.Handler(), token, "POST", "/api/imagegen/generate",
		`{"prompt":"portrait","loras":[{"name":"detail-tweaker","weight":0.75}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("generate: %d %s", rec.Code, rec.Body)
	}
	if gotPrompt != "portrait <lora:detail-tweaker:0.75>" {
		t.Fatalf("generator prompt = %q", gotPrompt)
	}
}

func TestImageGenRejectsCustomLoraThumbnail(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	rec := do(t, h, token, "PUT", "/api/imagegen/lora-thumb",
		`{"model":"detail-tweaker","imageData":"`+onePixelPNG+`"}`)
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "custom thumbnail uploads are disabled") {
		t.Fatalf("custom LoRA thumbnail = %d %s", rec.Code, rec.Body)
	}
}

// The character library round-trip: create with a thumbnail, list, update, delete.
func TestImageGenCharacters(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, "GET", "/api/imagegen/characters", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"characters":[]`) {
		t.Fatalf("empty list: %d %s", rec.Code, rec.Body)
	}

	rec = do(t, h, token, "POST", "/api/imagegen/characters",
		`{"name":"Rin","prompt":"1girl, red hair","negativePrompt":"blonde","imageData":"`+onePixelPNG+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var created struct {
		ID       string `json:"id"`
		HasThumb bool   `json:"hasThumb"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.ID == "" || !created.HasThumb {
		t.Fatalf("created = %+v", created)
	}

	rec = do(t, h, token, "GET", "/api/imagegen/characters/"+created.ID+"/thumb", "")
	if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "image/") {
		t.Fatalf("thumb: %d %q", rec.Code, rec.Header().Get("Content-Type"))
	}

	// Update keeps the thumbnail when no new image is sent.
	rec = do(t, h, token, "POST", "/api/imagegen/characters",
		`{"id":"`+created.ID+`","name":"Rin (v2)","prompt":"1girl, crimson hair"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"hasThumb":true`) {
		t.Fatalf("update: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/imagegen/characters", "")
	if !strings.Contains(rec.Body.String(), "Rin (v2)") || strings.Contains(rec.Body.String(), "red hair") {
		t.Fatalf("list after update: %s", rec.Body)
	}

	rec = do(t, h, token, "DELETE", "/api/imagegen/characters/"+created.ID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/imagegen/characters", "")
	if !strings.Contains(rec.Body.String(), `"characters":[]`) {
		t.Fatalf("list after delete: %s", rec.Body)
	}
}

// A preview id must expire out of reach: a save against an unknown id 404s rather than
// resurrecting something.
func TestImageGenSaveUnknownPreview(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, "http://127.0.0.1:1") // never reached; save doesn't call it
	rec := do(t, s.Handler(), token, "POST", "/api/imagegen/save", `{"id":"deadbeef","title":"x"}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("save unknown preview: %d, want 404", rec.Code)
	}
}

// Generate is refused when no generator is configured, rather than dialing nothing.
func TestImageGenDisabled(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, "GET", "/api/imagegen/status", "")
	var status struct {
		Enabled bool `json:"enabled"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &status)
	if status.Enabled {
		t.Error("status reports enabled with no URL set")
	}
	rec = do(t, s.Handler(), token, "POST", "/api/imagegen/generate", `{"prompt":"x"}`)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("generate while disabled: %d, want 503", rec.Code)
	}
}

// The prompt endpoint turns speech into a fuller prompt + a non-empty negative.
func TestImageGenPromptEndpoint(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, "POST", "/api/imagegen/prompt", `{"text":"draw me a photo of a woman"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("prompt: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Prompt         string `json:"prompt"`
		NegativePrompt string `json:"negativePrompt"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Prompt == "" || out.NegativePrompt == "" {
		t.Errorf("prompt endpoint returned empties: %+v", out)
	}
	if strings.Contains(strings.ToLower(out.Prompt), "draw me") {
		t.Errorf("prompt kept the spoken framing: %q", out.Prompt)
	}
}
