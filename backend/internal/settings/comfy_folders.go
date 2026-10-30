package settings

import (
	"os"
	"path/filepath"
)

// Until 0.72 the ComfyUI folders were partly guessed: a models folder (set, or the
// Unraid template's /comfy-models mount) whose diffusion_models, loras, checkpoints and
// vae subfolders stood in for any kind left blank, and two more mounts that won over a
// blank Wan model or LoRA folder. Now each folder is set by hand, so the first load
// after upgrading writes down what the guessing came to — the operator sees the folders
// their installs were already going to, and the next save stores them. Once the
// settings have been saved under 0.72 (the VAE folder's key exists, even blank), this
// never runs again, so a folder blanked on purpose stays blank.

// The template's old mount points. Vars for the test.
var (
	oldComfyModelsMount    = "/comfy-models"
	oldComfyDiffusionMount = "/comfy-diffusion-models"
	oldComfyLoraMount      = "/comfy-loras"
)

func comfyFolderDefaults(s *Settings, modelsDir string) {
	models := modelsDir
	if models == "" && isDir(oldComfyModelsMount) {
		models = oldComfyModelsMount
	}
	// ComfyUI's own folder was taken for the models folder inside it.
	if models != "" && !hasComfySubfolder(models) && hasComfySubfolder(filepath.Join(models, "models")) {
		models = filepath.Join(models, "models")
	}
	under := func(sub string) string {
		if models == "" || !isDir(filepath.Join(models, sub)) {
			return ""
		}
		return filepath.Join(models, sub)
	}
	// A kind's own folder, set or mounted, was used as given — or its subfolder of the
	// same name, when the models folder above it was picked.
	own := func(set, mount, sub string) string {
		if set == "" && isDir(mount) {
			set = mount
		}
		if set != "" && isDir(filepath.Join(set, sub)) {
			return filepath.Join(set, sub)
		}
		return set
	}
	if s.ComfyDiffusionDir = own(s.ComfyDiffusionDir, oldComfyDiffusionMount, "diffusion_models"); s.ComfyDiffusionDir == "" {
		s.ComfyDiffusionDir = under("diffusion_models")
	}
	if s.ComfyLoraDir = own(s.ComfyLoraDir, oldComfyLoraMount, "loras"); s.ComfyLoraDir == "" {
		s.ComfyLoraDir = under("loras")
	}
	s.ComfyCheckpointDir = under("checkpoints")
	s.ComfyVaeDir = under("vae")
}

func hasComfySubfolder(dir string) bool {
	for _, sub := range []string{"diffusion_models", "unet", "checkpoints", "loras", "vae", "text_encoders", "clip"} {
		if isDir(filepath.Join(dir, sub)) {
			return true
		}
	}
	return false
}

func isDir(p string) bool {
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}
