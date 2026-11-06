package imagegen

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// Moving models from one generator to another.
//
// A library of checkpoints and LoRAs is hundreds of gigabytes that took months to
// gather, and each generator wants it in folders of its own. So this copies a whole
// kind of file from one generator's folders to another's, each folder as Settings has
// it, on this box, with no need for either generator to be running.
//
// It is careful in the ways a job this size has to be. The source is only ever read:
// nothing is moved, so a transfer that goes wrong has cost nothing, and removing the
// originals is left to the person who can see it worked. A file already there at the
// same size is skipped, which makes a stopped transfer one that can simply be run
// again; one there at a different size is left alone and counted, since which of the
// two is wanted is not something to guess by overwriting. A file arrives under a
// temporary name and is renamed once whole, so neither generator can load half of one.
//
// Where the two folders are on one filesystem, a file is hard linked rather than
// copied: done at once, and taking no more room, which on a share this size can be the
// difference between possible and not. Linking is safe because model files are never
// edited in place. The small files beside a model are copied, since they are.

// TransferKinds are what can be transferred, in the order they are shown and run. They
// are ComfyUI's folder names, as ComfyPlaces' keys are.
var TransferKinds = []string{"checkpoints", "loras", "vae"}

// TransferSide is one generator's folders: a folder by kind, absent where it has none.
type TransferSide struct {
	ID    string            `json:"id"`
	Label string            `json:"label"`
	Dirs  map[string]string `json:"dirs"`
	// Problem says why this side can't be used, "" when it can.
	Problem string `json:"problem,omitempty"`
}

// folders by kind, for a generator that keeps them all in one models folder.
var transferA1111Folders = map[string]a1111Folder{
	"checkpoints": a1111Checkpoints, "loras": a1111LoraFolder, "vae": a1111VaeFolder,
}

// ForgeMountPoint is where the Unraid template maps Forge Neo's models folder, used
// when the setting is blank and something is there. A var as a1111MountPoint is.
var ForgeMountPoint = "/forge-models"

// A1111Side is a side from a models folder, as a setting has it: Automatic1111's or
// Forge's. A folder that exists and is empty is fine, a Forge freshly installed for the
// purpose having nothing in it yet, and its kinds are made as they are needed.
func A1111Side(id, label, setting string) TransferSide {
	side := TransferSide{ID: id, Label: label, Dirs: map[string]string{}}
	dir := strings.TrimRight(strings.TrimSpace(setting), "/\\")
	if dir == "" {
		side.Problem = "no folder is set"
		return side
	}
	resolved, problem := resolveA1111ModelsDir(dir)
	if resolved == "" {
		entries, err := os.ReadDir(dir)
		if err != nil || len(entries) > 0 {
			side.Problem = problem
			return side
		}
		resolved = dir
	}
	forgetSubfolders(resolved)
	for kind, f := range transferA1111Folders {
		side.Dirs[kind] = subfolderPath(resolved, f)
	}
	return side
}

// ForgeSide is Forge Neo's models folder: the setting, else the template's mount.
func ForgeSide(id, label, setting string) TransferSide {
	if strings.TrimSpace(setting) == "" {
		if info, err := os.Stat(ForgeMountPoint); err == nil && info.IsDir() {
			setting = ForgeMountPoint
		}
	}
	return A1111Side(id, label, setting)
}

// ComfySide is a side from ComfyUI's folders, each exactly as Settings has it.
func ComfySide(id, label string, f ComfyFolders) TransferSide {
	side := TransferSide{ID: id, Label: label, Dirs: map[string]string{}}
	set := map[string]string{"checkpoints": f.Checkpoints, "loras": f.Loras, "vae": f.VAEs}
	for _, kind := range TransferKinds {
		if d := strings.TrimRight(strings.TrimSpace(set[kind]), "/\\"); d != "" {
			side.Dirs[kind] = d
		}
	}
	if len(side.Dirs) == 0 {
		side.Problem = "its folders are not set — they are under Settings → Image generation → Video"
	}
	return side
}

// transferItem is one file to bring across.
type transferItem struct {
	src, dst string
	size     int64
	// companion is a sidecar or a cover beside a model, rather than the model.
	companion bool
}

// TransferPlan says what a transfer would do, before it does any of it.
type TransferPlan struct {
	// Files and Bytes are the models to bring across, and what beside them.
	Files int   `json:"files"`
	Bytes int64 `json:"bytes"`
	// Have are already there, the same size, and are left as they are.
	Have int `json:"have"`
	// Clashes are there at a different size: another file by that name, left alone.
	Clashes int `json:"clashes"`
	// ByKind is Files for each kind.
	ByKind map[string]int `json:"byKind"`
	// Missing are kinds the destination has no folder for, and so are skipped.
	Missing []string `json:"missing"`
	// Free is the room on the destination, 0 when it could not be told. Filled in by
	// the caller, who has the means of asking.
	Free int64 `json:"free"`

	items []transferItem
}

// companionSuffixes are the files beside a model that belong to it: its description,
// its Civitai record and its cover, in the names Automatic1111's folders use.
var companionSuffixes = []string{
	".json", ".civitai.info", ".preview.png", ".preview.jpg", ".preview.jpeg", ".preview.webp", ".png", ".jpg", ".jpeg", ".webp",
}

// planTransfer walks the source and looks at the destination. Its only write is none:
// it can be called as often as the screen likes.
func planTransfer(from, to TransferSide, kinds []string) (TransferPlan, error) {
	plan := TransferPlan{ByKind: map[string]int{}, Missing: []string{}}
	switch {
	case from.Problem != "":
		return plan, fmt.Errorf("%s: %s", from.Label, from.Problem)
	case to.Problem != "":
		return plan, fmt.Errorf("%s: %s", to.Label, to.Problem)
	}
	for _, kind := range TransferKinds {
		if !containsKind(kinds, kind) {
			continue
		}
		srcDir, dstDir := from.Dirs[kind], to.Dirs[kind]
		if srcDir == "" {
			continue
		}
		if dstDir == "" {
			plan.Missing = append(plan.Missing, kind)
			continue
		}
		if sameFolder(srcDir, dstDir) {
			return plan, fmt.Errorf("%s and %s are the same folder for %s — there is nothing to transfer", from.Label, to.Label, kind)
		}
		items, err := walkModels(srcDir, dstDir)
		if err != nil {
			return plan, err
		}
		for _, it := range items {
			info, err := os.Stat(it.dst)
			switch {
			case err == nil && info.Size() == it.size:
				if !it.companion {
					plan.Have++
				}
			case err == nil:
				if !it.companion {
					plan.Clashes++
				}
			case !errors.Is(err, fs.ErrNotExist):
				return plan, fmt.Errorf("can't look at %s: %w", it.dst, err)
			default:
				plan.items = append(plan.items, it)
				plan.Bytes += it.size
				if !it.companion {
					plan.Files++
					plan.ByKind[kind]++
				}
			}
		}
	}
	return plan, nil
}

// walkModels lists the models under srcDir and what belongs to each, with where they
// go. Anything else there — a "Put LoRA here.txt", a half-finished download — stays.
func walkModels(srcDir, dstDir string) ([]transferItem, error) {
	type file struct {
		rel  string
		size int64
	}
	var models []file
	others := map[string]file{}
	err := filepath.WalkDir(srcDir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			if p == srcDir {
				return err
			}
			return nil // one unreadable subfolder should not stop the rest
		}
		if strings.HasPrefix(d.Name(), ".") {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		rel, err := filepath.Rel(srcDir, p)
		if err != nil {
			return nil
		}
		f := file{rel, info.Size()}
		if a1111ModelExts[strings.ToLower(filepath.Ext(p))] {
			// Wan's files share ComfyUI's folders and are no use to anything else.
			if !videoModelName.MatchString(filepath.ToSlash(rel)) {
				models = append(models, f)
			}
		} else {
			others[rel] = f
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("can't read %s: %w", srcDir, err)
	}
	sort.Slice(models, func(i, j int) bool { return models[i].rel < models[j].rel })
	var out []transferItem
	for _, m := range models {
		out = append(out, transferItem{src: filepath.Join(srcDir, m.rel), dst: filepath.Join(dstDir, m.rel), size: m.size})
		base := strings.TrimSuffix(m.rel, filepath.Ext(m.rel))
		for _, suffix := range companionSuffixes {
			if c, ok := others[base+suffix]; ok {
				out = append(out, transferItem{src: filepath.Join(srcDir, c.rel), dst: filepath.Join(dstDir, c.rel), size: c.size, companion: true})
			}
		}
	}
	return out, nil
}

func containsKind(kinds []string, kind string) bool {
	for _, k := range kinds {
		if k == kind {
			return true
		}
	}
	return false
}

// sameFolder is whether two paths are one folder, however each was written: on a share
// mapped twice the paths can differ and the folder not.
func sameFolder(a, b string) bool {
	ai, err1 := os.Stat(a)
	bi, err2 := os.Stat(b)
	if err1 != nil || err2 != nil {
		return filepath.Clean(a) == filepath.Clean(b)
	}
	return os.SameFile(ai, bi)
}

// TransferJob is a transfer as the screen follows it.
type TransferJob struct {
	State string `json:"state"` // running | done | stopped | failed
	From  string `json:"from"`
	To    string `json:"to"`
	// Files and Bytes are all of it; Done and DoneBytes how far it has got.
	Files     int   `json:"files"`
	Bytes     int64 `json:"bytes"`
	Done      int   `json:"done"`
	DoneBytes int64 `json:"doneBytes"`
	// Current is the file it is on, as a path under its folder.
	Current string `json:"current,omitempty"`
	// Linked took no room, Copied did: the sum is Done.
	Linked int `json:"linked"`
	Copied int `json:"copied"`
	// Have and Clashes are as the plan counted them, for the last line of the report.
	Have    int    `json:"have"`
	Clashes int    `json:"clashes"`
	Error   string `json:"error,omitempty"`
}

// modelTransfers is the one transfer at a time: two would fight over the disk, and over
// which of them has the file.
type modelTransfers struct {
	mu     sync.Mutex
	job    *TransferJob
	cancel context.CancelFunc
}

// ErrTransferRunning is a second transfer asked for during the first.
var ErrTransferRunning = errors.New("a transfer is already running")

// TransferStatus is the running transfer or the last one, nil before there has been one.
func (c *Client) TransferStatus() *TransferJob {
	c.transfers.mu.Lock()
	defer c.transfers.mu.Unlock()
	if c.transfers.job == nil {
		return nil
	}
	out := *c.transfers.job
	return &out
}

// StopTransfer stops the running transfer, between one chunk of a file and the next.
func (c *Client) StopTransfer() {
	c.transfers.mu.Lock()
	defer c.transfers.mu.Unlock()
	if c.transfers.cancel != nil {
		c.transfers.cancel()
	}
}

// PlanTransfer says what a transfer would do.
func (c *Client) PlanTransfer(from, to TransferSide, kinds []string) (TransferPlan, error) {
	return planTransfer(from, to, kinds)
}

// StartTransfer runs a transfer in the background and returns at once. done, when set,
// is called when it ends however it ended, for telling the generators to look again.
func (c *Client) StartTransfer(from, to TransferSide, kinds []string, done func(TransferJob)) (TransferJob, error) {
	plan, err := planTransfer(from, to, kinds)
	if err != nil {
		return TransferJob{}, err
	}
	ctx, cancel := context.WithCancel(context.Background())
	job := &TransferJob{
		State: "running", From: from.Label, To: to.Label, Files: plan.Files, Bytes: plan.Bytes,
		Have: plan.Have, Clashes: plan.Clashes,
	}
	c.transfers.mu.Lock()
	if c.transfers.job != nil && c.transfers.job.State == "running" {
		c.transfers.mu.Unlock()
		cancel()
		return TransferJob{}, ErrTransferRunning
	}
	c.transfers.job, c.transfers.cancel = job, cancel
	out := *job
	c.transfers.mu.Unlock()

	go func() {
		defer cancel()
		err := c.runTransfer(ctx, plan.items, job)
		c.transfers.mu.Lock()
		job.Current = ""
		switch {
		case err == nil:
			job.State = "done"
		case errors.Is(err, context.Canceled):
			job.State = "stopped"
		default:
			job.State, job.Error = "failed", err.Error()
		}
		final := *job
		c.transfers.mu.Unlock()
		if done != nil {
			done(final)
		}
	}()
	return out, nil
}

func (c *Client) runTransfer(ctx context.Context, items []transferItem, job *TransferJob) error {
	update := func(fn func(*TransferJob)) {
		c.transfers.mu.Lock()
		defer c.transfers.mu.Unlock()
		fn(job)
	}
	for _, it := range items {
		if err := ctx.Err(); err != nil {
			return err
		}
		update(func(j *TransferJob) { j.Current = filepath.Base(it.src) })
		linked, err := placeFile(ctx, it, func(n int64) { update(func(j *TransferJob) { j.DoneBytes += n }) })
		if err != nil {
			return err
		}
		if linked {
			update(func(j *TransferJob) { j.DoneBytes += it.size })
		}
		if it.companion {
			continue
		}
		// The file is the same bytes, so what a hash cost to work out need not be spent
		// again on hundreds of gigabytes.
		if h := c.hashes().lookup(it.src); h != "" {
			c.hashes().record(it.dst, h)
		}
		update(func(j *TransferJob) {
			j.Done++
			if linked {
				j.Linked++
			} else {
				j.Copied++
			}
		})
	}
	return nil
}

// placeFile brings one file across, linked where it can be, and says which it was.
// progress is told each chunk of a copy. A half-copied file is taken away again.
func placeFile(ctx context.Context, it transferItem, progress func(int64)) (linked bool, err error) {
	if err := os.MkdirAll(filepath.Dir(it.dst), 0o755); err != nil {
		return false, fmt.Errorf("can't write to %s: %w", filepath.Dir(it.dst), err)
	}
	if !it.companion && os.Link(it.src, it.dst) == nil {
		return true, nil
	}
	in, err := os.Open(it.src)
	if err != nil {
		return false, fmt.Errorf("can't read %s: %w", it.src, err)
	}
	defer in.Close()
	part := it.dst + ".part"
	out, err := os.Create(part)
	if err != nil {
		return false, fmt.Errorf("can't write to %s: %w", filepath.Dir(it.dst), err)
	}
	defer func() {
		if err != nil {
			out.Close()
			os.Remove(part)
		}
	}()
	buf := make([]byte, 4<<20)
	for {
		if err := ctx.Err(); err != nil {
			return false, err
		}
		n, readErr := in.Read(buf)
		if n > 0 {
			if _, err := out.Write(buf[:n]); err != nil {
				return false, fmt.Errorf("couldn't write %s: %w", filepath.Base(it.dst), err)
			}
			progress(int64(n))
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return false, fmt.Errorf("couldn't read %s: %w", it.src, readErr)
		}
	}
	if err := out.Close(); err != nil {
		return false, fmt.Errorf("couldn't finish %s: %w", filepath.Base(it.dst), err)
	}
	// Its own time, so a generator or a tool that sorts by date sees what it always did.
	if info, err := os.Stat(it.src); err == nil {
		_ = os.Chtimes(part, time.Now(), info.ModTime())
	}
	if err := os.Rename(part, it.dst); err != nil {
		return false, fmt.Errorf("couldn't finish %s: %w", filepath.Base(it.dst), err)
	}
	return false, nil
}

// RefreshModels asks the generator at base to look at its folders again.
func (c *Client) RefreshModels(ctx context.Context, base string) {
	for _, f := range []a1111Folder{a1111Checkpoints, a1111LoraFolder, a1111VaeFolder} {
		c.a1111Refresh(ctx, base, f.Type)
	}
}
