package api

import (
	"context"
	"fmt"
	"strings"
)

// Things they put in front of her.
//
// Sharing a picture with her has existed for a while: a copy is uploaded into the chat
// gallery and scanned, and she reacts to the tags. That is the right thing for a photo
// from the phone, and the wrong thing for a library item — a video, a game, a comic —
// which cannot be copied into a gallery of stills and does not need to be, because the
// library already knows what it is. So the composer can now attach library items by
// reference: the message carries them the way her own attachments are carried, and this
// tells her what arrived.
//
// Bounded like the browse-together screen and formatted the same way, because it is
// the same act — "look at this" — arriving through a different door.

// maxSharedItems is how many library items one message may attach. Enough for "these
// three", short of a search results page.
const maxSharedItems = 6

// sharedItemsDirective describes the items attached to the latest message.
//
// Read from the database, not from the request: the client sends ids and the server
// says what they are, so a title in the prompt is always a real title and a picture of
// her is recognised from the identity tag rather than asserted by the client.
func (s *Server) sharedItemsDirective(ctx context.Context, ids []int64, isLibby bool) string {
	seen := map[int64]bool{}
	wanted := make([]int64, 0, maxSharedItems)
	for _, id := range ids {
		if id <= 0 || seen[id] || len(wanted) >= maxSharedItems {
			continue
		}
		seen[id] = true
		wanted = append(wanted, id)
	}
	if len(wanted) == 0 {
		return ""
	}
	briefs, err := s.db.BriefsByIDs(ctx, wanted)
	if err != nil || len(briefs) == 0 {
		return ""
	}
	tagsByID, _ := s.db.TagsForMediaBatch(ctx, wanted)
	position := make(map[int64]int, len(wanted))
	for i, id := range wanted {
		position[id] = i
	}
	lines := make([]string, 0, len(briefs))
	selfCount := 0
	for _, id := range wanted {
		for _, brief := range briefs {
			if brief.ID != id {
				continue
			}
			title := s.decrypt(brief.TitleEnc, "title")
			if title == "" {
				title = "Untitled"
			}
			line := fmt.Sprintf("%q (%s", title, brief.Kind)
			names := make([]string, 0, viewingTags)
			self := false
			for _, tag := range tagsByID[id] {
				if strings.EqualFold(tag.Name, libbyIdentityTag) {
					self = true
					continue
				}
				if len(names) < viewingTags {
					names = append(names, tag.Name)
				}
			}
			if len(names) > 0 {
				line += ", tagged " + strings.Join(names, ", ")
			}
			line += ")"
			if self && isLibby {
				line += " — this one is a picture of you"
				selfCount++
			}
			lines = append(lines, line)
		}
	}
	if len(lines) == 0 {
		return ""
	}
	out := "\n\nWith this message they attached from their own library: " + strings.Join(lines, "; ") + ". " +
		"They are showing you these — react to what they are, as someone who knows this collection, not by listing them back. " +
		"You may [link: <title>] one to make it tappable, and [attach: <title>] it only if you are genuinely handing it back."
	if selfCount > 0 {
		out += " React to seeing yourself the way you would — flattered, smug, critical of the likeness — never as a stranger."
	}
	return out
}
