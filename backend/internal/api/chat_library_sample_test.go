package api

import (
	"context"
	"fmt"
	"strings"
	"testing"
)

// The report behind this file: asked what to watch, she named the same videos every
// time. The shortlist is now drawn from the whole collection, so over a run of turns it
// reaches items the old newest-six list never contained.
func TestSuggestShelfReachesPastTheNewest(t *testing.T) {
	s, _ := newTestServer(t)
	for i := 0; i < 30; i++ {
		seedTitledMedia(t, s, fmt.Sprintf("Video %02d", i), "video", "clip")
	}
	seen := map[string]bool{}
	for turn := 0; turn < 40; turn++ {
		block := s.librarySuggestBlock(context.Background(), feedChoice{})
		for i := 0; i < 30; i++ {
			if strings.Contains(block, fmt.Sprintf("%q", fmt.Sprintf("Video %02d", i))) {
				seen[fmt.Sprintf("Video %02d", i)] = true
			}
		}
	}
	// Forty draws of six from thirty: an old item that never appears would take
	// astronomically bad luck; the old list could never have shown one.
	var old int
	for i := 0; i < 20; i++ {
		if seen[fmt.Sprintf("Video %02d", i)] {
			old++
		}
	}
	if old < 10 {
		t.Fatalf("the shelf reached only %d of the 20 older videos over 40 turns: %v", old, seen)
	}
	if !strings.Contains(s.librarySuggestBlock(context.Background(), feedChoice{}), "[attach: <title>]") {
		t.Fatal("the shelf should say she can attach what she suggests")
	}
}

// What has already gone out this conversation is off the shelf, in both the shortlist
// and the matches — and the matches say so, so she does not offer it again either.
func TestFeedLeavesShownItemsOffTheShelf(t *testing.T) {
	s, _ := newTestServer(t)
	shown := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach")
	seedTitledMedia(t, s, "Winter at the Coast", "video", "beach")

	choice := feedChoice{shown: map[int64]bool{shown: true}}
	suggest := s.librarySuggestBlock(context.Background(), choice)
	if strings.Contains(suggest, "Summer at the Coast") {
		t.Fatalf("an already-shown item was on the shortlist: %q", suggest)
	}
	if !strings.Contains(suggest, "Winter at the Coast") {
		t.Fatalf("the other item should be on the shortlist: %q", suggest)
	}

	matches := s.libraryMatchesBlock(context.Background(), normalizeLookupWords("put the coast one on"), choice)
	if !strings.Contains(matches, `"Winter at the Coast" (video; beach)`) {
		t.Fatalf("the unshown match was not fed: %q", matches)
	}
	if !strings.Contains(matches, `Already shown them in this conversation, so not again unless they ask for it by name: "Summer at the Coast"`) {
		t.Fatalf("the shown match should be named as shown, not fed: %q", matches)
	}
	if strings.Contains(matches, `"Summer at the Coast" (video`) {
		t.Fatalf("the shown item was fed as a candidate: %q", matches)
	}
}

// Ties on words are drawn, not fed newest-first: over a run of turns the order the
// tied items arrive in changes, where before it was fixed.
func TestFeedDrawsAmongTiedMatches(t *testing.T) {
	s, _ := newTestServer(t)
	for i := 0; i < 6; i++ {
		seedTitledMedia(t, s, fmt.Sprintf("Beach Day %d", i), "video", "beach")
	}
	first := map[string]bool{}
	for turn := 0; turn < 40; turn++ {
		block := s.libraryMatchesBlock(context.Background(), []string{"beach"}, feedChoice{})
		at := strings.Index(block, `"Beach Day`)
		if at < 0 {
			t.Fatalf("no match fed: %q", block)
		}
		first[block[at:at+len(`"Beach Day 0"`)]] = true
	}
	if len(first) < 2 {
		t.Fatalf("the same item led the feed every turn: %v", first)
	}
}

// Her taste and the user's weights tilt the draw the way they tilt what she sends: a
// "never" tag is never on the shelf, and a taste hit comes up more often than not.
func TestShelfHonoursWeightsAndTaste(t *testing.T) {
	s, _ := newTestServer(t)
	seedTitledMedia(t, s, "Liked One", "video", "stockings")
	seedTitledMedia(t, s, "Plain One", "video", "clip")
	seedTitledMedia(t, s, "Banned One", "video", "feet")

	weights := normalizeSendWeights(map[string]float64{"feet": 0})
	taste := buildLibbyTaste("stockings and lace", nil)
	liked, plain := 0, 0
	for turn := 0; turn < 200; turn++ {
		shelf := s.drawLibraryShelf(context.Background(), "video", 1, nil, taste, weights, nil)
		if len(shelf) != 1 {
			t.Fatalf("drew %d items, want 1", len(shelf))
		}
		switch shelf[0].link.Title {
		case "Banned One":
			t.Fatal("a never-weighted item was drawn")
		case "Liked One":
			liked++
		case "Plain One":
			plain++
		}
	}
	if liked <= plain {
		t.Fatalf("taste did not tilt the draw: liked %d, plain %d", liked, plain)
	}
	if plain == 0 {
		t.Fatal("taste emptied the draw of everything else")
	}
}

// A lookup capped by a common word keeps the items more of the words name, wherever
// they sit in the collection, rather than simply the newest.
func TestLookupKeepsBestHitsOverNewest(t *testing.T) {
	s, _ := newTestServer(t)
	want := seedTitledMedia(t, s, "Lighthouse Storm", "video", "coast")
	for i := 0; i < libraryLookupCap+20; i++ {
		seedTitledMedia(t, s, fmt.Sprintf("Storm %d", i), "video", "rain")
	}
	candidates := s.lookupLibrary(context.Background(), []string{"lighthouse", "storm", "coast"})
	if len(candidates) == 0 || candidates[0].link.ID != want {
		t.Fatalf("the item all three words name should lead the candidates, got %d candidates leading with %v", len(candidates), candidates[0].link)
	}
}
