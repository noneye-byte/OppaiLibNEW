package api

import (
	"strings"
)

// What a memory *is*, how much it is worth, and how sure she is of it.
//
// The store used to be a flat list of sentences, oldest-first, evicted from the front. That
// made every fact equal: "they hate feet stuff" — a boundary that should outlive everything —
// fell out of the store because sixty newer notes about what they watched had arrived since.
// It also meant the prompt read as one undifferentiated bullet list, which a small model
// recites rather than knows.
//
// Kinds are the brief's own list. They are inferred here rather than asked of the model: a
// 7B told to emit `[remember: kind=boundary | …]` gets the syntax wrong most of the time and
// the whole note is then lost, whereas classifying her plain sentence server-side cannot
// fail — at worst it lands in the general bucket, which is where an unclassifiable fact
// belongs anyway.

// memoryKind is the category a fact falls into.
type memoryKind string

const (
	// memoryAboutUser is a fact about the person she is talking to. The commonest kind.
	memoryAboutUser memoryKind = "user"
	// memoryAboutLibby is a fact about herself she has decided on and should stay consistent
	// with — an opinion, a habit, something she has claimed.
	memoryAboutLibby memoryKind = "libby"
	// memoryPreference is a like or a dislike, either of theirs or hers.
	memoryPreference memoryKind = "preference"
	// memoryBoundary is a limit: something not to do, not to bring up, not to push on.
	// Ranked above everything else and never evicted, because forgetting one is the single
	// worst thing this store can do.
	memoryBoundary memoryKind = "boundary"
	// memoryShared is something the two of them did together.
	memoryShared memoryKind = "shared"
	// memoryEmotional is how something felt — a fight, being comforted, being wanted.
	memoryEmotional memoryKind = "emotional"
	// memoryRelationship is a change in what they are to each other.
	memoryRelationship memoryKind = "relationship"
)

// memoryKinds is the vocabulary, in the order the prompt groups them: what she must not get
// wrong first, then who they are, then what has passed between them.
var memoryKinds = []memoryKind{
	memoryBoundary, memoryRelationship, memoryPreference, memoryAboutUser,
	memoryAboutLibby, memoryEmotional, memoryShared,
}

func validMemoryKind(k memoryKind) bool {
	for _, known := range memoryKinds {
		if k == known {
			return true
		}
	}
	return false
}

// memoryKindHeading is how each group is introduced to the model. Written as knowledge rather
// than as a schema label, for the reason the rest of her prompt is: handed "BOUNDARY:" a model
// answers in the register of a form, and handed "things you must not do" it simply behaves.
var memoryKindHeading = map[memoryKind]string{
	memoryBoundary:     "Lines you do not cross with them. These hold no matter the mood, and you never need them explained again:",
	memoryRelationship: "Where the two of you have got to:",
	memoryPreference:   "What they are into and what they are not:",
	memoryAboutUser:    "Who they are:",
	memoryAboutLibby:   "Things you have decided about yourself and should stay consistent with:",
	memoryEmotional:    "How things have felt between you:",
	memoryShared:       "Things the two of you have done together:",
}

// memoryKindWeight is the baseline importance of each kind, 1–5. A boundary outranks a
// running joke however recently the joke was told, which is the ordering the flat store could
// not express.
var memoryKindWeight = map[memoryKind]int{
	memoryBoundary:     5,
	memoryRelationship: 4,
	memoryPreference:   4,
	memoryAboutUser:    3,
	memoryAboutLibby:   3,
	memoryEmotional:    3,
	memoryShared:       2,
}

// Classification cues, checked in the order kinds are ranked so the strongest reading wins:
// a sentence that is both a boundary and a dislike is a boundary.
var memoryCues = []struct {
	kind memoryKind
	cues []string
}{
	{memoryBoundary, []string{
		"boundary", "never bring up", "don't bring up", "do not bring up", "off limits", "off-limits",
		"won't talk about", "doesn't want to talk", "does not want to talk", "hard limit", "not comfortable",
		"uncomfortable with", "asked me not to", "asked me to stop", "don't mention", "do not mention",
		"never mention", "don't call them", "triggers", "upsets them when", "no means",
	}},
	{memoryRelationship, []string{
		"we agreed", "we're now", "we are now", "calls me", "call them", "asked me out", "together now",
		"trusts me", "we said i love", "first time we", "since we started", "our anniversary", "closer",
		"forgave", "apologised", "apologized", "fell out",
	}},
	{memoryPreference, []string{
		"likes", "loves", "prefers", "into", "favourite", "favorite", "hates", "dislikes", "can't stand",
		"cannot stand", "not into", "turned on by", "turn-on", "turnoff", "turn-off", "enjoys", "wants more",
	}},
	{memoryEmotional, []string{
		"upset", "hurt", "cried", "comforted", "angry", "furious", "scared", "anxious", "lonely",
		"proud", "meant a lot", "made me feel", "made them feel", "felt", "guilty", "jealous", "relieved",
	}},
	{memoryShared, []string{
		"we watched", "we played", "we read", "we spent", "together we", "the night we", "we ended up",
		"we tried", "we stayed up", "we talked about",
	}},
	{memoryAboutLibby, []string{
		"i decided", "i told them i", "i said i", "my favourite", "my favorite", "i've been wanting",
		"i think i", "i don't like", "i do not like", "i prefer", "i promised",
	}},
}

// classifyMemory reads a plain fact and decides what sort of thing it is.
//
// An explicit prefix wins when the model happens to supply one — "boundary: don't bring up
// their ex" is natural enough English that a model writes it unprompted, so it is worth
// honouring — and the returned text has the prefix stripped so it is not stored twice.
func classifyMemory(text string) (memoryKind, string) {
	trimmed := strings.TrimSpace(text)
	if label, rest, found := strings.Cut(trimmed, ":"); found && len(label) <= 20 && strings.TrimSpace(rest) != "" {
		if kind := memoryKind(strings.ToLower(strings.TrimSpace(label))); validMemoryKind(kind) {
			return kind, strings.TrimSpace(rest)
		}
	}
	lower := strings.ToLower(trimmed)
	for _, group := range memoryCues {
		for _, cue := range group.cues {
			if strings.Contains(lower, cue) {
				return group.kind, trimmed
			}
		}
	}
	// A fact about somebody with no cue in it is a fact about them, which is what most of
	// this store is.
	return memoryAboutUser, trimmed
}

// hedges are the words she uses when she is not sure. A memory written with one is stored as
// uncertain rather than as fact — the brief asks for uncertain memories to be distinguishable,
// and her own hedging is the only signal available for it.
var hedges = []string{
	"i think", "i believe", "maybe", "might", "possibly", "probably", "seems", "seemed",
	"sounded like", "not sure", "unsure", "if i remember", "i got the impression", "implied",
	"hinted", "guess", "presumably", "apparently", "or something",
}

// memoryConfidence is how sure a stored fact is, 0–1. Hedged wording lands below the
// uncertainty floor, which is what makes the prompt flag it.
func memoryConfidence(text string) float64 {
	lower := strings.ToLower(text)
	for _, hedge := range hedges {
		if strings.Contains(lower, hedge) {
			return 0.5
		}
	}
	return 0.9
}

// uncertaintyFloor is the confidence below which a memory is presented as something she is
// not sure of rather than as something she knows.
const uncertaintyFloor = 0.7

// trivialCues are what a model files when it has been told it may remember and has nothing
// worth remembering. Rejecting these is the brief's "safeguard against storing every minor
// message": the cap of two per reply bounds the damage, but a store full of "they said hello"
// crowds out the facts that matter just as effectively as a store that is too large.
var trivialCues = []string{
	"said hello", "said hi", "greeted", "we are talking", "we're talking", "started a conversation",
	"is chatting", "asked how i", "said goodbye", "logged in", "opened the app", "is here",
	"wants to chat", "said thanks", "said thank you", "is typing", "sent a message",
}

// minMemoryLen is the shortest thing that can be a fact. Below this it is a fragment — a
// model emitting "[remember: yes]" is not remembering anything.
const minMemoryLen = 8

// worthRemembering rejects the notes that should never have been filed.
func worthRemembering(text string) bool {
	trimmed := strings.TrimSpace(text)
	if len([]rune(trimmed)) < minMemoryLen {
		return false
	}
	lower := strings.ToLower(trimmed)
	for _, cue := range trivialCues {
		if strings.Contains(lower, cue) {
			return false
		}
	}
	return true
}

// ── near-duplicate detection ─────────────────────────────────────────────────

// memoryWords reduces a fact to the content words worth comparing. Reuses the link
// resolver's stop list, which is the same job: strip the words every sentence has.
func memoryWords(text string) map[string]bool {
	out := map[string]bool{}
	for _, word := range strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}) {
		if len(word) >= 3 && !lookupStopWords[word] && !memoryStopWords[word] {
			out[word] = true
		}
	}
	return out
}

// memoryStopWords are the words specific to how facts about a person are phrased. Without
// them "they like X" and "they like Y" overlap on two words out of three and read as the
// same memory.
var memoryStopWords = map[string]bool{
	"they": true, "them": true, "their": true, "theyre": true, "she": true, "her": true,
	"his": true, "him": true, "was": true, "were": true, "has": true, "had": true,
	"when": true, "what": true, "very": true, "really": true, "just": true, "also": true,
	"told": true, "said": true, "want": true, "wants": true, "like": true, "likes": true,
}

// duplicateOverlap is the share of the two facts' combined content words they must have in
// common to count as the same memory. Two thirds is high enough that "they watched the new
// season of Ozark" and "…of Fargo" stay separate — they differ by one word out of five — and
// low enough that "they like horror films" and "they really like horror films a lot" merge.
const duplicateOverlap = 0.67

// sameMemory reports whether two facts are the same thing said twice.
//
// Measured over the union rather than over the smaller of the two sets. Against the smaller
// set, any short fact whose words all appear in a longer one matched it, so a store of facts
// sharing a few boilerplate words ("they mentioned a place called …") collapsed into a single
// record. The subset rule below covers the case that made "smaller" tempting: a terser
// original that a later, fuller restatement should absorb.
func sameMemory(a, b string) bool {
	if strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b)) {
		return true
	}
	wordsA, wordsB := memoryWords(a), memoryWords(b)
	if len(wordsA) == 0 || len(wordsB) == 0 {
		return false
	}
	shared := 0
	for word := range wordsA {
		if wordsB[word] {
			shared++
		}
	}
	if shared == 0 {
		return false
	}
	// One fact saying everything the other says, and more, is the same memory told at greater
	// length — but only when there is enough of it to be sure: a single shared word is a
	// coincidence, not a restatement.
	smaller := len(wordsA)
	if len(wordsB) < smaller {
		smaller = len(wordsB)
	}
	if shared == smaller && smaller >= 2 {
		return true
	}
	union := len(wordsA) + len(wordsB) - shared
	return float64(shared)/float64(union) >= duplicateOverlap
}
