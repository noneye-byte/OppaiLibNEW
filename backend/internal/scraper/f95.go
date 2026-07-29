package scraper

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"sync"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/models"
)

// F95Parser extracts game metadata from an f95zone.to thread: title, cover, the
// first post's description, screenshots, genre tags, engine, and platforms. It
// sets Kind=game and points DownloadURL at the thread (F95 fronts a set of
// third-party file hosts that rotate and expire, so the thread is the durable
// place to get it).
//
// Most game threads are members-only. The parser signs in with a stored F95
// account (see SetCredentials) to fetch those; without one, a gated thread returns
// an actionable error rather than a wall of login HTML scraped as if it were the
// game. It's a DirectParser because that sign-in and the per-session cookies it
// yields are its own to manage — the engine's stock fetch carries no cookies.
type F95Parser struct {
	mu       sync.Mutex
	username string
	password string
	// jar holds the logged-in session once we have one. Reused across scrapes and
	// rebuilt on a credential change or when a thread turns out still-walled.
	jar http.CookieJar
}

func (*F95Parser) Name() string { return "f95zone" }

func (*F95Parser) Match(u *url.URL) bool {
	host := strings.ToLower(u.Hostname())
	return host == "f95zone.to" || host == "f95zone.com" ||
		strings.HasSuffix(host, ".f95zone.to") || strings.HasSuffix(host, ".f95zone.com")
}

// Parse satisfies the Parser interface. The engine reaches F95 through ScrapeDirect
// (it's a DirectParser, so the login + cookies are handled there), and this is only
// the fallback if that path is ever skipped: it parses whatever document it's given,
// with no sign-in.
func (*F95Parser) Parse(doc *goquery.Document, u *url.URL) (*models.ScrapeResult, error) {
	return parseF95Thread(doc, u), nil
}

// SetCredentials updates the stored F95 login. A change drops any cached session,
// so the next scrape signs in afresh.
func (p *F95Parser) SetCredentials(username, password string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if username != p.username || password != p.password {
		p.username, p.password, p.jar = username, password, nil
	}
}

func (p *F95Parser) creds() (string, string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.username, p.password
}

// ScrapeDirect fetches the thread (signing in first if it needs an account) and
// parses it into a game result.
func (p *F95Parser) ScrapeDirect(ctx context.Context, client *http.Client, ua string, u *url.URL) (*models.ScrapeResult, error) {
	doc, err := p.fetchThread(ctx, client, ua, u)
	if err != nil {
		return nil, err
	}
	return parseF95Thread(doc, u), nil
}

// fetchThread returns the thread document, logging in and retrying once if the
// first fetch lands on the login wall.
func (p *F95Parser) fetchThread(ctx context.Context, client *http.Client, ua string, u *url.URL) (*goquery.Document, error) {
	doc, walled, err := p.get(ctx, client, ua, u.String())
	if err != nil {
		return nil, err
	}
	if !walled {
		return doc, nil
	}

	user, pass := p.creds()
	if user == "" || pass == "" {
		return nil, fmt.Errorf("f95zone: this thread needs an account — add your F95 login in Settings")
	}
	if err := p.login(ctx, client, ua); err != nil {
		return nil, fmt.Errorf("f95zone: sign-in failed: %w", err)
	}
	doc, walled, err = p.get(ctx, client, ua, u.String())
	if err != nil {
		return nil, err
	}
	if walled {
		return nil, fmt.Errorf("f95zone: still signed out after authenticating — check your F95 login in Settings")
	}
	return doc, nil
}

// get fetches url through the current session and reports whether the page came
// back as the login wall rather than the thread.
func (p *F95Parser) get(ctx context.Context, base *http.Client, ua, rawURL string) (*goquery.Document, bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, false, err
	}
	setF95Headers(req, ua)

	resp, err := p.sessionClient(base).Do(req)
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, false, fmt.Errorf("f95zone: %s returned %d", rawURL, resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return nil, false, err
	}
	return doc, isLoginWall(resp.Request.URL, doc), nil
}

// sessionClient wraps the engine's transport (keeping its SSRF dial guard and
// timeouts) with the current cookie jar so requests carry the F95 session.
func (p *F95Parser) sessionClient(base *http.Client) *http.Client {
	p.mu.Lock()
	jar := p.jar
	p.mu.Unlock()
	return &http.Client{
		Transport:     base.Transport,
		Jar:           jar,
		Timeout:       base.Timeout,
		CheckRedirect: base.CheckRedirect,
	}
}

// login performs the XenForo login flow: read the CSRF token off the login page,
// post the credentials, and keep the resulting session cookies. It uses its own
// cookie jar over the engine's transport so cookies set across the login redirect
// are captured (the engine's stock client keeps no jar).
func (p *F95Parser) login(ctx context.Context, base *http.Client, ua string) error {
	user, pass := p.creds()
	if user == "" || pass == "" {
		return fmt.Errorf("no credentials configured")
	}

	jar, err := cookiejar.New(nil)
	if err != nil {
		return err
	}
	client := &http.Client{
		Transport:     base.Transport,
		Jar:           jar,
		Timeout:       base.Timeout,
		CheckRedirect: base.CheckRedirect,
	}

	// 1. The login page carries the CSRF token every XenForo form must echo back.
	token, err := f95LoginToken(ctx, client, ua)
	if err != nil {
		return err
	}

	// 2. Post the credentials. remember=1 asks for the long-lived cookie, so the
	//    session outlives a single scrape.
	form := url.Values{
		"login":       {user},
		"password":    {pass},
		"remember":    {"1"},
		"_xfToken":    {token},
		"_xfRedirect": {"https://f95zone.to/"},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://f95zone.to/login/login", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	setF95Headers(req, ua)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Referer", "https://f95zone.to/login/")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	// Drain and close so the connection is reusable for the thread fetch.
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
	resp.Body.Close()

	// XenForo sets xf_user (the remember cookie) on a successful sign-in; its
	// absence means the credentials were rejected (or a challenge got in the way).
	if !jarHasCookie(jar, "xf_user") {
		return fmt.Errorf("credentials rejected")
	}
	p.mu.Lock()
	p.jar = jar
	p.mu.Unlock()
	return nil
}

// f95LoginToken GETs the login page and returns its _xfToken CSRF value.
func f95LoginToken(ctx context.Context, client *http.Client, ua string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://f95zone.to/login/", nil)
	if err != nil {
		return "", err
	}
	setF95Headers(req, ua)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	doc, err := goquery.NewDocumentFromReader(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", err
	}
	// The token lives in a hidden form input; XenForo also mirrors it on <html
	// data-csrf>, which is the fallback when the form markup shifts.
	if v, ok := doc.Find(`input[name="_xfToken"]`).First().Attr("value"); ok && v != "" {
		return v, nil
	}
	if v, ok := doc.Find("html").First().Attr("data-csrf"); ok && v != "" {
		return v, nil
	}
	return "", fmt.Errorf("no CSRF token on login page")
}

// isLoginWall reports whether a fetched page is the sign-in wall rather than the
// thread: either the request landed on a /login path, or the page shows a login
// form in place of a thread title.
func isLoginWall(final *url.URL, doc *goquery.Document) bool {
	if final != nil && strings.Contains(final.Path, "/login") {
		return true
	}
	hasThread := doc.Find(".p-title-value").Length() > 0
	hasLoginForm := doc.Find(`form[action*="/login"] input[name="password"]`).Length() > 0
	return !hasThread && hasLoginForm
}

// f95Version pulls a [v1.2.3] style version out of a thread title.
var f95Version = regexp.MustCompile(`(?i)\[\s*v?([0-9]+(?:\.[0-9]+)*[a-z]?)\s*\]`)

// parseF95Thread turns a thread document into a game ScrapeResult. Pure (no
// network), so it's the unit-testable half of the parser.
func parseF95Thread(doc *goquery.Document, u *url.URL) *models.ScrapeResult {
	res := &models.ScrapeResult{Kind: string(models.KindGame)}

	// The thread title carries the prefix labels (engine, status) as nested spans,
	// which Text() would fold in. Strip them from a clone so the title is just the
	// name — the labels themselves are read straight from the doc below, for tags.
	titleNode := doc.Find(".p-title-value").First().Clone()
	titleNode.Find(".label, .labelLink, .labelPair, .badge").Remove()
	rawTitle := firstNonEmpty(
		strings.TrimSpace(titleNode.Text()),
		metaProp(doc, "og:title"),
		strings.TrimSpace(doc.Find("title").First().Text()),
	)
	res.Title = cleanF95Title(rawTitle)

	res.Description = firstNonEmpty(
		metaProp(doc, "og:description"),
		metaName(doc, "description"),
	)

	// Cover: og:image is the thread's first-post banner.
	res.Cover = firstNonEmpty(metaProp(doc, "og:image"), metaName(doc, "twitter:image"))
	if res.Cover != "" {
		res.MediaURLs = append(res.MediaURLs, res.Cover)
	}

	// The first post holds the description, the screenshots, and the download links.
	firstPost := doc.Find("article.message").First()
	if firstPost.Length() == 0 {
		firstPost = doc.Find(".message-body").First()
	}
	body := firstPost.Find(".bbWrapper").First()
	if body.Length() == 0 {
		body = firstPost
	}

	// Screenshots: full-res images in the first post. XenForo lazy-loads them, so
	// the real source hides in data-src / data-url before it's swapped into src.
	seen := map[string]bool{}
	addShot := func(v string) {
		v = strings.TrimSpace(v)
		if v == "" || strings.HasPrefix(v, "data:") || seen[v] {
			return
		}
		seen[v] = true
		res.Screenshots = append(res.Screenshots, v)
	}
	body.Find("img").Each(func(_ int, s *goquery.Selection) {
		for _, attr := range []string{"data-src", "data-url", "src"} {
			if v, ok := s.Attr(attr); ok && v != "" {
				addShot(v)
				break
			}
		}
	})

	// Genre tags: the thread's tag list.
	tagSeen := map[string]bool{}
	addTag := func(name, category string) {
		name = strings.TrimSpace(name)
		key := category + "\x00" + strings.ToLower(name)
		if name == "" || tagSeen[key] {
			return
		}
		tagSeen[key] = true
		res.CategorizedTags = append(res.CategorizedTags, models.ScrapedTag{Name: name, Category: category})
		res.Tags = append(res.Tags, name)
	}
	doc.Find(`a.tagItem, .tagList a`).Each(func(_ int, s *goquery.Selection) {
		addTag(s.Text(), "genre")
	})

	// Thread prefixes carry the status (Completed / Ongoing / Abandoned) and the
	// engine (Ren'Py, Unity, RPGM, …). Both are worth keeping as their own tags.
	doc.Find(`.p-title-value .label, .p-title-value .labelLink`).Each(func(_ int, s *goquery.Selection) {
		label := strings.TrimSpace(s.Text())
		if label == "" {
			return
		}
		if eng := canonicalEngine(label); eng != "" {
			addTag(eng, "engine")
		} else {
			addTag(label, "status")
		}
	})

	// Platforms: what the game runs on, filed under their own category so a client
	// can ask "does this run on Android?" rather than string-matching a genre tag.
	// F95 rarely lists them structurally, so they're inferred from the title, the
	// engine, and any explicit mentions in the first post.
	haystack := strings.ToLower(rawTitle + "\n" + body.Text())
	for _, plat := range f95Platforms(haystack, res.CategorizedTags) {
		res.CategorizedTags = append(res.CategorizedTags, models.ScrapedTag{Name: plat, Category: "platform"})
		res.Tags = append(res.Tags, plat)
	}

	// F95 is the durable place to get it: the in-post links go to hosts that rotate
	// and expire, and reaching them needs the account anyway.
	res.DownloadURL = u.String()

	return res
}

// cleanF95Title strips the bracketed noise F95 titles carry — [Completed], [v1.2],
// [Developer], [Android] — down to the game's actual name.
func cleanF95Title(raw string) string {
	if i := strings.IndexByte(raw, '['); i > 0 {
		raw = raw[:i]
	}
	// Collapse the newlines/tabs the h1 markup leaves in the text down to single spaces.
	return strings.Join(strings.Fields(raw), " ")
}

// canonicalEngine folds F95's engine prefixes onto a lower-case name, or returns
// "" when the label isn't an engine (so the caller can file it as a status).
func canonicalEngine(label string) string {
	switch strings.ToLower(strings.TrimSpace(label)) {
	case "ren'py", "renpy", "ren’py":
		return "ren'py"
	case "rpgm", "rpg maker", "rpgmaker":
		return "rpgm"
	case "unity":
		return "unity"
	case "unreal engine", "unreal":
		return "unreal"
	case "html":
		return "html"
	case "flash":
		return "flash"
	case "qsp":
		return "qsp"
	case "wolf rpg", "wolf":
		return "wolf rpg"
	case "rags":
		return "rags"
	case "java":
		return "java"
	case "tads":
		return "tads"
	case "others", "other":
		return "other"
	default:
		return ""
	}
}

// f95Platforms infers the platforms a thread's game runs on. Windows is the
// baseline for every PC engine here; the rest are only claimed on an explicit
// mention, so "Android" is trustworthy enough to drive the app's runs-on-Android
// badge. Deduped, order fixed for stable output.
func f95Platforms(haystack string, tags []models.ScrapedTag) []string {
	seen := map[string]bool{}
	var out []string
	add := func(p string) {
		if p == "" || seen[p] {
			return
		}
		seen[p] = true
		out = append(out, p)
	}

	// A PC engine implies Windows even when the title never says so.
	for _, t := range tags {
		if t.Category == "engine" {
			switch t.Name {
			case "html", "flash":
				add("web")
			default:
				add("windows")
			}
		}
	}

	if strings.Contains(haystack, "windows") {
		add("windows")
	}
	if strings.Contains(haystack, "android") {
		add("android")
	}
	// "mac"/"osx" — guard "mac" against matching inside unrelated words by keying
	// off the standalone forms F95 actually uses.
	if strings.Contains(haystack, "mac os") || strings.Contains(haystack, "macos") ||
		strings.Contains(haystack, "osx") || strings.Contains(haystack, "os x") {
		add("macos")
	}
	if strings.Contains(haystack, "linux") {
		add("linux")
	}
	if strings.Contains(haystack, "html") {
		add("web")
	}
	return out
}

// setF95Headers gives a request the browser-like headers F95 (behind Cloudflare)
// expects to serve a real page rather than a challenge.
func setF95Headers(req *http.Request, ua string) {
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
}

// jarHasCookie reports whether the jar holds a cookie of the given name for
// f95zone.to.
func jarHasCookie(jar http.CookieJar, name string) bool {
	u, _ := url.Parse("https://f95zone.to/")
	for _, c := range jar.Cookies(u) {
		if c.Name == name {
			return true
		}
	}
	return false
}
