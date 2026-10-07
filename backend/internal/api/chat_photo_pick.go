package api

import (
	"sort"
	"strings"
	"unicode"
)

// Sending the picture that was asked for.
//
// Asked for "you in the red dress", she sent the right picture about one time in four,
// and on the other three she sent something else with a caption describing the red
// dress — or gave up and offered to generate one. Three things were wrong, and they
// compounded.
//
// The scoring was too loose. A request counted one point per word landing in any tag,
// so "red dress" against a picture tagged "red hair, black dress" scored the same as
// against one tagged "red dress". The draw was then weighted by fit *squared*, which
// was designed to let preferences matter for "send me a pic" and did — but it also let
// eight pictures that half-fitted outvote the one that fitted, which is exactly the
// one-in-four.
//
// The order was backwards. She wrote the reply first, describing what she was about
// to send, and the picture was chosen afterwards from the tags she wrote. Whatever she
// described, the draw could land elsewhere, and then her words were about a picture
// the user was not looking at.
//
// And when the user asked, her own words were the only query. If she paraphrased the
// request — [send: dress] — the colour was gone before matching began.
//
// So, when the user asks to see her, the picture is chosen *before* she writes, from
// the user's own words, among only the pictures that fit best; she is told what it
// shows; and her reply describes that. When she sends one unprompted, she still picks
// by tags, but a whole tag matching a whole phrase now outranks its words scattered
// over several. Every send is reported back to the client with why it was chosen, so
// a wrong picture is a thing that can be read off the reply rather than guessed at.

// pictureRef is one picture she could send, from either pool: her chat gallery, by
// id, or a library picture recognised as her. One type so the two pools can be drawn
// from together, on one scale, rather than the gallery always winning a tie.
type pictureRef struct {
	imageID string
	self    selfPicture
	isSelf  bool
	tags    []string
}

// pictureCandidates gathers everything she could send that fits text, from both pools,
// each with its preference weight and its recency penalty applied. The exclude and
// skip sets are the gallery's; skipMedia and sentMedia the library's — the same
// bookkeeping the two pools always had, merged into one list.
func pictureCandidates(ws chatWorkspace, characterID string, selfPics []selfPicture, text, excludeID string, skip, sent map[string]bool, skipMedia, sentMedia map[int64]bool) []weightedCandidate[pictureRef] {
	var out []weightedCandidate[pictureRef]
	for _, c := range galleryCandidates(ws, characterID, text, excludeID, skip, sent) {
		var tags []string
		for _, img := range ws.Images {
			if img.ID == c.item {
				tags = img.Tags
				break
			}
		}
		out = append(out, weightedCandidate[pictureRef]{item: pictureRef{imageID: c.item, tags: tags}, score: c.score, weight: c.weight})
	}
	for _, c := range selfPictureCandidates(ws, selfPics, text, skipMedia, sentMedia) {
		out = append(out, weightedCandidate[pictureRef]{item: pictureRef{self: c.item, isSelf: true, tags: c.item.tags}, score: c.score, weight: c.weight})
	}
	return out
}

// subjectGlue are the words a subject is phrased with rather than made of: "in the
// tub with bubbles" is about a tub and bubbles. Kept inside a subject, since the
// generator reads better with them, and trimmed from its ends.
var subjectGlue = map[string]bool{
	"in": true, "on": true, "at": true, "the": true, "a": true, "an": true, "with": true,
	"wearing": true, "and": true, "of": true, "your": true, "my": true, "from": true,
	"while": true, "as": true, "doing": true, "into": true, "by": true, "under": true,
}

// pictureRequestSubject is what they asked to see her *in* — the request less the
// asking — or "" when they asked to see her and nothing more. Non-empty with a ready
// picture that fits it not at all means the picture they asked for does not exist.
func pictureRequestSubject(asked string) string {
	fields := strings.Fields(strings.ToLower(asked))
	kept := make([]string, 0, len(fields))
	for _, field := range fields {
		word := strings.Trim(field, ".,;:!?\"'()[]*_…")
		// Emoticons are not a subject: "please :3" put a 3 in the picture's prompt.
		if word == "" || pictureAskWords[word] || !strings.ContainsFunc(word, unicode.IsLetter) {
			continue
		}
		if mended, ok := subjectSpelling[word]; ok {
			word = mended
		}
		kept = append(kept, word)
	}
	for len(kept) > 0 && subjectGlue[kept[0]] {
		kept = kept[1:]
	}
	for len(kept) > 0 && subjectGlue[kept[len(kept)-1]] {
		kept = kept[:len(kept)-1]
	}
	if len(kept) == 0 {
		return ""
	}
	return strings.Join(kept, " ")
}

// scoreTagsWeighted is the tag overlap between a request and a picture with the
// whole-tag rule: a multi-word tag whose every word is in the request counts one
// extra, so "red dress" against the tag "red dress" (3) beats it against "red hair"
// and "black dress" (2). Words still count singly, so a request that names only part
// of a tag still reaches it.
func scoreTagsWeighted(words map[string]bool, tags []string) int {
	score := 0
	for _, tag := range tags {
		fields := strings.Fields(tag)
		hit, considered := 0, 0
		for _, word := range fields {
			if len(word) < 3 {
				continue
			}
			considered++
			if words[word] {
				hit++
			}
		}
		score += hit
		if considered >= 2 && hit == considered {
			score++
		}
	}
	return score
}

// catalogueTags orders one picture's tags for the catalogue: the ones the user's
// latest message names first, then the rarer ones — a tag on every picture in the
// gallery distinguishes nothing — and the rest in the order they came. The catalogue
// shows only the first handful, so which handful decides whether "red dress" is a
// picture she knows she has.
func catalogueTags(tags []string, wanted map[string]bool, frequency map[string]int) []string {
	out := make([]string, len(tags))
	copy(out, tags)
	rank := func(tag string) (int, int) {
		named := 1
		for _, word := range strings.Fields(tag) {
			if len(word) >= 3 && wanted[word] {
				named = 0
				break
			}
		}
		return named, frequency[strings.ToLower(tag)]
	}
	sort.SliceStable(out, func(i, j int) bool {
		ni, fi := rank(out[i])
		nj, fj := rank(out[j])
		if ni != nj {
			return ni < nj
		}
		return fi < fj
	})
	return out
}

// tagFrequency counts how many pictures each tag appears on, for catalogueTags.
func tagFrequency(pictures [][]string) map[string]int {
	out := map[string]int{}
	for _, tags := range pictures {
		seen := map[string]bool{}
		for _, tag := range tags {
			key := strings.ToLower(tag)
			if seen[key] {
				continue
			}
			seen[key] = true
			out[key]++
		}
	}
	return out
}

// pictureAskWords are the words a request to see her is made of, none of which
// describe a picture: "can you send me a snap of you in the tub with bubbles" less
// these is "tub bubbles", and "send me a pic of you" less these is nothing. Kept apart
// from the ready pick's own matching, which must keep every word: "nude" is a tag.
//
// "nude" is not one of them. It was, as the name of a kind of picture, and "send me a
// picture of you nude" reached the generator as "you, a selfie" — which dressed her in
// whatever she had on, and a nude came back in shorts.
var pictureAskWords = map[string]bool{
	"can": true, "could": true, "would": true, "will": true, "you": true, "u": true, "me": true, "i": true,
	"please": true, "pls": true, "hey": true, "babe": true, "libby": true, "now": true, "again": true,
	"send": true, "sends": true, "show": true, "give": true, "take": true, "snap": true, "shoot": true,
	"get": true, "text": true, "share": true, "see": true, "let": true, "want": true, "wanna": true,
	"need": true, "like": true, "love": true, "to": true, "another": true,
	"one": true, "more": true, "some": true, "yourself": true, "that": true,
	"this": true, "for": true, "it": true, "is": true, "be": true,
	"pic": true, "pics": true, "picture": true, "pictures": true, "photo": true, "photos": true,
	"selfie": true, "selfies": true, "snaps": true, "image": true, "images": true, "shot": true,
	"quick": true, "new": true, "little": true, "cute": true, "sexy": true,
	"hot": true, "nice": true, "right": true, "real": true, "actual": true, "just": true, "also": true,
	"how": true, "what": true, "about": true, "lets": true, "let's": true, "say": true, "maybe": true,
	"ok": true, "okay": true, "then": true, "instead": true,
	// Texting shorthand for "now" and "please". "send me a pic of you rn" reached the
	// generator as "you rn", which describes nothing.
	"rn": true, "rq": true, "atm": true, "currently": true, "plz": true, "pleaseee": true,
	"gimme": true, "lemme": true, "ya": true, "ur": true,
}

// subjectSpelling mends the misspellings that decide what she is wearing. "sundres"
// was not a garment, so the picture of her in one was blended with the tank top she
// had on, and a tank top is what it showed.
var subjectSpelling = map[string]string{
	"nudes": "nude", "dres": "dress", "sundres": "sundress", "bikiny": "bikini", "lingere": "lingerie",
}
