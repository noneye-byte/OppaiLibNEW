package tts

import "testing"

func TestShorthandIsSaidAsTheWordsItStandsFor(t *testing.T) {
	cases := map[string]string{
		"fr that's so good":            "for real that's so good",
		"ngl idk what u mean lol":      "not gonna lie I don't know what you mean haha",
		"omg rn?? FR":                  "oh my god right now? for real",
		"brb w/ snacks":                "be right back with snacks",
		"smh. ok fine":                 ". okay fine",
		"i'm on it, K?":                "i'm on it, K?",
		"r u serious":                  "are you serious",
		"I like R":                     "I like R",
		"call me tmrw xoxo":            "call me tomorrow",
		"it was a whole thing tho ngl": "it was a whole thing though not gonna lie",
	}
	for in, want := range cases {
		if got := Spoken(in); got != want {
			t.Errorf("Spoken(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestADrawnOutWordIsTheWord(t *testing.T) {
	cases := map[string]string{
		"sooo good":         "so good",
		"pleeease":          "please",
		"nooo way!!!":       "no way!",
		"what?!?!":          "what?",
		"mmmm":              "mm",
		"hiii~ how are you": "hi how are you",
		"good book":         "good book",
	}
	for in, want := range cases {
		if got := Spoken(in); got != want {
			t.Errorf("Spoken(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestAnActionIsItsSoundOrNothing(t *testing.T) {
	cases := map[string]string{
		"*giggles* stop it":             "hehe stop it",
		"*leans in* come here":          "come here",
		"okay *laughs softly* fine":     "okay haha fine",
		"*sighs* *rolls eyes* whatever": "whatever",
		"that's **so** good":            "that's **so** good",
		"*sends a picture*":             "",
	}
	for in, want := range cases {
		if got := Spoken(in); got != want {
			t.Errorf("Spoken(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestEmoticonsAndShoutingAreNotSpelledOut(t *testing.T) {
	cases := map[string]string{
		"hey :) missed you <3": "hey missed you",
		"that's hilarious xD":  "that's hilarious",
		"you did WHAT":         "you did what",
		"NO way":               "no way",
		"the AI on my TV":      "the AI on my TV",
		"ratio: 3 to 1":        "ratio: 3 to 1",
	}
	for in, want := range cases {
		if got := Spoken(in); got != want {
			t.Errorf("Spoken(%q) = %q, want %q", in, got, want)
		}
	}
}
