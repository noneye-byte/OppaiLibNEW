package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// Imported cards, through the turn engine. Every Libby test runs her; nothing ran a card,
// and a card that could not be saved answered every message with "that conversation
// doesn't exist".

const (
	cardID     = "cccccccccccccccccccccccccccccccc"
	cardConvID = "0123456789abcdef0123456789abcdef"
)

// saveCard puts a workspace holding one imported card and a conversation with it that
// opens on the card's greeting, the way the client starts one, and returns the response.
func saveCard(t *testing.T, s *Server, token string, card map[string]any, mode string) (int, string) {
	t.Helper()
	full := map[string]any{"id": cardID, "name": "Mira", "defaultMode": mode, "promptWeight": 1}
	for k, v := range card {
		full[k] = v
	}
	greeting, _ := full["firstMessage"].(string)
	var messages []any
	if greeting != "" {
		messages = append(messages, map[string]any{"id": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "role": "assistant", "content": greeting, "at": 1})
	}
	ws := map[string]any{
		"profile":    map[string]any{"displayName": "Sam"},
		"characters": []any{full},
		"conversations": []any{map[string]any{
			"id": cardConvID, "characterId": cardID, "title": "New conversation", "mode": mode,
			"emotion": "neutral", "intensity": 1, "messages": messages,
		}},
		"images": []any{},
	}
	raw, _ := json.Marshal(ws)
	rec := do(t, s.Handler(), token, http.MethodPut, "/api/chat/workspace", string(raw))
	return rec.Code, rec.Body.String()
}

func cardTurn(text string) string {
	return `{"conversationId":"` + cardConvID + `","conversation":{"characterId":"` + cardID + `","title":"New conversation","mode":"roleplay"},` +
		`"timeZone":"Asia/Tokyo","messages":[{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","role":"user","content":"` + text + `","at":2}]}`
}

func TestACardWhoseCreatorNotesRunLongStillSavesAndAnswers(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("*She sets down a glass.* What'll it be?")
	})
	// A creator's page from a card site: markdown, HTML, pictures. 12,000 bytes used to
	// refuse the whole workspace over this.
	notes := strings.Repeat(`<p><img src="https://example.invalid/banner.png"> Thanks for downloading!</p>`, 900)
	if code, body := saveCard(t, s, token, map[string]any{"description": "A barmaid.", "creatorNotes": notes, "firstMessage": "Hi."}, "roleplay"); code != http.StatusOK {
		t.Fatalf("save = %d %s", code, body)
	}
	events := runTurn(t, s, token, cardTurn("hey"))
	if len(eventsNamed(events, "message")) != 1 || len(eventsNamed(events, "error")) != 0 {
		t.Fatalf("the card did not answer: %+v", events)
	}
}

func TestACardFieldPastTheCapNamesTheCardAndTheField(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("hi") })
	code, body := saveCard(t, s, token, map[string]any{"description": strings.Repeat("x", maxCardField+1)}, "roleplay")
	if code != http.StatusBadRequest || !strings.Contains(body, "Mira's description is too long") {
		t.Fatalf("save = %d %s, want the card and field named", code, body)
	}
	// Under the cap that used to refuse it, it saves.
	if code, body := saveCard(t, s, token, map[string]any{"description": strings.Repeat("x", 20000)}, "roleplay"); code != http.StatusOK {
		t.Fatalf("a 20 KB description = %d %s", code, body)
	}
}

func TestACardInRoleplayModeRepliesInOneMessageWithEveryParagraph(t *testing.T) {
	scene := "*Mira leans on the bar.* Long day?\n\n*She pours without asking.* On the house.\n\n" +
		"*The fire cracks behind her.* Tell me about it.\n\n*She waits, chin on her hand.*"
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say(scene)
	})
	if code, body := saveCard(t, s, token, map[string]any{"description": "A barmaid.", "firstMessage": "Hi."}, "roleplay"); code != http.StatusOK {
		t.Fatalf("save = %d %s", code, body)
	}
	events := runTurn(t, s, token, cardTurn("rough day"))
	msgs := eventsNamed(events, "message")
	if len(msgs) != 1 {
		t.Fatalf("a roleplay reply arrived as %d messages", len(msgs))
	}
	var m struct {
		Message storedChatMessage `json:"message"`
	}
	_ = json.Unmarshal(msgs[0].Data, &m)
	if !strings.Contains(m.Message.Content, "chin on her hand") {
		t.Fatalf("the scene was cut: %q", m.Message.Content)
	}
	if strings.Contains(systemPrompt(f.chats()[0]), "Send this reply as") {
		t.Fatal("a roleplay card was told to text")
	}
}

func TestACardsPlaceholdersAreTheNamesInPlay(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("{{char}} grins at {{user}}.")
	})
	if code, body := saveCard(t, s, token, map[string]any{"description": "A barmaid.", "firstMessage": "*{{char}} looks up.* Welcome back, {{user}}."}, "roleplay"); code != http.StatusOK {
		t.Fatalf("save = %d %s", code, body)
	}
	events := runTurn(t, s, token, cardTurn("hi"))
	// What the model was shown of its own greeting.
	sent, _ := json.Marshal(f.chats()[0]["messages"])
	if strings.Contains(string(sent), "{{") || !strings.Contains(string(sent), "Welcome back, Sam") {
		t.Fatalf("the greeting went out with its slots: %s", sent)
	}
	var m struct {
		Message storedChatMessage `json:"message"`
	}
	_ = json.Unmarshal(eventsNamed(events, "message")[0].Data, &m)
	if m.Message.Content != "Mira grins at Sam." {
		t.Fatalf("reply = %q", m.Message.Content)
	}
}

func TestLibbyLivesOnTheirClockAndACardKeepsItsOwn(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("hi") })
	runTurn(t, s, token, strings.Replace(firstTurn, `"messages"`, `"timeZone":"Asia/Tokyo","messages"`, 1))
	if !strings.Contains(systemPrompt(f.chats()[0]), "where they are") {
		t.Fatal("Libby was not told what time it is")
	}
	if code, body := saveCard(t, s, token, map[string]any{"description": "A barmaid in a fantasy town."}, "roleplay"); code != http.StatusOK {
		t.Fatalf("save = %d %s", code, body)
	}
	runTurn(t, s, token, cardTurn("hi"))
	chats := f.chats()
	if strings.Contains(systemPrompt(chats[len(chats)-1]), "where they are") {
		t.Fatal("a card was pulled onto the real clock")
	}
}
