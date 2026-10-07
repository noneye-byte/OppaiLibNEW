package api

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

// maxThoughtText is the longest a single thought may be. A thought is a line, not a
// paragraph; past this the model has written its reply inside the tag.
const maxThoughtText = 240
