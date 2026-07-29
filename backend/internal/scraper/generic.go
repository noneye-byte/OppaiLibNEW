package scraper

import (
	"net/url"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/models"
)

// GenericParser extracts metadata from OpenGraph and standard <meta> tags. It
// matches any URL and serves as the fallback + the reference for custom parsers.
type GenericParser struct{}

func (GenericParser) Name() string          { return "generic-opengraph" }
func (GenericParser) Match(*url.URL) bool    { return true }

func (GenericParser) Parse(doc *goquery.Document, u *url.URL) (*models.ScrapeResult, error) {
	res := &models.ScrapeResult{Kind: string(models.KindImage)}

	res.Title = firstNonEmpty(
		metaProp(doc, "og:title"),
		metaName(doc, "twitter:title"),
		strings.TrimSpace(doc.Find("title").First().Text()),
	)
	res.Description = firstNonEmpty(
		metaProp(doc, "og:description"),
		metaName(doc, "description"),
	)

	// Comics are decided before any other media extraction. A comic page almost
	// always carries an og:image cover, which would satisfy the scan below and
	// leave every actual page unread — so ask first, and take the whole ordered
	// run of pages when the answer is yes.
	if pages, ok := detectComic(doc, u); ok {
		res.Kind = string(models.KindComic)
		res.MediaURLs = pages
		res.Tags = metaTags(doc)
		return res, nil
	}

	// Media: prefer video (og / twitter player), then images, then a raw scan
	// of the page's own <img>/<video> tags for sites that ship no card metadata.
	seen := map[string]bool{}
	add := func(u string) {
		u = strings.TrimSpace(u)
		if u == "" || strings.HasPrefix(u, "data:") || seen[u] {
			return
		}
		seen[u] = true
		res.MediaURLs = append(res.MediaURLs, u)
	}

	for _, prop := range []string{"og:video:secure_url", "og:video:url", "og:video"} {
		if v := metaProp(doc, prop); v != "" {
			add(v)
			res.Kind = string(models.KindVideo)
		}
	}
	if v := firstNonEmpty(metaName(doc, "twitter:player:stream"), metaName(doc, "twitter:player")); v != "" {
		add(v)
		res.Kind = string(models.KindVideo)
	}

	doc.Find(`meta[property="og:image"], meta[property="og:image:secure_url"]`).Each(func(_ int, s *goquery.Selection) {
		if c, ok := s.Attr("content"); ok {
			add(c)
		}
	})
	if len(res.MediaURLs) == 0 {
		add(firstNonEmpty(
			metaName(doc, "twitter:image"),
			metaName(doc, "twitter:image:src"),
			linkRel(doc, "image_src"),
		))
	}

	// Last resort: pull media straight from the DOM. Helps the "many others"
	// case — plain image/video pages with no social-card metadata at all.
	if len(res.MediaURLs) == 0 {
		doc.Find("video source[src], video[src]").Each(func(_ int, s *goquery.Selection) {
			if v, ok := s.Attr("src"); ok {
				add(v)
				res.Kind = string(models.KindVideo)
			}
		})
	}
	if len(res.MediaURLs) == 0 {
		doc.Find("img").Each(func(_ int, s *goquery.Selection) {
			if !looksLikeContentImage(s) {
				return
			}
			// Prefer the full-res source when the page lazy-loads.
			for _, attr := range []string{"data-src", "data-original", "src"} {
				if v, ok := s.Attr(attr); ok && v != "" {
					add(v)
					break
				}
			}
		})
	}

	res.Tags = metaTags(doc)

	return res, nil
}

// metaTags pulls tags from meta keywords / article:tag.
func metaTags(doc *goquery.Document) []string {
	var tags []string
	if kw := metaName(doc, "keywords"); kw != "" {
		for _, t := range strings.Split(kw, ",") {
			if t = strings.TrimSpace(t); t != "" {
				tags = append(tags, t)
			}
		}
	}
	doc.Find(`meta[property="article:tag"]`).Each(func(_ int, s *goquery.Selection) {
		if c, ok := s.Attr("content"); ok && c != "" {
			tags = append(tags, strings.TrimSpace(c))
		}
	})
	return tags
}

func metaProp(doc *goquery.Document, prop string) string {
	c, _ := doc.Find(`meta[property="` + prop + `"]`).First().Attr("content")
	return strings.TrimSpace(c)
}

func metaName(doc *goquery.Document, name string) string {
	c, _ := doc.Find(`meta[name="` + name + `"]`).First().Attr("content")
	return strings.TrimSpace(c)
}

func linkRel(doc *goquery.Document, rel string) string {
	c, _ := doc.Find(`link[rel="` + rel + `"]`).First().Attr("href")
	return strings.TrimSpace(c)
}

// looksLikeContentImage filters out the obvious chrome (icons, sprites, logos,
// tracking pixels, SVGs) so a DOM scan surfaces actual content images.
func looksLikeContentImage(s *goquery.Selection) bool {
	src, _ := s.Attr("src")
	if v, ok := s.Attr("data-src"); ok && v != "" {
		src = v
	}
	src = strings.ToLower(src)
	if src == "" || strings.HasPrefix(src, "data:") || strings.HasSuffix(src, ".svg") {
		return false
	}
	for _, junk := range []string{"sprite", "icon", "logo", "avatar", "emoji", "pixel", "spacer", "blank"} {
		if strings.Contains(src, junk) {
			return false
		}
	}
	// Drop tiny images when the page declares their size.
	if w, ok := s.Attr("width"); ok {
		if n, err := strconv.Atoi(strings.TrimSpace(w)); err == nil && n > 0 && n < 100 {
			return false
		}
	}
	return true
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
