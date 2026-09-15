package api

import (
	"context"
	"net/http"
	"strings"
)

// Tonight's shelf.
//
// Everything Libby knows about the collection went into answering questions: what is
// on it, what is new, what fits a mood. This is the librarian doing something with it
// instead — putting a handful of things on a shelf and calling it tonight's. It is a
// collection like any other (handlers_collections.go), so the grid, the viewer and the
// phone all show it with code they already have; what is hers about it is only how it
// is filled.
//
// Offered and approved like every other action: [do: shelf <what tonight is for>]
// draws a card, and Allow builds it. Rebuilt each time rather than added to, because a
// shelf that only ever grew would become the library over again; the name is fixed so
// there is one of them, and it is hers.

// libbyShelfName is the collection she keeps. Fixed, so approving a second shelf
// replaces the first rather than leaving "Libby's pick", "Libby's pick 2", ….
const libbyShelfName = "Libby's pick"

// libbyShelfSize is how many things go on it. A shelf, not a listing: enough for an
// evening with a choice in it, few enough to read as chosen.
const libbyShelfSize = 8

// buildLibbyShelf fills the shelf for a theme, in her taste.
//
// What they asked for comes first — the theme's words matched against the library the
// way her links are — and the rest is drawn per kind the way her recommendation
// shortlist is (chat_library_sample.go), so it is tilted by her taste and the user's
// tag weights and never something she has already handed over this conversation.
// Video first among the draws, because a shelf for tonight is mostly things to watch.
func (s *Server) buildLibbyShelf(ctx context.Context, theme string, shown map[int64]bool, taste libbyTaste, weights map[string]float64) []int64 {
	var ids []int64
	picked := map[int64]bool{}
	take := func(id int64) {
		if id <= 0 || picked[id] || len(ids) >= libbyShelfSize {
			return
		}
		picked[id] = true
		ids = append(ids, id)
	}
	if words := normalizeLookupWords(theme); len(words) > 0 {
		matches := scoreLibraryMatches(s.libraryCandidates(ctx, words), strings.Join(words, " "))
		matches = orderLibraryMatchesForFeed(matches, shown, taste, weights, nil)
		for _, match := range matches {
			if match.score < libraryFeedFloor || len(ids) >= libbyShelfSize/2 {
				break
			}
			take(match.link.ID)
		}
	}
	exclude := make(map[int64]bool, len(shown)+len(picked))
	for id := range shown {
		exclude[id] = true
	}
	for len(ids) < libbyShelfSize {
		before := len(ids)
		for _, kind := range []string{"video", "gif", "comic", "game", "image"} {
			for id := range picked {
				exclude[id] = true
			}
			for _, item := range s.drawLibraryShelf(ctx, kind, 1, exclude, taste, weights, nil) {
				take(item.link.ID)
			}
			if len(ids) >= libbyShelfSize {
				break
			}
		}
		if len(ids) == before {
			break // the library is smaller than the shelf
		}
	}
	return ids
}

// actShelf builds or rebuilds her collection from an approved offer.
func (s *Server) actShelf(w http.ResponseWriter, r *http.Request, req actRequest) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	ctx := r.Context()
	s.chatMu.Lock()
	ws, _ := s.readChatWorkspace(u.ID)
	wants, _ := s.readLibbyWants(u.ID)
	s.chatMu.Unlock()
	character := defaultLibbyCard()
	if selected, found := findChatCharacter(ws, "libby"); found {
		character = selected
	}
	taste := buildLibbyTaste(character.Kinks+" "+character.Tastes, wantTexts(wants))
	shown := map[int64]bool{}
	for _, id := range req.RecentMediaIDs {
		shown[id] = true
	}
	ids := s.buildLibbyShelf(ctx, req.Prompt, shown, taste, ws.SendWeights)
	if len(ids) == 0 {
		writeErr(w, http.StatusNotFound, "there is nothing on the shelves to pick from")
		return
	}
	collectionID, err := s.libbyShelfCollection(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't make the shelf")
		return
	}
	// Cleared before it is filled: this is tonight's shelf, not the sum of every night.
	existing, _ := s.db.CollectionMediaIDs(ctx, collectionID, 1000, 0)
	for _, id := range existing {
		_ = s.db.RemoveFromCollection(ctx, collectionID, id)
	}
	if _, err := s.db.AddToCollection(ctx, collectionID, ids); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't fill the shelf")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"collectionId": collectionID, "name": libbyShelfName, "count": len(ids)})
}

// libbyShelfCollection finds her collection or makes it.
func (s *Server) libbyShelfCollection(ctx context.Context) (int64, error) {
	list, err := s.db.ListCollections(ctx)
	if err != nil {
		return 0, err
	}
	for _, c := range list {
		if strings.EqualFold(c.Name, libbyShelfName) {
			return c.ID, nil
		}
	}
	return s.db.CreateCollection(ctx, libbyShelfName)
}
