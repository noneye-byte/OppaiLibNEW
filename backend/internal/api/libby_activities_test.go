package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The tag is read off the end, resolved through the synonyms models actually write,
// and removed from the prose whether or not it meant anything.
func TestSplitActivity(t *testing.T) {
	cases := []struct {
		name     string
		reply    string
		wantText string
		want     string
		declared bool
	}{
		{"as specified", "still here.\n[doing: reading]", "still here.", "reading", true},
		// Typing is the app's to show while a reply is being written, never hers to
		// declare: a model writing it means "I am here", which is nothing in particular.
		{"typing clears", "still here.\n[doing: typing]", "still here.", "", true},
		{"a synonym, title case", "one sec\n[Doing: Masturbating]", "one sec", "fingering", true},
		{"markdown wrapped", "hi\n*[doing: reading]*", "hi", "reading", true},
		{"cleared", "ok, done.\n[doing: none]", "ok, done.", "", true},
		// Unreadable, but the tag still must not survive into what the user reads.
		{"unreadable is still stripped", "hey\n[doing: recalibrating]", "hey", "", false},
		{"no tag at all", "just talking", "just talking", "", false},
	}
	for _, tc := range cases {
		text, activity, declared := splitActivity(tc.reply)
		if text != tc.wantText || activity != tc.want || declared != tc.declared {
			t.Errorf("%s: (%q, %q, %v), want (%q, %q, %v)",
				tc.name, text, activity, declared, tc.wantText, tc.want, tc.declared)
		}
	}
	// A reply that is nothing but a tag is not a reply, and must come back untouched so
	// the caller's own "she said nothing" check reports the real problem.
	if text, _, declared := splitActivity("[doing: reading]"); declared || text != "[doing: reading]" {
		t.Fatalf("a bare tag was treated as a reply: %q, %v", text, declared)
	}
}

// The heat gate is the part that holds. The directive asks her to keep the intimate
// states for scenes that have got there, which is a request to a model; this is what
// happens when the model ignores it.
func TestActivityHeatGate(t *testing.T) {
	if got := allowedActivity("vibrator", 2); got != "" {
		t.Fatalf("an intimate state took at heat 2: %q", got)
	}
	if got := allowedActivity("vibrator", 4); got != "vibrator" {
		t.Fatalf("an intimate state was refused at its own floor: %q", got)
	}
	if got := allowedActivity("reading", 1); got != "reading" {
		t.Fatalf("an idle state was gated: %q", got)
	}
	// The typing slot is set by the client while she composes and is never a state she
	// can put herself into, whatever the heat.
	if got := allowedActivity("typing", 5); got != "" {
		t.Fatalf("the app-driven typing slot was accepted as a declared state: %q", got)
	}
	if got := allowedActivity("not-a-state", 5); got != "" {
		t.Fatalf("an invented state resolved: %q", got)
	}
}

// What she is shown depends on where the meter is: told the whole vocabulary in a
// calm conversation she writes tags that are refused, and a refusal she cannot see
// reads to her as the tag not working.
func TestActivityDirectiveTracksHeat(t *testing.T) {
	calm := activityDirective(1, "", nil)
	if !strings.Contains(calm, "reading") {
		t.Fatalf("the idle states are missing at heat 1: %s", calm)
	}
	if strings.Contains(calm, "typing") {
		t.Fatalf("the app-driven typing slot was offered as a state to declare: %s", calm)
	}
	for _, state := range []string{"vibrator", "fingering", "climax"} {
		if strings.Contains(calm, state) {
			t.Fatalf("%q was offered at heat 1: %s", state, calm)
		}
	}
	hot := activityDirective(5, "", nil)
	for _, state := range []string{"reading", "rubbing", "fingering", "vibrator", "dildo", "spread", "climax"} {
		if !strings.Contains(hot, state) {
			t.Fatalf("%q is missing at heat 5: %s", state, hot)
		}
	}
	// Opening on nothing, she is asked to settle into something this reply; already
	// in a state, she is not — "tag it when it changes" is enough once there is a
	// state to change from.
	if !strings.Contains(calm, "tag it in this reply") {
		t.Fatalf("no nudge to pick an opening state: %s", calm)
	}
	if settled := activityDirective(1, "reading", nil); strings.Contains(settled, "tag it in this reply") {
		t.Fatalf("nudged to pick a state while already in one: %s", settled)
	}
	// A state already set is restated as still true, which is what makes it a state
	// rather than a reaction to one message. It is a separate block from the vocabulary
	// above on purpose: the vocabulary is budgeted and this is not, so being in a state
	// stays true even on a window too small to explain how to leave one.
	state := activityStateDirective("reading")
	if !strings.Contains(state, "Right now you are reading something") {
		t.Fatalf("the current state was not carried into the turn: %s", state)
	}
	if activityStateDirective("") != "" || activityStateDirective("not-a-state") != "" || activityStateDirective("typing") != "" {
		t.Fatal("a state that does not exist was asserted anyway")
	}
}

// Every MISC state is a usable art slot, and nothing collides with an emotion — the
// two share one filename scheme, so a collision would be one overwriting the other.
func TestActivitySlotsAreDistinctFromEmotions(t *testing.T) {
	seen := map[string]bool{}
	for _, slot := range libbySlots {
		if seen[slot] {
			t.Fatalf("%q appears twice in the slot vocabulary", slot)
		}
		seen[slot] = true
		if !libbySlotValid(slot) {
			t.Fatalf("%q is a slot the upload endpoint would refuse", slot)
		}
	}
	for _, activity := range libbyActivities {
		if libbyEmotionValid(activity.ID) {
			t.Fatalf("the state %q collides with an emotion of the same name", activity.ID)
		}
		if activity.Says == "" || activity.Label == "" {
			t.Fatalf("the state %q has nothing to show or say", activity.ID)
		}
	}
	// Every synonym has to land on a real slot or on the deliberate clear.
	for word, slot := range activitySynonyms {
		if slot != "" && !libbyActivityValid(slot) {
			t.Fatalf("the synonym %q resolves to %q, which is not a state", word, slot)
		}
	}
}

// End to end: she declares a state, it comes back to the client, and the tag never
// reaches the prose.
func TestChatReturnsTheStateSheDeclared(t *testing.T) {
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"one sec, finishing a thought.\n[doing: reading]\n[mood: happy 2]"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"you about?"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message  string `json:"message"`
		Activity string `json:"activity"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Activity != "reading" {
		t.Fatalf("activity = %q, want reading", out.Activity)
	}
	if strings.Contains(out.Message, "doing") || strings.Contains(out.Message, "[") {
		t.Fatalf("the tag reached the prose: %q", out.Message)
	}
}

// A state the heat does not support is refused, and refusing the change leaves her in
// the one she was already in rather than in none at all.
func TestChatRefusesAnUngatedStateAndKeepsTheOldOne(t *testing.T) {
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"hi there.\n[doing: vibrator]\n[mood: happy 1]"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","intensity":1,"activity":"reading","messages":[{"role":"user","content":"morning"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message  string `json:"message"`
		Activity string `json:"activity"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Activity != "reading" {
		t.Fatalf("activity = %q, want the state she was already in", out.Activity)
	}
	if strings.Contains(out.Message, "[") {
		t.Fatalf("the refused tag reached the prose: %q", out.Message)
	}
}

// A line they have drawn holds the way the heat floor does: the state is refused
// server-side, not merely left out of the prompt.
func TestARememberedBoundaryRulesAStateOut(t *testing.T) {
	store := libbyMemoryStore{Memories: []libbyMemory{
		{Text: "They asked me never to bring toys into it", Kind: memoryBoundary},
		{Text: "They love it when I tease", Kind: memoryPreference},
	}}
	limits := activityLimits(store)
	if !limits["vibrator"] || !limits["dildo"] {
		t.Fatalf("toys were not ruled out: %v", limits)
	}
	if limits["teasing"] || limits["fingering"] {
		t.Fatalf("a preference or an unrelated state was ruled out: %v", limits)
	}
	if withinLimits(allowedActivity("vibrator", 5), limits) != "" {
		t.Error("the heat gate let a limited state through")
	}
	if withinLimits(allowedActivity("fingering", 5), limits) != "fingering" {
		t.Error("an unlimited state was refused")
	}
	if directive := activityDirective(5, "", limits); strings.Contains(directive, "vibrator") || !strings.Contains(directive, "fingering") {
		t.Errorf("the vocabulary did not follow the limits: %s", directive)
	}
	// A blanket limit empties the intimate half entirely.
	blanket := activityLimits(libbyMemoryStore{Memories: []libbyMemory{{Text: "keep it clean, nothing sexual", Kind: memoryBoundary}}})
	for _, a := range libbyActivities {
		if a.Group == activityIntimate && !blanket[a.ID] {
			t.Errorf("%s survived a blanket limit", a.ID)
		}
		if a.Group == activityIdle && blanket[a.ID] {
			t.Errorf("%s, an idle state, was ruled out", a.ID)
		}
	}
}
