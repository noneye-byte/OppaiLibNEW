package api

import (
	"bytes"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestAPictureIsFetchedOnceAndServedFromMemoryAfter(t *testing.T) {
	var hits atomic.Int32
	var pic bytes.Buffer
	_ = png.Encode(&pic, image.NewRGBA(image.Rect(0, 0, 4, 4)))
	cdn := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		if r.URL.Path == "/page" {
			w.Header().Set("Content-Type", "text/plain")
			_, _ = w.Write([]byte("not a picture"))
			return
		}
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(pic.Bytes())
	}))
	defer cdn.Close()
	s, token := newTestServer(t)
	proxied := func(path string) *httptest.ResponseRecorder {
		return do(t, s.Handler(), token, http.MethodGet, "/api/scrape/proxy?url="+url.QueryEscape(cdn.URL+path), "")
	}
	for i := 0; i < 3; i++ {
		rec := proxied("/cover.png")
		if rec.Code != http.StatusOK || !bytes.Equal(rec.Body.Bytes(), pic.Bytes()) {
			t.Fatalf("fetch %d: %d, %d bytes", i, rec.Code, rec.Body.Len())
		}
		if rec.Header().Get("Cache-Control") != "private, max-age=86400" {
			t.Fatalf("cache header %q", rec.Header().Get("Cache-Control"))
		}
	}
	if hits.Load() != 1 {
		t.Fatalf("the CDN was asked %d times for one picture", hits.Load())
	}
	// Something that is not a picture is served but never kept.
	proxied("/page")
	proxied("/page")
	if hits.Load() != 3 {
		t.Fatalf("a non-picture was cached (%d hits)", hits.Load())
	}
}

// A screen of covers from one host loads side by side, not one politeness delay apart.
func TestPicturesFromOneHostAreNotQueuedBehindTheScrapeDelay(t *testing.T) {
	cdn := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte("\x89PNG"))
	}))
	defer cdn.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ScrapeDelayMs = 1500
	s.settings.Set(cur)
	s.ApplySettings(cur)
	start := time.Now()
	var wg sync.WaitGroup
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			do(t, s.Handler(), token, http.MethodGet, "/api/scrape/proxy?url="+url.QueryEscape(cdn.URL+"/c"+string(rune('a'+i))+".png"), "")
		}(i)
	}
	wg.Wait()
	if took := time.Since(start); took > 1500*time.Millisecond {
		t.Fatalf("six covers took %v — they were queued behind the scrape delay", took)
	}
}

func TestTheCacheForgetsTheOldestWhenFull(t *testing.T) {
	c := newImageProxyCache()
	big := make([]byte, imageCacheMaxItem)
	for i := 0; i < imageCacheBytes/imageCacheMaxItem+2; i++ {
		c.put(cachedImage{key: string(rune('a' + i)), contentType: "image/png", body: big})
	}
	if _, ok := c.get("a"); ok {
		t.Fatal("the oldest picture survived a full cache")
	}
	if c.bytes > imageCacheBytes {
		t.Fatalf("cache holds %d bytes, over its %d", c.bytes, imageCacheBytes)
	}
	c.put(cachedImage{key: "huge", body: make([]byte, imageCacheMaxItem+1)})
	if _, ok := c.get("huge"); ok {
		t.Fatal("a picture over the item limit was kept")
	}
}
