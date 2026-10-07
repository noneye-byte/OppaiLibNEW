package imagegen

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func fakeA1111(t *testing.T, onCall func(path string, payload map[string]any, w http.ResponseWriter)) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/app/version" {
			http.NotFound(w, r)
			return
		}
		var payload map[string]any
		_ = json.NewDecoder(r.Body).Decode(&payload)
		onCall(r.URL.Path, payload, w)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestAPictureWithAStartingImageGoesToImg2ImgWithItsStrength(t *testing.T) {
	var gotPath string
	var got map[string]any
	srv := fakeA1111(t, func(path string, payload map[string]any, w http.ResponseWriter) {
		gotPath, got = path, payload
		fmt.Fprint(w, `{"images":["aGVsbG8="],"info":"{\"seed\":7}"}`)
	})
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "same, from behind", Steps: 20, Width: 512, Height: 768, Count: 1, Seed: 7,
		InitImage: []byte("start"), Denoise: 0.4,
	})
	if err != nil {
		t.Fatal(err)
	}
	if gotPath != "/sdapi/v1/img2img" {
		t.Fatalf("went to %s", gotPath)
	}
	images, _ := got["init_images"].([]any)
	if len(images) != 1 || images[0] != base64.StdEncoding.EncodeToString([]byte("start")) {
		t.Fatalf("init_images = %v", got["init_images"])
	}
	if got["denoising_strength"] != 0.4 {
		t.Fatalf("denoising_strength = %v", got["denoising_strength"])
	}
}

func TestAnOrdinaryPictureStaysOnTxt2ImgWithNoImg2ImgFields(t *testing.T) {
	var gotPath string
	var got map[string]any
	srv := fakeA1111(t, func(path string, payload map[string]any, w http.ResponseWriter) {
		gotPath, got = path, payload
		fmt.Fprint(w, `{"images":["aGVsbG8="],"info":"{}"}`)
	})
	if _, err := New().Generate(context.Background(), srv.URL, GenerateRequest{Prompt: "x", Count: 1}); err != nil {
		t.Fatal(err)
	}
	if gotPath != "/sdapi/v1/txt2img" {
		t.Fatalf("went to %s", gotPath)
	}
	if _, has := got["init_images"]; has {
		t.Fatal("a txt2img call carried init_images")
	}
}

func TestControlUnitsRideBesideADetailerInAlwaysOnScripts(t *testing.T) {
	var got map[string]any
	srv := fakeA1111(t, func(path string, payload map[string]any, w http.ResponseWriter) {
		got = payload
		fmt.Fprint(w, `{"images":["aGVsbG8="],"info":"{}"}`)
	})
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "x", Count: 1,
		Detailer: Detailer{Enabled: true},
		Controls: []ControlUnit{{Image: []byte("pose"), Module: "openpose_full", Model: "control_openpose"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	scripts := got["alwayson_scripts"].(map[string]any)
	if _, ok := scripts["ADetailer"]; !ok {
		t.Fatal("the detailer was dropped when a control unit was added")
	}
	args := scripts["controlnet"].(map[string]any)["args"].([]any)
	unit := args[0].(map[string]any)
	if unit["module"] != "openpose_full" || unit["model"] != "control_openpose" || unit["weight"] != 1.0 || unit["enabled"] != true {
		t.Fatalf("unit = %v", unit)
	}
}

func TestAGeneratorWithoutControlNetSaysSoInsteadOfFailingVaguely(t *testing.T) {
	srv := fakeA1111(t, func(path string, payload map[string]any, w http.ResponseWriter) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		fmt.Fprint(w, `{"detail":"always on script controlnet not found"}`)
	})
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "x", Count: 1, Controls: []ControlUnit{{Image: []byte("p")}},
	})
	if !errors.Is(err, ErrControlUnsupported) {
		t.Fatalf("err = %v", err)
	}
}

func TestAnInvokeGraphFromAPictureEncodesItAndStartsPartWay(t *testing.T) {
	main := invokeModelRecord{Key: "k", Name: "m", Base: "sd-1", Type: "main"}
	graph := buildInvokeGraphFrom(main, nil, nil, GenerateRequest{Prompt: "p", Width: 512, Height: 512, Steps: 20, Denoise: 0.3}, "euler", "init.png")
	nodes := graph["nodes"].(map[string]any)
	i2l, ok := nodes["i2l"].(map[string]any)
	if !ok || i2l["image"].(map[string]any)["image_name"] != "init.png" {
		t.Fatalf("i2l = %v", nodes["i2l"])
	}
	start := nodes["denoise"].(map[string]any)["denoising_start"].(float64)
	if start < 0.69 || start > 0.71 {
		t.Fatalf("denoising_start = %v, want 0.7", start)
	}
	if nodes["metadata"].(map[string]any)["generation_mode"] != "img2img" {
		t.Fatal("metadata does not say img2img")
	}
	linked := false
	for _, e := range graph["edges"].([]map[string]any) {
		if e["source"].(map[string]any)["node_id"] == "i2l" && e["destination"].(map[string]any)["field"] == "latents" {
			linked = true
		}
	}
	if !linked {
		t.Fatal("the encoded picture never reaches the denoiser")
	}
}

func TestAnInvokeGraphWithoutAPictureIsUnchanged(t *testing.T) {
	main := invokeModelRecord{Key: "k", Name: "m", Base: "sd-1", Type: "main"}
	graph := buildInvokeGraph(main, nil, nil, GenerateRequest{Prompt: "p", Width: 512, Height: 512, Steps: 20}, "euler")
	if _, has := graph["nodes"].(map[string]any)["i2l"]; has {
		t.Fatal("txt2img graph has an i2l node")
	}
}

func TestInvokeRefusesControlUnitsRatherThanIgnoringThem(t *testing.T) {
	_, err := New().invokeGenerate(context.Background(), "http://127.0.0.1:1", GenerateRequest{Controls: []ControlUnit{{}}})
	if !errors.Is(err, ErrControlUnsupported) {
		t.Fatalf("err = %v", err)
	}
}

func TestAWholeStringSeedPlaceholderBecomesANumber(t *testing.T) {
	graph, err := substituteComfyVars(`{"3":{"inputs":{"seed":"{{seed}}","text":"masterpiece, {{prompt}}","image":"{{image}}"}}}`,
		map[string]string{"seed": "42", "prompt": `she "waves"`, "image": "in.png"})
	if err != nil {
		t.Fatal(err)
	}
	inputs := graph["3"].(map[string]any)["inputs"].(map[string]any)
	if inputs["seed"] != 42.0 {
		t.Fatalf("seed = %#v", inputs["seed"])
	}
	if inputs["text"] != `masterpiece, she "waves"` {
		t.Fatalf("text = %#v", inputs["text"])
	}
	if inputs["image"] != "in.png" {
		t.Fatalf("image = %#v", inputs["image"])
	}
}

func TestAWorkflowSavedInUIFormatIsTurnedAwayWithTheFix(t *testing.T) {
	_, err := substituteComfyVars(`{"nodes":[],"links":[]}`, nil)
	if err == nil || !contains(err.Error(), "API Format") {
		t.Fatalf("err = %v", err)
	}
}

func TestFinishedClipFilesListMovingPicturesFirstAndSkipPreviews(t *testing.T) {
	var h comfyHistory
	_ = json.Unmarshal([]byte(`{"outputs":{
		"9":{"images":[{"filename":"still.png","subfolder":"","type":"output"},{"filename":"p.png","type":"temp"}]},
		"12":{"gifs":[{"filename":"clip.mp4","subfolder":"v","type":"output"}]}
	},"status":{"status_str":"success"}}`), &h)
	files := comfyFiles(h)
	if len(files) != 2 || files[0].Filename != "clip.mp4" || files[1].Filename != "still.png" {
		t.Fatalf("files = %+v", files)
	}
}

func TestTheClipCrawlNeverClaimsToBeFinished(t *testing.T) {
	if p := crawl(1 << 62); p >= 0.96 {
		t.Fatalf("crawl reached %v", p)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
