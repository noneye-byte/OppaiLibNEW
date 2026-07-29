package api

import (
	"strings"
	"testing"
)

var allCaps = actionCapabilities{Generate: true, Library: true}

// buildLibbyAction is the whole trust boundary for what a reply may propose, so its
// rejections matter more than its acceptances.
func TestBuildLibbyActionAcceptsWellFormedOffers(t *testing.T) {
	s := &Server{}
	got, ok := s.buildLibbyAction("generate", "you on the balcony at sunset", allCaps, nil)
	if !ok || got.Kind != "generate" || got.Prompt != "you on the balcony at sunset" {
		t.Fatalf("generate: got %+v ok=%v", got, ok)
	}
	got, ok = s.buildLibbyAction("import", "https://example.com/thread/1", allCaps, nil)
	if !ok || got.Kind != "import" || got.URL != "https://example.com/thread/1" {
		t.Fatalf("import: got %+v ok=%v", got, ok)
	}
}

func TestBuildLibbyActionRejectsWhatItCannotDo(t *testing.T) {
	s := &Server{}
	cases := []struct {
		name, verb, argument string
		caps                 actionCapabilities
	}{
		// An offer the server cannot honour is worse than one never made: the card's
		// only possible outcome is an error the user did not cause.
		{"generate with no generator", "generate", "you, smiling", actionCapabilities{Library: true}},
		{"generate with nothing to draw", "generate", "", allCaps},
		// The model does not know web addresses. Anything that is not a plain http(s)
		// URL it was handed is invented, and an import card pointing at one is a
		// request to go and fetch a made-up host.
		{"import of a bare phrase", "import", "that site you like", allCaps},
		{"import of a non-web scheme", "import", "file:///etc/passwd", allCaps},
		{"import of a javascript url", "import", "javascript:alert(1)", allCaps},
		{"import with no host", "import", "https://", allCaps},
		{"import of nothing", "import", "", allCaps},
		// Tagging needs both halves and a real row; none of these resolve.
		{"tag with no separator", "tag", "Summer Nights beach", allCaps},
		{"tag naming nothing in the library", "tag", "Summer Nights | beach", allCaps},
		{"favorite naming nothing", "favorite", "Summer Nights", allCaps},
		// A verb outside the vocabulary is not a licence to guess.
		{"an invented verb", "delete", "everything", allCaps},
		{"another invented verb", "email", "someone@example.com", allCaps},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got, ok := s.buildLibbyAction(tc.verb, tc.argument, tc.caps, nil); ok {
				t.Errorf("accepted %s %q as %+v", tc.verb, tc.argument, got)
			}
		})
	}
}

func TestBuildLibbyActionResolvesLibraryTargets(t *testing.T) {
	s := &Server{}
	candidates := []libraryCandidate{{
		link:  libbyLink{ID: 42, Title: "Summer at the Coast", Kind: "video"},
		title: "summer at the coast",
		tags:  []string{"beach"},
	}}
	got, ok := s.buildLibbyAction("tag", "summer at the coast | beach, sunset", allCaps, candidates)
	if !ok || got.MediaID != 42 || len(got.Tags) != 2 {
		t.Fatalf("tag: got %+v ok=%v", got, ok)
	}
	if got.MediaTitle != "Summer at the Coast" {
		t.Errorf("the card should show the real title, got %q", got.MediaTitle)
	}
	got, ok = s.buildLibbyAction("favourite", "summer at the coast", allCaps, candidates)
	if !ok || got.Kind != "favorite" || got.MediaID != 42 {
		t.Fatalf("favourite: got %+v ok=%v", got, ok)
	}
}

// The tag must never survive into the prose, whether or not it produced a proposal.
func TestParseLibbyActionsStripsTagsFromTheReply(t *testing.T) {
	s := &Server{}
	text, actions := s.parseLibbyActions(t.Context(),
		"Want me to make one? [do: generate you in the rain]", allCaps)
	if text != "Want me to make one?" {
		t.Errorf("tag left in prose: %q", text)
	}
	if len(actions) != 1 || actions[0].ID == "" {
		t.Fatalf("got %d actions, want 1 with an id", len(actions))
	}

	// An action that resolved to nothing still leaves clean prose.
	text, actions = s.parseLibbyActions(t.Context(),
		"I'll grab that. [do: import that place]", allCaps)
	if text != "I'll grab that." {
		t.Errorf("unresolvable tag left in prose: %q", text)
	}
	if len(actions) != 0 {
		t.Errorf("got %d actions from an unresolvable tag, want 0", len(actions))
	}
}

func TestParseLibbyActionsBoundsProposalsPerReply(t *testing.T) {
	s := &Server{}
	_, actions := s.parseLibbyActions(t.Context(),
		"[do: generate a] [do: generate b] [do: generate c] [do: generate d]", allCaps)
	if len(actions) > maxLibbyActions {
		t.Errorf("got %d actions, want at most %d", len(actions), maxLibbyActions)
	}
}

// The directive must never describe a capability that is switched off, or a model
// will offer things that can only ever be refused by the machine.
func TestActionDirectiveDescribesOnlyWhatIsWired(t *testing.T) {
	if got := actionDirective(actionCapabilities{}); got != "" {
		t.Errorf("with no capabilities the directive should be empty, got %q", got)
	}
	noGen := actionDirective(actionCapabilities{Library: true})
	if strings.Contains(noGen, "generate") {
		t.Error("offered generation with no generator configured")
	}
	if !strings.Contains(noGen, "import") {
		t.Error("library actions missing when the library is available")
	}
}
