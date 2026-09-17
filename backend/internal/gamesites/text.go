package gamesites

import (
	"html"
	"regexp"
	"strings"
)

// Just enough text handling to lift titles, tags and descriptions out of a page
// fragment. goquery does the structural work; these turn what it finds into the
// plain text a card or a changelog panel shows.

var (
	scriptStyle = regexp.MustCompile(`(?is)<(script|style)\b[\s\S]*?</(script|style)>`)
	brTag       = regexp.MustCompile(`(?i)<br\s*/?>`)
	blockClose  = regexp.MustCompile(`(?i)</(p|div|li|h[1-6]|tr)>`)
	anyTag      = regexp.MustCompile(`<[^>]+>`)
	spaces      = regexp.MustCompile(`\s+`)
	hspaces     = regexp.MustCompile("[ \t ]+")
	lineEdges   = regexp.MustCompile(`\s*\n\s*`)
	manyLines   = regexp.MustCompile(`\n{3,}`)
)

func withoutTags(h string) string {
	h = scriptStyle.ReplaceAllString(h, " ")
	h = brTag.ReplaceAllString(h, "\n")
	h = blockClose.ReplaceAllString(h, "\n")
	return anyTag.ReplaceAllString(h, "")
}

// inlineText is plain text on one line — for titles, names and tag labels.
func inlineText(h string) string {
	if h == "" {
		return ""
	}
	return strings.TrimSpace(spaces.ReplaceAllString(html.UnescapeString(withoutTags(h)), " "))
}

// blockText is plain text with paragraph breaks kept — for descriptions and
// changelogs.
func blockText(h string) string {
	if h == "" {
		return ""
	}
	t := html.UnescapeString(withoutTags(h))
	t = hspaces.ReplaceAllString(t, " ")
	t = lineEdges.ReplaceAllString(t, "\n")
	t = manyLines.ReplaceAllString(t, "\n\n")
	return strings.TrimSpace(t)
}

// clampText trims a scraped description to something a card can hold, cutting at
// a sentence or a word rather than mid-way through one.
func clampText(text string, max int) string {
	if len(text) <= max {
		return text
	}
	cut := text[:max]
	boundary := max3(strings.LastIndex(cut, ". "), strings.LastIndex(cut, "\n"), strings.LastIndex(cut, " "))
	if boundary > max*6/10 {
		cut = cut[:boundary]
	}
	return strings.TrimRight(cut, " \n") + "…"
}

func max3(a, b, c int) int {
	if b > a {
		a = b
	}
	if c > a {
		a = c
	}
	return a
}

// normalizeTags de-duplicates case-insensitively, keeps order, drops the noise, and
// stops at limit.
func normalizeTags(raw []string, limit int) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, v := range raw {
		tag := strings.TrimSpace(strings.TrimRight(inlineText(v), ", "))
		if tag == "" || len(tag) > 40 {
			continue
		}
		key := strings.ToLower(tag)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, tag)
		if len(out) >= limit {
			break
		}
	}
	return out
}

// dedupe keeps the first of each URL, in order, skipping blanks.
func dedupe(urls []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, u := range urls {
		if u == "" || seen[u] {
			continue
		}
		seen[u] = true
		out = append(out, u)
	}
	return out
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
