package sources

import (
	"context"
	"testing"

	"github.com/youruser/oppailib/internal/hanime"
)

type fakeHanimeCatalogue struct {
	videos []hanime.Video
	direct string
}

func (f *fakeHanimeCatalogue) Index(context.Context, string) ([]hanime.Video, error) {
	return append([]hanime.Video(nil), f.videos...), nil
}

func (f *fakeHanimeCatalogue) Find(_ context.Context, _, slug string) (*hanime.Video, error) {
	for i := range f.videos {
		if f.videos[i].Slug == slug {
			v := f.videos[i]
			return &v, nil
		}
	}
	return nil, context.Canceled
}

func (f *fakeHanimeCatalogue) DownloadURL(context.Context, string, hanime.Video) (string, error) {
	return f.direct, nil
}

func TestHanimeBrowseSearchesTags(t *testing.T) {
	src := &Hanime{api: &fakeHanimeCatalogue{videos: []hanime.Video{
		{ID: 1, Slug: "first", Name: "First", PosterURL: "https://hanime-cdn.com/first.jpg", Tags: []string{"Big Breasts", "Uncensored"}, ReleasedAtUnix: 10},
		{ID: 2, Slug: "second", Name: "Second", PosterURL: "https://hanime-cdn.com/second.jpg", Tags: []string{"Vanilla"}, ReleasedAtUnix: 20},
	}}}

	tags, err := src.Browse(context.Background(), BrowseParams{Feed: "tags", Query: "big_breasts, uncensored"})
	if err != nil {
		t.Fatal(err)
	}
	if len(tags.Items) != 1 || tags.Items[0].ID != "first" {
		t.Fatalf("tag results = %#v", tags.Items)
	}
	search, err := src.Browse(context.Background(), BrowseParams{Feed: "search", Query: "vanilla"})
	if err != nil {
		t.Fatal(err)
	}
	if len(search.Items) != 1 || search.Items[0].ID != "second" {
		t.Fatalf("search results = %#v", search.Items)
	}
}

func TestHanimeBrowseSortsAndResolves(t *testing.T) {
	fake := &fakeHanimeCatalogue{
		videos: []hanime.Video{
			{ID: 1, Slug: "older", Name: "Older", PosterURL: "https://hanime-cdn.com/older.jpg", ReleasedAtUnix: 10},
			{ID: 2, Slug: "newer", Name: "Newer", PosterURL: "https://hanime-cdn.com/newer.jpg", ReleasedAtUnix: 20},
		},
		direct: "https://pixeldrain.com/api/filesystem/abc",
	}
	src := &Hanime{api: fake}
	listing, err := src.Browse(context.Background(), BrowseParams{Feed: "recent"})
	if err != nil {
		t.Fatal(err)
	}
	if len(listing.Items) != 2 || listing.Items[0].ID != "newer" || listing.Items[0].MediaURL != hanimePagePrefix+"newer" {
		t.Fatalf("recent results = %#v", listing.Items)
	}
	got, recognized, err := src.ResolveMedia(context.Background(), hanimePagePrefix+"newer")
	if err != nil || !recognized || got != fake.direct {
		t.Fatalf("ResolveMedia = %q, %v, %v", got, recognized, err)
	}
}
