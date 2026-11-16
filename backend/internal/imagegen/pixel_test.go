package imagegen

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sync"
	"testing"
)

// pixelForge is a Forge with sd-pixel installed, offering it to txt2img when loaded
// says so, and keeping what it was sent.
type pixelForge struct {
	mu      sync.Mutex
	loaded  bool
	inMain  []any // postprocessing_enable_in_main_ui as Forge has it saved; nil when never saved
	written []any // what OppaiLib saved there, if anything
	txt2img map[string]any
}

func (f *pixelForge) server(t *testing.T) string {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /sdapi/v1/scripts", func(w http.ResponseWriter, r *http.Request) {
		scripts := []string{"ADetailer"}
		if f.loaded {
			scripts = append(scripts, "pixel")
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"txt2img": scripts, "img2img": scripts})
	})
	mux.HandleFunc("GET /sdapi/v1/options", func(w http.ResponseWriter, r *http.Request) {
		opts := map[string]any{"sd_model_checkpoint": "pony"}
		if f.inMain != nil {
			opts[pixelSetting] = f.inMain
		}
		_ = json.NewEncoder(w).Encode(opts)
	})
	mux.HandleFunc("POST /sdapi/v1/options", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		f.written, _ = body[pixelSetting].([]any)
		f.mu.Unlock()
		_, _ = w.Write([]byte("null"))
	})
	mux.HandleFunc("POST /sdapi/v1/txt2img", func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		_ = json.NewDecoder(r.Body).Decode(&f.txt2img)
		f.mu.Unlock()
		_ = json.NewEncoder(w).Encode(map[string]any{"images": []string{"aGVsbG8="}, "info": `{"seed":1}`})
	})
	mux.HandleFunc("/", http.NotFound)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv.URL
}

func pixelRun(p Pixel) GenerateRequest {
	return GenerateRequest{Prompt: "her", Steps: 20, Width: 832, Height: 1216, CfgScale: 6, Seed: 1, Count: 1, Pixel: p}
}

func TestAPixelArtPictureRunsSdPixelLastAtItsOwnSize(t *testing.T) {
	f := &pixelForge{loaded: true}
	base := f.server(t)
	if _, err := New().Generate(context.Background(), base, pixelRun(Pixel{Size: 8, Palette: 32})); err != nil {
		t.Fatal(err)
	}
	args := f.txt2img["alwayson_scripts"].(map[string]any)["pixel"].(map[string]any)["args"]
	// Pixelate, blown back up to its size, by eight, shrunk bicubic, held to 32 colours,
	// no grey threshold.
	want := []any{true, true, 8.0, "Bicubic", true, 32.0, false, 0.0}
	if !reflect.DeepEqual(args, want) {
		t.Fatalf("args = %v, want %v", args, want)
	}
	if f.written != nil {
		t.Fatal("Forge's settings were written with sd-pixel already loaded")
	}
}

func TestWithoutAPaletteTheColoursAreLeftBe(t *testing.T) {
	f := &pixelForge{loaded: true}
	base := f.server(t)
	if _, err := New().Generate(context.Background(), base, pixelRun(Pixel{Size: 4})); err != nil {
		t.Fatal(err)
	}
	args := f.txt2img["alwayson_scripts"].(map[string]any)["pixel"].(map[string]any)["args"].([]any)
	if args[4] != false {
		t.Fatalf("args = %v", args)
	}
}

func TestAPictureThatIsNotPixelArtLeavesSdPixelAlone(t *testing.T) {
	f := &pixelForge{}
	base := f.server(t)
	if _, err := New().Generate(context.Background(), base, pixelRun(Pixel{Size: 1})); err != nil {
		t.Fatal(err)
	}
	if scripts, _ := f.txt2img["alwayson_scripts"].(map[string]any); scripts["pixel"] != nil {
		t.Fatalf("scripts = %v", scripts)
	}
}

func TestAForgeThatHasNotLoadedSdPixelIsToldToAndAskedToRestart(t *testing.T) {
	f := &pixelForge{inMain: []any{"codeformer"}}
	base := f.server(t)
	_, err := New().Generate(context.Background(), base, pixelRun(Pixel{Size: 8}))
	if !errors.Is(err, ErrPixelMissing) {
		t.Fatalf("err = %v", err)
	}
	// What was there is kept, and sd-pixel added to it.
	if !reflect.DeepEqual(f.written, []any{"codeformer", "pixel"}) {
		t.Fatalf("setting written = %v", f.written)
	}
	if f.txt2img != nil {
		t.Fatal("the picture was drawn without its pixel art")
	}
}

func TestAForgeTurnedOnButStillWithoutSdPixelIsNotWrittenToAgain(t *testing.T) {
	f := &pixelForge{inMain: []any{"pixel"}}
	base := f.server(t)
	if _, err := New().Generate(context.Background(), base, pixelRun(Pixel{Size: 8})); !errors.Is(err, ErrPixelMissing) {
		t.Fatalf("err = %v", err)
	}
	if f.written != nil {
		t.Fatalf("setting written again: %v", f.written)
	}
}

func TestComfyUIModeHasNoSdPixelToMakePixelArtWith(t *testing.T) {
	c, f, base := comfyClient(t)
	if _, err := c.Generate(context.Background(), base, pixelRun(Pixel{Size: 8})); !errors.Is(err, ErrPixelUnsupported) {
		t.Fatalf("err = %v", err)
	}
	if len(f.graphs) != 0 {
		t.Fatal("a picture was drawn without its pixel art")
	}
}
