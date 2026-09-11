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
	// Matches maxRecentPhotoMemory — an item ruled out forever is an item removed from
	// the library as far as this feature is concerned.
	maxRecentMediaMemory = 12
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
var attachTag = regexp.MustCompile(`(?i)\[\s*attach(?:es|ing|ment)?\s*[:=-]?\s*([^\]\n]{1,120}?)\s*\]`)

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
func (s *Server) resolveLibraryAttachments(ctx context.Context, requests []string, asked string, skip map[int64]bool) []libbyAttachment {
	if len(requests) == 0 {
		return nil
	}
	queries := append([]string{}, requests...)
	if asked = strings.TrimSpace(asked); asked != "" {
		queries = append(queries, asked)
	}
	var words []string
	for _, query := range queries {
		words = append(words, normalizeLookupWords(query)...)
	}
	candidates := s.libraryCandidates(ctx, words)
	if len(candidates) == 0 {
		return nil
	}
	var out []libbyAttachment
	picked := map[int64]bool{}
	take := func(query string) {
		link, found := bestLibraryMatchAbove(candidates, query, minAttachMatchScore)
		if !found || picked[link.ID] || skip[link.ID] || len(out) >= maxAttachmentsPerReply {
			return
		}
		picked[link.ID] = true
		out = append(out, libbyAttachment{libbyLink: link})
	}
	for _, request := range requests {
		take(request)
	}
	// Their words are a rescue, not a second helping: consulted only when everything she
	// named resolved to nothing, so a reply that worked never grows an extra item.
	if len(out) == 0 && asked != "" {
		take(asked)
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
// requested word once per tag it lands in. The same scoring the gallery matcher uses,
// lifted out so a gallery picture and a library picture are compared on one scale
// rather than each winning against its own pool.
func scoreTags(words map[string]bool, tags []string) int {
	score := 0
	for _, tag := range tags {
		for _, word := range strings.Fields(tag) {
			if len(word) >= 3 && words[word] {
				score++
			}
		}
	}
	return score
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

// bestSelfPicture picks the library picture of her that best fits some text, with the
// score it won by so the caller can weigh it against the chat gallery's best.
//
// floor is what an unasked-for picture has to clear: the caller passes 1 when she has
// explicitly asked for a picture and unpromptedPhotoFloor when it is only riding along
// with a reply, which is the same distinction matchingChatImage draws for the gallery.
func bestSelfPicture(pics []selfPicture, text string, skip map[int64]bool, floor int) (selfPicture, int) {
	words := requestWords(text)
	if len(words) == 0 {
		return selfPicture{}, 0
	}
	best, bestScore := selfPicture{}, 0
	for _, pic := range pics {
		if skip[pic.link.ID] {
			continue
		}
		if score := scoreTags(words, pic.tags); score > bestScore {
			best, bestScore = pic, score
		}
	}
	if bestScore < floor {
		return selfPicture{}, 0
	}
	return best, bestScore
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
