package api

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// What she remembers of the *other* conversations.
//
// Libby carried three things between conversations: facts about the user (memory), her
// own standing wants, and where the two of them stand (the bond). None of those is the
// conversation itself. So a second chat about the same evening opened with her knowing
// the user's name and mood and nothing whatever about the thing they had been talking
// about ten minutes earlier in the next chat along — which reads exactly like what it
// was, a fresh session wearing her face.
//
// The fix needs no new storage, because the conversations are already here. The client
// owns the log, but it round-trips through the workspace file on this server, so every
// conversation with this character is in hand on every turn. All that was missing was
// saying so in the prompt.
//
// Mechanical, with no second model call, for the reasons chat_budget.go gives about its
// own digest: summarising with another inference pass would double the latency of every
// turn on hardware that is already the bottleneck, and a 7B model summarising its own
// transcript invents freely. What is fed back is what was actually said, clipped.
//
// Libby's alone, like memory, wants and the bond. An imported card is somebody else's
// character, and handing it the transcripts of the user's other chats is not continuity,
// it is a leak.

const (
	// recapConversations bounds how many other conversations are carried. Four is enough
	// to cover "the one from this morning" and "the long one from the weekend" without
	// the block turning into a second transcript.
	recapConversations = 4
	// recapLines bounds how much of each is shown — the tail, which is where a
	// conversation got to and therefore the part still bearing on this one.
	recapLines = 4
	// recapLineLen bounds one of those lines.
	recapLineLen = 110
	// recapMinMessages is the least a conversation must hold to be worth recalling. Her
	// opener alone is not a conversation, and a list of chats that never happened would
	// crowd out the ones that did.
	recapMinMessages = 3
	// recapMatchDepth is how far back the tail-matching fallback looks when a client
	// does not say which conversation this is. See currentConversationID.
	recapMatchDepth = 3
)

// spokenChatMessages is a conversation's actual speech: no thoughts, nothing empty.
//
// Thoughts are excluded for the same reason the live history excludes them — they were
// never said, and replaying them as things she said teaches the model that the format
// belongs in a reply.
func spokenChatMessages(convo chatConversation) []storedChatMessage {
	out := make([]storedChatMessage, 0, len(convo.Messages))
	for _, m := range convo.Messages {
		if m.Thought != "" || strings.TrimSpace(m.Content) == "" {
			continue
		}
		out = append(out, m)
	}
	return out
}

// currentConversationID is which conversation this turn belongs to, so it can be left
// out of its own recap.
//
// The client says so when it can. When it cannot — an older build, or any client that
// has not been taught the field — the conversation is identified by its tail instead:
// the stored copy of an in-flight turn is usually one or two messages behind what is
// being sent, because the client posts the new message and saves the workspace in
// parallel, so the newest incoming lines are matched rather than only the last one.
//
// A miss costs one duplicated block, not a wrong answer, which is why a heuristic is
// acceptable here and would not be for anything that writes.
func currentConversationID(ws chatWorkspace, in chatRequest) string {
	if id := strings.TrimSpace(in.ConversationID); id != "" {
		return id
	}
	if len(in.Messages) == 0 {
		return ""
	}
	recent := map[string]bool{}
	for i := len(in.Messages) - 1; i >= 0 && len(recent) < recapMatchDepth; i-- {
		if text := strings.TrimSpace(in.Messages[i].Content); text != "" {
			recent[text] = true
		}
	}
	best := ""
	var bestAt int64
	for _, convo := range ws.Conversations {
		if convo.CharacterID != in.CharacterID {
			continue
		}
		spoken := spokenChatMessages(convo)
		if len(spoken) == 0 {
			continue
		}
		if recent[strings.TrimSpace(spoken[len(spoken)-1].Content)] && convo.UpdatedAt >= bestAt {
			best, bestAt = convo.ID, convo.UpdatedAt
		}
	}
	return best
}

// conversationRecaps renders the other conversations into the system prompt.
//
// Empty when there are none, like every other optional block, so a user with one chat
// open reads as someone she has only ever had one conversation with.
func conversationRecaps(ws chatWorkspace, characterID, currentID string, now time.Time) string {
	var others []chatConversation
	for _, convo := range ws.Conversations {
		if convo.CharacterID != characterID || convo.ID == currentID {
			continue
		}
		if len(spokenChatMessages(convo)) < recapMinMessages {
			continue
		}
		others = append(others, convo)
	}
	if len(others) == 0 {
		return ""
	}
	// Most recent first, because that is the order they are worth remembering in and
	// the order the budget would want to cut from the end of.
	sort.SliceStable(others, func(a, b int) bool { return others[a].UpdatedAt > others[b].UpdatedAt })
	if len(others) > recapConversations {
		others = others[:recapConversations]
	}

	var b strings.Builder
	b.WriteString("\n\nYour other conversations with this same person, most recent first. " +
		"These happened and you were there; they are your memories, not notes handed to you. " +
		"Pick them back up when they bear on what is being said now — ask how the thing they mentioned went, " +
		"hold them to what they said. Never recite one back, never quote it, and never mention that you are " +
		"working from a summary or that these are separate conversations.\n")
	for _, convo := range others {
		spoken := spokenChatMessages(convo)
		if len(spoken) > recapLines {
			spoken = spoken[len(spoken)-recapLines:]
		}
		fmt.Fprintf(&b, "- %q, %s:\n", recapTitle(convo), recapWhen(convo.UpdatedAt, now))
		for _, m := range spoken {
			who := "They said"
			if m.Role == "assistant" {
				who = "You said"
			}
			fmt.Fprintf(&b, "    - %s: %s\n", who, clipRecapLine(m.Content))
		}
	}
	return b.String()
}

// recapTitle is what to call a conversation. The client titles one from its opening
// line, so an untitled one is one that never got past the greeting.
func recapTitle(convo chatConversation) string {
	title := strings.Join(strings.Fields(convo.Title), " ")
	if title == "" || title == "New conversation" {
		return "an earlier chat"
	}
	return clipRecapLine(title)
}

// recapWhen places a conversation in time in her words rather than in a timestamp. It
// reuses the bond's phrasing so "a few hours ago" means the same thing in both blocks.
func recapWhen(at int64, now time.Time) string {
	if at <= 0 {
		return "at some point"
	}
	gap := humanizeGap(now.Sub(time.UnixMilli(at)))
	if gap == "" {
		return "just now"
	}
	return gap + " ago"
}

// clipRecapLine flattens one line and bounds it. Whitespace is collapsed first so a
// message full of blank lines does not spend its whole allowance on them.
func clipRecapLine(text string) string {
	line := strings.Join(strings.Fields(text), " ")
	if len([]rune(line)) > recapLineLen {
		line = string([]rune(line)[:recapLineLen]) + "…"
	}
	return line
}
