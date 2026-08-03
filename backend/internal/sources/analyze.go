package sources

import (
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"gopkg.in/yaml.v3"
)

// Site analysis: look at one listing page and propose a SourceSpec for it.
//
// The brief asks for "a site-analysis workflow that can inspect a new website and
// propose an adapter configuration", with generated adapters reviewable and
// sandboxed. The sandbox is the format, not a jail: what this produces is a
// SourceSpec — CSS selectors, a URL template and one regexp — which YAMLSource
// already interprets and which cannot express anything but "find these elements and
// read these attributes". No generated code is compiled, evaluated or executed, so
// there is nothing to sandbox at run time. That is a deliberate limit on what
// analysis is allowed to be clever about, and it is the reason this is safe to run
// against an arbitrary URL the user pasted.
//
// The heuristics are also deliberately narrow. A proposal is a *starting point a
// human reviews*, and the API hands it back together with the items it actually
// extracted from the page it looked at, so "does this work" is answered by looking
// at real tiles rather than by reading selectors. Confident-looking guesses that
// silently extract the wrong thing would be worse than obvious gaps.
//
// The one insight the heuristics rest on: on a gallery site, the *link path shape*
// is the stable structure. Class names get restyled between deploys; "/d/<number>"
// or "/post/show/<number>" is load-bearing for the site's own navigation and does
// not move. So cards are found by grouping every link on the page by the shape of
// its path and taking the largest group that looks like content — which is exactly
// the rule the hand-written 3hentai spec uses, arrived at the hard way.

// Note is one thing the reviewer should know about a proposal: a gap the analysis
// could not fill, or an assumption it made.
type Note struct {
	// Field names the spec field the note is about, "" for a general remark.
	Field string `json:"field,omitempty"`
	Text  string `json:"text"`
	// Blocking marks a note that means the proposal is not usable as-is.
	Blocking bool `json:"blocking,omitempty"`
}

// Proposal is the result of analysing a page.
type Proposal struct {
	Spec  SourceSpec `json:"-"`
	YAML  string     `json:"yaml"`
	Notes []Note     `json:"notes"`
}

// digitRun matches a run of digits in a path segment — the id, on nearly every
// gallery and booru site.
var digitRun = regexp.MustCompile(`\d+`)

// videoExt / imageExt classify a media URL by its extension.
var (
	videoExt = map[string]bool{".mp4": true, ".webm": true, ".m4v": true, ".mov": true, ".mkv": true}
	imageExt = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".avif": true, ".gif": true}
)

// Analyze inspects one listing page and proposes an adapter for the site.
//
// pageURL must be the URL doc was actually fetched from (after redirects), because
// every relative URL and the paging template are derived from it.
func Analyze(doc *goquery.Document, pageURL *url.URL) (*Proposal, error) {
	if doc == nil || pageURL == nil {
		return nil, fmt.Errorf("analyze: need a document and its URL")
	}
	host := strings.ToLower(pageURL.Hostname())
	if host == "" {
		return nil, fmt.Errorf("analyze: %s has no host", pageURL)
	}

	var notes []Note
	note := func(field, text string) { notes = append(notes, Note{Field: field, Text: text}) }
	blocking := func(field, text string) { notes = append(notes, Note{Field: field, Text: text, Blocking: true}) }

	cards := findCards(doc, pageURL)
	if cards == nil {
		return nil, fmt.Errorf("analyze: found no repeating linked items on %s — is this a listing page, or does it need JavaScript to render?", pageURL)
	}

	spec := SourceSpec{
		ID:        proposeID(host),
		Name:      proposeName(doc, host),
		BaseURL:   pageURL.Scheme + "://" + pageURL.Host,
		FirstPage: 1,
		// A URL the server just fetched successfully is immediately usable as a public
		// source. Generic adapters do not collect site credentials; sites that really
		// need a session belong in a purpose-built adapter that owns that flow.
		Authentication: "none",
	}

	// Hosts. The page's own host, plus wherever the thumbnails come from — a CDN on
	// a different domain is the norm, and omitting it makes every tile in the grid
	// come back 403 from the streaming proxy, with nothing to say why.
	hosts := map[string]bool{host: true}
	for _, h := range cards.thumbHosts {
		hosts[h] = true
	}
	spec.Hosts = sortedKeys(hosts)
	if len(cards.thumbHosts) == 0 {
		note("hosts", "No thumbnail host could be determined; if tiles fail to load, add the CDN domain here.")
	}

	// Listing selectors.
	spec.Listing.Item = cards.itemSelector
	spec.Listing.ID = FieldSpec{Attr: "href", Pattern: cards.idPattern}
	spec.Listing.PageURL = cards.pageURLTemplate
	if cards.thumbSelector != "" {
		spec.Listing.Thumb = FieldSpec{Selector: cards.thumbSelector, Attr: cards.thumbAttr}
	} else {
		blocking("listing.thumb", "No thumbnail image was found inside the item links. Tiles would render blank — fill in a selector, or this site may build its grid with JavaScript.")
	}
	if cards.titleSelector != "" {
		spec.Listing.Title = FieldSpec{Selector: cards.titleSelector, Attr: cards.titleAttr}
	} else {
		note("listing.title", "No title element was found inside the cards; tiles will fall back to the item id.")
	}

	// Kind.
	spec.Kind = cards.kind
	switch cards.kind {
	case kindComic:
		note("kind", "Treated as a multi-page gallery. If items are single images or videos, change kind to image or video — a comic's payload is its page run, not one file.")
	case "video":
		note("kind", "Treated as video. Playable URLs on video sites are often minted by a script rather than present in the listing, so check that items actually play.")
	}

	// Feeds and paging.
	feed, pagingNote := proposeFeed(doc, pageURL)
	spec.Feeds = []FeedSpec{feed}
	if pagingNote != "" {
		note("feeds", pagingNote)
	}
	if search := proposeSearchFeed(doc, pageURL); search != nil {
		spec.Feeds = append(spec.Feeds, *search)
	} else {
		note("feeds", "No search form was found, so no search feed was proposed. If the site searches at a URL like /search?q=…, add a feed with query: true.")
	}

	// A comic source with no pages spec falls back to the scraper's generic comic
	// extractor, which takes what the detail page gives it — and what a gallery
	// detail page gives it is usually thumbnails. Worth saying out loud, because the
	// symptom (blurry pages, small files) does not look like a configuration gap.
	if spec.Kind == kindComic {
		note("pages", "Page images will be resolved by the generic comic extractor. If reading a gallery shows blurry pages, the site only lists thumbnails on its detail page — add a pages selector with a rewrite to the full-size URL.")
	}

	out, err := yaml.Marshal(annotatedSpec(spec))
	if err != nil {
		return nil, err
	}
	// Parse the generated form once so its regular expressions are compiled for the
	// in-memory preview too. Previously the dry run accidentally used raw patterns
	// and therefore treated a whole href as the item id.
	compiled, err := ParseSpec(out)
	if err != nil {
		return nil, err
	}
	return &Proposal{Spec: *compiled, YAML: string(out), Notes: notes}, nil
}

// cardShape is what findCards concluded about a page's repeating items.
type cardShape struct {
	itemSelector    string
	idPattern       string
	pageURLTemplate string
	thumbSelector   string
	thumbAttr       string
	titleSelector   string
	titleAttr       string
	kind            string
	thumbHosts      []string
	count           int
}

// findCards groups the page's links by path shape and picks the largest group that
// looks like a grid of content.
func findCards(doc *goquery.Document, pageURL *url.URL) *cardShape {
	type group struct {
		shape string // "/d/#" — the path with digit runs replaced
		// cards holds the image-bearing links only: those are the ones the selectors
		// are derived from, and a link without a thumbnail is not a tile.
		cards []*goquery.Selection
		hosts map[string]bool
	}
	groups := map[string]*group{}

	doc.Find("a[href]").Each(func(_ int, a *goquery.Selection) {
		href, _ := a.Attr("href")
		ref, err := url.Parse(strings.TrimSpace(href))
		if err != nil {
			return
		}
		abs := pageURL.ResolveReference(ref)
		// Off-site links are navigation or ads, never this site's own grid.
		if !strings.EqualFold(abs.Hostname(), pageURL.Hostname()) {
			return
		}
		path := strings.TrimSuffix(abs.Path, "/")
		if path == "" || !digitRun.MatchString(path) {
			// An item link on these sites is identified by a number. A link without one
			// is a category, a page of the footer, or the logo.
			return
		}
		shape := digitRun.ReplaceAllString(path, "#")
		img := a.Find("img").First()
		if img.Length() == 0 {
			return
		}
		g := groups[shape]
		if g == nil {
			g = &group{shape: shape, hosts: map[string]bool{}}
			groups[shape] = g
		}
		g.cards = append(g.cards, a)
		{
			if src := firstPresentAttr(img, "data-src", "data-original", "data-lazy-src", "src"); src != "" {
				if u, err := url.Parse(src); err == nil {
					if h := pageURL.ResolveReference(u).Hostname(); h != "" {
						g.hosts[strings.ToLower(h)] = true
					}
				}
			}
		}
	})

	// The winner is the shape with the most *image-bearing* links. Counting bare
	// links instead would pick a site's tag cloud or its pagination strip, both of
	// which are numerous and neither of which is content.
	var best *group
	for _, g := range groups {
		if len(g.cards) < 2 {
			continue // two is the minimum that can be called "repeating"
		}
		if best == nil || len(g.cards) > len(best.cards) {
			best = g
		}
	}
	if best == nil {
		return nil
	}

	// The shape becomes both the item selector and the id pattern. Selecting on the
	// path fragment rather than a class is the durable choice, and it is what makes
	// the proposal survive the site's next restyle.
	stem := shapeStem(best.shape)
	shape := &cardShape{
		itemSelector: fmt.Sprintf("a[href*='%s']", stem),
		idPattern:    regexp.QuoteMeta(stem) + `(\d+)`,
		count:        len(best.cards),
		thumbHosts:   sortedKeys(best.hosts),
	}
	shape.pageURLTemplate = stem + "{id}"

	// Thumbnail attribute: lazy-loading is near universal on these sites, and src
	// then holds a 1×1 placeholder. Listing the real attributes first, with src as
	// the fallback, is what the hand-written specs do.
	first := best.cards[0]
	if img := first.Find("img").First(); img.Length() > 0 {
		shape.thumbSelector = "img"
		shape.thumbAttr = presentAttrs(img, "data-src", "data-original", "data-lazy-src", "src")
	}

	shape.titleSelector, shape.titleAttr = findTitle(first)
	shape.kind = guessKind(doc, best.cards, pageURL)
	return shape
}

// shapeStem turns "/d/#" into "/d/" — the literal prefix an item link shares.
// A shape whose digits are not in the last segment ("/post/#/view") has no usable
// stem, so the whole path up to the first digit run is used.
func shapeStem(shape string) string {
	i := strings.Index(shape, "#")
	if i < 0 {
		return shape
	}
	return shape[:i]
}

// findTitle looks for the card's caption: a text-bearing child, else the image's
// alt/title. Returns empty when there is nothing honest to point at.
func findTitle(card *goquery.Selection) (selector, attr string) {
	// Common caption containers, most specific first. Class names are unreliable in
	// general, but as a *guess with a fallback* they cost nothing.
	for _, sel := range []string{".title", ".caption", "h2", "h3", "h4", ".name"} {
		if node := card.Find(sel).First(); node.Length() > 0 && strings.TrimSpace(node.Text()) != "" {
			return sel, "text"
		}
	}
	if img := card.Find("img").First(); img.Length() > 0 {
		if v := firstPresentAttr(img, "alt", "title"); v != "" {
			return "img", presentAttrs(img, "alt", "title")
		}
	}
	if v := strings.TrimSpace(card.Text()); v != "" {
		// The link's own text. Crude, but on a listing it is usually the title.
		return "", "text"
	}
	return "", ""
}

// guessKind decides what an item on this site is.
//
// Order matters: a site with <video> tags in its listing is a video site even if the
// thumbnails are JPEGs, and a link shape that ends in a media extension is a direct
// file rather than a gallery. Everything else defaults to a comic, because a
// multi-page gallery is what a numeric-id listing usually is and because the wrong
// guess here is visible immediately on the first click.
func guessKind(doc *goquery.Document, cards []*goquery.Selection, pageURL *url.URL) string {
	if doc.Find("video, source[type^='video']").Length() > 0 {
		return "video"
	}
	var video, image int
	for _, a := range cards {
		href, _ := a.Attr("href")
		ref, err := url.Parse(href)
		if err != nil {
			continue
		}
		ext := strings.ToLower(pathExt(pageURL.ResolveReference(ref).Path))
		switch {
		case videoExt[ext]:
			video++
		case imageExt[ext]:
			image++
		}
	}
	if video > 0 && video >= image {
		return "video"
	}
	if image > 0 {
		return "image"
	}
	return kindComic
}

// proposeFeed builds the default listing feed, templating the page number into the
// URL the analysis was run against.
func proposeFeed(doc *goquery.Document, pageURL *url.URL) (FeedSpec, string) {
	feed := FeedSpec{ID: "recent", Label: "Recent"}

	// Does the site page by query parameter? Look for a pagination link that differs
	// from this URL only in a page-ish parameter.
	if param, ok := findPagingParam(doc, pageURL); ok {
		q := pageURL.Query()
		q.Set(param, "{page}")
		u := *pageURL
		u.RawQuery = decodeTemplate(q.Encode())
		feed.Path = pathAndQuery(&u)
		return feed, ""
	}

	// Or by path segment? "/2" and "/page/2" are both common, and getting this wrong
	// does not error — the site just serves page one again, so infinite scroll
	// re-appends the same items forever. That failure is silent, which is why it is
	// called out in the note rather than left to be discovered.
	if tmpl, ok := findPagingPath(doc, pageURL); ok {
		feed.Path = tmpl
		return feed, "Paging looks like a path segment. Verify page two actually differs from page one — when this template is wrong the site quietly re-serves page one and the grid repeats itself forever."
	}

	feed.Path = pathAndQuery(pageURL)
	return feed, "No pagination was detected, so this feed fetches one page only. Find the site's page-two URL and put {page} where the number goes."
}

// findPagingParam looks for a query parameter that a link on the page uses to move
// between pages.
func findPagingParam(doc *goquery.Document, pageURL *url.URL) (string, bool) {
	candidates := []string{"page", "p", "pid", "pg", "offset"}
	found := map[string]bool{}
	doc.Find("a[href]").Each(func(_ int, a *goquery.Selection) {
		href, _ := a.Attr("href")
		ref, err := url.Parse(strings.TrimSpace(href))
		if err != nil {
			return
		}
		abs := pageURL.ResolveReference(ref)
		if !strings.EqualFold(abs.Hostname(), pageURL.Hostname()) {
			return
		}
		for _, c := range candidates {
			if v := abs.Query().Get(c); v != "" && digitRun.MatchString(v) {
				found[c] = true
			}
		}
	})
	for _, c := range candidates {
		if found[c] {
			return c, true
		}
	}
	return "", false
}

// findPagingPath looks for "/page/2"-style paging, or a bare "/2" on the index.
func findPagingPath(doc *goquery.Document, pageURL *url.URL) (string, bool) {
	base := strings.TrimSuffix(pageURL.Path, "/")
	var best string
	doc.Find("a[href]").EachWithBreak(func(_ int, a *goquery.Selection) bool {
		href, _ := a.Attr("href")
		ref, err := url.Parse(strings.TrimSpace(href))
		if err != nil {
			return true
		}
		abs := pageURL.ResolveReference(ref)
		if !strings.EqualFold(abs.Hostname(), pageURL.Hostname()) || abs.RawQuery != "" {
			return true
		}
		p := strings.TrimSuffix(abs.Path, "/")
		if p == base || !strings.HasPrefix(p, base) {
			return true
		}
		rest := strings.TrimPrefix(p, base)
		// "/page/2" or "/2", and nothing else after the number.
		if m := regexp.MustCompile(`^(/page)?/(\d+)$`).FindStringSubmatch(rest); m != nil {
			best = base + m[1] + "/{page}"
			return false
		}
		return true
	})
	return best, best != ""
}

// proposeSearchFeed derives a search feed from a search form on the page.
func proposeSearchFeed(doc *goquery.Document, pageURL *url.URL) *FeedSpec {
	var out *FeedSpec
	doc.Find("form").EachWithBreak(func(_ int, form *goquery.Selection) bool {
		input := form.Find("input[type='search'], input[name='q'], input[name='query'], input[name='s'], input[name='tags']").First()
		if input.Length() == 0 {
			return true
		}
		name, _ := input.Attr("name")
		if name == "" {
			return true
		}
		action, _ := form.Attr("action")
		ref, err := url.Parse(strings.TrimSpace(action))
		if err != nil {
			return true
		}
		abs := pageURL.ResolveReference(ref)
		q := abs.Query()
		q.Set(name, "{query}")
		// Hidden fields carry the parameters the site needs alongside the term — a
		// booru's page=post&s=list is the canonical example, and dropping them makes
		// the search URL land on the wrong handler entirely.
		form.Find("input[type='hidden'][name]").Each(func(_ int, h *goquery.Selection) {
			n, _ := h.Attr("name")
			v, _ := h.Attr("value")
			if n != "" && n != name {
				q.Set(n, v)
			}
		})
		u := *abs
		u.RawQuery = decodeTemplate(q.Encode())
		out = &FeedSpec{ID: "search", Label: "Search", Path: pathAndQuery(&u), Query: true}
		return false
	})
	return out
}

// proposeID turns a hostname into a short stable source id.
func proposeID(host string) string {
	host = strings.TrimPrefix(strings.ToLower(host), "www.")
	if i := strings.IndexByte(host, '.'); i > 0 {
		host = host[:i]
	}
	return sanitizeID(host)
}

// sanitizeID keeps an id to characters that are safe in a filename and in a URL
// path segment. The saved spec's filename is derived from the id, so this is a
// security boundary and not just tidiness — see ValidateSpecForSave.
func sanitizeID(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-', r == '_':
			b.WriteRune(r)
		}
	}
	return b.String()
}

// proposeName prefers og:site_name, then <title>'s first clause, then the host.
func proposeName(doc *goquery.Document, host string) string {
	if v, ok := doc.Find(`meta[property='og:site_name']`).Attr("content"); ok {
		if v = strings.TrimSpace(v); v != "" {
			return trimLen(v, 40)
		}
	}
	if t := strings.TrimSpace(doc.Find("title").First().Text()); t != "" {
		// A title is usually "Thing – Site" or "Site | Tagline"; the first clause is
		// the better guess for a site name.
		for _, sep := range []string{" | ", " – ", " - ", " — ", " :: "} {
			if i := strings.Index(t, sep); i > 0 {
				t = t[:i]
				break
			}
		}
		if t = strings.TrimSpace(t); t != "" {
			return trimLen(t, 40)
		}
	}
	return strings.TrimPrefix(host, "www.")
}

// ── helpers ────────────────────────────────────────────────────────────

func firstPresentAttr(s *goquery.Selection, names ...string) string {
	for _, n := range names {
		if v, ok := s.Attr(n); ok {
			if v = strings.TrimSpace(v); v != "" {
				return v
			}
		}
	}
	return ""
}

// presentAttrs joins the attribute names that are actually present, in the given
// preference order, into the "a|b|c" form FieldSpec.Attr understands.
func presentAttrs(s *goquery.Selection, names ...string) string {
	var out []string
	for _, n := range names {
		if v, ok := s.Attr(n); ok && strings.TrimSpace(v) != "" {
			out = append(out, n)
		}
	}
	if len(out) == 0 {
		return names[len(names)-1]
	}
	return strings.Join(out, "|")
}

func pathExt(p string) string {
	if i := strings.LastIndexByte(p, '.'); i >= 0 && !strings.ContainsAny(p[i:], "/") {
		return p[i:]
	}
	return ""
}

func pathAndQuery(u *url.URL) string {
	p := u.EscapedPath()
	if p == "" {
		p = "/"
	}
	if u.RawQuery != "" {
		return p + "?" + u.RawQuery
	}
	return p
}

// decodeTemplate undoes the percent-encoding url.Values.Encode applies to our
// placeholders, so "{page}" survives as a template rather than "%7Bpage%7D".
func decodeTemplate(q string) string {
	q = strings.ReplaceAll(q, "%7B", "{")
	q = strings.ReplaceAll(q, "%7D", "}")
	return q
}

func sortedKeys(m map[string]bool) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func trimLen(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return strings.TrimSpace(s[:n])
}
