package imagegen

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func adetailerTabs(t *testing.T, body map[string]any) []map[string]any {
	t.Helper()
	scripts, _ := body["alwayson_scripts"].(map[string]any)
	ad, _ := scripts["ADetailer"].(map[string]any)
	args, _ := ad["args"].([]any)
	if len(args) < 2 {
		t.Fatalf("no ADetailer args in %#v", body)
	}
	var tabs []map[string]any
	for _, a := range args[2:] {
		tabs = append(tabs, a.(map[string]any))
	}
	return tabs
}

func TestACustomPassIsATabOfItsOwnAfterTheFacesWithItsOwnDetectorPromptAndLoras(t *testing.T) {
	got := map[string]map[string]any{}
	srv := recordingA1111(t, got)
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "portrait", Steps: 20, Width: 512, Height: 512, CfgScale: 7, Seed: 1, Count: 1,
		Detailer: Detailer{
			Enabled: true, Models: []string{"face_yolov8n.pt"}, Prompt: "detailed face", NegativePrompt: "blurry",
			Confidence: 0.3, Denoise: 0.4,
			Custom: []DetailerPass{
				{Model: "nipples_yolov8s-seg.pt", Prompt: "detailed nipples", Loras: []LoraWeight{{Name: "nip_detail", Weight: 0.7}}, Denoise: 0.35},
				{Model: "  "},
			},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	tabs := adetailerTabs(t, got["/sdapi/v1/txt2img"])
	if len(tabs) != 2 {
		t.Fatalf("tabs = %#v; want the face pass and the one custom pass with a detector", tabs)
	}
	custom := tabs[1]
	if custom["ad_model"] != "nipples_yolov8s-seg.pt" || custom["ad_prompt"] != "detailed nipples <lora:nip_detail:0.7>" {
		t.Fatalf("custom tab = %#v", custom)
	}
	if custom["ad_denoising_strength"] != 0.35 || custom["ad_confidence"] != 0.3 || custom["ad_negative_prompt"] != "blurry" {
		t.Fatalf("the pass's own denoise, and the detailer's confidence and negative where it has none: %#v", custom)
	}
	overrides, _ := got["/sdapi/v1/txt2img"]["override_settings"].(map[string]any)
	if _, raised := overrides["ad_max_models"]; raised {
		t.Fatal("two tabs fit ADetailer's default; its setting is left alone")
	}
}

func TestMorePassesThanADetailerShowsRaiseItsMaxModelsForTheRun(t *testing.T) {
	got := map[string]map[string]any{}
	srv := recordingA1111(t, got)
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "x", Steps: 20, Width: 512, Height: 512, CfgScale: 7, Seed: 1, Count: 1,
		Detailer: Detailer{Enabled: true, Models: []string{"face_yolov8n.pt", "hand_yolov8n.pt"},
			Custom: []DetailerPass{{Model: "a.pt"}, {Model: "b.pt"}}},
	})
	if err != nil {
		t.Fatal(err)
	}
	body := got["/sdapi/v1/txt2img"]
	if n := body["override_settings"].(map[string]any)["ad_max_models"]; n != float64(4) || body["override_settings_restore_afterwards"] != true {
		t.Fatalf("override = %#v", body["override_settings"])
	}
}

func TestACustomPassWithNoPromptRedoesItsPartWithTheDetailersPrompt(t *testing.T) {
	args := a1111DetailerArgs(GenerateRequest{Detailer: Detailer{
		Enabled: true, Prompt: "masterpiece", Custom: []DetailerPass{{Model: "pussyV2.pt"}},
	}})
	tab := args[2].(map[string]any)
	if tab["ad_prompt"] != "masterpiece" {
		t.Fatalf("tab = %#v", tab)
	}
}

func TestPeopleSideBySideAreWrittenInRegionalPrompterKeywordsWithTheirLorasInLatentMode(t *testing.T) {
	got := map[string]map[string]any{}
	srv := recordingA1111(t, got)
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "2girls, beach", Steps: 20, Width: 1024, Height: 768, CfgScale: 7, Seed: 1, Count: 1,
		Loras: []LoraWeight{{Name: "style", Weight: 0.6}},
		Regions: Regions{Enabled: true, Parts: []RegionPart{
			{Prompt: "red hair", Loras: []LoraWeight{{Name: "alice", Weight: 0.8}}, Share: 2},
			{Prompt: "black hair", Loras: []LoraWeight{{Name: "bea", Weight: 0.9}}},
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	body := got["/sdapi/v1/txt2img"]
	want := "2girls, beach <lora:style:0.6> ADDCOMM red hair <lora:alice:0.8> ADDCOL black hair <lora:bea:0.9>"
	if body["prompt"] != want {
		t.Fatalf("prompt = %q\nwant     %q", body["prompt"], want)
	}
	args := body["alwayson_scripts"].(map[string]any)["Regional Prompter"].(map[string]any)["args"].([]any)
	if len(args) != 20 || args[0] != true || args[6] != "2,1" || args[11] != "Latent" {
		t.Fatalf("args = %#v", args)
	}
	if args[9] != false {
		t.Fatal("ADDCOMM turns the common part on; the flag as well would split it off twice")
	}
}

func TestStackedPeopleAreSplitIntoRowsAndWithoutLorasDrawnInAttentionMode(t *testing.T) {
	r := Regions{Enabled: true, Rows: true, Parts: []RegionPart{{Prompt: "a"}, {Prompt: "b"}, {Prompt: "c"}}}
	if p := regionalPrompt("sky", r); p != "sky ADDCOMM a ADDROW b ADDROW c" {
		t.Fatalf("prompt = %q", p)
	}
	args := regionalArgs(r)
	if args[3] != "Rows" || args[6] != "1,1,1" || args[11] != "Attention" {
		t.Fatalf("args = %#v", args)
	}
}

func TestOnePersonIsNotSplitAtAll(t *testing.T) {
	got := map[string]map[string]any{}
	srv := recordingA1111(t, got)
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "1girl", Steps: 20, Width: 512, Height: 512, CfgScale: 7, Seed: 1, Count: 1,
		Regions: Regions{Enabled: true, Parts: []RegionPart{{Prompt: "red hair"}}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got["/sdapi/v1/txt2img"]["prompt"] != "1girl" || got["/sdapi/v1/txt2img"]["alwayson_scripts"] != nil {
		t.Fatalf("body = %#v", got["/sdapi/v1/txt2img"])
	}
}

func TestEachFaceIsHandedItsPersonsPromptLeftToRightAndHandsAreNot(t *testing.T) {
	got := map[string]map[string]any{}
	srv := recordingA1111(t, got)
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "2girls", Steps: 20, Width: 1024, Height: 768, CfgScale: 7, Seed: 1, Count: 1,
		Detailer: Detailer{
			Enabled: true, Models: []string{"face_yolov8n.pt", "hand_yolov8n.pt"}, Prompt: "2girls",
			FacePrompts: []string{"red hair <lora:alice:0.8>", "black hair <lora:bea:0.9>"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	body := got["/sdapi/v1/txt2img"]
	tabs := adetailerTabs(t, body)
	if tabs[0]["ad_prompt"] != "red hair <lora:alice:0.8> [SEP] black hair <lora:bea:0.9>" {
		t.Fatalf("face tab = %#v", tabs[0])
	}
	if tabs[1]["ad_prompt"] != "2girls" {
		t.Fatalf("hand tab = %#v", tabs[1])
	}
	if s := body["override_settings"].(map[string]any)["ad_bbox_sortby"]; s != "Position (left to right)" {
		t.Fatalf("sort = %v", s)
	}
}

func TestADetailersNoneIsNotListedAsADetector(t *testing.T) {
	srv := recordingA1111(t, map[string]map[string]any{})
	c := New()
	names, err := c.Detectors(context.Background(), srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	if fmt.Sprint(names) != "[face_yolov8n.pt hand_yolov8n.pt nipples_yolov8s-seg.pt]" {
		t.Fatalf("detectors = %v", names)
	}
	if !c.SupportsRegions(context.Background(), srv.URL) {
		t.Fatal("Regional Prompter is listed in lower case and was not found")
	}
}

func TestInvokeAIRefusesPeopleInPartsAndCustomPassesRatherThanIgnoringThem(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/app/version" {
			fmt.Fprint(w, `{"version":"5.6.0"}`)
			return
		}
		t.Errorf("nothing is sent once it is refused: %s", r.URL.Path)
		http.NotFound(w, r)
	}))
	defer srv.Close()
	for _, req := range []GenerateRequest{
		{Prompt: "x", Regions: Regions{Enabled: true, Parts: []RegionPart{{Prompt: "a"}, {Prompt: "b"}}}},
		{Prompt: "x", Detailer: Detailer{Enabled: true, Custom: []DetailerPass{{Model: "pussyV2.pt"}}}},
	} {
		if _, err := New().Generate(context.Background(), srv.URL, req); !errors.Is(err, ErrRegionsUnsupported) {
			t.Fatalf("err = %v", err)
		}
	}
	if !strings.Contains(ErrRegionsUnsupported.Error(), "Regional Prompter") {
		t.Fatal("the error should name what to install")
	}
}

func TestCustomPassesAloneAreRunWithoutAFacePassAddedToThem(t *testing.T) {
	args := a1111DetailerArgs(GenerateRequest{Detailer: Detailer{
		Enabled: true, Custom: []DetailerPass{{Model: "pussyV2.pt"}},
	}})
	if len(args) != 3 || args[2].(map[string]any)["ad_model"] != "pussyV2.pt" {
		t.Fatalf("args = %#v", args)
	}
}
