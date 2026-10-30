package imagegen

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strings"
)

// What the Video settings' Test asks a ComfyUI, beyond the model lists comfy_wan.go
// already reads: whether it is up and on what card, how busy it is, which nodes it
// has for a pasted workflow, and whether the folders installs go to are its own.

// ComfySystem is the part of /system_stats worth saying.
type ComfySystem struct {
	Version string
	Devices []ComfyDevice
}

// ComfyDevice is one card (or the CPU) ComfyUI runs on, its memory in bytes.
type ComfyDevice struct {
	Name      string
	VRAMTotal int64
	VRAMFree  int64
}

// ComfySystemStats asks ComfyUI what it is and what it runs on. A ComfyUI from before
// the version field was added answers with it blank.
func (c *Client) ComfySystemStats(ctx context.Context, base string) (ComfySystem, error) {
	var raw struct {
		System struct {
			Version string `json:"comfyui_version"`
		} `json:"system"`
		Devices []struct {
			Name      string `json:"name"`
			VRAMTotal int64  `json:"vram_total"`
			VRAMFree  int64  `json:"vram_free"`
		} `json:"devices"`
	}
	if err := c.getJSON(ctx, comfyBase(base)+"/system_stats", &raw); err != nil {
		return ComfySystem{}, err
	}
	out := ComfySystem{Version: raw.System.Version}
	for _, d := range raw.Devices {
		out.Devices = append(out.Devices, ComfyDevice{Name: d.Name, VRAMTotal: d.VRAMTotal, VRAMFree: d.VRAMFree})
	}
	return out, nil
}

// ComfyQueue is how many prompts ComfyUI is running and has waiting.
func (c *Client) ComfyQueue(ctx context.Context, base string) (running, pending int, err error) {
	var q struct {
		Running []json.RawMessage `json:"queue_running"`
		Pending []json.RawMessage `json:"queue_pending"`
	}
	if err := c.getJSON(ctx, comfyBase(base)+"/queue", &q); err != nil {
		return 0, 0, err
	}
	return len(q.Running), len(q.Pending), nil
}

// ComfyMissingNodes names the node classes ComfyUI lacks out of those given, asking for
// each one's entry rather than the whole /object_info, which with a few hundred custom
// nodes runs to tens of megabytes.
func (c *Client) ComfyMissingNodes(ctx context.Context, base string, classes []string) ([]string, error) {
	missing := []string{}
	for _, class := range classes {
		info, err := c.comfyNodeInfo(ctx, comfyBase(base), class)
		if err != nil {
			return nil, err
		}
		if info == nil {
			missing = append(missing, class)
		}
	}
	return missing, nil
}

// WorkflowNodes reads a pasted workflow's node classes, or says why it is not an API
// export. The UI export is the usual mistake: it is what Save writes and what
// Workflow → Export gives, and it is a list of drawn boxes and links rather than the
// graph ComfyUI's /prompt takes.
func WorkflowNodes(workflow string) ([]string, error) {
	var top map[string]json.RawMessage
	if err := json.Unmarshal([]byte(workflow), &top); err != nil {
		return nil, fmt.Errorf("it is not JSON (%v) — paste the whole file Workflow → Export (API) saves", err)
	}
	if _, ok := top["nodes"]; ok {
		if _, links := top["links"]; links {
			return nil, fmt.Errorf("it is the workflow as the editor saves it, not the API export — in ComfyUI use Workflow → Export (API) and paste that file")
		}
	}
	seen := map[string]bool{}
	var classes []string
	for id, raw := range top {
		var node struct {
			Class string `json:"class_type"`
		}
		if json.Unmarshal(raw, &node) != nil || node.Class == "" {
			return nil, fmt.Errorf("node %q has no class_type — this is not an API export; use Workflow → Export (API)", id)
		}
		if !seen[node.Class] {
			seen[node.Class] = true
			classes = append(classes, node.Class)
		}
	}
	if len(classes) == 0 {
		return nil, fmt.Errorf("it has no nodes in it")
	}
	sort.Strings(classes)
	return classes, nil
}

// comfyModelExt are the files ComfyUI's loaders list.
var comfyModelExt = map[string]bool{".safetensors": true, ".gguf": true, ".ckpt": true, ".pt": true, ".pth": true, ".bin": true, ".sft": true}

// ComfyFolderFiles names the model files in a folder and its subfolders, by base name:
// ComfyUI lists them by their path under the folder, with its own separator, so the
// base name is what both sides agree on. At most a few thousand, which is more than
// any one folder holds.
func ComfyFolderFiles(dir string) []string {
	var out []string
	_ = filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil || len(out) >= 5000 {
			return filepath.SkipDir
		}
		if !d.IsDir() && comfyModelExt[strings.ToLower(filepath.Ext(p))] {
			out = append(out, d.Name())
		}
		return nil
	})
	return out
}

// ComfyBaseName is a name as ComfyUI lists it, reduced to the file's own name.
func ComfyBaseName(listed string) string {
	if i := strings.LastIndexAny(listed, `/\`); i >= 0 {
		return listed[i+1:]
	}
	return listed
}

func comfyBase(base string) string { return strings.TrimRight(strings.TrimSpace(base), "/") }
