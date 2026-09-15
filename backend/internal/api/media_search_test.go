package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

// seedRow inserts one library row with everything the grid can filter or sort on.
// created_at is set explicitly because the ordering assertions below turn on it and
// rows inserted in the same test share a second.
type seedRow struct {
	title    string
	kind     string
	notes    string
	tags     map[string]string // name → category
	favorite bool
	rating   int
	size     int64
	at       int64
}

func seedFull(t *testing.T, s *Server, r seedRow) int64 {
	t.Helper()
	ctx := context.Background()
	titleEnc, err := crypto.SealBytes(s.kek, []byte(r.title), []byte("title"))
	if err != nil {
		t.Fatalf("seal title: %v", err)
	}
	row := &db.MediaRow{
		Kind: r.kind, SHA256: r.title + "-hash", Size: r.size, BlobPath: "x/" + r.title,
		TitleEnc: titleEnc, Rating: r.rating, Favorite: r.favorite,
	}
	if r.notes != "" {
		if row.NotesEnc, err = crypto.SealBytes(s.kek, []byte(r.notes), []byte("notes")); err != nil {
			t.Fatalf("seal notes: %v", err)
		}
	}
	id, _, err := s.db.InsertMedia(ctx, row)
	if err != nil {
		t.Fatalf("insert media: %v", err)
	}
	// InsertMedia does not take favourite/rating/created_at as given, so set the ones
	// the ordering depends on directly.
	if _, err := s.db.SQL().Exec(
		`UPDATE media SET favorite = ?, rating = ?, created_at = ? WHERE id = ?`,
		boolInt(r.favorite), r.rating, r.at, id); err != nil {
		t.Fatalf("set row fields: %v", err)
	}
	for name, category := range r.tags {
		if err := s.db.AddTag(ctx, id, name, category, "manual", 0); err != nil {
			t.Fatalf("add tag: %v", err)
		}
	}
	s.touchLibraryIndex()
	return id
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// listMedia calls the endpoint the grid calls and returns what it can see.
func listMedia(t *testing.T, s *Server, token, query string) ([]models.Media, int) {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/media?"+query, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/media?%s: %d %s", query, rec.Code, rec.Body)
	}
	var got struct {
		Items []models.Media `json:"items"`
		Total int            `json:"total"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return got.Items, got.Total
}

func titlesOf(items []models.Media) []string {
	out := make([]string, 0, len(items))
	for _, m := range items {
		out = append(out, m.Title)
	}
	return out
}

// The point of the whole change: a query is answered by the server, so a client that
// holds one page can still search the whole library. Titles are ciphertext, so this
// only works because the in-memory index is doing the matching.
func TestSearchMatchesEncryptedTitlesServerSide(t *testing.T) {
	s, token := newTestServer(t)
	seedFull(t, s, seedRow{title: "Lighthouse in the Fog", kind: "video", at: 100})
	seedFull(t, s, seedRow{title: "Kitchen Timer", kind: "video", at: 200})

	items, total := listMedia(t, s, token, "q=lighthouse")
	if total != 1 || len(items) != 1 || items[0].Title != "Lighthouse in the Fog" {
		t.Fatalf("search returned %v (total %d)", titlesOf(items), total)
	}

	// And a word in nothing gets nothing, rather than everything — a filter that
	// silently fails open would look like it worked on a small library.
	if items, total := listMedia(t, s, token, "q=submarine"); total != 0 || len(items) != 0 {
		t.Fatalf("unmatched query returned %v (total %d)", titlesOf(items), total)
	}
}

// Terms are ANDed across fields, which is what the browser-side search did: one word
// from the title, one from a tag, both required.
func TestSearchAndsTermsAcrossFields(t *testing.T) {
	s, token := newTestServer(t)
	want := seedFull(t, s, seedRow{
		title: "Summer at the Coast", kind: "video", at: 100,
		tags: map[string]string{"swimsuit": "general"},
	})
	seedFull(t, s, seedRow{title: "Summer Fireworks", kind: "video", at: 200})
	seedFull(t, s, seedRow{
		title: "Winter Coast", kind: "video", at: 300,
		tags: map[string]string{"swimsuit": "general"},
	})

	items, total := listMedia(t, s, token, "q=summer+swimsuit")
	if total != 1 || len(items) != 1 || items[0].ID != want {
		t.Fatalf("AND across title and tag returned %v (total %d)", titlesOf(items), total)
	}
}

// Notes and tag categories are searchable, because they were: the browser matched
// every field of every row, and moving the search to the server must not quietly
// drop two of them.
func TestSearchMatchesNotesAndTagCategories(t *testing.T) {
	s, token := newTestServer(t)
	noted := seedFull(t, s, seedRow{
		title: "Untitled Clip", kind: "video", notes: "ripped from the anniversary stream", at: 100,
	})
	rated := seedFull(t, s, seedRow{
		title: "Something Else", kind: "image", at: 200,
		tags: map[string]string{"explicit": "rating"},
	})

	if items, _ := listMedia(t, s, token, "q=anniversary"); len(items) != 1 || items[0].ID != noted {
		t.Errorf("notes search returned %v", titlesOf(items))
	}
	if items, _ := listMedia(t, s, token, "q=rating"); len(items) != 1 || items[0].ID != rated {
		t.Errorf("tag-category search returned %v", titlesOf(items))
	}
}

// Punctuation in a query used to be matched raw against the joined haystack. The
// index splits on non-alphanumerics, so the query has to split the same way or
// "re:zero" could never match anything.
func TestSearchSplitsPunctuatedQueries(t *testing.T) {
	s, token := newTestServer(t)
	id := seedFull(t, s, seedRow{title: "Re:Zero Season Two", kind: "video", at: 100})

	if items, _ := listMedia(t, s, token, "q=re%3Azero"); len(items) != 1 || items[0].ID != id {
		t.Fatalf("punctuated query returned %v", titlesOf(items))
	}
}

// Paging has to be a partition: every row exactly once across the pages, in the
// order asked for. An unstable sort key is how an OFFSET walk repeats one row and
// loses another, which is the bug that made the old client fetch everything instead.
func TestPagingPartitionsTheLibrary(t *testing.T) {
	s, token := newTestServer(t)
	const n = 25
	for i := range n {
		// Deliberately identical ratings: the tie-break, not the key, is what has to
		// make this ordering total.
		seedFull(t, s, seedRow{
			title: fmt.Sprintf("Item %02d", i), kind: "image", rating: 3,
			size: 1000, at: 500, // same timestamp too
		})
	}

	for _, sortBy := range []string{"newest", "oldest", "rating", "largest"} {
		seen := map[int64]bool{}
		for offset := 0; offset < n; offset += 10 {
			items, total := listMedia(t, s, token,
				fmt.Sprintf("sort=%s&limit=10&offset=%d", sortBy, offset))
			if total != n {
				t.Fatalf("sort=%s offset=%d: total = %d, want %d", sortBy, offset, total, n)
			}
			for _, m := range items {
				if seen[m.ID] {
					t.Fatalf("sort=%s: item %d appeared on two pages", sortBy, m.ID)
				}
				seen[m.ID] = true
			}
		}
		if len(seen) != n {
			t.Errorf("sort=%s: paging saw %d of %d rows", sortBy, len(seen), n)
		}
	}
}

// A searched page and a browsed page must order identically, or the same item moves
// between pages depending on whether the user has typed anything.
func TestSearchAndBrowseAgreeOnOrder(t *testing.T) {
	s, token := newTestServer(t)
	for i := range 12 {
		seedFull(t, s, seedRow{
			title: fmt.Sprintf("Shared Word %02d", i), kind: "image",
			rating: i % 3, size: int64(i % 4), at: int64(i % 5),
		})
	}

	for _, sortBy := range []string{"newest", "oldest", "rating", "largest"} {
		browsed, _ := listMedia(t, s, token, "sort="+sortBy+"&limit=200")
		searched, _ := listMedia(t, s, token, "q=shared&sort="+sortBy+"&limit=200")
		if len(browsed) != len(searched) {
			t.Fatalf("sort=%s: browse saw %d rows, search saw %d", sortBy, len(browsed), len(searched))
		}
		for i := range browsed {
			if browsed[i].ID != searched[i].ID {
				t.Fatalf("sort=%s: position %d is %d browsed but %d searched",
					sortBy, i, browsed[i].ID, searched[i].ID)
			}
		}
	}
}

// Sorts order by what they say they order by. Newest is the default and the one the
// grid opens on, so a wrong sort parameter has to fall back to it rather than fail.
func TestSortsOrderByTheirKey(t *testing.T) {
	s, token := newTestServer(t)
	small := seedFull(t, s, seedRow{title: "Small And Old", kind: "image", size: 10, rating: 1, at: 100})
	big := seedFull(t, s, seedRow{title: "Big And New", kind: "image", size: 9000, rating: 5, at: 900})

	for _, tc := range []struct {
		sort  string
		first int64
	}{
		{"newest", big},
		{"oldest", small},
		{"rating", big},
		{"largest", big},
		{"nonsense-sort", big}, // unknown = newest, not an error
	} {
		items, _ := listMedia(t, s, token, "sort="+tc.sort)
		if len(items) == 0 || items[0].ID != tc.first {
			t.Errorf("sort=%s led with %v, want id %d", tc.sort, titlesOf(items), tc.first)
		}
	}
}

// Favourites and kind are filters the server applies, with or without a query
// alongside them.
func TestFilterByFavouriteAndKind(t *testing.T) {
	s, token := newTestServer(t)
	fav := seedFull(t, s, seedRow{title: "Kept Forever", kind: "video", favorite: true, at: 100})
	seedFull(t, s, seedRow{title: "Kept Nowhere", kind: "video", at: 200})
	seedFull(t, s, seedRow{title: "Kept Picture", kind: "image", favorite: true, at: 300})

	if items, total := listMedia(t, s, token, "favorite=1&kind=video"); total != 1 || items[0].ID != fav {
		t.Errorf("favourite+kind returned %v (total %d)", titlesOf(items), total)
	}
	// The same two filters, with a query on top: all three still apply.
	if items, total := listMedia(t, s, token, "q=kept&favorite=1&kind=video"); total != 1 || items[0].ID != fav {
		t.Errorf("query+favourite+kind returned %v (total %d)", titlesOf(items), total)
	}
	if _, total := listMedia(t, s, token, "q=kept"); total != 3 {
		t.Errorf("unfiltered query total = %d, want 3", total)
	}
}

// Home's numbers, which it used to derive from the whole library in browser memory —
// including an "added this week" that compared milliseconds to seconds and so always
// read zero.
func TestMediaStatsCountsWithoutPagingTheLibrary(t *testing.T) {
	s, token := newTestServer(t)
	now := time.Now().Unix()
	seedFull(t, s, seedRow{title: "Recent Video", kind: "video", at: now - 3600})
	seedFull(t, s, seedRow{title: "Recent Image", kind: "image", at: now - 7200, favorite: true})
	seedFull(t, s, seedRow{title: "Ancient Image", kind: "image", at: now - 90*24*3600})

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/media/stats", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("stats: %d %s", rec.Code, rec.Body)
	}
	var got struct {
		Total     int            `json:"total"`
		ByKind    map[string]int `json:"byKind"`
		Favorites int            `json:"favorites"`
		ThisWeek  int            `json:"thisWeek"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got.Total != 3 {
		t.Errorf("total = %d, want 3", got.Total)
	}
	if got.ByKind["image"] != 2 || got.ByKind["video"] != 1 {
		t.Errorf("byKind = %v", got.ByKind)
	}
	if got.Favorites != 1 {
		t.Errorf("favorites = %d, want 1", got.Favorites)
	}
	if got.ThisWeek != 2 {
		t.Errorf("thisWeek = %d, want 2 (the 90-day-old row is not this week)", got.ThisWeek)
	}
}

// /api/media/stats must not be swallowed by /api/media/{id}. Both patterns match the
// path and only the literal one is right.
func TestStatsRouteBeatsTheIDRoute(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/media/stats", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("stats route resolved to something else: %d %s", rec.Code, rec.Body)
	}
	if !json.Valid(rec.Body.Bytes()) {
		t.Fatalf("stats body is not JSON: %s", rec.Body)
	}
	var probe map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &probe)
	if _, ok := probe["byKind"]; !ok {
		t.Errorf("stats response is missing byKind: %v", probe)
	}
}

// Filter chips narrow server-side, exactly — a chip that says "hair" must not bring
// back "hair ribbon" as well — and they compose with a query.
func TestTagFilterNarrowsExactly(t *testing.T) {
	s, token := newTestServer(t)
	exact := seedFull(t, s, seedRow{
		title: "Portrait One", kind: "image", at: 100,
		tags: map[string]string{"hair": "general"},
	})
	seedFull(t, s, seedRow{
		title: "Portrait Two", kind: "image", at: 200,
		tags: map[string]string{"hair ribbon": "general"},
	})

	if items, total := listMedia(t, s, token, "tag=hair"); total != 1 || items[0].ID != exact {
		t.Fatalf("tag filter returned %v (total %d)", titlesOf(items), total)
	}
	// With a query on top, both still apply.
	if _, total := listMedia(t, s, token, "q=portrait&tag=hair"); total != 1 {
		t.Errorf("query+tag total = %d, want 1", total)
	}
	if _, total := listMedia(t, s, token, "q=portrait"); total != 2 {
		t.Errorf("query alone total = %d, want 2", total)
	}
}

// The chips themselves: most-used first, and countable per kind.
func TestTopTagsRanksByUse(t *testing.T) {
	s, token := newTestServer(t)
	for i := range 3 {
		seedFull(t, s, seedRow{
			title: fmt.Sprintf("Common %d", i), kind: "image", at: int64(100 + i),
			tags: map[string]string{"popular": "general"},
		})
	}
	seedFull(t, s, seedRow{
		title: "Rare One", kind: "image", at: 200,
		tags: map[string]string{"unusual": "general"},
	})
	seedFull(t, s, seedRow{
		title: "Other Kind", kind: "video", at: 300,
		tags: map[string]string{"filmic": "general"},
	})

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/tags/top?kind=image", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("top tags: %d %s", rec.Code, rec.Body)
	}
	var got struct {
		Items []struct {
			Name  string `json:"name"`
			Count int    `json:"count"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got.Items) != 2 {
		t.Fatalf("image tags = %+v, want the two image tags only", got.Items)
	}
	if got.Items[0].Name != "popular" || got.Items[0].Count != 3 {
		t.Errorf("leading tag = %+v, want popular×3", got.Items[0])
	}
}
