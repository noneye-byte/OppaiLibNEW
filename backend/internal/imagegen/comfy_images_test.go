package imagegen

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

// fakeComfy serves what a picture needs of ComfyUI and keeps the graphs it was sent.
type fakeComfy struct {
	mu     sync.Mutex
	graphs []map[string]any
	checks []string
	loras  []string
}

func (f *fakeComfy) server(t *testing.T) *httptest.Server {
	t.Helper()
	combo := func(input string, names []string) map[string]any {
		return map[string]any{"input": map[string]any{"required": map[string]any{input: []any{names}}}}
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /system_stats", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"system": map[string]any{"os": "posix"}, "devices": []any{}})
	})
	mux.HandleFunc("GET /object_info/{class}", func(w http.ResponseWriter, r *http.Request) {
		class := r.PathValue("class")
		var node map[string]any
		switch class {
		case "CheckpointLoaderSimple":
			node = combo("ckpt_name", []string{"pony.safetensors", "wan2.2_i2v_aio.safetensors"})
		case "LoraLoader":
			node = combo("lora_name", f.loras)
		case "VAELoader":
			node = combo("vae_name", []string{"sdxl.safetensors"})
		case "UpscaleModelLoader":
			node = combo("model_name", []string{"4x-UltraSharp.pth"})
		}
		_ = json.NewEncoder(w).Encode(map[string]any{class: node})
	})
	mux.HandleFunc("POST /upload/image", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"name": fmt.Sprintf("up%d.png", len(f.checks)), "subfolder": ""})
		f.checks = append(f.checks, "upload")
	})
	mux.HandleFunc("POST /prompt", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Prompt map[string]any `json:"prompt"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		f.graphs = append(f.graphs, body.Prompt)
		id := fmt.Sprintf("p%d", len(f.graphs))
		f.mu.Unlock()
		_ = json.NewEncoder(w).Encode(map[string]any{"prompt_id": id})
	})
	mux.HandleFunc("GET /history/{id}", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{r.PathValue("id"): map[string]any{
			"status":  map[string]any{"status_str": "success"},
			"outputs": map[string]any{"9": map[string]any{"images": []any{map[string]any{"filename": "x.png", "subfolder": "oppailib", "type": "output"}}}},
		}})
	})
	mux.HandleFunc("GET /view", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = io.WriteString(w, "\x89PNG\r\n\x1a\nnot really")
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

// nodesOf collects a graph's nodes by class.
func nodesOf(graph map[string]any) map[string][]map[string]any {
	out := map[string][]map[string]any{}
	for _, raw := range graph {
		node := raw.(map[string]any)
		out[node["class_type"].(string)] = append(out[node["class_type"].(string)], node["inputs"].(map[string]any))
	}
	return out
}

func comfyClient(t *testing.T) (*Client, *fakeComfy, string) {
	t.Helper()
	f := &fakeComfy{loras: []string{"styles/ink.safetensors", "lightx2v_high.safetensors"}}
	srv := f.server(t)
	c := New()
	c.HashCachePath = filepath.Join(t.TempDir(), "hashes.json")
	return c, f, srv.URL
}

func picture() ComfyPicture {
	return ComfyPicture{
		Prompt: "her", Negative: "bad", Checkpoint: "pony.safetensors", Sampler: "DPM++ 2M Karras",
		Steps: 25, CFG: 7, Width: 832, Height: 1216, Seed: 5, Prefix: "oppailib/x",
	}
}

func TestComfyUIIsDetectedByItsStats(t *testing.T) {
	c, _, base := comfyClient(t)
	if kind, err := c.Backend(context.Background(), base); err != nil || kind != KindComfy {
		t.Fatalf("kind = %q, err = %v", kind, err)
	}
}

func TestATextPictureIsACheckpointAPromptAndASave(t *testing.T) {
	graph, err := BuildPictureGraph(picture())
	if err != nil {
		t.Fatal(err)
	}
	n := nodesOf(graph)
	for _, class := range []string{"CheckpointLoaderSimple", "EmptyLatentImage", "KSampler", "VAEDecode", "SaveImage"} {
		if len(n[class]) != 1 {
			t.Fatalf("%s: %d nodes", class, len(n[class]))
		}
	}
	if len(n["CLIPTextEncode"]) != 2 {
		t.Fatalf("prompts: %d", len(n["CLIPTextEncode"]))
	}
	k := n["KSampler"][0]
	if k["sampler_name"] != "dpmpp_2m" || k["scheduler"] != "karras" || k["denoise"] != 1.0 {
		t.Fatalf("sampler = %v", k)
	}
}

func TestEveryNodeInAPictureComesWithComfyUI(t *testing.T) {
	// The whole point: nothing here may need a custom node, however the run is asked for.
	core := map[string]bool{"RescaleCFG": true}
	for _, class := range comfyPictureNodes {
		core[class] = true
	}
	full := picture()
	full.VAE, full.ClipSkip, full.CFGRescale = "sdxl.safetensors", 2, 0.7
	full.Loras = []LoraWeight{{Name: "ink.safetensors", Weight: 0.8}}
	full.Upscale = Upscale{Enabled: true, Upscaler: "4x-UltraSharp.pth", Scale: 1.5, Denoise: 0.4}
	painted := picture()
	painted.Inputs = comfyPictureInputs{Image: "a.png", Mask: "b.png"}
	for _, p := range []ComfyPicture{picture(), full, painted} {
		graph, err := BuildPictureGraph(p)
		if err != nil {
			t.Fatal(err)
		}
		for class := range nodesOf(graph) {
			if !core[class] {
				t.Fatalf("%s is not a core node", class)
			}
		}
	}
}

func TestALoRAGoesOnTheModelAndTheEncoderBoth(t *testing.T) {
	p := picture()
	p.Loras = []LoraWeight{{Name: "a.safetensors", Weight: 0.8}, {Name: "b.safetensors", Weight: 1.2}}
	graph, _ := BuildPictureGraph(p)
	n := nodesOf(graph)
	if len(n["LoraLoader"]) != 2 {
		t.Fatalf("%d LoRA nodes", len(n["LoraLoader"]))
	}
	for _, l := range n["LoraLoader"] {
		if l["strength_model"] != l["strength_clip"] {
			t.Fatalf("lora = %v", l)
		}
	}
}

func TestClipSkipCountsFromTheEnd(t *testing.T) {
	p := picture()
	p.ClipSkip = 2
	graph, _ := BuildPictureGraph(p)
	if got := nodesOf(graph)["CLIPSetLastLayer"][0]["stop_at_clip_layer"]; got != -2 {
		t.Fatalf("stop = %v", got)
	}
}

func TestAPictureStartedFromAPictureDenoisesAsAsked(t *testing.T) {
	p := picture()
	p.Inputs.Image, p.Denoise = "up.png", 0.35
	graph, _ := BuildPictureGraph(p)
	n := nodesOf(graph)
	if len(n["EmptyLatentImage"]) != 0 || len(n["VAEEncode"]) != 1 {
		t.Fatalf("nodes = %v", n)
	}
	if got := n["KSampler"][0]["denoise"]; got != 0.35 {
		t.Fatalf("denoise = %v", got)
	}
}

func TestRepaintingPastesTheRestBackPixelForPixel(t *testing.T) {
	p := picture()
	p.Inputs = comfyPictureInputs{Image: "up.png", Mask: "mask.png"}
	graph, _ := BuildPictureGraph(p)
	n := nodesOf(graph)
	if len(n["SetLatentNoiseMask"]) != 1 || len(n["ImageCompositeMasked"]) != 1 {
		t.Fatalf("nodes = %v", n)
	}
}

func TestAHiresFixIsASecondSamplerOnTheFirst(t *testing.T) {
	for name, upscaler := range map[string]string{"latent": "Latent", "model": "4x-UltraSharp.pth"} {
		p := picture()
		p.Upscale = Upscale{Enabled: true, Upscaler: upscaler, Scale: 1.5, Denoise: 0.4, Steps: 12}
		graph, _ := BuildPictureGraph(p)
		n := nodesOf(graph)
		if len(n["KSampler"]) != 2 {
			t.Fatalf("%s: %d samplers", name, len(n["KSampler"]))
		}
		if name == "model" && len(n["ImageUpscaleWithModel"]) != 1 {
			t.Fatalf("no upscale model in %v", n)
		}
		if name == "latent" && len(n["LatentUpscaleBy"]) != 1 {
			t.Fatalf("no latent upscale in %v", n)
		}
	}
}

func TestSamplerNamesAreTranslated(t *testing.T) {
	for in, want := range map[string][2]string{
		"Euler a": {"euler_ancestral", "normal"}, "DPM++ 2M Karras": {"dpmpp_2m", "karras"},
		"DPM++ 2M SDE Karras": {"dpmpp_2m_sde", "karras"}, "DPM++ SDE": {"dpmpp_sde", "normal"},
		"dpmpp_2m_k": {"dpmpp_2m", "karras"}, "euler_ancestral": {"euler_ancestral", "normal"},
		"": {"dpmpp_2m", "karras"}, "UniPC": {"uni_pc", "normal"},
	} {
		s, sch := comfySampler(in)
		if s != want[0] || sch != want[1] {
			t.Fatalf("%q = %s, %s", in, s, sch)
		}
	}
}

func TestLoRAsWrittenInAPromptBecomeLoRAs(t *testing.T) {
	text, loras := comfyPrompt("her, smiling <lora:ink:0.7> BREAK outdoors")
	if strings.Contains(text, "<lora") || strings.Contains(text, "BREAK") {
		t.Fatalf("text = %q", text)
	}
	if len(loras) != 1 || loras[0].Name != "ink" || loras[0].Weight != 0.7 {
		t.Fatalf("loras = %v", loras)
	}
}

func TestABatchIsAPictureAtATimeOnASeedOfItsOwn(t *testing.T) {
	c, f, base := comfyClient(t)
	res, err := c.Generate(context.Background(), base, GenerateRequest{
		Prompt: "her", Checkpoint: "pony.safetensors", Sampler: "Euler a", Steps: 20, CfgScale: 7, Width: 512, Height: 512, Seed: 100, Count: 3,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(f.graphs) != 3 || len(res.Images) != 3 {
		t.Fatalf("%d graphs, %d images", len(f.graphs), len(res.Images))
	}
	if res.Seeds[2] != 102 {
		t.Fatalf("seeds = %v", res.Seeds)
	}
	first := nodesOf(f.graphs[0])["SaveImage"][0]["filename_prefix"]
	second := nodesOf(f.graphs[1])["SaveImage"][0]["filename_prefix"]
	if first == second {
		t.Fatal("two runs saved under one name, and ComfyUI skips a graph it has just run")
	}
}

func TestARandomSeedComesBackAsTheOneUsed(t *testing.T) {
	c, _, base := comfyClient(t)
	res, err := c.Generate(context.Background(), base, GenerateRequest{Checkpoint: "pony.safetensors", Width: 512, Height: 512, Seed: -1, Count: 1, Steps: 1})
	if err != nil {
		t.Fatal(err)
	}
	if res.Seed < 0 || res.Seeds[0] != res.Seed {
		t.Fatalf("seed = %d, seeds %v", res.Seed, res.Seeds)
	}
}

func TestAnAutomatic1111NameFindsTheTransferredFile(t *testing.T) {
	c, f, base := comfyClient(t)
	_, err := c.Generate(context.Background(), base, GenerateRequest{
		Checkpoint: "pony.safetensors [abc123]", Loras: []LoraWeight{{Name: "ink", Weight: 0.5}},
		Width: 512, Height: 512, Seed: 1, Count: 1, Steps: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	n := nodesOf(f.graphs[0])
	if n["CheckpointLoaderSimple"][0]["ckpt_name"] != "pony.safetensors" || n["LoraLoader"][0]["lora_name"] != "styles/ink.safetensors" {
		t.Fatalf("nodes = %v", n)
	}
}

func TestAFileComfyUIDoesNotHaveIsSaidByName(t *testing.T) {
	c, _, base := comfyClient(t)
	_, err := c.Generate(context.Background(), base, GenerateRequest{Checkpoint: "gone.safetensors", Width: 512, Height: 512, Seed: 1, Count: 1, Steps: 1})
	if err == nil || !strings.Contains(err.Error(), "gone.safetensors") {
		t.Fatalf("err = %v", err)
	}
}

func TestWhatNeedsCustomNodesSaysSoRatherThanFailing(t *testing.T) {
	c, f, base := comfyClient(t)
	ctx := context.Background()
	if _, err := c.Generate(ctx, base, GenerateRequest{Controls: []ControlUnit{{Module: "reference_only"}}}); !errors.Is(err, ErrControlUnsupported) {
		t.Fatalf("a reference: %v", err)
	}
	if _, err := c.Generate(ctx, base, GenerateRequest{DetailOnly: true}); !errors.Is(err, ErrComfyPictureUnsupported) {
		t.Fatalf("a detail pass: %v", err)
	}
	if len(f.graphs) != 0 {
		t.Fatal("a graph was sent")
	}
	if c.SupportsADetailer(ctx, base) || c.SupportsRegions(ctx, base) {
		t.Fatal("offered what it cannot do")
	}
}

func TestThePickersListPictureFilesAndNotVideoOnes(t *testing.T) {
	c, _, base := comfyClient(t)
	ctx := context.Background()
	models, err := c.Models(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	if len(models) != 1 || models[0].Title != "pony.safetensors" || models[0].Key != "Stable-diffusion/pony.safetensors" {
		t.Fatalf("models = %+v", models)
	}
	loras, err := c.Loras(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	if len(loras) != 1 || loras[0].Key != "Lora/styles/ink.safetensors" {
		t.Fatalf("loras = %+v", loras)
	}
}

func TestSidecarsAreReadFromComfyUIsFolders(t *testing.T) {
	c, _, base := comfyClient(t)
	dirs := ComfyFolders{Checkpoints: t.TempDir(), Loras: t.TempDir(), VAEs: t.TempDir()}
	c.ComfyDirs = func() ComfyFolders { return dirs }
	writeModel(t, filepath.Join(dirs.Loras, "styles", "ink.json"), `{"activation text":"ink style","sd version":"Pony"}`)
	loras, err := c.Loras(context.Background(), base)
	if err != nil {
		t.Fatal(err)
	}
	if len(loras) != 1 || len(loras[0].TriggerPhrases) != 1 || loras[0].TriggerPhrases[0] != "ink style" {
		t.Fatalf("loras = %+v", loras)
	}
}

func TestAKeyCannotClimbOutOfComfyUIsFolder(t *testing.T) {
	home := comfyHome(ComfyFolders{Loras: "/comfy/loras"})
	if got := home.path("Lora/../../etc/passwd"); strings.Contains(filepath.ToSlash(got), "/comfy/loras/") || got != "" {
		t.Fatalf("path = %q", got)
	}
	if got := filepath.ToSlash(home.path("Lora/styles/ink.safetensors")); got != "/comfy/loras/styles/ink.safetensors" {
		t.Fatalf("path = %q", got)
	}
}

func TestCheckpointsForPicturesGoToCheckpoints(t *testing.T) {
	if f, _ := comfyFolderFor(InstallSpec{Type: "Checkpoint", FileName: "pony.safetensors", Pictures: true}); f != "checkpoints" {
		t.Fatalf("folder = %s", f)
	}
	if f, _ := comfyFolderFor(InstallSpec{Type: "Checkpoint", FileName: "wan.safetensors"}); f != "diffusion_models" {
		t.Fatalf("a clip's model moved: %s", f)
	}
}
