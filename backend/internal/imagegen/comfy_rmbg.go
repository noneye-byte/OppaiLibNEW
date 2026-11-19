package imagegen

import (
	"context"
	"fmt"
	"strings"
)

// Cutting a clip's background in ComfyUI, with the ComfyUI-RMBG node pack
// (github.com/1038lab/ComfyUI-RMBG).
//
// The pack's nodes take a batch of frames and hand back each one cut out, on the card
// ComfyUI already has, with models that live in ComfyUI/models/RMBG — nothing leaves
// the house and nothing is paid for. The clip is split into its frames, cut, and put
// back together at its own rate (the same LoadVideo → GetVideoComponents … CreateVideo →
// SaveVideo frame an enlargement uses).
//
// What comes back is not transparent. ComfyUI's video saver writes H.264, which has no
// alpha, so the nodes are asked to lay her on a flat screen of a colour she is not
// (their "Color" background) instead of "Alpha", and the server keys that screen out
// (matte.KeyClip) into the WebM with alpha every cut clip is.
//
// The pack's models sit behind three nodes with three spellings of the same inputs, so
// each model is filed under the node that runs it.

// ClipCutModel is one model a clip can be cut with.
type ClipCutModel struct {
	Name string `json:"name"`
	// Node is the pack's node class that runs it; Video is whether that node carries
	// each frame's cut into the next, as only VRMBG does.
	Node  string `json:"node"`
	Video bool   `json:"video"`
	// Fetched is whether the pack downloads the model on first use. VRMBG's has to be
	// put in place by hand: the node refuses to fetch it.
	Fetched bool `json:"fetched"`
}

// The pack's nodes, by the class names a queued graph uses.
const (
	rmbgNode     = "RMBG"
	birefnetNode = "BiRefNetRMBG"
	vrmbgNode    = "AILab_VRMBG"
)

// ClipCutModels are the models offered, the default first. ToonOut is BiRefNet
// fine-tuned on anime art, which she is; VRMBG-3.0 is Bria's video model, run on the
// card here rather than paid for, steadier from frame to frame than any of the others
// but downloaded by hand; the rest are the pack's general ones.
var ClipCutModels = []ClipCutModel{
	{Name: "BiRefNet_toonout", Node: birefnetNode, Fetched: true},
	{Name: "VRMBG-3.0", Node: vrmbgNode, Video: true},
	{Name: "BEN2", Node: rmbgNode, Fetched: true},
	{Name: "RMBG-2.0", Node: rmbgNode, Fetched: true},
	{Name: "BiRefNet-HR-matting", Node: birefnetNode, Fetched: true},
	{Name: "BiRefNet-general", Node: birefnetNode, Fetched: true},
}

// DefaultClipCutModel is the model a cut uses when Settings name none.
var DefaultClipCutModel = ClipCutModels[0].Name

// clipCutModel finds a model by name; ok is false for one not offered.
func clipCutModel(name string) (ClipCutModel, bool) {
	for _, m := range ClipCutModels {
		if m.Name == name {
			return m, true
		}
	}
	return ClipCutModel{}, false
}

// ClipCutScreens are the screens a cut lays her on, as the nodes' colour codes. Green
// and blue are the only ones a clip of her is ever cut onto: the colour has to be one
// nothing of hers is, and those are the screens her clips are made on already.
var ClipCutScreens = map[string]string{"green": "#00FF00", "blue": "#0000FF"}

// BuildClipCutGraph wires the cut of an uploaded clip, by its name in ComfyUI's input
// folder, with model, onto a screen of colour (a code from ClipCutScreens).
func BuildClipCutGraph(video string, model ClipCutModel, colour string) map[string]any {
	g := &comfyGraph{nodes: map[string]any{}}
	parts := g.add("GetVideoComponents", map[string]any{"video": slot(g.add("LoadVideo", map[string]any{"file": video}), 0)})
	// unload_model lets go of the model when the cut is done: the pack keeps its models
	// outside ComfyUI's own memory management, so one left loaded is a gigabyte the next
	// clip's Wan pair cannot have and ComfyUI does not know to free.
	inputs := map[string]any{"unload_model": true, "background": "Color", "background_color": colour}
	switch model.Node {
	case vrmbgNode:
		// reset_state starts the clip with no frame before its first: the node keeps the
		// last frame's cut between runs, and the last run was another clip.
		inputs["images"], inputs["reset_state"] = slot(parts, 0), true
	default:
		inputs["image"], inputs["model"] = slot(parts, 0), model.Name
	}
	cut := g.add(model.Node, inputs)
	remade := slot(g.add("CreateVideo", map[string]any{"images": slot(cut, 0), "fps": slot(parts, 2)}), 0)
	g.add("SaveVideo", map[string]any{"video": remade, "filename_prefix": "oppailib/cut", "format": "auto", "codec": "auto"})
	return g.nodes
}

// RunClipCut uploads a clip and has ComfyUI lay her on a screen of colour ("green" or
// "blue") with the named model. ext is the clip's extension (".mp4", ".webm"), which
// ComfyUI's video loader goes by.
func (c *Client) RunClipCut(ctx context.Context, base string, clip []byte, ext, modelName, screen string, progress func(Progress)) ([]ComfyOutput, error) {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	if base == "" {
		return nil, fmt.Errorf("cutting in ComfyUI needs ComfyUI's address, under Image generation → Video")
	}
	model, ok := clipCutModel(modelName)
	if !ok {
		return nil, fmt.Errorf("%q is not one of the models a clip can be cut with", modelName)
	}
	colour, ok := ClipCutScreens[screen]
	if !ok {
		return nil, fmt.Errorf("a clip is cut onto a green or blue screen, not %q", screen)
	}
	name, err := c.comfyUploadAs(ctx, base, clip, ext, "the clip")
	if err != nil {
		return nil, err
	}
	out, err := c.runComfyGraph(ctx, base, BuildClipCutGraph(name, model, colour), progress)
	if err != nil {
		return nil, clipCutProblem(err, model)
	}
	return out, nil
}

// clipCutProblem says what a failed cut needs, where ComfyUI's own words would not: a
// ComfyUI without the pack, or VRMBG's files not put in place.
func clipCutProblem(err error, model ClipCutModel) error {
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, strings.ToLower(model.Node)) && (strings.Contains(msg, "does not exist") || strings.Contains(msg, "not found")):
		return fmt.Errorf("this ComfyUI has no %s node — install ComfyUI-RMBG (1038lab) from ComfyUI Manager and restart ComfyUI: %w", model.Node, err)
	case model.Node == vrmbgNode && (strings.Contains(msg, "filenotfound") || strings.Contains(msg, "download")):
		return fmt.Errorf("VRMBG-3.0 does not download itself — put its files (config.json, model.safetensors, model.py, vrmbg3_config.py from huggingface.co/briaai/VRMBG-3.0) in ComfyUI/models/RMBG/VRMBG-3.0, or pick another model under Image generation → Video: %w", err)
	}
	return err
}
