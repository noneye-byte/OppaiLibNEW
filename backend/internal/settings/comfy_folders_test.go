package settings

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTheOldGuessedComfyFoldersAreWrittenDownOnceAndThenLeftAlone(t *testing.T) {
	root := t.TempDir()
	comfy := filepath.Join(root, "comfyui")
	wan := filepath.Join(root, "wan-share")
	for _, d := range []string{"models/diffusion_models", "models/loras", "models/checkpoints", "models/vae"} {
		if err := os.MkdirAll(filepath.Join(comfy, d), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.MkdirAll(filepath.Join(wan, "diffusion_models"), 0o755); err != nil {
		t.Fatal(err)
	}
	origM, origD, origL := oldComfyModelsMount, oldComfyDiffusionMount, oldComfyLoraMount
	t.Cleanup(func() { oldComfyModelsMount, oldComfyDiffusionMount, oldComfyLoraMount = origM, origD, origL })
	oldComfyModelsMount, oldComfyDiffusionMount, oldComfyLoraMount = filepath.Join(root, "none"), filepath.Join(root, "none"), filepath.Join(root, "none")

	// ComfyUI's own folder for the models folder, and a Wan share picked a level up.
	got := Merge(Settings{}, map[string]string{keyComfyModelsDir: comfy, keyComfyDiffusionDir: wan})
	models := filepath.Join(comfy, "models")
	want := Settings{
		ComfyDiffusionDir:  filepath.Join(wan, "diffusion_models"),
		ComfyCheckpointDir: filepath.Join(models, "checkpoints"),
		ComfyLoraDir:       filepath.Join(models, "loras"),
		ComfyVaeDir:        filepath.Join(models, "vae"),
	}
	if got.ComfyDiffusionDir != want.ComfyDiffusionDir || got.ComfyCheckpointDir != want.ComfyCheckpointDir ||
		got.ComfyLoraDir != want.ComfyLoraDir || got.ComfyVaeDir != want.ComfyVaeDir {
		t.Fatalf("carried over = %q %q %q %q", got.ComfyDiffusionDir, got.ComfyCheckpointDir, got.ComfyLoraDir, got.ComfyVaeDir)
	}

	// The template's mount stood in for a blank models folder.
	oldComfyModelsMount = models
	if got := Merge(Settings{}, map[string]string{}); got.ComfyLoraDir != want.ComfyLoraDir {
		t.Errorf("from the mount, LoRAs = %q", got.ComfyLoraDir)
	}

	// Saved once since: a blanked folder stays blank, mounts or not.
	saved := got.Map()
	saved[keyComfyLoraDir] = ""
	if again := Merge(Settings{}, saved); again.ComfyLoraDir != "" || again.ComfyVaeDir != want.ComfyVaeDir {
		t.Errorf("after a save = %q, %q", again.ComfyLoraDir, again.ComfyVaeDir)
	}
}

func TestComfyUIsAddressWithoutAScemeIsTakenAsHTTP(t *testing.T) {
	for in, want := range map[string]string{
		"192.168.1.10:8188":         "http://192.168.1.10:8188",
		" http://comfy:8188/ ":      "http://comfy:8188",
		"https://comfy.example.com": "https://comfy.example.com",
		"":                          "",
	} {
		s := Settings{LibbyClipURL: in}
		s.Clamp()
		if s.LibbyClipURL != want {
			t.Errorf("%q → %q; want %q", in, s.LibbyClipURL, want)
		}
	}
}
