package sources

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// ── 4chan ───────────────────────────────────────────────────────────────────

// A board index: two threads, the second with no subject and no OP upload.
const fourChanIndexJSON = `{"threads":[
  {"posts":[
    {"no":1001,"tim":1600000000001,"ext":".jpg","filename":"op","w":800,"h":600,"sub":"Cool thread","replies":9,"images":4},
    {"no":1002,"tim":1600000000002,"ext":".jpg","filename":"reply"}
  ]},
  {"posts":[{"no":2001,"com":"text OP, <b>no</b> file","replies":2,"images":2}]}
]}`

// One thread: a video post, an image post, and a text-only post that must be skipped
// when browsing *files* — but which is still a post, so it is part of the conversation.
// The last post carries what a real one carries: greentext, a <br>, and a quotelink.
const fourChanThreadJSON = `{"posts":[
  {"no":1001,"tim":1600000000001,"ext":".webm","filename":"clip","w":1280,"h":720,"sub":"Cool thread","name":"Anonymous","time":1600000000},
  {"no":1002,"tim":1600000000002,"ext":".jpg","filename":"pic","w":800,"h":600,"name":"Anonymous","time":1600000100},
  {"no":1003,"name":"Anonymous","time":1600000200,"com":"<span class=\"quote\">&gt;be me</span><br><a href=\"#p1001\" class=\"quotelink\">&gt;&gt;1001</a> nice clip"}
]}`

func newFourChanStub(t *testing.T) (*FourChan, *httptest.Server) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/gif/1.json":
			_, _ = w.Write([]byte(fourChanIndexJSON))
		case "/gif/thread/1001.json":
			_, _ = w.Write([]byte(fourChanThreadJSON))
		default:
			http.NotFound(w, r)
		}
	}))
	f := NewFourChan(srv.Client())
	f.apiHost = srv.URL
	f.cdnHost = "https://i.4cdn.org"
	return f, srv
}

func TestNormalizeFourChanBoard(t *testing.T) {
	tests := map[string]string{
		"b":                             "b",
		"/b/":                           "b",
		"https://boards.4chan.org/GIF/": "gif",
	}
	for in, want := range tests {
		if got := normalizeBoard(in); got != want {
			t.Errorf("normalizeBoard(%q) = %q, want %q", in, got, want)
		}
	}
	if validBoard("b/") || validBoard("") || validBoard("way-too-long") {
		t.Fatal("validBoard accepted a malformed board")
	}
}

// A board lists threads, not a shredded pile of every file on it.
func TestFourChanBrowseListsThreads(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()

	got, err := f.Browse(context.Background(), BrowseParams{Feed: "gif"})
	if err != nil {
		t.Fatalf("Browse: %v", err)
	}
	if len(got.Items) != 2 {
		t.Fatalf("items = %d, want 2 — one tile per thread, not per file", len(got.Items))
	}

	th := got.Items[0]
	if th.Kind != "thread" {
		t.Errorf("kind = %q, want thread", th.Kind)
	}
	// Without a feed id the client has nothing to browse into, and the tile is dead.
	if th.FeedID != "gif:t1001" {
		t.Errorf("feed id = %q, want gif:t1001", th.FeedID)
	}
	if th.Title != "Cool thread" {
		t.Errorf("title = %q, want the OP's subject", th.Title)
	}
	if th.ThumbURL != "https://i.4cdn.org/gif/1600000000001s.jpg" {
		t.Errorf("thumb url = %q, want the OP's s.jpg thumbnail", th.ThumbURL)
	}
	// "images" counts the replies' uploads; the OP's own file is not among them.
	if th.Count != 5 {
		t.Errorf("count = %d, want 5 (4 reply images + the OP's)", th.Count)
	}
	if th.MediaURL != "" {
		t.Errorf("media url = %q, want empty — a thread is browsed, not streamed", th.MediaURL)
	}

	// A text-only OP still makes a thread: its files are in the replies.
	text := got.Items[1]
	if text.ThumbURL != "" {
		t.Errorf("thumb url = %q, want empty for an OP with no upload", text.ThumbURL)
	}
	if text.Title != "text OP, no file" {
		t.Errorf("title = %q, want the OP's comment with its markup stripped", text.Title)
	}
	if text.Count != 2 {
		t.Errorf("count = %d, want 2", text.Count)
	}
}

// Opening a thread is just browsing its feed id — that's what keeps drilling in from
// needing a second endpoint.
func TestFourChanBrowseThread(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()

	got, err := f.Browse(context.Background(), BrowseParams{Feed: "gif:t1001"})
	if err != nil {
		t.Fatalf("Browse: %v", err)
	}
	if len(got.Items) != 2 {
		t.Fatalf("items = %d, want 2 (the text-only post has no file)", len(got.Items))
	}
	// A thread is served whole; a cursor would page it into itself forever.
	if got.Cursor != "" {
		t.Errorf("cursor = %q, want empty — a thread has one page", got.Cursor)
	}

	v := got.Items[0]
	if v.Kind != "video" {
		t.Errorf("webm kind = %q, want video", v.Kind)
	}
	if v.MediaURL != "https://i.4cdn.org/gif/1600000000001.webm" {
		t.Errorf("media url = %q", v.MediaURL)
	}
	// 4chan thumbnails are always JPEG, even for a webm.
	if v.ThumbURL != "https://i.4cdn.org/gif/1600000000001s.jpg" {
		t.Errorf("thumb url = %q, want the s.jpg form", v.ThumbURL)
	}
	// Inside a thread the subject is on every tile already; the filename is the only
	// thing that tells one file from the next.
	if v.Title != "clip.webm" {
		t.Errorf("title = %q, want the uploader's filename", v.Title)
	}
	if got.Items[1].Kind != "image" {
		t.Errorf("jpg kind = %q, want image", got.Items[1].Kind)
	}
}

// Every file in a thread carries the thread it came from, which is what lets the
// viewer pull up the conversation around the image that's on screen.
func TestFourChanFilesCarryTheirThread(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()

	got, err := f.Browse(context.Background(), BrowseParams{Feed: "gif:t1001"})
	if err != nil {
		t.Fatalf("Browse: %v", err)
	}
	for _, item := range got.Items {
		if item.ThreadID != "gif:t1001" {
			t.Errorf("item %q threadId = %q, want gif:t1001", item.ID, item.ThreadID)
		}
	}
	if got.Items[0].PostNo != 1001 {
		t.Errorf("postNo = %d, want 1001 — the comment list marks the post on screen", got.Items[0].PostNo)
	}

	// A board's thread tiles are their own thread, so the grid can offer comments too.
	board, err := f.Browse(context.Background(), BrowseParams{Feed: "gif"})
	if err != nil {
		t.Fatalf("Browse board: %v", err)
	}
	if board.Items[0].ThreadID != "gif:t1001" {
		t.Errorf("thread tile threadId = %q, want gif:t1001", board.Items[0].ThreadID)
	}
}

// A thread's comments are the conversation: every post, in order, text or not.
func TestFourChanComments(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()

	got, err := f.Comments(context.Background(), "gif:t1001")
	if err != nil {
		t.Fatalf("Comments: %v", err)
	}
	// Three posts — including the image-only one. Dropping a post with no text would
	// leave the >>quotes pointing at posts that aren't in the list.
	if len(got) != 3 {
		t.Fatalf("comments = %d, want 3 (every post, text or not)", len(got))
	}
	if !got[0].OP {
		t.Error("first post should be marked as the OP")
	}
	if got[1].OP {
		t.Error("a reply is not the OP")
	}
	// A post's own upload comes with it: on 4chan the picture is often the whole point.
	if got[0].MediaURL != "https://i.4cdn.org/gif/1600000000001.webm" {
		t.Errorf("OP media url = %q", got[0].MediaURL)
	}
	if got[1].ThumbURL != "https://i.4cdn.org/gif/1600000000002s.jpg" {
		t.Errorf("reply thumb url = %q", got[1].ThumbURL)
	}

	// Line breaks and greentext survive; markup does not.
	want := ">be me\n>>1001 nice clip"
	if got[2].Text != want {
		t.Errorf("text = %q, want %q", got[2].Text, want)
	}
	if len(got[2].Quotes) != 1 || got[2].Quotes[0] != 1001 {
		t.Errorf("quotes = %v, want [1001]", got[2].Quotes)
	}
	if got[2].Name != "Anonymous" {
		t.Errorf("name = %q, want Anonymous", got[2].Name)
	}
}

// Comments are a thread's, so asking a file (or nonsense) for them is an error rather
// than an empty conversation.
func TestFourChanCommentsRejectNonThreads(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()

	for _, id := range []string{"gif:f1600000000001", "", "nope:t1"} {
		if _, err := f.Comments(context.Background(), id); err == nil {
			t.Errorf("Comments(%q) should fail — that isn't a thread", id)
		}
	}
}

// Saving a thread means saving its images as a comic — the webm in it is not a page.
func TestFourChanThreadPagesSkipVideo(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()

	got, err := f.Pages(context.Background(), "gif:t1001")
	if err != nil {
		t.Fatalf("Pages: %v", err)
	}
	want := []string{"https://i.4cdn.org/gif/1600000000002.jpg"}
	if len(got) != len(want) || got[0] != want[0] {
		t.Errorf("pages = %v, want %v — a .webm is not a comic page", got, want)
	}
}

func TestFourChanRejectsBadThreadFeed(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()

	for _, feed := range []string{"nope:t1", "gif:tabc", "gif:t0", "gif:x1"} {
		if _, err := f.Browse(context.Background(), BrowseParams{Feed: feed}); err == nil {
			t.Errorf("Browse(%q) should fail", feed)
		}
	}
}

func TestFourChanPaginates(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()

	got, err := f.Browse(context.Background(), BrowseParams{Feed: "gif"})
	if err != nil {
		t.Fatalf("Browse: %v", err)
	}
	if got.Cursor != "2" {
		t.Errorf("cursor = %q, want 2", got.Cursor)
	}
}

// The API only serves pages 1–10, so the cursor must stop rather than walk off.
func TestFourChanStopsAtLastPage(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"threads":[]}`))
	}))
	defer srv.Close()
	f := NewFourChan(srv.Client())
	f.apiHost = srv.URL

	got, err := f.Browse(context.Background(), BrowseParams{Feed: "gif", Cursor: "10"})
	if err != nil {
		t.Fatalf("Browse: %v", err)
	}
	if got.Cursor != "" {
		t.Errorf("cursor at last page = %q, want empty", got.Cursor)
	}
}

// The body has to outlive the fetch's timeout context.
//
// httpGet used to hand back a live *http.Response with `defer cancel()` already
// queued, so the context died the moment it returned and reading the body failed with
// "context canceled" — every real board index, every time. A tiny stub body hid it,
// because the transport had already buffered it and the decode still worked. So this
// stub streams a body far larger than any buffer: it fails against that bug and passes
// against a fetch that reads the body under its own deadline.
func TestFourChanReadsABodyBiggerThanTheBuffer(t *testing.T) {
	var threads []string
	for i := range 4000 {
		threads = append(threads, fmt.Sprintf(
			`{"posts":[{"no":%d,"tim":%d,"ext":".jpg","filename":"pic%d","sub":"thread %d","images":3}]}`,
			i+1, 1600000000000+i, i, i))
	}
	body := `{"threads":[` + strings.Join(threads, ",") + `]}`
	if len(body) < 256<<10 {
		t.Fatalf("stub body is only %d bytes — too small to outrun the transport buffer", len(body))
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, body)
	}))
	defer srv.Close()
	f := NewFourChan(srv.Client())
	f.apiHost = srv.URL

	got, err := f.Browse(context.Background(), BrowseParams{Feed: "gif"})
	if err != nil {
		t.Fatalf("Browse over a large index: %v", err)
	}
	if len(got.Items) != 4000 {
		t.Errorf("items = %d, want 4000", len(got.Items))
	}
}

func TestFourChanRejectsUnknownBoard(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()
	if _, err := f.Browse(context.Background(), BrowseParams{Feed: "not-a-board"}); err == nil {
		t.Fatal("browsing an unknown board should fail")
	}
}

// ── Rule34.xxx ─────────────────────────────────────────────────────────────

func TestRule34BrowseAndResolvePost(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Query().Get("s") {
		case "list":
			_, _ = io.WriteString(w, `<div class="image-list"><span class="thumb">
<a href="/index.php?page=post&amp;s=view&amp;id=123"><img class="preview webm-thumb"
src="https://wimg.rule34.xxx/thumbnails/1/thumbnail_hash.jpg?123"
alt="animated blue_hair video score:4 rating:explicit"></a></span></div>`)
		case "view":
			_, _ = io.WriteString(w, `<video poster="https://wimg.rule34.xxx/images/1/hash.jpg?123">
<source src="https://nymp4.rule34.xxx/images/1/hash.mp4?123"></video>
<textarea id="tags">animated blue_hair video</textarea>`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	src := NewRule34(srv.Client())
	src.baseURL = srv.URL
	listing, err := src.Browse(context.Background(), BrowseParams{Feed: "search", Query: "blue hair"})
	if err != nil {
		t.Fatal(err)
	}
	if len(listing.Items) != 1 || listing.Items[0].FeedID != "post:123" || listing.Items[0].Kind != "thread" {
		t.Fatalf("listing = %+v", listing)
	}
	post, err := src.Browse(context.Background(), BrowseParams{Feed: "post:123"})
	if err != nil {
		t.Fatal(err)
	}
	if len(post.Items) != 1 || post.Items[0].Kind != "video" || !strings.Contains(post.Items[0].MediaURL, "hash.mp4") {
		t.Fatalf("post = %+v", post)
	}
}

func TestRule34TagSearchRequiresTerm(t *testing.T) {
	src := NewRule34(http.DefaultClient)
	if _, err := src.Browse(context.Background(), BrowseParams{Feed: "search"}); err == nil {
		t.Fatal("empty tag search should fail before making a request")
	}
}

func TestRule34AuthenticatedAPIReturnsDirectMedia(t *testing.T) {
	var gotCredentials bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		gotCredentials = q.Get("page") == "dapi" && q.Get("user_id") == "42" && q.Get("api_key") == "secret"
		_, _ = io.WriteString(w, `[{
			"id":123,"tags":"animated blue_hair score:9","file_url":"https://nymp4.rule34.xxx/a/hash.mp4",
			"preview_url":"https://wimg.rule34.xxx/a/hash.jpg","width":1280,"height":720
		}]`)
	}))
	defer srv.Close()

	src := NewRule34(srv.Client())
	src.baseURL = srv.URL
	src.SetCredentials("42", "secret")
	listing, err := src.Browse(context.Background(), BrowseParams{Feed: "search", Query: "blue_hair"})
	if err != nil {
		t.Fatal(err)
	}
	if !gotCredentials || len(listing.Items) != 1 {
		t.Fatalf("credentials=%v listing=%+v", gotCredentials, listing)
	}
	item := listing.Items[0]
	if item.Kind != "video" || item.MediaURL == "" || item.FeedID != "" || item.Width != 1280 || item.Height != 720 {
		t.Fatalf("direct API item = %+v", item)
	}
}

// An empty feed id means "lead with something", not "error".
func TestFourChanDefaultsToFirstBoard(t *testing.T) {
	f, srv := newFourChanStub(t)
	defer srv.Close()
	// The stub only serves /gif/1.json, which is the first board — so a successful
	// browse is itself the assertion that the default was used.
	if _, err := f.Browse(context.Background(), BrowseParams{}); err != nil {
		t.Fatalf("browsing with no feed should fall back to the first board: %v", err)
	}
}

// ── 3hentai (the built-in YAML source) ──────────────────────────────────────

// stubFetcher stands in for the scraper.
type stubFetcher struct {
	html  string
	pages []string
	// got records the URL Document was asked for, so a test can assert on the URL a
	// feed template built.
	got string
}

func (s *stubFetcher) Client() *http.Client { return http.DefaultClient }
func (s *stubFetcher) Document(_ context.Context, u string) (string, error) {
	s.got = u
	return s.html, nil
}
func (s *stubFetcher) ComicPages(context.Context, string) ([]string, error) {
	return s.pages, nil
}

// threeHentaiListing is copied verbatim from a live 3hentai listing (2026-07).
//
// This matters more than it looks. The previous fixture was *invented* — it used
// root-relative hrefs ("/d/12345") and a ".caption" title, neither of which the site
// emits — so the parser was tested against its own misunderstanding and passed while
// finding exactly zero items against the real page. A fixture for a scraped site is
// only worth anything if it is real markup.
const threeHentaiListing = `<html><body>
<div class="doujin-col">
    <div class="doujin ">
        <a href="https://3hentai.net/d/700219" class="cover" style="padding:0 0 75% 0">
            <img class="lazy small-bg-load" data-src="https://s1.3hentai.xyz/d2393782/thumb.jpg" width="250" height="187" />
<noscript><img src="https://s1.3hentai.xyz/d2393782/thumb.jpg" width="250" height="187"/></noscript>
            <div class="title flag flag-eng">[Amasawa Natsuhisa] I&#039;ll let you do things (Blue Archive)</div>
        </a>
    </div>
</div><div class="doujin-col">
    <div class="doujin ">
        <a href="https://3hentai.net/d/700218" class="cover" style="padding:0 0 141.2% 0">
            <img class="lazy small-bg-load" data-src="https://s1.3hentai.xyz/d2393772/thumb.jpg" width="250" height="353" />
            <div class="title flag flag-eng">[Inai Uchi ni] Uta Hime no Kyouen (Symphogear)</div>
        </a>
    </div>
</div>
</body></html>`

// threeHentai builds the source from the *shipped* spec, so these tests exercise the
// real YAML rather than a copy of it that can drift.
func threeHentai(t *testing.T, f PageFetcher) *YAMLSource {
	t.Helper()
	data, err := builtinSources.ReadFile("builtin/3hentai.yaml")
	if err != nil {
		t.Fatalf("reading the built-in spec: %v", err)
	}
	spec, err := ParseSpec(data)
	if err != nil {
		t.Fatalf("parsing the built-in spec: %v", err)
	}
	return NewYAMLSource(*spec, f)
}

func TestThreeHentaiBrowse(t *testing.T) {
	src := threeHentai(t, &stubFetcher{html: threeHentaiListing})

	got, err := src.Browse(context.Background(), BrowseParams{Feed: "recent"})
	if err != nil {
		t.Fatalf("Browse: %v", err)
	}
	if len(got.Items) != 2 {
		t.Fatalf("items = %d, want 2 — the live site uses absolute hrefs, which is what broke this", len(got.Items))
	}

	first := got.Items[0]
	if first.ID != "700219" {
		t.Errorf("id = %q, want 700219 (parsed out of an absolute href)", first.ID)
	}
	if first.Kind != "comic" {
		t.Errorf("kind = %q, want comic", first.Kind)
	}
	// The title lives in div.title. Reading the wrong element doesn't fail loudly —
	// it just labels every gallery "3hentai 700219" — so assert on the real one.
	if !strings.HasPrefix(first.Title, "[Amasawa Natsuhisa]") {
		t.Errorf("title = %q, want the div.title text", first.Title)
	}
	// Covers come off a separate CDN domain; if this regresses to 3hentai.net the
	// proxy's host guard 403s every thumbnail in the grid.
	if first.ThumbURL != "https://s1.3hentai.xyz/d2393782/thumb.jpg" {
		t.Errorf("thumb = %q, want the s1.3hentai.xyz cover", first.ThumbURL)
	}
	if first.PageURL != "https://3hentai.net/d/700219" {
		t.Errorf("page url = %q", first.PageURL)
	}
	if got.Items[1].ID != "700218" {
		t.Errorf("second id = %q", got.Items[1].ID)
	}
}

// The cover CDN is a different domain from the site. It must be allowed through the
// proxy, or browsing renders a grid of broken images.
func TestThreeHentaiCoverHostIsAllowed(t *testing.T) {
	r := &Registry{srcs: []Source{threeHentai(t, &stubFetcher{})}}
	if !r.AllowsHost("s1.3hentai.xyz") {
		t.Error("the cover CDN is not allowed — every thumbnail would come back 403")
	}
}

// An empty listing means the end; paging past it would loop forever.
func TestThreeHentaiEmptyListingEndsPagination(t *testing.T) {
	src := threeHentai(t, &stubFetcher{html: `<html><body>nothing here</body></html>`})
	got, err := src.Browse(context.Background(), BrowseParams{Feed: "recent", Cursor: "9"})
	if err != nil {
		t.Fatalf("Browse: %v", err)
	}
	if len(got.Items) != 0 || got.Cursor != "" {
		t.Errorf("empty listing = %+v, want no items and no cursor", got)
	}
}

// The index pages by path segment ("/2"), not by query parameter ("/?page=2"), which
// the site ignores. That failure is invisible — no error, just page one served again
// — so infinite scroll would silently re-append the same 25 galleries forever.
func TestThreeHentaiRecentPagesByPathSegment(t *testing.T) {
	f := &stubFetcher{html: threeHentaiListing}
	src := threeHentai(t, f)

	if _, err := src.Browse(context.Background(), BrowseParams{Feed: "recent", Cursor: "2"}); err != nil {
		t.Fatalf("Browse: %v", err)
	}
	if f.got != "https://3hentai.net/2" {
		t.Errorf("recent page 2 fetched %q, want https://3hentai.net/2 — ?page= is ignored by the site", f.got)
	}
}

// Search is where the site actually implements popularity, so the term and the sort
// both have to reach the URL.
func TestThreeHentaiSearchBuildsURL(t *testing.T) {
	f := &stubFetcher{html: threeHentaiListing}
	src := threeHentai(t, f)

	if _, err := src.Browse(context.Background(), BrowseParams{
		Feed: "search", Query: "blue archive", Sort: "popular", Cursor: "2",
	}); err != nil {
		t.Fatalf("Browse: %v", err)
	}
	for _, want := range []string{"q=blue+archive", "sort=popular", "page=2"} {
		if !strings.Contains(f.got, want) {
			t.Errorf("search URL %q is missing %q", f.got, want)
		}
	}
}

// A search feed with no term must say so rather than fetch a listing that 404s and
// present it to the user as an empty feed.
func TestThreeHentaiSearchNeedsATerm(t *testing.T) {
	src := threeHentai(t, &stubFetcher{html: threeHentaiListing})
	if _, err := src.Browse(context.Background(), BrowseParams{Feed: "search"}); err == nil {
		t.Error("searching with no term should fail, not return an empty page")
	}
}

// threeHentaiGallery is the page-thumbnail strip from a live gallery, plus the cover
// and site chrome that share the page with it.
const threeHentaiGallery = `<html><body>
<img class="lazy" data-src="https://s1.3hentai.xyz/d2393782/cover.jpg" />
<div class="single-thumb">
    <a href="https://3hentai.net/d/700219/1" rel="nofollow">
        <img class="lazy small-bg-load" data-src="https://s1.3hentai.xyz/d2393782/1t.jpg" width="200" height="291" />
<noscript><img src="https://s1.3hentai.xyz/d2393782/1t.jpg" width="200" height="291"/></noscript>
    </a>
</div>
<div class="single-thumb">
    <a href="https://3hentai.net/d/700219/2" rel="nofollow">
        <img class="lazy small-bg-load" data-src="https://s1.3hentai.xyz/d2393782/2t.jpg" width="200" height="291" />
    </a>
</div>
</body></html>`

// The detail page only ever carries the page *thumbnails*; the full-size page is the
// same URL with the "t" dropped. Getting this wrong is quiet and expensive — the
// reader looks fine (thumbnails are still images) and a *saved* comic is permanently
// a pile of 74KB mush instead of the 400KB originals.
func TestThreeHentaiPagesResolveToFullSize(t *testing.T) {
	src := threeHentai(t, &stubFetcher{html: threeHentaiGallery})

	got, err := src.Pages(context.Background(), "700219")
	if err != nil {
		t.Fatalf("Pages: %v", err)
	}
	want := []string{
		"https://s1.3hentai.xyz/d2393782/1.jpg",
		"https://s1.3hentai.xyz/d2393782/2.jpg",
	}
	if len(got) != len(want) {
		t.Fatalf("pages = %v, want %v — the cover must not be imported as a page", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("page %d = %q, want %q (the thumbnail, not the page)", i+1, got[i], want[i])
		}
	}
}

// Item ids are pasted into a URL template, so a hostile id must not be able to steer
// the fetch somewhere else.
func TestPagesRejectsHostileItemID(t *testing.T) {
	src := threeHentai(t, &stubFetcher{})
	for _, id := range []string{"../../admin", "https://evil.net/x", "1 2", ""} {
		if _, err := src.Pages(context.Background(), id); err == nil {
			t.Errorf("Pages(%q) should be rejected", id)
		}
	}
}

// ── the YAML source engine ──────────────────────────────────────────────────

// Every built-in definition must actually parse. Without this a typo in a shipped
// spec is only discovered as a silently missing source at runtime.
func TestBuiltinSpecsParse(t *testing.T) {
	entries, err := builtinSources.ReadDir("builtin")
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("no built-in source definitions were embedded")
	}
	for _, e := range entries {
		data, err := builtinSources.ReadFile("builtin/" + e.Name())
		if err != nil {
			t.Fatalf("%s: %v", e.Name(), err)
		}
		if _, err := ParseSpec(data); err != nil {
			t.Errorf("%s: %v", e.Name(), err)
		}
	}
}

// A user file with the same id replaces the built-in — that's the escape hatch when a
// site restyles and the shipped selectors go stale.
func TestUserSpecOverridesBuiltin(t *testing.T) {
	dir := t.TempDir()
	const override = `
id: 3hentai
name: 3hentai (patched)
base_url: https://3hentai.net
hosts: ["3hentai.net"]
listing:
  item: "a"
  id: {attr: href, pattern: "/d/(\\d+)"}
  thumb: {selector: "img", attr: src}
  page_url: "/d/{id}"
feeds:
  - {id: recent, label: Recent, path: "/?page={page}"}
`
	if err := os.WriteFile(filepath.Join(dir, "3hentai.yaml"), []byte(override), 0o644); err != nil {
		t.Fatal(err)
	}

	r := NewRegistry(&stubFetcher{}, dir, discardLogger{})
	src, ok := r.Get("3hentai")
	if !ok {
		t.Fatal("3hentai is missing from the registry")
	}
	if src.Name() != "3hentai (patched)" {
		t.Errorf("name = %q, want the user file to win over the built-in", src.Name())
	}
}

// A broken user file must not take the whole registry down with it.
func TestBadUserSpecIsSkipped(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "junk.yaml"), []byte("id: [this is not a spec"), 0o644); err != nil {
		t.Fatal(err)
	}
	r := NewRegistry(&stubFetcher{}, dir, discardLogger{})
	if _, ok := r.Get("3hentai"); !ok {
		t.Error("a malformed user file took out the built-in sources")
	}
	if _, ok := r.Get("4chan"); !ok {
		t.Error("a malformed user file took out the Go sources")
	}
}

type discardLogger struct{}

func (discardLogger) Warn(string, ...any) {}

// ── registry / proxy guard ──────────────────────────────────────────────────

func TestAllowsHost(t *testing.T) {
	r := NewRegistry(&stubFetcher{}, "", discardLogger{})

	for _, host := range []string{"i.4cdn.org", "a.4cdn.org", "3hentai.net", "s1.3hentai.xyz"} {
		if !r.AllowsHost(host) {
			t.Errorf("AllowsHost(%q) = false, want true", host)
		}
	}
	// The whole point of the guard: the proxy must not be usable against anything else.
	for _, host := range []string{"", "evil.net", "169.254.169.254", "localhost", "3hentai.net.evil.net"} {
		if r.AllowsHost(host) {
			t.Errorf("AllowsHost(%q) = true, want false — the proxy would be an SSRF hole", host)
		}
	}
}

// Registry.Decorate must stamp a 4chan CDN request with the boards.4chan.org Referer
// its hotlink guard demands, and leave a request to some other source's host alone.
func TestRegistryDecorate4chanReferer(t *testing.T) {
	r := NewRegistry(&stubFetcher{}, "", discardLogger{})

	req, _ := http.NewRequest(http.MethodGet, "https://i.4cdn.org/gif/123.webm", nil)
	r.Decorate(req)
	if got := req.Header.Get("Referer"); got != fourChanReferer {
		t.Errorf("Referer = %q, want %q — the CDN 429s without it", got, fourChanReferer)
	}

	// A host owned by a different (YAML) source doesn't get 4chan's headers.
	other, _ := http.NewRequest(http.MethodGet, "https://3hentai.net/g/1", nil)
	r.Decorate(other)
	if got := other.Header.Get("Referer"); got == fourChanReferer {
		t.Errorf("Referer = %q, want it unset — that Referer belongs to 4chan only", got)
	}
}

// The Referer must actually ride the source's own JSON fetches, not just live on the
// proxy path — a browse request that Cloudflare refuses empties the grid too.
func TestFourChanBrowseSendsReferer(t *testing.T) {
	var gotReferer, gotUA string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotReferer = r.Header.Get("Referer")
		gotUA = r.Header.Get("User-Agent")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(fourChanIndexJSON))
	}))
	defer srv.Close()
	f := NewFourChan(srv.Client())
	f.apiHost = srv.URL

	if _, err := f.Browse(context.Background(), BrowseParams{Feed: "gif"}); err != nil {
		t.Fatalf("Browse: %v", err)
	}
	if gotReferer != fourChanReferer {
		t.Errorf("Referer = %q, want %q", gotReferer, fourChanReferer)
	}
	if !strings.Contains(gotUA, "Mozilla") {
		t.Errorf("User-Agent = %q, want a browser-like UA the CDN accepts", gotUA)
	}
}
