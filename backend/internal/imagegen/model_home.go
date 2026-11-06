package imagegen

import (
	"context"
	"path"
	"path/filepath"
	"strings"
)

// Where a generator's model files are on this box.
//
// Automatic1111 and Forge keep theirs in one models folder. ComfyUI's are in folders
// set one by one (see ComfyFolders), which need not share a parent. A file is known by
// the same key on all of them, its path under Automatic1111's folder names, so that
// what the studio keeps by key — a link to Civitai, a LoRA's category, a model's
// recommended settings — stays with the file wherever it has been transferred to.
// modelHome is the one place that turns that key into a path.
type modelHome struct {
	// dir is the models folder of an Automatic1111 or Forge, resolved.
	dir string
	// folders are ComfyUI's, by Automatic1111's name for each. Set instead of dir.
	folders map[string]string
}

// path is where a key lives, "" when this home has nowhere for it.
func (h modelHome) path(key string) string {
	if h.folders == nil {
		return localPath(h.dir, key)
	}
	if key == "" {
		return ""
	}
	clean := strings.TrimPrefix(path.Clean("/"+key), "/")
	first, rest, ok := strings.Cut(clean, "/")
	dir := h.folders[first]
	if !ok || dir == "" {
		return ""
	}
	return filepath.Join(dir, filepath.FromSlash(rest))
}

// set is whether there is a folder at all.
func (h modelHome) set() bool {
	if h.folders == nil {
		return h.dir != ""
	}
	for _, d := range h.folders {
		if d != "" {
			return true
		}
	}
	return false
}

// comfyHome is ComfyUI's folders as a home. Only the kinds a picture uses: a Wan model
// has no key, being no business of the picture studio.
func comfyHome(f ComfyFolders) modelHome {
	clean := func(p string) string { return strings.TrimRight(strings.TrimSpace(p), "/\\") }
	return modelHome{folders: map[string]string{
		a1111Checkpoints.Folder: clean(f.Checkpoints),
		a1111LoraFolder.Folder:  clean(f.Loras),
		a1111VaeFolder.Folder:   clean(f.VAEs),
	}}
}

func (c *Client) comfyDirs() ComfyFolders {
	if c.ComfyDirs == nil {
		return ComfyFolders{}
	}
	return c.ComfyDirs()
}

// home is where the generator at base keeps its files.
func (c *Client) home(ctx context.Context, base string) modelHome {
	if kind, err := c.Backend(ctx, base); err == nil && kind == KindComfy {
		return comfyHome(c.comfyDirs())
	}
	return modelHome{dir: c.modelsDir()}
}

// requireHome is home for the calls that write, which have no use for a folder that
// cannot be written to, and say why when there is none.
func (c *Client) requireHome(ctx context.Context, base string) (modelHome, error) {
	if kind, err := c.Backend(ctx, base); err == nil && kind == KindComfy {
		if !ComfyPlacesFor(c.comfyDirs()).pictures() {
			return modelHome{}, errComfyNoFolders
		}
		return comfyHome(c.comfyDirs()), nil
	}
	dir, err := c.requireModelsDir()
	if err != nil {
		return modelHome{}, err
	}
	return modelHome{dir: dir}, nil
}
