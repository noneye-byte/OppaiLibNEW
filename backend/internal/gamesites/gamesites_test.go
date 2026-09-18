package gamesites

import (
	"reflect"
	"strings"
	"testing"
)

// The snippets below mirror the two sites' live markup as of September 2026, cut
// down to the elements the parsers read.

const itchCell = `<div data-game_id="5017959" dir="auto" class="game_cell has_cover lazy_images"><div class="game_thumb"><a href="https://applemew.itch.io/doofus-engine" class="thumb_link game_link"><img data-lazy_src="https://img.itch.zone/aW1n/315x250%23c/t.png" width="315" height="250" class="lazy_loaded"/></a></div><div class="game_cell_data"><div class="game_title"><a class="title game_link" href="https://applemew.itch.io/doofus-engine">Doofus engine 1.0</a></div><div title="An engine that doesn&#039;t work well" class="game_text">An engine that doesn&#039;t work well</div><div class="game_author"><a href="https://applemew.itch.io">AppleMew</a></div><div class="game_genre">Platformer</div><div class="game_platform"><span class="web_flag">Play in browser</span></div></div></div>`

func TestItchListingIsReadTheSameWayFromJSONAndFromASearchPage(t *testing.T) {
	asJSON := `{"page":1,"num_items":1,"content":` + jsonString(itchCell) + `}`
	asPage := `<html><body><div class="grid">` + itchCell + `</div></body></html>`
	for name, body := range map[string]string{"json": asJSON, "page": asPage} {
		items := ParseItchListing(body)
		if len(items) != 1 {
			t.Fatalf("%s: got %d items", name, len(items))
		}
		got := items[0]
		if got.ID != "5017959" || got.Title != "Doofus engine 1.0" || got.Developer != "AppleMew" {
			t.Fatalf("%s: %+v", name, got)
		}
		if got.Description != "An engine that doesn't work well" {
			t.Fatalf("%s: entities not decoded: %q", name, got.Description)
		}
		if !got.WebPlayable || !reflect.DeepEqual(got.Tags, []string{"Platformer"}) {
			t.Fatalf("%s: platform/genre: %+v", name, got)
		}
		if got.Thumbnail != "https://img.itch.zone/aW1n/315x250%23c/t.png" {
			t.Fatalf("%s: thumbnail %q", name, got.Thumbnail)
		}
	}
}

func jsonString(s string) string {
	return `"` + strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`).Replace(s) + `"`
}

const itchPage = `<html><head>
<meta content="games/5017959" name="itch:path"/>
<meta property="og:image" content="https://img.itch.zone/aW1n/original/cover.png"/>
<meta property="og:description" content="short"/>
</head><body>
<h1 class="game_title">Doofus engine 1.0</h1>
<div class="formatted_description user_formatted"><p>First paragraph.</p><p>Second &amp; last.</p></div><div class="more_information_toggle">
<div class="game_info_panel_widget"><table>
<tr><td>Updated</td><td><abbr title="12 March 2026 @ 10:00 UTC">3 days ago</abbr></td></tr>
<tr><td>Author</td><td><a href="https://applemew.itch.io">AppleMew</a></td></tr>
<tr><td>Genre</td><td><a href="/games/genre-platformer">Platformer</a></td></tr>
<tr><td>Tags</td><td><a href="/games/tag-no-ai">No AI</a>, <a href="/games/tag-platformer">Platformer</a></td></tr>
</table></div>
<div class="screenshot_list"><a href="https://img.itch.zone/aW1n/original/shot1.png"><img/></a><a href="https://img.itch.zone/aW1n/original/shot2.png"><img/></a></div>
<div class="uploads"><div class="upload"><div class="upload_name"><strong class="name" title="game-win.zip">game-win.zip</strong><span class="file_size"><span>64 MB</span></span><span class="download_platforms"><span class="icon icon-windows8"></span></span></div></div></div>
</body></html>`

func TestItchDetailFillsInWhatTheCellLacks(t *testing.T) {
	got := ParseItchDetail(itchPage, ParseItchListing(itchCell)[0])
	if got.Description != "First paragraph.\nSecond & last." {
		t.Fatalf("description %q", got.Description)
	}
	if !reflect.DeepEqual(got.Tags, []string{"Platformer", "No AI"}) {
		t.Fatalf("tags %v (genre first, then tags, deduped)", got.Tags)
	}
	// The listing crop is replaced by the full-size cover, then the screenshots.
	want := []string{"https://img.itch.zone/aW1n/original/cover.png", "https://img.itch.zone/aW1n/original/shot1.png", "https://img.itch.zone/aW1n/original/shot2.png"}
	if !reflect.DeepEqual(got.Images, want) {
		t.Fatalf("images %v", got.Images)
	}
	if ItchIDFromPage(itchPage) != "5017959" {
		t.Fatalf("id %q", ItchIDFromPage(itchPage))
	}
}

func TestItchVersionFallsBackToTheAbsoluteUpdatedDate(t *testing.T) {
	stated, updated := ParseItchVersion(itchPage)
	if stated != "" || updated != "12 March 2026 @ 10:00 UTC" {
		t.Fatalf("stated=%q updated=%q", stated, updated)
	}
}

func TestItchSourcesAreOnePerUploadPointingAtThePage(t *testing.T) {
	got := ParseItchSources(itchPage, "https://applemew.itch.io/doofus-engine", "")
	if len(got) != 1 || got[0].Label != "game-win.zip · Windows · 64 MB" || got[0].URL != "https://applemew.itch.io/doofus-engine" {
		t.Fatalf("%+v", got)
	}
}

const f95ListingBody = `{"status":"ok","msg":{"data":[{"thread_id":270043,"title":"Lussuria Academy","creator":"LustyFrog","version":"v1.5","rating":4.56,"cover":"https://preview.f95zone.to/c.png","screens":["https://preview.f95zone.to/s1.png","http://insecure/s2.png"]},{"thread_id":0,"title":"dropped"}],"pagination":{"page":1,"total":909}}}`

func TestF95ListingReadsRowsAndPageCount(t *testing.T) {
	items, total, err := ParseF95Listing(f95ListingBody, 1)
	if err != nil || total != 909 || len(items) != 1 {
		t.Fatalf("items=%d total=%d err=%v", len(items), total, err)
	}
	got := items[0]
	if got.ID != "270043" || got.URL != "https://f95zone.to/threads/270043/" || got.Version != "1.5" || got.Rating != 4.56 {
		t.Fatalf("%+v", got)
	}
	if !reflect.DeepEqual(got.Images, []string{"https://preview.f95zone.to/c.png", "https://preview.f95zone.to/s1.png"}) {
		t.Fatalf("images %v (only https kept)", got.Images)
	}
	if _, _, err := ParseF95Listing(`{"status":"error"}`, 1); err == nil {
		t.Fatal("a refused request must be an error, not an empty page")
	}
}

const f95Thread = `<html><head><meta property="og:description" content="Overview:&#10;A school."/><meta property="og:image" content="https://f95zone.to/assets/favicon-32x32.png"/></head><body>
<h1 class="p-title-value"><a class="labelLink"><span class="label label--red">VN</span></a><span class="label-append">&nbsp;</span><a class="labelLink"><span class="pre-renpy">Ren&#039;Py</span></a>Lussuria Academy [Ch.4 v1.5] [LustyFrog]</h1>
<span class="js-tagList"><a href="/tags/2dcg/" class="tagItem">2dcg</a><a href="/tags/harem/" class="tagItem">harem</a></span>
<article class="message message--post"><article class="message-body"><div class="bbWrapper">
<b>Changelog</b>:<br/>v1.5<br/>- Added chapter four<br/>- Fixed the garden scene<br/>
<b>Developer Notes</b>: none<br/>
<b>DOWNLOAD</b><br/>Win/Linux: <a href="https://f95zone.to/masked/abc">MEGA</a> - <a href="https://pixeldrain.com/u/xyz">PIXELDRAIN</a><br/>
Mac: <a href="https://gofile.io/d/mac">GOFILE</a><br/>
<a href="https://f95zone.to/members/12/">a profile link</a> <a href="https://x.com/pic"><img src="https://x.com/pic.png"/></a>
</div></article></article>
</body></html>`

func TestF95VersionIsTheFirstBracketWithADigit(t *testing.T) {
	if v := ParseF95Version(f95Thread); v != "Ch.4 v1.5" {
		t.Fatalf("version %q", v)
	}
	plain := strings.Replace(f95Thread, "[Ch.4 v1.5]", "[v0.7.2]", 1)
	if v := ParseF95Version(plain); v != "0.7.2" {
		t.Fatalf("version %q (leading v dropped)", v)
	}
	done := strings.Replace(f95Thread, "[Ch.4 v1.5]", "[Final]", 1)
	if v := ParseF95Version(done); v != "Final" {
		t.Fatalf("version %q", v)
	}
}

func TestF95DetailReadsTagsPrefixesAndSkipsTheFavicon(t *testing.T) {
	got := ParseF95Detail(f95Thread, Item{Site: F95, Images: []string{}, Tags: []string{}})
	if !reflect.DeepEqual(got.Tags, []string{"VN", "Ren'Py", "2dcg", "harem"}) {
		t.Fatalf("tags %v", got.Tags)
	}
	if got.Title != "Lussuria Academy" || got.Version != "Ch.4 v1.5" {
		t.Fatalf("title=%q version=%q", got.Title, got.Version)
	}
	if got.Description != "Overview:\nA school." {
		t.Fatalf("description %q", got.Description)
	}
	if len(got.Images) != 0 || got.Thumbnail != "" {
		t.Fatalf("a guest view's og:image is the favicon, not a cover: %v", got.Images)
	}
}

func TestF95SourcesTakeThePlatformFromTheHeadingBeforeThem(t *testing.T) {
	post := f95FirstPost(f95Thread)
	got := ParseF95Sources(post, "1.5")
	if len(got) != 3 {
		t.Fatalf("got %d sources: %+v", len(got), got)
	}
	// A masked link is named after its text; the platform is positional.
	if got[0].Host != "MEGA" || got[0].Platform != "Windows" || got[0].Label != "MEGA · Windows · 1.5" {
		t.Fatalf("%+v", got[0])
	}
	if got[1].Host != "Pixeldrain" || got[1].Platform != "Windows" {
		t.Fatalf("%+v", got[1])
	}
	if got[2].Host != "Gofile" || got[2].Platform != "Mac" {
		t.Fatalf("%+v", got[2])
	}
}

func TestF95ChangelogStopsBeforeTheDeveloperNotes(t *testing.T) {
	got := ParseF95Changelog(f95FirstPost(f95Thread))
	if !strings.Contains(got, "Added chapter four") || !strings.Contains(got, "garden scene") {
		t.Fatalf("changelog %q", got)
	}
	if strings.Contains(got, "Developer Notes") || strings.Contains(got, "MEGA") {
		t.Fatalf("changelog ran on into the next section: %q", got)
	}
	hidden := `<div class="bbWrapper"><b>Changelog</b>:<br/><div class="bbCodeSpoiler">Spoiler<br/>You don't have permission to view the spoiler content. <br/>Log in or register now.</div></div>`
	if got := ParseF95Changelog(hidden); got != "" {
		t.Fatalf("a changelog inside a spoiler this reader cannot see must read as none, got %q", got)
	}
}

func TestCookiesAreOnlyAcceptedWhenTheyProveASession(t *testing.T) {
	c := New(nil, "test")
	if err := c.SetCookie(Itch, "itchio_token=abc; other=1"); err == nil {
		t.Fatal("itchio_token is handed to every guest and proves nothing")
	}
	if err := c.SetCookie(Itch, "itchio_token=abc; itchio=sess"); err != nil || !c.SignedIn(Itch) {
		t.Fatalf("a header with the session cookie in it signs in: %v", err)
	}
	if err := c.SetCookie(F95, "bare-xf-user-value"); err != nil || !c.SignedIn(F95) {
		t.Fatalf("a bare value is taken as the session cookie: %v", err)
	}
	c.SignOut(F95)
	if c.SignedIn(F95) {
		t.Fatal("signed out")
	}
}

func TestRemoteFromURLNamesThePage(t *testing.T) {
	cases := map[string][2]string{
		"https://f95zone.to/threads/lussuria-academy.270043/": {"f95", "270043"},
		"https://f95zone.to/threads/270043/":                  {"f95", "270043"},
		"https://applemew.itch.io/doofus-engine":              {"itch", ""},
		"https://example.com/game":                            {"", ""},
	}
	for u, want := range cases {
		site, id, ok := RemoteFromURL(u)
		if ok != (want[0] != "") || string(site) != want[0] || id != want[1] {
			t.Fatalf("%s: site=%q id=%q ok=%v", u, site, id, ok)
		}
	}
}

func TestHasUpdateComparesLeniently(t *testing.T) {
	if HasUpdate("v0.7", "0.7") || HasUpdate("Ch.4 v1.5", "ch.4 V1.5") || HasUpdate("0.7", "") {
		t.Fatal("spellings of one build must compare equal, and no version is no update")
	}
	if !HasUpdate("0.7", "0.8") || !HasUpdate("", "0.1") {
		t.Fatal("a different build is an update")
	}
}

// The account block in the F95zone header, as the live site serves it: the same
// element, rendered --guest or --member. The guest half carries p-navgroup-linkText
// spans of its own ("Log in", "Register"), which is why the member test cannot be
// a search for that class alone.
const (
	f95GuestNav = `<div class="p-navgroup p-account p-navgroup--guest">
		<a href="/login/" class="p-navgroup-link p-navgroup-link--textual p-navgroup-link--logIn" data-xf-click="menu"><i></i>
			<span class="p-navgroup-linkText">Log in</span></a>
		<a href="/login/register" class="p-navgroup-link p-navgroup-link--textual p-navgroup-link--register"><i></i>
			<span class="p-navgroup-linkText">Register</span></a>
	</div>`
	f95MemberNav = `<div class="p-navgroup p-account p-navgroup--member">
		<a href="/account/" class="p-navgroup-link p-navgroup-link--user" data-xf-click="menu">
			<span class="avatar avatar--xxs avatar--default"><span class="avatar-u42-s">O</span></span>
			<span class="p-navgroup-linkText">Owen</span></a>
		<div class="menu" data-menu="menu" aria-hidden="true" data-href="/account/visitor-menu"></div>
	</div>`
)

func TestF95TellsAMemberFromAGuestByTheAccountBlock(t *testing.T) {
	if user, in := f95Visitor(`<html><body>` + f95GuestNav + `</body></html>`); in || user != "" {
		t.Fatalf("a guest read as signed in: user=%q", user)
	}
	user, in := f95Visitor(`<html><body>` + f95MemberNav + `</body></html>`)
	if !in {
		t.Fatal("a member read as a guest")
	}
	// The avatar beside the name is a span of initials when the account has no
	// picture; reading the link whole used to hand back "OOwen".
	if user != "Owen" {
		t.Fatalf("username %q", user)
	}
}

// The logout link is not evidence either way: XF2 fetches the visitor menu that
// holds it only when the menu is opened, so a signed-in page does not contain one.
func TestF95SignedInWithoutALogoutLinkStillReadsAsSignedIn(t *testing.T) {
	if _, in := f95Visitor(`<html><body>` + f95MemberNav + `</body></html>`); !in {
		t.Fatal("wanted signed in")
	}
	if strings.Contains(f95MemberNav, "/logout/") {
		t.Fatal("the fixture should not lean on a logout link")
	}
}
