package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/sources"
)

func items(ids ...string) []sources.Item {
	out := make([]sources.Item, 0, len(ids))
	for _, id := range ids {
		out = append(out, sources.Item{ID: id, Title: "item " + id, Kind: "image"})
	}
	return out
}

// The first check of a feed seeds what it has seen without calling any of it new;
// only what turns up after that is new, newest first, and never twice.
func TestAFeedOnlyReportsWhatArrivedAfterItWasSaved(t *testing.T) {
	f := savedFeed{ID: "f1"}
	now := time.Now()
	if fresh := applyFeedListing(&f, items("a", "b", "c"), now); fresh != 0 || len(f.New) != 0 || !f.Primed {
		t.Fatalf("first check: fresh=%d new=%d primed=%v", fresh, len(f.New), f.Primed)
	}
	if fresh := applyFeedListing(&f, items("d", "a", "b"), now); fresh != 1 || len(f.New) != 1 || f.New[0].ID != "d" {
		t.Fatalf("second check: fresh=%d new=%+v", fresh, f.New)
	}
	if fresh := applyFeedListing(&f, items("e", "d"), now); fresh != 1 || f.New[0].ID != "e" || f.New[1].ID != "d" {
		t.Fatalf("third check: fresh=%d new=%+v", fresh, f.New)
	}
	if f.Error != "" || f.CheckedAt == 0 {
		t.Errorf("a working check should clear the error and stamp the time: %+v", f)
	}
	// The pile and the memory are both bounded.
	var many []sources.Item
	for i := 0; i < maxFeedSeen+50; i++ {
		many = append(many, sources.Item{ID: "item-" + itoa(int64(i))})
	}
	applyFeedListing(&f, many, now)
	if len(f.New) != maxFeedNew || len(f.Seen) != maxFeedSeen {
		t.Errorf("bounds: new=%d seen=%d", len(f.New), len(f.Seen))
	}
}

// The shelf is per user, reads what every feed found, and is emptied by being seen.
func TestTheFeedShelfIsPerUserAndClearsWhenSeen(t *testing.T) {
	s, token := newTestServer(t)
	user, err := s.db.SessionUser(context.Background(), token, time.Hour)
	if err != nil {
		t.Fatalf("user: %v", err)
	}
	f := savedFeed{ID: "f1", Name: "beach", Source: "rule34", Feed: "search", Query: "beach", Primed: true, Seen: []string{}}
	applyFeedListing(&f, items("a", "b"), time.Now())
	if err := s.writeSavedFeeds(user.ID, savedFeedStore{Feeds: []savedFeed{f}}); err != nil {
		t.Fatalf("write: %v", err)
	}

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/feeds/new", "")
	var shelf struct {
		Items []feedNewItem `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &shelf); err != nil || len(shelf.Items) != 2 || shelf.Items[0].FeedName != "beach" {
		t.Fatalf("shelf = %s", rec.Body)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/feeds", "")
	if !strings.Contains(rec.Body.String(), `"newCount":2`) {
		t.Fatalf("list = %s", rec.Body)
	}

	other := secondUserToken(t, s)
	rec = do(t, s.Handler(), other, http.MethodGet, "/api/feeds/new", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &shelf); err != nil || len(shelf.Items) != 0 {
		t.Fatalf("housemate's shelf = %s", rec.Body)
	}

	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/feeds/f1/seen", ""); rec.Code != http.StatusNoContent {
		t.Fatalf("seen: %d", rec.Code)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/feeds/new", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &shelf); err != nil || len(shelf.Items) != 0 {
		t.Fatalf("shelf after seen = %s", rec.Body)
	}
	if rec := do(t, s.Handler(), token, http.MethodDelete, "/api/feeds/f1", ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", rec.Code)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/feeds", "")
	if !strings.Contains(rec.Body.String(), `"feeds":[]`) {
		t.Fatalf("list after delete = %s", rec.Body)
	}
	// A search on a source that does not exist cannot be kept.
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/feeds", `{"source":"nowhere","feed":"search","query":"x"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown source: %d %s", rec.Code, rec.Body)
	}
}
