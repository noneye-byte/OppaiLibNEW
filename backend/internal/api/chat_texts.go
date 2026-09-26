package api

import (
	"math/rand/v2"
	"regexp"
	"strings"
)

// How many texts one reply arrives as.
//
// She was told to text "short messages, often two or three in a row separated by blank
// lines", and a model hears "several" in that and writes five. Five was also what the
// clients would draw, so every answer landed as a wall of four or five bubbles — where a
// person sends one, sometimes two, now and then three.
//
// The long bursts were worse than long. Past the second or third text a small model
// stops writing her next message and starts writing the conversation: a paragraph in
// the user's voice with no name in front of it (so no stop string catches it), then her
// answer to it. Read on a phone that is her replying to things nobody sent, and on the
// next turn it is in the history as her own words, which is how she came to answer
// herself.
//
// So each turn is given a number, drawn the way people actually vary, and told it
// plainly — "one text this time" is an instruction a model follows where "match their
// energy" is not — and whatever comes back past the number is cut rather than folded
// in, because the texts past it are the likeliest to be the invented half of an
// exchange. The clients cap at the same three.

// maxTextsPerReply is the most texts one reply may be. The clients draw the same cap.
const maxTextsPerReply = 3

// textSeam is where one text ends and the next begins: a blank line, as the clients
// split them.
var textSeam = regexp.MustCompile(`\n[ \t]*\n\s*`)

// textsForTurn draws how many texts this reply should be. roll is a uniform number in
// [0, 1), injected so the shape can be tested without the dice.
//
// A beat is one text whatever the dice say: a reaction to a picture, a private thought,
// an answer about the library. Speaking first is one or two — a person opening a
// conversation does not send three. Feeling and a scene get a little more room than
// small talk, and a short message pulls the answer short, because one line gets one line.
func textsForTurn(task chatTask, latestUser string, roll float64) int {
	switch task {
	case taskReaction, taskObservation, taskPlanning, taskFactual:
		return 1
	case taskAutonomous, taskAfterglow:
		if roll < 0.7 {
			return 1
		}
		return 2
	}
	one, two := 0.55, 0.88 // casual: 55% one, 33% two, 12% three
	if task == taskEmotional || task == taskCreative {
		one, two = 0.35, 0.75
	}
	n := 3
	switch {
	case roll < one:
		n = 1
	case roll < two:
		n = 2
	}
	if n > 2 && len(strings.Fields(latestUser)) <= 6 {
		n = 2
	}
	return n
}

// rollTexts is the die the chat path uses.
func rollTexts() float64 { return rand.Float64() }

// textCountDirective tells her how many texts to send this time, and whose they are.
//
// The second sentence is the part that stops the invented exchange. "Never write the
// user's lines" is already in her card, but it is read as "never write 'User:'", and
// the paragraph she writes in their voice has no label. Said as what a burst of texts
// *is* — hers, sent before they answer — the thing to avoid is the shape, not a word.
func textCountDirective(n int) string {
	var count string
	switch {
	case n <= 1:
		count = "Send this reply as one text — no blank lines inside it."
	case n == 2:
		count = "Send this reply as two short texts, separated by one blank line."
	default:
		count = "Send this reply as up to three short texts, separated by blank lines."
	}
	return count + " Every text in it is yours, sent one after another before they answer: never write their side, never reply to your own texts, " +
		"and answer what they said last rather than something from much earlier."
}

// capTexts keeps the first max texts of a reply and drops the rest. Nothing is dropped
// from a reply within the cap, and a reply with no seams is returned as it was.
//
// The allowance is one more than she was asked for (and never past maxTextsPerReply):
// a model asked for one text that writes two has only overrun, whereas one that writes
// five has written a conversation.
func capTexts(reply string, asked int) string {
	limit := asked + 1
	if limit > maxTextsPerReply {
		limit = maxTextsPerReply
	}
	if limit < 1 {
		limit = 1
	}
	parts := textSeam.Split(strings.TrimSpace(reply), -1)
	kept := make([]string, 0, limit)
	for _, part := range parts {
		if part = strings.TrimSpace(part); part == "" {
			continue
		}
		if len(kept) == limit {
			break
		}
		kept = append(kept, part)
	}
	if len(kept) == 0 {
		return reply
	}
	return strings.Join(kept, "\n\n")
}
