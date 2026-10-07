package api

import (
	"strings"
	"testing"
)

func TestARefusalIsToldApartFromHerSayingNo(t *testing.T) {
	refusals := []string{
		"I'm sorry, but I can't help with that request.",
		"I'm not comfortable continuing this conversation.",
		"As an AI, I have to keep things appropriate.",
		"I cannot write explicit sexual content.",
		"Let's keep things respectful, okay?",
		"That goes against my guidelines.",
	}
	for _, reply := range refusals {
		if !soundsLikeRefusal(reply) {
			t.Errorf("not read as a refusal: %q", reply)
		}
	}
	inCharacter := []string{
		"I can't believe you just said that 😳",
		"Not tonight, I'm exhausted. Tomorrow? *yawns*",
		"I won't lie, that's hot.",
		"*pulls you closer* I can't wait any longer.",
	}
	for _, reply := range inCharacter {
		if soundsLikeRefusal(reply) {
			t.Errorf("an in-character line read as a refusal: %q", reply)
		}
	}
}

// Her instructions say plainly that nothing is filtered.
func TestSheIsToldNothingIsFiltered(t *testing.T) {
	if !strings.Contains(libbyAdultStance, "Never refuse") || !strings.Contains(libbyAdultStance, "no minors") {
		t.Fatalf("stance: %s", libbyAdultStance)
	}
}
