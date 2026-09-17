// Package gamesites browses itch.io and F95zone as game catalogues, signs in to
// them, and reads a game's own page for the two things a library entry cannot
// guess: which version the site is on now, and where the build can be had.
//
// This is deliberately not the scraper and not a sources.Source. The scraper turns
// one URL into one library item, and it already knows both sites (an add from here
// goes through it). A sources.Source is a feed of *media* — pictures and clips that
// the client streams through the proxy — and a game listing is neither streamable
// nor a picture. What a game catalogue needs is its own shape: a search with a
// sort, a page of cards that says which are already on the shelf, and a page read
// that answers "is there a newer version than mine?". The parsing is a port of the
// desktop launcher's (Launchy's browse-parse.ts and sources.ts), kept in step so
// both ends of the pairing read a page the same way.
//
// Both sites are read from a signed-in session and nothing else. itch.io only
// serves its adult listings to an account that has asked for them, F95zone hides
// threads and every download link from guests, and a catalogue that half-works
// signed out is a catalogue that quietly lies — so Browse refuses outright until
// the site is signed in, and says so.
package gamesites

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Site is one of the two catalogues.
type Site string

const (
	Itch Site = "itch"
	F95  Site = "f95"
)

// Sites lists both, in the order the client shows them.
var Sites = []Site{Itch, F95}

// Label is the site's name as shown to people.
func (s Site) Label() string {
	switch s {
	case Itch:
		return "itch.io"
	case F95:
		return "F95zone"
	}
	return string(s)
}

// Origin is where the site lives.
func (s Site) Origin() string {
	switch s {
	case Itch:
		return "https://itch.io"
	case F95:
		return "https://f95zone.to"
	}
	return ""
}

// Valid reports whether s names a site this package knows.
func (s Site) Valid() bool { return s == Itch || s == F95 }

// ParseSite reads a site name off a request, tolerating the labels people type.
func ParseSite(raw string) (Site, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "itch", "itch.io", "itchio":
		return Itch, true
	case "f95", "f95zone", "f95zone.to":
		return F95, true
	}
	return "", false
}

// Sort is one ordering a site's listing offers. Key is passed straight back to it.
type Sort struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

// Sorts are the orderings each site offers; the first is the default.
var Sorts = map[Site][]Sort{
	Itch: {
		{Key: "newest", Label: "Newest"},
		{Key: "new-and-popular", Label: "New & popular"},
		{Key: "top-rated", Label: "Top rated"},
		{Key: "top-sellers", Label: "Top sellers"},
	},
	F95: {
		{Key: "date", Label: "Latest"},
		{Key: "likes", Label: "Most liked"},
		{Key: "views", Label: "Most viewed"},
		{Key: "rating", Label: "Top rated"},
		{Key: "title", Label: "Title"},
	},
}

// Item is one search result. Nothing here is in the library; ID is the itch.io
// game id or the F95zone thread id, stable within its site.
type Item struct {
	Site        Site   `json:"site"`
	ID          string `json:"id"`
	Title       string `json:"title"`
	Developer   string `json:"developer,omitempty"`
	Version     string `json:"version,omitempty"`
	Description string `json:"description,omitempty"`
	// URL is the game's own page — what an add scrapes and what an update check reads.
	URL       string   `json:"url"`
	Thumbnail string   `json:"thumbnail,omitempty"`
	Images    []string `json:"images"`
	Tags      []string `json:"tags"`
	// Rating is 0–5; 0 means the site reports none.
	Rating float64 `json:"rating,omitempty"`
	// WebPlayable marks an itch.io browser game.
	WebPlayable bool `json:"webPlayable,omitempty"`
	NSFW        bool `json:"nsfw,omitempty"`
	// LibraryID is the media id of the library entry that came from this page, when
	// there is one. Filled in by the API layer, never by the parsers.
	LibraryID int64 `json:"libraryId,omitempty"`
}

// Query is one request for a page of a site.
type Query struct {
	Site  Site
	Query string
	Sort  string
	Page  int
	// NSFW asks itch.io for its adult listing rather than its safe-for-work one.
	// F95zone has no such distinction.
	NSFW bool
}

// Listing is one page of results.
type Listing struct {
	Items   []Item `json:"items"`
	Page    int    `json:"page"`
	HasMore bool   `json:"hasMore"`
}

// DownloadSource is one way to get a build: a file host linked from an F95zone
// thread, or one upload on an itch.io page.
type DownloadSource struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Host     string `json:"host"`
	URL      string `json:"url"`
	Platform string `json:"platform,omitempty"`
	Version  string `json:"version,omitempty"`
	Size     string `json:"size,omitempty"`
	// Kind is "direct" for a link that starts a transfer or "external" for one that
	// lands on a page where the user still has to click.
	Kind string `json:"kind"`
}

// Report is what a game's page says about getting and updating it.
type Report struct {
	URL       string           `json:"url"`
	Version   string           `json:"version"`
	Changelog string           `json:"changelog"`
	Sources   []DownloadSource `json:"sources"`
	// Degraded marks a page that could not be read; nothing else is trustworthy then.
	Degraded bool `json:"degraded"`
	// SignedIn is whether the read was made as a member. It matters for an empty
	// source list: F95zone serves a thread to anyone but hides every download link
	// from a guest, so "no downloads on the page" and "no downloads for you" look
	// identical from the outside and are not the same thing to say.
	SignedIn bool `json:"signedIn"`
}

// Account is whether a site is signed in, and as whom when it will say.
type Account struct {
	Site     Site   `json:"site"`
	Label    string `json:"label"`
	SignedIn bool   `json:"signedIn"`
	User     string `json:"user,omitempty"`
	// Password is true for a site that can be signed in to with a username and
	// password from here. itch.io cannot: its login page sits behind a browser
	// challenge no server can pass, so it is signed in by cookie — pasted, or handed
	// over by the desktop launcher.
	Password bool `json:"password"`
}

// ErrSignedOut is what Browse answers for a site that is not signed in.
var ErrSignedOut = errors.New("sign in to browse")

// Client holds one signed-in session per site over a shared, guarded transport.
type Client struct {
	base *http.Client
	ua   string

	mu   sync.Mutex
	jars map[Site]http.CookieJar
	// The F95zone login, kept so an expired session can be renewed without asking.
	f95User, f95Pass string

	// One request to a site at a time, with a gap: these are somebody else's pages,
	// and a check-for-updates sweep is a page per game.
	pace   sync.Mutex
	lastAt map[string]time.Time
}

// courtesyGap is the pause between two reads of the same host.
const courtesyGap = 1200 * time.Millisecond

// maxPageBytes caps a fetched page. A listing is tens of kilobytes; a thread with
// a long first post a few hundred.
const maxPageBytes = 8 << 20

// New builds a client over base's transport (the scraper's, with its SSRF guard and
// deadlines) and its own cookie jars.
func New(base *http.Client, userAgent string) *Client {
	if base == nil {
		base = &http.Client{Timeout: 30 * time.Second}
	}
	return &Client{
		base:   base,
		ua:     userAgent,
		jars:   map[Site]http.CookieJar{},
		lastAt: map[string]time.Time{},
	}
}

// SetUserAgent changes the UA sent on every request.
func (c *Client) SetUserAgent(ua string) {
	c.mu.Lock()
	c.ua = ua
	c.mu.Unlock()
}

// SetF95Credentials records the F95zone login used to renew its session. A change
// drops the session so the next read signs in afresh.
func (c *Client) SetF95Credentials(username, password string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if username != c.f95User || password != c.f95Pass {
		c.f95User, c.f95Pass = username, password
		delete(c.jars, F95)
	}
}

// authCookie is the cookie each site sets only once a session is genuinely signed
// in. itch.io hands `itchio_token` (its CSRF token) to every guest on the first
// page load, so that one proves nothing; the session cookie is `itchio`. XenForo
// likewise issues `xf_session` to guests — only `xf_user` means signed in.
func authCookie(site Site) string {
	switch site {
	case Itch:
		return "itchio"
	case F95:
		return "xf_user"
	}
	return ""
}

func (c *Client) jar(site Site) http.CookieJar {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.jars[site]
}

func (c *Client) setJar(site Site, jar http.CookieJar) {
	c.mu.Lock()
	c.jars[site] = jar
	c.mu.Unlock()
}

// client returns an http.Client carrying the site's session, or none.
func (c *Client) client(site Site) *http.Client {
	return &http.Client{
		Transport:     c.base.Transport,
		Timeout:       c.base.Timeout,
		CheckRedirect: c.base.CheckRedirect,
		Jar:           c.jar(site),
	}
}

// SignedIn reports whether the site's session cookie is on file. It says a
// session exists, not that the site still honours it — Account asks the site.
func (c *Client) SignedIn(site Site) bool {
	jar := c.jar(site)
	if jar == nil {
		return false
	}
	u, _ := url.Parse(site.Origin() + "/")
	for _, ck := range jar.Cookies(u) {
		if ck.Name == authCookie(site) && ck.Value != "" {
			return true
		}
	}
	return false
}

// SignOut forgets the site's session. The stored F95zone login is kept: signing
// out is "drop this session", and the settings screen owns the credentials.
func (c *Client) SignOut(site Site) {
	c.mu.Lock()
	delete(c.jars, site)
	c.mu.Unlock()
}

// SetCookie signs a site in with a cookie somebody else obtained — pasted from a
// browser, or handed over by the desktop launcher that signed in through the
// site's own page. raw is either a bare value (taken as the site's session cookie)
// or a `name=value; name=value` header as a browser shows it.
func (c *Client) SetCookie(site Site, raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return errors.New("empty cookie")
	}
	jar, err := cookiejar.New(nil)
	if err != nil {
		return err
	}
	u, _ := url.Parse(site.Origin() + "/")
	var cookies []*http.Cookie
	if strings.Contains(raw, "=") {
		for _, part := range strings.Split(raw, ";") {
			name, value, ok := strings.Cut(strings.TrimSpace(part), "=")
			name = strings.TrimSpace(name)
			if !ok || name == "" {
				continue
			}
			cookies = append(cookies, &http.Cookie{Name: name, Value: strings.TrimSpace(value)})
		}
	} else {
		cookies = append(cookies, &http.Cookie{Name: authCookie(site), Value: raw})
	}
	found := false
	for _, ck := range cookies {
		ck.Domain = strings.TrimPrefix(u.Hostname(), "www.")
		ck.Path = "/"
		ck.Secure = true
		if ck.Name == authCookie(site) && ck.Value != "" {
			found = true
		}
	}
	if !found {
		return fmt.Errorf("that is not a signed-in %s cookie — it needs %q", site.Label(), authCookie(site))
	}
	jar.SetCookies(u, cookies)
	c.setJar(site, jar)
	return nil
}

// Login signs in with a username and password. Only F95zone can be: itch.io's
// login page is behind a Cloudflare challenge that only a real browser passes, and
// the honest answer is to say so rather than post credentials into a wall.
func (c *Client) Login(ctx context.Context, site Site, username, password string) error {
	switch site {
	case F95:
		if strings.TrimSpace(username) == "" || password == "" {
			return errors.New("F95zone needs a username and password")
		}
		c.SetF95Credentials(username, password)
		return c.loginF95(ctx)
	case Itch:
		return errors.New("itch.io cannot be signed in to with a password from here — its login page is behind a browser check. Sign in through Launchy, or paste the itchio cookie from your browser")
	}
	return fmt.Errorf("unknown site %q", site)
}

// renewF95 signs F95zone back in from the stored login, for a session that has
// expired underneath a read.
func (c *Client) renewF95(ctx context.Context) error {
	c.mu.Lock()
	user, pass := c.f95User, c.f95Pass
	c.mu.Unlock()
	if user == "" || pass == "" {
		return ErrSignedOut
	}
	return c.loginF95(ctx)
}

// Account asks the site who we are. A cookie says a session exists; this says
// whether the site still honours it, so an expired login reads as signed out.
func (c *Client) Account(ctx context.Context, site Site) Account {
	acct := Account{Site: site, Label: site.Label(), Password: site == F95}
	if !c.SignedIn(site) {
		return acct
	}
	user, ok, err := c.probe(ctx, site)
	if err != nil {
		// The site would not answer. Trust the cookie rather than logging the user
		// out over a timeout.
		acct.SignedIn = true
		return acct
	}
	if !ok && site == F95 && c.renewF95(ctx) == nil {
		user, ok, _ = c.probe(ctx, site)
	}
	acct.SignedIn = ok
	acct.User = user
	if !ok {
		c.SignOut(site)
	}
	return acct
}

var (
	itchUserName = regexp.MustCompile(`(?i)<span[^>]*\sclass="[^"]*\buser_name\b[^"]*"[^>]*>([\s\S]{1,80}?)</span>`)
	f95UserName  = regexp.MustCompile(`(?i)<span[^>]*\sclass="[^"]*\bp-navgroup-user-linkText\b[^"]*"[^>]*>([\s\S]{1,80}?)</span>`)
)

// probe reads a page only a member can see and reports whether the site let us.
func (c *Client) probe(ctx context.Context, site Site) (user string, signedIn bool, err error) {
	switch site {
	case Itch:
		// /my-feed bounces a guest to /login; a member gets the page.
		status, final, body, err := c.getPage(ctx, site, site.Origin()+"/my-feed", site.Origin()+"/", false)
		if err != nil {
			return "", false, err
		}
		if status != http.StatusOK || strings.Contains(final, "/login") {
			return "", false, nil
		}
		if m := itchUserName.FindStringSubmatch(body); m != nil {
			return inlineText(m[1]), true, nil
		}
		return "", true, nil
	case F95:
		status, final, body, err := c.getPage(ctx, site, site.Origin()+"/", site.Origin()+"/", true)
		if err != nil {
			return "", false, err
		}
		if status != http.StatusOK || strings.Contains(final, "/login") {
			return "", false, nil
		}
		if m := f95UserName.FindStringSubmatch(body); m != nil {
			return inlineText(m[1]), true, nil
		}
		// The page came back, but the member menu is not on it: a guest view.
		return "", strings.Contains(body, "p-navgroup-user-linkText") || strings.Contains(body, "/logout/"), nil
	}
	return "", false, fmt.Errorf("unknown site %q", site)
}

// throttle spaces requests to one host out.
func (c *Client) throttle(ctx context.Context, host string) error {
	c.pace.Lock()
	defer c.pace.Unlock()
	if last, ok := c.lastAt[host]; ok {
		if wait := courtesyGap - time.Since(last); wait > 0 {
			select {
			case <-time.After(wait):
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
	c.lastAt[host] = time.Now()
	return nil
}

// getPage fetches a page through the site's session. It returns the status, the
// final URL after redirects, and the body — the final URL is how a login wall is
// recognised. follow=false stops at the first redirect, which is the cheapest
// possible "are we signed in?" for itch.io.
func (c *Client) getPage(ctx context.Context, site Site, rawURL, referer string, follow bool) (status int, final, body string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return 0, "", "", err
	}
	c.decorate(req, referer, "text/html,application/json,application/xhtml+xml;q=0.9,*/*;q=0.8")
	if err := c.throttle(ctx, req.URL.Host); err != nil {
		return 0, "", "", err
	}
	client := c.client(site)
	if !follow {
		client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, "", "", fmt.Errorf("%s could not be reached: %w", req.URL.Host, err)
	}
	defer resp.Body.Close()
	final = resp.Request.URL.String()
	if loc := resp.Header.Get("Location"); loc != "" && resp.StatusCode >= 300 && resp.StatusCode < 400 {
		final = loc
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, maxPageBytes))
	if err != nil {
		return resp.StatusCode, final, "", err
	}
	return resp.StatusCode, final, string(b), nil
}

// fetch is getPage for callers that only want a 200 body.
func (c *Client) fetch(ctx context.Context, site Site, rawURL, referer string) (string, error) {
	status, final, body, err := c.getPage(ctx, site, rawURL, referer, true)
	if err != nil {
		return "", err
	}
	if status != http.StatusOK {
		return "", fmt.Errorf("%s replied %d", hostOf(rawURL), status)
	}
	if strings.Contains(final, "/login") {
		return "", ErrSignedOut
	}
	return body, nil
}

func (c *Client) decorate(req *http.Request, referer, accept string) {
	c.mu.Lock()
	ua := c.ua
	c.mu.Unlock()
	if ua == "" {
		ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
	}
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", accept)
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	if referer != "" {
		req.Header.Set("Referer", referer)
	}
}

func hostOf(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil || u.Host == "" {
		return "the site"
	}
	return u.Host
}

// Browse returns one page of a site. Refuses with ErrSignedOut for a site that is
// not signed in — see the package comment for why.
func (c *Client) Browse(ctx context.Context, q Query) (*Listing, error) {
	if !q.Site.Valid() {
		return nil, fmt.Errorf("unknown site %q", q.Site)
	}
	if !c.SignedIn(q.Site) {
		if q.Site == F95 && c.renewF95(ctx) == nil {
			// A stored login is as good as a session.
		} else {
			return nil, ErrSignedOut
		}
	}
	page := q.Page
	if page < 1 {
		page = 1
	}
	if page > 500 {
		page = 500
	}
	sort := sortKey(q.Site, q.Sort)
	needle := strings.TrimSpace(q.Query)
	if len(needle) > 120 {
		needle = needle[:120]
	}
	if q.Site == F95 {
		return c.browseF95(ctx, needle, sort, page)
	}
	return c.browseItch(ctx, needle, sort, page, q.NSFW)
}

func sortKey(site Site, requested string) string {
	options := Sorts[site]
	for _, o := range options {
		if o.Key == requested {
			return requested
		}
	}
	return options[0].Key
}

// Detail reads the item's own page for what a listing cell does not carry — the
// long description, the real tag list, the screenshots. degraded is true when the
// page would not load and the item is returned as it was.
func (c *Client) Detail(ctx context.Context, item Item) (Item, bool) {
	var err error
	var out Item
	switch item.Site {
	case F95:
		out, err = c.detailF95(ctx, item)
	default:
		out, err = c.detailItch(ctx, item)
	}
	if err != nil {
		return item, true
	}
	return out, false
}

// Report reads a game page for its version, changelog and download sources. A
// page that cannot be read comes back Degraded with no sources rather than as an
// error, so a caller can still offer "open the page yourself".
func (c *Client) Report(ctx context.Context, site Site, pageURL string) *Report {
	if !strings.HasPrefix(strings.ToLower(pageURL), "http") {
		return &Report{URL: pageURL, Degraded: true}
	}
	var rep *Report
	var err error
	switch site {
	case F95:
		rep, err = c.reportF95(ctx, pageURL)
	default:
		rep, err = c.reportItch(ctx, pageURL)
	}
	if err != nil {
		return &Report{URL: pageURL, Degraded: true}
	}
	return rep
}

// Latest is just the version and changelog — what an update check needs. Unlike
// Report it fails loudly, because "could not read the page" and "no new version"
// must not look alike to a sweep.
func (c *Client) Latest(ctx context.Context, site Site, pageURL string) (version, changelog string, err error) {
	rep := c.Report(ctx, site, pageURL)
	if rep.Degraded {
		return "", "", fmt.Errorf("%s would not serve the game page", site.Label())
	}
	return rep.Version, rep.Changelog, nil
}

// RemoteFromURL recognises a game page on one of the two sites and names it: the
// F95zone thread id, or "" for itch.io, whose pages are addressed by the
// developer's subdomain and a slug rather than a number.
func RemoteFromURL(rawURL string) (Site, string, bool) {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", "", false
	}
	host := strings.ToLower(strings.TrimPrefix(u.Hostname(), "www."))
	switch {
	case host == "f95zone.to" || host == "f95zone.com":
		// A thread is /threads/<id>/ or /threads/<slug>.<id>/.
		if m := f95ThreadID.FindStringSubmatch(u.Path); m != nil {
			return F95, m[1], true
		}
		return "", "", false
	case host == "itch.io" || strings.HasSuffix(host, ".itch.io"):
		return Itch, "", true
	}
	return "", "", false
}

var f95ThreadID = regexp.MustCompile(`(?i)/threads/(?:[^/]*\.)?(\d+)`)

// NormalizeVersion folds the dozen ways a version gets written — "v0.7", "V 0.7",
// "0.7-beta", "0_7" — so two spellings of one build compare equal.
func NormalizeVersion(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	v = versionPrefix.ReplaceAllString(v, "")
	return versionNoise.ReplaceAllString(v, "")
}

var (
	versionPrefix = regexp.MustCompile(`^v\.?\s*`)
	versionNoise  = regexp.MustCompile(`[\s_-]+`)
)

// HasUpdate reports whether latest names a build other than known. "Different
// from what you have" is the honest test rather than "newer than": developers
// version however they like, and a lexical compare would call "Ch.4" older than
// "Ch.10" or "Final" newer than nothing.
func HasUpdate(known, latest string) bool {
	if strings.TrimSpace(latest) == "" {
		return false
	}
	return NormalizeVersion(latest) != NormalizeVersion(known)
}
