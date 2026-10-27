package api

import (
	"strings"
	"testing"
)

func TestPeopleSideBySideGiveEachFaceTheirOwnWordsAndLoras(t *testing.T) {
	req := generateReq{
		Prompt:   "2girls, beach",
		Detailer: detailerReq{Enabled: true, Models: []string{"face_yolov8n.pt"}, Prompt: "detailed face"},
		Regions: regionsReq{Enabled: true, Parts: []regionPartReq{
			{Prompt: "red hair", Loras: []loraReq{{Name: "<alice>", Weight: 0.8}}},
			{Prompt: "black hair", Loras: []loraReq{{Name: "bea", Weight: 5}}},
		}},
	}
	gen, record, _ := (&Server{}).prepareGenerate(&req)
	if len(gen.Regions.Parts) != 2 || gen.Regions.Parts[0].Loras[0].Name != "alice" || gen.Regions.Parts[1].Loras[0].Weight != 2 {
		t.Fatalf("parts = %#v; LoRA names are cleaned and weights kept in range as the picture's are", gen.Regions.Parts)
	}
	want := []string{"detailed face, red hair <lora:alice:0.8>", "detailed face, black hair <lora:bea:2>"}
	if strings.Join(gen.Detailer.FacePrompts, "|") != strings.Join(want, "|") {
		t.Fatalf("faces = %q", gen.Detailer.FacePrompts)
	}
	if !strings.Contains(record, "Person 2: black hair <lora:bea:2>") {
		t.Fatalf("the save notes should say who was where: %q", record)
	}
}

func TestStackedPeopleLeaveTheFacesToOnePrompt(t *testing.T) {
	// ADetailer can sort its boxes left to right but not top to bottom, so a prompt
	// per face would land on the wrong person.
	req := generateReq{
		Prompt:   "2girls",
		Detailer: detailerReq{Enabled: true},
		Regions:  regionsReq{Enabled: true, Rows: true, Parts: []regionPartReq{{Prompt: "a"}, {Prompt: "b"}}},
	}
	gen, _, _ := (&Server{}).prepareGenerate(&req)
	if len(gen.Detailer.FacePrompts) != 0 || !gen.Regions.Active() {
		t.Fatalf("gen = %#v", gen)
	}
}

func TestACustomDetailPassKeepsItsOwnLorasAndStrengthInRange(t *testing.T) {
	req := generateReq{
		Prompt: "x",
		Detailer: detailerReq{Enabled: true, Custom: []detailerPassReq{
			{Model: "nipples_yolov8s-seg.pt", Prompt: "detailed", Loras: []loraReq{{Name: "nip", Weight: 0.5}}, Denoise: 3},
			{Model: ""},
		}},
	}
	gen, _, _ := (&Server{}).prepareGenerate(&req)
	if len(gen.Detailer.Custom) != 1 {
		t.Fatalf("custom = %#v; a pass with no detector is dropped", gen.Detailer.Custom)
	}
	if p := gen.Detailer.Custom[0]; p.Denoise != 1 || len(p.Loras) != 1 || p.Loras[0].Name != "nip" {
		t.Fatalf("pass = %#v", p)
	}
}
