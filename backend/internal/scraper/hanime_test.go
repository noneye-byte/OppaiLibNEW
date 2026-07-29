package scraper

import (
	"context"
	"net/http"
	"net/url"
	"testing"

	"github.com/youruser/oppailib/internal/hanime"
)

type fakeHanimeAPI struct{ video hanime.Video }

func (f fakeHanimeAPI) Find(context.Context, string, string) (*hanime.Video, error) {
	v := f.video
	return &v, nil
}

func (fakeHanimeAPI) DownloadURL(context.Context, string, hanime.Video) (string, error) {
	return "https://pixeldrain.com/api/filesystem/abc", nil
}

func TestHanimeParserScrapesGuestVideo(t *testing.T) {
	p := &HanimeParser{api: fakeHanimeAPI{video: hanime.Video{
		Name: "Example", Brand: "Example Studio", Description: "<p>Hello <b>world</b></p>",
		Tags: []string{"Vanilla"}, PosterURL: "https://hanime-cdn.com/poster.jpg",
	}}}
	u, _ := url.Parse("https://hanime.tv/videos/hentai/example")
	if !p.Match(u) {
		t.Fatal("parser did not match Hanime video URL")
	}
	res, err := p.ScrapeDirect(context.Background(), http.DefaultClient, "test-agent", u)
	if err != nil {
		t.Fatal(err)
	}
	if res.Title != "Example" || res.Description != "Hello world" || res.Kind != "video" {
		t.Fatalf("result = %#v", res)
	}
	if len(res.MediaURLs) != 1 || res.MediaURLs[0] != "https://pixeldrain.com/api/filesystem/abc" {
		t.Fatalf("media URLs = %#v", res.MediaURLs)
	}
	if len(res.CategorizedTags) != 1 || res.CategorizedTags[0].Category != "studio" {
		t.Fatalf("categorized tags = %#v", res.CategorizedTags)
	}
}
