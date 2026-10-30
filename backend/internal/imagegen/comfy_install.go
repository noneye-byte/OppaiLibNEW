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
// again (a1111_install.go): the file is streamed into the folder its kind goes to,
// mapped into this container, and renamed into place once whole. ComfyUI needs no
// rescan — it reads its folders afresh whenever a loader's list is asked for, which
// is what the Video settings' Refresh does.

// ComfyFolders are the folders a Wan install can land in, one per kind, each exactly
// as the operator typed it under Settings → Image generation → Video. Nothing is
// guessed: a ComfyUI install spreads these across its own models folder, an
// extra_model_paths.yaml share and whatever a custom node added, and every guess this
// once made (a models folder found by its subfolders, a mount standing in for a blank,
// a subfolder used when its parent was given) put files somewhere the operator had not
// said. A blank folder means that kind is not installed from here.
type ComfyFolders struct {
	Diffusion   string // Wan models: ComfyUI's diffusion_models (or unet)
	Checkpoints string // all-in-one checkpoints: checkpoints
	Loras       string // loras
	VAEs        string // vae
}

// ComfyFolder is one of those folders as the status reads it: Dir is set only when
// installs can go there, and Problem says why not when one was given and is unusable.
type ComfyFolder struct {
	Dir     string `json:"dir"`
	Problem string `json:"problem"`
}

// ComfyPlaces is where each kind of install into ComfyUI goes. The keys are the kinds
// comfyFolderFor names, which are ComfyUI's own folder names.
type ComfyPlaces map[string]ComfyFolder

// comfyKinds are the kinds, in the order the settings and the check list them, with
// what each folder is called in a sentence.
var comfyKinds = []struct{ folder, what string }{
	{"diffusion_models", "Wan models"},
	{"checkpoints", "all-in-one checkpoints"},
	{"loras", "LoRAs"},
	{"vae", "VAEs"},
}

// ComfyPlacesFor checks each folder that is set. Each check writes and removes a file,
// so this is for status and installs, not for every request.
func ComfyPlacesFor(f ComfyFolders) ComfyPlaces {
	set := map[string]string{"diffusion_models": f.Diffusion, "checkpoints": f.Checkpoints, "loras": f.Loras, "vae": f.VAEs}
	out := ComfyPlaces{}
	for _, k := range comfyKinds {
		out[k.folder] = comfyFolderCheck(set[k.folder], k.folder)
	}
	return out
}

// comfyFolderCheck is a set folder that exists, is a folder, can be written to, and is
// not the models folder above the one meant.
func comfyFolderCheck(setting, sub string) ComfyFolder {
	p := strings.TrimRight(strings.TrimSpace(setting), "/\\")
	if p == "" {
		return ComfyFolder{}
	}
	info, err := os.Stat(p)
	switch {
	case err != nil && strings.HasPrefix(p, "/mnt/"):
		return ComfyFolder{Problem: fmt.Sprintf("%s does not exist inside the OppaiLib container — that looks like the path on the Unraid host; map that folder into the container and give the container's side of the mapping", p)}
	case err != nil:
		return ComfyFolder{Problem: fmt.Sprintf("%s does not exist inside the OppaiLib container — map the folder into it, and give the container's side of the mapping", p)}
	case !info.IsDir():
		return ComfyFolder{Problem: fmt.Sprintf("%s is a file, not a folder", p)}
	}
	// ComfyUI's models folder given for one inside it: said rather than corrected, since
	// correcting it is the guessing this replaced.
	if info, err := os.Stat(filepath.Join(p, sub)); err == nil && info.IsDir() {
		return ComfyFolder{Problem: fmt.Sprintf("%s has a %s folder inside it — that looks like ComfyUI's whole models folder; give %s instead", p, sub, filepath.Join(p, sub))}
	}
	probe, err := os.CreateTemp(p, ".oppailib-writable-*")
	if err != nil {
		return ComfyFolder{Problem: fmt.Sprintf("OppaiLib can't write into %s (%v) — the mapping has to be read/write", p, err)}
	}
	probe.Close()
	os.Remove(probe.Name())
	return ComfyFolder{Dir: p}
}

// folderFor is where a catalogue entry goes, with the ComfyUI folder name it is shown
// under, or why it has nowhere to go.
func (p ComfyPlaces) folderFor(spec InstallSpec) (dir, shown string, err error) {
	shown, err = comfyFolderFor(spec)
	if err != nil {
		return "", "", err
	}
	f := p[shown]
	if f.Dir != "" {
		return f.Dir, shown, nil
	}
	if f.Problem != "" {
		return "", "", errors.New(f.Problem)
	}
	what := shown
	for _, k := range comfyKinds {
		if k.folder == shown {
			what = k.what
		}
	}
	return "", "", fmt.Errorf("no folder is set for %s: ComfyUI has no API that takes a download, so OppaiLib writes the file into the folder ComfyUI loads them from — set it under Settings → Image generation → Video", what)
}

// CanInstall is nil when a catalogue entry has a folder to go to, else why not.
func (p ComfyPlaces) CanInstall(spec InstallSpec) error {
	_, _, err := p.folderFor(spec)
	return err
}

// Any is whether any kind has somewhere to go.
func (p ComfyPlaces) Any() bool {
	for _, f := range p {
		if f.Dir != "" {
			return true
		}
	}
	return false
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
