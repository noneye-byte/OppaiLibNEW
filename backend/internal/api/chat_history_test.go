package api

import (
	"context"
	"strings"
	"testing"
)

// A message that carried something says what, on every turn after the one it was sent
// on — which is the whole of what she could not do before.
func TestHistoryContentDescribesWhatWasCarried(t *testing.T) {
	s, _ := newTestServer(t)
	id := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach", "swimsuit")
	ws := chatWorkspace{Images: []chatImage{{ID: "img1", Tags: []string{"sunset", "bikini", "smile"}}}}
	messages := []chatMessage{
		{ID: "a", Role: "user", Content: "*shares a photo with you*", ImageID: "img1"},
		{ID: "b", Role: "assistant", Content: "oh that's a good one", ImageID: "selfie-gone"},
		{ID: "c", Role: "user", Content: "and this", MediaIDs: []int64{id, 999999}},
		{ID: "d", Role: "user", Content: "what did you think of the photo?"},
	}
	d := s.newHistoryDescriber(context.Background(), ws, messages)

	if got := historyContent(messages[0], d); !strings.Contains(got, "(they attached a photo showing sunset, bikini, smile)") {
		t.Fatalf("photo not described: %q", got)
	}
	// A picture the workspace no longer holds is still a picture she sent.
	if got := historyContent(messages[1], d); !strings.Contains(got, "(you sent a picture of yourself)") {
		t.Fatalf("her own picture not described: %q", got)
	}
	got := historyContent(messages[2], d)
	if !strings.Contains(got, `they attached from the library: "Summer at the Coast" (video; beach, swimsuit)`) {
		t.Fatalf("library item not described: %q", got)
	}
	if got := historyContent(messages[3], d); got != "what did you think of the photo?" {
		t.Fatalf("a plain message grew: %q", got)
	}
}

// The reply directive quotes the whole message and what it showed, not the bubble's
// excerpt.
func TestReplyTargetDirectiveResolvesTheWholeMessage(t *testing.T) {
	s, _ := newTestServer(t)
	long := strings.Repeat("this is the thing i wanted to ask you about, ", 6) + "and here is the actual question at the end"
	ws := chatWorkspace{Images: []chatImage{{ID: "img1", Tags: []string{"kitchen", "apron"}}}}
	messages := []chatMessage{
		{ID: "a", Role: "user", Content: long, ImageID: "img1"},
		{ID: "b", Role: "assistant", Content: "sure"},
		{ID: "c", Role: "user", Content: "so?", ReplyTo: &chatReplyRef{ID: "a", Role: "user", Excerpt: excerptOf(long)}},
	}
	d := s.newHistoryDescriber(context.Background(), ws, messages)
	got := replyTargetDirective(messages[2].ReplyTo, messages, d)
	if !strings.Contains(got, "actual question at the end") {
		t.Fatalf("the end of the quoted message was lost: %q", got)
	}
	if !strings.Contains(got, "they attached a photo showing kitchen, apron") {
		t.Fatalf("what the quoted message carried was lost: %q", got)
	}
	// An id that resolves to nothing falls back to the excerpt rather than to silence.
	got = replyTargetDirective(&chatReplyRef{ID: "zzz", Role: "assistant", Excerpt: "an old line"}, messages, d)
	if !strings.Contains(got, "something you said earlier: \"an old line\"") {
		t.Fatalf("excerpt fallback missing: %q", got)
	}
	if replyTargetDirective(nil, messages, d) != "" {
		t.Fatal("no reply, no directive")
	}
}
