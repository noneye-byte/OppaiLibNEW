package imagegen

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
)

// What the studio is told about Forge's families, and how what is missing gets fetched.
//
// A model that needs a text encoder should say so on its card, with a button, rather
// than failing when it is drawn. There is a third state beside having a file and not
// having it, and it is the one that catches people: Forge reads its text encoder folder
// only at start and when its own UI's refresh button is pressed. /sdapi/v1/refresh-vae
// rebuilds the VAE list and not this one, and a run that names a file not on the list
// has it dropped without a word. So a file that has just been downloaded is on the disk
// and unusable until Forge is restarted, and the studio says that rather than offering
// to download it again.

// SlotStatus is one thing a family needs, as things stand.
type SlotStatus struct {
	Kind  string `json:"kind"`
	Label string `json:"label"`
	// Have is what Forge has that fits, best first.
	Have []string `json:"have"`
	// OnDisk says it is in the folder but Forge has not read it yet.
	OnDisk bool `json:"onDisk,omitempty"`
	// Get is the file to fetch when there is none.
	Get ModuleFile `json:"get"`
}

// FamilyStatus is one family the checkpoints on this Forge belong to.
type FamilyStatus struct {
	Family
	// Key is what a model's FamilyKey names: the id, and the size for Klein's two.
	Key   string       `json:"key"`
	Needs []SlotStatus `json:"needs,omitempty"`
	// Ready says a checkpoint of this family can be drawn with as things stand.
	Ready bool `json:"ready"`
	// Downloading says the files it needs are coming.
	Downloading bool `json:"downloading,omitempty"`
}

// familyKey names what a checkpoint needs: its family, or for the one family whose
// files differ by size, its family and size.
func familyKey(family, variant string) string {
	if family == FamilyFlux2 && variant == "9b" {
		return FamilyFlux2 + "-9b"
	}
	return family
}

// localModules are the module files on this box, by name and whether Forge's list has
// them is for the caller. Empty without a models folder to look in.
func (c *Client) localModules() []ForgeModule {
	dir := c.modelsDir()
	if dir == "" {
		return nil
	}
	var out []ForgeModule
	add := func(f a1111Folder, kind string) {
		root, ok := findSubfolder(dir, f)
		if !ok {
			return
		}
		_ = filepath.WalkDir(root, func(p string, d os.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return nil
			}
			switch strings.ToLower(filepath.Ext(p)) {
			case ".safetensors", ".sft", ".gguf", ".pt", ".pth", ".bin", ".ckpt":
			default:
				return nil
			}
			rel, rerr := filepath.Rel(root, p)
			if rerr != nil {
				return nil
			}
			out = append(out, ForgeModule{Name: d.Name(), Kind: kind, Key: f.Folder + "/" + filepath.ToSlash(rel)})
			return nil
		})
	}
	add(a1111TextEncoders, "te")
	add(a1111VaeFolder, "vae")
	return out
}

// ForgeFamilies is the status of every family among these checkpoints.
func (c *Client) ForgeFamilies(ctx context.Context, base string, models []Model, have []ForgeModule) []FamilyStatus {
	local := c.localModules()
	downloading := map[string]bool{}
	for _, j := range c.a1111JobList().list() {
		if j.Status == "waiting" || j.Status == "downloading" {
			downloading[j.Source] = true
		}
	}
	seen := map[string]bool{}
	bare := map[string]bool{}
	var out []FamilyStatus
	for _, m := range models {
		if !m.Bundled {
			bare[familyKey(m.Family, m.Variant)] = true
		}
	}
	for _, m := range models {
		key := familyKey(m.Family, m.Variant)
		fam, ok := FamilyByID(m.Family)
		if !ok || seen[key] {
			continue
		}
		seen[key] = true
		st := FamilyStatus{Family: fam, Key: key, Ready: true}
		st.Slots = nil
		if bare[key] {
			for _, slot := range fam.slotsFor(m.Variant) {
				ss := SlotStatus{Kind: slot.Kind, Label: slot.Label, Get: slot.Get, Have: []string{}}
				for _, h := range have {
					if h.Kind == slot.Kind && slot.Matches(h.Name) {
						ss.Have = append(ss.Have, h.Name)
					}
				}
				sort.SliceStable(ss.Have, func(i, j int) bool { return moduleRank(ss.Have[i]) < moduleRank(ss.Have[j]) })
				if len(ss.Have) == 0 {
					st.Ready = false
					if downloading[slot.Get.URL] {
						st.Downloading = true
					}
					for _, l := range local {
						if l.Kind == slot.Kind && slot.Matches(l.Name) {
							ss.OnDisk = true
						}
					}
				}
				st.Needs = append(st.Needs, ss)
			}
		}
		out = append(out, st)
	}
	return out
}

// SamplerNames lists what Forge can sample with and on, for pickers that offer its own
// names rather than the shared list.
func (c *Client) SamplerNames(ctx context.Context, base string) (samplers, schedulers []string) {
	var s []struct {
		Name string `json:"name"`
	}
	if c.getJSON(ctx, base+"/sdapi/v1/samplers", &s) == nil {
		for _, x := range s {
			samplers = append(samplers, x.Name)
		}
	}
	var sc []struct {
		Label string `json:"label"`
	}
	if c.getJSON(ctx, base+"/sdapi/v1/schedulers", &sc) == nil {
		for _, x := range sc {
			schedulers = append(schedulers, x.Label)
		}
	}
	return samplers, schedulers
}

// GetModules starts downloading what a family needs and does not have. Only what is
// missing: nothing here replaces a file someone chose. The files are public, so no
// account comes into it.
func (c *Client) GetModules(ctx context.Context, base, key string) ([]InstallJob, error) {
	if !c.IsForge(ctx, base) {
		return nil, errors.New("only Forge loads these separately")
	}
	id, variant, _ := strings.Cut(key, "-")
	fam, ok := FamilyByID(id)
	if !ok {
		return nil, fmt.Errorf("there is no model family called %q", key)
	}
	have, err := c.ForgeModules(ctx, base)
	if err != nil {
		return nil, err
	}
	have = append(have, c.localModules()...)
	_, missing := pickModules(fam.slotsFor(variant), have, nil, FileFacts{})
	if len(missing) == 0 {
		return []InstallJob{}, nil
	}
	jobs := make([]InstallJob, 0, len(missing))
	for _, slot := range missing {
		typ := a1111TextEncoders.Type
		if slot.Kind == "vae" {
			typ = a1111VaeFolder.Type
		}
		job, err := c.a1111Install(ctx, base, InstallSpec{Source: slot.Get.URL, Type: typ, FileName: slot.Get.Name})
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, *job)
	}
	return jobs, nil
}

// TrainFile is one file a training run needs, by the trainer's name for it.
type TrainFile struct {
	Role string
	CheckpointFile
}

// TrainModules is what a run on a checkpoint needs beside it: the family it is, and the
// text encoders and VAE, as files rather than names, since a trainer reads the weights.
// A trainer cannot use the cut-down files a generator can, so a full one is taken where
// there is one and the rest are left to say so when they are read.
func (c *Client) TrainModules(ctx context.Context, base, checkpoint string) (family, variant string, files []TrainFile, err error) {
	kind, err := c.Backend(ctx, base)
	if err != nil {
		return "", "", nil, err
	}
	if kind != KindA1111 {
		return "", "", nil, nil
	}
	facts, _ := c.CheckpointFacts(ctx, base, checkpoint)
	fam, ok := FamilyByID(facts.Family)
	if !ok || len(fam.Slots) == 0 {
		return facts.Family, facts.Variant, nil, nil
	}
	if !c.IsForge(ctx, base) {
		return facts.Family, facts.Variant, nil, nil
	}
	have, err := c.ForgeModules(ctx, base)
	if err != nil {
		return "", "", nil, err
	}
	// A trainer reads files, so one Forge has not noticed yet is as good as any.
	listed := map[string]bool{}
	for _, m := range have {
		listed[m.Key] = true
	}
	for _, m := range c.localModules() {
		if !listed[m.Key] {
			have = append(have, m)
		}
	}
	keys := map[string]string{}
	for _, m := range have {
		keys[m.Name] = m.Key
	}
	// A bundled checkpoint's text encoder is no use here: the trainers read them as
	// files of their own, so every slot is filled whatever the checkpoint carries.
	names, missing := pickModules(fam.slotsFor(facts.Variant), have, nil, FileFacts{})
	if len(missing) > 0 {
		return "", "", nil, &MissingModulesError{Family: fam.ID, Missing: missing}
	}
	slots := fam.slotsFor(facts.Variant)
	for i, name := range names {
		f := TrainFile{Role: slots[i].Role, CheckpointFile: CheckpointFile{Key: keys[name]}}
		if local := c.home(ctx, base).path(f.Key); local != "" {
			if info, serr := os.Stat(local); serr == nil && !info.IsDir() {
				f.Local, f.Size = local, info.Size()
			}
		}
		files = append(files, f)
	}
	return facts.Family, facts.Variant, files, nil
}

// checkpointBaseName is a file's name without its folders, which is how clips name a
// checkpoint: a title has "[hash]" on it and the picker would show that.
func checkpointBaseName(key string) string {
	return path.Base(strings.ReplaceAll(key, "\\", "/"))
}
