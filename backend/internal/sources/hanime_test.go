package sources

import (
	"context"
	"sync/atomic"
	"testing"

	"github.com/youruser/oppailib/internal/hanime"
)

type fakeHanimeCatalogue struct {
	videos      []hanime.Video
	direct      string
	membersOnly map[string]bool // slugs with no guest copy
	asked       atomic.Int32    // DownloadURL calls
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

func (f *fakeHanimeCatalogue) DownloadURL(_ context.Context, _ string, v hanime.Video) (string, error) {
	f.asked.Add(1)
	if f.membersOnly[v.Slug] {
		return "", &hanime.MembersOnlyError{Name: v.Name}
	}
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

func TestAMembersOnlyUploadIsLeftOutOfTheListing(t *testing.T) {
	fake := &fakeHanimeCatalogue{
		videos: []hanime.Video{
			{ID: 1, Slug: "early", Name: "Early", PosterURL: "https://hanime-cdn.com/e.jpg", Views: 190, ReleasedAtUnix: 30},
			{ID: 2, Slug: "fresh", Name: "Fresh", PosterURL: "https://hanime-cdn.com/f.jpg", Views: 900, ReleasedAtUnix: 20},
			{ID: 3, Slug: "loved", Name: "Loved", PosterURL: "https://hanime-cdn.com/l.jpg", Views: 2_000_000, ReleasedAtUnix: 10},
		},
		direct:      "https://pixeldrain.com/api/file/x",
		membersOnly: map[string]bool{"early": true},
	}
	listing, err := (&Hanime{api: fake}).Browse(context.Background(), BrowseParams{Feed: "recent"})
	if err != nil {
		t.Fatal(err)
	}
	var ids []string
	for _, it := range listing.Items {
		ids = append(ids, it.ID)
	}
	if len(ids) != 2 || ids[0] != "fresh" || ids[1] != "loved" {
		t.Fatalf("listed %v, want [fresh loved]", ids)
	}
	// Only the two low-view cards were worth a handshake.
	if n := fake.asked.Load(); n != 2 {
		t.Fatalf("asked for %d download links, want 2", n)
	}
}

func TestAVideoTheClientAlreadyKnowsIsMembersOnlyIsDroppedWithoutAsking(t *testing.T) {
	fake := &knownMembersOnly{fakeHanimeCatalogue: fakeHanimeCatalogue{videos: []hanime.Video{
		{ID: 1, Slug: "popular-but-locked", Name: "Locked", PosterURL: "https://hanime-cdn.com/p.jpg", Views: 500_000},
	}}}
	listing, err := (&Hanime{api: fake}).Browse(context.Background(), BrowseParams{Feed: "recent"})
	if err != nil {
		t.Fatal(err)
	}
	if len(listing.Items) != 0 || fake.asked.Load() != 0 {
		t.Fatalf("listed %d, asked %d times", len(listing.Items), fake.asked.Load())
	}
}

type knownMembersOnly struct{ fakeHanimeCatalogue }

func (*knownMembersOnly) MembersOnly(string) bool { return true }
