package scraper

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func pagesOf(t *testing.T, html string) []string {
	t.Helper()
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	return collectComicPages(doc)
}

func wantPages(t *testing.T, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("pages = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("pages = %v, want %v", got, want)
		}
	}
}

// The regression this whole change exists for: a gallery renders thumbnails and
// keeps the real page one hop away. Taking src archives mush.
func TestPagePrefersFullResOverThumbnailSrc(t *testing.T) {
	got := pagesOf(t, `<div class="reader">
	  <img src="/t/001t.jpg" data-original="/full/001.jpg" width="900">
	  <img src="/t/002t.jpg" data-original="/full/002.jpg" width="900">
	  <img src="/t/003t.jpg" data-original="/full/003.jpg" width="900">
	  <img src="/t/004t.jpg" data-original="/full/004.jpg" width="900">
	</div>`)
	wantPages(t, got, []string{"/full/001.jpg", "/full/002.jpg", "/full/003.jpg", "/full/004.jpg"})
}

func TestPagePrefersLargestSrcsetCandidate(t *testing.T) {
	got := pagesOf(t, `<div class="reader">
	  <img src="/p1-small.jpg" srcset="/p1-small.jpg 320w, /p1-big.jpg 1600w, /p1-mid.jpg 800w" width="900">
	  <img src="/p2-small.jpg" srcset="/p2-1x.jpg, /p2-2x.jpg 2x" width="900">
	</div>`)
	wantPages(t, got, []string{"/p1-big.jpg", "/p2-2x.jpg"})
}

// <a href="full.jpg"><img src="thumb.jpg"></a> — the classic gallery markup.
func TestPageFollowsAnchorToFullImage(t *testing.T) {
	got := pagesOf(t, `<div class="gallery">
	  <a href="/full/001.png"><img src="/thumb/001.png" width="900"></a>
	</div>`)
	wantPages(t, got, []string{"/full/001.png"})
}

// Many readers wrap each page in a link to the *next page*, which is an HTML
// document. Following that would collect the reader's own navigation, not pages.
func TestPageIgnoresAnchorToNonImage(t *testing.T) {
	got := pagesOf(t, `<div class="reader">
	  <a href="/read/chapter-1/page-2"><img src="/img/001.jpg" width="900"></a>
	</div>`)
	wantPages(t, got, []string{"/img/001.jpg"})
}

// A lazy-loading reader parks a placeholder in src; the real page is in data-src.
// Same resolution as src would have been, so it must not outrank a full-res attr.
func TestPageFullResOutranksLazyAttr(t *testing.T) {
	got := pagesOf(t, `<div class="reader">
	  <img src="/spinner.gif" data-src="/view/001.jpg" data-full="/orig/001.jpg" width="900">
	</div>`)
	wantPages(t, got, []string{"/orig/001.jpg"})
}

func TestPageFallsBackToSrc(t *testing.T) {
	got := pagesOf(t, `<div class="reader"><img src="/img/001.jpg" width="900"></div>`)
	wantPages(t, got, []string{"/img/001.jpg"})
}

func TestPageSkipsInlineDataURIs(t *testing.T) {
	got := pagesOf(t, `<div class="reader">
	  <img src="data:image/gif;base64,R0lGOD" data-src="/real/001.jpg" width="900">
	</div>`)
	wantPages(t, got, []string{"/real/001.jpg"})
}

func TestLargestInSrcsetHandlesJunk(t *testing.T) {
	if got := largestInSrcset(""); got != "" {
		t.Errorf("empty srcset = %q, want empty", got)
	}
	if got := largestInSrcset("/a.jpg 100w, , /b.jpg 200w"); got != "/b.jpg" {
		t.Errorf("srcset with empty candidate = %q, want /b.jpg", got)
	}
}
