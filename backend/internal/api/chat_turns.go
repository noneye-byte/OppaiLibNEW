package api

import "strings"

// A burst of texts is one turn.
//
// The clients used to lock the composer while she was replying, so the history always
// alternated: one of theirs, one of hers. Now they send the way people do — three texts
// while she is still reading the first — and the log has runs of user messages in it.
// The model must not see those as three turns. Chat templates alternate roles, and a
// local backend given user/user/assistant either concatenates them without a separator
// or, worse, answers only the last one; and everything downstream that reads "the
// latest message" (turn signals, the photo request, the attachment rescue) should read
// the whole burst, because "wait" / "actually the beach one" / "and send a pic" is one
// request in three bubbles.

// trailingUserText is everything they said since she last spoke, joined as one message.
// A single trailing message is returned as it is.
func trailingUserText(messages []chatMessage) string {
	if len(messages) == 0 {
		return ""
	}
	start := len(messages)
	for start > 0 && strings.EqualFold(strings.TrimSpace(messages[start-1].Role), "user") {
		start--
	}
	if start == len(messages) {
		// The latest message is hers (a continuation turn). Whatever it is, it is the
		// latest thing said; callers that read it for signals get the same they always did.
		return messages[len(messages)-1].Content
	}
	if start == len(messages)-1 {
		return messages[start].Content
	}
	parts := make([]string, 0, len(messages)-start)
	for _, m := range messages[start:] {
		if text := strings.TrimSpace(m.Content); text != "" {
			parts = append(parts, text)
		}
	}
	return strings.Join(parts, "\n")
}

// mergeTurns folds consecutive messages from one side into a single message, joined
// by a blank line, so the model is handed alternating turns. Content is already the
// rendered history text (quote, carried items, reactions), so nothing is lost — the
// texts are simply on one turn, in the order they were sent, which is also how the
// texts look on a phone.
func mergeTurns(history []chatMessage) []chatMessage {
	if len(history) < 2 {
		return history
	}
	out := make([]chatMessage, 0, len(history))
	for _, m := range history {
		if n := len(out); n > 0 && out[n-1].Role == m.Role {
			out[n-1].Content += "\n\n" + m.Content
			continue
		}
		out = append(out, m)
	}
	return out
}
