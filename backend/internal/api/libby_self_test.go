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

func testUserID(t *testing.T, s *Server) int64 {
	t.Helper()
	u, err := s.db.UserByName(t.Context(), "tester")
	if err != nil {
		t.Fatal(err)
	}
	return u.ID
}

func TestSheKeepsWhatSheSaysAboutHerLifeAndNotWhatSheSaysInTheMoment(t *testing.T) {
	for reply, want := range map[string]int{
		"I grew up in a tiny fishing town. lol anyway what are you up to?": 1,
		"honestly my favourite film is Spirited Away":                      1, // no closing punctuation
		"*stretches* my mum used to make pancakes every sunday.":           1,
		"I've always wanted to try that with you.":                         0, // about the two of them
		"I'm so wet right now.":                                            0, // the moment, not a life
		"Did you grow up around here?":                                     0,
		"if I grew up somewhere else I'd be so different.":                 0, // a hypothetical
	} {
		if got := captureSelfFacts(reply); len(got) != want {
			t.Errorf("captureSelfFacts(%q) = %q, want %d", reply, got, want)
		}
	}
}

func TestTheFirstTellingOfSomethingAboutHerStands(t *testing.T) {
	s, _ := newTestServer(t)
	uid := testUserID(t, s)
	if _, err := s.appendLibbyMemories(uid, asSelfFacts([]string{"I grew up in a fishing town by the sea"})); err != nil {
		t.Fatal(err)
	}
	if _, err := s.appendLibbyMemories(uid, asSelfFacts([]string{"I grew up in the middle of Tokyo", "My sister is a nurse"})); err != nil {
		t.Fatal(err)
	}
	store, _ := s.readLibbyMemory(uid)
	var self []string
	for _, m := range store.Memories {
		if m.Kind == memoryAboutLibby {
			self = append(self, m.Text)
		}
	}
	if len(self) != 2 || self[0] != "I grew up in a fishing town by the sea" || self[1] != "My sister is a nurse" {
		t.Fatalf("self facts = %q", self)
	}
}

func TestWhoSheIsAndWhatSheKnowsAboutThemAreCappedApart(t *testing.T) {
	now := time.Now()
	var memories []libbyMemory
	for i := 0; i < maxSelfFacts; i++ {
		m := libbyMemory{ID: fmt.Sprint("s", i), Text: fmt.Sprintf("I have opinion number %d", i), Kind: memoryAboutLibby,
			At: now.Add(-400 * 24 * time.Hour).UnixMilli()}
		m.normalize()
		memories = append(memories, m)
	}
	for i := 0; i < maxLibbyMemories+5; i++ {
		m := libbyMemory{ID: fmt.Sprint("u", i), Text: fmt.Sprintf("They collect record number %d", i), Kind: memoryAboutUser, At: now.UnixMilli()}
		m.normalize()
		memories = append(memories, m)
	}
	kept := forgetWeakest(memories, now)
	self, about := 0, 0
	for _, m := range kept {
		if m.Kind == memoryAboutLibby {
			self++
		} else {
			about++
		}
	}
	if self != maxSelfFacts || about != maxLibbyMemories {
		t.Fatalf("kept %d about her and %d about them, want %d and %d", self, about, maxSelfFacts, maxLibbyMemories)
	}
	old := memories[0]
	fresh := old
	fresh.UpdatedAt = now.UnixMilli()
	if memoryScore(old, now) != memoryScore(fresh, now) {
		t.Fatal("a year-old fact about herself scored lower than a new one")
	}
}

func TestWhoSheIsHasItsOwnSectionAndLeavesTheirs(t *testing.T) {
	store := libbyMemoryStore{Memories: []libbyMemory{
		{ID: "a", Text: "I grew up by the sea", Kind: memoryAboutLibby, At: 1},
		{ID: "b", Text: "Their name is Sam", Kind: memoryAboutUser, At: 2},
	}}
	if theirs := memoryPromptBlock(store); strings.Contains(theirs, "by the sea") || !strings.Contains(theirs, "Sam") {
		t.Fatalf("memory block = %q", theirs)
	}
	if hers := selfPromptBlock(store); !strings.Contains(hers, "by the sea") || strings.Contains(hers, "Sam") {
		t.Fatalf("self block = %q", hers)
	}
}

// The whole path: something she says about herself in one turn is in front of her on
// the next.
func TestWhatSheSaysAboutHerselfIsThereNextTime(t *testing.T) {
	var mu sync.Mutex
	var prompts []string
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"m-24B"}`))
			return
		}
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		mu.Lock()
		prompts = append(prompts, mustJSON(body))
		mu.Unlock()
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"mm. I grew up in a tiny fishing town, it was so quiet"}}]}`))
	}))
	defer llm.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	for i := 0; i < 2; i++ {
		rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat", `{"mode":"sweet","messages":[{"role":"user","content":"where are you from?"}]}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("chat: %d %s", rec.Code, rec.Body.String())
		}
	}
	if strings.Contains(prompts[0], "Who you are, beyond the card") {
		t.Fatal("the first turn already had a self section")
	}
	if !strings.Contains(prompts[1], "Who you are, beyond the card") || !strings.Contains(prompts[1], "tiny fishing town") {
		t.Fatal("the second turn did not know where she grew up")
	}
}
