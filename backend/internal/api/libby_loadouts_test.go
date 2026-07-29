package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// The loadout recipe store end to end: create, read back opaquely, overwrite,
// cover it, and delete — plus the validation that keeps path values off the
// filesystem and unbounded bodies out of memory.
func TestLibbyLoadouts(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	// No recipes yet lists cleanly rather than 404ing on a missing directory.
	rec := do(t, h, token, "GET", "/api/libby/loadouts", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"loadouts":[]`) {
		t.Fatalf("empty list: %d %s", rec.Code, rec.Body)
	}

	// Create. The body is passed through untouched, so the server needs no schema.
	body := `{"name":"Midnight rogue","loadout":{"gear":{"top":{"color":"crimson","item":"corset"}}},"updatedAt":1700000000000}`
	rec = do(t, h, token, "POST", "/api/libby/loadouts", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var made struct {
		ID        string          `json:"id"`
		Name      string          `json:"name"`
		Loadout   json.RawMessage `json:"loadout"`
		UpdatedAt int64           `json:"updatedAt"`
		HasThumb  bool            `json:"hasThumb"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &made)
	if made.ID == "" || made.Name != "Midnight rogue" || made.UpdatedAt != 1700000000000 {
		t.Fatalf("created = %+v", made)
	}
	if made.HasThumb {
		t.Fatal("a new loadout must not claim a cover it has no art for")
	}
	if !strings.Contains(string(made.Loadout), `"crimson"`) {
		t.Fatalf("loadout body was not preserved: %s", made.Loadout)
	}

	// A nameless recipe is refused, as is one whose body is not JSON.
	if rec = do(t, h, token, "POST", "/api/libby/loadouts", `{"name":"  "}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("blank name: %d, want 400", rec.Code)
	}
	// Every client spreads the body over its own defaults, so a scalar or an array is
	// refused here rather than being stored and failing in the browser.
	if rec = do(t, h, token, "POST", "/api/libby/loadouts", `{"name":"x","loadout":"a string"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("scalar loadout: %d, want 400", rec.Code)
	}
	if rec = do(t, h, token, "POST", "/api/libby/loadouts", `{"name":"x","loadout":[1,2]}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("array loadout: %d, want 400", rec.Code)
	}

	// An id that is not a 32-hex identifier never reaches the filesystem.
	if rec = do(t, h, token, "POST", "/api/libby/loadouts", `{"id":"../../etc/x","name":"x"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("path-shaped id: %d, want 400", rec.Code)
	}
	if rec = do(t, h, token, "DELETE", "/api/libby/loadouts/nope", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("bad id delete: %d, want 400", rec.Code)
	}

	// A recipe with no body at all is stored as an empty object, not as null — the
	// client always gets something it can spread over its defaults.
	rec = do(t, h, token, "POST", "/api/libby/loadouts", `{"name":"Bare"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"loadout":{}`) {
		t.Fatalf("bodyless create: %d %s", rec.Code, rec.Body)
	}

	// Saving with an existing id overwrites in place rather than making a second entry.
	rec = do(t, h, token, "POST", "/api/libby/loadouts",
		`{"id":"`+made.ID+`","name":"Midnight rogue v2","loadout":{"gear":{}}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("overwrite: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/libby/loadouts", "")
	if strings.Count(rec.Body.String(), `"id":`) != 2 {
		t.Fatalf("overwrite created a duplicate: %s", rec.Body)
	}
	if !strings.Contains(rec.Body.String(), "Midnight rogue v2") {
		t.Fatalf("rename not stored: %s", rec.Body)
	}

	// Covers: absent until set, then streamed as an image, then droppable.
	if rec = do(t, h, token, "GET", "/api/libby/loadouts/"+made.ID+"/thumb", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("cover before set: %d, want 404", rec.Code)
	}
	rec = do(t, h, token, "PUT", "/api/libby/loadouts/"+made.ID+"/thumb",
		`{"imageData":"data:image/png;base64,`+onePixelPNG+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("set cover: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/libby/loadouts/"+made.ID+"/thumb", "")
	if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "image/") {
		t.Fatalf("cover art: %d, Content-Type %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	rec = do(t, h, token, "GET", "/api/libby/loadouts", "")
	if !strings.Contains(rec.Body.String(), `"hasThumb":true`) {
		t.Fatalf("list did not report the cover: %s", rec.Body)
	}

	// A cover cannot be attached to a loadout that does not exist.
	rec = do(t, h, token, "PUT", "/api/libby/loadouts/"+strings.Repeat("a", 32)+"/thumb",
		`{"imageData":"data:image/png;base64,`+onePixelPNG+`"}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("cover for missing loadout: %d, want 404", rec.Code)
	}

	if rec = do(t, h, token, "DELETE", "/api/libby/loadouts/"+made.ID+"/thumb", ""); rec.Code != http.StatusOK {
		t.Fatalf("drop cover: %d %s", rec.Code, rec.Body)
	}
	// Dropping a cover twice is not an error: the requested outcome already holds.
	if rec = do(t, h, token, "DELETE", "/api/libby/loadouts/"+made.ID+"/thumb", ""); rec.Code != http.StatusOK {
		t.Fatalf("second drop: %d %s", rec.Code, rec.Body)
	}

	// Delete removes the record; a second delete is a clean 404.
	if rec = do(t, h, token, "DELETE", "/api/libby/loadouts/"+made.ID, ""); rec.Code != http.StatusOK {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	if rec = do(t, h, token, "DELETE", "/api/libby/loadouts/"+made.ID, ""); rec.Code != http.StatusNotFound {
		t.Fatalf("second delete: %d, want 404", rec.Code)
	}
}

// An oversized recipe is refused rather than stored, and the limit is applied while
// reading so the server never holds the whole body.
func TestLibbyLoadoutTooLarge(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	huge := `{"name":"Huge","loadout":{"pad":"` + strings.Repeat("x", maxLoadoutBytes+64) + `"}}`
	if rec := do(t, h, token, "POST", "/api/libby/loadouts", huge); rec.Code != http.StatusBadRequest {
		t.Fatalf("oversized loadout: %d, want 400", rec.Code)
	}
	rec := do(t, h, token, "GET", "/api/libby/loadouts", "")
	if !strings.Contains(rec.Body.String(), `"loadouts":[]`) {
		t.Fatalf("an oversized loadout was stored anyway: %s", rec.Body)
	}
}

// Loadouts live under the wardrobe directory. Listing wardrobes must not pick up
// their files, and listing loadouts must not pick up wardrobes.
func TestLibbyLoadoutsDoNotLeakIntoOutfits(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	if rec := do(t, h, token, "POST", "/api/libby/outfits", `{"name":"Wardrobe"}`); rec.Code != http.StatusOK {
		t.Fatalf("create outfit: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, token, "POST", "/api/libby/loadouts", `{"name":"Recipe"}`); rec.Code != http.StatusOK {
		t.Fatalf("create loadout: %d %s", rec.Code, rec.Body)
	}

	rec := do(t, h, token, "GET", "/api/libby/outfits", "")
	if strings.Contains(rec.Body.String(), "Recipe") || strings.Count(rec.Body.String(), `"id":`) != 1 {
		t.Fatalf("wardrobe list picked up a loadout: %s", rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/libby/loadouts", "")
	if strings.Contains(rec.Body.String(), "Wardrobe") || strings.Count(rec.Body.String(), `"id":`) != 1 {
		t.Fatalf("loadout list picked up a wardrobe: %s", rec.Body)
	}
}
