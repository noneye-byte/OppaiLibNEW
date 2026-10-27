package imagegen

import (
	"strconv"
	"strings"
)

// Several people in one picture.
//
// A prompt that names two people draws two people who look alike: every word of it
// pulls on the whole canvas, and a character LoRA pulls hardest of all, so the second
// woman comes out with the first one's face. Regional Prompter (an Automatic1111
// extension) splits the canvas into parts and draws each from its own stretch of the
// prompt, and in its Latent mode each part's LoRAs are applied to that part alone —
// which is what keeps one character's LoRA off the other.
//
// The prompt is written in the extension's own keywords: the shared words, ADDCOMM,
// then each person's words with ADDCOL (side by side) or ADDROW (stacked) between
// them. The keywords set the layout themselves, so it does not hang on the names of
// the split modes, which the extension has renamed between versions.

// Regions is the parts of a picture drawn from prompts of their own.
type Regions struct {
	Enabled bool
	// Rows stacks the parts top to bottom; otherwise they sit side by side.
	Rows  bool
	Parts []RegionPart
}

// RegionPart is one person: what is drawn in their part of the picture, the LoRAs
// that draw them, and how wide (or tall) the part is beside the others — 0 is 1.
type RegionPart struct {
	Prompt string
	Loras  []LoraWeight
	Share  float64
}

// Active is whether there is anything to split: one part is just the picture.
func (r Regions) Active() bool { return r.Enabled && len(r.Parts) >= 2 }

// hasLoras is whether any part brings LoRAs of its own.
func (r Regions) hasLoras() bool {
	for _, p := range r.Parts {
		for _, l := range p.Loras {
			if l.Name != "" {
				return true
			}
		}
	}
	return false
}

// regionalPrompt is the whole prompt in Regional Prompter's keywords: the shared
// words (and the LoRAs for the whole picture) first, every part after them.
func regionalPrompt(common string, r Regions) string {
	sep := " ADDCOL "
	if r.Rows {
		sep = " ADDROW "
	}
	parts := make([]string, 0, len(r.Parts))
	for _, p := range r.Parts {
		parts = append(parts, strings.TrimSpace(strings.TrimSpace(p.Prompt)+a1111LoraTokens(p.Loras)))
	}
	return strings.TrimSpace(common) + " ADDCOMM " + strings.Join(parts, sep)
}

// regionalRatios is the parts' sizes as the extension reads them: "1,1", "2,1".
func regionalRatios(r Regions) string {
	out := make([]string, 0, len(r.Parts))
	for _, p := range r.Parts {
		share := p.Share
		if share <= 0 {
			share = 1
		}
		out = append(out, strconv.FormatFloat(min(share, 10), 'g', 3, 64))
	}
	return strings.Join(out, ",")
}

// regionalArgs is the extension's positional argument list, in the order its API
// section documents: active, debug, mode, the matrix split, mask and prompt
// sub-modes, ratios, base ratios, use base, use common, use negative common,
// calculation mode, "not change AND", the two LoRA stop settings, the threshold, a
// mask, the two LoRA stop steps and flip. Common is left off here because ADDCOMM
// in the prompt turns it on — passing both would split the shared words off twice.
//
// Latent mode draws each part separately and is what confines a LoRA to its part;
// Attention is faster and enough when no part has a LoRA of its own.
func regionalArgs(r Regions) []any {
	split, calc := "Columns", "Attention"
	if r.Rows {
		split = "Rows"
	}
	if r.hasLoras() {
		calc = "Latent"
	}
	return []any{
		true, false, "Matrix", split, "Mask", "Prompt",
		regionalRatios(r), "", false, false, false,
		calc, false, "0", "0", "0", "", "0", "0", false,
	}
}

// a1111DetailerArgs is ADetailer's argument list: enable, "skip img2img", then one
// tab per pass, run in order on what the last one left — the faces, the hands, then
// the custom passes.
func a1111DetailerArgs(req GenerateRequest) []any {
	d := req.Detailer
	// The second argument is ADetailer's "skip img2img": the img2img pass is run at
	// one step and thrown away, and the detailer works on the init image.
	args := []any{true, req.DetailOnly && len(req.InitImage) > 0}
	tab := func(model, prompt, negative string, confidence, denoise float64) map[string]any {
		return map[string]any{
			"ad_model": model, "ad_tab_enable": true,
			"ad_prompt": prompt, "ad_negative_prompt": negative,
			"ad_confidence": confidence, "ad_denoising_strength": denoise,
			"ad_mask_blur": d.MaskBlur,
		}
	}
	for _, model := range d.Passes() {
		prompt := d.Prompt
		if len(d.FacePrompts) > 1 && findsPeople(model) {
			// [SEP] gives each thing the detector finds a prompt of its own, in the
			// order the boxes are sorted (left to right, set in override_settings).
			prompt = strings.Join(d.FacePrompts, " [SEP] ")
		}
		args = append(args, tab(model, prompt, d.NegativePrompt, d.Confidence, d.Denoise))
	}
	for _, p := range d.Custom {
		model := strings.TrimSpace(p.Model)
		if model == "" {
			continue
		}
		prompt := strings.TrimSpace(p.Prompt)
		if prompt == "" {
			prompt = d.Prompt
		}
		prompt = strings.TrimSpace(prompt + a1111LoraTokens(p.Loras))
		negative := strings.TrimSpace(p.NegativePrompt)
		if negative == "" {
			negative = d.NegativePrompt
		}
		confidence, denoise := p.Confidence, p.Denoise
		if confidence <= 0 {
			confidence = d.Confidence
		}
		if denoise <= 0 {
			denoise = d.Denoise
		}
		args = append(args, tab(model, prompt, negative, confidence, denoise))
	}
	return args
}

// findsPeople is whether a detector's boxes are one per person — a face or a whole
// figure — so a prompt per person can be handed to them in order.
func findsPeople(model string) bool {
	m := strings.ToLower(model)
	return strings.Contains(m, "face") || strings.Contains(m, "person")
}
