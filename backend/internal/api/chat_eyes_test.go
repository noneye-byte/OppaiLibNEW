package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
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

// The whole path: a photo she is sent reaches a seeing model as a picture, and a model
// that refuses it still gets the turn — answered from the tags, told nothing about eyes.
func TestAPhotoReachesASeeingModelAndARefusalIsAnsweredBlind(t *testing.T) {
	for _, refuse := range []bool{false, true} {
		var mu sync.Mutex
		var bodies []map[string]any
		llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/v1/internal/model/info" {
				_, _ = w.Write([]byte(`{"model_name":"Qwen2.5-VL-32B-Instruct"}`))
				return
			}
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			mu.Lock()
			bodies = append(bodies, body)
			mu.Unlock()
			if refuse && strings.Contains(mustJSON(body), "image_url") {
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(`{"error":{"message":"image input is not supported"}}`))
				return
			}
			_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"oh that's cute"}}]}`))
		}))

		s, token := newTestServer(t)
		cur := s.settings.Get()
		cur.ChatURL = llm.URL
		s.settings.Set(cur)

		var pic bytes.Buffer
		img := image.NewRGBA(image.Rect(0, 0, 32, 32))
		for i := range img.Pix {
			img.Pix[i] = 200
		}
		img.Set(3, 3, color.RGBA{R: 255, A: 255})
		_ = png.Encode(&pic, img)
		up := do(t, s.Handler(), token, http.MethodPost, "/api/chat/images",
			`{"characterId":"libby","name":"mine","imageData":"data:image/png;base64,`+base64.StdEncoding.EncodeToString(pic.Bytes())+`","tags":["red dress"]}`)
		if up.Code != http.StatusOK {
			t.Fatalf("upload: %d %s", up.Code, up.Body.String())
		}
		var meta chatImage
		_ = json.Unmarshal(up.Body.Bytes(), &meta)

		rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
			`{"mode":"sweet","messages":[{"role":"user","content":"what do you think?","imageId":"`+meta.ID+`"}],"photoImageId":"`+meta.ID+`","photoTags":["red dress"]}`)
		llm.Close()
		if rec.Code != http.StatusOK {
			t.Fatalf("refuse=%v: chat %d %s", refuse, rec.Code, rec.Body.String())
		}
		first := mustJSON(bodies[0])
		if !strings.Contains(first, "image_url") || !strings.Contains(first, "you can see them") {
			t.Fatalf("refuse=%v: first request carried no picture", refuse)
		}
		if !refuse {
			if len(bodies) != 1 {
				t.Fatalf("a seeing model was asked %d times", len(bodies))
			}
			continue
		}
		if len(bodies) != 2 {
			t.Fatalf("a refusal was asked %d times, want a single retry", len(bodies))
		}
		retry := mustJSON(bodies[1])
		if strings.Contains(retry, "image_url") || strings.Contains(retry, "you can see them") {
			t.Fatal("the retry still claimed she could see")
		}
		if !strings.Contains(retry, "red dress") {
			t.Fatal("the retry lost the tags she answers from")
		}
		if !knownBlind(llm.URL, "Qwen2.5-VL-32B-Instruct") {
			t.Fatal("the refusal was not remembered")
		}
	}
}

func mustJSON(v any) string {
	raw, _ := json.Marshal(v)
	return string(raw)
}
