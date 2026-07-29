package api

import (
	"strings"
	"testing"
)

func TestEmptyProfileAddsNothing(t *testing.T) {
	// A user who has filled in nothing must not produce a paragraph of empty labels for
	// the model to reason about.
	if got := userProfileDirective(chatProfile{}); got != "" {
		t.Errorf("an empty profile produced %q", got)
	}
}

func TestBoundariesComeFirstAndOutrankTheCard(t *testing.T) {
	p := chatProfile{
		DisplayName: "Sam",
		Interests:   "horror films",
		Boundaries:  "nothing involving hospitals",
	}
	got := userProfileDirective(p)

	// First, so it is never the thing that falls off the end of a truncated section.
	boundaryAt := strings.Index(got, "nothing involving hospitals")
	interestAt := strings.Index(got, "horror films")
	if boundaryAt < 0 || interestAt < 0 {
		t.Fatalf("fields missing:\n%s", got)
	}
	if boundaryAt > interestAt {
		t.Errorf("boundaries come after the descriptive fields:\n%s", got)
	}
	// A card can ask for behaviour a user has ruled out. Without an explicit precedence
	// rule the model splits the difference, which is the worst of the three outcomes.
	if !strings.Contains(got, "override your character card") {
		t.Errorf("boundaries are not stated as outranking the card:\n%s", got)
	}
}

func TestStatedFieldsArePhrasedAsTheUsersOwnWords(t *testing.T) {
	p := chatProfile{
		DisplayName:   "Sam",
		Address:       "they/them",
		Persona:       "a night-shift nurse",
		Interests:     "mechanical keyboards",
		Preferences:   "subs over dubs",
		Communication: "keep replies short",
	}
	got := userProfileDirective(p)
	for _, needle := range []string{"they/them", "night-shift nurse", "mechanical keyboards", "subs over dubs", "keep replies short"} {
		if !strings.Contains(got, needle) {
			t.Errorf("%q missing from:\n%s", needle, got)
		}
	}
	// Phrased as what they told us, not as fact: the difference matters when it is
	// wrong, because "he told you he likes X" invites correction where "he likes X"
	// invites defence.
	if !strings.Contains(got, "in their own words") {
		t.Errorf("not framed as the user's own account:\n%s", got)
	}
	if !strings.Contains(got, "theirs to correct") {
		t.Errorf("does not invite correction:\n%s", got)
	}
	// A form of address is a request, not an attribute — handed the bare attribute, a
	// model will sometimes announce it.
	if !strings.Contains(got, "asked to be referred to") {
		t.Errorf("address is not framed as a request:\n%s", got)
	}
}

func TestBlankAddressAssumesNothing(t *testing.T) {
	got := userProfileDirective(chatProfile{DisplayName: "Sam"})
	// Voluntary means voluntary: blank must not become a default the model is told.
	if strings.Contains(strings.ToLower(got), "referred to") {
		t.Errorf("an unstated form of address was mentioned anyway:\n%s", got)
	}
}

func TestMemoryConsentDefaultsOnAndIsStatedWhenOff(t *testing.T) {
	// Absent means yes: the memory system predates this field, and switching it off on
	// upgrade would look like data loss.
	if !(chatProfile{}).MayRemember() {
		t.Error("an absent consent setting must default to allowed")
	}
	if got := userProfileDirective(chatProfile{}); strings.Contains(got, "not to keep new memories") {
		t.Errorf("the default said something about memory:\n%s", got)
	}

	no := false
	p := chatProfile{MemoryConsent: &no}
	if p.MayRemember() {
		t.Error("consent set to false still reports as allowed")
	}
	got := userProfileDirective(p)
	// Told to the model as well as enforced: enforcement alone leaves her forming notes
	// that are silently dropped, which reads as her own output being ignored.
	if !strings.Contains(got, "not to keep new memories") {
		t.Errorf("withheld consent was not stated to the model:\n%s", got)
	}
	if !strings.Contains(got, "do not claim to remember") {
		t.Errorf("nothing stops her claiming to remember anyway:\n%s", got)
	}

	yes := true
	if !(chatProfile{MemoryConsent: &yes}).MayRemember() {
		t.Error("explicit consent reports as disallowed")
	}
}

func TestProfileFieldsAreLengthCappedIndependently(t *testing.T) {
	// Each field lands in a different part of the prompt, so one long answer must not be
	// able to crowd out the others by sharing a budget.
	// validateChatWorkspace also insists on at least one character, so the fixture is a
	// whole valid workspace with one long field.
	withProfile := func(p chatProfile) *chatWorkspace {
		return &chatWorkspace{
			Profile:    p,
			Characters: []chatCharacter{{ID: "libby", Name: "Libby"}},
		}
	}
	ws := withProfile(chatProfile{Interests: strings.Repeat("x", 5000)})
	if err := validateChatWorkspace(ws); err == nil {
		t.Fatal("an oversized interests field was accepted")
	} else if !strings.Contains(err.Error(), "interests") {
		t.Errorf("error %q does not name the field", err)
	}

	ws = withProfile(chatProfile{
		Interests:  strings.Repeat("x", 1500),
		Boundaries: strings.Repeat("y", 1500),
	})
	if err := validateChatWorkspace(ws); err != nil {
		t.Errorf("two fields near their own limits were rejected together: %v", err)
	}
}
