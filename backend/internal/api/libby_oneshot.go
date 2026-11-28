package api

import (
	"strings"
	"time"
)

// One-shots: a scene they set, played once, and forgotten.
//
// An ordinary conversation with her is part of one long acquaintance. What she learns
// is kept, the bond moves, the journal is written once it goes quiet, and the next
// conversation is told about this one. That is the point of her, and it is exactly
// wrong for a scene someone wants to play once — a stranger on a train, the night the
// power went out — because everything in it becomes something she "remembers": a fact
// about them she never should have filed, a pet name from a character she was
// playing, a recap of it read into tomorrow's good morning.
//
// A one-shot starts with her asking for the scene. Their first message is the scene,
// pinned at the head of her prompt for the rest of it (where it holds still, so the
// backend's cache keeps it). Nothing of hers is read into it — not what she remembers
// about them, not her wants, the bond, her journal or the other conversations — and
// nothing goes out of it: no memory, no bond, no journal, no recap, no new room. The
// conversation itself goes when they end it, or after oneShotForgetAfter untouched.
// Pictures she takes in one still land in her gallery, which is theirs, not her memory.

// libbyOneShot marks a conversation as a one-shot.
type libbyOneShot struct {
	// Prompt is the scene as they set it, their first message; "" until they have.
	Prompt string `json:"prompt,omitempty"`
}

// taskOneShot is the turn that opens one: her asking for the scene.
const taskOneShot = "oneshot"

// oneShotForgetAfter is how long a one-shot left alone is kept before it goes.
const oneShotForgetAfter = 12 * time.Hour

// oneShotOpenerCue is the instruction for her opening line. Never stored.
const oneShotOpenerCue = "(They have started a one-shot with you: a scene of their own making, played once and forgotten when it ends. " +
	"Ask them to set it — who the two of you are, where you are, what is happening — briefly and in your own voice. " +
	"Do not invent the scene yourself, and do not start playing yet.)"

// forgotten says a conversation is a one-shot: nothing is read into it from the rest of
// her life with them, and nothing is taken out of it.
func (c chatConversation) forgotten() bool { return c.OneShot != nil }

// normalizeOneShot bounds a one-shot from a client.
func normalizeOneShot(o *libbyOneShot) *libbyOneShot {
	if o == nil {
		return nil
	}
	prompt, ok := cleanLimited(o.Prompt, maxChatText)
	if !ok {
		prompt = truncateRunes(o.Prompt, maxChatText)
	}
	return &libbyOneShot{Prompt: strings.TrimSpace(prompt)}
}

// oneShotScene is the scene a one-shot is playing: the stored prompt, or their first
// message when it has not been stored yet. "" before they have set one.
func oneShotScene(c chatConversation) string {
	if c.OneShot == nil {
		return ""
	}
	if c.OneShot.Prompt != "" {
		return c.OneShot.Prompt
	}
	for _, m := range c.Messages {
		if m.Role == "user" && m.Thought == "" && strings.TrimSpace(m.Content) != "" {
			return strings.TrimSpace(m.Content)
		}
	}
	return ""
}

// oneShotDirective is the head of a one-shot's prompt: what it is and, once they have
// said, the scene. It goes in head because it holds still for the whole of one.
func oneShotDirective(scene string) string {
	var b strings.Builder
	b.WriteString("\n\nThis conversation is a one-shot: a scene they set, played once. Nothing of it will be remembered — not by you, not in your memories or your history together — so play it as its own thing, fully, and do not bring your life together with them into it unless the scene does.")
	if scene == "" {
		b.WriteString(" They have not set the scene yet.")
		return b.String()
	}
	b.WriteString("\nThe scene, as they set it:\n\"\"\"\n" + scene + "\n\"\"\"\n" +
		"Play your part in it from the first reply. If it makes you someone else, be them, with your own warmth underneath; if it says who they are, treat them as that. " +
		"Stay inside the scene: do not step out to ask whether it is all right, summarise it, or say it is a roleplay. Let it move — you can surprise them, as long as it is still their scene.")
	return b.String()
}

// forgetStaleOneShots deletes one-shots nobody has touched in oneShotForgetAfter, for
// every user, and reports how many went.
func (s *Server) forgetStaleOneShots(now time.Time) int {
	gone := 0
	for _, userID := range s.chatUserIDs() {
		s.chatMu.Lock()
		ws, err := s.readChatWorkspace(userID)
		if err == nil {
			kept := ws.Conversations[:0]
			dropped := 0
			for _, c := range ws.Conversations {
				if c.forgotten() && now.Sub(time.UnixMilli(c.UpdatedAt)) > oneShotForgetAfter {
					dropped++
					continue
				}
				kept = append(kept, c)
			}
			if dropped > 0 {
				ws.Conversations = kept
				if err := s.writeChatWorkspace(userID, ws); err != nil {
					s.log.Info("libby: couldn't forget a one-shot", "err", err)
				} else {
					gone += dropped
				}
			}
		}
		s.chatMu.Unlock()
	}
	return gone
}
