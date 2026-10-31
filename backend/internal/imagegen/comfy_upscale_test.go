package imagegen

import (
	"strings"
	"testing"
)

func TestAnUpscaleModelsResultIsResizedToTheClipTimesTheScaleAtItsOwnFrameRate(t *testing.T) {
	g := BuildUpscaleGraph("oppailib-1.mp4", ClipUpscale{Model: "4x-UltraSharp.pth", Scale: 2, Width: 832, Height: 480})
	if node(t, g, "LoadVideo")["file"] != "oppailib-1.mp4" {
		t.Fatalf("the clip was not loaded: %v", g)
	}
	if node(t, g, "UpscaleModelLoader")["model_name"] != "4x-UltraSharp.pth" {
		t.Fatal("the upscale model was not loaded")
	}
	scale := node(t, g, "ImageScale")
	if scale["width"] != 1664 || scale["height"] != 960 || scale["upscale_method"] != "lanczos" {
		t.Fatalf("resized to %v", scale)
	}
	if classOf(g, scale["image"]) != "ImageUpscaleWithModel" {
		t.Fatal("the resize does not take the model's frames")
	}
	video := node(t, g, "CreateVideo")
	if classOf(g, video["fps"]) != "GetVideoComponents" || video["fps"].([]any)[1] != 2 {
		t.Fatalf("the frame rate is not the clip's own: %v", video["fps"])
	}
	if node(t, g, "SaveVideo")["video"] == nil {
		t.Fatal("nothing is saved")
	}
}

func TestWithoutTheClipsSizeAnUpscaleModelsFactorIsReadOffItsName(t *testing.T) {
	g := BuildUpscaleGraph("c.mp4", ClipUpscale{Model: "RealESRGAN_x4plus.pth", Scale: 2})
	if by := node(t, g, "ImageScaleBy")["scale_by"]; by != 0.5 {
		t.Fatalf("a 4× model asked for 2× is scaled by %v", by)
	}
	// A 2× model asked for 2× needs nothing after it.
	if g := BuildUpscaleGraph("c.mp4", ClipUpscale{Model: "2xNomosUni_span.safetensors", Scale: 2}); len(nodes(g, "ImageScaleBy")) != 0 {
		t.Fatalf("a 2× model was resized again: %v", g)
	}
}

func TestWithoutAModelAClipIsOnlyResized(t *testing.T) {
	g := BuildUpscaleGraph("c.webm", ClipUpscale{Scale: 1.5, Width: 480, Height: 832})
	if len(nodes(g, "UpscaleModelLoader")) != 0 {
		t.Fatal("a model was loaded with none picked")
	}
	if s := node(t, g, "ImageScale"); s["width"] != 720 || s["height"] != 1248 {
		t.Fatalf("resized to %v", s)
	}
}

func TestUpscalersSayTheirFactorInTheirNameOrAreTakenAsFour(t *testing.T) {
	for name, want := range map[string]float64{
		"4x-UltraSharp.pth": 4, "RealESRGAN_x2plus.pth": 2, "2xNomosUni_span.safetensors": 2,
		"sub/1x_Deblur.pth": 1, "UltraSharp.pth": 4, "x264_fixer_8x.pth": 8,
	} {
		if got := upscalerFactor(name); got != want {
			t.Errorf("%s: %v, want %v", name, got, want)
		}
	}
}

func TestAnUpscaleSaysWhatEnlargedItAndToWhat(t *testing.T) {
	if got := (ClipUpscale{Model: "upscale/4x-UltraSharp.pth", Scale: 2, Width: 832, Height: 480}).Recipe(); got != "upscaled 2× with 4x-UltraSharp to 1664×960" {
		t.Fatalf("recipe = %q", got)
	}
	if got := (ClipUpscale{Scale: 1.5}).Recipe(); got != "upscaled 1.5× with Lanczos" {
		t.Fatalf("recipe = %q", got)
	}
}

func TestASamplerPickedForAClipIsTheOneItSamplesWithAndIsSaid(t *testing.T) {
	clip := wan22Pair
	clip.Sampler, clip.Scheduler = "uni_pc", "beta"
	g, err := BuildWanGraph(clip)
	if err != nil {
		t.Fatal(err)
	}
	for _, s := range nodes(g, "KSamplerAdvanced") {
		if s["sampler_name"] != "uni_pc" || s["scheduler"] != "beta" {
			t.Fatalf("sampled with %v/%v", s["sampler_name"], s["scheduler"])
		}
	}
	if r := clip.Recipe(); !strings.HasSuffix(r, " · uni_pc/beta") {
		t.Fatalf("recipe = %q", r)
	}
	// Wan's own goes unsaid.
	if r := wan22Pair.Recipe(); strings.Contains(r, "euler") {
		t.Fatalf("recipe = %q", r)
	}
}
