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
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/sdapi/v1/txt2img", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.hc.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<10))
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
