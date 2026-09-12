package api

import (
	"regexp"
	"strings"
	"unicode"
)

// Reacting to a message.
//
// Half of what people send each other on a phone is not a message: it is a heart on
// one. She could not do that, and neither could the user — every response had to be
// words, which is why a one-line "goodnight" got a paragraph back. This is the
// reaction: an emoji stuck to a message, drawn on the bubble's corner, by either of
// them.
//
// Hers is a tag like the rest of the protocol: [react: ❤️] puts one on their latest
// message. A reply that is *only* a reaction is a legal turn, the same way a reply
// that is only a thought is — she read it, she felt something about it, and that was
// the whole answer. Theirs is a client gesture (long-press or hover on her bubble),
// stored on the message, and read back to her through the history so she knows the
// heart was put there: a model that is not told the user liked what she said learns
// nothing from it.

// chatReaction is one emoji on one message, and whose it is.
type chatReaction struct {
	Emoji string `json:"emoji"`
	// By is "user" or "assistant".
	By string `json:"by"`
}

// libbyReaction is what a reply carries when she reacted: the emoji and the message it
// goes on. The client draws it on that bubble rather than as a message of its own.
type libbyReaction struct {
	Emoji string `json:"emoji"`
	// To is the client id of the message reacted to, empty when the client sent no ids
	// (an older one), in which case it means the latest message of theirs.
	To string `json:"to,omitempty"`
}

// maxReactionsPerMessage bounds what a message may carry: one per side is the shape of
// the thing, and a few more tolerated so a client that lets the user change theirs does
// not have to be exact about replacing.
const maxReactionsPerMessage = 4

// reactionEmoji maps the words a model reaches for onto an emoji. A model is told to
// write an emoji, and most do; the words are for the ones that write "heart" instead.
var reactionEmoji = map[string]string{
	"heart": "❤️", "love": "❤️", "hearts": "❤️", "red heart": "❤️", "<3": "❤️",
	"laugh": "😂", "laughing": "😂", "lol": "😂", "haha": "😂", "funny": "😂", "joy": "😂",
	"fire": "🔥", "hot": "🔥", "lit": "🔥",
	"wow": "😮", "surprised": "😮", "shock": "😮", "shocked": "😮", "gasp": "😮",
	"sad": "😢", "cry": "😢", "crying": "😢", "tear": "😢", "tears": "😢",
	"thumbs up": "👍", "thumbsup": "👍", "like": "👍", "ok": "👍", "yes": "👍", "agree": "👍",
	"eyes": "👀", "looking": "👀", "look": "👀",
	"blush": "😳", "blushing": "😳", "flustered": "😳",
	"kiss": "😘", "kisses": "😘", "smooch": "😘",
	"smirk": "😏", "smug": "😏", "sly": "😏",
	"angry": "😠", "mad": "😠", "annoyed": "😠", "grr": "😠",
	"sleepy": "😴", "tired": "😴", "zzz": "😴",
	"skull": "💀", "dead": "💀", "dying": "💀",
	"pleading": "🥺", "puppy": "🥺", "please": "🥺", "cute": "🥺",
	"melt": "🫠", "melting": "🫠",
	"sparkle": "✨", "sparkles": "✨",
	"party": "🎉", "celebrate": "🎉", "yay": "🎉",
	"clap": "👏", "applause": "👏",
	"hug": "🫂", "hugs": "🫂",
	"drool": "🤤", "drooling": "🤤", "yum": "🤤",
	"peach": "🍑", "eggplant": "🍆", "tongue": "👅", "sweat": "💦", "wet": "💦",
	"thinking": "🤔", "hmm": "🤔",
	"nervous": "😅", "sweatsmile": "😅", "oops": "😅",
	"wink": "😉",
	"heart eyes": "😍", "hearteyes": "😍", "gorgeous": "😍",
	"broken heart": "💔", "heartbreak": "💔",
	"thumbs down": "👎", "no": "👎", "nope": "👎",
}

// reactDirective teaches the tag. Beside the others in the tail; brief, with the one
// thing a model gets wrong stated — that a reaction can be the whole reply.
const reactDirective = "You can put an emoji on their latest message with [react: <one emoji>] — a heart, a laugh, eyes, fire. " +
	"Sometimes that is the whole answer to a small message: react and say nothing, or react and add one short line. One at most, and not every time."

// reactTag captures the reaction wherever it landed. Loose like the remember tag and
// for the same reason: a one-emoji tag sits anywhere in a reply, and a model that is
// told to react instead of speak puts it on a line of its own with nothing around it.
var reactTag = regexp.MustCompile(`(?i)\[\s*(?:react|reacts|reacting|reaction)\s*[:=-]?\s*([^\]\n]{1,40}?)\s*\]`)

// findReactTag reads the reaction out of a reply, resolved to one emoji. The first one
// wins: a message has one reaction from her.
func findReactTag(reply string) (emoji string, ok bool) {
	match := reactTag.FindStringSubmatch(reply)
	if match == nil {
		return "", false
	}
	return resolveReactionEmoji(match[1])
}

// resolveReactionEmoji turns what she wrote into an emoji: a word from the table, or
// an emoji she wrote outright — the first non-ASCII symbol cluster in the text, so
// "❤️ heart" and "with a ❤️" both land on the heart. Anything that is neither is no
// reaction.
func resolveReactionEmoji(text string) (string, bool) {
	text = strings.TrimSpace(text)
	if text == "" {
		return "", false
	}
	if emoji, ok := reactionEmoji[strings.ToLower(strings.Trim(text, `"'* `))]; ok {
		return emoji, true
	}
	if emoji := firstEmoji(text); emoji != "" {
		return emoji, true
	}
	// A word we do not know, tried one word at a time: "a big heart" is a heart.
	for _, word := range strings.Fields(strings.ToLower(text)) {
		if emoji, ok := reactionEmoji[strings.Trim(word, `"'*.,!`)]; ok {
			return emoji, true
		}
	}
	return "", false
}

// firstEmoji is the first run of symbol runes in text — an emoji, with any variation
// selector, skin tone or joiner sequence it came with — or "" when there is none.
// Bounded so a wall of emoji is one reaction, not a string.
func firstEmoji(text string) string {
	var out []rune
	for _, r := range text {
		if isEmojiRune(r) {
			out = append(out, r)
			if len(out) >= 8 {
				break
			}
			continue
		}
		if len(out) > 0 {
			break
		}
	}
	// A lone modifier is not an emoji.
	for _, r := range out {
		if unicode.Is(unicode.So, r) || (r >= 0x1F000 && r <= 0x1FAFF) || (r >= 0x2600 && r <= 0x27BF) {
			return string(out)
		}
	}
	return ""
}

// isEmojiRune is a loose test for the runes an emoji sequence is built from: the
// symbol blocks, plus the modifiers and joiners that ride on them.
func isEmojiRune(r rune) bool {
	switch {
	case r >= 0x1F000 && r <= 0x1FAFF: // emoticons, symbols & pictographs, supplemental
		return true
	case r >= 0x2600 && r <= 0x27BF: // misc symbols, dingbats
		return true
	case r == 0x200D || r == 0xFE0F || r == 0xFE0E: // ZWJ, variation selectors
		return true
	case r >= 0x1F3FB && r <= 0x1F3FF: // skin tones
		return true
	case r >= 0x2190 && r <= 0x21FF, r >= 0x2300 && r <= 0x23FF, r >= 0x2B00 && r <= 0x2BFF:
		return true
	case unicode.Is(unicode.So, r):
		return true
	}
	return false
}

// validReaction is what a stored or requested reaction has to be: an emoji, short.
func validReaction(emoji string) bool {
	emoji = strings.TrimSpace(emoji)
	if emoji == "" || len(emoji) > 32 {
		return false
	}
	return firstEmoji(emoji) == emoji
}

// normalizeReactions cleans a message's reactions on the way into the workspace:
// valid emoji only, a known side, bounded.
func normalizeReactions(in []chatReaction) []chatReaction {
	if len(in) == 0 {
		return nil
	}
	out := make([]chatReaction, 0, len(in))
	for _, r := range in {
		r.Emoji = strings.TrimSpace(r.Emoji)
		if !validReaction(r.Emoji) {
			continue
		}
		if r.By != "assistant" {
			r.By = "user"
		}
		out = append(out, r)
		if len(out) >= maxReactionsPerMessage {
			break
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// reactionsNote is how a message's reactions read in the history: a parenthetical
// beneath it, in prose, so she knows a heart was put on what she said — or that she
// put one on what they said — without either being a tag for her to copy.
func reactionsNote(m chatMessage) string {
	if len(m.Reactions) == 0 {
		return ""
	}
	var theirs, hers []string
	for _, r := range m.Reactions {
		if !validReaction(r.Emoji) {
			continue
		}
		if r.By == "assistant" {
			hers = append(hers, r.Emoji)
		} else {
			theirs = append(theirs, r.Emoji)
		}
	}
	var parts []string
	if len(theirs) > 0 {
		parts = append(parts, "they reacted "+strings.Join(theirs, " ")+" to this")
	}
	if len(hers) > 0 {
		parts = append(parts, "you reacted "+strings.Join(hers, " ")+" to this")
	}
	if len(parts) == 0 {
		return ""
	}
	return "(" + strings.Join(parts, "; ") + ")"
}

// latestUserMessageID is the id of the last message of theirs, for a reaction to land
// on. Empty when the client sent no ids.
func latestUserMessageID(messages []chatMessage) string {
	for i := len(messages) - 1; i >= 0; i-- {
		if strings.EqualFold(strings.TrimSpace(messages[i].Role), "user") {
			return messages[i].ID
		}
	}
	return ""
}
