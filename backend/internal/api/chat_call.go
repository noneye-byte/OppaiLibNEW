package api

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
