package sources

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"gopkg.in/yaml.v3"
)

// A YAMLSource is a browsable catalogue defined entirely by a YAML file — the same
// trade the scraper's site parsers make, applied to listings instead of detail pages.
//
// Mihon's extensions are the model: a source there is "how do I build the URL for
// latest/popular/search" plus "how do I pull the cards out of the result". Neither
// needs code, so neither needs code here. A new gallery site is a new .yaml file.
//
// Reading a gallery's pages stays delegated to the scraper (see Pages), which already
// knows how to find a comic's page images, so a source and an import can't disagree
// about what a page is.
type YAMLSource struct {
	spec  SourceSpec
	pages PageFetcher
}

// SourceSpec is the on-disk source definition (one .yaml file per site).
type SourceSpec struct {
	ID      string   `yaml:"id"`
	Name    string   `yaml:"name"`
	BaseURL string   `yaml:"base_url"`
	Hosts   []string `yaml:"hosts"`
	// Kind is what an item on this source becomes: comic | image | video | gif.
	Kind string `yaml:"kind"`
	// Access declarations are shown before the catalogue. They do not cause the
	// generic adapter to invent an authentication flow it cannot safely perform.
	Authentication string `yaml:"authentication"`
	AuthNote       string `yaml:"auth_note"`
	ContentWarning string `yaml:"content_warning"`
	// FirstPage is the page number the site's paging starts at (usually 1).
	FirstPage int         `yaml:"first_page"`
	Feeds     []FeedSpec  `yaml:"feeds"`
	Listing   ListingSpec `yaml:"listing"`
	// Pages says how to resolve a multi-page item into its page images. Leave it out
	// and the scraper's generic comic extractor is used instead.
	Pages PagesSpec `yaml:"pages"`
}

// PagesSpec finds a comic's page images on its detail page.
//
// It exists because the generic extractor takes what the page gives it, and what a
// gallery page gives it is *thumbnails* — 3hentai's detail page never names the
// full-size image at all. The full-size URL is derivable from the thumbnail's
// (drop the "t"), which is a per-site rule, which is exactly the sort of thing that
// belongs in the site's spec rather than in Go.
type PagesSpec struct {
	// Selector finds the page images. Empty means "fall back to the scraper".
	Selector string `yaml:"selector"`
	Attr     string `yaml:"attr"`
	// Rewrite turns each matched URL into the one actually worth fetching. A URL the
	// pattern doesn't match is *dropped*, which is what keeps the cover and the site
	// logo out of the page run without having to enumerate them.
	Rewrite RewriteSpec `yaml:"rewrite"`
}

// RewriteSpec is a regexp replacement over a URL.
type RewriteSpec struct {
	Pattern string `yaml:"pattern"`
	Replace string `yaml:"replace"`

	re *regexp.Regexp
}

// FeedSpec is one browsable listing: a board, a category, a sort order, a search.
type FeedSpec struct {
	ID    string `yaml:"id"`
	Label string `yaml:"label"`
	// Path is the feed's URL relative to BaseURL, with {page}, {query} and {sort}
	// substituted in. A site whose paging is a path segment ("/2") rather than a
	// parameter ("?page=2") is expressed here too — the template is the whole point.
	Path string `yaml:"path"`
	// Query marks a feed that needs a search term; the client shows a search box for
	// it and browsing it without one is an error rather than an empty page.
	Query bool `yaml:"query"`
	// Sorts are the orderings this feed offers, substituted as {sort}.
	Sorts []SortSpec `yaml:"sorts"`
}

type SortSpec struct {
	ID    string `yaml:"id"`
	Label string `yaml:"label"`
}

// ListingSpec says how to pull item cards out of a listing page.
type ListingSpec struct {
	// Item selects one card. Every field below is resolved *within* that card, so a
	// listing's header, sidebar and "related" strip can't leak into the results.
	Item    string    `yaml:"item"`
	ID      FieldSpec `yaml:"id"`
	Title   FieldSpec `yaml:"title"`
	Thumb   FieldSpec `yaml:"thumb"`
	Media   FieldSpec `yaml:"media"` // single-file sources only; a comic's payload is its pages
	PageURL string    `yaml:"page_url"`
}

// FieldSpec pulls one value out of a card.
//
//	selector: ".title"        CSS, relative to the card; empty means the card itself
//	attr:     "data-src|src"  "text" | "html" | attribute names, first non-empty wins
//	pattern:  "/d/(\\d+)"     optional regex; capture group 1 replaces the value
type FieldSpec struct {
	Selector string `yaml:"selector"`
	Attr     string `yaml:"attr"`
	Pattern  string `yaml:"pattern"`

	re *regexp.Regexp // compiled from Pattern at load
}

func (s *YAMLSource) ID() string      { return s.spec.ID }
func (s *YAMLSource) Name() string    { return s.spec.Name }
func (s *YAMLSource) Hosts() []string { return s.spec.Hosts }
func (s *YAMLSource) AccessPolicy() AccessPolicy {
	auth := strings.ToLower(strings.TrimSpace(s.spec.Authentication))
	if auth == "" {
		auth = "unknown"
	}
	return AccessPolicy{Authentication: auth, AuthNote: s.spec.AuthNote, ContentWarning: s.spec.ContentWarning}
}

func (s *YAMLSource) Feeds() []Feed {
	out := make([]Feed, 0, len(s.spec.Feeds))
	for _, f := range s.spec.Feeds {
		feed := Feed{ID: f.ID, Label: f.Label, Query: f.Query}
		for _, so := range f.Sorts {
			feed.Sorts = append(feed.Sorts, Sort{ID: so.ID, Label: so.Label})
		}
		out = append(out, feed)
	}
	return out
}

func (s *YAMLSource) feed(id string) (FeedSpec, bool) {
	// An empty feed id means "whatever this source leads with", so a client that
	// hasn't picked yet still gets a listing rather than an error.
	if id == "" && len(s.spec.Feeds) > 0 {
		return s.spec.Feeds[0], true
	}
	for _, f := range s.spec.Feeds {
		if f.ID == id {
			return f, true
		}
	}
	return FeedSpec{}, false
}

func (s *YAMLSource) Browse(ctx context.Context, p BrowseParams) (*Listing, error) {
	f, ok := s.feed(p.Feed)
	if !ok {
		return nil, fmt.Errorf("unknown feed %q", p.Feed)
	}
	query := strings.TrimSpace(p.Query)
	if f.Query && query == "" {
		return nil, fmt.Errorf("feed %q needs a search term", f.ID)
	}

	first := s.spec.FirstPage
	if first == 0 {
		first = 1
	}
	page := first
	if p.Cursor != "" {
		n, err := strconv.Atoi(p.Cursor)
		if err != nil || n < first {
			return nil, fmt.Errorf("bad cursor %q", p.Cursor)
		}
		page = n
	}

	// An unrecognized sort is ignored rather than rejected: sorts are presentation,
	// and a stale client asking for one that's been renamed should still get results.
	sort := ""
	if len(f.Sorts) > 0 {
		sort = f.Sorts[0].ID
		for _, so := range f.Sorts {
			if so.ID == p.Sort {
				sort = so.ID
				break
			}
		}
	}

	target := s.spec.BaseURL + expand(f.Path, map[string]string{
		"page":  strconv.Itoa(page),
		"query": url.QueryEscape(query),
		"sort":  sort,
	})

	body, err := s.pages.Document(ctx, target)
	if err != nil {
		return nil, err
	}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("parse %s listing: %w", s.spec.ID, err)
	}

	l := s.spec.Listing
	out := &Listing{}
	seen := map[string]bool{}
	doc.Find(l.Item).Each(func(_ int, card *goquery.Selection) {
		id := field(card, l.ID)
		if id == "" || seen[id] {
			return
		}
		thumb := field(card, l.Thumb)
		if thumb == "" {
			return
		}
		seen[id] = true

		title := field(card, l.Title)
		if title == "" {
			title = s.spec.Name + " " + id
		}

		item := Item{
			ID:       id,
			Title:    truncate(title, 120),
			Kind:     s.spec.Kind,
			ThumbURL: s.absolute(thumb),
			PageURL:  s.pageURL(id),
		}
		if media := field(card, l.Media); media != "" {
			item.MediaURL = s.absolute(media)
			// The spec's kind is a default; a per-item extension is better evidence.
			if ext := path.Ext(item.MediaURL); ext != "" && s.spec.Kind != string(kindComic) {
				item.Kind = kindForExt(ext)
			}
		}
		out.Items = append(out.Items, item)
	})

	// No items means we've run off the end of the listing; an empty cursor stops the
	// client paging into nothing.
	if len(out.Items) > 0 {
		out.Cursor = strconv.Itoa(page + 1)
	}
	return out, nil
}

// Pages resolves a gallery's page images from its detail page.
//
// A source with no pages spec falls back to the scraper's generic comic extractor, so
// browsing and importing agree about what a page is. A source *with* one is saying the
// generic answer is wrong for this site — see PagesSpec.
func (s *YAMLSource) Pages(ctx context.Context, itemID string) ([]string, error) {
	if s.spec.Kind != string(kindComic) {
		return nil, nil
	}
	if !safeID(itemID) {
		return nil, fmt.Errorf("bad item id %q", itemID)
	}
	pageURL := s.pageURL(itemID)
	if s.spec.Pages.Selector == "" {
		return s.pages.ComicPages(ctx, pageURL)
	}

	body, err := s.pages.Document(ctx, pageURL)
	if err != nil {
		return nil, err
	}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("parse %s gallery: %w", s.spec.ID, err)
	}

	p := s.spec.Pages
	var out []string
	seen := map[string]bool{}
	doc.Find(p.Selector).Each(func(_ int, img *goquery.Selection) {
		raw := field(img, FieldSpec{Attr: p.Attr})
		if raw == "" {
			return
		}
		u := s.absolute(raw)
		if p.Rewrite.re != nil {
			// Not a page image (a cover, a logo) — the pattern is the filter.
			if !p.Rewrite.re.MatchString(u) {
				return
			}
			u = p.Rewrite.re.ReplaceAllString(u, p.Rewrite.Replace)
		}
		if seen[u] {
			return
		}
		seen[u] = true
		out = append(out, u)
	})
	if len(out) == 0 {
		return nil, fmt.Errorf("no pages found on %s", pageURL)
	}
	return out, nil
}

func (s *YAMLSource) pageURL(id string) string {
	return s.absolute(expand(s.spec.Listing.PageURL, map[string]string{"id": id}))
}

// absolute resolves a protocol-relative or root-relative URL against the site.
func (s *YAMLSource) absolute(u string) string {
	switch {
	case strings.HasPrefix(u, "//"):
		return "https:" + u
	case strings.HasPrefix(u, "/"):
		return s.spec.BaseURL + u
	default:
		return u
	}
}

// field pulls one value out of a card per its FieldSpec.
func field(card *goquery.Selection, f FieldSpec) string {
	sel := card
	if f.Selector != "" {
		sel = card.Find(f.Selector).First()
	}
	if sel.Length() == 0 {
		return ""
	}

	var v string
	// "data-src|src": lazy-loading listings keep the real URL in a data-* attribute
	// and a placeholder in src, so the order here is load-bearing.
	for _, attr := range strings.Split(f.Attr, "|") {
		if v = valueOfAttr(sel, strings.TrimSpace(attr)); v != "" {
			break
		}
	}
	if v == "" {
		return ""
	}

	if f.re != nil {
		m := f.re.FindStringSubmatch(v)
		if m == nil || len(m) < 2 {
			return ""
		}
		v = m[1]
	}
	return strings.TrimSpace(v)
}

func valueOfAttr(s *goquery.Selection, attr string) string {
	switch attr {
	case "", "text":
		return strings.TrimSpace(s.Text())
	case "html":
		h, _ := s.Html()
		return strings.TrimSpace(h)
	default:
		v, _ := s.Attr(attr)
		v = strings.TrimSpace(v)
		// An inlined placeholder is not a URL worth returning; fall through to the
		// next attribute in the list.
		if strings.HasPrefix(v, "data:") {
			return ""
		}
		return v
	}
}

// expand substitutes {name} placeholders. Unknown placeholders are left alone so a
// typo in a spec shows up in the fetched URL instead of silently vanishing.
func expand(tmpl string, vars map[string]string) string {
	for k, v := range vars {
		tmpl = strings.ReplaceAll(tmpl, "{"+k+"}", v)
	}
	return tmpl
}

// safeID guards the item id before it is pasted into a URL template. Ids come from
// the client, and a template is a string concatenation: without this, an id of
// "../../admin" or one carrying a scheme would point Pages at a URL of the caller's
// choosing rather than at this source.
func safeID(s string) bool {
	if s == "" || len(s) > 64 {
		return false
	}
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9', r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r == '-', r == '_':
		default:
			return false
		}
	}
	return true
}

// ParseSpec reads one source definition and compiles its patterns.
func ParseSpec(data []byte) (*SourceSpec, error) {
	var spec SourceSpec
	if err := yaml.Unmarshal(data, &spec); err != nil {
		return nil, err
	}
	if spec.ID == "" {
		return nil, fmt.Errorf("source needs an id")
	}
	if spec.Name == "" {
		spec.Name = spec.ID
	}
	if spec.Kind == "" {
		spec.Kind = string(kindComic)
	}
	if spec.BaseURL == "" {
		return nil, fmt.Errorf("source %s needs a base_url", spec.ID)
	}
	spec.BaseURL = strings.TrimSuffix(spec.BaseURL, "/")
	if spec.Listing.Item == "" {
		return nil, fmt.Errorf("source %s needs listing.item", spec.ID)
	}

	for _, f := range []*FieldSpec{
		&spec.Listing.ID, &spec.Listing.Title, &spec.Listing.Thumb, &spec.Listing.Media,
	} {
		if f.Pattern == "" {
			continue
		}
		re, err := regexp.Compile(f.Pattern)
		if err != nil {
			return nil, fmt.Errorf("source %s: bad pattern %q: %w", spec.ID, f.Pattern, err)
		}
		f.re = re
	}

	if pat := spec.Pages.Rewrite.Pattern; pat != "" {
		re, err := regexp.Compile(pat)
		if err != nil {
			return nil, fmt.Errorf("source %s: bad pages.rewrite pattern %q: %w", spec.ID, pat, err)
		}
		spec.Pages.Rewrite.re = re
	}
	return &spec, nil
}

// NewYAMLSource builds a source from an already-parsed spec.
func NewYAMLSource(spec SourceSpec, pages PageFetcher) *YAMLSource {
	return &YAMLSource{spec: spec, pages: pages}
}
