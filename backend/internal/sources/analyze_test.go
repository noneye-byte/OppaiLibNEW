package sources

import (
	"net/url"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func parse(t *testing.T, html string) *goquery.Document {
	t.Helper()
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parse html: %v", err)
	}
	return doc
}

func mustParseURL(t *testing.T, raw string) *url.URL {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("parse url %q: %v", raw, err)
	}
	return u
}

// A gallery listing shaped like the real ones: numeric-id detail links, lazy-loaded
// covers on a separate CDN, a caption element, query-parameter paging and a search
// form. Deliberately includes the noise that trips naive extraction — a nav bar, a
// tag cloud with more links than there are galleries, and a footer.
const galleryHTML = `
<html>
<head>
  <title>Nice Galleries | Read online</title>
  <meta property="og:site_name" content="Nice Galleries">
</head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/tags/big-4">Tag four</a>
    <a href="/tags/big-5">Tag five</a>
    <a href="/tags/big-6">Tag six</a>
    <a href="/tags/big-7">Tag seven</a>
    <a href="/tags/big-8">Tag eight</a>
  </nav>
  <form action="/search" method="get">
    <input type="hidden" name="mode" value="list">
    <input type="search" name="q" placeholder="Search">
  </form>
  <div class="grid">
    <a href="https://nicegalleries.test/g/1001">
      <img data-src="https://cdn.nicegalleries.test/1001/cover.jpg" src="/placeholder.gif" alt="First book">
      <div class="title">First book</div>
    </a>
    <a href="https://nicegalleries.test/g/1002">
      <img data-src="https://cdn.nicegalleries.test/1002/cover.jpg" src="/placeholder.gif" alt="Second book">
      <div class="title">Second book</div>
    </a>
    <a href="https://nicegalleries.test/g/1003">
      <img data-src="https://cdn.nicegalleries.test/1003/cover.jpg" src="/placeholder.gif" alt="Third book">
      <div class="title">Third book</div>
    </a>
  </div>
  <div class="pager">
    <a href="/?page=2">2</a>
    <a href="/?page=3">3</a>
  </div>
</body>
</html>`

func TestAnalyzeGalleryListing(t *testing.T) {
	p, err := Analyze(parse(t, galleryHTML), mustParseURL(t, "https://nicegalleries.test/"))
	if err != nil {
		t.Fatalf("analyze: %v", err)
	}
	s := p.Spec

	if s.ID != "nicegalleries" {
		t.Errorf("id = %q, want nicegalleries", s.ID)
	}
	if s.Name != "Nice Galleries" {
		t.Errorf("name = %q, want the og:site_name", s.Name)
	}
	if s.BaseURL != "https://nicegalleries.test" {
		t.Errorf("base_url = %q", s.BaseURL)
	}
	// The tag cloud has more links than the grid has galleries. Counting links would
	// pick the tags; counting image-bearing links picks the content.
	if !strings.Contains(s.Listing.Item, "/g/") {
		t.Errorf("listing.item = %q, want it keyed on the /g/ gallery path, not the tag cloud", s.Listing.Item)
	}
	if s.Listing.ID.Attr != "href" || !strings.Contains(s.Listing.ID.Pattern, `(\d+)`) {
		t.Errorf("listing.id = %+v, want the id captured out of href", s.Listing.ID)
	}
	// The CDN domain must be in hosts or every tile 403s at the proxy with nothing
	// to explain it.
	if !hostListCovers(s.Hosts, "cdn.nicegalleries.test") {
		t.Errorf("hosts = %v, missing the thumbnail CDN", s.Hosts)
	}
	if !hostListCovers(s.Hosts, "nicegalleries.test") {
		t.Errorf("hosts = %v, missing the site's own domain", s.Hosts)
	}
	// Lazy-loaded: data-src must be preferred, with src kept as the fallback.
	if !strings.HasPrefix(s.Listing.Thumb.Attr, "data-src") || !strings.Contains(s.Listing.Thumb.Attr, "src") {
		t.Errorf("thumb.attr = %q, want data-src preferred with src as fallback", s.Listing.Thumb.Attr)
	}
	if s.Listing.Title.Selector != ".title" {
		t.Errorf("title.selector = %q, want .title", s.Listing.Title.Selector)
	}

	// Feeds: a paged default and a search feed carrying the form's hidden field.
	if len(s.Feeds) != 2 {
		t.Fatalf("feeds = %+v, want a default and a search", s.Feeds)
	}
	if !strings.Contains(s.Feeds[0].Path, "page={page}") {
		t.Errorf("default feed path = %q, want the {page} placeholder", s.Feeds[0].Path)
	}
	search := s.Feeds[1]
	if !search.Query {
		t.Error("search feed is not marked query")
	}
	if !strings.Contains(search.Path, "q={query}") {
		t.Errorf("search path = %q, want q={query}", search.Path)
	}
	// A booru's mode=list is the canonical case: drop the hidden field and the search
	// URL lands on a different handler entirely.
	if !strings.Contains(search.Path, "mode=list") {
		t.Errorf("search path = %q, dropped the form's hidden field", search.Path)
	}

	// A successfully fetched listing is added as a public source immediately. The
	// app is NSFW-first, so generated definitions do not add content warnings either.
	if strings.Contains(p.YAML, "content_warning:") {
		t.Errorf("generated source added an NSFW warning:\n%s", p.YAML)
	}
	back, err := ValidateSpecForSave([]byte(p.YAML))
	if err != nil {
		t.Fatalf("proposed YAML does not validate: %v\n%s", err, p.YAML)
	}
	if back.ID != s.ID || back.Listing.Item != s.Listing.Item || len(back.Feeds) != len(s.Feeds) {
		t.Errorf("round trip lost detail: %+v", back)
	}
	// The YAML a human reviews has to explain itself.
	if !strings.Contains(p.YAML, "#") {
		t.Error("proposed YAML carries no comments; it is meant to be reviewed and edited")
	}
}

func TestAnalyzeDetectsPathPaging(t *testing.T) {
	html := strings.Replace(galleryHTML, `<a href="/?page=2">2</a>`, `<a href="/2">2</a>`, 1)
	html = strings.Replace(html, `<a href="/?page=3">3</a>`, `<a href="/3">3</a>`, 1)
	p, err := Analyze(parse(t, html), mustParseURL(t, "https://nicegalleries.test/"))
	if err != nil {
		t.Fatalf("analyze: %v", err)
	}
	if got := p.Spec.Feeds[0].Path; got != "/{page}" {
		t.Errorf("feed path = %q, want /{page}", got)
	}
	// Path paging fails silently when wrong — the site re-serves page one — so the
	// reviewer must be told to check it.
	if !hasNote(p.Notes, "feeds", "page two") {
		t.Errorf("no note warning about verifying path paging: %+v", p.Notes)
	}
}

func TestAnalyzeNoPagingIsFlagged(t *testing.T) {
	html := strings.Replace(galleryHTML, `<div class="pager">
    <a href="/?page=2">2</a>
    <a href="/?page=3">3</a>
  </div>`, "", 1)
	p, err := Analyze(parse(t, html), mustParseURL(t, "https://nicegalleries.test/"))
	if err != nil {
		t.Fatalf("analyze: %v", err)
	}
	if !hasNote(p.Notes, "feeds", "No pagination") {
		t.Errorf("undetected paging was not reported: %+v", p.Notes)
	}
}

func TestAnalyzeVideoSite(t *testing.T) {
	html := `<html><head><title>Clips</title></head><body>
	  <video src="/preview.mp4"></video>
	  <a href="/watch/11"><img src="https://cdn.clips.test/11.jpg"><h3>One</h3></a>
	  <a href="/watch/12"><img src="https://cdn.clips.test/12.jpg"><h3>Two</h3></a>
	</body></html>`
	p, err := Analyze(parse(t, html), mustParseURL(t, "https://clips.test/"))
	if err != nil {
		t.Fatalf("analyze: %v", err)
	}
	if p.Spec.Kind != "video" {
		t.Errorf("kind = %q, want video", p.Spec.Kind)
	}
	if p.Spec.Listing.Title.Selector != "h3" {
		t.Errorf("title.selector = %q, want h3", p.Spec.Listing.Title.Selector)
	}
}

func TestAnalyzeRefusesAPageWithNoGrid(t *testing.T) {
	html := `<html><head><title>An article</title></head><body>
	  <p>Just prose, and <a href="/about">one link</a>.</p>
	</body></html>`
	_, err := Analyze(parse(t, html), mustParseURL(t, "https://blog.test/post"))
	if err == nil {
		t.Fatal("want an error rather than a spec that extracts nothing")
	}
	// The likeliest real cause is a JavaScript-rendered grid, and the message should
	// say so instead of leaving the user to guess at selectors.
	if !strings.Contains(err.Error(), "JavaScript") {
		t.Errorf("error %q does not suggest the likely cause", err)
	}
}

func TestAnalyzeIgnoresOffsiteLinks(t *testing.T) {
	// Ad networks and social buttons are numerous and numeric-id-shaped. A grid must
	// never be derived from links that leave the site.
	html := `<html><head><title>Site</title></head><body>
	  <a href="https://ads.example.com/click/1"><img src="https://ads.example.com/1.gif"></a>
	  <a href="https://ads.example.com/click/2"><img src="https://ads.example.com/2.gif"></a>
	  <a href="https://ads.example.com/click/3"><img src="https://ads.example.com/3.gif"></a>
	  <a href="/g/5"><img data-src="https://cdn.site.test/5.jpg"><span class="title">Five</span></a>
	  <a href="/g/6"><img data-src="https://cdn.site.test/6.jpg"><span class="title">Six</span></a>
	</body></html>`
	p, err := Analyze(parse(t, html), mustParseURL(t, "https://site.test/"))
	if err != nil {
		t.Fatalf("analyze: %v", err)
	}
	if !strings.Contains(p.Spec.Listing.Item, "/g/") {
		t.Errorf("listing.item = %q, want the on-site grid rather than the ad links", p.Spec.Listing.Item)
	}
	if hostListCovers(p.Spec.Hosts, "ads.example.com") {
		t.Errorf("hosts = %v, must not widen the proxy allowlist to an ad network", p.Spec.Hosts)
	}
}

func hasNote(notes []Note, field, contains string) bool {
	for _, n := range notes {
		if n.Field == field && strings.Contains(n.Text, contains) {
			return true
		}
	}
	return false
}

// ── validation ─────────────────────────────────────────────────────────

func TestValidateSpecForSaveRejections(t *testing.T) {
	base := func(overrides string) []byte {
		return []byte(`
id: good
name: Good
base_url: https://good.test
kind: comic
authentication: none
hosts: [good.test]
feeds:
  - id: recent
    label: Recent
    path: "/{page}"
listing:
  item: "a[href*='/g/']"
  id: {attr: href, pattern: "/g/(\\d+)"}
` + overrides)
	}

	if _, err := ValidateSpecForSave(base("")); err != nil {
		t.Fatalf("the baseline spec should validate: %v", err)
	}

	cases := []struct {
		name     string
		yaml     []byte
		contains string
	}{
		{
			name:     "optional auth without instructions",
			yaml:     []byte(strings.Replace(string(base("")), "authentication: none", "authentication: optional", 1)),
			contains: "auth_note",
		},
		{
			// The id becomes a filename. This is the one that would let a submitted
			// spec choose where it is written.
			name:     "traversal in id",
			yaml:     []byte(strings.Replace(string(base("")), "id: good", `id: "../../settings"`, 1)),
			contains: "filename",
		},
		{
			name:     "non-http base_url",
			yaml:     []byte(strings.Replace(string(base("")), "https://good.test", "file:///etc/passwd", 1)),
			contains: "http",
		},
		{
			name:     "credentials in base_url",
			yaml:     []byte(strings.Replace(string(base("")), "https://good.test", "https://user:pw@good.test", 1)),
			contains: "credentials",
		},
		{
			// hosts is the streaming proxy's allowlist. A bare wildcard turns it into an
			// open proxy pointed at everything on the server's network.
			name:     "bare wildcard host",
			yaml:     []byte(strings.Replace(string(base("")), "hosts: [good.test]", `hosts: ["*"]`, 1)),
			contains: "wildcard",
		},
		{
			name:     "hosts missing the site itself",
			yaml:     []byte(strings.Replace(string(base("")), "hosts: [good.test]", "hosts: [cdn.other.test]", 1)),
			contains: "own domain",
		},
		{
			name:     "host given as a URL",
			yaml:     []byte(strings.Replace(string(base("")), "hosts: [good.test]", `hosts: ["https://good.test/x"]`, 1)),
			contains: "hostname",
		},
		{
			name:     "feed path not rooted",
			yaml:     []byte(strings.Replace(string(base("")), `path: "/{page}"`, `path: "page/{page}"`, 1)),
			contains: "start with /",
		},
		{
			name:     "query feed without a placeholder",
			yaml:     []byte(strings.Replace(string(base("")), `path: "/{page}"`, "path: \"/search\"\n    query: true", 1)),
			contains: "{query}",
		},
		{
			name:     "oversized",
			yaml:     append(base(""), []byte("\n# "+strings.Repeat("x", maxSpecBytes)+"\n")...),
			contains: "too large",
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := ValidateSpecForSave(c.yaml)
			if err == nil {
				t.Fatalf("accepted %s", c.name)
			}
			if !strings.Contains(err.Error(), c.contains) {
				t.Errorf("error %q does not mention %q", err, c.contains)
			}
		})
	}
}

func TestSpecPathCannotEscapeTheDirectory(t *testing.T) {
	// Defence in depth behind ValidateSpecForSave: even handed an id that got past
	// the check, the path must stay inside the directory.
	for _, id := range []string{"../../etc/passwd", "..", "/absolute", "a/b"} {
		got := SpecPath("/config/sources", id)
		if strings.Contains(got, "..") || !strings.HasPrefix(filepathSlash(got), "/config/sources/") {
			t.Errorf("SpecPath(%q) = %q escaped the directory", id, got)
		}
	}
}

func filepathSlash(p string) string { return strings.ReplaceAll(p, "\\", "/") }
