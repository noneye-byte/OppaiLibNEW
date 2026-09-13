package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

// The one-in-four: asked for the red dress, the draw used to reach five other
// pictures that each shared one word. Chosen from the user's words before she writes,
// among only the best-fitting tier, it is the red dress every time.
func TestAskedForPictureIsChosenFromTheUsersWords(t *testing.T) {
	ws := redDressGallery()
	counts := tally(200, func() string {
		ready, ok := pickReadyPicture(ws, "libby", nil, "send me a pic of you in a red dress", "", "", nil, nil)
		if !ok {
			return ""
		}
		return ready.pic.imageID
	})
	if counts["dress"] != 200 {
		t.Fatalf("the red dress was not chosen every time: %v", counts)
	}
	// With nothing fitting, the preferences alone choose and the fit says so — which
	// is what lets her be honest that this is not the one they asked for.
	ready, ok := pickReadyPicture(ws, "libby", nil, "send me a pic", "", "", nil, nil)
	if !ok || ready.fit != 0 {
		t.Fatalf("an unspecific request should still find something, at fit 0: %+v ok=%v", ready, ok)
	}
	if !strings.Contains(readyPictureDirective(ready, "send me a pic of you in a green hat"), "not specifically what they asked for") {
		t.Fatal("a picture that does not fit the request was not flagged as such")
	}
	if !strings.Contains(readyPictureDirective(readyPicture{pic: ready.pic, fit: 3}, "red dress"), "[send: ") {
		t.Fatal("the directive never says how to send it")
	}
}

// End to end: the model paraphrases the request as [send: dress] and describes the
// picture it was told about; the picture that goes out is the one it was told about,
// and the reply says why.
func TestChatSendsTheReadyPictureWhateverTagsSheWrote(t *testing.T) {
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
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"Here — the red one you like.\n[send: dress]"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	gallery := redDressGallery()
	for i := range gallery.Images {
		gallery.Images[i].Subject = chatSubjectSelf
	}
	if err := s.writeChatWorkspace(1, gallery); err != nil {
		t.Fatalf("seed gallery: %v", err)
	}
	for i := 0; i < 8; i++ {
		rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
			`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"send me a pic of you in a red dress"}]}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("chat: %d %s", rec.Code, rec.Body)
		}
		var out struct {
			ImageID string          `json:"imageId"`
			Photo   photoPickReport `json:"photo"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if out.ImageID != "dress" {
			t.Fatalf("sent %q, want the red dress (report %+v)", out.ImageID, out.Photo)
		}
		if out.Photo.Source != "ready" || !containsString(out.Photo.Tags, "red dress") {
			t.Fatalf("the report does not say why: %+v", out.Photo)
		}
	}
	// She was told what the picture shows before she wrote, and told to describe that.
	if !strings.Contains(prompt, "the picture ready to send shows: red dress") || !strings.Contains(prompt, "Describe only what is in it") {
		t.Fatalf("prompt never named the ready picture: %s", prompt)
	}
}

// "Show me" is broad on purpose, but a picture is only chosen in advance when the
// request is for her: naming a library kind means the shelf, not a selfie.
func TestReadyPictureIsOnlyForRequestsAboutHer(t *testing.T) {
	for _, her := range []string{"send me a pic of you in a red dress", "show me you", "selfie?", "let me see you"} {
		if !askedToSeeHer(her) {
			t.Errorf("%q was not read as asking to see her", her)
		}
	}
	for _, shelf := range []string{"show me the beach video", "send me that comic", "let me see the game you saved", "show me something to watch"} {
		if askedToSeeHer(shelf) {
			t.Errorf("%q was read as asking to see her", shelf)
		}
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

// She can offer to rename something, by its real title; the card carries the new
// name, and only Allow performs it.
func TestRenameIsOfferedThenPerformedOnApproval(t *testing.T) {
	s, token := newTestServer(t)
	id := seedTitledMedia(t, s, "Untitled import 4192", "video", "beach")
	reply, actions := s.parseLibbyActions(t.Context(), `That name is a serial number. [do: rename Untitled import 4192 | "Beach afternoon"] Want me to?`, allCaps)
	if strings.Contains(reply, "[do:") {
		t.Fatalf("tag left in the prose: %q", reply)
	}
	if len(actions) != 1 || actions[0].Kind != "rename" || actions[0].MediaID != id || actions[0].Title != "Beach afternoon" {
		t.Fatalf("actions = %+v", actions)
	}
	if !strings.Contains(actions[0].Detail, "→ Beach afternoon") {
		t.Fatalf("card does not show the change: %+v", actions[0])
	}
	// The same name is not a rename, and a name for nothing resolves to nothing.
	if _, actions := s.parseLibbyActions(t.Context(), `[do: rename Untitled import 4192 | untitled import 4192]`, allCaps); len(actions) != 0 {
		t.Fatalf("a no-op rename was offered: %+v", actions)
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/act",
		`{"kind":"rename","mediaId":`+jsonInt(id)+`,"title":"Beach afternoon"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("act: %d %s", rec.Code, rec.Body)
	}
	item, err := s.db.GetMedia(t.Context(), id)
	if err != nil {
		t.Fatalf("get media: %v", err)
	}
	if got := s.decrypt(item.TitleEnc, "title"); got != "Beach afternoon" {
		t.Fatalf("title after rename = %q", got)
	}
}

func jsonInt(n int64) string {
	b, _ := json.Marshal(n)
	return string(b)
}
