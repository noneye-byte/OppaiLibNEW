package api

import (
	"regexp"
	"strings"
)

// What she has on, held between turns.
//
// Her clothes used to be decided afresh for every picture: the worn outfit, unless the
// request named something else. So "you in a red dress" came back in the red dress,
// and the next "send me a selfie" came back in the tank top again — she had changed
// out of it between two messages without a word. Undressing was worse: a picture of
// her with nothing on, then one on the sofa, fully clothed.
//
// So what she is wearing is conversation state, like the room she is in and what she
// is doing (libby_backgrounds.go, libby_activities.go): client-owned, sent with each
// turn, and changed only when something changes it. Empty means her own clothes — the
// worn outfit or the bundled wardrobe's tier, exactly as before. "nothing" means
// nothing. Anything else is the clothes, in the few words a generator reads.
//
// Two things change it. She says so with [wearing: …] when she dresses or undresses,
// and a picture she takes of herself in something (clothesFromSubject) leaves her in
// it — asked for the red dress, she is in the red dress until she changes.

// wearingNothing is the state of having nothing on.
const wearingNothing = "nothing"

// maxWearing bounds the state. It rides in every request and into her prompt; a few
// garments is all it ever needs to hold.
const maxWearing = 120

// wearTag is her saying what she has on now. The delimiter is required: "[wearing a
// grin]" is a stage direction, not a change of clothes.
var wearTag = regexp.MustCompile(`(?i)\[\s*(?:wearing|wears|wear|clothes|clothing|dressed|outfit)\s*[:=]\s*([^\]\n]{0,160}?)\s*\]`)

// findWearTag reads the last change of clothes she declared. The last wins for the
// reason the mood's does: a model that writes two is revising.
func findWearTag(reply string) (label string, declared bool) {
	matches := wearTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return "", false
	}
	return matches[len(matches)-1][1], true
}

// ownClothes are the ways of saying she is back in her own things.
var ownClothes = map[string]bool{
	"": true, "usual": true, "my usual": true, "my usual clothes": true, "usual clothes": true, "normal": true,
	"my normal clothes": true, "default": true, "my clothes": true, "my own clothes": true, "regular": true,
	"my outfit": true, "dressed": true, "back in my clothes": true,
}

// noClothes are the ways of saying she has nothing on.
var noClothes = map[string]bool{
	"nothing": true, "none": true, "naked": true, "nude": true, "nothing at all": true, "bare": true,
	"completely naked": true, "birthday suit": true, "not a thing": true,
}

// wearingLead is the preamble a model puts before the clothes themselves.
var wearingLead = regexp.MustCompile(`(?i)^(?:(?:i'?m|i am|now|just|only|wearing|in|into|changed into|a|an|my)\s+)+`)

// normalizeWearing turns what she (or a client) wrote into the state: "" for her own
// clothes, wearingNothing, or the clothes in lowercase words, bounded.
func normalizeWearing(label string) string {
	label = strings.ToLower(strings.TrimSpace(label))
	label = strings.Trim(label, ` "'.!*_~`)
	if ownClothes[label] {
		return ""
	}
	if noClothes[label] {
		return wearingNothing
	}
	if trimmed := strings.TrimSpace(wearingLead.ReplaceAllString(label, "")); trimmed != "" {
		label = trimmed
	}
	if noClothes[label] {
		return wearingNothing
	}
	label = strings.Join(strings.Fields(strings.NewReplacer("[", "", "]", "", "\n", " ").Replace(label)), " ")
	if len(label) > maxWearing {
		label = label[:maxWearing]
		if cut := strings.LastIndexAny(label, ", "); cut > maxWearing/2 {
			label = label[:cut]
		}
	}
	return strings.TrimSpace(label)
}

var (
	garmentMatch = regexp.MustCompile(`(?i)\b(?:` + garmentWords + `)\b`)
	bareMatch    = regexp.MustCompile(`(?i)\b(?:` + bareWords + `)\b`)
	bareScene    = regexp.MustCompile(`(?i)\b(?:` + bareScenes + `)\b`)
)

// garmentStops end the walk back from a garment to its adjectives: "you in a red dress"
// is a red dress, not "you in a red dress".
var garmentStops = map[string]bool{
	"a": true, "an": true, "the": true, "in": true, "into": true, "wearing": true, "and": true, "with": true,
	"on": true, "at": true, "you": true, "your": true, "me": true, "my": true, "of": true, "her": true,
	"only": true, "just": true, "while": true, "to": true, "for": true, "is": true, "are": true, "but": true,
	"selfie": true, "picture": true, "photo": true, "pic": true, "yourself": true, "or": true, "no": true,
}

// clothesFromSubject is what a picture of her leaves her wearing, when it says: the
// garments it names with the words that describe them, or nothing for a picture of her
// undressed or in the bath. ok is false when the subject does not settle it — "you on
// the balcony", or a hot tub, which could be a swimsuit or nothing.
func clothesFromSubject(subject string) (wearing string, ok bool) {
	var phrases []string
	seen := map[string]bool{}
	for _, loc := range garmentMatch.FindAllStringIndex(subject, -1) {
		words := strings.Fields(strings.ToLower(subject[:loc[0]]))
		start := len(words)
		for start > 0 && len(words)-start < 3 {
			word := strings.Trim(words[start-1], ",.;:!?\"'()")
			if word == "" || garmentStops[word] || word != words[start-1] {
				break
			}
			start--
		}
		phrase := strings.Join(append(words[start:], strings.ToLower(subject[loc[0]:loc[1]])), " ")
		if !seen[phrase] {
			seen[phrase] = true
			phrases = append(phrases, phrase)
		}
	}
	bare := bareMatch.MatchString(subject)
	if len(phrases) > 0 {
		// "Naked in her stockings" is the stockings and nothing else.
		if bare {
			return normalizeWearing("nothing but " + strings.Join(phrases, ", ")), true
		}
		return normalizeWearing(strings.Join(phrases, ", ")), true
	}
	if bare || bareScene.MatchString(subject) {
		return wearingNothing, true
	}
	return "", false
}

// wearingGen is the state in generator words.
func wearingGen(wearing string) string {
	if wearing == wearingNothing {
		return "nude, completely naked"
	}
	if rest, ok := strings.CutPrefix(wearing, "nothing but "); ok {
		return "nude, " + rest
	}
	return wearing
}

// wearingDirective tells her what she has on when it is not her own clothes, and how to
// change. The first half replaces the wardrobe line; the second is appended to either.
func wearingDirective(wearing string) string {
	switch wearing {
	case "":
		return ""
	case wearingNothing:
		return "\nRight now you have nothing on — you undressed earlier and have not put anything back on. " +
			"This is what you actually have on; do not describe yourself in clothes until you dress."
	default:
		return "\nRight now you are wearing " + wearing + " — you changed into it earlier, and it is what you still have on. " +
			"Do not describe yourself in anything else until you change."
	}
}

// wearTagDirective is how she changes. Stated as a standing fact like the scene tag,
// for the reason that one is: handed a menu, a model works through it.
const wearTagDirective = " When what you have on changes — you get dressed, undress, take something off, change into something — write [wearing: <what you now have on, in a few words>], " +
	"or [wearing: nothing], or [wearing: usual] once you are back in your own clothes. It stays until you change again. Not per message; never mention it."
