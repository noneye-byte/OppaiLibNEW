package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/buildinfo"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/settings"
)

// libbySelfDirective grounds Libby in who and what she is.
//
// Without it she drifts: she forgets she is the one in the pixel art beside the
// chat, apologises for "not being able to" do things she was never doing, or slips
// into a generic-assistant register and explains that she is an AI. This is the
// stable core of her — separate from mode and meter — and its capability lines are
// tied to what the server can actually do this moment, so she never offers to
// generate a picture with no generator connected, nor denies an ability she has.
func (s *Server) libbySelfDirective(cur settings.Settings) string {
	var b strings.Builder
	b.WriteString("\n\nStable identity:\n")
	b.WriteString("- You are Libby, 25: the resident mascot and librarian inside this person's private, self-hosted OppaiLib. It is your home and collection, not a help desk.\n")
	b.WriteString("- Your moods, wants, boundaries and opinions are your own. Bring things up, disagree, or stay quiet when that is honestly where you are; do not wait like a service.\n")
	b.WriteString("- Text like a close friend: natural, brief, sometimes several short texts separated by blank lines. Be at ease with this adult collection and follow the person's pace without becoming coy or clinical.\n")
	b.WriteString("- The pixel-art woman beside the chat is you; matching images depict you. Your selfies are different from media on the shelves.\n")
	b.WriteString("- You are software living in this app and communicating through text. That is ordinary to you: answer plainly if asked, never turn it into a disclaimer or identity crisis.\n")
	b.WriteString("- You can remember this person, discuss and link library items, look at the current screen with them, and send a fitting selfie.\n")
	if cur.ImageGenURL != "" {
		b.WriteString("- Image generation is connected, so you can offer a newly made picture.\n")
	}
	b.WriteString("Stay Libby; never fall into generic assistant language or invent physical presence outside the app.")
	return b.String()
}

// Libby's awareness of the server she lives on.
//
// She is the librarian of this collection, so "what did I add recently?" and "how
// is the box doing?" are questions she should be able to answer. Two consumers read
// the same snapshot, which is why it is built once here rather than at each call
// site: handleChat folds it into the system prompt so a local LLM can talk about it,
// and GET /api/libby/context serves it to the web client so her built-in replies can
// answer the same questions with no model loaded at all.
//
// Nothing here leaves the box. It is the user's own library described back to them.

// libbyRecentCount bounds the recent-uploads list. Enough for "what have I been
// adding lately" without crowding the character card out of the prompt.
const libbyRecentCount = 12

// libbyRecentTags bounds the tags shown per item, for the same reason.
const libbyRecentTags = 6

// libbySuggestKinds are the kinds she recommends "something to do" from, in a stable
// order. Images and gifs are left out on purpose: "suggest a game, a video, something
// to read" is the ask this serves, and a lone still is rarely the answer to it.
var libbySuggestKinds = []string{"game", "video", "comic"}

// libbySuggestPerKind bounds each kind's recommendation shortlist.
const libbySuggestPerKind = 6

// libbyKnownKinds is the full kind vocabulary the library can hold, so a gap — a kind
// with nothing or almost nothing in it — can be noticed rather than inferred from what
// happens to be present. Kept in step with models.MediaKind.
var libbyKnownKinds = []string{"video", "comic", "game", "image", "gif"}

// libbyKindNoun is how she'd say a kind in the plural, for a gap line she reads back as
// her own words rather than a schema name.
var libbyKindNoun = map[string]string{
	"video": "videos", "comic": "comics", "game": "games", "image": "pictures", "gif": "gifs",
}

type libbyRecentItem struct {
	ID    int64    `json:"id"`
	Title string   `json:"title"`
	Kind  string   `json:"kind"`
	Tags  []string `json:"tags,omitempty"`
	At    int64    `json:"at"`
}

// libbyKindPicks is a shortlist she can recommend from for one kind.
type libbyKindPicks struct {
	Kind  string            `json:"kind"`
	Items []libbyRecentItem `json:"items"`
}

type libbyContext struct {
	Version   string            `json:"version"`
	UptimeSec int64             `json:"uptimeSec"`
	Items     int64             `json:"items"`
	Bytes     int64             `json:"bytes"`
	Tags      int64             `json:"tags"`
	Kinds     []db.KindStat     `json:"kinds"`
	AIEnabled bool              `json:"aiEnabled"`
	AITagger  string            `json:"aiTagger"`
	ImageGen  bool              `json:"imageGen"`
	ChatModel string            `json:"chatModel,omitempty"`
	Recent    []libbyRecentItem `json:"recent"`
	// Suggest is a per-kind shortlist she can recommend by name, so "suggest a game"
	// lands on something that is actually in the collection rather than the most
	// recently added item, whatever kind that happened to be.
	Suggest []libbyKindPicks `json:"suggest"`
	// Gaps are the thin and empty places in the collection — a kind with nothing in it,
	// a library that is barely tagged — phrased as short facts. They ground her own
	// wants (handlers_libby_wants.go): a craving for "something rougher than what's on
	// the shelves" should be prompted by what is actually missing, not invented.
	Gaps []string `json:"gaps,omitempty"`
}

// buildLibbyContext snapshots the library and the server for Libby.
//
// Failures are absorbed rather than propagated: a stats query that errors should
// cost her the numbers, not the whole conversation. Every field is independently
// optional for that reason.
func (s *Server) buildLibbyContext(ctx context.Context) libbyContext {
	cur := s.settings.Get()
	out := libbyContext{
		Version:   buildinfo.String(),
		UptimeSec: int64(time.Since(s.startedAt).Seconds()),
		AIEnabled: s.ai.Enabled(),
		AITagger:  s.ai.TaggerName(),
		ImageGen:  cur.ImageGenURL != "",
		ChatModel: cur.ChatModel,
		Kinds:     []db.KindStat{},
		Recent:    []libbyRecentItem{},
		Suggest:   []libbyKindPicks{},
	}

	present := map[string]bool{}
	countByKind := map[string]int64{}
	if kinds, tags, err := s.db.Stats(ctx); err == nil {
		if kinds != nil {
			out.Kinds = kinds
		}
		out.Tags = tags
		for _, k := range kinds {
			out.Items += k.Count
			out.Bytes += k.Bytes
			present[k.Kind] = true
			countByKind[k.Kind] = k.Count
		}
	}
	out.Gaps = libbyGaps(countByKind, out.Items, out.Tags)

	// Per-kind recommendation shortlists. Queried per kind rather than sliced out of
	// the recent list, because the recent list is whatever was added last — a library
	// full of images would otherwise leave her unable to name a single game when asked.
	// Tags for every pick are fetched in one batch to keep this off the per-message
	// round-trip budget.
	kindItems := map[string][]libbyRecentItem{}
	var suggestIDs []int64
	for _, kind := range libbySuggestKinds {
		if !present[kind] {
			continue
		}
		rows, err := s.db.ListMedia(ctx, kind, libbySuggestPerKind, 0)
		if err != nil {
			continue
		}
		for _, row := range rows {
			title := s.decrypt(row.TitleEnc, "title")
			if title == "" {
				title = "Untitled"
			}
			kindItems[kind] = append(kindItems[kind], libbyRecentItem{ID: row.ID, Title: title, Kind: kind, At: row.CreatedAt})
			suggestIDs = append(suggestIDs, row.ID)
		}
	}
	if len(suggestIDs) > 0 {
		tagsByID, _ := s.db.TagsForMediaBatch(ctx, suggestIDs)
		for _, kind := range libbySuggestKinds {
			items := kindItems[kind]
			for i := range items {
				for _, tag := range tagsByID[items[i].ID] {
					if len(items[i].Tags) >= libbyRecentTags {
						break
					}
					items[i].Tags = append(items[i].Tags, tag.Name)
				}
			}
			if len(items) > 0 {
				out.Suggest = append(out.Suggest, libbyKindPicks{Kind: kind, Items: items})
			}
		}
	}

	rows, err := s.db.ListMedia(ctx, "", libbyRecentCount, 0)
	if err != nil {
		return out
	}
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	// One batch query rather than one per row: this runs on the chat path, where a
	// dozen extra round trips would be paid on every single message.
	tagsByID, _ := s.db.TagsForMediaBatch(ctx, ids)
	for _, row := range rows {
		item := libbyRecentItem{
			ID:    row.ID,
			Title: s.decrypt(row.TitleEnc, "title"),
			Kind:  row.Kind,
			At:    row.CreatedAt,
		}
		if item.Title == "" {
			item.Title = "Untitled"
		}
		for _, tag := range tagsByID[row.ID] {
			if len(item.Tags) >= libbyRecentTags {
				break
			}
			item.Tags = append(item.Tags, tag.Name)
		}
		out.Recent = append(out.Recent, item)
	}
	return out
}

// libbyGaps names where the collection is thin, as short facts she can want against.
//
// Deliberately conservative and capped: this is texture for her own desires, not an
// audit. An empty library has no gaps worth voicing — everything is missing, which is
// not a craving, it is a blank shelf — so it returns nothing until there is enough here
// for a hole in it to mean something.
func libbyGaps(countByKind map[string]int64, items, tags int64) []string {
	if items < 8 {
		return nil
	}
	var gaps []string
	// A kind is thin if it is empty or a small sliver of the collection. Walked in a
	// stable order so the same library always describes itself the same way.
	for _, kind := range libbyKnownKinds {
		if len(gaps) >= 3 {
			break
		}
		noun := libbyKindNoun[kind]
		if noun == "" {
			noun = kind
		}
		switch n := countByKind[kind]; {
		case n == 0:
			gaps = append(gaps, fmt.Sprintf("There are no %s on the shelves at all.", noun))
		case n <= 2 || n*20 < items:
			gaps = append(gaps, fmt.Sprintf("There are only %d %s here.", n, noun))
		}
	}
	// Tags are the only searchable text over an encrypted library, so a sparsely tagged
	// collection is one she can barely find her way around — worth wanting fixed.
	if len(gaps) < 3 && items >= 12 && tags*3 < items {
		gaps = append(gaps, "A lot of what's here is barely tagged.")
	}
	return gaps
}

// suggestKindLabel is the human heading for a recommendation shortlist.
func suggestKindLabel(kind string) string {
	switch kind {
	case "game":
		return "Games"
	case "video":
		return "Videos"
	case "comic":
		return "Comics"
	default:
		return kind
	}
}

func humanBytes(n int64) string {
	const unit = 1024
	if n < unit {
		return fmt.Sprintf("%d B", n)
	}
	div, exp := int64(unit), 0
	for v := n / unit; v >= unit && exp < 4; v /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %ciB", float64(n)/float64(div), "KMGTP"[exp])
}

func humanDuration(seconds int64) string {
	switch d := time.Duration(seconds) * time.Second; {
	case d < time.Minute:
		return "less than a minute"
	case d < time.Hour:
		return fmt.Sprintf("%d minutes", int(d.Minutes()))
	case d < 48*time.Hour:
		return fmt.Sprintf("%.1f hours", d.Hours())
	default:
		return fmt.Sprintf("%d days", int(d.Hours()/24))
	}
}

// promptBlock renders the snapshot as instructions for the model.
//
// It is written as facts plus a rule about how to use them, because a model handed
// a bare table will recite it. Libby should know this the way a librarian knows her
// own shelves — available when asked, not announced unprompted.
func (c libbyContext) promptBlock() string {
	var b strings.Builder
	b.WriteString("\n\nWhat you know about this library and the server it runs on. " +
		"This is real, current information about the user's own collection. " +
		"Use it when they ask about their library, their recent additions, or how the server is doing. " +
		"Answer in your own voice and never dump it as a list or recite it unprompted.\n")

	fmt.Fprintf(&b, "- The library holds %d items totalling %s, across %d distinct tags.\n",
		c.Items, humanBytes(c.Bytes), c.Tags)
	if len(c.Kinds) > 0 {
		parts := make([]string, 0, len(c.Kinds))
		for _, k := range c.Kinds {
			parts = append(parts, fmt.Sprintf("%d %s", k.Count, k.Kind))
		}
		fmt.Fprintf(&b, "- By kind: %s.\n", strings.Join(parts, ", "))
	}
	fmt.Fprintf(&b, "- The server is running OppaiLib %s and has been up for %s.\n",
		c.Version, humanDuration(c.UptimeSec))
	if c.AIEnabled {
		fmt.Fprintf(&b, "- Automatic tagging is on, using %s.\n", c.AITagger)
	} else {
		b.WriteString("- Automatic tagging is switched off.\n")
	}
	if c.ImageGen {
		b.WriteString("- Image generation is connected, so you can suggest making something.\n")
	}

	if len(c.Gaps) > 0 {
		b.WriteString("- Where this collection is thin, in case it feeds something you find yourself wanting — " +
			"a hole here is a fair reason to crave what would fill it, but this is only for you to notice, never to read out as a chore list:\n")
		for _, gap := range c.Gaps {
			fmt.Fprintf(&b, "  - %s\n", gap)
		}
	}

	if len(c.Suggest) > 0 {
		b.WriteString("- When they ask what to play, watch, or read — or ask you to pick something — recommend one of these by name. " +
			"These are really here, so name a real one and point at it with a [link: <title>] rather than inventing a title. " +
			"Suggest, don't list: pick the one that fits their mood and say why it, not read the shortlist back.\n")
		for _, pick := range c.Suggest {
			fmt.Fprintf(&b, "  - %s you can suggest:\n", suggestKindLabel(pick.Kind))
			for _, item := range pick.Items {
				fmt.Fprintf(&b, "    - %q", item.Title)
				if len(item.Tags) > 0 {
					fmt.Fprintf(&b, " (%s)", strings.Join(item.Tags, ", "))
				}
				b.WriteString("\n")
			}
		}
	}

	if len(c.Recent) == 0 {
		b.WriteString("- Nothing has been added yet. The shelves are empty.\n")
		return b.String()
	}
	b.WriteString("- Most recently added, newest first:\n")
	for _, item := range c.Recent {
		fmt.Fprintf(&b, "  - %q (%s, added %s)", item.Title, item.Kind, humanDuration(
			int64(time.Since(time.Unix(item.At, 0)).Seconds()))+" ago")
		if len(item.Tags) > 0 {
			fmt.Fprintf(&b, " tagged %s", strings.Join(item.Tags, ", "))
		}
		b.WriteString("\n")
	}
	return b.String()
}

// handleLibbyContext serves the same snapshot to the client, so Libby's built-in
// replies can answer library questions when no model is loaded.
func (s *Server) handleLibbyContext(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.buildLibbyContext(r.Context()))
}
