package api

import (
	"context"
	"regexp"
	"strings"
)

// Putting something in front of the user.
//
// Libby could already do two things with a picture and neither of them was this. She
// could send a selfie — a file uploaded into her own chat gallery, matched by tags —
// and she could *name* a library item, which the link resolver turns into a chip
// beside her sentence. What she could not do is the thing anyone would expect of a
// librarian mid-conversation: hand you the item. "You never finished the beach one"
// is a sentence about a video; attaching it is the video.
//
// This file is that, and one other thing it turns out to be the same problem as.
//
// Her selfies were confined to the chat gallery, which is a second place to keep
// pictures of her that has nothing to do with the library the app exists to hold. The
// library already knows which items are of her — recognition writes character:libby
// onto the item itself, and the user can say so by hand (handlers_libby_identity.go)
// — and none of that reached the one feature it was obviously for. So a picture of
// her in the library is now a picture she can send, drawn from the same pool and
// ranked against the gallery on the same tag score.
//
// Both arrive at the client as attachments: library items, by id, that the viewer
// already knows how to open. A selfie found this way is marked as one so the client
// can say whose picture it is, but it is otherwise the same object — which is the
// point, because on screen "here is a picture of me" and "here, watch this" are both
// a picture in a bubble.
//
// Nothing here trusts the model with an id. It writes a title or a description; the
// resolver matches that against the user's own rows and returns what it found, or
// returns nothing and lets her words stand on their own.

const (
	// maxAttachmentsPerReply bounds what one message may hand over. One is the
	// overwhelming case and two is the most that has ever read as natural; a reply that
	// attaches four things is a search results page with a voice.
	maxAttachmentsPerReply = 2
	// maxSelfPictures bounds the library pictures of her folded into the catalogue. The
	// same ceiling as the gallery listing, for the same reason: this is a prompt
	// section competing with her character card for room.
	maxSelfPictures = 24
	// maxRecentMediaMemory bounds how many already-attached items a client may name.
	// Wider than maxRecentPhotoMemory on purpose: her gallery is a few dozen pictures
	// and ruling twelve out forever would empty it, but the library is hundreds or
	// thousands of items, and a long evening of "what else have you got" was coming
	// back round to the thirteenth-most-recent video. An item ruled out forever is
	// still an item removed from the library as far as this feature is concerned, so
	// the window is bounded rather than the whole conversation.
	maxRecentMediaMemory = 40
)

// libbyAttachment is one library item a reply hands over. It carries exactly what a
// client needs to draw it and open it; everything else it already knows how to fetch
// by id.
//
// libbyLink is embedded rather than copied because an attachment *is* a link with a
// different presentation — the same row, the same thumbnail, the same tap target —
// and the clients type them as one model.
type libbyAttachment struct {
	libbyLink
	// Self marks a picture of her, so a client can caption it as hers. Absent on an
	// ordinary item, which is the common case.
	Self bool `json:"self,omitempty"`
	// At is a moment in a video, in seconds, when she handed over a bookmarked part
	// rather than the whole thing — "[attach: the beach one @ 4:10]". The client opens
	// the item there. Zero is the start, which is the same as no moment at all.
	At float64 `json:"at,omitempty"`
}

// attachAtSuffix is the moment on the end of an attach request: " @ 4:10", "at 1:02:30".
// Read off before the title is matched, so the time is not searched for as a word.
var attachAtSuffix = regexp.MustCompile(`(?i)\s+(?:@|at)\s+(\d{1,2}(?::\d{2}){1,2})\s*$`)

// splitAttachMoment separates the moment from an attach request, when it carries one.
func splitAttachMoment(request string) (query string, at float64) {
	match := attachAtSuffix.FindStringSubmatchIndex(request)
	if match == nil {
		return request, 0
	}
	seconds, ok := parseTimecode(request[match[2]:match[3]])
	if !ok {
		return request, 0
	}
	return strings.TrimSpace(request[:match[0]]), seconds
}

// attachTag captures the request to hand something over. Anchored nowhere in
// particular, like the link tag and for the same reason: she attaches something while
// talking about it, so the tag lands wherever the sentence put it.
//
// "attach" is this file's alone. It used to be an accepted synonym in sendTag, where
// it meant a selfie, so a model that wrote [attach: the beach video] had its library
// request read as a picture request and silently dropped. Both readings still work,
// because an attach request that matches nothing in the library falls back to the
// photo path — see the handler.
//
// A library kind used as the tag head — "[gif: …]", "[video: …]" — is accepted as an
// attach too, but only with the delimiter: asked for a gif from the library, a model
// that had been given no gif to name wrote "[gif: <tags>]", which nothing read and the
// user then saw. Read as an attach it resolves against the library first, and falls
// back to a picture of her like any other unresolved attach. Bare "[video]" is left
// alone; that is a stage direction.
var attachTag = regexp.MustCompile(`(?i)\[\s*(?:attach(?:es|ing|ment)?\s*[:=-]?|(?:gif|gifs|video|videos|clip|clips)\s*[:=])\s*([^\]\n]{1,120}?)\s*\]`)

// attachDirective tells her she can hand something over, when to, and what it costs.
//
// Three things it has to do, and the middle one is the one it was missing. It has to be
// explicit that this is a different act from naming something, or a model uses whichever
// tag it saw last and every mention of an item becomes an attachment. It has to say what
// *triggers* it: a directive that only describes a capability is one a 7B never reaches
// for, and being asked to show, play or put something on is exactly the request this
// exists to answer — which is when it was most conspicuously not happening. And it has to
// say that a description will do, because the library snapshot is the first section the
// budget sheds, so on a busy turn she does not know what anything is called; the resolver
// matches loosely and falls back to the user's own words, and a model told to write only
// exact titles answers "show me the beach one" with an apology instead of the video.
const attachDirective = "Three different acts, and choosing the right one matters. [send: <tags>] is a selfie: a picture of you, for when they want to see you. " +
	"[attach: <library title, or how they described it>] puts one of their own library items in front of them, openable and playable — a video, gif, picture, comic or game. " +
	"That is what \"show me\", \"put on\", \"play\", \"send me the …\" and a recommendation you actually mean call for: agree in your own words and attach it in the same reply, never promise and then not; their description is a good enough query. " +
	"[link: <real title>] only makes a name tappable mid-sentence, for merely mentioning something. " +
	"They ask to see you → send. They ask for something to watch, play or read → attach. You are just talking about it → link. " +
	"At most one send or attach per reply, nothing already shown in this conversation, and never something you have not actually decided to show them."

// findAttachRequests reads every attach request out of a reply, in order, capped.
//
// Read before scrubDirectives, which deletes these tags along with the rest of the
// protocol — the same order the remember and want tags are read in, and for the same
// reason: the scrubber owns taking them out of the prose, this owns what they meant.
func findAttachRequests(reply string) []string {
	matches := attachTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return nil
	}
	var out []string
	for _, match := range matches {
		query := strings.TrimSpace(match[1])
		if query == "" {
			continue
		}
		out = append(out, query)
		if len(out) >= maxAttachmentsPerReply {
			break
		}
	}
	return out
}

// resolveLibraryAttachments turns what she asked to attach into real items.
//
// Unlike the link resolver this does not touch the prose: an attachment stands beside
// the message rather than inside a sentence, and the tag has already been taken out by
// the scrubber. A request that matches nothing resolves to nothing and is reported as
// such, so the caller can try reading it as a picture request instead.
//
// asked is the user's own latest message, and it is the difference between this working
// and not. The failure it exists for is the ordinary one: they say "put on the beach
// video", she agrees and writes [attach: the beach video] — a description rather than a
// title, because the library snapshot is the first section the budget sheds and she may
// genuinely not have been told what anything is called. Her words are tried first
// because when she does know the title they are the better query; theirs are tried after,
// because a request that named the thing is a query that was written by someone who could
// see it.
//
// taste is what she would rather look at, and decides between items that fit a request
// equally well — with a random draw after that, so "a girl with brown hair" does not
// hand over the newest such item every single time. weights are the user's own tag
// preferences, which tilt that draw: more of this, less of that, none of the other.
// See pickLibraryMatch and chat_send_weights.go.
//
// kind is the kind of thing the user asked for, when they named one — "gif", "video",
// "comic", "game" — and "" when they did not. Named, it is a hard rule and a rescue at
// once. The rule: nothing of another kind resolves, however well its title fits. Asked
// for a gif, she wrote the title of the newest video and the user got a video; asked
// again, she invented a filename ending in .mp4 and the extension alone matched a
// different video; corrected a third time, she wrote a selfie tag and "pixel art" found
// a game with "Pixels" in its name. Every one of those was the resolver doing what it
// was told with a query the user had already contradicted in one word. The rescue:
// when nothing of that kind fits her words or theirs, any unshown item of that kind is
// handed over — "send me a gif" is a request any gif answers, and a librarian asked for
// one does not come back with the wrong shelf or empty-handed.
func (s *Server) resolveLibraryAttachments(ctx context.Context, requests []string, asked string, kind string, skip map[int64]bool, taste libbyTaste, weights map[string]float64) []libbyAttachment {
	if len(requests) == 0 {
		return nil
	}
	queries := append([]string{}, requests...)
	if asked = strings.TrimSpace(asked); asked != "" {
		queries = append(queries, asked)
	}
	var words []string
	for _, query := range queries {
		query, _ = splitAttachMoment(query)
		words = append(words, normalizeLookupWords(query)...)
	}
	candidates := s.libraryCandidates(ctx, words)
	if kind != "" {
		kept := candidates[:0:0]
		for _, candidate := range candidates {
			if candidate.link.Kind == kind {
				kept = append(kept, candidate)
			}
		}
		candidates = kept
	}
	if len(candidates) == 0 && kind == "" {
		return nil
	}
	var out []libbyAttachment
	picked := map[int64]bool{}
	take := func(query string) {
		if len(out) >= maxAttachmentsPerReply {
			return
		}
		query, at := splitAttachMoment(query)
		// Already-shown items are skipped inside the pick rather than after it, so a
		// request that fits several things reaches for one she has not shown yet rather
		// than landing on the one she has and giving up.
		exclude := make(map[int64]bool, len(skip)+len(picked))
		for id := range skip {
			exclude[id] = true
		}
		for id := range picked {
			exclude[id] = true
		}
		link, found := pickWeightedLibraryMatch(candidates, query, minAttachMatchScore, taste, exclude, weights, rollIndex)
		if !found {
			return
		}
		picked[link.ID] = true
		// A moment only means something in a video; on anything else it is dropped
		// rather than sent as a number the client would try to seek to.
		if link.Kind != "video" {
			at = 0
		}
		out = append(out, libbyAttachment{libbyLink: link, At: at})
	}
	for _, request := range requests {
		take(request)
	}
	// Their words are a rescue, not a second helping: consulted only when everything she
	// named resolved to nothing, so a reply that worked never grows an extra item.
	if len(out) == 0 && asked != "" {
		take(asked)
	}
	// The kind is the last rescue: they asked for one of these, and any one they have not
	// seen is one. Drawn the way the prompt's shelf of that kind is drawn, so it lands on
	// something she would have been shown had the budget kept the shelf.
	if len(out) == 0 && kind != "" {
		if shelf := s.drawLibraryShelf(ctx, kind, 1, skip, taste, weights, nil); len(shelf) > 0 {
			out = append(out, libbyAttachment{libbyLink: shelf[0].link})
		}
	}
	return out
}

// ── her own face, out of the library ────────────────────────────────────────

// selfPicture is one library item that is a picture of her, with the tags that make
// it findable by description.
type selfPicture struct {
	link libbyLink
	tags []string
}

// pictureKinds are the kinds that can be sent as a photo. A comic or a game carrying
// the tag is a picture of her in the sense that matters to the library and not in the
// sense that matters to "send me one" — she cannot text you a game.
var pictureKinds = map[string]bool{"image": true, "gif": true}

// libbySelfPictures reads the library pictures of her, newest first.
//
// The tag is the whole index: recognition and the manual verdict both write
// character:libby onto the item, so this is one query rather than a re-derivation, and
// anything the user has ruled out has had the tag removed and simply is not here.
//
// Best-effort. A failed read means she falls back to her chat gallery, which is what
// she had before this existed — a database hiccup must never cost the user a reply.
func (s *Server) libbySelfPictures(ctx context.Context) []selfPicture {
	briefs, err := s.db.BriefsWithTag(ctx, libbyIdentityTag, maxSelfPictures*3)
	if err != nil {
		s.log.Debug("libby selfies: tag lookup", "err", err)
		return nil
	}
	ids := make([]int64, 0, len(briefs))
	for _, brief := range briefs {
		if pictureKinds[brief.Kind] {
			ids = append(ids, brief.ID)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	tagsByID, err := s.db.TagsForMediaBatch(ctx, ids)
	if err != nil {
		s.log.Debug("libby selfies: tags", "err", err)
	}
	out := make([]selfPicture, 0, len(ids))
	for _, brief := range briefs {
		if !pictureKinds[brief.Kind] || len(out) >= maxSelfPictures {
			continue
		}
		title := s.decrypt(brief.TitleEnc, "title")
		if title == "" {
			title = "Untitled"
		}
		pic := selfPicture{link: libbyLink{ID: brief.ID, Title: title, Kind: brief.Kind, HasThumb: brief.HasThumb}}
		for _, tag := range tagsByID[brief.ID] {
			// The identity tag itself is not a description of the picture — every one of
			// these carries it, so listing it teaches the model a word that selects all of
			// them and distinguishes none.
			if strings.EqualFold(tag.Name, libbyIdentityTag) {
				continue
			}
			pic.tags = append(pic.tags, strings.ToLower(tag.Name))
		}
		// Untagged is unreachable by description, exactly as in the gallery catalogue.
		if len(pic.tags) == 0 {
			continue
		}
		out = append(out, pic)
	}
	return out
}

// scoreTags is the tag overlap between a request and a picture, counting each
// requested word once per tag it lands in, plus one for a whole multi-word tag the
// request names in full — see scoreTagsWeighted for why. The same scoring the gallery
// matcher uses, lifted out so a gallery picture and a library picture are compared on
// one scale rather than each winning against its own pool.
func scoreTags(words map[string]bool, tags []string) int {
	return scoreTagsWeighted(words, tags)
}

// requestWords reduces a request, or a whole exchange, to the words worth matching on.
func requestWords(text string) map[string]bool {
	words := map[string]bool{}
	for _, word := range strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}) {
		if len(word) >= 3 {
			words[word] = true
		}
	}
	return words
}

// recentlyAttached is the set of library items already handed over in this
// conversation. The server keeps no memory between turns — the client owns the log —
// so what has been shown travels with the request, exactly as recentlySentPhotos does
// for the chat gallery.
func recentlyAttached(ids []int64) map[int64]bool {
	if len(ids) > maxRecentMediaMemory {
		ids = ids[len(ids)-maxRecentMediaMemory:]
	}
	sent := make(map[int64]bool, len(ids))
	for _, id := range ids {
		if id > 0 {
			sent[id] = true
		}
	}
	return sent
}
