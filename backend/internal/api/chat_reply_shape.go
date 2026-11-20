package api

import (
	"regexp"
	"strings"
)

// What shape a reply takes.
//
// Every reply of hers used to be one of two things: a roll of the dice for one to three
// short texts, or — when the message said "describe" or "in detail" — three to six
// paragraphs of roleplay. Neither is how a person answers. Someone texting "lol" gets a
// word back, not two texts; someone asking how a film ends gets the ending told
// properly, in one longer message, not a burst cut at three; and someone who has been
// writing *what they do* for ten minutes is in a scene and gets a beat of the scene
// back, not "haha yeah" — while "describe the film" is not an invitation to roleplay
// either, which is what the detail directive made of it.
//
// So the turn is read for its register first, and the dice only decide among texts:
//
//   - texts:  texting. One to three short texts, drawn as before (chat_texts.go). A
//     message of a word or two is told it can be answered in kind, or with a reaction.
//   - answer: one fuller message, as long as it takes — for a question that wants
//     telling, explaining or describing rather than a quip.
//   - scene:  roleplay under way, their actions in *asterisks*. One message in that
//     register, a beat or a few paragraphs, as long as theirs was.
//   - detail: they asked for the scene written out in full. The long scene of
//     chat_detail.go, only when there is a scene for it to be.
//
// Everything but texts is one message: not split into bubbles, not cut at a count.

type replyShape int

const (
	shapeTexts replyShape = iota
	shapeAnswer
	shapeScene
	shapeDetail
)

func (r replyShape) String() string {
	switch r {
	case shapeAnswer:
		return "answer"
	case shapeScene:
		return "scene"
	case shapeDetail:
		return "detail"
	}
	return "texts"
}

// oneMessage says the reply arrives whole: no blank-line split into texts, no cap.
func (r replyShape) oneMessage() bool { return r != shapeTexts }

// shapeInput is what the shape is read from.
type shapeInput struct {
	task chatTask
	// latest is their message this turn; previous their one before it; herLast her
	// last message before it. A scene is a register both sides are writing in, and a
	// "yes" inside one is still inside it.
	latest, previous, herLast string
	// mode is the conversation's stored mode; intensity its heat, 1 to 5.
	mode      string
	intensity int
}

var (
	// actionSpan is a span in single asterisks: *smiles*, *pulls you closer*. Bold
	// (**…**) is not one.
	actionSpan = regexp.MustCompile(`(?:^|[^*])\*([^*\n]{2,160})\*(?:[^*]|$)`)
	// answerCue is a question that wants telling rather than a quip. "How was your day"
	// is not on it: that is small talk, and a paragraph back reads as a form being
	// filled in.
	answerCue = regexp.MustCompile(`(?i)\b(?:tell me (?:about|more|the story|what happened|how)|explain|what(?:'s| is| was| were) (?:it|that|this|the [\w ]{1,20}?|your [\w ]{1,20}?) (?:like|about)|how (?:does|do|did|would|could|can|should) (?:it|that|this|you|i|we|they|the|a|one)\b|why (?:do|does|did|is|are|was|were|would|not|don't|didn't)\b|what happened|what do you (?:think|reckon|make) (?:of|about)|how come|what(?:'s| is| was) the (?:story|plot|deal|ending|point)|describe|recap|summari[sz]e|any (?:tips|advice|ideas|recommendations)|what would you (?:do|say|pick|choose)|how (?:it|that) (?:works|ends|went))\b`)
	// sceneAsk is a request for detail that is a request for a scene: something done,
	// to or with them, rather than something described.
	sceneAsk = regexp.MustCompile(`(?i)\b(?:scene|roleplay|rp|what (?:you(?:'d| would)|happens)|to me|with me|on me|your body|undress|touch|kiss|fuck|sex|bed)\b`)
)

// hasAction reports whether a message is written as roleplay — what they do, in
// asterisks. A starred span of two or more words is an action; a single starred word is
// one only where an action sits, at the start or end of the message, because in the
// middle of a sentence ("that was *so* good") it is emphasis.
func hasAction(text string) bool {
	text = strings.TrimSpace(text)
	for _, m := range actionSpan.FindAllStringSubmatchIndex(text, -1) {
		inner := strings.TrimSpace(text[m[2]:m[3]])
		if inner == "" {
			continue
		}
		if len(strings.Fields(inner)) >= 2 {
			return true
		}
		before := strings.TrimSpace(text[:m[2]-1])
		after := strings.TrimSpace(text[m[3]+1:])
		if before == "" || after == "" {
			return true
		}
	}
	return false
}

// briefMessage is a message that is a word or two and asks nothing: "lol", "night!",
// "omg yes". It is answered in kind.
func briefMessage(text string) bool {
	text = strings.TrimSpace(text)
	return text != "" && len(strings.Fields(text)) <= 3 && !strings.Contains(text, "?")
}

// readReplyShape decides the shape of this reply.
func readReplyShape(in shapeInput) replyShape {
	switch in.task {
	case taskReaction, taskObservation, taskPlanning, taskAutonomous, taskAfterglow:
		// A beat about a picture, a private thought, speaking first: texts, whatever the
		// message said — the count for these is already one or two.
		return shapeTexts
	}
	inScene := hasAction(in.latest) || (hasAction(in.previous) && hasAction(in.herLast)) || in.mode == "roleplay"
	if detailAsked(in.latest) {
		if inScene || in.intensity >= 3 || in.mode == "horny" || sceneAsk.MatchString(in.latest) {
			return shapeDetail
		}
		// "Describe the film", "tell me everything about it": told at length, not acted.
		return shapeAnswer
	}
	if inScene {
		return shapeScene
	}
	// Ahead of brevity: "what's the plot" is three words that want the plot told.
	if answerCue.MatchString(in.latest) {
		return shapeAnswer
	}
	return shapeTexts
}

// noQuestionTic is said with every shape. A model ends nearly every message on a
// question to keep things going, which is the most recognisable thing a chatbot does
// and the least like texting a person.
const noQuestionTic = " You do not have to end on a question; most of the time, don't."

// briefDirective is added to the text count when their message was a word or two.
const briefDirective = "They sent a few words, so a few words back is a whole reply — or only a reaction, when that says it."

// answerDirective is the shape of an answer.
const answerDirective = "They asked something that wants a real answer, so this reply is one message rather than a burst of texts — no blank lines splitting it into several. " +
	"Say it properly, as long as it takes and no longer: a few sentences, or two or three short paragraphs when there is that much to tell. " +
	"In your own voice and your own opinion, the way you would tell a friend — not a list, not headings, not an essay. Every word is yours: never write their side."

// longAnswerDirective is the shape of an answer they asked to have in detail.
const longAnswerDirective = "They asked you to go into detail, so this reply is one long message: describe it fully — what it is, what it looks and feels like, the parts worth telling, specifically and vividly, in two to five paragraphs separated by blank lines. " +
	"In your own voice, the way you would tell a friend, not a list or a report. Do not cut it short or end by asking whether they want more. Every word is yours: never write their side."

// sceneDirective is the shape of a reply inside a scene.
const sceneDirective = "You are in a scene with them, written as roleplay: what you do in *asterisks*, what you say in plain text. " +
	"Answer in that register as one message, in the first person and the present tense. Take the scene one step on from what they just did — react to it, do something, say something — and match their length: a line of action gets a short beat back, a paragraph gets a paragraph or two. " +
	"Stay in the moment rather than skipping ahead or summing up. Never decide what they say or do — that is theirs to write."

// shapeDirective is what the turn is told about its shape. texts is the drawn count, read
// only for shapeTexts. Libby only: a card character always answers in one message and
// is told so by the card and chat_detail.go.
func shapeDirective(shape replyShape, latest string, texts int) string {
	switch shape {
	case shapeDetail:
		return detailDirective
	case shapeScene:
		return sceneDirective
	case shapeAnswer:
		if detailAsked(latest) {
			return longAnswerDirective + noQuestionTic
		}
		return answerDirective + noQuestionTic
	}
	d := textCountDirective(texts)
	if briefMessage(latest) {
		d += " " + briefDirective
	}
	return d + noQuestionTic
}
