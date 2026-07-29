package imagegen

import (
	"sort"
	"strings"
)

// A compact always-available Danbooru vocabulary. Model-derived/library tags can be
// added by callers; this baseline keeps correction useful on lean installs too.
var CommonBooruTags = []string{
	"1girl", "1boy", "solo", "multiple girls", "looking at viewer", "smile", "open mouth",
	"blush", "long hair", "short hair", "medium hair", "blonde hair", "black hair", "brown hair",
	"red hair", "blue hair", "pink hair", "purple hair", "green hair", "white hair", "silver hair",
	"blue eyes", "brown eyes", "green eyes", "red eyes", "purple eyes", "heterochromia",
	"large breasts", "medium breasts", "small breasts", "curvy", "slender", "muscular female",
	"pale skin", "dark skin", "tan", "freckles", "glasses", "makeup", "lipstick", "fang",
	"ponytail", "twintails", "braid", "bangs", "hair ornament", "animal ears", "elf ears",
	"dress", "school uniform", "maid", "business suit", "shirt", "skirt", "shorts", "jeans",
	"bikini", "swimsuit", "lingerie", "underwear", "thighhighs", "stockings", "boots", "gloves",
	"portrait", "upper body", "full body", "cowboy shot", "from above", "from below", "side view",
	"indoors", "outdoors", "bedroom", "beach", "city", "forest", "night", "sunset",
	"photorealistic", "anime style", "masterpiece", "best quality", "highly detailed",
	"nude", "nipples", "pussy", "penis", "cum", "sex", "oral", "masturbation",
}

func SuggestTags(query string, extra []string, limit int) ([]string, string) {
	q := normalizeTag(query)
	if limit <= 0 || limit > 30 {
		limit = 12
	}
	seen := map[string]bool{}
	all := make([]string, 0, len(CommonBooruTags)+len(extra))
	for _, raw := range append(CommonBooruTags, extra...) {
		t := normalizeTag(raw)
		if t != "" && !seen[t] {
			seen[t] = true
			all = append(all, t)
		}
	}
	type match struct {
		tag   string
		score int
	}
	var matches []match
	for _, tag := range all {
		score := levenshtein(q, tag)
		if strings.HasPrefix(tag, q) {
			score -= 8
		}
		if strings.Contains(tag, q) {
			score -= 4
		}
		matches = append(matches, match{tag, score})
	}
	sort.Slice(matches, func(i, j int) bool {
		if matches[i].score == matches[j].score {
			return matches[i].tag < matches[j].tag
		}
		return matches[i].score < matches[j].score
	})
	out := make([]string, 0, limit)
	for _, m := range matches {
		if q == "" || strings.Contains(m.tag, q) || m.score <= max(2, len(q)/3) {
			out = append(out, m.tag)
			if len(out) == limit {
				break
			}
		}
	}
	correction := ""
	if len(matches) > 0 && matches[0].tag != q && matches[0].score <= max(2, len(q)/3) {
		correction = matches[0].tag
	}
	return out, correction
}

func normalizeTag(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.ReplaceAll(strings.TrimSpace(s), "_", " "))), " ")
}

func levenshtein(a, b string) int {
	ar, br := []rune(a), []rune(b)
	prev := make([]int, len(br)+1)
	for j := range prev {
		prev[j] = j
	}
	for i, ca := range ar {
		cur := make([]int, len(br)+1)
		cur[0] = i + 1
		for j, cb := range br {
			cost := 0
			if ca != cb {
				cost = 1
			}
			cur[j+1] = min(cur[j]+1, min(prev[j+1]+1, prev[j]+cost))
		}
		prev = cur
	}
	return prev[len(br)]
}
