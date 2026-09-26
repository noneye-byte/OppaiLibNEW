package api

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestTheReferenceShownFitsWhatTheTurnIsAbout(t *testing.T) {
	both := func(string) bool { return true }
	clothedOnly := func(slot string) bool { return slot == referenceClothed }
	nudeOnly := func(slot string) bool { return slot == referenceNude }
	for _, tc := range []struct {
		name, msg string
		heat      int
		shared    bool
		has       func(string) bool
		want      string
	}{
		{"small talk shows nothing", "how was your day", 2, false, both, ""},
		{"asking what she wears shows her dressed", "what are you wearing rn", 2, false, both, referenceClothed},
		{"asking her to strip shows her bare", "take your top off", 2, false, both, referenceNude},
		{"a heated scene shows her bare", "you look so good right now", 5, false, both, referenceNude},
		{"a shared picture is always worth one", "lol", 1, true, both, referenceClothed},
		{"a missing bare slot falls back to clothed", "are you naked", 2, false, clothedOnly, referenceClothed},
		{"a missing clothed slot never shows her bare", "what are you wearing", 2, false, nudeOnly, ""},
	} {
		got, ok := referenceFor(tc.msg, tc.heat, tc.shared, tc.has)
		if got != tc.want || ok != (tc.want != "") {
			t.Errorf("%s: got %q %v, want %q", tc.name, got, ok, tc.want)
		}
	}
}

func TestReferencesRoundTripAndReachHerEyes(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	var pic bytes.Buffer
	_ = png.Encode(&pic, image.NewRGBA(image.Rect(0, 0, 8, 8)))
	somePNG := base64.StdEncoding.EncodeToString(pic.Bytes())
	for _, slot := range referenceSlots {
		if rec := do(t, h, token, http.MethodPut, "/api/libby/references/"+slot, `{"imageData":"`+somePNG+`"}`); rec.Code != http.StatusOK {
			t.Fatalf("upload %s: %d %s", slot, rec.Code, rec.Body)
		}
	}
	if rec := do(t, h, token, http.MethodGet, "/api/libby/references", ""); !strings.Contains(rec.Body.String(), `"nude":true`) {
		t.Fatalf("list: %s", rec.Body)
	}
	if rec := do(t, h, token, http.MethodGet, "/api/libby/references/clothed", ""); rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "image/") {
		t.Fatalf("preview: %d %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	if rec := do(t, h, token, http.MethodPut, "/api/libby/references/other", `{"imageData":"`+somePNG+`"}`); rec.Code != http.StatusNotFound {
		t.Fatalf("an unknown slot was accepted: %d", rec.Code)
	}

	var sent string
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		raw, _ := io.ReadAll(r.Body)
		sent = string(raw)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"just a tank top lol\n[mood: happy 2]"}}]}`))
	}))
	t.Cleanup(llm.Close)
	cur := s.settings.Get()
	cur.ChatURL, cur.ChatVision, cur.ChatContextTokens = llm.URL, "on", 32768
	s.settings.Set(cur)

	chat := func(msg string, heat int) string {
		t.Helper()
		rec := do(t, h, token, http.MethodPost, "/api/chat",
			`{"mode":"sweet","characterId":"libby","intensity":`+string(rune('0'+heat))+`,"messages":[{"id":"a","role":"user","content":"`+msg+`"}]}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("chat %q: %d %s", msg, rec.Code, rec.Body)
		}
		return sent
	}
	if got := chat("what are you wearing", 2); !strings.Contains(got, "in your usual clothes") || !strings.Contains(got, "image_url") {
		t.Fatalf("the clothed reference did not reach her:\n%.600s", got)
	}
	if got := chat("are you naked", 2); !strings.Contains(got, "with nothing on") {
		t.Fatalf("the bare reference did not reach her")
	}
	if got := chat("how was work", 2); strings.Contains(got, "reference picture") || strings.Contains(got, "image_url") {
		t.Fatalf("small talk was sent a reference")
	}

	// Emptied, the slot is gone and the turn falls back.
	if rec := do(t, h, token, http.MethodDelete, "/api/libby/references/nude", ""); rec.Code != http.StatusOK {
		t.Fatalf("delete: %d", rec.Code)
	}
	if got := chat("are you naked", 2); !strings.Contains(got, "in your usual clothes") {
		t.Fatalf("with the bare slot empty, the clothed one should stand in")
	}
}
