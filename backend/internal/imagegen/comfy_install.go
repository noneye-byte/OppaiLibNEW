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
// setting blank and something mounted here, it is used. The other two are for Wan
// models and LoRAs kept somewhere else — an extra_model_paths.yaml pointing at
// another share, say — which ComfyUI lists beside its own folders. Vars for the tests.
var (
	comfyMountPoint     = "/comfy-models"
	comfyDiffusionMount = "/comfy-diffusion-models"
	comfyLoraMount      = "/comfy-loras"
)

// comfyFolders are the folders a Wan clip loads from, by what a catalogue entry is.
var comfyFolders = []string{"diffusion_models", "unet", "checkpoints", "loras", "vae", "text_encoders", "clip"}

// ComfyModelsDir finds the models folder setting means, the mount point standing in
// for a blank setting. It returns the folder, or why there is none: problem is ""
// when nothing is set or mounted at all, which is not worth a red line.
func ComfyModelsDir(setting string) (dir, problem string) {
	p, problem := comfySetFolder(setting, comfyMountPoint, "ComfyUI's models folder")
	if p == "" {
		return "", problem
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

// comfySetFolder is the folder a setting names, or the mount standing in for it when
// it is blank, as long as it is a folder this container can see.
func comfySetFolder(setting, mount, what string) (dir, problem string) {
	p := strings.TrimSpace(setting)
	if p == "" {
		if info, err := os.Stat(mount); err != nil || !info.IsDir() {
			return "", ""
		}
		return mount, ""
	}
	info, err := os.Stat(p)
	if err != nil {
		if strings.HasPrefix(p, "/mnt/") {
			return "", fmt.Sprintf("%s does not exist inside the OppaiLib container — that looks like the path on the Unraid host; use the container path of the mapping instead (%s in the template), or leave this blank", p, mount)
		}
		return "", fmt.Sprintf("%s does not exist inside the OppaiLib container — map %s to it in the container's settings", p, what)
	}
	if !info.IsDir() {
		return "", fmt.Sprintf("%s is a file, not %s", p, what)
	}
	return p, ""
}

// ComfyPlaces is where installs into ComfyUI go. Models is its models folder; Diffusion
// and Loras are where a Wan model and a LoRA land — their own folders when set or
// mounted, else the ones under Models. A folder that is set but wrong leaves its kind
// with nowhere to go and says why, rather than quietly filling the models folder.
type ComfyPlaces struct {
	Models           string `json:"dir"`
	ModelsProblem    string `json:"problem"`
	Diffusion        string `json:"modelDir"`
	DiffusionProblem string `json:"modelProblem"`
	Loras            string `json:"loraDir"`
	LorasProblem     string `json:"loraProblem"`
}

// ComfyPlacesFor reads the three folder settings, mounts standing in for blank ones.
func ComfyPlacesFor(models, diffusion, loras string) ComfyPlaces {
	var p ComfyPlaces
	p.Models, p.ModelsProblem = ComfyModelsDir(models)
	p.Diffusion, p.DiffusionProblem = comfyKindFolder(diffusion, comfyDiffusionMount, "the folder Wan models are kept in", p.Models, "diffusion_models")
	p.Loras, p.LorasProblem = comfyKindFolder(loras, comfyLoraMount, "the folder LoRAs are kept in", p.Models, "loras")
	return p
}

// comfyKindFolder is the folder one kind goes to: its own setting or mount, else sub
// under the models folder.
func comfyKindFolder(setting, mount, what, models, sub string) (string, string) {
	dir, problem := comfySetFolder(setting, mount, what)
	if dir == "" {
		if problem != "" || models == "" {
			return "", problem
		}
		return filepath.Join(models, sub), ""
	}
	// The models folder above it gets picked too, now and then.
	if info, err := os.Stat(filepath.Join(dir, sub)); err == nil && info.IsDir() {
		return filepath.Join(dir, sub), ""
	}
	return dir, ""
}

// folderFor is where a catalogue entry goes, with the ComfyUI folder name it is shown
// under, or why it has nowhere to go.
func (p ComfyPlaces) folderFor(spec InstallSpec) (dir, shown string, err error) {
	shown, err = comfyFolderFor(spec)
	if err != nil {
		return "", "", err
	}
	switch shown {
	case "diffusion_models":
		if p.Diffusion == "" {
			return "", "", comfyNowhere(p.DiffusionProblem, "a Wan model", "the folder its diffusion models are in", comfyDiffusionMount)
		}
		return p.Diffusion, shown, nil
	case "loras":
		if p.Loras == "" {
			return "", "", comfyNowhere(p.LorasProblem, "a LoRA", "the folder its LoRAs are in", comfyLoraMount)
		}
		return p.Loras, shown, nil
	}
	if p.Models == "" {
		return "", "", comfyNowhere(p.ModelsProblem, "a "+strings.ToLower(spec.Type), "its models folder", comfyMountPoint)
	}
	return filepath.Join(p.Models, shown), shown, nil
}

func comfyNowhere(problem, what, folder, mount string) error {
	if problem == "" {
		problem = fmt.Sprintf("there is nowhere to put %s: ComfyUI has no API that takes a download, so map %s into the OppaiLib container at %s (or its whole models folder at %s), or set where it is under Settings → Image generation → Video", what, folder, mount, comfyMountPoint)
	}
	return errors.New(problem)
}

// CanInstall is nil when a catalogue entry has a folder to go to, else why not.
func (p ComfyPlaces) CanInstall(spec InstallSpec) error {
	_, _, err := p.folderFor(spec)
	return err
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

// ComfyInstall starts a download into the folder of places its kind goes to and
// returns its job.
func (c *Client) ComfyInstall(places ComfyPlaces, spec InstallSpec) (*InstallJob, error) {
	dir, shown, err := places.folderFor(spec)
	if err != nil {
		return nil, err
	}
	jobs := c.comfyJobList()
	if jobs.busy(spec.Source) {
		return nil, errors.New("that file is already downloading")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("can't write to %s: %w", dir, err)
	}
	job := jobs.add(spec.Source)
	go func() {
		var key string
		_, _, n, err := fetchModelFile(spec, jobs, job, func(name string) (string, string) {
			key = shown + "/" + name
			return filepath.Join(dir, name), key
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
