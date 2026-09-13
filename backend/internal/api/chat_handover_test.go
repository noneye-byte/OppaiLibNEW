package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// "Send me a gif" used to come back as an error. A model with a gif to hand writes
// the tag and nothing else — "[gif: dance]" — and a reply that is only a tag scrubs to
// an empty string, which the handler read as the backend returning nothing. A picture
// handed over with no words is a turn, the way a selfie alone is. And a model that
// reaches for the selfie tag when a library kind was asked for meant the gif.
func TestChatHandsOverAGifWithoutWords(t *testing.T) {
	for _, reply := range []string{
		"[gif: dance]",
		"Here you go!\n[gif: dance]",
		"Here's one [send: dance]",
	} {
		reply := reply
		llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/v1/internal/model/info" {
				_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
				return
			}
			b, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"role": "assistant", "content": reply}}}})
			_, _ = w.Write(b)
		}))
		s, token := newTestServer(t)
		id := seedTitledMedia(t, s, "dance", "gif", "dance")
		cur := s.settings.Get()
		cur.ChatURL = llm.URL
		s.settings.Set(cur)
		rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
			`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"send me a gif"}]}`)
		llm.Close()
		if rec.Code != http.StatusOK {
			t.Fatalf("%q: chat = %d %s", reply, rec.Code, rec.Body)
		}
		var out struct {
			Message     string            `json:"message"`
			Attachments []libbyAttachment `json:"attachments"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		if len(out.Attachments) != 1 || out.Attachments[0].ID != id || out.Attachments[0].Kind != "gif" {
			t.Fatalf("%q: attachments = %+v, want the gif (%d)", reply, out.Attachments, id)
		}
		if strings.Contains(out.Message, "[") {
			t.Fatalf("%q: tag left in the prose: %q", reply, out.Message)
		}
	}
}

// A tag-only hand-over that matches nothing gets a line rather than an empty bubble.
func TestChatSaysSoWhenAHandOverFindsNothing(t *testing.T) {
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"[gif: something that is not there]"}}]}`))
	}))
	defer llm.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"send me a gif"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat = %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message string `json:"message"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if strings.TrimSpace(out.Message) == "" || strings.Contains(out.Message, "[") {
		t.Fatalf("message = %q", out.Message)
	}
}
