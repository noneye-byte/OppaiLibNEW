package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// A square's clips end to end: filed from a preview, listed without their bytes,
// played with ranges, read back for a cut once the preview is gone, and taken away
// with the square they were made of.
func TestLibbyOutfitAnims(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, "POST", "/api/libby/outfits", `{"name":"Midnight rogue"}`)
	var outfit struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &outfit)
	base := "/api/libby/outfits/" + outfit.ID + "/anim"

	rec = do(t, h, token, "GET", base, "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"anims":[]`) {
		t.Fatalf("empty anims: %d %s", rec.Code, rec.Body)
	}

	clip := s.genCache.put(&genPreview{data: []byte("0123456789webm"), mime: "video/webm", seed: 77, prompt: "she blinks"})
	picture := s.genCache.put(&genPreview{data: []byte("png"), seed: 1})

	// The stage is named, and must be one of the two.
	if rec = do(t, h, token, "PUT", base+"/happy?level=2", `{"id":"`+clip+`"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("no stage: %d, want 400", rec.Code)
	}
	if rec = do(t, h, token, "PUT", base+"/happy?level=2&stage=gif", `{"id":"`+clip+`"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("bad stage: %d, want 400", rec.Code)
	}
	// A picture is not a clip.
	if rec = do(t, h, token, "PUT", base+"/happy?level=2&stage=clip", `{"id":"`+picture+`"}`); rec.Code == http.StatusOK {
		t.Fatalf("picture filed as a clip: %s", rec.Body)
	}

	rec = do(t, h, token, "PUT", base+"/happy?level=2&stage=clip", `{"id":"`+clip+`","from":"seed-42","recipe":"4 steps · CFG 1"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("put clip: %d %s", rec.Code, rec.Body)
	}

	rec = do(t, h, token, "GET", base, "")
	body := rec.Body.String()
	for _, want := range []string{`"emotion":"happy"`, `"level":2`, `"stage":"clip"`, `"seed":77`, `"from":"seed-42"`, `"mime":"video/webm"`, `"bytes":14`} {
		if !strings.Contains(body, want) {
			t.Fatalf("manifest lacks %s: %s", want, body)
		}
	}

	// It plays with ranges, which is how a video element asks for it.
	req := httptest.NewRequest("GET", base+"/happy?level=2&stage=clip", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Range", "bytes=0-3")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusPartialContent || rr.Body.String() != "0123" || rr.Header().Get("Content-Type") != "video/webm" {
		t.Fatalf("ranged clip: %d %q %q", rr.Code, rr.Body, rr.Header().Get("Content-Type"))
	}
	if rec = do(t, h, token, "GET", base+"/happy?level=1&stage=clip", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("other tier: %d, want 404", rec.Code)
	}

	// Once the preview has expired the clip is still there to cut, read from the store.
	s.genCache.mu.Lock()
	delete(s.genCache.m, clip)
	s.genCache.mu.Unlock()
	src, status, msg := s.libbyAnimClipSource(outfitClipRef{Outfit: outfit.ID, Emotion: "happy", Level: 2}, genRecord{})
	if status != 0 || string(src.data) != "0123456789webm" || src.mime != "video/webm" || src.record.Seed != 77 {
		t.Fatalf("stored clip as a source: %d %s %+v", status, msg, src.record)
	}
	if _, status, _ = s.libbyAnimClipSource(outfitClipRef{Outfit: outfit.ID, Emotion: "happy", Level: 2, Stage: "cut"}, genRecord{}); status != http.StatusNotFound {
		t.Fatalf("missing cut: %d, want 404", status)
	}

	// A MISC state is one square whatever tier it is asked for at.
	cut := s.genCache.put(&genPreview{data: []byte("cut"), mime: "video/webm", seed: 77})
	if rec = do(t, h, token, "PUT", base+"/reading?level=3&stage=cut", `{"id":"`+cut+`"}`); rec.Code != http.StatusOK {
		t.Fatalf("put misc cut: %d %s", rec.Code, rec.Body)
	}
	if rec = do(t, h, token, "GET", base+"/reading?stage=cut", ""); rec.Code != http.StatusOK {
		t.Fatalf("misc cut at level 0: %d", rec.Code)
	}

	// Taking a clip away takes its cut too; a cut alone leaves the clip.
	cut2 := s.genCache.put(&genPreview{data: []byte("cut"), mime: "video/webm"})
	do(t, h, token, "PUT", base+"/happy?level=2&stage=cut", `{"id":"`+cut2+`"}`)
	do(t, h, token, "DELETE", base+"/happy?level=2&stage=cut", "")
	if rec = do(t, h, token, "GET", base+"/happy?level=2&stage=clip", ""); rec.Code != http.StatusOK {
		t.Fatalf("clip after its cut went: %d", rec.Code)
	}
	cut3 := s.genCache.put(&genPreview{data: []byte("cut"), mime: "video/webm"})
	do(t, h, token, "PUT", base+"/happy?level=2&stage=cut", `{"id":"`+cut3+`"}`)
	do(t, h, token, "DELETE", base+"/happy?level=2&stage=clip", "")
	if rec = do(t, h, token, "GET", base+"/happy?level=2&stage=cut", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("cut outlived its clip: %d", rec.Code)
	}

	// Throwing the square's picture away takes its clips with it.
	do(t, h, token, "DELETE", "/api/libby/outfits/"+outfit.ID+"/wip/reading", "")
	if rec = do(t, h, token, "GET", base+"/reading?stage=cut", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("clip outlived its square: %d", rec.Code)
	}

	// And deleting the outfit leaves nothing of it on disk.
	clip4 := s.genCache.put(&genPreview{data: []byte("webm"), mime: "video/webm"})
	do(t, h, token, "PUT", base+"/sad?stage=clip", `{"id":"`+clip4+`"}`)
	do(t, h, token, "DELETE", "/api/libby/outfits/"+outfit.ID, "")
	if _, err := s.readLibbyAnim(outfit.ID, "sad", 0, "clip"); err == nil {
		t.Fatalf("a clip survived its outfit")
	}
}
