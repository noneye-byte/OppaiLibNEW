package imagegen

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestComfyUIsModelsFolderIsFoundFromItsOwnFolderOrTheMount(t *testing.T) {
	root := t.TempDir()
	models := filepath.Join(root, "models")
	if err := os.MkdirAll(filepath.Join(models, "loras"), 0o755); err != nil {
		t.Fatal(err)
	}
	if dir, problem := ComfyModelsDir(root); dir != models || problem != "" {
		t.Fatalf("ComfyUI's own folder = %q, %q", dir, problem)
	}
	if dir, _ := ComfyModelsDir(models); dir != models {
		t.Fatalf("the models folder = %q", dir)
	}
	if _, problem := ComfyModelsDir(filepath.Join(root, "nope")); !strings.Contains(problem, "does not exist") {
		t.Fatalf("a missing folder: %q", problem)
	}
	if _, problem := ComfyModelsDir(t.TempDir()); !strings.Contains(problem, "diffusion_models") {
		t.Fatalf("an empty folder: %q", problem)
	}

	orig := comfyMountPoint
	t.Cleanup(func() { comfyMountPoint = orig })
	comfyMountPoint = filepath.Join(root, "unmounted")
	if dir, problem := ComfyModelsDir(""); dir != "" || problem != "" {
		t.Fatalf("nothing set or mounted = %q, %q", dir, problem)
	}
	comfyMountPoint = models
	if dir, _ := ComfyModelsDir(""); dir != models {
		t.Fatalf("the mount = %q", dir)
	}
}

func TestAWanModelGoesToDiffusionModelsUnlessItCarriesEverything(t *testing.T) {
	for _, c := range []struct{ typ, name, want string }{
		{"checkpoint", "Smooth Mix i2v_high.safetensors", "diffusion_models"},
		{"checkpoint", "Smooth Mix i2v_high.gguf", "diffusion_models"},
		{"checkpoint", "Wan 2.2 Rapid AIO v10.safetensors", "checkpoints"},
		{"checkpoint", "wan22-all-in-one.safetensors", "checkpoints"},
		{"checkpoint", "Radio Ratio.safetensors", "diffusion_models"},
		{"lora", "Bounce_low.safetensors", "loras"},
		{"vae", "wan_2.1_vae.safetensors", "vae"},
	} {
		if got, err := comfyFolderFor(InstallSpec{Type: c.typ, FileName: c.name}); err != nil || got != c.want {
			t.Errorf("%s %q → %q, %v; want %q", c.typ, c.name, got, err, c.want)
		}
	}
	if _, err := comfyFolderFor(InstallSpec{Type: "embedding"}); err == nil {
		t.Error("an embedding was given a folder")
	}
}

func TestADownloadLandsInItsFolderUnderTheCataloguesName(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "weights")
	}))
	defer srv.Close()
	dir := t.TempDir()
	c := New()
	if _, err := c.ComfyInstall(dir, InstallSpec{Source: srv.URL + "/f", Type: "lora", FileName: "Bounce i2v_high.safetensors"}); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if jobs := c.ComfyInstallJobs(); jobs[0].Status == "completed" || jobs[0].Status == "error" {
			if jobs[0].Status != "completed" || jobs[0].ModelKey != "loras/Bounce i2v_high.safetensors" {
				t.Fatalf("job = %+v", jobs[0])
			}
			data, err := os.ReadFile(filepath.Join(dir, "loras", "Bounce i2v_high.safetensors"))
			if err != nil || string(data) != "weights" {
				t.Fatalf("file = %q, %v", data, err)
			}
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("the download never finished")
}
