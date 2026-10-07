package api

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

// Every case here is a reply that actually reached the user in one conversation log:
// the prompt's own wording, the history's notes, and a tag-only reply, all read back
// as her words.
func TestScrubDirectivesRemovesCopiedPromptMachinery(t *testing.T) {
	cases := []struct {
		name  string
		reply string
		want  string
	}{
		{
			"the history's own note, copied",
			"(you attached a video file — 1girl, anus, ass, medium quality)",
			"",
		},
		{
			"the selfie note, copied",
			"here you go\n(you sent a picture of yourself showing 1girl, blush, breasts)",
			"here you go",
		},
		{
			"the hand-over note, copied",
			"put it on then\n(you handed over from the library: \"p\" (video; 1boy, 1girl))",
			"put it on then",
		},
		{
			"a tag list in parentheses",
			"here — opening it plays on the library screen.\n\n(1girl, mouth open around a strapless bra as she pulls it over her head. smooth motion, practiced. camera held steady on her tits. audio muted on purpose — lets viewer fill the silence with fantasy.)",
			"here — opening it plays on the library screen.",
		},
		{
			"the prompt's already-sent wording as a stage direction",
			"done. renamed it to match our tastes.\n\n[this image hasn't been marked 'already sent' — it's a new one you're offering proactively because you've just made them part of the collection.]",
			"done. renamed it to match our tastes.",
		},
		{
			"a library kind as a tag head",
			"yours truly. 😏\n\n[gif: uncensored, dildo, object insertion, sex toy]",
			"yours truly. 😏",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _ := scrubDirectivesReporting(tc.reply)
			if got != tc.want {
				t.Errorf("scrubDirectivesReporting(%q)\n got %q\nwant %q", tc.reply, got, tc.want)
			}
		})
	}
	// And the prose these could be mistaken for stays.
	for _, reply := range []string{
		"(she hands over the remote and curls up)",
		"*you sent me that look again*",
		"(you attached yourself to my side all evening, remember)",
		"[laughs] twelve girls, one bathroom, chaos",
	} {
		if got := scrubDirectives(reply); got != reply {
			t.Errorf("scrubDirectives(%q) = %q, want it unchanged", reply, got)
		}
	}
}

// A reply that was only a tag is reported as emptied, so the handler can treat it as
// a picture with no words rather than store the tag as her message.
func TestTagOnlyReplyIsReportedEmptied(t *testing.T) {
	got, emptied := scrubDirectivesReporting("[send: red eyes, pixel art]")
	if got != "" || !emptied {
		t.Fatalf("got %q emptied=%v, want \"\" and true", got, emptied)
	}
	if got, emptied := scrubDirectivesReporting("look. [send: red eyes]"); got != "look." || emptied {
		t.Fatalf("got %q emptied=%v", got, emptied)
	}
}

// Which picture "that photo" is: the one they replied to, else the last one sent;
// and asking for another is not asking about one.
func TestPictureInQuestion(t *testing.T) {
	messages := []chatMessage{
		{ID: "a", Role: "user", Content: "send me the photo of you in a red dress"},
		{ID: "b", Role: "assistant", Content: "here", ImageID: "dress"},
		{ID: "c", Role: "user", Content: "and a kitchen one"},
		{ID: "d", Role: "assistant", Content: "sure", ImageID: "kitchen"},
		{ID: "e", Role: "user", Content: "what are you doing in that photo?"},
	}
	if m, ok := pictureInQuestion(messages); !ok || m.ImageID != "kitchen" {
		t.Fatalf("that photo should be the last one sent: %+v %v", m, ok)
	}
	messages[4] = chatMessage{ID: "e", Role: "user", Content: "what is this a photo of in your words", ReplyTo: &chatReplyRef{ID: "b", Role: "assistant"}}
	if m, ok := pictureInQuestion(messages); !ok || m.ImageID != "dress" {
		t.Fatalf("a reply to a picture is about that picture: %+v %v", m, ok)
	}
	messages[4] = chatMessage{ID: "e", Role: "user", Content: "thats you", ReplyTo: &chatReplyRef{ID: "b", Role: "assistant"}}
	if m, ok := pictureInQuestion(messages); !ok || m.ImageID != "dress" {
		t.Fatalf("a reply to a picture is about that picture whatever the words: %+v %v", m, ok)
	}
	for _, asking := range []string{"send me another photo", "show me the pic of you at the beach", "can i see that photo again"} {
		messages[4] = chatMessage{ID: "e", Role: "user", Content: asking}
		if _, ok := pictureInQuestion(messages); ok {
			t.Errorf("%q is asking for a picture, not about one", asking)
		}
	}
	messages[4] = chatMessage{ID: "e", Role: "user", Content: "how was the gym"}
	if _, ok := pictureInQuestion(messages); ok {
		t.Fatal("a message about nothing pictured found a picture")
	}
}

// She is handed everything the picture shows, uncapped, and told it is hers to
// remember rather than a list to read.
func TestPictureInQuestionDirectiveShowsEveryTag(t *testing.T) {
	s, _ := newTestServer(t)
	tags := []string{"1girl", "blush", "breasts", "dress", "glasses", "halo", "long hair", "reaching out", "red dress", "red footwear", "selfie", "solo"}
	ws := chatWorkspace{Images: []chatImage{{ID: "dress", CharacterID: "libby", Tags: tags}}}
	messages := []chatMessage{
		{ID: "b", Role: "assistant", Content: "here", ImageID: "dress"},
		{ID: "e", Role: "user", Content: "what is this a photo of", ReplyTo: &chatReplyRef{ID: "b", Role: "assistant"}},
	}
	d := s.newHistoryDescriber(context.Background(), ws, messages)
	got := pictureInQuestionDirective(messages[0], d)
	for _, tag := range tags {
		if !strings.Contains(got, tag) {
			t.Fatalf("tag %q missing from %q", tag, got)
		}
	}
	if !strings.Contains(got, "That is you in it") || !strings.Contains(got, "do not send another one") {
		t.Fatalf("directive does not frame it as hers, or invites another picture: %q", got)
	}
	// A library item she handed over is described as an item, with all its tags.
	id := seedTitledMedia(t, s, "Solo GrindSet", "video", "1girl", "anus", "ass", "pussy", "solo", "medium quality", "bedroom")
	messages = []chatMessage{
		{ID: "b", Role: "assistant", Content: "here", MediaIDs: []int64{id}},
		{ID: "e", Role: "user", Content: "whats the story behind that video"},
	}
	d = s.newHistoryDescriber(context.Background(), ws, messages)
	got = pictureInQuestionDirective(messages[0], d)
	if !strings.Contains(got, "Solo GrindSet") || !strings.Contains(got, "bedroom") || !strings.Contains(got, "not a picture of you") {
		t.Fatalf("library item not described in full: %q", got)
	}
}

// jsonString quotes a reply for a fake backend's body.
func jsonString(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}
