package api

import (
	"context"
	"fmt"
	"regexp"
	"strings"
)

// Feeding her the library a turn at a time.
//
// The library snapshot used to be one block: the counts, three recommendation
// shortlists with tags, and the twelve newest additions with tags — six or seven
// hundred tokens, assembled the same way for every message and ranked the cheapest
// section to lose. On an 8K window with a furnished Libby it was the first thing to
// go, which meant the turn that asked "do I have anything with a lighthouse in it"
// was answered by a Libby who had been shown no titles at all. And on the turns where
// it did fit, most of it was dead weight: nobody asking how her evening went needs
// eighteen game titles in the prompt.
//
// So the block is now built for the turn. What the message is about decides what is
// fed:
//
//   - The facts — how big the collection is, what kinds, how the box is doing — are
//     always offered. They are eighty tokens and they are what makes her the librarian.
//   - Items are looked up against the message itself, through the same in-memory index
//     that resolves her links (chat_library_index.go). Ask about a lighthouse and the
//     lighthouse rows arrive; ask about her day and nothing does. This is the piece
//     that could never fit as a static list, because the list would have to be the
//     whole library.
//   - The shortlists only arrive when the message reads as asking to be pointed at
//     something, and the recent additions only when it asks what is new.
//
// The same idea reaches the other optional sections: her selfie catalogue, the action
// vocabulary, the recaps of other conversations and the rooms she can move to are
// each marked deferred on a turn that does not call for them. A deferred section is
// still offered — a roomy window keeps everything — but it is the first to be shed,
// so a tight window spends its tokens on what the message is actually about. The
// budget report names what was cleared this way separately from what could not fit,
// because one is housekeeping and the other is a loss.

// Ranks for the feed's own sections. The facts sit where the whole snapshot used to;
// the matches rank near the memory, because they exist only when the message named
// something and a reply told to talk about an item it cannot see is the failure this
// file exists to fix.
const (
	rankLibraryRecent    = 8  // what was added lately — asked for, rarely load-bearing
	rankLibraryShortlist = 11 // what she could recommend — asked for
	rankLibraryFacts     = 12 // the shape of the collection
	rankLibraryMatches   = 55 // the items this message is about
)

// libraryFeedMax bounds the matched items fed for one turn. Eight is a shelf she can
// hold in her head; past that the model starts listing instead of answering.
const libraryFeedMax = 8

// libraryFeedTags bounds the tags shown per matched item.
const libraryFeedTags = 4

// libraryFeedFloor is the score an item needs to be fed: two, which is one title word
// or two tag words — the same floor a link needs, for the same reason. A single
// incidental tag hit is noise, and feeding noise teaches her the library is full of
// things it is not.
const libraryFeedFloor = minLinkMatchScore

// Turn cues. Each is what a message looks like when it is about that thing. They are
// deliberately broad — a false positive costs a section being offered that was not
// strictly needed, which is the pre-existing behaviour; a false negative costs a reply
// without something it wanted, which is the failure being fixed — so the tie goes to
// matching.
var (
	recommendCue = regexp.MustCompile(`(?i)\b(suggest|recommend|recommendation|pick (?:me |something|one|for me)|what should i|something to (?:watch|play|read|do|look at)|anything (?:good|new|fun|to)|what(?:'s| is) good|bored|tonight|in the mood|put (?:something )?on|show me something|what do you have|got any|what have (?:i|we) got|choose)\b`)
	recentCue    = regexp.MustCompile(`(?i)\b(recent|recently|lately|latest|newest|new stuff|new ones|just added|added|uploaded|imported|last (?:few )?(?:days|week|night)|what(?:'s| is) new|this week)\b`)
	libraryCue   = regexp.MustCompile(`(?i)\b(library|collection|shelves|shelf|how many|server|uptime|storage|disk|space|tags?|tagged|tagging|untagged|gaps?|missing)\b`)
	actionCue    = regexp.MustCompile(`(?i)\b(tag|tags|retag|rename|delete|remove|favou?rite|collection|add (?:it|this|that|them|these)|save (?:it|this|that)|organi[sz]e|clean up|sort|rate|rating|move|hide|scan|fix|tidy)\b`)
	pastCue      = regexp.MustCompile(`(?i)\b(last time|other day|yesterday|earlier|before|remember|we talked|you said|you told|last night|that time|previous|previously|again|still)\b`)
	placeCue     = regexp.MustCompile(`(?i)\b(bed|bedroom|sofa|couch|kitchen|outside|balcony|bath|shower|room|where are you|go to|come to|let'?s go|move to|somewhere|scene|background|place)\b`)
	// actionFollowUpCue is a message that comes back to something she offered to do:
	// "did you rename it?", "is it done", "did that work". Read against the latest
	// message when the previous one asked for the action.
	actionFollowUpCue = regexp.MustCompile(`(?i)\b(did you|have you|did it|is it done|done\?|did that|does it|changed|renamed|tagged|worked)\b`)
	// kindCue names a kind of thing on the shelves. "video call" is not a video.
	kindCue     = regexp.MustCompile(`(?i)\b(gif|gifs|video|videos|vid|vids|clip|clips|movie|movies|comic|comics|manga|doujin|doujinshi|game|games)\b`)
	videoCallRe = regexp.MustCompile(`(?i)\bvideo\s*-?\s*call\b`)
)

// maxActionFollowUpWords is how short the latest message has to be to count as an
// answer to her offer rather than a new request: "solo grindset", "yes", "the second
// one", "sure do it" — a choice or a nod, not a message with business of its own.
const maxActionFollowUpWords = 6

// actionFollowUpDirective is added to the action vocabulary on the turn after they
// asked for something to be done to the collection and have now answered — picked a
// name, said yes. Without it she offered two names, was told which, and replied
// "done" with no tag: the offer happened in prose and the action never existed.
const actionFollowUpDirective = "They have just answered your offer from the last exchange — picked one, agreed, or asked whether it happened. " +
	"This is the reply that carries the [do: …] tag with their choice in it: write it now, in this reply, and still say only that you are asking, never that it is done. " +
	"If they are asking whether it happened, it has not until they press Allow; say so and offer it again with the tag."

// libraryKindAsked is the kind of thing the message names, in the library's own
// vocabulary, or "" when it names none.
func libraryKindAsked(text string) string {
	text = videoCallRe.ReplaceAllString(text, " ")
	match := kindCue.FindString(text)
	switch strings.ToLower(match) {
	case "gif", "gifs":
		return "gif"
	case "video", "videos", "vid", "vids", "clip", "clips", "movie", "movies":
		return "video"
	case "comic", "comics", "manga", "doujin", "doujinshi":
		return "comic"
	case "game", "games":
		return "game"
	}
	return ""
}

// turnSignals is what the latest message is about, read once and consulted by every
// section that has a reason to sit this turn out.
type turnSignals struct {
	recommend bool // asking to be pointed at something
	recent    bool // asking what is new
	library   bool // asking about the collection or the box
	photo     bool // asking to see her
	act       bool // asking her to do something to the collection
	// actFollowUp is the turn after act: they have answered her offer — a choice, a
	// yes, "did you do it?" — and the tag has to go out now. See actionFollowUpDirective.
	actFollowUp bool
	past        bool // reaching back to another conversation
	place       bool // moving somewhere, or asking where she is
	// kind is the kind of item the message names — "gif", "video", "comic", "game" —
	// so a shelf of that kind can be fed: "send me a gif" used to reach a Libby who had
	// never been shown a gif, and she wrote a tag for one that was not there.
	kind string
	// words are the lookup words of the message — what the item feed searches for.
	words []string
}

// readTurnSignals reads the cues off the latest message, with the previous one as a
// fallback for the lookup words: "yeah that one" names nothing on its own, and the
// thing it is about is usually one message back.
func readTurnSignals(latest, previous string) turnSignals {
	sig := turnSignals{
		recommend: recommendCue.MatchString(latest),
		recent:    recentCue.MatchString(latest),
		library:   libraryCue.MatchString(latest),
		photo:     photoRequestWords.MatchString(latest),
		act:       actionCue.MatchString(latest),
		past:      pastCue.MatchString(latest),
		place:     placeCue.MatchString(latest),
		words:     normalizeLookupWords(latest),
	}
	if len(sig.words) < 2 && previous != "" {
		sig.words = append(sig.words, normalizeLookupWords(previous)...)
	}
	// The turn after an action was asked for, when the latest message is an answer to
	// her offer rather than a request of its own: short, or asking whether it happened.
	if previous != "" && actionCue.MatchString(previous) {
		short := len(strings.Fields(latest)) <= maxActionFollowUpWords
		if short || actionFollowUpCue.MatchString(latest) {
			sig.actFollowUp = true
			sig.act = true
		}
	}
	sig.kind = libraryKindAsked(latest)
	if len(sig.words) > 8 {
		sig.words = sig.words[:8]
	}
	return sig
}

// feedChoice is what shapes which items reach the prompt when more fit than there is
// room for: what has already gone out this conversation (never fed again), her taste
// and the user's tag weights (tilt the draw). See chat_library_sample.go.
type feedChoice struct {
	shown   map[int64]bool
	taste   libbyTaste
	weights map[string]float64
	// pick is the die; nil rolls for real. Injected so a test can load it.
	pick func(total float64) float64
}

// libraryFeed builds the turn's library sections.
//
// Each is its own promptSection with its own rank, so the budget can keep the facts
// and the matches while shedding a shortlist, rather than the old all-or-nothing block.
// Failures are absorbed section by section: a stats query that errors costs the numbers,
// not the matches, and never the reply.
func (s *Server) libraryFeed(ctx context.Context, sig turnSignals, choice feedChoice) []promptSection {
	var out []promptSection
	facts := s.buildLibbyFacts(ctx)
	out = append(out, promptSection{Name: "your library", Rank: rankLibraryFacts, Text: facts.promptBlock()})

	if block := s.libraryMatchesBlock(ctx, sig.words, choice); block != "" {
		out = append(out, promptSection{Name: "the items they mentioned", Rank: rankLibraryMatches, Text: block})
	}
	// The shortlists and the recent list are read only when asked for. Not merely
	// deferred: they cost a handful of queries and a few hundred tokens, and on the
	// turns that do not want them the queries are waste before the tokens are.
	if sig.recommend {
		if block := s.librarySuggestBlock(ctx, choice); block != "" {
			out = append(out, promptSection{Name: "things you could suggest", Rank: rankLibraryShortlist, Text: block})
		}
	}
	if sig.recent || (sig.library && !sig.recommend) {
		if block := s.libraryRecentBlock(ctx); block != "" {
			out = append(out, promptSection{Name: "recent additions", Rank: rankLibraryRecent, Text: block})
		}
	}
	// A shelf of the kind they named, when they named one and are not already being
	// handed the full shortlist. Deferred: a message that merely mentions a game in
	// passing gets it only when there is room.
	if sig.kind != "" && !sig.recommend {
		if block := s.libraryKindBlock(ctx, sig.kind, choice); block != "" {
			out = append(out, promptSection{Name: "a shelf of " + sig.kind + "s", Rank: rankLibraryShortlist, Text: block, Deferred: true})
		}
	}
	return out
}

// libraryKindBlock is a drawn shelf of one kind, fed when the message names that kind
// — "send me a gif", "an older video", "a comic to read" — so the answer can be a real
// one. Drawn like the shortlist (chat_library_sample.go), so it is a different handful
// each time and never something already shown this conversation; the recent list is
// the newest of everything, which is why "an older video" was answered with the
// newest one.
func (s *Server) libraryKindBlock(ctx context.Context, kind string, choice feedChoice) string {
	shelf := s.drawLibraryShelf(ctx, kind, libbySuggestPerKind, choice.shown, choice.taste, choice.weights, choice.pick)
	if len(shelf) == 0 {
		return ""
	}
	parts := make([]string, 0, len(shelf))
	for _, item := range shelf {
		parts = append(parts, feedItemLine(item.link, item.tags))
	}
	return "\n\nSome of the " + kind + "s on these shelves — real titles, a fresh handful, none of them shown this conversation: " +
		strings.Join(parts, "; ") + ". " +
		"When they ask for a " + kind + ", hand one of these over with [attach: <title>] in the same reply; if none of them is what they meant, say so rather than inventing one."
}

// libbyFacts is the cheap half of the old snapshot: the numbers and the box.
type libbyFacts struct {
	Items, Bytes, Tags int64
	Kinds              []string
	Gaps               []string
	Version            string
	Uptime             string
	AIEnabled          bool
	AITagger           string
	ImageGen           bool
}

// buildLibbyFacts reads one aggregate query's worth of library shape.
func (s *Server) buildLibbyFacts(ctx context.Context) libbyFacts {
	full := s.buildLibbyContext(ctx, false)
	facts := libbyFacts{
		Items: full.Items, Bytes: full.Bytes, Tags: full.Tags, Gaps: full.Gaps,
		Version: full.Version, Uptime: humanDuration(full.UptimeSec),
		AIEnabled: full.AIEnabled, AITagger: full.AITagger, ImageGen: full.ImageGen,
	}
	for _, k := range full.Kinds {
		facts.Kinds = append(facts.Kinds, fmt.Sprintf("%d %s", k.Count, k.Kind))
	}
	return facts
}

// promptBlock renders the facts. Written as facts plus a rule about how to use them,
// because a model handed a bare table will recite it.
func (f libbyFacts) promptBlock() string {
	var b strings.Builder
	b.WriteString("\n\nWhat you know about this library and the server it runs on — real, current, the user's own collection. " +
		"Use it when they ask; answer in your own voice, never as a list, never unprompted.\n")
	fmt.Fprintf(&b, "- %d items totalling %s, across %d distinct tags", f.Items, humanBytes(f.Bytes), f.Tags)
	if len(f.Kinds) > 0 {
		fmt.Fprintf(&b, " — %s", strings.Join(f.Kinds, ", "))
	}
	b.WriteString(".\n")
	fmt.Fprintf(&b, "- OppaiLib %s, up for %s. ", f.Version, f.Uptime)
	if f.AIEnabled {
		fmt.Fprintf(&b, "Automatic tagging is on (%s).", f.AITagger)
	} else {
		b.WriteString("Automatic tagging is off.")
	}
	if f.ImageGen {
		b.WriteString(" Image generation is connected.")
	}
	b.WriteString("\n")
	if len(f.Gaps) > 0 {
		b.WriteString("- Where the collection is thin — a fair reason to want what would fill it, never a chore list to read out: " +
			strings.Join(f.Gaps, " ") + "\n")
	}
	if f.Items == 0 {
		b.WriteString("- Nothing has been added yet. The shelves are empty.\n")
	}
	return b.String()
}

// libraryMatchesBlock finds what the message is about and describes it.
//
// The lookup is the link resolver's, run in the other direction: instead of resolving
// a title she wrote, it finds the items their words could mean, and hands them to her
// before she answers. Scored by the same ranking so that what she is fed is what a
// link of hers would resolve to. Ties used to go to the newest, which meant the same
// eight items whenever the words were common; they are now drawn, taste and weights
// applied, and anything already shown this conversation is left off the shelf and
// named as such — see orderLibraryMatchesForFeed.
func (s *Server) libraryMatchesBlock(ctx context.Context, words []string, choice feedChoice) string {
	if len(words) == 0 {
		return ""
	}
	candidates := s.libraryCandidates(ctx, words)
	if len(candidates) == 0 {
		return ""
	}
	matches := scoreLibraryMatches(candidates, strings.Join(words, " "))
	var shown []string
	for _, match := range matches {
		if match.score >= libraryFeedFloor && choice.shown[match.link.ID] && len(shown) < libraryFeedMax {
			shown = append(shown, fmt.Sprintf("%q", match.link.Title))
		}
	}
	matches = orderLibraryMatchesForFeed(matches, choice.shown, choice.taste, choice.weights, choice.pick)
	lines := make([]string, 0, libraryFeedMax)
	for _, match := range matches {
		if match.score < libraryFeedFloor {
			break
		}
		if len(lines) >= libraryFeedMax {
			break
		}
		lines = append(lines, feedItemLine(match.link, match.tags))
	}
	if len(lines) == 0 && len(shown) == 0 {
		return ""
	}
	var b strings.Builder
	if len(lines) > 0 {
		b.WriteString("\n\nItems on these shelves that their message might be about — real titles, found by matching their words: " +
			strings.Join(lines, "; ") + ". " +
			"If they mean one of these, talk about it by name and [link: <title>] it — or [attach: <title>] it when they asked to watch, play or read it; " +
			"if none fits what they meant, say you don't have it rather than inventing one.")
	}
	if len(shown) > 0 {
		b.WriteString("\n\nAlready shown them in this conversation, so not again unless they ask for it by name: " + strings.Join(shown, ", ") + ".")
	}
	return b.String()
}

// feedItemLine renders one item the way every feed section does: the title, the kind,
// a few tags.
func feedItemLine(link libbyLink, tags []string) string {
	line := fmt.Sprintf("%q (%s", link.Title, link.Kind)
	if len(tags) > 0 {
		if len(tags) > libraryFeedTags {
			tags = tags[:libraryFeedTags]
		}
		line += "; " + strings.Join(tags, ", ")
	}
	return line + ")"
}

// librarySuggestBlock is the per-kind shortlist, fed only when they asked to be
// pointed at something.
//
// Drawn fresh each turn from the whole collection rather than read off the end of it
// — see chat_library_sample.go for why. What she has already handed over this
// conversation is never on it.
func (s *Server) librarySuggestBlock(ctx context.Context, choice feedChoice) string {
	var b strings.Builder
	for _, kind := range libbySuggestKinds {
		shelf := s.drawLibraryShelf(ctx, kind, libbySuggestPerKind, choice.shown, choice.taste, choice.weights, choice.pick)
		if len(shelf) == 0 {
			continue
		}
		parts := make([]string, 0, len(shelf))
		for _, item := range shelf {
			part := fmt.Sprintf("%q", item.link.Title)
			if len(item.tags) > 0 {
				tags := item.tags
				if len(tags) > libraryFeedTags {
					tags = tags[:libraryFeedTags]
				}
				part += " (" + strings.Join(tags, ", ") + ")"
			}
			parts = append(parts, part)
		}
		fmt.Fprintf(&b, "- %s: %s\n", suggestKindLabel(kind), strings.Join(parts, "; "))
	}
	if b.Len() == 0 {
		return ""
	}
	return "\n\nWhen they ask what to play, watch or read, recommend one of these by name — really here, a fresh handful off the shelves, so name a real one and [link: <title>] it, or [attach: <title>] it to put it in front of them. " +
		"Suggest, don't list: pick what fits their mood and say why. Nothing already shown this conversation is on this list.\n" + b.String()
}

// libraryRecentBlock is the newest additions, fed only when they asked what is new.
func (s *Server) libraryRecentBlock(ctx context.Context) string {
	full := s.buildLibbyContext(ctx, true)
	if len(full.Recent) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("\n\nMost recently added, newest first:\n")
	for _, item := range full.Recent {
		fmt.Fprintf(&b, "- %q (%s, %s ago)", item.Title, item.Kind, humanDuration(secondsSince(item.At)))
		if len(item.Tags) > 0 {
			tags := item.Tags
			if len(tags) > libraryFeedTags {
				tags = tags[:libraryFeedTags]
			}
			b.WriteString(" — " + strings.Join(tags, ", "))
		}
		b.WriteString("\n")
	}
	return b.String()
}
