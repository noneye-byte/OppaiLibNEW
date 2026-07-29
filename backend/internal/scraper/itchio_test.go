package scraper

import (
	"net/url"
	"sort"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
	"github.com/youruser/oppailib/internal/models"
)

func parseItch(t *testing.T, html string) *models.ScrapeResult {
	t.Helper()
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parse html: %v", err)
	}
	u, _ := url.Parse("https://someone.itch.io/a-game")
	res, err := ItchParser{}.Parse(doc, u)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	return res
}

// platformTags is what a client actually reads to decide "does this run on Android?".
func platformTags(res *models.ScrapeResult) []string {
	var out []string
	for _, tg := range res.CategorizedTags {
		if tg.Category == "platform" {
			out = append(out, tg.Name)
		}
	}
	sort.Strings(out)
	return out
}

func TestItchPlatformsFromInfoPanel(t *testing.T) {
	res := parseItch(t, `<html><body>
	  <div class="game_info_panel_widget"><table><tr>
	    <td>Platforms</td>
	    <td>
	      <a href="https://itch.io/games/platform-windows">Windows</a>,
	      <a href="https://itch.io/games/platform-android">Android</a>
	    </td>
	  </tr></table></div>
	</body></html>`)

	got := platformTags(res)
	if len(got) != 2 || got[0] != "android" || got[1] != "windows" {
		t.Fatalf("platforms = %v, want [android windows]", got)
	}
}

// A browser-playable project has no platform links in the info panel — the only
// evidence is the icon on the upload row.
func TestItchPlatformsFromUploadIcons(t *testing.T) {
	res := parseItch(t, `<html><body>
	  <div class="upload"><span class="icon icon-tux"></span> game-linux.zip</div>
	  <div class="upload"><span class="icon icon-android"></span> game.apk</div>
	</body></html>`)

	got := platformTags(res)
	if len(got) != 2 || got[0] != "android" || got[1] != "linux" {
		t.Fatalf("platforms = %v, want [android linux]", got)
	}
}

// The same platform named by both a link and an icon must land once, not twice.
func TestItchPlatformsDeduped(t *testing.T) {
	res := parseItch(t, `<html><body>
	  <a href="https://itch.io/games/platform-android">Android</a>
	  <div class="upload"><span class="icon icon-android"></span> game.apk</div>
	</body></html>`)

	if got := platformTags(res); len(got) != 1 || got[0] != "android" {
		t.Fatalf("platforms = %v, want [android]", got)
	}
}

// itch spells macOS "osx" in its URLs; we store one canonical name.
func TestItchPlatformCanonicalization(t *testing.T) {
	res := parseItch(t, `<html><body>
	  <a href="https://itch.io/games/platform-osx">macOS</a>
	  <a href="https://itch.io/games/platform-html5">Web</a>
	</body></html>`)

	got := platformTags(res)
	if len(got) != 2 || got[0] != "macos" || got[1] != "web" {
		t.Fatalf("platforms = %v, want [macos web]", got)
	}
}

func TestItchNoPlatformsIsNotAnError(t *testing.T) {
	res := parseItch(t, `<html><body><h1 class="game_title">Bare</h1></body></html>`)
	if got := platformTags(res); len(got) != 0 {
		t.Fatalf("platforms = %v, want none", got)
	}
}
