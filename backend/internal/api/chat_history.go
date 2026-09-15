package api

import (
	"context"
	"fmt"
	"strings"
)

// What the history actually said.
//
// A message with a picture in it read, to the model, as "*shares a photo with you*",
// and a message with a library item attached read as "*shares Kitchen Timer from the
// library*" — on the turn it was sent she was told what it was, through the photo
// directive or sharedItemsDirective, and on every turn after that the description was
// gone. Ask her a message later what she thought of the picture and she had nothing
// to think about. The same hole on her side: she had sent a selfie and could not say
// which.
//
// And a quoted reply carried only its excerpt — the first line, cut at 140
// characters — which is what the bubble shows and not what the reply is about. She was
// asked to answer a message she could see a third of.
//
// So the client now sends, for every message in the history, the ids of what it
// carried: the chat image, the library items. Ids only, as everywhere else — the server
// says what they are, from the workspace's own tag list and the library's own titles.
// Each message is then rendered for the model with what it carried folded in, in
// plain parenthetical prose rather than a tag, and the quoted reply is resolved back
// to the full message it points at.

// maxHistoryMediaIDs bounds how many attached library items across the whole history
// are looked up for one turn. Enough for a long evening of sharing; short of a query
// per message.
const maxHistoryMediaIDs = 24

// maxHistoryAttachmentTags bounds the tags used to describe one attachment in the
// history. Fewer than the directive for the latest message gets, because the history
// is many messages and this is the part of each that would grow.
const maxHistoryAttachmentTags = 6

// maxReplyTargetLen bounds the full text of a quoted message in the reply directive.
// Long enough to hold a real paragraph of hers or theirs; short enough that quoting an
// essay does not spend the turn's budget on it.
const maxReplyTargetLen = 600

// historyDescriber resolves what each message carried, built once per turn.
type historyDescriber struct {
	// images is chat image id → tags, from the workspace. Nil tags means the picture
	// exists but was untagged (or the scanner found nothing).
	images map[string][]string
	// media is library item id → its description, for every id in the history that
	// could be looked up.
	media map[int64]string
	// mediaFull is the same items in full — title, kind, every tag — for the turn that
	// asks about one of them rather than merely recalls it. See chat_photo_talk.go.
	mediaFull map[int64]historyMedia
}

// historyMedia is one library item from the history, undescribed: what the line in
// media was made from.
type historyMedia struct {
	title, kind string
	tags        []string
	// description is the vision model's prose about the item, when it has been
	// described: the difference between handing her six tags and handing her the
	// sentence a person would say. See vision_describe.go.
	description string
	// self is whether the item is a picture of her — it carries the identity tag —
	// rather than something from the shelves.
	self bool
}

// newHistoryDescriber gathers the tags and titles behind every attachment in the
// history. One batch query for the library items; the images come from the workspace
// already in hand. Best-effort throughout: an item that cannot be read is described
// as nothing, and the message still says something was attached.
func (s *Server) newHistoryDescriber(ctx context.Context, ws chatWorkspace, messages []chatMessage) historyDescriber {
	d := historyDescriber{images: map[string][]string{}, media: map[int64]string{}, mediaFull: map[int64]historyMedia{}}
	wanted := make([]int64, 0, maxHistoryMediaIDs)
	seen := map[int64]bool{}
	needImages := false
	// Newest first, so a history longer than the cap keeps the attachments that still
	// bear on the conversation.
	for i := len(messages) - 1; i >= 0; i-- {
		m := messages[i]
		if m.ImageID != "" {
			needImages = true
		}
		for _, id := range m.MediaIDs {
			if id <= 0 || seen[id] || len(wanted) >= maxHistoryMediaIDs {
				continue
			}
			seen[id] = true
			wanted = append(wanted, id)
		}
	}
	if needImages {
		for _, img := range ws.Images {
			d.images[img.ID] = img.Tags
		}
	}
	if len(wanted) == 0 {
		return d
	}
	briefs, err := s.db.BriefsByIDs(ctx, wanted)
	if err != nil {
		return d
	}
	tagsByID, _ := s.db.TagsForMediaBatch(ctx, wanted)
	for _, brief := range briefs {
		title := s.decrypt(brief.TitleEnc, "title")
		if title == "" {
			title = "Untitled"
		}
		names := make([]string, 0, maxHistoryAttachmentTags)
		full := historyMedia{title: title, kind: brief.Kind, description: s.decrypt(brief.DescriptionEnc, "description")}
		for _, tag := range tagsByID[brief.ID] {
			if strings.EqualFold(tag.Name, libbyIdentityTag) {
				full.self = true
				continue
			}
			full.tags = append(full.tags, tag.Name)
			if len(names) < maxHistoryAttachmentTags {
				names = append(names, tag.Name)
			}
		}
		line := fmt.Sprintf("%q (%s", title, brief.Kind)
		if len(names) > 0 {
			line += "; " + strings.Join(names, ", ")
		}
		d.media[brief.ID] = line + ")"
		d.mediaFull[brief.ID] = full
	}
	return d
}

// carried describes what one message had attached, as a parenthetical for the model.
// Empty when the message carried nothing.
func (d historyDescriber) carried(m chatMessage) string {
	var parts []string
	theirs := m.Role != "assistant"
	if m.ImageID != "" {
		who := "they attached a photo"
		if !theirs {
			who = "you sent a picture of yourself"
		}
		if tags, known := d.images[m.ImageID]; known && len(tags) > 0 {
			if len(tags) > maxHistoryAttachmentTags {
				tags = tags[:maxHistoryAttachmentTags]
			}
			parts = append(parts, who+" showing "+strings.Join(tags, ", "))
		} else {
			parts = append(parts, who)
		}
	}
	if len(m.MediaIDs) > 0 {
		items := make([]string, 0, len(m.MediaIDs))
		for _, id := range m.MediaIDs {
			if line, ok := d.media[id]; ok {
				items = append(items, line)
			}
		}
		who := "they attached from the library"
		if !theirs {
			who = "you handed over from the library"
		}
		switch {
		case len(items) > 0:
			parts = append(parts, who+": "+strings.Join(items, "; "))
		default:
			parts = append(parts, who+" "+plural(len(m.MediaIDs), "item", "items")+" that are no longer there")
		}
	}
	if len(parts) == 0 {
		return ""
	}
	return "(" + strings.Join(parts, "; ") + ")"
}

// historyContent is how one message reads in the history the model is given: the quote
// above the text, as before, and what it carried beneath. Plain prose, not protocol —
// nothing here is a tag for her to copy.
func historyContent(m chatMessage, d historyDescriber) string {
	text := quotedHistoryContent(m)
	if carried := d.carried(m); carried != "" {
		text += "\n" + carried
	}
	// And the emoji either of them put on it. See chat_reactions.go.
	if note := reactionsNote(m); note != "" {
		text += "\n" + note
	}
	return text
}

// historyNotesDirective says what the parenthetical notes are, on a turn where the
// history has any. A model shown "(you sent a picture of yourself showing …)" under
// its own earlier turns learns the shape and writes it back — "(you attached a video
// file — 1girl, anus, ass)" appeared verbatim in a reply — and the scrubber's net for
// that (machineryPhrase) is the guarantee; this is the cheaper half, asking it not to.
const historyNotesDirective = "Lines in parentheses under a message in the history — \"(you sent a picture of yourself showing …)\", \"(you handed over from the library: …)\", \"(they attached a photo …)\" — " +
	"are the app's notes on what that message carried, not words either of you typed. Never write one yourself, in any form; the app adds them."

// replyTargetDirective tells her which earlier message their latest one answers, in
// full.
//
// The message is found by id in the history the client sent, so what she is shown is
// the whole thing — bounded — and what it carried, rather than the excerpt the bubble
// draws. An id that resolves to nothing (an older client, a message since deleted)
// falls back to the excerpt, which is still better than nothing.
func replyTargetDirective(ref *chatReplyRef, messages []chatMessage, d historyDescriber) string {
	if ref == nil || (strings.TrimSpace(ref.Excerpt) == "" && ref.ID == "") {
		return ""
	}
	whose := "an earlier message of theirs"
	if ref.Role == "assistant" {
		whose = "something you said earlier"
	}
	quoted := excerptOf(ref.Excerpt)
	carried := ""
	if ref.ID != "" {
		// Not the latest: that is the reply itself.
		for i := len(messages) - 2; i >= 0; i-- {
			m := messages[i]
			if m.ID != ref.ID {
				continue
			}
			if text := strings.TrimSpace(m.Content); text != "" {
				quoted = truncateRunes(text, maxReplyTargetLen)
			}
			if m.Role == "assistant" {
				whose = "something you said earlier"
			} else {
				whose = "an earlier message of theirs"
			}
			carried = d.carried(m)
			break
		}
	}
	if strings.TrimSpace(quoted) == "" && carried == "" {
		return ""
	}
	out := "\n\nTheir latest message is a direct reply to " + whose + ": \"" + quoted + "\""
	if carried != "" {
		out += " " + carried
	}
	return out + ". Answer that specifically — what it said and what it showed."
}

// truncateRunes cuts text to at most n runes, at a word where it can, with an ellipsis.
func truncateRunes(text string, n int) string {
	runes := []rune(text)
	if len(runes) <= n {
		return text
	}
	cut := string(runes[:n])
	if i := strings.LastIndexByte(cut, ' '); i > n/2 {
		cut = cut[:i]
	}
	return strings.TrimSpace(cut) + "…"
}
