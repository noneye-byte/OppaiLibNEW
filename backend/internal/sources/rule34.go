package sources

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"sync"

	"github.com/PuerkitoBio/goquery"
)

// Rule34 uses an authenticated API now, but its public post listing and post pages
// remain browsable without an account. The listing intentionally contains only a
// thumbnail, tags and a detail link. Representing a card as a one-item container lets
// us fetch that detail only when it is opened instead of hammering the site with 42
// detail requests for every page of results.
type Rule34 struct {
	client  *http.Client
	baseURL string
	mu      sync.RWMutex
	userID  string
	apiKey  string
}

func NewRule34(client *http.Client) *Rule34 {
	return &Rule34{client: client, baseURL: "https://rule34.xxx"}
}

func (s *Rule34) SetCredentials(userID, apiKey string) {
	s.mu.Lock()
	s.userID = strings.TrimSpace(userID)
	s.apiKey = strings.TrimSpace(apiKey)
	s.mu.Unlock()
}

func (s *Rule34) credentials() (string, string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.userID, s.apiKey
}

func (*Rule34) ID() string   { return "rule34" }
func (*Rule34) Name() string { return "Rule34.xxx" }
func (*Rule34) AccessPolicy() AccessPolicy {
	return AccessPolicy{
		Authentication: "optional",
		AuthNote:       "Public browsing works without credentials; a Rule34 user ID and API key enable the authenticated API.",
	}
}
func (*Rule34) Hosts() []string {
	// Media is sharded across changing subdomains (wimg, nymp4, ahrimp4, ...).
	return []string{"rule34.xxx", "*.rule34.xxx"}
}
func (*Rule34) Feeds() []Feed {
	return []Feed{
		{ID: "recent", Label: "Recent"},
		{ID: "popular", Label: "Popular"},
		{ID: "videos", Label: "Videos"},
		{ID: "search", Label: "Tag search", Query: true, Sorts: []Sort{
			{ID: "newest", Label: "Newest"}, {ID: "score", Label: "Top score"},
		}},
	}
}

func (s *Rule34) Decorate(req *http.Request) {
	req.Header.Set("Referer", "https://rule34.xxx/")
}

func (s *Rule34) Browse(ctx context.Context, p BrowseParams) (*Listing, error) {
	if id, ok := strings.CutPrefix(p.Feed, "post:"); ok {
		return s.post(ctx, id)
	}
	if p.Feed == "" {
		p.Feed = "recent"
	}
	if p.Feed != "recent" && p.Feed != "popular" && p.Feed != "videos" && p.Feed != "search" {
		return nil, fmt.Errorf("unknown feed %q", p.Feed)
	}
	tags := "all"
	switch p.Feed {
	case "popular":
		tags = "sort:score"
	case "videos":
		tags = "video"
	case "search":
		tags = strings.TrimSpace(p.Query)
		if tags == "" {
			return nil, fmt.Errorf("tag search needs a term")
		}
	}
	if p.Sort == "score" && !strings.Contains(tags, "sort:") {
		tags += " sort:score"
	}
	if userID, apiKey := s.credentials(); userID != "" && apiKey != "" {
		return s.browseAPI(ctx, p.Cursor, tags, userID, apiKey)
	}
	return s.browseHTML(ctx, p.Cursor, tags)
}

// browseAPI uses Rule34's authenticated DAPI. Unlike the HTML grid it includes the
// original media URL, kind and dimensions, so opening a tile needs no second page
// scrape and video cards are identified reliably.
func (s *Rule34) browseAPI(ctx context.Context, cursor, tags, userID, apiKey string) (*Listing, error) {
	page := 0
	if cursor != "" {
		var err error
		page, err = strconv.Atoi(cursor)
		if err != nil || page < 0 {
			return nil, fmt.Errorf("bad cursor %q", cursor)
		}
	}
	params := url.Values{
		"page": {"dapi"}, "s": {"post"}, "q": {"index"}, "json": {"1"},
		"limit": {"100"}, "pid": {strconv.Itoa(page)}, "user_id": {userID}, "api_key": {apiKey},
	}
	if tags != "all" {
		params.Set("tags", tags)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/index.php?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("build Rule34 API request: %w", err)
	}
	s.Decorate(req)
	req.Header.Set("User-Agent", sourceUserAgent)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Rule34 API is unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("Rule34 API credentials were rejected; update them in Settings")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Rule34 API returned %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return nil, fmt.Errorf("read Rule34 API response: %w", err)
	}
	var posts []rule34Post
	if err := json.Unmarshal(body, &posts); err != nil {
		var wrapped struct {
			Posts   []rule34Post `json:"post"`
			Success *bool        `json:"success"`
			Reason  string       `json:"reason"`
		}
		if err2 := json.Unmarshal(body, &wrapped); err2 != nil {
			return nil, fmt.Errorf("parse Rule34 API response: %w", err)
		}
		if wrapped.Success != nil && !*wrapped.Success {
			return nil, fmt.Errorf("Rule34 API credentials were rejected: %s", strings.TrimSpace(wrapped.Reason))
		}
		posts = wrapped.Posts
	}
	out := &Listing{Items: make([]Item, 0, len(posts))}
	for _, post := range posts {
		id := strconv.FormatInt(post.ID, 10)
		if post.ID <= 0 || post.FileURL == "" {
			continue
		}
		kind := kindForExt(path.Ext(mediaPath(post.FileURL)))
		thumb := post.PreviewURL
		if thumb == "" {
			thumb = post.SampleURL
		}
		if thumb == "" && kind != "video" {
			thumb = post.FileURL
		}
		out.Items = append(out.Items, Item{
			ID: id, Title: rule34Title(id, post.Tags), Kind: kind,
			ThumbURL: thumb, MediaURL: post.FileURL, PageURL: s.postURL(id),
			Width: post.Width, Height: post.Height,
			Tags: strings.Fields(post.Tags),
		})
	}
	if len(posts) == 100 {
		out.Cursor = strconv.Itoa(page + 1)
	}
	return out, nil
}

type rule34Post struct {
	ID         int64  `json:"id"`
	Tags       string `json:"tags"`
	FileURL    string `json:"file_url"`
	PreviewURL string `json:"preview_url"`
	SampleURL  string `json:"sample_url"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
}

func (s *Rule34) browseHTML(ctx context.Context, cursor, tags string) (*Listing, error) {
	offset := 0
	if cursor != "" {
		var err error
		offset, err = strconv.Atoi(cursor)
		if err != nil || offset < 0 {
			return nil, fmt.Errorf("bad cursor %q", cursor)
		}
	}
	target := s.baseURL + "/index.php?page=post&s=list&tags=" + url.QueryEscape(tags)
	if offset > 0 {
		target += "&pid=" + strconv.Itoa(offset)
	}
	body, err := httpGet(ctx, s.client, target, sourceUserAgent, s.Decorate)
	if err != nil {
		return nil, err
	}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("parse Rule34 listing: %w", err)
	}
	out := &Listing{}
	doc.Find("span.thumb").Each(func(_ int, card *goquery.Selection) {
		link := card.Find("a[href*='page=post'][href*='s=view']").First()
		href, _ := link.Attr("href")
		u, err := url.Parse(href)
		if err != nil {
			return
		}
		id := u.Query().Get("id")
		if !numericID(id) {
			return
		}
		img := link.Find("img.preview").First()
		thumb, _ := img.Attr("src")
		if thumb == "" {
			return
		}
		tags, _ := img.Attr("alt")
		out.Items = append(out.Items, Item{
			ID: id, Title: rule34Title(id, tags), Kind: kindThread,
			ThumbURL: absoluteURL(s.baseURL, thumb),
			PageURL:  s.postURL(id), FeedID: "post:" + id, Count: 1,
			Tags: strings.Fields(tags),
		})
	})
	if len(out.Items) > 0 {
		out.Cursor = strconv.Itoa(offset + len(out.Items))
	}
	return out, nil
}

func (s *Rule34) post(ctx context.Context, id string) (*Listing, error) {
	if !numericID(id) {
		return nil, fmt.Errorf("bad post id %q", id)
	}
	body, err := httpGet(ctx, s.client, s.postURL(id), sourceUserAgent, s.Decorate)
	if err != nil {
		return nil, err
	}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("parse Rule34 post: %w", err)
	}
	media := firstAttr(doc, "video source[src]", "src")
	kind := "video"
	if media == "" {
		media = firstAttr(doc, "img#image[src]", "src")
		kind = kindForExt(path.Ext(mediaPath(media)))
	}
	if media == "" {
		media = firstAttr(doc, `meta[property="og:image"]`, "content")
		kind = kindForExt(path.Ext(mediaPath(media)))
	}
	if media == "" {
		return nil, fmt.Errorf("no media found on Rule34 post %s", id)
	}
	media = absoluteURL(s.baseURL, media)
	thumb := firstAttr(doc, "video[poster]", "poster")
	if thumb == "" && kind != "video" {
		thumb = media
	}
	tags := strings.TrimSpace(doc.Find("textarea#tags").First().Text())
	if tags == "" {
		tags, _ = doc.Find(`meta[name="keywords"]`).First().Attr("content")
	}
	item := Item{
		ID: id, Title: rule34Title(id, tags), Kind: kind,
		ThumbURL: absoluteURL(s.baseURL, thumb), MediaURL: media, PageURL: s.postURL(id),
		Tags: strings.Fields(tags),
	}
	return &Listing{Items: []Item{item}}, nil
}

func (*Rule34) Pages(context.Context, string) ([]string, error) { return nil, nil }

func (s *Rule34) postURL(id string) string {
	return s.baseURL + "/index.php?page=post&s=view&id=" + id
}

func numericID(id string) bool {
	if id == "" || len(id) > 20 {
		return false
	}
	_, err := strconv.ParseUint(id, 10, 64)
	return err == nil
}

func firstAttr(doc *goquery.Document, selector, attr string) string {
	v, _ := doc.Find(selector).First().Attr(attr)
	return strings.TrimSpace(v)
}

func mediaPath(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	return u.Path
}

func absoluteURL(base, raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || raw == "" {
		return ""
	}
	b, _ := url.Parse(base)
	return b.ResolveReference(u).String()
}

func rule34Title(id, tags string) string {
	parts := strings.Fields(tags)
	// score/rating suffixes are presentation metadata, not useful title words.
	clean := parts[:0]
	for _, tag := range parts {
		if strings.HasPrefix(tag, "score:") || strings.HasPrefix(tag, "rating:") {
			continue
		}
		clean = append(clean, tag)
		if len(clean) == 6 {
			break
		}
	}
	if len(clean) == 0 {
		return "Rule34 post " + id
	}
	return strings.Join(clean, " ")
}
