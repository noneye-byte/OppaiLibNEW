package api

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
)

// The whole point of the index: depth. An item buried far below the old window of
// newest rows is nameable, and a title word is enough to reach it — no tag needed,
// which is what the encrypted-title constraint used to make impossible.
func TestLibraryIndexReachesPastTheOldWindow(t *testing.T) {
	s, _ := newTestServer(t)
	buried := seedTitledMedia(t, s, "Lighthouse in the Fog", "video")
	// Comfortably more than the 240 rows a lookup used to decrypt, so a resolver that
	// still worked off the newest run would never see the row above.
	for i := range 400 {
		seedTitledMedia(t, s, fmt.Sprintf("Filler Number %d", i), "image")
	}

	text, links := s.resolveLibraryLinks(context.Background(), "Put on [link: Lighthouse in the Fog] tonight.")
	if len(links) != 1 || links[0].ID != buried {
		t.Fatalf("links = %+v, want the buried item %d", links, buried)
	}
	if text != "Put on Lighthouse in the Fog tonight." {
		t.Fatalf("prose = %q", text)
	}
}

// Substring matching is what the ranking has always assumed — "lighthouse" has to
// find "Lighthouses", and a tag word has to find the compound tags a booru tagger
// emits. An exact-word index would have quietly narrowed both.
func TestLibraryIndexMatchesPartialWords(t *testing.T) {
	s, _ := newTestServer(t)
	id := seedTitledMedia(t, s, "Lighthouses at Dusk", "video", "beach towel")

	if _, found := bestLibraryMatch(s.libraryCandidates(context.Background(), []string{"lighthouse"}), "lighthouse"); !found {
		t.Fatal("a title word that is a prefix of the real one found nothing")
	}
	// One tag word is below the link floor by design, so this asks at the attachment
	// floor — the same question chat_attachments.go asks.
	link, found := bestLibraryMatchAbove(s.libraryCandidates(context.Background(), []string{"beach"}), "beach", minAttachMatchScore)
	if !found || link.ID != id {
		t.Fatalf("compound tag lookup = %+v, %v", link, found)
	}
}

// Freshness. An import is picked up without anyone saying so, because ids and counts
// both move; a retitle moves neither, so the handler that did it says so outright.
func TestLibraryIndexSeesNewAndEditedRows(t *testing.T) {
	s, _ := newTestServer(t)
	ctx := context.Background()
	seedTitledMedia(t, s, "First Arrival", "video")
	if _, found := bestLibraryMatch(s.libraryCandidates(ctx, []string{"arrival"}), "First Arrival"); !found {
		t.Fatal("the seeded row was not indexed")
	}

	// A later import, with the probe TTL sidestepped the way the delta path expects:
	// the stamp has moved, and the index has not been told anything.
	later := seedTitledMedia(t, s, "Second Arrival", "video")
	s.library.mu.Lock()
	s.library.probedAt = s.library.probedAt.Add(-libraryIndexProbeTTL * 2)
	s.library.mu.Unlock()
	link, found := bestLibraryMatch(s.libraryCandidates(ctx, []string{"second", "arrival"}), "Second Arrival")
	if !found || link.ID != later {
		t.Fatalf("a newly imported row was not picked up: %+v, %v", link, found)
	}

	// A retitle changes neither the count nor the highest id, so only the touch makes
	// it visible. Without it this is the one edit the stamp cannot catch.
	title, err := crypto.SealBytes(s.kek, []byte("Renamed Entirely"), []byte("title"))
	if err != nil {
		t.Fatalf("seal title: %v", err)
	}
	if err := s.db.UpdateMedia(ctx, later, db.MediaPatch{SetTitle: true, TitleEnc: title}); err != nil {
		t.Fatalf("update: %v", err)
	}
	s.touchLibraryIndex()
	link, found = bestLibraryMatch(s.libraryCandidates(ctx, []string{"renamed"}), "Renamed Entirely")
	if !found || link.ID != later {
		t.Fatalf("a retitled row was not re-indexed after a touch: %+v, %v", link, found)
	}
	// And the name it no longer has stops pointing at it. "First Arrival" is still on
	// the shelf and still shares a word, so the question is which row answers — not
	// whether anything does.
	if link, found := bestLibraryMatch(s.libraryCandidates(ctx, []string{"second", "arrival"}), "Second Arrival"); found && link.ID == later {
		t.Fatal("the old title still resolves to the renamed row")
	}
}

// A name that was never in the library resolves to nothing, however deep the index
// goes. Reaching further must not mean reaching for anything.
func TestLibraryIndexStillRejectsInventedTitles(t *testing.T) {
	s, _ := newTestServer(t)
	for i := range 50 {
		seedTitledMedia(t, s, fmt.Sprintf("Filler Number %d", i), "image")
	}
	text, links := s.resolveLibraryLinks(context.Background(), "Try [link: an entirely imagined thing].")
	if len(links) != 0 {
		t.Fatalf("links = %+v, want none", links)
	}
	if strings.Contains(text, "[link:") {
		t.Fatalf("directive left in prose: %q", text)
	}
}
