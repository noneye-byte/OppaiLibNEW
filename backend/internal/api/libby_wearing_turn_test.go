package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// wearingLLM answers every chat with one fixed reply and records the system prompt.
func wearingLLM(t *testing.T, reply string, system *string) *httptest.Server {
	t.Helper()
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		var body struct {
			Messages []struct {
				Role    string `json:"role"`
				Content any    `json:"content"`
			} `json:"messages"`
		}
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &body)
		if system != nil && len(body.Messages) > 0 {
			*system, _ = body.Messages[0].Content.(string)
		}
		b, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"role": "assistant", "content": reply}}}})
		_, _ = w.Write(b)
	}))
	t.Cleanup(llm.Close)
	return llm
}

// She undresses with the tag and stays undressed: the turn reports it, the prose loses
// the tag, and the next turn — sent back what she has on — tells her she has nothing on.
func TestWhatSheTakesOffStaysOff(t *testing.T) {
	var system string
	llm := wearingLLM(t, "Mm, fine. *pulls the tank top over her head* [wearing: nothing] Happy?", &system)
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","intensity":3,"messages":[{"role":"user","content":"take it off"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat = %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message string `json:"message"`
		Wearing string `json:"wearing"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Wearing != wearingNothing {
		t.Errorf("wearing = %q, want nothing", out.Wearing)
	}
	if strings.Contains(out.Message, "[") {
		t.Errorf("tag left in the prose: %q", out.Message)
	}

	quiet := wearingLLM(t, "Hi again.", &system)
	cur.ChatURL = quiet.URL
	s.settings.Set(cur)
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","intensity":1,"wearing":"nothing","messages":[{"role":"user","content":"hey"}]}`)
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Wearing != wearingNothing {
		t.Errorf("an unstated turn changed what she has on: %q", out.Wearing)
	}
	if !strings.Contains(system, "nothing on") || strings.Contains(system, "black tank top and orange sweat shorts") {
		t.Errorf("she was not told she has nothing on:\n%s", system)
	}
}

// A picture of her in a red dress leaves her in the red dress, and the next picture
// that does not say what she wears is drawn in it.
func TestAPictureInADressLeavesHerInTheDress(t *testing.T) {
	var prompts []string
	gen := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/sdapi/v1/txt2img" {
			var sent map[string]any
			raw, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(raw, &sent)
			prompt, _ := sent["prompt"].(string)
			prompts = append(prompts, prompt)
			_, _ = w.Write([]byte(`{"images":["` + onePixelPNG + `"],"info":"{\"seed\":1}"}`))
			return
		}
		http.NotFound(w, r)
	}))
	t.Cleanup(gen.Close)
	s, token := newTestServer(t)
	enableImageGen(t, s, gen.URL)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/act", `{"kind":"generate","prompt":"you in a red dress on the balcony"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("act: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Wearing string `json:"wearing"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Wearing != "red dress" {
		t.Fatalf("wearing = %q", out.Wearing)
	}
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/libby/act", `{"kind":"generate","prompt":"you, a selfie","wearing":"red dress"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("act: %d %s", rec.Code, rec.Body)
	}
	if len(prompts) != 2 || !strings.Contains(prompts[1], "red dress") || strings.Contains(prompts[1], "tank top") {
		t.Errorf("second picture: %q", prompts)
	}
}
