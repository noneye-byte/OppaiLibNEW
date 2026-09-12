package api

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

// Noticing what they say about themselves.
//
// Her memory was written from one place: a [remember: …] tag in her own reply. That is
// the right design — she decides what matters — and it did not work, because the tag is
// the first thing a small model stops emitting. Told "at most two, usually none", a 7B
// hears "none"; busy answering, it never reaches the end of the protocol; and the user,
// having said "my name's Owen and I live in Leeds" three times, watches the memory
// panel stay empty and concludes the feature is broken. Which, from where they sit, it
// was.
//
// This is the safety net under the tag. When someone states a fact about themselves
// in so many words — a name, a home, a job, what they love or hate, a line not to
// cross — it is filed whether or not she thought to. The patterns are deliberately
// narrow and first-person: only sentences that *are* the fact are read, never the
// inference of one, so what lands here is what a person would expect a friend to have
// caught. Everything she files herself still comes first and still wins the per-turn
// cap; this only fills the silence.

// maxCapturedPerTurn bounds what one message of theirs may file by itself. One: a
// message that states three facts is rare, and the tag can carry the rest.
const maxCapturedPerTurn = 1

// factPattern is one shape a stated fact takes, and how it is written down. The
// template's %s is the captured object, already trimmed and bounded.
type factPattern struct {
	re       *regexp.Regexp
	template string
	// short is the template for when an optional second capture is absent — "They have
	// a dog" for a dog with no name given. Empty for patterns with one slot.
	short string
	kind  memoryKind
}

// The object of a fact: everything to the end of the clause, bounded. Stops at
// sentence punctuation, a conjunction that starts a new thought, or a line break.
const factObject = `([^.!?\n;,]{2,80}?)(?:[.!?\n;,]|\s+(?:but|and|so|because|though|although|lol|haha)\b|$)`

var factPatterns = []factPattern{
	// Identity.
	{regexp.MustCompile(`(?i)\b(?:my name is|my name's|name's|you can call me|just call me|call me)\s+` + factObject), "Their name is %s", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bi(?:'m| am) (\d{2}) (?:years old|yo|y/o)\b`), "They are %s years old", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bmy birthday(?:'s| is) (?:on |in )?` + factObject), "Their birthday is %s", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bi (?:live|am living|'m living) in ` + factObject), "They live in %s", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bi(?:'m| am) (?:originally )?from ` + factObject), "They are from %s", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bi (?:just )?moved to ` + factObject), "They moved to %s", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bi work ((?:as|at|for|in) [^.!?\n;,]{2,80}?)(?:[.!?\n;,]|\s+(?:but|and|so|because|though|although|lol|haha)\b|$)`), "They work %s", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bmy job is ` + factObject), "Their job is %s", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bi(?:'m| am) (?:a|an) (student|nurse|teacher|developer|programmer|engineer|designer|writer|artist|doctor|chef|cook|driver|mechanic|electrician|plumber|lawyer|accountant|manager|barista|bartender|soldier|pilot|scientist|musician|photographer|streamer|gamer|farmer|carpenter|builder|cleaner|cashier|librarian|therapist|pharmacist|dentist|vet|firefighter|paramedic|police officer|cop|security guard|freelancer|contractor|consultant|analyst|researcher|professor|lecturer|tutor|translator|editor|journalist|actor|dancer|model|trainer|coach|athlete|welder|painter|tattoo artist|hairdresser|barber|florist|baker|butcher|fisherman|sailor|trucker|courier|postman|receptionist|secretary|clerk|banker|broker|realtor|architect|surveyor|geologist|biologist|chemist|physicist|mathematician|statistician|economist|historian|philosopher|psychologist|sociologist|anthropologist|archaeologist|linguist|nanny|caregiver|carer|social worker|counsellor|counselor|priest|pastor|monk|nun|rabbi|imam)\b`), "They are a %s", "", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bi have (?:a|an|two|three|\d+) (dogs?|cats?|kids?|children|sons?|daughters?|brothers?|sisters?|rabbits?|birds?|horses?|snakes?|hamsters?|guinea pigs?|ferrets?|lizards?|fish|parrots?)(?: (?:called|named) ([^.!?\n;,]{1,40}?))?(?:[.!?\n;,]|\s+(?:but|and|so|because)\b|$)`), "They have a %s named %s", "They have a %s", memoryAboutUser},
	{regexp.MustCompile(`(?i)\bmy (wife|husband|girlfriend|boyfriend|partner|fianc[ée]e?|ex|mum|mom|mother|dad|father|sister|brother|son|daughter|roommate|flatmate|best friend)(?:'s name)? is (?:called |named )?([A-Z][a-z]{1,30})\b`), "Their %s is called %s", "", memoryAboutUser},
	// Preferences.
	{regexp.MustCompile(`(?i)\bmy (?:favou?rite) ([a-z ]{2,30}?) (?:is|are) ` + factObject), "Their favourite %s is %s", "", memoryPreference},
	{regexp.MustCompile(`(?i)\bi (?:really |absolutely |seriously )?(?:love|adore) ` + factObject), "They love %s", "", memoryPreference},
	{regexp.MustCompile(`(?i)\bi(?:'m| am) (?:really |very |so )?(?:into|obsessed with|a big fan of|a huge fan of) ` + factObject), "They are into %s", "", memoryPreference},
	{regexp.MustCompile(`(?i)\bi (?:really |absolutely |seriously )?(?:hate|can't stand|cannot stand|despise|loathe) ` + factObject), "They hate %s", "", memoryPreference},
	{regexp.MustCompile(`(?i)\bi(?:'m| am) (?:really )?not into ` + factObject), "They are not into %s", "", memoryPreference},
	{regexp.MustCompile(`(?i)\bi (?:don't|do not|dont) (?:really )?like ` + factObject), "They don't like %s", "", memoryPreference},
	// Boundaries. Read as a limit only when it is phrased as one addressed to her.
	{regexp.MustCompile(`(?i)\b(?:please |just )?(?:don't|do not|dont|never) (?:ever )?((?:call me|bring up|mention|talk about|ask about|ask me about|joke about|tease me about) [^.!?\n;,]{2,80}?)(?:[.!?\n;,]|\s+(?:but|and|so|because|though|although|lol|haha)\b|$)`), "They asked me never to %s", "", memoryBoundary},
	{regexp.MustCompile(`(?i)\bi (?:don't|do not|dont) want (?:you )?to (?:ever )?(?:talk about|bring up|mention|joke about) ` + factObject), "They don't want me to bring up %s", "", memoryBoundary},
	{regexp.MustCompile(`(?i)\b(?:that's|that is|this is) (?:a hard limit|off limits|off-limits|a no-go|not okay|not ok)\b`), "They said that was off limits", "", memoryBoundary},
}

// captureUserFacts reads the plainly-stated facts out of what they just said, written
// as she would file them. Bounded, and empty for the ordinary message that states
// nothing — which is nearly all of them.
//
// userName is what their profile already says they are called; a name that matches it
// is not news and is not filed.
func captureUserFacts(text, userName string) []string {
	text = strings.TrimSpace(text)
	if text == "" || len(text) > maxChatText {
		return nil
	}
	// Bracketed nudges and continuations are the client's words, not theirs.
	if strings.HasPrefix(text, "(") {
		return nil
	}
	var facts []string
	seen := map[string]bool{}
	for _, pattern := range factPatterns {
		match := pattern.re.FindStringSubmatch(text)
		if match == nil {
			continue
		}
		fact, ok := renderFact(pattern, match, userName)
		if !ok {
			continue
		}
		key := strings.ToLower(fact)
		if seen[key] {
			continue
		}
		seen[key] = true
		facts = append(facts, fact)
		if len(facts) >= maxCapturedPerTurn {
			break
		}
	}
	return facts
}

// renderFact fills a pattern's template from its captures, or reports that the
// captures were not worth a memory.
func renderFact(pattern factPattern, match []string, userName string) (string, bool) {
	args := make([]any, 0, len(match)-1)
	for _, group := range match[1:] {
		group = cleanFactObject(group)
		if group == "" {
			// A missing optional group ("I have a dog" with no name) is left out
			// rather than rendered as "named ".
			continue
		}
		args = append(args, group)
	}
	if len(args) == 0 {
		// The boundary pattern with no captures at all is its own sentence.
		if !strings.Contains(pattern.template, "%s") {
			return pattern.template, true
		}
		return "", false
	}
	template := pattern.template
	if slots := strings.Count(template, "%s"); slots != len(args) {
		// A two-slot pattern whose optional capture was empty falls back to its short
		// form; anything else mismatched is a pattern bug, and files nothing.
		if pattern.short != "" && len(args) == strings.Count(pattern.short, "%s") {
			template = pattern.short
		} else {
			return "", false
		}
	}
	fact := strings.TrimSpace(fmt.Sprintf(template, args...))
	// Facts about her, or about nobody in particular, are not facts about them.
	first := strings.ToLower(args[0].(string))
	if first == "you" || strings.HasPrefix(first, "you ") || strings.HasPrefix(first, "your ") ||
		first == "it" || first == "that" || first == "this" || first == "them" || first == "him" || first == "her" {
		return "", false
	}
	if strings.HasPrefix(fact, "Their name is ") && userName != "" && strings.EqualFold(strings.TrimSpace(args[0].(string)), userName) {
		return "", false
	}
	if !worthRemembering(fact) {
		return "", false
	}
	return fact, true
}

// cleanFactObject tidies a captured clause: trimmed, quotes and trailing filler off,
// bounded, and rejected outright when it is mostly not words.
func cleanFactObject(s string) string {
	s = strings.TrimSpace(s)
	s = strings.Trim(s, `"'“”‘’*_ `)
	// Trailing filler that the clause boundary let through.
	for _, tail := range []string{" btw", " tbh", " honestly", " though", " tho", " actually", " right now", " atm"} {
		if strings.HasSuffix(strings.ToLower(s), tail) {
			s = s[:len(s)-len(tail)]
		}
	}
	s = strings.TrimSpace(s)
	if len([]rune(s)) > 80 {
		s = strings.TrimSpace(string([]rune(s)[:80]))
	}
	letters := 0
	for _, r := range s {
		if unicode.IsLetter(r) {
			letters++
		}
	}
	if letters < 2 || letters*2 < len([]rune(s)) {
		return ""
	}
	return s
}
