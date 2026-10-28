package imagegen

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestAModelNameKeepsWhatAFileAndAPromptCanBothCarry(t *testing.T) {
	cases := map[string]string{
		"Makima (Chainsaw Man) | Pony":   "Makima Chainsaw Man Pony",
		"  ✨ shiny  ✨ ":                   "shiny",
		"a:b>c/d\\e":                     "a b c d e",
		"雷電将軍 v1.0":                      "雷電将軍 v1.0",
		"--__..":                         "",
		"keep_under-scores and.dots ok": "keep_under-scores and.dots ok",
	}
	for in, want := range cases {
		if got := CleanModelName(in); got != want {
			t.Errorf("CleanModelName(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestRenamingAModelFileTakesEverySidecarAndRefusesANameThatIsTaken(t *testing.T) {
	dir := t.TempDir()
	for _, f := range []string{"x.safetensors", "x.json", "x.preview.png", "x.civitai.info", "x.v2.safetensors", "taken.safetensors"} {
		_ = os.WriteFile(filepath.Join(dir, f), []byte(f), 0o644)
	}
	got, err := renameModelFile(filepath.Join(dir, "x.safetensors"), "New name")
	if err != nil || got != filepath.Join(dir, "New name.safetensors") {
		t.Fatalf("got %q, %v", got, err)
	}
	for _, f := range []string{"New name.safetensors", "New name.json", "New name.preview.png", "New name.civitai.info", "x.v2.safetensors"} {
		if _, err := os.Stat(filepath.Join(dir, f)); err != nil {
			t.Errorf("%s is missing", f)
		}
	}
	if _, err := renameModelFile(filepath.Join(dir, "New name.safetensors"), "taken"); err == nil {
		t.Error("renaming onto another model's file should be refused")
	}
	if _, err := renameModelFile(filepath.Join(dir, "New name.safetensors"), "::"); err == nil {
		t.Error("a name with nothing in it should be refused")
	}
	// A detector typed with its extension keeps one.
	_ = os.WriteFile(filepath.Join(dir, "d.pt"), []byte("d"), 0o644)
	if got, err := renameModelFile(filepath.Join(dir, "d.pt"), "feet_yolov8s.pt"); err != nil || filepath.Base(got) != "feet_yolov8s.pt" {
		t.Errorf("got %q, %v", got, err)
	}
}

func TestADetectorIsRenamedInsideADetailersFolderOnly(t *testing.T) {
	dir := t.TempDir()
	_ = os.MkdirAll(filepath.Join(dir, "Stable-diffusion"), 0o755)
	_ = os.MkdirAll(filepath.Join(dir, "adetailer"), 0o755)
	_ = os.WriteFile(filepath.Join(dir, "adetailer", "v10.pt"), []byte("d"), 0o644)
	c := New()
	c.ModelsDir = func() string { return dir }
	got, err := c.A1111RenameDetector("adetailer/v10.pt", "feet_yolov8s")
	if err != nil {
		t.Fatal(err)
	}
	if *got != (ModelRename{OldKey: "adetailer/v10.pt", NewKey: "adetailer/feet_yolov8s.pt", OldName: "v10.pt", NewName: "feet_yolov8s.pt"}) {
		t.Errorf("got %+v", got)
	}
	if _, err := c.A1111RenameDetector("Lora/x.safetensors", "y"); err == nil {
		t.Error("a key outside the detector folder should be refused")
	}
}

func TestRestartIsOfferedOnlyWhenAutomatic1111ListsTheRoute(t *testing.T) {
	for _, withFlag := range []bool{true, false} {
		gen := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.URL.Path {
			case "/sdapi/v1/sd-models":
				_, _ = w.Write([]byte(`[]`))
			case "/openapi.json":
				if withFlag {
					_, _ = w.Write([]byte(`{"paths":{"/sdapi/v1/txt2img":{},"/sdapi/v1/server-restart":{}}}`))
				} else {
					_, _ = w.Write([]byte(`{"paths":{"/sdapi/v1/txt2img":{}}}`))
				}
			default:
				http.NotFound(w, r)
			}
		}))
		if got := New().CanRestart(context.Background(), gen.URL); got != withFlag {
			t.Errorf("with the flag %v: CanRestart = %v", withFlag, got)
		}
		gen.Close()
	}
}

func TestARestartThatDropsTheConnectionIsTheRestartUnderWay(t *testing.T) {
	gen := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			_, _ = w.Write([]byte(`[]`))
		case "/sdapi/v1/server-restart":
			// A1111 exits before it answers.
			conn, _, _ := w.(http.Hijacker).Hijack()
			_ = conn.Close()
		default:
			http.NotFound(w, r)
		}
	}))
	defer gen.Close()
	if err := New().Restart(context.Background(), gen.URL); err != nil {
		t.Errorf("Restart = %v", err)
	}
	invoke := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/app/version" {
			_, _ = w.Write([]byte(`{"version":"5.0"}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer invoke.Close()
	if err := New().Restart(context.Background(), invoke.URL); !errors.Is(err, ErrRestartUnsupported) {
		t.Errorf("InvokeAI: %v", err)
	}
}
