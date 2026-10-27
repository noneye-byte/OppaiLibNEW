package imagegen

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// The Automatic1111 / SD.Next dialect: everything under /sdapi/v1. LoRAs are applied
// the A1111 way, as <lora:name:weight> prompt tokens.

func (c *Client) a1111Models(ctx context.Context, base string) ([]Model, error) {
	var out []Model
	if err := c.getJSON(ctx, base+"/sdapi/v1/sd-models", &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *Client) a1111Loras(ctx context.Context, base string) ([]Lora, error) {
	var out []Lora
	if err := c.getJSON(ctx, base+"/sdapi/v1/loras", &out); err != nil {
		return nil, err
	}
	return out, nil
}

// txt2imgPayload is the wire shape A1111 expects. override_settings swaps the
// checkpoint just for this call, and restore_afterwards puts the generator back so we
// don't leave someone else's UI on a model they didn't pick.
type txt2imgPayload struct {
	Prompt           string         `json:"prompt"`
	NegativePrompt   string         `json:"negative_prompt"`
	Steps            int            `json:"steps"`
	Width            int            `json:"width"`
	Height           int            `json:"height"`
	CfgScale         float64        `json:"cfg_scale"`
	SamplerName      string         `json:"sampler_name,omitempty"`
	Seed             int64          `json:"seed"`
	NIter            int            `json:"n_iter"`
	BatchSize        int            `json:"batch_size"`
	OverrideSettings map[string]any `json:"override_settings,omitempty"`
	RestoreAfter     bool           `json:"override_settings_restore_afterwards"`
	AlwaysOnScripts  map[string]any `json:"alwayson_scripts,omitempty"`
	// img2img only. The same endpoint shape otherwise, which is why one struct serves
	// both: A1111 ignores fields an endpoint does not use, and omitempty keeps them
	// off a txt2img call altogether.
	InitImages        []string `json:"init_images,omitempty"`
	DenoisingStrength float64  `json:"denoising_strength,omitempty"`
	// Inpainting: img2img with a mask. Fill 1 starts the masked area from the
	// picture's own pixels ("original"), and full-res draws only the masked area,
	// padded, at the whole output size before pasting it back — A1111's "only
	// masked", which is what touching up a face or a hand wants.
	Mask                  string `json:"mask,omitempty"`
	MaskBlur              int    `json:"mask_blur,omitempty"`
	InpaintingFill        int    `json:"inpainting_fill,omitempty"`
	InpaintFullRes        bool   `json:"inpaint_full_res,omitempty"`
	InpaintFullResPadding int    `json:"inpaint_full_res_padding,omitempty"`
	// The hires fix, txt2img only. Its denoise is denoising_strength above, which
	// is why that field is not img2img's alone.
	EnableHR          bool    `json:"enable_hr,omitempty"`
	HRScale           float64 `json:"hr_scale,omitempty"`
	HRUpscaler        string  `json:"hr_upscaler,omitempty"`
	HRSecondPassSteps int     `json:"hr_second_pass_steps,omitempty"`
}

// txt2imgResponse is the relevant slice of the API's reply. Info is a JSON *string*
// (A1111 double-encodes it) holding the resolved seeds among other things.
type txt2imgResponse struct {
	Images []string `json:"images"`
	Info   string   `json:"info"`
}

// a1111LoraTokens renders the requested LoRAs as A1111 prompt tokens.
func a1111LoraTokens(loras []LoraWeight) string {
	var b strings.Builder
	for _, l := range loras {
		if l.Name == "" {
			continue
		}
		fmt.Fprintf(&b, " <lora:%s:%.2g>", l.Name, l.Weight)
	}
	return b.String()
}

func (c *Client) a1111Generate(ctx context.Context, base string, req GenerateRequest) (*GenerateResult, error) {
	payload := txt2imgPayload{
		Prompt:         req.Prompt + a1111LoraTokens(req.Loras),
		NegativePrompt: req.NegativePrompt,
		Steps:          req.Steps,
		Width:          req.Width,
		Height:         req.Height,
		CfgScale:       req.CfgScale,
		SamplerName:    req.Sampler,
		Seed:           req.Seed,
		NIter:          req.Count,
		BatchSize:      1,
		RestoreAfter:   true,
	}
	payload.OverrideSettings = map[string]any{}
	if req.Detailer.Enabled {
		args := a1111DetailerArgs(req)
		payload.AlwaysOnScripts = map[string]any{"ADetailer": map[string]any{"args": args}}
		if tabs := len(args) - 2; tabs > 2 {
			// ADetailer runs as many tabs as its "Max models" setting has (two unless
			// changed), so a third pass would be dropped without a word.
			payload.OverrideSettings["ad_max_models"] = min(tabs, 10)
		}
		if len(req.Detailer.FacePrompts) > 1 {
			// ADetailer's own setting for the order its boxes are handed prompts in;
			// the people's prompts are written left to right.
			payload.OverrideSettings["ad_bbox_sortby"] = "Position (left to right)"
		}
	}
	if req.Regions.Active() && len(req.InitImage) == 0 {
		payload.Prompt = regionalPrompt(req.Prompt+a1111LoraTokens(req.Loras), req.Regions)
		if payload.AlwaysOnScripts == nil {
			payload.AlwaysOnScripts = map[string]any{}
		}
		payload.AlwaysOnScripts["Regional Prompter"] = map[string]any{"args": regionalArgs(req.Regions)}
	}
	if up := req.Upscale; up.Enabled && len(req.InitImage) == 0 {
		// img2img has no hires fix; a picture started from is the size it is.
		payload.EnableHR = true
		payload.HRScale = up.Scale
		payload.HRUpscaler = up.Upscaler
		payload.HRSecondPassSteps = up.Steps
		payload.DenoisingStrength = up.Denoise
	}
	endpoint := "/sdapi/v1/txt2img"
	if len(req.InitImage) > 0 {
		endpoint = "/sdapi/v1/img2img"
		payload.InitImages = []string{base64.StdEncoding.EncodeToString(req.InitImage)}
		payload.DenoisingStrength = clampDenoise(req.Denoise)
		if len(req.Mask) > 0 {
			payload.Mask = base64.StdEncoding.EncodeToString(req.Mask)
			payload.MaskBlur = max(0, min(req.MaskBlur, 64))
			payload.InpaintingFill = 1
			payload.InpaintFullRes = true
			payload.InpaintFullResPadding = 32
		}
	}
	if len(req.Controls) > 0 {
		if payload.AlwaysOnScripts == nil {
			payload.AlwaysOnScripts = map[string]any{}
		}
		payload.AlwaysOnScripts["controlnet"] = map[string]any{"args": a1111ControlArgs(req.Controls)}
	}
	if req.Checkpoint != "" {
		payload.OverrideSettings["sd_model_checkpoint"] = req.Checkpoint
	}
	if req.VAE != "" {
		payload.OverrideSettings["sd_vae"] = req.VAE
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, base+endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// The previews are polled beside the request, which blocks until the last image
	// is decoded. The watch ends with the request, and a cancelled context also
	// tells the generator to stop — a txt2img call abandoned by its client keeps
	// the GPU busy to the end otherwise.
	watchCtx, stopWatch := context.WithCancel(ctx)
	go c.a1111WatchProgress(watchCtx, base, req)
	resp, err := c.hc.Do(httpReq)
	stopWatch()
	if err != nil {
		if ctx.Err() != nil {
			c.a1111Interrupt(base)
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<10))
		if len(req.Controls) > 0 && controlNetMissing(string(msg)) {
			return nil, ErrControlUnsupported
		}
		return nil, fmt.Errorf("image generator returned %d: %s", resp.StatusCode, bytes.TrimSpace(msg))
	}

	var out txt2imgResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode generator response: %w", err)
	}
	if len(out.Images) == 0 {
		return nil, fmt.Errorf("generator returned no images")
	}

	res := &GenerateResult{Seed: req.Seed}
	for _, s := range out.Images {
		raw, err := decodeImage(s)
		if err != nil {
			return nil, err
		}
		res.Images = append(res.Images, raw)
	}
	// Best-effort: pull the resolved seeds out of the info blob so a random (-1) seed
	// comes back as the concrete numbers that produced these images.
	var info struct {
		Seed     int64   `json:"seed"`
		AllSeeds []int64 `json:"all_seeds"`
	}
	if json.Unmarshal([]byte(out.Info), &info) == nil {
		if info.Seed != 0 {
			res.Seed = info.Seed
		}
		if len(info.AllSeeds) == len(res.Images) {
			res.Seeds = info.AllSeeds
		}
	}
	if len(res.Seeds) == 0 {
		// A1111 numbers a batch consecutively from the first seed.
		for i := range res.Images {
			res.Seeds = append(res.Seeds, res.Seed+int64(i))
		}
	}
	return res, nil
}

// a1111Upscale enlarges req.InitImage through the extras tab's upscaler, which
// redraws nothing: the picture comes back as it was, only bigger. The seed is the
// caller's, since nothing was sampled.
func (c *Client) a1111Upscale(ctx context.Context, base string, req GenerateRequest) (*GenerateResult, error) {
	if len(req.InitImage) == 0 {
		return nil, fmt.Errorf("upscaling needs a picture")
	}
	upscaler := strings.TrimSpace(req.Upscale.Upscaler)
	if upscaler == "" {
		upscaler = "Lanczos"
	}
	body, err := json.Marshal(map[string]any{
		"image":               base64.StdEncoding.EncodeToString(req.InitImage),
		"resize_mode":         0,
		"upscaling_resize":    req.Upscale.Scale,
		"upscaler_1":          upscaler,
		"show_extras_results": true,
	})
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/sdapi/v1/extra-single-image", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	resp, err := c.hc.Do(httpReq)
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<10))
		return nil, fmt.Errorf("image generator returned %d: %s", resp.StatusCode, bytes.TrimSpace(msg))
	}
	// Not getJSON's 8 MB: a picture made four times as big is tens of megabytes of
	// base64 PNG.
	var out struct {
		Image string `json:"image"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 160<<20)).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode upscaler response: %w", err)
	}
	if out.Image == "" {
		return nil, fmt.Errorf("generator returned no image")
	}
	raw, err := decodeImage(out.Image)
	if err != nil {
		return nil, err
	}
	return &GenerateResult{Images: [][]byte{raw}, Seed: req.Seed, Seeds: []int64{req.Seed}}, nil
}

// a1111Upscalers reads the upscaler models and the latent modes. "None" is A1111's
// own way of saying no upscaler and is left out; a build without the latent list
// answers with the models alone.
func (c *Client) a1111Upscalers(ctx context.Context, base string) (models, latent []string, err error) {
	var ups []struct {
		Name string `json:"name"`
	}
	if err := c.getJSON(ctx, base+"/sdapi/v1/upscalers", &ups); err != nil {
		return nil, nil, err
	}
	for _, u := range ups {
		if n := strings.TrimSpace(u.Name); n != "" && !strings.EqualFold(n, "None") {
			models = append(models, n)
		}
	}
	var modes []struct {
		Name string `json:"name"`
	}
	if c.getJSON(ctx, base+"/sdapi/v1/latent-upscale-modes", &modes) == nil {
		for _, m := range modes {
			if n := strings.TrimSpace(m.Name); n != "" {
				latent = append(latent, n)
			}
		}
	}
	return models, latent, nil
}

// a1111ControlArgs is the ControlNet extension's unit list. "image" is the field the
// current extension and Forge's built-in port both read; pixel_perfect lets the
// preprocessor pick its own resolution, which is what the UI defaults to and what a
// pose read off somebody's phone photo needs.
func a1111ControlArgs(units []ControlUnit) []map[string]any {
	out := make([]map[string]any, 0, len(units))
	for _, u := range units {
		weight := u.Weight
		if weight <= 0 {
			weight = 1
		}
		out = append(out, map[string]any{
			"enabled":       true,
			"image":         base64.StdEncoding.EncodeToString(u.Image),
			"module":        u.Module,
			"model":         u.Model,
			"weight":        weight,
			"resize_mode":   "Crop and Resize",
			"pixel_perfect": true,
			"control_mode":  "Balanced",
		})
	}
	return out
}

// controlNetMissing reads an A1111 error body for the extension not being there. The
// API names the script it could not find, so this is matching its own message rather
// than guessing.
func controlNetMissing(body string) bool {
	lower := strings.ToLower(body)
	return strings.Contains(lower, "controlnet") && (strings.Contains(lower, "not found") || strings.Contains(lower, "no such"))
}

// clampDenoise keeps an img2img strength inside what A1111 accepts, and makes an unset
// one a modest edit rather than a no-op.
func clampDenoise(d float64) float64 {
	switch {
	case d <= 0:
		return 0.55
	case d > 1:
		return 1
	}
	return d
}

func (c *Client) a1111SupportsADetailer(ctx context.Context, base string) bool {
	return c.a1111HasScript(ctx, base, "ADetailer")
}

// a1111HasScript is whether an extension's script is loaded for txt2img. The list
// names scripts by their titles, in whatever case the extension wrote them.
func (c *Client) a1111HasScript(ctx context.Context, base, title string) bool {
	var scripts struct {
		Txt2Img []string `json:"txt2img"`
	}
	if err := c.getJSON(ctx, base+"/sdapi/v1/scripts", &scripts); err != nil {
		return false
	}
	for _, name := range scripts.Txt2Img {
		if strings.EqualFold(strings.TrimSpace(name), title) {
			return true
		}
	}
	return false
}

// a1111Detectors is every detector ADetailer can run: its own face, hand and person
// models and whatever has been dropped into its models folder beside them, which
// is where a model that finds other parts of a body comes from. "None" is
// ADetailer's way of switching a tab off, not a detector.
func (c *Client) a1111Detectors(ctx context.Context, base string) ([]string, error) {
	var out struct {
		Models []string `json:"ad_model"`
	}
	if err := c.getJSON(ctx, base+"/adetailer/v1/ad_model", &out); err != nil {
		return nil, err
	}
	names := make([]string, 0, len(out.Models))
	for _, m := range out.Models {
		if m = strings.TrimSpace(m); m != "" && !strings.EqualFold(m, "None") {
			names = append(names, m)
		}
	}
	return names, nil
}

// decodeImage turns one API image string into raw bytes. A1111 returns bare base64,
// but tolerate a "data:...;base64," prefix in case a variant sends one.
func decodeImage(s string) ([]byte, error) {
	if i := bytesIndexComma(s); i >= 0 && hasDataPrefix(s) {
		s = s[i+1:]
	}
	raw, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, fmt.Errorf("decode generated image: %w", err)
	}
	return raw, nil
}

func hasDataPrefix(s string) bool { return len(s) >= 5 && s[:5] == "data:" }

func bytesIndexComma(s string) int {
	for i := 0; i < len(s); i++ {
		if s[i] == ',' {
			return i
		}
	}
	return -1
}
