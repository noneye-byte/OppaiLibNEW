package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

// secondUserToken is a session for somebody else on the same install, for the
// per-user assertions.
func secondUserToken(t *testing.T, s *Server) string {
	t.Helper()
	ctx := context.Background()
	uid, err := s.db.CreateUser(ctx, "housemate", "x", false)
	if err != nil {
		t.Fatalf("create second user: %v", err)
	}
	token := "second-user-token"
	if err := s.db.CreateSession(ctx, token, uid, time.Hour, db.ClientWeb); err != nil {
		t.Fatalf("create second session: %v", err)
	}
	return token
}

func collectionItems(t *testing.T, s *Server, token string, id int64, query string) []models.Media {
	t.Helper()
	path := fmt.Sprintf("/api/collections/%d/items", id)
	if query != "" {
		path += "?" + query
	}
	rec := do(t, s.Handler(), token, http.MethodGet, path, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET %s: %d %s", path, rec.Code, rec.Body)
	}
	var got struct {
		Items []models.Media `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return got.Items
}

func newCollection(t *testing.T, s *Server, token, name string) int64 {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/collections", `{"name":"`+name+`"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create collection: %d %s", rec.Code, rec.Body)
	}
	var got struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return got.ID
}

// A collection keeps the order it was given, which is the whole reason it is not a
// tag: a tag says what something is, equally, about everything it is on.
func TestCollectionKeepsItsOwnOrder(t *testing.T) {
	s, token := newTestServer(t)
	// Seeded oldest-first, so the collection's order is the reverse of every
	// library sort and cannot be the default order by accident.
	first := seedFull(t, s, seedRow{title: "Chapter One", kind: "comic", at: 100})
	second := seedFull(t, s, seedRow{title: "Chapter Two", kind: "comic", at: 200})
	third := seedFull(t, s, seedRow{title: "Chapter Three", kind: "comic", at: 300})

	id := newCollection(t, s, token, "Read In Order")
	body := fmt.Sprintf(`{"mediaIds":[%d,%d,%d]}`, third, second, first)
	if rec := do(t, s.Handler(), token, http.MethodPost,
		fmt.Sprintf("/api/collections/%d/items", id), body); rec.Code != http.StatusOK {
		t.Fatalf("add items: %d %s", rec.Code, rec.Body)
	}

	items := collectionItems(t, s, token, id, "")
	if len(items) != 3 || items[0].ID != third || items[1].ID != second || items[2].ID != first {
		t.Fatalf("collection order = %v, want %d,%d,%d", titlesOf(items), third, second, first)
	}
}

// Adding is idempotent, because the caller is a multi-select that may overlap what it
// sent last time — and adding does not disturb what is already placed.
func TestAddingToACollectionTwiceAddsOnce(t *testing.T) {
	s, token := newTestServer(t)
	a := seedFull(t, s, seedRow{title: "Item A", kind: "image", at: 100})
	b := seedFull(t, s, seedRow{title: "Item B", kind: "image", at: 200})
	id := newCollection(t, s, token, "Overlapping")

	add := func(body string) int {
		rec := do(t, s.Handler(), token, http.MethodPost,
			fmt.Sprintf("/api/collections/%d/items", id), body)
		if rec.Code != http.StatusOK {
			t.Fatalf("add: %d %s", rec.Code, rec.Body)
		}
		var got struct {
			Added int `json:"added"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &got)
		return got.Added
	}
	if n := add(fmt.Sprintf(`{"mediaIds":[%d]}`, a)); n != 1 {
		t.Fatalf("first add reported %d", n)
	}
	if n := add(fmt.Sprintf(`{"mediaIds":[%d,%d]}`, a, b)); n != 1 {
		t.Fatalf("overlapping add reported %d, want 1 (only B is new)", n)
	}
	if items := collectionItems(t, s, token, id, ""); len(items) != 2 || items[0].ID != a {
		t.Fatalf("items = %v, want A then B", titlesOf(items))
	}
}

// A partial reorder — the client sending only the page it can see — must leave the
// rest in the order it had, with no two rows sharing a position.
func TestPartialReorderLeavesTheRestAlone(t *testing.T) {
	s, token := newTestServer(t)
	var ids []int64
	for i := range 5 {
		ids = append(ids, seedFull(t, s, seedRow{
			title: fmt.Sprintf("Track %d", i), kind: "video", at: int64(100 + i),
		}))
	}
	id := newCollection(t, s, token, "Playlist")
	list, _ := json.Marshal(ids)
	if rec := do(t, s.Handler(), token, http.MethodPost,
		fmt.Sprintf("/api/collections/%d/items", id),
		`{"mediaIds":`+string(list)+`}`); rec.Code != http.StatusOK {
		t.Fatalf("add: %d %s", rec.Code, rec.Body)
	}

	// Move the last two to the front, saying nothing about the other three.
	body := fmt.Sprintf(`{"mediaIds":[%d,%d]}`, ids[4], ids[3])
	if rec := do(t, s.Handler(), token, http.MethodPut,
		fmt.Sprintf("/api/collections/%d/order", id), body); rec.Code != http.StatusNoContent {
		t.Fatalf("reorder: %d %s", rec.Code, rec.Body)
	}

	items := collectionItems(t, s, token, id, "")
	want := []int64{ids[4], ids[3], ids[0], ids[1], ids[2]}
	if len(items) != len(want) {
		t.Fatalf("got %d items, want %d", len(items), len(want))
	}
	for i := range want {
		if items[i].ID != want[i] {
			t.Fatalf("position %d is %d, want %d (full order %v)", i, items[i].ID, want[i], titlesOf(items))
		}
	}
}

// Deleting a collection deletes the list, not what is on it. A user who tidies up
// their shelves must not find their library smaller afterwards.
func TestDeletingACollectionKeepsTheMedia(t *testing.T) {
	s, token := newTestServer(t)
	kept := seedFull(t, s, seedRow{title: "Still Here", kind: "image", at: 100})
	id := newCollection(t, s, token, "Temporary")
	if rec := do(t, s.Handler(), token, http.MethodPost,
		fmt.Sprintf("/api/collections/%d/items", id),
		fmt.Sprintf(`{"mediaIds":[%d]}`, kept)); rec.Code != http.StatusOK {
		t.Fatalf("add: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, s.Handler(), token, http.MethodDelete,
		fmt.Sprintf("/api/collections/%d", id), ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}

	if items, total := listMedia(t, s, token, ""); total != 1 || len(items) != 1 || items[0].ID != kept {
		t.Fatalf("library after deleting a collection = %v (total %d)", titlesOf(items), total)
	}
	if rec := do(t, s.Handler(), token, http.MethodGet,
		fmt.Sprintf("/api/collections/%d/items", id), ""); rec.Code != http.StatusNotFound {
		t.Errorf("deleted collection still answers: %d", rec.Code)
	}
}

// Two collections cannot share a name, and the attempt says so rather than making a
// second one that looks identical in the list.
func TestDuplicateCollectionNameIsAConflict(t *testing.T) {
	s, token := newTestServer(t)
	newCollection(t, s, token, "Favourites Of A Kind")
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/collections",
		`{"name":"Favourites Of A Kind"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("duplicate name = %d, want 409: %s", rec.Code, rec.Body)
	}
	// And a nameless collection is refused outright.
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/collections",
		`{"name":"   "}`); rec.Code != http.StatusBadRequest {
		t.Errorf("blank name = %d, want 400", rec.Code)
	}
}

// Resume, the part that never existed: a position written once is the position read
// back, and it belongs to the item rather than to the device that saved it.
func TestProgressRoundTrips(t *testing.T) {
	s, token := newTestServer(t)
	id := seedFull(t, s, seedRow{title: "Long Film", kind: "video", at: 100})

	if rec := do(t, s.Handler(), token, http.MethodPut,
		fmt.Sprintf("/api/media/%d/progress", id), `{"position":842.5}`); rec.Code != http.StatusNoContent {
		t.Fatalf("put progress: %d %s", rec.Code, rec.Body)
	}
	rec := do(t, s.Handler(), token, http.MethodGet, fmt.Sprintf("/api/media/%d/progress", id), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get progress: %d %s", rec.Code, rec.Body)
	}
	var got struct {
		Position float64 `json:"position"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got.Position != 842.5 {
		t.Errorf("position = %v, want 842.5", got.Position)
	}

	// An item never opened reads as zero rather than as an error: "never started" and
	// "at the start" are the same thing to a player.
	other := seedFull(t, s, seedRow{title: "Unwatched", kind: "video", at: 200})
	rec = do(t, s.Handler(), token, http.MethodGet, fmt.Sprintf("/api/media/%d/progress", other), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get missing progress: %d %s", rec.Code, rec.Body)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &got)
	if got.Position != 0 {
		t.Errorf("unwatched position = %v, want 0", got.Position)
	}
}

// The resume shelf holds what you are part-way through — not what you finished, and
// not what you rewound to the start.
func TestResumeShelfExcludesFinishedAndRestarted(t *testing.T) {
	s, token := newTestServer(t)
	partway := seedFull(t, s, seedRow{title: "Half Watched", kind: "video", at: 100})
	finished := seedFull(t, s, seedRow{title: "Seen It", kind: "video", at: 200})
	restarted := seedFull(t, s, seedRow{title: "Back To Zero", kind: "video", at: 300})
	// Durations, so "finished" can mean anything at all.
	for _, id := range []int64{partway, finished, restarted} {
		if _, err := s.db.SQL().Exec(`UPDATE media SET duration = 1000 WHERE id = ?`, id); err != nil {
			t.Fatalf("set duration: %v", err)
		}
	}

	put := func(id int64, pos string) {
		if rec := do(t, s.Handler(), token, http.MethodPut,
			fmt.Sprintf("/api/media/%d/progress", id), `{"position":`+pos+`}`); rec.Code != http.StatusNoContent {
			t.Fatalf("put progress %d: %d %s", id, rec.Code, rec.Body)
		}
	}
	put(partway, "400")
	put(finished, "995") // inside the 97% finish line
	put(restarted, "120")
	put(restarted, "0") // dragged back to the beginning

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/resume", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("resume: %d %s", rec.Code, rec.Body)
	}
	var got struct {
		Items    []models.Media `json:"items"`
		Progress []struct {
			MediaID  int64   `json:"mediaId"`
			Position float64 `json:"position"`
		} `json:"progress"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got.Items) != 1 || got.Items[0].ID != partway {
		t.Fatalf("resume shelf = %v, want only the half-watched one", titlesOf(got.Items))
	}
	if len(got.Progress) != 1 || got.Progress[0].Position != 400 {
		t.Errorf("resume positions = %+v", got.Progress)
	}
}

// Progress is per user. Two people sharing an install do not share where they got to.
func TestProgressIsPerUser(t *testing.T) {
	s, token := newTestServer(t)
	id := seedFull(t, s, seedRow{title: "Shared Film", kind: "video", at: 100})
	if rec := do(t, s.Handler(), token, http.MethodPut,
		fmt.Sprintf("/api/media/%d/progress", id), `{"position":500}`); rec.Code != http.StatusNoContent {
		t.Fatalf("put: %d %s", rec.Code, rec.Body)
	}

	otherToken := secondUserToken(t, s)
	rec := do(t, s.Handler(), otherToken, http.MethodGet, fmt.Sprintf("/api/media/%d/progress", id), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get as other user: %d %s", rec.Code, rec.Body)
	}
	var got struct {
		Position float64 `json:"position"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &got)
	if got.Position != 0 {
		t.Errorf("the other user sees position %v, want 0", got.Position)
	}
}
