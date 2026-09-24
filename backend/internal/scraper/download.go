package scraper

import (
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"path"
	"strings"
)

// Media is a downloaded remote asset ready to be handed to the blob store.
type Media struct {
	Body        io.ReadCloser
	ContentType string
	Filename    string
}

// Download fetches a (usually media) URL with the polite client + throttling.
// The caller must Close the returned Body.
func (e *Engine) Download(ctx context.Context, rawURL string) (*Media, error) {
	return e.download(ctx, rawURL, true)
}

// FetchImage is Download without the politeness delay, for showing a picture rather
// than scraping a site.
//
// The delay is right for what it was built for — reading a site's pages one after
// another the way a patient person would — and wrong for a screen of thumbnails,
// which a browser fetches all at once. Behind a 1.5 s delay per host, the thirtieth
// cover of a listing started loading 45 seconds after the first, and the screenshots
// of the game the user then opened queued behind every cover still waiting and timed
// out. The caller bounds concurrency per host instead (see the proxy). Same client,
// same dial guard, same headers: only the queue is skipped.
func (e *Engine) FetchImage(ctx context.Context, rawURL string) (*Media, error) {
	return e.download(ctx, rawURL, false)
}

func (e *Engine) download(ctx context.Context, rawURL string, polite bool) (*Media, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	if polite {
		if err := e.throttle(ctx, u.Host); err != nil {
			return nil, err
		}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", e.ua())
	req.Header.Set("Accept", "image/avif,image/webp,image/*,video/*,*/*;q=0.8")
	// A referer from the same origin gets past a lot of naive hotlink guards.
	req.Header.Set("Referer", u.Scheme+"://"+u.Host+"/")
	resp, err := e.MediaHTTPClient().Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("download: %s returned %d", rawURL, resp.StatusCode)
	}
	ct := resp.Header.Get("Content-Type")
	name := path.Base(u.Path)
	if name == "" || name == "/" || name == "." {
		name = "download"
	}
	// If the URL carried no extension, borrow one from the Content-Type so the
	// media-kind guess downstream (image vs. video vs. gif) still works.
	if path.Ext(name) == "" {
		if exts, _ := mime.ExtensionsByType(strings.SplitN(ct, ";", 2)[0]); len(exts) > 0 {
			name += exts[0]
		}
	}
	return &Media{Body: resp.Body, ContentType: ct, Filename: name}, nil
}
