package api

import (
	"context"
	"sort"
	"strings"

	"github.com/youruser/oppailib/internal/db"
)

// Searching the library from the server.
//
// The web grid used to do this itself: fetch every row, 200 at a time until the
// server ran out, and filter the result in the browser. It had a reason — titles
// are AES-GCM ciphertext, so no SQL query can match one — but the cost was that
// opening the library meant transferring and holding all of it, and that cost grows
// with the collection while the screen stays the same size.
//
// The answer was already in the process. chat_library_index.go keeps the whole
// library decrypted in memory so Libby can be asked about it by name; this file
// points the library's own search box at that same index. Nothing new is decrypted,
// nothing is written to disk, and a query resolves to one page of ids that
// db.MediaByIDs turns back into rows.
//
// Queries that do not search (a kind, favourites, a sort) never come here at all —
// those are SQL, in db.MediaPage, where they are always exactly fresh. The index is
// allowed to lag a retitle by up to its rebuild interval, which is a fine trade for
// a search box and not one worth making for "show me my videos".

// librarySearch is one library query: the words, the filters beside them, and the
// order to return them in.
type librarySearch struct {
	terms        []string
	kind         string
	favoriteOnly bool
	tag          string
	minRating    int
	sort         db.MediaSort
}

// searchTerms normalises a raw query string into index words.
//
// Split the same way the index splits the text it files, so the two halves cannot
// disagree about where a word begins: "re:zero" becomes two words that must both
// match, rather than one word containing a colon that the index can never hold. The
// browser's version of this search matched the raw substring against the whole
// joined haystack, so this is very slightly broader — a title with both words in the
// wrong order now matches — which is the right direction for a search box to err.
func searchTerms(q string) []string {
	words := indexWords(q)
	if len(words) > 8 {
		words = words[:8]
	}
	return words
}

// searchLibraryPage resolves a query to one page of ids, and how many matched in
// total.
//
// Terms are ANDed: "blue hair explicit" narrows across fields, a tag answering one
// word and a title another, which is what the grid's search box has always done.
// Ranking deliberately does not come into it — a grid is a list, and a list the user
// sorted by newest must be in that order whether or not they also typed something.
func (s *Server) searchLibraryPage(ctx context.Context, q librarySearch, limit, offset int) ([]int64, int) {
	idx := s.ensureLibraryIndex(ctx)
	if idx == nil || len(q.terms) == 0 {
		return nil, 0
	}

	idx.mu.RLock()
	defer idx.mu.RUnlock()
	if len(idx.entries) == 0 {
		return nil, 0
	}

	// One pass per term, intersecting as it goes. The first term builds the candidate
	// set and each later one narrows it, so the work after the first is bounded by
	// what survived rather than by the vocabulary — and a query whose first word is
	// rare stays cheap however common its second is.
	var matched map[int64]bool
	for _, term := range q.terms {
		hits := make(map[int64]bool, 64)
		for word, ids := range idx.words {
			if !strings.Contains(word, term) {
				continue
			}
			for _, id := range ids {
				if matched == nil || matched[id] {
					hits[id] = true
				}
			}
		}
		matched = hits
		if len(matched) == 0 {
			return nil, 0
		}
	}

	entries := make([]*libraryEntry, 0, len(matched))
	for id := range matched {
		entry := idx.entries[id]
		switch {
		case entry == nil:
			continue
		case q.kind != "" && entry.link.Kind != q.kind:
			continue
		case q.favoriteOnly && !entry.favorite:
			continue
		case q.tag != "" && !hasTag(entry, q.tag):
			continue
		case q.minRating > 0 && entry.rating < q.minRating:
			continue
		}
		entries = append(entries, entry)
	}
	sortLibraryEntries(entries, q.sort)

	total := len(entries)
	if offset >= total {
		return nil, total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	ids := make([]int64, 0, end-offset)
	for _, entry := range entries[offset:end] {
		ids = append(ids, entry.link.ID)
	}
	return ids, total
}

// hasTag reports whether an indexed row carries a tag exactly. Exact, unlike the
// query matching above: a filter chip names one tag that exists, so "hair" must not
// stand in for "hair ribbon" when the chip says "hair".
func hasTag(entry *libraryEntry, tag string) bool {
	tag = strings.ToLower(tag)
	for _, t := range entry.tags {
		if t == tag {
			return true
		}
	}
	return false
}

// sortLibraryEntries orders search results the way db.MediaSort.orderBy orders a
// SQL page, down to the tie-breaks — the same query must not put an item on page one
// here and page two there.
func sortLibraryEntries(entries []*libraryEntry, by db.MediaSort) {
	sort.Slice(entries, func(a, b int) bool {
		x, y := entries[a], entries[b]
		switch by {
		case db.SortOldest:
			if x.at != y.at {
				return x.at < y.at
			}
			return x.link.ID < y.link.ID
		case db.SortRating:
			if x.rating != y.rating {
				return x.rating > y.rating
			}
			if x.at != y.at {
				return x.at > y.at
			}
		case db.SortLargest:
			if x.size != y.size {
				return x.size > y.size
			}
		default: // newest
			if x.at != y.at {
				return x.at > y.at
			}
		}
		return x.link.ID > y.link.ID
	})
}
