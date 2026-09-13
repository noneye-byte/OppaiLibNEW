package imagegen

import (
	"math/rand"
	"regexp"
	"strconv"
	"strings"
)

// ── wildcards ────────────────────────────────────────────────────────────────
//
// Two pieces of dynamic-prompt syntax, the ones every A1111 wildcard extension and
// ComfyUI node agrees on, so a prompt written for those keeps working here:
//
//   __name__        a random line from the wildcard list called name
//   {red|blue|green}  one of the options; {2$$a|b|c} picks two, joined with ", ";
//                     a weight prefixes an option as 3::red
//
// Expansion is one pass over the text repeated until nothing changes, so a wildcard
// line can itself hold a choice or another wildcard, to a fixed depth. A wildcard with
// no list of that name is left exactly as written — the user sees __typo__ in the
// prompt record and knows why nothing varied — rather than silently vanishing.

// WildcardLookup returns the lines of the named list, or nil when no list has that
// name. Names are matched case-insensitively by the caller's store.
type WildcardLookup func(name string) []string

// maxWildcardDepth bounds recursion: a list whose line names itself would otherwise
// loop forever.
const maxWildcardDepth = 8

var (
	wildcardRef = regexp.MustCompile(`__([A-Za-z0-9][A-Za-z0-9_./-]{0,63})__`)
	// Innermost braces only: no brace inside, so nesting resolves inside-out over
	// the passes.
	choiceRef = regexp.MustCompile(`\{([^{}]*)\}`)
)

// ExpandWildcards resolves every wildcard and choice in text with rng. The bool
// reports whether anything at all was expanded, so a caller can tell a plain prompt
// from one that was rolled.
func ExpandWildcards(text string, lookup WildcardLookup, rng *rand.Rand) (string, bool) {
	if rng == nil {
		rng = rand.New(rand.NewSource(rand.Int63()))
	}
	changed := false
	for depth := 0; depth < maxWildcardDepth; depth++ {
		next := expandOnce(text, lookup, rng)
		if next == text {
			break
		}
		text, changed = next, true
	}
	if changed {
		text = tidyPrompt(text)
	}
	return text, changed
}

// expandOnce does one pass: wildcards first, then the innermost choices.
func expandOnce(text string, lookup WildcardLookup, rng *rand.Rand) string {
	if lookup != nil {
		text = wildcardRef.ReplaceAllStringFunc(text, func(m string) string {
			name := m[2 : len(m)-2]
			lines := lookup(name)
			if len(lines) == 0 {
				return m
			}
			return strings.TrimSpace(lines[rng.Intn(len(lines))])
		})
	}
	return choiceRef.ReplaceAllStringFunc(text, func(m string) string {
		body := m[1 : len(m)-1]
		// "{masterpiece}" with no alternatives is not a choice: NovelAI-style prompts
		// use bare braces for emphasis, and those stay exactly as typed.
		if !strings.Contains(body, "|") && !strings.Contains(body, "$$") {
			return m
		}
		return pickChoice(body, rng)
	})
}

// pickChoice resolves the inside of one {…}: an optional "N$$" count, then options
// separated by "|", each optionally weighted "w::text".
func pickChoice(body string, rng *rand.Rand) string {
	count := 1
	if i := strings.Index(body, "$$"); i >= 0 {
		if n, err := strconv.Atoi(strings.TrimSpace(body[:i])); err == nil && n > 0 {
			count = n
			body = body[i+2:]
		}
	}
	type option struct {
		text   string
		weight float64
	}
	var options []option
	for _, raw := range strings.Split(body, "|") {
		text, weight := strings.TrimSpace(raw), 1.0
		if i := strings.Index(text, "::"); i > 0 {
			if w, err := strconv.ParseFloat(strings.TrimSpace(text[:i]), 64); err == nil && w >= 0 {
				weight, text = w, strings.TrimSpace(text[i+2:])
			}
		}
		options = append(options, option{text, weight})
	}
	if count > len(options) {
		count = len(options)
	}
	var picked []string
	// An empty option that wins is a real outcome ("{|red}" is "maybe red"), so it
	// uses up a pick rather than being rerolled.
	for taken := 0; taken < count && len(options) > 0; taken++ {
		total := 0.0
		for _, o := range options {
			total += o.weight
		}
		idx := len(options) - 1
		if total > 0 {
			roll := rng.Float64() * total
			for i, o := range options {
				roll -= o.weight
				if roll < 0 {
					idx = i
					break
				}
			}
		} else {
			idx = rng.Intn(len(options))
		}
		if options[idx].text != "" {
			picked = append(picked, options[idx].text)
		}
		// Without replacement, so {2$$a|b|c} never yields "a, a".
		options = append(options[:idx:idx], options[idx+1:]...)
	}
	return strings.Join(picked, ", ")
}

var (
	repeatedCommas = regexp.MustCompile(`(?:\s*,\s*){2,}`)
	repeatedSpaces = regexp.MustCompile(`[ \t]{2,}`)
)

// tidyPrompt cleans the seams an expansion leaves: an empty option turns "a, {|b}, c"
// into "a, , c", which some generators read as an empty token.
func tidyPrompt(text string) string {
	text = repeatedCommas.ReplaceAllString(text, ", ")
	text = repeatedSpaces.ReplaceAllString(text, " ")
	text = strings.Trim(text, " \t,")
	return strings.TrimSpace(text)
}
