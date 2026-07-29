package scraper

import (
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/models"
)

// ItchParser extracts game metadata from an itch.io project page: cover art,
// description, screenshots, and tags. It sets Kind=game and points DownloadURL at
// the itch page (itch gates the actual file behind an expiring, CSRF-protected
// AJAX call, so we surface the page as the place to get it rather than fetching
// the binary). Generic game sites fall back to the OpenGraph parser.
type ItchParser struct{}

func (ItchParser) Name() string { return "itch.io" }

func (ItchParser) Match(u *url.URL) bool {
	host := strings.ToLower(u.Hostname())
	return host == "itch.io" || strings.HasSuffix(host, ".itch.io")
}

func (ItchParser) Parse(doc *goquery.Document, u *url.URL) (*models.ScrapeResult, error) {
	res := &models.ScrapeResult{Kind: string(models.KindGame)}

	res.Title = firstNonEmpty(
		metaProp(doc, "og:title"),
		strings.TrimSpace(doc.Find("h1.game_title").First().Text()),
		strings.TrimSpace(doc.Find("title").First().Text()),
	)
	res.Description = firstNonEmpty(
		metaProp(doc, "og:description"),
		metaName(doc, "description"),
	)

	// Cover art: the OpenGraph image is itch's game thumbnail/banner.
	res.Cover = firstNonEmpty(
		metaProp(doc, "og:image"),
		metaName(doc, "twitter:image"),
	)
	if res.Cover != "" {
		res.MediaURLs = append(res.MediaURLs, res.Cover)
	}

	// Screenshots: the lightbox anchors hold full-res images; fall back to the
	// <img> sources when the markup differs.
	seen := map[string]bool{}
	addShot := func(v string) {
		v = strings.TrimSpace(v)
		if v == "" || strings.HasPrefix(v, "data:") || seen[v] {
			return
		}
		seen[v] = true
		res.Screenshots = append(res.Screenshots, v)
	}
	doc.Find(".screenshot_list a[href]").Each(func(_ int, s *goquery.Selection) {
		if href, ok := s.Attr("href"); ok {
			addShot(href)
		}
	})
	if len(res.Screenshots) == 0 {
		doc.Find(".screenshot_list img, .game_screenshots img").Each(func(_ int, s *goquery.Selection) {
			for _, attr := range []string{"data-lightbox_src", "src"} {
				if v, ok := s.Attr(attr); ok && v != "" {
					addShot(v)
					break
				}
			}
		})
	}

	// Tags / genre live in the info panel as links to itch tag pages.
	tagSeen := map[string]bool{}
	doc.Find(`.game_info_panel_widget a[href*="/tag-"], .game_info_panel_widget a[href*="/games/tag-"]`).
		Each(func(_ int, s *goquery.Selection) {
			t := strings.TrimSpace(s.Text())
			if t != "" && !tagSeen[strings.ToLower(t)] {
				tagSeen[strings.ToLower(t)] = true
				res.Tags = append(res.Tags, t)
			}
		})

	// Platforms are filed as their own tag category rather than dumped in with the
	// genre tags, so a client can actually ask "does this run on Android?" instead
	// of string-matching a general tag that might just be about the subject matter.
	for _, p := range itchPlatforms(doc) {
		res.CategorizedTags = append(res.CategorizedTags, models.ScrapedTag{Name: p, Category: "platform"})
		res.Tags = append(res.Tags, p)
	}

	// itch hosts the download itself; the page is the place to get it. If the
	// project links out to an external host, prefer that.
	res.DownloadURL = u.String()
	if href, ok := doc.Find(`.buy_row a.button[href], a.external_download[href]`).First().Attr("href"); ok {
		if h := strings.TrimSpace(href); strings.HasPrefix(h, "http") {
			res.DownloadURL = h
		}
	}

	return res, nil
}

// itchPlatformIcons maps itch's per-upload platform glyphs onto our canonical
// names. itch labels Linux uploads with a Tux icon and browser-playable games
// with a globe, so neither is guessable from the class name alone.
var itchPlatformIcons = map[string]string{
	"icon-windows": "windows",
	"icon-apple":   "macos",
	"icon-tux":     "linux",
	"icon-android": "android",
	"icon-globe":   "web",
}

// itchPlatforms reads the platforms a project publishes for, canonicalized and
// deduped, in no particular order.
//
// Two places carry the fact and neither is reliable alone: the info panel lists
// platforms as links, but only for downloadable projects — a browser-playable game
// has no such row. The download/upload rows carry a platform icon each, but are
// absent when the project is gated behind a purchase. So read both and union them.
func itchPlatforms(doc *goquery.Document) []string {
	seen := map[string]bool{}
	var out []string
	add := func(p string) {
		if p == "" || seen[p] {
			return
		}
		seen[p] = true
		out = append(out, p)
	}

	// Info panel: <a href="https://itch.io/games/platform-android">Android</a>
	doc.Find(`a[href*="/platform-"]`).Each(func(_ int, s *goquery.Selection) {
		href, ok := s.Attr("href")
		if !ok {
			return
		}
		i := strings.LastIndex(href, "/platform-")
		if i < 0 {
			return
		}
		add(canonicalPlatform(strings.Trim(href[i+len("/platform-"):], "/")))
	})

	// Upload rows: <span class="icon icon-android"></span>
	doc.Find(`span[class*="icon-"]`).Each(func(_ int, s *goquery.Selection) {
		class, ok := s.Attr("class")
		if !ok {
			return
		}
		for _, c := range strings.Fields(class) {
			if p, hit := itchPlatformIcons[c]; hit {
				add(p)
			}
		}
	})

	return out
}

// canonicalPlatform folds itch's several spellings of a platform onto one name.
func canonicalPlatform(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "windows":
		return "windows"
	case "osx", "macos", "mac":
		return "macos"
	case "linux":
		return "linux"
	case "android":
		return "android"
	case "ios":
		return "ios"
	case "web", "html5", "flash", "unity", "java":
		return "web"
	default:
		return ""
	}
}
