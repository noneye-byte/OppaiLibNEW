package imagegen

import (
	"regexp"
	"strings"
)

// The kinds of model there are.
//
// A checkpoint used to be one thing here: a file that held its own text encoder and
// VAE, drawn with Euler a at a CFG of six. Forge Neo runs fifteen architectures, and
// almost nothing about one carries over to the next. Most of them are bare diffusion
// models that load only with a text encoder and a VAE chosen beside them, want a sampler
// of their own, and take a shift, or a distilled CFG, on top of the CFG. So a family is
// the record of all that, and everything that has to know — a run, the picker's sorting,
// the trainer — reads it from here.
//
// The numbers are Neo's own presets (modules_forge/presets.py) and the files are the
// ones its wiki's Download Models table names. Neo's presets assume the fast versions
// of the models that come in two (Z-Image Turbo, Krea 2 Turbo, Qwen with Lightning), so
// the slower ones have numbers of their own, from each model's own card.

// The family ids. sd1 to sd3 and flux match how InvokeAI's bases read once normalised.
const (
	FamilySD1    = "sd1"
	FamilySD2    = "sd2"
	FamilySDXL   = "sdxl"
	FamilySD3    = "sd3"
	FamilyFlux   = "flux"
	FamilyFlux2  = "flux2"
	FamilyChroma = "chroma"
	FamilyQwen   = "qwen"
	FamilyQwen21 = "qwen21"
	FamilyLumina = "lumina"
	FamilyZImage = "zimage"
	FamilyWan    = "wan"
	FamilyAnima  = "anima"
	FamilyErnie  = "ernie"
	FamilyPiD    = "pid"
	FamilyKrea2  = "krea2"
	FamilyMoss   = "moss"
)

// ModuleFile is one file Forge needs that can be fetched without an account.
type ModuleFile struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	// GB is how large it is, so a download of ten gigabytes is not a surprise.
	GB float64 `json:"gb"`
}

// ModuleSlot is one thing a bare model needs beside it: a text encoder or a VAE.
type ModuleSlot struct {
	// Kind is "te" or "vae", and says which folder the file goes in.
	Kind string `json:"kind"`
	// Role is the trainer's name for it (trainer/server.py), which is the argument a
	// training run hands the file to.
	Role  string `json:"role"`
	Label string `json:"label"`
	// match is what a file of this kind has in its name, with everything but letters
	// and digits taken out, so qwen_3_4b and qwen3-4b read alike. not rules out the
	// longer names that hold a shorter one: gemma_2_2b_it is PiD's, not Lumina's.
	match []string
	not   []string
	// exact is a whole name, for ae.safetensors, too short to be looked for inside one.
	exact []string
	// Get is the file to fetch when none is there.
	Get ModuleFile `json:"get"`
}

// Family is one model architecture.
type Family struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	// Sampler and Scheduler are Automatic1111's names for them, which Forge takes as
	// two fields. Blank leaves the choice to the generator.
	Sampler   string  `json:"sampler,omitempty"`
	Scheduler string  `json:"scheduler,omitempty"`
	Steps     int     `json:"steps,omitempty"`
	CFG       float64 `json:"cfgScale,omitempty"`
	// Tune is what Forge's distilled_cfg_scale field means for this family: "shift",
	// "distilled", or "" when it means nothing. It is one field for two ideas.
	Tune  string  `json:"tune,omitempty"`
	Shift float64 `json:"shift,omitempty"`
	// Slow is what the full version of a model that comes in two wants, over the fast
	// numbers above.
	Slow *SlowSettings `json:"-"`
	// Width and Height are a picture's size where the family's differs from a square
	// megapixel.
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`
	// Video says one run is a clip, not a picture: batch size is its frames.
	Video bool `json:"video,omitempty"`
	// Reference is the option that makes an input picture a reference to edit from
	// rather than a start to draw over, on the families that can do either.
	Reference string `json:"reference,omitempty"`
	// Edit says a picture to start from is what the model is for.
	Edit bool `json:"edit,omitempty"`
	// Slots are what a bare file of this family needs beside it.
	Slots []ModuleSlot `json:"slots,omitempty"`
}

// SlowSettings are a full model's numbers.
type SlowSettings struct {
	Sampler   string
	Scheduler string
	Steps     int
	CFG       float64
}

// hf is a file on Hugging Face, by the path its page shows.
func hf(path, name string, gb float64) ModuleFile {
	return ModuleFile{Name: name, URL: "https://huggingface.co/" + path + "/" + name, GB: gb}
}

// The VAEs several families share.
var (
	vaeFlux = ModuleSlot{Kind: "vae", Role: "ae", Label: "Flux VAE (ae)",
		match: []string{"fluxae", "flux1ae", "fluxvae", "flux1vae"}, exact: []string{"ae.safetensors", "ae.sft"},
		Get: hf("Comfy-Org/Lumina_Image_2.0_Repackaged/resolve/main/split_files/vae", "ae.safetensors", 0.34)}
	vaeFlux2 = ModuleSlot{Kind: "vae", Role: "ae", Label: "Flux.2 VAE",
		match: []string{"flux2vae", "fullencodersmalldecoder"},
		Get:   hf("Comfy-Org/ERNIE-Image/resolve/main/vae", "flux2-vae.safetensors", 0.34)}
	vaeQwen = ModuleSlot{Kind: "vae", Role: "vae", Label: "Qwen-Image VAE",
		match: []string{"qwenimagevae", "qwen2dvae"}, not: []string{"qwenimage21vae"},
		Get: hf("Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae", "qwen_image_vae.safetensors", 0.25)}
	teT5 = ModuleSlot{Kind: "te", Role: "t5xxl", Label: "T5-XXL text encoder",
		match: []string{"t5xxl"}, not: []string{"umt5"},
		Get: hf("comfyanonymous/flux_text_encoders/resolve/main", "t5xxl_fp16.safetensors", 9.79)}
	teClipL = ModuleSlot{Kind: "te", Role: "clip_l", Label: "CLIP-L text encoder",
		match: []string{"clipl"},
		Get:   hf("comfyanonymous/flux_text_encoders/resolve/main", "clip_l.safetensors", 0.25)}
	teQwen34 = ModuleSlot{Kind: "te", Role: "text_encoder", Label: "Qwen3 4B text encoder",
		match: []string{"qwen34b"},
		Get:   hf("Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders", "qwen_3_4b.safetensors", 8.04)}
	teQwen38 = ModuleSlot{Kind: "te", Role: "text_encoder", Label: "Qwen3 8B text encoder",
		match: []string{"qwen38b"},
		Get:   hf("Comfy-Org/vae-text-encorder-for-flux-klein-9b/resolve/main/split_files/text_encoders", "qwen_3_8b.safetensors", 16.38)}
)

// familyTable is every family, in the order the studio lists them: the old ones, then
// the new ones by how alike they are.
var familyTable = []Family{
	{ID: FamilySD1, Label: "SD 1.5", Sampler: "Euler a", Steps: 32, CFG: 6},
	{ID: FamilySD2, Label: "SD 2"},
	{ID: FamilySDXL, Label: "SDXL", Sampler: "Euler a", Steps: 24, CFG: 4.5},
	{ID: FamilySD3, Label: "SD 3"},
	{ID: FamilyAnima, Label: "Anima", Sampler: "ER SDE", Scheduler: "Beta", Steps: 32, CFG: 4,
		Tune: "shift", Shift: 3, Width: 832, Height: 1216, Reference: "anima_do_reference",
		Slots: []ModuleSlot{
			{Kind: "te", Role: "qwen3", Label: "Qwen3 0.6B text encoder", match: []string{"qwen306b", "qwen3506b"},
				Get: hf("circlestone-labs/Anima/resolve/main/split_files/text_encoders", "qwen_3_06b_base.safetensors", 1.19)},
			vaeQwen,
		}},
	{ID: FamilyLumina, Label: "Lumina", Sampler: "Res Multistep", Scheduler: "Simple", Steps: 32, CFG: 4,
		Tune: "shift", Shift: 6,
		Slots: []ModuleSlot{
			{Kind: "te", Role: "gemma2", Label: "Gemma 2 2B text encoder", match: []string{"gemma22b"}, not: []string{"gemma22bit"},
				Get: hf("duongve/NetaYume-Lumina-Image-2.0/resolve/main/Text_Encoder", "gemma_2_2b_fp16.safetensors", 5.23)},
			vaeFlux,
		}},
	{ID: FamilyFlux, Label: "Flux.1", Sampler: "Euler", Scheduler: "Beta", Steps: 20, CFG: 1,
		Tune: "distilled", Shift: 3, Slots: []ModuleSlot{teClipL, teT5, vaeFlux}},
	{ID: FamilyChroma, Label: "Chroma", Sampler: "Euler", Scheduler: "Beta", Steps: 26, CFG: 4,
		Slots: []ModuleSlot{teT5, vaeFlux}},
	{ID: FamilyFlux2, Label: "Flux.2 Klein", Sampler: "Euler", Scheduler: "Beta", Steps: 4, CFG: 1,
		Reference: "klein_do_reference", Slow: &SlowSettings{Steps: 50, CFG: 4},
		Slots: []ModuleSlot{teQwen34, vaeFlux2}},
	{ID: FamilyZImage, Label: "Z-Image", Sampler: "Euler", Scheduler: "Beta", Steps: 9, CFG: 1, Tune: "shift", Shift: 9,
		Slow:  &SlowSettings{Steps: 28, CFG: 4},
		Slots: []ModuleSlot{teQwen34, vaeFlux}},
	{ID: FamilyQwen, Label: "Qwen", Sampler: "LCM", Scheduler: "Normal", Steps: 8, CFG: 1,
		Slow: &SlowSettings{Sampler: "Euler", Scheduler: "Simple", Steps: 30, CFG: 2.5},
		Slots: []ModuleSlot{
			{Kind: "te", Role: "text_encoder", Label: "Qwen 2.5 VL text encoder", match: []string{"qwen25vl7b"},
				Get: hf("Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders", "qwen_2.5_vl_7b.safetensors", 16.58)},
			vaeQwen,
		}},
	{ID: FamilyQwen21, Label: "Qwen 2.1", Sampler: "Euler", Scheduler: "Simple", Steps: 32, CFG: 2.5,
		Reference: "qwen21_do_reference",
		Slots: []ModuleSlot{
			{Kind: "te", Role: "text_encoder", Label: "Qwen3 VL 8B text encoder", match: []string{"qwen3vl8b"},
				Get: hf("Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders", "qwen3vl_8b_bf16.safetensors", 17.53)},
			{Kind: "vae", Role: "vae", Label: "Qwen-Image 2.1 VAE", match: []string{"qwenimage21vae"},
				Get: hf("Comfy-Org/Qwen-Image-2.1/resolve/main/vae", "qwen_image_2.1_vae_bf16.safetensors", 0.68)},
		}},
	{ID: FamilyKrea2, Label: "Krea 2", Sampler: "Euler", Scheduler: "Simple", Steps: 8, CFG: 1, Tune: "shift", Shift: 1.15,
		Reference: "krea2_do_reference", Slow: &SlowSettings{Steps: 28, CFG: 5.5},
		Slots: []ModuleSlot{
			{Kind: "te", Role: "text_encoder", Label: "Qwen3 VL 4B text encoder", match: []string{"qwen3vl4b"},
				Get: hf("Comfy-Org/Krea-2/resolve/main/text_encoders", "qwen3vl_4b_bf16.safetensors", 8.88)},
			vaeQwen,
		}},
	{ID: FamilyErnie, Label: "Ernie", Sampler: "Euler", Scheduler: "Simple", Steps: 8, CFG: 1, Tune: "shift", Shift: 3,
		Slow: &SlowSettings{Steps: 40, CFG: 4},
		Slots: []ModuleSlot{
			{Kind: "te", Role: "text_encoder", Label: "Ministral 3 3B text encoder", match: []string{"ministral33b"},
				Get: hf("Comfy-Org/ERNIE-Image/resolve/main/text_encoders", "ministral-3-3b.safetensors", 7.72)},
			vaeFlux2,
		}},
	{ID: FamilyMoss, Label: "MOSS Image", Sampler: "Euler", Scheduler: "Simple", Steps: 50, CFG: 3, Tune: "shift", Shift: 5,
		Slots: []ModuleSlot{
			{Kind: "te", Role: "text_encoder", Label: "Qwen3.5 9B text encoder", match: []string{"qwen359b"},
				Get: hf("Comfy-Org/MOSS-Image/resolve/main/text_encoders", "qwen3.5_9b_bf16.safetensors", 19.31)},
			vaeFlux2,
		}},
	{ID: FamilyPiD, Label: "PiD", Sampler: "LCM", Scheduler: "Simple", Steps: 4, CFG: 1, Tune: "shift", Shift: 1.5, Edit: true,
		Slots: []ModuleSlot{
			{Kind: "te", Role: "text_encoder", Label: "Gemma 2 2B IT text encoder", match: []string{"gemma22bit"},
				Get: hf("Comfy-Org/PixelDiT/resolve/main/text_encoders", "gemma_2_2b_it_elm_bf16.safetensors", 5.23)},
		}},
	{ID: FamilyWan, Label: "Wan 2.2", Sampler: "Euler", Scheduler: "Simple", Steps: 4, CFG: 1, Tune: "shift", Shift: 5, Video: true,
		Width: 832, Height: 480, Slow: &SlowSettings{Steps: 20, CFG: 3.5},
		Slots: []ModuleSlot{
			{Kind: "te", Role: "t5", Label: "UMT5-XXL text encoder", match: []string{"umt5xxl"},
				Get: hf("Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders", "umt5_xxl_fp16.safetensors", 11.37)},
			{Kind: "vae", Role: "vae", Label: "Wan VAE", match: []string{"wan21vae", "wanvae"},
				Get: hf("Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae", "wan_2.1_vae.safetensors", 0.25)},
		}},
}

// Families is every family the studio knows, in order.
func Families() []Family {
	return append([]Family(nil), familyTable...)
}

// FamilyByID finds one, the zero Family and false when the id is none.
func FamilyByID(id string) (Family, bool) {
	for _, f := range familyTable {
		if f.ID == id {
			return f, true
		}
	}
	return Family{}, false
}

// FamilyLabel is how a family is said, or the id itself when it is not one of them.
func FamilyLabel(id string) string {
	if f, ok := FamilyByID(id); ok {
		return f.Label
	}
	return id
}

// slotsFor is what a checkpoint of a family needs beside it. Flux.2 Klein comes in two
// sizes that differ in nothing but the text encoder they were trained with.
func (f Family) slotsFor(variant string) []ModuleSlot {
	if f.ID != FamilyFlux2 || variant != "9b" {
		return f.Slots
	}
	out := append([]ModuleSlot(nil), f.Slots...)
	out[0] = teQwen38
	return out
}

// Settled is what a family draws with for a file of this name, which is the fast
// numbers unless the name says otherwise. A model that comes in two is taken to be the
// full one unless it says it is fast, since a full model at eight steps and CFG 1 is
// noise, and a fast one at twenty-eight is only slow. Qwen's fast version is a LoRA on
// the full model, so its numbers are the ones its preset assumes, whatever the file.
func (f Family) Settled(name string) Family {
	if f.Slow == nil || f.ID == FamilyQwen || f.ID == FamilyWan {
		return f
	}
	// Klein goes the other way: its plain files are the distilled ones, and the full
	// model is the one that says "base".
	if f.ID == FamilyFlux2 && !strings.Contains(strings.ToLower(name), "base") {
		return f
	}
	if f.ID != FamilyFlux2 && looksFast(name) {
		return f
	}
	f.Steps, f.CFG = f.Slow.Steps, f.Slow.CFG
	if f.Slow.Sampler != "" {
		f.Sampler, f.Scheduler = f.Slow.Sampler, f.Slow.Scheduler
	}
	return f
}

// looksFast is a model file whose name says it is the distilled one.
func looksFast(name string) bool {
	n := strings.ToLower(name)
	for _, w := range []string{"turbo", "lightning", "hyper", "lcm", "lightx2v", "distill"} {
		if strings.Contains(n, w) {
			return true
		}
	}
	return false
}

// squeeze takes everything but letters and digits out of a name, lower-cased: the one
// spelling a base model's name and a file's can be compared in.
func squeeze(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// FamilyOfBase is the family a base model's name stands for, "" when it says none or
// names something Neo does not run. The names come three ways: Civitai's ("Flux.2 Klein
// 9B", "ZImageTurbo", "Qwen 2.1"), A1111's card ("SD1") and InvokeAI's ("sd-1",
// "z-image"). web/src/lora-categories.ts's baseFamily is this again.
func FamilyOfBase(base string) string {
	b := squeeze(base)
	switch {
	case b == "", b == "unknown", b == "other", b == "any":
		return ""
	// Pony V7 is on AuraFlow, nothing like the Pony before it.
	case strings.HasPrefix(b, "ponyv7"):
		return ""
	case strings.HasPrefix(b, "flux2"):
		return FamilyFlux2
	case strings.HasPrefix(b, "flux3"):
		return ""
	case strings.HasPrefix(b, "flux"):
		return FamilyFlux
	case strings.HasPrefix(b, "chroma"):
		return FamilyChroma
	case strings.HasPrefix(b, "qwen21"):
		return FamilyQwen21
	case strings.HasPrefix(b, "qwen3"):
		return ""
	case strings.HasPrefix(b, "qwen"):
		return FamilyQwen
	case strings.HasPrefix(b, "lumina"), strings.HasPrefix(b, "neta"):
		return FamilyLumina
	case strings.HasPrefix(b, "zimage"):
		return FamilyZImage
	case strings.HasPrefix(b, "wan"):
		return FamilyWan
	case strings.HasPrefix(b, "anima"):
		return FamilyAnima
	case strings.HasPrefix(b, "ernie"):
		return FamilyErnie
	case strings.HasPrefix(b, "moss"):
		return FamilyMoss
	case strings.HasPrefix(b, "krea2"):
		return FamilyKrea2
	case strings.HasPrefix(b, "pid"):
		return FamilyPiD
	case strings.HasPrefix(b, "sd3"):
		return FamilySD3
	case strings.Contains(b, "xl"), strings.HasPrefix(b, "pony"), strings.HasPrefix(b, "illustrious"),
		strings.HasPrefix(b, "noob"), strings.HasPrefix(b, "mugen"):
		return FamilySDXL
	case strings.HasPrefix(b, "sd2"):
		return FamilySD2
	case strings.HasPrefix(b, "sd1"):
		return FamilySD1
	}
	return ""
}

// The names a model's file gives away, for when the file itself cannot be read. Each is
// held to whole words, since Animagine XL has "anima" in it and is nothing to do with
// Anima, and every name with an SDXL marker is settled before these are looked at.
var (
	nameAnima  = regexp.MustCompile(`(^|[^a-z])anima([^a-z]|$)`)
	nameWan    = regexp.MustCompile(`(^|[^a-z])wan[ _.-]?2[ _.-]?[2]`)
	namePiD    = regexp.MustCompile(`(^|[^a-z])pid([^a-z]|$)`)
	nameMoss   = regexp.MustCompile(`(^|[^a-z])moss[ _.-]?image`)
	nameErnie  = regexp.MustCompile(`(^|[^a-z])ernie([^a-z]|$)`)
	nameKrea2  = regexp.MustCompile(`krea[ _.-]?2`)
	nameXL     = regexp.MustCompile(`(^|[^a-z0-9])(sdxl|xl|il|ilxl)([^a-z0-9]|$)|sdxl|[a-z]xl([^a-z]|$)`)
	nameSD15   = regexp.MustCompile(`(^|[^a-z0-9])(sd[ _.-]?1[ _.-]?5|sd1)([^a-z0-9]|$)`)
	nameQwen21 = regexp.MustCompile(`qwen[ _.-]?(image[ _.-]?)?2[ _.-]?1`)
)

// familyFromName reads a family and a Civitai-style base out of a file's name. It is
// the last resort, for a generator whose files cannot be read from here.
func familyFromName(name string) (family, base string) {
	n := strings.ToLower(strings.ReplaceAll(name, "\\", "/"))
	if i := strings.LastIndex(n, "/"); i >= 0 {
		n = n[i+1:]
	}
	switch {
	case strings.Contains(n, "illustrious") || strings.Contains(n, "waiillust"):
		return FamilySDXL, "Illustrious"
	case strings.Contains(n, "noobai") || strings.Contains(n, "noob_") || strings.Contains(n, "noob-"):
		return FamilySDXL, "NoobAI"
	case strings.Contains(n, "pony") && !strings.Contains(n, "ponyv7") && !strings.Contains(n, "pony_v7"):
		return FamilySDXL, "Pony"
	case nameXL.MatchString(n):
		return FamilySDXL, ""
	case nameAnima.MatchString(n):
		return FamilyAnima, ""
	case strings.Contains(n, "z_image"), strings.Contains(n, "z-image"), strings.Contains(n, "zimage"):
		return FamilyZImage, ""
	case nameKrea2.MatchString(n):
		return FamilyKrea2, ""
	case nameQwen21.MatchString(n):
		return FamilyQwen21, ""
	case strings.Contains(n, "qwen"):
		return FamilyQwen, ""
	case strings.Contains(n, "klein"), strings.Contains(n, "flux2"), strings.Contains(n, "flux.2"), strings.Contains(n, "flux-2"):
		return FamilyFlux2, ""
	case strings.Contains(n, "chroma"):
		return FamilyChroma, ""
	case strings.Contains(n, "flux"), strings.Contains(n, "kontext"):
		return FamilyFlux, ""
	case strings.Contains(n, "lumina"), strings.Contains(n, "netayume"):
		return FamilyLumina, ""
	case nameWan.MatchString(n):
		return FamilyWan, ""
	case nameErnie.MatchString(n):
		return FamilyErnie, ""
	case nameMoss.MatchString(n):
		return FamilyMoss, ""
	case namePiD.MatchString(n):
		return FamilyPiD, ""
	case nameSD15.MatchString(n):
		return FamilySD1, ""
	}
	return "", ""
}
