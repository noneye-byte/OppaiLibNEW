package api

import (
	"regexp"
	"sort"
	"strings"
)

// Who she has said she is.
//
// The card says who Libby is in a paragraph. Everything past the paragraph she makes up
// as she goes — where she grew up, whether she has a sister, her favourite film — and a
// person is mostly made of those. A model invents them fluently and forgets them just as
// fluently, so the town she grew up in on Tuesday was a different town by Friday, and
// nothing breaks the sense that there is somebody there faster than that.
//
// The memory store already had a kind for this (memoryAboutLibby), but it was treated
// like any other note: counted against the same sixty as everything she knows about the
// user, faded by the same three-week half-life, carried into the prompt only if it made
// the top twenty-four, and captured only when she thought to tag it. So the facts that
// most needed to last were the ones most likely to be lost. What changes here:
//
//   - They have their own cap (maxSelfFacts), so what she knows about the user cannot
//     push out who she is, nor the other way round.
//   - They do not fade. A person's childhood does not get less true for not coming up.
//   - They are carried whole, as their own section, ranked to be shed after everything
//     else: "who you are" is the last thing a tight window should cost her.
//   - They are captured from what she says, not only from a tag she remembers to write —
//     the same move chat_memory_capture.go made for facts about the user.
//   - The first telling stands. A later sentence about the same thing (another hometown,
//     a second favourite colour) is not filed over it; the prompt tells her the first one
//     is true, and the settings screen is where the user can change it.

// maxSelfFacts is how many things about herself she keeps. Separate from the user's
// sixty, and smaller: a person is a few dozen settled facts, not a biography.
const maxSelfFacts = 40

// selfTopicRules name what a fact about her is about, so two facts about the same thing
// can be recognised as competing even when they share no words. Order matters: a
// birthday is "born in March", which the origin rule would otherwise read as a place.
var selfTopicRules = []struct {
	pattern *regexp.Regexp
	topic   func(m []string) string
}{
	{regexp.MustCompile(`\b(?:my birthday|i was born (?:on|in) (?:january|february|march|april|may|june|july|august|september|october|november|december))\b`),
		func([]string) string { return "birthday" }},
	{regexp.MustCompile(`\b(?:grew up|was born|i'?m (?:originally )?from|i come from|my home ?town)\b`),
		func([]string) string { return "where she grew up" }},
	{regexp.MustCompile(`\bmy (mom|mum|mother|dad|father|parents|sister|brother|siblings|grandma|grandmother|nan|grandpa|grandfather)\b`),
		func(m []string) string { return "family: " + familyMember(m[1]) }},
	{regexp.MustCompile(`\bmy fav(?:ou?rite)? ([a-z]+)`),
		func(m []string) string {
			return "favourite " + strings.TrimSuffix(strings.ReplaceAll(m[1], "color", "colour"), "s")
		}},
	{regexp.MustCompile(`\b(?:i work(?:ed)? (?:as|at|in)|my job|i used to work)\b`),
		func([]string) string { return "work" }},
	{regexp.MustCompile(`\b(?:i studied|i went to (?:uni|university|college))\b`),
		func([]string) string { return "studies" }},
	{regexp.MustCompile(`\bmy (?:cat|dog|pet)\b`),
		func([]string) string { return "pet" }},
}

// familyMember folds the words for one relative into one topic, so "my mum" and "my
// mother" are the same person.
func familyMember(word string) string {
	switch word {
	case "mom", "mum", "mother":
		return "mother"
	case "dad", "father":
		return "father"
	case "grandma", "grandmother", "nan":
		return "grandmother"
	case "grandpa", "grandfather":
		return "grandfather"
	}
	return word
}

// selfTopic is what a fact about her is about, "" when it is about nothing this knows
// how to recognise — an opinion, a habit — which is then never treated as competing.
func selfTopic(text string) string {
	lower := strings.ToLower(text)
	for _, rule := range selfTopicRules {
		if m := rule.pattern.FindStringSubmatch(lower); m != nil {
			return rule.topic(m)
		}
	}
	return ""
}

// selfTopicTaken reports whether she already holds a fact on the same topic as text.
func selfTopicTaken(memories []libbyMemory, text string) bool {
	topic := selfTopic(text)
	if topic == "" {
		return false
	}
	for _, m := range memories {
		if m.Kind == memoryAboutLibby && selfTopic(m.Text) == topic {
			return true
		}
	}
	return false
}

// selfStatement finds a sentence of hers that settles something about her life: where
// she is from, her family, a favourite, her work, what she has always been like. Kept
// narrow on purpose — "I love that" and "I'm so wet" are her in the moment, not her
// biography, and a store of those would be noise she is told to stay consistent with.
var selfStatement = regexp.MustCompile(`(?i)\b(?:i grew up|i was born|i'?m (?:originally )?from|i come from|my home ?town|my (?:mom|mum|mother|dad|father|parents|sister|brother|siblings|grandma|grandmother|nan|grandpa|grandfather)\b|my fav(?:ou?rite)? [a-z]+ (?:is|was|has always been)|my birthday|i used to (?:live|work|be|have|play|dance|sing|draw)|i went to (?:uni|university|college|school)|i studied|i work(?:ed)? (?:as|at|in)|i'?ve always (?:loved|hated|wanted|been)|my (?:cat|dog|pet)\b)`)

// selfStatementNot rules a sentence out: about the two of them rather than her, a
// question, or a hypothetical. "I've always wanted to try that with you" is flirting.
var selfStatementNot = regexp.MustCompile(`(?i)\b(?:you|your|you're|we|our|if|would|wish|imagine|pretend|maybe|kidding|joking|lol)\b`)

// maxSelfCaptures bounds what one reply can add, the same way the user-fact capture is
// bounded: a reply that is a monologue about her childhood still files two things.
const maxSelfCaptures = 2

// actionAside is an *emote* in her reply, which describes the scene rather than stating
// anything about her.
var actionAside = regexp.MustCompile(`\*[^*\n]*\*`)

// captureSelfFacts reads the facts about herself out of one of her replies.
func captureSelfFacts(reply string) []string {
	// A closing newline so the last sentence ends like the others, punctuated or not.
	text := actionAside.ReplaceAllString(reply, " ") + "\n"
	var out []string
	start := 0
	for i, r := range text {
		if r != '.' && r != '!' && r != '?' && r != '\n' {
			continue
		}
		sentence := strings.TrimSpace(text[start:i])
		question := r == '?'
		start = i + 1
		if question || len(sentence) < 12 || len(sentence) > 200 {
			continue
		}
		if !selfStatement.MatchString(sentence) || selfStatementNot.MatchString(sentence) {
			continue
		}
		out = append(out, sentence)
		if len(out) >= maxSelfCaptures {
			break
		}
	}
	return out
}

// asSelfFacts marks facts as being about her, using the explicit-kind prefix
// classifyMemory already honours, so they go through the ordinary filing — merge,
// reinforcement, the first-telling rule — without a second path to keep in step.
func asSelfFacts(facts []string) []string {
	out := make([]string, 0, len(facts))
	for _, f := range facts {
		if f = strings.TrimSpace(f); f != "" {
			out = append(out, string(memoryAboutLibby)+": "+f)
		}
	}
	return out
}

// selfPromptBlock is who she has said she is, carried whole. What the user wrote or
// pinned comes first — it is the part she may not revise — then the rest oldest-first,
// which is the order she decided them in.
func selfPromptBlock(store libbyMemoryStore) string {
	var self []libbyMemory
	for _, m := range store.Memories {
		if m.Kind == memoryAboutLibby {
			self = append(self, m)
		}
	}
	if len(self) == 0 {
		return ""
	}
	sort.SliceStable(self, func(a, b int) bool {
		va, vb := self[a].Pinned || self[a].Source == memorySourceUser, self[b].Pinned || self[b].Source == memorySourceUser
		if va != vb {
			return va
		}
		return self[a].At < self[b].At
	})
	var b strings.Builder
	b.WriteString("\n\nWho you are, beyond the card: things you have said or settled about yourself in past conversations. " +
		"They are true of you. Stay consistent with them and build on them; never contradict them, and never give a different answer to something already settled here. " +
		"Anything about your life that is not here yet is yours to decide when it comes up — and once said, it is true from then on.\n")
	for _, m := range self {
		b.WriteString("- " + m.Text + "\n")
	}
	return b.String()
}

// selfFactRecency is why memoryScore leaves these alone: see the file comment.
func selfFactRecency(m libbyMemory, recency float64) float64 {
	if m.Kind == memoryAboutLibby {
		return 1
	}
	return recency
}
