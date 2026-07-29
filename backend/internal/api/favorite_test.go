package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

// seedMedia puts a bare row in the library. Enough to be patched; no blob needed,
// since nothing here reads one.
func seedMedia(t *testing.T, s *Server, sha string) int64 {
	t.Helper()
	id, _, err := s.db.InsertMedia(context.Background(), &db.MediaRow{
		Kind: "image", SHA256: sha, Size: 1,
	})
	if err != nil {
		t.Fatalf("seed media: %v", err)
	}
	return id
}

func getMedia(t *testing.T, s *Server, token string, id int64) models.Media {
	t.Helper()
	rec := do(t, s.Handler(), token, "GET", "/api/media/"+itoa(id), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get media: %d — %s", rec.Code, rec.Body.String())
	}
	var m models.Media
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatalf("decode media: %v", err)
	}
	return m
}

func itoa(i int64) string { return strconv.FormatInt(i, 10) }

// Favouriting is the one thing the schema could always store and no endpoint could
// ever set. This is the round trip the Android app makes: patch the flag, read it
// back, and clear it again.
func TestPatchFavorite(t *testing.T) {
	s, token := newTestServer(t)
	id := seedMedia(t, s, "aa")

	if got := getMedia(t, s, token, id); got.Favorite {
		t.Fatal("a fresh import should not be a favorite")
	}

	rec := do(t, s.Handler(), token, "PATCH", "/api/media/"+itoa(id), `{"favorite":true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d — %s", rec.Code, rec.Body.String())
	}
	// The patch response is the row as it now stands; it must already say so.
	var patched models.Media
	if err := json.Unmarshal(rec.Body.Bytes(), &patched); err != nil {
		t.Fatalf("decode patch response: %v", err)
	}
	if !patched.Favorite {
		t.Error("the patch response doesn't report the favorite it just set")
	}
	if got := getMedia(t, s, token, id); !got.Favorite {
		t.Error("favorite didn't survive a re-read")
	}

	// Unfavouriting has to work too: false differs from "absent", and a patch that
	// only ever turned the flag on would be a one-way door.
	if rec := do(t, s.Handler(), token, "PATCH", "/api/media/"+itoa(id), `{"favorite":false}`); rec.Code != http.StatusOK {
		t.Fatalf("unfavorite: %d — %s", rec.Code, rec.Body.String())
	}
	if got := getMedia(t, s, token, id); got.Favorite {
		t.Error("favorite didn't clear")
	}
}

// A patch carries only the fields the client touched. Setting one must not blank the
// others — which is exactly what the app relies on when the heart and the stars are
// two separate taps.
func TestPatchFavoriteLeavesOtherFieldsAlone(t *testing.T) {
	s, token := newTestServer(t)
	id := seedMedia(t, s, "bb")

	if rec := do(t, s.Handler(), token, "PATCH", "/api/media/"+itoa(id),
		`{"title":"Kept","rating":4}`); rec.Code != http.StatusOK {
		t.Fatalf("seed patch: %d — %s", rec.Code, rec.Body.String())
	}
	if rec := do(t, s.Handler(), token, "PATCH", "/api/media/"+itoa(id),
		`{"favorite":true}`); rec.Code != http.StatusOK {
		t.Fatalf("favorite patch: %d — %s", rec.Code, rec.Body.String())
	}

	got := getMedia(t, s, token, id)
	if !got.Favorite {
		t.Error("favorite not set")
	}
	if got.Title != "Kept" {
		t.Errorf("title was clobbered by an unrelated patch: %q", got.Title)
	}
	if got.Rating != 4 {
		t.Errorf("rating was clobbered by an unrelated patch: %d", got.Rating)
	}
}

// Ratings are stars. A client that sends 9 gets 5, not a row no UI can render.
func TestPatchRatingIsClamped(t *testing.T) {
	s, token := newTestServer(t)
	id := seedMedia(t, s, "cc")

	if rec := do(t, s.Handler(), token, "PATCH", "/api/media/"+itoa(id), `{"rating":9}`); rec.Code != http.StatusOK {
		t.Fatalf("patch: %d — %s", rec.Code, rec.Body.String())
	}
	if got := getMedia(t, s, token, id).Rating; got != 5 {
		t.Errorf("rating 9 should clamp to 5, got %d", got)
	}

	if rec := do(t, s.Handler(), token, "PATCH", "/api/media/"+itoa(id), `{"rating":-3}`); rec.Code != http.StatusOK {
		t.Fatalf("patch: %d — %s", rec.Code, rec.Body.String())
	}
	if got := getMedia(t, s, token, id).Rating; got != 0 {
		t.Errorf("a negative rating should clamp to unrated, got %d", got)
	}
}

// The multi-select path: one request, many ids, and a report of what it managed.
func TestBulkFavorite(t *testing.T) {
	s, token := newTestServer(t)
	first := seedMedia(t, s, "d1")
	second := seedMedia(t, s, "d2")
	missing := int64(9999)

	body := `{"action":"update","ids":[` + itoa(first) + `,` + itoa(second) + `,` + itoa(missing) +
		`],"patch":{"favorite":true}}`
	rec := do(t, s.Handler(), token, "POST", "/api/media/bulk", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("bulk: %d — %s", rec.Code, rec.Body.String())
	}

	var got struct {
		OK     []int64 `json:"ok"`
		Failed []int64 `json:"failed"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode bulk response: %v", err)
	}
	if len(got.OK) != 2 {
		t.Errorf("expected both real ids to be applied, got ok=%v", got.OK)
	}
	// The id that doesn't exist must be reported, not silently folded into success —
	// the app updates its grid from `ok`, and a lie here shows up as a tile whose
	// heart is on while the server says otherwise.
	if len(got.Failed) != 1 || got.Failed[0] != missing {
		t.Errorf("expected the missing id in failed, got failed=%v", got.Failed)
	}

	for _, id := range []int64{first, second} {
		if !getMedia(t, s, token, id).Favorite {
			t.Errorf("media %d wasn't favorited by the bulk update", id)
		}
	}
}
