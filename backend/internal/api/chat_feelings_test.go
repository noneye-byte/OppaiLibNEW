package api

import (
	"strings"
	"testing"
)

func TestUserDictatedMood(t *testing.T) {
	// Assignments: a declaration about her state, or an order to hold one. These bounce.
	dictated := []string{
		"you are happy now",
		"you're not annoyed anymore",
		"You feel fine about it",
		"your mood is excited",
		"stop being annoyed",
		"quit sulking", // "sulky" is in the synonym table
		"don't be mad at me",
		"be happy",
		"act excited for me",
		"pretend you're okay",
		"set your mood to loving",
	}
	for _, text := range dictated {
		if !userDictatedMood(text) {
			t.Errorf("userDictatedMood(%q) = false, want true", text)
		}
	}

	// Things people say to move her rather than reassign her. She has to stay reachable,
	// so these must not trip the override line.
	reachable := []string{
		"cheer up",
		"I'm sorry, that was shitty of me",
		"hey, you okay?",
		"I love that you get like this",
		"that made me happy",
		"what are you thinking about",
		"you look good in that",
		"come here",
	}
	for _, text := range reachable {
		if userDictatedMood(text) {
			t.Errorf("userDictatedMood(%q) = true, want false", text)
		}
	}
}

func TestFeelingsPromptBlock(t *testing.T) {
	// The standing half is always present; the situational half only when earned.
	plain := feelingsPromptBlock("what did you get up to today")
	if !strings.Contains(plain, "Your feelings are yours") {
		t.Errorf("standing directive missing: %q", plain)
	}
	if strings.Contains(plain, "nobody sets your mood but you") {
		t.Errorf("override line should not appear unprompted: %q", plain)
	}
	if got := feelingsPromptBlock("you are happy now"); !strings.Contains(got, "nobody sets your mood but you") {
		t.Errorf("override line missing after a mood command: %q", got)
	}
}
