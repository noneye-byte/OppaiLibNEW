package api

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

// How far back she can reach.
//
// Before this, a name lookup decrypted the newest 240 rows and ranked those. It was
// an honest answer to an awkward constraint — titles are AES-GCM ciphertext, so no
// index in SQLite can find one, and somebody has to open them — but it meant the
// collection Libby could actually *talk* about was the last fortnight of it. Ask her
// about something imported in spring and she either described it vaguely or invented
// a title, because the row was never in the running. Tags papered over part of it,
// since those are plaintext and indexed, but only for items a tagger had reached.
//
// So the decryption happens once, here, and the result is kept: an in-memory index of
// every title and tag in the library, built the first time she needs it and refreshed
// underneath her. A lookup then runs against the whole collection rather than a
// window onto the end of it.
//
// Three things follow from where this lives, and all three are deliberate:
//
//   - It is in the API layer, not the database, because the KEK is. Nothing decrypted
//     is written back to disk — the index is process memory and dies with the process,
//     so the encryption promise is exactly what it was. A stolen database file still
//     yields ciphertext.
//   - It is built lazily. A server nobody chats with never pays for it, and a cold
//     start does not stall on a library sweep.
//   - It is allowed to be slightly stale. Freshness is checked with two integers
//     (db.MediaStamp) rather than a scan, inserts are folded in by id, and anything
//     subtler than that — a retitle, a re-tag, a deletion — is caught by the rebuild
//     timer or by an outright touch from the code that did it.

const (
	// libraryIndexMax bounds what is held in memory. Each entry is a title, a handful
	// of tag words and a few scalars — a couple of hundred bytes — so this is tens of
	// megabytes at the ceiling, on a box already running a language model. A library
	// past it indexes its newest rows and loses the tail, which is the same failure as
	// before but hundreds of times further back.
	libraryIndexMax = 200000
	// libraryIndexPage is one page of the build sweep. Large enough that a big library
	// is a few dozen queries, small enough that neither the row slice nor the tag IN
	// clause gets out of hand.
	libraryIndexPage = 2000
	// libraryIndexProbeTTL is how often the cheap stamp is re-read. A chat turn asks
	// several times over (links, attachments, actions), and one aggregate query per
	// turn is the intent — not one per lookup.
	libraryIndexProbeTTL = 5 * time.Second
	// libraryIndexRebuildTTL forces a full re-read eventually, whatever the stamp says.
	// This is what catches an edit that changed a title without changing the count: it
	// is not worth threading a hook through every path that can write one, and being
	// ten minutes behind on a rename costs a single lookup.
	libraryIndexRebuildTTL = 10 * time.Minute
	// libraryLookupCap bounds the candidate set one lookup will rank. A query word
	// matching half the collection ("video") must not turn a chat turn into a scan of
	// everything; past this the newest matches are kept, which is where the thing she
	// is being asked about overwhelmingly is.
	libraryLookupCap = 600
)

// libraryEntry is one indexed row: what ranking reads, already decrypted and already
// lowercased.
type libraryEntry struct {
	link  libbyLink
	title string   // lowercased, for the substring ranking in bestLibraryMatchAbove
	tags  []string // lowercased
	// weights is how much of the item each tag describes, keyed like tags, holding only
	// the tags that were measured as less than the whole item. Absent reads as 1. Kept
	// sparse because most tags on most items are unmeasured, and a map per entry that
	// said "1" a dozen times would be the index's largest allocation for no information.
	weights map[string]float64
	at      int64 // created_at, the tie-break when a lookup overflows its cap
}

// libraryIndex is the whole library, searchable by word.
//
// The inverted map holds exact words; a lookup walks its keys and takes every one
// that contains the query word. That is deliberate rather than lazy: the ranking it
// feeds has always matched on substrings — "beach" is meant to find "beach towel" —
// and an index answering only on exact words would quietly narrow what she can name.
// The key set is the collection vocabulary, tens of thousands of strings at most, and
// one turn spends at most eight query words against it.
type libraryIndex struct {
	mu sync.RWMutex

	entries map[int64]*libraryEntry
	words   map[string][]int64

	// stamp is the library shape the current contents were built from.
	stamp db.MediaStamp
	// builtAt is when the last full build finished; zero means never built.
	builtAt time.Time
	// probedAt is when the stamp was last re-read.
	probedAt time.Time
	// stale forces the next use to rebuild, whatever the stamp and the timers say.
	// Set by touchLibraryIndex, for the changes two integers cannot see.
	stale bool
}

func newLibraryIndex() *libraryIndex {
	return &libraryIndex{entries: map[int64]*libraryEntry{}, words: map[string][]int64{}}
}

// touchLibraryIndex says the library changed in a way the stamp cannot show — a
// retitle, a tag added or removed, an item deleted.
//
// Cheap and non-blocking: it sets a flag and the next lookup pays for the rebuild.
// Its callers are the handlers that do the writing, and missing one costs freshness
// until the rebuild timer rather than correctness.
func (s *Server) touchLibraryIndex() {
	if s.library == nil {
		return
	}
	s.library.mu.Lock()
	s.library.stale = true
	s.library.mu.Unlock()
}

// ensureLibraryIndex brings the index up to date, building it if it never has been.
//
// It returns with the index readable. Errors are logged and swallowed: a lookup
// against a stale index is a worse answer, and a lookup against no index is no answer
// at all, so neither is worth failing a chat turn over.
func (s *Server) ensureLibraryIndex(ctx context.Context) *libraryIndex {
	idx := s.library
	if idx == nil {
		return nil
	}

	idx.mu.Lock()
	defer idx.mu.Unlock()

	now := time.Now()
	if !idx.builtAt.IsZero() && !idx.stale &&
		now.Sub(idx.probedAt) < libraryIndexProbeTTL &&
		now.Sub(idx.builtAt) < libraryIndexRebuildTTL {
		return idx
	}

	if !idx.builtAt.IsZero() && !idx.stale && now.Sub(idx.builtAt) < libraryIndexRebuildTTL {
		stamp, err := s.db.MediaStamp(ctx)
		idx.probedAt = now
		switch {
		case err != nil:
			s.log.Warn("library index: stamp", "err", err)
			return idx
		case stamp == idx.stamp:
			return idx
		case stamp.MaxID > idx.stamp.MaxID && stamp.Count-idx.stamp.Count == stamp.MaxID-idx.stamp.MaxID:
			// Pure growth: every id between the two maxima is present and accounted for,
			// so the new rows can simply be read and added. Anything less tidy than that
			// — a deletion, an id gap — falls through to a rebuild, because working out
			// which entries no longer exist costs the same sweep as building it again.
			if err := s.growLibraryIndex(ctx, idx, stamp); err != nil {
				s.log.Warn("library index: delta", "err", err)
			}
			return idx
		}
	}

	if err := s.rebuildLibraryIndex(ctx, idx); err != nil {
		s.log.Warn("library index: build", "err", err)
		// A failed first build must not leave an empty index looking complete, so the
		// timestamps are left alone and the next lookup retries.
		return idx
	}
	now = time.Now()
	idx.probedAt, idx.builtAt, idx.stale = now, now, false
	return idx
}

// rebuildLibraryIndex reads the library and replaces the index wholesale.
//
// Into fresh maps rather than in place, so a failure part-way through leaves the old
// index intact and readable instead of half-erased. Callers hold idx.mu.
func (s *Server) rebuildLibraryIndex(ctx context.Context, idx *libraryIndex) error {
	stamp, err := s.db.MediaStamp(ctx)
	if err != nil {
		return err
	}
	floor := int64(0)
	if stamp.Count > libraryIndexMax {
		if floor, err = s.db.IDFloor(ctx, libraryIndexMax); err != nil {
			return err
		}
	}
	tagsByID, err := s.db.AllTagNames(ctx)
	if err != nil {
		// Tags are half the searchable text but not all of it: a title index with no
		// tags still finds things, so this is a warning rather than a failed build.
		s.log.Warn("library index: tags", "err", err)
		tagsByID = map[int64][]db.TagName{}
	}

	size := int(stamp.Count)
	if size > libraryIndexMax {
		size = libraryIndexMax
	}
	entries := make(map[int64]*libraryEntry, size)
	words := make(map[string][]int64, 4096)
	for cursor := floor; ; {
		briefs, err := s.db.BriefsAfter(ctx, cursor, libraryIndexPage)
		if err != nil {
			return err
		}
		if len(briefs) == 0 {
			break
		}
		for i := range briefs {
			cursor = briefs[i].ID
			s.addLibraryEntry(entries, words, &briefs[i], tagsByID[briefs[i].ID])
		}
		if len(briefs) < libraryIndexPage {
			break
		}
	}

	idx.entries, idx.words, idx.stamp = entries, words, stamp
	s.log.Debug("library index built", "items", len(entries), "words", len(words))
	return nil
}

// growLibraryIndex folds newly imported rows into the existing index. Callers hold
// idx.mu.
func (s *Server) growLibraryIndex(ctx context.Context, idx *libraryIndex, stamp db.MediaStamp) error {
	for cursor := idx.stamp.MaxID; ; {
		briefs, err := s.db.BriefsAfter(ctx, cursor, libraryIndexPage)
		if err != nil {
			return err
		}
		if len(briefs) == 0 {
			break
		}
		ids := make([]int64, len(briefs))
		for i := range briefs {
			ids[i] = briefs[i].ID
		}
		tagsByID, err := s.db.TagsForMediaBatch(ctx, ids)
		if err != nil {
			s.log.Warn("library index: delta tags", "err", err)
			tagsByID = nil
		}
		for i := range briefs {
			cursor = briefs[i].ID
			names := make([]db.TagName, 0, len(tagsByID[briefs[i].ID]))
			for _, tag := range tagsByID[briefs[i].ID] {
				names = append(names, db.TagName{Name: tag.Name, Weight: tag.Weight})
			}
			s.addLibraryEntry(idx.entries, idx.words, &briefs[i], names)
		}
		if len(briefs) < libraryIndexPage {
			break
		}
	}
	idx.stamp = stamp
	return nil
}

// addLibraryEntry decrypts one row and files it under every word it can be found by.
func (s *Server) addLibraryEntry(entries map[int64]*libraryEntry, words map[string][]int64, brief *db.MediaBrief, tagNames []db.TagName) {
	title := s.decrypt(brief.TitleEnc, "title")
	if title == "" {
		title = "Untitled"
	}
	entry := &libraryEntry{
		link:  libbyLink{ID: brief.ID, Title: title, Kind: brief.Kind, HasThumb: brief.HasThumb},
		title: strings.ToLower(title),
		at:    brief.CreatedAt,
	}
	for _, tag := range tagNames {
		name := strings.ToLower(tag.Name)
		entry.tags = append(entry.tags, name)
		if tag.Weight > 0 && tag.Weight < 1 {
			if entry.weights == nil {
				entry.weights = map[string]float64{}
			}
			entry.weights[name] = tag.Weight
		}
	}
	entries[brief.ID] = entry

	// One posting per distinct word. The kind is filed too, because "that video you
	// saved" is a real lookup and kind is not otherwise searchable text.
	seen := map[string]bool{}
	file := func(text string) {
		for _, word := range indexWords(text) {
			if seen[word] {
				continue
			}
			seen[word] = true
			words[word] = append(words[word], brief.ID)
		}
	}
	file(entry.title)
	file(brief.Kind)
	for _, tag := range entry.tags {
		file(tag)
	}
}

// indexWords splits text the way normalizeLookupWords splits a query, minus the stop
// list: a stop word is never searched for, so filing it costs nothing, whereas
// filtering here would mean the two halves disagreed about where a word begins.
func indexWords(text string) []string {
	return strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	})
}

// lookupLibrary returns the entries worth ranking for a set of query words.
//
// Over the cap the newest matches win. A word that matches thousands of items is not
// one the answer hinges on, and an item somebody asks about by name is nearly always
// one they have seen lately.
func (s *Server) lookupLibrary(ctx context.Context, queryWords []string) []libraryCandidate {
	idx := s.ensureLibraryIndex(ctx)
	if idx == nil || len(queryWords) == 0 {
		return nil
	}
	if len(queryWords) > 8 {
		queryWords = queryWords[:8]
	}

	idx.mu.RLock()
	defer idx.mu.RUnlock()
	if len(idx.entries) == 0 {
		return nil
	}

	hits := make(map[int64]bool, 256)
	for _, query := range queryWords {
		for word, ids := range idx.words {
			if !strings.Contains(word, query) {
				continue
			}
			for _, id := range ids {
				hits[id] = true
			}
		}
	}
	if len(hits) == 0 {
		return nil
	}

	out := make([]libraryCandidate, 0, len(hits))
	for id := range hits {
		entry := idx.entries[id]
		if entry == nil {
			continue
		}
		out = append(out, libraryCandidate{link: entry.link, title: entry.title, tags: entry.tags, weights: entry.weights, at: entry.at})
	}
	// Newest first, so the cap below keeps the end of the collection rather than an
	// arbitrary slice of a map.
	sort.Slice(out, func(a, b int) bool {
		if out[a].at != out[b].at {
			return out[a].at > out[b].at
		}
		return out[a].link.ID > out[b].link.ID
	})
	if len(out) > libraryLookupCap {
		out = out[:libraryLookupCap]
	}
	return out
}
