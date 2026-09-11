package api

import (
	"strings"
	"testing"
	"time"
)

func recapConvo(id, title string, updated time.Time, messages ...storedChatMessage) chatConversation {
	return chatConversation{
		ID: id, CharacterID: "libby", Title: title,
		UpdatedAt: updated.UnixMilli(), Messages: messages,
	}
}

func said(role, text string) storedChatMessage {
	return storedChatMessage{ID: role + text, Role: role, Content: text}
}

func TestConversationRecapsCarriesOtherChatsAndNotThisOne(t *testing.T) {
	now := time.Now()
	ws := chatWorkspace{Conversations: []chatConversation{
		recapConvo("here", "the one we are in", now,
			said("user", "so anyway"), said("assistant", "mm"), said("user", "right")),
		recapConvo("weekend", "the aquarium", now.Add(-30*time.Hour),
			said("user", "we should go to the aquarium"),
			said("assistant", "book it and I will clear my evening"),
			said("user", "saturday then")),
	}}

	block := conversationRecaps(ws, "libby", "here", now)
	if !strings.Contains(block, "the aquarium") {
		t.Fatalf("the other conversation was not recalled:\n%s", block)
	}
	if !strings.Contains(block, "saturday then") {
		t.Fatalf("the other conversation's tail was not carried:\n%s", block)
	}
	if strings.Contains(block, "the one we are in") || strings.Contains(block, "so anyway") {
		t.Fatalf("the current conversation was recapped back at her:\n%s", block)
	}
	if !strings.Contains(block, "about a day ago") {
		t.Fatalf("the recap did not place the conversation in time:\n%s", block)
	}
}

func TestConversationRecapsIsEmptyWithoutOtherChats(t *testing.T) {
	now := time.Now()
	ws := chatWorkspace{Conversations: []chatConversation{
		recapConvo("here", "only chat", now, said("user", "hi"), said("assistant", "hey"), said("user", "hey back")),
		// Her opener and nothing else is not a conversation to remember.
		recapConvo("stub", "barely started", now.Add(-time.Hour), said("assistant", "Hey, you.")),
		// Another character's chats are not hers to read.
		func() chatConversation {
			c := recapConvo("friend", "someone else", now.Add(-time.Hour),
				said("user", "a"), said("assistant", "b"), said("user", "c"))
			c.CharacterID = "imported"
			return c
		}(),
	}}
	if block := conversationRecaps(ws, "libby", "here", now); block != "" {
		t.Fatalf("expected no recap block, got:\n%s", block)
	}
}

func TestConversationRecapsSkipsThoughtsAndBoundsItself(t *testing.T) {
	now := time.Now()
	long := strings.Repeat("verbose ", 60)
	thought := storedChatMessage{ID: "t", Role: "assistant", Content: "privately worried", Thought: "thought"}
	convos := []chatConversation{
		recapConvo("here", "current", now, said("user", "x"), said("assistant", "y"), said("user", "z")),
	}
	// More conversations than the block will carry, oldest last.
	for i := 0; i < recapConversations+3; i++ {
		convos = append(convos, recapConvo(
			"old"+string(rune('a'+i)), "chat "+string(rune('a'+i)),
			now.Add(-time.Duration(i+1)*time.Hour),
			said("user", long), thought, said("assistant", "ok"), said("user", "sure"),
		))
	}
	block := conversationRecaps(chatWorkspace{Conversations: convos}, "libby", "here", now)

	if strings.Contains(block, "privately worried") {
		t.Fatal("a thought she never said was replayed as speech")
	}
	if got := strings.Count(block, "\n- "); got != recapConversations {
		t.Fatalf("carried %d conversations, want %d:\n%s", got, recapConversations, block)
	}
	// The fixed header is as long as it is; what has to stay bounded is the content,
	// which is the part a conversation can grow without limit.
	for _, line := range strings.Split(block, "\n") {
		if !strings.HasPrefix(strings.TrimSpace(line), "- ") {
			continue
		}
		if len([]rune(line)) > recapLineLen+40 {
			t.Fatalf("unbounded recap line (%d runes): %s", len([]rune(line)), line)
		}
	}
}

func TestCurrentConversationIDPrefersTheClientAndFallsBackToTheTail(t *testing.T) {
	ws := chatWorkspace{Conversations: []chatConversation{
		recapConvo("stated", "a", time.Now(), said("user", "one"), said("assistant", "two")),
		// The stored copy is a turn behind the request, which is the ordinary case:
		// the client posts the new message and saves the workspace in parallel.
		recapConvo("guessed", "b", time.Now(), said("user", "earlier"), said("assistant", "a reply")),
	}}
	in := chatRequest{
		CharacterID: "libby",
		Messages: []chatMessage{
			{Role: "user", Content: "earlier"},
			{Role: "assistant", Content: "a reply"},
			{Role: "user", Content: "the new one, not saved yet"},
		},
	}
	if got := currentConversationID(ws, chatRequest{ConversationID: "stated", Messages: in.Messages}); got != "stated" {
		t.Fatalf("the stated id was ignored: %q", got)
	}
	if got := currentConversationID(ws, in); got != "guessed" {
		t.Fatalf("the tail fallback found %q, want \"guessed\"", got)
	}
}
