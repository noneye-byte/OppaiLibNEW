package api

import (
	"context"
	"strings"
	"testing"
)

// The report: she "links" something and what arrives is a pretend hyperlink — a
// markdown link to nowhere, a bare bracket, a quoted title — and nothing is tappable.
// Every shape below came out of a real reply, and every one has to resolve to the
// chip the taught form would have produced.
func TestLinkShapesAModelActuallyWritesAllResolve(t *testing.T) {
	s, _ := newTestServer(t)
	id := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach", "swimsuit")
	seedTitledMedia(t, s, "Kitchen Timer", "video", "cooking")
	ctx := context.Background()

	for _, tc := range []struct{ name, reply, want string }{
		{"markdown", "You never finished [Summer at the Coast](library).", "You never finished Summer at the Coast."},
		{"markdown-empty-target", "Try [Summer at the Coast]() again.", "Try Summer at the Coast again."},
		{"wiki", "Put on [[Summer at the Coast]].", "Put on Summer at the Coast."},
		{"bare-bracket", "Put on [Summer at the Coast] tonight.", "Put on Summer at the Coast tonight."},
		{"quoted-in-tag", `Put on [link: "Summer at the Coast"].`, "Put on Summer at the Coast."},
		{"capitalised", "Put on [Link: summer at the coast].", "Put on Summer at the Coast."},
		{"synonym", "Put on [item: Summer at the Coast].", "Put on Summer at the Coast."},
		{"no-delimiter", "Put on [link Summer at the Coast].", "Put on Summer at the Coast."},
	} {
		text, links := s.resolveLibraryLinks(ctx, tc.reply, nil)
		if len(links) != 1 || links[0].ID != id {
			t.Errorf("%s: links = %+v, want the seeded video", tc.name, links)
		}
		if text != tc.want {
			t.Errorf("%s: prose = %q, want %q", tc.name, text, tc.want)
		}
	}
}

// A title she wrote in quotes or emphasis with no tag at all still gets its chip —
// and the prose is left exactly as she wrote it, since she already named the thing.
func TestQuotedTitlesGetAChipWithoutRewritingTheProse(t *testing.T) {
	s, _ := newTestServer(t)
	id := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach")
	ctx := context.Background()

	for _, reply := range []string{
		`You should rewatch "Summer at the Coast" sometime.`,
		`You should rewatch “Summer at the Coast” sometime.`,
		`You should rewatch *Summer at the Coast* sometime.`,
		`You should rewatch **Summer at the Coast** sometime.`,
	} {
		text, links := s.resolveLibraryLinks(ctx, reply, nil)
		if len(links) != 1 || links[0].ID != id {
			t.Errorf("%q: links = %+v, want the seeded video", reply, links)
		}
		if text != reply {
			t.Errorf("%q: prose was rewritten to %q", reply, text)
		}
	}
}

// Stage directions and stray brackets are prose and must stay prose: only an exact
// title is taken from a bare bracket or a quoted span, never a loose match.
func TestProseBracketsAreNotMistakenForLinks(t *testing.T) {
	s, _ := newTestServer(t)
	seedTitledMedia(t, s, "Summer at the Coast", "video", "beach", "laughs")
	ctx := context.Background()

	for _, reply := range []string{
		"[laughs] you would say that.",
		"*leans in closer* what did you want to watch?",
		`"the beach one" is what you always ask for.`,
		"[1] is not a title.",
	} {
		text, links := s.resolveLibraryLinks(ctx, reply, nil)
		if len(links) != 0 {
			t.Errorf("%q: links = %+v, want none", reply, links)
		}
		if text != reply {
			t.Errorf("%q: prose was rewritten to %q", reply, text)
		}
	}
}

// A real title beats a newer item that happens to share most of its words. Before the
// exact-title bonus, "Summer at the Coast" against a newer "Summer at the Coast II"
// was a coin toss settled by insertion order.
func TestAnExactTitleOutranksANearMiss(t *testing.T) {
	s, _ := newTestServer(t)
	want := seedTitledMedia(t, s, "Summer at the Coast", "video")
	seedTitledMedia(t, s, "Summer at the Coast II", "video")
	seedTitledMedia(t, s, "Another Summer at the Coast", "video")

	_, links := s.resolveLibraryLinks(context.Background(), "Put on [link: Summer at the Coast].", nil)
	if len(links) != 1 || links[0].ID != want {
		t.Fatalf("links = %+v, want the exact title %d", links, want)
	}
}

// The other report: "a girl with brown hair" against ten items tagged that way always
// handed over the newest one. With the die loaded, the pick lands wherever the die
// says among everything that fits equally — and never on something that fits worse.
func TestEquallyFittingItemsAreDrawnNotTakenNewestFirst(t *testing.T) {
	s, _ := newTestServer(t)
	var ids []int64
	for i := range 5 {
		ids = append(ids, seedTitledMedia(t, s, "Untitled import "+string(rune('a'+i)), "image", "1girl", "brown_hair"))
	}
	// Fits worse: one tag rather than two.
	seedTitledMedia(t, s, "Untitled import z", "image", "brown_hair")
	ctx := context.Background()
	candidates := s.libraryCandidates(ctx, []string{"girl", "brown", "hair"})

	seen := map[int64]bool{}
	for roll := range 5 {
		link, found := pickLibraryMatch(candidates, "a girl with brown hair", minAttachMatchScore, nil, nil, func(n int) int {
			if n != 5 {
				t.Fatalf("die over %d, want the 5 that fit equally", n)
			}
			return roll
		})
		if !found {
			t.Fatal("nothing picked")
		}
		seen[link.ID] = true
	}
	for _, id := range ids {
		if !seen[id] {
			t.Errorf("item %d was never reachable", id)
		}
	}
}

// Her taste decides between items that fit equally: asked for a girl with brown hair,
// with ten to choose from and a standing want for skirts, she reaches for the one in a
// skirt. It never promotes an item that fits the request worse.
func TestHerTasteBreaksTiesAndNothingElse(t *testing.T) {
	s, _ := newTestServer(t)
	for i := range 4 {
		seedTitledMedia(t, s, "Untitled import "+string(rune('a'+i)), "image", "1girl", "brown_hair")
	}
	skirt := seedTitledMedia(t, s, "Untitled import skirt", "image", "1girl", "brown_hair", "skirt")
	// In a skirt, but blonde: fits the request worse, so taste must not rescue it.
	seedTitledMedia(t, s, "Untitled import blonde", "image", "1girl", "blonde_hair", "skirt", "pleated_skirt")
	ctx := context.Background()
	taste := buildLibbyTaste("", []string{"I want to see a girl in a skirt sometime"})
	if !taste["skirt"] {
		t.Fatalf("taste = %v, want the skirt stem", taste)
	}
	candidates := s.libraryCandidates(ctx, []string{"girl", "brown", "hair"})

	died := false
	link, found := pickLibraryMatch(candidates, "a girl with brown hair", minAttachMatchScore, taste, nil, func(n int) int { died = true; return 0 })
	if !found || link.ID != skirt {
		t.Fatalf("picked %+v, want the one in a skirt (%d)", link, skirt)
	}
	if died {
		t.Fatal("the die was rolled with a single item left")
	}

	// The whole path, through the attachment resolver, with the newest items already
	// shown: she reaches past them rather than repeating herself.
	got := s.resolveLibraryAttachments(ctx, []string{"a girl with brown hair"}, "", "", map[int64]bool{skirt: true}, taste, nil)
	if len(got) != 1 || got[0].ID == skirt {
		t.Fatalf("attachments = %+v, want one of the unshown brown-haired items", got)
	}
}

// Taste is stems from her kinks and wants minus the words those are phrased in, so the
// default card's prose does not turn every tag containing "being" into a preference.
func TestTasteIsStemsNotProse(t *testing.T) {
	taste := buildLibbyTaste("Being watched while she watches you. Praise, given and received.", []string{"a picture of someone in stockings"})
	for _, stem := range []string{"watch", "prais", "stock"} {
		if !taste[stem] {
			t.Errorf("taste lacks %q: %v", stem, taste)
		}
	}
	for _, word := range []string{"being", "while", "you", "given", "picture", "someone"} {
		if taste[tasteStem(word)] {
			t.Errorf("taste kept the phrasing word %q", word)
		}
	}
	if buildLibbyTaste("", nil) != nil {
		t.Fatal("an empty taste should be nil so callers can skip it")
	}
	if got := taste.score([]string{"stockings", "thighhighs", "black_stockings"}); got != 1 {
		t.Fatalf("score = %d, want 1: one stem however many tags carry it", got)
	}
	if !strings.HasPrefix("stockings", tasteStem("stockings")) {
		t.Fatal("stem is not a prefix of its word")
	}
}
