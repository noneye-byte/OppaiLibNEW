package api

import (
	"strings"
	"testing"
)

// The run is read off the client's own log, and a client that reports nothing must
// not have a stuck face inferred for it.
func TestMoodRunLength(t *testing.T) {
	cases := []struct {
		name    string
		recent  []string
		current string
		want    int
	}{
		{"nothing reported is not a run", nil, "happy", 1},
		{"one repeat", []string{"happy"}, "happy", 2},
		{"broken by a different mood", []string{"happy", "happy", "sad"}, "happy", 1},
		{"only the tail counts", []string{"sad", "happy", "happy"}, "happy", 3},
		{"case and spacing are the client's business", []string{" Happy ", "HAPPY"}, "happy", 3},
		{"no current mood is no run", []string{"happy"}, "", 0},
	}
	for _, tc := range cases {
		if got := moodRunLength(tc.recent, tc.current); got != tc.want {
			t.Errorf("%s: run = %d, want %d", tc.name, got, tc.want)
		}
	}
}

// Being asked about a stale mood is situational: it appears once she has actually
// been sitting on one, and never before. A standing version makes her perform
// instability, which is the failure this is careful not to cause.
func TestMoodStuckDirectiveOnlyFiresOnARun(t *testing.T) {
	if block := moodPromptBlock([]string{"happy"}, "happy"); strings.Contains(block, "for your last") {
		t.Fatalf("two replies is a mood, not a run: %s", block)
	}
	block := moodPromptBlock([]string{"happy", "happy", "happy"}, "happy")
	if !strings.Contains(block, "You have looked happy for your last 4 replies") {
		t.Fatalf("a real run went unremarked: %s", block)
	}
	// The standing half is always there, whatever the run.
	if !strings.Contains(block, "not from the tag you wrote last time") {
		t.Fatalf("the standing movement directive is missing: %s", block)
	}
}

// The fallback that runs when a model drops the mood tag. It used to know four
// keywords and otherwise return whatever she was already showing.
func TestInferChatEmotionReadsTheWholeVocabulary(t *testing.T) {
	cases := []struct {
		name        string
		user, reply string
		current     string
		run         int
		want        string
	}{
		{"her own words name the feeling", "well?", "god, that's embarrassing, don't look at me", "neutral", 1, "shy"},
		{"a mood no keyword used to reach", "go to bed", "mm, I'm so tired I can barely type", "happy", 1, "sleepy"},
		{"sulking is its own face now", "you're wrong", "fine. whatever. I'm not arguing about it again", "happy", 1, "annoyed"},
		{"her words outweigh theirs", "I'm so annoyed with today", "come here, I've got you", "neutral", 1, "loving"},
		// No emotional vocabulary at all, and a mood that has only just been set: she
		// keeps it, because there is no evidence it moved.
		{"a fresh mood with no signal holds", "ok", "the file is in the second folder", "smug", 1, "smug"},
		// The same reply after she has worn that face for a while. This is the case that
		// used to be permanent.
		{"an unfed mood eventually eases off", "ok", "the file is in the second folder", "smug", 5, "neutral"},
		{"an unknown current mood lands somewhere real", "ok", "the file is in the second folder", "elated", 1, "neutral"},
	}
	for _, tc := range cases {
		if got := inferChatEmotion(tc.user, tc.reply, tc.current, tc.run); got != tc.want {
			t.Errorf("%s: emotion = %q, want %q", tc.name, got, tc.want)
		}
	}
}

// Every mood settles somewhere drawable, and nothing settles onto itself except
// neutral — a cycle would mean an unfed feeling that never eases at all.
func TestMoodSettlesResolveToDrawablePoses(t *testing.T) {
	for _, mood := range libbyEmotions {
		settled, known := moodSettles[mood]
		if !known {
			t.Errorf("%s has nowhere to settle", mood)
			continue
		}
		if !supportedLibbyEmotions[settled] {
			t.Errorf("%s settles into %q, which is not a face she has", mood, settled)
		}
		if settled == mood && mood != "neutral" {
			t.Errorf("%s settles into itself, so it never eases off", mood)
		}
	}
}
