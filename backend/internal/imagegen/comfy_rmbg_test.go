package imagegen

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestACutSplitsTheClipCutsEveryFrameOntoTheScreenAndPutsItBackAtItsRate(t *testing.T) {
	m, _ := clipCutModel("BiRefNet_toonout")
	g := BuildClipCutGraph("oppailib-1.mp4", m, "#00FF00")
	if node(t, g, "LoadVideo")["file"] != "oppailib-1.mp4" {
		t.Fatalf("the clip was not loaded: %v", g)
	}
	cut := node(t, g, "BiRefNetRMBG")
	if cut["model"] != "BiRefNet_toonout" || cut["background"] != "Color" || cut["background_color"] != "#00FF00" ||
		cut["unload_model"] != true || classOf(g, cut["image"]) != "GetVideoComponents" {
		t.Fatalf("cut = %v", cut)
	}
	made := node(t, g, "CreateVideo")
	if classOf(g, made["images"]) != "BiRefNetRMBG" || classOf(g, made["fps"]) != "GetVideoComponents" || made["fps"].([]any)[1] != 2 {
		t.Fatalf("the clip is not put back from the cut frames at its own rate: %v", made)
	}
	if save := node(t, g, "SaveVideo"); classOf(g, save["video"]) != "CreateVideo" {
		t.Fatalf("what is saved is not the cut: %v", save)
	}
}

func TestEachModelGoesToTheNodeThatRunsItInThatNodesWords(t *testing.T) {
	ben, _ := clipCutModel("BEN2")
	if cut := node(t, BuildClipCutGraph("c.mp4", ben, "#0000FF"), "RMBG"); cut["model"] != "BEN2" || cut["image"] == nil {
		t.Fatalf("RMBG = %v", cut)
	}
	vr, _ := clipCutModel("VRMBG-3.0")
	cut := node(t, BuildClipCutGraph("c.mp4", vr, "#0000FF"), "AILab_VRMBG")
	if cut["images"] == nil || cut["image"] != nil || cut["model"] != nil || cut["reset_state"] != true {
		t.Fatalf("VRMBG = %v", cut)
	}
}

func TestACutWithAModelOrScreenNotOfferedIsNotSent(t *testing.T) {
	c, f, base := comfyClient(t)
	if _, err := c.RunClipCut(context.Background(), base, []byte("clip"), ".mp4", "u2net", "green", nil); err == nil {
		t.Fatal("an unknown model was sent")
	}
	if _, err := c.RunClipCut(context.Background(), base, []byte("clip"), ".mp4", DefaultClipCutModel, "white", nil); err == nil {
		t.Fatal("a white screen was asked for")
	}
	if len(f.graphs) != 0 {
		t.Fatalf("%d graphs were queued", len(f.graphs))
	}
	if _, err := c.RunClipCut(context.Background(), base, []byte("clip"), ".mp4", DefaultClipCutModel, "blue", nil); err != nil {
		t.Fatal(err)
	}
	if len(f.graphs) != 1 {
		t.Fatalf("%d graphs were queued", len(f.graphs))
	}
}

func TestAComfyUIWithoutThePackIsToldToInstallIt(t *testing.T) {
	m, _ := clipCutModel(DefaultClipCutModel)
	err := clipCutProblem(errors.New(`ComfyUI refused the workflow: 400: {"error": {"message": "Cannot execute because node BiRefNetRMBG does not exist."}}`), m)
	if !strings.Contains(err.Error(), "install ComfyUI-RMBG") {
		t.Fatalf("err = %v", err)
	}
}

func TestVRMBGWithoutItsFilesSaysWhereTheyGo(t *testing.T) {
	m, _ := clipCutModel("VRMBG-3.0")
	err := clipCutProblem(errors.New(`ComfyUI failed: FileNotFoundError: VRMBG-3.0 model files not found, please download manually`), m)
	if !strings.Contains(err.Error(), "models/RMBG/VRMBG-3.0") {
		t.Fatalf("err = %v", err)
	}
}
