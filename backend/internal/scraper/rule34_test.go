package scraper

import (
	"net/url"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func TestRule34VideoPageUsesPlayerSource(t *testing.T) {
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(`<html><head>
<meta property="og:image" content="https://wimg.rule34.xxx/images/a/file.mp4?1">
</head><body><video><source src="https://nymp4.rule34.xxx/images/a/file.mp4?1"></video>
<textarea id="tags">animated blue_hair video</textarea></body></html>`))
	u, _ := url.Parse("https://rule34.xxx/index.php?page=post&s=view&id=123")
	got, err := (&Rule34Parser{}).Parse(doc, u)
	if err != nil {
		t.Fatal(err)
	}
	if got.Kind != "video" || got.MediaURLs[0] != "https://nymp4.rule34.xxx/images/a/file.mp4?1" {
		t.Fatalf("result = %+v, want the playable MP4 as video", got)
	}
	if len(got.Tags) != 3 || got.Tags[1] != "blue_hair" {
		t.Fatalf("tags = %v", got.Tags)
	}
}

func TestRule34GIFPageKeepsGIFKind(t *testing.T) {
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(`<html><body>
<img id="image" src="https://wimg.rule34.xxx/images/a/file.gif?2">
<textarea id="tags">animated loop</textarea></body></html>`))
	u, _ := url.Parse("https://rule34.xxx/index.php?page=post&s=view&id=456")
	got, err := (&Rule34Parser{}).Parse(doc, u)
	if err != nil {
		t.Fatal(err)
	}
	if got.Kind != "gif" {
		t.Fatalf("kind = %q, want gif", got.Kind)
	}
}
