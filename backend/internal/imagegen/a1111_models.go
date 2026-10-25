package imagegen

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Model management for Automatic1111, Forge and SD.Next.
//
// A1111 has no model manager behind its API. It lists what is in its folders and that
// is all; there is no install, no delete, no record to write a description onto.
// What InvokeAI keeps in a model record, A1111 keeps beside the file instead: a
// "<name>.json" of user metadata (description, activation text, preferred weight,
// the base model), which its own Extra Networks edit card writes, and a
// "<name>.preview.png" its cards show as the cover. So the studio manages an A1111 the
// way a person at that box would — by putting files in its folders and asking it to
// look again.
//
// That needs the folder. ModelsDir is the generator's models folder ("models", the
// one holding Stable-diffusion and Lora) as this container sees it. Without it the
// models still list, still link to Civitai by hash and still show a cover if A1111
// has one; they just cannot be installed, edited or deleted from here. Guessing a
// path to write multi-gigabyte files into is not a thing to do, so the only default
// is the mount point the container template maps for exactly this, and only when
// something is mounted there that looks like a models folder.

// a1111Folder is one kind of file A1111 loads, and where under the models folder it
// lives. Type is the name InvokeAI's records use for the same kind, so the catalogue
// and the clients read both backends alike.
//
// Folder is A1111's own name for it and is what keys are written with, so a link kept
// by key means the same file whatever the folder is really called. On disk it may be
// called something else: Linux tells "Lora" from "lora", and the A1111 images built
// to share one model store with ComfyUI point their --ckpt-dir and --lora-dir at
// "checkpoints" and "loras". Aliases are those other names, lowercase, most likely
// first; localPath maps a key onto whichever one the folder actually has.
type a1111Folder struct {
	Type    string
	Folder  string
	Aliases []string
}

var (
	a1111Checkpoints = a1111Folder{"main", "Stable-diffusion", []string{"stable-diffusion", "checkpoints", "checkpoint", "ckpt"}}
	a1111LoraFolder  = a1111Folder{"lora", "Lora", []string{"lora", "loras"}}
	a1111VaeFolder   = a1111Folder{"vae", "VAE", []string{"vae"}}
	a1111ControlNet  = a1111Folder{"controlnet", "ControlNet", []string{"controlnet"}}
	a1111Upscalers   = a1111Folder{"upscaler", "ESRGAN", []string{"esrgan", "upscale_models"}}

	a1111AllFolders = []a1111Folder{a1111Checkpoints, a1111LoraFolder, a1111VaeFolder, a1111ControlNet, a1111Upscalers}
)

// a1111InstallFolders maps a catalogue type (as the Civitai search filter names it,
// or as a model page does) to where an install of it goes. Embeddings are missing on
// purpose: A1111 keeps them beside the models folder rather than in it, under a path
// that is a launch flag, and a file put in the wrong place just never appears.
var a1111InstallFolders = map[string]a1111Folder{
	"checkpoint": a1111Checkpoints,
	"lora":       a1111LoraFolder,
	"locon":      a1111LoraFolder,
	"dora":       a1111LoraFolder,
	"lycoris":    a1111LoraFolder,
	"vae":        a1111VaeFolder,
	"controlnet": a1111ControlNet,
	"upscaler":   a1111Upscalers,
}

// A1111InstallFolder says where a model of the catalogue's type would be installed,
// "" for a type A1111 cannot be given from here.
func A1111InstallFolder(civitaiType string) string {
	return a1111InstallFolders[strings.ToLower(strings.TrimSpace(civitaiType))].Folder
}

// a1111File is one model A1111 reports, tied to where it is on disk.
type a1111File struct {
	// Key is the path under the models folder, with forward slashes:
	// "Lora/styles/ink.safetensors". It names the file itself, so it survives what
	// A1111's own names do not — a checkpoint's title gains "[hash]" once it has been
	// hashed, which would orphan anything keyed by the title.
	Key string
	// Name is the selector generate wants back: a checkpoint's title, a LoRA's name.
	Name    string
	Display string
	Alias   string
	Type    string
	Remote  string // the path as A1111 reports it, inside its own filesystem
	Hash    string // "sha256:…", "autov2:…", "autov3:…" or ""
}

// stem drops the extension, which is how A1111 names a model's sidecar files.
func stem(p string) string {
	return strings.TrimSuffix(p, path.Ext(p))
}

// a1111KeyOf turns the path A1111 reports into a key under the models folder. It
// looks for the folder by name rather than trusting a prefix, because A1111's own
// root ("/stable-diffusion-webui/models", "C:\\sd\\models", a --ckpt-dir somewhere
// else) is nothing this side can know.
func a1111KeyOf(remote string, f a1111Folder) string {
	p := strings.ReplaceAll(remote, "\\", "/")
	lower := strings.ToLower(p)
	best, end := -1, 0
	for _, name := range f.Aliases {
		marker := "/" + name + "/"
		if i := strings.LastIndex(lower, marker); i > best {
			best, end = i, i+len(marker)
		}
	}
	if best >= 0 {
		return f.Folder + "/" + p[end:]
	}
	return f.Folder + "/" + path.Base(p)
}

// localPath is where a key lives in the configured models folder, "" without one.
// The key is cleaned as if rooted, so one that climbs ("../") stays inside the folder
// rather than reaching somewhere else on the box. Its first part is A1111's name for
// the folder, which is put back as whatever the folder is called here.
func localPath(dir, key string) string {
	if dir == "" || key == "" {
		return ""
	}
	clean := strings.TrimPrefix(path.Clean("/"+key), "/")
	if clean == "" {
		return ""
	}
	head, rest, _ := strings.Cut(clean, "/")
	for _, f := range a1111AllFolders {
		if strings.EqualFold(head, f.Folder) {
			return filepath.Join(subfolderPath(dir, f), filepath.FromSlash(rest))
		}
	}
	return filepath.Join(dir, filepath.FromSlash(clean))
}

// subfolders remembers each models folder's listing for a few seconds: localPath is
// asked once per model on every listing, and on Unraid's FUSE shares a directory
// read is not free.
var subfolders = struct {
	sync.Mutex
	m map[string]subfolderList
}{m: map[string]subfolderList{}}

type subfolderList struct {
	names []string
	at    time.Time
}

func listSubfolders(dir string) []string {
	subfolders.Lock()
	defer subfolders.Unlock()
	if l, ok := subfolders.m[dir]; ok && time.Since(l.at) < 5*time.Second {
		return l.names
	}
	var names []string
	if entries, err := os.ReadDir(dir); err == nil {
		for _, e := range entries {
			if e.IsDir() {
				names = append(names, e.Name())
			}
		}
	}
	subfolders.m[dir] = subfolderList{names, time.Now()}
	return names
}

// forgetSubfolders drops a folder's remembered listing, after making a folder in it.
func forgetSubfolders(dir string) {
	subfolders.Lock()
	delete(subfolders.m, dir)
	subfolders.Unlock()
}

// findSubfolder is the folder under dir that holds f's kind, by any of its names.
func findSubfolder(dir string, f a1111Folder) (string, bool) {
	names := listSubfolders(dir)
	for _, alias := range f.Aliases {
		for _, n := range names {
			if strings.ToLower(n) == alias {
				return filepath.Join(dir, n), true
			}
		}
	}
	return "", false
}

// subfolderPath is where f's kind lives under dir: the folder there is, or A1111's
// own name for one that is not there yet.
func subfolderPath(dir string, f a1111Folder) string {
	if p, ok := findSubfolder(dir, f); ok {
		return p
	}
	return filepath.Join(dir, f.Folder)
}

// a1111MountPoint is where the Unraid template maps A1111's models folder. With the
// setting blank and a models folder mounted here, it is used: the operator who added
// that mapping has already said where the folder is, and making them type the same
// path again into Settings is how "I mounted it and it still says set the folder"
// happens. A var so the tests can point it somewhere that exists.
var a1111MountPoint = "/a1111-models"

// A1111ModelsDir is what the configured models folder turned out to be.
type A1111ModelsDir struct {
	// Path is what was looked at: the setting, or the mount point when that is blank
	// and something is mounted there. "" when neither.
	Path string
	// Dir is the models folder it resolved to, "" when it did not. It can differ
	// from Path, which may name A1111's install folder or one of the folders inside
	// "models" instead of "models" itself.
	Dir string
	// Writable says installs and edits can go into Dir. A read-only mount still
	// lends its sidecars to the listings.
	Writable bool
	// Problem says, for the operator, why Path is not usable; "" when it is or when
	// nothing is set at all.
	Problem string
}

// looksLikeA1111Models says whether dir holds a checkpoint or LoRA folder, by any of
// their names.
func looksLikeA1111Models(dir string) bool {
	for _, f := range []a1111Folder{a1111Checkpoints, a1111LoraFolder} {
		if _, ok := findSubfolder(dir, f); ok {
			return true
		}
	}
	return false
}

// folderContents names what is in dir, for a refusal to show what was actually seen.
func folderContents(dir string) string {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return ""
	}
	var names []string
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), ".") {
			continue
		}
		n := e.Name()
		if e.IsDir() {
			n += "/"
		}
		names = append(names, n)
	}
	if len(names) == 0 {
		return "it is empty"
	}
	sort.Strings(names)
	if len(names) > 10 {
		names = append(names[:10], fmt.Sprintf("and %d more", len(names)-10))
	}
	return "it holds " + strings.Join(names, ", ")
}

// resolveA1111ModelsDir finds the models folder p means. The setting asks for
// "models" itself, but the two near misses are common enough to take as meant: the
// webui's own folder (which holds "models"), and one of the folders inside it, picked
// because that is where the files visibly are. Anything else is refused with a reason
// rather than written into, since a wrong folder takes installs A1111 never sees.
func resolveA1111ModelsDir(p string) (string, string) {
	info, err := os.Stat(p)
	if err != nil {
		if strings.HasPrefix(p, "/mnt/") {
			return "", fmt.Sprintf("%s does not exist inside the OppaiLib container — that looks like the path on the Unraid host; use the container path of the mapping instead (/a1111-models in the template), or leave this blank", p)
		}
		return "", fmt.Sprintf("%s does not exist inside the OppaiLib container — map Automatic1111's models folder to it in the container's settings", p)
	}
	if !info.IsDir() {
		return "", fmt.Sprintf("%s is a file, not Automatic1111's models folder", p)
	}
	if looksLikeA1111Models(p) {
		return p, ""
	}
	if inner := filepath.Join(p, "models"); looksLikeA1111Models(inner) {
		return inner, ""
	}
	base := strings.ToLower(filepath.Base(p))
	for _, f := range a1111AllFolders {
		for _, alias := range f.Aliases {
			if base == alias && looksLikeA1111Models(filepath.Dir(p)) {
				return filepath.Dir(p), ""
			}
		}
	}
	return "", fmt.Sprintf("%s has no checkpoint or LoRA folder in it (looked for Stable-diffusion, checkpoints, Lora and loras, in any case) and %s — point it at the folder Automatic1111 keeps those in", p, folderContents(p))
}

// a1111MountInfo is where Linux lists this process's mounts. A var for the tests.
var a1111MountInfo = "/proc/self/mountinfo"

// mountPoints reads the mount points out of a mountinfo listing. The fifth field is
// the mount point, with spaces and the like written as octal escapes.
func mountPoints(info string) []string {
	var out []string
	for _, line := range strings.Split(info, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		out = append(out, unescapeMount(fields[4]))
	}
	return out
}

func unescapeMount(s string) string {
	if !strings.Contains(s, `\`) {
		return s
	}
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] == '\\' && i+3 < len(s) {
			var v byte
			ok := true
			for _, c := range s[i+1 : i+4] {
				if c < '0' || c > '7' {
					ok = false
					break
				}
				v = v*8 + byte(c-'0')
			}
			if ok {
				b.WriteByte(v)
				i += 3
				continue
			}
		}
		b.WriteByte(s[i])
	}
	return b.String()
}

// notModelMounts are mounts that are the system's or OppaiLib's own, never A1111's.
var notModelMounts = []string{"/proc", "/sys", "/dev", "/etc", "/run", "/usr", "/tmp", "/var", "/opt", "/config", "/media", "/db", "/cache"}

var discovered = struct {
	sync.Mutex
	dir string
	at  time.Time
}{}

// discoverA1111Mount looks through what is mounted into the container for a models
// folder, for the operator who mapped one under some other container path and left
// the setting blank — or typed the host's path into it. Only a folder with a
// checkpoint folder counts here, stricter than for a path given by hand: a
// text-generation-webui mount has a "loras" folder too, and its LoRAs are not these.
func discoverA1111Mount() string {
	discovered.Lock()
	defer discovered.Unlock()
	if time.Since(discovered.at) < 30*time.Second {
		return discovered.dir
	}
	discovered.at = time.Now()
	discovered.dir = ""
	data, err := os.ReadFile(a1111MountInfo)
	if err != nil {
		return ""
	}
	for _, mp := range mountPoints(string(data)) {
		if mp == "/" || mp == "" {
			continue
		}
		skip := false
		for _, sys := range notModelMounts {
			if mp == sys || strings.HasPrefix(mp, sys+"/") {
				skip = true
				break
			}
		}
		if skip {
			continue
		}
		dir, _ := resolveA1111ModelsDir(mp)
		if dir == "" {
			continue
		}
		if _, ok := findSubfolder(dir, a1111Checkpoints); ok {
			discovered.dir = dir
			return dir
		}
	}
	return ""
}

// locate finds the models folder: the setting, else the template's mount point,
// else any models folder mounted into the container. It returns what was looked at,
// what that resolved to, and why the first choice would not do when nothing did.
func (c *Client) locate() (p, dir, problem string) {
	if c.ModelsDir != nil {
		p = strings.TrimSpace(c.ModelsDir())
	}
	if p == "" {
		if info, err := os.Stat(a1111MountPoint); err == nil && info.IsDir() {
			p = a1111MountPoint
		}
	}
	if p != "" {
		if dir, problem = resolveA1111ModelsDir(p); dir != "" {
			return p, dir, ""
		}
	}
	if found := discoverA1111Mount(); found != "" {
		if p == "" {
			p = found
		}
		return p, found, ""
	}
	return p, "", problem
}

// A1111ModelsDir reads the setting and the folder behind it. It touches the disk —
// a write probe included — so it is for status and for the operations that write, not
// for every listing.
func (c *Client) A1111ModelsDir() A1111ModelsDir {
	var st A1111ModelsDir
	st.Path, st.Dir, st.Problem = c.locate()
	if st.Dir == "" {
		return st
	}
	// The probe goes where installs go, so a folder that is writable at the top but
	// not below (a share whose subfolders belong to someone else) is caught too.
	probeIn := subfolderPath(st.Dir, a1111LoraFolder)
	if _, err := os.Stat(probeIn); err != nil {
		probeIn = st.Dir
	}
	if f, err := os.CreateTemp(probeIn, ".oppailib-writable-*"); err == nil {
		name := f.Name()
		f.Close()
		os.Remove(name)
		st.Writable = true
	} else {
		reason := err.Error()
		var pe *os.PathError
		if errors.As(err, &pe) {
			reason = pe.Err.Error()
		}
		st.Problem = fmt.Sprintf("OppaiLib can't write into %s (%s) — the mapping has to be read/write, and a network share has to let the container's root user write", probeIn, reason)
	}
	return st
}

// modelsDir is the resolved models folder for reading sidecars, "" without one. It
// skips the write probe, which only the writes need.
func (c *Client) modelsDir() string {
	_, dir, _ := c.locate()
	return dir
}

// ErrNoModelsDir is an A1111 change that needs the models folder when none is set.
var ErrNoModelsDir = errors.New("Automatic1111 has no API for this; map its models folder into the container at /a1111-models, or set where it is under Settings → Image generation")

// modelsDirError is ErrNoModelsDir with the reason the folder that is set will not
// do, which is the part the operator can act on.
type modelsDirError struct{ problem string }

func (e modelsDirError) Error() string        { return "Automatic1111 has no API for this, and " + e.problem }
func (e modelsDirError) Is(target error) bool { return target == ErrNoModelsDir }

// A1111ModelsDirReady says whether the models folder is there, looks like one (it
// holds a Stable-diffusion or Lora folder) and can be written to. A path that exists
// but is the wrong one would otherwise take installs into a folder A1111 never reads.
func (c *Client) A1111ModelsDirReady() bool {
	st := c.A1111ModelsDir()
	return st.Dir != "" && st.Writable
}

func (c *Client) requireModelsDir() (string, error) {
	st := c.A1111ModelsDir()
	if st.Dir == "" || !st.Writable {
		if st.Problem != "" {
			return "", modelsDirError{st.Problem}
		}
		return "", ErrNoModelsDir
	}
	return st.Dir, nil
}

type a1111ModelRaw struct {
	Title     string `json:"title"`
	ModelName string `json:"model_name"`
	Hash      string `json:"hash"`
	SHA256    string `json:"sha256"`
	Filename  string `json:"filename"`
}

type a1111LoraRaw struct {
	Name     string         `json:"name"`
	Alias    string         `json:"alias"`
	Path     string         `json:"path"`
	Metadata map[string]any `json:"metadata"`
}

type a1111VaeRaw struct {
	ModelName string `json:"model_name"`
	Filename  string `json:"filename"`
}

// a1111Files lists every checkpoint, LoRA and VAE A1111 reports, with the best hash
// there is for each: A1111's own full SHA256 when it has computed one, the hash this
// side computed of the file when the folder is mounted, and otherwise what A1111 or
// the LoRA's trainer wrote down — the ten-character AutoV2 for a checkpoint, kohya's
// weights hash for a LoRA. Civitai's lookup by hash takes all of them.
func (c *Client) a1111Files(ctx context.Context, base string) ([]a1111File, error) {
	var models []a1111ModelRaw
	if err := c.getJSON(ctx, base+"/sdapi/v1/sd-models", &models); err != nil {
		return nil, err
	}
	var loras []a1111LoraRaw
	_ = c.getJSON(ctx, base+"/sdapi/v1/loras", &loras) // an older build lists checkpoints only
	var vaes []a1111VaeRaw
	_ = c.getJSON(ctx, base+"/sdapi/v1/sd-vae", &vaes)

	dir := c.modelsDir()
	out := make([]a1111File, 0, len(models)+len(loras)+len(vaes))
	for _, m := range models {
		f := a1111File{
			Key: a1111KeyOf(m.Filename, a1111Checkpoints), Name: m.Title, Display: m.ModelName,
			Type: a1111Checkpoints.Type, Remote: m.Filename,
		}
		switch {
		case m.SHA256 != "":
			f.Hash = "sha256:" + strings.ToLower(m.SHA256)
		case m.Hash != "":
			f.Hash = "autov2:" + strings.ToLower(m.Hash)
		}
		out = append(out, f)
	}
	for _, l := range loras {
		f := a1111File{
			Key: a1111KeyOf(l.Path, a1111LoraFolder), Name: l.Name, Display: l.Name, Alias: l.Alias,
			Type: a1111LoraFolder.Type, Remote: l.Path,
		}
		if h, ok := l.Metadata["sshs_model_hash"].(string); ok && h != "" {
			f.Hash = "autov3:" + strings.ToLower(h)
		}
		out = append(out, f)
	}
	for _, v := range vaes {
		out = append(out, a1111File{
			Key: a1111KeyOf(v.Filename, a1111VaeFolder), Name: v.ModelName, Display: v.ModelName,
			Type: a1111VaeFolder.Type, Remote: v.Filename,
		})
	}
	// A hash this side computed beats anything short. Files with none yet are handed
	// to the background hasher and gain one on a later listing.
	if dir != "" {
		for i := range out {
			if strings.HasPrefix(out[i].Hash, "sha256:") {
				continue
			}
			local := localPath(dir, out[i].Key)
			if local == "" {
				continue
			}
			if h := c.hashes().lookup(local); h != "" {
				out[i].Hash = "sha256:" + h
			} else {
				c.hashes().queue(local)
			}
		}
	}
	return out, nil
}

// a1111Find resolves whatever a client names a model by — the key, a checkpoint's
// title or bare name, a LoRA's name or alias — to the file.
func a1111Find(files []a1111File, name string) (*a1111File, bool) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, false
	}
	for i := range files {
		if files[i].Key == name {
			return &files[i], true
		}
	}
	for i := range files {
		f := &files[i]
		if f.Name == name || f.Display == name || (f.Alias != "" && f.Alias == name) {
			return f, true
		}
	}
	// A checkpoint title with or without its "[hash]" suffix names the same file.
	bare := strings.TrimSpace(strings.Split(name, " [")[0])
	for i := range files {
		if strings.TrimSpace(strings.Split(files[i].Name, " [")[0]) == bare {
			return &files[i], true
		}
	}
	return nil, false
}

// ── the sidecar ─────────────────────────────────────────────────────────────

// a1111Sidecar is A1111's user-metadata file, read as a map so the keys this side
// does not know — what A1111's card or another extension wrote — are written back
// untouched.
type a1111Sidecar map[string]any

const (
	sidecarDescription = "description"
	sidecarActivation  = "activation text"
	sidecarWeight      = "preferred weight"
	sidecarVersion     = "sd version"
	sidecarNotes       = "notes"
	// sidecarDefaults is this app's own key: the recommended generation settings
	// InvokeAI keeps per model. A1111 ignores it and keeps it on its own edits.
	sidecarDefaults = "oppailib defaults"
)

func readSidecar(local string) a1111Sidecar {
	out := a1111Sidecar{}
	if local == "" {
		return out
	}
	data, err := os.ReadFile(stem(local) + ".json")
	if err != nil {
		return out
	}
	_ = json.Unmarshal(data, &out)
	if out == nil {
		out = a1111Sidecar{}
	}
	return out
}

func writeSidecar(local string, sc a1111Sidecar) error {
	data, err := json.MarshalIndent(sc, "", "    ")
	if err != nil {
		return err
	}
	return writeFileAtomic(stem(local)+".json", data)
}

func (sc a1111Sidecar) str(key string) string {
	s, _ := sc[key].(string)
	return strings.TrimSpace(s)
}

func (sc a1111Sidecar) weight() float64 {
	switch v := sc[sidecarWeight].(type) {
	case float64:
		return v
	case string:
		var f float64
		if _, err := fmt.Sscan(v, &f); err == nil {
			return f
		}
	}
	return 0
}

func (sc a1111Sidecar) defaults() *ModelDefaults {
	raw, ok := sc[sidecarDefaults]
	if !ok {
		return nil
	}
	data, _ := json.Marshal(raw)
	var d ModelDefaults
	if json.Unmarshal(data, &d) != nil || d == (ModelDefaults{}) {
		return nil
	}
	return &d
}

// activationPhrases reads A1111's single activation-text field as the list of
// phrases InvokeAI keeps: the field is what gets pasted into the prompt, and a
// prompt is comma-separated.
func activationPhrases(text string) []string {
	out := []string{}
	for _, p := range strings.Split(text, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// a1111SDVersion is the catalogue's base model as A1111's card names the family.
func a1111SDVersion(base string) string {
	b := strings.ToLower(base)
	switch {
	case strings.Contains(b, "sd 1"):
		return "SD1"
	case strings.Contains(b, "sd 2"):
		return "SD2"
	case strings.Contains(b, "sdxl"), strings.Contains(b, "pony"), strings.Contains(b, "illustrious"), strings.Contains(b, "noob"):
		return "SDXL"
	}
	return "Unknown"
}

// ── what the rest of the package asks for ───────────────────────────────────

// a1111Records is A1111's models as model records, the shape the catalogue code reads
// from InvokeAI.
func (c *Client) a1111Records(ctx context.Context, base string) ([]ModelRecord, error) {
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return nil, err
	}
	dir := c.modelsDir()
	out := make([]ModelRecord, 0, len(files))
	for _, f := range files {
		local := localPath(dir, f.Key)
		sc := readSidecar(local)
		out = append(out, ModelRecord{
			Key: f.Key, Name: f.Name, Type: f.Type, Hash: f.Hash,
			Base: sc.str(sidecarVersion), Description: sc.str(sidecarDescription),
			HasCover: local != "" && previewOf(local) != "",
		})
	}
	return out, nil
}

// a1111Detail is the editable record of one A1111 model, read from its sidecar.
func (c *Client) a1111Detail(ctx context.Context, base, name string) (*ModelDetail, error) {
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return nil, err
	}
	f, ok := a1111Find(files, name)
	if !ok {
		return nil, fmt.Errorf("no such model")
	}
	sc := readSidecar(localPath(c.modelsDir(), f.Key))
	d := &ModelDetail{
		Key: f.Key, Name: f.Display, Type: f.Type, Base: sc.str(sidecarVersion),
		Description: sc.str(sidecarDescription), TriggerPhrases: activationPhrases(sc.str(sidecarActivation)),
		Defaults: sc.defaults(),
	}
	if w := sc.weight(); w != 0 {
		if d.Defaults == nil {
			d.Defaults = &ModelDefaults{}
		}
		d.Defaults.Weight = w
	}
	return d, nil
}

// a1111Update writes an edit into the model's sidecar. A rename is refused: A1111
// names a model by its file, and renaming files under a running generator is how a
// prompt's <lora:…> stops resolving.
func (c *Client) a1111Update(ctx context.Context, base, key string, ch ModelChanges) (*ModelDetail, error) {
	dir, err := c.requireModelsDir()
	if err != nil {
		return nil, err
	}
	cur, err := c.a1111Detail(ctx, base, key)
	if err != nil {
		return nil, err
	}
	if ch.Name != nil && strings.TrimSpace(*ch.Name) != "" && strings.TrimSpace(*ch.Name) != cur.Name {
		return nil, errors.New("Automatic1111 names a model by its file; rename the file itself")
	}
	local := localPath(dir, cur.Key)
	if _, err := os.Stat(local); err != nil {
		return nil, fmt.Errorf("the models folder has no %s — is it the folder Automatic1111 reads?", cur.Key)
	}
	sc := readSidecar(local)
	if ch.Description != nil {
		sc[sidecarDescription] = strings.TrimSpace(*ch.Description)
	}
	if ch.TriggerPhrases != nil {
		phrases := []string{}
		for _, p := range *ch.TriggerPhrases {
			if p = strings.TrimSpace(p); p != "" {
				phrases = append(phrases, p)
			}
		}
		sc[sidecarActivation] = strings.Join(phrases, ", ")
	}
	if ch.Base != nil && *ch.Base != "" {
		sc[sidecarVersion] = a1111SDVersion(*ch.Base)
	}
	if ch.Defaults != nil {
		d := *ch.Defaults
		if cur.Type == a1111LoraFolder.Type {
			// A LoRA's one default is its weight, which A1111 has a field for.
			if d.Weight != 0 {
				sc[sidecarWeight] = d.Weight
			} else {
				delete(sc, sidecarWeight)
			}
		} else {
			d.Weight = 0
			if d == (ModelDefaults{}) {
				delete(sc, sidecarDefaults)
			} else {
				sc[sidecarDefaults] = d
			}
		}
	}
	if err := writeSidecar(local, sc); err != nil {
		return nil, err
	}
	return c.a1111Detail(ctx, base, cur.Key)
}

// previewExts are the cover files A1111's cards look for beside a model, in the
// order it tries them.
var previewExts = []string{".png", ".preview.png", ".jpg", ".preview.jpg", ".jpeg", ".preview.jpeg", ".webp", ".preview.webp", ".gif", ".preview.gif"}

func previewOf(local string) string {
	s := stem(local)
	for _, ext := range previewExts {
		if info, err := os.Stat(s + ext); err == nil && !info.IsDir() {
			return s + ext
		}
	}
	return ""
}

// a1111Cover reads a model's preview: off the mounted folder when there is one, else
// through A1111's own thumbnail route, which serves the previews its cards show.
func (c *Client) a1111Cover(ctx context.Context, base, name string) ([]byte, string, error) {
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return nil, "", err
	}
	f, ok := a1111Find(files, name)
	if !ok {
		return nil, "", fmt.Errorf("no such model")
	}
	if local := localPath(c.modelsDir(), f.Key); local != "" {
		if p := previewOf(local); p != "" {
			data, err := os.ReadFile(p)
			if err == nil {
				return data, http.DetectContentType(data), nil
			}
		}
	}
	return c.a1111RemoteCover(ctx, base, f.Remote)
}

// a1111RemoteCover asks A1111 for a model's preview by trying each name its cards
// would. A miss is remembered for a while: a picker of two hundred LoRAs with no
// covers would otherwise be two thousand requests every time it opened.
func (c *Client) a1111RemoteCover(ctx context.Context, base, remote string) ([]byte, string, error) {
	if remote == "" {
		return nil, "", fmt.Errorf("generator keeps no cover for this model")
	}
	missKey := base + "|" + remote
	c.mu.Lock()
	if at, ok := c.coverMiss[missKey]; ok && time.Since(at) < coverMissTTL {
		c.mu.Unlock()
		return nil, "", fmt.Errorf("generator keeps no cover for this model")
	}
	c.mu.Unlock()
	s := strings.TrimSuffix(remote, filepath.Ext(strings.ReplaceAll(remote, "\\", "/")))
	for _, ext := range previewExts {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet,
			base+"/sd_extra_networks/thumb?filename="+url.QueryEscape(s+ext), nil)
		if err != nil {
			break
		}
		resp, err := c.hc.Do(req)
		if err != nil {
			return nil, "", fmt.Errorf("image generator unreachable: %w", err)
		}
		if resp.StatusCode == http.StatusOK {
			data, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
			resp.Body.Close()
			ct := http.DetectContentType(data)
			if err == nil && strings.HasPrefix(ct, "image/") {
				return data, ct, nil
			}
			continue
		}
		resp.Body.Close()
	}
	c.mu.Lock()
	c.coverMiss[missKey] = time.Now()
	c.mu.Unlock()
	return nil, "", fmt.Errorf("generator keeps no cover for this model")
}

const coverMissTTL = 5 * time.Minute

// a1111SetCover writes a model's preview file, removing any other preview beside it
// so A1111's cards do not keep showing the one it finds first.
func (c *Client) a1111SetCover(ctx context.Context, base, name string, data []byte, contentType string) error {
	dir, err := c.requireModelsDir()
	if err != nil {
		return err
	}
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return err
	}
	f, ok := a1111Find(files, name)
	if !ok {
		return fmt.Errorf("no such model")
	}
	local := localPath(dir, f.Key)
	ext := ".preview.png"
	switch {
	case strings.Contains(contentType, "jpeg"):
		ext = ".preview.jpg"
	case strings.Contains(contentType, "webp"):
		ext = ".preview.webp"
	}
	s := stem(local)
	for _, other := range previewExts {
		if other != ext {
			_ = os.Remove(s + other)
		}
	}
	if err := writeFileAtomic(s+ext, data); err != nil {
		return err
	}
	c.mu.Lock()
	delete(c.coverMiss, base+"|"+f.Remote)
	c.mu.Unlock()
	return nil
}

// a1111Delete removes a model's file and the sidecars that describe it, then has
// A1111 look at its folders again.
func (c *Client) a1111Delete(ctx context.Context, base, key string) error {
	dir, err := c.requireModelsDir()
	if err != nil {
		return err
	}
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return err
	}
	f, ok := a1111Find(files, key)
	if !ok {
		return fmt.Errorf("no such model")
	}
	local := localPath(dir, f.Key)
	if err := removeSoon(local); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("the models folder has no %s — is it the folder Automatic1111 reads?", f.Key)
		}
		return err
	}
	s := stem(local)
	for _, side := range append([]string{".json", ".civitai.info"}, previewExts...) {
		_ = os.Remove(s + side)
	}
	c.hashes().forget(local)
	c.a1111Refresh(ctx, base, f.Type)
	return nil
}

// removeSoon deletes a file, waiting a moment for whoever has it open. On Windows a
// file being read cannot be deleted, and the background hasher (or a virus scanner)
// may be reading a model at the moment someone deletes it.
func removeSoon(p string) error {
	var err error
	for i := 0; i < 20; i++ {
		if err = os.Remove(p); err == nil || os.IsNotExist(err) {
			return err
		}
		time.Sleep(150 * time.Millisecond)
	}
	return err
}

// a1111Refresh asks A1111 to rescan the folder a kind of model lives in. Best-effort:
// a build without the route picks the change up on its next restart instead.
func (c *Client) a1111Refresh(ctx context.Context, base, typ string) {
	route := ""
	switch typ {
	case a1111Checkpoints.Type:
		route = "/sdapi/v1/refresh-checkpoints"
	case a1111LoraFolder.Type:
		route = "/sdapi/v1/refresh-loras"
	case a1111VaeFolder.Type:
		route = "/sdapi/v1/refresh-vae"
	}
	if route != "" {
		_ = c.postJSON(ctx, base+route, map[string]any{}, nil)
	}
}

// A1111FolderMatch is how well the models folder mounted here agrees with what A1111
// lists. A folder can look right — Stable-diffusion and Lora inside, writable — and
// still be a different copy from the one A1111 reads (another share, an old backup,
// the host path of a second install); installs then land where A1111 never looks, and
// nothing about the folder alone says so.
type A1111FolderMatch struct {
	Reported int            // models, LoRAs and VAEs A1111 lists
	Found    int            // of those, the ones at the same path under the folder
	Missing  string         // one A1111 lists that is not there, as an example
	Files    map[string]int // model files under each of the folders, by folder
}

// a1111ModelExts are the extensions A1111 loads a model from.
var a1111ModelExts = map[string]bool{".safetensors": true, ".ckpt": true, ".pt": true, ".pth": true, ".bin": true}

// A1111FolderMatch lists A1111's models and looks for each one in the folder.
func (c *Client) A1111FolderMatch(ctx context.Context, base string) (A1111FolderMatch, error) {
	out := A1111FolderMatch{Files: map[string]int{}}
	dir := c.modelsDir()
	if dir == "" {
		return out, ErrNoModelsDir
	}
	for _, f := range []a1111Folder{a1111Checkpoints, a1111LoraFolder, a1111VaeFolder} {
		n := 0
		_ = filepath.WalkDir(subfolderPath(dir, f), func(p string, d os.DirEntry, err error) error {
			if err == nil && !d.IsDir() && a1111ModelExts[strings.ToLower(filepath.Ext(p))] {
				n++
			}
			return nil
		})
		out.Files[f.Folder] = n
	}
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return out, err
	}
	for _, f := range files {
		out.Reported++
		if _, err := os.Stat(localPath(dir, f.Key)); err == nil {
			out.Found++
		} else if out.Missing == "" {
			out.Missing = f.Key
		}
	}
	return out, nil
}

// A1111Rescan asks A1111 to read its LoRA folder again, which is what every install
// and delete from here ends with. Harmless to call: it only rescans.
func (c *Client) A1111Rescan(ctx context.Context, base string) error {
	return c.postJSON(ctx, base+"/sdapi/v1/refresh-loras", map[string]any{}, nil)
}

// a1111Vaes lists A1111's standalone VAEs for the picker.
func (c *Client) a1111Vaes(ctx context.Context, base string) ([]Vae, error) {
	var raw []a1111VaeRaw
	if err := c.getJSON(ctx, base+"/sdapi/v1/sd-vae", &raw); err != nil {
		return []Vae{}, nil // older builds have no listing; the model's own VAE still works
	}
	out := make([]Vae, 0, len(raw))
	for _, v := range raw {
		if v.ModelName != "" {
			out = append(out, Vae{Key: v.ModelName, Name: v.ModelName})
		}
	}
	sort.Slice(out, func(i, j int) bool { return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name) })
	return out, nil
}

// a1111Dress fills the picker's checkpoints and LoRAs with what their sidecars say —
// a LoRA's activation text as its trigger phrases, its preferred weight, a model's
// recommended settings — and with their keys, which the catalogue's records use.
func (c *Client) a1111Dress(ctx context.Context, base string, models []Model, loras []Lora) {
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return
	}
	dir := c.modelsDir()
	for i := range models {
		f, ok := a1111Find(files, models[i].Title)
		if !ok {
			continue
		}
		models[i].Key = f.Key
		if dir != "" {
			sc := readSidecar(localPath(dir, f.Key))
			models[i].Defaults = sc.defaults()
			models[i].Base = sc.str(sidecarVersion)
		}
	}
	for i := range loras {
		f, ok := a1111Find(files, loras[i].Name)
		if !ok || f.Type != a1111LoraFolder.Type {
			continue
		}
		loras[i].Key = f.Key
		if dir != "" {
			sc := readSidecar(localPath(dir, f.Key))
			if phrases := activationPhrases(sc.str(sidecarActivation)); len(phrases) > 0 {
				loras[i].TriggerPhrases = phrases
			}
			if w := sc.weight(); w != 0 {
				loras[i].Weight = w
			}
			loras[i].Base = sc.str(sidecarVersion)
		}
	}
}

// writeFileAtomic writes beside the target and renames over it, so A1111 reading a
// sidecar mid-write never sees half of one.
func writeFileAtomic(target string, data []byte) error {
	tmp := target + ".oppailib-tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	if err := os.Rename(tmp, target); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

// ── hashing the folder ──────────────────────────────────────────────────────

// fileHashes remembers the SHA256 of each model file this side has read, keyed by
// path and invalidated by size and modification time. Hashing a six-gigabyte
// checkpoint takes most of a minute off a spinning array, so it is done once, in the
// background, one file at a time, and the answer is kept on disk across restarts.
type fileHashes struct {
	mu      sync.Mutex
	path    string // where the answers are kept; "" keeps them in memory only
	entries map[string]hashEntry
	pending map[string]bool
	work    chan string
	loaded  bool
}

type hashEntry struct {
	Size   int64  `json:"size"`
	Mod    int64  `json:"mod"`
	SHA256 string `json:"sha256"`
}

func (c *Client) hashes() *fileHashes {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.fileHashes == nil {
		c.fileHashes = &fileHashes{path: c.HashCachePath, entries: map[string]hashEntry{}, pending: map[string]bool{}}
	}
	return c.fileHashes
}

func (h *fileHashes) loadLocked() {
	if h.loaded {
		return
	}
	h.loaded = true
	if h.path == "" {
		return
	}
	if data, err := os.ReadFile(h.path); err == nil {
		_ = json.Unmarshal(data, &h.entries)
		if h.entries == nil {
			h.entries = map[string]hashEntry{}
		}
	}
}

func (h *fileHashes) saveLocked() {
	if h.path == "" {
		return
	}
	data, err := json.Marshal(h.entries)
	if err != nil {
		return
	}
	_ = os.MkdirAll(filepath.Dir(h.path), 0o755)
	_ = writeFileAtomic(h.path, data)
}

// lookup is the remembered hash of a file, "" when it has none or the file changed.
func (h *fileHashes) lookup(local string) string {
	info, err := os.Stat(local)
	if err != nil || info.IsDir() {
		return ""
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.loadLocked()
	e, ok := h.entries[local]
	if !ok || e.Size != info.Size() || e.Mod != info.ModTime().Unix() {
		return ""
	}
	return e.SHA256
}

// record keeps a hash computed elsewhere — by a download, which hashed the file as
// it arrived.
func (h *fileHashes) record(local, sum string) {
	info, err := os.Stat(local)
	if err != nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.loadLocked()
	h.entries[local] = hashEntry{Size: info.Size(), Mod: info.ModTime().Unix(), SHA256: sum}
	h.saveLocked()
}

func (h *fileHashes) forget(local string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.loadLocked()
	if _, ok := h.entries[local]; ok {
		delete(h.entries, local)
		h.saveLocked()
	}
}

// queue hands a file to the background hasher, starting it if it is idle.
func (h *fileHashes) queue(local string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.pending[local] {
		return
	}
	if _, err := os.Stat(local); err != nil {
		return
	}
	h.pending[local] = true
	if h.work == nil {
		h.work = make(chan string, 4096)
		go h.run()
	}
	select {
	case h.work <- local:
	default:
		delete(h.pending, local) // a full queue drops it; the next listing asks again
	}
}

func (h *fileHashes) run() {
	for local := range h.work {
		sum, err := sha256File(local)
		h.mu.Lock()
		delete(h.pending, local)
		h.mu.Unlock()
		if err == nil {
			h.record(local, sum)
		}
	}
}

// a1111Templates lists A1111's saved styles as templates. A style's prompt may hold
// "{prompt}" exactly as an InvokeAI preset's does, so the clients splice both alike.
func (c *Client) a1111Templates(ctx context.Context, base string) ([]Template, error) {
	var raw []struct {
		Name     string `json:"name"`
		Prompt   string `json:"prompt"`
		Negative string `json:"negative_prompt"`
	}
	if err := c.getJSON(ctx, base+"/sdapi/v1/prompt-styles", &raw); err != nil {
		return []Template{}, nil // a build without styles has none to offer
	}
	out := make([]Template, 0, len(raw))
	for _, s := range raw {
		if strings.TrimSpace(s.Name) == "" || (s.Prompt == "" && s.Negative == "") {
			continue
		}
		out = append(out, Template{ID: "a1111-style:" + s.Name, Name: s.Name, Prompt: s.Prompt, NegativePrompt: s.Negative})
	}
	return out, nil
}
