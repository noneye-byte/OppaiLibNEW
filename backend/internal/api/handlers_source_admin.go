package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/sources"
)

// Adding a browsable site from the UI.
//
// Three endpoints, in the order the user meets them:
//
//	POST /api/sources/analyze   look at a URL, propose an adapter, and dry-run it
//	POST /api/sources           save a reviewed adapter
//	DELETE /api/sources/{id}    remove one that was added this way
//
// The dry run is the part that makes this reviewable in any useful sense. A proposal
// is a set of CSS selectors, and nobody — including the person who wrote the
// heuristics — can tell from reading selectors whether they pull the right things out
// of a page. So analysis returns the tiles the proposed adapter actually extracted
// from the page it just fetched, and the user approves the result rather than the
// configuration.
//
// Admin-only, all three. Saving a source widens the streaming proxy's host allowlist,
// which is the one thing in the sources package with security weight.

// maxAnalyzeBody caps the page analysis will parse. A listing page is tens of
// kilobytes; the cap is what stops a hostile or broken server from making the
// analyzer the most expensive endpoint on the box.
const maxAnalyzeBody = 4 << 20

// analyzeTimeout bounds the whole analysis: one fetch through the engine (which has
// its own per-host deadline and retries) plus parsing.
const analyzeTimeout = 45 * time.Second

type analyzeReq struct {
	URL string `json:"url"`
}

type analyzeResp struct {
	// YAML is the proposed adapter, commented, exactly as it would be saved.
	YAML string `json:"yaml"`
	// Notes are the gaps and assumptions the reviewer needs to know about.
	Notes []sources.Note `json:"notes"`
	// Preview is what the proposal actually extracted from the page that was fetched.
	// This, not the YAML, is what tells the user whether the adapter works.
	Preview []sources.Item `json:"preview"`
	// PreviewError is set when the proposal parses but extracts nothing usable.
	PreviewError string `json:"previewError,omitempty"`
	// Existing names a source already registered under the proposed id, so the UI can
	// say "this will replace X" rather than silently overwriting it.
	Existing string `json:"existing,omitempty"`
}

func (s *Server) handleAnalyzeSource(w http.ResponseWriter, r *http.Request) {
	var req analyzeReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "expected {\"url\": \"…\"}")
		return
	}
	raw := strings.TrimSpace(req.URL)
	if raw == "" {
		writeErr(w, http.StatusBadRequest, "give the URL of a listing page — the page that shows the grid, not one item from it")
		return
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		writeErr(w, http.StatusBadRequest, "that doesn't look like a URL")
		return
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		writeErr(w, http.StatusBadRequest, "only http and https pages can be analysed")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), analyzeTimeout)
	defer cancel()

	// Through the engine, so this inherits the SSRF dial guard, the politeness
	// throttle, robots handling and the retry policy. A second HTTP client here would
	// be a second, unpoliced way out of the box.
	body, err := s.scraper.Fetch(ctx, raw)
	if err != nil {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("couldn't fetch that page: %v", err))
		return
	}
	doc, err := goquery.NewDocumentFromReader(io.LimitReader(strings.NewReader(body), maxAnalyzeBody))
	if err != nil {
		writeErr(w, http.StatusBadGateway, "that page couldn't be parsed as HTML")
		return
	}

	proposal, err := sources.Analyze(doc, u)
	if err != nil {
		writeErr(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	resp := analyzeResp{YAML: proposal.YAML, Notes: proposal.Notes, Preview: []sources.Item{}}
	if existing, ok := s.sources.Get(proposal.Spec.ID); ok {
		resp.Existing = existing.Name()
	}

	// Dry run: build the proposed source and browse its default feed. This costs one
	// more fetch of a page we were just given, which is worth it — the alternative is
	// asking the user to approve selectors they cannot evaluate.
	if items, err := s.dryRunSpec(ctx, proposal.Spec); err != nil {
		resp.PreviewError = err.Error()
	} else {
		resp.Preview = items
	}
	writeJSON(w, http.StatusOK, resp)
}

// dryRunSpec builds a throwaway source from spec and returns the first page of its
// default feed.
func (s *Server) dryRunSpec(ctx context.Context, spec sources.SourceSpec) ([]sources.Item, error) {
	src := sources.NewYAMLSource(spec, scraperFetcher{e: s.scraper})
	feeds := src.Feeds()
	if len(feeds) == 0 {
		return nil, fmt.Errorf("the proposal has no feeds to try")
	}
	// Never the search feed: browsing it without a term is an error by design.
	feed := feeds[0]
	for _, f := range feeds {
		if !f.Query {
			feed = f
			break
		}
	}
	if feed.Query {
		return nil, fmt.Errorf("the only proposed feed needs a search term, so it can't be previewed")
	}
	listing, err := src.Browse(ctx, sources.BrowseParams{Feed: feed.ID})
	if err != nil {
		return nil, err
	}
	if len(listing.Items) == 0 {
		return nil, fmt.Errorf("the proposed selectors matched nothing on that page")
	}
	// A dozen tiles is plenty to judge by, and keeps the response small.
	if len(listing.Items) > 12 {
		listing.Items = listing.Items[:12]
	}
	return listing.Items, nil
}

type saveSourceReq struct {
	YAML string `json:"yaml"`
}

// handleSaveSource validates and installs a reviewed adapter.
func (s *Server) handleSaveSource(w http.ResponseWriter, r *http.Request) {
	var req saveSourceReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 128<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "expected {\"yaml\": \"…\"}")
		return
	}
	spec, err := s.sources.SaveSpec([]byte(req.YAML))
	if err != nil {
		// A validation failure is the user's YAML, not a server fault, and the message
		// is written to be actionable — so it goes back verbatim.
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	s.log.Info("source definition saved", "id", spec.ID, "name", spec.Name, "hosts", strings.Join(spec.Hosts, ","))
	writeJSON(w, http.StatusOK, map[string]any{
		"id":   spec.ID,
		"name": spec.Name,
	})
}

// handleDeleteSource removes a user-added adapter.
func (s *Server) handleDeleteSource(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := s.sources.DeleteSpec(id); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	s.log.Info("source definition removed", "id", id)
	w.WriteHeader(http.StatusNoContent)
}

// ── favicons ───────────────────────────────────────────────────────────

// faviconTTL is how long a fetched icon is served from memory. A site's favicon is
// as close to immutable as anything on the web, and the Browse tab asks for every
// source's icon on every mount.
const faviconTTL = 24 * time.Hour

// maxFaviconBytes caps an icon. Real ones are a few kilobytes; this leaves room for
// an oversized PNG without letting the endpoint be used to buffer something large.
const maxFaviconBytes = 256 << 10

type favicon struct {
	body        []byte
	contentType string
}

// handleSourceIcon serves a source's favicon through the server.
//
// The client cannot fetch these itself: the page's CSP forbids third-party image
// origins, and several of these hosts refuse a request without a same-site Referer.
// Proxying also means the browser makes no direct connection to a porn CDN just to
// draw a tab icon, which is the more important reason.
//
// Only registered sources' own hosts are reachable here — the id is looked up and the
// URL is derived from its base, so this endpoint takes no URL from the caller and
// cannot be pointed at anything.
func (s *Server) handleSourceIcon(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	src, ok := s.sources.Get(id)
	if !ok {
		writeErr(w, http.StatusNotFound, "unknown source")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	icon, err := s.iconCache.get(ctx, id, func(ctx context.Context) (favicon, error) {
		return s.fetchFavicon(ctx, src)
	})
	if err != nil {
		// A missing icon is not an error worth shouting about — the client falls back
		// to a monogram. 404 keeps that path simple and cacheable.
		writeErr(w, http.StatusNotFound, "no icon")
		return
	}
	w.Header().Set("Content-Type", icon.contentType)
	w.Header().Set("Cache-Control", "private, max-age=86400")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(icon.body)
}

// fetchFavicon tries the site's declared icon, then the conventional path.
func (s *Server) fetchFavicon(ctx context.Context, src sources.Source) (favicon, error) {
	base := sourceBaseURL(src)
	if base == nil {
		return favicon{}, fmt.Errorf("source %s has no browsable base URL", src.ID())
	}

	candidates := []string{}
	// What the page itself declares, if we can read it. Best answer when it works,
	// and a page fetch is already cheap here thanks to the engine's cache-free but
	// throttled path.
	if body, err := s.scraper.Fetch(ctx, base.String()); err == nil {
		if doc, err := goquery.NewDocumentFromReader(strings.NewReader(body)); err == nil {
			doc.Find(`link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']`).Each(func(_ int, l *goquery.Selection) {
				if href, ok := l.Attr("href"); ok {
					if ref, err := url.Parse(strings.TrimSpace(href)); err == nil {
						candidates = append(candidates, base.ResolveReference(ref).String())
					}
				}
			})
		}
	}
	candidates = append(candidates, base.Scheme+"://"+base.Host+"/favicon.ico")

	client := s.scraper.HTTPClient()
	for _, raw := range candidates {
		u, err := url.Parse(raw)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
			continue
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", s.settings.Get().ScrapeUserAgent)
		req.Header.Set("Accept", "image/*")
		// The source may own this host and know what headers it needs.
		s.sources.Decorate(req)
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		body, readErr := io.ReadAll(io.LimitReader(resp.Body, maxFaviconBytes))
		resp.Body.Close()
		if readErr != nil || resp.StatusCode != http.StatusOK || len(body) == 0 {
			continue
		}
		ct := resp.Header.Get("Content-Type")
		// Serve only what is unambiguously an image. An HTML error page returned with
		// 200 is the common failure here, and passing it through as an icon would put
		// remote markup behind an <img> src on our own origin.
		if !strings.HasPrefix(ct, "image/") {
			if sniffed := http.DetectContentType(body); strings.HasPrefix(sniffed, "image/") {
				ct = sniffed
			} else {
				continue
			}
		}
		return favicon{body: body, contentType: ct}, nil
	}
	return favicon{}, fmt.Errorf("no icon found for %s", src.ID())
}

// sourceBaseURL derives a source's home page from the first host it declares.
//
// A YAML source has a base_url, but Source deliberately doesn't expose one — the
// interface is about browsing, not about the site's homepage. The host list is what
// every source has, and its first entry is the site itself by convention (the CDN
// wildcards come after).
func sourceBaseURL(src sources.Source) *url.URL {
	for _, h := range src.Hosts() {
		h = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(h)), "*.")
		if h == "" || strings.Contains(h, "*") {
			continue
		}
		return &url.URL{Scheme: "https", Host: h, Path: "/"}
	}
	return nil
}
