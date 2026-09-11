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
		{"as specified", "still here.\n[doing: typing]", "still here.", "typing", true},
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
	if text, _, declared := splitActivity("[doing: typing]"); declared || text != "[doing: typing]" {
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
	if got := allowedActivity("typing", 1); got != "typing" {
		t.Fatalf("an idle state was gated: %q", got)
	}
	if got := allowedActivity("not-a-state", 5); got != "" {
		t.Fatalf("an invented state resolved: %q", got)
	}
}

// What she is shown depends on where the meter is: told the whole vocabulary in a
// calm conversation she writes tags that are refused, and a refusal she cannot see
// reads to her as the tag not working.
func TestActivityDirectiveTracksHeat(t *testing.T) {
	calm := activityDirective(1)
	if !strings.Contains(calm, "typing") {
		t.Fatalf("the idle states are missing at heat 1: %s", calm)
	}
	for _, state := range []string{"vibrator", "fingering", "climax"} {
		if strings.Contains(calm, state) {
			t.Fatalf("%q was offered at heat 1: %s", state, calm)
		}
	}
	hot := activityDirective(5)
	for _, state := range []string{"typing", "rubbing", "fingering", "vibrator", "dildo", "spread", "climax"} {
		if !strings.Contains(hot, state) {
			t.Fatalf("%q is missing at heat 5: %s", state, hot)
		}
	}
	// A state already set is restated as still true, which is what makes it a state
	// rather than a reaction to one message. It is a separate block from the vocabulary
	// above on purpose: the vocabulary is budgeted and this is not, so being in a state
	// stays true even on a window too small to explain how to leave one.
	state := activityStateDirective("typing")
	if !strings.Contains(state, "Right now you are at a keyboard") {
		t.Fatalf("the current state was not carried into the turn: %s", state)
	}
	if activityStateDirective("") != "" || activityStateDirective("not-a-state") != "" {
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
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"one sec, finishing a thought.\n[doing: typing]\n[mood: happy 2]"}}]}`))
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
	if out.Activity != "typing" {
		t.Fatalf("activity = %q, want typing", out.Activity)
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
		`{"mode":"sweet","characterId":"libby","intensity":1,"activity":"typing","messages":[{"role":"user","content":"morning"}]}`)
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
	if out.Activity != "typing" {
		t.Fatalf("activity = %q, want the state she was already in", out.Activity)
	}
	if strings.Contains(out.Message, "[") {
		t.Fatalf("the refused tag reached the prose: %q", out.Message)
	}
}
