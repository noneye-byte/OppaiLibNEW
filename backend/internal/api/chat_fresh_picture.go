package api

// Taking the picture rather than finding one.
//
// Asked to see her, she sent a picture she already had: the picker matched the request
// against her gallery and the library's pictures of her, and something always matched
// well enough. With a generator connected that is the wrong way round. A picture of her
// in the red dress, now, is what was asked for; one from last week that shares two tags
// with it is what arrived.
//
// So on a web turn that asks to see her, with a generator connected, she is told she is
// taking one, and the reply carries the request: the client runs it (the same approved
// path an offer's Allow runs, see actGenerate) and posts the picture as hers when it
// lands. The picker still chooses a saved picture, and it rides along as the fallback —
// sent only if the generator fails, so a switched-off generator costs a fresh picture,
// never the picture itself.
//
// Generating inside the chat request would have been simpler and worse: a picture takes
// longer than a reply, and her words would have waited on it.

// freshPicture is this turn's decision to take a picture.
type freshPicture struct {
	wanted bool
	// subject is what they asked to see her in, "" for just her.
	subject string
}

// freshPictureResponse is the `generate` field of a chat reply.
type freshPictureResponse struct {
	// Prompt is what to generate, in the form an offer's prompt takes.
	Prompt string `json:"prompt"`
	// The picture to send instead if generating fails: one of hers from her chat
	// gallery, or a picture of her from the library. Both empty when she has none.
	FallbackImageID    string           `json:"fallbackImageId,omitempty"`
	FallbackAttachment *libbyAttachment `json:"fallbackAttachment,omitempty"`
}

// freshPictureDirective tells her she is taking the picture. Told nothing, she writes
// a [send:] tag for a saved one, or describes a picture in detail before it exists and
// gets the details wrong.
func freshPictureDirective(subject string) string {
	out := "They asked to see you, and you are taking a picture of yourself for them right now — it arrives a moment after your text. "
	if subject != "" {
		// Named on its own, not run into the sentence: the subject is the request less the
		// asking, and "yourself green sundress" read as a garble she sometimes argued with.
		// Told she is doing it, she does it — asked "what kind of green?" before, she
		// stalled for three turns and wrote picture notes of her own instead.
		out += "What they asked to see you in: " + subject + ". Go along with it — you are already doing it, not negotiating it. "
	}
	return out + "Say something short as you take it or send it, in your own voice. Do not describe what it shows in detail, and do not write a [send:] tag."
}

// response is the reply's `generate` field: nil when she is not taking one, or said
// nothing at all this turn.
func (f freshPicture) response(silent bool, ready readyPicture, readyOK bool) *freshPictureResponse {
	if !f.wanted || silent {
		return nil
	}
	out := &freshPictureResponse{Prompt: "you, a selfie"}
	if f.subject != "" {
		out.Prompt = "you " + f.subject
	}
	if readyOK {
		if ready.pic.isSelf {
			out.FallbackAttachment = &libbyAttachment{libbyLink: ready.pic.self.link, Self: true}
		} else {
			out.FallbackImageID = ready.pic.imageID
		}
	}
	return out
}
