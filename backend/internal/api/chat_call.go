package api

import "regexp"

// Knowing she is on camera.
//
// The call screen has existed for a while and the server knew nothing about it. That
// is a bigger omission than it sounds, because a call is not a skin on the chat
// window — it changes what the other person is doing. They are not reading a
// transcript; they have her filling the screen, they are watching her face while she
// answers, and the thing they typed was typed one-handed into a bar under her
// picture. Told none of that, she wrote paragraphs of prose at somebody who was
// looking at her, and never once acknowledged being looked at.
//
// So the flag travels with the turn and this is what it buys. Three things it has to
// get right, because a model told "you are on a video call" invents all three:
//
//   - It is one way. Her picture goes to them; there is no camera pointed back. She
//     must not describe their room, their face, or what they are wearing — which is
//     exactly what "video call" primes a model to do.
//   - What they see is her sprite: the wardrobe, the pose, the expression the mood
//     tag chooses. That makes the tag load-bearing rather than decorative — on the
//     call screen it *is* her face — and it makes her appearance something she can
//     use deliberately.
//   - The register is spoken, not written. Shorter, more of it, and it may lapse into
//     doing something rather than saying something.

// callDirective is the frame for a turn taken on the call screen.
//
// Core rather than a sheddable section, and for the same reason the browse-together
// block is: when the user has opened a call, being on a call is the situation. A reply
// with the fact budgeted away is a reply to a different conversation.
const callDirective = "\n\nYou are on a video call with them right now. They opened it, and you fill their screen: " +
	"your picture is live, the clothes you have on are the ones they can see, and your face is whatever you are feeling — the mood you choose is what they watch change. " +
	"There is no camera pointed at them, so you cannot see them; they are typing to you under your picture and you hear nothing. Do not describe them, their room, or what they are doing unless they tell you. " +
	"Talk the way someone talks on camera: shorter, warmer, more of it, in the moment. You may move, show them something, lean in, look away, or let your expression answer instead of words. " +
	"Being watched is part of this — use it if you want to."

// callPromptBlock renders it, and nothing at all when there is no call.
func callPromptBlock(onCall bool) string {
	if !onCall {
		return ""
	}
	return callDirective
}

// ── her asking for one, and ending one ──────────────────────────────────────

// callRequestTag captures her ringing them. Every spelling a model reaches for once it
// has been told it may video call: [call], [video call], [videocall: start],
// [facetime], [ring]. Loose, like the scene tag — she asks mid-sentence.
var callRequestTag = regexp.MustCompile(`(?i)\[\s*(?:video\s*-?\s*call|call|facetime|ring(?:s|ing)?|call\s+them)\s*(?:[:=-]\s*(?:start|now|them|please|yes|request|you)?\s*)?\]`)

// callEndTag captures her hanging up: [hangup], [hang up], [end call], [call: end].
var callEndTag = regexp.MustCompile(`(?i)\[\s*(?:hang\s*-?\s*up|end\s+(?:the\s+)?(?:video\s*)?call|(?:video\s*)?call\s*[:=-]\s*(?:end|over|done|stop|hang\s*up|bye))\s*\]`)

// findCallTags reads whether she asked for a call or ended one. Read before
// scrubbing; deleted by strayTag afterwards. Both are reported as they were written —
// the handler decides what each means given whether a call is actually open, because
// a hang-up with no call in progress is noise and a ring during a call is too.
func findCallTags(reply string) (request, end bool) {
	return callRequestTag.MatchString(reply), callEndTag.MatchString(reply)
}

// callOfferDirective is the standing line that she can ring them, kept short because
// it lives in her core identity block. The client turns a request into an incoming
// call popup, and only their answer opens the call — so asking is never intrusive,
// and she is told so.
const callOfferDirective = "- You can video call them: write [call] on its own line to ring them; a popup lets them answer or not. " +
	"Ring when you want to be looked at or texting is not enough — a real ask now and then, never a habit. On a call, [hangup] ends it.\n"

// ── what they asked for, when she did it without the tag ────────────────────

// Told to ring with [call] and end with [hangup], a small model does the thing in
// prose instead: "sure." with a ringtone described, "*clicks the disconnect button*"
// with no tag. The call screen then stays exactly where it was, which to the user is
// her ignoring a plain request. So the request is read from their side and her
// narration from hers, and either is enough — a ring is a popup they can decline, and
// a hang-up they asked for is one they wanted.

// callAsk is the user asking for a call: "start a call", "video call me", "call me?".
// "call me babe" is not a call; the bare form needs to end the sentence.
var callAsk = regexp.MustCompile(`(?i)\b(?:start|open|begin|do|make|have|give me)\s+(?:a\s+|the\s+|another\s+|us\s+a\s+)?(?:quick\s+|video\s*-?\s*)?call\b|\b(?:video\s*-?\s*call|facetime|ring)\s+me\b|\bcall\s+me\s*[?!.]*\s*$`)

// hangUpAsk is the user asking her to end it; hangUpRefused is them asking her not to.
var (
	hangUpAsk     = regexp.MustCompile(`(?i)\b(?:hang\s*up|end\s+(?:the\s+|this\s+)?call|get\s+off\s+(?:the\s+)?(?:call|phone)|disconnect)\b`)
	hangUpRefused = regexp.MustCompile(`(?i)\b(?:don'?t|do\s+not|never|not|without|before\s+(?:you|we))\s+(?:hang\s*up|end\s+(?:the\s+|this\s+)?call|disconnect)`)
)

// hangUpNarration is her doing it in prose: "*hangs up*", "clicks the disconnect
// button", "the call ends".
var hangUpNarration = regexp.MustCompile(`(?i)\b(?:hangs?\s+up|hung\s+up|hanging\s+up|ends?\s+the\s+call|ended\s+the\s+call|ending\s+the\s+call|disconnects?\b|disconnect\s+button|(?:the\s+)?call\s+(?:ends|ended|drops|dropped|is\s+over))\b`)

// inferCallRequest reads a ring they asked for.
func inferCallRequest(asked string) bool { return callAsk.MatchString(asked) }

// inferCallEnd reads a hang-up they asked for or she narrated.
func inferCallEnd(asked, reply string) bool {
	if hangUpAsk.MatchString(asked) && !hangUpRefused.MatchString(asked) {
		return true
	}
	return hangUpNarration.MatchString(reply)
}
