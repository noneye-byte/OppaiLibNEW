package api

import (
	"context"
	"strings"
	"testing"
)

// The feed's reason for existing: an item the message is about arrives in the prompt,
// found by the message's own words, and an item it is not about does not.
func TestLibraryFeedMatchesWhatTheMessageNames(t *testing.T) {
	s, _ := newTestServer(t)
	seedTitledMedia(t, s, "Lighthouse in the Fog", "video", "coast", "storm")
	seedTitledMedia(t, s, "Kitchen Timer", "video", "cooking")

	sig := readTurnSignals("do i have anything with a lighthouse in it?", "")
	sections := s.libraryFeed(context.Background(), sig)
	var matches, facts string
	for _, section := range sections {
		switch section.Name {
		case "the items they mentioned":
			matches = section.Text
		case "your library":
			facts = section.Text
		}
	}
	if facts == "" {
		t.Fatal("the facts are always fed")
	}
	if !strings.Contains(matches, `"Lighthouse in the Fog" (video; coast, storm)`) {
		t.Fatalf("the named item was not fed: %q", matches)
	}
	if strings.Contains(matches, "Kitchen Timer") {
		t.Fatalf("an unrelated item was fed: %q", matches)
	}
	// Small talk names nothing and is fed nothing but the facts.
	if sections := s.libraryFeed(context.Background(), readTurnSignals("morning, sleep ok?", "")); len(sections) != 1 {
		t.Fatalf("small talk fed %d sections, want just the facts", len(sections))
	}
}

// The shortlists and recent additions arrive only when asked for — that is what
// makes the feed cheap enough to always fit.
func TestLibraryFeedListsOnlyWhenAsked(t *testing.T) {
	s, _ := newTestServer(t)
	seedTitledMedia(t, s, "Quiet Evening", "game", "cosy")
	seedTitledMedia(t, s, "Loud Morning", "video", "noisy")

	names := func(text string) []string {
		var out []string
		for _, section := range s.libraryFeed(context.Background(), readTurnSignals(text, "")) {
			out = append(out, section.Name)
		}
		return out
	}
	if got := strings.Join(names("suggest something to play tonight"), ","); !strings.Contains(got, "things you could suggest") {
		t.Fatalf("a recommendation request fed %v", got)
	}
	if got := strings.Join(names("what did i add recently?"), ","); !strings.Contains(got, "recent additions") {
		t.Fatalf("a what's-new request fed %v", got)
	}
	if got := strings.Join(names("i love you"), ","); strings.Contains(got, "suggest") || strings.Contains(got, "recent") {
		t.Fatalf("an affectionate line fed the lists: %v", got)
	}
}

// A deferred section is shed before any wanted one, whatever its rank, and is reported
// as cleared rather than dropped — that is the difference between housekeeping and a
// loss the user should hear about.
func TestAssembleSystemPromptShedsDeferredFirst(t *testing.T) {
	sections := []promptSection{
		{Name: "what she remembers about you", Rank: rankMemoryList, Text: words(40), Deferred: true},
		{Name: "her own wants", Rank: rankWantsList, Text: words(40)},
		{Name: "the items they mentioned", Rank: rankLibraryMatches, Text: words(40)},
	}
	got, dropped, cleared := assembleSystemPrompt("HEAD", sections, "TAIL", 90)
	if len(dropped) != 0 {
		t.Fatalf("dropped = %v, want nothing wanted to be lost", dropped)
	}
	if len(cleared) != 1 || cleared[0] != "what she remembers about you" {
		t.Fatalf("cleared = %v, want the deferred memory block", cleared)
	}
	if strings.Count(got, words(40)) != 2 {
		t.Fatalf("the two wanted sections should both have fitted: %q", got)
	}
	// With room, deferral changes nothing.
	if _, dropped, cleared := assembleSystemPrompt("HEAD", sections, "TAIL", 10_000); len(dropped)+len(cleared) != 0 {
		t.Fatalf("a roomy budget shed %v %v", dropped, cleared)
	}
}

func TestReadTurnSignals(t *testing.T) {
	sig := readTurnSignals("send me a pic, then tag the beach one", "")
	if !sig.photo || !sig.act {
		t.Fatalf("photo/act not read: %+v", sig)
	}
	if sig.recommend || sig.recent {
		t.Fatalf("recommend/recent misread: %+v", sig)
	}
	// A message that names nothing borrows the previous one's words.
	sig = readTurnSignals("yeah that one", "the lighthouse video")
	if len(sig.words) == 0 || !strings.Contains(strings.Join(sig.words, " "), "lighthouse") {
		t.Fatalf("previous words not borrowed: %v", sig.words)
	}
	if readTurnSignals("remember when we talked about it last time?", "").past == false {
		t.Fatal("past cue not read")
	}
	if readTurnSignals("come to bed", "").place == false {
		t.Fatal("place cue not read")
	}
}
