package api

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// cdn is a stand-in for a media CDN that counts what it is asked for.
type cdn struct {
	hits   atomic.Int32
	status int    // 0 serves the file
	retry  string // Retry-After on a refusal
	body   []byte
	gate   chan struct{} // when set, the response waits on it
}

func (c *cdn) start(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c.hits.Add(1)
		if c.gate != nil {
			<-c.gate
		}
		if c.status != 0 {
			w.Header().Set("Retry-After", c.retry)
			http.Error(w, "Too Many Requests", c.status)
			return
		}
		w.Header().Set("Content-Type", "video/webm")
		w.Write(c.body)
	}))
	t.Cleanup(srv.Close)
	return srv
}

// stream asks the server for u the way the proxy hands it on, with an optional Range.
func stream(t *testing.T, s *Server, u *url.URL, rng string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/sources/stream", nil)
	if rng != "" {
		req.Header.Set("Range", rng)
	}
	rec := httptest.NewRecorder()
	if !s.serveWholeMedia(rec, req, u, 16<<20, backoffKey(u), func(*http.Request) {}) {
		t.Fatalf("serveWholeMedia declined a small file")
	}
	return rec
}

func TestALoopingClipReachesTheOriginOnceHoweverManyRangesThePlayerAsksFor(t *testing.T) {
	clip := bytes.Repeat([]byte("webm"), 1<<18) // 1 MB
	origin := &cdn{body: clip}
	srv := origin.start(t)
	s, _ := newTestServer(t)
	u, _ := url.Parse(srv.URL + "/gif/1700000000000.webm")

	// The open, the jump to the cue index, the way back, and a few loops.
	for _, rng := range []string{"", "bytes=1040000-", "bytes=0-", "bytes=0-", "bytes=0-", "bytes=0-"} {
		rec := stream(t, s, u, rng)
		want := clip
		if rng == "bytes=1040000-" {
			want = clip[1040000:]
			if rec.Code != http.StatusPartialContent {
				t.Fatalf("range %q: status %d, want 206", rng, rec.Code)
			}
		}
		if !bytes.Equal(rec.Body.Bytes(), want) {
			t.Fatalf("range %q: got %d bytes, want %d", rng, rec.Body.Len(), len(want))
		}
	}
	if n := origin.hits.Load(); n != 1 {
		t.Fatalf("origin was asked %d times, want once", n)
	}
}

func TestAPlayerHangingUpEarlyDoesNotCancelTheFetchTheNextRequestNeeds(t *testing.T) {
	origin := &cdn{body: []byte("clip"), gate: make(chan struct{})}
	srv := origin.start(t)
	s, _ := newTestServer(t)
	u, _ := url.Parse(srv.URL + "/gif/1.webm")

	// The first request gives up while the file is still on its way.
	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodGet, "/api/sources/stream", nil).WithContext(ctx)
	done := make(chan struct{})
	go func() {
		s.serveWholeMedia(httptest.NewRecorder(), req, u, 1<<20, backoffKey(u), func(*http.Request) {})
		close(done)
	}()
	for origin.hits.Load() == 0 {
		time.Sleep(time.Millisecond)
	}
	cancel()
	<-done

	close(origin.gate)
	rec := stream(t, s, u, "")
	if rec.Body.String() != "clip" {
		t.Fatalf("second request got %q", rec.Body.String())
	}
	if n := origin.hits.Load(); n != 1 {
		t.Fatalf("origin was asked %d times, want once", n)
	}
}

func TestA429IsHonouredForAsLongAsRetryAfterSays(t *testing.T) {
	origin := &cdn{status: http.StatusTooManyRequests, retry: "2645"}
	srv := origin.start(t)
	s, _ := newTestServer(t)
	u, _ := url.Parse(srv.URL + "/gif/1.webm")

	rec := stream(t, s, u, "")
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status %d, want 502 (a 401 would sign the client out)", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "about 45 minutes") {
		t.Fatalf("message should say how long: %s", rec.Body)
	}
	if rec.Header().Get("Retry-After") != "2645" {
		t.Fatalf("Retry-After = %q", rec.Header().Get("Retry-After"))
	}
	// The stream handler checks this before it would ask the origin again.
	if wait := s.upstreamBackoff.remaining(backoffKey(u)); wait < 44*time.Minute {
		t.Fatalf("back-off holds for %v", wait)
	}
}

func TestTheBackOffIsPerKindOfFileSoThumbnailsKeepLoadingWhileVideosWait(t *testing.T) {
	b := newUpstreamBackoff()
	video, _ := url.Parse("https://i.4cdn.org/gif/1.webm")
	thumb, _ := url.Parse("https://i.4cdn.org/gif/1s.jpg")
	other, _ := url.Parse("https://i.4cdn.org/wsg/2.WEBM")
	b.hold(backoffKey(video), "600")
	if b.remaining(backoffKey(thumb)) != 0 {
		t.Fatalf("a thumbnail was held back by a video's limit")
	}
	if b.remaining(backoffKey(other)) == 0 {
		t.Fatalf("another video on the same host was let through")
	}
}

func TestRetryAfterIsReadAsSecondsOrADateAndCapped(t *testing.T) {
	b := newUpstreamBackoff()
	now := time.Date(2026, 10, 16, 12, 0, 0, 0, time.UTC)
	b.now = func() time.Time { return now }
	cases := map[string]time.Duration{
		"90":   90 * time.Second,
		"":     defaultBackoff,
		"soon": defaultBackoff,
		now.Add(10 * time.Minute).Format(http.TimeFormat): 10 * time.Minute,
		"86400": maxBackoff,
	}
	for in, want := range cases {
		if got := b.hold("k", in); got != want {
			t.Errorf("Retry-After %q: waited %v, want %v", in, got, want)
		}
	}
}

func TestTheLeastRecentlyPlayedClipIsTheOneEvicted(t *testing.T) {
	c := newSourceMediaCache(10)
	put := func(key string, n int) {
		c.get(context.Background(), key, func() (*cachedMedia, error) {
			return &cachedMedia{data: make([]byte, n)}, nil
		})
	}
	put("a", 4)
	put("b", 4)
	put("a", 4) // played again, so b is now the cold one
	put("c", 4)
	if _, ok := c.entries["b"]; ok {
		t.Fatalf("b should have been evicted")
	}
	if _, ok := c.entries["a"]; !ok {
		t.Fatalf("a was played most recently and should have stayed")
	}
	if c.used > c.budget {
		t.Fatalf("holding %d bytes against a budget of %d", c.used, c.budget)
	}
}

func TestAFileBiggerThanTheLimitIsLeftToStreamThrough(t *testing.T) {
	origin := &cdn{body: make([]byte, 2048)}
	srv := origin.start(t)
	s, _ := newTestServer(t)
	u, _ := url.Parse(srv.URL + "/big.webm")
	req := httptest.NewRequest(http.MethodGet, "/api/sources/stream", nil)
	if s.serveWholeMedia(httptest.NewRecorder(), req, u, 1024, backoffKey(u), func(*http.Request) {}) {
		t.Fatalf("a file over the limit was served from the cache path")
	}
}
