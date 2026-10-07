package api

import (
	"strings"
	"testing"
)

func TestAPictureOfHerInSomethingLeavesHerInIt(t *testing.T) {
	cases := []struct {
		subject, want string
		ok            bool
	}{
		{"in a red dress on the balcony", "red dress", true},
		{"you wearing a lacy black bra and matching panties", "lacy black bra, matching panties", true},
		{"naked on the bed", wearingNothing, true},
		{"in the bath", wearingNothing, true},
		{"in the shower in just a towel", "towel", true},
		{"naked except for thigh-highs", "nothing but thigh-highs", true},
		// Nothing about clothes: she stays in whatever she had on.
		{"on the balcony at night", "", false},
		{"a selfie", "", false},
		// Decides the clothes without saying which: left alone.
		{"in the hot tub", "", false},
	}
	for _, c := range cases {
		got, ok := clothesFromSubject(c.subject)
		if got != c.want || ok != c.ok {
			t.Errorf("clothesFromSubject(%q) = %q, %v; want %q, %v", c.subject, got, ok, c.want, c.ok)
		}
	}
}

func TestWhatSheSaysSheHasOnIsNormalised(t *testing.T) {
	cases := map[string]string{
		"usual":                      "",
		"my usual clothes":           "",
		"Nothing":                    wearingNothing,
		"naked":                      wearingNothing,
		"just a towel":               "towel",
		"I'm in an oversized hoodie": "oversized hoodie",
		"  Red Dress. ":              "red dress",
	}
	for in, want := range cases {
		if got := normalizeWearing(in); got != want {
			t.Errorf("normalizeWearing(%q) = %q, want %q", in, got, want)
		}
	}
	if got := normalizeWearing(strings.Repeat("silk scarf, ", 30)); len(got) > maxWearing {
		t.Errorf("unbounded: %d chars", len(got))
	}
}

// Once she has changed, a picture that does not say what she has on is drawn in what
// she changed into — not in the outfit she took off.
func TestASelfieAfterSheChangedIsInWhatSheChangedInto(t *testing.T) {
	s, _ := newTestServer(t)
	prompt, tags := s.libbySelfiePrompt("libby", "on the balcony", "", "red dress", "", 1)
	if !strings.Contains(prompt, "red dress") || strings.Contains(prompt, "tank top") {
		t.Errorf("dressed prompt: %s", prompt)
	}
	if len(tags) != 0 {
		t.Errorf("tags = %v", tags)
	}
	bare, bareTags := s.libbySelfiePrompt("libby", "on the sofa", "", wearingNothing, "", 1)
	if !strings.Contains(bare, "nude") || strings.Contains(bare, "tank top") {
		t.Errorf("undressed prompt: %s", bare)
	}
	if len(bareTags) != 1 || bareTags[0] != "nude" {
		t.Errorf("tags = %v", bareTags)
	}
	// A request that names clothes still wins over what she had on.
	asked, _ := s.libbySelfiePrompt("libby", "in a bikini at the beach", "", "red dress", "", 1)
	if strings.Contains(asked, "red dress") {
		t.Errorf("the old clothes leaked into a dressed request: %s", asked)
	}
}

// What she has on replaces the wardrobe line, and she is always told how to change it.
func TestSheIsToldWhatSheChangedInto(t *testing.T) {
	s, _ := newTestServer(t)
	libby := chatCharacter{ID: "libby"}
	if d := s.wardrobeDirective(libby, 1, "", "red dress"); !strings.Contains(d, "red dress") || strings.Contains(d, "tank top") {
		t.Errorf("directive: %s", d)
	}
	if d := s.wardrobeDirective(libby, 1, "", wearingNothing); !strings.Contains(d, "nothing on") {
		t.Errorf("directive: %s", d)
	}
	if d := s.wardrobeDirective(libby, 1, "", ""); !strings.Contains(d, "tank top") || !strings.Contains(d, "set_state's wearing") {
		t.Errorf("directive: %s", d)
	}
}
