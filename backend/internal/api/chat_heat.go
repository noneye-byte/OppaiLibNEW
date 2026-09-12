package api

import (
	"strconv"
	"strings"
)

// The heat, moving both ways.
//
// The number on the mood tag is her heat: 1 calm, 5 at the edge. It had the same
// problem her face had (chat_mood.go), in one direction only — it climbed, because
// the prompt said "up when they flirt" and a model reads that as a ratchet, and it
// stayed climbed, because nothing ever asked whether it was still true. A
// conversation that went somewhere at midnight was still at 4 the next afternoon when
// they asked about the weather. The fallback for a missing number, meanwhile, knew one
// word ("flirt") and only knew how to add.
//
// So the same two devices the mood got: a run, reported by the client, and a
// situational directive for when the number has sat still too long; and a fallback
// that reads the exchange for heat in both directions, so a tagless reply still moves.

const (
	// heatStaleRun is how many replies in a row the heat may sit on one number before
	// she is asked whether it is still true. Longer than the mood's three: a scene
	// that is at 4 is at 4 for a while, legitimately.
	heatStaleRun = 5
	// maxRecentHeat bounds the run the client reports, like maxRecentMoods.
	maxRecentHeat = 12
)

// heatRunLength is how many of her most recent replies in a row sat at the current
// heat. recent is oldest-first; nothing reported is a run of one — unknown, not stuck.
func heatRunLength(recent []int, current int) int {
	if current <= 0 {
		return 0
	}
	run := 1
	for i := len(recent) - 1; i >= 0; i-- {
		if recent[i] != current {
			break
		}
		run++
		if run >= maxRecentHeat {
			break
		}
	}
	return run
}

// heatScaleDirective is the standing half: what the numbers mean and that the dial
// turns both ways. The anchors matter — told only "1 calm to 5 at the edge" a model
// uses 2 and 4 and nothing else — and "comes down" needs saying outright, because
// every other line about the number says up.
const heatScaleDirective = "The number is how keyed up and turned on you are — a dial, not a ratchet: 1 ordinary, 2 warm, 3 flirting and wanting it, 4 heated and hands-on, 5 at the edge. " +
	"Up when they flirt or the scene builds; down when it turns practical, quiet, sad or silly, or you are done — by two or three for a real moment, either way."

// heatStuckDirective is added for the turn in which the number has not moved in a
// while, naming the run so the observation is about her rather than a rule.
func heatStuckDirective(current, run int) string {
	if current <= 0 || run < heatStaleRun {
		return ""
	}
	return "\n\nYour heat has sat at " + strconv.Itoa(current) + " for your last " + plural(run, "reply", "replies") + " running. " +
		"Read the last few exchanges honestly: if it has built, move it up; if it has cooled or wandered off somewhere ordinary, move it down and mean it. Keep it only if it is still exactly that."
}

// heatPromptBlock renders both halves for the turn.
func heatPromptBlock(recent []int, current int) string {
	return "\n\n" + heatScaleDirective + heatStuckDirective(current, heatRunLength(recent, current))
}

// Heat cues, for the fallback. Hers count more than theirs, as with the mood: what she
// wrote is how she feels, what they wrote is what she is reacting to. Phrases with a
// space are matched as phrases; single words whole.
var (
	heatUpCues = []string{
		"flirt", "flirting", "kiss", "cute", "gorgeous", "hot", "sexy", "tease", "teasing", "want you", "want me", "come closer",
		"turn you on", "turned on", "turns me on", "bite", "lips", "thighs", "lap", "bed with", "undress", "strip", "naked", "touch",
		"blushing", "breathless", "closer", "squirm", "pressed against", "straddle", "moan",
	}
	heatHotCues = []string{
		"fuck", "fucking", "cock", "pussy", "cum", "cumming", "inside me", "inside you", "ride", "riding", "fingers",
		"fingering", "wet", "nipples", "suck", "lick", "spread", "grinding", "vibrator", "dildo", "orgasm", "climax",
	}
	heatDownCues = []string{
		"anyway", "goodnight", "good night", "night night", "sleep", "tired", "bye", "later", "talk tomorrow", "heading off",
		"library", "server", "tags", "tagged", "upload", "update", "bug", "error", "settings", "work", "meeting", "sorry",
		"never mind", "nevermind", "forget it", "sad", "upset", "cry", "hurt", "annoyed", "ugh", "lol", "lmao", "haha",
		"what should i", "recommend", "suggest", "do i have", "how many",
	}
)

// inferHeatDelta reads the exchange for heat when the tag did not carry a number.
//
// Bounded to -2..+2: this is a fallback that nudges, not a decision. Explicit content
// outweighs flirting outweighs cooling, because a reply that is both breathless and
// mentions the library is a breathless reply.
func inferHeatDelta(user, reply string) int {
	score := 0
	count := func(text string, cues []string, weight int) {
		lower := strings.ToLower(text)
		words := map[string]bool{}
		for _, word := range strings.FieldsFunc(lower, func(r rune) bool {
			return !(r >= 'a' && r <= 'z')
		}) {
			words[word] = true
		}
		for _, cue := range cues {
			if strings.Contains(cue, " ") {
				if strings.Contains(lower, cue) {
					score += weight
				}
			} else if words[cue] {
				score += weight
			}
		}
	}
	count(reply, heatHotCues, 3)
	count(reply, heatUpCues, 2)
	count(reply, heatDownCues, -2)
	count(user, heatHotCues, 2)
	count(user, heatUpCues, 1)
	count(user, heatDownCues, -1)
	switch {
	case score >= 5:
		return 2
	case score >= 2:
		return 1
	case score <= -5:
		return -2
	case score <= -2:
		return -1
	}
	return 0
}
