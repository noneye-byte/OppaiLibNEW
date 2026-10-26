package api

import (
	"math"
	"net/http"
	"regexp"
	"sort"
	"strings"

	"github.com/youruser/oppailib/internal/models"
)

// A training set, from the library's pictures and their tags.
//
// Every picture the tagger has seen already carries Danbooru-style tags, which is
// exactly the caption format a LoRA for an anime-lineage checkpoint is trained on.
// So the captions are the tags: the trigger word first (the trainer keeps it in
// place while it shuffles the rest), then the picture's tags, strongest first. The
// tags left out are the ones the trigger word is meant to stand for — a character's
// hair and eyes, a style's medium — because a tag that is in every caption is learnt
// as that tag, and the LoRA then only shows the character when the prompt spells
// her out.

// loraTagSkipCategories are tags about the file rather than the picture's content:
// the tagger's safety rating, and "portrait" / "high-res" from the heuristic tagger.
var loraTagSkipCategories = map[string]bool{"rating": true, "meta": true}

// loraTagLimit is how many tags a caption carries. CLIP reads 75 tokens per chunk;
// past forty tags, the last ones are mostly noise the trainer pays for.
const loraTagLimit = 40

// loraCaptionTag is a tag as a prompt writes it: Danbooru's underscores as spaces,
// except in the emoticons (^_^, >_<) where the underscore is the mouth.
func loraCaptionTag(name string) string {
	name = strings.TrimSpace(name)
	if strings.IndexFunc(name, func(r rune) bool { return r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' }) < 0 {
		return name
	}
	return strings.ReplaceAll(name, "_", " ")
}

// loraTagKey is how two spellings of a tag are told to be the same.
func loraTagKey(name string) string {
	return strings.ToLower(strings.Join(strings.Fields(loraCaptionTag(name)), " "))
}

// loraLeaveOut reads the comma-separated tags not to caption.
func loraLeaveOut(list []string) map[string]bool {
	out := map[string]bool{}
	for _, item := range list {
		for _, t := range strings.Split(item, ",") {
			if k := loraTagKey(t); k != "" {
				out[k] = true
			}
		}
	}
	return out
}

// loraCaption is one picture's caption. Mode "trigger" captions with the trigger
// word alone, for a style trained on what the pictures have in common rather than
// what is in each. A played-down tag the picture has is named whatever the mode or
// the leave-out list say, straight after the trigger word so the forty-tag cut never
// takes it: a trait the caption names is learnt as that word, one it does not name
// is learnt as the LoRA — and comes with it unasked.
func loraCaption(trigger string, tags []models.Tag, leaveOut, named map[string]bool, mode string) string {
	trigger = strings.TrimSpace(trigger)
	parts := []string{}
	if trigger != "" {
		parts = append(parts, trigger)
	}
	sorted := loraContentTags(tags)
	seen := map[string]bool{loraTagKey(trigger): true}
	for _, t := range sorted {
		if k := loraTagKey(t.Name); named[k] && !seen[k] {
			seen[k] = true
			parts = append(parts, loraCaptionTag(t.Name))
		}
	}
	if mode == "trigger" {
		return strings.Join(parts, ", ")
	}
	for _, t := range sorted {
		k := loraTagKey(t.Name)
		if k == "" || seen[k] || leaveOut[k] {
			continue
		}
		seen[k] = true
		parts = append(parts, loraCaptionTag(t.Name))
		if len(parts) > loraTagLimit {
			break
		}
	}
	return strings.Join(parts, ", ")
}

// loraContentTags are a picture's tags about what is in it, strongest first: what
// someone tagged by hand, then the tagger's by its confidence.
func loraContentTags(tags []models.Tag) []models.Tag {
	out := make([]models.Tag, 0, len(tags))
	for _, t := range tags {
		if !loraTagSkipCategories[t.Category] {
			out = append(out, t)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		mi, mj := out[i].Source == "manual", out[j].Source == "manual"
		if mi != mj {
			return mi
		}
		return out[i].Score > out[j].Score
	})
	return out
}

// loraTagCount is one tag and how many of the pictures have it.
type loraTagCount struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// loraCommonTags counts the pictures' content tags, most common first: what the
// set has in common, which is what the leave-out list is chosen from.
func loraCommonTags(sets [][]models.Tag, limit int) []loraTagCount {
	count := map[string]int{}
	name := map[string]string{}
	for _, tags := range sets {
		seen := map[string]bool{}
		for _, t := range loraContentTags(tags) {
			k := loraTagKey(t.Name)
			if k == "" || seen[k] {
				continue
			}
			seen[k] = true
			count[k]++
			if _, ok := name[k]; !ok {
				name[k] = loraCaptionTag(t.Name)
			}
		}
	}
	out := make([]loraTagCount, 0, len(count))
	for k, n := range count {
		out = append(out, loraTagCount{Name: name[k], Count: n})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].Name < out[j].Name
	})
	if len(out) > limit {
		out = out[:limit]
	}
	return out
}

var loraNameJunk = regexp.MustCompile(`[^A-Za-z0-9._-]+`)

// loraFileName makes a LoRA's name something every filesystem and every prompt's
// <lora:name:1> can carry: letters, digits, dot, dash and underscore.
func loraFileName(name string) string {
	name = strings.Trim(loraNameJunk.ReplaceAllString(strings.TrimSpace(name), "_"), "._-")
	if len(name) > 80 {
		name = strings.Trim(name[:80], "._-")
	}
	return name
}

// loraPictureExt is the extension the trainer reads a picture's bytes as, "" for
// something it cannot read (a GIF; sd-scripts takes stills only).
func loraPictureExt(head []byte) string {
	switch http.DetectContentType(head) {
	case "image/png":
		return ".png"
	case "image/jpeg":
		return ".jpg"
	case "image/webp":
		return ".webp"
	case "image/bmp":
		return ".bmp"
	}
	return ""
}

// loraRepeats is how many times each picture is shown per epoch, so a run is about
// the same length whatever the set's size: some two hundred steps an epoch.
func loraRepeats(images int) int {
	if images <= 0 {
		return 10
	}
	r := (200 + images/2) / images
	return max(1, min(r, 40))
}

// ── playing a tag down ──────────────────────────────────────────────────────
//
// A tag the pictures have more of than the LoRA should — glasses on most of the
// pictures of a style that is wanted without them — is played down two ways. It is
// named in every caption that has it (loraCaption), so the model ties it to the word
// rather than to the LoRA; and the pictures with it are shown less often an epoch and
// the rest more, so it is rarer in what is learnt. Neither removes it: asked for, it
// still comes, and some of it still comes unasked.

// loraPlayDown is one tag to play down and how much of its share of training to
// keep: 0.5 trains as if half as many pictures had it.
type loraPlayDown struct {
	Tag  string  `json:"tag"`
	Keep float64 `json:"keep"`
}

// loraPlayDownNamed is the played-down tags, as the keys a caption names.
func loraPlayDownNamed(list []loraPlayDown) map[string]bool {
	out := map[string]bool{}
	for _, p := range list {
		if k := loraTagKey(p.Tag); k != "" {
			out[k] = true
		}
	}
	return out
}

// loraPictureKeys is each picture's content tags as keys.
func loraPictureKeys(tagSets [][]models.Tag) []map[string]bool {
	out := make([]map[string]bool, len(tagSets))
	for i, tags := range tagSets {
		out[i] = map[string]bool{}
		for _, t := range loraContentTags(tags) {
			out[i][loraTagKey(t.Name)] = true
		}
	}
	return out
}

// loraPlayDownRepeats is how many times an epoch each picture is shown. A tag on w
// of n pictures has a share of w/n; keeping a fraction of it means a weight m on its
// pictures such that w·m / (w·m + n − w) is that fraction of w/n. A picture with two
// played-down tags takes the smaller weight. The weights are then scaled so an epoch
// is as long as it was — the pictures without the tag are shown more, those with it
// less — because the run's length was chosen for the set, not for this. A tag on
// every picture, or on none, has nothing to be weighed against and changes nothing.
func loraPlayDownRepeats(tagSets [][]models.Tag, playDown []loraPlayDown, repeats int) []int {
	n := len(tagSets)
	out := make([]int, n)
	for i := range out {
		out[i] = repeats
	}
	if n == 0 || len(playDown) == 0 {
		return out
	}
	keys := loraPictureKeys(tagSets)
	weights := make([]float64, n)
	for i := range weights {
		weights[i] = 1
	}
	changed := false
	for _, p := range playDown {
		k := loraTagKey(p.Tag)
		keep := math.Max(0.05, math.Min(p.Keep, 1))
		if k == "" || keep >= 1 {
			continue
		}
		with := 0
		for _, have := range keys {
			if have[k] {
				with++
			}
		}
		if with == 0 || with == n {
			continue
		}
		share := float64(with) / float64(n) * keep
		m := share * float64(n-with) / ((1 - share) * float64(with))
		for i, have := range keys {
			if have[k] && m < weights[i] {
				weights[i], changed = m, true
			}
		}
	}
	if !changed {
		return out
	}
	sum := 0.0
	for _, w := range weights {
		sum += w
	}
	scale := float64(repeats*n) / sum
	for i, w := range weights {
		// The trainer takes 1 to 100 a picture.
		out[i] = max(1, min(int(math.Round(scale*w)), 100))
	}
	return out
}

// loraTagShare is what playing a tag down comes to: how many pictures have it, the
// share of training they had, and the share they have with the repeats as set.
type loraTagShare struct {
	Tag      string  `json:"tag"`
	Pictures int     `json:"pictures"`
	Before   float64 `json:"before"`
	After    float64 `json:"after"`
}

// loraPlayDownShares says what each played-down tag comes to with these repeats.
func loraPlayDownShares(tagSets [][]models.Tag, playDown []loraPlayDown, repeats []int) []loraTagShare {
	keys := loraPictureKeys(tagSets)
	total := 0
	for _, r := range repeats {
		total += r
	}
	out := make([]loraTagShare, 0, len(playDown))
	for _, p := range playDown {
		k := loraTagKey(p.Tag)
		sh := loraTagShare{Tag: p.Tag}
		shown := 0
		for i, have := range keys {
			if have[k] {
				sh.Pictures++
				shown += repeats[i]
			}
		}
		if len(keys) > 0 && total > 0 {
			sh.Before = float64(sh.Pictures) / float64(len(keys))
			sh.After = float64(shown) / float64(total)
		}
		out = append(out, sh)
	}
	return out
}
