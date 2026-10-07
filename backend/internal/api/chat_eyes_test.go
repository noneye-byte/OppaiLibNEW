package api

import (
	"encoding/json"
	"testing"
)

func TestTheModelsA32GBCardRunsAreReadAsSeeing(t *testing.T) {
	for name, want := range map[string]bool{
		"Mistral-Small-3.2-24B-Instruct-2506-Q6_K.gguf": true,
		"Qwen2.5-VL-32B-Instruct-abliterated":           true,
		"gemma-3-27b-it-Q5_K_M":                         true,
		"Llama-3.2-11B-Vision-Instruct":                 true,
		// Text-only builds, including the obedient small ones this was first run on.
		"Qwen3-32B-abliterated-Q4_K_M":     false,
		"OpenHermes-2.5-Mistral-7B.Q5_K_M": false,
		"Mistral-Small-24B-Instruct-2501":  false,
		"":                                 false,
		"Devil-VLAD-12B-Q6_K":              false,
	} {
		if got := chatSeesPictures("", name); got != want {
			t.Errorf("auto on %q = %v, want %v", name, got, want)
		}
	}
}

func TestTheSettingOverridesWhatTheNameSays(t *testing.T) {
	if !chatSeesPictures("on", "OpenHermes-2.5-Mistral-7B") {
		t.Error("on did not win over a text-only name")
	}
	if chatSeesPictures("off", "Qwen2.5-VL-32B") {
		t.Error("off did not win over a vision name")
	}
}

func TestAnEightKWindowSeesOnePictureAndAThirtyTwoKWindowSeesSix(t *testing.T) {
	for limit, want := range map[int]int{2048: 0, 8192: 1, 16384: 3, 32768: 6, 131072: 6} {
		if got := picturesFor(limit); got != want {
			t.Errorf("picturesFor(%d) = %d, want %d", limit, got, want)
		}
	}
}

func TestOnlyTheLastUserMessageCarriesThePictures(t *testing.T) {
	messages := []chatMessage{
		{Role: "system", Content: "card"},
		{Role: "user", Content: "earlier"},
		{Role: "assistant", Content: "hi"},
		{Role: "user", Content: "look at this"},
	}
	out := withPictures(messages, []map[string]any{{"type": "image_url"}})
	for i, m := range out[:3] {
		if _, plain := m.(map[string]any)["content"].(string); !plain {
			t.Errorf("message %d lost its plain string content", i)
		}
	}
	parts, ok := out[3].(map[string]any)["content"].([]map[string]any)
	if !ok || len(parts) != 2 || parts[0]["text"] != "look at this" || parts[1]["type"] != "image_url" {
		t.Fatalf("last user message = %#v", out[3])
	}
}

func TestARefusedPictureIsRememberedAndTheDirectiveComesBackOut(t *testing.T) {
	rememberBlind("http://box:5000", "test-vl")
	if !knownBlind("http://box:5000", "test-vl") || knownBlind("http://box:5000", "other-vl") {
		t.Fatal("blindness is not per model")
	}
	messages := []chatMessage{{Role: "system", Content: "card\n\n" + eyesDirective}, {Role: "user", Content: "hi"}}
	if got := withoutEyes(messages)[0].Content; got != "card" {
		t.Fatalf("system after withoutEyes = %q", got)
	}
	if messages[0].Content == "card" {
		t.Fatal("withoutEyes changed the caller's slice")
	}
}

func mustJSON(v any) string {
	raw, _ := json.Marshal(v)
	return string(raw)
}
