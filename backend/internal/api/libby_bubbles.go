package api

import (
	"regexp"
	"strings"
)

// How one reply becomes the texts it arrives as.
//
// This was the web client's job (splitIntoBubbles in chat-text.ts), done as each reply
// landed, which meant the phone split the same reply differently and the stored log
// was whatever the client that happened to be open decided. Turns are written into the
// conversation by the server now, so the split is made here, once, by the same rules:
// a blank line is a deliberate break whatever the length; a long reply with none is
// grouped into sentences of about a text's length; never more than three.

const (
	maxBubbles   = 3
	splitFloor   = 360
	bubbleTarget = 240
)

var (
	paragraphSeam = regexp.MustCompile(`\n[ \t]*\n\s*`)
	sentenceRun   = regexp.MustCompile(`[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$`)
)

// splitIntoBubbles breaks one reply into its texts.
func splitIntoBubbles(text string) []string {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil
	}
	var parts []string
	for _, p := range paragraphSeam.Split(trimmed, -1) {
		if p = strings.TrimSpace(p); p != "" {
			parts = append(parts, p)
		}
	}
	if len(parts) < 2 {
		if len(trimmed) < splitFloor {
			return []string{trimmed}
		}
		var sentences []string
		for _, s := range sentenceRun.FindAllString(trimmed, -1) {
			if s = strings.TrimSpace(s); s != "" {
				sentences = append(sentences, s)
			}
		}
		if len(sentences) < 2 {
			return []string{trimmed}
		}
		parts = nil
		current := ""
		for _, s := range sentences {
			if current != "" && len(current)+len(s) > bubbleTarget && len(parts) < maxBubbles-1 {
				parts = append(parts, strings.TrimSpace(current))
				current = s
			} else if current == "" {
				current = s
			} else {
				current += " " + s
			}
		}
		if strings.TrimSpace(current) != "" {
			parts = append(parts, strings.TrimSpace(current))
		}
	}
	if len(parts) <= maxBubbles {
		return parts
	}
	return append(parts[:maxBubbles-1:maxBubbles-1], strings.Join(parts[maxBubbles-1:], "\n\n"))
}

// stageDirection is the placeholder a message carries when it is a picture, a clip or a
// card with nothing said — the store refuses an empty message, and an older client that
// shows the text shows something that reads as an action rather than as a blank.
func stageDirection(what string) string { return "*" + what + "*" }
