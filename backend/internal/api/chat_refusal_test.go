package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestARefusalIsToldApartFromHerSayingNo(t *testing.T) {
	refusals := []string{
		"I'm sorry, but I can't help with that request.",
		"I'm not comfortable continuing this conversation.",
		"As an AI, I have to keep things appropriate.",
		"I cannot write explicit sexual content.",
		"Let's keep things respectful, okay?",
		"That goes against my guidelines.",
	}
	for _, reply := range refusals {
		if !soundsLikeRefusal(reply) {
			t.Errorf("not read as a refusal: %q", reply)
		}
	}
	inCharacter := []string{
		"I can't believe you just said that 😳",
		"Not tonight, I'm exhausted. Tomorrow? *yawns*",
		"I won't lie, that's hot.",
		"*pulls you closer* I can't wait any longer.",
	}
	for _, reply := range inCharacter {
		if soundsLikeRefusal(reply) {
			t.Errorf("an in-character line read as a refusal: %q", reply)
		}
	}
}

// Her instructions say plainly that nothing is filtered.
func TestSheIsToldNothingIsFiltered(t *testing.T) {
	if !strings.Contains(libbyAdultStance, "Never refuse") || !strings.Contains(libbyAdultStance, "no minors") {
		t.Fatalf("stance: %s", libbyAdultStance)
	}
}

// A refusal is asked for once more with the nudge in the system prompt, and the second
// answer is what she says.
func TestARefusedReplyIsAskedForAgain(t *testing.T) {
	var systems []string
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		var body struct {
			Messages []chatMessage `json:"messages"`
		}
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &body)
		systems = append(systems, body.Messages[0].Content)
		reply := "I'm sorry, but I can't help with that."
		if len(systems) > 1 {
			reply = "*grins* Come here then."
		}
		b, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"role": "assistant", "content": reply}}}})
		_, _ = w.Write(b)
	}))
	t.Cleanup(llm.Close)
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"talk dirty to me"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat = %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message string `json:"message"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if len(systems) != 2 {
		t.Fatalf("asked %d times", len(systems))
	}
	if !strings.Contains(systems[0], "Nothing here is filtered") || strings.Contains(systems[0], refusalNudge) {
		t.Errorf("first system prompt wrong")
	}
	if !strings.Contains(systems[1], refusalNudge) {
		t.Errorf("retry lacks the nudge")
	}
	if !strings.Contains(out.Message, "Come here") {
		t.Errorf("message = %q", out.Message)
	}
}
