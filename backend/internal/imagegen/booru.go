package imagegen

import (
	"strings"
)

// SuggestTags is the completion as plain tag names plus a "did you mean", the shape
// clients older than CompleteTags read. See tagcomplete.go.
func SuggestTags(query string, extra []string, limit int) ([]string, string) {
	items := CompleteTags(query, extra, limit)
	out := make([]string, 0, len(items))
	for _, s := range items {
		out = append(out, s.Tag)
	}
	return out, TagCorrection(query)
}

// normalizeTag writes a tag the way a prompt does: lower case, spaces rather than
// Danbooru's underscores, single-spaced.
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
