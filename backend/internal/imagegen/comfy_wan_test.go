package imagegen

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// node finds the one node of a class in a built graph, failing when there is not
// exactly one.
func node(t *testing.T, g map[string]any, class string) map[string]any {
	t.Helper()
	var found []map[string]any
	for _, n := range g {
		if m := n.(map[string]any); m["class_type"] == class {
			found = append(found, m["inputs"].(map[string]any))
		}
	}
	if len(found) != 1 {
		t.Fatalf("%d %s nodes in %v", len(found), class, g)
	}
	return found[0]
}

func nodes(g map[string]any, class string) []map[string]any {
	var found []map[string]any
	for _, n := range g {
		if m := n.(map[string]any); m["class_type"] == class {
			found = append(found, m["inputs"].(map[string]any))
		}
	}
	return found
}

// classOf follows a link to the class of the node it comes from.
func classOf(g map[string]any, link any) string {
	l, ok := link.([]any)
	if !ok || len(l) != 2 {
		return ""
	}
	n, _ := g[l[0].(string)].(map[string]any)
	s, _ := n["class_type"].(string)
	return s
}

func inputsOf(g map[string]any, link any) map[string]any {
	return g[link.([]any)[0].(string)].(map[string]any)["inputs"].(map[string]any)
}

var wan22Pair = WanClip{
	Model: "wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors", LowModel: "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors",
	TextEncoder: "umt5_xxl_fp8_e4m3fn_scaled.safetensors", VAE: "wan_2.1_vae.safetensors",
	Image: "start.png", Prompt: "she waves", Width: 480, Height: 832, Frames: 83, FPS: 16, Seed: 42,
}

func TestAWan22PairSplitsTheStepsBetweenTheHighAndLowNoiseExperts(t *testing.T) {
	g, err := BuildWanGraph(wan22Pair)
	if err != nil {
		t.Fatal(err)
	}
	samplers := nodes(g, "KSamplerAdvanced")
	if len(samplers) != 2 {
		t.Fatalf("%d samplers", len(samplers))
	}
	high, low := samplers[0], samplers[1]
	if high["add_noise"] != "enable" {
		high, low = low, high
	}
	if high["start_at_step"] != 0 || high["end_at_step"] != 10 || high["return_with_leftover_noise"] != "enable" {
		t.Fatalf("high = %v", high)
	}
	if low["add_noise"] != "disable" || low["start_at_step"] != 10 || low["steps"] != 20 || low["cfg"] != 3.5 {
		t.Fatalf("low = %v", low)
	}
	if classOf(g, low["latent_image"]) != "KSamplerAdvanced" {
		t.Fatal("the low-noise half does not finish the high-noise half's latent")
	}
	// Each half samples its own expert, shifted.
	for _, s := range []map[string]any{high, low} {
		if classOf(g, s["model"]) != "ModelSamplingSD3" {
			t.Fatalf("sampler model is %s", classOf(g, s["model"]))
		}
	}
	highModel := inputsOf(g, inputsOf(g, high["model"])["model"])["unet_name"]
	lowModel := inputsOf(g, inputsOf(g, low["model"])["model"])["unet_name"]
	if highModel != wan22Pair.Model || lowModel != wan22Pair.LowModel {
		t.Fatalf("high samples %v, low samples %v", highModel, lowModel)
	}
	i2v := node(t, g, "WanImageToVideo")
	if i2v["width"] != 480 || i2v["height"] != 832 || i2v["length"] != 81 || classOf(g, i2v["start_image"]) != "LoadImage" {
		t.Fatalf("i2v = %v", i2v)
	}
	if node(t, g, "LoadImage")["image"] != "start.png" || node(t, g, "CLIPLoader")["type"] != "wan" {
		t.Fatal("the picture or the text encoder is not wired")
	}
	if node(t, g, "CreateVideo")["fps"] != 16.0 || classOf(g, node(t, g, "SaveVideo")["video"]) != "CreateVideo" {
		t.Fatal("the clip is not saved as a video")
	}
}

func TestAPairedLoraGoesOnlyOnItsOwnExpertAndAnUnpairedOneOnBoth(t *testing.T) {
	clip := wan22Pair
	clip.Loras = []WanLora{
		{Name: "lightx2v_high.safetensors", Weight: 1, Stage: "high"},
		{Name: "lightx2v_low.safetensors", Weight: 1, Stage: "low"},
		{Name: "motion.safetensors", Weight: 0.8},
		{Name: "off.safetensors", Weight: 0},
	}
	g, err := BuildWanGraph(clip)
	if err != nil {
		t.Fatal(err)
	}
	// Walk each expert's chain from its loader up to the shift.
	chain := func(unet string) []string {
		var names []string
		for _, shift := range nodes(g, "ModelSamplingSD3") {
			link := shift["model"]
			var here []string
			for classOf(g, link) == "LoraLoaderModelOnly" {
				in := inputsOf(g, link)
				here = append([]string{in["lora_name"].(string)}, here...)
				link = in["model"]
			}
			if inputsOf(g, link)["unet_name"] == unet {
				names = here
			}
		}
		return names
	}
	if got := strings.Join(chain(clip.Model), ","); got != "lightx2v_high.safetensors,motion.safetensors" {
		t.Fatalf("high chain = %s", got)
	}
	if got := strings.Join(chain(clip.LowModel), ","); got != "lightx2v_low.safetensors,motion.safetensors" {
		t.Fatalf("low chain = %s", got)
	}
}

func TestOneModelSamplesOnceWithEveryLora(t *testing.T) {
	g, err := BuildWanGraph(WanClip{
		Model: "wan2.1_t2v_14B.gguf", TextEncoder: "umt5.gguf", VAE: "wan_2.1_vae.safetensors", Prompt: "rain",
		Loras: []WanLora{{Name: "a_high.safetensors", Weight: 1, Stage: "high"}, {Name: "b.safetensors", Weight: 1}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(nodes(g, "KSamplerAdvanced")) != 0 || len(nodes(g, "LoraLoaderModelOnly")) != 2 {
		t.Fatalf("graph = %v", g)
	}
	if node(t, g, "KSampler")["steps"] != 20 || node(t, g, "UnetLoaderGGUF")["unet_name"] != "wan2.1_t2v_14B.gguf" {
		t.Fatal("a GGUF model is not loaded by the GGUF loader")
	}
	if node(t, g, "CLIPLoaderGGUF")["clip_name"] != "umt5.gguf" {
		t.Fatal("a GGUF text encoder is not loaded by the GGUF loader")
	}
	// From words: no picture, and Wan's own negative when none is given.
	if len(nodes(g, "LoadImage")) != 0 || node(t, g, "WanImageToVideo")["width"] != 832 {
		t.Fatal("a clip from words has a picture or no default size")
	}
	negatives := 0
	for _, enc := range nodes(g, "CLIPTextEncode") {
		if enc["text"] == wanNegative {
			negatives++
		}
	}
	if negatives != 1 {
		t.Fatal("Wan's own negative was not used for a blank one")
	}
}

func TestAnAllInOneCheckpointNeedsNothingBesideIt(t *testing.T) {
	if _, err := BuildWanGraph(WanClip{Model: "wan2.2-i2v-rapid-aio.safetensors"}); err == nil {
		t.Fatal("a bare diffusion model with no text encoder or VAE was built")
	}
	g, err := BuildWanGraph(WanClip{Model: "wan2.2-i2v-rapid-aio.safetensors", Checkpoint: true, LowModel: "ignored", Steps: 4, CFG: 1})
	if err != nil {
		t.Fatal(err)
	}
	ks := node(t, g, "KSampler")
	if ks["steps"] != 4 || ks["cfg"] != 1.0 || len(nodes(g, "UNETLoader")) != 0 {
		t.Fatalf("sampler = %v", ks)
	}
	if classOf(g, node(t, g, "VAEDecode")["vae"]) != "CheckpointLoaderSimple" {
		t.Fatal("the checkpoint's own VAE is not used")
	}
}

func TestTheWan22VAEMeansThe5BModelsLatent(t *testing.T) {
	g, err := BuildWanGraph(WanClip{Model: "wan2.2_ti2v_5B_fp16.safetensors", TextEncoder: "umt5.safetensors", VAE: "wan2.2_vae.safetensors", Image: "x.png"})
	if err != nil {
		t.Fatal(err)
	}
	if len(nodes(g, "WanImageToVideo")) != 0 || classOf(g, node(t, g, "Wan22ImageToVideoLatent")["start_image"]) != "LoadImage" {
		t.Fatalf("graph = %v", g)
	}
	if classOf(g, node(t, g, "KSampler")["positive"]) != "CLIPTextEncode" {
		t.Fatal("the 5B model's conditioning should come straight from the prompt")
	}
}

func TestAPictureWithNoSizeKeepsItsShapeAtWansLongSide(t *testing.T) {
	if w, h := longSide(1080, 1920, 832); w != 464 || h != 832 {
		t.Fatalf("portrait = %d×%d", w, h)
	}
	if w, h := longSide(1920, 1080, 832); w != 832 || h != 464 {
		t.Fatalf("landscape = %d×%d", w, h)
	}
}

func TestModelsAreListedFromEachLoaderInEitherSchema(t *testing.T) {
	info := map[string]string{
		"UNETLoader":             `{"UNETLoader":{"input":{"required":{"unet_name":[["high.safetensors","low.safetensors"]],"weight_dtype":[["default"]]}}}}`,
		"UnetLoaderGGUF":         `{"UnetLoaderGGUF":{"input":{"required":{"unet_name":[["high.gguf"]]}}}}`,
		"CheckpointLoaderSimple": `{"CheckpointLoaderSimple":{"input":{"required":{"ckpt_name":["COMBO",{"options":["aio.safetensors"]}]}}}}`,
		"CLIPLoader":             `{"CLIPLoader":{"input":{"required":{"clip_name":[["umt5.safetensors"]]}}}}`,
		"VAELoader":              `{"VAELoader":{"input":{"required":{"vae_name":[["wan_2.1_vae.safetensors"]]}}}}`,
		"LoraLoaderModelOnly":    `{"LoraLoaderModelOnly":{"input":{"required":{"lora_name":[["wan/lightx2v_high.safetensors"]]}}}}`,
		"WanImageToVideo":        `{"WanImageToVideo":{}}`,
		"ModelSamplingSD3":       `{"ModelSamplingSD3":{}}`,
		"CreateVideo":            `{"CreateVideo":{}}`,
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, ok := info[strings.TrimPrefix(r.URL.Path, "/object_info/")]
		if !ok {
			body = "{}"
		}
		_, _ = io.WriteString(w, body)
	}))
	defer srv.Close()
	got, err := New().ListComfyModels(context.Background(), srv.URL+"/")
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(got)
	want := `{"diffusion":["high.safetensors","low.safetensors","high.gguf"],"checkpoints":["aio.safetensors"],` +
		`"textEncoders":["umt5.safetensors"],"vaes":["wan_2.1_vae.safetensors"],"loras":["wan/lightx2v_high.safetensors"],"missing":["SaveVideo"]}`
	if string(raw) != want {
		t.Fatalf("got  %s\nwant %s", raw, want)
	}
}
