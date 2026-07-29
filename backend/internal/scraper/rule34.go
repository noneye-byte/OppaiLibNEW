package scraper

import (
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/models"
)

// Rule34Parser handles individual public post pages. Rule34 puts videos in an
// og:image tag as well as in <video><source>; the generic parser sees that image tag
// first and labels the MP4 as an image. Prefer the real player/image elements and
// derive the kind from their URL.
type Rule34Parser struct{}

func (*Rule34Parser) Name() string { return "rule34" }
func (*Rule34Parser) Match(u *url.URL) bool {
	host := strings.ToLower(u.Hostname())
	isHost := host == "rule34.xxx" || strings.HasSuffix(host, ".rule34.xxx")
	return isHost && u.Query().Get("page") == "post" && u.Query().Get("s") == "view" && u.Query().Get("id") != ""
}

func (*Rule34Parser) Parse(doc *goquery.Document, u *url.URL) (*models.ScrapeResult, error) {
	media := scrapeAttr(doc, "video source[src]", "src")
	if media == "" {
		media = scrapeAttr(doc, "img#image[src]", "src")
	}
	if media == "" {
		media = scrapeAttr(doc, `meta[property="og:image"]`, "content")
	}
	if media == "" {
		return nil, fmt.Errorf("rule34: no media found on post")
	}
	kind := mediaKindFromPath(path.Clean(mediaURLPath(media)))
	if kind == "" {
		kind = models.KindImage
	}

	tags := strings.Fields(strings.TrimSpace(doc.Find("textarea#tags").First().Text()))
	if len(tags) == 0 {
		if raw, ok := doc.Find(`meta[name="keywords"]`).First().Attr("content"); ok {
			for _, tag := range strings.Split(raw, ",") {
				if tag = strings.TrimSpace(tag); tag != "" && !strings.EqualFold(tag, "Rule 34") && !strings.EqualFold(tag, "imageboard") {
					tags = append(tags, strings.ReplaceAll(tag, " ", "_"))
				}
			}
		}
	}
	id := u.Query().Get("id")
	titleWords := tags
	if len(titleWords) > 6 {
		titleWords = titleWords[:6]
	}
	title := strings.Join(titleWords, " ")
	if title == "" {
		title = "Rule34 post " + id
	}
	return &models.ScrapeResult{
		Kind: string(kind), Title: title, Tags: tags, MediaURLs: []string{media},
	}, nil
}

func scrapeAttr(doc *goquery.Document, selector, attr string) string {
	v, _ := doc.Find(selector).First().Attr(attr)
	return strings.TrimSpace(v)
}

func mediaURLPath(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	return u.Path
}
