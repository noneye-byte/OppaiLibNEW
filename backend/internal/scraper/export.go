package scraper

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/obs"
)

// The surface the sources package needs. Browsing a remote catalogue is not
// scraping — but it does need the same disciplined HTTP: the configured
// User-Agent, the per-host throttle, and the robots policy. Rather than let
// sources build its own client and quietly bypass all three, it borrows the
// engine's through these.

// HTTPClient is the engine's bounded HTTP client.
func (e *Engine) HTTPClient() *http.Client { return e.client }

// Metrics is where the engine records outbound fetch counters and latencies.
//
// It is exported so the API layer can record its own numbers into the same
// registry and serve one snapshot: "the app is slow" is nearly always answered by
// reading a request's own duration next to the outbound fetch it was waiting on,
// and two separate registries would put those on two different pages.
func (e *Engine) Metrics() *obs.Registry { return e.metrics }

// MediaHTTPClient shares the guarded transport and redirect policy, but leaves the
// body lifetime to the request context. Large videos routinely take longer than the
// catalogue client's 30-second deadline; imports already carry a 20-minute context,
// while streaming requests end when the viewer disconnects.
func (e *Engine) MediaHTTPClient() *http.Client {
	client := *e.client
	client.Timeout = 0
	return &client
}

// maxDocumentBytes caps a fetched HTML page. A listing is tens of kilobytes; a
// server that streams forever should not be able to exhaust us.
const maxDocumentBytes = 8 << 20

// ItchEmbed resolves an itch.io project page to the URL of its browser build, or ""
// when the project has no browser version.
//
// It goes through Fetch, so it inherits the throttle and robots policy — this is a
// request to someone else's site made because a user pressed Play, and it owes the
// same politeness as any other.
func (e *Engine) ItchEmbed(ctx context.Context, pageURL string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(pageURL))
	if err != nil {
		return "", fmt.Errorf("bad url: %w", err)
	}
	if !(ItchParser{}).Match(u) {
		return "", nil
	}
	body, err := e.Fetch(ctx, pageURL)
	if err != nil {
		return "", err
	}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(body))
	if err != nil {
		return "", err
	}
	return ItchEmbedURL(doc), nil
}

// Fetch returns the HTML body at rawURL, subject to the engine's throttle and
// robots policy.
func (e *Engine) Fetch(ctx context.Context, rawURL string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", fmt.Errorf("bad url: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", fmt.Errorf("unsupported scheme %q", u.Scheme)
	}
	if rc := e.robotsChecker(); rc != nil {
		if allowed, err := rc.allowed(ctx, u); err == nil && !allowed {
			return "", fmt.Errorf("fetch: blocked by robots.txt for %s", u.Path)
		}
	}
	if err := e.throttle(ctx, u.Host); err != nil {
		return "", err
	}

	resp, err := e.get(ctx, u)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("fetch: %s returned %d", u, resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxDocumentBytes))
	if err != nil {
		return "", err
	}
	return string(body), nil
}

// ComicPages returns the ordered page images of the comic at rawURL.
//
// It goes through Scrape rather than reimplementing the walk, so a comic read from
// a remote source and a comic imported from the same URL resolve to exactly the
// same pages — including the preference for the full-res source over the thumbnail.
func (e *Engine) ComicPages(ctx context.Context, rawURL string) ([]string, error) {
	res, err := e.Scrape(ctx, rawURL)
	if err != nil {
		return nil, err
	}
	if len(res.MediaURLs) == 0 {
		return nil, fmt.Errorf("no pages found at %s", rawURL)
	}
	return res.MediaURLs, nil
}
