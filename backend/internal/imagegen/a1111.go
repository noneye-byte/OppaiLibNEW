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
	if req.Detailer.Enabled {
		model := strings.TrimSpace(req.Detailer.Model)
		if model == "" {
			model = "face_yolov8n.pt"
		}
		payload.AlwaysOnScripts = map[string]any{
			"ADetailer": map[string]any{"args": []any{true, false, map[string]any{
				"ad_model": model, "ad_tab_enable": true,
				"ad_prompt": req.Detailer.Prompt, "ad_negative_prompt": req.Detailer.NegativePrompt,
				"ad_confidence": req.Detailer.Confidence, "ad_denoising_strength": req.Detailer.Denoise,
				"ad_mask_blur": req.Detailer.MaskBlur,
			}}},
		}
	}
	endpoint := "/sdapi/v1/txt2img"
	if len(req.InitImage) > 0 {
		endpoint = "/sdapi/v1/img2img"
		payload.InitImages = []string{base64.StdEncoding.EncodeToString(req.InitImage)}
		payload.DenoisingStrength = clampDenoise(req.Denoise)
	}
	if len(req.Controls) > 0 {
		if payload.AlwaysOnScripts == nil {
			payload.AlwaysOnScripts = map[string]any{}
		}
		payload.AlwaysOnScripts["controlnet"] = map[string]any{"args": a1111ControlArgs(req.Controls)}
	}
	if req.Checkpoint != "" || req.VAE != "" {
		payload.OverrideSettings = map[string]any{}
		if req.Checkpoint != "" {
			payload.OverrideSettings["sd_model_checkpoint"] = req.Checkpoint
		}
		if req.VAE != "" {
			payload.OverrideSettings["sd_vae"] = req.VAE
		}
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
	var scripts struct {
		Txt2Img []string `json:"txt2img"`
	}
	if err := c.getJSON(ctx, base+"/sdapi/v1/scripts", &scripts); err != nil {
		return false
	}
	for _, name := range scripts.Txt2Img {
		if strings.EqualFold(strings.TrimSpace(name), "ADetailer") {
			return true
		}
	}
	return false
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
