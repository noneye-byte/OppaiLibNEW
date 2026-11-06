package api

import (
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/youruser/oppailib/internal/models"
)

// What Libby would put in front of you next, on Home.
//
// The row this replaced offered back what you had already opened, which is a list of
// things you know about. This one goes the other way: the tags on what you have shown
// you care for are the words for your taste, and whatever else in the library carries
// those words, that you have not got to yet, is what she suggests.
//
// It is worked out from the library index (chat_library_index.go), which already holds
// every item's tags in memory, rather than in SQL: a join of everything you like against
// everything tagged would be the slowest query Home makes, and Home makes it on arrival.
// Titles and notes play no part, only tags, so nothing here decrypts anything new.
//
// Three things keep it from being a list of the same dozen items:
//
//   - A tag is worth what it tells apart. Something on half the library says nothing
//     about you, so a tag counts for less the more items carry it, and past
//     suggestCommonShare not at all.
//   - An item with forty tags does not beat one with five on volume: its score is
//     divided by the root of how many it has.
//   - The row is a draw from the best of the library, weighted by score, and not simply
//     the top of it — her shelf was once a fixed list, and "she keeps gravitating towards
//     the same videos" was the report that followed (chat_library_sample.go).

const (
	// suggestDefaultLimit is a row that scrolls; suggestMaxLimit bounds a client's ask.
	suggestDefaultLimit = 24
	suggestMaxLimit     = 48
	// suggestMaxSeen bounds the ids a client may send: recents.ts keeps 24.
	suggestMaxSeen = 48
	// suggestTopTags is how many of your words are read. Past the first few dozen they
	// are the long tail of whatever you happened to favourite, and only add noise.
	suggestTopTags = 32
	// suggestPoolPerSlot is how many candidates each slot of the row is drawn from.
	suggestPoolPerSlot = 4
	// suggestCommonShare is the share of the library past which a tag is no signal.
	suggestCommonShare = 0.5
	// suggestBecause is how many of the tags behind the row it names.
	suggestBecause = 3

	// How much each thing you have done with an item says about you. A favourite is a
	// decision; having opened something is only curiosity, so it counts for least.
	seedFavorite = 3.0
	seedMarked   = 2.0
	seedOpened   = 1.0
)

// seedRating is what a star rating says: a low one counts against the item's tags.
func seedRating(rating int) float64 {
	switch {
	case rating >= 5:
		return 3
	case rating == 4:
		return 2
	case rating == 3:
		return 1
	case rating > 0:
		return -1
	default:
		return 0
	}
}

// suggestGroup is which half of the row a kind belongs to, "" for one that is not
// suggested. Comics and games are left out: what they are tagged with is what they are
// about, and the row is for things to look at and watch.
func suggestGroup(kind string) string {
	switch kind {
	case "video":
		return "video"
	case "image", "gif":
		return "picture"
	}
	return ""
}

// suggestAsk is what a suggestion is worked out from.
type suggestAsk struct {
	opened, marked []int64            // opened or part-watched; bookmarked
	limit          int                //
	taste          libbyTaste         // hers: a nudge, as on her shelf
	weights        map[string]float64 // the user's: "never" keeps an item out
	pick           func(total float64) float64
}

// suggestSkipTag is a tag that says nothing about taste: every picture of her has it.
func suggestSkipTag(tag string) bool {
	return tag == "libby" || tag == libbyIdentityTag
}

func tagShareOf(e *libraryEntry, tag string) float64 {
	if w, ok := e.weights[tag]; ok {
		return w
	}
	return 1
}

// suggestFrom picks a row from the library: the ids in order, and the tags that did the
// most to choose them, for the row to say so. Empty with nothing to go on, because a row
// of guesses would be Recently added under another name.
func suggestFrom(entries map[int64]*libraryEntry, ask suggestAsk) ([]int64, []string) {
	seeds := map[int64]float64{}
	for _, id := range ask.opened {
		seeds[id] += seedOpened
	}
	for _, id := range ask.marked {
		seeds[id] += seedMarked
	}
	seen := make(map[int64]bool, len(seeds))
	for id := range seeds {
		seen[id] = true
	}

	// How common each tag is, and how much each says about you.
	shelved := 0
	common := map[string]int{}
	lean := map[string]float64{}
	for id, e := range entries {
		if suggestGroup(e.link.Kind) == "" {
			continue
		}
		shelved++
		seed := seeds[id] + seedRating(e.rating)
		if e.favorite {
			seed += seedFavorite
		}
		if e.favorite || e.rating > 0 {
			seen[id] = true
		}
		for _, tag := range e.tags {
			common[tag]++
			if seed != 0 && !suggestSkipTag(tag) {
				lean[tag] += seed * tagShareOf(e, tag)
			}
		}
	}

	type scored struct {
		tag   string
		score float64
	}
	words := make([]scored, 0, len(lean))
	for tag, l := range lean {
		share := float64(common[tag]) / float64(shelved)
		if l <= 0 || share > suggestCommonShare {
			continue
		}
		words = append(words, scored{tag, l * math.Log(1/share)})
	}
	sort.Slice(words, func(a, b int) bool {
		if words[a].score != words[b].score {
			return words[a].score > words[b].score
		}
		return words[a].tag < words[b].tag
	})
	if len(words) > suggestTopTags {
		words = words[:suggestTopTags]
	}
	worth := make(map[string]float64, len(words))
	for _, w := range words {
		worth[w.tag] = w.score
	}

	// Everything unseen that carries one of those words, best first within its half.
	type candidate struct {
		id    int64
		score float64
	}
	groups := map[string][]candidate{}
	for id, e := range entries {
		group := suggestGroup(e.link.Kind)
		if group == "" || seen[id] || len(e.tags) == 0 {
			continue
		}
		score := 0.0
		for _, tag := range e.tags {
			if w, ok := worth[tag]; ok {
				score += w * tagShareOf(e, tag)
			}
		}
		score *= tagWeight(ask.weights, e.tags)
		if score <= 0 {
			continue
		}
		score *= 1 + tastePull*float64(ask.taste.score(e.tags)) // she has a say, not the last word
		groups[group] = append(groups[group], candidate{id, score / math.Sqrt(float64(len(e.tags)))})
	}

	// A draw from the best of each half, without replacement.
	drawn := map[string][]int64{}
	for group, list := range groups {
		sort.Slice(list, func(a, b int) bool {
			if list[a].score != list[b].score {
				return list[a].score > list[b].score
			}
			return list[a].id < list[b].id
		})
		pool := make([]weightedCandidate[int64], 0, ask.limit*suggestPoolPerSlot)
		for _, c := range list {
			if len(pool) == cap(pool) {
				break
			}
			pool = append(pool, weightedCandidate[int64]{item: c.id, score: 1, weight: c.score * c.score})
		}
		for len(drawn[group]) < ask.limit && len(pool) > 0 {
			id, ok := drawWeighted(pool, 0, ask.pick)
			if !ok {
				break
			}
			drawn[group] = append(drawn[group], id)
			for i := range pool {
				if pool[i].item == id {
					pool = append(pool[:i], pool[i+1:]...)
					break
				}
			}
		}
	}

	// Turn about, so a library of ten thousand pictures and two hundred videos still
	// gets a row of both; whichever runs out, the other fills the row.
	ids := make([]int64, 0, ask.limit)
	pictures, videos := drawn["picture"], drawn["video"]
	for len(ids) < ask.limit && (len(pictures) > 0 || len(videos) > 0) {
		if len(videos) > 0 {
			ids, videos = append(ids, videos[0]), videos[1:]
		}
		if len(pictures) > 0 && len(ids) < ask.limit {
			ids, pictures = append(ids, pictures[0]), pictures[1:]
		}
	}

	// The words named are ones on what was actually picked, so the row never gives a
	// reason that nothing in it bears out.
	behind := map[string]float64{}
	for _, id := range ids {
		for _, tag := range entries[id].tags {
			if w, ok := worth[tag]; ok {
				behind[tag] += w
			}
		}
	}
	reasons := make([]scored, 0, len(behind))
	for tag, w := range behind {
		reasons = append(reasons, scored{tag, w})
	}
	sort.Slice(reasons, func(a, b int) bool {
		if reasons[a].score != reasons[b].score {
			return reasons[a].score > reasons[b].score
		}
		return reasons[a].tag < reasons[b].tag
	})
	because := make([]string, 0, suggestBecause)
	for _, r := range reasons {
		if len(because) == suggestBecause {
			break
		}
		because = append(because, strings.ReplaceAll(r.tag, "_", " "))
	}
	return ids, because
}

// handleSuggestedMedia answers GET /api/media/suggested: Home's row. `seen` is what this
// device has opened, which only the client knows (recents.ts).
func (s *Server) handleSuggestedMedia(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	ctx := r.Context()
	ask := suggestAsk{limit: suggestDefaultLimit}
	if n, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && n > 0 {
		ask.limit = min(n, suggestMaxLimit)
	}
	for _, field := range strings.Split(r.URL.Query().Get("seen"), ",") {
		if id, err := strconv.ParseInt(strings.TrimSpace(field), 10, 64); err == nil && id > 0 && len(ask.opened) < suggestMaxSeen {
			ask.opened = append(ask.opened, id)
		}
	}
	watched, marked, err := s.db.EngagedMedia(ctx, u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	ask.opened = append(ask.opened, watched...)
	ask.marked = marked

	s.chatMu.Lock()
	ws, _ := s.readChatWorkspace(u.ID)
	wants, _ := s.readLibbyWants(u.ID)
	s.chatMu.Unlock()
	character := defaultLibbyCard()
	if selected, found := findChatCharacter(ws, "libby"); found {
		character = selected
	}
	ask.taste = buildLibbyTaste(character.Kinks+" "+character.Tastes, wantTexts(wants))
	ask.weights = ws.SendWeights

	body := struct {
		Items   []models.Media `json:"items"`
		Because []string       `json:"because"`
	}{Items: []models.Media{}, Because: []string{}}
	idx := s.ensureLibraryIndex(ctx)
	if idx == nil {
		writeJSON(w, http.StatusOK, body)
		return
	}
	idx.mu.RLock()
	ids, because := suggestFrom(idx.entries, ask)
	idx.mu.RUnlock()

	rows, err := s.db.MediaByIDs(ctx, ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	found := make([]int64, 0, len(rows))
	for _, row := range rows {
		body.Items = append(body.Items, s.toModel(row))
		found = append(found, row.ID)
	}
	if tags, err := s.db.TagsForMediaBatch(ctx, found); err == nil {
		for i := range body.Items {
			body.Items[i].Tags = tags[body.Items[i].ID]
		}
	}
	body.Because = because
	writeJSON(w, http.StatusOK, body)
}
