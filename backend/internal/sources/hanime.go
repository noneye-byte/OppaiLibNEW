package sources

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/youruser/oppailib/internal/hanime"
)

const hanimePagePrefix = "https://hanime.tv/videos/hentai/"

type hanimeCatalogue interface {
	Index(context.Context, string) ([]hanime.Video, error)
	Find(context.Context, string, string) (*hanime.Video, error)
	DownloadURL(context.Context, string, hanime.Video) (string, error)
}

// Hanime exposes Hanime's public guest catalogue. Cards keep the durable video-page
// URL; the stream/save path resolves it to a temporary guest MP4 only when needed.
type Hanime struct{ api hanimeCatalogue }

func NewHanime(client *http.Client) *Hanime {
	return &Hanime{api: hanime.New(client, hanime.Options{})}
}

func (*Hanime) ID() string   { return "hanime" }
func (*Hanime) Name() string { return "Hanime" }
func (*Hanime) AccessPolicy() AccessPolicy {
	return AccessPolicy{
		Authentication: "none",
		AuthNote:       "Uses Hanime's public guest catalogue and guest playback URLs.",
	}
}
func (*Hanime) Hosts() []string {
	return []string{"hanime.tv", "*.hanime.tv", "hanime-cdn.com", "*.hanime-cdn.com", "pixeldrain.com", "pixeldrain.net"}
}
func (*Hanime) Feeds() []Feed {
	return []Feed{
		{ID: "recent", Label: "Recent", Sorts: []Sort{{ID: "newest", Label: "Newest"}, {ID: "oldest", Label: "Oldest"}}},
		{ID: "popular", Label: "Popular", Sorts: []Sort{{ID: "views", Label: "Most viewed"}, {ID: "likes", Label: "Most liked"}}},
		{ID: "search", Label: "Search", Query: true, Sorts: []Sort{{ID: "relevance", Label: "Relevance"}, {ID: "newest", Label: "Newest"}, {ID: "views", Label: "Most viewed"}}},
		{ID: "tags", Label: "Tags", Query: true, Sorts: []Sort{{ID: "newest", Label: "Newest"}, {ID: "views", Label: "Most viewed"}, {ID: "likes", Label: "Most liked"}}},
	}
}

func (*Hanime) Decorate(req *http.Request) {
	req.Header.Set("Referer", "https://hanime.tv/")
}

func (s *Hanime) Browse(ctx context.Context, p BrowseParams) (*Listing, error) {
	feed := p.Feed
	if feed == "" {
		feed = "recent"
	}
	if feed != "recent" && feed != "popular" && feed != "search" && feed != "tags" {
		return nil, fmt.Errorf("unknown feed %q", feed)
	}
	query := strings.TrimSpace(p.Query)
	if (feed == "search" || feed == "tags") && query == "" {
		return nil, fmt.Errorf("%s needs a search term", strings.ToLower(feed))
	}
	offset := 0
	if p.Cursor != "" {
		var err error
		offset, err = strconv.Atoi(p.Cursor)
		if err != nil || offset < 0 {
			return nil, fmt.Errorf("bad cursor %q", p.Cursor)
		}
	}

	videos, err := s.api.Index(ctx, sourceUserAgent)
	if err != nil {
		return nil, err
	}
	filtered := make([]hanime.Video, 0, len(videos))
	for _, video := range videos {
		if video.Slug == "" || (video.PosterURL == "" && video.CoverURL == "") {
			continue
		}
		if feed == "search" && !hanimeTextMatch(video, query) {
			continue
		}
		if feed == "tags" && !hanimeTagMatch(video.Tags, query) {
			continue
		}
		filtered = append(filtered, video)
	}

	sortID := p.Sort
	if sortID == "" {
		switch feed {
		case "popular":
			sortID = "views"
		case "search":
			sortID = "relevance"
		default:
			sortID = "newest"
		}
	}
	sort.SliceStable(filtered, func(i, j int) bool {
		a, b := filtered[i], filtered[j]
		switch sortID {
		case "oldest":
			return hanimeDate(a) < hanimeDate(b)
		case "views":
			return a.Views > b.Views
		case "likes":
			return a.Likes > b.Likes
		case "relevance":
			as, bs := hanimeRelevance(a, query), hanimeRelevance(b, query)
			if as != bs {
				return as > bs
			}
			return a.Views > b.Views
		default:
			return hanimeDate(a) > hanimeDate(b)
		}
	})

	if offset > len(filtered) {
		offset = len(filtered)
	}
	const pageSize = 48
	end := offset + pageSize
	if end > len(filtered) {
		end = len(filtered)
	}
	out := &Listing{Items: make([]Item, 0, end-offset)}
	for _, video := range filtered[offset:end] {
		thumb := video.PosterURL
		if thumb == "" {
			thumb = video.CoverURL
		}
		pageURL := hanimePagePrefix + url.PathEscape(video.Slug)
		out.Items = append(out.Items, Item{
			ID: video.Slug, Title: video.Name, Kind: "video", ThumbURL: thumb,
			MediaURL: pageURL, PageURL: pageURL, Tags: append([]string(nil), video.Tags...),
		})
	}
	if end < len(filtered) {
		out.Cursor = strconv.Itoa(end)
	}
	return out, nil
}

func (*Hanime) Pages(context.Context, string) ([]string, error) { return nil, nil }

// ResolveMedia implements MediaResolver. Hanime's guest token is requested lazily,
// keeping catalogue browsing fast and making the stable page URL safe to pin/share.
func (s *Hanime) ResolveMedia(ctx context.Context, raw string) (string, bool, error) {
	u, err := url.Parse(raw)
	if err != nil || !strings.EqualFold(u.Hostname(), "hanime.tv") {
		return "", false, nil
	}
	slug, ok := strings.CutPrefix(strings.Trim(u.Path, "/"), "videos/hentai/")
	if !ok || slug == "" || strings.Contains(slug, "/") {
		return "", false, nil
	}
	slug, err = url.PathUnescape(slug)
	if err != nil {
		return "", true, fmt.Errorf("bad Hanime video URL")
	}
	video, err := s.api.Find(ctx, sourceUserAgent, slug)
	if err != nil {
		return "", true, err
	}
	direct, err := s.api.DownloadURL(ctx, sourceUserAgent, *video)
	return direct, true, err
}

func hanimeTextMatch(video hanime.Video, query string) bool {
	haystack := normalizeHanime(strings.Join([]string{video.Name, video.SearchTitles, video.Description, video.Brand, strings.Join(video.Tags, " ")}, " "))
	for _, term := range strings.Fields(normalizeHanime(query)) {
		if !strings.Contains(haystack, term) {
			return false
		}
	}
	return true
}

func hanimeTagMatch(tags []string, query string) bool {
	wanted := strings.Split(query, ",")
	for _, raw := range wanted {
		term := normalizeHanime(raw)
		if term == "" {
			continue
		}
		found := false
		for _, tag := range tags {
			if normalizeHanime(tag) == term {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

func normalizeHanime(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.ReplaceAll(s, "_", " "))), " ")
}

func hanimeDate(video hanime.Video) int64 {
	if video.ReleasedAtUnix != 0 {
		return video.ReleasedAtUnix
	}
	return video.CreatedAtUnix
}

func hanimeRelevance(video hanime.Video, query string) int {
	q := normalizeHanime(query)
	name := normalizeHanime(video.Name)
	if name == q {
		return 100
	}
	if strings.HasPrefix(name, q) {
		return 80
	}
	for _, tag := range video.Tags {
		if normalizeHanime(tag) == q {
			return 70
		}
	}
	if strings.Contains(name, q) {
		return 60
	}
	return 10
}
