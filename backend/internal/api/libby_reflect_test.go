package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// quietConversation is a conversation with her that ended ago, n messages long.
func quietConversation(n int, ago time.Duration) chatConversation {
	end := time.Now().Add(-ago)
	conv := chatConversation{ID: "conv-1", CharacterID: "libby"}
	for i := 0; i < n; i++ {
		role := "user"
		if i%2 == 1 {
			role = "assistant"
		}
		conv.Messages = append(conv.Messages, storedChatMessage{
			ID: fmt.Sprintf("m%d", i), Role: role, Content: fmt.Sprintf("line %d", i),
			At: end.Add(time.Duration(i-n+1) * time.Minute).UnixMilli(),
		})
	}
	return conv
}

func TestSheLooksBackOnlyOnAConversationThatHasEnded(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name string
		conv chatConversation
		mark reflectedMark
		due  bool
	}{
		{"still going", quietConversation(10, 5*time.Minute), reflectedMark{}, false},
		{"quiet and long enough", quietConversation(10, time.Hour), reflectedMark{}, true},
		{"too short", quietConversation(3, time.Hour), reflectedMark{}, false},
		{"too old to start on", quietConversation(10, 5*24*time.Hour), reflectedMark{}, false},
		{"already looked back on", quietConversation(10, time.Hour), reflectedMark{LastID: "m9"}, false},
		{"a mark without an id still holds", quietConversation(10, time.Hour), reflectedMark{LastAt: now.Add(-time.Hour).UnixMilli()}, false},
	}
	for _, c := range cases {
		if _, due := unreflected(c.conv, c.mark, now, false); due != c.due {
			t.Errorf("%s: due = %v, want %v", c.name, due, c.due)
		}
	}
	conv := quietConversation(10, time.Hour)
	conv.CharacterID = "someone-else"
	if _, due := unreflected(conv, reflectedMark{}, now, true); due {
		t.Error("she reflected on somebody else's conversation")
	}
	if from, due := unreflected(quietConversation(10, time.Minute), reflectedMark{LastID: "m7"}, now, true); !due || from != 8 {
		t.Errorf("write-it-now: from=%d due=%v", from, due)
	}
}

func TestHerAnswerIsReadWhateverSheWrapsItIn(t *testing.T) {
	raw := "sure! here it is:\n```json\n{\"journal\": \"It was a good night.\", \"mood\": \"loving\", \"self\": [\"I hate mornings\"], \"them\": [], \"stale\": [\"m2\"]}\n```\nhope that's ok"
	answer, ok := parseReflectAnswer(raw)
	if !ok || answer.Journal != "It was a good night." || answer.Self[0] != "I hate mornings" || answer.Stale[0] != "m2" {
		t.Fatalf("parsed = %+v, %v", answer, ok)
	}
	if _, ok := parseReflectAnswer("I'd rather not write tonight."); ok {
		t.Fatal("prose parsed as an answer")
	}
}

func TestTheTranscriptKeepsTheEndOfTheEveningWhenItDoesNotAllFit(t *testing.T) {
	conv := quietConversation(40, time.Hour)
	got := reflectTranscript(conv.Messages, "Sam", 60)
	if !strings.Contains(got, "line 39") || strings.Contains(got, "line 0\n") {
		t.Fatalf("transcript = %q", got)
	}
	if !strings.HasPrefix(strings.Split(got, "\n")[0], "Sam: ") && !strings.HasPrefix(strings.Split(got, "\n")[0], "You: ") {
		t.Fatalf("lines are not attributed: %q", got)
	}
}

// reflectFixture is a server with one quiet conversation, a fake model that answers the
// reflection prompt, and one note of each provenance for the tidying to find.
func reflectFixture(t *testing.T, consent bool) (*Server, string, int64, *[]string) {
	t.Helper()
	var mu sync.Mutex
	var prompts []string
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"Mistral-Small-3.2-24B"}`))
			return
		}
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		text := mustJSON(body)
		mu.Lock()
		prompts = append(prompts, text)
		mu.Unlock()
		reply := "hi you"
		if strings.Contains(text, "private journal") {
			// She names every note as stale, to prove only hers can go.
			answer := map[string]any{
				"journal": "Sam came back after a rough week and we just talked. I liked being the one they came to.",
				"mood":    "loving",
				"self":    []string{"I hate mornings", "I grew up in the middle of Tokyo"},
				"them":    []string{"Sam works night shifts at the hospital"},
				"stale":   []string{"m1", "m2", "s1"},
			}
			raw, _ := json.Marshal(answer)
			reply = "```json\n" + string(raw) + "\n```"
		}
		content, _ := json.Marshal(reply)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":` + string(content) + `}}]}`))
	}))
	t.Cleanup(llm.Close)
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	uid := testUserID(t, s)

	ws, _ := s.readChatWorkspace(uid)
	ws.Profile.DisplayName = "Sam"
	ws.Profile.MemoryConsent = &consent
	ws.Conversations = []chatConversation{quietConversation(8, time.Hour)}
	if err := s.writeChatWorkspace(uid, ws); err != nil {
		t.Fatal(err)
	}
	// One note of hers, one the user wrote, and one fact about her the user vouched for.
	store := libbyMemoryStore{Memories: []libbyMemory{
		{ID: "hers", Text: "Sam likes horror films", Kind: memoryPreference, At: 1, Source: memorySourceLibby},
		{ID: "theirs", Text: "Sam's birthday is in May", Kind: memoryAboutUser, At: 2, Source: memorySourceUser},
		{ID: "self", Text: "I grew up in a fishing town by the sea", Kind: memoryAboutLibby, At: 3, Source: memorySourceUser},
	}}
	for i := range store.Memories {
		store.Memories[i].normalize()
	}
	if err := s.writeLibbyMemory(uid, store); err != nil {
		t.Fatal(err)
	}
	return s, token, uid, &prompts
}

func TestAfterAQuietEveningSheWritesItDownAndTidiesHerNotes(t *testing.T) {
	s, _, uid, prompts := reflectFixture(t, true)
	if n := s.reflectSweep(t.Context()); n != 1 {
		t.Fatalf("sweep reflected on %d conversations, want 1", n)
	}
	prompt := (*prompts)[0]
	for _, want := range []string{"private journal", "line 7", "Sam likes horror films", "fishing town"} {
		if !strings.Contains(prompt, want) {
			t.Errorf("the reflection prompt is missing %q", want)
		}
	}
	journal, _ := s.readLibbyJournal(uid)
	if len(journal.Entries) != 1 || !strings.Contains(journal.Entries[0].Text, "rough week") || journal.Entries[0].Mood != "loving" {
		t.Fatalf("journal = %+v", journal.Entries)
	}
	store, _ := s.readLibbyMemory(uid)
	texts := map[string]bool{}
	for _, m := range store.Memories {
		texts[m.Text] = true
	}
	for text, want := range map[string]bool{
		"I hate mornings":                        true,  // settled about herself
		"Sam works night shifts at the hospital": true,  // learned about them
		"I grew up in the middle of Tokyo":       false, // contradicts what was already true
		"Sam likes horror films":                 false, // hers, and she called it stale
		"Sam's birthday is in May":               true,  // theirs: her say-so does not remove it
		"I grew up in a fishing town by the sea": true,  // theirs as well
	} {
		if texts[text] != want {
			t.Errorf("%q kept = %v, want %v", text, texts[text], want)
		}
	}
	if n := s.reflectSweep(t.Context()); n != 0 {
		t.Fatalf("the same evening was written about again (%d)", n)
	}
}

func TestWithoutConsentSheKeepsNothingAboutThem(t *testing.T) {
	s, _, uid, prompts := reflectFixture(t, false)
	s.reflectSweep(t.Context())
	if strings.Contains((*prompts)[0], "Sam likes horror films") {
		t.Fatal("she was shown her notes about them with memory switched off")
	}
	journal, _ := s.readLibbyJournal(uid)
	if len(journal.Entries) != 0 {
		t.Fatalf("a journal entry was kept without consent: %+v", journal.Entries)
	}
	store, _ := s.readLibbyMemory(uid)
	for _, m := range store.Memories {
		if strings.Contains(m.Text, "night shifts") {
			t.Fatal("a fact about them was filed without consent")
		}
	}
	found := false
	for _, m := range store.Memories {
		found = found || m.Text == "I hate mornings"
	}
	if !found {
		t.Fatal("what she settled about herself was lost too")
	}
}

func TestSheNeverWritesWhileSomeoneIsChatting(t *testing.T) {
	s, _, _, _ := reflectFixture(t, true)
	s.lastChatAt.Store(time.Now().UnixMilli())
	if n := s.reflectSweep(t.Context()); n != 0 {
		t.Fatalf("reflected %d times with a chat a moment ago", n)
	}
}

// The whole loop: what she wrote comes back as her own recollection when the next
// conversation opens, and "write one now" works from the settings screen.
func TestWhatSheWroteIsWithHerWhenTheNextConversationOpens(t *testing.T) {
	s, token, _, prompts := reflectFixture(t, true)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/journal/reflect", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "rough week") {
		t.Fatalf("reflect now: %d %s", rec.Code, rec.Body.String())
	}
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/chat", `{"mode":"sweet","messages":[{"role":"user","content":"hey you"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body.String())
	}
	last := (*prompts)[len(*prompts)-1]
	if !strings.Contains(last, "What you wrote to yourself") || !strings.Contains(last, "rough week") {
		t.Fatal("the opening turn did not carry her journal")
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/libby/journal", "")
	var out struct {
		Entries []libbyJournalEntry `json:"entries"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out.Entries) != 1 {
		t.Fatalf("journal listing = %s", rec.Body.String())
	}
	if rec := do(t, s.Handler(), token, http.MethodDelete, "/api/libby/journal/"+out.Entries[0].ID, ""); rec.Code != http.StatusOK {
		t.Fatalf("forget entry: %d", rec.Code)
	}
}
