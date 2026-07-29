// Package scraper fetches a URL and extracts media + metadata using pluggable
// parsers. Site-specific parsers are defined declaratively in YAML (see
// yamlparser.go) so new sites can be added without recompiling. A generic
// OpenGraph/<meta> parser (generic.go) is the always-available fallback and the
// reference implementation for how a parser behaves.
//
// This is the user's own tool for their own use: it rate-limits per host and
// honors robots.txt at a technical level. It ships no hardcoded commercial site
// parsers.
package scraper

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/obs"
)

// Parser turns a parsed HTML document into a ScrapeResult.
type Parser interface {
	Name() string
	// Match reports whether this parser handles the given URL.
	Match(u *url.URL) bool
	Parse(doc *goquery.Document, u *url.URL) (*models.ScrapeResult, error)
}

// DirectParser is an optional interface a Parser may also implement when it needs
// to bypass the engine's HTML fetch entirely — e.g. to call a site's JSON API
// instead of parsing a page (the X/Twitter parser does this, since x.com serves a
// login wall / default image to scrapers). When the picked parser implements it,
// Scrape calls ScrapeDirect and skips the goquery path.
type DirectParser interface {
	ScrapeDirect(ctx context.Context, client *http.Client, userAgent string, u *url.URL) (*models.ScrapeResult, error)
}

// Engine orchestrates fetch → parse. It holds registered parsers (site-specific
// first, generic last), a polite rate limiter, and an optional robots checker.
type Engine struct {
	client  *http.Client
	site    []Parser // ordered, site-specific
	generic Parser

	// User agent, politeness delay and the robots checker are editable at runtime
	// from the Settings screen, so they're read through optMu rather than fixed at
	// construction.
	optMu     sync.RWMutex
	userAgent string
	delay     time.Duration
	robots    *robotsCache

	mu       sync.Mutex
	lastHost map[string]time.Time

	// Outbound fetch discipline: per-host deadlines, bounded per-host concurrency
	// and the retry policy. See fetch.go.
	policy *fetchPolicy

	// Where outbound-fetch counters and latencies go. Never nil — a *obs.Registry
	// is inert when nil, but keeping a real one means the numbers exist even when
	// the engine was built without being handed one.
	metrics *obs.Registry
}

type Options struct {
	UserAgent     string
	Delay         time.Duration
	RespectRobots bool
	SiteParsers   []Parser
	// Metrics collects outbound fetch counters and latencies. Optional; a nil
	// registry is inert, so tests and one-off engines need not supply one.
	Metrics *obs.Registry
	// MaxPerHost bounds simultaneous in-flight requests to one host. Zero means
	// defaultMaxPerHost.
	MaxPerHost int
	// HostTimeouts overrides the per-attempt deadline for named hosts, for sites
	// that are legitimately slow. Keyed by hostname, port and case ignored.
	HostTimeouts map[string]time.Duration
	// AllowPrivateHosts disables the SSRF dial guard that refuses connections to
	// loopback/private/link-local addresses. It exists only so tests can point the
	// engine at an httptest server on 127.0.0.1; production must leave it false.
	AllowPrivateHosts bool
}

func New(opts Options) *Engine {
	// SSRF guard. Every scrape/import/proxy target is a user-supplied URL, and this
	// client will also follow redirects; without a check the server would happily
	// fetch the cloud metadata service, a sibling container, or the router admin page
	// — none of which the client can reach directly. Control runs after DNS
	// resolution, on the concrete IP about to be dialed, so it closes the hole for
	// redirects and DNS-rebinding alike (a hostname that passes an allowlist but
	// resolves to a private address is blocked here).
	dialer := &net.Dialer{
		Timeout:   10 * time.Second, // TCP connect (incl. DNS)
		KeepAlive: 30 * time.Second,
	}
	if !opts.AllowPrivateHosts {
		dialer.Control = guardDial
	}
	// An explicitly-bounded transport. The bare http.Client{Timeout} used before
	// only capped the *whole* exchange, so a container that couldn't reach a host
	// (a common Unraid egress/DNS misconfig) could sit at the connect stage for a
	// long time and the UI just spun on "Fetching…". These per-phase deadlines make
	// an unreachable host fail in a few seconds with a clear error instead.
	transport := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment, // honor HTTP(S)_PROXY if the box uses one
		DialContext:           dialer.DialContext,
		ForceAttemptHTTP2:     true,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 15 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		MaxIdleConns:          64,
		IdleConnTimeout:       90 * time.Second,
	}
	client := &http.Client{
		Timeout:   30 * time.Second,
		Transport: transport,
		// A redirect is just another dial, so guardDial already vets each hop's IP;
		// this only caps a redirect loop from spinning until the overall timeout.
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("stopped after 10 redirects")
			}
			return nil
		},
	}
	metrics := opts.Metrics
	if metrics == nil {
		metrics = obs.NewRegistry()
	}
	e := &Engine{
		client:   client,
		site:     opts.SiteParsers,
		generic:  &GenericParser{},
		lastHost: make(map[string]time.Time),
		policy:   newFetchPolicy(opts.MaxPerHost, opts.HostTimeouts),
		metrics:  metrics,
	}
	e.SetOptions(opts.UserAgent, opts.Delay, opts.RespectRobots)
	return e
}

// SetOptions applies the live-editable scrape knobs. Turning robots checking on
// builds a fresh cache (it bakes in the user agent it evaluates rules for);
// turning it off drops it.
func (e *Engine) SetOptions(userAgent string, delay time.Duration, respectRobots bool) {
	e.optMu.Lock()
	defer e.optMu.Unlock()
	e.userAgent = userAgent
	e.delay = delay
	if respectRobots {
		e.robots = newRobotsCache(e.client, userAgent)
	} else {
		e.robots = nil
	}
}

// ua returns the current user agent.
func (e *Engine) ua() string {
	e.optMu.RLock()
	defer e.optMu.RUnlock()
	return e.userAgent
}

// pace returns the current per-host politeness delay.
func (e *Engine) pace() time.Duration {
	e.optMu.RLock()
	defer e.optMu.RUnlock()
	return e.delay
}

// robotsChecker returns the current robots cache, or nil when robots checking is
// disabled.
func (e *Engine) robotsChecker() *robotsCache {
	e.optMu.RLock()
	defer e.optMu.RUnlock()
	return e.robots
}

// Register appends a site-specific parser (takes priority over the generic one).
func (e *Engine) Register(p Parser) { e.site = append(e.site, p) }

// SetF95Credentials pushes the F95 login into a registered F95 parser, if any. A
// no-op when F95 support isn't compiled in / registered, so callers needn't know
// whether it exists.
func (e *Engine) SetF95Credentials(username, password string) {
	for _, p := range e.site {
		if f, ok := p.(*F95Parser); ok {
			f.SetCredentials(username, password)
		}
	}
}

// pick returns the first matching site parser, else the generic parser.
func (e *Engine) pick(u *url.URL) Parser {
	for _, p := range e.site {
		if p.Match(u) {
			return p
		}
	}
	return e.generic
}

// Scrape fetches rawURL and returns extracted metadata + media links.
func (e *Engine) Scrape(ctx context.Context, rawURL string) (*models.ScrapeResult, error) {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return nil, fmt.Errorf("bad url: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("unsupported scheme %q", u.Scheme)
	}
	// Fast path: the URL points straight at a media file (Discord CDN links,
	// direct image/video hotlinks, …). No HTML to parse — use it as-is.
	if kind := mediaKindFromPath(u.Path); kind != "" {
		return &models.ScrapeResult{
			Kind:      string(kind),
			Title:     titleFromURL(u),
			MediaURLs: []string{u.String()},
			SourceURL: u.String(),
		}, nil
	}
	// A parser may opt out of the HTML fetch to call a site API directly (e.g. the
	// X/Twitter parser). This runs before the robots check because we never fetch
	// the page itself — the request goes to the parser's own API endpoint, not to
	// the disallowed page path.
	if dp, ok := e.pick(u).(DirectParser); ok {
		if err := e.throttle(ctx, u.Host); err != nil {
			return nil, err
		}
		res, err := dp.ScrapeDirect(ctx, e.client, e.ua(), u)
		if err != nil {
			return nil, err
		}
		res.SourceURL = u.String()
		res.MediaURLs = resolveAll(u, res.MediaURLs)
		return res, nil
	}

	if rc := e.robotsChecker(); rc != nil {
		allowed, err := rc.allowed(ctx, u)
		if err == nil && !allowed {
			return nil, fmt.Errorf("scrape: blocked by robots.txt for %s", u.Path)
		}
	}
	if err := e.throttle(ctx, u.Host); err != nil {
		return nil, err
	}

	resp, err := e.get(ctx, u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("scrape: %s returned %d", u, resp.StatusCode)
	}

	// The server may hand back media directly (extensionless CDN links that only
	// reveal their type via Content-Type). Treat that as a direct-media result.
	final := resp.Request.URL // follow any redirects the client took
	if kind := mediaKindFromContentType(resp.Header.Get("Content-Type")); kind != "" {
		return &models.ScrapeResult{
			Kind:      string(kind),
			Title:     titleFromURL(final),
			MediaURLs: []string{final.String()},
			SourceURL: final.String(),
		}, nil
	}

	doc, err := goquery.NewDocumentFromReader(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return nil, err
	}
	res, err := e.pick(u).Parse(doc, u)
	if err != nil {
		return nil, err
	}
	res.SourceURL = u.String()
	res.MediaURLs = resolveAll(final, res.MediaURLs)
	res.Screenshots = resolveAll(final, res.Screenshots)
	if res.Cover != "" {
		if abs := resolveAll(final, []string{res.Cover}); len(abs) > 0 {
			res.Cover = abs[0]
		}
	}
	return res, nil
}

// throttle enforces a per-host minimum delay between requests. It honors ctx so
// a cancelled/timed-out request (or a disconnected client) doesn't sit out the
// full wait — important for bulk fetches, where same-host URLs queue up behind
// each other and the tail can otherwise sleep for tens of seconds.
func (e *Engine) throttle(ctx context.Context, host string) error {
	delay := e.pace()
	e.mu.Lock()
	last, ok := e.lastHost[host]
	wait := time.Duration(0)
	if ok {
		if elapsed := time.Since(last); elapsed < delay {
			wait = delay - elapsed
		}
	}
	e.lastHost[host] = time.Now().Add(wait)
	e.mu.Unlock()
	if wait <= 0 {
		return nil
	}
	t := time.NewTimer(wait)
	defer t.Stop()
	select {
	case <-t.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// guardDial is a net.Dialer Control hook: it refuses to connect to any address
// that isn't a routable public IP. It runs on the resolved ip:port, which is why
// it defeats DNS rebinding — the check sees the same address the kernel is about
// to connect to, not the hostname the URL claimed.
//
// Note: when HTTP(S)_PROXY is set, dials go to the proxy's address, so an operator
// running a proxy on a private address must not point this client through it — the
// self-hosted default (no proxy) is unaffected.
func guardDial(network, address string, _ syscall.RawConn) error {
	if network != "tcp" && network != "tcp4" && network != "tcp6" {
		return fmt.Errorf("scrape: blocked network %q", network)
	}
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return fmt.Errorf("scrape: bad dial address %q", address)
	}
	ip := net.ParseIP(host)
	if ip == nil {
		// Control receives an already-resolved address; a non-IP here is unexpected,
		// so fail closed rather than guess.
		return fmt.Errorf("scrape: unresolved dial address %q", host)
	}
	if isBlockedIP(ip) {
		return fmt.Errorf("scrape: refusing to connect to non-public address %s", ip)
	}
	return nil
}

// isBlockedIP reports whether ip is anything other than a routable public address:
// loopback, RFC1918 / ULA private, link-local (incl. the 169.254.169.254 metadata
// endpoint), multicast, and the unspecified address are all refused.
func isBlockedIP(ip net.IP) bool {
	return ip.IsLoopback() ||
		ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsMulticast() ||
		ip.IsUnspecified()
}

// resolveAll turns possibly-relative media URLs into absolute ones.
func resolveAll(base *url.URL, links []string) []string {
	out := make([]string, 0, len(links))
	seen := map[string]bool{}
	for _, l := range links {
		ref, err := url.Parse(l)
		if err != nil {
			continue
		}
		abs := base.ResolveReference(ref).String()
		if !seen[abs] {
			seen[abs] = true
			out = append(out, abs)
		}
	}
	return out
}
