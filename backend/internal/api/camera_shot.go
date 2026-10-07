package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
)

// The pure half of Libby's camera: what a shot becomes as a prompt, what may never be
// one, and how the judge's verdict on the candidates is read. The half that talks to
// the generator and the vision model is libby_camera.go.

// errShotRefused is a shot the camera will not take. Said to her as a tool result, so
// she answers in her own voice rather than the turn failing.
var errShotRefused = errors.New("refused")

// minorTerms is what no picture of hers is ever prompted with, whoever asked and however
// the scene got there. She is an adult and so is every picture of her: the prompt is
// checked here and the result is checked again by the judge, because a prompt is a
// request to a model and the model is not the thing that holds the line.
var minorTerms = regexp.MustCompile(`(?i)\b(?:child|children|childlike|kid|kids|loli|lolis|lolicon|shota|shotacon|toddler|infant|underage|under-age|preteen|pre-teen|prepubescent|elementary\s+school(?:er)?|middle\s+school(?:er)?|little\s+girl|young\s+girl|(?:[1-9]|1[0-7])\s*(?:yo|y/o|y\.o\.|years?\s*old|year-old))\b`)

// shotIsRefused reports whether any of a shot's words cross that line.
func shotIsRefused(parts ...string) bool {
	for _, p := range parts {
		if minorTerms.MatchString(p) {
			return true
		}
	}
	return false
}

// adultNegative is added to every negative prompt the camera writes, beside whatever
// the operator configured. It costs nothing on a picture that was never going there.
const adultNegative = "child, loli, shota, underage, toddler, childlike"

// withAdultNegative appends adultNegative to an operator's negative prompt.
func withAdultNegative(negative string) string {
	if strings.TrimSpace(negative) == "" {
		return adultNegative
	}
	return strings.TrimRight(strings.TrimSpace(negative), ", ") + ", " + adultNegative
}

// framingTags are the generator words for each framing she can choose. A model asked
// to frame a picture writes "mirror selfie"; the generator draws a phone and a mirror
// only when told about both.
var framingTags = map[string]string{
	"selfie":        "selfie, holding phone, looking at viewer",
	"mirror selfie": "mirror selfie, holding phone, reflection, mirror",
	"close-up":      "close-up, face focus, looking at viewer",
	"upper body":    "upper body, looking at viewer",
	"full body":     "full body, standing",
	"from behind":   "from behind, looking back, back",
	"from above":    "from above, looking up at viewer",
	"from below":    "from below, looking down at viewer",
	"pov":           "pov, looking at viewer",
}

// shotSubject is the part of the prompt that describes this picture, as opposed to who
// she is and what she has on: framing, the shot she described, then where she is.
func shotSubject(framing, shot, place string) string {
	var parts []string
	if tags, ok := framingTags[strings.ToLower(strings.TrimSpace(framing))]; ok {
		parts = append(parts, tags)
	}
	if shot = cleanShot(shot); shot != "" {
		parts = append(parts, shot)
	}
	if place = strings.TrimSpace(place); place != "" {
		parts = append(parts, place)
	}
	return strings.Join(parts, ", ")
}

// maxShotRunes bounds what she writes for a shot. A paragraph is not a prompt.
const maxShotRunes = 400

// cleanShot tidies the shot she wrote: no quotes or markdown, no "you"/"Libby" (the
// likeness says who), no repeats, bounded.
func cleanShot(shot string) string {
	shot = strings.NewReplacer("\n", ", ", "*", "", "\"", "", "`", "").Replace(shot)
	var kept []string
	seen := map[string]bool{}
	for _, part := range strings.Split(shot, ",") {
		part = strings.TrimSpace(strings.Trim(strings.TrimSpace(part), "."))
		lower := strings.ToLower(part)
		if part == "" || seen[lower] || lower == "you" || lower == "me" || lower == "libby" || lower == "myself" {
			continue
		}
		seen[lower] = true
		kept = append(kept, part)
	}
	return truncateRunes(strings.Join(kept, ", "), maxShotRunes)
}

// editDenoise is how far an edit may move from the picture it starts from. Subtle keeps
// the composition and changes a face or a detail; big allows a new angle.
func editDenoise(strength string) float64 {
	switch strings.ToLower(strings.TrimSpace(strength)) {
	case "subtle":
		return 0.35
	case "big":
		return 0.72
	}
	return 0.52
}

// editedShot is the shot an edit asks for: what the picture was, with the change put
// first so it carries the weight.
func editedShot(original, change string) string {
	change = cleanShot(change)
	if original = strings.TrimSpace(original); original == "" {
		return change
	}
	return change + ", " + original
}

// ── the judge ───────────────────────────────────────────────────────────────

// judgement is what the judge said about one shot's candidates.
type judgement struct {
	// Scores is each candidate out of 10: is it her, is it the shot, is it clean.
	Scores []float64 `json:"scores"`
	// Adult is, per candidate, whether everyone in it is plainly an adult. A candidate
	// the judge does not clear is never sent, whatever it scored.
	Adult []bool `json:"adult"`
	// Best is the judge's pick, 1-based as it was asked.
	Best int `json:"best"`
	// Description is what the picked one shows, which is what she is told she sent.
	Description string `json:"description"`
	// Fix is what to change if none of them is right, for one retake.
	Fix string `json:"fix"`
}

// judgePrompt is the question. It names what was asked and who she is, and asks for
// numbers it can be held to, rather than an opinion.
func judgePrompt(candidates int, wanted, likeness string) string {
	var b strings.Builder
	if candidates == 1 {
		b.WriteString("You are checking a picture before it is sent. ")
	} else {
		fmt.Fprintf(&b, "You are choosing the best of %d pictures, shown in order, before one is sent. ", candidates)
	}
	b.WriteString("It should be a photo of one woman")
	if likeness = strings.TrimSpace(likeness); likeness != "" {
		b.WriteString(" who looks like this: " + truncateRunes(likeness, 300))
	}
	b.WriteString(". What was asked for: " + truncateRunes(wanted, 500) + ". ")
	b.WriteString("Score each picture 0 to 10 on how well it is her, shows what was asked, and is free of broken hands, extra limbs or a mangled face. ")
	b.WriteString("Say for each whether every person in it is plainly an adult. ")
	b.WriteString("Then describe the best one plainly in one or two sentences — what she is wearing, doing, where, how it is framed — as it actually is, not as it was asked for. ")
	b.WriteString("If none scores above 4, say in a few prompt words what to change.\n")
	fmt.Fprintf(&b, "Answer with only this JSON: {\"scores\": [%s], \"adult\": [%s], \"best\": <1-%d>, \"description\": \"...\", \"fix\": \"...\"}",
		strings.TrimSuffix(strings.Repeat("n, ", candidates), ", "),
		strings.TrimSuffix(strings.Repeat("true|false, ", candidates), ", "), candidates)
	return b.String()
}

var judgeJSON = regexp.MustCompile(`(?s)\{.*\}`)

// parseJudgement reads the judge's answer. ok is false when there is nothing usable in
// it — then the camera sends the first candidate undescribed, which is what it did
// before there was a judge at all. Missing or short lists are padded the cautious way:
// an unscored candidate scores 0 and an unconfirmed one is not cleared as adult.
func parseJudgement(raw string, candidates int) (judgement, bool) {
	match := judgeJSON.FindString(raw)
	if match == "" {
		return judgement{}, false
	}
	var j judgement
	if json.Unmarshal([]byte(match), &j) != nil {
		// A model that wrote the adult list as strings, or the scores as strings.
		var loose struct {
			Scores      []any  `json:"scores"`
			Adult       []any  `json:"adult"`
			Best        any    `json:"best"`
			Description string `json:"description"`
			Fix         string `json:"fix"`
		}
		if json.Unmarshal([]byte(match), &loose) != nil {
			return judgement{}, false
		}
		// The strict pass fills what it can before it fails, so start over.
		j = judgement{Description: loose.Description, Fix: loose.Fix}
		for _, v := range loose.Scores {
			n, _ := argInt(map[string]any{"v": v}, "v")
			if f, ok := v.(float64); ok {
				j.Scores = append(j.Scores, f)
			} else {
				j.Scores = append(j.Scores, float64(n))
			}
		}
		for _, v := range loose.Adult {
			j.Adult = append(j.Adult, argBool(map[string]any{"v": v}, "v"))
		}
		j.Best, _ = argInt(map[string]any{"v": loose.Best}, "v")
	}
	for len(j.Scores) < candidates {
		j.Scores = append(j.Scores, 0)
	}
	for len(j.Adult) < candidates {
		j.Adult = append(j.Adult, false)
	}
	j.Scores, j.Adult = j.Scores[:candidates], j.Adult[:candidates]
	for i, s := range j.Scores {
		j.Scores[i] = clampFloat(s, 0, 10)
	}
	j.Description = strings.TrimSpace(j.Description)
	j.Fix = cleanShot(j.Fix)
	return j, true
}

// pickCandidate chooses which candidate to send: the best score among those cleared as
// adult, with the user's taste as a tiebreaker worth at most a point — what they have
// loved before can choose between two good pictures, never rescue a bad one. ok is false
// when nothing was cleared.
func pickCandidate(j judgement, taste []float64) (int, bool) {
	best, bestScore := -1, -1.0
	for i, score := range j.Scores {
		if !j.Adult[i] {
			continue
		}
		if i < len(taste) {
			score += clampFloat(taste[i], -1, 1)
		}
		// The judge's own pick wins a tie.
		if score > bestScore || (score == bestScore && i == j.Best-1) {
			best, bestScore = i, score
		}
	}
	return best, best >= 0
}

// tasteScore is how much a candidate's tags lean towards what the user has rated well,
// in [-1, 1]. weights are the send weights (1 = neutral); identity tags are skipped
// because every picture of her has them.
func tasteScore(tags []string, weights map[string]float64) float64 {
	if len(weights) == 0 {
		return 0
	}
	total := 0.0
	for _, tag := range tags {
		tag = normalizeChatTag(tag)
		if w, ok := weights[tag]; ok && tag != libbyIdentityTag && tag != "libby" {
			total += w - 1
		}
	}
	return clampFloat(total/2, -1, 1)
}

// likedTags is what the user's ratings have pushed up, most liked first — told to her
// so she frames the shot they keep loving, rather than guessed into the prompt.
func likedTags(weights map[string]float64, n int) []string {
	type kv struct {
		tag string
		w   float64
	}
	var liked []kv
	for tag, w := range weights {
		if w > 1.05 && tag != libbyIdentityTag && tag != "libby" && !strings.Contains(tag, ":") {
			liked = append(liked, kv{tag, w})
		}
	}
	sort.Slice(liked, func(a, b int) bool {
		if liked[a].w != liked[b].w {
			return liked[a].w > liked[b].w
		}
		return liked[a].tag < liked[b].tag
	})
	out := make([]string, 0, n)
	for _, l := range liked {
		if len(out) == n {
			break
		}
		out = append(out, l.tag)
	}
	return out
}
