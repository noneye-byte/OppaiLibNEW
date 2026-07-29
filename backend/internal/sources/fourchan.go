package sources

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

// FourChan browses 4chan's boards through its read-only JSON API.
//
// The API is the whole reason this source is cheap: a.4cdn.org serves each board's
// index as JSON, so there is no HTML to parse and nothing to break when the site is
// restyled. Media lives on i.4cdn.org under the post's upload timestamp.
//
// A board is browsed as *threads*, not as a flat run of files. That's how the site
// works and it's how people read it: an /h/ thread is a set — one dump, one artist,
// one theme — and shredding it into 400 unlabelled tiles throws away the only
// structure the board has. So a board listing yields one tile per thread (the OP's
// image, the subject, the file count), and opening a thread browses *into* it. See
// Item.FeedID: a thread is a container, and the client drills into containers rather
// than opening them in the viewer.
type FourChan struct {
	hc      *http.Client
	apiHost string // overridable in tests
	cdnHost string
}

// fourChanBoards are the media-heavy boards worth browsing. 4chan has scores of
// boards; a picker listing all of them would be noise, so this is the subset whose
// content is actually images and video.
var fourChanBoards = []Feed{
	{ID: "gif", Label: "/gif/ — Adult GIF"},
	{ID: "wsg", Label: "/wsg/ — Worksafe GIF"},
	{ID: "hr", Label: "/hr/ — High Resolution"},
	{ID: "w", Label: "/w/ — Anime Wallpapers"},
	{ID: "wg", Label: "/wg/ — Wallpapers/General"},
	{ID: "aco", Label: "/aco/ — Adult Cartoon"},
	{ID: "h", Label: "/h/ — Hentai"},
	{ID: "e", Label: "/e/ — Ecchi"},
	{ID: "u", Label: "/u/ — Yuri"},
	{ID: "d", Label: "/d/ — Hentai/Alternative"},
	{ID: "s", Label: "/s/ — Sexy Beautiful Women"},
	{ID: "hc", Label: "/hc/ — Hardcore"},
	{ID: "p", Label: "/p/ — Photography"},
}

// fourChanLastPage is the last index page a board serves. The API exposes 1–10 and
// 404s past that, so paging stops there rather than probing.
const fourChanLastPage = 10

func NewFourChan(hc *http.Client) *FourChan {
	return &FourChan{hc: hc, apiHost: "https://a.4cdn.org", cdnHost: "https://i.4cdn.org"}
}

func (f *FourChan) ID() string   { return "4chan" }
func (f *FourChan) Name() string { return "4chan" }
func (f *FourChan) AccessPolicy() AccessPolicy {
	return AccessPolicy{
		Authentication: "none",
		ContentWarning: "User-posted, unmoderated material varies by board; several listed boards contain explicit adult content.",
	}
}
func (f *FourChan) Feeds() []Feed { return fourChanBoards }
func (f *FourChan) Hosts() []string {
	return []string{"a.4cdn.org", "i.4cdn.org", "is2.4chan.org"}
}

// fourChanReferer is the page a browser is on when it loads a board's JSON or pulls a
// file from the CDN. 4chan's CDN (i.4cdn.org) now sits behind Cloudflare hotlink
// protection and refuses any request that doesn't carry it — which is what silently
// emptied the grid's thumbnails and broke video playback while the JSON API (which is
// laxer) kept working, so browse "stopped working without an error".
const fourChanReferer = "https://boards.4chan.org/"

// fourChanUserAgent presents as a real browser. The old descriptive UA was fine for
// the JSON API but is exactly the kind of client Cloudflare's bot management refuses
// on the CDN, so every 4chan request now looks like a browser on the board page.
const fourChanUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

// Decorate adds the headers a browser loading a 4chan thread would send. Applied to
// this source's own API fetches (via httpGet) and, through the registry, to every
// media request the streaming proxy makes for i.4cdn.org — see Registry.Decorate.
func (f *FourChan) Decorate(req *http.Request) {
	req.Header.Set("Referer", fourChanReferer)
	if req.Header.Get("Accept") == "" {
		req.Header.Set("Accept", "*/*")
	}
}

// fourChanIndex is the shape of /{board}/{page}.json, narrowed to what we read. The
// first post of each thread is its OP.
type fourChanIndex struct {
	Threads []struct {
		Posts []fourChanPost `json:"posts"`
	} `json:"threads"`
}

// fourChanThread is the shape of /{board}/thread/{no}.json — every post, in order.
type fourChanThread struct {
	Posts []fourChanPost `json:"posts"`
}

type fourChanPost struct {
	No       int64  `json:"no"`
	Tim      int64  `json:"tim"`      // upload timestamp; names the file on the CDN
	Ext      string `json:"ext"`      // ".webm", ".jpg", …
	Filename string `json:"filename"` // the uploader's original name, without extension
	Width    int    `json:"w"`
	Height   int    `json:"h"`
	Sub      string `json:"sub"`  // thread subject
	Com      string `json:"com"`  // comment, as HTML
	Name     string `json:"name"` // poster name; "Anonymous" unless they set one
	Time     int64  `json:"time"` // unix seconds
	// Replies and Images are only on an OP, and count the *replies* — the OP's own
	// upload is not among them.
	Replies int `json:"replies"`
	Images  int `json:"images"`
}

// threadFeed reads a feed id of the form "<board>:t<no>" — a single thread, browsed
// as if it were a feed of its own. Ids avoid "/" so they survive a round trip through
// a path segment without depending on how a client escapes a slash.
func threadFeed(feed string) (board string, no int64, ok bool) {
	board, rest, found := strings.Cut(feed, ":")
	board = normalizeBoard(board)
	if !found || !validBoard(board) || !strings.HasPrefix(rest, "t") {
		return "", 0, false
	}
	n, err := strconv.ParseInt(strings.TrimPrefix(rest, "t"), 10, 64)
	if err != nil || n <= 0 {
		return "", 0, false
	}
	return board, n, true
}

func (f *FourChan) Browse(ctx context.Context, p BrowseParams) (*Listing, error) {
	// A thread is addressed as a feed, so opening one is the same request as browsing
	// a board — the client doesn't need a second endpoint to drill into a container.
	if board, no, ok := threadFeed(p.Feed); ok {
		return f.browseThread(ctx, board, no)
	}
	return f.browseBoard(ctx, p)
}

// browseBoard lists a board's threads, one tile per thread.
func (f *FourChan) browseBoard(ctx context.Context, p BrowseParams) (*Listing, error) {
	feed := normalizeBoard(p.Feed)
	// An empty board means "whatever this source leads with", so a client that hasn't
	// picked yet still gets a listing rather than an error.
	if feed == "" && len(fourChanBoards) > 0 {
		feed = fourChanBoards[0].ID
	}
	if !validBoard(feed) {
		return nil, fmt.Errorf("unknown board %q", feed)
	}
	page := 1
	if p.Cursor != "" {
		n, err := strconv.Atoi(p.Cursor)
		if err != nil || n < 1 || n > fourChanLastPage {
			return nil, fmt.Errorf("bad cursor %q", p.Cursor)
		}
		page = n
	}

	url := fmt.Sprintf("%s/%s/%d.json", f.apiHost, feed, page)
	body, err := httpGet(ctx, f.hc, url, fourChanUserAgent, f.Decorate)
	if err != nil {
		return nil, err
	}

	var idx fourChanIndex
	if err := json.Unmarshal(body, &idx); err != nil {
		return nil, fmt.Errorf("decode 4chan index: %w", err)
	}

	out := &Listing{}
	for _, thread := range idx.Threads {
		if len(thread.Posts) == 0 {
			continue
		}
		// The index gives the OP plus a few preview replies. The OP is the thread: its
		// image is the cover, its subject is the title, and its counters say how much
		// is inside.
		out.Items = append(out.Items, f.threadItem(feed, thread.Posts[0]))
	}

	if page < fourChanLastPage {
		out.Cursor = strconv.Itoa(page + 1)
	}
	return out, nil
}

// browseThread lists the media inside one thread. There is no paging: a thread is
// served whole.
func (f *FourChan) browseThread(ctx context.Context, board string, no int64) (*Listing, error) {
	url := fmt.Sprintf("%s/%s/thread/%d.json", f.apiHost, board, no)
	body, err := httpGet(ctx, f.hc, url, fourChanUserAgent, f.Decorate)
	if err != nil {
		return nil, err
	}

	var thread fourChanThread
	if err := json.Unmarshal(body, &thread); err != nil {
		return nil, fmt.Errorf("decode 4chan thread: %w", err)
	}

	subject := ""
	if len(thread.Posts) > 0 {
		subject = cleanPostText(thread.Posts[0].Sub)
	}

	out := &Listing{}
	for _, p := range thread.Posts {
		// A post without an upload is just text — nothing to browse.
		if p.Tim == 0 || p.Ext == "" {
			continue
		}
		out.Items = append(out.Items, f.fileItem(board, no, p, subject))
	}
	return out, nil
}

// threadItem turns an OP into the tile that stands for its whole thread.
func (f *FourChan) threadItem(board string, op fourChanPost) Item {
	title := cleanPostText(op.Sub)
	if title == "" {
		title = cleanPostText(op.Com)
	}
	if title == "" {
		title = fmt.Sprintf("/%s/%d", board, op.No)
	}

	// Images counts the replies' uploads; the OP's own file is separate.
	files := op.Images
	if op.Tim != 0 {
		files++
	}

	item := Item{
		ID:      fmt.Sprintf("%s:t%d", board, op.No),
		Title:   truncate(title, 120),
		Kind:    kindThread,
		FeedID:  fmt.Sprintf("%s:t%d", board, op.No),
		PageURL: fmt.Sprintf("https://boards.4chan.org/%s/thread/%d", board, op.No),
		Count:   files,
		Width:   op.Width,
		Height:  op.Height,
		// The tile stands for the whole discussion, so it is its own thread.
		ThreadID: fmt.Sprintf("%s:t%d", board, op.No),
		PostNo:   op.No,
	}
	// A thread whose OP posted no image (rare on these boards) still lists; the client
	// draws a placeholder rather than a broken tile.
	if op.Tim != 0 {
		item.ThumbURL = fmt.Sprintf("%s/%s/%ds.jpg", f.cdnHost, board, op.Tim)
	}
	return item
}

// fileItemID names a post's upload. A post's file is identified by its upload
// timestamp, not by the post number: that is what the CDN paths are keyed on, and
// it is what makes the id derivable from a comment as well as from a listing.
func fileItemID(board string, tim int64) string {
	return fmt.Sprintf("%s:f%d", board, tim)
}

// fileItem turns one post's upload into a viewable item.
func (f *FourChan) fileItem(board string, thread int64, p fourChanPost, subject string) Item {
	title := strings.TrimSpace(p.Filename + p.Ext)
	if title == "" {
		title = cleanPostText(p.Com)
	}
	if title == "" {
		title = subject
	}
	if title == "" {
		title = fmt.Sprintf("/%s/%d", board, p.No)
	}

	return Item{
		ID:    fileItemID(board, p.Tim),
		Title: truncate(title, 120),
		Kind:  kindForExt(p.Ext),
		// 4chan always renders a JPEG thumbnail, whatever the original was — a .webm's
		// thumb is "{tim}s.jpg", not "{tim}s.webm".
		ThumbURL: fmt.Sprintf("%s/%s/%ds.jpg", f.cdnHost, board, p.Tim),
		MediaURL: fmt.Sprintf("%s/%s/%d%s", f.cdnHost, board, p.Tim, p.Ext),
		// The post, not just the thread: #p{no} lands on the actual reply.
		PageURL: fmt.Sprintf("https://boards.4chan.org/%s/thread/%d#p%d", board, thread, p.No),
		Width:   p.Width,
		Height:  p.Height,
		// A file carries the thread it was posted in, so the viewer can pull up the
		// conversation around it, and PostNo says which post in that conversation is
		// the one on screen.
		ThreadID: fmt.Sprintf("%s:t%d", board, thread),
		PostNo:   p.No,
	}
}

// Comments returns a thread's posts, in post order — the conversation, rather than
// the files hanging off it.
//
// Every post is included, not just the ones with text: an image posted with no
// comment is still a turn in the conversation, and dropping it would leave the
// >>quotes pointing at posts that aren't in the list.
func (f *FourChan) Comments(ctx context.Context, itemID string) ([]Comment, error) {
	board, no, ok := threadFeed(itemID)
	if !ok {
		return nil, fmt.Errorf("not a thread: %q", itemID)
	}
	url := fmt.Sprintf("%s/%s/thread/%d.json", f.apiHost, board, no)
	body, err := httpGet(ctx, f.hc, url, fourChanUserAgent, f.Decorate)
	if err != nil {
		return nil, err
	}
	var thread fourChanThread
	if err := json.Unmarshal(body, &thread); err != nil {
		return nil, fmt.Errorf("decode 4chan thread: %w", err)
	}

	out := make([]Comment, 0, len(thread.Posts))
	for i, p := range thread.Posts {
		c := Comment{
			No:     p.No,
			Time:   p.Time,
			Name:   strings.TrimSpace(p.Name),
			Sub:    cleanPostText(p.Sub),
			Text:   postText(p.Com),
			Quotes: quotedPosts(p.Com),
			OP:     i == 0,
		}
		if p.Tim != 0 && p.Ext != "" {
			c.ThumbURL = fmt.Sprintf("%s/%s/%ds.jpg", f.cdnHost, board, p.Tim)
			c.MediaURL = fmt.Sprintf("%s/%s/%d%s", f.cdnHost, board, p.Tim, p.Ext)
			c.Kind = kindForExt(p.Ext)
			// The same id browseThread gives this post's file, so a client reading the
			// thread can point at the item it already has rather than a lookalike.
			c.ItemID = fileItemID(board, p.Tim)
		}
		out = append(out, c)
	}
	return out, nil
}

// Pages returns a thread's images, in post order — what a thread saved to the library
// becomes. Videos are left out: a comic is a run of pages, and a .webm is not a page.
//
// Only a thread has pages. Asking for the pages of a single file gets nothing, which
// is the right answer rather than an error: the caller has the file's own URL already.
func (f *FourChan) Pages(ctx context.Context, itemID string) ([]string, error) {
	board, no, ok := threadFeed(itemID)
	if !ok {
		return nil, nil
	}
	listing, err := f.browseThread(ctx, board, no)
	if err != nil {
		return nil, err
	}
	var out []string
	for _, item := range listing.Items {
		if item.Kind == "video" || item.MediaURL == "" {
			continue
		}
		out = append(out, item.MediaURL)
	}
	return out, nil
}

func validBoard(id string) bool {
	if len(id) < 1 || len(id) > 10 {
		return false
	}
	for _, r := range id {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') {
			return false
		}
	}
	return true
}

// normalizeBoard accepts how people actually write a board name: b, /b/, or a
// copied boards.4chan.org/b/ URL. The API itself needs only the bare id.
func normalizeBoard(raw string) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	s = strings.TrimPrefix(s, "https://")
	s = strings.TrimPrefix(s, "http://")
	s = strings.TrimPrefix(s, "boards.4chan.org/")
	s = strings.Trim(s, "/")
	if before, _, ok := strings.Cut(s, "/"); ok {
		s = before
	}
	return s
}

var tagRe = regexp.MustCompile(`<[^>]*>`)

// cleanPostText turns a post's HTML comment into a one-line plain-text label.
func cleanPostText(s string) string {
	s = strings.ReplaceAll(s, "<br>", " ")
	s = tagRe.ReplaceAllString(s, "")
	s = html.UnescapeString(s)
	return strings.TrimSpace(strings.Join(strings.Fields(s), " "))
}

// brRe matches the line breaks 4chan writes, in whichever spelling it used.
var brRe = regexp.MustCompile(`(?i)<br\s*/?>`)

// postText turns a post's HTML comment into plain text for display.
//
// Unlike cleanPostText — which flattens a post into a one-line *label* for a tile —
// this keeps the shape of the post, because the post is the thing being read here.
// Line breaks survive as line breaks, and greentext survives as the ">" that makes
// it greentext: strip that and a quoted line becomes indistinguishable from the
// reply to it, which is most of what a 4chan post is doing.
func postText(com string) string {
	s := brRe.ReplaceAllString(com, "\n")
	// <s> is 4chan's spoiler tag. The text under it is part of the post, so it stays;
	// what's lost is only that it was hidden — which a comment list can't honour anyway.
	s = tagRe.ReplaceAllString(s, "")
	s = html.UnescapeString(s)

	// Trim each line but keep the blank ones between paragraphs, then drop the leading
	// and trailing run of empties.
	lines := strings.Split(s, "\n")
	for i, l := range lines {
		lines[i] = strings.TrimRight(strings.TrimSpace(l), " \t")
	}
	for len(lines) > 0 && lines[0] == "" {
		lines = lines[1:]
	}
	for len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}
	return strings.Join(lines, "\n")
}

// quoteRe finds the post numbers a comment replies to. 4chan marks these up as
// <a class="quotelink">&gt;&gt;12345</a>, so the number is matched after unescaping
// rather than by picking the anchor apart.
var quoteRe = regexp.MustCompile(`>>(\d+)`)

// quotedPosts lists, in order and without repeats, the posts a comment replies to.
func quotedPosts(com string) []int64 {
	text := html.UnescapeString(tagRe.ReplaceAllString(brRe.ReplaceAllString(com, "\n"), ""))
	var out []int64
	seen := map[int64]bool{}
	for _, m := range quoteRe.FindAllStringSubmatch(text, -1) {
		n, err := strconv.ParseInt(m[1], 10, 64)
		if err != nil || seen[n] {
			continue
		}
		seen[n] = true
		out = append(out, n)
	}
	return out
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return strings.TrimSpace(string(r[:n])) + "…"
}
