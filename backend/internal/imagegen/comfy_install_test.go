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

func TestEachKindGoesToTheFolderSetForItAndNowhereElse(t *testing.T) {
	root := t.TempDir()
	dirs := map[string]string{}
	for _, k := range []string{"wan", "ckpt", "lora", "vae"} {
		dirs[k] = filepath.Join(root, k)
		if err := os.MkdirAll(dirs[k], 0o755); err != nil {
			t.Fatal(err)
		}
	}
	p := ComfyPlacesFor(ComfyFolders{Diffusion: dirs["wan"], Checkpoints: dirs["ckpt"], Loras: dirs["lora"], VAEs: dirs["vae"]})
	for _, c := range []struct{ typ, name, want string }{
		{"checkpoint", "Smooth Mix i2v_high.safetensors", dirs["wan"]},
		{"checkpoint", "Wan Rapid AIO.safetensors", dirs["ckpt"]},
		{"lora", "Bounce_low.safetensors", dirs["lora"]},
		{"vae", "wan_2.1_vae.safetensors", dirs["vae"]},
	} {
		if dir, _, err := p.folderFor(InstallSpec{Type: c.typ, FileName: c.name}); err != nil || dir != c.want {
			t.Errorf("%s %q → %q, %v; want %q", c.typ, c.name, dir, err, c.want)
		}
	}

	// A blank folder is not filled in from the others.
	only := ComfyPlacesFor(ComfyFolders{Loras: dirs["lora"]})
	if !only.Any() {
		t.Error("one folder set is not somewhere to install")
	}
	if err := only.CanInstall(InstallSpec{Type: "checkpoint", FileName: "x_high.safetensors"}); err == nil || !strings.Contains(err.Error(), "Wan models") {
		t.Errorf("a Wan model with only a LoRA folder = %v", err)
	}
	if ComfyPlacesFor(ComfyFolders{}).Any() {
		t.Error("nothing set is somewhere to install")
	}
}

func TestAFolderSetWrongSaysWhyRatherThanBeingCorrected(t *testing.T) {
	root := t.TempDir()
	models := filepath.Join(root, "models")
	if err := os.MkdirAll(filepath.Join(models, "loras"), 0o755); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(root, "a.txt")
	if err := os.WriteFile(file, nil, 0o644); err != nil {
		t.Fatal(err)
	}
	for _, c := range []struct{ setting, want string }{
		{filepath.Join(root, "typo"), "does not exist"},
		{"/mnt/user/appdata/comfyui/models/loras", "path on the Unraid host"},
		{file, "is a file"},
		{models, filepath.Join(models, "loras")},
	} {
		f := ComfyPlacesFor(ComfyFolders{Loras: c.setting})["loras"]
		if f.Dir != "" || !strings.Contains(f.Problem, c.want) {
			t.Errorf("%q = %+v; want a problem saying %q", c.setting, f, c.want)
		}
		if err := ComfyPlacesFor(ComfyFolders{Loras: c.setting}).CanInstall(InstallSpec{Type: "lora", FileName: "x.safetensors"}); err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("installing into %q = %v", c.setting, err)
		}
	}
	if f := ComfyPlacesFor(ComfyFolders{Loras: filepath.Join(models, "loras") + "/"})["loras"]; f.Dir != filepath.Join(models, "loras") {
		t.Errorf("a trailing slash = %+v", f)
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
	if _, err := c.ComfyInstall(ComfyPlaces{"loras": {Dir: filepath.Join(dir, "loras")}}, InstallSpec{Source: srv.URL + "/f", Type: "lora", FileName: "Bounce i2v_high.safetensors"}); err != nil {
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
