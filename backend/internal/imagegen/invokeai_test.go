package imagegen

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// stubInvoke stands in for an InvokeAI server: version probe, model list, enqueue,
// queue-item polling, image download and delete. It records the enqueued batch and
// which gallery images were deleted.
type stubInvoke struct {
	mu      sync.Mutex
	batch   map[string]any
	deleted []string
}

func (st *stubInvoke) server(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v1/app/version":
			fmt.Fprint(w, `{"version":"5.4.0"}`)
		case r.URL.Path == "/openapi.json":
			fmt.Fprint(w, `{"components":{"schemas":{"ADetailerInvocation":{"properties":{"type":{"const":"adetailer"}}}}}}`)
		case r.URL.Path == "/api/v2/models/":
			fmt.Fprint(w, `{"models":[
				{"key":"key-main","hash":"h1","name":"AnimeThing","base":"sd-1","type":"main",
					"default_settings":{"steps":30,"cfg_scale":6.5,"cfg_rescale_multiplier":0.25,
					"width":512,"height":768,"vae_precision":"fp16"}},
				{"key":"key-flux","hash":"h3","name":"FluxThing","base":"flux","type":"main"},
				{"key":"key-lora","hash":"h2","name":"detail-tweaker","base":"sd-1","type":"lora",
					"trigger_phrases":["fine detail","sharp eyes"]},
				{"key":"key-lora-xl","hash":"h4","name":"xl-only","base":"sdxl","type":"lora"},
				{"key":"key-vae","hash":"h5","name":"fixed-vae","base":"sd-1","type":"vae"}
			]}`)
		case r.URL.Path == "/api/v1/style_presets/":
			fmt.Fprint(w, `[{"id":"sp1","name":"My Anime","type":"user",
				"preset_data":{"positive_prompt":"{prompt}, anime style","negative_prompt":"photo"}},
				{"id":"sp2","name":"Shipped Preset","type":"default",
				"preset_data":{"positive_prompt":"{prompt}, cinematic","negative_prompt":""}}]`)
		case r.URL.Path == "/api/v2/models/i/key-main/image":
			w.Header().Set("Content-Type", "image/png")
			fmt.Fprint(w, "COVERPNG")
		case r.URL.Path == "/api/v1/queue/default/enqueue_batch":
			var payload struct {
				Batch map[string]any `json:"batch"`
			}
			_ = json.NewDecoder(r.Body).Decode(&payload)
			st.mu.Lock()
			st.batch = payload.Batch
			st.mu.Unlock()
			fmt.Fprint(w, `{"item_ids":[11,12],"batch":{"batch_id":"b1"}}`)
		case strings.HasPrefix(r.URL.Path, "/api/v1/queue/default/i/"):
			id := strings.TrimPrefix(r.URL.Path, "/api/v1/queue/default/i/")
			fmt.Fprintf(w, `{"item_id":%s,"status":"completed","session":{"results":{
				"l2i:0":{"type":"image_output","image":{"image_name":"img-%s.png"}}
			}}}`, id, id)
		case strings.HasSuffix(r.URL.Path, "/full") && strings.HasPrefix(r.URL.Path, "/api/v1/images/i/"):
			name := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/images/i/"), "/full")
			fmt.Fprintf(w, "PNGDATA:%s", name)
		case strings.HasSuffix(r.URL.Path, "/metadata") && strings.HasPrefix(r.URL.Path, "/api/v1/images/i/"):
			fmt.Fprint(w, `{
				"positive_prompt":"portrait, red dress","negative_prompt":"blurry",
				"model":{"key":"key-main","hash":"model-sha","name":"AnimeThing"},
				"vae":{"key":"key-vae","hash":"vae-sha","name":"fixed-vae"},
				"scheduler":"dpmpp_2m_k","seed":9988,"steps":30,"cfg_scale":6.5,
				"cfg_rescale_multiplier":0.25,"clip_skip":2,"width":832,"height":1216,
				"seamless_x":true,"seamless_y":false,"rand_device":"cpu",
				"loras":[{"model":{"key":"key-lora","hash":"lora-sha","name":"detail-tweaker"},"weight":0.8}]
			}`)
		case r.Method == http.MethodDelete && strings.HasPrefix(r.URL.Path, "/api/v1/images/i/"):
			st.mu.Lock()
			st.deleted = append(st.deleted, strings.TrimPrefix(r.URL.Path, "/api/v1/images/i/"))
			st.mu.Unlock()
			fmt.Fprint(w, `{}`)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestBackendDetection(t *testing.T) {
	invoke := (&stubInvoke{}).server(t)
	a1111 := httptest.NewServer(http.HandlerFunc(http.NotFound))
	t.Cleanup(a1111.Close)

	c := New()
	if kind, err := c.Backend(context.Background(), invoke.URL); err != nil || kind != KindInvokeAI {
		t.Fatalf("invoke detection = %q, %v; want invokeai", kind, err)
	}
	if !c.SupportsADetailer(context.Background(), invoke.URL) {
		t.Fatal("InvokeAI OpenAPI advertises adetailer but capability was not detected")
	}
	if kind, err := c.Backend(context.Background(), a1111.URL); err != nil || kind != KindA1111 {
		t.Fatalf("a1111 detection = %q, %v; want a1111", kind, err)
	}
}

func TestGalleryImageMetadataIsPortableAndComplete(t *testing.T) {
	invoke := (&stubInvoke{}).server(t)
	meta, err := New().GalleryImageMetadata(context.Background(), invoke.URL, "made here.png")
	if err != nil {
		t.Fatal(err)
	}
	if meta.Prompt != "portrait, red dress" || meta.NegativePrompt != "blurry" {
		t.Fatalf("prompts = %q / %q", meta.Prompt, meta.NegativePrompt)
	}
	if meta.Model != "key-main" || meta.ModelHash != "model-sha" || meta.VAE != "key-vae" {
		t.Fatalf("resources = model %q (%q), vae %q", meta.Model, meta.ModelHash, meta.VAE)
	}
	if meta.Seed != 9988 || meta.Steps != 30 || meta.Width != 832 || meta.Height != 1216 {
		t.Fatalf("core parameters not preserved: %+v", meta)
	}
	if !meta.CPUNoise || len(meta.Loras) != 1 || meta.Loras[0].Hash != "lora-sha" || meta.Loras[0].Weight != 0.8 {
		t.Fatalf("noise/LoRA metadata not preserved: %+v", meta)
	}
}

func TestInvokeModelsAndLoras(t *testing.T) {
	srv := (&stubInvoke{}).server(t)
	c := New()

	models, err := c.Models(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("models: %v", err)
	}
	// Both mains list — the unsupported base only errors if actually chosen.
	if len(models) != 2 || models[0].Title != "key-main" || models[0].Name != "AnimeThing" {
		t.Fatalf("models = %+v", models)
	}
	// Per-model defaults ride along so pickers can apply them on selection.
	if models[0].Base != "sd-1" || models[0].Defaults == nil || models[0].Defaults.Steps != 30 ||
		models[0].Defaults.Width != 512 || models[0].Defaults.CfgRescale != 0.25 || models[0].Defaults.VaePrecision != "fp16" {
		t.Fatalf("model defaults = %+v", models[0])
	}
	if models[1].Defaults != nil {
		t.Fatalf("flux model should carry no defaults: %+v", models[1])
	}
	loras, err := c.Loras(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("loras: %v", err)
	}
	if len(loras) != 2 || loras[0].Name != "detail-tweaker" || len(loras[0].TriggerPhrases) != 2 {
		t.Fatalf("loras = %+v", loras)
	}
	vaes, err := c.Vaes(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("vaes: %v", err)
	}
	if len(vaes) != 1 || vaes[0].Key != "key-vae" || vaes[0].Base != "sd-1" {
		t.Fatalf("vaes = %+v", vaes)
	}
	templates, err := c.Templates(context.Background(), srv.URL)
	if err != nil {
		t.Fatalf("templates: %v", err)
	}
	if len(templates) != 2 || templates[0].Name != "My Anime" || !strings.Contains(templates[0].Prompt, "{prompt}") {
		t.Fatalf("templates = %+v", templates)
	}
	// The "user" preset is the user's own; the "default" one is a shipped built-in.
	if templates[0].BuiltIn {
		t.Errorf("user preset marked built-in: %+v", templates[0])
	}
	if !templates[1].BuiltIn {
		t.Errorf("default preset not marked built-in: %+v", templates[1])
	}
}

func TestInvokeAdvancedTextToImageGraph(t *testing.T) {
	main := invokeModelRecord{Key: "main", Hash: "h", Name: "Main", Base: "sd-1", Type: "main"}
	graph := buildInvokeGraph(main, nil, nil, GenerateRequest{
		Prompt: "tile", Steps: 20, Width: 512, Height: 512, CfgScale: 7,
		CfgRescale: 0.35, ClipSkip: 2, SeamlessX: true, VAEPrecision: "fp16",
		CPUNoise: true, Board: "board-1",
	}, "euler_a")
	raw, _ := json.Marshal(graph)
	s := string(raw)
	for _, want := range []string{
		`"cfg_rescale_multiplier":0.35`, `"type":"clip_skip"`, `"skipped_layers":2`,
		`"type":"seamless"`, `"seamless_x":true`, `"use_cpu":true`,
		`"fp32":true`, `"board_id":"board-1"`,
	} {
		if !strings.Contains(s, want) {
			t.Errorf("advanced graph missing %s: %s", want, s)
		}
	}
}

func TestInvokeADetailerGraph(t *testing.T) {
	main := invokeModelRecord{Key: "main", Hash: "h", Name: "Main", Base: "sd-1", Type: "main"}
	graph := buildInvokeGraph(main, nil, nil, GenerateRequest{
		Prompt: "portrait", Steps: 24, Width: 512, Height: 768, CfgScale: 7,
		Detailer: Detailer{Enabled: true, Model: "hand_yolov8n.pt", Prompt: "detailed hands",
			Confidence: .35, Denoise: .4, MaskBlur: 6},
	}, "euler_a")
	raw, _ := json.Marshal(graph)
	s := string(raw)
	for _, want := range []string{
		`"type":"adetailer"`, `"target":"hand"`, `"model_path":"auto"`,
		`"denoise_strength":0.4`, `"field":"image"`, `"is_intermediate":true`,
	} {
		if !strings.Contains(s, want) {
			t.Errorf("ADetailer graph missing %s: %s", want, s)
		}
	}
}

func TestInvokeCreatesBoardAndUpdatesCover(t *testing.T) {
	var gotCover, gotBoard bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v1/app/version":
			fmt.Fprint(w, `{"version":"6.0.0"}`)
		case r.URL.Path == "/api/v2/models/":
			fmt.Fprint(w, `{"models":[{"key":"key-main","name":"Main","base":"sd-1","type":"main"}]}`)
		case r.Method == http.MethodPatch && r.URL.Path == "/api/v2/models/i/key-main/image":
			file, _, err := r.FormFile("image")
			if err == nil {
				defer file.Close()
				var b strings.Builder
				_, _ = io.Copy(&b, file)
				gotCover = b.String() == "PNG"
			}
			fmt.Fprint(w, `{}`)
		case r.Method == http.MethodPost && r.URL.Path == "/api/v1/boards/":
			gotBoard = r.URL.Query().Get("board_name") == "Favorites"
			w.WriteHeader(http.StatusCreated)
			fmt.Fprint(w, `{"board_id":"b1","board_name":"Favorites","image_count":0}`)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)

	c := New()
	if err := c.UpdateCover(context.Background(), srv.URL, "Main", []byte("PNG"), "image/png"); err != nil {
		t.Fatalf("update cover: %v", err)
	}
	board, err := c.CreateBoard(context.Background(), srv.URL, "Favorites")
	if err != nil || board.ID != "b1" {
		t.Fatalf("create board = %+v, %v", board, err)
	}
	if !gotCover || !gotBoard {
		t.Fatalf("round trip cover=%v board=%v", gotCover, gotBoard)
	}
}

func TestInvokeCover(t *testing.T) {
	srv := (&stubInvoke{}).server(t)
	c := New()
	// By key and by display name; a model without cover art is a clean miss.
	for _, sel := range []string{"key-main", "AnimeThing"} {
		data, ct, err := c.Cover(context.Background(), srv.URL, sel)
		if err != nil || string(data) != "COVERPNG" || ct != "image/png" {
			t.Fatalf("cover(%q) = %q, %q, %v", sel, data, ct, err)
		}
	}
	if _, _, err := c.Cover(context.Background(), srv.URL, "FluxThing"); err == nil {
		t.Fatal("cover for a model without one should fail")
	}
}

func TestInvokeGenerate(t *testing.T) {
	st := &stubInvoke{}
	srv := st.server(t)
	c := New()

	res, err := c.Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt:     "portrait",
		Checkpoint: "key-main",
		VAE:        "fixed-vae",
		Steps:      20, Width: 512, Height: 768, CfgScale: 7,
		Seed: 1000, Count: 2,
		Loras: []LoraWeight{
			{Name: "detail-tweaker", Weight: 0.75},
			{Name: "xl-only", Weight: 1}, // base mismatch: must be skipped, not fatal
		},
	})
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if len(res.Images) != 2 || string(res.Images[0]) != "PNGDATA:img-11.png" || string(res.Images[1]) != "PNGDATA:img-12.png" {
		t.Fatalf("images = %q", res.Images)
	}
	if res.Seed != 1000 || len(res.Seeds) != 2 || res.Seeds[1] != 1001 {
		t.Fatalf("seeds = %d %v", res.Seed, res.Seeds)
	}

	st.mu.Lock()
	defer st.mu.Unlock()
	// The gallery copies stay put — InvokeAI keeps them and the Gallery panel
	// browses them; only an explicit gallery delete removes one.
	if len(st.deleted) != 0 {
		t.Fatalf("deleted = %v, want no gallery deletions during generate", st.deleted)
	}
	// The enqueued graph carries the chosen model, exactly one LoRA (the sd-1 one),
	// and per-run seeds for the noise node.
	raw, _ := json.Marshal(st.batch)
	batch := string(raw)
	if !strings.Contains(batch, `"key":"key-main"`) {
		t.Errorf("batch is missing the chosen model: %s", batch)
	}
	if !strings.Contains(batch, `"key":"key-lora"`) || strings.Contains(batch, `"key":"key-lora-xl"`) {
		t.Errorf("batch LoRA selection wrong: %s", batch)
	}
	if !strings.Contains(batch, `"node_path":"noise"`) || !strings.Contains(batch, `[1000,1001]`) {
		t.Errorf("batch seed data wrong: %s", batch)
	}
	// The picked VAE decodes the latents, and it decodes in fp32 — fp16 VAE decode is
	// what produced all-black images.
	if !strings.Contains(batch, `"key":"key-vae"`) || !strings.Contains(batch, `"vae_loader"`) {
		t.Errorf("batch is missing the chosen VAE: %s", batch)
	}
	if !strings.Contains(batch, `"fp32":true`) {
		t.Errorf("l2i must decode in fp32: %s", batch)
	}
}

func TestInvokeGenerateRejectsUnsupportedBase(t *testing.T) {
	srv := (&stubInvoke{}).server(t)
	c := New()
	_, err := c.Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "x", Checkpoint: "key-flux", Steps: 1, Width: 64, Height: 64, CfgScale: 7, Seed: 1, Count: 1,
	})
	if err == nil || !strings.Contains(err.Error(), "flux") {
		t.Fatalf("err = %v, want an unsupported-base error naming flux", err)
	}
}

func TestInvokeScheduler(t *testing.T) {
	for in, want := range map[string]string{
		"":                "euler_a",
		"Euler a":         "euler_a",
		"DPM++ 2M Karras": "dpmpp_2m_k",
		"dpmpp_2m":        "dpmpp_2m",
		"Weird Sampler!":  "euler_a",
	} {
		if got := invokeScheduler(in); got != want {
			t.Errorf("invokeScheduler(%q) = %q, want %q", in, got, want)
		}
	}
}
