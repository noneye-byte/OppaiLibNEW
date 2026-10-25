package scraper

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// An X account's pictures, for picking a LoRA's training set from.
//
// x.com shows a guest nothing, and its own API wants an account and a paid key. The
// fxtwitter mirror the status parser already uses (twitter.go) also serves a
// profile's media tab as JSON, twenty posts a page with a cursor to the next, and
// asks for neither. The pictures themselves still come from pbs.twimg.com.
//
// The mirror's profile feed is unreliable in one particular way: about half the
// requests for a page answer 404 with an empty list, and the same request a moment
// later answers 200 with the posts. So a 404 is asked again a few times before it is
// believed, and believed only as "the mirror is not answering", never as "there is
// nothing more" — that is an empty page with no cursor.

// fxAPIBase is the mirror; a variable so a test can point it at a fake.
var fxAPIBase = "https://api.fxtwitter.com"

// fxAttempts is how many times one page is asked for before the mirror is given up on,
// waiting fxBackoff longer before each try than the one before.
const fxAttempts = 6

var fxBackoff = 300 * time.Millisecond

// ErrTwitterNoAccount is an account the mirror says does not exist.
var ErrTwitterNoAccount = errors.New("there's no X account by that name")

// TwitterAccount is who the pictures belong to.
type TwitterAccount struct {
	Name       string `json:"name"`
	ScreenName string `json:"screenName"`
	Avatar     string `json:"avatar,omitempty"`
	MediaCount int    `json:"mediaCount"`
	Protected  bool   `json:"protected,omitempty"`
}

// TwitterPicture is one photo of one post. A post with four photos is four of these.
type TwitterPicture struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	Thumb    string `json:"thumb"`
	TweetURL string `json:"tweetUrl"`
	Text     string `json:"text,omitempty"`
	Width    int    `json:"width,omitempty"`
	Height   int    `json:"height,omitempty"`
	// Repost is a post the account shared rather than made: someone else's picture,
	// which a style trained on an artist's own work wants to leave out.
	Repost    bool  `json:"repost,omitempty"`
	Sensitive bool  `json:"sensitive,omitempty"`
	Created   int64 `json:"created,omitempty"`
}

// TwitterMediaPage is one page of an account's media tab. Cursor is "" on the last.
type TwitterMediaPage struct {
	Account  *TwitterAccount  `json:"account,omitempty"`
	Pictures []TwitterPicture `json:"pictures"`
	Cursor   string           `json:"cursor,omitempty"`
}

var twitterHandleRe = regexp.MustCompile(`^[A-Za-z0-9_]{1,15}$`)

// TwitterHandle reads an account from what a person would paste: "@name", "name",
// or a link to the profile or one of its posts. "" when it is none of those.
func TwitterHandle(raw string) string {
	s := strings.TrimSpace(raw)
	if strings.Contains(s, "/") {
		if !strings.Contains(s, "://") {
			s = "https://" + s
		}
		u, err := url.Parse(s)
		if err != nil || !(TwitterParser{}).Match(u) {
			return ""
		}
		s = strings.SplitN(strings.Trim(u.Path, "/"), "/", 2)[0]
	}
	s = strings.TrimPrefix(s, "@")
	if !twitterHandleRe.MatchString(s) {
		return ""
	}
	switch strings.ToLower(s) {
	case "i", "home", "search", "explore", "settings", "intent", "share":
		return ""
	}
	return s
}

type fxProfile struct {
	Code int `json:"code"`
	User *struct {
		ScreenName string `json:"screen_name"`
		Name       string `json:"name"`
		AvatarURL  string `json:"avatar_url"`
		MediaCount int    `json:"media_count"`
		Protected  bool   `json:"protected"`
	} `json:"user"`
}

type fxMediaPage struct {
	Code    int `json:"code"`
	Results []struct {
		ID        string `json:"id"`
		URL       string `json:"url"`
		Text      string `json:"text"`
		Created   int64  `json:"created_timestamp"`
		Sensitive bool   `json:"possibly_sensitive"`
		Author    struct {
			ScreenName string `json:"screen_name"`
		} `json:"author"`
		RepostedBy json.RawMessage `json:"reposted_by"`
		Media      *struct {
			Photos []struct {
				ID     string `json:"id"`
				URL    string `json:"url"`
				Width  int    `json:"width"`
				Height int    `json:"height"`
			} `json:"photos"`
		} `json:"media"`
	} `json:"results"`
	Cursor struct {
		Bottom string `json:"bottom"`
	} `json:"cursor"`
}

// TwitterUserMedia reads one page of an account's pictures; cursor "" is the first,
// which also says whose they are. Videos and GIFs are left out: a LoRA trains on
// stills.
func (e *Engine) TwitterUserMedia(ctx context.Context, handle, cursor string) (*TwitterMediaPage, error) {
	page := &TwitterMediaPage{Pictures: []TwitterPicture{}}
	if cursor == "" {
		var prof fxProfile
		status, err := e.fxGet(ctx, "/"+url.PathEscape(handle), &prof, false)
		if err != nil {
			return nil, err
		}
		if status == http.StatusNotFound || prof.User == nil {
			return nil, ErrTwitterNoAccount
		}
		u := prof.User
		page.Account = &TwitterAccount{
			Name: u.Name, ScreenName: u.ScreenName, Avatar: u.AvatarURL,
			MediaCount: u.MediaCount, Protected: u.Protected,
		}
		if u.Protected {
			// A protected account's posts are not shown to anyone who doesn't follow
			// it, the mirror included.
			return page, nil
		}
	}
	path := "/2/profile/" + url.PathEscape(handle) + "/media"
	if cursor != "" {
		path += "?cursor=" + url.QueryEscape(cursor)
	}
	var feed fxMediaPage
	status, err := e.fxGet(ctx, path, &feed, true)
	if err != nil {
		return nil, err
	}
	if status != http.StatusOK {
		return nil, fmt.Errorf("the X mirror didn't answer for @%s (%d) — try again in a minute", handle, status)
	}
	for _, r := range feed.Results {
		if r.Media == nil {
			continue
		}
		repost := len(r.RepostedBy) > 0 && string(r.RepostedBy) != "null" ||
			!strings.EqualFold(r.Author.ScreenName, handle)
		for _, p := range r.Media.Photos {
			if p.URL == "" {
				continue
			}
			id := p.ID
			if id == "" {
				id = r.ID + "/" + p.URL
			}
			page.Pictures = append(page.Pictures, TwitterPicture{
				ID: id, URL: twimgSize(p.URL, "orig"), Thumb: twimgSize(p.URL, "small"),
				TweetURL: r.URL, Text: r.Text, Width: p.Width, Height: p.Height,
				Repost: repost, Sensitive: r.Sensitive, Created: r.Created,
			})
		}
	}
	// The mirror hands a cursor back even past the end; an empty page is the end.
	if len(feed.Results) > 0 {
		page.Cursor = feed.Cursor.Bottom
	}
	return page, nil
}

// fxGet asks the mirror for path and decodes its JSON into out, returning the status.
// With retry404, a 404 is asked again — see the comment at the top of the file.
func (e *Engine) fxGet(ctx context.Context, path string, out any, retry404 bool) (int, error) {
	var lastErr error
	for attempt := 0; attempt < fxAttempts; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return 0, ctx.Err()
			case <-time.After(time.Duration(attempt) * fxBackoff):
			}
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, fxAPIBase+path, nil)
		if err != nil {
			return 0, err
		}
		req.Header.Set("User-Agent", e.ua())
		req.Header.Set("Accept", "application/json")
		resp, err := e.client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}
		switch {
		case resp.StatusCode == http.StatusOK:
			if err := json.Unmarshal(body, out); err != nil {
				return 0, fmt.Errorf("the X mirror's answer didn't read: %w", err)
			}
			return http.StatusOK, nil
		case resp.StatusCode == http.StatusNotFound && !retry404:
			return http.StatusNotFound, nil
		case resp.StatusCode == http.StatusNotFound,
			resp.StatusCode == http.StatusTooManyRequests,
			resp.StatusCode >= 500:
			lastErr = fmt.Errorf("status %d", resp.StatusCode)
			if attempt == fxAttempts-1 {
				return resp.StatusCode, nil
			}
		default:
			return resp.StatusCode, nil
		}
	}
	if lastErr == nil {
		lastErr = errors.New("no answer")
	}
	return 0, fmt.Errorf("couldn't reach the X mirror: %w", lastErr)
}

// twimgSize is a pbs.twimg.com picture at one of its named sizes ("orig", "small"
// for a thumbnail), keeping its format. Other URLs are returned as they are.
func twimgSize(raw, name string) string {
	u, err := url.Parse(raw)
	if err != nil || !strings.EqualFold(u.Hostname(), "pbs.twimg.com") {
		return raw
	}
	q := u.Query()
	q.Set("name", name)
	u.RawQuery = q.Encode()
	return u.String()
}
