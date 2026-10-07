package api

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"testing"
)

// ── replying to an earlier message ──────────────────────────────────────────

func TestResolveReplyTargetQuotesAndOverlaps(t *testing.T) {
	messages := []chatMessage{
		{ID: "a1", Role: "user", Content: "did you ever finish that comic i sent you?"},
		{ID: "b2", Role: "assistant", Content: "not yet, tonight maybe"},
		{ID: "c3", Role: "user", Content: "also what do you want for dinner"},
		{ID: "d4", Role: "user", Content: "hello?"},
	}
	// Verbatim quote lands on the message it came from.
	if got := resolveReplyTarget("finish that comic", messages); got == nil || got.ID != "a1" || got.Role != "user" {
		t.Fatalf("verbatim quote resolved to %+v", got)
	}
	// Paraphrase with enough overlap lands too.
	if got := resolveReplyTarget("what you want for dinner", messages); got == nil || got.ID != "c3" {
		t.Fatalf("overlapping quote resolved to %+v", got)
	}
	// The latest message is never a target: replying to it is what every reply does.
	if got := resolveReplyTarget("hello", messages); got != nil {
		t.Fatalf("the latest message was a target: %+v", got)
	}
	// Two common words are not a match.
	if got := resolveReplyTarget("the thing", messages); got != nil {
		t.Fatalf("a vague quote resolved: %+v", got)
	}
	// Messages without ids cannot be pointed at.
	if got := resolveReplyTarget("not yet", []chatMessage{{Role: "assistant", Content: "not yet, tonight"}, {ID: "x", Role: "user", Content: "ok"}}); got != nil {
		t.Fatalf("an id-less message was a target: %+v", got)
	}
}

func TestSheNeverQuotesHerOwnMessages(t *testing.T) {
	messages := []chatMessage{
		{ID: "a1", Role: "user", Content: "what are you reading"},
		{ID: "b2", Role: "assistant", Content: "a comic about a lighthouse keeper, it's so good"},
		{ID: "c3", Role: "user", Content: "nice"},
	}
	if got := resolveReplyTarget("a comic about a lighthouse keeper", messages); got != nil {
		t.Fatalf("her own message was a target: %+v", got)
	}
}

func TestAQuoteOfTheLatestDoesNotFallThroughToAnOlderMessage(t *testing.T) {
	messages := []chatMessage{
		{ID: "a1", Role: "user", Content: "what should i watch tonight"},
		{ID: "b2", Role: "assistant", Content: "the slow one"},
		{ID: "c3", Role: "user", Content: "ok but seriously what should i watch"},
	}
	if got := resolveReplyTarget("what should i watch", messages); got != nil {
		t.Fatalf("a quote of the latest message landed on %+v", got)
	}
}

func TestAQuoteCannotReachFarBack(t *testing.T) {
	messages := []chatMessage{{ID: "old", Role: "user", Content: "did you ever finish that comic i sent you"}}
	for i := 0; i < replyWindow+2; i++ {
		role := "assistant"
		if i%2 == 1 {
			role = "user"
		}
		messages = append(messages, chatMessage{ID: "m" + string(rune('a'+i)), Role: role, Content: "filler message number " + string(rune('a'+i))})
	}
	if got := resolveReplyTarget("finish that comic", messages); got != nil {
		t.Fatalf("a message %d back was a target: %+v", len(messages), got)
	}
}

func TestAWordOrTwoIsNotAVerbatimMatch(t *testing.T) {
	messages := []chatMessage{
		{ID: "a1", Role: "user", Content: "lol ok"},
		{ID: "b2", Role: "assistant", Content: "what"},
		{ID: "c3", Role: "user", Content: "nothing"},
	}
	if got := resolveReplyTarget("lol", messages); got != nil {
		t.Fatalf("\"lol\" resolved to %+v", got)
	}
}

// ── ringing them, and hanging up ────────────────────────────────────────────

// ── where she is ────────────────────────────────────────────────────────────

func seedBackground(t *testing.T, s *Server, token, name string, tags ...string) string {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"name": name, "tags": tags})
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/backgrounds", string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("save background: %d %s", rec.Code, rec.Body)
	}
	var view libbyBackgroundView
	_ = json.Unmarshal(rec.Body.Bytes(), &view)
	png := "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("\x89PNG\r\n\x1a\nfake"))
	rec = do(t, s.Handler(), token, http.MethodPut, "/api/libby/backgrounds/"+view.ID+"/image", `{"imageData":"`+png+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("set background image: %d %s", rec.Code, rec.Body)
	}
	return view.ID
}

// ── things they attached ────────────────────────────────────────────────────

// ── what the workspace keeps ────────────────────────────────────────────────

// Activity, background, the mood run and quoted replies all live on the workspace
// now. They used to be dropped by the server's struct, which meant every reload
// reset her state and forgot which message a reply answered.
func TestWorkspaceKeepsConversationState(t *testing.T) {
	ws := chatWorkspace{
		Characters: []chatCharacter{defaultLibbyCard()},
		Conversations: []chatConversation{{
			ID: "0123456789abcdef0123456789abcdef", CharacterID: "libby", Title: "t", Mode: "sweet",
			Emotion: "happy", Intensity: 2, Activity: "reading", Background: "fedcba9876543210fedcba9876543210",
			Messages: []storedChatMessage{
				{ID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Role: "user", Content: "hi", At: 1,
					ReplyTo: &chatReplyRef{ID: "x", Role: "assistant", Excerpt: "earlier"}},
				{ID: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", Role: "assistant", Content: "hey", At: 2, Mood: "Happy",
					Actions: []libbyAction{{ID: "1", Kind: "favorite"}, {ID: "2", Kind: "tag"}, {ID: "3", Kind: "tag"}}},
			},
		}},
	}
	if err := validateChatWorkspace(&ws); err != nil {
		t.Fatalf("validate: %v", err)
	}
	c := ws.Conversations[0]
	if c.Activity != "reading" || c.Background != "fedcba9876543210fedcba9876543210" {
		t.Fatalf("conversation state was dropped: %+v", c)
	}
	if c.Messages[0].ReplyTo == nil || c.Messages[0].ReplyTo.Excerpt != "earlier" {
		t.Fatalf("the reply reference was dropped: %+v", c.Messages[0])
	}
	if c.Messages[1].Mood != "happy" || len(c.Messages[1].Actions) != maxLibbyActions {
		t.Fatalf("mood/actions not normalised: %+v", c.Messages[1])
	}
	// Junk is normalised away rather than rejected.
	ws.Conversations[0].Activity = "typing"
	ws.Conversations[0].Background = "not-an-id"
	ws.Conversations[0].Messages[0].Mood = "happy"
	ws.Conversations[0].Messages[0].ReplyTo = &chatReplyRef{Excerpt: "   "}
	if err := validateChatWorkspace(&ws); err != nil {
		t.Fatalf("validate: %v", err)
	}
	c = ws.Conversations[0]
	if c.Activity != "" || c.Background != "" || c.Messages[0].Mood != "" || c.Messages[0].ReplyTo != nil {
		t.Fatalf("junk survived: %+v", c)
	}
}
