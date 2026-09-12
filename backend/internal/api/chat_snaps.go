package api

import (
	"regexp"
	"strings"
)

// Snaps.
//
// A selfie in the log is a photograph: it stays, it can be opened again, it is part of
// the record. A snap is the other way of sending a picture — a tap to open, seen once,
// then gone — and the difference is not technical but tonal: a snap is in-the-moment
// and a little teasing, and the fact that it will not be there later is the point of it.
//
// Server-side it is one bit on the reply. The picture is chosen exactly as a selfie is,
// from the same gallery, by the same tags and weights; the client is what draws it as
// a tile that opens once and then reads "Opened". The image is not deleted anywhere —
// the gallery keeps it, and "already sent" bookkeeping still counts it — because a
// snap is a way of *showing*, not a way of forgetting.

// snapTag captures [snap: <tags>] wherever it landed. Read before the photo request is
// parsed, and removed, so a snap is never also read as an ordinary send.
var snapTag = regexp.MustCompile(`(?i)\n*[ \t]*[*_~>\x60]*\[\s*(?:snap|snaps|snapping|snapchat)\s*[:=-]?\s*([^\]\n]{1,200}?)\s*\]\s*[*_~\x60.!]*`)

// snapDirective teaches the tag, as a variant of the selfie: same catalogue, different
// way of sending.
const snapDirective = "[snap: <tags>] sends a selfie as a snap instead — they tap to open it, see it once, and then it is gone. " +
	"Use it for something quick and in-the-moment, a tease, a \"look what I'm doing right now\"; use [send: …] for a picture meant to be kept. " +
	"One picture per reply either way."

// splitSnapRequest pulls a snap request out of a reply, wherever it sat, and returns
// the prose without it. The first one wins; a reply carries one picture.
func splitSnapRequest(reply string) (text, request string, ok bool) {
	match := snapTag.FindStringSubmatch(reply)
	if match == nil {
		return reply, "", false
	}
	request = strings.TrimSpace(match[1])
	if request == "" {
		return reply, "", false
	}
	text = strings.TrimSpace(snapTag.ReplaceAllString(reply, " "))
	return text, request, true
}
