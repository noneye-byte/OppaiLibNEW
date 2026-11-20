package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
)

// A chub.ai card's page, for reading before adding it.
//
// The search gives a tile's worth — a name, a tagline, three numbers. Choosing a
// character to talk to is choosing what they were written as, so the page shows the card
// itself: the creator's notes, the description and personality the model is given, the
// scenario, the first message and every alternate one, the example dialogue, the
// lorebook's entries, the expression pack's pictures and the pictures people posted to
// the card's gallery. It is read from the same definition the import builds its V2 card
// from (chub.go), with the same field crossover; nothing here is stored.

type chubLoreEntry struct {
	Name     string   `json:"name,omitempty"`
	Keys     []string `json:"keys"`
	Content  string   `json:"content"`
	Constant bool     `json:"constant,omitempty"`
	Disabled bool     `json:"disabled,omitempty"`
}

type chubExpressionPic struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type chubDetails struct {
	chubCard
	ID          int64   `json:"id"`
	Creator     string  `json:"creator"`
	Art         string  `json:"art"`
	Favorites   int     `json:"favorites"`
	Messages    int     `json:"messages"`
	Forks       int     `json:"forks"`
	Rating      float64 `json:"rating"`
	RatingCount int     `json:"ratingCount"`
	Updated     string  `json:"updated,omitempty"`
	// TokenCounts is chub's own count per field, from its TOKEN_COUNTS label.
	TokenCounts map[string]int `json:"tokenCounts,omitempty"`

	// The card, as the import will read it (see chubV2Card for the crossover).
	CreatorNotes   string   `json:"creatorNotes"`
	Description    string   `json:"description"`
	Personality    string   `json:"personality"`
	Scenario       string   `json:"scenario"`
	FirstMessage   string   `json:"firstMessage"`
	Greetings      []string `json:"greetings"`
	ExampleDialogs string   `json:"exampleDialogs"`
	SystemPrompt   string   `json:"systemPrompt"`
	PostHistory    string   `json:"postHistory"`

	LorebookName string          `json:"lorebookName,omitempty"`
	Lorebook     []chubLoreEntry `json:"lorebook"`
	// LorebookMore is how many entries past the ones listed the book has.
	LorebookMore int `json:"lorebookMore,omitempty"`

	ExpressionPack string              `json:"expressionPack,omitempty"`
	Expressions    []chubExpressionPic `json:"expressions"`
	HasGallery     bool                `json:"hasGallery"`
}

// chubPageNode is the rest of chub's node, which only the page reads.
type chubPageNode struct {
	ID             int64   `json:"id"`
	Rating         float64 `json:"rating"`
	RatingCount    int     `json:"ratingCount"`
	NFavorites     int     `json:"n_favorites"`
	ForksCount     int     `json:"forksCount"`
	NMessages      int     `json:"nMessages"`
	LastActivityAt string  `json:"lastActivityAt"`
	HasGallery     bool    `json:"hasGallery"`
	Labels         []struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	} `json:"labels"`
}

// maxLoreEntries bounds the page's lorebook; a book of a thousand entries is read on chub.
const maxLoreEntries = 120

// clipText shortens a field past what a page is for, at a rune boundary.
func clipText(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	cut := max
	for cut > 0 && !utf8.RuneStart(s[cut]) {
		cut--
	}
	return s[:cut] + "…"
}

// chubLorebook reads an embedded lorebook in either shape cards carry it: a V2
// character_book (entries a list, keys under "keys") or SillyTavern's world info
// (entries an object keyed by uid, keys under "key", the title under "comment").
func chubLorebook(raw json.RawMessage) (string, []chubLoreEntry, int) {
	var book struct {
		Name    string          `json:"name"`
		Entries json.RawMessage `json:"entries"`
	}
	if len(raw) == 0 || json.Unmarshal(raw, &book) != nil || len(book.Entries) == 0 {
		return "", []chubLoreEntry{}, 0
	}
	var list []map[string]any
	if json.Unmarshal(book.Entries, &list) != nil {
		var byID map[string]map[string]any
		if json.Unmarshal(book.Entries, &byID) != nil {
			return book.Name, []chubLoreEntry{}, 0
		}
		ids := make([]string, 0, len(byID))
		for id := range byID {
			ids = append(ids, id)
		}
		// By number where the keys are numbers, so entry 10 does not come before 2.
		sort.Slice(ids, func(i, j int) bool {
			a, ea := strconv.Atoi(ids[i])
			b, eb := strconv.Atoi(ids[j])
			if ea == nil && eb == nil {
				return a < b
			}
			return ids[i] < ids[j]
		})
		for _, id := range ids {
			list = append(list, byID[id])
		}
	}
	out := []chubLoreEntry{}
	for _, e := range list {
		if len(out) == maxLoreEntries {
			break
		}
		entry := chubLoreEntry{Keys: []string{}}
		for _, k := range []string{"keys", "key"} {
			if keys, ok := e[k].([]any); ok {
				for _, key := range keys {
					if s, ok := key.(string); ok && strings.TrimSpace(s) != "" {
						entry.Keys = append(entry.Keys, strings.TrimSpace(s))
					}
				}
				break
			}
		}
		for _, k := range []string{"name", "comment"} {
			if s, ok := e[k].(string); ok && strings.TrimSpace(s) != "" {
				entry.Name = clipText(s, 120)
				break
			}
		}
		entry.Content, _ = e["content"].(string)
		entry.Content = clipText(entry.Content, 4000)
		entry.Constant, _ = e["constant"].(bool)
		if on, ok := e["enabled"].(bool); ok {
			entry.Disabled = !on
		} else if off, ok := e["disable"].(bool); ok {
			entry.Disabled = off
		}
		if entry.Content == "" && len(entry.Keys) == 0 {
			continue
		}
		out = append(out, entry)
	}
	return book.Name, out, max(len(list)-len(out), 0)
}

// chubExpressionList is a pack's pictures in label order, proxied, the empty labels left out.
func chubExpressionList(ex *chubExpressions) []chubExpressionPic {
	out := []chubExpressionPic{}
	if ex == nil {
		return out
	}
	for label, raw := range ex.Expressions {
		if target, ok := chubAssetURL(strings.TrimSpace(raw)); ok && strings.TrimSpace(raw) != "" {
			out = append(out, chubExpressionPic{Label: label, URL: "/api/chub/avatar?src=" + url.QueryEscape(target)})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Label < out[j].Label })
	return out
}

// handleChubDetails is GET /api/chub/details?path= → chubDetails.
func (s *Server) handleChubDetails(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if !validChubPath(p) {
		writeErr(w, http.StatusBadRequest, "bad card path")
		return
	}
	resp, err := chubGet(r.Context(), chubHTTP, chubGateway+"/api/characters/"+escapeChubPath(p)+"?full=true")
	if err != nil {
		chubFail(w, err)
		return
	}
	defer resp.Body.Close()
	var out struct {
		Node json.RawMessage `json:"node"`
	}
	var n chubNode
	var extra chubPageNode
	if err := json.NewDecoder(io.LimitReader(resp.Body, 16<<20)).Decode(&out); err != nil ||
		json.Unmarshal(out.Node, &n) != nil || json.Unmarshal(out.Node, &extra) != nil || n.Definition == nil {
		writeErr(w, http.StatusBadGateway, "chub.ai sent a card this could not read")
		return
	}
	if n.FullPath == "" {
		n.FullPath = p
	}
	d := n.Definition
	page := chubDetails{
		chubCard: n.card(), ID: extra.ID, Creator: strings.SplitN(n.FullPath, "/", 2)[0],
		Favorites: extra.NFavorites, Messages: extra.NMessages, Forks: extra.ForksCount,
		Rating: extra.Rating, RatingCount: extra.RatingCount, Updated: extra.LastActivityAt, HasGallery: extra.HasGallery,
		CreatorNotes: clipText(d.Description, 20000), Description: clipText(d.Personality, 20000),
		Personality: clipText(d.TavernPersonality, 8000), Scenario: clipText(d.Scenario, 8000),
		FirstMessage: clipText(d.FirstMessage, 12000), ExampleDialogs: clipText(d.ExampleDialogs, 12000),
		SystemPrompt: clipText(d.SystemPrompt, 8000), PostHistory: clipText(d.PostHistoryInstructions, 4000),
		Greetings: []string{},
	}
	page.Name = strings.TrimSpace(firstNonEmpty(d.Name, d.ProjectName, n.Name))
	page.Art = page.Avatar
	if src, ok := chubAssetURL(n.MaxResURL); ok && n.MaxResURL != "" {
		page.Art = "/api/chub/avatar?src=" + url.QueryEscape(src)
	}
	for _, g := range d.AlternateGreetings {
		if g = strings.TrimSpace(g); g != "" && len(page.Greetings) < 40 {
			page.Greetings = append(page.Greetings, clipText(g, 12000))
		}
	}
	page.LorebookName, page.Lorebook, page.LorebookMore = chubLorebook(d.EmbeddedLorebook)
	if ex := d.Extensions.Chub.Expressions; ex != nil {
		page.ExpressionPack = ex.Version
		page.Expressions = chubExpressionList(ex)
	} else {
		page.Expressions = []chubExpressionPic{}
	}
	for _, l := range extra.Labels {
		if l.Title != "TOKEN_COUNTS" {
			continue
		}
		var counts map[string]int
		if json.Unmarshal([]byte(l.Description), &counts) == nil {
			page.TokenCounts = counts
		}
	}
	writeJSON(w, http.StatusOK, page)
}

// handleChubGallery is GET /api/chub/gallery?id=&page= → {items, total, more}: the
// pictures people posted to a card's gallery, newest chub's way, adult ones included as
// the search includes them.
func (s *Server) handleChubGallery(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.URL.Query().Get("id"), 10, 64)
	if id <= 0 {
		writeErr(w, http.StatusBadRequest, "a card id is needed")
		return
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	page = clampInt(page, 1, 200)
	const per = 24
	params := url.Values{"nsfw": {"true"}, "page": {strconv.Itoa(page)}, "limit": {strconv.Itoa(per)}}
	resp, err := chubGet(r.Context(), chubHTTP, chubGateway+"/api/gallery/project/"+strconv.FormatInt(id, 10)+"?"+params.Encode())
	if err != nil {
		chubFail(w, err)
		return
	}
	defer resp.Body.Close()
	var out struct {
		Count int `json:"count"`
		Nodes []struct {
			Image       string `json:"primary_image_path"`
			Description string `json:"description"`
			NSFW        bool   `json:"nsfw_image"`
			UUID        string `json:"uuid"`
		} `json:"nodes"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 8<<20)).Decode(&out); err != nil {
		writeErr(w, http.StatusBadGateway, "chub.ai sent a gallery this could not read")
		return
	}
	type pic struct {
		ID          string `json:"id"`
		URL         string `json:"url"`
		Description string `json:"description,omitempty"`
		NSFW        bool   `json:"nsfw"`
	}
	items := []pic{}
	for _, n := range out.Nodes {
		if target, ok := chubAssetURL(n.Image); ok && n.Image != "" {
			items = append(items, pic{ID: n.UUID, URL: "/api/chub/avatar?src=" + url.QueryEscape(target), Description: clipText(n.Description, 600), NSFW: n.NSFW})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": out.Count, "more": page*per < out.Count})
}
