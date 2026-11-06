package imagegen

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"regexp"
	"sort"
	"strings"
)

// Pictures from ComfyUI, with no nodes to look at.
//
// ComfyUI has no "make a picture" call: it runs graphs, and asking someone to build one
// is the thing this mode exists to avoid. A still is a settled graph, though, unlike the
// video workflows comfy.go takes as pasted: a checkpoint, its LoRAs, two prompts, a
// sampler and a save. So the studio's form is turned into that graph here, run, and
// the picture comes back as it would from any other generator. Only core nodes are
// used, so a ComfyUI needs nothing installed beyond the models.
//
// That sets what this mode cannot do. Core ComfyUI has no way to read a reference
// picture as ControlNet's reference_only does, no face or hand detailer and no regional
// prompting of the kind the studio's people use: each of those is a custom node pack.
// Rather than a graph that fails on most installs, they are reported as unsupported, as
// they are on InvokeAI, and the studio does not offer them.
//
// The model files are the ones ComfyUI lists. A file is known by the key Automatic1111
// would give it ("Lora/styles/ink.safetensors"), mapped onto ComfyUI's folders by
// modelHome, which is what lets the rest of the studio — sidecars, covers, hashes, the
// Civitai links, what is kept per model — work here unchanged, and keeps them all
// attached to a file that has been transferred across from Automatic1111.

// videoModelName is a Wan file. They sit in the same folders as pictures' models here,
// because the Video studio uses this ComfyUI too, and cannot draw a still.
var videoModelName = regexp.MustCompile(`(?i)(^|[^a-z0-9])wan[-_ ]?\d|(^|[^a-z0-9])(wan|lightx2v)([^a-z0-9]|$)`)

// comfyListed is what ComfyUI lists for a kind of file, from the loader that offers it.
func (c *Client) comfyListed(ctx context.Context, base, class, input string) ([]string, error) {
	info, err := c.comfyNodeInfo(ctx, base, class)
	if err != nil {
		return nil, err
	}
	return comboOptions(info, input), nil
}

// comfyPictureFiles lists the files that can make a picture as a1111Files lists
// Automatic1111's: the same keys, with a file's hash where one has been worked out.
func (c *Client) comfyPictureFiles(ctx context.Context, base string) ([]a1111File, error) {
	base = strings.TrimRight(base, "/")
	checkpoints, err := c.comfyListed(ctx, base, "CheckpointLoaderSimple", "ckpt_name")
	if err != nil {
		return nil, err
	}
	loras, _ := c.comfyListed(ctx, base, "LoraLoader", "lora_name")
	vaes, _ := c.comfyListed(ctx, base, "VAELoader", "vae_name")

	home := c.home(ctx, base)
	out := make([]a1111File, 0, len(checkpoints)+len(loras)+len(vaes))
	add := func(names []string, f a1111Folder) {
		for _, name := range names {
			if f.Type != a1111VaeFolder.Type && videoModelName.MatchString(name) {
				continue
			}
			clean := strings.ReplaceAll(name, "\\", "/")
			file := a1111File{Key: f.Folder + "/" + clean, Name: name, Display: stem(path.Base(clean)), Type: f.Type}
			if local := home.path(file.Key); local != "" {
				if h := c.hashes().lookup(local); h != "" {
					file.Hash = "sha256:" + h
				} else {
					c.hashes().queue(local)
				}
			}
			out = append(out, file)
		}
	}
	add(checkpoints, a1111Checkpoints)
	add(loras, a1111LoraFolder)
	add(vaes, a1111VaeFolder)
	return out, nil
}

func (c *Client) comfyPictureModels(ctx context.Context, base string) ([]Model, error) {
	files, err := c.comfyPictureFiles(ctx, base)
	if err != nil {
		return nil, err
	}
	out := []Model{}
	for _, f := range files {
		if f.Type == a1111Checkpoints.Type {
			out = append(out, Model{Title: f.Name, Key: f.Key, Name: f.Display})
		}
	}
	return out, nil
}

func (c *Client) comfyPictureLoras(ctx context.Context, base string) ([]Lora, error) {
	files, err := c.comfyPictureFiles(ctx, base)
	if err != nil {
		return nil, err
	}
	out := []Lora{}
	for _, f := range files {
		if f.Type == a1111LoraFolder.Type {
			out = append(out, Lora{Name: f.Name, Key: f.Key, Alias: f.Display})
		}
	}
	return out, nil
}

func (c *Client) comfyPictureVaes(ctx context.Context, base string) ([]Vae, error) {
	files, err := c.comfyPictureFiles(ctx, base)
	if err != nil {
		return nil, err
	}
	out := []Vae{}
	for _, f := range files {
		if f.Type == a1111VaeFolder.Type {
			out = append(out, Vae{Key: f.Name, Name: f.Display})
		}
	}
	sort.Slice(out, func(i, j int) bool { return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name) })
	return out, nil
}

// comfyUpscalers is what a picture can be enlarged with: upscale models, and the one
// latent mode a hires fix can use without one.
func (c *Client) comfyUpscalers(ctx context.Context, base string) (models, latent []string, err error) {
	models, err = c.comfyListed(ctx, strings.TrimRight(base, "/"), "UpscaleModelLoader", "model_name")
	return models, []string{comfyLatentUpscale}, err
}

// comfyLatentUpscale is the hires fix that enlarges the picture as noise rather than
// through an upscale model: Automatic1111's name for it, which saved settings use too.
const comfyLatentUpscale = "Latent"

var comfySamplers = map[string]string{
	"euler a": "euler_ancestral", "euler_a": "euler_ancestral", "euler": "euler", "heun": "heun", "lms": "lms",
	"dpm2": "dpm_2", "dpm2 a": "dpm_2_ancestral", "dpm++ 2s a": "dpmpp_2s_ancestral", "dpm++ 2m": "dpmpp_2m",
	"dpm++ 2m sde": "dpmpp_2m_sde", "dpm++ 3m sde": "dpmpp_3m_sde", "dpm++ sde": "dpmpp_sde",
	"dpm fast": "dpm_fast", "dpm adaptive": "dpm_adaptive", "ddim": "ddim", "unipc": "uni_pc", "lcm": "lcm",
}

// comfySchedulerSuffixes are the endings a sampler's name can carry its schedule in.
var comfySchedulerSuffixes = []struct{ suffix, scheduler string }{
	{" sgm uniform", "sgm_uniform"}, {" karras", "karras"}, {" exponential", "exponential"},
	{" simple", "simple"}, {" normal", "normal"}, {" beta", "beta"}, {"_k", "karras"},
}

// comfySampler turns the name the studio holds into ComfyUI's two: Automatic1111 keeps
// the sampler and its schedule in one name ("DPM++ 2M Karras"), and that is the name a
// picture's saved settings and Civitai's recommendations use too. A name that is
// already ComfyUI's goes through as it is.
func comfySampler(name string) (sampler, scheduler string) {
	n := strings.ToLower(strings.TrimSpace(name))
	if n == "" {
		return "dpmpp_2m", "karras"
	}
	scheduler = "normal"
	for _, s := range comfySchedulerSuffixes {
		if strings.HasSuffix(n, s.suffix) {
			n, scheduler = strings.TrimSuffix(n, s.suffix), s.scheduler
			break
		}
	}
	if s, ok := comfySamplers[n]; ok {
		return s, scheduler
	}
	return n, scheduler
}

// loraToken is a LoRA written into a prompt as Automatic1111 reads one. ComfyUI would
// take it for words, and a pasted prompt or a saved one can carry any number.
var loraToken = regexp.MustCompile(`<lora:([^:>]+)(?::([0-9.+-]+))?(?::[^>]*)?>`)

// comfyBreak is Automatic1111's word for starting a new chunk of prompt, which means
// nothing to ComfyUI's encoder and would be drawn.
var comfyBreak = regexp.MustCompile(`\bBREAK\b`)

// comfyPrompt is a prompt with what only Automatic1111 reads taken out of it, and the
// LoRAs that were written in it.
func comfyPrompt(prompt string) (string, []LoraWeight) {
	var loras []LoraWeight
	for _, m := range loraToken.FindAllStringSubmatch(prompt, -1) {
		weight := 1.0
		if m[2] != "" {
			fmt.Sscanf(m[2], "%g", &weight)
		}
		loras = append(loras, LoraWeight{Name: m[1], Weight: weight})
	}
	text := loraToken.ReplaceAllString(prompt, "")
	return strings.TrimSpace(comfyBreak.ReplaceAllString(text, ",")), loras
}

// comfyFind resolves a name a client holds to the file ComfyUI lists. Beside the names
// a1111Find knows, one from Automatic1111 has no extension where ComfyUI's has, so a
// picture's saved settings still find a file that was transferred across.
func comfyFind(files []a1111File, typ, name string) (*a1111File, bool) {
	var ofType []a1111File
	for _, f := range files {
		if f.Type == typ {
			ofType = append(ofType, f)
		}
	}
	if f, ok := a1111Find(ofType, name); ok {
		return f, true
	}
	want := strings.ToLower(stem(strings.ReplaceAll(strings.TrimSpace(strings.Split(name, " [")[0]), "\\", "/")))
	for i := range ofType {
		have := strings.ToLower(stem(strings.ReplaceAll(ofType[i].Name, "\\", "/")))
		if have == want || path.Base(have) == path.Base(want) {
			return &ofType[i], true
		}
	}
	return nil, false
}

// comfySide is a side of a picture: ComfyUI's latents are an eighth of the size, so a
// side is a multiple of 8.
func comfySide(n int) int { return max(64, n/8*8) }

// comfyPictureInputs are the files uploaded for a run, by their names in ComfyUI's
// input folder.
type comfyPictureInputs struct {
	Image string
	Mask  string
}

// ComfyPicture is one picture to draw: a request with its names resolved and its one
// seed, every field what the graph is given.
type ComfyPicture struct {
	Prompt, Negative string
	Checkpoint, VAE  string
	Loras            []LoraWeight
	Sampler          string
	Steps            int
	CFG, CFGRescale  float64
	ClipSkip         int
	Width, Height    int
	Seed             int64
	Denoise          float64
	Upscale          Upscale
	Inputs           comfyPictureInputs
	// Prefix names the saved file, and is different on every run: ComfyUI skips a graph
	// it has just run, and a skipped save leaves no file to collect, so a redo on the
	// same seed would come back empty.
	Prefix string
}

// BuildPictureGraph wires one picture. img2img and repainting are the same graph with a
// different start; a hires fix is a second sampler on the end of the first.
func BuildPictureGraph(p ComfyPicture) (map[string]any, error) {
	if p.Checkpoint == "" {
		return nil, errors.New("no checkpoint was picked")
	}
	g := &comfyGraph{nodes: map[string]any{}}
	load := g.add("CheckpointLoaderSimple", map[string]any{"ckpt_name": p.Checkpoint})
	model, clip, vae := slot(load, 0), slot(load, 1), slot(load, 2)
	if p.VAE != "" {
		vae = slot(g.add("VAELoader", map[string]any{"vae_name": p.VAE}), 0)
	}
	for _, l := range p.Loras {
		node := g.add("LoraLoader", map[string]any{
			"model": model, "clip": clip, "lora_name": l.Name, "strength_model": l.Weight, "strength_clip": l.Weight,
		})
		model, clip = slot(node, 0), slot(node, 1)
	}
	if p.CFGRescale > 0 {
		model = slot(g.add("RescaleCFG", map[string]any{"model": model, "multiplier": p.CFGRescale}), 0)
	}
	if p.ClipSkip > 1 {
		clip = slot(g.add("CLIPSetLastLayer", map[string]any{"clip": clip, "stop_at_clip_layer": -p.ClipSkip}), 0)
	}
	positive := slot(g.add("CLIPTextEncode", map[string]any{"text": p.Prompt, "clip": clip}), 0)
	negative := slot(g.add("CLIPTextEncode", map[string]any{"text": p.Negative, "clip": clip}), 0)
	width, height := comfySide(p.Width), comfySide(p.Height)
	sampler, scheduler := comfySampler(p.Sampler)

	var latent, start, mask []any
	denoise := 1.0
	switch {
	case p.Inputs.Image != "":
		start = slot(g.add("ImageScale", map[string]any{
			"image":          slot(g.add("LoadImage", map[string]any{"image": p.Inputs.Image}), 0),
			"upscale_method": "lanczos", "width": width, "height": height, "crop": "center",
		}), 0)
		latent = slot(g.add("VAEEncode", map[string]any{"pixels": start, "vae": vae}), 0)
		denoise = clampDenoise(p.Denoise)
		if p.Inputs.Mask != "" {
			scaled := g.add("ImageScale", map[string]any{
				"image":          slot(g.add("LoadImage", map[string]any{"image": p.Inputs.Mask}), 0),
				"upscale_method": "nearest-exact", "width": width, "height": height, "crop": "center",
			})
			mask = slot(g.add("ImageToMask", map[string]any{"image": slot(scaled, 0), "channel": "red"}), 0)
			latent = slot(g.add("SetLatentNoiseMask", map[string]any{"samples": latent, "mask": mask}), 0)
		}
	default:
		latent = slot(g.add("EmptyLatentImage", map[string]any{"width": width, "height": height, "batch_size": 1}), 0)
	}
	sample := func(from []any, steps int, denoise float64) []any {
		return slot(g.add("KSampler", map[string]any{
			"model": model, "positive": positive, "negative": negative, "latent_image": from,
			"seed": p.Seed, "steps": steps, "cfg": p.CFG, "sampler_name": sampler, "scheduler": scheduler, "denoise": denoise,
		}), 0)
	}
	latent = sample(latent, p.Steps, denoise)

	if up := p.Upscale; up.Enabled && p.Inputs.Image == "" && up.Scale > 1 {
		if name := strings.TrimSpace(up.Upscaler); name == "" || strings.HasPrefix(name, comfyLatentUpscale) {
			latent = slot(g.add("LatentUpscaleBy", map[string]any{"samples": latent, "upscale_method": "bilinear", "scale_by": up.Scale}), 0)
		} else {
			pixels := slot(g.add("VAEDecode", map[string]any{"samples": latent, "vae": vae}), 0)
			latent = slot(g.add("VAEEncode", map[string]any{"pixels": g.enlarge(pixels, name, up.Scale), "vae": vae}), 0)
		}
		steps := up.Steps
		if steps <= 0 {
			steps = p.Steps
		}
		redraw := up.Denoise
		if redraw <= 0 {
			redraw = 0.4
		}
		latent = sample(latent, steps, redraw)
	}

	done := slot(g.add("VAEDecode", map[string]any{"samples": latent, "vae": vae}), 0)
	if mask != nil {
		// A noise mask keeps the rest of the picture in the latent only, and a trip
		// through the VAE softens it. Painted back, it stays pixel for pixel what it was.
		done = slot(g.add("ImageCompositeMasked", map[string]any{
			"destination": start, "source": done, "mask": mask, "x": 0, "y": 0, "resize_source": false,
		}), 0)
	}
	g.add("SaveImage", map[string]any{"images": done, "filename_prefix": p.Prefix})
	return g.nodes, nil
}

// enlarge is a picture through an upscale model, brought to the size asked for: a model
// enlarges by what it was trained at, whatever was wanted.
func (g *comfyGraph) enlarge(pixels []any, upscaler string, scale float64) []any {
	loader := slot(g.add("UpscaleModelLoader", map[string]any{"model_name": upscaler}), 0)
	big := slot(g.add("ImageUpscaleWithModel", map[string]any{"upscale_model": loader, "image": pixels}), 0)
	by := scale / upscalerFactor(upscaler)
	if by == 1 {
		return big
	}
	return slot(g.add("ImageScaleBy", map[string]any{"image": big, "upscale_method": "lanczos", "scale_by": by}), 0)
}

// BuildPictureUpscaleGraph enlarges a picture and redraws nothing, the extras upscale.
func BuildPictureUpscaleGraph(image, upscaler string, scale float64, prefix string) map[string]any {
	g := &comfyGraph{nodes: map[string]any{}}
	pixels := slot(g.add("LoadImage", map[string]any{"image": image}), 0)
	if upscaler = strings.TrimSpace(upscaler); upscaler == "" || strings.EqualFold(upscaler, "Lanczos") || strings.HasPrefix(upscaler, comfyLatentUpscale) {
		pixels = slot(g.add("ImageScaleBy", map[string]any{"image": pixels, "upscale_method": "lanczos", "scale_by": scale}), 0)
	} else {
		pixels = g.enlarge(pixels, upscaler, scale)
	}
	g.add("SaveImage", map[string]any{"images": pixels, "filename_prefix": prefix})
	return g.nodes
}

// comfyRunPrefix is a saved file's name, fresh every time; see ComfyPicture.Prefix.
func comfyRunPrefix() string { return "oppailib/picture-" + comfyClientID() }

// comfySeed is a random seed for a run that asked for one. Short of the 64 bits
// ComfyUI takes so that it survives being read as a number by a browser.
func comfySeed() int64 {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return int64(binary.BigEndian.Uint64(b[:]) >> 12)
}

// comfyStill is the first picture a run saved.
func comfyStill(outs []ComfyOutput) ([]byte, error) {
	for _, o := range outs {
		if strings.HasPrefix(o.MIME, "image/") {
			return o.Data, nil
		}
	}
	return nil, errors.New("ComfyUI finished without saving a picture")
}

// comfyGenerate runs a picture request. A batch is one graph per picture rather than
// one graph of a batch: each picture then has a seed of its own that reproduces it, as
// a batch's do on the other generators, and a card too small for four at once is fine.
func (c *Client) comfyGenerate(ctx context.Context, base string, req GenerateRequest) (*GenerateResult, error) {
	base = strings.TrimRight(base, "/")
	switch {
	case req.DetailOnly || req.Detailer.Enabled && len(req.Detailer.Custom) > 0 || req.Regions.Active():
		return nil, ErrComfyPictureUnsupported
	case len(req.Controls) > 0:
		return nil, ErrControlUnsupported
	}
	if req.UpscaleOnly {
		return c.comfyUpscalePicture(ctx, base, req)
	}
	files, err := c.comfyPictureFiles(ctx, base)
	if err != nil {
		return nil, err
	}
	p := ComfyPicture{
		Sampler: req.Sampler, Steps: req.Steps, CFG: req.CfgScale, CFGRescale: req.CfgRescale, ClipSkip: req.ClipSkip,
		Width: req.Width, Height: req.Height, Denoise: req.Denoise, Upscale: req.Upscale,
	}
	var written []LoraWeight
	p.Prompt, written = comfyPrompt(req.Prompt)
	p.Negative, _ = comfyPrompt(req.NegativePrompt)
	if p.Checkpoint, err = comfyPickCheckpoint(files, req.Checkpoint); err != nil {
		return nil, err
	}
	if req.VAE != "" {
		f, ok := comfyFind(files, a1111VaeFolder.Type, req.VAE)
		if !ok {
			return nil, fmt.Errorf("ComfyUI has no VAE called %s", req.VAE)
		}
		p.VAE = f.Name
	}
	seen := map[string]bool{}
	for _, l := range append(append([]LoraWeight{}, req.Loras...), written...) {
		if l.Name == "" {
			continue
		}
		f, ok := comfyFind(files, a1111LoraFolder.Type, l.Name)
		if !ok {
			return nil, fmt.Errorf("ComfyUI has no LoRA called %s — transfer it across, or take it off", l.Name)
		}
		if !seen[f.Name] {
			seen[f.Name] = true
			p.Loras = append(p.Loras, LoraWeight{Name: f.Name, Weight: l.Weight})
		}
	}
	if len(req.InitImage) > 0 {
		if p.Inputs.Image, err = c.comfyUpload(ctx, base, req.InitImage); err != nil {
			return nil, err
		}
		if len(req.Mask) > 0 {
			if p.Inputs.Mask, err = c.comfyUpload(ctx, base, req.Mask); err != nil {
				return nil, err
			}
		}
	}
	count := max(1, req.Count)
	first := req.Seed
	if first < 0 {
		first = comfySeed()
	}
	res := &GenerateResult{Seed: first}
	for i := 0; i < count; i++ {
		p.Seed = first + int64(i)
		p.Prefix = comfyRunPrefix()
		graph, err := BuildPictureGraph(p)
		if err != nil {
			return nil, err
		}
		outs, err := c.runComfyGraph(ctx, base, graph, func(pr Progress) {
			req.progressReport(Progress{Index: i, Percent: pr.Percent})
		})
		if err != nil {
			return nil, err
		}
		still, err := comfyStill(outs)
		if err != nil {
			return nil, err
		}
		res.Images = append(res.Images, still)
		res.Seeds = append(res.Seeds, p.Seed)
	}
	return res, nil
}

// comfyPickCheckpoint is the file to draw with. With none asked for, the first one
// there is, since ComfyUI has no selected model of its own for a run to fall back on.
func comfyPickCheckpoint(files []a1111File, name string) (string, error) {
	if name != "" {
		if f, ok := comfyFind(files, a1111Checkpoints.Type, name); ok {
			return f.Name, nil
		}
		return "", fmt.Errorf("ComfyUI has no checkpoint called %s — transfer it across, or pick another", name)
	}
	for _, f := range files {
		if f.Type == a1111Checkpoints.Type {
			return f.Name, nil
		}
	}
	return "", errors.New("ComfyUI has no checkpoints to draw with — put some in its checkpoints folder, or transfer them from Settings")
}

func (c *Client) comfyUpscalePicture(ctx context.Context, base string, req GenerateRequest) (*GenerateResult, error) {
	if len(req.InitImage) == 0 {
		return nil, errors.New("upscaling needs a picture")
	}
	name, err := c.comfyUpload(ctx, base, req.InitImage)
	if err != nil {
		return nil, err
	}
	outs, err := c.runComfyGraph(ctx, base, BuildPictureUpscaleGraph(name, req.Upscale.Upscaler, req.Upscale.Scale, comfyRunPrefix()), func(pr Progress) {
		req.progressReport(Progress{Percent: pr.Percent})
	})
	if err != nil {
		return nil, err
	}
	still, err := comfyStill(outs)
	if err != nil {
		return nil, err
	}
	return &GenerateResult{Images: [][]byte{still}, Seed: req.Seed, Seeds: []int64{req.Seed}}, nil
}

// ErrComfyPictureUnsupported is a detail pass or a picture of several people sent to
// ComfyUI, which need custom nodes this mode does not assume. See the top of this file.
var ErrComfyPictureUnsupported = errors.New("fixing faces and people in parts of the picture need custom nodes in ComfyUI, so they are not offered in ComfyUI mode — switch back to Automatic1111 or Forge for those")

// comfyPictureNodes are the core nodes a picture is drawn with, for Test ComfyUI to
// look for: a ComfyUI old enough to lack one is worth saying so before a run fails.
var comfyPictureNodes = []string{
	"CheckpointLoaderSimple", "LoraLoader", "VAELoader", "CLIPTextEncode", "CLIPSetLastLayer", "EmptyLatentImage",
	"KSampler", "VAEDecode", "VAEEncode", "SaveImage", "LoadImage", "ImageScale", "ImageScaleBy", "ImageToMask",
	"SetLatentNoiseMask", "ImageCompositeMasked", "LatentUpscaleBy", "UpscaleModelLoader", "ImageUpscaleWithModel",
}

// ComfyPictureNodes lists the core nodes a picture needs.
func ComfyPictureNodes() []string { return append([]string{}, comfyPictureNodes...) }

// isComfy reads ComfyUI's /system_stats, which nothing else serves: a "system" and a
// list of "devices".
func isComfy(body []byte) bool {
	var s struct {
		System  map[string]any `json:"system"`
		Devices []any          `json:"devices"`
	}
	return json.Unmarshal(body, &s) == nil && s.System != nil && s.Devices != nil
}
