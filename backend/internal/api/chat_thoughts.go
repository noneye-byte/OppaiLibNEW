package api

import (
	"regexp"
	"strings"
)

// Thinking, and talking to herself.
//
// The brief asks for user-visible speech, internal thoughts, tool actions and
// self-directed speech to be separable, and for the interface to make a thought
// visually unmistakable. Everything else she emits is already separated — actions are
// proposal cards, status is the notice bar, speech is a bubble — so what was missing
// is the two that are not addressed to the user at all.
//
// Deliberately *authored* thoughts rather than exposed reasoning. The brief says so
// outright, and it is also the only version that works here: what a local 7B produces
// when asked to reason aloud is a plan for its own reply, which is both dull to read
// and the thing that breaks the illusion hardest. A thought is a finished sentence in
// her voice — something she noticed and did not say.
//
// The two kinds differ in whether the user is meant to have heard it:
//
//	thought — private. She thinks it; nobody hears it.
//	aside   — said out loud to herself, and overheard.
//
// That distinction is the whole reason for two tags rather than one. "God, he looks
// tired" thought at someone and muttered near them are different acts, and a character
// who cannot do the second only ever soliloquises.
type libbyThought struct {
	// Kind is thoughtPrivate or thoughtAside. Never empty in a returned value.
	Kind string `json:"kind"`
	Text string `json:"text"`
}

const (
	thoughtPrivate = "thought"
	thoughtAside   = "aside"
)

// thoughtDirective teaches the two tags.
//
// It says what they are *for* rather than only how to write them, because the failure
// mode of a bare syntax rule is a model that emits "[think: I should answer his
// question about the gallery]" — narration of its own turn, which is exactly the
// hidden-reasoning leak the brief forbids. Saying "not how you worked something out"
// costs a line and stops it.
//
// Libby-only, like the memory, wants and bond directives: an imported card is somebody
// else's character, and giving it an inner life the author never wrote is a liberty.
const thoughtDirective = "[think: …] is a private authored observation the user cannot hear; [aside: …] is self-talk they can overhear. " +
	"Use at most one, rarely; a thought-only turn may mean you chose silence. Never put reasoning, answer planning, or tag explanations in either."

// looseThoughtTag captures either kind wherever it lands, with the same tolerance for
// paraphrased syntax as every other tag parser here: models reliably write "[thinks: …]"
// or "[to myself: …]" for a tag documented as "[think: …]".
var looseThoughtTag = regexp.MustCompile(`(?i)\[\s*(think|thinks|thinking|thought|thoughts|inner\s+voice|inner\s+thought|internal|privately|aside|asides|mutter|mutters|muttering|to\s+(?:her)?self|to\s+myself)\s*[:=-]\s*([^\]\n]{1,300}?)\s*\]`)

// maxThoughtsPerReply bounds how many one reply may carry. The directive asks for one;
// two is the tolerance, because a model that thinks and then mutters has done something
// reasonable. Past that it is padding every turn with an inner monologue, which makes
// the whole device worthless — a thought only reads as one when it is rare.
const maxThoughtsPerReply = 2

// asideWords are the tag spellings that mean she said it out loud. Everything else the
// pattern accepts is private.
var asideWords = map[string]bool{
	"aside": true, "asides": true, "mutter": true, "mutters": true, "muttering": true,
	"to self": true, "to herself": true, "to myself": true,
}

// findThoughtTags reads the thoughts out of a reply, in order, capped. Text is returned
// raw; the caller owns length and presentation.
//
// A thought that is only punctuation or an empty string is dropped rather than returned
// as a blank bubble — the client draws these with their own chrome, so an empty one is
// a visible artefact rather than nothing.
func findThoughtTags(reply string) []libbyThought {
	matches := looseThoughtTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return nil
	}
	var out []libbyThought
	for _, match := range matches {
		text := strings.TrimSpace(match[2])
		// Strip the wrapping quotes a model adds around a muttered line; the client
		// already styles the bubble, so they read as stray punctuation.
		text = strings.Trim(text, `"'`)
		if text = strings.TrimSpace(text); text == "" || !strings.ContainsFunc(text, isLetterOrDigit) {
			continue
		}
		if len(text) > maxThoughtText {
			text = strings.TrimSpace(text[:maxThoughtText]) + "…"
		}
		kind := thoughtPrivate
		label := strings.Join(strings.Fields(strings.ToLower(match[1])), " ")
		if asideWords[label] {
			kind = thoughtAside
		}
		out = append(out, libbyThought{Kind: kind, Text: text})
		if len(out) >= maxThoughtsPerReply {
			break
		}
	}
	return out
}

// repliedOnlyWithThought reports whether a reply is a thought and nothing else — the
// case the directive allows for, where she has looked at something, had a reaction, and
// decided not to say anything.
//
// It has to be asked before scrubbing, because scrubDirectives deliberately returns the
// text unchanged when removing tags would empty it: an all-tag reply is normally a
// backend failure the caller reports as "no message", and only the presence of a
// readable thought distinguishes the two.
func repliedOnlyWithThought(reply string) bool {
	rest := strayThoughtTag.ReplaceAllString(reply, "")
	return !strings.ContainsFunc(rest, isLetterOrDigit)
}

// maxThoughtText is the longest a single thought may be. A thought is a line, not a
// paragraph; past this the model has written its reply inside the tag.
const maxThoughtText = 240

func isLetterOrDigit(r rune) bool {
	return (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')
}
