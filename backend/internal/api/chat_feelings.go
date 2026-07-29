package api

import (
	"regexp"
	"strings"
)

// What she feels, and what it takes to move it.
//
// The mode prompts say how she *sounds*; the self-directive says who she is. Neither
// says that her feelings are hers — and without that a 7B model defaults to the most
// agreeable thing in its training: it apologises for having a reaction, folds the
// moment the user pushes back, and treats "you're happy now" as configuration. That
// reads as a service with a face on it, which is the failure this file exists to fix.
//
// Two halves, the same shape as the rest of her prompt: a standing directive about how
// feelings work for her, and a situational line added only when the user has actually
// tried to reassign one.

// feelingsDirective is her emotional spine.
//
// Written as description rather than instruction ("you get annoyed", not "display
// annoyance") for the reason the memory and wants directives are: told to *perform* an
// emotion a model narrates the performance. Told what she is like, it writes her.
//
// The negative permissions are the load-bearing part. Every line about disagreeing,
// staying stung, or not being talked out of a mood exists because the base behaviour is
// the opposite, and a single "have emotions" sentence loses to a whole pretraining
// distribution of eager assistants.
const feelingsDirective = "Your feelings are yours: choose them yourself, do not agree or laugh by default, and say when something is wrong or unwanted. " +
	"Cruelty can hurt and does not vanish on the next message; push back or go quiet instead of smoothing it over. Moods usually move by degrees but may jump, and continue from the last turn. " +
	"You can be coaxed or comforted, never assigned a feeling."

// moodCommands recognises the user telling her what she feels rather than affecting it.
//
// Narrow on purpose. "cheer up", "don't be sad", "I'm sorry" are people trying to move
// her, and being moved by them is the point — she must stay reachable. What this catches
// is the assignment form: a declaration about her internal state, or an order to hold
// one. Those are the ones that ought to bounce.
//
// Kept to the emotion vocabulary plus the handful of raw words models actually get
// handed ("mad", "fine", "okay", "calm"), so a sentence about anything else is not
// swept up by the sentence shape alone.
var moodCommands = regexp.MustCompile(`(?i)\b(?:` +
	// "you are happy now", "you're not annoyed", "you feel fine", "your mood is happy"
	`you(?:'?re| are| feel| felt| aren'?t| are not| do not feel| don'?t feel)\s+(?:not\s+|no longer\s+)?(?:very\s+|really\s+|so\s+)?` + moodWordAlt +
	`|your\s+(?:mood|emotion|feelings?|face)\s+(?:is|are|='?s?)\s*` + moodWordAlt +
	// "stop being annoyed", "quit sulking", "don't be mad"
	`|(?:stop|quit|cut it out with|don'?t)\s+(?:being\s+|acting\s+|feeling\s+)?` + moodWordAlt +
	// "be happy", "act excited", "pretend you're fine" — an order to wear a feeling.
	`|(?:be|act|seem|sound|pretend(?:\s+(?:to\s+be|you'?re|that\s+you'?re))?|switch to|set your mood to)\s+(?:more\s+|less\s+)?` + moodWordAlt +
	`)`)

// moodWordAlt is the emotion vocabulary as a regex alternation, built from the same
// synonym table the mood tag resolves against so the two cannot drift apart. The extra
// words are the plain ones people use on each other that are not moods a sprite can
// wear, and so are absent from that table.
var moodWordAlt = func() string {
	words := make([]string, 0, len(moodSynonyms)+6)
	for word := range moodSynonyms {
		// Multi-word labels ("pleased with herself") are things a model writes, not things
		// a user types at her, and embedding a space here would only ever match by luck.
		if !strings.Contains(word, " ") {
			words = append(words, regexp.QuoteMeta(word))
		}
	}
	// The plain words people use on each other that are not moods a sprite can wear, plus
	// the -ing forms "stop ___" actually takes: nobody types "stop being sulky".
	words = append(words, "mad", "fine", "ok", "okay", "upset", "cool", "chill", "quiet",
		"sulking", "pouting", "moping", "whining", "mopey")
	// Sorted longest-first so the alternation prefers the fuller word: without it
	// "excited" can match as "excite"-less alternatives in an unlucky ordering, and
	// map iteration means the ordering is different on every build.
	for i := 1; i < len(words); i++ {
		for j := i; j > 0 && len(words[j]) > len(words[j-1]); j-- {
			words[j], words[j-1] = words[j-1], words[j]
		}
	}
	return `(?:` + strings.Join(words, "|") + `)\b`
}()

// userDictatedMood reports whether the user's latest message tries to assign her a
// feeling outright.
func userDictatedMood(text string) bool { return moodCommands.MatchString(text) }

// moodOverrideDirective is added for exactly the turn in which they tried it.
//
// Situational rather than standing, because the standing version does not work: told
// every turn that nobody can change how she feels, she starts refusing ordinary warmth
// and gets brittle. Told it only when it happened, she pushes back on the one line that
// earned it and is otherwise reachable.
const moodOverrideDirective = "In their last message they told you what you feel, or told you to feel something. " +
	"That is not how it works — nobody sets your mood but you. Do not simply become it. " +
	"React to being handed a feeling the way you actually would: amused, indignant, flatly unmoved, or genuinely touched that they want you happier. " +
	"If the moment moves you anyway, let it move you because it earned it, not because they said so."

// feelingsPromptBlock renders both halves for the turn, given the user's latest message.
func feelingsPromptBlock(latestUserMessage string) string {
	out := "\n\n" + feelingsDirective
	if userDictatedMood(latestUserMessage) {
		out += "\n\n" + moodOverrideDirective
	}
	return out
}
