package api

import (
	"regexp"
	"strings"
)

// Catching what she makes up.
//
// A local model has no browser and is given no addresses, and it will still write
// "check out https://…" with an address that does not exist, because that is the shape
// a helpful sentence takes. It will also describe a picture it is not sending, and
// offer to import a URL nobody gave it. None of that can be trained out of a 7B; it
// can only be caught on the way past.
//
// This file is the URL half. The picture half is chat_photo_pick.go, which chooses
// the picture before she describes it; the import half is in the action parser, which
// now refuses an address the user never wrote.
//
// The rule is simple and strict: a web address is real only if it appeared in the
// conversation — in one of the user's own messages, or as the link they shared this
// turn. Anything else she writes is replaced with a plain marker, so the user sees
// that she reached for a link and that the app caught it, rather than tapping on
// nothing or, worse, on something.

// writtenURL finds addresses in her prose: an explicit scheme, or a bare "www." host.
// The same shape findURLInText accepts from the user, so both sides agree on what an
// address is. Trailing punctuation is stripped afterwards rather than excluded here,
// because a URL may legitimately end in a bracket or a dot inside the path.
var writtenURL = regexp.MustCompile(`(?i)\b(?:https?://|www\.)[^\s<>"'` + "`" + `]{1,1000}`)

// inventedURLMarker is what replaces an address she made up. Visible and honest: it is
// better that she is seen to have reached for a link than that a fake one is shown.
const inventedURLMarker = "[made-up link removed]"

// knownURLs collects every address the conversation actually contains: the user's own
// messages, and the link shared with this turn. These are the only addresses she may
// repeat.
func knownURLs(in chatRequest) map[string]bool {
	known := map[string]bool{}
	note := func(text string) {
		for _, match := range writtenURL.FindAllString(text, -1) {
			known[urlKey(match)] = true
		}
	}
	for _, m := range in.Messages {
		if strings.EqualFold(strings.TrimSpace(m.Role), "user") {
			note(m.Content)
		}
	}
	note(in.Link)
	return known
}

// urlKey normalises an address for comparison: case-folded, trailing punctuation and
// slash removed, so "Example.com/page." matches "example.com/page".
func urlKey(raw string) string {
	raw = strings.TrimRight(strings.TrimSpace(raw), ".,;:!?)]}'\"")
	raw = strings.TrimSuffix(raw, "/")
	return strings.ToLower(raw)
}

// scrubInventedURLs replaces every address in the reply that the conversation never
// contained. The trailing punctuation an address was written with is kept, so the
// sentence still ends the way she ended it.
func scrubInventedURLs(reply string, known map[string]bool) string {
	if !writtenURL.MatchString(reply) {
		return reply
	}
	return writtenURL.ReplaceAllStringFunc(reply, func(match string) string {
		if known[urlKey(match)] {
			return match
		}
		trimmed := strings.TrimRight(match, ".,;:!?)]}'\"")
		return inventedURLMarker + match[len(trimmed):]
	})
}

// namePlaceholder is the person written as a slot rather than a name: [Name], [name],
// [user], [your name], {{user}}, <USER>. Cards are authored that way, and a small model
// that has read a card answers that way.
var namePlaceholder = regexp.MustCompile(`(?i)\[\s*(?:name|user|user\s*name|username|your\s+name|their\s+name|player)\s*\]|\{\{\s*user\s*\}\}|<USER>`)

// fillNamePlaceholders writes the user's name where she left a slot for it. With no
// name to write the slot is removed; a doubled space is tidied, and the sentence reads
// as if she trailed off rather than as protocol.
func fillNamePlaceholders(reply, name string) string {
	if !namePlaceholder.MatchString(reply) {
		return reply
	}
	name = strings.TrimSpace(name)
	out := namePlaceholder.ReplaceAllLiteralString(reply, name)
	if name == "" {
		out = spaceRun.ReplaceAllString(out, " ")
		out = danglingSpace.ReplaceAllString(out, "$1")
	}
	return out
}

