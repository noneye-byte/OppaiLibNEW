package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/sources"
)

// Saved searches, checked for you.
//
// Browse (handlers_sources.go) is a catalogue you page through by hand. A saved search
// is the same query kept: the server runs it on a schedule, remembers what it has
// already shown, and puts what is new on a "new from your feeds" shelf. Nothing is
// downloaded — a feed that imported on its own would fill the library with everything
// a tag ever matched — the shelf is remote tiles exactly as Browse draws them, with
// the same Save button, and reading the shelf is what marks it seen.
//
// Per user, encrypted, atomic writes — the same shape as her wants and memory and for
// the same reasons: what somebody subscribes to says as much as what they keep. Item
// titles and tags from the outside site are stored as they arrived and fenced as
// untrusted display text wherever they are shown, as Browse already does.

const (
	// maxSavedFeeds bounds how many searches one user keeps. Each is a request to a
	// third-party site every check, and a hundred of them is a scraper.
	maxSavedFeeds = 24
	// maxFeedSeen is how many item ids a feed remembers having shown. A page is a few
	// dozen; this covers many pages of churn before an old item could read as new.
	maxFeedSeen = 600
	// maxFeedNew bounds the unseen pile per feed. Past this the oldest fall off:
	// nobody is going to look at three hundred new tiles, and the site still has them.
	maxFeedNew = 60
	// feedCheckEvery is how often a feed is re-run once it has been looked at. Six
	// hours: a few times a day, well within any site's patience, and "new since this
	// morning" is the granularity anyone wants.
	feedCheckEvery = 6 * time.Hour
	// feedSweepEvery is how often the background sweep looks for feeds that are due.
	feedSweepEvery = 30 * time.Minute
	// feedCheckTimeout bounds one remote listing.
	feedCheckTimeout = 45 * time.Second
)

// savedFeed is one subscription and what it has turned up.
type savedFeed struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Source string `json:"source"`
	Feed   string `json:"feed"`
	Query  string `json:"query,omitempty"`
	Sort   string `json:"sort,omitempty"`
	// CreatedAt and CheckedAt are UnixMilli; CheckedAt zero means never.
	CreatedAt int64 `json:"createdAt"`
	CheckedAt int64 `json:"checkedAt,omitempty"`
	// Error is the last check's failure, cleared by a check that works — so a feed
	// whose site has gone away says so on the shelf rather than silently going quiet.
	Error string `json:"error,omitempty"`
	// Seen is every item id this feed has surfaced, newest last, bounded.
	Seen []string `json:"seen"`
	// New is what the last checks found that has not been looked at, newest first.
	New []sources.Item `json:"new"`
	// Primed says the first check has run. The first run seeds Seen without filling
	// New: subscribing to a search must not present the whole first page as "new".
	Primed bool `json:"primed,omitempty"`
}

type savedFeedStore struct {
	Feeds []savedFeed `json:"feeds"`
}

// feedsMu guards the stores. Its own lock rather than chatMu, because the background
// check holds it around a remote fetch and a chat turn must not wait on a booru.
var feedsMu sync.Mutex

func (s *Server) savedFeedsPath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "feeds.json.enc")
}

func savedFeedsAAD(userID int64) []byte {
	return []byte(fmt.Sprintf("feeds:%d", userID))
}

func (s *Server) readSavedFeeds(userID int64) (savedFeedStore, error) {
	var store savedFeedStore
	blob, err := os.ReadFile(s.savedFeedsPath(userID))
	if errors.Is(err, os.ErrNotExist) {
		store.Feeds = []savedFeed{}
		return store, nil
	}
	if err != nil {
		return store, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, savedFeedsAAD(userID))
	if err != nil {
		return store, err
	}
	if err := json.Unmarshal(raw, &store); err != nil {
		return store, err
	}
	if store.Feeds == nil {
		store.Feeds = []savedFeed{}
	}
	return store, nil
}

// writeSavedFeeds persists the store atomically, mirroring writeLibbyWants.
func (s *Server) writeSavedFeeds(userID int64, store savedFeedStore) error {
	if store.Feeds == nil {
		store.Feeds = []savedFeed{}
	}
	raw, err := json.Marshal(store)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, savedFeedsAAD(userID))
	if err != nil {
		return err
	}
	dir := s.chatUserDir(userID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "feeds-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err = tmp.Chmod(0o600); err == nil {
		_, err = tmp.Write(blob)
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmpName, s.savedFeedsPath(userID))
}

// savedFeedView is a feed as the client lists it: the subscription and how much is
// waiting, without the seen list, which is bookkeeping.
type savedFeedView struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Source    string `json:"source"`
	Feed      string `json:"feed"`
	Query     string `json:"query,omitempty"`
	Sort      string `json:"sort,omitempty"`
	CreatedAt int64  `json:"createdAt"`
	CheckedAt int64  `json:"checkedAt,omitempty"`
	Error     string `json:"error,omitempty"`
	NewCount  int    `json:"newCount"`
}

func feedView(f savedFeed) savedFeedView {
	return savedFeedView{
		ID: f.ID, Name: f.Name, Source: f.Source, Feed: f.Feed, Query: f.Query, Sort: f.Sort,
		CreatedAt: f.CreatedAt, CheckedAt: f.CheckedAt, Error: f.Error, NewCount: len(f.New),
	}
}

// feedName is what a feed is called when the user did not say: the query, or the
// source's own feed label.
func feedName(src sources.Source, feedID, query string) string {
	if query = strings.TrimSpace(query); query != "" {
		return query
	}
	for _, f := range src.Feeds() {
		if f.ID == feedID {
			return src.Name() + " · " + f.Label
		}
	}
	return src.Name()
}

// applyFeedListing folds one fetched page into the feed: unseen items go on the pile,
// every id is remembered. Pure, so the diff is testable without a source.
func applyFeedListing(f *savedFeed, items []sources.Item, now time.Time) int {
	seen := make(map[string]bool, len(f.Seen))
	for _, id := range f.Seen {
		seen[id] = true
	}
	var fresh []sources.Item
	for _, item := range items {
		if item.ID == "" || seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		f.Seen = append(f.Seen, item.ID)
		if f.Primed {
			fresh = append(fresh, item)
		}
	}
	if len(f.Seen) > maxFeedSeen {
		f.Seen = f.Seen[len(f.Seen)-maxFeedSeen:]
	}
	if len(fresh) > 0 {
		f.New = append(fresh, f.New...)
		if len(f.New) > maxFeedNew {
			f.New = f.New[:maxFeedNew]
		}
	}
	f.Primed = true
	f.CheckedAt = now.UnixMilli()
	f.Error = ""
	return len(fresh)
}

// checkSavedFeed runs one feed's search and folds the first page in. The listing goes
// through the same cache Browse uses, so a feed checked a minute after the user
// browsed the same search costs nothing.
func (s *Server) checkSavedFeed(ctx context.Context, f *savedFeed, now time.Time) error {
	src, ok := s.sources.Get(f.Source)
	if !ok {
		f.Error = "this source is no longer configured"
		f.CheckedAt = now.UnixMilli()
		return errors.New(f.Error)
	}
	params := sources.BrowseParams{Feed: f.Feed, Query: f.Query, Sort: f.Sort}
	key := strings.Join([]string{src.ID(), params.Feed, params.Cursor, params.Query, params.Sort}, "\x00")
	ctx, cancel := context.WithTimeout(ctx, feedCheckTimeout)
	defer cancel()
	listing, err := s.listCache.get(ctx, key, func(ctx context.Context) (*sources.Listing, error) {
		return src.Browse(ctx, params)
	})
	if err != nil {
		f.Error = err.Error()
		f.CheckedAt = now.UnixMilli()
		return err
	}
	// Containers — a thread tile that is browsed into — are not items to show as new.
	items := make([]sources.Item, 0, len(listing.Items))
	for _, item := range listing.Items {
		if item.FeedID == "" {
			items = append(items, item)
		}
	}
	applyFeedListing(f, items, now)
	return nil
}

// checkUserFeeds runs every feed of one user that is due, or all of them when forced.
func (s *Server) checkUserFeeds(ctx context.Context, userID int64, force bool, only string) {
	feedsMu.Lock()
	defer feedsMu.Unlock()
	store, err := s.readSavedFeeds(userID)
	if err != nil {
		return
	}
	now := time.Now()
	changed := false
	for i := range store.Feeds {
		f := &store.Feeds[i]
		if only != "" && f.ID != only {
			continue
		}
		due := f.CheckedAt == 0 || now.Sub(time.UnixMilli(f.CheckedAt)) >= feedCheckEvery
		if !force && !due {
			continue
		}
		if err := s.checkSavedFeed(ctx, f, now); err != nil {
			s.log.Debug("feed check", "user", userID, "feed", f.Name, "err", err)
		}
		changed = true
	}
	if changed {
		if err := s.writeSavedFeeds(userID, store); err != nil {
			s.log.Warn("feeds: write", "user", userID, "err", err)
		}
	}
}

// sweepSavedFeeds is the background loop: every user who has a feeds file gets their
// due feeds checked. Users are found by their files rather than a query, because a
// user with no feeds has nothing to check and the database keeps no list of who does.
func (s *Server) sweepSavedFeeds() {
	check := func() {
		matches, _ := filepath.Glob(filepath.Join(s.chatDir, "user-*", "feeds.json.enc"))
		for _, path := range matches {
			var userID int64
			if _, err := fmt.Sscanf(filepath.Base(filepath.Dir(path)), "user-%d", &userID); err != nil || userID <= 0 {
				continue
			}
			s.checkUserFeeds(context.Background(), userID, false, "")
		}
	}
	// A short first delay so startup is not a burst of outbound requests before the
	// rest of the server has settled.
	time.Sleep(2 * time.Minute)
	check()
	for range time.Tick(feedSweepEvery) {
		check()
	}
}

// ── endpoints ────────────────────────────────────────────────────────────────

type savedFeedReq struct {
	Name   string `json:"name"`
	Source string `json:"source"`
	Feed   string `json:"feed"`
	Query  string `json:"query"`
	Sort   string `json:"sort"`
}

func (s *Server) handleListSavedFeeds(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	feedsMu.Lock()
	store, err := s.readSavedFeeds(u.ID)
	feedsMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read your feeds")
		return
	}
	out := make([]savedFeedView, 0, len(store.Feeds))
	for _, f := range store.Feeds {
		out = append(out, feedView(f))
	}
	writeJSON(w, http.StatusOK, map[string]any{"feeds": out})
}

// handleSaveFeed subscribes to a search and checks it at once, so the shelf has a
// baseline and the user sees the feed working rather than an empty row until tonight.
func (s *Server) handleSaveFeed(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var req savedFeedReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 8<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	src, ok := s.sources.Get(strings.TrimSpace(req.Source))
	if !ok {
		writeErr(w, http.StatusBadRequest, "unknown source")
		return
	}
	req.Feed = strings.TrimSpace(req.Feed)
	req.Query = strings.Join(strings.Fields(req.Query), " ")
	req.Sort = strings.TrimSpace(req.Sort)
	if len(req.Query) > 200 || len(req.Feed) > 80 || len(req.Sort) > 40 {
		writeErr(w, http.StatusBadRequest, "that search is too long to keep")
		return
	}
	name := strings.Join(strings.Fields(req.Name), " ")
	if name == "" {
		name = feedName(src, req.Feed, req.Query)
	}
	if len(name) > 80 {
		name = strings.TrimSpace(name[:80])
	}
	feedsMu.Lock()
	store, err := s.readSavedFeeds(u.ID)
	if err != nil {
		feedsMu.Unlock()
		writeErr(w, http.StatusInternalServerError, "couldn't read your feeds")
		return
	}
	for _, f := range store.Feeds {
		if f.Source == src.ID() && f.Feed == req.Feed && strings.EqualFold(f.Query, req.Query) && f.Sort == req.Sort {
			feedsMu.Unlock()
			writeJSON(w, http.StatusOK, feedView(f))
			return
		}
	}
	if len(store.Feeds) >= maxSavedFeeds {
		feedsMu.Unlock()
		writeErr(w, http.StatusBadRequest, fmt.Sprintf("you can keep up to %d feeds", maxSavedFeeds))
		return
	}
	f := savedFeed{
		ID: randomID(), Name: name, Source: src.ID(), Feed: req.Feed, Query: req.Query, Sort: req.Sort,
		CreatedAt: time.Now().UnixMilli(), Seen: []string{}, New: []sources.Item{},
	}
	if err := s.checkSavedFeed(r.Context(), &f, time.Now()); err != nil {
		s.log.Debug("feed: first check", "feed", f.Name, "err", err)
	}
	store.Feeds = append(store.Feeds, f)
	err = s.writeSavedFeeds(u.ID, store)
	feedsMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the feed")
		return
	}
	writeJSON(w, http.StatusCreated, feedView(f))
}

func (s *Server) handleDeleteSavedFeed(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id := r.PathValue("id")
	feedsMu.Lock()
	defer feedsMu.Unlock()
	store, err := s.readSavedFeeds(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read your feeds")
		return
	}
	kept := store.Feeds[:0]
	for _, f := range store.Feeds {
		if f.ID != id {
			kept = append(kept, f)
		}
	}
	store.Feeds = kept
	if err := s.writeSavedFeeds(u.ID, store); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save your feeds")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleCheckSavedFeeds runs every feed now — the "refresh" button — or one, by id.
func (s *Server) handleCheckSavedFeeds(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.checkUserFeeds(r.Context(), u.ID, true, r.PathValue("id"))
	s.handleListSavedFeeds(w, r)
}

// feedNewItem is one unseen item on the shelf, with which feed it came from.
type feedNewItem struct {
	sources.Item
	FeedID   string `json:"feedId"`
	FeedName string `json:"feedName"`
	Source   string `json:"source"`
}

// handleNewFromFeeds is the shelf: everything unseen across every feed, newest feed
// first, then in the order the site listed them.
func (s *Server) handleNewFromFeeds(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	feedsMu.Lock()
	store, err := s.readSavedFeeds(u.ID)
	feedsMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read your feeds")
		return
	}
	feeds := append([]savedFeed{}, store.Feeds...)
	sort.SliceStable(feeds, func(a, b int) bool { return feeds[a].CheckedAt > feeds[b].CheckedAt })
	out := make([]feedNewItem, 0)
	for _, f := range feeds {
		for _, item := range f.New {
			out = append(out, feedNewItem{Item: item, FeedID: f.ID, FeedName: f.Name, Source: f.Source})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

// handleMarkFeedsSeen clears the pile — the shelf has been looked at. One feed by id,
// or all of them.
func (s *Server) handleMarkFeedsSeen(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id := r.PathValue("id")
	feedsMu.Lock()
	defer feedsMu.Unlock()
	store, err := s.readSavedFeeds(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read your feeds")
		return
	}
	for i := range store.Feeds {
		if id == "" || store.Feeds[i].ID == id {
			store.Feeds[i].New = []sources.Item{}
		}
	}
	if err := s.writeSavedFeeds(u.ID, store); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save your feeds")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
