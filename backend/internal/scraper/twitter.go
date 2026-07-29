package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/models"
)

// TwitterParser recovers the real media from an x.com / twitter.com status.
//
// x.com now serves scrapers a login wall (and a generic default OpenGraph image),
// so the generic parser only ever gets that placeholder. Instead we call a "fix"
// embed service's JSON API — fxtwitter, with vxtwitter as a fallback — which
// returns the actual pbs.twimg.com / video.twimg.com URLs. The media bytes still
// download from Twitter's own CDN; only the tweet id is sent to the fix service.
//
// It implements DirectParser so the engine skips its HTML fetch and lets us hit
// the API directly.
type TwitterParser struct{}

func (TwitterParser) Name() string { return "twitter-x" }

func (TwitterParser) Match(u *url.URL) bool {
	switch strings.ToLower(u.Hostname()) {
	case "x.com", "www.x.com",
		"twitter.com", "www.twitter.com", "mobile.twitter.com",
		"fixupx.com", "fxtwitter.com", "vxtwitter.com":
		return true
	}
	return false
}

// Parse should never run: Match-ing URLs go through ScrapeDirect. Kept so the
// type satisfies Parser and is registerable as a site parser.
func (TwitterParser) Parse(*goquery.Document, *url.URL) (*models.ScrapeResult, error) {
	return nil, fmt.Errorf("twitter: handled via API, not HTML")
}

// statusID pulls the numeric tweet id out of a status URL path, e.g.
// /user/status/123456, /i/web/status/123456, /user/status/123/photo/1.
func statusID(p string) string {
	parts := strings.Split(p, "/")
	for i, seg := range parts {
		if (seg == "status" || seg == "statuses") && i+1 < len(parts) {
			id := parts[i+1]
			if id != "" && isAllDigits(id) {
				return id
			}
		}
	}
	return ""
}

func isAllDigits(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return len(s) > 0
}

func (t TwitterParser) ScrapeDirect(ctx context.Context, client *http.Client, ua string, u *url.URL) (*models.ScrapeResult, error) {
	id := statusID(u.Path)
	if id == "" {
		return nil, fmt.Errorf("twitter: no status id in %s", u.Path)
	}
	// Try fxtwitter first, then vxtwitter.
	if res, err := t.viaFx(ctx, client, ua, id); err == nil && len(res.MediaURLs) > 0 {
		return res, nil
	}
	res, err := t.viaVx(ctx, client, ua, id)
	if err != nil {
		return nil, err
	}
	if len(res.MediaURLs) == 0 {
		return nil, fmt.Errorf("twitter: no media found on status %s", id)
	}
	return res, nil
}

func getJSON(ctx context.Context, client *http.Client, ua, endpoint string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("status %d", resp.StatusCode)
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 4<<20)).Decode(out)
}

// --- fxtwitter (api.fxtwitter.com/status/{id}) ---------------------------------

type fxResponse struct {
	Tweet struct {
		Text   string `json:"text"`
		Author struct {
			Name       string `json:"name"`
			ScreenName string `json:"screen_name"`
		} `json:"author"`
		Media struct {
			Photos []struct {
				URL string `json:"url"`
			} `json:"photos"`
			Videos []struct {
				URL string `json:"url"`
			} `json:"videos"`
		} `json:"media"`
	} `json:"tweet"`
}

func (TwitterParser) viaFx(ctx context.Context, client *http.Client, ua, id string) (*models.ScrapeResult, error) {
	var fx fxResponse
	if err := getJSON(ctx, client, ua, "https://api.fxtwitter.com/status/"+id, &fx); err != nil {
		return nil, err
	}
	res := &models.ScrapeResult{Kind: string(models.KindImage)}
	for _, p := range fx.Tweet.Media.Photos {
		if p.URL != "" {
			res.MediaURLs = append(res.MediaURLs, p.URL)
		}
	}
	for _, v := range fx.Tweet.Media.Videos {
		if v.URL != "" {
			res.MediaURLs = append(res.MediaURLs, v.URL)
			res.Kind = string(models.KindVideo)
		}
	}
	res.Title = tweetTitle(fx.Tweet.Author.Name, fx.Tweet.Author.ScreenName, fx.Tweet.Text)
	res.Description = fx.Tweet.Text
	return res, nil
}

// --- vxtwitter (api.vxtwitter.com/Twitter/status/{id}) -------------------------

type vxResponse struct {
	Text           string   `json:"text"`
	UserName       string   `json:"user_name"`
	UserScreenName string   `json:"user_screen_name"`
	MediaURLs      []string `json:"mediaURLs"`
	MediaExtended  []struct {
		Type string `json:"type"` // "image" | "video" | "gif"
		URL  string `json:"url"`
	} `json:"media_extended"`
}

func (TwitterParser) viaVx(ctx context.Context, client *http.Client, ua, id string) (*models.ScrapeResult, error) {
	var vx vxResponse
	if err := getJSON(ctx, client, ua, "https://api.vxtwitter.com/Twitter/status/"+id, &vx); err != nil {
		return nil, err
	}
	res := &models.ScrapeResult{Kind: string(models.KindImage)}
	if len(vx.MediaExtended) > 0 {
		for _, m := range vx.MediaExtended {
			if m.URL == "" {
				continue
			}
			res.MediaURLs = append(res.MediaURLs, m.URL)
			if m.Type == "video" {
				res.Kind = string(models.KindVideo)
			} else if m.Type == "gif" {
				res.Kind = string(models.KindGIF)
			}
		}
	} else {
		res.MediaURLs = append(res.MediaURLs, vx.MediaURLs...)
		for _, mu := range vx.MediaURLs {
			if strings.Contains(mu, "video.twimg.com") || strings.HasSuffix(mu, ".mp4") {
				res.Kind = string(models.KindVideo)
			}
		}
	}
	res.Title = tweetTitle(vx.UserName, vx.UserScreenName, vx.Text)
	res.Description = vx.Text
	return res, nil
}

// tweetTitle builds a readable title: "Author (@handle) — first line of text".
func tweetTitle(name, handle, text string) string {
	first := strings.TrimSpace(strings.SplitN(text, "\n", 2)[0])
	if len(first) > 80 {
		first = strings.TrimSpace(first[:80]) + "…"
	}
	who := strings.TrimSpace(name)
	if handle != "" {
		who = strings.TrimSpace(who + " (@" + handle + ")")
	}
	switch {
	case who != "" && first != "":
		return who + " — " + first
	case first != "":
		return first
	case who != "":
		return who
	default:
		return "Tweet"
	}
}
