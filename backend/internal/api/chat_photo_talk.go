package api

import (
	"regexp"
	"strings"
)

// Talking about a picture, as opposed to sending one.
//
// Asked "what are you doing in that photo?" she had two problems. The history told her
// the picture showed six of its tags — the cap that keeps a long history short — so she
// was describing a picture she could see a third of. And the word "photo" read as a
// request to be shown one, so a *new* picture was chosen and she was told to describe
// that instead, which is how a question about the red dress was answered with a
// description of the cat ears. The transcript she was working from then had "[send:
// red eyes, pixel art]" as her own earlier message, because the tag-only reply had
// never been scrubbed, so there was not even a caption to fall back on.
//
// So: a message about a picture is told apart from a message asking for one. When it
// is about one — a reply to a message that carried a picture, or "that photo", "this
// pic", "the story behind it" with no request for another — the picture is resolved
// to the message it was in and she is handed everything it shows, uncapped, with the
// instruction to answer from that as a memory of her own. And on that turn no picture
// is chosen in advance and none rides along uninvited: she is being asked to talk.

// pictureNoun is the vocabulary for a picture in the user's mouth.
const pictureNoun = `(?:photo|photos|pic|pics|picture|pictures|selfie|selfies|image|images|snap|snaps|shot|gif)`

// aboutPictureCue reads a message as being about a particular picture: a
// demonstrative within reach of a picture word, in either order. "in that photo",
// "this pic", "what is this a photo of", "the story behind that one you sent".
var aboutPictureCue = regexp.MustCompile(`(?i)\b(?:that|this|the|your|it)\b[^.?!\n]{0,40}?\b` + pictureNoun + `\b|\b` + pictureNoun + `\b[^.?!\n]{0,40}?\b(?:that|this|it|behind|about|of)\b`)

// anotherPictureCue reads a message as asking for a picture to be *sent*, which
// outranks it merely being about one: "send me the photo of you in the red dress"
// mentions a picture and wants one, and the ready-picture path is the right answer.
var anotherPictureCue = regexp.MustCompile(`(?i)\b(?:another|again|one more|more|new one|different|next|other one|send|show|let me see|see you|take one|take a|give me|got any|any more)\b`)

// askedAboutPicture reports whether the message is about a picture already in the
// conversation rather than asking for one.
func askedAboutPicture(text string) bool {
	return aboutPictureCue.MatchString(text) && !anotherPictureCue.MatchString(text)
}

// pictureInQuestion finds the message whose picture their latest one is about.
//
// A quoted reply settles it: if the message they replied to carried a picture, that is
// the picture, whatever the words. Otherwise, when the words are about a picture, it is
// the most recent message in the history that carried one — hers or theirs — which is
// what "that photo" means in a chat.
func pictureInQuestion(messages []chatMessage) (chatMessage, bool) {
	if len(messages) == 0 {
		return chatMessage{}, false
	}
	latest := messages[len(messages)-1]
	if ref := latest.ReplyTo; ref != nil && ref.ID != "" {
		for i := len(messages) - 2; i >= 0; i-- {
			if messages[i].ID == ref.ID {
				if messages[i].ImageID != "" || len(messages[i].MediaIDs) > 0 {
					return messages[i], true
				}
				break
			}
		}
	}
	if !askedAboutPicture(latest.Content) {
		return chatMessage{}, false
	}
	for i := len(messages) - 2; i >= 0; i-- {
		if messages[i].ImageID != "" || len(messages[i].MediaIDs) > 0 {
			return messages[i], true
		}
	}
	return chatMessage{}, false
}

// maxPictureInQuestionTags bounds the tags she is handed for the picture in question.
// Well above the history's cap: this is the one picture the turn is about, and every
// tag is something she can say about it.
const maxPictureInQuestionTags = 32

// pictureInQuestionDirective tells her which picture they mean and everything it
// shows, and that the reply is about that picture.
//
// It is worded as a memory rather than a caption because that is what makes the
// answer hers: a model handed a tag list and asked what the picture is reads the list
// back. Told it is a picture of herself and asked what she had on and what she was
// doing, it answers as a person who was there.
func pictureInQuestionDirective(m chatMessage, d historyDescriber) string {
	theirs := m.Role != "assistant"
	if m.ImageID != "" {
		tags := d.images[m.ImageID]
		if len(tags) > maxPictureInQuestionTags {
			tags = tags[:maxPictureInQuestionTags]
		}
		if theirs {
			out := "\n\nThe picture they are asking about is one they shared with you"
			if len(tags) > 0 {
				out += ", and everything it shows is: " + strings.Join(tags, ", ")
			}
			return out + ". Answer about that picture — what is in it, what you make of it — and do not send one of your own for this unless they ask to see you."
		}
		out := "\n\nThe picture they are asking about is one you sent earlier"
		if len(tags) > 0 {
			out += ", and everything it shows is: " + strings.Join(tags, ", ")
		} else {
			out += "; nothing more is known about what it shows, so say what you remember of taking it and no more"
		}
		return out + ". That is you in it. Answer from those tags in your own words, as a memory of your own — what you had on, what you were doing, where you were, how you felt taking it — never as a list, and never claiming anything the tags do not show. " +
			"This is a turn for talking about that picture: do not send another one unless they ask to see you."
	}
	for _, id := range m.MediaIDs {
		item, ok := d.mediaFull[id]
		if !ok {
			continue
		}
		tags := item.tags
		if len(tags) > maxPictureInQuestionTags {
			tags = tags[:maxPictureInQuestionTags]
		}
		what := "\"" + item.title + "\" (" + item.kind
		if len(tags) > 0 {
			what += "; " + strings.Join(tags, ", ")
		}
		what += ")"
		switch {
		case item.self && !theirs:
			return "\n\nThe picture they are asking about is one you sent earlier, and everything it shows is: " + what + ". That is you in it. " +
				"Answer from those tags in your own words, as a memory of your own — what you had on, what you were doing, where you were — never as a list, and never claiming anything the tags do not show. " +
				"This is a turn for talking about that picture: do not send another one unless they ask to see you."
		case theirs:
			return "\n\nWhat they are asking about is something they attached from the library: " + what + ". Talk about that item — it is on their shelves, not a picture of you — and hand nothing else over for this unless they ask."
		default:
			return "\n\nWhat they are asking about is something you handed over from the library earlier: " + what + ". Talk about that item from its title and tags — it is on their shelves, not a picture of you — and hand nothing else over for this unless they ask."
		}
	}
	return ""
}

// photoNarrationCue reads a reply, before scrubbing, as having *said* it was sending a
// picture — "*sends you a pic*", "here's a selfie", "took one for you" — which is the
// case the unprompted picture path exists for: the narration is scrubbed, and the
// picture it announced has to arrive or the reply reads as a promise broken.
//
// A reply that never mentioned a picture is not sending one. Before this gate her
// prose was matched against her gallery's tags on every turn, and a paragraph that
// mentioned her orange hair and her phone met the three-word floor against a picture
// tagged "orange hair, phone" — a selfie nobody asked for and she never said she took.
var photoNarrationCue = regexp.MustCompile(`(?i)\b(?:photo|photos|pic|pics|picture|pictures|selfie|selfies|snap|snaps|image|images|nude|nudes|camera|took one|take one|taking one)\b|\[\s*(?:send|show|snap|photo|pic|image)\b`)

// sheSaidSheWasSending reports whether the reply, as the model wrote it, spoke of a
// picture at all.
//
// A catalogue line she copied is not her speaking of one: "(video; 1girl, …, photo
// (medium), …)" has "photo" in it because a tag does, and reading that as narration is
// how a question about a video was answered with a selfie tagged like the video.
func sheSaidSheWasSending(raw string) bool {
	return photoNarrationCue.MatchString(strayCatalogueNote.ReplaceAllString(raw, ""))
}
