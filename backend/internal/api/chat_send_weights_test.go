package api

import (
	"strings"
	"testing"
)

// drawGallery is the test's view of the chat path's picture draw: candidates, floor,
// the real die. Returns "" when nothing is eligible.
func drawGallery(ws chatWorkspace, characterID, text, exclude string, skip, sent map[string]bool, floor int) string {
	id, _ := drawWeighted(galleryCandidates(ws, characterID, text, exclude, skip, sent), floor, nil)
	return id
}

// tally draws n times and counts what came up.
func tally(n int, draw func() string) map[string]int {
	counts := map[string]int{}
	for i := 0; i < n; i++ {
		counts[draw()]++
	}
	return counts
}

// The repeat this exists to stop: "send me a pic" turn after turn used to land on the
// same file, because the best-scoring picture of a stable list is a constant. Now the
// draw is weighted, and everything already sent is penalised, so a second bedroom
// picture wins nearly every time while it is fresh.
func TestAskedForPicturesRotate(t *testing.T) {
	ws := libbyGallery()
	fresh := tally(400, func() string { return drawGallery(ws, "libby", "bedroom lingerie", "", nil, nil, 1) })
	if fresh["a"] == 0 || fresh["b"] == 0 {
		t.Fatalf("a fresh gallery should reach both bedroom pictures: %v", fresh)
	}
	if fresh["c"] != 0 {
		t.Fatalf("the beach picture does not fit 'bedroom lingerie' and was drawn: %v", fresh)
	}
	// "a" has been sent and is the latest: withheld outright, so "b" every time.
	sent, last := recentlySentPhotos([]string{"a"})
	skip := map[string]bool{last: true}
	if got := drawGallery(ws, "libby", "bedroom lingerie", "", skip, sent, 1); got != "b" {
		t.Fatalf("with a just sent, want b, got %q", got)
	}
	// Both sent, "b" latest: "a" is penalised but is the only thing left, so it comes
	// back rather than nothing — the user asked.
	sent, last = recentlySentPhotos([]string{"a", "b"})
	skip = map[string]bool{last: true}
	if got := drawGallery(ws, "libby", "bedroom lingerie", "", skip, sent, 1); got != "a" {
		t.Fatalf("with the gallery spent, want a again, got %q", got)
	}
	// Unprompted, everything sent is withheld outright, and the answer is nothing.
	if got := drawGallery(ws, "libby", "bedroom lingerie lying down", "", sent, sent, unpromptedPhotoFloor); got != "" {
		t.Fatalf("unprompted repeat of a sent picture: %q", got)
	}
}

// A penalised picture is rare, not impossible: with one fresh and one sent picture
// both fitting equally, the sent one should come up a small minority of the time.
func TestSentPicturesArePenalisedNotForgotten(t *testing.T) {
	ws := libbyGallery()
	sent := map[string]bool{"a": true}
	counts := tally(1000, func() string { return drawGallery(ws, "libby", "bedroom lingerie", "", nil, sent, 1) })
	if counts["a"] == 0 {
		t.Fatalf("a sent picture never came back: %v", counts)
	}
	if counts["a"] > 300 {
		t.Fatalf("a sent picture came back too often: %v", counts)
	}
}

// An unrequested picture needs real overlap — three independent words, not one or two.
func TestUnpromptedPictureNeedsRealOverlap(t *testing.T) {
	ws := libbyGallery()
	if got := drawGallery(ws, "libby", "the bedroom was cold", "", nil, nil, unpromptedPhotoFloor); got != "" {
		t.Fatalf("one incidental word attached %q", got)
	}
	if got := drawGallery(ws, "libby", "you in that lingerie, in the bedroom", "", nil, nil, unpromptedPhotoFloor); got != "" {
		t.Fatalf("two incidental words attached %q", got)
	}
	if got := drawGallery(ws, "libby", "you in that lingerie in the bedroom, lying down", "", nil, nil, unpromptedPhotoFloor); got == "" {
		t.Fatal("three matching words should still attach a picture")
	}
}

// Her request resolves to the best fit, another character's gallery is not hers, and an
// excluded picture is never returned.
func TestRequestedPictureResolvesByTags(t *testing.T) {
	ws := chatWorkspace{Images: []chatImage{
		{ID: "a", CharacterID: "libby", Tags: []string{"beach", "bikini", "smiling"}},
		{ID: "b", CharacterID: "libby", Tags: []string{"bedroom", "lingerie", "lying down"}},
		{ID: "c", CharacterID: "other", Tags: []string{"bedroom", "lingerie"}},
	}}
	if got := drawGallery(ws, "libby", "bedroom lingerie", "", nil, nil, 1); got != "b" {
		t.Fatalf("resolved to %q, want b", got)
	}
	if got := drawGallery(ws, "libby", "nothing like this at all", "", nil, nil, 1); got != "" {
		t.Fatalf("unmatched request resolved to %q", got)
	}
	if got := drawGallery(ws, "libby", "beach bikini", "a", nil, nil, 1); got != "" {
		t.Fatalf("excluded image was returned: %q", got)
	}
}

// The rescue: she said she was sending one and nothing fits the tags she wrote. Floor
// zero draws from everything she has rather than sending nothing under "here you go".
func TestADeclaredSendAlwaysFindsAPicture(t *testing.T) {
	ws := libbyGallery()
	if got := drawGallery(ws, "libby", "cosy jumper mug", "", nil, nil, 1); got != "" {
		t.Fatalf("nothing fits and yet %q was drawn at floor 1", got)
	}
	if got := drawGallery(ws, "libby", "cosy jumper mug", "", nil, nil, 0); got == "" {
		t.Fatal("floor 0 should draw something")
	}
}

// Weights. A picture marked "never" is out; "often" comes up more; a tag at "never"
// removes everything carrying it.
func TestSendWeightsSteerTheDraw(t *testing.T) {
	ws := libbyGallery()
	// Two equally fitting bedroom pictures; b marked often, a normal.
	ws.Images[1].Weight = sendWeightOften
	counts := tally(1000, func() string { return drawGallery(ws, "libby", "bedroom lingerie", "", nil, nil, 1) })
	if counts["b"] < counts["a"]*3/2 {
		t.Fatalf("an 'often' picture was not drawn more: %v", counts)
	}
	ws.Images[1].Weight = -1 // never
	counts = tally(200, func() string { return drawGallery(ws, "libby", "bedroom lingerie", "", nil, nil, 1) })
	if counts["b"] != 0 {
		t.Fatalf("a 'never' picture was drawn: %v", counts)
	}
	// A tag weight applies to whatever carries it, category prefix or not.
	ws = libbyGallery()
	ws.SendWeights = map[string]float64{"lingerie": sendWeightNever}
	if got := drawGallery(ws, "libby", "bedroom lingerie beach", "", nil, nil, 0); got != "c" {
		t.Fatalf("with lingerie at never, only the beach picture is left; got %q", got)
	}
	if w := tagWeight(map[string]float64{"lingerie": 2}, []string{"outfit:Lingerie"}); w != 2 {
		t.Fatalf("category-prefixed tag did not match a bare weight: %v", w)
	}
	// Zero on a stored picture means normal, not never — pictures predate weights.
	if pictureWeight(0) != sendWeightNormal {
		t.Fatal("an unset weight must read as normal")
	}
}

// Stored weights are normalised: keys lower-cased, normal entries dropped, values clamped.
func TestSendWeightsAreNormalised(t *testing.T) {
	got := normalizeSendWeights(map[string]float64{" Red  Hair ": 1, "beach": 99, "Lingerie": 0.35, "": 2})
	if _, kept := got["red hair"]; kept {
		t.Fatalf("a normal weight was kept: %v", got)
	}
	if got["beach"] != maxSendWeight || got["lingerie"] != 0.35 || len(got) != 2 {
		t.Fatalf("normalised weights = %v", got)
	}
}

// Library pictures of her draw by the same rules, weighted by tag.
func TestLibraryPictureOfHerIsChosenByTags(t *testing.T) {
	ws := chatWorkspace{}
	pics := libbySelfies()
	pic, ok := drawWeighted(selfPictureCandidates(ws, pics, "rooftop sunset", nil, nil), 1, nil)
	if !ok || pic.link.ID != 11 {
		t.Fatalf("asked-for picture resolved to %d, want 11", pic.link.ID)
	}
	if _, ok := drawWeighted(selfPictureCandidates(ws, pics, "rooftop sunset", map[int64]bool{11: true}, nil), 1, nil); ok {
		t.Fatal("a withheld picture was offered again")
	}
	if _, ok := drawWeighted(selfPictureCandidates(ws, pics, "the kitchen was cold", nil, nil), unpromptedPhotoFloor, nil); ok {
		t.Fatal("one incidental word attached a picture of her")
	}
	if _, ok := drawWeighted(selfPictureCandidates(ws, pics, "you on the rooftop at sunset in that red dress", nil, nil), unpromptedPhotoFloor, nil); !ok {
		t.Fatal("three matching words should attach a picture of her")
	}
}

// A snap is a send with one extra bit, read wherever it sat, and never also a send.
func TestSnapIsReadAsAPictureRequest(t *testing.T) {
	text, request, ok := splitSnapRequest("look what i'm wearing rn [snap: mirror, lingerie] 😏")
	if !ok || request != "mirror, lingerie" {
		t.Fatalf("snap not read: %q %v", request, ok)
	}
	if strings.Contains(text, "[snap") {
		t.Fatalf("tag left in prose: %q", text)
	}
	if _, _, asked := splitPhotoRequest(text); asked {
		t.Fatal("a snap was also read as a send")
	}
	if scrubbed := scrubDirectives("here [snap: mirror] ok"); strings.Contains(scrubbed, "[") {
		t.Fatalf("scrubber left the snap tag: %q", scrubbed)
	}
}

// Reactions: an emoji or a word for one, the first wins, and a tag alone is legal.
func TestReactionTagResolvesToOneEmoji(t *testing.T) {
	for reply, want := range map[string]string{
		"[react: ❤️]":              "❤️",
		"aww [react: heart] night": "❤️",
		"[react: 😂😂😂]":             "😂😂😂",
		"[reaction: fire]":         "🔥",
		"[react: with a big heart]": "❤️",
	} {
		got, ok := findReactTag(reply)
		if !ok || got != want {
			t.Fatalf("%q → %q %v, want %q", reply, got, ok, want)
		}
	}
	if _, ok := findReactTag("[react: whatever this is]"); ok {
		t.Fatal("an unknown word became a reaction")
	}
	if got := scrubDirectives("goodnight [react: ❤️]"); got != "goodnight" {
		t.Fatalf("scrubber left the react tag: %q", got)
	}
	// Their reactions on her messages reach her as prose.
	note := reactionsNote(chatMessage{Role: "assistant", Content: "x", Reactions: []chatReaction{{Emoji: "❤️", By: "user"}}})
	if !strings.Contains(note, "they reacted ❤️") {
		t.Fatalf("reaction note = %q", note)
	}
	if got := normalizeReactions([]chatReaction{{Emoji: "not an emoji", By: "user"}, {Emoji: "🔥", By: "nobody"}}); len(got) != 1 || got[0].By != "user" {
		t.Fatalf("normalised reactions = %+v", got)
	}
}

// A burst of texts is one turn: merged for the model, and read whole for signals.
func TestBurstOfTextsIsOneTurn(t *testing.T) {
	messages := []chatMessage{
		{Role: "assistant", Content: "hey"},
		{Role: "user", Content: "wait"},
		{Role: "user", Content: "actually"},
		{Role: "user", Content: "send me a pic"},
	}
	if got := trailingUserText(messages); got != "wait\nactually\nsend me a pic" {
		t.Fatalf("trailing text = %q", got)
	}
	merged := mergeTurns(messages)
	if len(merged) != 2 || merged[1].Role != "user" || !strings.Contains(merged[1].Content, "wait\n\nactually") {
		t.Fatalf("merged = %+v", merged)
	}
	if got := trailingUserText(messages[:1]); got != "hey" {
		t.Fatalf("a continuation turn reads the latest message: %q", got)
	}
}

// What they state outright about themselves is filed whether or not she thought to.
func TestPlainlyStatedFactsAreCaptured(t *testing.T) {
	for text, want := range map[string]string{
		"my name's Owen btw":                       "Their name is Owen",
		"I live in Leeds, it's grim":               "They live in Leeds",
		"i work as a nurse and it's exhausting":    "They work as a nurse",
		"honestly I hate horror films":             "They hate horror films",
		"I really love rainy nights":               "They love rainy nights",
		"please don't bring up my ex again":        "They asked me never to bring up my ex again",
		// The boundary cuts at a conjunction. This pattern shipped with a literal
		// backspace where the word boundary should have been, so it never cut here.
		"never mention my brother but you can ask": "They asked me never to mention my brother",
		"I have a dog named Rex!":                  "They have a dog named Rex",
		"my favourite game is Elden Ring. you?":    "Their favourite game is Elden Ring",
	} {
		got := captureUserFacts(text, "")
		if len(got) != 1 || got[0] != want {
			t.Fatalf("%q → %v, want %q", text, got, want)
		}
	}
	for _, quiet := range []string{"hey how are you", "i love you", "lol", "(Continue the scene on your own.)", "I'm a bit tired"} {
		if got := captureUserFacts(quiet, ""); len(got) != 0 {
			t.Fatalf("%q filed %v", quiet, got)
		}
	}
	// Their profile name is not news.
	if got := captureUserFacts("call me Owen", "Owen"); len(got) != 0 {
		t.Fatalf("the profile name was filed again: %v", got)
	}
}
