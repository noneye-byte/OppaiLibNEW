package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// The work-in-progress store end to end: file a square, read it back, redo it,
// count it, and lose it only when the outfit itself goes.
func TestLibbyOutfitWIP(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, "POST", "/api/libby/outfits", `{"name":"Midnight rogue"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var outfit struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &outfit)

	// Nothing generated yet: an empty manifest, not a 404.
	rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/wip", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"squares":[]`) {
		t.Fatalf("empty wip: %d %s", rec.Code, rec.Body)
	}

	// An unknown emotion is refused before anything touches disk.
	rec = do(t, h, token, "PUT", "/api/libby/outfits/"+outfit.ID+"/wip/angry",
		`{"imageData":"data:image/png;base64,`+onePixelPNG+`"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("bad emotion: %d, want 400", rec.Code)
	}

	// File one square at tier 3, unreviewed.
	rec = do(t, h, token, "PUT", "/api/libby/outfits/"+outfit.ID+"/wip/happy?level=3",
		`{"imageData":"data:image/png;base64,`+onePixelPNG+`","filename":"happy-heated.png","seed":42}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("put wip: %d %s", rec.Code, rec.Body)
	}

	// It comes back in the manifest, with its record and without its bytes.
	rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/wip", "")
	body := rec.Body.String()
	if !strings.Contains(body, `"emotion":"happy"`) || !strings.Contains(body, `"level":3`) ||
		!strings.Contains(body, `"seed":42`) || !strings.Contains(body, `"reviewed":false`) {
		t.Fatalf("wip manifest: %s", body)
	}
	if strings.Contains(body, `"image"`) {
		t.Fatalf("manifest carried image bytes: %s", body)
	}

	// The picture streams from the tier it was filed under, and only that tier.
	rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/wip/happy?level=3", "")
	if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "image/") {
		t.Fatalf("wip image: %d, Content-Type %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/wip/happy", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("other tier: %d, want 404", rec.Code)
	}

	// A wardrobe with only unfinished work still has a cover and reports the count,
	// which is what stops a set in progress from looking like an empty wardrobe.
	rec = do(t, h, token, "GET", "/api/libby/outfits", "")
	if !strings.Contains(rec.Body.String(), `"wip":1`) || !strings.Contains(rec.Body.String(), `"hasThumb":true`) {
		t.Fatalf("list with wip: %s", rec.Body)
	}
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/thumb", ""); rec.Code != http.StatusOK {
		t.Fatalf("cover from wip: %d", rec.Code)
	}

	// A redo replaces the square rather than adding a second one, and does not
	// inherit the review state of the take it replaced.
	rec = do(t, h, token, "PUT", "/api/libby/outfits/"+outfit.ID+"/wip/happy?level=3",
		`{"imageData":"data:image/png;base64,`+onePixelPNG+`","seed":7,"reviewed":true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("redo: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/wip", "")
	if strings.Count(rec.Body.String(), `"emotion"`) != 1 || !strings.Contains(rec.Body.String(), `"seed":7`) ||
		!strings.Contains(rec.Body.String(), `"reviewed":true`) {
		t.Fatalf("after redo: %s", rec.Body)
	}

	// Deleting one square is explicit, and deleting nothing is not an error.
	if rec = do(t, h, token, "DELETE", "/api/libby/outfits/"+outfit.ID+"/wip/happy?level=3", ""); rec.Code != http.StatusOK {
		t.Fatalf("delete square: %d %s", rec.Code, rec.Body)
	}
	if rec = do(t, h, token, "DELETE", "/api/libby/outfits/"+outfit.ID+"/wip/happy?level=3", ""); rec.Code != http.StatusOK {
		t.Fatalf("delete again: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/wip", "")
	if !strings.Contains(rec.Body.String(), `"squares":[]`) {
		t.Fatalf("after delete: %s", rec.Body)
	}
}

// Deleting the outfit is the one thing that takes its work in progress with it.
func TestLibbyOutfitDeleteTakesWIP(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, "POST", "/api/libby/outfits", `{"name":"Beach date"}`)
	var outfit struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &outfit)
	for _, path := range []string{"/wip/happy", "/wip/shy?level=2"} {
		rec = do(t, h, token, "PUT", "/api/libby/outfits/"+outfit.ID+path,
			`{"imageData":"data:image/png;base64,`+onePixelPNG+`"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("put %s: %d %s", path, rec.Code, rec.Body)
		}
	}

	if rec = do(t, h, token, "DELETE", "/api/libby/outfits/"+outfit.ID, ""); rec.Code != http.StatusOK {
		t.Fatalf("delete outfit: %d %s", rec.Code, rec.Body)
	}
	// The squares are gone with it — and a wardrobe recreated on the same id later
	// must not inherit a stranger's pictures.
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/wip/happy", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("square after outfit delete: %d, want 404", rec.Code)
	}
	if rec = do(t, h, token, "GET", "/api/libby/outfits/"+outfit.ID+"/wip", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("manifest after outfit delete: %d, want 404", rec.Code)
	}
}
