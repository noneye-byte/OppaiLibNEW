package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"
)

const oneShotID = "0123456789abcdef0123456789abcdef"

const oneShotOpen = `{"conversationId":"` + oneShotID + `","conversation":{"characterId":"libby","title":"One-shot","mode":"sweet","oneShot":true},"task":"oneshot"}`

func oneShotSay(text string) string {
	raw, _ := json.Marshal(text)
	return `{"conversationId":"` + oneShotID + `","messages":[{"id":"` + randomID() + `","role":"user","content":` + string(raw) + `,"at":` + jsonNumber(time.Now().UnixMilli()) + `}]}`
}

func toolNames(body map[string]any) []string {
	var out []string
	tools, _ := body["tools"].([]any)
	for _, raw := range tools {
		fn, _ := raw.(map[string]any)["function"].(map[string]any)
		name, _ := fn["name"].(string)
		out = append(out, name)
	}
	return out
}

func TestAOneShotOpensWithHerAskingForTheScene(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("ooh. okay — set it for me. who am I, and where are we?")
	})
	events := runTurn(t, s, token, oneShotOpen)
	if len(eventsNamed(events, "message")) != 1 {
		t.Fatalf("no opener: %+v", events)
	}
	body := f.chats()[0]
	msgs := body["messages"].([]any)
	last := msgs[len(msgs)-1].(map[string]any)["content"].(string)
	if !strings.Contains(last, "Ask them to set it") {
		t.Fatalf("she was not asked to ask for the scene: %q", last)
	}
	if !strings.Contains(systemPrompt(body), "They have not set the scene yet") {
		t.Fatal("she was not told what a one-shot is")
	}
	c := storedConversation(t, s)
	if c.OneShot == nil || len(c.Messages) != 1 || c.Messages[0].Role != "assistant" {
		t.Fatalf("stored = %+v / %+v", c.OneShot, c.Messages)
	}
}

// The whole point: the scene is played on its own terms, and none of it is filed away.
func TestTheSceneTheySetIsHerPromptAndNothingOfItIsKept(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("set it for me.")
		}
		return http.StatusOK, say("*the lamp swings* I'm the keeper here. I love storms, always have. Who are you?",
			callTool("r1", toolRemember, map[string]any{"kind": "about_them", "text": "they are a sailor called Max"}),
			callTool("s1", toolSetState, map[string]any{"mood": "happy", "heat": 3, "place": "a lighthouse lamp room"}))
	})
	u, _ := s.db.UserByName(t.Context(), "tester")
	if _, err := s.appendLibbyMemories(u.ID, []string{"they have a cat called Biscuit"}); err != nil {
		t.Fatal(err)
	}
	memBefore, _ := s.readLibbyMemory(u.ID)
	bondBefore, _ := s.readLibbyBond(u.ID)

	runTurn(t, s, token, oneShotOpen)
	scene := "You're the keeper of a lighthouse and I'm a sailor washed up on your rocks. My name is Max and I love sailing."
	runTurn(t, s, token, oneShotSay(scene))

	body := f.chats()[1]
	system := systemPrompt(body)
	if !strings.Contains(system, scene) || !strings.Contains(system, "one-shot") {
		t.Fatalf("the scene is not in her prompt: %s", system)
	}
	if strings.Contains(system, "Biscuit") {
		t.Fatal("what she remembers about them was read into a one-shot")
	}
	for _, name := range toolNames(body) {
		if name == toolRemember || name == toolRecall || name == toolSendLibrary || isLibraryTool(name) {
			t.Fatalf("a one-shot offered %s", name)
		}
	}
	memAfter, _ := s.readLibbyMemory(u.ID)
	if len(memAfter.Memories) != len(memBefore.Memories) {
		t.Fatalf("a one-shot was remembered: %+v", memAfter.Memories)
	}
	bondAfter, _ := s.readLibbyBond(u.ID)
	if a, b := jsonOf(bondBefore), jsonOf(bondAfter); a != b {
		t.Fatalf("a one-shot moved the bond: %s → %s", a, b)
	}
	if len(f.gens) != 0 {
		t.Fatal("a room was made for a one-shot, which would outlive it")
	}
	c := storedConversation(t, s)
	if c.OneShot == nil || c.OneShot.Prompt != scene {
		t.Fatalf("the scene was not recorded: %+v", c.OneShot)
	}
	// Her state within the scene still moves; it is the scene's own.
	if c.Emotion != "happy" || c.Intensity != 3 {
		t.Fatalf("state = %s/%d", c.Emotion, c.Intensity)
	}
}

func TestASaveCannotTurnAOneShotIntoAConversationSheRemembers(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("set it.") })
	runTurn(t, s, token, oneShotOpen)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chat/workspace", "")
	var ws map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &ws)
	for _, raw := range ws["conversations"].([]any) {
		delete(raw.(map[string]any), "oneShot")
	}
	raw, _ := json.Marshal(ws)
	if rec := do(t, s.Handler(), token, http.MethodPut, "/api/chat/workspace", string(raw)); rec.Code != http.StatusOK {
		t.Fatalf("save: %d %s", rec.Code, rec.Body)
	}
	if c := storedConversation(t, s); c.OneShot == nil {
		t.Fatal("a save that left the field out made it an ordinary conversation")
	}
}

func TestAOneShotIsNeitherRecappedNorReflectedOn(t *testing.T) {
	now := time.Now()
	var msgs []storedChatMessage
	for i := 0; i < 12; i++ {
		role := "user"
		if i%2 == 1 {
			role = "assistant"
		}
		msgs = append(msgs, storedChatMessage{ID: randomID(), Role: role, Content: "a line of the scene", At: now.Add(-3*time.Hour).UnixMilli() + int64(i)})
	}
	shot := chatConversation{ID: randomID(), CharacterID: "libby", Messages: msgs, UpdatedAt: now.Add(-3 * time.Hour).UnixMilli(), OneShot: &libbyOneShot{Prompt: "a train at night"}}
	ws := chatWorkspace{Conversations: []chatConversation{shot}}
	if got := conversationRecaps(ws, "libby", "other", now); got != "" {
		t.Fatalf("a one-shot was recapped: %s", got)
	}
	if _, due := unreflected(shot, reflectedMark{}, now, true); due {
		t.Fatal("a one-shot was due a journal entry")
	}
}

func TestAOneShotLeftAloneIsForgotten(t *testing.T) {
	s, _ := newTestServer(t)
	u, _ := s.db.UserByName(t.Context(), "tester")
	now := time.Now()
	old := now.Add(-oneShotForgetAfter - time.Hour).UnixMilli()
	ws := chatWorkspace{
		Characters: []chatCharacter{defaultLibbyCard()},
		Conversations: []chatConversation{
			{ID: randomID(), CharacterID: "libby", Title: "stale scene", Messages: []storedChatMessage{}, UpdatedAt: old, OneShot: &libbyOneShot{}},
			{ID: randomID(), CharacterID: "libby", Title: "fresh scene", Messages: []storedChatMessage{}, UpdatedAt: now.UnixMilli(), OneShot: &libbyOneShot{}},
			{ID: randomID(), CharacterID: "libby", Title: "ordinary", Messages: []storedChatMessage{}, UpdatedAt: old},
		},
		Images: []chatImage{},
	}
	if err := s.writeChatWorkspace(u.ID, ws); err != nil {
		t.Fatal(err)
	}
	if gone := s.forgetStaleOneShots(now); gone != 1 {
		t.Fatalf("forgot %d", gone)
	}
	after, _ := s.readChatWorkspace(u.ID)
	var titles []string
	for _, c := range after.Conversations {
		titles = append(titles, c.Title)
	}
	if strings.Join(titles, ",") != "fresh scene,ordinary" {
		t.Fatalf("left = %v", titles)
	}
}

func jsonOf(v any) string { b, _ := json.Marshal(v); return string(b) }
