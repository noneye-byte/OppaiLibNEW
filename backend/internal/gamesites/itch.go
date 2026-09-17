package gamesites

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

// itch.io has no public browse API, so its listing and game pages are read as the
// browser sees them. The browse URLs answer `{content: "<cells…>"}` when asked for
// JSON and search serves a whole page; both carry the same `.game_cell` markup.

const itchOrigin = "https://itch.io"

var (
	itchImage = regexp.MustCompile(`(?i)^https://img\.itch\.zone/`)
	// itch.io has no adult flag in its data — it renders one. A gated page carries
	// the interstitial's markup; a listing cell carries nothing, so the badge is
	// only picked up once the page has been read.
	itchAdult   = regexp.MustCompile(`(?i)(?:content_warning|nsfw_warning|adult_content)`)
	itchRating  = regexp.MustCompile(`(?i)itemprop="ratingValue"[^>]*\scontent="([\d.]+)"`)
	itchDescEnd = regexp.MustCompile(`(?i)<div[^>]*\sclass="[^"]*\bformatted_description\b[^"]*"[^>]*>([\s\S]*?)<div[^>]*\bmore_information_toggle\b`)
)

// maxDescription is where a description stops being a description.
const maxDescription = 4000

// itchCells returns the fragment holding the listing cells, whichever way itch
// wrapped it.
func itchCells(body string) string {
	if !strings.HasPrefix(strings.TrimSpace(body), "{") {
		return body
	}
	var parsed struct {
		Content string `json:"content"`
	}
	if err := json.Unmarshal([]byte(body), &parsed); err != nil {
		return body
	}
	return parsed.Content
}

// ParseItchListing turns a browse response or a search page into items.
func ParseItchListing(body string) []Item {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(itchCells(body)))
	if err != nil {
		return nil
	}
	items := []Item{}
	doc.Find("div[data-game_id]").Each(func(_ int, cell *goquery.Selection) {
		id, _ := cell.Attr("data-game_id")
		anchor := cell.Find(".game_title a").First()
		href, _ := anchor.Attr("href")
		title := inlineText(anchor.Text())
		if id == "" || href == "" || title == "" {
			return
		}
		img := cell.Find("img").First()
		thumb, _ := img.Attr("data-lazy_src")
		if !itchImage.MatchString(thumb) {
			thumb, _ = img.Attr("src")
		}
		if !itchImage.MatchString(thumb) {
			thumb = ""
		}
		genre := inlineText(cell.Find(".game_genre").First().Text())
		platform := inlineText(cell.Find(".game_platform").First().Text())
		cellHTML, _ := goquery.OuterHtml(cell)
		item := Item{
			Site:        Itch,
			ID:          id,
			Title:       title,
			Developer:   inlineText(cell.Find(".game_author").First().Text()),
			Description: inlineText(cell.Find(".game_text").First().Text()),
			URL:         href,
			Thumbnail:   thumb,
			Images:      []string{},
			Tags:        []string{},
			WebPlayable: strings.Contains(strings.ToLower(platform), "play in browser"),
			NSFW:        itchAdult.MatchString(cellHTML),
		}
		if thumb != "" {
			item.Images = []string{thumb}
		}
		if genre != "" {
			item.Tags = normalizeTags([]string{genre}, 24)
		}
		items = append(items, item)
	})
	return items
}

// itchInfoRows reads the "More information" table as a lowercase-keyed lookup of
// the cells' inner HTML.
func itchInfoRows(doc *goquery.Document) map[string]*goquery.Selection {
	rows := map[string]*goquery.Selection{}
	doc.Find(".game_info_panel_widget table tr").Each(func(_ int, tr *goquery.Selection) {
		cells := tr.ChildrenFiltered("td")
		if cells.Length() < 2 {
			return
		}
		rows[strings.ToLower(inlineText(cells.First().Text()))] = cells.Eq(1)
	})
	return rows
}

func linkTexts(sel *goquery.Selection) []string {
	out := []string{}
	if sel == nil {
		return out
	}
	sel.Find("a").Each(func(_ int, a *goquery.Selection) {
		if t := inlineText(a.Text()); t != "" {
			out = append(out, t)
		}
	})
	return out
}

func metaContent(doc *goquery.Document, property string) string {
	if v, ok := doc.Find(`meta[property="` + property + `"]`).First().Attr("content"); ok {
		return strings.TrimSpace(v)
	}
	if v, ok := doc.Find(`meta[name="` + property + `"]`).First().Attr("content"); ok {
		return strings.TrimSpace(v)
	}
	return ""
}

// ParseItchDetail fills a listing item in from the game's own page: the long
// description, the real tag list, the screenshots and the rating.
func ParseItchDetail(page string, item Item) Item {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return item
	}
	rows := itchInfoRows(doc)
	tags := append(linkTexts(rows["genre"]), linkTexts(rows["tags"])...)
	tags = normalizeTags(tags, 24)

	described := ""
	if m := itchDescEnd.FindStringSubmatch(page); m != nil {
		described = blockText(m[1])
	}
	if described == "" {
		if h, err := doc.Find(".formatted_description").First().Html(); err == nil {
			described = blockText(h)
		}
	}
	description := clampText(firstNonEmpty(described, inlineText(metaContent(doc, "og:description")), item.Description), maxDescription)

	cover := metaContent(doc, "og:image")
	shots := []string{}
	doc.Find(".screenshot_list a[href]").Each(func(_ int, a *goquery.Selection) {
		if href, _ := a.Attr("href"); itchImage.MatchString(href) {
			shots = append(shots, href)
		}
	})

	out := item
	if dev := linkTexts(rows["author"]); len(dev) > 0 {
		out.Developer = dev[0]
	}
	out.Description = description
	if len(tags) > 0 {
		out.Tags = tags
	}
	if m := itchRating.FindStringSubmatch(page); m != nil {
		if r, err := strconv.ParseFloat(m[1], 64); err == nil {
			out.Rating = r
		}
	}
	out.NSFW = item.NSFW || itchAdult.MatchString(page)
	if cover != "" {
		out.Thumbnail = cover
	}
	// The listing thumbnail is a 315x250 crop of the cover, so it is only worth
	// keeping when the page gave no full-size one to replace it with.
	out.Images = dedupe(append([]string{firstNonEmpty(cover, item.Thumbnail)}, shots...))
	return out
}

// browseItch reads one page of itch.io. Adult games stay out of the listings
// unless asked for: that is a `nsfw` path segment on the browse listing, and on
// search it is the account's own content preference — which is one reason the
// account is required.
func (c *Client) browseItch(ctx context.Context, query, sort string, page int, nsfw bool) (*Listing, error) {
	var target string
	if query != "" {
		target = itchOrigin + "/search?" + url.Values{"q": {query}, "page": {strconv.Itoa(page)}}.Encode()
	} else {
		seg := ""
		if nsfw {
			seg = "nsfw/"
		}
		target = itchOrigin + "/games/" + seg + sort + "?" + url.Values{"page": {strconv.Itoa(page)}, "format": {"json"}}.Encode()
	}
	body, err := c.fetch(ctx, Itch, target, itchOrigin+"/")
	if err != nil {
		return nil, err
	}
	items := ParseItchListing(body)
	// itch.io's search answers every page number with the same batch, so only the
	// browse listings page; those report no count, so a run ends on an empty page.
	return &Listing{Items: items, Page: page, HasMore: query == "" && len(items) > 0}, nil
}

func (c *Client) detailItch(ctx context.Context, item Item) (Item, error) {
	page, err := c.fetch(ctx, Itch, item.URL, itchOrigin+"/")
	if err != nil {
		return item, err
	}
	return ParseItchDetail(page, item), nil
}

// itch.io marks each upload's platforms with an icon class.
var itchPlatformIcons = []struct {
	pattern *regexp.Regexp
	name    string
}{
	{regexp.MustCompile(`(?i)icon-windows8?`), "Windows"},
	{regexp.MustCompile(`(?i)icon-apple`), "Mac"},
	{regexp.MustCompile(`(?i)icon-tux|icon-linux`), "Linux"},
	{regexp.MustCompile(`(?i)icon-android`), "Android"},
}

func sourceID(u string) string {
	sum := sha1.Sum([]byte(u))
	return hex.EncodeToString(sum[:])[:12]
}

// ParseItchSources lists one source per upload on the page. itch only hands out a
// real file URL against a session, so every row points back at the page and is
// external: the browser opens it and the user clicks the build they want.
func ParseItchSources(page, pageURL, version string) []DownloadSource {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return nil
	}
	out := []DownloadSource{}
	doc.Find("div.upload").Each(func(i int, up *goquery.Selection) {
		name := inlineText(up.Find("strong.name").First().Text())
		if name == "" {
			name, _ = up.Find("strong[title]").First().Attr("title")
			name = inlineText(name)
		}
		if name == "" {
			return
		}
		size := inlineText(up.Find(".file_size").First().Text())
		h, _ := goquery.OuterHtml(up)
		platform := ""
		for _, p := range itchPlatformIcons {
			if p.pattern.MatchString(h) {
				platform = p.name
				break
			}
		}
		buildVersion := firstNonEmpty(inlineText(up.Find(".version_name").First().Text()), version)
		label := strings.Join(nonEmpty(name, platform, size), " · ")
		out = append(out, DownloadSource{
			ID:       sourceID(pageURL) + "-" + strconv.Itoa(i),
			Label:    label,
			Host:     "itch.io",
			URL:      pageURL,
			Platform: platform,
			Version:  buildVersion,
			Size:     size,
			Kind:     "external",
		})
	})
	return out
}

func nonEmpty(vals ...string) []string {
	out := []string{}
	for _, v := range vals {
		if v != "" {
			out = append(out, v)
		}
	}
	return out
}

// ParseItchVersion reads what itch has instead of a version field: a stated
// version when the developer filled one in, else the page's last-updated date
// (or its published date, for a game that has never been updated).
func ParseItchVersion(page string) (stated, updated string) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return "", ""
	}
	rows := itchInfoRows(doc)
	if r := rows["version"]; r != nil {
		stated = inlineText(r.Text())
	}
	for _, key := range []string{"updated", "published"} {
		if r := rows[key]; r != nil && updated == "" {
			// The cell shows a relative date and carries the real one in a title.
			if abs, ok := r.Find("abbr[title]").First().Attr("title"); ok && abs != "" {
				updated = inlineText(abs)
			} else {
				updated = inlineText(r.Text())
			}
		}
	}
	return stated, updated
}

// ParseItchDevlog reads the newest devlog post's title and excerpt — how itch
// developers actually announce a build.
func ParseItchDevlog(page string) (title, changelog string) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return "", ""
	}
	post := doc.Find(".post_grid_item").First()
	if post.Length() == 0 {
		post = doc.Selection
	}
	title = inlineText(post.Find("h2").First().Text())
	excerpt := ""
	if h, err := post.Find(".post_excerpt").First().Html(); err == nil {
		excerpt = blockText(h)
	}
	return title, clampText(strings.TrimSpace(strings.Join(nonEmpty(title, excerpt), "\n\n")), 4000)
}

func (c *Client) reportItch(ctx context.Context, pageURL string) (*Report, error) {
	page, err := c.fetch(ctx, Itch, pageURL, itchOrigin+"/")
	if err != nil {
		return nil, err
	}
	stated, updated := ParseItchVersion(page)
	devlogTitle, changelog := "", ""
	if devlog, err := c.fetch(ctx, Itch, strings.TrimRight(pageURL, "/")+"/devlog", pageURL); err == nil {
		devlogTitle, changelog = ParseItchDevlog(devlog)
	}
	version := firstNonEmpty(stated, devlogTitle, updated)
	sources := ParseItchSources(page, pageURL, version)
	if len(sources) == 0 {
		// Nothing structured on the page — a paid game, or a layout we do not know.
		// The page itself is still a perfectly good place to send the browser.
		sources = append(sources, DownloadSource{
			ID: sourceID(pageURL), Label: "itch.io", Host: "itch.io", URL: pageURL, Version: version, Kind: "external",
		})
	}
	return &Report{URL: pageURL, Version: version, Changelog: changelog, Sources: sources, SignedIn: c.SignedIn(Itch)}, nil
}

// itchID extracts the numeric game id a page declares about itself, for pages
// reached by URL rather than from a listing.
var itchGameID = regexp.MustCompile(`(?i)content="games/(\d+)"\s+name="itch:path"|name="itch:path"\s+content="games/(\d+)"|data-game_id="(\d+)"|/games-like/(\d+)/`)

// ItchIDFromPage finds the game id a page carries — itch declares it in an
// `itch:path` meta tag — or "".
func ItchIDFromPage(page string) string {
	if m := itchGameID.FindStringSubmatch(page); m != nil {
		return firstNonEmpty(m[1], m[2], m[3], m[4])
	}
	return ""
}

func (c *Client) itchItemFromURL(ctx context.Context, pageURL string) (Item, error) {
	page, err := c.fetch(ctx, Itch, pageURL, itchOrigin+"/")
	if err != nil {
		return Item{}, err
	}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(page))
	if err != nil {
		return Item{}, err
	}
	title := firstNonEmpty(inlineText(doc.Find("h1.game_title").First().Text()), inlineText(metaContent(doc, "og:title")))
	if title == "" {
		return Item{}, fmt.Errorf("no game on that page")
	}
	item := Item{Site: Itch, ID: ItchIDFromPage(page), Title: title, URL: pageURL, Images: []string{}, Tags: []string{}}
	return ParseItchDetail(page, item), nil
}
