package imagegen

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"strings"
	"time"
)

// The InvokeAI dialect. InvokeAI has no one-shot txt2img call: a generation is a
// node graph enqueued on a session queue, executed asynchronously, with the result
// saved into InvokeAI's own gallery. This client builds the standard text-to-image
// graph (SD 1.x / 2.x / SDXL), enqueues one session per requested image, polls the
// queue until they finish and downloads the PNGs. The gallery copies stay put —
// InvokeAI is the user's own box and keeps a gallery regardless — and the Gallery
// panel here browses and deletes them. The *library* still only ever gains an image
// through an explicit save.

// invokeQueue is the queue id InvokeAI creates by default; there is exactly one
// unless the operator runs a custom deployment.
const invokeQueue = "default"

// The ADetailer node may come from a custom node pack, so InvokeAI itself being
// reachable is not enough. Its generated OpenAPI schema is the authoritative list
// of installed invocation types (and is exactly what /docs renders).
func (c *Client) invokeSupportsADetailer(ctx context.Context, base string) bool {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/openapi.json", nil)
	if err != nil {
		return false
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return false
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	return err == nil && bytes.Contains(body, []byte(`"const":"adetailer"`))
}

// invokeModelRecord is one entry from /api/v2/models/ (InvokeAI 4.0+).
type invokeModelRecord struct {
	Key             string                 `json:"key"`
	Hash            string                 `json:"hash"`
	Name            string                 `json:"name"`
	Base            string                 `json:"base"`        // "sd-1", "sd-2", "sdxl", "flux", ...
	Type            string                 `json:"type"`        // "main", "lora", "vae", ...
	CoverImage      string                 `json:"cover_image"` // gallery image name, when the user set one
	Description     string                 `json:"description"`
	TriggerPhrases  []string               `json:"trigger_phrases"`
	DefaultSettings *invokeDefaultSettings `json:"default_settings"`
}

// invokeDefaultSettings is InvokeAI's per-model recommended settings blob. Every
// field is nullable there, hence the pointers. Main models carry the generation
// settings; a LoRA's blob holds only a recommended weight.
type invokeDefaultSettings struct {
	Vae          *string  `json:"vae"`
	Scheduler    *string  `json:"scheduler"`
	Steps        *int     `json:"steps"`
	CfgScale     *float64 `json:"cfg_scale"`
	CfgRescale   *float64 `json:"cfg_rescale_multiplier"`
	Width        *int     `json:"width"`
	Height       *int     `json:"height"`
	Weight       *float64 `json:"weight"`
	VaePrecision *string  `json:"vae_precision"`
}

func (d *invokeDefaultSettings) toModelDefaults() *ModelDefaults {
	if d == nil {
		return nil
	}
	out := &ModelDefaults{}
	any := false
	if d.Steps != nil && *d.Steps > 0 {
		out.Steps, any = *d.Steps, true
	}
	if d.CfgScale != nil && *d.CfgScale > 0 {
		out.CfgScale, any = *d.CfgScale, true
	}
	if d.CfgRescale != nil && *d.CfgRescale >= 0 {
		out.CfgRescale, any = *d.CfgRescale, true
	}
	if d.Scheduler != nil && *d.Scheduler != "" {
		out.Scheduler, any = *d.Scheduler, true
	}
	if d.Width != nil && *d.Width > 0 {
		out.Width, any = *d.Width, true
	}
	if d.Height != nil && *d.Height > 0 {
		out.Height, any = *d.Height, true
	}
	if d.Vae != nil && *d.Vae != "" {
		out.Vae, any = *d.Vae, true
	}
	if d.VaePrecision != nil && *d.VaePrecision != "" {
		out.VaePrecision, any = *d.VaePrecision, true
	}
	if d.Weight != nil && *d.Weight != 0 {
		out.Weight, any = *d.Weight, true
	}
	if !any {
		return nil
	}
	return out
}

func invokeBaseSupported(base string) bool {
	return base == "sd-1" || base == "sd-2" || base == "sdxl"
}

func (c *Client) invokeModelList(ctx context.Context, base string) ([]invokeModelRecord, error) {
	var out struct {
		Models []invokeModelRecord `json:"models"`
	}
	if err := c.getJSON(ctx, base+"/api/v2/models/", &out); err != nil {
		return nil, err
	}
	return out.Models, nil
}

// invokeModels lists installed main (checkpoint) models. The model key is the stable
// identifier InvokeAI wants back, so it plays the role A1111's title does.
func (c *Client) invokeModels(ctx context.Context, base string) ([]Model, error) {
	records, err := c.invokeModelList(ctx, base)
	if err != nil {
		return nil, err
	}
	out := []Model{}
	for _, r := range records {
		if r.Type != "main" {
			continue
		}
		out = append(out, Model{
			Title: r.Key, Name: r.Name, Hash: r.Hash, Base: r.Base,
			Defaults: r.DefaultSettings.toModelDefaults(),
		})
	}
	return out, nil
}

func (c *Client) invokeVaes(ctx context.Context, base string) ([]Vae, error) {
	records, err := c.invokeModelList(ctx, base)
	if err != nil {
		return nil, err
	}
	out := []Vae{}
	for _, r := range records {
		if r.Type != "vae" {
			continue
		}
		out = append(out, Vae{Key: r.Key, Name: r.Name, Base: r.Base})
	}
	return out, nil
}

// invokeTemplates lists InvokeAI's style presets — named prompt scaffolds whose
// positive half carries a "{prompt}" placeholder for the user's text.
func (c *Client) invokeTemplates(ctx context.Context, base string) ([]Template, error) {
	var out []struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		Type       string `json:"type"` // "user" for the user's own; "default"/"project" are built-in
		PresetData struct {
			Positive string `json:"positive_prompt"`
			Negative string `json:"negative_prompt"`
		} `json:"preset_data"`
	}
	if err := c.getJSON(ctx, base+"/api/v1/style_presets/", &out); err != nil {
		return nil, err
	}
	templates := []Template{}
	for _, p := range out {
		templates = append(templates, Template{
			ID: p.ID, Name: p.Name,
			Prompt:         p.PresetData.Positive,
			NegativePrompt: p.PresetData.Negative,
			// Only the generator's own presets are built-in ("default", and shared
			// "project" ones). Anything else — "user", or an absent/unknown type on an
			// older InvokeAI — is treated as the user's, so we never hide their work.
			BuiltIn: p.Type == "default" || p.Type == "project",
		})
	}
	return templates, nil
}

// invokeCover fetches the cover art InvokeAI keeps for a model, resolving the picker
// selector (a main model's key, a LoRA's display name) back to the record first.
func (c *Client) invokeCover(ctx context.Context, base, name string) ([]byte, string, error) {
	records, err := c.invokeModelList(ctx, base)
	if err != nil {
		return nil, "", err
	}
	var key string
	for _, r := range records {
		if r.Key == name || (key == "" && r.Name == name) {
			key = r.Key
			if r.Key == name {
				break
			}
		}
	}
	if key == "" {
		return nil, "", fmt.Errorf("no such model")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/api/v2/models/i/"+url.PathEscape(key)+"/image", nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("model has no cover image")
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return nil, "", err
	}
	return data, resp.Header.Get("Content-Type"), nil
}

func (c *Client) invokeUpdateCover(ctx context.Context, base, name string, data []byte, contentType string) error {
	records, err := c.invokeModelList(ctx, base)
	if err != nil {
		return err
	}
	key := ""
	for _, r := range records {
		if r.Key == name || (key == "" && r.Name == name) {
			key = r.Key
			if r.Key == name {
				break
			}
		}
	}
	if key == "" {
		return fmt.Errorf("no such model")
	}
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="image"; filename="cover.png"`)
	h.Set("Content-Type", contentType)
	part, err := mw.CreatePart(h)
	if err != nil {
		return err
	}
	if _, err := part.Write(data); err != nil {
		return err
	}
	if err := mw.Close(); err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch,
		base+"/api/v2/models/i/"+url.PathEscape(key)+"/image", &body)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("InvokeAI returned %d while updating cover art", resp.StatusCode)
	}
	return nil
}

func recordToDetail(r invokeModelRecord) *ModelDetail {
	d := &ModelDetail{
		Key: r.Key, Name: r.Name, Base: r.Base, Type: r.Type,
		Description:    r.Description,
		TriggerPhrases: r.TriggerPhrases,
		Defaults:       r.DefaultSettings.toModelDefaults(),
	}
	if d.TriggerPhrases == nil {
		d.TriggerPhrases = []string{}
	}
	return d
}

// invokeModelDetail resolves a picker selector (a main model's key, a LoRA's
// display name) to its full record.
func (c *Client) invokeModelDetail(ctx context.Context, base, name string) (*ModelDetail, error) {
	records, err := c.invokeModelList(ctx, base)
	if err != nil {
		return nil, err
	}
	var match *invokeModelRecord
	for i, r := range records {
		if r.Key == name {
			match = &records[i]
			break
		}
		if match == nil && r.Name == name {
			match = &records[i]
		}
	}
	if match == nil {
		return nil, fmt.Errorf("no such model")
	}
	return recordToDetail(*match), nil
}

// invokeUpdateModel PATCHes a model record the way InvokeAI's own model manager
// does. Defaults replace the whole default_settings blob: a LoRA keeps only a
// weight there, a main model the generation settings.
func (c *Client) invokeUpdateModel(ctx context.Context, base, key string, ch ModelChanges) (*ModelDetail, error) {
	cur, err := c.invokeModelDetail(ctx, base, key)
	if err != nil {
		return nil, err
	}
	body := map[string]any{}
	if ch.Name != nil && strings.TrimSpace(*ch.Name) != "" {
		body["name"] = strings.TrimSpace(*ch.Name)
	}
	if ch.Description != nil {
		body["description"] = *ch.Description
	}
	if ch.TriggerPhrases != nil {
		phrases := []string{}
		for _, p := range *ch.TriggerPhrases {
			if p = strings.TrimSpace(p); p != "" {
				phrases = append(phrases, p)
			}
		}
		body["trigger_phrases"] = phrases
	}
	if ch.Defaults != nil {
		d := ch.Defaults
		if cur.Type == "lora" {
			settings := map[string]any{}
			if d.Weight != 0 {
				settings["weight"] = d.Weight
			}
			body["default_settings"] = settings
		} else {
			settings := map[string]any{}
			if d.Steps > 0 {
				settings["steps"] = d.Steps
			}
			if d.CfgScale > 0 {
				settings["cfg_scale"] = d.CfgScale
			}
			if d.CfgRescale >= 0 {
				settings["cfg_rescale_multiplier"] = d.CfgRescale
			}
			if d.Scheduler != "" {
				settings["scheduler"] = d.Scheduler
			}
			if d.Width > 0 {
				settings["width"] = d.Width
			}
			if d.Height > 0 {
				settings["height"] = d.Height
			}
			if d.Vae != "" {
				settings["vae"] = d.Vae
			}
			if d.VaePrecision != "" {
				settings["vae_precision"] = d.VaePrecision
			}
			body["default_settings"] = settings
		}
	}
	var updated invokeModelRecord
	if err := c.patchJSON(ctx, base+"/api/v2/models/i/"+url.PathEscape(cur.Key), body, &updated); err != nil {
		return nil, err
	}
	return recordToDetail(updated), nil
}

// ── gallery ──────────────────────────────────────────────────────────────────
//
// InvokeAI keeps every finished generation in its own gallery, sorted into boards.
// These calls surface that gallery so it can be browsed (and pruned) from here
// without opening InvokeAI's UI.

func (c *Client) invokeBoards(ctx context.Context, base string) ([]Board, error) {
	var raw []struct {
		BoardID    string `json:"board_id"`
		BoardName  string `json:"board_name"`
		ImageCount int    `json:"image_count"`
	}
	if err := c.getJSON(ctx, base+"/api/v1/boards/?all=true", &raw); err != nil {
		return nil, err
	}
	// The uncategorized pile is a pseudo-board InvokeAI reports separately; putting
	// it first mirrors InvokeAI's own gallery ordering.
	boards := []Board{{ID: "none", Name: "Uncategorized"}}
	if names, err := c.invokeUncategorizedNames(ctx, base); err == nil {
		boards[0].Count = len(names)
	}
	for _, b := range raw {
		boards = append(boards, Board{ID: b.BoardID, Name: b.BoardName, Count: b.ImageCount})
	}
	return boards, nil
}

func (c *Client) invokeCreateBoard(ctx context.Context, base, name string) (*Board, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("board name is required")
	}
	var raw struct {
		BoardID    string `json:"board_id"`
		BoardName  string `json:"board_name"`
		ImageCount int    `json:"image_count"`
	}
	if err := c.postJSON(ctx, base+"/api/v1/boards/?board_name="+url.QueryEscape(name), map[string]any{}, &raw); err != nil {
		return nil, err
	}
	return &Board{ID: raw.BoardID, Name: raw.BoardName, Count: raw.ImageCount}, nil
}

// invokeDeleteBoard removes a gallery board. The images it held are not deleted —
// InvokeAI moves them back to the uncategorized pile (include_images defaults false).
func (c *Client) invokeDeleteBoard(ctx context.Context, base, boardID string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, base+"/api/v1/boards/"+url.PathEscape(boardID), nil)
	if err != nil {
		return err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("InvokeAI returned %d deleting the board", resp.StatusCode)
	}
	return nil
}

func (c *Client) invokeUncategorizedNames(ctx context.Context, base string) ([]string, error) {
	var names []string
	if err := c.getJSON(ctx, base+"/api/v1/boards/none/image_names", &names); err != nil {
		return nil, err
	}
	return names, nil
}

func (c *Client) invokeBoardImages(ctx context.Context, base, boardID string, offset, limit int) (*GalleryPage, error) {
	if boardID == "" {
		boardID = "none"
	}
	u := fmt.Sprintf("%s/api/v1/images/?board_id=%s&offset=%d&limit=%d&is_intermediate=false",
		base, url.QueryEscape(boardID), offset, limit)
	var out struct {
		Items []struct {
			ImageName string `json:"image_name"`
			Width     int    `json:"width"`
			Height    int    `json:"height"`
			CreatedAt string `json:"created_at"`
		} `json:"items"`
		Total int `json:"total"`
	}
	if err := c.getJSON(ctx, u, &out); err != nil {
		return nil, err
	}
	page := &GalleryPage{Items: []GalleryImage{}, Total: out.Total}
	for _, it := range out.Items {
		page.Items = append(page.Items, GalleryImage{
			Name: it.ImageName, Width: it.Width, Height: it.Height, Created: it.CreatedAt,
		})
	}
	return page, nil
}

func (c *Client) invokeGalleryImage(ctx context.Context, base, name string, thumb bool) ([]byte, string, error) {
	variant := "full"
	if thumb {
		variant = "thumbnail"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		base+"/api/v1/images/i/"+url.PathEscape(name)+"/"+variant, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("InvokeAI returned %d for that image", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 64<<20))
	if err != nil {
		return nil, "", err
	}
	return data, resp.Header.Get("Content-Type"), nil
}

// invokeImagePrompt digs the positive prompt out of an image's stored metadata.
// Best-effort by design: not every image has metadata, and a save shouldn't fail
// over a missing caption.
func (c *Client) invokeImagePrompt(ctx context.Context, base, name string) string {
	var meta struct {
		PositivePrompt string `json:"positive_prompt"`
	}
	if err := c.getJSON(ctx, base+"/api/v1/images/i/"+url.PathEscape(name)+"/metadata", &meta); err != nil {
		return ""
	}
	return meta.PositivePrompt
}

type invokeMetadataModel struct {
	Key  string `json:"key"`
	Hash string `json:"hash"`
	Name string `json:"name"`
}

func (m invokeMetadataModel) selector() string {
	if m.Key != "" {
		return m.Key
	}
	return m.Name
}

// invokeImageMetadata translates InvokeAI's core_metadata object into the shared,
// backend-neutral shape used by the web studio. Keep this tolerant: older InvokeAI
// versions omit newer fields, and an old gallery image should still be reusable.
func (c *Client) invokeImageMetadata(ctx context.Context, base, name string) (*ImageMetadata, error) {
	var raw struct {
		PositivePrompt string              `json:"positive_prompt"`
		NegativePrompt string              `json:"negative_prompt"`
		Model          invokeMetadataModel `json:"model"`
		VAE            invokeMetadataModel `json:"vae"`
		Scheduler      string              `json:"scheduler"`
		Seed           int64               `json:"seed"`
		Steps          int                 `json:"steps"`
		CfgScale       float64             `json:"cfg_scale"`
		CfgRescale     float64             `json:"cfg_rescale_multiplier"`
		ClipSkip       int                 `json:"clip_skip"`
		Width          int                 `json:"width"`
		Height         int                 `json:"height"`
		SeamlessX      bool                `json:"seamless_x"`
		SeamlessY      bool                `json:"seamless_y"`
		RandDevice     string              `json:"rand_device"`
		Loras          []struct {
			Model  invokeMetadataModel `json:"model"`
			Weight float64             `json:"weight"`
		} `json:"loras"`
	}
	if err := c.getJSON(ctx, base+"/api/v1/images/i/"+url.PathEscape(name)+"/metadata", &raw); err != nil {
		return nil, err
	}
	meta := &ImageMetadata{
		Prompt: raw.PositivePrompt, NegativePrompt: raw.NegativePrompt,
		Model: raw.Model.selector(), ModelHash: raw.Model.Hash, VAE: raw.VAE.selector(),
		Sampler: raw.Scheduler, Seed: raw.Seed, Steps: raw.Steps,
		CfgScale: raw.CfgScale, CfgRescale: raw.CfgRescale, ClipSkip: raw.ClipSkip,
		Width: raw.Width, Height: raw.Height, SeamlessX: raw.SeamlessX,
		SeamlessY: raw.SeamlessY, CPUNoise: raw.RandDevice != "cuda", Backend: string(KindInvokeAI),
		Loras: make([]ImageMetadataLora, 0, len(raw.Loras)),
	}
	for _, lora := range raw.Loras {
		meta.Loras = append(meta.Loras, ImageMetadataLora{
			Name: lora.Model.Name, Hash: lora.Model.Hash, Weight: lora.Weight,
		})
	}
	return meta, nil
}

// ── model install ────────────────────────────────────────────────────────────

func installJobFromRaw(raw invokeInstallJobRaw) InstallJob {
	job := InstallJob{ID: raw.ID, Status: raw.Status, Bytes: raw.Bytes, TotalBytes: raw.TotalBytes}
	if raw.Source.URL != "" {
		job.Source = raw.Source.URL
	}
	if raw.ErrorReason != "" {
		job.Error = raw.ErrorReason
	} else if raw.Error != "" {
		job.Error = raw.Error
	}
	return job
}

type invokeInstallJobRaw struct {
	ID     int64  `json:"id"`
	Status string `json:"status"`
	Source struct {
		URL string `json:"url"`
	} `json:"source"`
	Error       string `json:"error"`
	ErrorReason string `json:"error_reason"`
	Bytes       int64  `json:"bytes"`
	TotalBytes  int64  `json:"total_bytes"`
}

func (c *Client) invokeInstallModel(ctx context.Context, base, source string) (*InstallJob, error) {
	u := base + "/api/v2/models/install?source=" + url.QueryEscape(source)
	var raw invokeInstallJobRaw
	if err := c.postJSON(ctx, u, map[string]any{}, &raw); err != nil {
		return nil, err
	}
	job := installJobFromRaw(raw)
	return &job, nil
}

func (c *Client) invokeInstallJobs(ctx context.Context, base string) ([]InstallJob, error) {
	var raw []invokeInstallJobRaw
	if err := c.getJSON(ctx, base+"/api/v2/models/install", &raw); err != nil {
		return nil, err
	}
	jobs := []InstallJob{}
	for i := len(raw) - 1; i >= 0; i-- { // newest first
		jobs = append(jobs, installJobFromRaw(raw[i]))
	}
	return jobs, nil
}

func (c *Client) invokeLoras(ctx context.Context, base string) ([]Lora, error) {
	records, err := c.invokeModelList(ctx, base)
	if err != nil {
		return nil, err
	}
	out := []Lora{}
	for _, r := range records {
		if r.Type != "lora" {
			continue
		}
		lora := Lora{Name: r.Name, Alias: r.Name, Path: r.Key, Hash: r.Hash, Base: r.Base, TriggerPhrases: r.TriggerPhrases}
		if r.DefaultSettings != nil && r.DefaultSettings.Weight != nil {
			lora.Weight = *r.DefaultSettings.Weight
		}
		out = append(out, lora)
	}
	return out, nil
}

// invokeScheduler maps a sampler name (possibly an A1111 one) onto InvokeAI's
// scheduler ids, defaulting to euler_a — the workhorse for the SD 1.5-era models
// this feature targets.
func invokeScheduler(sampler string) string {
	s := strings.ToLower(strings.TrimSpace(sampler))
	switch s {
	case "":
		return "euler_a"
	case "euler a":
		return "euler_a"
	case "dpm++ 2m":
		return "dpmpp_2m"
	case "dpm++ 2m karras":
		return "dpmpp_2m_k"
	case "dpm++ 2m sde":
		return "dpmpp_2m_sde"
	case "dpm++ 2m sde karras":
		return "dpmpp_2m_sde_k"
	case "dpm++ sde":
		return "dpmpp_sde"
	case "dpm++ sde karras":
		return "dpmpp_sde_k"
	case "dpm++ 2s a":
		return "dpmpp_2s"
	}
	// Anything already shaped like an InvokeAI id ("euler_k", "unipc", …) passes
	// through; anything else falls back rather than failing graph validation.
	for _, r := range s {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '_' {
			return "euler_a"
		}
	}
	return s
}

func invokeModelIdent(r invokeModelRecord) map[string]any {
	return map[string]any{
		"key":  r.Key,
		"hash": r.Hash,
		"name": r.Name,
		"base": r.Base,
		"type": r.Type,
	}
}

type invokeLoraApply struct {
	rec    invokeModelRecord
	weight float64
}

// buildInvokeGraph assembles the standard txt2img node graph: model loader → LoRA
// chain → prompts/noise → denoise → latents-to-image. Only the final l2i node is
// non-intermediate, so intermediates never pile up in InvokeAI's gallery. A non-nil
// vae swaps in a standalone VAE for the decode; nil uses the checkpoint's own.
func buildInvokeGraph(main invokeModelRecord, vae *invokeModelRecord, loras []invokeLoraApply, req GenerateRequest, scheduler string) map[string]any {
	sdxl := main.Base == "sdxl"
	nodes := map[string]any{}
	edges := []map[string]any{}
	edge := func(from, fromField, to, toField string) {
		edges = append(edges, map[string]any{
			"source":      map[string]any{"node_id": from, "field": fromField},
			"destination": map[string]any{"node_id": to, "field": toField},
		})
	}

	loaderType := "main_model_loader"
	if sdxl {
		loaderType = "sdxl_model_loader"
	}
	nodes["model"] = map[string]any{
		"id": "model", "type": loaderType,
		"model":           invokeModelIdent(main),
		"is_intermediate": true,
	}

	// The unet/clip lines thread through each LoRA loader in turn; whatever node is
	// last in the chain feeds the prompts and the denoiser.
	unetNode := "model"
	clipNode := "model"
	for i, l := range loras {
		id := fmt.Sprintf("lora%d", i)
		loraType := "lora_loader"
		if sdxl {
			loraType = "sdxl_lora_loader"
		}
		nodes[id] = map[string]any{
			"id": id, "type": loraType,
			"lora":            invokeModelIdent(l.rec),
			"weight":          l.weight,
			"is_intermediate": true,
		}
		edge(unetNode, "unet", id, "unet")
		edge(clipNode, "clip", id, "clip")
		if sdxl {
			edge(clipNode, "clip2", id, "clip2")
		}
		unetNode, clipNode = id, id
	}

	// Invoke's CLIP-skip control is available to SD1/SD2. It belongs after the
	// LoRA chain so both positive and negative conditioning see the same CLIP.
	if !sdxl && req.ClipSkip > 0 {
		nodes["clip_skip"] = map[string]any{
			"id": "clip_skip", "type": "clip_skip",
			"skipped_layers":  req.ClipSkip,
			"is_intermediate": true,
		}
		edge(clipNode, "clip", "clip_skip", "clip")
		clipNode = "clip_skip"
	}

	if sdxl {
		for id, prompt := range map[string]string{"pos": req.Prompt, "neg": req.NegativePrompt} {
			// style == prompt mirrors InvokeAI's own linear UI, which concatenates
			// the prompt into the style field unless the user splits them.
			nodes[id] = map[string]any{
				"id": id, "type": "sdxl_compel_prompt",
				"prompt": prompt, "style": prompt,
				"original_width": req.Width, "original_height": req.Height,
				"target_width": req.Width, "target_height": req.Height,
				"crop_top": 0, "crop_left": 0,
				"is_intermediate": true,
			}
			edge(clipNode, "clip", id, "clip")
			edge(clipNode, "clip2", id, "clip2")
		}
	} else {
		for id, prompt := range map[string]string{"pos": req.Prompt, "neg": req.NegativePrompt} {
			nodes[id] = map[string]any{
				"id": id, "type": "compel",
				"prompt":          prompt,
				"is_intermediate": true,
			}
			edge(clipNode, "clip", id, "clip")
		}
	}

	// The seed set here is a placeholder: the batch data varies noise.seed per run.
	nodes["noise"] = map[string]any{
		"id": "noise", "type": "noise",
		"seed": 0, "width": req.Width, "height": req.Height,
		"use_cpu":         req.CPUNoise,
		"is_intermediate": true,
	}
	nodes["denoise"] = map[string]any{
		"id": "denoise", "type": "denoise_latents",
		"steps": req.Steps, "cfg_scale": req.CfgScale,
		"cfg_rescale_multiplier": req.CfgRescale,
		"denoising_start":        0.0, "denoising_end": 1.0,
		"scheduler":       scheduler,
		"is_intermediate": true,
	}
	edge("pos", "conditioning", "denoise", "positive_conditioning")
	edge("neg", "conditioning", "denoise", "negative_conditioning")
	edge("noise", "noise", "denoise", "noise")

	// Seamless tiling patches the UNet and VAE as a pair, just like Invoke's
	// advanced text-to-image panel. A selected standalone VAE enters the same node.
	vaeNode := "model"
	if vae != nil {
		nodes["vae"] = map[string]any{
			"id": "vae", "type": "vae_loader",
			"vae_model":       invokeModelIdent(*vae),
			"is_intermediate": true,
		}
		vaeNode = "vae"
	}
	if req.SeamlessX || req.SeamlessY {
		nodes["seamless"] = map[string]any{
			"id": "seamless", "type": "seamless",
			"seamless_x": req.SeamlessX, "seamless_y": req.SeamlessY,
			"is_intermediate": true,
		}
		edge(unetNode, "unet", "seamless", "unet")
		edge(vaeNode, "vae", "seamless", "vae")
		unetNode, vaeNode = "seamless", "seamless"
	}
	edge(unetNode, "unet", "denoise", "unet")

	// Always decode in fp32. fp16 VAEs (SDXL's stock one especially, and SD 1.5 on
	// some cards) can overflow to NaN and InvokeAI then saves a valid but all-black
	// PNG. This is a correctness setting, not a performance preference.
	nodes["l2i"] = map[string]any{
		"id": "l2i", "type": "l2i",
		"fp32":            true,
		"is_intermediate": req.Detailer.Enabled,
	}
	if !req.Detailer.Enabled && req.Board != "" && req.Board != "none" {
		nodes["l2i"].(map[string]any)["board"] = map[string]any{"board_id": req.Board}
	}
	edge("denoise", "latents", "l2i", "latents")
	edge(vaeNode, "vae", "l2i", "vae")

	// Keep Invoke's gallery metadata as complete as its native text-to-image UI.
	// Besides making generations reproducible, this is what lets gallery saves retain
	// the prompt as library notes.
	generationMode := "txt2img"
	if sdxl {
		generationMode = "sdxl_txt2img"
	}
	metadata := map[string]any{
		"id": "metadata", "type": "core_metadata",
		"generation_mode": generationMode,
		"positive_prompt": req.Prompt, "negative_prompt": req.NegativePrompt,
		"width": req.Width, "height": req.Height, "seed": 0,
		"rand_device": map[bool]string{true: "cpu", false: "cuda"}[req.CPUNoise],
		"cfg_scale":   req.CfgScale, "cfg_rescale_multiplier": req.CfgRescale,
		"steps": req.Steps, "scheduler": scheduler,
		"seamless_x": req.SeamlessX, "seamless_y": req.SeamlessY,
		"clip_skip": req.ClipSkip, "model": invokeModelIdent(main),
		"is_intermediate": true,
	}
	if vae != nil {
		metadata["vae"] = invokeModelIdent(*vae)
	}
	if len(loras) > 0 {
		picked := make([]map[string]any, 0, len(loras))
		for _, lora := range loras {
			picked = append(picked, map[string]any{"model": invokeModelIdent(lora.rec), "weight": lora.weight})
		}
		metadata["loras"] = picked
	}
	nodes["metadata"] = metadata
	edge("metadata", "metadata", "l2i", "metadata")

	// InvokeAI 6.14's ADetailer node accepts a finished image and performs its own
	// detection + inpaint pass. Its "auto" model path selects the detector from the
	// target, which lets the same face/hand/person choices work on A1111 and Invoke.
	if req.Detailer.Enabled {
		target := "face"
		model := strings.ToLower(req.Detailer.Model)
		if strings.Contains(model, "hand") {
			target = "hand"
		} else if strings.Contains(model, "person") {
			target = "person"
		}
		nodes["adetailer"] = map[string]any{
			"id": "adetailer", "type": "adetailer", "is_intermediate": true,
			"prompt": req.Detailer.Prompt, "negative_prompt": req.Detailer.NegativePrompt,
			"target": target, "model_path": "auto", "confidence": req.Detailer.Confidence,
			"denoise_strength": req.Detailer.Denoise, "mask_blur": req.Detailer.MaskBlur,
			"steps": req.Steps, "cfg_scale": req.CfgScale, "scheduler": scheduler,
		}
		edge("l2i", "image", "adetailer", "image")
		nodes["detail_save"] = map[string]any{
			"id": "detail_save", "type": "save_image", "is_intermediate": false, "use_cache": false,
		}
		if req.Board != "" && req.Board != "none" {
			nodes["detail_save"].(map[string]any)["board"] = map[string]any{"board_id": req.Board}
		}
		edge("adetailer", "image", "detail_save", "image")
		edge("metadata", "metadata", "detail_save", "metadata")
	}

	return map[string]any{"id": "oppailib_txt2img", "nodes": nodes, "edges": edges}
}

// invokeQueueItem is the slice of a session-queue item this client reads.
type invokeQueueItem struct {
	ItemID       int64  `json:"item_id"`
	BatchID      string `json:"batch_id"`
	Status       string `json:"status"` // pending | in_progress | completed | failed | canceled
	ErrorType    string `json:"error_type"`
	ErrorMessage string `json:"error_message"`
	Error        string `json:"error"` // older InvokeAI versions
	Session      struct {
		Results map[string]struct {
			Type  string `json:"type"`
			Image struct {
				ImageName string `json:"image_name"`
			} `json:"image"`
		} `json:"results"`
	} `json:"session"`
}

func (item *invokeQueueItem) errText() string {
	switch {
	case item.ErrorMessage != "":
		return item.ErrorMessage
	case item.Error != "":
		return item.Error
	default:
		return "generation failed"
	}
}

// imageName digs the finished image out of the session results. Node ids are
// rewritten during batch preparation, so scan for the (single) image output rather
// than looking up "l2i" by name.
func (item *invokeQueueItem) imageName() string {
	for id, r := range item.Session.Results {
		if strings.Contains(id, "detail_save") && r.Type == "image_output" && r.Image.ImageName != "" {
			return r.Image.ImageName
		}
	}
	for id, r := range item.Session.Results {
		if strings.Contains(id, "adetailer") && r.Type == "image_output" && r.Image.ImageName != "" {
			return r.Image.ImageName
		}
	}
	for _, r := range item.Session.Results {
		if r.Type == "image_output" && r.Image.ImageName != "" {
			return r.Image.ImageName
		}
	}
	return ""
}

func (c *Client) invokeGenerate(ctx context.Context, base string, req GenerateRequest) (*GenerateResult, error) {
	records, err := c.invokeModelList(ctx, base)
	if err != nil {
		return nil, err
	}

	// Resolve the checkpoint: by key (the id the picker uses), by name as a fallback,
	// or the first installed main model when none was chosen.
	var main invokeModelRecord
	found := false
	for _, r := range records {
		if r.Type != "main" {
			continue
		}
		if req.Checkpoint == "" {
			if !found {
				main, found = r, true
			}
			continue
		}
		if r.Key == req.Checkpoint {
			main, found = r, true
			break
		}
		if !found && r.Name == req.Checkpoint {
			main, found = r, true
		}
	}
	if !found {
		return nil, fmt.Errorf("InvokeAI has no matching model installed")
	}
	if !invokeBaseSupported(main.Base) {
		return nil, fmt.Errorf("model %q is a %s model; only sd-1, sd-2 and sdxl are supported", main.Name, main.Base)
	}

	// Resolve requested LoRAs against what's installed. A LoRA trained for another
	// base would fail InvokeAI's graph validation, so mismatches are skipped rather
	// than sinking the whole generation.
	var loras []invokeLoraApply
	for _, want := range req.Loras {
		for _, r := range records {
			if r.Type == "lora" && (r.Name == want.Name || r.Key == want.Name) {
				if r.Base == main.Base {
					loras = append(loras, invokeLoraApply{rec: r, weight: want.Weight})
				}
				break
			}
		}
	}

	// Resolve the VAE: the explicit pick first, else the model's own default-settings
	// VAE (what InvokeAI's UI would use). A record for another base is ignored rather
	// than failing graph validation — the checkpoint's built-in VAE still decodes.
	wantVae := req.VAE
	if wantVae == "" && main.DefaultSettings != nil && main.DefaultSettings.Vae != nil {
		wantVae = *main.DefaultSettings.Vae
	}
	var vae *invokeModelRecord
	if wantVae != "" {
		for i, r := range records {
			if r.Type == "vae" && (r.Key == wantVae || r.Name == wantVae) && r.Base == main.Base {
				vae = &records[i]
				break
			}
		}
	}

	seeds := make([]int64, req.Count)
	for i := range seeds {
		if req.Seed < 0 {
			seeds[i] = rand.Int63n(1 << 32)
		} else {
			seeds[i] = req.Seed + int64(i)
		}
	}

	graph := buildInvokeGraph(main, vae, loras, req, invokeScheduler(req.Sampler))
	payload := map[string]any{
		"prepend": false,
		"batch": map[string]any{
			"graph": graph,
			"runs":  1,
			"data": [][]map[string]any{{
				{"node_path": "noise", "field_name": "seed", "items": seeds},
				{"node_path": "metadata", "field_name": "seed", "items": seeds},
			}},
		},
	}
	var enq struct {
		ItemIDs []int64 `json:"item_ids"`
		Batch   struct {
			BatchID string `json:"batch_id"`
		} `json:"batch"`
	}
	if err := c.postJSON(ctx, base+"/api/v1/queue/"+invokeQueue+"/enqueue_batch", payload, &enq); err != nil {
		return nil, err
	}
	itemIDs := enq.ItemIDs
	if len(itemIDs) == 0 {
		// Older InvokeAI versions don't return item ids; find them via the batch id.
		itemIDs, err = c.invokeFindItems(ctx, base, enq.Batch.BatchID)
		if err != nil {
			return nil, err
		}
	}
	if len(itemIDs) == 0 {
		return nil, fmt.Errorf("InvokeAI accepted the job but reported no queue items")
	}

	res := &GenerateResult{Seed: seeds[0]}
	for i, id := range itemIDs {
		name, err := c.invokeAwaitImage(ctx, base, id)
		if err != nil {
			return nil, err
		}
		// The gallery copy is left in place: InvokeAI keeps every finished image in
		// its own gallery anyway, and the studio's Gallery panel browses (and prunes)
		// it. "Save" still only refers to the library — nothing lands there until the
		// user asks.
		data, err := c.invokeFetchImage(ctx, base, name)
		if err != nil {
			return nil, err
		}
		res.Images = append(res.Images, data)
		if i < len(seeds) {
			res.Seeds = append(res.Seeds, seeds[i])
		}
	}
	return res, nil
}

// invokeFindItems lists the queue and picks out the items belonging to batchID.
func (c *Client) invokeFindItems(ctx context.Context, base, batchID string) ([]int64, error) {
	if batchID == "" {
		return nil, nil
	}
	var out struct {
		Items []invokeQueueItem `json:"items"`
	}
	if err := c.getJSON(ctx, base+"/api/v1/queue/"+invokeQueue+"/list?limit=200", &out); err != nil {
		return nil, err
	}
	var ids []int64
	for _, item := range out.Items {
		if item.BatchID == batchID {
			ids = append(ids, item.ItemID)
		}
	}
	return ids, nil
}

// invokeAwaitImage polls one queue item until it completes and returns the finished
// image's gallery name. The caller's context bounds the wait.
func (c *Client) invokeAwaitImage(ctx context.Context, base string, itemID int64) (string, error) {
	ticker := time.NewTicker(1500 * time.Millisecond)
	defer ticker.Stop()
	for {
		var item invokeQueueItem
		if err := c.getJSON(ctx, fmt.Sprintf("%s/api/v1/queue/%s/i/%d", base, invokeQueue, itemID), &item); err != nil {
			return "", err
		}
		switch item.Status {
		case "completed":
			if name := item.imageName(); name != "" {
				return name, nil
			}
			return "", fmt.Errorf("InvokeAI finished but returned no image")
		case "failed":
			return "", fmt.Errorf("InvokeAI: %s", item.errText())
		case "canceled":
			return "", fmt.Errorf("InvokeAI canceled the generation")
		}
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-ticker.C:
		}
	}
}

func (c *Client) invokeFetchImage(ctx context.Context, base, name string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/api/v1/images/i/"+url.PathEscape(name)+"/full", nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch generated image: InvokeAI returned %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 64<<20))
}

func (c *Client) invokeDeleteImage(ctx context.Context, base, name string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, base+"/api/v1/images/i/"+url.PathEscape(name), nil)
	if err != nil {
		return err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("InvokeAI returned %d deleting the image", resp.StatusCode)
	}
	return nil
}

// invokeDeleteImages deletes several images in one request. An empty list is a
// no-op so callers don't have to guard it.
func (c *Client) invokeDeleteImages(ctx context.Context, base string, names []string) error {
	if len(names) == 0 {
		return nil
	}
	body := map[string]any{"image_names": names}
	if err := c.postJSON(ctx, base+"/api/v1/images/delete", body, nil); err != nil {
		return fmt.Errorf("deleting images: %w", err)
	}
	return nil
}

// invokeAddImagesToBoard moves images onto a board. boardID "none" (or "") removes
// them from whatever board they're on, since InvokeAI has no "none" board to add to.
func (c *Client) invokeAddImagesToBoard(ctx context.Context, base, boardID string, names []string) error {
	if len(names) == 0 {
		return nil
	}
	if boardID == "" || boardID == "none" {
		body := map[string]any{"image_names": names}
		if err := c.postJSON(ctx, base+"/api/v1/board_images/batch/delete", body, nil); err != nil {
			return fmt.Errorf("removing images from board: %w", err)
		}
		return nil
	}
	body := map[string]any{"board_id": boardID, "image_names": names}
	if err := c.postJSON(ctx, base+"/api/v1/board_images/batch", body, nil); err != nil {
		return fmt.Errorf("adding images to board: %w", err)
	}
	return nil
}

// postJSON POSTs in as JSON and decodes the response into out (which may be nil).
func (c *Client) postJSON(ctx context.Context, u string, in, out any) error {
	return c.sendJSON(ctx, http.MethodPost, u, in, out)
}

// patchJSON PATCHes in as JSON and decodes the response into out (which may be nil).
func (c *Client) patchJSON(ctx context.Context, u string, in, out any) error {
	return c.sendJSON(ctx, http.MethodPatch, u, in, out)
}

func (c *Client) sendJSON(ctx context.Context, method, u string, in, out any) error {
	body, err := json.Marshal(in)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, method, u, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("image generator unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<10))
		return fmt.Errorf("image generator returned %d: %s", resp.StatusCode, bytes.TrimSpace(msg))
	}
	if out == nil {
		return nil
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 8<<20)).Decode(out)
}
