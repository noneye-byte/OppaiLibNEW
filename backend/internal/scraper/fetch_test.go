package scraper

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// testEngine builds an engine pointed at a local test server. AllowPrivateHosts is
// required because the SSRF guard otherwise refuses 127.0.0.1 — which is exactly
// what it is there for.
func testEngine(t *testing.T) *Engine {
	t.Helper()
	return New(Options{
		UserAgent:         "oppailib-test",
		Delay:             0,
		AllowPrivateHosts: true,
	})
}

func mustURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("parse %q: %v", raw, err)
	}
	return u
}

func TestRetriesTransientStatusThenSucceeds(t *testing.T) {
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if atomic.AddInt32(&hits, 1) < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<html>ok</html>"))
	}))
	defer srv.Close()

	e := testEngine(t)
	resp, err := e.get(context.Background(), mustURL(t, srv.URL))
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	if got := atomic.LoadInt32(&hits); got != 3 {
		t.Fatalf("attempts = %d, want 3", got)
	}
}

func TestDoesNotRetryClientError(t *testing.T) {
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	e := testEngine(t)
	resp, err := e.get(context.Background(), mustURL(t, srv.URL))
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	resp.Body.Close()
	// A 404 is a settled answer. Retrying it would triple the load on a site to
	// learn the same thing, so the response comes straight back for the caller to
	// reject.
	if got := atomic.LoadInt32(&hits); got != 1 {
		t.Fatalf("attempts = %d, want 1 (404 is not transient)", got)
	}
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestGivesUpAfterMaxAttempts(t *testing.T) {
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer srv.Close()

	e := testEngine(t)
	_, err := e.get(context.Background(), mustURL(t, srv.URL))
	if err == nil {
		t.Fatal("want an error after exhausting retries")
	}
	if got := atomic.LoadInt32(&hits); got != maxAttempts {
		t.Fatalf("attempts = %d, want %d", got, maxAttempts)
	}
	// The message has to name the host and say it was retried — the user-facing
	// error is the only place this becomes debuggable.
	if !strings.Contains(err.Error(), "attempts") || !strings.Contains(err.Error(), "502") {
		t.Errorf("error %q does not explain the failure", err)
	}
}

func TestRetryAfterLongerThanCapFailsFast(t *testing.T) {
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		w.Header().Set("Retry-After", "3600")
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	e := testEngine(t)
	start := time.Now()
	_, err := e.get(context.Background(), mustURL(t, srv.URL))
	if err == nil {
		t.Fatal("want an error")
	}
	// Honoring an hour-long Retry-After by sleeping would hang the user's click for
	// an hour. Refusing it immediately is the only useful behaviour.
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Fatalf("waited %v; should have failed immediately", elapsed)
	}
	if got := atomic.LoadInt32(&hits); got != 1 {
		t.Fatalf("attempts = %d, want 1", got)
	}
	if !strings.Contains(err.Error(), "wait") {
		t.Errorf("error %q should say the site asked us to wait", err)
	}
}

func TestRetryAfterParsing(t *testing.T) {
	fallback := 5 * time.Second
	cases := []struct {
		header string
		want   time.Duration
		note   string
	}{
		{"", fallback, "absent"},
		{"2", 2 * time.Second, "delta-seconds"},
		{" 2 ", 2 * time.Second, "padded"},
		{"0", fallback, "zero is not a useful instruction"},
		{"-4", fallback, "negative is nonsense"},
		{"soon", fallback, "unparseable"},
		{"Mon, 02 Jan 2006 15:04:05 GMT", fallback, "a date in the past"},
	}
	for _, c := range cases {
		if got := retryAfter(c.header, fallback); got != c.want {
			t.Errorf("retryAfter(%q) = %v, want %v (%s)", c.header, got, c.want, c.note)
		}
	}
	// An HTTP-date in the future must be turned into the remaining interval.
	future := time.Now().Add(3 * time.Second).UTC().Format(http.TimeFormat)
	if got := retryAfter(future, fallback); got <= 0 || got > 4*time.Second {
		t.Errorf("retryAfter(future date) = %v, want ~3s", got)
	}
}

func TestCancelledContextIsNotRetried(t *testing.T) {
	var hits int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		<-r.Context().Done()
	}))
	defer srv.Close()

	e := testEngine(t)
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(150 * time.Millisecond)
		cancel()
	}()
	_, err := e.get(ctx, mustURL(t, srv.URL))
	if err == nil {
		t.Fatal("want an error")
	}
	// The user navigated away. Trying again on their behalf spends their bandwidth
	// and the site's on a result nobody will read.
	if got := atomic.LoadInt32(&hits); got != 1 {
		t.Fatalf("attempts = %d, want 1 after cancellation", got)
	}
}

func TestBlockedAddressIsNotRetried(t *testing.T) {
	// A private address with the guard active: permanently refused, so a retry only
	// delays the error the user needs to see.
	e := New(Options{UserAgent: "oppailib-test"})
	start := time.Now()
	_, err := e.get(context.Background(), mustURL(t, "http://127.0.0.1:9/"))
	if err == nil {
		t.Fatal("want the SSRF guard to refuse this")
	}
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Fatalf("took %v; a permanent refusal must not go through backoff", elapsed)
	}
}

func TestIsTransientErrClassification(t *testing.T) {
	permanent := []string{
		"Get \"http://x/\": dial tcp 10.0.0.5:80: scrape: refusing to connect to non-public address 10.0.0.5",
		"Get \"http://x/\": scrape: blocked network \"unix\"",
		"Get \"https://x/\": x509: certificate signed by unknown authority",
		"Get \"http://x/\": stopped after 10 redirects",
	}
	for _, msg := range permanent {
		if isTransientErr(fmt.Errorf("%s", msg)) {
			t.Errorf("treated as transient, should be permanent: %s", msg)
		}
	}
	transient := []string{
		"Get \"http://x/\": read tcp: connection reset by peer",
		"Get \"http://x/\": EOF",
		"Get \"http://x/\": dial tcp: lookup x: no such host",
		"Get \"http://x/\": context deadline exceeded (Client.Timeout exceeded)",
	}
	for _, msg := range transient {
		if !isTransientErr(fmt.Errorf("%s", msg)) {
			t.Errorf("treated as permanent, should be transient: %s", msg)
		}
	}
}

func TestPerHostConcurrencyIsBounded(t *testing.T) {
	var inFlight, peak int32
	var mu sync.Mutex
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&inFlight, 1)
		mu.Lock()
		if n > peak {
			peak = n
		}
		mu.Unlock()
		time.Sleep(60 * time.Millisecond)
		atomic.AddInt32(&inFlight, -1)
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	const limit = 2
	e := New(Options{UserAgent: "oppailib-test", AllowPrivateHosts: true, MaxPerHost: limit})

	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp, err := e.get(context.Background(), mustURL(t, srv.URL))
			if err != nil {
				return
			}
			// The slot is held by the body, so a caller that forgets to close would
			// leak it — which is why every path in the engine closes.
			resp.Body.Close()
		}()
	}
	wg.Wait()

	mu.Lock()
	got := peak
	mu.Unlock()
	if got > limit {
		t.Fatalf("peak concurrency = %d, limit is %d", got, limit)
	}
	if got == 0 {
		t.Fatal("no requests reached the server")
	}
}

func TestSlotIsReleasedOnBodyClose(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	e := New(Options{UserAgent: "oppailib-test", AllowPrivateHosts: true, MaxPerHost: 1})
	u := mustURL(t, srv.URL)
	// With a limit of one, a second fetch can only succeed if closing the first
	// body actually returned the slot.
	for i := 0; i < 3; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		resp, err := e.get(ctx, u)
		if err != nil {
			cancel()
			t.Fatalf("fetch %d: %v", i, err)
		}
		resp.Body.Close()
		cancel()
	}
}

func TestPerHostTimeoutOverride(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		_, _ = w.Write([]byte("late"))
	}))
	defer srv.Close()

	host := mustURL(t, srv.URL).Host
	e := New(Options{
		UserAgent:         "oppailib-test",
		AllowPrivateHosts: true,
		HostTimeouts:      map[string]time.Duration{host: 100 * time.Millisecond},
	})
	// The per-attempt deadline must bite well before the default 25s, and it must
	// still count as transient — so the caller sees an exhausted-retries error
	// rather than hanging.
	start := time.Now()
	_, err := e.get(context.Background(), mustURL(t, srv.URL))
	if err == nil {
		t.Fatal("want a timeout error")
	}
	if elapsed := time.Since(start); elapsed > 6*time.Second {
		t.Fatalf("took %v; the per-host timeout did not apply", elapsed)
	}
}

func TestNormalizeHostFoldsCaseAndPort(t *testing.T) {
	cases := map[string]string{
		"Example.COM":       "example.com",
		"example.com:443":   "example.com",
		"EXAMPLE.com:8080 ": "example.com",
		"[::1]:8080":        "[::1]",
	}
	for in, want := range cases {
		if got := normalizeHost(in); got != want {
			t.Errorf("normalizeHost(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestFetchRecordsMetrics(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	e := testEngine(t)
	resp, err := e.get(context.Background(), mustURL(t, srv.URL))
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	resp.Body.Close()

	snap := e.Metrics().Snapshot()
	if snap.Counters["scrape.fetch.ok"] != 1 {
		t.Errorf("scrape.fetch.ok = %d, want 1", snap.Counters["scrape.fetch.ok"])
	}
	if len(snap.Timings) == 0 {
		t.Fatal("no fetch latency was recorded")
	}
}
