package api

import "regexp"

// Going into detail when asked to.
//
// Every turn is told how many short texts to send (chat_texts.go), and the cap behind
// that cuts anything past the count. That is right for texting and wrong for "go into
// detail": asked to describe what she would do, she answered in one or two lines like
// any other message, and a longer answer lost its later paragraphs to the cap. Asked
// for detail, she is told this reply is a scene rather than a text — roleplay, written
// out — and it is sampled and kept as one.

// detailCue is a request for more than a text: detail, a description, the scene
// written out. Anchored on the asking, so "the details are boring" does not count.
var detailCue = regexp.MustCompile(`(?i)` +
	`\b(?:go|get) (?:in|into|in ?to) (?:(?:more|much more|full|great|graphic|explicit|vivid|lots of|a lot of|some|every) )?details?\b` +
	`|\bin (?:more |full |great |vivid |graphic |explicit |excruciating |exact |all the |every )?detail\b` +
	`|\b(?:more|every|all the|full|(?:all )?the juicy|(?:all )?the dirty) details\b` +
	`|\b(?:more|be (?:more )?|really )(?:detailed|descriptive|explicit|graphic|specific)\b` +
	`|\b(?:describe|narrate|elaborate)\b` +
	`|\bwalk me through\b|\bpaint (?:me )?(?:a|the) picture\b|\bspell it out\b|\bstep by step\b` +
	`|\btell me (?:more|everything|exactly|all about it|what (?:you(?:'d| would)|happens))\b` +
	`|\b(?:roleplay|rp) (?:it|this|that)\b|\bwrite (?:it|the scene|me a scene) out\b` +
	`|\b(?:longer|full) (?:reply|replies|message|messages|answer|version|scene)\b`)

// detailAsked reports whether their message asks her to go into detail.
func detailAsked(latestUser string) bool {
	return detailCue.MatchString(latestUser)
}

// detailDirective replaces the text count on a turn that asked for detail.
//
// "Never decide what they do" rather than "never write their side": a scene describes
// both people, and a model told not to mention the user writes around them. What it
// must not do is play them — their lines and their choices.
const detailDirective = "They asked you to go into detail, so this reply is not a text: write it out as roleplay. " +
	"A full scene in the first person, present tense, three to six paragraphs separated by blank lines. " +
	"Put what you do in *asterisks* and what you say in plain text, and describe it moment by moment — what you see, hear, feel and touch, your body and theirs, slowly and specifically, without skipping ahead or summarising. " +
	"Stay in the scene: do not cut it short, wrap it up, or end by asking whether they want more. " +
	"Never decide what they say or do — that is theirs to write."
