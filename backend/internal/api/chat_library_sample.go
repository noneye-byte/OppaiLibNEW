package api

import (
	"context"
	"sort"
)

// Drawing a shelf for her to choose from.
//
// The recommendation shortlist used to be the six newest items of each kind, decrypted
// afresh for every turn that asked. That is a fixed list: the same six games, the same
// six videos, in the same order, until something new was imported. Asked what to watch
// she named one of those six, and asked again next week she named one of the same six
// — and because she attaches by title, the same video went out again. The user's
// report was "she keeps gravitating towards the same videos", and it was not the model
// gravitating; it was the prompt handing it the same shelf.
//
// The shortlist is now drawn, per turn, from the whole library through the index that
// already holds every title and tag in memory (chat_library_index.go). Three things
// shape the draw:
//
//   - What has already gone out in this conversation is off the shelf. The client sends
//     the ids it has attached (recentlyAttached); those are not offered again, so "what
//     else have you got" is answered with something else.
//   - Her taste tilts it. The same taste that decides between equally-fitting items in
//     pickLibraryMatch decides here what she is more likely to reach for: an item whose
//     tags land on her kinks or her wants is drawn more often, never exclusively.
//   - The user's own tag weights apply: "often" items come up more, "rarely" less,
//     "never" not at all — the same weights that govern what she sends.
//
// The result is a different shelf each turn, drawn from all of the collection rather
// than the end of it, and one she has a reason to prefer things on.

// tastePull is how much one taste hit tilts the draw. A hit doubles the item's chance
// against an item with none; two hits triple it. Strong enough to be visible over a
// large shelf, weak enough that a taste never empties the draw of everything else.
const tastePull = 1.0

// libraryShelfItem is one drawn entry, decrypted and ready to describe.
type libraryShelfItem struct {
	link libbyLink
	tags []string
}

// drawLibraryShelf draws up to n items of one kind from the index.
//
// exclude is the hard exclusion: already shown this conversation. weights are the
// user's send weights, taste is hers. pick is the die, injected so a test can load it;
// nil rolls for real. The draw is without replacement, so a shelf of six is six
// different items.
func (s *Server) drawLibraryShelf(ctx context.Context, kind string, n int, exclude map[int64]bool, taste libbyTaste, weights map[string]float64, pick func(total float64) float64) []libraryShelfItem {
	idx := s.ensureLibraryIndex(ctx)
	if idx == nil || n <= 0 {
		return nil
	}
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	ids := idx.byKind[kind]
	if len(ids) == 0 {
		return nil
	}
	pool := make([]weightedCandidate[*libraryEntry], 0, len(ids))
	for _, id := range ids {
		entry := idx.entries[id]
		if entry == nil || exclude[id] {
			continue
		}
		weight := tagWeight(weights, entry.tags)
		if weight <= 0 {
			continue
		}
		weight *= 1 + tastePull*float64(taste.score(entry.tags))
		pool = append(pool, weightedCandidate[*libraryEntry]{item: entry, score: 1, weight: weight})
	}
	// Stable order under the draw, whatever order the map handed the ids over in: the
	// die decides, not the iteration.
	sort.Slice(pool, func(a, b int) bool { return pool[a].item.link.ID < pool[b].item.link.ID })

	out := make([]libraryShelfItem, 0, n)
	for len(out) < n && len(pool) > 0 {
		entry, ok := drawWeighted(pool, 0, pick)
		if !ok {
			break
		}
		out = append(out, libraryShelfItem{link: entry.link, tags: entry.tags})
		for i := range pool {
			if pool[i].item == entry {
				pool = append(pool[:i], pool[i+1:]...)
				break
			}
		}
	}
	return out
}

// orderLibraryMatchesForFeed arranges scored matches for the prompt: best score first,
// and within a score, what she would rather look at first and then a draw — so the
// items that tie on words are not always fed in the order the index keeps them, which
// was newest first and therefore the same items every turn.
//
// exclude removes what has already been shown, so the shelf she reads from never
// names something she cannot hand over again. pick is the die; nil rolls for real.
func orderLibraryMatchesForFeed(matches []libraryMatch, exclude map[int64]bool, taste libbyTaste, weights map[string]float64, pick func(total float64) float64) []libraryMatch {
	kept := make([]libraryMatch, 0, len(matches))
	for _, match := range matches {
		if exclude[match.link.ID] || tagWeight(weights, match.tags) <= 0 {
			continue
		}
		kept = append(kept, match)
	}
	// Group by score, best first.
	sort.SliceStable(kept, func(a, b int) bool { return kept[a].score > kept[b].score })
	out := make([]libraryMatch, 0, len(kept))
	for start := 0; start < len(kept); {
		end := start + 1
		for end < len(kept) && kept[end].score == kept[start].score {
			end++
		}
		tied := kept[start:end]
		if len(tied) == 1 {
			out = append(out, tied[0])
		} else {
			out = append(out, drawTiedMatches(tied, taste, weights, pick)...)
		}
		start = end
	}
	return out
}

// drawTiedMatches orders one tied group by repeated weighted draw, taste and weights
// applied, without replacement.
func drawTiedMatches(tied []libraryMatch, taste libbyTaste, weights map[string]float64, pick func(total float64) float64) []libraryMatch {
	pool := make([]weightedCandidate[int], 0, len(tied))
	for i, match := range tied {
		weight := tagWeight(weights, match.tags) * (1 + tastePull*float64(taste.score(match.tags)))
		// The share of the item the matched tags describe tilts it too: the beach
		// video over the one with a beach shot, as in dominantShare.
		if match.share > 0 {
			weight *= 0.5 + match.share
		}
		pool = append(pool, weightedCandidate[int]{item: i, score: 1, weight: weight})
	}
	out := make([]libraryMatch, 0, len(tied))
	for len(pool) > 0 {
		i, ok := drawWeighted(pool, 0, pick)
		if !ok {
			break
		}
		out = append(out, tied[i])
		for j := range pool {
			if pool[j].item == i {
				pool = append(pool[:j], pool[j+1:]...)
				break
			}
		}
	}
	return out
}
