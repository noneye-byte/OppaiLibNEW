package api

import (
	"context"
	"strings"
	"testing"
)

// The evening that sent us back here, as a transcript: asked for a gif from the
// library she handed over a video, then another video, then a game; asked to move to
// the kitchen she walked there in prose and stayed in the bedroom; asked to hang up she
// clicked the button in prose and stayed on the call; asked for a bath picture she had
// no picture of, she sent a sex picture with a bath described over it; asked what a
// video was of, she pasted its catalogue line and a nude arrived under it. Every one of
// those was the server doing what a small model wrote rather than what the person asked.

// Asked for a gif, she gets a gif — whatever title she wrote. The title of a video is
// refused because it is a video, and with nothing of the kind matching her words or
// theirs, any gif they have not seen is the answer.
func TestAttachHonoursTheKindTheyAskedFor(t *testing.T) {
	s, _ := newTestServer(t)
	video := seedTitledMedia(t, s, "1788917477638.mp4", "video", "1girl", "ass")
	gif := seedTitledMedia(t, s, "rapidsave.com_dzvs90vfhlyb1", "gif", "square")
	ctx := context.Background()

	got := s.resolveLibraryAttachments(ctx, []string{"1788917477638.mp4"}, "Can you send me a gif from the library?", "gif", nil, nil, nil)
	if len(got) != 1 || got[0].ID != gif {
		t.Fatalf("asked for a gif, got %+v, want the gif", got)
	}
	// With no kind named, the exact title she wrote is what she meant.
	got = s.resolveLibraryAttachments(ctx, []string{"1788917477638.mp4"}, "put that one on", "", nil, nil, nil)
	if len(got) != 1 || got[0].ID != video {
		t.Fatalf("no kind named, got %+v, want the video she titled", got)
	}
	// The only gif has been shown: nothing of the kind is left, and nothing of another
	// kind stands in for it.
	got = s.resolveLibraryAttachments(ctx, []string{"1788917477638.mp4"}, "another gif", "gif", map[int64]bool{gif: true}, nil, nil)
	if len(got) != 0 {
		t.Fatalf("with every gif shown, got %+v, want nothing", got)
	}
}

// A filename she made up must not land on a real file through its extension alone.
func TestAnInventedFilenameDoesNotMatchOnItsExtension(t *testing.T) {
	s, _ := newTestServer(t)
	seedTitledMedia(t, s, "S33z68xx_720p.mp4", "video", "1boy", "1girl")
	ctx := context.Background()
	if got := s.resolveLibraryAttachments(ctx, []string{"0f2e_86c.mp4"}, "", "", nil, nil, nil); len(got) != 0 {
		t.Fatalf("an invented .mp4 resolved to %+v", got)
	}
}

// The kind they want is the last one named, and a kind ruled out is not named.
func TestKindAskedIsTheLastOneNotRuledOut(t *testing.T) {
	cases := map[string]string{
		"That's a video a gif from the library": "gif",
		"no a gif":                              "gif",
		"send me a gif not a video":             "gif",
		"put on a video":                        "video",
		"video call me":                         "",
		"hey babe":                              "",
	}
	for text, want := range cases {
		if got := libraryKindAsked(text); got != want {
			t.Errorf("libraryKindAsked(%q) = %q, want %q", text, got, want)
		}
	}
}

// "Move to the kitchen" is a room change, not a library action — and the short message
// after it is not an answer to an offer she never made.
func TestMovingRoomsIsNotAnAction(t *testing.T) {
	sig := readTurnSignals("Can you move to the kitchen?", "")
	if sig.act {
		t.Fatal("moving to the kitchen read as a library action")
	}
	if !sig.place {
		t.Fatal("moving to the kitchen did not read as a place")
	}
	sig = readTurnSignals("Can you masturbate?", "Can you move to the kitchen?")
	if sig.act || sig.actFollowUp {
		t.Fatalf("a short message after a room change read as answering an offer: %+v", sig)
	}
	if sig := readTurnSignals("move it into favourites", ""); !sig.act {
		t.Fatal("moving an item is still an action")
	}
}

// A catalogue line she copied — "(gif; square)", "(video; tags…)" — is deleted, on its
// own line even when a tag inside it carries parentheses, and it is not her speaking of
// a picture.
func TestACopiedCatalogueLineIsNotSpeech(t *testing.T) {
	if got, emptied := scrubDirectivesReporting("[attach: 0f2e_86c.mp4] (gif; square)"); !emptied {
		t.Fatalf("a reply that was only a tag and a catalogue line came back as %q", got)
	}
	raw := "it’s in the hentai folder — 1788917477638.mp4\n(video; 1girl, anus, ass, photo (medium), pussy, solo)\n\nyou can watch it anytime."
	got, _ := scrubDirectivesReporting(raw)
	if strings.Contains(got, "1girl") || strings.Contains(got, "(video") {
		t.Fatalf("the catalogue line survived: %q", got)
	}
	if !strings.Contains(got, "hentai folder") || !strings.Contains(got, "anytime") {
		t.Fatalf("her own words did not survive: %q", got)
	}
	if sheSaidSheWasSending(raw) {
		t.Fatal("a pasted tag list with 'photo (medium)' in it read as her sending a picture")
	}
	if !sheSaidSheWasSending("hold on, *sends you a pic*") {
		t.Fatal("actual narration stopped counting")
	}
}

// A move they asked for by name happens without the tag; a room merely mentioned moves
// nobody.
func TestAMoveTheyAskedForHappensWithoutTheTag(t *testing.T) {
	backgrounds := []libbyBackgroundView{
		{libbyBackground: libbyBackground{ID: "k", Name: "Kitchen", Tags: []string{"cooking", "kitchen", "food"}}, HasImage: true},
		{libbyBackground: libbyBackground{ID: "b", Name: "Bedroom", Tags: []string{"bedroom", "bed", "sleep"}}, HasImage: true},
	}
	if id, ok := inferSceneMove("Can you move to the kitchen?", backgrounds); !ok || id != "k" {
		t.Fatalf("move to the kitchen inferred %q, %v", id, ok)
	}
	if id, ok := inferSceneMove("go to bed", backgrounds); !ok || id != "b" {
		t.Fatalf("go to bed inferred %q, %v", id, ok)
	}
	if id, ok := inferSceneMove("I'm in bed lol", backgrounds); ok {
		t.Fatalf("them being in bed moved her to %q", id)
	}
	if _, ok := inferSceneMove("let's go watch something", backgrounds); ok {
		t.Fatal("a move with no room in it resolved to one")
	}
}

// A hang-up they asked for, or one she narrated, ends the call without the tag; one
// they asked her not to do does not. A call they asked for rings.
func TestACallEndsWhenAskedOrNarrated(t *testing.T) {
	if !inferCallEnd("can you hang up?", "sure.") {
		t.Fatal("asking her to hang up did not end the call")
	}
	if !inferCallEnd("ok bye", "*clicks the green disconnect button firmly*\n\nthere goes our connection.") {
		t.Fatal("narrating the disconnect did not end the call")
	}
	if inferCallEnd("don't hang up yet", "not going anywhere") {
		t.Fatal("being asked not to hang up ended the call")
	}
	if inferCallEnd("what are you doing", "reading, mostly") {
		t.Fatal("an ordinary turn ended the call")
	}
	if !inferCallRequest("Can you start a call?") || !inferCallRequest("video call me") || !inferCallRequest("call me?") {
		t.Fatal("asking for a call did not ring")
	}
	if inferCallRequest("call me babe") || inferCallRequest("i'll call you later") {
		t.Fatal("an endearment or a plan rang them")
	}
}

// A state they asked for and she narrated is set without the tag; a mention is not an
// ask, a refusal narrates nothing, and an intimate ask answered with a different
// intimate act takes the act she wrote.
func TestAStateTheyAskedForIsReadOffHerNarration(t *testing.T) {
	if id, ok := inferAskedActivity("Can you wave to me?", "*waves slowly at camera*\n\nhere we are."); !ok || id != "waving" {
		t.Fatalf("wave inferred %q, %v", id, ok)
	}
	if _, ok := inferAskedActivity("Can you wave to me?", "no lol. come here and i will"); ok {
		t.Fatal("a refusal set a state")
	}
	if _, ok := inferAskedActivity("i love dancing", "same, honestly"); ok {
		t.Fatal("a mention read as an ask")
	}
	if id, ok := inferAskedActivity("Can you masturbate?", "*i spread my legs against the counter and grind against it*"); !ok || id != "grinding" {
		t.Fatalf("an intimate ask answered with grinding inferred %q, %v", id, ok)
	}
	if id, ok := inferAskedActivity("could you dance for me", "she dances, badly, and does not care"); !ok || id != "dancing" {
		t.Fatalf("dance inferred %q, %v", id, ok)
	}
}

// A slot she left for their name is filled with it.
func TestNamePlaceholdersAreFilled(t *testing.T) {
	if got := fillNamePlaceholders("How'd [Name] go? {{user}}, you there", "Error"); got != "How'd Error go? Error, you there" {
		t.Fatalf("got %q", got)
	}
	if got := fillNamePlaceholders("How'd [Name] go?", ""); got != "How'd go?" {
		t.Fatalf("with no name, got %q", got)
	}
	if got := fillNamePlaceholders("[laughs] no way", "Error"); got != "[laughs] no way" {
		t.Fatalf("prose in brackets was touched: %q", got)
	}
}

// What they asked to see her in, less the asking.
func TestPictureRequestSubject(t *testing.T) {
	cases := map[string]string{
		"Can you send me a snap of you in the tub with bubbles": "tub with bubbles",
		"send me a pic of you":                                   "",
		"send me a nude":                                         "",
		"let me see you in the red dress":                        "red dress",
		"pic of you wearing the black tank top":                  "black tank top",
		"i want to see you":                                      "",
	}
	for text, want := range cases {
		if got := pictureRequestSubject(text); got != want {
			t.Errorf("pictureRequestSubject(%q) = %q, want %q", text, got, want)
		}
	}
	directive := missingPictureDirective("in the tub with bubbles")
	for _, want := range []string{"no picture you have shows that", "Do not send a picture", "[do: generate you in the tub with bubbles]"} {
		if !strings.Contains(directive, want) {
			t.Fatalf("the missing-picture directive lacks %q: %s", want, directive)
		}
	}
}

// "Call me in the kitchen" is a request, not a name — the memory that read "Their name
// is in the kitchen" sat at the top of every prompt for a week.
func TestCallMeSomewhereIsNotAName(t *testing.T) {
	for _, text := range []string{"call me in the kitchen", "call me later ok", "call me when you're done", "you can call me tomorrow"} {
		if facts := captureUserFacts(text, ""); len(facts) != 0 {
			t.Errorf("%q captured %v", text, facts)
		}
	}
	if facts := captureUserFacts("you can call me Owen", ""); len(facts) != 1 || facts[0] != "Their name is Owen" {
		t.Fatalf("a real name was not kept: %v", facts)
	}
}
