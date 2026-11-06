package imagegen

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// Wan on Forge, for a box with no ComfyUI.
//
// Forge makes a clip the way it makes a batch: the batch size is the frames, and the
// high-noise model hands over to the low-noise one as a refiner. It writes the video
// into its own outputs folder and the API never says where, but every frame comes back
// in the reply's images as any picture would. So the video is put together here from
// those, by the ffmpeg the server already has for its thumbnails, and from there on a
// clip from Forge is a clip like any other.

// Where a clip switches from the high-noise model to the low-noise one, in sigmas, as
// Forge's refiner box advises for each direction.
const (
	wanSwitchFromWords   = 0.875
	wanSwitchFromPicture = 0.9
)

// forgeRefinerRules is Forge's own default for its LoRA Replacements box. A run has to
// send the box's value, and Forge saves what it is sent as the setting, so a run that
// has no rules of its own hands back the default rather than wiping someone's.
const forgeRefinerRules = "high_noise=low_noise\nhigh-noise=low-noise"

// wanRefinerRules are the rules that carry a clip's LoRAs across to the low-noise pass.
// A LoRA for both goes through as it is. A pair's halves are named by the studio, so
// each is said outright rather than trusted to the default rule: its high half comes
// off and its low half goes on.
func wanRefinerRules(loras []WanLora) string {
	var rules []string
	for _, l := range loras {
		if l.Name == "" || l.Weight == 0 {
			continue
		}
		switch l.Stage {
		case "high":
			rules = append(rules, "-"+l.Name)
		case "low":
			rules = append(rules, l.Name+"+"+strconv.FormatFloat(l.Weight, 'f', -1, 64))
		}
	}
	if len(rules) == 0 {
		return forgeRefinerRules
	}
	return strings.Join(append(rules, forgeRefinerRules), "\n")
}

// wanMainLoras are the LoRAs for the first pass: all of them, less the low halves.
func wanMainLoras(loras []WanLora) []LoraWeight {
	var out []LoraWeight
	for _, l := range loras {
		if l.Name != "" && l.Weight != 0 && l.Stage != "low" {
			out = append(out, LoraWeight{Name: stripExt(l.Name), Weight: l.Weight})
		}
	}
	return out
}

var loraExt = regexp.MustCompile(`(?i)\.(safetensors|pt|ckpt)$`)

// stripExt is a LoRA's name as a prompt token wants it. The Video studio holds them as
// ComfyUI lists them, with the extension on.
func stripExt(name string) string {
	return loraExt.ReplaceAllString(name, "")
}

// RunForgeClip makes a Wan clip on Forge and puts its frames together.
func (c *Client) RunForgeClip(ctx context.Context, base string, w WanClip, init []byte, progress func(Progress)) ([]ComfyOutput, error) {
	if strings.TrimSpace(w.Model) == "" {
		return nil, errors.New("no video model is picked")
	}
	if w.Loop && len(init) == 0 {
		return nil, errors.New("a looping clip starts and ends on a picture, so it needs one to start from")
	}
	w = w.Settled()
	if w.Frames <= 0 {
		w.Frames = 81
	}
	if w.FPS <= 0 {
		w.FPS = 16
	}
	width, height := w.Size(init)
	negative := w.Negative
	if strings.TrimSpace(negative) == "" {
		negative = wanNegative
	}
	run := ForgeRun{
		Frames: w.Frames, Scheduler: w.Scheduler, Shift: w.Shift,
		RefinerRules: wanRefinerRules(w.Loras),
	}
	for _, m := range []string{w.TextEncoder, w.VAE} {
		if m != "" {
			run.Modules = append(run.Modules, m)
		}
	}
	if w.LowModel != "" {
		run.Refiner, run.RefinerAt = w.LowModel, wanSwitchFromWords
	}
	req := GenerateRequest{
		Prompt: w.Prompt, NegativePrompt: negative, Checkpoint: w.Model, Sampler: w.Sampler,
		Steps: w.Steps, CfgScale: w.CFG, Width: width, Height: height, Seed: w.Seed, Count: 1,
		Loras: wanMainLoras(w.Loras), Forge: run, Progress: progress,
	}
	if len(init) > 0 {
		req.InitImage, req.Denoise = init, 1
		if w.LowModel != "" {
			req.Forge.RefinerAt = wanSwitchFromPicture
		}
		if w.Loop {
			req.Forge.LastFrame = init
		}
	}
	res, err := c.a1111Generate(ctx, base, req)
	if err != nil {
		return nil, err
	}
	if len(res.Images) < 2 {
		return nil, errors.New("Forge drew a single picture rather than a clip: is the model picked a Wan model?")
	}
	video, err := framesToVideo(ctx, res.Images, w.FPS)
	if err != nil {
		return nil, err
	}
	return []ComfyOutput{{Data: video, Name: "forge-clip.mp4", MIME: "video/mp4"}}, nil
}

// framesToVideo encodes PNG frames as an MP4 a browser and a phone will both play. The
// frames go through files rather than a pipe because an MP4 cannot be written to one
// with its index at the front, and a clip that has to download whole before it plays
// is worse than a moment's temporary file.
func framesToVideo(ctx context.Context, frames [][]byte, fps int) ([]byte, error) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		return nil, errors.New("putting a clip's frames together needs ffmpeg on the server")
	}
	dir, err := os.MkdirTemp("", "oppailib-clip-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	for i, f := range frames {
		if err := os.WriteFile(filepath.Join(dir, fmt.Sprintf("%05d.png", i)), f, 0o600); err != nil {
			return nil, err
		}
	}
	out := filepath.Join(dir, "clip.mp4")
	cmd := exec.CommandContext(ctx, "ffmpeg", "-y", "-loglevel", "error", "-framerate", strconv.Itoa(fps),
		"-i", filepath.Join(dir, "%05d.png"), "-c:v", "libx264", "-preset", "medium", "-crf", "16",
		"-pix_fmt", "yuv420p", "-movflags", "+faststart", out)
	if msg, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("putting the clip's frames together: %v: %s", err, strings.TrimSpace(string(msg)))
	}
	return os.ReadFile(out)
}

// ForgeClipModels is what this Forge has for a Wan clip, in the shape the Video studio
// reads from ComfyUI. Files go by their names, which every name Forge takes includes,
// and a clip's LoRAs come back the same way.
func (c *Client) ForgeClipModels(ctx context.Context, base string, models []Model, loras []Lora) (ComfyModels, error) {
	out := ComfyModels{
		Diffusion: []string{}, Checkpoints: []string{}, TextEncoders: []string{}, VAEs: []string{},
		Loras: []string{}, Upscalers: []string{}, Missing: []string{},
	}
	for _, m := range models {
		if m.Family != FamilyWan {
			continue
		}
		name := checkpointBaseName(m.Key)
		if m.Bundled {
			out.Checkpoints = append(out.Checkpoints, name)
		} else {
			out.Diffusion = append(out.Diffusion, name)
		}
	}
	for _, l := range loras {
		if l.Family == FamilyWan {
			out.Loras = append(out.Loras, l.Name)
		}
	}
	have, err := c.ForgeModules(ctx, base)
	if err != nil {
		return out, err
	}
	for _, m := range have {
		if m.Kind == "te" {
			out.TextEncoders = append(out.TextEncoders, m.Name)
		} else {
			out.VAEs = append(out.VAEs, m.Name)
		}
	}
	// ComfyUI's names for the same things, since a clip's numbers are held in those
	// (a1111SamplerName turns them back). Only what Wan is run with.
	out.Samplers = []string{"euler", "euler_a", "dpmpp_2m", "dpmpp_sde", "unipc", "lcm"}
	out.Schedulers = []string{"Simple", "Beta", "Normal", "Karras", "SGM Uniform"}
	return out, nil
}
