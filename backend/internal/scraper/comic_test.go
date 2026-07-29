package scraper

import (
	"net/url"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func parse(t *testing.T, rawURL, html string) (*goquery.Document, *url.URL) {
	t.Helper()
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parse html: %v", err)
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	return doc, u
}

// imgs builds a run of <img> tags from the given srcs.
func imgs(srcs ...string) string {
	var b strings.Builder
	for _, s := range srcs {
		b.WriteString(`<img src="` + s + `">`)
	}
	return b.String()
}

func TestDetectComic(t *testing.T) {
	tests := []struct {
		name      string
		url       string
		html      string
		want      bool
		wantPages int
	}{
		{
			// Strong URL word plus sequential page numbers: the ordinary case.
			name:      "manga reader",
			url:       "https://example.com/manga/some-title/chapter-4",
			html:      `<title>Some Title Ch. 4</title>` + imgs("/p/001.jpg", "/p/002.jpg", "/p/003.jpg", "/p/004.jpg", "/p/005.jpg"),
			want:      true,
			wantPages: 5,
		},
		{
			// Weak word alone can't decide; sequential numbering carries it over.
			name:      "numbered gallery",
			url:       "https://example.com/gallery/12345",
			html:      imgs("/i/1.webp", "/i/2.webp", "/i/3.webp", "/i/4.webp"),
			want:      true,
			wantPages: 4,
		},
		{
			// og:type=book is an explicit declaration; trust it.
			name:      "og:type book",
			url:       "https://example.com/x/9",
			html:      `<meta property="og:type" content="book">` + imgs("/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"),
			want:      true,
			wantPages: 4,
		},
		{
			// A photo post: no comic vocabulary, no numbering. Must not fire.
			name: "photo blog post",
			url:  "https://example.com/posts/summer-trip",
			html: imgs("/u/sunset.jpg", "/u/beach.jpg", "/u/dinner.jpg", "/u/hike.jpg", "/u/cat.jpg"),
			want: false,
		},
		{
			// Weak word only (score 1) — below the threshold on its own.
			name: "unnumbered gallery",
			url:  "https://example.com/gallery/trip",
			html: imgs("/u/sunset.jpg", "/u/beach.jpg", "/u/dinner.jpg", "/u/hike.jpg"),
			want: false,
		},
		{
			// Comic vocabulary but too few images to be a comic.
			name: "manga landing page",
			url:  "https://example.com/manga/some-title",
			html: `<title>Some Title</title>` + imgs("/cover.jpg", "/banner.jpg"),
			want: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			doc, u := parse(t, tc.url, tc.html)
			pages, ok := detectComic(doc, u)
			if ok != tc.want {
				t.Fatalf("detectComic = %v, want %v (pages=%v)", ok, tc.want, pages)
			}
			if ok && len(pages) != tc.wantPages {
				t.Errorf("got %d pages, want %d: %v", len(pages), tc.wantPages, pages)
			}
		})
	}
}

// Pages must come back in document order — a CBZ is assembled from this slice,
// so a reordering here is a shuffled comic.
func TestCollectComicPagesPreservesOrder(t *testing.T) {
	doc, _ := parse(t, "https://example.com/manga/x/1",
		`<img data-src="/p/001.jpg" src="/spinner.gif">`+
			`<img data-src="/p/002.jpg" src="/spinner.gif">`+
			`<img src="/p/003.jpg">`)
	pages := collectComicPages(doc)
	want := []string{"/p/001.jpg", "/p/002.jpg", "/p/003.jpg"}
	if len(pages) != len(want) {
		t.Fatalf("got %v, want %v", pages, want)
	}
	for i := range want {
		if pages[i] != want[i] {
			t.Errorf("page %d = %q, want %q", i, pages[i], want[i])
		}
	}
}

func TestLooksSequential(t *testing.T) {
	tests := []struct {
		name string
		urls []string
		want bool
	}{
		{"zero padded", []string{"/001.jpg", "/002.jpg", "/003.jpg"}, true},
		{"prefixed", []string{"/page-1.png", "/page-2.png", "/page-9.png"}, true},
		{"nested dirs", []string{"/ch3/01.jpg", "/ch3/02.jpg", "/ch3/03.jpg"}, true},
		{"descending", []string{"/9.jpg", "/5.jpg", "/1.jpg"}, false},
		{"unnumbered", []string{"/sunset.jpg", "/beach.jpg", "/hike.jpg"}, false},
		{"content hashes", []string{"/a3f9c2b1d4e5.jpg", "/b7e1a0c3f2d8.jpg"}, false},
		{"single page", []string{"/001.jpg"}, false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := looksSequential(tc.urls); got != tc.want {
				t.Errorf("looksSequential(%v) = %v, want %v", tc.urls, got, tc.want)
			}
		})
	}
}

func TestMediaKindFromPathComics(t *testing.T) {
	for _, ext := range []string{".cbz", ".cbr", ".cb7", ".cbt", ".pdf"} {
		if got := mediaKindFromPath("/files/book" + ext); string(got) != "comic" {
			t.Errorf("mediaKindFromPath(%q) = %q, want comic", ext, got)
		}
	}
}

func TestMediaKindFromContentTypeComics(t *testing.T) {
	cases := map[string]string{
		"application/pdf":                     "comic",
		"application/vnd.comicbook+zip":       "comic",
		"application/x-cbr":                   "comic",
		"image/jpeg":                          "image",
		"image/gif":                           "gif",
		"video/mp4":                           "video",
		"text/html; charset=utf-8":            "",
		"application/pdf; qs=0.001":           "comic",
	}
	for ct, want := range cases {
		if got := string(mediaKindFromContentType(ct)); got != want {
			t.Errorf("mediaKindFromContentType(%q) = %q, want %q", ct, got, want)
		}
	}
}
