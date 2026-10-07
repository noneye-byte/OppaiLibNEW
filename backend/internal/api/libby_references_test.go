package api

import (
	"testing"
)

func TestTheReferenceShownFitsWhatTheTurnIsAbout(t *testing.T) {
	both := func(string) bool { return true }
	clothedOnly := func(slot string) bool { return slot == referenceClothed }
	nudeOnly := func(slot string) bool { return slot == referenceNude }
	for _, tc := range []struct {
		name, msg string
		heat      int
		shared    bool
		has       func(string) bool
		want      string
	}{
		{"small talk shows nothing", "how was your day", 2, false, both, ""},
		{"asking what she wears shows her dressed", "what are you wearing rn", 2, false, both, referenceClothed},
		{"asking her to strip shows her bare", "take your top off", 2, false, both, referenceNude},
		{"a heated scene shows her bare", "you look so good right now", 5, false, both, referenceNude},
		{"a shared picture is always worth one", "lol", 1, true, both, referenceClothed},
		{"a missing bare slot falls back to clothed", "are you naked", 2, false, clothedOnly, referenceClothed},
		{"a missing clothed slot never shows her bare", "what are you wearing", 2, false, nudeOnly, ""},
	} {
		got, ok := referenceFor(tc.msg, tc.heat, tc.shared, tc.has)
		if got != tc.want || ok != (tc.want != "") {
			t.Errorf("%s: got %q %v, want %q", tc.name, got, ok, tc.want)
		}
	}
}
