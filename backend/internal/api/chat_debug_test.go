package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// stubLLM answers the two endpoints a chat turn touches, with a fixed reply.
func stubLLM(t *testing.T, reply string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		body, _ := json.Marshal(map[string]any{
			"choices": []map[string]any{{"message": map[string]any{"role": "assistant", "content": reply}}},
		})
		_, _ = w.Write(body)
	}))
}

// chatDebugOf sends one turn with debug on and returns the receipts.
func chatDebugOf(t *testing.T, s *Server, token, request string) chatDebug {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat", request)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Debug *chatDebug `json:"debug"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Debug == nil {
		t.Fatal("debug was asked for and not returned")
	}
	return *out.Debug
}

func TestChatDebugEchoesTheAssembledTurn(t *testing.T) {
	llm := stubLLM(t, "Hello [mood: happy]")
	defer llm.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)

	debug := chatDebugOf(t, s, token,
		`{"mode":"playful","messages":[{"role":"user","content":"hello"}],"debug":true}`)

	// The prompt as sent, system message first.
	if len(debug.Messages) < 2 || debug.Messages[0].Role != "system" {
		t.Fatalf("messages = %+v", debug.Messages)
	}
	// The reply before any parser touched it: the mood tag is still in it, which is
	// the whole point — a tag that was written and then stripped has to be
	// distinguishable from one that was never written.
	if !strings.Contains(debug.Raw, "[mood: happy]") {
		t.Fatalf("raw reply was already scrubbed: %q", debug.Raw)
	}
	if len(debug.Sections) == 0 {
		t.Fatal("no sections reported")
	}
	if debug.Signals == nil {
		t.Fatal("no signals reported")
	}
}

func TestChatDebugIsOffUnlessAsked(t *testing.T) {
	llm := stubLLM(t, "Hello")
	defer llm.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"playful","messages":[{"role":"user","content":"hello"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Debug *chatDebug `json:"debug"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Debug != nil {
		t.Fatal("an ordinary turn carried debug receipts")
	}
}

// She could only be told she had rooms on a call or when the message said a place
// word, which is why she never moved: the directive asks the room to follow the mood
// as well as the plot, and the mood half could never fire.
func TestSheIsToldWhereSheCanBeOnAnOrdinaryTurn(t *testing.T) {
	llm := stubLLM(t, "Hi")
	defer llm.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	seedBackground(t, s, token, "Bedroom", "bed", "night", "lamp")

	kept := func(debug chatDebug, name string) bool {
		for _, section := range debug.Sections {
			if section.Name == name {
				return section.Kept
			}
		}
		return false
	}

	// No place word, no call — but the scene has warmed, which is exactly when the
	// room is supposed to follow it.
	warm := chatDebugOf(t, s, token,
		`{"mode":"playful","intensity":3,"messages":[{"role":"user","content":"you look nice today"}],"debug":true}`)
	if !kept(warm, "where she is") {
		t.Error("at heat 3 she was never told she had anywhere to go")
	}

	// And on a cool turn where she is nowhere yet: the first move has to start
	// somewhere, and a character never handed a room reads as one with no rooms.
	nowhere := chatDebugOf(t, s, token,
		`{"mode":"playful","intensity":1,"messages":[{"role":"user","content":"what's up"}],"debug":true}`)
	if !kept(nowhere, "where she is") {
		t.Error("with no background set she was not told any existed")
	}
}

func TestAltGreetingsSurviveAWorkspaceRoundTrip(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chat/workspace", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("read workspace: %d", rec.Code)
	}
	var ws chatWorkspace
	if err := json.Unmarshal(rec.Body.Bytes(), &ws); err != nil {
		t.Fatal(err)
	}
	ws.Characters = append(ws.Characters, chatCharacter{
		ID: strings.Repeat("a", 32), Name: "Imported", PromptWeight: 1, DefaultMode: "sweet",
		AltGreetings: []string{"Oh, it's you.", "  ", "Back already?"},
	})
	body, _ := json.Marshal(ws)
	rec = do(t, s.Handler(), token, http.MethodPut, "/api/chat/workspace", string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("write workspace: %d %s", rec.Code, rec.Body.String())
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/chat/workspace", "")
	var back chatWorkspace
	if err := json.Unmarshal(rec.Body.Bytes(), &back); err != nil {
		t.Fatal(err)
	}
	for _, character := range back.Characters {
		if character.ID != strings.Repeat("a", 32) {
			continue
		}
		// The blank one is dropped; the two real ones survive in order.
		if len(character.AltGreetings) != 2 || character.AltGreetings[0] != "Oh, it's you." || character.AltGreetings[1] != "Back already?" {
			t.Fatalf("altGreetings = %q", character.AltGreetings)
		}
		return
	}
	t.Fatal("the imported character did not come back")
}
