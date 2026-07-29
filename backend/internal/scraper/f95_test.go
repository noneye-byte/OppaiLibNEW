package scraper

import (
	"net/url"
	"sort"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/models"
)

func parseF95(t *testing.T, html string) *models.ScrapeResult {
	t.Helper()
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parse html: %v", err)
	}
	u, _ := url.Parse("https://f95zone.to/threads/some-game.12345/")
	return parseF95Thread(doc, u)
}

// tagsIn returns the tag names a parser filed under the given category, sorted.
func tagsIn(res *models.ScrapeResult, category string) []string {
	var out []string
	for _, tg := range res.CategorizedTags {
		if tg.Category == category {
			out = append(out, tg.Name)
		}
	}
	sort.Strings(out)
	return out
}

// A typical thread: a bracket-laden title, an engine + status prefix, genre tags,
// an og cover, and screenshots in the first post.
func TestF95ParsesThread(t *testing.T) {
	res := parseF95(t, `<html>
	  <head>
	    <meta property="og:title" content="My Game [v1.2.3] [Studio]">
	    <meta property="og:description" content="A lewd visual novel.">
	    <meta property="og:image" content="https://attachments.f95zone.to/cover.jpg">
	  </head>
	  <body>
	    <h1 class="p-title-value">
	      <a class="labelLink"><span class="label">Ren'Py</span></a>
	      <a class="labelLink"><span class="label">Completed</span></a>
	      My Game [v1.2.3] [Studio] [Android]
	    </h1>
	    <span class="tagList">
	      <a class="tagItem" href="/tags/romance/">romance</a>
	      <a class="tagItem" href="/tags/2dcg/">2dcg</a>
	    </span>
	    <article class="message">
	      <div class="message-body"><div class="bbWrapper">
	        Runs on Windows and Android.
	        <img data-src="https://attachments.f95zone.to/shot1.jpg" src="blank.gif">
	        <img src="https://attachments.f95zone.to/shot2.jpg">
	      </div></div>
	    </article>
	  </body>
	</html>`)

	if res.Kind != string(models.KindGame) {
		t.Fatalf("kind = %q, want game", res.Kind)
	}
	if res.Title != "My Game" {
		t.Fatalf("title = %q, want %q", res.Title, "My Game")
	}
	if res.Cover != "https://attachments.f95zone.to/cover.jpg" {
		t.Fatalf("cover = %q", res.Cover)
	}
	if len(res.Screenshots) != 2 {
		t.Fatalf("screenshots = %v, want 2", res.Screenshots)
	}
	// The lazy-loaded shot must come from data-src, not the blank.gif placeholder.
	if res.Screenshots[0] != "https://attachments.f95zone.to/shot1.jpg" {
		t.Fatalf("first screenshot = %q", res.Screenshots[0])
	}
	if res.DownloadURL != "https://f95zone.to/threads/some-game.12345/" {
		t.Fatalf("download = %q", res.DownloadURL)
	}

	if got := tagsIn(res, "genre"); len(got) != 2 || got[0] != "2dcg" || got[1] != "romance" {
		t.Fatalf("genre tags = %v", got)
	}
	if got := tagsIn(res, "engine"); len(got) != 1 || got[0] != "ren'py" {
		t.Fatalf("engine tags = %v", got)
	}
	if got := tagsIn(res, "status"); len(got) != 1 || got[0] != "Completed" {
		t.Fatalf("status tags = %v", got)
	}
	// Android in the body must surface as a platform, so the app's runs-on-Android
	// badge lights up. Windows comes both from the engine and the explicit mention.
	if got := tagsIn(res, "platform"); len(got) != 2 || got[0] != "android" || got[1] != "windows" {
		t.Fatalf("platform tags = %v, want [android windows]", got)
	}
}

// A PC engine implies Windows even when the post never spells it out.
func TestF95EngineImpliesWindows(t *testing.T) {
	res := parseF95(t, `<html><body>
	  <h1 class="p-title-value"><span class="label">Unity</span> A Game</h1>
	  <article class="message"><div class="bbWrapper">No platforms named here.</div></article>
	</body></html>`)

	if got := tagsIn(res, "platform"); len(got) != 1 || got[0] != "windows" {
		t.Fatalf("platform tags = %v, want [windows]", got)
	}
}

// The title falls back to og:title and still gets cleaned of its brackets.
func TestF95TitleFallbackAndClean(t *testing.T) {
	res := parseF95(t, `<html><head>
	  <meta property="og:title" content="Bare Game [Ongoing] [v0.1]">
	</head><body></body></html>`)

	if res.Title != "Bare Game" {
		t.Fatalf("title = %q, want %q", res.Title, "Bare Game")
	}
}

func TestF95LoginWallDetection(t *testing.T) {
	wall := `<html><body>
	  <form action="/login/login"><input name="password" type="password"></form>
	</body></html>`
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(wall))
	u, _ := url.Parse("https://f95zone.to/threads/x.1/")
	if !isLoginWall(u, doc) {
		t.Fatal("expected a login form with no thread title to read as walled")
	}

	thread := `<html><body><h1 class="p-title-value">A Thread</h1></body></html>`
	doc2, _ := goquery.NewDocumentFromReader(strings.NewReader(thread))
	if isLoginWall(u, doc2) {
		t.Fatal("a page with a thread title must not read as walled")
	}

	// Landing on a /login path is walled regardless of body.
	lu, _ := url.Parse("https://f95zone.to/login/")
	if !isLoginWall(lu, doc2) {
		t.Fatal("a /login final URL must read as walled")
	}
}
