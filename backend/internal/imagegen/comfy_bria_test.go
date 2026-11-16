package imagegen

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestBriasCutLoadsTheClipPutsHerOnTheScreenAskedForAndSavesIt(t *testing.T) {
	g := BuildBriaCutGraph("oppailib-1.mp4", "Green", 7)
	if node(t, g, "LoadVideo")["file"] != "oppailib-1.mp4" {
		t.Fatalf("the clip was not loaded: %v", g)
	}
	cut := node(t, g, "BriaRemoveVideoBackground")
	if cut["background_color"] != "Green" || cut["seed"] != int64(7) || classOf(g, cut["video"]) != "LoadVideo" {
		t.Fatalf("cut = %v", cut)
	}
	if save := node(t, g, "SaveVideo"); classOf(g, save["video"]) != "BriaRemoveVideoBackground" {
		t.Fatalf("what is saved is not the cut: %v", save)
	}
}

func TestACutQueuedOverTheAPICarriesTheComfyOrgKeyAndOnlyThatOne(t *testing.T) {
	c, f, base := comfyClient(t)
	if _, err := c.RunBriaCut(context.Background(), base, " comfyui-key ", []byte("clip"), ".mp4", "Blue", nil); err != nil {
		t.Fatal(err)
	}
	if len(f.extras) != 1 || f.extras[0]["api_key_comfy_org"] != "comfyui-key" || len(f.extras[0]) != 1 {
		t.Fatalf("extra_data = %v", f.extras)
	}
	// Every other workflow goes as it always did.
	if _, err := c.RunClipUpscale(context.Background(), base, []byte("clip"), ".mp4", ClipUpscale{Scale: 2}, nil); err != nil {
		t.Fatal(err)
	}
	if f.extras[1] != nil {
		t.Fatalf("an upscale was sent extra_data: %v", f.extras[1])
	}
}

func TestACutWithoutAKeyOrOnAColourOfHersIsNotSent(t *testing.T) {
	c, f, base := comfyClient(t)
	if _, err := c.RunBriaCut(context.Background(), base, "", []byte("clip"), ".mp4", "Green", nil); !errors.Is(err, ErrBriaKey) {
		t.Fatalf("err = %v", err)
	}
	if _, err := c.RunBriaCut(context.Background(), base, "k", []byte("clip"), ".mp4", "White", nil); err == nil {
		t.Fatal("a white screen was asked for")
	}
	if len(f.graphs) != 0 {
		t.Fatalf("%d graphs were queued", len(f.graphs))
	}
}

func TestAComfyUIWithoutTheNodeIsToldToUpdate(t *testing.T) {
	err := briaProblem(errors.New(`ComfyUI refused the workflow: 400: {"error": {"message": "Cannot execute because node BriaRemoveVideoBackground does not exist."}}`))
	if !strings.Contains(err.Error(), "update ComfyUI") {
		t.Fatalf("err = %v", err)
	}
}
