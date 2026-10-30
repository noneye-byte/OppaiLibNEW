package imagegen

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

// A Wan clip OppaiLib wires itself, for whoever would rather name the files than build
// a graph.
//
// comfy.go runs a workflow the operator exported, on the grounds that video workflows
// change with every model release. Wan 2.x has been the one people actually run for a
// while now, though, and its graph is the same handful of core nodes whichever files
// fill it: a loader per expert, LoRAs, a shift, an image-to-video conditioning node, a
// sampler per expert, a decode and a save. Wan 2.2's 14B models come as a pair — a
// high-noise expert that lays out the motion over the first half of the steps and a
// low-noise one that finishes the detail — which is the part a newcomer to ComfyUI
// trips over, so it is the part built here: pick the two files, a text encoder and a
// VAE, and the halves are wired the way ComfyUI's own template wires them.

// WanClip is one clip to build: the files, then the run.
type WanClip struct {
	// Model is the diffusion model: Wan 2.2's high-noise expert when LowModel is set,
	// the whole model when it is not (Wan 2.1, Wan 2.2 5B, a merge). Checkpoint says it
	// is a checkpoint from checkpoints/ that carries its own text encoder and VAE — the
	// all-in-one merges — rather than a bare model from diffusion_models/.
	Model       string
	Checkpoint  bool
	LowModel    string
	TextEncoder string
	VAE         string
	Loras       []WanLora
	// Zero is Wan's own default, 20 steps, CFG 3.5 and shift 8 — or 4 steps at CFG 1
	// when anything in the clip is distilled: see Settled.
	Steps int
	CFG   float64
	Shift float64

	// Image is the uploaded starting picture's name; blank makes the clip from words.
	Image    string
	Prompt   string
	Negative string
	Width    int
	Height   int
	Frames   int
	FPS      int
	Seed     int64
}

// WanLora is one LoRA on a Wan clip.
type WanLora struct {
	Name   string
	Weight float64
	// Stage is "high" or "low" for one half of a LoRA made for Wan 2.2's pair (they
	// are published that way, a file per expert), and blank for one that goes on both.
	// With a single model every LoRA goes on it.
	Stage string
}

// wanNegative is the negative prompt Wan was trained against, from its own examples.
// It is in Chinese because the model's text encoder learned it in Chinese; an English
// rendering of it does measurably less.
const wanNegative = "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走"

// check says what is missing before anything is uploaded.
func (w WanClip) check() error {
	if strings.TrimSpace(w.Model) == "" {
		return fmt.Errorf("no video model is picked: Settings → Image generation → Video")
	}
	if !w.Checkpoint && (strings.TrimSpace(w.TextEncoder) == "" || strings.TrimSpace(w.VAE) == "") {
		return fmt.Errorf("a video model from diffusion_models needs a text encoder and a VAE picked beside it: Settings → Image generation → Video")
	}
	return nil
}

// wan22Latent reports whether the VAE is Wan 2.2's own, which only the 5B model uses:
// its latent has 48 channels rather than 16, so it takes a different latent node. The
// 14B pair uses Wan 2.1's VAE, which is why the file name is the tell.
func wan22Latent(vae string) bool {
	v := strings.ToLower(vae)
	return strings.Contains(v, "wan2.2") || strings.Contains(v, "wan2_2") || strings.Contains(v, "wan22")
}

// speedName is the files that distil Wan down to a handful of steps: the lightx2v,
// Lightning and CausVid LoRAs, and the merges with one baked in — Civitai's "Rapid"
// all-in-ones, which is most of what a Wan AIO is, since a one-file fast clip is the
// point of one. The settings screen reads LoRAs the same way (web/src/clip-models.ts).
var speedName = regexp.MustCompile(`(?i)lightx2v|lightning|causvid|distill|rapid|fastwan|(^|[^a-z])aio([^a-z]|$)|(^|[^0-9])4[\s_-]?steps?`)

// IsSpeedFile reports whether a model or LoRA, by its name, is one of those.
func IsSpeedFile(name string) bool { return speedName.MatchString(name) }

// Distilled reports whether anything the clip samples with is a speed file.
func (w WanClip) Distilled() bool {
	if IsSpeedFile(w.Model) || IsSpeedFile(w.LowModel) {
		return true
	}
	for _, l := range w.Loras {
		if l.Weight != 0 && IsSpeedFile(l.Name) {
			return true
		}
	}
	return false
}

// Settled is the clip with its blank numbers filled in. A distilled clip is only right
// at its own few steps and CFG 1: at Wan's 20 and 3.5 it comes out a blown-out smear
// of noise, and CFG above 1 samples every step twice, so it is ten times slower for
// it. The settings screen used to be the only thing that knew, and only for a LoRA
// added through its menu — a file picked any other way ran at 20 and 3.5 and burned.
// Numbers given stand either way.
func (w WanClip) Settled() WanClip {
	fast := w.Distilled()
	if w.Steps <= 0 {
		w.Steps = 20
		if fast {
			w.Steps = 4
		}
	}
	if w.CFG <= 0 {
		w.CFG = 3.5
		if fast {
			w.CFG = 1
		}
	}
	if w.Shift <= 0 {
		w.Shift = 8
	}
	return w
}

// Recipe is the numbers a clip ran at, in words, for showing beside the clip: when a
// clip comes out wrong it is the first thing to look at.
func (w WanClip) Recipe() string {
	w = w.Settled()
	s := fmt.Sprintf("%d steps · CFG %s · shift %s", w.Steps, strconv.FormatFloat(w.CFG, 'f', -1, 64), strconv.FormatFloat(w.Shift, 'f', -1, 64))
	// Counted as the studio lists them: a pair's two halves are one LoRA.
	both, halves := 0, map[string]int{}
	for _, l := range w.Loras {
		if l.Name == "" || l.Weight == 0 {
			continue
		}
		if l.Stage == "" {
			both++
		} else {
			halves[l.Stage]++
		}
	}
	on := both + max(halves["high"], halves["low"])
	if on == 1 {
		s += " · 1 LoRA"
	} else if on > 1 {
		s += fmt.Sprintf(" · %d LoRAs", on)
	}
	return s
}

// BuildWanGraph wires a clip as an API-format workflow.
func BuildWanGraph(w WanClip) (map[string]any, error) {
	if err := w.check(); err != nil {
		return nil, err
	}
	w = w.Settled()
	steps, cfg, shift := w.Steps, w.CFG, w.Shift
	negative := strings.TrimSpace(w.Negative)
	if negative == "" {
		negative = wanNegative
	}
	width, height := w.Width/16*16, w.Height/16*16
	if width <= 0 || height <= 0 {
		width, height = 832, 480
	}
	// Wan's latent holds the first frame and then blocks of four.
	frames := 81
	if w.Frames > 0 {
		frames = (w.Frames-1)/4*4 + 1
	}
	fps := w.FPS
	if fps <= 0 {
		fps = 16
	}

	g := &comfyGraph{nodes: map[string]any{}}
	var model, clip, vae []any
	if w.Checkpoint {
		ckpt := g.add("CheckpointLoaderSimple", map[string]any{"ckpt_name": w.Model})
		model, clip, vae = slot(ckpt, 0), slot(ckpt, 1), slot(ckpt, 2)
	} else {
		model = g.diffusionModel(w.Model)
	}
	// A checkpoint's own text encoder and VAE stand unless one is picked over them.
	if w.TextEncoder != "" {
		clip = slot(g.textEncoder(w.TextEncoder), 0)
	}
	if w.VAE != "" {
		vae = slot(g.add("VAELoader", map[string]any{"vae_name": w.VAE}), 0)
	}

	twoStage := w.LowModel != "" && !w.Checkpoint
	highStage := ""
	if twoStage {
		highStage = "high"
	}
	model = g.shifted(g.withLoras(model, w.Loras, highStage), shift)
	var low []any
	if twoStage {
		low = g.shifted(g.withLoras(g.diffusionModel(w.LowModel), w.Loras, "low"), shift)
	}

	positive := slot(g.add("CLIPTextEncode", map[string]any{"text": strings.TrimSpace(w.Prompt), "clip": clip}), 0)
	negCond := slot(g.add("CLIPTextEncode", map[string]any{"text": negative, "clip": clip}), 0)
	size := map[string]any{"vae": vae, "width": width, "height": height, "length": frames, "batch_size": 1}
	if w.Image != "" {
		size["start_image"] = slot(g.add("LoadImage", map[string]any{"image": w.Image}), 0)
	}
	var latent []any
	if wan22Latent(w.VAE) {
		latent = slot(g.add("Wan22ImageToVideoLatent", size), 0)
	} else {
		// WanImageToVideo without a start image is just an empty latent of the right
		// shape with the conditioning passed through, so words-to-video goes through
		// it too rather than through a second latent node.
		size["positive"], size["negative"] = positive, negCond
		i2v := g.add("WanImageToVideo", size)
		positive, negCond, latent = slot(i2v, 0), slot(i2v, 1), slot(i2v, 2)
	}

	var samples []any
	if twoStage {
		// The split ComfyUI's template makes: the high-noise expert takes the first
		// half of the steps and hands its still-noisy latent to the low-noise one.
		split := max(steps/2, 1)
		half := func(m []any, from []any, start, end int, first bool) []any {
			onOff := func(b bool) string {
				if b {
					return "enable"
				}
				return "disable"
			}
			return slot(g.add("KSamplerAdvanced", map[string]any{
				"model": m, "add_noise": onOff(first), "noise_seed": w.Seed, "steps": steps, "cfg": cfg,
				"sampler_name": "euler", "scheduler": "simple", "positive": positive, "negative": negCond,
				"latent_image": from, "start_at_step": start, "end_at_step": end, "return_with_leftover_noise": onOff(first),
			}), 0)
		}
		samples = half(low, half(model, latent, 0, split, true), split, 10000, false)
	} else {
		samples = slot(g.add("KSampler", map[string]any{
			"model": model, "seed": w.Seed, "steps": steps, "cfg": cfg, "sampler_name": "euler", "scheduler": "simple",
			"positive": positive, "negative": negCond, "latent_image": latent, "denoise": 1,
		}), 0)
	}
	frameImages := slot(g.add("VAEDecode", map[string]any{"samples": samples, "vae": vae}), 0)
	video := slot(g.add("CreateVideo", map[string]any{"images": frameImages, "fps": float64(fps)}), 0)
	g.add("SaveVideo", map[string]any{"video": video, "filename_prefix": "oppailib/clip", "format": "auto", "codec": "auto"})
	return g.nodes, nil
}

type comfyGraph struct {
	nodes map[string]any
	next  int
}

func (g *comfyGraph) add(class string, inputs map[string]any) string {
	g.next++
	id := strconv.Itoa(g.next)
	g.nodes[id] = map[string]any{"class_type": class, "inputs": inputs}
	return id
}

// slot is a link to one of a node's outputs, as the API format writes it.
func slot(id string, n int) []any { return []any{id, n} }

// diffusionModel loads a bare model. GGUF quantisations — what fits a 14B pair on a
// 12 or 16 GB card — are only listed and loaded by the ComfyUI-GGUF nodes.
func (g *comfyGraph) diffusionModel(name string) []any {
	if strings.HasSuffix(strings.ToLower(name), ".gguf") {
		return slot(g.add("UnetLoaderGGUF", map[string]any{"unet_name": name}), 0)
	}
	return slot(g.add("UNETLoader", map[string]any{"unet_name": name, "weight_dtype": "default"}), 0)
}

func (g *comfyGraph) textEncoder(name string) string {
	class := "CLIPLoader"
	if strings.HasSuffix(strings.ToLower(name), ".gguf") {
		class = "CLIPLoaderGGUF"
	}
	return g.add(class, map[string]any{"clip_name": name, "type": "wan"})
}

// withLoras chains the LoRAs meant for one expert onto it: stage "high" or "low", or
// blank for a single model, which takes them all.
func (g *comfyGraph) withLoras(model []any, loras []WanLora, stage string) []any {
	for _, l := range loras {
		if l.Name == "" || l.Weight == 0 || (stage != "" && l.Stage != "" && l.Stage != stage) {
			continue
		}
		model = slot(g.add("LoraLoaderModelOnly", map[string]any{"model": model, "lora_name": l.Name, "strength_model": l.Weight}), 0)
	}
	return model
}

func (g *comfyGraph) shifted(model []any, shift float64) []any {
	return slot(g.add("ModelSamplingSD3", map[string]any{"model": model, "shift": shift}), 0)
}

// RunWanClip builds a Wan clip and runs it. A clip from a picture with no size given
// takes the picture's shape at Wan's trained 832 on the long side, so a portrait is not
// cropped to a landscape.
func (c *Client) RunWanClip(ctx context.Context, base string, w WanClip, init []byte, progress func(Progress)) ([]ComfyOutput, error) {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	if base == "" {
		return nil, fmt.Errorf("clips are not set up: ComfyUI's address is needed")
	}
	if err := w.check(); err != nil {
		return nil, err
	}
	if len(init) > 0 {
		name, err := c.comfyUpload(ctx, base, init)
		if err != nil {
			return nil, err
		}
		w.Image = name
		if w.Width <= 0 || w.Height <= 0 {
			if cfg, _, err := image.DecodeConfig(bytes.NewReader(init)); err == nil {
				w.Width, w.Height = longSide(cfg.Width, cfg.Height, 832)
			}
		}
	}
	graph, err := BuildWanGraph(w)
	if err != nil {
		return nil, err
	}
	return c.runComfyGraph(ctx, base, graph, progress)
}

// longSide is w×h scaled so its longer side is long, both sides in sixteens.
func longSide(w, h, long int) (int, int) {
	if w <= 0 || h <= 0 {
		return long, long
	}
	short := func(a, b int) int { return max(64, (long*a/b+8)/16*16) }
	if w >= h {
		return long, short(h, w)
	}
	return short(w, h), long
}

// ComfyModels is what a ComfyUI has to fill a built Wan clip with, folder by folder.
type ComfyModels struct {
	Diffusion    []string `json:"diffusion"`
	Checkpoints  []string `json:"checkpoints"`
	TextEncoders []string `json:"textEncoders"`
	VAEs         []string `json:"vaes"`
	Loras        []string `json:"loras"`
	// Missing names the core nodes a built clip needs that this ComfyUI lacks: one from
	// before Wan 2.2 (summer 2025) has no WanImageToVideo or SaveVideo, and the fix is
	// updating it, which is worth saying before a clip fails half way.
	Missing []string `json:"missing"`
}

// ListComfyModels asks a ComfyUI which files its loader nodes offer. Each node's input
// list is the folder's contents as ComfyUI sees them, which is what the workflow must
// name — a path relative to the folder, subfolders and all.
func (c *Client) ListComfyModels(ctx context.Context, base string) (ComfyModels, error) {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	out := ComfyModels{Diffusion: []string{}, Checkpoints: []string{}, TextEncoders: []string{}, VAEs: []string{}, Loras: []string{}, Missing: []string{}}
	if base == "" {
		return out, fmt.Errorf("ComfyUI's address is not set")
	}
	lists := []struct {
		class, input string
		into         *[]string
	}{
		{"UNETLoader", "unet_name", &out.Diffusion},
		{"UnetLoaderGGUF", "unet_name", &out.Diffusion},
		{"CheckpointLoaderSimple", "ckpt_name", &out.Checkpoints},
		{"CLIPLoader", "clip_name", &out.TextEncoders},
		{"CLIPLoaderGGUF", "clip_name", &out.TextEncoders},
		{"VAELoader", "vae_name", &out.VAEs},
		{"LoraLoaderModelOnly", "lora_name", &out.Loras},
	}
	for i, l := range lists {
		info, err := c.comfyNodeInfo(ctx, base, l.class)
		if err != nil {
			if i == 0 {
				return out, err
			}
			continue
		}
		*l.into = appendNew(*l.into, comboOptions(info, l.input)...)
	}
	for _, class := range []string{"WanImageToVideo", "ModelSamplingSD3", "CreateVideo", "SaveVideo"} {
		if info, err := c.comfyNodeInfo(ctx, base, class); err != nil || info == nil {
			out.Missing = append(out.Missing, class)
		}
	}
	return out, nil
}

// comfyNodeInfo is one node's /object_info entry, or nil when ComfyUI has no such node
// (it answers an unknown name with an empty object, not an error).
func (c *Client) comfyNodeInfo(ctx context.Context, base, class string) (json.RawMessage, error) {
	var all map[string]json.RawMessage
	if err := c.getJSON(ctx, base+"/object_info/"+url.PathEscape(class), &all); err != nil {
		return nil, fmt.Errorf("ComfyUI did not list its models: %w", err)
	}
	return all[class], nil
}

// comboOptions reads a dropdown input's choices out of a node's info. ComfyUI has
// written them two ways: the list itself as the input's first element, and — for nodes
// on its newer schema — "COMBO" followed by an object holding them under "options".
func comboOptions(info json.RawMessage, input string) []string {
	var node struct {
		Input struct {
			Required map[string][]json.RawMessage `json:"required"`
		} `json:"input"`
	}
	if json.Unmarshal(info, &node) != nil {
		return nil
	}
	spec := node.Input.Required[input]
	if len(spec) == 0 {
		return nil
	}
	var opts []string
	if json.Unmarshal(spec[0], &opts) == nil {
		return opts
	}
	var kind string
	if json.Unmarshal(spec[0], &kind) == nil && kind == "COMBO" && len(spec) > 1 {
		var more struct {
			Options []string `json:"options"`
		}
		if json.Unmarshal(spec[1], &more) == nil {
			return more.Options
		}
	}
	return nil
}

func appendNew(list []string, more ...string) []string {
	seen := map[string]bool{}
	for _, s := range list {
		seen[s] = true
	}
	for _, s := range more {
		if s != "" && !seen[s] {
			seen[s] = true
			list = append(list, s)
		}
	}
	return list
}
