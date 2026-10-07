package api

import (
	"context"
	"net/http"
	"strings"
	"testing"
)

func libbySelfies() []selfPicture {
	return []selfPicture{
		{link: libbyLink{ID: 11, Title: "Rooftop evening", Kind: "image", HasThumb: true},
			tags: []string{"rooftop", "sunset", "red dress"}},
		{link: libbyLink{ID: 12, Title: "Kitchen morning", Kind: "image"},
			tags: []string{"kitchen", "morning", "oversized shirt"}},
	}
}

// Her own pictures now come from the library too, and the catalogue is the only way
// she learns they exist — listed by tags, exactly like the gallery's, with no hint
// that there are two pools at all.
func TestCatalogueListsLibraryPicturesOfHer(t *testing.T) {
	catalogue := photoCatalogue(libbyGallery(), "libby", nil, libbySelfies(), nil, "", "")
	for _, want := range []string{"rooftop", "oversized shirt", "bedroom"} {
		if !strings.Contains(catalogue, want) {
			t.Fatalf("catalogue is missing %q: %s", want, catalogue)
		}
	}
	// A library picture already handed over this conversation is marked, not hidden,
	// for the same reason a spent gallery picture is.
	marked := photoCatalogue(libbyGallery(), "libby", nil, libbySelfies(), map[int64]bool{11: true}, "", "")
	line := ""
	for _, l := range strings.Split(marked, "\n") {
		if strings.Contains(l, "rooftop") {
			line = l
		}
	}
	if !strings.Contains(line, "[already sent]") {
		t.Fatalf("a spent library picture was not marked: %q", line)
	}
	// With no gallery at all she is still told how to send one — the library pool
	// carries the whole catalogue on its own.
	alone := photoCatalogue(chatWorkspace{}, "libby", nil, libbySelfies(), nil, "", "")
	if !strings.Contains(alone, "send_saved_photo") {
		t.Fatalf("library-only catalogue never says how to send one: %s", alone)
	}
	if photoCatalogue(chatWorkspace{}, "libby", nil, nil, nil, "", "") != "" {
		t.Fatal("no pictures anywhere should produce no catalogue")
	}
}

// The client owns the log, so what has already been handed over rides in with the
// request — bounded, because an item ruled out forever is an item she can never show.
func TestRecentlyAttachedIsBounded(t *testing.T) {
	var ids []int64
	for i := int64(1); i <= int64(maxRecentMediaMemory)+5; i++ {
		ids = append(ids, i)
	}
	sent := recentlyAttached(ids)
	if len(sent) != maxRecentMediaMemory {
		t.Fatalf("remembered %d items, want %d", len(sent), maxRecentMediaMemory)
	}
	if sent[1] {
		t.Fatal("the oldest attachment should have fallen out of memory")
	}
	if !sent[ids[len(ids)-1]] {
		t.Fatal("the newest attachment was forgotten")
	}
	if len(recentlyAttached(nil)) != 0 {
		t.Fatal("a fresh conversation has attached nothing")
	}
}

// What she handed over has to survive the workspace round-trip. The client owns the
// log but stores it on the server, and it reads these back on the next turn to say
// what has already been shown — dropped here, she would attach the same thing forever.
func TestAttachmentsSurviveTheWorkspaceRoundTrip(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	conversationID := strings.Repeat("d", 32)
	messageID := strings.Repeat("e", 32)
	body := `{
		"profile":{},
		"characters":[{"id":"libby","name":"Libby","promptWeight":1,"defaultMode":"sweet","builtIn":true}],
		"conversations":[{"id":"` + conversationID + `","characterId":"libby","title":"Hello","mode":"sweet","emotion":"happy","intensity":1,
			"messages":[{"id":"` + messageID + `","role":"assistant","content":"here, watch this","at":1,
				"attachments":[{"id":7,"title":"Summer at the Coast","kind":"video","hasThumb":true}]}],
			"createdAt":1,"updatedAt":2}],
		"images":[]
	}`
	if rec := do(t, h, token, http.MethodPut, "/api/chat/workspace", body); rec.Code != http.StatusOK {
		t.Fatalf("save workspace: %d %s", rec.Code, rec.Body)
	}
	rec := do(t, h, token, http.MethodGet, "/api/chat/workspace", "")
	if !strings.Contains(rec.Body.String(), `"attachments":[{"id":7`) ||
		!strings.Contains(rec.Body.String(), `"Summer at the Coast"`) {
		t.Fatalf("attachment did not survive the round-trip: %s", rec.Body)
	}
	// An item with no id is not something the viewer can ever open, so it is refused
	// rather than stored as a card that does nothing when pressed.
	bad := strings.Replace(body, `"id":7,`, `"id":0,`, 1)
	if rec := do(t, h, token, http.MethodPut, "/api/chat/workspace", bad); rec.Code == http.StatusOK {
		t.Fatal("an attachment with no library id was accepted")
	}
}

// The report that sent us back here: told to show something, she says she will and
// nothing arrives. Two causes, both reproduced below.
//
// The first is the match floor. "Show me the beach one" against an item tagged beach
// scores a single tag word, and the floor a *link* needs is two — so the tag resolved to
// nothing, the reply fell through to the photo path, matched no gallery picture, and the
// user got an agreement with nothing attached to it.
func TestADirectedAttachResolvesOnOneTagWord(t *testing.T) {
	s, _ := newTestServer(t)
	id := seedTitledMedia(t, s, "Untitled import 4192", "video", "beach")
	ctx := context.Background()

	got := s.resolveLibraryAttachments(ctx, []string{"the beach one"}, "", "", nil, nil, nil)
	if len(got) != 1 || got[0].ID != id {
		t.Fatalf("attachments = %+v, want the beach video", got)
	}
	// A link still needs two: pointing at the wrong thing mid-sentence is worse than
	// describing it, and that trade is unchanged.
	if _, found := bestLibraryMatch(s.libraryCandidates(ctx, []string{"beach"}), "the beach one"); found {
		t.Fatal("the link floor was lowered along with the attachment floor")
	}
}

// The second cause: she agrees in her own words and names the thing the way the user
// did, but the library snapshot was shed from the prompt this turn, so what she writes
// is a description of something she was never told the title of. Their words are the
// fallback query — a request that named the thing was written by someone who could see it.
func TestAFailedAttachFallsBackToWhatTheUserAsked(t *testing.T) {
	s, _ := newTestServer(t)
	id := seedTitledMedia(t, s, "Summer at the Coast", "video", "swimsuit")
	ctx := context.Background()

	// Nothing in the library answers to this, so her own tag resolves to nothing.
	if got := s.resolveLibraryAttachments(ctx, []string{"that thing from last week"}, "", "", nil, nil, nil); len(got) != 0 {
		t.Fatalf("an invented description resolved to %+v", got)
	}
	got := s.resolveLibraryAttachments(ctx, []string{"that thing from last week"}, "put on Summer at the Coast", "", nil, nil, nil)
	if len(got) != 1 || got[0].ID != id {
		t.Fatalf("fallback attachments = %+v, want the seeded video", got)
	}
	// The rescue never adds to a reply that already worked.
	both := s.resolveLibraryAttachments(ctx, []string{"Summer at the Coast"}, "put on Summer at the Coast", "", nil, nil, nil)
	if len(both) != 1 {
		t.Fatalf("a working request grew a second item: %+v", both)
	}
}

// The stored-options migration. Conversations created before the server began tuning
// samplers carry the old fixed block, and a stored option is an override — so those
// chats stayed pinned at 400 reply tokens and one temperature for every kind of turn.
func TestLegacySamplerDefaultsAreDroppedButRealChoicesKept(t *testing.T) {
	legacy := chatConversation{Options: map[string]any{
		"temperature": 0.8, "top_p": 0.95, "repetition_penalty": 1.1, "max_tokens": float64(400),
	}}
	dropLegacySamplerOptions(&legacy)
	if legacy.Options != nil {
		t.Fatalf("the legacy block survived: %v", legacy.Options)
	}
	// One slider moved is a choice, and the whole set is kept.
	chosen := chatConversation{Options: map[string]any{
		"temperature": 1.02, "top_p": 0.95, "repetition_penalty": 1.1, "max_tokens": float64(400),
	}}
	dropLegacySamplerOptions(&chosen)
	if len(chosen.Options) != 4 {
		t.Fatalf("a deliberate setting was dropped: %v", chosen.Options)
	}
	// A single explicit value is not the fingerprint and is left alone.
	one := chatConversation{Options: map[string]any{"max_tokens": float64(400)}}
	dropLegacySamplerOptions(&one)
	if len(one.Options) != 1 {
		t.Fatalf("a lone override was dropped: %v", one.Options)
	}
}
