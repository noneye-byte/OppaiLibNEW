package imagegen

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// What a model's file says about itself.
//
// Neither Automatic1111 nor Forge reports what a checkpoint is, and a name is a poor
// guide: Civitai's files are called whatever their authors liked. But a .safetensors
// starts with a header naming every tensor in it, and the architectures can be told
// apart by those names, which is how Forge itself decides (huggingface_guess/detection.py,
// which detectFamily follows test for test). The header is a few hundred kilobytes of a
// file of gigabytes, so this costs one short read per file, once.
//
// Only Illustrious, NoobAI and Pony cannot be read this way: they are SDXL, tensor for
// tensor. A LoRA's trainer usually wrote its checkpoint's name in the header's metadata,
// and otherwise Civitai's answer is what tells them apart (model_bases.go).

// FileFacts is what could be learned about one model file.
type FileFacts struct {
	// Family is a family id, "" when nothing could tell.
	Family string
	// Variant tells apart files of one family that need different things: "4b" or
	// "9b" for Flux.2 Klein, "i2v" or "t2v" for Wan.
	Variant string
	// Base is a catalogue base name finer than the family ("Illustrious"), or "".
	Base string
	// HasTE and HasVAE say the file carries its own, so nothing is needed beside it.
	HasTE, HasVAE bool
}

// maxHeaderBytes bounds what is read as a header. Real ones are under a few megabytes;
// a number larger than this is not a safetensors file.
const maxHeaderBytes = 64 << 20

// tensorInfo is one entry of a safetensors header.
type tensorInfo struct {
	Shape []int64 `json:"shape"`
}

// readSafetensorsHeader reads a file's tensors and its metadata. Only the header is
// read, whatever the file's size.
func readSafetensorsHeader(path string) (map[string]tensorInfo, map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	defer f.Close()
	var size uint64
	if err := binary.Read(f, binary.LittleEndian, &size); err != nil {
		return nil, nil, err
	}
	if size == 0 || size > maxHeaderBytes {
		return nil, nil, fmt.Errorf("not a safetensors header")
	}
	raw := make([]byte, size)
	if _, err := f.ReadAt(raw, 8); err != nil {
		return nil, nil, err
	}
	var top map[string]json.RawMessage
	if err := json.Unmarshal(raw, &top); err != nil {
		return nil, nil, err
	}
	tensors := make(map[string]tensorInfo, len(top))
	meta := map[string]string{}
	for k, v := range top {
		if k == "__metadata__" {
			_ = json.Unmarshal(v, &meta)
			continue
		}
		var t tensorInfo
		_ = json.Unmarshal(v, &t)
		tensors[k] = t
	}
	return tensors, meta, nil
}

// checkpointPrefixes are what a diffusion model's keys can sit under. Forge strips
// these same ones (unet_prefix_from_state_dict).
var checkpointPrefixes = []string{"", "model.diffusion_model.", "diffusion_model.", "net.", "model.", "transformer."}

// detectFamily tells an architecture by its tensors, in the order Forge asks: several
// of these keys exist in more than one, and the earlier test is the one that rules.
func detectFamily(t map[string]tensorInfo) (family, variant string) {
	for _, p := range checkpointPrefixes {
		has := func(k string) bool { _, ok := t[p+k]; return ok }
		switch {
		case has("cap_embedder.1.weight") && (has("noise_refiner.0.attention.k_norm.weight") || has("layers.0.attention.to_out.0.qweight")):
			// The two share a design and differ in size.
			if s := t[p+"cap_embedder.1.weight"].Shape; len(s) > 0 && s[0] == 3840 {
				return FamilyZImage, ""
			}
			return FamilyLumina, ""
		case has("head.modulation"):
			if has("img_emb.proj.0.bias") {
				return FamilyWan, "i2v"
			}
			if s := t[p+"patch_embedding.weight"].Shape; len(s) > 1 && s[1] > 16 {
				return FamilyWan, "i2v"
			}
			return FamilyWan, "t2v"
		case has("single_transformer_blocks.0.mlp_fc1.qweight"):
			return FamilyFlux, ""
		case (has("double_blocks.0.img_attn.norm.key_norm.scale") || has("double_blocks.0.img_attn.norm.key_norm.weight")) &&
			(has("img_in.weight") || has("distilled_guidance_layer.norms.0.scale")),
			has("double_stream_modulation_img.lin.weight"):
			if has("double_stream_modulation_img.lin.weight") {
				if s := t[p+"img_in.weight"].Shape; len(s) > 0 && s[0] == 4096 {
					return FamilyFlux2, "9b"
				}
				return FamilyFlux2, "4b"
			}
			if has("distilled_guidance_layer.0.norms.0.scale") || has("distilled_guidance_layer.norms.0.scale") {
				return FamilyChroma, ""
			}
			return FamilyFlux, ""
		case has("blocks.0.mlp.layer1.weight"):
			return FamilyAnima, ""
		case has("lq_proj.latent_proj.0.weight"):
			return FamilyPiD, ""
		case has("txt_in.text_norm.weight") && has("modulation.1.weight") && has("transformer_blocks.0.attn.norm_q.weight"):
			return FamilyQwen21, ""
		case has("shared_block_modulation.weight") && has("layers.0.proj.ffn_up_gate.weight"):
			return FamilyMoss, ""
		case has("txt_norm.weight"):
			return FamilyQwen, ""
		case has("txtfusion.projector.weight"):
			return FamilyKrea2, ""
		case has("layers.0.mlp.linear_fc2.weight"):
			return FamilyErnie, ""
		case has("input_blocks.0.0.weight"):
			switch {
			case has("label_emb.0.0.weight"):
				return FamilySDXL, ""
			case has("input_blocks.4.1.transformer_blocks.1.attn1.to_q.weight"):
				return FamilySDXL, ""
			}
			if has("middle_block.1.transformer_blocks.0.attn2.to_k.weight") {
				if s := t[p+"middle_block.1.transformer_blocks.0.attn2.to_k.weight"].Shape; len(s) > 1 && s[1] == 1024 {
					return FamilySD2, ""
				}
			}
			return FamilySD1, ""
		}
	}
	return "", ""
}

// hasKeyPrefix is any tensor under one of the prefixes.
func hasKeyPrefix(t map[string]tensorInfo, prefixes ...string) bool {
	for k := range t {
		for _, p := range prefixes {
			if strings.HasPrefix(k, p) {
				return true
			}
		}
	}
	return false
}

// checkpointFacts reads a checkpoint's header. The names for a bundled text encoder and
// VAE are the ones Forge's supported_models look under.
func checkpointFacts(tensors map[string]tensorInfo, meta map[string]string) FileFacts {
	f := FileFacts{}
	f.Family, f.Variant = detectFamily(tensors)
	f.HasTE = hasKeyPrefix(tensors, "cond_stage_model.", "conditioner.", "text_encoders.", "text_encoder.")
	f.HasVAE = hasKeyPrefix(tensors, "first_stage_model.", "vae.")
	f.Base = baseFromMetadata(meta)
	return f
}

// loraArchitectures are the modelspec.architecture values the trainers write, and the
// family each means, lower-cased: sd-scripts writes "flux-1-dev/lora", musubi-tuner
// "Flux.2-klein-9b/lora", and a value's end can name a size, so these are prefixes.
var loraArchitectures = []struct{ prefix, family string }{
	{"stable-diffusion-v1", FamilySD1},
	{"stable-diffusion-v2", FamilySD2},
	{"stable-diffusion-xl", FamilySDXL},
	{"stable-diffusion-3", FamilySD3},
	{"flux-1", FamilyFlux},
	{"flux.1", FamilyFlux},
	{"flux.2", FamilyFlux2},
	{"chroma", FamilyChroma},
	{"lumina", FamilyLumina},
	{"anima", FamilyAnima},
	{"moss-image", FamilyMoss},
	{"qwen-image", FamilyQwen},
	{"z-image", FamilyZImage},
	{"krea-2", FamilyKrea2},
	{"wan", FamilyWan},
}

// loraBaseVersions are sd-scripts' ss_base_model_version values.
var loraBaseVersions = []struct{ prefix, family string }{
	{"sd_v1", FamilySD1},
	{"sd_v2", FamilySD2},
	{"sdxl", FamilySDXL},
	{"sd3", FamilySD3},
	{"flux1", FamilyFlux},
	{"chroma", FamilyChroma},
	{"lumina", FamilyLumina},
	{"anima", FamilyAnima},
	{"moss", FamilyMoss},
}

// baseFromMetadata is the finer base a file's metadata names, from what a trainer or a
// model's maker wrote: for a LoRA, the checkpoint it was trained against.
func baseFromMetadata(meta map[string]string) string {
	for _, k := range []string{"ss_sd_model_name", "ss_base_model_version", "modelspec.title", "modelspec.description"} {
		v := strings.ToLower(meta[k])
		switch {
		case v == "":
			continue
		case strings.Contains(v, "illustrious"), strings.Contains(v, "waiillust"):
			return "Illustrious"
		case strings.Contains(v, "noob"):
			return "NoobAI"
		case strings.Contains(v, "pony") && !strings.Contains(v, "ponyv7"):
			return "Pony"
		}
	}
	return ""
}

// loraFamilyFromKeys tells a LoRA's family by the layers it changes, when no metadata
// says. Only what is unambiguous: a LoRA that matches nothing is taken to fit anything,
// which is better than hiding one that works.
func loraFamilyFromKeys(t map[string]tensorInfo) string {
	switch {
	case hasKeyPrefix(t, "lora_unet_double_stream_modulation", "diffusion_model.double_stream_modulation"):
		return FamilyFlux2
	case hasKeyPrefix(t, "lora_unet_double_blocks_", "lora_unet_single_blocks_", "diffusion_model.double_blocks.", "transformer.single_transformer_blocks."):
		return FamilyFlux
	case hasKeyPrefix(t, "lora_unet_cap_refiner_", "lora_unet_noise_refiner_"):
		return FamilyLumina
	case hasKeyPrefix(t, "lora_te2_", "lora_unet_input_blocks_7_1_transformer_blocks_", "lora_unet_down_blocks_2_attentions_0_transformer_blocks_9"):
		return FamilySDXL
	case hasKeyPrefix(t, "lora_te_text_model_", "lora_te1_text_model_", "lora_unet_down_blocks_", "lora_unet_input_blocks_"):
		return FamilySD1
	case hasKeyPrefix(t, "lora_unet_transformer_blocks_", "diffusion_model.transformer_blocks."):
		return FamilyQwen
	}
	for k := range t {
		if strings.Contains(k, "blocks_0_mlp_layer1") || strings.Contains(k, "blocks.0.mlp.layer1") {
			return FamilyAnima
		}
	}
	return ""
}

// loraFacts reads a LoRA's header: what it says it was trained for, or failing that
// what it touches.
func loraFacts(tensors map[string]tensorInfo, meta map[string]string) FileFacts {
	f := FileFacts{Base: baseFromMetadata(meta)}
	arch := strings.ToLower(meta["modelspec.architecture"])
	for _, a := range loraArchitectures {
		if strings.HasPrefix(arch, a.prefix) {
			f.Family = a.family
			return f
		}
	}
	version := strings.ToLower(meta["ss_base_model_version"])
	for _, a := range loraBaseVersions {
		if strings.HasPrefix(version, a.prefix) {
			f.Family = a.family
			return f
		}
	}
	f.Family = loraFamilyFromKeys(tensors)
	return f
}

// factsCache remembers what each file's header said, by path, size and time. It lives
// in memory: a header is a short read, and this is here so a status poll over a
// thousand LoRAs does not make a thousand of them each time, not to survive a restart.
type factsCache struct {
	mu sync.Mutex
	m  map[string]factsEntry
}

type factsEntry struct {
	size, mod int64
	facts     FileFacts
}

func (c *Client) facts() *factsCache {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.fileFacts == nil {
		c.fileFacts = &factsCache{m: map[string]factsEntry{}}
	}
	return c.fileFacts
}

// read is what a file on this box says, through the cache. A .ckpt is a pickle, a .gguf
// a format of its own, and neither is opened: their names are all there is.
func (fc *factsCache) read(local string, parse func(map[string]tensorInfo, map[string]string) FileFacts) (FileFacts, bool) {
	if local == "" || !strings.EqualFold(filepath.Ext(local), ".safetensors") {
		return FileFacts{}, false
	}
	info, err := os.Stat(local)
	if err != nil || info.IsDir() {
		return FileFacts{}, false
	}
	fc.mu.Lock()
	e, ok := fc.m[local]
	fc.mu.Unlock()
	if ok && e.size == info.Size() && e.mod == info.ModTime().UnixNano() {
		return e.facts, true
	}
	tensors, meta, err := readSafetensorsHeader(local)
	if err != nil {
		return FileFacts{}, false
	}
	facts := parse(tensors, meta)
	fc.mu.Lock()
	fc.m[local] = factsEntry{info.Size(), info.ModTime().UnixNano(), facts}
	fc.mu.Unlock()
	return facts, true
}
