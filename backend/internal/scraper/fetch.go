package scraper

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Outbound fetch discipline: bounded per-host concurrency, a per-host deadline,
// and retry with exponential backoff on failures that are actually worth retrying.
//
// All three exist because the symptom reported against this app was "the server
// struggles with fetching content and navigation", and each of these is one of the
// underlying causes rather than a longer timeout painted over it:
//
//   - Unbounded concurrency. Opening a listing fans out into per-item resolutions
//     that all target one host. Nothing capped them, so a click could put twenty
//     simultaneous requests on one site — which the politeness throttle then
//     serialized anyway, meaning the only thing the extra goroutines bought was
//     twenty sockets and twenty stalled requests competing for the same slot. The
//     semaphore makes the queue explicit and bounded.
//
//   - No retry. A single 503 or a dropped connection failed the whole navigation
//     and the user retried by hand — which is a retry, just a slower one with a
//     confused human in the loop. Retrying only transient failures, with backoff,
//     turns most of those into a completed request.
//
//   - One global timeout. The client's flat 30s deadline is wrong in both
//     directions: it is far too long to wait for a host that is simply down, and
//     too short for a slow gallery page. A per-host deadline lets a known-slow
//     site have room without every other host inheriting the same patience.
//
// What is deliberately *not* here: retrying non-idempotent requests, retrying 4xx
// other than the two that mean "not yet", and retrying a request whose context has
// no time left. Each of those turns one failure into several and makes the site
// treat us worse.

const (
	// defaultHostTimeout bounds one attempt against one host. It replaces the
	// client's flat Timeout for engine fetches; the client keeps its own as a
	// backstop for paths that don't come through here.
	defaultHostTimeout = 25 * time.Second

	// defaultMaxPerHost bounds simultaneous in-flight requests per host. Four is
	// chosen against the politeness throttle: with a delay configured, requests
	// serialize anyway, so this mostly exists to stop a fan-out from opening
	// dozens of sockets that then sit idle waiting their turn.
	defaultMaxPerHost = 4

	// maxAttempts counts the first try. Two retries is enough to ride out a
	// momentary 503 or a reset connection; more than that and we are hammering a
	// site that has a real problem.
	maxAttempts = 3

	// backoffBase is the first retry's wait, doubled each attempt and jittered.
	backoffBase = 600 * time.Millisecond

	// backoffCap bounds a single wait, including one taken from Retry-After. A site
	// asking us to come back in an hour is answered by failing the request now with
	// a clear message, not by holding the user's navigation open for an hour.
	backoffCap = 8 * time.Second
)

// fetchPolicy holds the per-host knobs. Zero values mean the defaults above.
type fetchPolicy struct {
	mu       sync.Mutex
	timeouts map[string]time.Duration // host → per-attempt deadline override
	sems     map[string]chan struct{} // host → concurrency limiter
	maxPer   int
}

func newFetchPolicy(maxPerHost int, timeouts map[string]time.Duration) *fetchPolicy {
	if maxPerHost <= 0 {
		maxPerHost = defaultMaxPerHost
	}
	p := &fetchPolicy{
		timeouts: map[string]time.Duration{},
		sems:     map[string]chan struct{}{},
		maxPer:   maxPerHost,
	}
	for h, d := range timeouts {
		if d > 0 {
			p.timeouts[normalizeHost(h)] = d
		}
	}
	return p
}

// SetHostTimeout installs a per-attempt deadline for one host at runtime, so a
// site that is legitimately slow can be given room from Settings without raising
// everyone else's patience.
func (e *Engine) SetHostTimeout(host string, d time.Duration) {
	host = normalizeHost(host)
	if host == "" {
		return
	}
	e.policy.mu.Lock()
	defer e.policy.mu.Unlock()
	if d <= 0 {
		delete(e.policy.timeouts, host)
		return
	}
	e.policy.timeouts[host] = d
}

// timeout returns the per-attempt deadline for host.
func (p *fetchPolicy) timeout(host string) time.Duration {
	p.mu.Lock()
	defer p.mu.Unlock()
	if d, ok := p.timeouts[normalizeHost(host)]; ok {
		return d
	}
	return defaultHostTimeout
}

// sem returns (creating on first use) the limiter for host.
func (p *fetchPolicy) sem(host string) chan struct{} {
	host = normalizeHost(host)
	p.mu.Lock()
	defer p.mu.Unlock()
	s, ok := p.sems[host]
	if !ok {
		s = make(chan struct{}, p.maxPer)
		p.sems[host] = s
	}
	return s
}

// normalizeHost lowercases and drops the port, so example.com and EXAMPLE.com:443
// share one limiter and one timeout rather than counting as two sites.
func normalizeHost(host string) string {
	host = strings.ToLower(strings.TrimSpace(host))
	if i := strings.LastIndex(host, ":"); i > 0 && !strings.Contains(host[i:], "]") {
		host = host[:i]
	}
	return host
}

// acquire blocks until this host has a free slot, honoring cancellation. The
// returned func releases it and must be called exactly once.
func (e *Engine) acquire(ctx context.Context, host string) (func(), error) {
	s := e.policy.sem(host)
	select {
	case s <- struct{}{}:
		return func() { <-s }, nil
	default:
		// Contended. Report it before blocking — a queue that is never empty is the
		// signal that the fan-out upstream is too wide, and it is invisible otherwise.
		e.metrics.Inc("scrape.host_queued")
	}
	select {
	case s <- struct{}{}:
		return func() { <-s }, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// get issues a browser-like GET so sites that gate OpenGraph tags (or block
// unknown agents outright) still serve us the real page.
//
// It is the single chokepoint for engine HTML fetches: concurrency bound,
// per-host deadline, retry policy and metrics all live here, so Scrape and Fetch
// cannot drift apart on any of them. The response body is the caller's to close.
func (e *Engine) get(ctx context.Context, u *url.URL) (*http.Response, error) {
	release, err := e.acquire(ctx, u.Host)
	if err != nil {
		return nil, fmt.Errorf("fetch %s: cancelled while queued: %w", u.Host, err)
	}
	// The body outlives this function, so the slot cannot be released with a defer —
	// it is handed to the response instead and released when the caller closes it.
	// A failure path releases directly.
	released := false
	releaseOnce := func() {
		if !released {
			released = true
			release()
		}
	}

	host := normalizeHost(u.Host)
	perAttempt := e.policy.timeout(u.Host)
	var lastErr error

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if attempt > 1 {
			// Every retry is a fresh request to someone else's server, so it owes the
			// same politeness delay as a first one.
			if err := e.throttle(ctx, u.Host); err != nil {
				releaseOnce()
				return nil, err
			}
		}

		start := time.Now()
		resp, err := e.attempt(ctx, u, perAttempt)
		e.metrics.Observe("scrape.fetch."+host, time.Since(start))

		if err == nil && !shouldRetryStatus(resp.StatusCode) {
			e.metrics.Inc("scrape.fetch.ok")
			// Hand the slot to the body: browsing holds many responses open at once,
			// and releasing at header time would make the limit meaningless.
			resp.Body = &releasingBody{ReadCloser: resp.Body, release: releaseOnce}
			return resp, nil
		}

		var wait time.Duration
		if err != nil {
			// A cancelled or deadline-exceeded *caller* is not a transient failure —
			// the user navigated away or gave up. Retrying it wastes their bandwidth
			// and the site's.
			if ctx.Err() != nil {
				releaseOnce()
				e.metrics.Inc("scrape.fetch.cancelled")
				return nil, fmt.Errorf("fetch %s: %w", u.Host, ctx.Err())
			}
			if !isTransientErr(err) {
				releaseOnce()
				e.metrics.Inc("scrape.fetch.error")
				return nil, err
			}
			lastErr = err
			wait = backoffFor(attempt)
		} else {
			lastErr = fmt.Errorf("%s returned %d %s", u.Host, resp.StatusCode, http.StatusText(resp.StatusCode))
			wait = retryAfter(resp.Header.Get("Retry-After"), backoffFor(attempt))
			// The body is being thrown away, but it must still be drained enough to
			// let the connection be reused rather than torn down and re-dialled.
			_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4<<10))
			resp.Body.Close()
		}

		if attempt == maxAttempts {
			break
		}
		if wait > backoffCap {
			// The site is asking for longer than we are willing to hold the user's
			// navigation open. Fail now with a message that says so.
			releaseOnce()
			e.metrics.Inc("scrape.fetch.backoff_too_long")
			return nil, fmt.Errorf("fetch %s: asked us to wait %s before retrying; try again later", u.Host, wait.Round(time.Second))
		}
		// No point sleeping through time we don't have.
		if dl, ok := ctx.Deadline(); ok && time.Until(dl) < wait {
			break
		}
		e.metrics.Inc("scrape.fetch.retry")
		t := time.NewTimer(wait)
		select {
		case <-t.C:
		case <-ctx.Done():
			t.Stop()
			releaseOnce()
			return nil, fmt.Errorf("fetch %s: %w", u.Host, ctx.Err())
		}
		t.Stop()
	}

	releaseOnce()
	e.metrics.Inc("scrape.fetch.exhausted")
	return nil, fmt.Errorf("fetch %s failed after %d attempts: %w", u.Host, maxAttempts, lastErr)
}

// attempt performs exactly one request under its own deadline, so one slow host
// cannot consume the whole retry budget in a single try.
func (e *Engine) attempt(ctx context.Context, u *url.URL, perAttempt time.Duration) (*http.Response, error) {
	actx, cancel := context.WithTimeout(ctx, perAttempt)
	req, err := http.NewRequestWithContext(actx, http.MethodGet, u.String(), nil)
	if err != nil {
		cancel()
		return nil, err
	}
	req.Header.Set("User-Agent", e.ua())
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := e.client.Do(req)
	if err != nil {
		cancel()
		return nil, err
	}
	// The deadline must outlive this call or reading the body would fail instantly;
	// cancel travels with the body instead.
	resp.Body = &cancelBody{ReadCloser: resp.Body, cancel: cancel}
	return resp, nil
}

// releasingBody frees a host concurrency slot when the response body is closed.
type releasingBody struct {
	io.ReadCloser
	release func()
	once    sync.Once
}

func (b *releasingBody) Close() error {
	err := b.ReadCloser.Close()
	b.once.Do(b.release)
	return err
}

// cancelBody ties a per-attempt context's cancel to the body's lifetime.
type cancelBody struct {
	io.ReadCloser
	cancel context.CancelFunc
	once   sync.Once
}

func (b *cancelBody) Close() error {
	err := b.ReadCloser.Close()
	b.once.Do(b.cancel)
	return err
}

// shouldRetryStatus reports whether a status code means "not right now" rather
// than "no". 429 and 503 are the site telling us to slow down; 500/502/504 and
// 408/425 are failures a second attempt commonly clears. Every other 4xx is a
// settled answer and retrying it is just rudeness.
func shouldRetryStatus(code int) bool {
	switch code {
	case http.StatusRequestTimeout, // 408
		http.StatusTooEarly,            // 425
		http.StatusTooManyRequests,     // 429
		http.StatusInternalServerError, // 500
		http.StatusBadGateway,          // 502
		http.StatusServiceUnavailable,  // 503
		http.StatusGatewayTimeout:      // 504
		return true
	}
	return false
}

// isTransientErr reports whether a transport-level failure is worth another try.
//
// It is deliberately conservative about what it will *not* retry: our own SSRF
// guard refusing a private address, and a bad URL, are permanent and retrying
// them only delays a clear error. Note the guard's message is matched rather than
// its type, because it surfaces wrapped in *url.Error from the dialer.
func isTransientErr(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) {
		return false
	}
	msg := err.Error()
	// Our own refusals. Permanent by construction.
	if strings.Contains(msg, "refusing to connect to non-public address") ||
		strings.Contains(msg, "blocked network") ||
		strings.Contains(msg, "unresolved dial address") ||
		strings.Contains(msg, "stopped after") {
		return false
	}
	// TLS trust failures do not fix themselves on a retry either.
	if strings.Contains(msg, "x509:") || strings.Contains(msg, "certificate") {
		return false
	}
	// What remains — resets, EOFs, connect refusals, DNS hiccups, timeouts — is the
	// class that a second attempt genuinely clears often enough to be worth it.
	return true
}

// backoffFor returns the wait before the given attempt's retry: exponential from
// backoffBase, with jitter so several queued fetches against one host don't all
// wake at the same instant and re-collide.
func backoffFor(attempt int) time.Duration {
	d := backoffBase << (attempt - 1)
	if d > backoffCap {
		d = backoffCap
	}
	// ±25%.
	jitter := time.Duration(rand.Int63n(int64(d/2)+1)) - d/4
	d += jitter
	if d < 0 {
		d = backoffBase
	}
	return d
}

// retryAfter reads a Retry-After header, in either of its two legal forms, and
// falls back to fallback when it is absent or unparseable. A site's explicit
// number is honored over our own backoff even when it is longer — being told to
// wait and ignoring it is how an IP gets blocked.
func retryAfter(h string, fallback time.Duration) time.Duration {
	h = strings.TrimSpace(h)
	if h == "" {
		return fallback
	}
	if secs, err := strconv.Atoi(h); err == nil {
		if secs <= 0 {
			return fallback
		}
		return time.Duration(secs) * time.Second
	}
	if when, err := http.ParseTime(h); err == nil {
		if d := time.Until(when); d > 0 {
			return d
		}
		return fallback
	}
	return fallback
}
