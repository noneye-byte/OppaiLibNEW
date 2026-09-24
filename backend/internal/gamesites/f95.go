package gamesites

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

// F95zone's "latest updates" page is fed by a JSON endpoint, which is used
// directly for browsing. It reports tags as numeric ids with no public table to
// resolve them against, so the real tag list is read off the thread page when a
// result is inspected or added. Threads are XenForo, so the login is XenForo's.

const (
	f95Origin  = "https://f95zone.to"
	f95API     = f95Origin + "/sam/latest_alpha/latest_data.php"
	f95Referer = f95Origin + "/sam/latest_alpha/"
)

type f95Row struct {
	ThreadID json.Number `json:"thread_id"`
	Title    string      `json:"title"`
	Creator  string      `json:"creator"`
	Version  string      `json:"version"`
	Rating   json.Number `json:"rating"`
	Cover    string      `json:"cover"`
	Screens  []string    `json:"screens"`
}

// stripVersionPrefix drops the leading "v" the site already carries, so the client
// does not end up printing "vv0.7.0".
func stripVersionPrefix(v string) string {
	v = strings.TrimSpace(v)
	if len(v) > 1 && (v[0] == 'v' || v[0] == 'V') && v[1] >= '0' && v[1] <= '9' {
		return v[1:]
	}
	return v
}

// ParseF95Listing decodes one page of the listing endpoint. totalPages is what
// the endpoint reports, or page when it reports nothing.
func ParseF95Listing(body string, page int) (items []Item, totalPages int, err error) {
	var payload struct {
		Status string          `json:"status"`
		Msg    json.RawMessage `json:"msg"`
	}
	if err := json.Unmarshal([]byte(body), &payload); err != nil {
		return nil, 0, errors.New("F95zone returned something other than a listing")
	}
	if payload.Status != "ok" {
		return nil, 0, errors.New("F95zone refused the request — its listing API may have moved")
	}
	var rows []f95Row
	total := page
	// The payload is either a bare array or {data, pagination}.
	if err := json.Unmarshal(payload.Msg, &rows); err != nil {
		var wrapped struct {
			Data       []f95Row `json:"data"`
			Pagination struct {
				Total json.Number `json:"total"`
			} `json:"pagination"`
		}
		if err := json.Unmarshal(payload.Msg, &wrapped); err != nil {
			return nil, 0, errors.New("F95zone returned something other than a listing")
		}
		rows = wrapped.Data
		if t, err := wrapped.Pagination.Total.Int64(); err == nil && t > 0 {
			total = int(t)
		}
	}
	items = []Item{}
	for _, row := range rows {
		id, err := row.ThreadID.Int64()
		title := inlineText(row.Title)
		if err != nil || id <= 0 || title == "" {
			continue
		}
		cover := ""
		if strings.HasPrefix(row.Cover, "https://") {
			cover = row.Cover
		}
		images := []string{cover}
		for _, s := range row.Screens {
			if strings.HasPrefix(s, "https://") {
				images = append(images, s)
			}
		}
		rating, _ := row.Rating.Float64()
		items = append(items, Item{
			Site:      F95,
			ID:        strconv.FormatInt(id, 10),
			Title:     title,
			Developer: inlineText(row.Creator),
			Version:   stripVersionPrefix(inlineText(row.Version)),
			URL:       fmt.Sprintf("%s/threads/%d/", f95Origin, id),
			Thumbnail: cover,
			Images:    dedupe(images),
			Tags:      []string{},
			Rating:    rating,
			// F95zone is an adult site end to end; there is nothing to distinguish.
			NSFW: true,
		})
	}
	return items, total, nil
}

func (c *Client) browseF95(ctx context.Context, query, sort string, page int) (*Listing, error) {
	params := url.Values{"cmd": {"list"}, "cat": {"games"}, "page": {strconv.Itoa(page)}, "sort": {sort}}
	if query != "" {
		params.Set("search", query)
	}
	body, err := c.fetch(ctx, F95, f95API+"?"+params.Encode(), f95Referer)
	if err != nil {
		return nil, err
	}
	items, total, err := ParseF95Listing(body, page)
	if err != nil {
		return nil, err
	}
	return &Listing{Items: items, Page: page, HasMore: page < total}, nil
}

// ParseF95Detail fills an item in from its thread: the tag list in words, the
// prefix chips (engine and status), the description and a cover if the listing
// had none.
func ParseF95Detail(page string, item Item) Item {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return item
	}
	raw := []string{}
	// The prefix chips in the heading carry the engine and the status — "Ren'Py",
	// "Completed", "Abandoned" — which are worth keeping as tags too.
	doc.Find(".p-title-value .labelLink, .p-title-value .label").Each(func(_ int, s *goquery.Selection) {
		raw = append(raw, s.Text())
	})
	doc.Find(".js-tagList a.tagItem, .tagList a.tagItem, a.tagItem").Each(func(_ int, s *goquery.Selection) {
		raw = append(raw, s.Text())
	})
	out := item
	if d := clampText(blockText(metaContent(doc, "og:description")), maxDescription); d != "" {
		out.Description = d
	}
	if tags := normalizeTags(raw, 24); len(tags) > 0 {
		out.Tags = tags
	}
	// The pictures are the ones in the first post: the cover first, then the
	// screenshots. Taken when the listing brought one picture or none — a game opened
	// from a pasted link, from the updates list, or being added — and not otherwise,
	// because the listing's are the smaller preview renditions of these same files.
	if len(out.Images) <= 1 {
		if shots := f95PostImages(doc); len(shots) > 0 {
			out.Images = shots
			if out.Thumbnail == "" {
				out.Thumbnail = shots[0]
			}
		}
	}
	if len(out.Images) == 0 {
		// og:image is the last resort, and the site favicon — which is what it is on
		// every thread, signed in or not — is never a cover.
		if cover := metaContent(doc, "og:image"); cover != "" && !isF95SiteArt(cover) {
			out.Images = []string{cover}
			if out.Thumbnail == "" {
				out.Thumbnail = cover
			}
		}
	}
	if out.Title == "" {
		out.Title = cleanF95Title(inlineText(titleWithoutLabels(doc)))
	}
	if out.Version == "" {
		out.Version = ParseF95Version(page)
	}
	return out
}

// maxF95PostImages bounds the pictures taken from a first post; some threads carry
// dozens of screenshots and a preview does not need them all.
const maxF95PostImages = 12

// f95PostImages lists the pictures in a thread's first post, full size, in order.
//
// XenForo draws each as a link to the attachment around a thumbnail of it
// (<a href=".../6524703_x.png"><img src=".../thumb/6524703_x.png" class="bbImage">),
// so the link is the full picture. An image posted by URL rather than attached has no
// link, and its own src is taken instead.
func f95PostImages(doc *goquery.Document) []string {
	post := doc.Find("article.message-body").First()
	var out []string
	post.Find("img.bbImage").Each(func(_ int, img *goquery.Selection) {
		src := ""
		if href, ok := img.Closest("a").Attr("href"); ok && isF95Picture(href) {
			src = href
		} else if s, ok := img.Attr("data-src"); ok && isF95Picture(s) {
			src = s
		} else if s, ok := img.Attr("src"); ok && isF95Picture(s) {
			src = s
		}
		if src != "" {
			out = append(out, src)
		}
	})
	out = dedupe(out)
	if len(out) > maxF95PostImages {
		out = out[:maxF95PostImages]
	}
	return out
}

// isF95Picture accepts an absolute https picture that is not the site's own artwork.
func isF95Picture(u string) bool {
	return strings.HasPrefix(u, "https://") && !isF95SiteArt(u)
}

// isF95SiteArt recognises F95zone's own logo and icons, which a page offers in place
// of a cover and which every game added as a guest used to get. Decided by host, not
// by name: a game's cover is as likely as not to be called Logo.png, and it lives on
// the attachment hosts, never on the forum's own.
func isF95SiteArt(u string) bool {
	parsed, err := url.Parse(u)
	if err != nil {
		return true
	}
	host := strings.ToLower(parsed.Host)
	return host == "f95zone.to" || host == "www.f95zone.to" || host == "static.f95zone.to" ||
		strings.Contains(strings.ToLower(parsed.Path), "favicon")
}

func titleWithoutLabels(doc *goquery.Document) string {
	h := doc.Find("h1.p-title-value").First().Clone()
	h.Find(".label, .labelLink, .label-append").Remove()
	return h.Text()
}

// cleanF95Title strips the bracketed noise a thread title carries — [Completed],
// [v1.2], [Developer] — down to the game's name.
func cleanF95Title(raw string) string {
	if i := strings.IndexByte(raw, '['); i > 0 {
		raw = raw[:i]
	}
	return strings.Join(strings.Fields(raw), " ")
}

func (c *Client) detailF95(ctx context.Context, item Item) (Item, error) {
	page, err := c.fetchF95Thread(ctx, item.URL)
	if err != nil {
		return item, err
	}
	return ParseF95Detail(page, item), nil
}

// fetchF95Thread reads a thread, signing back in once if the session has lapsed
// and a login is on file.
func (c *Client) fetchF95Thread(ctx context.Context, threadURL string) (string, error) {
	page, err := c.fetch(ctx, F95, threadURL, f95Referer)
	if errors.Is(err, ErrSignedOut) || (err == nil && isF95LoginWall(page)) {
		if rerr := c.renewF95(ctx); rerr != nil {
			return "", ErrSignedOut
		}
		page, err = c.fetch(ctx, F95, threadURL, f95Referer)
		if err == nil && isF95LoginWall(page) {
			return "", ErrSignedOut
		}
	}
	return page, err
}

// isF95LoginWall recognises the sign-in page served in place of a thread.
func isF95LoginWall(page string) bool {
	return !strings.Contains(page, "p-title-value") && strings.Contains(page, `name="password"`)
}

func (c *Client) f95ItemFromURL(ctx context.Context, threadURL string) (Item, error) {
	_, id, ok := RemoteFromURL(threadURL)
	if !ok {
		return Item{}, errors.New("not an F95zone thread")
	}
	page, err := c.fetchF95Thread(ctx, threadURL)
	if err != nil {
		return Item{}, err
	}
	item := ParseF95Detail(page, Item{Site: F95, ID: id, URL: threadURL, Images: []string{}, Tags: []string{}, NSFW: true})
	if item.Title == "" {
		return Item{}, errors.New("no game on that page")
	}
	return item, nil
}

/* ------------------------------------------------------------- the report */

var (
	f95BracketRe = regexp.MustCompile(`\[([^\]]{1,40})\]`)
	f95Label     = regexp.MustCompile(`(?i)<span[^>]*class="label[^"]*"[^>]*>[\s\S]*?</span>`)
	// The headings that mean the changelog has ended. A first post runs
	// "Changelog → Developer Notes → DOWNLOAD → Win: …", and taking everything after
	// the word swallowed the download list.
	changelogEnd = regexp.MustCompile(`(?im)^[^\S\n]*(?:downloads?\b|win(?:dows)?[^\S\n]*:|mac(?:os)?[^\S\n]*:|linux[^\S\n]*:|android[^\S\n]*:|extras?[^\S\n]*:|dev(?:eloper)?[^\S\n]*notes?\b|installation\b|walkthrough\b)`)
	changelogAt  = regexp.MustCompile(`(?i)change\s*-?\s*log|what'?s new|update\s+notes`)
	// Lines XenForo prints in place of content this reader may not see.
	placeholderLine = regexp.MustCompile(`(?i)^(?:spoiler\b|you don'?t have permission to view|log in or register now|you must be registered)`)
	f95Furniture    = regexp.MustCompile(`(?i)f95zone\.to/(threads|members|forums|goto|posts)/`)
	f95Masked       = regexp.MustCompile(`(?i)f95zone\.to/masked/`)
	anchorRe        = regexp.MustCompile(`(?i)<a\b([^>]*)>([\s\S]*?)</a>`)
	hrefRe          = regexp.MustCompile(`(?i)\shref\s*=\s*"([^"]*)"`)
	imgRe           = regexp.MustCompile(`(?i)<img\b`)
)

// minChangelog: shorter than this is a leftover fragment, not a changelog.
const minChangelog = 24

// ParseF95Version reads the version printed in the thread heading, e.g.
// "Game [v0.7.2] [Dev]" → "0.7.2".
func ParseF95Version(page string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return ""
	}
	h, err := doc.Find("h1.p-title-value").First().Html()
	if err != nil {
		return ""
	}
	text := inlineText(f95Label.ReplaceAllString(h, " "))
	// The convention is "Title [version] [developer]", and developers write the
	// version a dozen ways — "v0.7.2", "Ch.4 v1.5", "Season 2 Ep. 3", "Final". The
	// first bracket with a digit in it is the version; a bare word is only one if
	// it is one of the two that mean "done".
	for _, m := range f95BracketRe.FindAllStringSubmatch(text, -1) {
		candidate := strings.TrimSpace(m[1])
		lower := strings.ToLower(candidate)
		if hasDigit.MatchString(candidate) || lower == "final" || lower == "completed" {
			return stripVersionPrefix(candidate)
		}
	}
	return ""
}

var hasDigit = regexp.MustCompile(`\d`)

// f95FirstPost returns the HTML of the thread's first post body — where the
// download links always are. The post's <article> ends exactly at the end of that
// body; within it the bbWrapper is taken by position, because a non-greedy match
// on its closing tag stopped at the first nested spoiler div and lost the links.
func f95FirstPost(page string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return page
	}
	post := doc.Find("article.message--post").First()
	if post.Length() == 0 {
		post = doc.Find("article.message").First()
	}
	if post.Length() == 0 {
		return page
	}
	body := post.Find(".bbWrapper").First()
	if body.Length() == 0 {
		body = post
	}
	h, err := body.Html()
	if err != nil {
		return page
	}
	return h
}

// ParseF95Changelog finds the "Changelog" block in a post and keeps what follows,
// stopping at the next section rather than running on into the download list.
func ParseF95Changelog(post string) string {
	loc := changelogAt.FindStringIndex(post)
	if loc == nil {
		return ""
	}
	end := loc[0] + 16000
	if end > len(post) {
		end = len(post)
	}
	text := blockText(post[loc[0]:end])
	// Drop the heading itself, then cut at whatever section comes next.
	if i := strings.IndexByte(text, '\n'); i >= 0 {
		text = text[i+1:]
	} else {
		text = ""
	}
	if m := changelogEnd.FindStringIndex(text); m != nil && m[0] > 0 {
		text = text[:m[0]]
	}
	kept := []string{}
	for _, line := range strings.Split(text, "\n") {
		if placeholderLine.MatchString(strings.TrimSpace(line)) {
			continue
		}
		kept = append(kept, line)
	}
	body := strings.TrimSpace(manyLines.ReplaceAllString(strings.Join(kept, "\n"), "\n\n"))
	// What survives a changelog inside a collapsed spoiler is a stray word or two.
	// Empty reads as "none published", which is the truth.
	if len(body) < minChangelog {
		return ""
	}
	return clampText(body, 4000)
}

// The platform words developers actually type above a block of links.
var platformWords = []struct {
	pattern *regexp.Regexp
	name    string
}{
	{regexp.MustCompile(`(?i)\b(win(dows)?|pc)\b`), "Windows"},
	{regexp.MustCompile(`(?i)\b(mac|osx|os x|macos)\b`), "Mac"},
	{regexp.MustCompile(`(?i)\b(linux|tux)\b`), "Linux"},
	{regexp.MustCompile(`(?i)\b(android|apk)\b`), "Android"},
}

func platformIn(text string) string {
	for _, p := range platformWords {
		if p.pattern.MatchString(text) {
			return p.name
		}
	}
	return ""
}

// File hosts worth naming.
var knownHosts = []struct {
	pattern *regexp.Regexp
	name    string
}{
	{regexp.MustCompile(`(?i)(^|\.)mega\.(nz|co\.nz)$`), "MEGA"},
	{regexp.MustCompile(`(?i)(^|\.)gofile\.io$`), "Gofile"},
	{regexp.MustCompile(`(?i)(^|\.)pixeldrain\.com$`), "Pixeldrain"},
	{regexp.MustCompile(`(?i)(^|\.)workupload\.com$`), "Workupload"},
	{regexp.MustCompile(`(?i)(^|\.)mediafire\.com$`), "MediaFire"},
	{regexp.MustCompile(`(?i)(^|\.)1fichier\.com$`), "1fichier"},
	{regexp.MustCompile(`(?i)(^|\.)drive\.google\.com$`), "Google Drive"},
	{regexp.MustCompile(`(?i)(^|\.)dropbox\.com$`), "Dropbox"},
	{regexp.MustCompile(`(?i)(^|\.)mixdrop\.[a-z]+$`), "Mixdrop"},
	{regexp.MustCompile(`(?i)(^|\.)uploadhaven\.com$`), "UploadHaven"},
	{regexp.MustCompile(`(?i)(^|\.)itch\.io$`), "itch.io"},
	{regexp.MustCompile(`(?i)(^|\.)patreon\.com$`), "Patreon"},
	{regexp.MustCompile(`(?i)(^|\.)subscribestar\.`), "SubscribeStar"},
	{regexp.MustCompile(`(?i)(^|\.)f95zone\.to$`), "F95zone"},
}

func hostName(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || u.Hostname() == "" {
		return ""
	}
	for _, h := range knownHosts {
		if h.pattern.MatchString(u.Hostname()) {
			return h.name
		}
	}
	// An unrecognised host is still a download if the link sits in a download
	// block; name it after its domain rather than dropping it.
	return strings.TrimPrefix(strings.ToLower(u.Hostname()), "www.")
}

// ParseF95Sources lists every link in the first post that points at a file host,
// tagged with the platform heading it sits under. The platform is positional: the
// last platform word to appear before a link applies to it, which is exactly the
// convention the posts follow — "Win/Linux:" then links, then "Mac:" then more.
func ParseF95Sources(post, version string) []DownloadSource {
	out := []DownloadSource{}
	seen := map[string]bool{}
	cursor := 0
	platform := ""
	for _, loc := range anchorRe.FindAllStringSubmatchIndex(post, -1) {
		at := loc[0]
		if heading := platformIn(inlineText(post[cursor:at])); heading != "" {
			platform = heading
		}
		cursor = loc[1]
		attrs := post[loc[2]:loc[3]]
		inner := post[loc[4]:loc[5]]
		hm := hrefRe.FindStringSubmatch(attrs)
		if hm == nil {
			continue
		}
		href := strings.TrimSpace(hm[1])
		if !strings.HasPrefix(strings.ToLower(href), "http") {
			continue
		}
		// A link wrapped around a picture is a screenshot, not a build; forum
		// furniture is not a download either. Patreon and SubscribeStar stay — for a
		// lot of these games that genuinely is where the current build lives.
		if imgRe.MatchString(inner) || f95Furniture.MatchString(href) {
			continue
		}
		text := inlineText(inner)
		host := hostName(href)
		if host == "" {
			continue
		}
		// F95zone routes external hosts through its /masked/ redirector, so the URL
		// says nothing about where the file is — but the link text is the host's name.
		if f95Masked.MatchString(href) && text != "" {
			host = text
			if len(host) > 24 {
				host = host[:24]
			}
		}
		key := strings.ToLower(href)
		if seen[key] {
			continue
		}
		seen[key] = true
		plat := firstNonEmpty(platformIn(text), platform)
		out = append(out, DownloadSource{
			ID:       sourceID(href),
			Label:    strings.Join(nonEmpty(host, plat, version), " · "),
			Host:     host,
			URL:      href,
			Platform: plat,
			Version:  version,
			Kind:     "external",
		})
	}
	return out
}

func (c *Client) reportF95(ctx context.Context, threadURL string) (*Report, error) {
	page, err := c.fetchF95Thread(ctx, threadURL)
	if err != nil {
		return nil, err
	}
	post := f95FirstPost(page)
	version := ParseF95Version(page)
	return &Report{
		URL:       threadURL,
		Version:   version,
		Changelog: ParseF95Changelog(post),
		Sources:   ParseF95Sources(post, version),
		SignedIn:  c.SignedIn(F95),
	}, nil
}

/* --------------------------------------------------------------- the login */

// f95Visitor reads the account block in the page header and reports who, if
// anyone, the site thinks is reading. XenForo renders that one block two ways —
// `p-navgroup--guest` for a visitor, `p-navgroup--member` with a link to
// /account/ for a member — so it answers the question exactly, on any page.
//
// It used to look for a class named "p-navgroup-user-linkText", which XenForo has
// never emitted and f95zone.to's own stylesheets do not contain. The match
// therefore never fired, and neither did the "/logout/" fallback behind it: XF2
// fetches the visitor menu that holds the logout link only when it is opened, so
// it is not in the page either. Signing in then went like this — the password was
// accepted, the session cookie arrived, and the probe immediately reported a
// guest, so Account threw the fresh session away and answered "signed out" with
// no error anywhere. The Games tab did nothing at all, which is the hardest kind
// of bug to report.
func f95Visitor(page string) (user string, signedIn bool) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return "", false
	}
	if doc.Find(".p-navgroup--member, a.p-navgroup-link--user").Length() == 0 {
		return "", false
	}
	// The name lives in the link's own label. The avatar beside it is a span of
	// initials when the account has no picture, so it is removed rather than read
	// along with the name.
	link := doc.Find("a.p-navgroup-link--user").First().Clone()
	link.Find(".avatar").Remove()
	name := inlineText(link.Find(".p-navgroup-linkText").First().Text())
	if name == "" {
		name = inlineText(link.Text())
	}
	return name, true
}

// loginF95 performs the XenForo login: read the CSRF token off the login page,
// post the credentials, keep the session cookies. Its own jar over the shared
// transport, so cookies set across the login redirect are captured.
func (c *Client) loginF95(ctx context.Context) error {
	c.mu.Lock()
	user, pass := c.f95User, c.f95Pass
	c.mu.Unlock()
	if user == "" || pass == "" {
		return errors.New("no F95zone login on file")
	}
	jar, err := cookiejar.New(nil)
	if err != nil {
		return err
	}
	client := &http.Client{Transport: c.base.Transport, Timeout: c.base.Timeout, CheckRedirect: c.base.CheckRedirect, Jar: jar}

	// 1. The login page carries the CSRF token every XenForo form must echo back.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, f95Origin+"/login/", nil)
	if err != nil {
		return err
	}
	c.decorate(req, "", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	if err := c.throttle(ctx, req.URL.Host); err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("F95zone could not be reached: %w", err)
	}
	doc, err := goquery.NewDocumentFromReader(io.LimitReader(resp.Body, 4<<20))
	resp.Body.Close()
	if err != nil {
		return err
	}
	token, _ := doc.Find(`input[name="_xfToken"]`).First().Attr("value")
	if token == "" {
		token, _ = doc.Find("html").First().Attr("data-csrf")
	}
	if token == "" {
		return errors.New("F95zone did not serve its login form — it may be showing a browser check")
	}

	// 2. Post the credentials. remember=1 asks for the long-lived cookie.
	form := url.Values{
		"login":       {user},
		"password":    {pass},
		"remember":    {"1"},
		"_xfToken":    {token},
		"_xfRedirect": {f95Origin + "/"},
	}
	req, err = http.NewRequestWithContext(ctx, http.MethodPost, f95Origin+"/login/login", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	c.decorate(req, f95Origin+"/login/", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if err := c.throttle(ctx, req.URL.Host); err != nil {
		return err
	}
	resp, err = client.Do(req)
	if err != nil {
		return fmt.Errorf("F95zone could not be reached: %w", err)
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	landed := resp.Request.URL.String()
	resp.Body.Close()

	// XenForo sets xf_user on a successful sign-in; its absence means the
	// credentials were rejected, or a challenge got in the way.
	u, _ := url.Parse(f95Origin + "/")
	for _, ck := range jar.Cookies(u) {
		if ck.Name == "xf_user" && ck.Value != "" {
			c.setJar(F95, jar)
			return nil
		}
	}
	// Two-step is not something a password can get past, and saying "check your
	// password" to someone whose password was right is the least useful thing we
	// could do — so it is named, along with the way in.
	if strings.Contains(landed, "two-step") || strings.Contains(string(body), "two-step") {
		return errors.New("that account has two-step verification, which a password alone cannot pass — sign in with the xf_user cookie instead")
	}
	// XenForo prints exactly what was wrong ("The requested user X could not be
	// found", "Incorrect password"). Its sentence beats any guess of ours.
	if said := f95LoginError(string(body)); said != "" {
		return errors.New("F95zone says: " + said)
	}
	return errors.New("F95zone would not sign in, and did not say why — check the username and password")
}

// f95LoginError lifts the error XenForo prints above the login form.
func f95LoginError(page string) string {
	m := f95BlockError.FindStringSubmatch(page)
	if m == nil {
		return ""
	}
	said := inlineText(m[1])
	// The block also carries the form's own furniture when the markup shifts;
	// a paragraph is an explanation, a page is not.
	if len(said) > 300 {
		said = clampText(said, 300)
	}
	return said
}

var f95BlockError = regexp.MustCompile(`(?is)<div[^>]*class="[^"]*blockMessage--error[^"]*"[^>]*>(.*?)</div>`)

// ItemFromURL reads a game page by address and returns it as a result, for adding
// a game whose page the user pasted rather than found in a listing.
func (c *Client) ItemFromURL(ctx context.Context, rawURL string) (Item, error) {
	site, _, ok := RemoteFromURL(rawURL)
	if !ok {
		return Item{}, errors.New("that is not an itch.io or F95zone game page")
	}
	if !c.SignedIn(site) && !(site == F95 && c.renewF95(ctx) == nil) {
		return Item{}, ErrSignedOut
	}
	if site == F95 {
		return c.f95ItemFromURL(ctx, rawURL)
	}
	return c.itchItemFromURL(ctx, rawURL)
}
