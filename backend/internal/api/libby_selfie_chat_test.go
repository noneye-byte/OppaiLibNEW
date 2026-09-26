package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// A picture she was asked to make used to be filed in the library, with the card saying
// "it's in your library" and nothing in the conversation. It is hers to send: it lands
// in her chat gallery, and the library copy is a setting that starts off.
func TestAPictureSheMakesIsSentNotFiled(t *testing.T) {
	gen := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/sdapi/v1/txt2img" {
			_, _ = w.Write([]byte(`{"images":["` + onePixelPNG + `"],"info":"{\"seed\":1}"}`))
			return
		}
		http.NotFound(w, r)
	}))
	t.Cleanup(gen.Close)
	s, token := newTestServer(t)
	enableImageGen(t, s, gen.URL)
	h := s.Handler()

	libraryTotal := func() int {
		rec := do(t, h, token, http.MethodGet, "/api/media", "")
		var page struct {
			Total int `json:"total"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &page)
		return page.Total
	}

	rec := do(t, h, token, http.MethodPost, "/api/libby/act", `{"kind":"generate","prompt":"you on the balcony","intensity":2}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("act: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Image chatImage `json:"image"`
		ID    int64     `json:"id"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Image.ID == "" || out.Image.CharacterID != "libby" || out.Image.Subject != chatSubjectSelf {
		t.Fatalf("the picture did not come back as one of hers: %+v", out.Image)
	}
	if out.ID != 0 || libraryTotal() != 0 {
		t.Fatalf("the picture was filed in the library by default")
	}
	// It is in her gallery, and it opens.
	if rec := do(t, h, token, http.MethodGet, "/api/chat/images/"+out.Image.ID, ""); rec.Code != http.StatusOK {
		t.Fatalf("the gallery copy did not open: %d", rec.Code)
	}

	// With the setting on, the library gets a copy too.
	cur := s.settings.Get()
	cur.LibbyGenToLibrary = true
	s.settings.Set(cur)
	rec = do(t, h, token, http.MethodPost, "/api/libby/act", `{"kind":"generate","prompt":"you in the kitchen","intensity":2}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("act with the library copy: %d %s", rec.Code, rec.Body)
	}
	out.ID = 0
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.ID <= 0 || libraryTotal() != 1 {
		t.Fatalf("the library copy was not made: id=%d total=%d", out.ID, libraryTotal())
	}
}
