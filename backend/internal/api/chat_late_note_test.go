package api

import (
	"encoding/json"
	"net/http"
	"reflect"
	"strings"
	"testing"
)

// roles is a sent message list as its roles, for the layout tests.
func roles(body map[string]any) []string {
	msgs, _ := body["messages"].([]any)
	out := make([]string, 0, len(msgs))
	for _, raw := range msgs {
		m, _ := raw.(map[string]any)
		r, _ := m["role"].(string)
		out = append(out, r)
	}
	return out
}

func TestWhatChangesEachTurnComesAfterTheConversationSoItsStartIsReadOnce(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("mm hi", callTool("c1", toolSetState, map[string]any{"mood": "happy", "heat": 2}))
	})
	runTurn(t, s, token, turnFor("hey you", ""))
	runTurn(t, s, token, turnFor("what are you up to tonight", `,"call":true`))
	chats := f.chats()
	first, second := chats[0], chats[len(chats)-1]

	// Her mood moved, the heat moved and the second turn is a call; none of it is in
	// the first message, which is the same byte for byte.
	if firstSystem(first) != firstSystem(second) {
		t.Fatalf("the system message changed between turns:\n%s\n---\n%s", firstSystem(first), firstSystem(second))
	}
	if strings.Contains(firstSystem(second), "video call with them right now") || strings.Contains(firstSystem(second), "where they are") {
		t.Fatal("something that changes each turn is in the cached system message")
	}
	if !strings.Contains(systemPrompt(second), "video call with them right now") {
		t.Fatal("the call was not said at all")
	}
	// The note sits just before their newest message, after everything said before it.
	got := roles(second)
	want := []string{"system", "user", "assistant", "system", "user"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("layout = %v, want %v", got, want)
	}
	// And everything the second turn sends ahead of the note is what the first sent
	// ahead of its own, plus what was said since — the part the backend has already read.
	a, _ := json.Marshal(first["messages"].([]any)[0])
	b, _ := json.Marshal(second["messages"].([]any)[0])
	if string(a) != string(b) {
		t.Fatal("the prefix the backend cached was not resent unchanged")
	}
}

func TestATemplateThatRefusesALateSystemMessageGetsTheOldLayoutFromThenOn(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		seen := false
		for _, r := range roles(body) {
			if r != "system" {
				seen = true
			} else if seen {
				return http.StatusInternalServerError, map[string]any{"error": map[string]any{"message": "Conversation roles must alternate user/assistant/user/assistant/..."}}
			}
		}
		return http.StatusOK, say("hey")
	})
	// A url and model no other test has filed: the refusal is remembered per process.
	cur := s.settings.Get()
	cur.ChatModel = "strict-template-model"
	s.settings.Set(cur)
	runTurn(t, s, token, turnFor("hi", ""))
	events := runTurn(t, s, token, turnFor("still there?", ""))
	if len(eventsNamed(events, "message")) != 1 || len(eventsNamed(events, "error")) != 0 {
		t.Fatalf("the turn did not recover: %+v", events)
	}
	last := lastChat(f)
	if got := roles(last); got[0] != "system" || strings.Count(strings.Join(got, ","), "system") != 1 {
		t.Fatalf("the late note was not folded in: %v", got)
	}
	if !strings.Contains(firstSystem(last), "where they are") {
		t.Fatal("folding lost the note's contents")
	}
}

func TestACutHoldsStillAsTheOldestMessagesFallAway(t *testing.T) {
	var history []chatMessage
	for i := 0; i < 120; i++ {
		history = append(history, chatMessage{Role: "user", Content: "line", ID: randomID()})
	}
	// The window wants the newest 80; a conversation at its cap loses its oldest message
	// as each new one arrives. The message the prompt starts on must not move with it.
	starts := map[string]bool{}
	for drop := 0; drop < historyCutStep; drop++ {
		h := history[drop:]
		cut := steppedCut(h, len(h)-80, 1)
		if cut < len(h)-80 {
			t.Fatalf("the cut kept more than the window: %d", cut)
		}
		starts[h[cut].ID] = true
	}
	if len(starts) > 3 {
		t.Fatalf("the start moved %d times in %d turns", len(starts), historyCutStep)
	}
	if steppedCut(history, 0, 6) != 0 {
		t.Fatal("nothing to cut cut something")
	}
	// Never less than asked, and never forward into the messages that must be kept.
	if got := steppedCut(history[:10], 3, 6); got < 3 || got > 4 {
		t.Fatalf("cut %d of 10 keeping 6", got)
	}
}

func TestOnlyATemplateErrorAboutRolesIsReadAsRefusingTheNote(t *testing.T) {
	for msg, want := range map[string]bool{
		"local LLM returned 500: Conversation roles must alternate user/assistant":           true,
		"local LLM returned 400: jinja2.exceptions.TemplateError: System role not supported": true,
		"local LLM returned 500: CUDA out of memory":                                         false,
		"local LLM returned 400: tools are not supported by this template":                   false,
	} {
		if got := refusedLateNote(&chatBackendStatusError{Status: 500, msg: msg}); got != want {
			t.Errorf("%q: %v, want %v", msg, got, want)
		}
	}
}
