package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestFindRememberTags(t *testing.T) {
	facts := findRememberTags("Noted. [remember: their name is Owen] Anything else? [remember: they hate horror]")
	if len(facts) != 2 || facts[0] != "their name is Owen" || facts[1] != "they hate horror" {
		t.Fatalf("got %#v, want the two facts in order", facts)
	}
	// Capped at two even when a model tries to file the whole conversation.
	facts = findRememberTags("[remember: a] [remember: b] [remember: c]")
	if len(facts) != 2 {
		t.Fatalf("got %d facts, want it capped at %d", len(facts), maxRememberedPerReply)
	}
	if got := findRememberTags("Nothing worth keeping here."); got != nil {
		t.Errorf("found a memory in prose that has none: %#v", got)
	}
	// An empty tag is not a fact.
	if got := findRememberTags("[remember:  ]"); got != nil {
		t.Errorf("accepted an empty remember tag: %#v", got)
	}
}

// The remember tag is machinery the user must never read, so scrubbing takes it out the
// same way it takes out mood and send tags.
func TestScrubDirectivesRemovesRememberTag(t *testing.T) {
	cases := []struct{ reply, want string }{
		{"Got it. [remember: they work nights] Talk soon.", "Got it. Talk soon."},
		{"I'll keep that in mind. [remember: allergic to cats]", "I'll keep that in mind."},
		{"Sure. *makes a note that you like tea* Anyway.", "Sure. Anyway."},
	}
	for _, tc := range cases {
		if got := scrubDirectives(tc.reply); got != tc.want {
			t.Errorf("scrubDirectives(%q)\n got %q\nwant %q", tc.reply, got, tc.want)
		}
	}
	// Prose that merely uses "remember" or "note" is her voice, not machinery, and must
	// survive: the memory scrub only fires on a "<verb> that/this/how/what" clause.
	for _, reply := range []string{
		"*I remember you from before* Good to see you again.",
		"*note the freckle on your shoulder* Cute.",
		"I'll remember you said that.",
		"*saves you a seat* Sit.",
	} {
		if got := scrubDirectives(reply); got != reply {
			t.Errorf("scrubDirectives(%q) = %q, want it unchanged", reply, got)
		}
	}
}

func TestMemoryPromptBlock(t *testing.T) {
	if got := memoryPromptBlock(libbyMemoryStore{}); got != "" {
		t.Errorf("empty store produced a block: %q", got)
	}
	block := memoryPromptBlock(libbyMemoryStore{Memories: []libbyMemory{{Text: "their name is Owen"}}})
	if !strings.Contains(block, "their name is Owen") {
		t.Errorf("block omitted the fact: %q", block)
	}

	// Grouped under headings by kind, because a limit and a fond evening mean different things
	// to her and a flat list does not say which is which.
	grouped := memoryPromptBlock(libbyMemoryStore{Memories: []libbyMemory{
		{Text: "they asked me not to bring up their ex", Kind: memoryBoundary},
		{Text: "they like slow burn stuff", Kind: memoryPreference},
	}})
	if !strings.Contains(grouped, memoryKindHeading[memoryBoundary]) || !strings.Contains(grouped, memoryKindHeading[memoryPreference]) {
		t.Errorf("block is not grouped by kind: %q", grouped)
	}
	// Boundaries come first: they are what she must not get wrong.
	if strings.Index(grouped, "their ex") > strings.Index(grouped, "slow burn") {
		t.Error("boundaries should be presented before preferences")
	}

	// A hedged memory is flagged rather than presented as fact, and the explanation of what
	// the flag means appears with it.
	hedged := memoryPromptBlock(libbyMemoryStore{Memories: []libbyMemory{{Text: "I think they have a sister"}}})
	if !strings.Contains(hedged, "not certain") || !strings.Contains(hedged, "half-memory") {
		t.Errorf("hedged memory was not flagged as uncertain: %q", hedged)
	}
	// And a plain one is not.
	if strings.Contains(block, "not certain") {
		t.Errorf("a plain fact was flagged uncertain: %q", block)
	}
}

// The store merges restatements, forgets the weakest when full, and clears. The user id is
// arbitrary here — the store keys only the file path off it, no DB row required.
func TestLibbyMemoryStoreRoundTrip(t *testing.T) {
	s, _ := newTestServer(t)
	const uid = int64(1)

	changed, err := s.appendLibbyMemories(uid, []string{"they like horror films", "they cannot stand cilantro"})
	if err != nil || !changed {
		t.Fatalf("first append: changed=%v err=%v", changed, err)
	}
	// Re-filing what she already knows does not add a second copy — it reinforces the one she
	// has, which is how a preference forms from repetition rather than from one mention.
	if _, err := s.appendLibbyMemories(uid, []string{"THEY LIKE HORROR FILMS"}); err != nil {
		t.Fatalf("restate: %v", err)
	}
	store, err := s.readLibbyMemory(uid)
	if err != nil || len(store.Memories) != 2 {
		t.Fatalf("read back: %d memories, err=%v", len(store.Memories), err)
	}
	for _, m := range store.Memories {
		if strings.Contains(strings.ToLower(m.Text), "horror") && m.Recalls == 0 {
			t.Error("a restated memory should have been reinforced, not just deduped")
		}
	}

	// A reworded restatement merges too: exact matching was not enough, because a model
	// reminded of a fact re-emits it in different words.
	if _, err := s.appendLibbyMemories(uid, []string{"they really like horror films a lot"}); err != nil {
		t.Fatalf("reworded restate: %v", err)
	}
	store, _ = s.readLibbyMemory(uid)
	if len(store.Memories) != 2 {
		t.Fatalf("a reworded restatement was stored separately: %d memories", len(store.Memories))
	}

	// Trivia is refused outright, so a model told it may remember cannot fill the store with
	// "they said hello".
	if changed, _ := s.appendLibbyMemories(uid, []string{"they said hello", "ok"}); changed {
		t.Error("trivial notes should not be stored")
	}

	// Past the cap the weakest fall away, and a pinned memory and a boundary never do.
	pinned := libbyMemory{ID: "pinnedone", Text: "their birthday is in March", Kind: memoryAboutUser, Pinned: true, At: 1}
	bound := libbyMemory{ID: "boundaryone", Text: "they asked me never to bring up their ex", Kind: memoryBoundary, At: 1}
	store, _ = s.readLibbyMemory(uid)
	store.Memories = append([]libbyMemory{pinned, bound}, store.Memories...)
	if err := s.writeLibbyMemory(uid, store); err != nil {
		t.Fatalf("seed pinned: %v", err)
	}
	// Distinct facts, not variations on one sentence: near-duplicates merge by design, so
	// filler that shares its content words would collapse into a single record and never
	// reach the cap. Two words each, one of them unique.
	many := make([]string, maxLibbyMemories+5)
	for i := range many {
		many[i] = "collects zqx" + itoa(int64(i)) + "wm"
	}
	if _, err := s.appendLibbyMemories(uid, many); err != nil {
		t.Fatalf("bulk append: %v", err)
	}
	store, _ = s.readLibbyMemory(uid)
	if len(store.Memories) != maxLibbyMemories {
		t.Fatalf("after overflow: %d memories, want cap %d", len(store.Memories), maxLibbyMemories)
	}
	found := map[string]bool{}
	for _, m := range store.Memories {
		found[m.ID] = true
	}
	if !found["pinnedone"] {
		t.Error("a pinned memory was forgotten")
	}
	if !found["boundaryone"] {
		t.Error("a boundary was forgotten")
	}
	if store.Memories[len(store.Memories)-1].Text != many[len(many)-1] {
		t.Errorf("newest memory was dropped: last is %q", store.Memories[len(store.Memories)-1].Text)
	}
}

// A store written before memories had kinds still loads, and acquires them on read.
func TestLibbyMemoryUpgradesFlatRecords(t *testing.T) {
	s, _ := newTestServer(t)
	const uid = int64(7)
	// Exactly what the old build wrote: id, text, at, and nothing else.
	if err := s.writeLibbyMemory(uid, libbyMemoryStore{Memories: []libbyMemory{
		{ID: "old1", Text: "they asked me not to mention their job", At: 1},
		{ID: "old2", Text: "they like being teased", At: 2},
	}}); err != nil {
		t.Fatalf("seed old store: %v", err)
	}
	store, err := s.readLibbyMemory(uid)
	if err != nil {
		t.Fatalf("read old store: %v", err)
	}
	if len(store.Memories) != 2 {
		t.Fatalf("lost records on upgrade: %d", len(store.Memories))
	}
	for _, m := range store.Memories {
		if !validMemoryKind(m.Kind) || m.Weight == 0 || m.Confidence == 0 || m.Source == "" {
			t.Errorf("record %q was not normalized: %+v", m.ID, m)
		}
	}
	if store.Memories[0].Kind != memoryBoundary {
		t.Errorf("an old boundary was classified as %q", store.Memories[0].Kind)
	}
}

// Adding, editing and pinning from the settings screen.
func TestLibbyMemoryEditing(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/libby/memory", `{"text":"they work nights and sleep late","kind":"user"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("add memory: %d %s", rec.Code, rec.Body)
	}
	var added libbyMemory
	if err := json.Unmarshal(rec.Body.Bytes(), &added); err != nil {
		t.Fatalf("decode added: %v", err)
	}
	// Typed in by the user, so never treated as a guess.
	if added.Source != memorySourceUser || added.Confidence != 1 {
		t.Errorf("a user-entered memory should be certain and attributed: %+v", added)
	}
	// A fragment is not a memory.
	if rec := do(t, h, token, http.MethodPost, "/api/libby/memory", `{"text":"yes"}`); rec.Code != http.StatusBadRequest {
		t.Errorf("a fragment was accepted: %d %s", rec.Code, rec.Body)
	}

	// Editing corrects the text; pinning exempts it from being forgotten.
	rec = do(t, h, token, http.MethodPatch, "/api/libby/memory/"+added.ID, `{"text":"they work early mornings, not nights","pinned":true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("edit memory: %d %s", rec.Code, rec.Body)
	}
	var edited libbyMemory
	_ = json.Unmarshal(rec.Body.Bytes(), &edited)
	if !edited.Pinned || !strings.Contains(edited.Text, "early mornings") {
		t.Errorf("edit did not take: %+v", edited)
	}
	// An unknown kind is refused rather than silently stored.
	if rec := do(t, h, token, http.MethodPatch, "/api/libby/memory/"+added.ID, `{"kind":"nonsense"}`); rec.Code != http.StatusBadRequest {
		t.Errorf("an unknown kind was accepted: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, token, http.MethodPatch, "/api/libby/memory/00000000000000000000000000000000", `{"pinned":true}`); rec.Code != http.StatusNotFound {
		t.Errorf("editing a missing memory: %d %s", rec.Code, rec.Body)
	}
}

// The settings endpoints read and clear what the chat path wrote.
func TestLibbyMemoryEndpoints(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	if _, err := s.appendLibbyMemories(1, []string{"their name is Owen"}); err != nil {
		t.Fatalf("seed memory: %v", err)
	}

	rec := do(t, h, token, http.MethodGet, "/api/libby/memory", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "their name is Owen") {
		t.Fatalf("get memory: %d %s", rec.Code, rec.Body)
	}

	rec = do(t, h, token, http.MethodDelete, "/api/libby/memory", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("clear memory: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodGet, "/api/libby/memory", "")
	if strings.Contains(rec.Body.String(), "their name is Owen") {
		t.Fatalf("memory survived clear: %s", rec.Body)
	}
}
