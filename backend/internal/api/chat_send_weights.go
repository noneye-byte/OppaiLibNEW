package api

import (
	"math/rand/v2"
	"sort"
	"strings"
)

// Weighting what she reaches for.
//
// Two things used to decide which picture she sent: the tag overlap with what was
// asked, and — among everything that tied — the newest one. That is why "send me a
// pic" produced the same picture every time, and why every unprompted selfie was the
// same one: the argmax of a stable score over a stable list is a constant. It is also
// why nothing could be *steered*: a user with sixty pictures of her and one favourite
// outfit had no way to say "more of that, less of the beach".
//
// This file is both halves of the fix. Every candidate — a gallery picture, a library
// picture of her, an item to attach — now carries a weight, and the winner is drawn at
// random in proportion to its weight instead of being the first of the best. The weight
// is the fit score, times the user's own preferences, times a penalty for having been
// sent recently. Preferences come from two places the user can edit: a weight on each
// gallery picture ("never", "rarely", "normal", "often"), and a weight on any tag,
// which applies to everything that carries it — gallery pictures, library pictures of
// her, and library items she hands over. Tags are how the app already describes what is
// *in* something, so a tag weight is exactly "more of this, less of that".

// Send-weight vocabulary. A picture or a tag is at one of these; anything else a client
// writes is clamped to the nearest. Zero is "never" and removes the item from the draw
// entirely, which is how a picture stays in the gallery — findable, viewable — without
// ever being sent.
const (
	sendWeightNever  = 0
	sendWeightRarely = 0.35
	sendWeightNormal = 1
	sendWeightOften  = 2.5
	// maxSendWeight bounds what a stack of tag weights can multiply up to. Three "often"
	// tags on one picture should make it very likely, not make everything else vanish.
	maxSendWeight = 12
	// maxSendWeightTags bounds how many tag weights a workspace may store. Well past what
	// anyone would tune by hand, low enough that the map is never a prompt-sized object.
	maxSendWeightTags = 200
)

// clampSendWeight normalises a stored weight: a negative or absurd number from a hand-
// edited file or an older client lands on the nearest thing that means something.
func clampSendWeight(w float64) float64 {
	switch {
	case w <= 0:
		return sendWeightNever
	case w > maxSendWeight:
		return maxSendWeight
	default:
		return w
	}
}

// pictureWeight is what one gallery picture's own weight means. Zero is a picture
// stored before weights existed, and means "normal" rather than "never" — the field is
// omitted from JSON when unset, and a gallery that went silent on upgrade would look
// like data loss. "Never" is stored as a negative number for the same reason.
func pictureWeight(w float64) float64 {
	switch {
	case w == 0:
		return sendWeightNormal
	case w < 0:
		return sendWeightNever
	default:
		return clampSendWeight(w)
	}
}

// tagWeight is the combined preference an item's tags express: the product of every
// weighted tag it carries, one factor per distinct tag, bounded. A tag at "never"
// zeroes it, so "never send anything tagged X" is one entry rather than a per-picture
// chore. Matching is whole-tag, case-insensitive, with the tag's category prefix
// tolerated on either side so "outfit:lingerie" and "lingerie" mean the same thing.
func tagWeight(weights map[string]float64, tags []string) float64 {
	if len(weights) == 0 {
		return 1
	}
	w := 1.0
	seen := map[string]bool{}
	for _, tag := range tags {
		key := sendWeightKey(tag)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		factor, ok := weights[key]
		if !ok {
			// The bare name, when the tag carries a category the stored key does not.
			if _, name, found := strings.Cut(key, ":"); found {
				factor, ok = weights[name]
			}
		}
		if !ok {
			continue
		}
		w *= clampSendWeight(factor)
		if w == 0 {
			return 0
		}
	}
	if w > maxSendWeight {
		w = maxSendWeight
	}
	return w
}

// sendWeightKey is how a tag is stored and looked up: lower-case, trimmed, single
// spaces. The same normalisation on both sides, so "Red Hair" in the editor finds
// "red hair" on the picture.
func sendWeightKey(tag string) string {
	return strings.Join(strings.Fields(strings.ToLower(tag)), " ")
}

// normalizeSendWeights cleans a stored map on the way in: keys normalised, values
// clamped, "normal" entries dropped (they mean nothing), the count bounded.
func normalizeSendWeights(in map[string]float64) map[string]float64 {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]float64, len(in))
	for tag, w := range in {
		key := sendWeightKey(tag)
		if key == "" || len(key) > 80 {
			continue
		}
		w = clampSendWeight(w)
		if w == sendWeightNormal {
			continue
		}
		out[key] = w
	}
	if len(out) > maxSendWeightTags {
		// Deterministic which survive: the alphabetically first. A bounded map that is
		// trimmed at random would lose a different preference on every save.
		keys := make([]string, 0, len(out))
		for key := range out {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys[maxSendWeightTags:] {
			delete(out, key)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// weightedCandidate is one thing she could send and how much it wants to be sent.
type weightedCandidate[T any] struct {
	item   T
	score  int     // how well it fits what was asked; the floor is applied to this
	weight float64 // preferences × recency; zero is out of the draw
}

// recentPenalty is what a picture already sent this conversation is multiplied by when
// it is eligible at all — that is, when the user has asked for a picture and only the
// very last one is withheld outright. Small, not zero: "send me another" should reach
// for something new when there is something new, and only come back round to the old
// ones once the gallery is exhausted.
const recentPenalty = 0.12

// drawWeighted picks one candidate at random in proportion to weight, among those at or
// above the floor. pick is the die: given the total weight it returns a point in
// [0, total), injected so a test can load it. Returns false when nothing is eligible.
//
// Fit is folded into the weight as a multiplier rather than as a strict tier, so a
// picture that fits the request a little less but that the user has marked "often"
// still gets its turn — a pure argmax on fit is exactly the behaviour this replaces.
// But the fit is squared first, so a strong match still dominates a weak one: a
// request for "lingerie, bed" should mostly get lingerie in bed.
func drawWeighted[T any](candidates []weightedCandidate[T], floor int, pick func(total float64) float64) (T, bool) {
	var zero T
	total := 0.0
	eligible := make([]weightedCandidate[T], 0, len(candidates))
	for _, c := range candidates {
		if c.score < floor || c.weight <= 0 {
			continue
		}
		fit := float64(c.score)
		if fit < 1 {
			// Floor 0 is the rescue path: nothing fitted, send something. Every
			// candidate is then equal on fit and the preferences alone decide.
			fit = 1
		}
		c.weight *= fit * fit
		eligible = append(eligible, c)
		total += c.weight
	}
	if len(eligible) == 0 || total <= 0 {
		return zero, false
	}
	if pick == nil {
		pick = rollWeight
	}
	at := pick(total)
	if at < 0 || at >= total {
		at = 0
	}
	for _, c := range eligible {
		if at < c.weight {
			return c.item, true
		}
		at -= c.weight
	}
	return eligible[len(eligible)-1].item, true
}

// rollWeight is the die the chat path uses: a uniform point in [0, total).
func rollWeight(total float64) float64 {
	return rand.Float64() * total
}

// galleryCandidates scores the character's gallery against some text, with each
// picture's full send weight. skip is the hard exclusion (the photo they just shared,
// the picture on screen); sent is the soft one — everything shown this conversation,
// penalised rather than removed.
func galleryCandidates(ws chatWorkspace, characterID, text, excludeID string, skip, sent map[string]bool) []weightedCandidate[string] {
	words := requestWords(text)
	var out []weightedCandidate[string]
	for _, img := range ws.Images {
		if img.CharacterID != characterID || (excludeID != "" && img.ID == excludeID) || skip[img.ID] {
			continue
		}
		// A photo the user shared of something else is in her gallery so she can
		// remember it, not so she can send it as herself. See chat_image_subjects.go.
		if !isSelfPicture(img) {
			continue
		}
		w := pictureWeight(img.Weight) * tagWeight(ws.SendWeights, img.Tags)
		if w <= 0 {
			continue
		}
		if sent[img.ID] {
			w *= recentPenalty
		}
		out = append(out, weightedCandidate[string]{item: img.ID, score: scoreTags(words, img.Tags), weight: w})
	}
	return out
}

// selfPictureCandidates does the same for the library pictures of her. skip is hard
// (already attached and not asked for again); sent is soft, like the gallery's; the
// tag weights are the only preference, since a library item has no gallery weight of
// its own.
func selfPictureCandidates(ws chatWorkspace, pics []selfPicture, text string, skip, sent map[int64]bool) []weightedCandidate[selfPicture] {
	words := requestWords(text)
	var out []weightedCandidate[selfPicture]
	for _, pic := range pics {
		if skip[pic.link.ID] {
			continue
		}
		w := tagWeight(ws.SendWeights, pic.tags)
		if w <= 0 {
			continue
		}
		if sent[pic.link.ID] {
			w *= recentPenalty
		}
		out = append(out, weightedCandidate[selfPicture]{item: pic, score: scoreTags(words, pic.tags), weight: w})
	}
	return out
}

// bestScore is the highest fit among candidates, for weighing one pool against another.
func bestScore[T any](candidates []weightedCandidate[T]) int {
	best := 0
	for _, c := range candidates {
		if c.weight > 0 && c.score > best {
			best = c.score
		}
	}
	return best
}
