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

// Asked what the last chat was about, she made one up — the cue that would have told
// her what she had of it, and that not remembering is an answer, never fired.
func TestAskingAboutTheLastChatReachesBack(t *testing.T) {
	for _, text := range []string{"What was our last chat about I forgot", "what did we talk about", "catch me up", "where were we"} {
		if !readTurnSignals(text, "").past {
			t.Errorf("%q did not read as reaching back", text)
		}
	}
	for _, want := range []string{"you do not remember it", "Never make up"} {
		if !strings.Contains(pastHonestyDirective, want) {
			t.Fatalf("the directive lacks %q", want)
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
