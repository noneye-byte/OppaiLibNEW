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

// chatDebugOf runs one turn with debug on, in a conversation that starts at heat, and
// returns the receipts.
func chatDebugOf(t *testing.T, s *Server, token, text string, heat int) chatDebug {
	t.Helper()
	u, _ := s.db.UserByName(t.Context(), "tester")
	s.chatMu.Lock()
	ws, _ := s.readChatWorkspace(u.ID)
	ws.Conversations = []chatConversation{{ID: testConversation, CharacterID: "libby", Title: "t", Mode: "sweet",
		Emotion: "neutral", Intensity: heat, Progress: float64(heat), Messages: []storedChatMessage{}}}
	_ = s.writeChatWorkspace(u.ID, ws)
	s.chatMu.Unlock()
	done := eventsNamed(runTurn(t, s, token, turnFor(text, `,"debug":true`)), "done")
	var out struct {
		Debug *chatDebug `json:"debug"`
	}
	if len(done) == 0 || json.Unmarshal(done[0].Data, &out) != nil || out.Debug == nil {
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

	debug := chatDebugOf(t, s, token, "hello", 1)

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
	warm := chatDebugOf(t, s, token, "you look nice today", 3)
	if !kept(warm, "where she is") {
		t.Error("at heat 3 she was never told she had anywhere to go")
	}

	// And on a cool turn where she is nowhere yet: the first move has to start
	// somewhere, and a character never handed a room reads as one with no rooms.
	nowhere := chatDebugOf(t, s, token, "what's up", 1)
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
