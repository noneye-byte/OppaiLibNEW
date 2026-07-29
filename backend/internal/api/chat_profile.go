package api

import (
	"strings"
)

// Turning the user's stated profile into prompt text.
//
// Split out of the prompt assembly because the ordering here carries meaning that a
// sequence of string appends would hide.
//
// Boundaries come first and are phrased as an instruction that outranks the character
// card. That is not decoration: a card can ask for behaviour a user has explicitly ruled
// out, and when the two conflict the user's line has to win. A model given both without
// a precedence rule splits the difference, which is the worst of the three outcomes.
//
// Everything else is descriptive, and is deliberately phrased as *what the user told us*
// rather than as fact. The difference matters when it is wrong: a line saying "he told
// you he likes horror films" invites being corrected, while "he likes horror films"
// invites being defended.
//
// Nothing inferred appears here. What Libby worked out on her own lives in the memory
// store, is labelled hers, and is editable there — see handlers_libby_memory.go. Keeping
// the two apart in the prompt is what makes "separate editable profile facts from
// memories Libby inferred" true of the model's view and not only of the UI.

// userProfileDirective renders the profile, or "" when the user has said nothing.
func userProfileDirective(p chatProfile) string {
	var b strings.Builder

	// The hard part first, so it is never the thing that falls off the end of a
	// truncated section.
	if v := strings.TrimSpace(p.Boundaries); v != "" {
		b.WriteString("\n\nThe user has set these boundaries, in their own words: ")
		b.WriteString(v)
		b.WriteString("\nThese are not preferences to weigh up. They override your character card, " +
			"your mood, and anything the conversation drifts towards. If a boundary and something " +
			"else you have been told disagree, the boundary wins and you do not explain the conflict.")
	}

	var facts []string
	add := func(label, value string) {
		if v := strings.TrimSpace(value); v != "" {
			facts = append(facts, label+": "+v)
		}
	}
	add("Name they go by", p.DisplayName)
	// Phrased as their request rather than as a fact about them, because it is exactly
	// that — and because a model handed "pronouns: they/them" as a bare attribute will
	// sometimes announce it.
	add("How they have asked to be referred to", p.Address)
	add("How they describe themselves", p.Persona)
	add("Things they have said they are interested in", p.Interests)
	add("Preferences they have stated", p.Preferences)
	add("How they have asked you to talk to them", p.Communication)

	if len(facts) > 0 {
		b.WriteString("\n\nWhat the user has told you about themselves, in their own words:\n")
		b.WriteString(strings.Join(facts, "\n"))
		b.WriteString("\nThis is what they chose to tell you, not everything about them. " +
			"Treat it as theirs to correct: if they say something different, believe them.")
	}

	if !p.MayRemember() {
		// Stated to the model as well as enforced in the store. Enforcement alone would
		// leave her forming memories and having them silently dropped, which reads to a
		// model as its own output being ignored and produces a lot of "as I mentioned".
		b.WriteString("\n\nThe user has asked you not to keep new memories about them. " +
			"Talk normally, but do not try to record anything for later and do not " +
			"claim to remember things you were not told this conversation.")
	}

	return b.String()
}
