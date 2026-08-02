package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/scraper"
	"github.com/youruser/oppailib/internal/sources"
)

// scraperFetcher lends the scraper's HTTP discipline (User-Agent, per-host throttle,
// robots policy) to the sources package, so browsing a catalogue doesn't quietly
// become a second, unpoliced HTTP client.
type scraperFetcher struct{ e *scraper.Engine }

func (f scraperFetcher) Client() *http.Client { return f.e.HTTPClient() }

func (f scraperFetcher) Document(ctx context.Context, pageURL string) (string, error) {
	return f.e.Fetch(ctx, pageURL)
}

func (f scraperFetcher) ComicPages(ctx context.Context, pageURL string) ([]string, error) {
	return f.e.ComicPages(ctx, pageURL)
}

// sourceInfo is the catalogue description the client picks from.
type sourceInfo struct {
	ID    string         `json:"id"`
	Name  string         `json:"name"`
	Feeds []sources.Feed `json:"feeds"`
	// Host is the site itself, for the tab's label and link. The client shows a
	// favicon per source and a hostname is what a user recognises a site by.
	Host string `json:"host,omitempty"`
	// UserAdded marks a source that came from a file in the config directory rather
	// than from the binary, so the UI knows which ones it may offer to remove. A
	// built-in can be overridden but not deleted.
	UserAdded      bool   `json:"userAdded,omitempty"`
	Authentication string `json:"authentication"`
	AuthNote       string `json:"authNote,omitempty"`
	ContentWarning string `json:"contentWarning,omitempty"`
}

func (s *Server) handleListSources(w http.ResponseWriter, r *http.Request) {
	all := s.sources.All()
	out := make([]sourceInfo, 0, len(all))
	for _, src := range all {
		policy := sources.PolicyOf(src)
		info := sourceInfo{
			ID:             src.ID(),
			Name:           src.Name(),
			Feeds:          src.Feeds(),
			UserAdded:      s.sources.UserDefined(src.ID()),
			Authentication: policy.Authentication,
			AuthNote:       policy.AuthNote,
			ContentWarning: policy.ContentWarning,
		}
		if base := sourceBaseURL(src); base != nil {
			info.Host = base.Host
		}
		out = append(out, info)
	}
	writeJSON(w, http.StatusOK, map[string]any{"sources": out})
}

func (s *Server) handleBrowseSource(w http.ResponseWriter, r *http.Request) {
	src, ok := s.sources.Get(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "unknown source")
		return
	}
	q := r.URL.Query()
	ctx, cancel := context.WithTimeout(r.Context(), scrapeTimeout)
	defer cancel()

	params := sources.BrowseParams{
		Feed:   q.Get("feed"),
		Cursor: q.Get("cursor"),
		Query:  q.Get("q"),
		Sort:   q.Get("sort"),
	}
	// Every distinct thing the client can ask for has to be part of the key, or one
	// feed's page would be served for another's. Cursor included: page two of a feed
	// is a different listing from page one, and pagination is exactly the case where
	// a user scrolls forward and back over the same pages.
	key := strings.Join([]string{src.ID(), params.Feed, params.Cursor, params.Query, params.Sort}, "\x00")
	listing, err := s.listCache.get(ctx, key, func(ctx context.Context) (*sources.Listing, error) {
		return src.Browse(ctx, params)
	})
	if err != nil {
		s.log.Warn("source browse", "source", src.ID(), "feed", q.Get("feed"), "err", err)
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	// Let the client skip the round trip entirely for the back-button case. Kept
	// well under the server-side TTL so a refresh still reaches us and can pick up a
	// newer listing.
	w.Header().Set("Cache-Control", "private, max-age=30")
	writeJSON(w, http.StatusOK, listing)
}

// sourcePages resolves a multi-page item into its page images, through the cache.
//
// Every caller goes through here — the reader and the save path both — so a comic
// that was just read is saved without re-fetching the gallery page it was read from.
func (s *Server) sourcePages(ctx context.Context, src sources.Source, itemID string) ([]string, error) {
	return s.pageCache.get(ctx, src.ID()+"/"+itemID, func(ctx context.Context) ([]string, error) {
		return src.Pages(ctx, itemID)
	})
}

// handleSourcePages resolves a multi-page item (a comic) into its page images, so
// the reader can page through it without importing anything.
func (s *Server) handleSourcePages(w http.ResponseWriter, r *http.Request) {
	src, ok := s.sources.Get(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "unknown source")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), scrapeTimeout)
	defer cancel()

	pages, err := s.sourcePages(ctx, src, r.PathValue("item"))
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if len(pages) == 0 {
		writeErr(w, http.StatusNotFound, "no pages for that item")
		return
	}
	// The page list of a gallery doesn't change, and the client asks for it every
	// time the comic is opened. Letting the browser keep it means a reopen doesn't
	// even reach us.
	w.Header().Set("Cache-Control", "private, max-age=600")
	writeJSON(w, http.StatusOK, map[string]any{"pages": pages, "count": len(pages)})
}

// handleSourceComments returns the discussion an item belongs to — a 4chan thread's
// posts. Sources that have no discussions (a gallery site) don't implement Commenter,
// and say so rather than returning an empty thread.
func (s *Server) handleSourceComments(w http.ResponseWriter, r *http.Request) {
	src, ok := s.sources.Get(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "unknown source")
		return
	}
	c, ok := src.(sources.Commenter)
	if !ok {
		writeErr(w, http.StatusNotFound, "this source has no comments")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), scrapeTimeout)
	defer cancel()

	item := r.PathValue("item")
	comments, err := s.commentCache.get(ctx, src.ID()+"/"+item, func(ctx context.Context) ([]sources.Comment, error) {
		return c.Comments(ctx, item)
	})
	if err != nil {
		s.log.Warn("source comments", "source", src.ID(), "item", item, "err", err)
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"comments": comments, "count": len(comments)})
}

// handleSourceStream proxies one remote media file, forwarding Range so a video can
// actually be seeked rather than only played from the start.
//
// The URL is checked against the registered sources' hosts first. An endpoint that
// takes a URL and fetches it is an SSRF hole by default — without the check this
// would happily GET the cloud metadata service, or anything else reachable from the
// server but not from the client.
func (s *Server) handleSourceStream(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(r.URL.Query().Get("url"))
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		writeErr(w, http.StatusBadRequest, "bad url")
		return
	}
	if !s.sources.AllowsHost(u.Hostname()) {
		writeErr(w, http.StatusForbidden, "host is not a known source")
		return
	}
	// Some catalogues expose a stable page URL and mint the concrete media URL only
	// when playback starts. Resolve it after validating the caller-supplied host,
	// then validate the resolved host too so this cannot become a redirecting proxy.
	raw, err = s.sources.ResolveMedia(r.Context(), raw)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	u, err = url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || !s.sources.AllowsHost(u.Hostname()) {
		writeErr(w, http.StatusForbidden, "resolved media is not on a known source")
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad url")
		return
	}
	req.Header.Set("User-Agent", s.settings.Get().ScrapeUserAgent)
	// Range is what makes seeking work: without forwarding it the client can only
	// ever stream a video from byte zero.
	if rng := r.Header.Get("Range"); rng != "" {
		req.Header.Set("Range", rng)
	}
	// Let the source that owns this host add its own headers — 4chan's CDN refuses a
	// media request without a boards.4chan.org Referer, and only the source knows that.
	s.sources.Decorate(req)

	resp, err := s.scraper.MediaHTTPClient().Do(req)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "upstream fetch failed")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("upstream returned %d", resp.StatusCode))
		return
	}

	for _, h := range []string{"Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified"} {
		if v := resp.Header.Get(h); v != "" {
			w.Header().Set(h, v)
		}
	}
	// Remote media is immutable at its URL (4chan names files by upload timestamp),
	// so let the client cache it and stop re-fetching a thumbnail per scroll.
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		s.log.Debug("source stream interrupted", "url", u.Redacted(), "err", err)
	}
}

type sourceSaveReq struct {
	// Exactly one of these. MediaURL saves a single file; ItemID saves a multi-page
	// item (a comic), whose pages are resolved server-side.
	MediaURL string   `json:"mediaUrl"`
	ItemID   string   `json:"itemId"`
	PageURL  string   `json:"pageUrl"`
	Title    string   `json:"title"`
	Kind     string   `json:"kind"`
	Tags     []string `json:"tags"`
}

// handleSourceSave copies an item out of a remote source and into the library.
//
// Browsing streams from the origin and stores nothing; this is the one crossing
// point. It reuses the scrape importer rather than a second ingest path, so a saved
// item is indistinguishable from an imported one — same dedupe, same thumbnailing,
// same tagging, same kind recognition.
func (s *Server) handleSourceSave(w http.ResponseWriter, r *http.Request) {
	src, ok := s.sources.Get(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "unknown source")
		return
	}
	var req sourceSaveReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	result := &models.ScrapeResult{
		Title:     req.Title,
		Tags:      req.Tags,
		SourceURL: req.PageURL,
		Kind:      req.Kind,
	}

	// Downloading is minutes of work behind a politeness delay; it must not be
	// abandoned just because the client stopped waiting for the answer.
	r, cancel := detachImport(r)
	defer cancel()

	// A comic's payload is its run of pages, which only the source can resolve.
	if req.Kind == string(models.KindComic) {
		if req.ItemID == "" {
			writeErr(w, http.StatusBadRequest, "saving a comic needs an itemId")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), scrapeTimeout)
		pages, err := s.sourcePages(ctx, src, req.ItemID)
		cancel()
		if err != nil {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		result.MediaURLs = pages
		id, err := s.importComic(r, result)
		if err != nil {
			s.log.Warn("source save comic failed", "source", src.ID(), "item", req.ItemID, "err", err)
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"imported": []int64{id}, "count": 1})
		return
	}

	if req.MediaURL == "" {
		writeErr(w, http.StatusBadRequest, "need a mediaUrl")
		return
	}
	if u, err := url.Parse(req.MediaURL); err != nil || !s.sources.AllowsHost(u.Hostname()) {
		writeErr(w, http.StatusForbidden, "media is not on a known source")
		return
	}
	mediaURL, err := s.sources.ResolveMedia(r.Context(), req.MediaURL)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	if u, err := url.Parse(mediaURL); err != nil || !s.sources.AllowsHost(u.Hostname()) {
		writeErr(w, http.StatusForbidden, "resolved media is not on a known source")
		return
	}

	// Kind is left to recognition: the source's guess came from a file extension, and
	// the bytes we're about to store are better evidence than that.
	id, err := s.importOne(r, mediaURL, result, "")
	if err != nil {
		s.log.Warn("source save failed", "source", src.ID(), "url", req.MediaURL, "err", err)
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"imported": []int64{id}, "count": 1})
}
