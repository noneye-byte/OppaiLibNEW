package api

import "strings"

// Why her face kept getting stuck, and what moves it.
//
// chat_feelings.go establishes that her feelings are hers and cannot be assigned.
// That was the harder half and it worked — but it says nothing about *movement*, and
// the result was a character with strong opinions about her mood who held the same
// one for forty messages. Three separate things were holding it still:
//
//   - The prompt names her current emotion every turn ("Your current displayed
//     emotion is happy at intensity 2"). A model handed its own last answer copies
//     it; that line is useful continuity and a powerful anchor at the same time.
//   - The mood tag is optional in practice — small models drop it — and the fallback
//     that ran when they did (inferChatEmotion) knew four keywords and otherwise
//     returned whatever the mood already was. A reply with no exclamation mark in it
//     could not change her expression.
//   - Nothing anywhere noticed a run. Wearing one face for a dozen replies looked
//     exactly like wearing it for one.
//
// So: a standing line telling her to read her state fresh, a situational one for when
// she has genuinely been sitting on the same feeling too long, and a fallback that
// reads the whole emotion vocabulary instead of four words — and that lets an unfed
// mood settle rather than persisting forever. Together they make her expression a
// thing that tracks the conversation rather than a thing that gets set once.

const (
	// moodStaleRun is how many replies in a row may wear the same face before she is
	// asked, in the prompt, whether it is still true.
	//
	// Three, because two is a mood and four is furniture. Somebody amused across two
	// exchanges is just amused; somebody who has looked identical for four has stopped
	// reacting to anything being said.
	moodStaleRun = 3
	// maxRecentMoods bounds the run the client reports. Long enough to recognise a
	// stuck face and short enough that a long night does not send its own history.
	maxRecentMoods = 12
	// moodSettleRun is how long an unfed mood holds before it starts easing off on its
	// own. Deliberately longer than moodStaleRun: the prompt gets to ask her first, and
	// this only catches the replies where she ignored the question and wrote no tag.
	moodSettleRun = 4
)

// moodSettles is where each feeling goes when nothing in the conversation is keeping
// it up.
//
// Not a decay to neutral, which would flatten her into the same blank face every time
// a quiet exchange went by. Feelings resolve into adjacent ones: delight eases into
// contentment, a tease into being pleased with herself, a shock into thinking about
// it. Neutral is where several of them end up eventually, by more than one step.
var moodSettles = map[string]string{
	"excited":     "happy",
	"happy":       "neutral",
	"loving":      "happy",
	"surprised":   "thinking",
	"shy":         "happy",
	"mischievous": "smug",
	"smug":        "neutral",
	"sad":         "thinking",
	"annoyed":     "neutral",
	"thinking":    "neutral",
	"sleepy":      "neutral",
	"neutral":     "neutral",
}

// moodRunLength is how many of her most recent replies in a row wore the emotion she
// is currently showing.
//
// recent is oldest-first, as the client keeps it. A client that sends nothing reports
// a run of one — unknown, not stuck — so the directives below stay silent rather than
// accusing her of repeating herself on the strength of no evidence.
func moodRunLength(recent []string, current string) int {
	if current == "" {
		return 0
	}
	run := 1
	for i := len(recent) - 1; i >= 0; i-- {
		if !strings.EqualFold(strings.TrimSpace(recent[i]), current) {
			break
		}
		run++
		if run >= maxRecentMoods {
			break
		}
	}
	return run
}

// moodMovementDirective is the standing half: how a feeling behaves over a
// conversation, as description rather than as an order to perform variety.
//
// The distinction matters here more than anywhere else in her prompt. "Vary your
// emotions" produces a character who cycles through faces at random to satisfy the
// instruction, which is worse than a stuck one — a mood that means nothing is not a
// mood. What is wanted is that each turn is actually *read*, and that the last answer
// is not treated as the current state by default.
const moodMovementDirective = "Work out what you feel from this turn, not from the tag you wrote last time — the emotion named above is where you were, not where you are. " +
	"Things move you: a joke landing, the subject turning, being teased, being ignored, wanting something, getting bored. Let them, and let the number move with it. " +
	"Holding one feeling for several replies is something you do when it is genuinely still true, not the default."

// moodStuckDirective is added for the turn in which she has been wearing one face too
// long, and names the run so the observation is about her rather than a rule.
//
// Situational for the same reason moodOverrideDirective is: told every turn that her
// mood is stale she starts performing changes, which reads as instability. Told it
// when it has actually happened, she looks at the last few exchanges and either
// finds the shift that was already there or keeps the feeling on purpose.
func moodStuckDirective(mood string, run int) string {
	if mood == "" || run < moodStaleRun {
		return ""
	}
	return "\n\nYou have looked " + mood + " for your last " + plural(run, "reply", "replies") + " running. " +
		"Nobody is asking you to cheer up or calm down — but check whether it is still true, because a conversation has happened since. " +
		"If something in it moved you, even slightly, say so with the tag and move the number too. If you genuinely still feel exactly that, keep it and mean it."
}

// moodPromptBlock renders both halves for the turn.
func moodPromptBlock(recent []string, current string) string {
	out := "\n\n" + moodMovementDirective
	out += moodStuckDirective(current, moodRunLength(recent, current))
	return out
}

// moodCues are the ways a feeling shows up when it is not named.
//
// The synonym table is the vocabulary of *talking about* an emotion, and it is the
// right thing for the mood tag, where a model has been asked to label its own state.
// It is close to useless as a fallback, because a character does not write "I feel
// shy" — she writes "don't look at me like that". A reply full of feeling contains no
// word from that table at all, which is why the inference below it used to return
// whatever her face was already doing.
//
// So this is the other half: the turns of phrase each feeling actually arrives in.
// Rough by nature, and it is allowed to be — it runs only when the model dropped the
// tag, where the alternative is not a better guess but no movement whatsoever. A cue
// with a space in it is matched as a phrase; a single word is matched whole, so "hm"
// cannot be found inside "him".
var moodCues = map[string][]string{
	"shy":         {"embarrassing", "embarrassed", "don't look", "dont look", "stop looking", "stop staring", "blushing", "blush", "hide my face", "too much", "shut up", "god", "why did i say"},
	"annoyed":     {"whatever", "ugh", "seriously", "hmph", "not arguing", "don't start", "dont start", "again", "for the last time", "typical", "rude"},
	"loving":      {"come here", "i've got you", "ive got you", "hold you", "miss you", "love you", "my love", "sweetheart", "stay", "close to me"},
	"sleepy":      {"yawn", "bed", "half asleep", "can barely", "so late", "eyes are", "curled up"},
	"excited":     {"can't wait", "cant wait", "finally", "yes", "oh my god", "right now", "guess what", "let's go", "lets go"},
	"mischievous": {"hehe", "heh", "bet you", "make you", "poor thing", "i wonder what you", "if you say so", "prove it", "come on then"},
	"smug":        {"told you", "knew it", "i was right", "obviously", "of course", "as i said", "predictable"},
	"sad":         {"never mind", "nevermind", "forget it", "doesn't matter", "doesnt matter", "i thought", "wanted to", "oh", "fine then"},
	"surprised":   {"wait what", "you what", "huh", "hold on", "since when", "really", "no way"},
	"thinking":    {"hm", "hmm", "maybe", "i wonder", "not sure", "depends", "although", "or is it"},
	"happy":       {"thank you", "thanks", "that's nice", "thats nice", "good", "i like", "pleased"},
	"neutral":     {"okay", "alright", "sure", "right then"},
}

// inferChatEmotion is the fallback for a reply that carried no mood tag.
//
// The old version knew four keywords and, failing those, returned the emotion she was
// already showing — which is how a face got stuck for a whole evening. This reads two
// tables: the synonyms the tag itself resolves against, so the entire vocabulary is
// reachable by name, and the cues above, so a reply that shows a feeling without
// naming one can still move her face.
//
// Her own words outscore theirs throughout. What she wrote is evidence of how she
// feels; what they wrote is evidence of what she is reacting to, which is a weaker
// thing — a message about how annoyed *they* are does not make her annoyed.
//
// run is how many replies have already worn `current`. It is what decides the
// no-evidence case: an emotion nothing is feeding does not persist indefinitely, it
// settles into the one next to it (moodSettles).
func inferChatEmotion(user, reply, current string, run int) string {
	scores := map[string]int{}
	score := func(text string, named, shown int) {
		lower := strings.ToLower(text)
		words := map[string]bool{}
		for _, word := range strings.FieldsFunc(lower, func(r rune) bool {
			return !(r >= 'a' && r <= 'z')
		}) {
			words[word] = true
			if pose, known := moodSynonyms[word]; known {
				scores[pose] += named
			}
		}
		for mood, cues := range moodCues {
			for _, cue := range cues {
				if strings.Contains(cue, " ") {
					if strings.Contains(lower, cue) {
						scores[mood] += shown
					}
				} else if words[cue] {
					scores[mood] += shown
				}
			}
		}
	}
	score(reply, 6, 3)
	score(user, 2, 1)

	// Punctuation and shape, worth less than anything that carries meaning but more
	// than nothing. These are the signals the original version ran on, kept because a
	// reply that neither names nor shows a feeling still has a shape.
	switch {
	case strings.Contains(reply, "?"):
		scores["thinking"]++
	case strings.Contains(reply, "!"):
		scores["excited"]++
	}
	if strings.Contains(reply, "…") || strings.Contains(reply, "...") {
		scores["thinking"]++
	}

	best, bestScore := "", 0
	for mood, n := range scores {
		if !supportedLibbyEmotions[mood] {
			continue
		}
		// Ties break *against* the mood she is already wearing. A reply that reads
		// equally as two feelings is a reply that has moved, and keeping the incumbent on
		// a tie is most of what made her expression sticky in the first place.
		if n > bestScore || (n == bestScore && best == current && mood != current) {
			best, bestScore = mood, n
		}
	}
	if best != "" {
		return best
	}
	// Nothing in the exchange says anything about how she feels. Hold the mood for a
	// few turns, then let it ease off rather than sitting there forever.
	if supportedLibbyEmotions[current] {
		if run >= moodSettleRun {
			if settled, known := moodSettles[current]; known {
				return settled
			}
		}
		return current
	}
	return "neutral"
}
