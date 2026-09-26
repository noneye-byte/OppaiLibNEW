package api

import (
	"regexp"
	"strings"
)

// Answering a particular message, rather than the last one.
//
// A chat has threads in it that a transcript does not show. They asked two things and
// she answered one; she said something three messages ago that they only now want to
// pick up; she wants to go back to the thing they mentioned before the subject moved.
// Every messaging app has the same answer — a quoted reply, the earlier line sitting
// above the new one — and both sides of this conversation can now do it.
//
// Theirs is plain: the client marks the message with what it replies to, and the
// server tells her so. Hers is a tag, [reply: <a few words of the earlier message>],
// resolved here against the history the client sent. She quotes words rather than a
// number because the history carries no numbers she can see, and because a model
// asked to count messages counts wrong; a model asked to quote quotes fine.
//
// Nothing here trusts the model with an id. It writes words; the resolver finds the
// message those words came from, or finds nothing and the reply stands on its own.

// chatReplyRef is what a reply points at: enough to draw the quote without looking
// the message up, and the id so a tap can jump to it.
type chatReplyRef struct {
	ID string `json:"id,omitempty"`
	// Role is who wrote the quoted message — "user" or "assistant".
	Role string `json:"role"`
	// Excerpt is the quoted line, cut short for the bubble.
	Excerpt string `json:"excerpt"`
}

// maxReplyExcerpt bounds a quote. Long enough to recognise the message, short enough
// that a quoted essay does not push the actual reply off the screen.
const maxReplyExcerpt = 140

// replyTag captures her replying to an earlier message. Loose, like the attach tag: it
// lands wherever the sentence put it. Read before scrubbing; deleted by strayTag.
var replyTag = regexp.MustCompile(`(?i)\[\s*(?:replying|reply|quoting|quote|answering|re)\b(?:\s+to\b\s*[:=]?|\s*[:=])\s*([^\]\n]{1,160}?)\s*\]`)

// replyDirective teaches the tag. Kept to one sentence with the reason inside it,
// because the failure mode of a bare syntax rule is a model that quotes every message
// it answers.
const replyDirective = "To answer one of their recent messages instead of the latest — a question of theirs you skipped a moment ago — write [reply: <a few exact words from it>]; it shows as a quoted reply. Rare, only ever their words, never your own, and only when it is genuinely about that message."

// replyWindow is how far back a quoted reply may reach, in messages. A person quotes
// the question from a minute ago, not the one from an hour ago; left unbounded, word
// overlap found *something* far up the log that shared three words with her quote,
// and she was drawn answering a message the conversation had long since left.
const replyWindow = 12

// minVerbatimQuote is the shortest quote trusted as a verbatim match. "lol" and "ok"
// are in half the messages of an evening, and the newest one of them is not the one
// she meant.
const minVerbatimQuote = 8

// findReplyTag reads the earlier message she is replying to, as she quoted it. The
// first one wins: a second is the model repeating itself, and a message replies to
// one thing.
func findReplyTag(reply string) (quote string, ok bool) {
	match := replyTag.FindStringSubmatch(reply)
	if match == nil {
		return "", false
	}
	quote = strings.Trim(strings.TrimSpace(match[1]), `"'“”‘’`)
	return quote, quote != ""
}

// excerptOf cuts a message down to what a quote bubble shows: the first line that
// says anything, trimmed, and cut at a word.
func excerptOf(content string) string {
	text := strings.TrimSpace(content)
	if i := strings.IndexByte(text, '\n'); i >= 0 {
		first := strings.TrimSpace(text[:i])
		if first != "" {
			text = first
		}
	}
	if len(text) <= maxReplyExcerpt {
		return text
	}
	cut := text[:maxReplyExcerpt]
	if i := strings.LastIndexByte(cut, ' '); i > maxReplyExcerpt/2 {
		cut = cut[:i]
	}
	return strings.TrimSpace(cut) + "…"
}

// resolveReplyTarget finds which earlier message her quote came from.
//
// The latest message is never the target: replying to it is what every reply already
// does, so a tag that quotes it meant nothing — and it resolves to nothing, rather than
// on to an older message that happens to share the words. That fall-through was the
// commonest way she was drawn answering something from far up the log.
//
// Only their messages can be quoted, and only recent ones (replyWindow). Quoting her
// own earlier text is a thing people do, rarely; a model does it constantly, because
// its own words are the ones it remembers best, and on a phone it reads as her
// answering herself. Only messages that carry an id can be pointed at — an older client
// sends none and gets none back.
//
// Substring first, because a model shown the history usually quotes it verbatim. Then
// word overlap, most-recent-wins on a tie, with a floor so "the thing" does not land on
// whichever message happened to contain both words.
func resolveReplyTarget(quote string, messages []chatMessage) *chatReplyRef {
	quote = strings.TrimSpace(quote)
	if quote == "" || len(messages) < 2 {
		return nil
	}
	lowerQuote := strings.ToLower(quote)
	words := requestWords(quote)
	latest := messages[len(messages)-1]
	if strings.Contains(strings.ToLower(latest.Content), lowerQuote) || overlap(words, latest.Content) >= 0.6 {
		return nil
	}
	start := len(messages) - 1 - replyWindow
	if start < 0 {
		start = 0
	}
	candidates := messages[start : len(messages)-1]
	quotable := func(m chatMessage) bool {
		return m.ID != "" && m.Content != "" && strings.EqualFold(strings.TrimSpace(m.Role), "user")
	}
	// Verbatim, newest first.
	if len(quote) >= minVerbatimQuote {
		for i := len(candidates) - 1; i >= 0; i-- {
			m := candidates[i]
			if !quotable(m) {
				continue
			}
			if strings.Contains(strings.ToLower(m.Content), lowerQuote) {
				return &chatReplyRef{ID: m.ID, Role: m.Role, Excerpt: excerptOf(m.Content)}
			}
		}
	}
	if len(words) < 2 {
		return nil
	}
	var best *chatReplyRef
	bestScore := 0.0
	for i := len(candidates) - 1; i >= 0; i-- {
		m := candidates[i]
		if !quotable(m) {
			continue
		}
		score := overlap(words, m.Content)
		// Strictly greater, so an older message needs to fit better than a newer one
		// to take it — recency is the tiebreak.
		if score >= 0.6 && score > bestScore {
			bestScore = score
			best = &chatReplyRef{ID: m.ID, Role: m.Role, Excerpt: excerptOf(m.Content)}
		}
	}
	return best
}

// overlap is the share of the quote's words that the message contains. Zero for a
// quote of fewer than two words, which is too little to recognise a message by.
func overlap(words map[string]bool, content string) float64 {
	if len(words) < 2 {
		return 0
	}
	have := requestWords(content)
	hits := 0
	for word := range words {
		if have[word] {
			hits++
		}
	}
	return float64(hits) / float64(len(words))
}

// quotedHistoryContent is how a replied-to message reads in the history the model is
// given: the quote above the text, the way a chat app draws it and the way a model has
// seen ten million times. Plain, not a tag — nothing here is protocol for her to copy.
func quotedHistoryContent(m chatMessage) string {
	if m.ReplyTo == nil || strings.TrimSpace(m.ReplyTo.Excerpt) == "" {
		return m.Content
	}
	return "> " + excerptOf(m.ReplyTo.Excerpt) + "\n" + m.Content
}
