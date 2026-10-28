package imagegen

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// Renaming a model's file.
//
// A1111 names a LoRA by its file — the name the picker shows and the one a prompt's
// <lora:…> calls it by — and a file from Civitai is named whatever its uploader
// called it: "makima_v2-000014", "pony_lora_final", two different characters both
// "char_v1". Renaming the file is the only way to give one a name. It takes its
// sidecars with it — the description and trigger words in "<name>.json", the cover
// in "<name>.preview.png" — or it arrives under its new name bare, and A1111 is
// asked to list its LoRAs again. ADetailer reads its detectors only when A1111
// starts, so a renamed detector is not one it can use until then.
//
// What else knew the file by its old name (the catalogue link, the category it is
// filed under, the studio's open recipe) is the caller's to move.

// ModelRename is one file renamed.
type ModelRename struct {
	OldKey string `json:"oldKey"`
	NewKey string `json:"newKey"`
	// OldName and NewName are what a generate names it by: a LoRA's file name
	// without its extension, a detector's with.
	OldName string `json:"oldName"`
	NewName string `json:"newName"`
}

var modelNameJunk = regexp.MustCompile(`[^\p{L}\p{N} ._\-]+`)

// maxModelName is long enough for a character, her series and a version.
const maxModelName = 100

// CleanModelName makes a name both a file and a prompt can carry: letters and digits
// of any script, spaces, dots, dashes and underscores. A colon or a ">" would end a
// <lora:name:1> early and a slash would put the file in another folder; the rest
// (brackets, "|", emoji) are what make the catalogue's names hard to type.
func CleanModelName(name string) string {
	name = modelNameJunk.ReplaceAllString(name, " ")
	name = strings.Trim(strings.Join(strings.Fields(name), " "), " ._-")
	if utf8.RuneCountInString(name) > maxModelName {
		name = strings.TrimRight(string([]rune(name)[:maxModelName]), " ._-")
	}
	return name
}

// sidecarSuffixes are the files beside a model that describe it, by what follows its
// stem: A1111's own card, the Civitai Helper extension's info file, a trigger-word
// note, and every cover A1111 looks for.
var sidecarSuffixes = append([]string{".json", ".civitai.info", ".txt"}, previewExts...)

// renameModelFile renames local to the name `to` (its extension kept) in the same
// folder, with its sidecars, and returns the new path. A name that is taken is
// refused rather than overwritten: it is another model.
func renameModelFile(local, to string) (string, error) {
	ext := filepath.Ext(local)
	to = strings.TrimSpace(to)
	if strings.EqualFold(filepath.Ext(to), ext) {
		to = to[:len(to)-len(ext)] // "x.pt" typed for a detector is "x"
	}
	to = CleanModelName(to)
	if to == "" {
		return "", errors.New("the new name has no letters or digits in it")
	}
	if _, err := os.Stat(local); err != nil {
		return "", fmt.Errorf("the models folder has no %s", filepath.Base(local))
	}
	target := filepath.Join(filepath.Dir(local), to+ext)
	if target == local {
		return local, nil
	}
	// A change of case alone is the same file on Windows and on most SMB shares, so
	// the new name being "there" is the file itself.
	if !strings.EqualFold(target, local) {
		if _, err := os.Stat(target); err == nil {
			return "", fmt.Errorf("there is already a %s in that folder", to+ext)
		}
	}
	oldStem, newStem := strings.TrimSuffix(local, ext), strings.TrimSuffix(target, ext)
	var sides []string
	for _, side := range sidecarSuffixes {
		if info, err := os.Stat(oldStem + side); err == nil && !info.IsDir() {
			sides = append(sides, side)
		}
	}
	if err := renameSoon(local, target); err != nil {
		return "", err
	}
	for _, side := range sides {
		// A stray file already under the new name is left alone; this one stays put
		// rather than replace it.
		if _, err := os.Stat(newStem + side); err == nil && !strings.EqualFold(oldStem, newStem) {
			continue
		}
		_ = os.Rename(oldStem+side, newStem+side)
	}
	return target, nil
}

// renameSoon renames a file, waiting a moment for whoever has it open — on Windows a
// file being read (by the background hasher, or a scanner) cannot be moved.
func renameSoon(from, to string) error {
	var err error
	for i := 0; i < 20; i++ {
		if err = os.Rename(from, to); err == nil {
			return nil
		}
		time.Sleep(150 * time.Millisecond)
	}
	return err
}

// move carries a file's remembered hash over to its new path. A rename keeps the
// size and the modification time the entry is checked against.
func (h *fileHashes) move(from, to string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.loadLocked()
	if e, ok := h.entries[from]; ok {
		delete(h.entries, from)
		h.entries[to] = e
		h.saveLocked()
	}
}

// A1111RenameLora renames a LoRA's file, found by its name or key, and has A1111 list
// its LoRAs again.
func (c *Client) A1111RenameLora(ctx context.Context, base, name, to string) (*ModelRename, error) {
	dir, err := c.requireModelsDir()
	if err != nil {
		return nil, err
	}
	files, err := c.a1111Files(ctx, base)
	if err != nil {
		return nil, err
	}
	f, ok := a1111Find(files, name)
	if !ok || f.Type != a1111LoraFolder.Type {
		return nil, fmt.Errorf("Automatic1111 has no LoRA called %s", name)
	}
	local := localPath(dir, f.Key)
	renamed, err := renameModelFile(local, to)
	if err != nil {
		return nil, err
	}
	c.hashes().move(local, renamed)
	c.a1111Refresh(ctx, base, f.Type)
	file := filepath.Base(renamed)
	return &ModelRename{
		OldKey: f.Key, NewKey: path.Join(path.Dir(f.Key), file),
		OldName: f.Name, NewName: strings.TrimSuffix(file, filepath.Ext(file)),
	}, nil
}

// A1111RenameDetector renames a detector in ADetailer's folder. ADetailer goes on
// listing it by its old name until Automatic1111 restarts.
func (c *Client) A1111RenameDetector(key, to string) (*ModelRename, error) {
	dir, err := c.requireModelsDir()
	if err != nil {
		return nil, err
	}
	if !strings.HasPrefix(key, a1111DetectorFolder.Folder+"/") || !strings.EqualFold(path.Ext(key), detectorExt) {
		return nil, errors.New("not a detector")
	}
	local := localPath(dir, key)
	renamed, err := renameModelFile(local, to)
	if err != nil {
		return nil, err
	}
	c.hashes().move(local, renamed)
	file := filepath.Base(renamed)
	return &ModelRename{OldKey: key, NewKey: path.Join(path.Dir(key), file), OldName: path.Base(key), NewName: file}, nil
}

// A1111FileHash is the SHA256 of a file under the models folder: remembered, or read
// now. Detectors are a few megabytes and never listed by A1111, so the background
// hasher never sees them; a lookup by hash reads them on the spot.
func (c *Client) A1111FileHash(key string) (string, error) {
	local := localPath(c.modelsDir(), key)
	if local == "" {
		return "", ErrNoModelsDir
	}
	if h := c.hashes().lookup(local); h != "" {
		return h, nil
	}
	sum, err := sha256File(local)
	if err != nil {
		return "", err
	}
	c.hashes().record(local, sum)
	return sum, nil
}
