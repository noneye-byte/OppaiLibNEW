package api

import (
	"regexp"
	"sort"
	"strings"
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

// libraryKindWords are the words that make "show me …" a request for something on
// the shelf rather than for her. userAskedForPhoto is deliberately broad — a false
// positive there only relaxes the repeat rule — but choosing a selfie in advance and
// telling her to describe it is a push, and "show me the beach video" must not be
// answered with a picture of her on the beach.
var libraryKindWords = regexp.MustCompile(`(?i)\b(video|videos|comic|comics|game|games|gif|gifs|clip|clips|movie|movies|episode|episodes|scene|library|item|collection|watch|play|read)\b`)

// askedToSeeHer reports whether the message asks for a picture of *her*: a picture
// request with no library kind named in it.
func askedToSeeHer(text string) bool {
	return userAskedForPhoto(text) && !libraryKindWords.MatchString(text)
}

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

// readyPicture is the picture chosen before she writes, when the user asked to see
// her. She is told what it shows; if she sends one this turn, it is this one.
type readyPicture struct {
	pic pictureRef
	// fit is how well it matched the user's words. Zero means nothing did and the
	// preferences alone chose — "send me a pic" — which she is told, so she does not
	// claim it is what was asked for.
	fit int
}

// pickReadyPicture chooses the picture for a request in the user's own words.
//
// Only the best-fitting tier is in the draw: a request that named something is
// answered with the pictures that fit it best, and the user's preferences decide
// among *those* — never promote something that fits it worse. With nothing fitting
// at all, every picture is equal on fit and the preferences alone choose, exactly as
// "send me a pic" always worked.
func pickReadyPicture(ws chatWorkspace, characterID string, selfPics []selfPicture, request, excludeID string, lastPhoto string, sentPhotos map[string]bool, sentMedia map[int64]bool) (readyPicture, bool) {
	skip := map[string]bool{}
	if lastPhoto != "" {
		skip[lastPhoto] = true
	}
	candidates := pictureCandidates(ws, characterID, selfPics, request, excludeID, skip, sentPhotos, nil, sentMedia)
	if len(candidates) == 0 {
		return readyPicture{}, false
	}
	best := bestScore(candidates)
	pic, ok := drawWeighted(candidates, best, nil)
	if !ok {
		return readyPicture{}, false
	}
	return readyPicture{pic: pic, fit: best}, true
}

// readyPictureDirective tells her what the picture ready to send shows, and that her
// words have to be about that picture and no other. When the request matched nothing
// she is told so, plainly, so she can say "not that one, but here's this" instead of
// captioning a beach picture as the red dress.
func readyPictureDirective(ready readyPicture, asked string) string {
	tags := ready.pic.tags
	if len(tags) > 12 {
		tags = tags[:12]
	}
	handle := readyPictureHandle(ready)
	out := "They asked to see you, and the picture ready to send shows: " + strings.Join(tags, ", ") + ". " +
		"If you send a picture this reply, it is this one and no other: end your reply with [send: " + handle + "]. " +
		"Describe only what is in it — nothing it does not show — and do not invent a different picture. "
	if ready.fit == 0 && strings.TrimSpace(asked) != "" {
		out += "It is not specifically what they asked for; be honest that you do not have that one, and offer this instead or nothing. "
	}
	out += "If you would rather not send one right now, say so and write no tag."
	return out
}

// readyPictureHandle is the tag handle the directive asks her to write for the ready
// picture: its first three tags. The catalogue's example uses the same one on a turn
// with a ready picture, so the two directives never name different pictures.
func readyPictureHandle(ready readyPicture) string {
	tags := ready.pic.tags
	return strings.Join(tags[:min(3, len(tags))], ", ")
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

// photoPickReport is what the reply says about the picture it carries, or did not.
// Diagnostics for the conversation log, so "why did she send that?" has an answer:
// which path chose it, what it was matched against, how well it fitted.
type photoPickReport struct {
	// Source is which path chose it: "ready" (chosen from the user's words before she
	// wrote), "model" (from the tags she wrote), "rescue" (she said she was sending one
	// and nothing fitted), "inferred" (unprompted, her words matched a picture), or ""
	// when nothing was sent.
	Source string `json:"source"`
	// Request is the text the picture was matched against.
	Request string `json:"request,omitempty"`
	// Fit is the winning picture's tag overlap with that text.
	Fit int `json:"fit"`
	// Tags are the winning picture's tags, so the log shows what was actually sent.
	Tags []string `json:"tags,omitempty"`
	// Candidates is how many pictures were in the draw.
	Candidates int `json:"candidates"`
}

// selfDescriptionWords are the words that describe *her* rather than any one picture
// of her: the card's appearance ("long orange hair, glasses") and every tag on at
// least half of her pictures ("1girl", "solo", "orange hair" again). Matching an
// unprompted picture on these is matching it on nothing — a reply that mentions her
// hair fits every picture she has equally — so the unprompted path strips them from
// the text before scoring. See the handler's inferred case.
func selfDescriptionWords(character chatCharacter, ws chatWorkspace, selfPics []selfPicture) map[string]bool {
	words := map[string]bool{}
	for _, feature := range appearanceTags(character.Appearance) {
		for _, word := range strings.Fields(feature) {
			words[word] = true
		}
	}
	var pools [][]string
	for _, img := range ws.Images {
		if img.CharacterID == character.ID && isSelfPicture(img) {
			pools = append(pools, img.Tags)
		}
	}
	for _, pic := range selfPics {
		pools = append(pools, pic.tags)
	}
	for tag, n := range tagFrequency(pools) {
		if len(pools) >= 2 && n*2 >= len(pools) {
			for _, word := range strings.Fields(tag) {
				words[word] = true
			}
		}
	}
	return words
}

// withoutWords is text with the given words removed, for matching on what is left.
// Case-insensitive, whole words only; punctuation stays, which the tokeniser that
// reads the result (requestWords) discards anyway.
func withoutWords(text string, drop map[string]bool) string {
	if len(drop) == 0 {
		return text
	}
	fields := strings.Fields(text)
	kept := fields[:0]
	for _, field := range fields {
		word := strings.ToLower(strings.Trim(field, ".,;:!?\"'()[]*_"))
		if drop[word] {
			continue
		}
		kept = append(kept, field)
	}
	return strings.Join(kept, " ")
}
