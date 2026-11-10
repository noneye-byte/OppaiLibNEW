package api

import (
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestSpriteWordsKeepOnlyWhatWasRewritten(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	if rec := do(t, h, token, "GET", "/api/libby/sprite-words", ""); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"words":{}`) {
		t.Fatalf("nothing rewritten yet: %d %s", rec.Code, rec.Body)
	}

	// A square is named by its wardrobe slot; anything else is refused.
	if rec := do(t, h, token, "PUT", "/api/libby/sprite-words", `{"words":{"juggling":{"face":"x"}}}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("an unknown square: %d, want 400", rec.Code)
	}
	if rec := do(t, h, token, "PUT", "/api/libby/sprite-words", `{"words":{"happy":{"face":"`+strings.Repeat("a", spriteWordsMax+1)+`"}}}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("an overlong field: %d, want 400", rec.Code)
	}

	// Blank fields and blank squares are the studio's own, so they are not kept.
	rec := do(t, h, token, "PUT", "/api/libby/sprite-words",
		`{"words":{"typing":{"pose":"  holding her phone  ","prose":"She types on her phone."},"happy":{"face":" ","pose":""}}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("put: %d %s", rec.Code, rec.Body)
	}
	want := `{"words":{"typing":{"pose":"holding her phone","prose":"She types on her phone."}}}`
	if got := strings.TrimSpace(rec.Body.String()); got != want {
		t.Fatalf("stored %s, want %s", got, want)
	}
	if got := strings.TrimSpace(do(t, h, token, "GET", "/api/libby/sprite-words", "").Body.String()); got != want {
		t.Fatalf("read back %s", got)
	}
	// Sealed on disk: the wording is not readable there.
	raw, err := os.ReadFile(s.spriteWordsPath())
	if err != nil || strings.Contains(string(raw), "phone") {
		t.Fatalf("not sealed: %v %q", err, raw)
	}

	// Replacing the set without a square puts it back to the studio's words.
	do(t, h, token, "PUT", "/api/libby/sprite-words", `{"words":{}}`)
	if got := do(t, h, token, "GET", "/api/libby/sprite-words", "").Body.String(); !strings.Contains(got, `"words":{}`) {
		t.Fatalf("reset: %s", got)
	}
	// And it is not taken for a wardrobe.
	if got := do(t, h, token, "GET", "/api/libby/outfits", "").Body.String(); strings.Contains(got, "sprite") {
		t.Fatalf("listed as an outfit: %s", got)
	}
}
