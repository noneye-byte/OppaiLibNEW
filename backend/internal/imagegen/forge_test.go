package imagegen

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"
)

// writeSafetensors makes a file with a header and no weights, which is all anything
// here reads. A key maps to its shape.
func writeSafetensors(t *testing.T, path string, tensors map[string][]int64, meta map[string]string) {
	t.Helper()
	top := map[string]any{}
	for k, shape := range tensors {
		top[k] = map[string]any{"dtype": "F16", "shape": shape, "data_offsets": []int{0, 0}}
	}
	if meta != nil {
		top["__metadata__"] = meta
	}
	raw, err := json.Marshal(top)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err := binary.Write(f, binary.LittleEndian, uint64(len(raw))); err != nil {
		t.Fatal(err)
	}
	if _, err := f.Write(raw); err != nil {
		t.Fatal(err)
	}
}

func keysOf(shape []int64, names ...string) map[string][]int64 {
	out := map[string][]int64{}
	for _, n := range names {
		out[n] = shape
	}
	return out
}

func TestEveryFamilyIsToldApartByItsTensors(t *testing.T) {
	one := []int64{1}
	cases := []struct {
		name    string
		tensors map[string][]int64
		family  string
		variant string
	}{
		{"SD 1.5", keysOf(one, "model.diffusion_model.input_blocks.0.0.weight"), FamilySD1, ""},
		{"SDXL", keysOf(one, "model.diffusion_model.input_blocks.0.0.weight", "model.diffusion_model.label_emb.0.0.weight"), FamilySDXL, ""},
		{"Anima, under its net. prefix", keysOf(one, "net.blocks.0.mlp.layer1.weight"), FamilyAnima, ""},
		{"Lumina", map[string][]int64{"cap_embedder.1.weight": {2304, 2304}, "noise_refiner.0.attention.k_norm.weight": one}, FamilyLumina, ""},
		{"Z-Image, which is Lumina at another size", map[string][]int64{"cap_embedder.1.weight": {3840, 2560}, "noise_refiner.0.attention.k_norm.weight": one}, FamilyZImage, ""},
		{"Flux.1", keysOf(one, "double_blocks.0.img_attn.norm.key_norm.scale", "img_in.weight"), FamilyFlux, ""},
		{"Chroma, which is Flux with its guidance taken out", keysOf(one, "double_blocks.0.img_attn.norm.key_norm.scale", "distilled_guidance_layer.norms.0.scale"), FamilyChroma, ""},
		{"Flux.2 Klein 4B", map[string][]int64{"double_blocks.0.img_attn.norm.key_norm.scale": one, "double_stream_modulation_img.lin.weight": one, "img_in.weight": {3072, 128}}, FamilyFlux2, "4b"},
		{"Flux.2 Klein 9B", map[string][]int64{"double_blocks.0.img_attn.norm.key_norm.scale": one, "double_stream_modulation_img.lin.weight": one, "img_in.weight": {4096, 128}}, FamilyFlux2, "9b"},
		{"Qwen", keysOf(one, "txt_norm.weight"), FamilyQwen, ""},
		{"Qwen 2.1", keysOf(one, "txt_in.text_norm.weight", "modulation.1.weight", "transformer_blocks.0.attn.norm_q.weight"), FamilyQwen21, ""},
		{"Krea 2", keysOf(one, "txtfusion.projector.weight"), FamilyKrea2, ""},
		{"Ernie", keysOf(one, "layers.0.mlp.linear_fc2.weight"), FamilyErnie, ""},
		{"MOSS Image", keysOf(one, "shared_block_modulation.weight", "layers.0.proj.ffn_up_gate.weight"), FamilyMoss, ""},
		{"PiD", keysOf(one, "lq_proj.latent_proj.0.weight"), FamilyPiD, ""},
		{"Wan from words", map[string][]int64{"head.modulation": one, "patch_embedding.weight": {5120, 16, 1, 2, 2}}, FamilyWan, "t2v"},
		{"Wan from a picture", map[string][]int64{"head.modulation": one, "patch_embedding.weight": {5120, 36, 1, 2, 2}}, FamilyWan, "i2v"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			tensors := map[string]tensorInfo{}
			for k, s := range c.tensors {
				tensors[k] = tensorInfo{Shape: s}
			}
			family, variant := detectFamily(tensors)
			if family != c.family || variant != c.variant {
				t.Fatalf("got %q %q, want %q %q", family, variant, c.family, c.variant)
			}
		})
	}
}

func TestANameGivesAFamilyAwayOnlyInWholeWords(t *testing.T) {
	cases := map[string][2]string{
		"animagineXL40_v4Opt.safetensors":     {FamilySDXL, ""},
		"animaPencilXL_v500.safetensors":      {FamilySDXL, ""},
		"anima-preview3-base.safetensors":     {FamilyAnima, ""},
		"waiIllustriousSDXL_v150.safetensors": {FamilySDXL, "Illustrious"},
		"noobai-XL-1.1.safetensors":           {FamilySDXL, "NoobAI"},
		"ponyDiffusionV6XL.safetensors":       {FamilySDXL, "Pony"},
		"z_image_turbo_bf16.safetensors":      {FamilyZImage, ""},
		"flux-2-klein-4b.safetensors":         {FamilyFlux2, ""},
		"flux1-dev.safetensors":               {FamilyFlux, ""},
		"qwen_image_2.1_bf16.safetensors":     {FamilyQwen21, ""},
		"qwen_image_2512_fp8.safetensors":     {FamilyQwen, ""},
		"wan2.2_t2v_low_noise_14B.safetensors": {FamilyWan, ""},
		"realisticVisionV60.safetensors":      {"", ""},
	}
	for name, want := range cases {
		family, base := familyFromName(name)
		if family != want[0] || base != want[1] {
			t.Errorf("%s: got %q %q, want %q %q", name, family, base, want[0], want[1])
		}
	}
}

func TestBaseModelNamesReadTheSameFromEveryCatalogue(t *testing.T) {
	cases := map[string]string{
		"SD 1.5": FamilySD1, "sd-1": FamilySD1, "SDXL 1.0": FamilySDXL, "sdxl": FamilySDXL,
		"Illustrious": FamilySDXL, "Pony": FamilySDXL, "NoobAI": FamilySDXL,
		"Pony V7": "", "Flux.1 D": FamilyFlux, "Flux.1 Kontext": FamilyFlux, "Flux.2 Klein 9B": FamilyFlux2,
		"Chroma": FamilyChroma, "Anima": FamilyAnima, "Qwen": FamilyQwen, "Qwen 2": FamilyQwen,
		"Qwen 2.1": FamilyQwen21, "Qwen 3": "", "ZImageTurbo": FamilyZImage, "ZImageBase": FamilyZImage,
		"z-image": FamilyZImage, "Krea 2 Turbo": FamilyKrea2, "Ernie": FamilyErnie, "MOSS Image": FamilyMoss,
		"Lumina": FamilyLumina, "Wan Video 2.2 I2V-A14B": FamilyWan, "Other": "", "": "",
	}
	for base, want := range cases {
		if got := FamilyOfBase(base); got != want {
			t.Errorf("%q: got %q, want %q", base, got, want)
		}
	}
}

func TestASlotKnowsItsFilesAndNotTheOnesThatHoldItsName(t *testing.T) {
	lumina, _ := FamilyByID(FamilyLumina)
	gemma := lumina.Slots[0]
	if !gemma.Matches("gemma_2_2b_fp16.safetensors") {
		t.Error("Lumina's text encoder was not recognised")
	}
	if gemma.Matches("gemma_2_2b_it_elm_bf16.safetensors") {
		t.Error("PiD's text encoder was taken for Lumina's")
	}
	if !vaeFlux.Matches("ae.safetensors") || vaeFlux.Matches("not_ae.safetensors") {
		t.Error("ae.safetensors is matched whole, being too short to look for inside a name")
	}
	if vaeQwen.Matches("qwen_image_2.1_vae_bf16.safetensors") {
		t.Error("Qwen 2.1's VAE was taken for Qwen's")
	}
	if teT5.Matches("umt5_xxl_fp16.safetensors") {
		t.Error("Wan's text encoder was taken for T5-XXL")
	}
}

func TestPickingModules(t *testing.T) {
	anima, _ := FamilyByID(FamilyAnima)
	have := []ForgeModule{
		{Name: "qwen_3_06b_base.safetensors", Kind: "te"},
		{Name: "qwen_image_vae.safetensors", Kind: "vae"},
		{Name: "sdxl_vae.safetensors", Kind: "vae"},
	}
	t.Run("a bare model gets one of each", func(t *testing.T) {
		names, missing := pickModules(anima.Slots, have, nil, FileFacts{})
		want := []string{"qwen_3_06b_base.safetensors", "qwen_image_vae.safetensors"}
		if !reflect.DeepEqual(names, want) || len(missing) != 0 {
			t.Fatalf("got %v, missing %v", names, missing)
		}
	})
	t.Run("what the checkpoint carries is not asked for", func(t *testing.T) {
		names, missing := pickModules(anima.Slots, nil, nil, FileFacts{HasTE: true, HasVAE: true})
		if len(names) != 0 || len(missing) != 0 {
			t.Fatalf("got %v, missing %v", names, missing)
		}
	})
	t.Run("what is not there is named", func(t *testing.T) {
		_, missing := pickModules(anima.Slots, have[1:], nil, FileFacts{})
		if len(missing) != 1 || missing[0].Label != "Qwen3 0.6B text encoder" {
			t.Fatalf("missing %+v", missing)
		}
	})
	t.Run("a full file is taken over a cut-down one", func(t *testing.T) {
		flux, _ := FamilyByID(FamilyFlux)
		names, _ := pickModules(flux.Slots, []ForgeModule{
			{Name: "clip_l.safetensors", Kind: "te"}, {Name: "ae.safetensors", Kind: "vae"},
			{Name: "t5xxl_fp8_e4m3fn_scaled.safetensors", Kind: "te"}, {Name: "t5xxl_fp16.safetensors", Kind: "te"},
		}, nil, FileFacts{})
		if names[1] != "t5xxl_fp16.safetensors" {
			t.Fatalf("got %v", names)
		}
	})
	t.Run("a person's choice wins", func(t *testing.T) {
		flux, _ := FamilyByID(FamilyFlux)
		names, _ := pickModules(flux.Slots, []ForgeModule{
			{Name: "clip_l.safetensors", Kind: "te"}, {Name: "ae.safetensors", Kind: "vae"},
			{Name: "t5xxl_fp8_scaled.safetensors", Kind: "te"}, {Name: "t5xxl_fp16.safetensors", Kind: "te"},
		}, []string{"t5xxl_fp8_scaled.safetensors"}, FileFacts{})
		if names[1] != "t5xxl_fp8_scaled.safetensors" {
			t.Fatalf("got %v", names)
		}
	})
	t.Run("a renamed file fills an empty slot when chosen", func(t *testing.T) {
		names, missing := pickModules(anima.Slots, []ForgeModule{
			{Name: "my_text_encoder.safetensors", Kind: "te"}, {Name: "qwen_image_vae.safetensors", Kind: "vae"},
		}, []string{"my_text_encoder.safetensors"}, FileFacts{})
		if len(missing) != 0 || len(names) != 2 {
			t.Fatalf("got %v, missing %v", names, missing)
		}
	})
	t.Run("Klein's larger size takes the larger text encoder", func(t *testing.T) {
		flux2, _ := FamilyByID(FamilyFlux2)
		if got := flux2.slotsFor("9b")[0].Label; got != "Qwen3 8B text encoder" {
			t.Fatalf("got %q", got)
		}
		if got := flux2.slotsFor("4b")[0].Label; got != "Qwen3 4B text encoder" {
			t.Fatalf("got %q", got)
		}
	})
}

func TestAFamilyThatComesInTwoIsDrawnByItsName(t *testing.T) {
	z, _ := FamilyByID(FamilyZImage)
	if got := z.Settled("z_image_turbo_bf16.safetensors"); got.Steps != 9 || got.CFG != 1 {
		t.Errorf("turbo: %+v", got)
	}
	if got := z.Settled("z_image_bf16.safetensors"); got.Steps != 28 || got.CFG != 4 {
		t.Errorf("base: %+v", got)
	}
	k, _ := FamilyByID(FamilyFlux2)
	if got := k.Settled("flux-2-klein-9b.safetensors"); got.Steps != 4 {
		t.Errorf("Klein, whose plain file is the distilled one: %+v", got)
	}
	if got := k.Settled("flux-2-klein-base-9b.safetensors"); got.Steps != 50 || got.CFG != 4 {
		t.Errorf("Klein base: %+v", got)
	}
}

func TestStudioSamplerIDsReachA1111AsItsOwnNames(t *testing.T) {
	cases := map[string]string{
		"dpmpp_2m_k": "DPM++ 2M Karras", "euler_a": "Euler a", "er_sde": "ER SDE",
		"DPM++ SDE Karras": "DPM++ SDE Karras", "Res Multistep": "Res Multistep", "": "",
	}
	for id, want := range cases {
		if got := a1111SamplerName(id); got != want {
			t.Errorf("%q: got %q, want %q", id, got, want)
		}
	}
}

func TestBaseSettling(t *testing.T) {
	cases := []struct {
		name         string
		sidecar      a1111Sidecar
		facts        FileFacts
		base, family string
	}{
		{"the catalogue's name is kept", a1111Sidecar{sidecarBase: "Illustrious", sidecarVersion: "SDXL"}, FileFacts{Family: FamilySDXL}, "Illustrious", FamilySDXL},
		{"an old card gives way to the file", a1111Sidecar{sidecarVersion: "SDXL"}, FileFacts{Family: FamilyAnima}, "Anima", FamilyAnima},
		{"a card alone is enough with no file to read", a1111Sidecar{sidecarVersion: "SDXL"}, FileFacts{}, "SDXL", FamilySDXL},
		{"what a LoRA's trainer wrote beats the family's name", nil, FileFacts{Family: FamilySDXL, Base: "NoobAI"}, "NoobAI", FamilySDXL},
		{"a card saying nothing says nothing", a1111Sidecar{sidecarVersion: "Unknown"}, FileFacts{}, "", ""},
		{"a catalogue name for the wrong architecture loses", a1111Sidecar{sidecarBase: "Pony"}, FileFacts{Family: FamilyAnima}, "Anima", FamilyAnima},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			base, family := settleBase(c.sidecar, c.facts)
			if base != c.base || family != c.family {
				t.Fatalf("got %q %q, want %q %q", base, family, c.base, c.family)
			}
		})
	}
}

func TestLoraFamiliesComeFromWhatTheirTrainersWrote(t *testing.T) {
	cases := []struct {
		name    string
		meta    map[string]string
		tensors map[string]tensorInfo
		family  string
		base    string
	}{
		{"sd-scripts' spec", map[string]string{"modelspec.architecture": "anima-preview/lora"}, nil, FamilyAnima, ""},
		{"musubi-tuner's spec", map[string]string{"modelspec.architecture": "Flux.2-klein-9b/lora"}, nil, FamilyFlux2, ""},
		{"musubi-tuner's Qwen", map[string]string{"modelspec.architecture": "Qwen-Image/lora"}, nil, FamilyQwen, ""},
		{"musubi-tuner's Z-Image", map[string]string{"modelspec.architecture": "Z-Image/lora"}, nil, FamilyZImage, ""},
		{"musubi-tuner's Wan", map[string]string{"modelspec.architecture": "wan2.1/lora"}, nil, FamilyWan, ""},
		{"kohya's version field", map[string]string{"ss_base_model_version": "sdxl_base_v1-0"}, nil, FamilySDXL, ""},
		{"the checkpoint it was trained on", map[string]string{"ss_base_model_version": "sdxl_base_v1-0", "ss_sd_model_name": "waiIllustriousSDXL_v15.safetensors"}, nil, FamilySDXL, "Illustrious"},
		{"its layers, when nothing is written", nil, map[string]tensorInfo{"lora_unet_double_blocks_0_img_attn_proj.lora_up.weight": {}}, FamilyFlux, ""},
		{"Anima's layers", nil, map[string]tensorInfo{"lora_unet_blocks_0_mlp_layer1.lora_up.weight": {}}, FamilyAnima, ""},
		{"nothing to go on", nil, map[string]tensorInfo{"mystery.weight": {}}, "", ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			f := loraFacts(c.tensors, c.meta)
			if f.Family != c.family || f.Base != c.base {
				t.Fatalf("got %q %q, want %q %q", f.Family, f.Base, c.family, c.base)
			}
		})
	}
}

// neoFake is a Forge with a models folder on disk, recording the runs sent to it.
type neoFake struct {
	mu      sync.Mutex
	runs    []map[string]any
	scripts []string
	frames  int
}

func (f *neoFake) serve(t *testing.T, root string) *httptest.Server {
	t.Helper()
	remote := func(rel string) string { return "/forge/models/" + rel }
	list := func(dir string) []string {
		entries, _ := os.ReadDir(filepath.Join(root, dir))
		var out []string
		for _, e := range entries {
			out = append(out, e.Name())
		}
		return out
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/app/version", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(404) })
	mux.HandleFunc("/system_stats", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(404) })
	mux.HandleFunc("/sdapi/v1/sd-models", func(w http.ResponseWriter, r *http.Request) {
		out := []map[string]any{}
		for _, n := range list("Stable-diffusion") {
			stem := strings.TrimSuffix(n, filepath.Ext(n))
			out = append(out, map[string]any{"title": n + " [abc]", "model_name": stem, "hash": "abc", "filename": remote("Stable-diffusion/" + n)})
		}
		json.NewEncoder(w).Encode(out)
	})
	mux.HandleFunc("/sdapi/v1/sd-modules", func(w http.ResponseWriter, r *http.Request) {
		out := []map[string]any{}
		for _, dir := range []string{"text_encoder", "VAE"} {
			for _, n := range list(dir) {
				out = append(out, map[string]any{"model_name": n, "filename": remote(dir + "/" + n)})
			}
		}
		json.NewEncoder(w).Encode(out)
	})
	mux.HandleFunc("/sdapi/v1/scripts", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"txt2img": f.scripts, "img2img": f.scripts})
	})
	mux.HandleFunc("/sdapi/v1/loras", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("[]")) })
	mux.HandleFunc("/sdapi/v1/progress", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("{}")) })
	draw := func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		f.runs = append(f.runs, body)
		f.mu.Unlock()
		n := max(f.frames, 1)
		images := make([]string, n)
		for i := range images {
			images[i] = base64.StdEncoding.EncodeToString([]byte("picture"))
		}
		json.NewEncoder(w).Encode(map[string]any{"images": images, "info": "{}"})
	}
	mux.HandleFunc("/sdapi/v1/txt2img", draw)
	mux.HandleFunc("/sdapi/v1/img2img", draw)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func (f *neoFake) last(t *testing.T) map[string]any {
	t.Helper()
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.runs) == 0 {
		t.Fatal("no run reached Forge")
	}
	return f.runs[len(f.runs)-1]
}

func forgeModelsDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	one := []int64{1}
	writeSafetensors(t, filepath.Join(dir, "Stable-diffusion", "anima-base.safetensors"), keysOf(one, "net.blocks.0.mlp.layer1.weight"), nil)
	writeSafetensors(t, filepath.Join(dir, "Stable-diffusion", "myXL.safetensors"),
		keysOf(one, "model.diffusion_model.input_blocks.0.0.weight", "model.diffusion_model.label_emb.0.0.weight",
			"first_stage_model.decoder.conv_in.weight", "conditioner.embedders.1.model.ln_final.weight"), nil)
	writeSafetensors(t, filepath.Join(dir, "text_encoder", "qwen_3_06b_base.safetensors"), keysOf(one, "x"), nil)
	writeSafetensors(t, filepath.Join(dir, "VAE", "qwen_image_vae.safetensors"), keysOf(one, "x"), nil)
	if err := os.MkdirAll(filepath.Join(dir, "Lora"), 0o755); err != nil {
		t.Fatal(err)
	}
	return dir
}

func forgeClient(t *testing.T, dir string, f *neoFake) (*Client, string) {
	t.Helper()
	srv := f.serve(t, dir)
	c := New()
	c.ModelsDir = func() string { return dir }
	return c, srv.URL
}

func TestABareModelRunsWithItsFamilysEverything(t *testing.T) {
	dir := forgeModelsDir(t)
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)
	_, err := c.a1111Generate(context.Background(), base, GenerateRequest{
		Prompt: "a fox", Checkpoint: "anima-base.safetensors [abc]", Width: 832, Height: 1216, Count: 1, Seed: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	run := f.last(t)
	mods, _ := run["override_settings"].(map[string]any)["forge_additional_modules"].([]any)
	if len(mods) != 2 || mods[0] != "qwen_3_06b_base.safetensors" || mods[1] != "qwen_image_vae.safetensors" {
		t.Errorf("modules: %v", mods)
	}
	if run["sampler_name"] != "ER SDE" || run["scheduler"] != "Beta" {
		t.Errorf("sampler: %v %v", run["sampler_name"], run["scheduler"])
	}
	if run["steps"] != float64(32) || run["cfg_scale"] != float64(4) || run["distilled_cfg_scale"] != float64(3) {
		t.Errorf("numbers: %v %v %v", run["steps"], run["cfg_scale"], run["distilled_cfg_scale"])
	}
}

func TestAWholeCheckpointClearsWhateverForgesUIWasLeftOn(t *testing.T) {
	dir := forgeModelsDir(t)
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)
	if _, err := c.a1111Generate(context.Background(), base, GenerateRequest{Prompt: "a fox", Checkpoint: "myXL.safetensors [abc]", Count: 1, Seed: 1, Steps: 20, CfgScale: 6}); err != nil {
		t.Fatal(err)
	}
	run := f.last(t)
	mods, ok := run["override_settings"].(map[string]any)["forge_additional_modules"].([]any)
	if !ok || len(mods) != 0 {
		t.Errorf("an SDXL run should send an empty list, got %#v", run["override_settings"])
	}
	if _, ok := run["distilled_cfg_scale"]; ok {
		t.Error("SDXL has no shift to send")
	}
	if run["steps"] != float64(20) || run["cfg_scale"] != float64(6) {
		t.Errorf("the person's numbers were changed: %v %v", run["steps"], run["cfg_scale"])
	}
}

func TestAVaePickedInTheStudioIsTheFamilysVae(t *testing.T) {
	dir := forgeModelsDir(t)
	writeSafetensors(t, filepath.Join(dir, "VAE", "my_finetuned.safetensors"), keysOf([]int64{1}, "x"), nil)
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)
	_, err := c.a1111Generate(context.Background(), base, GenerateRequest{
		Prompt: "a fox", Checkpoint: "anima-base.safetensors [abc]", Count: 1, VAE: "my_finetuned.safetensors",
	})
	if err != nil {
		t.Fatal(err)
	}
	over := f.last(t)["override_settings"].(map[string]any)
	mods := over["forge_additional_modules"].([]any)
	if len(mods) != 2 || mods[1] != "my_finetuned.safetensors" {
		t.Errorf("modules: %v", mods)
	}
	if _, ok := over["sd_vae"]; ok {
		t.Error("sent twice, it would load over the module")
	}
}

func TestAWholeCheckpointStillTakesAVaeTheOldWay(t *testing.T) {
	dir := forgeModelsDir(t)
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)
	_, err := c.a1111Generate(context.Background(), base, GenerateRequest{
		Prompt: "a fox", Checkpoint: "myXL.safetensors [abc]", Count: 1, Steps: 20, CfgScale: 6, VAE: "qwen_image_vae.safetensors",
	})
	if err != nil {
		t.Fatal(err)
	}
	if over := f.last(t)["override_settings"].(map[string]any); over["sd_vae"] != "qwen_image_vae.safetensors" {
		t.Errorf("settings: %v", over)
	}
}

func TestARunThatDidNotChooseItsNumbersTakesTheFamilys(t *testing.T) {
	dir := forgeModelsDir(t)
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)
	_, err := c.a1111Generate(context.Background(), base, GenerateRequest{
		Prompt: "a fox", Checkpoint: "anima-base.safetensors [abc]", Count: 1, Seed: 1, Steps: 28, CfgScale: 7, Sampler: "dpmpp_2m_k",
		Forge: ForgeRun{ModelSettings: true},
	})
	if err != nil {
		t.Fatal(err)
	}
	run := f.last(t)
	if run["steps"] != float64(32) || run["cfg_scale"] != float64(4) || run["sampler_name"] != "ER SDE" {
		t.Errorf("got %v %v %v", run["steps"], run["cfg_scale"], run["sampler_name"])
	}
}

func TestARunSaysWhatIsMissingRatherThanFailingToLoad(t *testing.T) {
	dir := forgeModelsDir(t)
	os.Remove(filepath.Join(dir, "text_encoder", "qwen_3_06b_base.safetensors"))
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)
	_, err := c.a1111Generate(context.Background(), base, GenerateRequest{Prompt: "a fox", Checkpoint: "anima-base.safetensors [abc]", Count: 1})
	var missing *MissingModulesError
	if !errors.As(err, &missing) {
		t.Fatalf("got %v", err)
	}
	if !strings.Contains(err.Error(), "Qwen3 0.6B") || len(f.runs) != 0 {
		t.Fatalf("%v, %d runs", err, len(f.runs))
	}
}

func TestAFileForgeHasNotReadYetIsToldApartFromOneThatIsNotThere(t *testing.T) {
	dir := forgeModelsDir(t)
	f := &neoFake{}
	srv := f.serve(t, t.TempDir()) // Forge's list is empty; the folder here is not.
	c := New()
	c.ModelsDir = func() string { return dir }
	missing := []ModuleSlot{vaeQwen}
	if !c.allOnDisk(missing) {
		t.Fatal("the file is in the folder")
	}
	e := &MissingModulesError{Family: FamilyAnima, Missing: missing, OnDisk: true}
	if !strings.Contains(e.Error(), "Restart Forge") {
		t.Fatal(e.Error())
	}
	_ = srv
}

func TestRefinerArgumentsGoInTheScriptWhereTheScriptIsLoaded(t *testing.T) {
	dir := forgeModelsDir(t)
	f := &neoFake{scripts: []string{"refiner", "spectrum integrated"}}
	c, base := forgeClient(t, dir, f)
	_, err := c.a1111Generate(context.Background(), base, GenerateRequest{
		Prompt: "a fox", Checkpoint: "myXL.safetensors [abc]", Count: 1, Steps: 20, CfgScale: 6,
		Forge: ForgeRun{Refiner: "other", RefinerAt: 0.8, Spectrum: true, Sparse: true},
	})
	if err != nil {
		t.Fatal(err)
	}
	scripts := f.last(t)["alwayson_scripts"].(map[string]any)
	args := scripts["Refiner"].(map[string]any)["args"].([]any)
	if args[0] != true || args[1] != "other" {
		t.Errorf("refiner: %v", args)
	}
	// Forge saves this argument as its setting, so it must never go out blank.
	if !strings.Contains(args[4].(string), "high_noise=low_noise") {
		t.Errorf("rules: %q", args[4])
	}
	if _, ok := scripts["Spectrum Integrated"]; !ok {
		t.Error("Spectrum was asked for and is loaded")
	}
	if _, ok := scripts["Sparse Attention Integrated"]; ok {
		t.Error("a script that is not loaded fails the whole run with a 422")
	}
}

func TestReferencePicturesGoThroughImageStitch(t *testing.T) {
	dir := forgeModelsDir(t)
	f := &neoFake{scripts: []string{"imagestitch integrated"}}
	c, base := forgeClient(t, dir, f)
	_, err := c.a1111Generate(context.Background(), base, GenerateRequest{
		Prompt: "her in a red dress", Checkpoint: "anima-base.safetensors [abc]", Count: 1, InitImage: []byte("start"),
		Forge: ForgeRun{AsReference: true, References: [][]byte{[]byte("one"), []byte("two")}},
	})
	if err != nil {
		t.Fatal(err)
	}
	run := f.last(t)
	if run["override_settings"].(map[string]any)["anima_do_reference"] != true {
		t.Errorf("settings: %v", run["override_settings"])
	}
	args := run["alwayson_scripts"].(map[string]any)["ImageStitch Integrated"].(map[string]any)["args"].([]any)
	if args[0] != true || len(args[1].([]any)) != 2 {
		t.Errorf("stitch: %v", args)
	}
}

func TestWanRefinerRulesCarryEachHalfAcross(t *testing.T) {
	got := wanRefinerRules([]WanLora{
		{Name: "both", Weight: 1}, {Name: "x_high", Weight: 0.8, Stage: "high"}, {Name: "x_low", Weight: 0.9, Stage: "low"},
	})
	want := "-x_high\nx_low+0.9\n" + forgeRefinerRules
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
	if rules := wanRefinerRules(nil); rules != forgeRefinerRules {
		t.Fatalf("no rules should leave Forge's default: %q", rules)
	}
}

func TestWanMainPassLeavesTheLowHalvesOut(t *testing.T) {
	got := wanMainLoras([]WanLora{
		{Name: "both.safetensors", Weight: 1}, {Name: "x_high", Weight: 0.8, Stage: "high"},
		{Name: "x_low", Weight: 0.9, Stage: "low"}, {Name: "off", Weight: 0},
	})
	want := []LoraWeight{{Name: "both", Weight: 1}, {Name: "x_high", Weight: 0.8}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %+v", got)
	}
}

func TestStatusSaysWhatEachFamilyStillNeeds(t *testing.T) {
	dir := forgeModelsDir(t)
	os.Remove(filepath.Join(dir, "VAE", "qwen_image_vae.safetensors"))
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)
	ctx := context.Background()
	models, err := c.Models(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	byName := map[string]Model{}
	for _, m := range models {
		byName[m.Name] = m
	}
	if m := byName["anima-base"]; m.Family != FamilyAnima || m.Base != "Anima" || m.Bundled {
		t.Errorf("anima: %+v", m)
	}
	if m := byName["anima-base"]; m.Defaults == nil || m.Defaults.Steps != 32 || m.Defaults.Scheduler != "ER SDE" {
		t.Errorf("anima's defaults: %+v", m.Defaults)
	}
	if m := byName["myXL"]; m.Family != FamilySDXL || !m.Bundled || m.Defaults != nil {
		t.Errorf("an SDXL checkpoint keeps its own numbers: %+v", m)
	}
	mods, err := c.ForgeModules(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	var anima FamilyStatus
	for _, st := range c.ForgeFamilies(ctx, base, models, mods) {
		if st.ID == FamilyAnima {
			anima = st
		}
	}
	if anima.Ready || len(anima.Needs) != 2 {
		t.Fatalf("anima: %+v", anima)
	}
	if len(anima.Needs[0].Have) != 1 || len(anima.Needs[1].Have) != 0 || anima.Needs[1].Get.Name != "qwen_image_vae.safetensors" {
		t.Fatalf("needs: %+v", anima.Needs)
	}
}

func TestATrainingRunIsGivenFullFilesEvenBesideACutDownOne(t *testing.T) {
	dir := forgeModelsDir(t)
	writeSafetensors(t, filepath.Join(dir, "text_encoder", "qwen_3_06b_fp8_scaled.safetensors"), keysOf([]int64{1}, "x"), nil)
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)
	family, _, files, err := c.TrainModules(context.Background(), base, "anima-base.safetensors [abc]")
	if err != nil {
		t.Fatal(err)
	}
	if family != FamilyAnima || len(files) != 2 {
		t.Fatalf("%q %+v", family, files)
	}
	if files[0].Role != "qwen3" || files[0].Key != "text_encoder/qwen_3_06b_base.safetensors" || files[0].Local == "" {
		t.Errorf("text encoder: %+v", files[0])
	}
	if files[1].Role != "vae" || files[1].Key != "VAE/qwen_image_vae.safetensors" {
		t.Errorf("VAE: %+v", files[1])
	}
}

// roundTrip stands in for Hugging Face, answering every download with a few bytes.
type roundTrip func(*http.Request) (*http.Response, error)

func (f roundTrip) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestGettingModulesFetchesOnlyWhatIsMissingAndWhereForgeLooks(t *testing.T) {
	dir := forgeModelsDir(t)
	os.Remove(filepath.Join(dir, "text_encoder", "qwen_3_06b_base.safetensors"))
	f := &neoFake{}
	c, base := forgeClient(t, dir, f)

	var mu sync.Mutex
	asked := []string{}
	was := downloadHTTP.Transport
	downloadHTTP.Transport = roundTrip(func(r *http.Request) (*http.Response, error) {
		mu.Lock()
		asked = append(asked, r.URL.Path)
		mu.Unlock()
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader("weights")), ContentLength: 7, Request: r}, nil
	})
	t.Cleanup(func() { downloadHTTP.Transport = was })

	jobs, err := c.GetModules(context.Background(), base, FamilyAnima)
	if err != nil {
		t.Fatal(err)
	}
	if len(jobs) != 1 {
		t.Fatalf("the VAE is there already; %d jobs", len(jobs))
	}
	target := filepath.Join(dir, "text_encoder", "qwen_3_06b_base.safetensors")
	for i := 0; i < 200; i++ {
		if _, err := os.Stat(target); err == nil {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if data, err := os.ReadFile(target); err != nil || string(data) != "weights" {
		t.Fatalf("%q, %v", data, err)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(asked) != 1 || !strings.HasSuffix(asked[0], "/qwen_3_06b_base.safetensors") {
		t.Fatalf("asked for %v", asked)
	}
}

func TestAClipsFramesBecomeAVideo(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("no ffmpeg here")
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewRGBA(image.Rect(0, 0, 32, 32))); err != nil {
		t.Fatal(err)
	}
	video, err := framesToVideo(context.Background(), [][]byte{buf.Bytes(), buf.Bytes(), buf.Bytes()}, 16)
	if err != nil {
		t.Fatal(err)
	}
	if len(video) < 12 || string(video[4:8]) != "ftyp" {
		t.Fatalf("not an MP4: %d bytes", len(video))
	}
}

func TestEveryModuleDownloadIsAFileNotAPage(t *testing.T) {
	for _, f := range Families() {
		for _, s := range f.Slots {
			if !strings.Contains(s.Get.URL, "/resolve/") || !strings.HasSuffix(s.Get.URL, s.Get.Name) {
				t.Errorf("%s %s: %s", f.ID, s.Label, s.Get.URL)
			}
			if !s.Matches(s.Get.Name) {
				t.Errorf("%s %s would not recognise its own download, %s", f.ID, s.Label, s.Get.Name)
			}
		}
	}
}
