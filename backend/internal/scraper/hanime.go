package scraper

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/hanime"
	"github.com/youruser/oppailib/internal/models"
)

type hanimeAPI interface {
	Find(context.Context, string, string) (*hanime.Video, error)
	DownloadURL(context.Context, string, hanime.Video) (string, error)
}

// HanimeParser imports a Hanime video-page URL through the site's public guest
// catalogue and guest download-link flow. Hanime does not require an account for
// this path, so there are intentionally no credentials to configure.
type HanimeParser struct {
	mu  sync.Mutex
	api hanimeAPI
}

func (*HanimeParser) Name() string { return "hanime" }

func (*HanimeParser) Match(u *url.URL) bool {
	host := strings.ToLower(u.Hostname())
	return (host == "hanime.tv" || host == "www.hanime.tv") && strings.HasPrefix(strings.Trim(u.Path, "/"), "videos/hentai/")
}

// Parse only satisfies Parser; Engine always takes ScrapeDirect for this parser.
func (*HanimeParser) Parse(*goquery.Document, *url.URL) (*models.ScrapeResult, error) {
	return nil, fmt.Errorf("hanime requires its guest API")
}

func (p *HanimeParser) ScrapeDirect(ctx context.Context, client *http.Client, userAgent string, u *url.URL) (*models.ScrapeResult, error) {
	slug, ok := strings.CutPrefix(strings.Trim(u.Path, "/"), "videos/hentai/")
	if !ok || slug == "" || strings.Contains(slug, "/") {
		return nil, fmt.Errorf("hanime: invalid video URL")
	}
	var err error
	slug, err = url.PathUnescape(slug)
	if err != nil {
		return nil, fmt.Errorf("hanime: invalid video URL")
	}

	api := p.client(client)
	video, err := api.Find(ctx, userAgent, slug)
	if err != nil {
		return nil, err
	}
	mediaURL, err := api.DownloadURL(ctx, userAgent, *video)
	if err != nil {
		return nil, err
	}
	tags := append([]string(nil), video.Tags...)
	categorized := []models.ScrapedTag{}
	if brand := strings.TrimSpace(video.Brand); brand != "" {
		tags = appendUniqueFold(tags, brand)
		categorized = append(categorized, models.ScrapedTag{Name: brand, Category: "studio"})
	}
	return &models.ScrapeResult{
		Title: video.Name, Description: hanimePlainText(video.Description), Tags: tags,
		CategorizedTags: categorized, MediaURLs: []string{mediaURL}, Kind: string(models.KindVideo),
		Cover: video.PosterURL,
	}, nil
}

func (p *HanimeParser) client(base *http.Client) hanimeAPI {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.api == nil {
		p.api = hanime.New(base, hanime.Options{})
	}
	return p.api
}

func hanimePlainText(markup string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader("<body>" + markup + "</body>"))
	if err != nil {
		return strings.TrimSpace(markup)
	}
	return strings.Join(strings.Fields(doc.Text()), " ")
}

func appendUniqueFold(values []string, value string) []string {
	for _, existing := range values {
		if strings.EqualFold(strings.TrimSpace(existing), strings.TrimSpace(value)) {
			return values
		}
	}
	return append(values, value)
}
