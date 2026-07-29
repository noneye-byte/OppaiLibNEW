package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// The outfit wardrobe end to end: create, dress one emotion, list it back,
// stream the art, and delete — with the id/emotion validation that keeps path
// values off the filesystem.
func TestLibbyOutfits(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	// Empty wardrobe lists cleanly.
	rec := do(t, h, token, "GET", "/api/libby/outfits", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"outfits":[]`) {
		t.Fatalf("empty list: %d %s", rec.Code, rec.Body)
	}

	// Create.
	rec = do(t, h, token, "POST", "/api/libby/outfits", `{"name":"Summer dress"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var outfit struct {
		ID       string   `json:"id"`
		Name     string   `json:"name"`
		Emotions []string `json:"emotions"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &outfit)
	if outfit.ID == "" || outfit.Name != "Summer dress" || len(outfit.Emotions) != 0 {
		t.Fatalf("created = %+v", outfit)
	}

	// A nameless outfit is refused.
	if rec = do(t, h, token, "POST", "/api/libby/outfits", `{"name":"  "}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("blank name: %d, want 400", rec.Code)
	}

	// An unknown emotion (or a path-shaped one) is refused before touching disk.
	rec = do(t, h, token, "PUT", "/api/libby/outfits/"+outfit.ID+"/emotions/angry",
		`{"imageData":"data:image/png;base64,`+onePixelPNG+`"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad emotion: %d, want 400", rec.Code)
	}

	// Dress the happy slot.
	rec = do(t, h, token, "PUT", "/api/libby/outfits/"+outfit.ID+"/emotions/happy",
		`{"imageData":"data:image/png;base64,`+onePixelPNG+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("set emotion: %d %s", rec.Code, rec.Body)
	}

	// The list now reports the dressed emotion.
	rec = do(t, h, token, "GET", "/api/libby/outfits", "")
	if !strings.Contains(rec.Body.String(), `"emotions":["happy"]`) {
		t.Fatalf("list after dressing: %s", rec.Body)
	}

	// The art streams back as an image; an undressed emotion is a clean 404.
	rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/emotions/happy", "")
	if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "image/") {
		t.Fatalf("emotion art: %d, Content-Type %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/emotions/thinking", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("undressed emotion: %d, want 404", rec.Code)
	}

	// Delete removes the outfit and its art.
	if rec = do(t, h, token, "DELETE", "/api/libby/outfits/"+outfit.ID, ""); rec.Code != http.StatusOK {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/emotions/happy", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("art after delete: %d, want 404", rec.Code)
	}
}

// Horniness tiers: level 0 (baseline) and a higher tier are stored independently,
// and the list reports each emotion's covered levels.
func TestLibbyOutfitTiers(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, "POST", "/api/libby/outfits", `{"name":"Tiered"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var outfit struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &outfit)

	img := `{"imageData":"data:image/png;base64,` + onePixelPNG + `"}`
	// Dress happy at the baseline and at tier 3.
	if rec = do(t, h, token, "PUT", "/api/libby/outfits/"+outfit.ID+"/emotions/happy", img); rec.Code != http.StatusOK {
		t.Fatalf("set level 0: %d %s", rec.Code, rec.Body)
	}
	if rec = do(t, h, token, "PUT", "/api/libby/outfits/"+outfit.ID+"/emotions/happy?level=3", img); rec.Code != http.StatusOK {
		t.Fatalf("set level 3: %d %s", rec.Code, rec.Body)
	}

	// The list reports both covered levels for happy.
	rec = do(t, h, token, "GET", "/api/libby/outfits", "")
	if !strings.Contains(rec.Body.String(), `"happy":[0,3]`) {
		t.Fatalf("emotionLevels: %s", rec.Body)
	}

	// A tier that was never dressed 404s, while the dressed ones stream.
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/emotions/happy?level=3", ""); rec.Code != http.StatusOK {
		t.Fatalf("get level 3: %d", rec.Code)
	}
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/emotions/happy?level=2", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("get undressed level 2: %d, want 404", rec.Code)
	}

	// Deleting one tier leaves the other intact.
	if rec = do(t, h, token, "DELETE", "/api/libby/outfits/"+outfit.ID+"/emotions/happy?level=3", ""); rec.Code != http.StatusOK {
		t.Fatalf("delete level 3: %d", rec.Code)
	}
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/emotions/happy", ""); rec.Code != http.StatusOK {
		t.Fatalf("baseline gone after tier delete: %d", rec.Code)
	}
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/emotions/happy?level=3", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("tier 3 still present: %d, want 404", rec.Code)
	}
}
