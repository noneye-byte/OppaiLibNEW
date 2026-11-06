package api

import (
	"fmt"
	"reflect"
	"testing"
)

func suggestEntry(id int64, kind string, tags ...string) *libraryEntry {
	return &libraryEntry{link: libbyLink{ID: id, Kind: kind}, tags: tags}
}

// suggestLibrary fills a library out to a realistic size, so the tags under test are
// rare in it: suggestion scores what tells items apart, and in a library of four
// everything is common.
func suggestLibrary(entries ...*libraryEntry) map[int64]*libraryEntry {
	out := map[int64]*libraryEntry{}
	for _, e := range entries {
		out[e.link.ID] = e
	}
	for i := int64(0); i < 40; i++ {
		id := 1000 + i
		out[id] = suggestEntry(id, "image", fmt.Sprintf("filler%d", i))
	}
	return out
}

// firstPick always takes the best of what is left, so a test reads as a ranking.
func firstPick(float64) float64 { return 0 }

func suggestAskWith(opened ...int64) suggestAsk {
	return suggestAsk{opened: opened, limit: 10, pick: firstPick}
}

func favorite(e *libraryEntry) *libraryEntry {
	e.favorite = true
	return e
}

func TestWhatShareATagWithAFavouriteIsSuggestedAndTheRestIsNot(t *testing.T) {
	lib := suggestLibrary(
		favorite(suggestEntry(1, "image", "beach")),
		suggestEntry(2, "image", "beach"),
		suggestEntry(3, "image", "forest"),
	)
	ids, because := suggestFrom(lib, suggestAskWith())
	if !reflect.DeepEqual(ids, []int64{2}) {
		t.Fatalf("ids = %v", ids)
	}
	if !reflect.DeepEqual(because, []string{"beach"}) {
		t.Fatalf("because = %v", because)
	}
}

func TestAnythingAlreadyKnownIsNotSuggestedBack(t *testing.T) {
	rated := suggestEntry(3, "image", "beach")
	rated.rating = 2
	lib := suggestLibrary(
		favorite(suggestEntry(1, "image", "beach")),
		suggestEntry(2, "image", "beach"),
		rated,
		suggestEntry(4, "image", "beach"),
	)
	ids, _ := suggestFrom(lib, suggestAskWith(2))
	if !reflect.DeepEqual(ids, []int64{4}) {
		t.Fatalf("ids = %v, want only the one never opened or rated", ids)
	}
}

func TestARareWordOutweighsACommonOne(t *testing.T) {
	entries := []*libraryEntry{
		favorite(suggestEntry(1, "image", "everywhere", "rarity")),
		suggestEntry(2, "image", "everywhere"),
		suggestEntry(3, "image", "rarity"),
	}
	for i := int64(10); i < 22; i++ {
		entries = append(entries, suggestEntry(i, "image", "everywhere"))
	}
	ids, _ := suggestFrom(suggestLibrary(entries...), suggestAskWith())
	if len(ids) == 0 || ids[0] != 3 {
		t.Fatalf("ids = %v, want the rare tag's item first", ids)
	}
}

func TestATagOnMostOfTheLibraryIsNoSignalAtAll(t *testing.T) {
	lib := map[int64]*libraryEntry{1: favorite(suggestEntry(1, "image", "solo"))}
	for i := int64(2); i < 10; i++ {
		lib[i] = suggestEntry(i, "image", "solo")
	}
	if ids, _ := suggestFrom(lib, suggestAskWith()); len(ids) != 0 {
		t.Fatalf("ids = %v, a tag on everything suggested everything", ids)
	}
}

func TestLotsOfTagsDoNotWinOnVolume(t *testing.T) {
	lib := suggestLibrary(
		favorite(suggestEntry(1, "image", "beach")),
		suggestEntry(2, "image", "beach"),
		suggestEntry(3, "image", "beach", "a", "b", "c", "d", "e", "f", "g", "h"),
	)
	ids, _ := suggestFrom(lib, suggestAskWith())
	if len(ids) != 2 || ids[0] != 2 {
		t.Fatalf("ids = %v, want the focused item first", ids)
	}
}

func TestALowRatingCountsAgainstItsTags(t *testing.T) {
	bad := suggestEntry(1, "image", "gore")
	bad.rating = 1
	lib := suggestLibrary(bad, suggestEntry(2, "image", "gore"))
	if ids, _ := suggestFrom(lib, suggestAskWith()); len(ids) != 0 {
		t.Fatalf("ids = %v, a disliked tag was suggested", ids)
	}
}

func TestATagAtNeverKeepsAnItemOut(t *testing.T) {
	lib := suggestLibrary(
		favorite(suggestEntry(1, "image", "beach")),
		suggestEntry(2, "image", "beach", "feet"),
		suggestEntry(3, "image", "beach"),
	)
	ask := suggestAskWith()
	ask.weights = map[string]float64{"feet": sendWeightNever}
	ids, _ := suggestFrom(lib, ask)
	if !reflect.DeepEqual(ids, []int64{3}) {
		t.Fatalf("ids = %v", ids)
	}
}

func TestComicsAndGamesAreNotSuggested(t *testing.T) {
	lib := suggestLibrary(
		favorite(suggestEntry(1, "video", "beach")),
		suggestEntry(2, "comic", "beach"),
		suggestEntry(3, "game", "beach"),
		suggestEntry(4, "gif", "beach"),
	)
	ids, _ := suggestFrom(lib, suggestAskWith())
	if !reflect.DeepEqual(ids, []int64{4}) {
		t.Fatalf("ids = %v", ids)
	}
}

func TestPicturesAndVideosTakeTurns(t *testing.T) {
	entries := []*libraryEntry{favorite(suggestEntry(1, "image", "beach"))}
	for i := int64(10); i < 16; i++ {
		entries = append(entries, suggestEntry(i, "image", "beach"))
	}
	entries = append(entries, suggestEntry(20, "video", "beach"), suggestEntry(21, "video", "beach"))
	ids, _ := suggestFrom(suggestLibrary(entries...), suggestAskWith())
	lib := map[int64]bool{20: true, 21: true}
	if len(ids) != 8 || !lib[ids[0]] || lib[ids[1]] || !lib[ids[2]] {
		t.Fatalf("ids = %v, want a video every other slot while they last", ids)
	}
}

func TestTheRowIsCutToTheLimitAndHasNoRepeats(t *testing.T) {
	entries := []*libraryEntry{favorite(suggestEntry(1, "image", "beach"))}
	for i := int64(10); i < 20; i++ {
		entries = append(entries, suggestEntry(i, "image", "beach"), suggestEntry(i+100, "video", "beach"))
	}
	ask := suggestAskWith()
	ask.limit = 5
	ids, _ := suggestFrom(suggestLibrary(entries...), ask)
	seen := map[int64]bool{}
	for _, id := range ids {
		if seen[id] {
			t.Fatalf("repeat in %v", ids)
		}
		seen[id] = true
	}
	if len(ids) != 5 {
		t.Fatalf("ids = %v", ids)
	}
}

func TestHerTasteTipsTheOrderButTheTagsAreYours(t *testing.T) {
	lib := suggestLibrary(
		favorite(suggestEntry(1, "image", "beach")),
		suggestEntry(2, "image", "beach", "rain"),
		suggestEntry(3, "image", "beach", "lingerie"),
	)
	ask := suggestAskWith()
	ask.taste = libbyTaste{tasteStem("lingerie"): true}
	ids, _ := suggestFrom(lib, ask)
	if len(ids) != 2 || ids[0] != 3 {
		t.Fatalf("ids = %v, want her pick first", ids)
	}
	// Her taste alone suggests nothing: it has to land on something of yours.
	nothing := suggestLibrary(suggestEntry(3, "image", "lingerie"))
	ask.opened = nil
	if ids, _ := suggestFrom(nothing, ask); len(ids) != 0 {
		t.Fatalf("ids = %v", ids)
	}
}

func TestWithNothingToGoOnThereIsNoRow(t *testing.T) {
	if ids, because := suggestFrom(suggestLibrary(), suggestAskWith()); len(ids) != 0 || len(because) != 0 {
		t.Fatalf("ids = %v because = %v", ids, because)
	}
	if ids, _ := suggestFrom(map[int64]*libraryEntry{}, suggestAskWith(99)); len(ids) != 0 {
		t.Fatalf("ids = %v", ids)
	}
}

func TestLibbyHerselfIsNoReasonToSuggestAPicture(t *testing.T) {
	lib := suggestLibrary(
		favorite(suggestEntry(1, "image", "libby", libbyIdentityTag)),
		suggestEntry(2, "image", "libby", libbyIdentityTag),
	)
	if ids, _ := suggestFrom(lib, suggestAskWith()); len(ids) != 0 {
		t.Fatalf("ids = %v", ids)
	}
}
