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

func TestWanModelsAndLorasKeptApartGoToTheirOwnFolders(t *testing.T) {
	root := t.TempDir()
	models := filepath.Join(root, "comfy", "models")
	diffusion := filepath.Join(root, "wan")
	loras := filepath.Join(root, "share", "models")
	for _, d := range []string{filepath.Join(models, "vae"), diffusion, filepath.Join(loras, "loras")} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	origD, origL := comfyDiffusionMount, comfyLoraMount
	t.Cleanup(func() { comfyDiffusionMount, comfyLoraMount = origD, origL })
	comfyDiffusionMount, comfyLoraMount = filepath.Join(root, "nod"), filepath.Join(root, "nol")

	p := ComfyPlacesFor(models, diffusion, loras)
	if p.Diffusion != diffusion {
		t.Errorf("Wan models go to %q", p.Diffusion)
	}
	if p.Loras != filepath.Join(loras, "loras") {
		t.Errorf("a models folder picked for LoRAs gives %q, not its loras folder", p.Loras)
	}
	for _, c := range []struct{ typ, name, want string }{
		{"checkpoint", "Smooth Mix i2v_high.safetensors", diffusion},
		{"lora", "Bounce_low.safetensors", filepath.Join(loras, "loras")},
		{"vae", "wan_2.1_vae.safetensors", filepath.Join(models, "vae")},
		{"checkpoint", "Wan Rapid AIO.safetensors", filepath.Join(models, "checkpoints")},
	} {
		if dir, _, err := p.folderFor(InstallSpec{Type: c.typ, FileName: c.name}); err != nil || dir != c.want {
			t.Errorf("%s %q → %q, %v; want %q", c.typ, c.name, dir, err, c.want)
		}
	}

	blank := ComfyPlacesFor(models, "", "")
	if blank.Diffusion != filepath.Join(models, "diffusion_models") || blank.Loras != filepath.Join(models, "loras") {
		t.Errorf("blank folders = %q, %q; want the models folder's own", blank.Diffusion, blank.Loras)
	}
	comfyLoraMount = filepath.Join(loras, "loras")
	if got := ComfyPlacesFor(models, "", "").Loras; got != comfyLoraMount {
		t.Errorf("a mounted LoRA folder is not used: %q", got)
	}

	// A folder set wrong is said so, and does not fall back to the models folder.
	wrong := ComfyPlacesFor(models, filepath.Join(root, "typo"), "")
	if wrong.Diffusion != "" || !strings.Contains(wrong.DiffusionProblem, "does not exist") {
		t.Errorf("a missing Wan folder = %q, %q", wrong.Diffusion, wrong.DiffusionProblem)
	}
	if err := wrong.CanInstall(InstallSpec{Type: "checkpoint", FileName: "x_high.safetensors"}); err == nil || !strings.Contains(err.Error(), "typo") {
		t.Errorf("installing with it = %v", err)
	}
	comfyLoraMount = filepath.Join(root, "nol")
	if err := ComfyPlacesFor("", diffusion, "").CanInstall(InstallSpec{Type: "lora", FileName: "x.safetensors"}); err == nil || !strings.Contains(err.Error(), comfyLoraMount) {
		t.Errorf("a LoRA with only a Wan folder = %v", err)
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
	if _, err := c.ComfyInstall(ComfyPlaces{Models: dir, Loras: filepath.Join(dir, "loras")}, InstallSpec{Source: srv.URL + "/f", Type: "lora", FileName: "Bounce i2v_high.safetensors"}); err != nil {
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
