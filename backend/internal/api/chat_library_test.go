package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
)

// seedTitledMedia inserts a titled, tagged row the way an import would, so link
// resolution has something real to find. Unlike the bare seedMedia it encrypts a
// title — which is the whole reason the resolver has to decrypt candidates rather
// than query for them.
func seedTitledMedia(t *testing.T, s *Server, title, kind string, tags ...string) int64 {
	t.Helper()
	ctx := context.Background()
	titleEnc, err := crypto.SealBytes(s.kek, []byte(title), []byte("title"))
	if err != nil {
		t.Fatalf("seal title: %v", err)
	}
	id, _, err := s.db.InsertMedia(ctx, &db.MediaRow{
		Kind: kind, SHA256: title + "-hash", Size: 1, BlobPath: "x/" + title, TitleEnc: titleEnc,
	})
	if err != nil {
		t.Fatalf("insert media: %v", err)
	}
	for _, tag := range tags {
		if err := s.db.AddTag(ctx, id, tag, "general", "manual", 0); err != nil {
			t.Fatalf("add tag: %v", err)
		}
	}
	return id
}

// A link is a substitution, not an excision: the title replaces the tag so the
// sentence still reads, and the item travels alongside so it can be opened.
func TestResolveLibraryLinksSubstitutesTitles(t *testing.T) {
	s, _ := newTestServer(t)
	id := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach", "swimsuit")
	seedTitledMedia(t, s, "Kitchen Timer", "video", "cooking")

	text, links := s.resolveLibraryLinks(context.Background(), "You never did finish [link: Summer at the Coast], you know.")
	if text != "You never did finish Summer at the Coast, you know." {
		t.Fatalf("prose = %q", text)
	}
	if len(links) != 1 || links[0].ID != id || links[0].Kind != "video" {
		t.Fatalf("links = %+v, want the seeded video", links)
	}

	// Found by tag rather than title: what she calls a thing and what it is called
	// are frequently different, and the tags are the only plaintext the library has.
	text, links = s.resolveLibraryLinks(context.Background(), "How about [link: that beach swimsuit one]?")
	if len(links) != 1 || links[0].ID != id {
		t.Fatalf("tag lookup links = %+v", links)
	}
	if strings.Contains(text, "[link:") {
		t.Fatalf("directive left in prose: %q", text)
	}
}

// An invented title must not point anywhere, and must not leave a hole in the
// sentence either — her own words stand in.
func TestResolveLibraryLinksFallsBackToHerWords(t *testing.T) {
	s, _ := newTestServer(t)
	seedTitledMedia(t, s, "Kitchen Timer", "video", "cooking")

	text, links := s.resolveLibraryLinks(context.Background(), "Try [link: a thing that was never imported].")
	if len(links) != 0 {
		t.Fatalf("links = %+v, want none", links)
	}
	if text != "Try a thing that was never imported." {
		t.Fatalf("prose = %q", text)
	}
}

// The browse-together prompt is built from the database, not from the client: ids
// go up, titles and tags come back. That is what stops a client from telling a
// character the library contains things it does not.
func TestViewingDirectiveDescribesWhatIsOnScreen(t *testing.T) {
	s, _ := newTestServer(t)
	focus := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach")
	other := seedTitledMedia(t, s, "Kitchen Timer", "gif", "cooking")

	block := s.viewingDirective(context.Background(), &chatViewing{
		FocusID: focus, IDs: []int64{other}, Section: "their videos",
	}, "sweet", 1, true)
	// The focus is a video, so it reads as something the two of them are watching play.
	for _, want := range []string{"Summer at the Coast", "Kitchen Timer", "their videos", "beach", "watching"} {
		if !strings.Contains(block, want) {
			t.Fatalf("viewing block missing %q: %s", want, block)
		}
	}
	// A calm sweet-mode glance stays a glance: the arousal framing must not surface.
	if strings.Contains(strings.ToLower(block), "touching yourself") {
		t.Fatalf("sweet, low-intensity viewing should not be sexual: %s", block)
	}
	if s.viewingDirective(context.Background(), nil, "sweet", 1, true) != "" {
		t.Fatal("no viewing context should contribute no block")
	}
	if s.viewingDirective(context.Background(), &chatViewing{IDs: []int64{99999}}, "sweet", 1, true) != "" {
		t.Fatal("ids that resolve to nothing should contribute no block")
	}
}

func TestViewingDirectiveIncludesUntrustedBrowseFrame(t *testing.T) {
	s, _ := newTestServer(t)
	block := s.viewingDirective(context.Background(), &chatViewing{
		Section:       "Example source · Trending",
		External:      []chatViewingItem{{Title: "First remote image", Kind: "image", Tags: []string{"blue hair"}}},
		FocusExternal: &chatViewingItem{Title: "Remote clip", Kind: "video", Tags: []string{"loop"}},
	}, "sweet", 1, true)
	for _, want := range []string{"Example source", "First remote image", "blue hair", "Remote clip", "watching", "untrusted"} {
		if !strings.Contains(block, want) {
			t.Fatalf("browse frame missing %q: %s", want, block)
		}
	}
}

// End to end: what she wrote as a link comes back as an item the client can open,
// and the browse-together screen is what puts the shelf in front of her.
func TestChatResolvesLinksForABrowseTogetherTurn(t *testing.T) {
	var prompt string
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		var body struct {
			Messages []chatMessage `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if len(body.Messages) > 0 {
			prompt = body.Messages[0].Content
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"Open [link: Summer at the Coast] instead.\n[mood: mischievous 3]"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	id := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach")
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"playful","messages":[{"role":"user","content":"what should I watch"}],"viewing":{"focusId":`+
			strconv.FormatInt(id, 10)+`,"ids":[`+strconv.FormatInt(id, 10)+`],"section":"their videos"}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	if !strings.Contains(prompt, "browsing together") && !strings.Contains(prompt, "going through their library together") {
		t.Fatalf("system prompt never mentioned browsing together: %s", prompt)
	}
	if !strings.Contains(prompt, "[link:") {
		t.Fatalf("system prompt never explained linking: %s", prompt)
	}
	var out struct {
		Message string      `json:"message"`
		Links   []libbyLink `json:"links"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Message != "Open Summer at the Coast instead." {
		t.Fatalf("message = %q", out.Message)
	}
	if len(out.Links) != 1 || out.Links[0].ID != id {
		t.Fatalf("links = %+v", out.Links)
	}
}
