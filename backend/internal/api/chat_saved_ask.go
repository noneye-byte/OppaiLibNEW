package api

import "regexp"

// Whether they asked for a picture she already has.
//
// Her saved pictures are the camera's fallback, not a second camera. Given both tools, a
// roleplay model reaches for the saved one — "oh yeah i've got one of those :)" — and
// sends last month's red dress to someone who asked for a purple one, though the tool's
// own description says to take a new one unless they asked for an old one. So the
// server holds the line the description could not: a saved picture goes out when they
// asked for one, and otherwise the request is taken as a shot.

// savedAsk is wording that points at a picture that already exists: again, the one
// from before, the one you sent, a favourite, an old one.
var savedAsk = regexp.MustCompile(`(?i)\b(?:again|resend|re-send|once more|old(?:er)?|saved|earlier|before|last (?:time|night|week)|yesterday|(?:you|u) (?:already )?(?:sent|took|had|showed)|the (?:one|pic|picture|photo|selfie) (?:from|you|where|with)|that (?:one|pic|picture|photo|selfie)|(?:fav(?:ou?rite)?|best) (?:one|pic|picture|photo|selfie)|from (?:your|the) (?:gallery|camera roll|phone))\b`)

// asksForSavedPicture reports whether their message asks for a picture she already has
// rather than a new one.
func asksForSavedPicture(text string) bool {
	return savedAsk.MatchString(text)
}
