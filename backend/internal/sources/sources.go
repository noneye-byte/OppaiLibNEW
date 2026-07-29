// Package sources exposes remote catalogues — a 4chan board, a doujin site — as
// browsable feeds the client can page through and stream from *without importing*.
//
// This is deliberately not the scraper. The scraper's job is "here is one URL, pull
// it into the library"; a source's job is "here is a place, show me what's on it".
// Nothing here downloads to the blob store: items carry the remote URLs, the client
// streams them through the server's proxy, and only an explicit save crosses over
// into the library (where the scrape/import machinery takes back over).
//
// Most sources are YAML files rather than Go (see yamlsource.go): a gallery site is
// a URL template plus a handful of selectors, which is exactly what a Mihon extension
// is. Only a source that needs real code — 4chan, whose JSON API isn't HTML at all —
// is written as a Go type.
package sources

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// kindComic is the library kind for a multi-page item. It's spelled here rather than
// imported from models to keep this package free of the library's types.
const kindComic = "comic"

// kindThread is a *container*: an item you browse into rather than view. It has no
// library kind — a thread saved to the library lands as a comic (its images, in post
// order) — so it exists only between here and the client's grid.
const kindThread = "thread"

const sourceUserAgent = "Mozilla/5.0 (compatible; OppaiLib/1.0)"

// Feed is one browsable listing inside a source: a board, a category, a search.
type Feed struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	// Query marks a feed that needs a search term. The client shows a search box for
	// it instead of browsing it blindly.
	Query bool `json:"query,omitempty"`
	// Sorts are the orderings this feed offers, if any. The first is the default.
	Sorts []Sort `json:"sorts,omitempty"`
}

type Sort struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// BrowseParams is one request for a page of a feed.
type BrowseParams struct {
	Feed   string
	Cursor string
	// Query is the search term, for feeds that take one.
	Query string
	// Sort picks among the feed's Sorts; empty means the feed's default.
	Sort string
}

// Item is one piece of media that lives on the remote source. Every URL on it is
// remote; none of them is ours.
type Item struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Kind     string `json:"kind"` // video | gif | image | comic
	ThumbURL string `json:"thumbUrl"`
	// MediaURL is the thing itself, for streaming and for saving. Empty on a comic,
	// whose payload is a run of pages rather than one file — see PageURL and Pages.
	MediaURL string `json:"mediaUrl,omitempty"`
	// PageURL is the human page the item came from: what a save is pointed at, and
	// what gets recorded as its source.
	PageURL string `json:"pageUrl,omitempty"`
	// FeedID marks a container — an item that is browsed *into* rather than viewed.
	// A 4chan thread is one: the tile stands for a set, and clicking it should list
	// the set, not open the OP's image. The client browses this feed id; nothing else
	// about it is meaningful to the client.
	FeedID string `json:"feedId,omitempty"`
	// ThreadID names the discussion this item belongs to, for sources that have one.
	// It is what the client asks for comments on — a file posted in a thread carries
	// its thread's id, so the viewer can show the conversation around the image
	// without the client having to know how a thread id is spelled.
	ThreadID string `json:"threadId,omitempty"`
	// PostNo is this item's own post within that thread, so the comment list can
	// mark which post the open file came from.
	PostNo int64 `json:"postNo,omitempty"`
	// Count is how many files a container holds, for the tile's caption.
	Count  int      `json:"count,omitempty"`
	Width  int      `json:"width,omitempty"`
	Height int      `json:"height,omitempty"`
	Tags   []string `json:"tags,omitempty"`
}

// Comment is one post in a source's discussion thread.
//
// This is deliberately flat rather than a tree: 4chan replies quote by post
// number (">>12345") and a post can quote several others, so the conversation is
// a graph, not a hierarchy. Carrying the quoted numbers and letting the client
// render the run in post order is honest about that, and it's how the site itself
// displays a thread.
type Comment struct {
	// No is the post number — unique within its thread, and what >>quotes name.
	No   int64  `json:"no"`
	Time int64  `json:"time"` // unix seconds
	Name string `json:"name,omitempty"`
	Sub  string `json:"subject,omitempty"`
	// Text is the post body as plain text: newlines survive, markup does not.
	Text string `json:"text"`
	// ThumbURL/MediaURL are the post's own upload, if it had one. A comment with an
	// image is extremely common on 4chan and the picture is often the point of it.
	ThumbURL string `json:"thumbUrl,omitempty"`
	MediaURL string `json:"mediaUrl,omitempty"`
	// Kind and ItemID describe that upload as a *viewable item* rather than a URL —
	// same vocabulary as Item.Kind and Item.ID, and set only when there is one.
	//
	// A 4chan thumbnail is always a JPEG, whatever it stands for, so a client looking
	// at ThumbURL alone cannot tell a .webm apart from a .jpg. Without Kind it has to
	// sniff the extension off MediaURL to know a post is a video, and without ItemID
	// it has no way to say "that video, the one already in this feed". Both are things
	// the source knows for free and the client would otherwise have to reconstruct.
	Kind   string `json:"kind,omitempty"`
	ItemID string `json:"itemId,omitempty"`
	// Quotes are the post numbers this post replies to.
	Quotes []int64 `json:"quotes,omitempty"`
	// OP marks the post that opened the thread.
	OP bool `json:"op,omitempty"`
}

// RequestDecorator is an optional Source capability: it adds host-appropriate
// headers to an outbound request made on the source's behalf — the source's own
// API/JSON fetches and the streaming proxy alike.
//
// It exists because 4chan's media CDN sits behind Cloudflare hotlink protection that
// refuses any request without a boards.4chan.org Referer. Rather than teach the
// generic proxy about one site's headers, the source that owns the host supplies
// them here, and the proxy just asks whoever owns the URL to decorate the request.
type RequestDecorator interface {
	Decorate(req *http.Request)
}

// MediaResolver is an optional source capability for catalogue entries whose
// playable URL is minted on demand. The boolean says whether the source recognized
// raw; an unrecognized URL is left untouched by the registry.
type MediaResolver interface {
	ResolveMedia(ctx context.Context, raw string) (resolved string, recognized bool, err error)
}

// Commenter is an optional interface: a source that has discussions implements it.
// Sources without a comment section (a gallery site) simply don't, and the API
// answers "this source has no comments" rather than inventing an empty thread.
type Commenter interface {
	// Comments returns the posts of the thread named by itemID, in post order.
	Comments(ctx context.Context, itemID string) ([]Comment, error)
}

// AccessPolicy is the source's explicit declaration of what opening it entails.
// It is metadata, not an authentication bypass: a source that requires a session
// still has to implement that session in its own adapter.
type AccessPolicy struct {
	// Authentication is one of none, optional, required, or unknown. Unknown is the
	// honest fallback for an older custom adapter that never declared a policy.
	Authentication string `json:"authentication"`
	AuthNote       string `json:"authNote,omitempty"`
	ContentWarning string `json:"contentWarning,omitempty"`
}

// AccessPolicyProvider is optional so older/test Source implementations continue
// to load. Built-ins and current YAML adapters all implement it.
type AccessPolicyProvider interface {
	AccessPolicy() AccessPolicy
}

// PolicyOf returns a normalized, explicit policy for the API.
func PolicyOf(src Source) AccessPolicy {
	policy := AccessPolicy{Authentication: "unknown"}
	if provider, ok := src.(AccessPolicyProvider); ok {
		policy = provider.AccessPolicy()
	}
	switch policy.Authentication {
	case "none", "optional", "required", "unknown":
	default:
		policy.Authentication = "unknown"
	}
	return policy
}

// Listing is one page of a feed. Cursor is opaque to the client; an empty cursor
// means there is nothing after this.
type Listing struct {
	Items  []Item `json:"items"`
	Cursor string `json:"cursor,omitempty"`
}

// Source is a remote catalogue.
type Source interface {
	ID() string
	Name() string
	Feeds() []Feed

	// Hosts are the hostnames this source's media may be fetched from. The proxy
	// checks incoming URLs against the union of these: without it, an endpoint that
	// takes a URL and fetches it is an open proxy pointed at everything behind the
	// firewall.
	Hosts() []string

	// Browse returns one page of a feed.
	Browse(ctx context.Context, p BrowseParams) (*Listing, error)

	// Pages returns the ordered page images of a multi-page item, for reading a
	// comic in place. Sources with no multi-page items return nil.
	Pages(ctx context.Context, itemID string) ([]string, error)
}

// Registry holds the configured sources and answers host questions for the proxy.
type Registry struct {
	mu   sync.RWMutex
	srcs []Source

	// What it was built from, kept so it can be rebuilt. Adding a site from the UI
	// has to take effect without a restart — a "restart the container to see your new
	// source" flow would make the add-a-site feature not worth having.
	pages PageFetcher
	dir   string
	log   Logger
}

// SetRule34Credentials updates the built-in source without rebuilding the registry,
// so Settings changes take effect immediately.
func (r *Registry) SetRule34Credentials(userID, apiKey string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, src := range r.srcs {
		if rule34, ok := src.(*Rule34); ok {
			rule34.SetCredentials(userID, apiKey)
			return
		}
	}
}

// NewRegistry builds the standard set: the Go-coded sources, the source definitions
// built into the binary, and any the user has dropped into dir.
//
// The built-ins are embedded rather than shipped as files to copy, because a source
// that only works after the operator finds and copies a YAML file is a source that,
// for almost everyone, does not work. A user file with the same id wins, so a site
// that restyles can be fixed by dropping in a corrected spec — no rebuild.
func NewRegistry(pages PageFetcher, dir string, log Logger) *Registry {
	r := &Registry{pages: pages, dir: dir, log: log}
	r.Reload()
	return r
}

// Reload rebuilds the source list from the built-in definitions and whatever is in
// the config directory now.
//
// Called after a site is added or removed from the UI. Rebuilding wholesale rather
// than splicing one source in is deliberate: the override rule (a user file wins
// over a built-in of the same id) is a property of the whole build order, and
// re-running it is the only way to be sure a removal restores the built-in it was
// shadowing.
func (r *Registry) Reload() {
	pages, dir, log := r.pages, r.dir, r.log
	srcs := []Source{NewFourChan(pages.Client()), NewRule34(pages.Client()), NewHanime(pages.Client())}

	specs := map[string]SourceSpec{}
	order := []string{}
	add := func(name string, data []byte, from string) {
		spec, err := ParseSpec(data)
		if err != nil {
			log.Warn("bad source definition", "file", name, "from", from, "err", err)
			return
		}
		if _, dup := specs[spec.ID]; !dup {
			order = append(order, spec.ID)
		}
		specs[spec.ID] = *spec
	}

	// Built-in definitions first, user files second, so a user file overrides.
	entries, err := fs.ReadDir(builtinSources, "builtin")
	if err == nil {
		for _, e := range entries {
			data, err := fs.ReadFile(builtinSources, "builtin/"+e.Name())
			if err != nil {
				continue
			}
			add(e.Name(), data, "builtin")
		}
	}
	for _, path := range yamlFiles(dir) {
		data, err := os.ReadFile(path)
		if err != nil {
			log.Warn("reading source definition", "file", path, "err", err)
			continue
		}
		add(filepath.Base(path), data, "config")
	}

	for _, id := range order {
		srcs = append(srcs, NewYAMLSource(specs[id], pages))
	}

	r.mu.Lock()
	// Credentials that were pushed into the old Rule34 instance from Settings would be
	// lost by a naive rebuild, so they are carried across.
	var userID, apiKey string
	for _, s := range r.srcs {
		if old, ok := s.(*Rule34); ok {
			userID, apiKey = old.credentials()
			break
		}
	}
	r.srcs = srcs
	r.mu.Unlock()
	if userID != "" || apiKey != "" {
		r.SetRule34Credentials(userID, apiKey)
	}
}

// Logger is the slice of slog the registry needs, taken as an interface so this
// package doesn't depend on the server's logging setup.
type Logger interface {
	Warn(msg string, args ...any)
}

// yamlFiles lists the *.yaml/*.yml files in dir, sorted. A missing dir is not an
// error — the built-in sources still work.
func yamlFiles(dir string) []string {
	if dir == "" {
		return nil
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var out []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		switch strings.ToLower(filepath.Ext(e.Name())) {
		case ".yaml", ".yml":
			out = append(out, filepath.Join(dir, e.Name()))
		}
	}
	sort.Strings(out)
	return out
}

func (r *Registry) All() []Source {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return append([]Source(nil), r.srcs...)
}

func (r *Registry) Get(id string) (Source, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, s := range r.srcs {
		if s.ID() == id {
			return s, true
		}
	}
	return nil, false
}

// AllowsHost reports whether host belongs to some registered source.
//
// This is the guard on the streaming proxy. The proxy exists to fetch remote media
// on the client's behalf, and a proxy that will fetch *any* URL is an SSRF hole —
// it would happily GET the metadata service or anything else on the server's
// network. Restricting it to the hosts our sources actually serve from keeps the
// feature and closes the hole.
func (r *Registry) AllowsHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return false
	}
	for _, s := range r.All() {
		for _, pat := range s.Hosts() {
			if hostMatches(strings.ToLower(pat), host) {
				return true
			}
		}
	}
	return false
}

// Decorate applies the owning source's request headers to req, if the source that
// serves req's host implements RequestDecorator. The streaming proxy calls this so a
// hotlink-guarded CDN sees the Referer a browser on the source's own page would send;
// for a host whose source needs nothing, it's a no-op.
func (r *Registry) Decorate(req *http.Request) {
	host := strings.ToLower(strings.TrimSpace(req.URL.Hostname()))
	if host == "" {
		return
	}
	for _, s := range r.All() {
		d, ok := s.(RequestDecorator)
		if !ok {
			continue
		}
		for _, pat := range s.Hosts() {
			if hostMatches(strings.ToLower(pat), host) {
				d.Decorate(req)
				return
			}
		}
	}
}

// ResolveMedia lets a source turn a stable catalogue/page URL into the concrete
// media URL required for playback or import.
func (r *Registry) ResolveMedia(ctx context.Context, raw string) (string, error) {
	for _, s := range r.All() {
		resolver, ok := s.(MediaResolver)
		if !ok {
			continue
		}
		resolved, recognized, err := resolver.ResolveMedia(ctx, raw)
		if err != nil {
			return "", err
		}
		if recognized {
			return resolved, nil
		}
	}
	return raw, nil
}

// hostMatches supports a leading "*." wildcard, which must match a *subdomain* —
// "*.example.com" covers "cdn.example.com" and "example.com", but must never be
// tricked by "example.com.evil.net".
func hostMatches(pattern, host string) bool {
	if suffix, ok := strings.CutPrefix(pattern, "*."); ok {
		return host == suffix || strings.HasSuffix(host, "."+suffix)
	}
	return host == pattern
}

// PageFetcher fetches remote HTML and resolves a comic's page images. It's the
// scraper, narrowed to what sources need — passed in rather than imported so the
// sources can be tested against a stub instead of the network.
type PageFetcher interface {
	// Client is the HTTP client to use for a source's own API calls.
	Client() *http.Client
	// ComicPages returns the ordered page images of a comic at pageURL.
	ComicPages(ctx context.Context, pageURL string) ([]string, error)
	// Document fetches pageURL and returns its HTML body.
	Document(ctx context.Context, pageURL string) (string, error)
}

// kindForExt maps a media file extension to a library kind.
func kindForExt(ext string) string {
	switch strings.ToLower(strings.TrimPrefix(ext, ".")) {
	case "webm", "mp4", "m4v", "mov":
		return "video"
	case "gif":
		return "gif"
	default:
		return "image"
	}
}

// httpGet fetches url and returns the whole body: a real User-Agent (4chan's JSON API
// and most gallery sites refuse Go's default) and a deadline that covers the read.
//
// It returns bytes rather than the live *http.Response on purpose. The timeout context
// has to outlive the body — cancelling it closes the body mid-read — so an earlier
// version that did `defer cancel()` and handed back the response killed every fetch as
// soon as it returned, and callers got "context canceled" instead of an index. A small
// body hid it (the transport had already buffered it, so the decode still worked, and
// the unit tests passed against httptest); a real board index did not. Reading the body
// here means the deadline and the body have the same lifetime and can't disagree.
func httpGet(ctx context.Context, hc *http.Client, url, userAgent string, decorate func(*http.Request)) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	// A source may add host-specific headers (a hotlink Referer, say); its own JSON
	// fetches deserve the same treatment as the media the proxy streams for it.
	if decorate != nil {
		decorate(req)
	}
	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%s: %s", url, resp.Status)
	}
	// Bounded so a source that starts streaming gigabytes can't exhaust memory.
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxListingBytes))
	if err != nil {
		return nil, fmt.Errorf("%s: %w", url, err)
	}
	return body, nil
}

// maxListingBytes caps a listing/index response. Board indexes run to a few hundred KB.
const maxListingBytes = 16 << 20
