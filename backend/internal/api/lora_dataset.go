package api

import (
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
// what is in each.
func loraCaption(trigger string, tags []models.Tag, leaveOut map[string]bool, mode string) string {
	trigger = strings.TrimSpace(trigger)
	parts := []string{}
	if trigger != "" {
		parts = append(parts, trigger)
	}
	if mode == "trigger" {
		return strings.Join(parts, ", ")
	}
	sorted := loraContentTags(tags)
	seen := map[string]bool{loraTagKey(trigger): true}
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
