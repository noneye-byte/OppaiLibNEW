package api

import "strings"

// Who a gallery picture is of.
//
// A character's gallery holds two kinds of picture and, until now, could not tell them
// apart. The user uploads pictures *of her* so she has selfies to send; the user also
// attaches photos to messages — a meal, a view, a friend, a screenshot — and those are
// filed into the same gallery so she can remember what was shared. Both then sat in
// one list, and "send me a pic" drew from the whole of it. That is how a photo of
// somebody else's lunch went out captioned as a picture of her, and why the catalogue
// she reads to decide what she can send was padded with things she is not in.
//
// Every picture now carries a subject: it is her, or it is someone or something else.
// The scanner decides at upload — the same likeness match that lets her recognise
// herself in a shared photo (selfPortraitMatch) — and the user can overrule it from
// the gallery with one tap. Only pictures of her are ever selfies; the rest are known
// to her as what they are, which is what they were for.
//
// Pictures uploaded before subjects existed are classified the first time the
// workspace is read, from the tags they already carry, so nothing has to be re-scanned.

const (
	// chatSubjectSelf is a picture of the character whose gallery it is in.
	chatSubjectSelf = "self"
	// chatSubjectOther is a picture of anyone or anything else.
	chatSubjectOther = "other"
)

// normalizeChatSubject reduces whatever a client wrote to one of the two subjects, or
// to "" for anything else — which means "let the scanner decide" on upload and "not yet
// classified" in storage.
func normalizeChatSubject(subject string) string {
	switch strings.ToLower(strings.TrimSpace(subject)) {
	case chatSubjectSelf, "libby", "her", "me", "character":
		return chatSubjectSelf
	case chatSubjectOther, "someone else", "something else", "not her", "them":
		return chatSubjectOther
	}
	return ""
}

// legacySubjectFloor is how many of her features a picture stored before subjects
// existed needs to stay hers. One, not the two a fresh upload needs: those pictures
// were put in her gallery when everything in it was taken to be her, and demoting a
// picture of her because it was taken from behind would silence pictures the user
// chose. A shared photo of a meal or a street shares none of her features and is
// still filed as what it is.
const legacySubjectFloor = 1

// classifyChatSubject decides who a picture is of from its tags and the character's
// written appearance: it is her when at least floor of her features are in it. A
// fresh upload uses selfPortraitFloor, the same likeness match that lets her recognise
// herself in a shared photo mid-conversation.
//
// A character with no appearance on their card cannot be recognised in anything, and
// then every picture in their gallery is taken to be them — the gallery was theirs
// before this existed, and demoting all of it to "other" would silence a character
// whose card simply never said what they look like.
func classifyChatSubject(tags []string, appearance string, floor int) string {
	if len(appearanceTags(appearance)) == 0 {
		return chatSubjectSelf
	}
	if len(selfPortraitMatch(tags, appearance)) >= floor {
		return chatSubjectSelf
	}
	return chatSubjectOther
}

// isSelfPicture reports whether a gallery picture may be sent as a selfie. Unclassified
// is treated as her: it is what every picture was before subjects existed, and a
// workspace read through readChatWorkspace never leaves one unclassified anyway.
func isSelfPicture(img chatImage) bool {
	return img.Subject != chatSubjectOther
}

// classifyLegacySubjects fills in the subject of every picture stored before subjects
// existed, from its tags and its owner's appearance. Reports whether anything changed,
// so a reader that wants to persist the result once can. Pictures owned by something
// that is not a character — the user's own profile picture — are left alone: they are
// not in anyone's gallery.
func classifyLegacySubjects(ws *chatWorkspace) bool {
	changed := false
	for i := range ws.Images {
		img := &ws.Images[i]
		if img.Subject != "" {
			continue
		}
		owner, isCharacter := characterBehindOwner(img.CharacterID)
		if !isCharacter {
			continue
		}
		character, found := findChatCharacter(*ws, owner)
		if !found {
			continue
		}
		img.Subject = classifyChatSubject(img.Tags, character.Appearance, legacySubjectFloor)
		changed = true
	}
	return changed
}
