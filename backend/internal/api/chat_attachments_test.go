package api

import (
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

// The bug this whole file starts from: "attach" meant a selfie, so a request to hand
// over a library item was parsed as a picture request, matched nothing, and vanished.
// It has to reach the attachment reader with the reply intact.
func TestAttachRequestIsNotEatenByThePhotoParser(t *testing.T) {
	reply := "You never finished this one. [attach: Summer at the Coast]"
	if _, _, asked := splitPhotoRequest(reply); asked {
		t.Fatal("an attach request was read as a request for a selfie")
	}
	if _, asked := findLoosePhotoRequest(reply); asked {
		t.Fatal("the loose photo parser claimed an attach request")
	}
	got := findAttachRequests(reply)
	if len(got) != 1 || got[0] != "Summer at the Coast" {
		t.Fatalf("attach requests = %v, want [Summer at the Coast]", got)
	}
	// And the user must never see the tag, whichever parser ends up owning it.
	if strings.Contains(scrubDirectives(reply), "attach") {
		t.Fatalf("the tag survived scrubbing: %q", scrubDirectives(reply))
	}
}

// A [send: …] request is still a selfie request. The two verbs are the whole protocol
// distinction, so this is the other half of the test above.
func TestSendRequestIsStillAPhotoRequest(t *testing.T) {
	if _, request, asked := splitPhotoRequest("here you go [send: rooftop, sunset]"); !asked || request != "rooftop, sunset" {
		t.Fatalf("send tag parsed as %q asked=%v", request, asked)
	}
	if got := findAttachRequests("here you go [send: rooftop, sunset]"); got != nil {
		t.Fatalf("the attachment reader claimed a selfie request: %v", got)
	}
}

// One reply hands over one thing. A model that lists four items is writing search
// results, and the cap is what stops that reaching the user as four cards.
func TestAttachRequestsAreCapped(t *testing.T) {
	reply := "[attach: one] and [attach: two] and [attach: three] and [attach: ]"
	if got := findAttachRequests(reply); len(got) != maxAttachmentsPerReply {
		t.Fatalf("attach requests = %v, want %d of them", got, maxAttachmentsPerReply)
	}
}

// Her own pictures now come from the library too, and the catalogue is the only way
// she learns they exist — listed by tags, exactly like the gallery's, with no hint
// that there are two pools at all.
func TestCatalogueListsLibraryPicturesOfHer(t *testing.T) {
	catalogue := photoCatalogue(libbyGallery(), "libby", nil, libbySelfies(), nil)
	for _, want := range []string{"rooftop", "oversized shirt", "bedroom"} {
		if !strings.Contains(catalogue, want) {
			t.Fatalf("catalogue is missing %q: %s", want, catalogue)
		}
	}
	// A library picture already handed over this conversation is marked, not hidden,
	// for the same reason a spent gallery picture is.
	marked := photoCatalogue(libbyGallery(), "libby", nil, libbySelfies(), map[int64]bool{11: true})
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
	alone := photoCatalogue(chatWorkspace{}, "libby", nil, libbySelfies(), nil)
	if !strings.Contains(alone, "[send:") {
		t.Fatalf("library-only catalogue never says how to send one: %s", alone)
	}
	if photoCatalogue(chatWorkspace{}, "libby", nil, nil, nil) != "" {
		t.Fatal("no pictures anywhere should produce no catalogue")
	}
}

// Picking one: an explicit request takes the best fit, an unrequested one has to clear
// the same floor the gallery does, and nothing already sent comes back.
func TestLibraryPictureOfHerIsChosenByTags(t *testing.T) {
	pics := libbySelfies()
	pic, score := bestSelfPicture(pics, "rooftop sunset", nil, 1)
	if score == 0 || pic.link.ID != 11 {
		t.Fatalf("asked-for picture resolved to %d (score %d), want 11", pic.link.ID, score)
	}
	if _, score := bestSelfPicture(pics, "rooftop sunset", map[int64]bool{11: true}, 1); score != 0 {
		t.Fatal("a picture already sent was offered again")
	}
	// Riding along with a reply is held to unpromptedPhotoFloor, so one shared word is
	// not enough — the same rule that stopped her flinging a selfie at every keyword.
	if _, score := bestSelfPicture(pics, "the kitchen was cold", nil, unpromptedPhotoFloor); score != 0 {
		t.Fatal("one incidental word attached a picture of her")
	}
	if _, score := bestSelfPicture(pics, "you on the rooftop at sunset in that red dress", nil, unpromptedPhotoFloor); score == 0 {
		t.Fatal("three matching words should attach a picture of her")
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
