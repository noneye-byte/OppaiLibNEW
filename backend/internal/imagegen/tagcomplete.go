package imagegen

import (
	"bytes"
	"compress/gzip"
	_ "embed"
	"encoding/csv"
	"io"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// Prompt autocomplete.
//
// The first version of this was a hundred-odd tags typed into a Go slice and ranked by
// edit distance against the whole of each one, so "hai" ranked "hat" above "long hair"
// and nothing past the hundred existed at all. What a prompt for an anime-trained
// model is written in is Danbooru's vocabulary, and what makes a tag worth suggesting
// is how often it was used to label a picture — that is what the model learned it
// from. So the list is Danbooru's own, with post counts and aliases: every tag used on
// at least a hundred posts (tags/danbooru.csv.gz, from a1111-sd-webui-tagcomplete,
// MIT; see tags/README.md).
//
// Ranking is by tier and then by use: the tag itself, a tag that starts with what was
// typed, an alias that does ("boobs" → breasts), a tag one of whose words does ("hai" →
// long hair), and only when those come up short, a near miss for a typo. The library's
// own tags join the list, so a tag you have used is suggested even when Danbooru
// never heard of it.

//go:embed tags/danbooru.csv.gz
var danbooruGz []byte

// Tag categories, as Danbooru numbers them.
const (
	TagGeneral   = 0
	TagArtist    = 1
	TagCopyright = 3
	TagCharacter = 4
	TagMeta      = 5
	// TagLibrary marks a tag from this library rather than from Danbooru.
	TagLibrary = 100
)

type tagEntry struct {
	name    string // with spaces, as a prompt writes it
	cat     int
	count   int
	aliases []string
	words   []string
}

var (
	tagsOnce sync.Once
	tagList  []tagEntry
	tagIndex map[string]int
)

func loadTags() {
	tagsOnce.Do(func() {
		tagIndex = map[string]int{}
		zr, err := gzip.NewReader(bytes.NewReader(danbooruGz))
		if err != nil {
			return
		}
		r := csv.NewReader(zr)
		r.FieldsPerRecord = -1
		for {
			row, err := r.Read()
			if err == io.EOF {
				break
			}
			if err != nil || len(row) < 3 {
				continue
			}
			cat, _ := strconv.Atoi(row[1])
			count, _ := strconv.Atoi(row[2])
			e := tagEntry{name: normalizeTag(row[0]), cat: cat, count: count}
			if len(row) > 3 && row[3] != "" {
				for _, a := range strings.Split(row[3], ",") {
					if a = normalizeTag(a); a != "" {
						e.aliases = append(e.aliases, a)
					}
				}
			}
			e.words = strings.Fields(e.name)
			if _, dup := tagIndex[e.name]; dup || e.name == "" {
				continue
			}
			tagIndex[e.name] = len(tagList)
			tagList = append(tagList, e)
		}
	})
}

// TagSuggestion is one completion: the tag to write, what kind it is, how many
// pictures carry it, and the alias that matched when it was an alias that did.
type TagSuggestion struct {
	Tag      string `json:"tag"`
	Category int    `json:"category"`
	Count    int    `json:"count"`
	Alias    string `json:"alias,omitempty"`
}

// Tiers, best first. Within a tier the more-used tag wins.
const (
	tierExact = iota
	tierPrefix
	tierAlias
	tierWord
	tierFuzzy
)

type scored struct {
	s    TagSuggestion
	tier int
}

// CompleteTags ranks completions for what is being typed. extra is the library's own
// tag names, suggested alongside Danbooru's.
func CompleteTags(query string, extra []string, limit int) []TagSuggestion {
	loadTags()
	q := normalizeTag(query)
	if limit <= 0 || limit > 50 {
		limit = 12
	}
	if q == "" {
		return []TagSuggestion{}
	}
	var hits []scored
	seen := map[string]bool{}
	add := func(s TagSuggestion, tier int) {
		if seen[s.Tag] {
			return
		}
		seen[s.Tag] = true
		hits = append(hits, scored{s, tier})
	}
	qWords := strings.Fields(q)
	for _, e := range tagList {
		sugg := TagSuggestion{Tag: e.name, Category: e.cat, Count: e.count}
		switch {
		case e.name == q:
			add(sugg, tierExact)
		case strings.HasPrefix(e.name, q):
			add(sugg, tierPrefix)
		case wordsPrefix(e.words, qWords):
			add(sugg, tierWord)
		default:
			for _, a := range e.aliases {
				if strings.HasPrefix(a, q) {
					sugg.Alias = a
					add(sugg, tierAlias)
					break
				}
			}
		}
	}
	for _, raw := range extra {
		t := normalizeTag(raw)
		if t == "" || seen[t] {
			continue
		}
		if i, ok := tagIndex[t]; ok && tagList[i].name == t {
			continue // Danbooru's entry is already in, with its count
		}
		sugg := TagSuggestion{Tag: t, Category: TagLibrary}
		switch {
		case t == q:
			add(sugg, tierExact)
		case strings.HasPrefix(t, q):
			add(sugg, tierPrefix)
		case wordsPrefix(strings.Fields(t), qWords):
			add(sugg, tierWord)
		}
	}
	// A typo is only worth guessing at when typing has not found much; then the near
	// misses among well-used tags are the likely meaning.
	if len(hits) < limit && len([]rune(q)) >= 3 {
		budget := max(1, len([]rune(q))/4)
		for _, e := range tagList {
			if e.count < 2000 {
				continue
			}
			if seen[e.name] || abs(len(e.name)-len(q)) > budget {
				continue
			}
			if levenshtein(q, e.name) <= budget {
				add(TagSuggestion{Tag: e.name, Category: e.cat, Count: e.count}, tierFuzzy)
			}
		}
	}
	sort.SliceStable(hits, func(i, j int) bool {
		if hits[i].tier != hits[j].tier {
			return hits[i].tier < hits[j].tier
		}
		// A library tag has no count; it sorts as though moderately used, so a tag
		// you chose is not buried under every popular one that shares a prefix.
		ci, cj := hits[i].s.Count, hits[j].s.Count
		if hits[i].s.Category == TagLibrary {
			ci = 5000
		}
		if hits[j].s.Category == TagLibrary {
			cj = 5000
		}
		if ci != cj {
			return ci > cj
		}
		return hits[i].s.Tag < hits[j].s.Tag
	})
	out := make([]TagSuggestion, 0, limit)
	for _, h := range hits {
		out = append(out, h.s)
		if len(out) == limit {
			break
		}
	}
	return out
}

// TagCorrection is the tag a typed one was probably meant to be, "" when it is a
// known tag already or nothing is close. What "did you mean" offers.
func TagCorrection(query string) string {
	loadTags()
	q := normalizeTag(query)
	if len([]rune(q)) < 3 {
		return ""
	}
	if _, ok := tagIndex[q]; ok {
		return ""
	}
	for _, e := range tagList {
		for _, a := range e.aliases {
			if a == q {
				return e.name
			}
		}
	}
	budget := max(1, len([]rune(q))/4)
	best, bestDist, bestCount := "", budget+1, 0
	for _, e := range tagList {
		if e.count < 500 || abs(len(e.name)-len(q)) > budget {
			continue
		}
		d := levenshtein(q, e.name)
		if d < bestDist || (d == bestDist && e.count > bestCount) {
			best, bestDist, bestCount = e.name, d, e.count
		}
	}
	return best
}

// wordsPrefix says whether the typed words begin consecutive words of the tag, the
// last typed word as a prefix: "hai" and "long ha" both find "long hair", "red ey"
// finds "red eyes" but "eyes red" does not.
func wordsPrefix(words, q []string) bool {
	if len(q) == 0 || len(q) > len(words) {
		return false
	}
	for start := 0; start+len(q) <= len(words); start++ {
		ok := true
		for i, w := range q {
			tw := words[start+i]
			if i == len(q)-1 {
				ok = strings.HasPrefix(tw, w)
			} else {
				ok = tw == w
			}
			if !ok {
				break
			}
		}
		if ok {
			return true
		}
	}
	return false
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
