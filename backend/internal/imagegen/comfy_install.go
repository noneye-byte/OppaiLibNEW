package imagegen

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// Installing into ComfyUI, for the Wan clips comfy_wan.go builds.
//
// ComfyUI has no API that takes a download either, so this is Automatic1111's way
// again (a1111_install.go): the file is streamed into a folder under ComfyUI's
// mounted models directory and renamed into place once whole. ComfyUI needs no
// rescan — it reads its folders afresh whenever a loader's list is asked for, which
// is what the Video settings' Refresh does.

// comfyMountPoint is where the Unraid template maps ComfyUI's models folder; with the
// setting blank and something mounted here, it is used. A var for the tests.
var comfyMountPoint = "/comfy-models"

// comfyFolders are the folders a Wan clip loads from, by what a catalogue entry is.
var comfyFolders = []string{"diffusion_models", "unet", "checkpoints", "loras", "vae", "text_encoders", "clip"}

// ComfyModelsDir finds the models folder setting means, the mount point standing in
// for a blank setting. It returns the folder, or why there is none: problem is ""
// when nothing is set or mounted at all, which is not worth a red line.
func ComfyModelsDir(setting string) (dir, problem string) {
	p := strings.TrimSpace(setting)
	if p == "" {
		if info, err := os.Stat(comfyMountPoint); err != nil || !info.IsDir() {
			return "", ""
		}
		p = comfyMountPoint
	}
	info, err := os.Stat(p)
	if err != nil {
		if strings.HasPrefix(p, "/mnt/") {
			return "", fmt.Sprintf("%s does not exist inside the OppaiLib container — that looks like the path on the Unraid host; use the container path of the mapping instead (%s in the template), or leave this blank", p, comfyMountPoint)
		}
		return "", fmt.Sprintf("%s does not exist inside the OppaiLib container — map ComfyUI's models folder to it in the container's settings", p)
	}
	if !info.IsDir() {
		return "", fmt.Sprintf("%s is a file, not ComfyUI's models folder", p)
	}
	// The models folder itself, or ComfyUI's own folder holding it: both are what
	// people pick, and only one of them is where the files go.
	for _, d := range []string{p, filepath.Join(p, "models")} {
		for _, f := range comfyFolders {
			if info, err := os.Stat(filepath.Join(d, f)); err == nil && info.IsDir() {
				return d, ""
			}
		}
	}
	return "", fmt.Sprintf("%s has no diffusion_models, checkpoints or loras folder in it — point it at ComfyUI's models folder", p)
}

// allInOne is a checkpoint that carries its own text encoder and VAE. Most Wan
// "checkpoints" on Civitai are the bare model and go to diffusion_models; the merges
// that bundle everything say so in their name, and load from checkpoints.
var allInOne = regexp.MustCompile(`(?i)(^|[^a-z])(aio|all[\s_-]?in[\s_-]?one)([^a-z]|$)`)

// comfyFolderFor is the folder a catalogue entry goes to, by its type and name.
func comfyFolderFor(spec InstallSpec) (string, error) {
	switch strings.ToLower(strings.TrimSpace(spec.Type)) {
	case "checkpoint":
		if allInOne.MatchString(spec.FileName) {
			return "checkpoints", nil
		}
		return "diffusion_models", nil
	case "lora", "locon", "dora", "lycoris":
		return "loras", nil
	case "vae":
		return "vae", nil
	}
	return "", fmt.Errorf("a Wan clip takes models, LoRAs and VAEs; a %s has nowhere to go in ComfyUI", spec.Type)
}

func (c *Client) comfyJobList() *a1111Jobs {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.comfyInstalls == nil {
		c.comfyInstalls = &a1111Jobs{}
	}
	return c.comfyInstalls
}

// ComfyInstall starts a download into ComfyUI's models folder dir and returns its job.
func (c *Client) ComfyInstall(dir string, spec InstallSpec) (*InstallJob, error) {
	folder, err := comfyFolderFor(spec)
	if err != nil {
		return nil, err
	}
	jobs := c.comfyJobList()
	if jobs.busy(spec.Source) {
		return nil, errors.New("that file is already downloading")
	}
	if err := os.MkdirAll(filepath.Join(dir, folder), 0o755); err != nil {
		return nil, fmt.Errorf("can't write to ComfyUI's models folder: %w", err)
	}
	job := jobs.add(spec.Source)
	go func() {
		var key string
		_, _, n, err := fetchModelFile(spec, jobs, job, func(name string) (string, string) {
			key = folder + "/" + name
			return filepath.Join(dir, folder, name), key
		})
		jobs.update(job, func(j *InstallJob) {
			if err != nil {
				j.Status, j.Error = "error", err.Error()
				return
			}
			j.Status, j.ModelKey, j.Bytes = "completed", key, n
			if j.TotalBytes == 0 {
				j.TotalBytes = n
			}
		})
	}()
	out := *job
	return &out, nil
}

// ComfyInstallJobs lists the downloads into ComfyUI, newest first.
func (c *Client) ComfyInstallJobs() []InstallJob {
	return c.comfyJobList().list()
}
