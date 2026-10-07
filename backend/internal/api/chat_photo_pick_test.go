package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// The gallery the report was about: one red dress among a crowd of pictures that
// each share a word with the request.
func redDressGallery() chatWorkspace {
	return chatWorkspace{Images: []chatImage{
		{ID: "dress", CharacterID: "libby", Tags: []string{"red dress", "smile", "standing"}},
		{ID: "hair", CharacterID: "libby", Tags: []string{"red hair", "bedroom", "black dress"}},
		{ID: "lips", CharacterID: "libby", Tags: []string{"red lips", "mirror"}},
		{ID: "nails", CharacterID: "libby", Tags: []string{"red nails", "sofa"}},
		{ID: "sundress", CharacterID: "libby", Tags: []string{"sundress", "beach"}},
		{ID: "car", CharacterID: "libby", Tags: []string{"red car", "street"}},
	}}
}

// A whole tag matched in full outranks its words landing in different tags: "red
// dress" is the red dress, not red hair in a black dress.
func TestWholeTagMatchOutranksScatteredWords(t *testing.T) {
	words := requestWords("send me a pic of you in a red dress")
	if dress, hair := scoreTags(words, []string{"red dress"}), scoreTags(words, []string{"red hair", "black dress"}); dress <= hair {
		t.Fatalf("red dress scored %d, red hair + black dress %d", dress, hair)
	}
	// A single-word tag still counts its word, so "dress" alone reaches a sundress.
	if scoreTags(requestWords("a dress"), []string{"dress"}) != 1 {
		t.Fatal("a one-word tag lost its word")
	}
}

// A photo the user shared of something else lives in her gallery so she remembers
// it, and is never a selfie.
func TestSharedPhotosOfOthersAreNotSelfies(t *testing.T) {
	ws := chatWorkspace{Images: []chatImage{
		{ID: "her", CharacterID: "libby", Tags: []string{"bedroom", "lingerie"}, Subject: chatSubjectSelf},
		{ID: "lunch", CharacterID: "libby", Tags: []string{"bedroom", "lingerie", "food"}, Subject: chatSubjectOther},
	}}
	counts := tally(100, func() string { return drawGallery(ws, "libby", "bedroom lingerie", "", nil, nil, 1) })
	if counts["lunch"] != 0 || counts["her"] != 100 {
		t.Fatalf("someone else's photo was sent as a selfie: %v", counts)
	}
	catalogue := photoCatalogue(ws, "libby", nil, nil, nil, "", "")
	if !strings.Contains(catalogue, "Selfies you can send") || !strings.Contains(catalogue, "shared with you of other people") {
		t.Fatalf("catalogue does not separate the two: %s", catalogue)
	}
	if strings.Index(catalogue, "food") < strings.Index(catalogue, "shared with you") {
		t.Fatalf("the shared photo was listed among the selfies: %s", catalogue)
	}
}

// The scanner decides at upload from her likeness; a card with no appearance takes
// everything in its gallery to be its character; a record from before subjects
// existed is classified on read.
func TestSubjectIsDecidedByLikeness(t *testing.T) {
	libby := defaultLibbyCard()
	if got := classifyChatSubject([]string{"long orange hair", "red eyes", "glasses"}, libby.Appearance, selfPortraitFloor); got != chatSubjectSelf {
		t.Fatalf("her own likeness classified as %q", got)
	}
	if got := classifyChatSubject([]string{"pizza", "table"}, libby.Appearance, selfPortraitFloor); got != chatSubjectOther {
		t.Fatalf("a pizza classified as %q", got)
	}
	if got := classifyChatSubject([]string{"pizza"}, "", selfPortraitFloor); got != chatSubjectSelf {
		t.Fatalf("with no appearance to match, classified as %q", got)
	}
	// A picture of her from behind: one feature. Enough for a picture that was already
	// in her gallery, not for a photo shared into chat today.
	if got := classifyChatSubject([]string{"long orange hair", "from behind"}, libby.Appearance, legacySubjectFloor); got != chatSubjectSelf {
		t.Fatalf("a legacy picture with one of her features classified as %q", got)
	}
	if got := classifyChatSubject([]string{"long orange hair", "from behind"}, libby.Appearance, selfPortraitFloor); got != chatSubjectOther {
		t.Fatalf("a fresh upload with one feature classified as %q", got)
	}
	ws := chatWorkspace{
		Characters: []chatCharacter{libby},
		Images: []chatImage{
			{ID: "a", CharacterID: "libby", Tags: []string{"long orange hair"}},
			{ID: "b", CharacterID: "libby", Tags: []string{"pizza"}},
			{ID: "c", CharacterID: profileImageOwner, Tags: []string{"pizza"}},
		},
	}
	if !classifyLegacySubjects(&ws) {
		t.Fatal("legacy records were not classified")
	}
	if ws.Images[0].Subject != chatSubjectSelf || ws.Images[1].Subject != chatSubjectOther || ws.Images[2].Subject != "" {
		t.Fatalf("subjects = %q %q %q", ws.Images[0].Subject, ws.Images[1].Subject, ws.Images[2].Subject)
	}
}

// The catalogue lists the tags the request names first, so a picture with thirty
// tags still shows "red dress" when that is what was asked for.
func TestCatalogueLeadsWithTheTagsTheyAskedFor(t *testing.T) {
	tags := []string{"1girl", "solo", "looking at viewer", "smile", "long hair", "breasts", "standing", "indoors", "red dress"}
	frequency := map[string]int{"1girl": 9, "solo": 9, "looking at viewer": 8, "smile": 7, "long hair": 9, "breasts": 6, "standing": 3, "indoors": 4, "red dress": 1}
	ordered := catalogueTags(tags, requestWords("you in the red dress?"), frequency)
	if ordered[0] != "red dress" {
		t.Fatalf("ordered = %v", ordered)
	}
	// After what was named, the rarest tags come first: they are what tells the
	// pictures apart.
	if ordered[1] != "standing" {
		t.Fatalf("ordered = %v", ordered)
	}
}

// The two dials the user turns from the gallery survive a workspace save. Both were
// being discarded with the rest of the client's copy of the record.
func TestGalleryWeightAndSubjectSurviveTheWorkspaceRoundTrip(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	rec := do(t, h, token, http.MethodPost, "/api/chat/images",
		`{"characterId":"libby","name":"Beach pose","tags":["beach"],"imageData":"data:image/png;base64,`+validChatPNG+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("upload image: %d %s", rec.Code, rec.Body)
	}
	var image chatImage
	if err := json.Unmarshal(rec.Body.Bytes(), &image); err != nil {
		t.Fatalf("image response: %v", err)
	}
	// Nothing in a scanner's tags for a flat test square resembles her, so the scanner
	// filed it as someone else; the user knows better.
	if image.Subject != chatSubjectOther {
		t.Fatalf("subject at upload = %q, want other", image.Subject)
	}
	body := `{"profile":{},"characters":[{"id":"libby","name":"Libby","promptWeight":1,"defaultMode":"sweet","builtIn":true}],"conversations":[],
		"images":[{"id":"` + image.ID + `","characterId":"libby","name":"Beach pose","tags":["invented"],"mime":"image/png","createdAt":1,"weight":-1,"subject":"self"}]}`
	if rec := do(t, h, token, http.MethodPut, "/api/chat/workspace", body); rec.Code != http.StatusOK {
		t.Fatalf("save workspace: %d %s", rec.Code, rec.Body)
	}
	var ws chatWorkspace
	if err := json.Unmarshal(do(t, h, token, http.MethodGet, "/api/chat/workspace", "").Body.Bytes(), &ws); err != nil {
		t.Fatalf("decode workspace: %v", err)
	}
	if len(ws.Images) != 1 || ws.Images[0].Weight != -1 || ws.Images[0].Subject != chatSubjectSelf {
		t.Fatalf("dials lost: %+v", ws.Images)
	}
	// The scan tags are still the server's.
	if containsString(ws.Images[0].Tags, "invented") || !containsString(ws.Images[0].Tags, "beach") {
		t.Fatalf("client rewrote the scan tags: %v", ws.Images[0].Tags)
	}
	// And an explicit subject on upload is honoured over the scanner.
	rec = do(t, h, token, http.MethodPost, "/api/chat/images",
		`{"characterId":"libby","name":"Her","subject":"self","imageData":"data:image/png;base64,`+validChatPNG+`"}`)
	if err := json.Unmarshal(rec.Body.Bytes(), &image); err != nil || image.Subject != chatSubjectSelf {
		t.Fatalf("explicit subject ignored: %+v", image)
	}
}

// A web address she made up is removed and marked; one the user wrote is kept.
func TestInventedURLsAreScrubbed(t *testing.T) {
	in := chatRequest{Messages: []chatMessage{
		{Role: "user", Content: "look at https://example.com/thread/9 for me"},
		{Role: "assistant", Content: "I found https://assistant.invalid/made-up earlier"},
	}}
	known := knownURLs(in)
	got := scrubInventedURLs("Sure! See https://example.com/thread/9/ and also www.totally-real.example/page, plus https://assistant.invalid/made-up.", known)
	want := "Sure! See https://example.com/thread/9/ and also " + inventedURLMarker + ", plus " + inventedURLMarker + "."
	if got != want {
		t.Fatalf("got  %q\nwant %q", got, want)
	}
	if scrubInventedURLs("no links here", known) != "no links here" {
		t.Fatal("prose without an address was touched")
	}
}

// An import may only point where the user pointed. The same guard, at the action.
func TestImportOfferNeedsAnAddressTheUserWrote(t *testing.T) {
	s := &Server{}
	caps := allCaps
	caps.KnownURLs = map[string]bool{urlKey("https://example.com/thread/1"): true}
	if _, ok := s.buildLibbyAction("import", "https://example.com/thread/1", caps, nil); !ok {
		t.Fatal("an address the user wrote was refused")
	}
	if got, ok := s.buildLibbyAction("import", "https://example.com/thread/2", caps, nil); ok {
		t.Fatalf("an invented address was offered: %+v", got)
	}
}

func jsonInt(n int64) string {
	b, _ := json.Marshal(n)
	return string(b)
}

// "send me a pic of you rn" is a request to see her and nothing more; "rn" is not a
// thing to draw.
func TestTextingShorthandIsNotASubject(t *testing.T) {
	for _, ask := range []string{"send me a pic of you rn", "pic of u rn plz", "lemme see you atm"} {
		if got := pictureRequestSubject(ask); got != "" {
			t.Fatalf("%q left %q as the subject", ask, got)
		}
	}
}
