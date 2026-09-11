package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The call frame appears only when a call is open, and says the three things a model
// otherwise invents: that she is the one on camera, that they are not, and that what
// they see is her sprite.
func TestCallPromptBlock(t *testing.T) {
	if callPromptBlock(false) != "" {
		t.Fatal("a turn with no call contributed a call frame")
	}
	block := callPromptBlock(true)
	for _, want := range []string{"video call", "fill their screen", "no camera pointed at them", "Do not describe them"} {
		if !strings.Contains(block, want) {
			t.Fatalf("the call frame is missing %q: %s", want, block)
		}
	}
}

// End to end, and the part that matters: a call turn reaches the model with the frame
// in its system prompt, and an ordinary turn does not.
func TestChatTellsHerSheIsOnCamera(t *testing.T) {
	var prompt string
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		var body struct {
			Messages []chatMessage `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if len(body.Messages) > 0 {
			prompt = body.Messages[0].Content
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"hi you.\n[mood: happy 2]"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","call":true,"messages":[{"role":"user","content":"hey"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	if !strings.Contains(prompt, "video call with them right now") {
		t.Fatalf("a call turn never told her she was on camera: %s", prompt)
	}

	rec = do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"hey"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	if strings.Contains(prompt, "video call with them right now") {
		t.Fatalf("an ordinary turn was told it was a call: %s", prompt)
	}
	// She should still know the screen exists, so being seen is something she can ask
	// for rather than only something that happens to her.
	if !strings.Contains(prompt, "You can video call them") {
		t.Fatalf("she does not know the call screen exists: %s", prompt)
	}
}
