package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/buildinfo"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/mcp"
)

// The library, as a Model Context Protocol server.
//
//	POST   /api/mcp              (MCP key)  the protocol: initialize, tools/list, tools/call
//	POST   /api/mcp/keys         (session)  {name} → {key}: a key for an MCP client, shown once
//	GET    /api/mcp/keys         (session)  the keys handed out
//	DELETE /api/mcp/keys/{id}    (session)  revoke one
//
// Libby used to be handed the library. Every turn, what the message seemed to be about
// was guessed by a dozen regexes — a recommendation cue, a recency cue, a kind named —
// and the matching rows, shortlists and recent additions were written into her prompt
// before she said a word (chat_context_feed.go). It worked when the guess was right and
// cost hundreds of tokens of window every time; and when the guess was wrong she had
// nothing, because she could not ask.
//
// Now she asks. These tools are how anything reads the shelves: Libby's turn calls them
// in-process, through the same registry an outside client reaches over HTTP, so there is
// one implementation of "search the library" and her prompt holds only what she looked
// up. The pushed feed is kept for the windows too small to offer tools at all.
//
// Everything here is read-only. Acting on the library is still Libby's offer and the
// user's Allow (buildLibbyAction), and an outside client gets no way to change anything.
// Titles and notes are decrypted in memory for the answer and never written anywhere.

const (
	toolSearchLibrary  = "search_library"
	toolLibraryItem    = "library_item"
	toolSuggestLibrary = "suggest_from_library"
	toolRecentLibrary  = "recent_additions"
	toolLibraryInfo    = "library_overview"
	toolWatching       = "what_was_watching"

	// scopeMCP is a key that opens the MCP endpoint and nothing else.
	scopeMCP = "mcp"
	// mcpSearchMax bounds one search's answer: past it a model lists instead of choosing.
	mcpSearchMax = 25
)

// libbyLibraryTools are the ones offered to her, in the order they are offered. The
// overview and what they were watching stay in her prompt — they are small and she
// needs them unasked — so they are for outside clients only.
var libbyLibraryTools = []string{toolSearchLibrary, toolLibraryItem, toolSuggestLibrary, toolRecentLibrary}

// libraryKinds is the kind vocabulary a tool accepts, "any" first.
var libraryKinds = []string{"any", "video", "gif", "image", "comic", "game"}

// librarian is who is asking and what shapes the answer: whose bookmarks and progress,
// what has already been shown in this conversation, her taste and their weights. An
// outside client has a user and nothing else.
type librarian struct {
	userID int64
	choice feedChoice
}

type librarianKey struct{}

func withLibrarian(ctx context.Context, l librarian) context.Context {
	return context.WithValue(ctx, librarianKey{}, l)
}

func librarianFrom(ctx context.Context) librarian {
	if l, ok := ctx.Value(librarianKey{}).(librarian); ok {
		return l
	}
	var l librarian
	if u, ok := ctx.Value(userKey).(*db.UserRow); ok && u != nil {
		l.userID = u.ID
	}
	l.choice.userID = l.userID
	return l
}

// libraryMCP is the registry, built once.
func (s *Server) libraryMCP() *mcp.Server {
	s.mcpOnce.Do(func() { s.mcp = s.buildLibraryMCP() })
	return s.mcp
}

func (s *Server) buildLibraryMCP() *mcp.Server {
	m := mcp.New("oppailib-library", buildinfo.String(),
		"A personal media library: videos, gifs, pictures, comics and games. Titles are the owner's own. "+
			"Search before saying whether something is there; open an item for its details; ask for suggestions when the owner wants to be pointed at something.")
	object := func(props map[string]any, required ...string) map[string]any {
		out := map[string]any{"type": "object", "properties": props}
		if len(required) > 0 {
			out["required"] = required
		}
		return out
	}
	m.Add(mcp.Tool{
		Name: toolSearchLibrary, Title: "Search the library", ReadOnly: true,
		Description: "Look for things on the shelves by title, tags or what is in them. Use it before saying whether something is there or not — what it does not find is not there.",
		InputSchema: object(map[string]any{
			"query": str("Words to look for: a title, a subject, tags."),
			"kind":  enum("Only this kind.", libraryKinds),
			"limit": map[string]any{"type": "integer", "minimum": 1, "maximum": mcpSearchMax, "description": "At most this many (default 8)."},
		}, "query"),
		Call: s.mcpSearchLibrary,
	})
	m.Add(mcp.Tool{
		Name: toolLibraryItem, Title: "Open an item", ReadOnly: true,
		Description: "Everything known about one item: its tags, a description of what is in it, length, rating, notes, how far they got, the moments they marked.",
		InputSchema: object(map[string]any{
			"item": str("The item's title, or its id from a search."),
		}, "item"),
		Call: s.mcpLibraryItem,
	})
	m.Add(mcp.Tool{
		Name: toolSuggestLibrary, Title: "Suggest something", ReadOnly: true,
		Description: "A fresh handful of real titles to recommend from, drawn from the whole collection, leaving out what was already shown. For when they want to be pointed at something to watch, play or read.",
		InputSchema: object(map[string]any{
			"kind": enum("What kind of thing; any for a few of each.", libraryKinds),
		}),
		Call: s.mcpSuggestLibrary,
	})
	m.Add(mcp.Tool{
		Name: toolRecentLibrary, Title: "Recent additions", ReadOnly: true,
		Description: "What was added most recently, newest first.",
		InputSchema: object(map[string]any{
			"limit": map[string]any{"type": "integer", "minimum": 1, "maximum": mcpSearchMax, "description": "At most this many (default 10)."},
		}),
		Call: s.mcpRecentLibrary,
	})
	m.Add(mcp.Tool{
		Name: toolLibraryInfo, Title: "Library overview", ReadOnly: true,
		Description: "How big the collection is, by kind, and how the server is doing.",
		InputSchema: object(map[string]any{}),
		Call: func(ctx context.Context, _ map[string]any) (mcp.Result, error) {
			facts := s.buildLibbyFacts(ctx)
			return mcp.Result{Text: strings.TrimSpace(facts.promptBlock()), Structured: map[string]any{
				"items": facts.Items, "bytes": facts.Bytes, "tags": facts.Tags, "kinds": facts.Kinds, "version": facts.Version,
			}}, nil
		},
	})
	m.Add(mcp.Tool{
		Name: toolWatching, Title: "What they were watching", ReadOnly: true,
		Description: "The item they most recently left part-way through, if it was in the last few hours.",
		InputSchema: object(map[string]any{}),
		Call: func(ctx context.Context, _ map[string]any) (mcp.Result, error) {
			block := strings.TrimSpace(s.libraryWatchingBlock(ctx, librarianFrom(ctx).userID, time.Now()))
			if block == "" {
				return mcp.Result{Text: "Nothing has been open in the last few hours."}, nil
			}
			return mcp.Result{Text: block}, nil
		},
	})
	return m
}

func argIntIn(args map[string]any, key string, def, lo, hi int) int {
	n := def
	switch v := args[key].(type) {
	case float64:
		n = int(v)
	case int:
		n = v
	case string:
		if parsed, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
			n = parsed
		}
	}
	return clampInt(n, lo, hi)
}

func argKind(args map[string]any) string {
	kind := strings.ToLower(strings.TrimSpace(argString(args, "kind")))
	if kind == "any" {
		return ""
	}
	for _, k := range libraryKinds {
		if k == kind {
			return kind
		}
	}
	return ""
}

// mcpItem is one item as structured content.
type mcpItem struct {
	ID    int64    `json:"id"`
	Title string   `json:"title"`
	Kind  string   `json:"kind"`
	Tags  []string `json:"tags,omitempty"`
}

func (s *Server) mcpSearchLibrary(ctx context.Context, args map[string]any) (mcp.Result, error) {
	query := strings.TrimSpace(argString(args, "query"))
	if query == "" {
		return mcp.Result{Text: "Say what to look for.", IsError: true}, nil
	}
	kind := argKind(args)
	limit := argIntIn(args, "limit", libraryFeedMax, 1, mcpSearchMax)
	l := librarianFrom(ctx)
	words := normalizeLookupWords(query)
	matches := scoreLibraryMatches(s.libraryCandidates(ctx, words), query)
	var kept []libraryMatch
	var shown []string
	for _, m := range matches {
		if m.score < libraryFeedFloor || (kind != "" && m.link.Kind != kind) {
			continue
		}
		if l.choice.shown[m.link.ID] {
			if len(shown) < limit {
				shown = append(shown, fmt.Sprintf("%q", m.link.Title))
			}
			continue
		}
		kept = append(kept, m)
	}
	// The draw among close matches is the feed's: taste and weights tilt it, and the same
	// eight are not handed back every time the words are common.
	kept = orderLibraryMatchesForFeed(kept, nil, l.choice.taste, l.choice.weights, l.choice.pick)
	if len(kept) > limit {
		kept = kept[:limit]
	}
	if len(kept) == 0 && len(shown) == 0 {
		what := "anything"
		if kind != "" {
			what = "a " + kind
		}
		return mcp.Result{Text: fmt.Sprintf("Nothing on the shelves matches %q as %s. It is not in the library.", query, what), Structured: map[string]any{"items": []mcpItem{}}}, nil
	}
	items := make([]mcpItem, 0, len(kept))
	lines := make([]string, 0, len(kept))
	ids := make([]int64, 0, len(kept))
	for _, m := range kept {
		items = append(items, mcpItem{ID: m.link.ID, Title: m.link.Title, Kind: m.link.Kind, Tags: firstN(m.tags, 8)})
		lines = append(lines, fmt.Sprintf("- #%d %s", m.link.ID, feedItemLine(m.link, m.tags)))
		ids = append(ids, m.link.ID)
	}
	var b strings.Builder
	if len(lines) > 0 {
		fmt.Fprintf(&b, "Found %d for %q, best first:\n%s", len(lines), query, strings.Join(lines, "\n"))
	}
	if notes := s.bookmarkNotes(ctx, l.userID, ids); len(notes) > 0 {
		var marked []string
		for _, m := range kept {
			if note, ok := notes[m.link.ID]; ok {
				marked = append(marked, fmt.Sprintf("%q: %s", m.link.Title, note))
			}
		}
		b.WriteString("\nMarked moments: " + strings.Join(marked, " "))
	}
	if len(shown) > 0 {
		b.WriteString("\nAlready shown in this conversation: " + strings.Join(shown, ", ") + ".")
	}
	return mcp.Result{Text: strings.TrimSpace(b.String()), Structured: map[string]any{"items": items}}, nil
}

// resolveLibraryItem finds the item an argument means: an id ("#123" or "123"), or the
// best title match above the feed's floor.
func (s *Server) resolveLibraryItem(ctx context.Context, ref string) (int64, bool) {
	ref = strings.TrimSpace(ref)
	if id, err := strconv.ParseInt(strings.TrimPrefix(ref, "#"), 10, 64); err == nil && id > 0 {
		return id, true
	}
	matches := scoreLibraryMatches(s.libraryCandidates(ctx, normalizeLookupWords(ref)), ref)
	if len(matches) == 0 || matches[0].score < libraryFeedFloor {
		return 0, false
	}
	return matches[0].link.ID, true
}

func (s *Server) mcpLibraryItem(ctx context.Context, args map[string]any) (mcp.Result, error) {
	ref := argString(args, "item")
	if strings.TrimSpace(ref) == "" {
		return mcp.Result{Text: "Name the item, or give its id from a search.", IsError: true}, nil
	}
	id, ok := s.resolveLibraryItem(ctx, ref)
	if !ok {
		return mcp.Result{Text: fmt.Sprintf("Nothing on the shelves is %q.", ref), IsError: true}, nil
	}
	row, err := s.db.GetMedia(ctx, id)
	if err != nil || row == nil {
		return mcp.Result{Text: fmt.Sprintf("There is no item #%d.", id), IsError: true}, nil
	}
	l := librarianFrom(ctx)
	title := s.decrypt(row.TitleEnc, "title")
	if title == "" {
		title = "Untitled"
	}
	notes := strings.TrimSpace(s.decrypt(row.NotesEnc, "notes"))
	var description string
	if briefs, err := s.db.BriefsByIDs(ctx, []int64{id}); err == nil && len(briefs) == 1 {
		description = strings.TrimSpace(s.decrypt(briefs[0].DescriptionEnc, "description"))
	}
	var tags []string
	if byID, err := s.db.TagsForMediaBatch(ctx, []int64{id}); err == nil {
		for _, t := range byID[id] {
			tags = append(tags, t.Name)
		}
	}
	var b strings.Builder
	fmt.Fprintf(&b, "#%d %q — a %s", id, title, row.Kind)
	switch {
	case row.Duration.Valid && row.Duration.Float64 > 0:
		fmt.Fprintf(&b, ", %s long", formatTimecode(row.Duration.Float64))
	case row.PageCount.Valid && row.PageCount.Int64 > 0:
		fmt.Fprintf(&b, ", %d pages", row.PageCount.Int64)
	}
	if row.Width.Valid && row.Height.Valid && row.Width.Int64 > 0 {
		fmt.Fprintf(&b, ", %d×%d", row.Width.Int64, row.Height.Int64)
	}
	fmt.Fprintf(&b, ", added %s ago.", humanDuration(secondsSince(row.CreatedAt)))
	if row.Favorite {
		b.WriteString(" A favourite.")
	}
	if row.Rating > 0 {
		fmt.Fprintf(&b, " Rated %d of 5.", row.Rating)
	}
	if len(tags) > 0 {
		b.WriteString("\nTags: " + strings.Join(firstN(tags, 30), ", ") + ".")
	}
	if description != "" {
		b.WriteString("\nWhat is in it: " + description)
	}
	if notes != "" {
		b.WriteString("\nTheir notes: " + notes)
	}
	if l.userID != 0 {
		if progress, err := s.db.ProgressForMedia(ctx, l.userID, []int64{id}); err == nil {
			if p, ok := progress[id]; ok && p.Position > 0 {
				fmt.Fprintf(&b, "\nThey got %s in", formatTimecode(p.Position))
				if p.Duration > 0 {
					fmt.Fprintf(&b, " of %s", formatTimecode(p.Duration))
				}
				fmt.Fprintf(&b, ", %s ago.", humanDuration(secondsSince(p.UpdatedAt)))
			}
		}
		if note, ok := s.bookmarkNotes(ctx, l.userID, []int64{id})[id]; ok {
			b.WriteString("\nMoments they marked: " + note)
		}
	}
	if l.choice.shown[id] {
		b.WriteString("\nAlready shown in this conversation.")
	}
	return mcp.Result{Text: b.String(), Structured: map[string]any{
		"id": id, "title": title, "kind": row.Kind, "tags": tags, "favorite": row.Favorite, "rating": row.Rating,
		"description": description, "notes": notes, "createdAt": row.CreatedAt,
	}}, nil
}

func (s *Server) mcpSuggestLibrary(ctx context.Context, args map[string]any) (mcp.Result, error) {
	l := librarianFrom(ctx)
	kinds := libbySuggestKinds
	if kind := argKind(args); kind != "" {
		kinds = []string{kind}
	}
	var b strings.Builder
	var items []mcpItem
	for _, kind := range kinds {
		shelf := s.drawLibraryShelf(ctx, kind, libbySuggestPerKind, l.choice.shown, l.choice.taste, l.choice.weights, l.choice.pick)
		if len(shelf) == 0 {
			continue
		}
		parts := make([]string, 0, len(shelf))
		for _, it := range shelf {
			parts = append(parts, fmt.Sprintf("#%d %s", it.link.ID, feedItemLine(it.link, it.tags)))
			items = append(items, mcpItem{ID: it.link.ID, Title: it.link.Title, Kind: it.link.Kind, Tags: firstN(it.tags, 8)})
		}
		fmt.Fprintf(&b, "%s: %s\n", suggestKindLabel(kind), strings.Join(parts, "; "))
	}
	if b.Len() == 0 {
		return mcp.Result{Text: "There is nothing of that kind left to suggest that has not already been shown.", Structured: map[string]any{"items": []mcpItem{}}}, nil
	}
	return mcp.Result{Text: "A fresh handful, none already shown:\n" + strings.TrimSpace(b.String()), Structured: map[string]any{"items": items}}, nil
}

func (s *Server) mcpRecentLibrary(ctx context.Context, args map[string]any) (mcp.Result, error) {
	limit := argIntIn(args, "limit", 10, 1, mcpSearchMax)
	full := s.buildLibbyContext(ctx, true)
	if len(full.Recent) == 0 {
		return mcp.Result{Text: "Nothing has been added yet."}, nil
	}
	recent := full.Recent
	if len(recent) > limit {
		recent = recent[:limit]
	}
	lines := make([]string, 0, len(recent))
	items := make([]mcpItem, 0, len(recent))
	for _, it := range recent {
		line := fmt.Sprintf("- #%d %q (%s, %s ago)", it.ID, it.Title, it.Kind, humanDuration(secondsSince(it.At)))
		if len(it.Tags) > 0 {
			line += " — " + strings.Join(firstN(it.Tags, libraryFeedTags), ", ")
		}
		lines = append(lines, line)
		items = append(items, mcpItem{ID: it.ID, Title: it.Title, Kind: it.Kind, Tags: it.Tags})
	}
	return mcp.Result{Text: "Newest first:\n" + strings.Join(lines, "\n"), Structured: map[string]any{"items": items}}, nil
}

/* ------------------------------------------------------- Libby's side */

// libbyLibraryToolset is the library's tools as her turn offers them: the registry's
// definitions, rendered as the OpenAI tools her backend reads. A lean window gets the
// two she cannot do without — finding a thing and being asked for a suggestion.
func (s *Server) libbyLibraryToolset(level int) []llmTool {
	if level == toolsMinimal {
		return nil
	}
	reg := s.libraryMCP()
	byName := map[string]mcp.Tool{}
	for _, t := range reg.Tools() {
		byName[t.Name] = t
	}
	var out []llmTool
	for _, name := range libbyLibraryTools {
		if level == toolsLean && name != toolSearchLibrary && name != toolSuggestLibrary {
			continue
		}
		t, ok := byName[name]
		if !ok {
			continue
		}
		out = append(out, llmTool{Type: "function", Function: llmToolFunction{Name: t.Name, Description: t.Description, Parameters: t.InputSchema}})
	}
	return out
}

// libraryToolsOffered says her turn reaches the library by asking rather than being fed.
func libraryToolsOffered(level int) bool { return level != toolsMinimal }

// libraryPullNote is what her prompt says in place of the shelves it no longer carries.
const libraryPullNote = "\n\nYou cannot see the shelves from here — look. Before you say whether something is in the library, or name a title, search_library for it; " +
	"open one with library_item when you want to know what is in it; ask suggest_from_library when they want to be pointed at something, and recent_additions when they ask what is new. " +
	"Never name a title you have not seen in a result."

// execLibraryTool runs one of the library's tools for her. What she looked up is always
// worth another round: she has not said anything about it yet.
func (t *turnRun) execLibraryTool(name string, args map[string]any) (string, bool) {
	ctx := withLibrarian(t.ctx, librarian{userID: t.userID, choice: feedChoice{
		shown: t.p.sentLib, taste: t.p.taste, weights: t.v.ws.SendWeights, userID: t.userID,
	}})
	res, err := t.s.libraryMCP().Call(ctx, name, args)
	if err != nil {
		return "The library could not be read just now: " + err.Error() + ". Say so rather than guessing.", true
	}
	return res.Text, true
}

/* --------------------------------------------------------- the endpoint */

// handleMCP is the protocol endpoint. It is reached only with a key of the MCP scope —
// never a browser session — so a page on another site cannot drive it with the cookie
// a signed-in browser would send along.
func (s *Server) handleMCP(w http.ResponseWriter, r *http.Request) {
	if row, ok := r.Context().Value(apiKeyCtx).(*db.APIKeyRow); !ok || row.Scope != scopeMCP {
		writeErr(w, http.StatusForbidden, "the MCP endpoint takes an MCP key — make one under Settings")
		return
	}
	// The spec's DNS-rebinding guard: a browser that sent this has an Origin, and it
	// must be this server's own.
	if origin := r.Header.Get("Origin"); origin != "" {
		if u, err := url.Parse(origin); err != nil || !strings.EqualFold(u.Host, r.Host) {
			writeErr(w, http.StatusForbidden, "cross-origin MCP requests are refused")
			return
		}
	}
	s.libraryMCP().ServeHTTP(w, r)
}

func (s *Server) handleCreateMCPKey(w http.ResponseWriter, r *http.Request) {
	u, ok := r.Context().Value(userKey).(*db.UserRow)
	if !ok || u == nil {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	if _, isKey := r.Context().Value(apiKeyCtx).(*db.APIKeyRow); isKey {
		writeErr(w, http.StatusForbidden, "a key cannot make keys")
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	// An empty body is a key with the default name.
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req)
	name, _ := cleanLimited(req.Name, 80)
	if name = strings.TrimSpace(name); name == "" {
		name = "MCP client"
	}
	key := apiKeyPrefix + randomToken(32)
	id, err := s.db.CreateAPIKey(r.Context(), u.ID, scopeMCP, name, hashAPIKey(key), key[len(key)-4:])
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"key": key, "id": id, "name": name})
}

func (s *Server) handleListMCPKeys(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userKey).(*db.UserRow)
	keys, err := s.db.ListAPIKeys(r.Context(), u.ID, scopeMCP)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]apiKeyView, 0, len(keys))
	for _, k := range keys {
		out = append(out, apiKeyView{ID: k.ID, Name: k.Name, Hint: k.Hint, CreatedAt: k.CreatedAt, LastUsedAt: k.LastUsedAt})
	}
	sort.SliceStable(out, func(a, b int) bool { return out[a].CreatedAt > out[b].CreatedAt })
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "tools": s.libraryMCP().Names()})
}

func (s *Server) handleRevokeMCPKey(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userKey).(*db.UserRow)
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	// Only an MCP key: this list must not become a way to revoke Launchy's.
	keys, err := s.db.ListAPIKeys(r.Context(), u.ID, scopeMCP)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	found := false
	for _, k := range keys {
		found = found || k.ID == id
	}
	if !found {
		writeErr(w, http.StatusNotFound, "no such key")
		return
	}
	if _, err := s.db.DeleteAPIKey(r.Context(), u.ID, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// pulledFeedSignals is a turn's signals with everything that would push shelves into
// her prompt switched off — the matched items, the shortlists, the recent list and a
// kind's shelf are all things she now looks up herself. What is left feeds the facts
// and what they had on a moment ago.
func pulledFeedSignals(sig turnSignals) turnSignals {
	sig.words, sig.recommend, sig.recent, sig.library, sig.kind = nil, false, false, false, ""
	return sig
}
