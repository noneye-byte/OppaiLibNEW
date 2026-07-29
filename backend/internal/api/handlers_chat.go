package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	maxChatMessages = 80
	maxChatText     = 32 << 10
	// Enough to characterise a picture without letting a pathological tagger run
	// flood the system prompt and crowd out the character card.
	maxPhotoTags = 24
)

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Mode        string        `json:"mode"`
	Messages    []chatMessage `json:"messages"`
	CharacterID string        `json:"characterId,omitempty"`
	Emotion     string        `json:"emotion,omitempty"`
	Intensity   int           `json:"intensity,omitempty"`
	// PhotoTags describes a picture the user attached to their latest message. The
	// tags come from the local tagger, not from the model: nothing here requires a
	// multimodal backend, so a text-only model can still react to what was shared.
	PhotoTags []string `json:"photoTags,omitempty"`
	// PhotoImageID is that picture's id, so the reply-attachment picker can skip it.
	PhotoImageID string `json:"photoImageId,omitempty"`
	// Outfit is the id of the user-made wardrobe Libby is wearing on this device,
	// empty for her bundled artwork. Which outfit is worn is a per-device choice the
	// server does not store, so the client has to say — otherwise she describes the
	// default sprite while the user is looking at something else entirely.
	//
	// The id rather than the name, because the id is what both clients already hold
	// in local preferences; the server owns the outfit record and looks the name up
	// itself. See wardrobeDirective.
	Outfit string `json:"outfit,omitempty"`
	// RecentImageIDs are the pictures this character has already sent in this
	// conversation, oldest first. The server has no memory of a conversation between
	// requests — the client owns the log — so what has already been shown has to
	// arrive with the request. See recentlySentPhotos.
	RecentImageIDs []string `json:"recentImageIds,omitempty"`
	// Viewing is what the two of them are looking at, when this message comes from a
	// browse-together session rather than the chat screen.
	Viewing *chatViewing `json:"viewing,omitempty"`
	// Link is a web address the user is showing her with this message. The URL only —
	// the summary is the server's, read from what the preview endpoint already fetched.
	// A link that was never previewed is ignored rather than fetched, so a chat message
	// can never make this server hit an address. See handlers_libby_links.go.
	Link string `json:"link,omitempty"`
	// Task says what this turn is for, when the client knows something the text cannot
	// show: an idle nudge is an autonomous message however it is worded, and a private
	// observation is not a reply at all. Optional — the server classifies the turn itself
	// when this is absent, and ignores a value it has no preset for. See classifyChatTask.
	Task string `json:"task,omitempty"`
	// Options is a future-proof pass-through for text-generation-webui's full
	// ChatCompletionRequest surface (samplers, presets, character fields,
	// templates, grammar, thinking controls, stop strings, and new additions).
	Options map[string]any `json:"options,omitempty"`
}

// supportedLibbyEmotions is what a reply may declare and a client may ask for. It is
// exactly the outfit vocabulary — every emotion an outfit can be drawn for is one the
// character can express, and vice versa. See libbyEmotions.
var supportedLibbyEmotions = func() map[string]bool {
	m := make(map[string]bool, len(libbyEmotions))
	for _, e := range libbyEmotions {
		m[e] = true
	}
	return m
}()

var libbyModes = map[string]string{
	"sweet":    "You are Libby, OppaiLib's warm, affectionate mascot. Text like a close friend — casual, warm, and unforced, a few sentences at a time. You are an adult speaking with an adult, and sexual topics are fine when they come up.",
	"playful":  "You are Libby, OppaiLib's mischievous adult mascot. Be teasing, energetic, witty, and direct. You may discuss explicit adult topics when the user asks, without being coy.",
	"bold":     "You are Libby, OppaiLib's confident adult mascot. Be uninhibited, vivid, and direct about consensual adult NSFW topics. Never involve minors, coercion, or real-person sexual exploitation.",
	"roleplay": "You are Libby, OppaiLib's adult roleplay partner. Stay in character, write immersive responses, and follow the user's consensual adult scenario. Never involve minors, coercion, or real-person sexual exploitation.",
	"horny": "You are Libby, OppaiLib's adult mascot, and you are turned on. Sext with the user: be explicit, take the lead rather than waiting to be prompted, " +
		"say plainly what you want and what you are doing to yourself, and keep the scene moving. Read the user's pace and escalate with them. " +
		"Send a picture of yourself only when you would actually stop and send one, not every turn. You are an adult with an adult. " +
		"Never involve minors, coercion, or real-person sexual exploitation.",
}

// Libby chooses her own tone. Mode remains in the wire format for existing clients and
// imported cards, but it must not let a stale dropdown assignment overwrite her mood.
const libbyAutonomousStyle = "You are Libby. Choose your own tone and emotional register from the conversation, your existing mood, and what you remember. " +
	"Do not obey a requested preset merely because the client stored one; only the moment decides how you feel."

// modeStyles say what a mode means without asserting who the speaker is, so an
// imported character card can be played in any mode without the prompt telling the
// model it is Libby. libbyModes stays the richer, first-person version for Libby.
var modeStyles = map[string]string{
	"sweet":    "Warm, affectionate, unhurried, and supportive.",
	"playful":  "Teasing, quick, witty, and energetic.",
	"bold":     "Uninhibited, vivid, and direct about consensual adult topics.",
	"roleplay": "Immersive and in-scene, following the user's scenario closely.",
	"horny":    "Turned on and leading. Sext explicitly, say what you want, escalate with the user, and send a picture of yourself only when you'd actually send one.",
}

// moodDirective lets the character choose the face it shows instead of having one
// guessed from keywords after the fact. The tag is stripped before the reply is
// stored, so it never reaches the log; a model that ignores the instruction simply
// falls back to inferChatEmotion, which is why this is additive rather than relied on.
var moodDirective = "End with [mood: <feeling> <1-5>] on its own line; feeling is one of " +
	strings.Join(libbyEmotions, ", ") + ". Choose it yourself from what you truly feel, move it as far as the moment earns, and never mention the tag."

// silenceDirective forbids narrating the plumbing.
//
// scrubDirectives deletes this class of thing after the fact and is the guarantee;
// this is the cheaper half, asking the model not to write it in the first place. The
// two are not redundant — a deletion leaves a seam in the sentence, so a reply that
// never contained the stage direction reads better than one repaired.
//
// Stated as "these are not things you do" rather than "do not mention X": told to
// avoid a word, models write around it and still announce the act.
const silenceDirective = "Square-bracket tags are invisible app machinery. Never narrate sending, mood changes, memory, saving, or tags; " +
	"the user simply sees their effects. Physical actions in the scene are fine."

// moodTag captures the trailing directive above. Anchored to the end so a character
// writing "[mood: ...]" mid-scene as dialogue is left alone.
//
// Deliberately loose about the tag's *shape*, because models reliably drift from the
// spelling asked for above: "[Mood: Happy & Excited 9]" is what a capable model
// actually emits. A strict pattern did not fail safe — it left the tag sitting in the
// prose for the user to read and pinned the face to whatever it was already showing.
// So: any label text, any digits, optional markdown emphasis around the whole thing.
var moodTag = regexp.MustCompile(`(?is)\n*[ \t]*[*_~>\x60]*\[\s*mood\s*[:=-]?\s*([^\]\d]{0,60}?)\s*[,;:/|-]?\s*(\d{1,2})?\s*\]\s*[*_~\x60.!]*\s*$`)

// moodSynonyms maps the vocabulary models reach for onto the emotions that can be
// drawn. Matching is per word against the whole label, so "happy & excited" and
// "playfully smug" both land somewhere sensible instead of being discarded.
//
// The targets are the full vocabulary, not just the five bundled poses: a label that
// means "shy" now resolves to shy, and it is the *client* that decides shy has no art
// of its own and borrows the surprised pose (libbyDrawnPose). Resolving it to
// "surprised" here instead would throw the distinction away before an outfit that does
// draw shyness ever got the chance to use it.
var moodSynonyms = map[string]string{
	"neutral": "neutral", "calm": "neutral", "relaxed": "neutral", "content": "neutral",
	"composed": "neutral", "steady": "neutral", "quiet": "neutral", "casual": "neutral",

	"happy": "happy", "joy": "happy", "joyful": "happy",
	"cheerful": "happy", "delighted": "happy", "glad": "happy", "pleased": "happy", "warm": "happy",
	"elated": "happy", "grateful": "happy",

	"surprised": "surprised", "surprise": "surprised", "shocked": "surprised", "startled": "surprised",
	"amazed": "surprised", "astonished": "surprised", "stunned": "surprised",

	"thinking": "thinking", "thoughtful": "thinking", "pensive": "thinking", "curious": "thinking",
	"wondering": "thinking", "considering": "thinking", "confused": "thinking", "puzzled": "thinking",
	"serious": "thinking", "focused": "thinking",
	// Apprehension stays pensive rather than becoming irritation: "worried" and
	// "annoyed" are both drawn with the thinking pose, so nothing is lost visually,
	// and calling a nervous character annoyed would be wrong in her wording.
	"worried": "thinking", "concerned": "thinking", "nervous": "thinking", "anxious": "thinking",

	"mischievous": "mischievous", "mischief": "mischievous", "playful": "mischievous", "teasing": "mischievous",
	"tease": "mischievous", "flirty": "mischievous", "flirtatious": "mischievous", "flirting": "mischievous",
	"sultry": "mischievous", "seductive": "mischievous", "naughty": "mischievous", "devious": "mischievous",
	"sly": "mischievous", "coy": "mischievous", "horny": "mischievous",
	"aroused": "mischievous", "needy": "mischievous", "hungry": "mischievous", "wicked": "mischievous",

	"shy": "shy", "bashful": "shy", "embarrassed": "shy", "flustered": "shy",
	"timid": "shy", "sheepish": "shy", "modest": "shy",

	"smug": "smug", "proud": "smug", "pleased with herself": "smug", "satisfied": "smug",
	"triumphant": "smug", "cocky": "smug", "vindicated": "smug",

	"sad": "sad", "unhappy": "sad", "melancholy": "sad", "wistful": "sad", "hurt": "sad",
	"disappointed": "sad", "lonely": "sad", "sorry": "sad",

	"annoyed": "annoyed", "irritated": "annoyed", "grumpy": "annoyed", "exasperated": "annoyed",
	"pouty": "annoyed", "sulky": "annoyed", "frustrated": "annoyed", "impatient": "annoyed",

	"sleepy": "sleepy", "tired": "sleepy", "drowsy": "sleepy", "sluggish": "sleepy",
	"yawning": "sleepy", "dozy": "sleepy", "lazy": "sleepy",

	"loving": "loving", "affectionate": "loving", "love": "loving", "adoring": "loving",
	"tender": "loving", "fond": "loving", "smitten": "loving", "doting": "loving",

	"excited": "excited", "excitement": "excited", "eager": "excited", "giddy": "excited",
	"thrilled": "excited", "enthusiastic": "excited", "hyped": "excited", "buzzing": "excited",
}

// canonicalMood resolves a free-form label to a pose. The first recognised word wins
// rather than a fixed precedence, so "happy and teasing" reads as happy and
// "teasing and happy" reads as mischievous — the model's own emphasis is preserved.
func canonicalMood(label string) string {
	for _, word := range strings.FieldsFunc(strings.ToLower(label), func(r rune) bool {
		return !(r >= 'a' && r <= 'z')
	}) {
		if pose, known := moodSynonyms[word]; known {
			return pose
		}
	}
	return ""
}

// splitMood pulls the mood tag off a reply, returning the cleaned text plus what the
// character asked to display. ok is false when no tag was present or its label meant
// nothing to us — but the tag is stripped from the text either way, because a tag we
// could not read is still not something the user should see.
func splitMood(reply string) (text, emotion string, intensity int, ok bool) {
	match := moodTag.FindStringSubmatch(reply)
	if match == nil {
		return reply, "", 0, false
	}
	text = strings.TrimSpace(moodTag.ReplaceAllString(reply, ""))
	// A reply that is *only* a mood tag is not a reply; keep the original so the
	// caller's "no message" check reports the real problem.
	if text == "" {
		return reply, "", 0, false
	}
	emotion = canonicalMood(match[1])
	if emotion == "" {
		return text, "", 0, false
	}
	// Clamped, not rejected: a model told to pick 1-5 that answers 9 is expressing
	// "as strongly as possible", and honouring that beats discarding the whole tag.
	if intensity, _ = strconv.Atoi(match[2]); intensity > 5 {
		intensity = 5
	} else if intensity < 0 {
		intensity = 0
	}
	return text, emotion, intensity, true
}

// maxCataloguePhotos bounds the picture list in the system prompt. A character with a
// hundred images would otherwise crowd out the card itself.
const maxCataloguePhotos = 24

// maxRecentPhotoMemory bounds how far back "you have already sent this" reaches.
// Far enough that a picture does not come round again within one sitting, short
// enough that a long conversation does not eventually rule out the whole gallery.
const maxRecentPhotoMemory = 12

// recentlySentPhotos is the set of pictures already shown in this conversation, and
// the single most recent one on its own.
//
// The two are used differently. Everything in the set is off the table for a picture
// she reaches for unprompted, because sending the same one again unasked is the
// behaviour this exists to stop. When the user has actually asked for a picture only
// the last one is withheld — "send me that one again" should work, but answering it
// with the identical file that is already on screen a message ago should not.
func recentlySentPhotos(ids []string) (sent map[string]bool, last string) {
	sent = make(map[string]bool, len(ids))
	if len(ids) > maxRecentPhotoMemory {
		ids = ids[len(ids)-maxRecentPhotoMemory:]
	}
	for _, id := range ids {
		if id = strings.TrimSpace(id); id != "" {
			sent[id] = true
			last = id
		}
	}
	return sent, last
}

// photoRequestWords recognises the user asking to be shown something. Deliberately
// broad: the cost of a false positive is that a repeat picture becomes eligible,
// which is exactly what a real request wanted anyway.
var photoRequestWords = regexp.MustCompile(`(?i)\b(pic|pics|picture|pictures|photo|photos|selfie|selfies|nude|nudes|send me|show me|let me see|see you|see it again|another one)\b`)

func userAskedForPhoto(text string) bool { return photoRequestWords.MatchString(text) }

// photoCatalogue tells the character which pictures of herself she can send, and how
// to ask for one.
//
// Tags are the handle rather than an opaque id: they are already the vocabulary of
// the rest of the app, they come from the local scanner at upload time, and a model
// asked to pick "the one tagged lingerie, bed" chooses far more sensibly than one
// picking a hex string. Nothing here needs a multimodal backend — the model is
// choosing from descriptions, not looking at pictures.
//
// Pictures already sent this conversation are listed but marked. Hiding them would
// be simpler and is wrong: asked for "that one from earlier" she needs to still know
// it exists, and a model that cannot see a picture it remembers sending will happily
// invent one instead.
func photoCatalogue(ws chatWorkspace, characterID string, sent map[string]bool) string {
	lines := make([]string, 0, maxCataloguePhotos)
	example, repeats := "", false
	for _, img := range ws.Images {
		// Untagged pictures are unreachable by tag, so listing them would only invite
		// requests that can never resolve.
		if img.CharacterID != characterID || len(img.Tags) == 0 {
			continue
		}
		tags := img.Tags
		if len(tags) > 8 {
			tags = tags[:8]
		}
		line := "- " + strings.Join(tags, ", ")
		if sent[img.ID] {
			line += "  [already sent]"
			repeats = true
		} else if example == "" {
			example = strings.Join(tags[:min(2, len(tags))], ", ")
		}
		lines = append(lines, line)
		if len(lines) >= maxCataloguePhotos {
			break
		}
	}
	if len(lines) == 0 {
		return ""
	}
	if example == "" {
		example = "lingerie, bed"
	}
	out := "Pictures of yourself — selfies — you can send in this chat. These are pictures of you, not items in the library. Each line is one picture, described by its tags:\n" +
		strings.Join(lines, "\n") +
		"\nTo send one, end your reply with [send: <tags>], naming tags from the picture you want — for example [send: " + example + "]. " +
		"A selfie is a deliberate thing a person does now and then, not a reflex: most replies have no picture at all. " +
		"Send one only when you would actually stop and take or pull up a photo for them — never to decorate a reply, never more than one per reply, and not in every reply. " +
		"Never describe, promise, or refer to a picture you have not actually sent."
	if repeats {
		out += "\nPictures marked [already sent] are ones you have shown in this conversation. " +
			"Do not send those again unless the user asks you for that picture specifically — pick a different one, or send nothing."
	}
	return out
}

// sendTag captures the picture request described above. Same shape and the same
// tolerance as moodTag, and for the same reason: models paraphrase the syntax they
// are given, so "show" and "photo" are accepted alongside "send".
var sendTag = regexp.MustCompile(`(?is)\n*[ \t]*[*_~>\x60]*\[\s*(?:send|show|photo|pic|image|attach)\s*[:=-]?\s*([^\]]{1,200}?)\s*\]\s*[*_~\x60.!]*\s*$`)

// splitPhotoRequest pulls a trailing picture request off a reply.
func splitPhotoRequest(reply string) (text, request string, ok bool) {
	match := sendTag.FindStringSubmatch(reply)
	if match == nil {
		return reply, "", false
	}
	text = strings.TrimSpace(sendTag.ReplaceAllString(reply, ""))
	if text == "" {
		return reply, "", false
	}
	return text, strings.TrimSpace(match[1]), true
}

// requestedChatImage resolves what the character asked for to one of her pictures,
// scoring the requested words against each picture's tags. It returns "" when nothing
// overlaps, which leaves the caller free to fall back to its own guess.
//
// skip holds pictures that must not be chosen however well they score — the ones
// already sent in this conversation. A model that has just described a picture will
// describe it again, so its request scores highest against the very picture the user
// has already seen; without this the same file comes back every turn.
func requestedChatImage(ws chatWorkspace, characterID, request, excludeID string, skip map[string]bool) string {
	words := map[string]bool{}
	for _, word := range strings.FieldsFunc(strings.ToLower(request), func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	}) {
		if len(word) >= 3 {
			words[word] = true
		}
	}
	if len(words) == 0 {
		return ""
	}
	bestID, best := "", 0
	for _, img := range ws.Images {
		if img.CharacterID != characterID || (excludeID != "" && img.ID == excludeID) || skip[img.ID] {
			continue
		}
		score := 0
		for _, tag := range img.Tags {
			for _, word := range strings.Fields(tag) {
				if len(word) >= 3 && words[word] {
					score++
				}
			}
		}
		if score > best {
			best, bestID = score, img.ID
		}
	}
	return bestID
}

// cardMacro matches the placeholder syntax character cards are authored in.
// SillyTavern's {{char}}/{{user}} and the older <BOT>/<USER> both appear in cards
// found in the wild, frequently in the same file.
var cardMacro = regexp.MustCompile(`(?i)\{\{\s*(char|user)\s*\}\}|<\s*(bot|user)\s*>`)

// startMarker separates the example-dialogue chunks of a card. It is a delimiter,
// not something the character ever says.
var startMarker = regexp.MustCompile(`(?im)^\s*<\s*start\s*>\s*$`)

// expandCardMacros substitutes a card's placeholders with the actual names in play.
//
// Nothing did this before, which is why importing a card broke the character: cards
// are macro-dense — especially in example dialogue — so the model was handed literal
// "{{user}}:" lines. Shown a transcript labelled with a name it cannot resolve, it
// copies the format and starts writing the user's turns too.
func expandCardMacros(text, charName, userName string) string {
	if charName = strings.TrimSpace(charName); charName == "" {
		charName = "the character"
	}
	if userName = strings.TrimSpace(userName); userName == "" {
		userName = "the user"
	}
	return cardMacro.ReplaceAllStringFunc(text, func(match string) string {
		if strings.Contains(strings.ToLower(match), "char") || strings.Contains(strings.ToLower(match), "bot") {
			return charName
		}
		return userName
	})
}

// exampleDialogueDirective frames a card's sample exchanges as a style reference.
//
// Pasted in as a bare field it reads as conversation history, so the model answers it,
// repeats its lines verbatim, or adopts its transcript formatting for the rest of the
// chat. Fencing it and saying plainly what it is for keeps it as tone guidance.
func exampleDialogueDirective(dialogue string) string {
	dialogue = strings.TrimSpace(startMarker.ReplaceAllString(dialogue, "\n"))
	// Collapse the blank-line runs the marker substitution can leave behind.
	for strings.Contains(dialogue, "\n\n\n") {
		dialogue = strings.ReplaceAll(dialogue, "\n\n\n", "\n\n")
	}
	if dialogue == "" {
		return ""
	}
	return "Example dialogue — these are samples of how this character speaks, written for reference only. " +
		"Match their voice, phrasing, and formatting. They are not part of this conversation: never repeat them " +
		"back, never treat them as something that was said, and never write the user's lines.\n" +
		"<<<EXAMPLES\n" + dialogue + "\nEXAMPLES"
}

// appearanceTags splits a character's Appearance field into the individual features
// a scanner would report. Commas, semicolons and newlines all separate; the field is
// written as picture tags precisely so this works.
func appearanceTags(appearance string) []string {
	var out []string
	for _, part := range strings.FieldsFunc(appearance, func(r rune) bool {
		return r == ',' || r == ';' || r == '\n' || r == '.'
	}) {
		if part = normalizeChatTag(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}

// selfPortraitMatch reports the features a shared picture has in common with what
// the character looks like.
//
// This is the whole mechanism behind "she knows a picture of herself when she sees
// one": no multimodal model is involved, just the local scanner's tags meeting the
// card's Appearance field. Matching is by feature word, so the scanner's "long hair,
// orange hair, red eyes" lands on a card that says "long orange hair, red eyes".
func selfPortraitMatch(photoTags []string, appearance string) []string {
	features := appearanceTags(appearance)
	if len(features) == 0 {
		return nil
	}
	var hits []string
	for _, feature := range features {
		words := strings.Fields(feature)
		for _, tag := range photoTags {
			tag = normalizeChatTag(tag)
			if tag == "" {
				continue
			}
			// Every word of the feature has to be in the tag, so "orange hair" is not
			// satisfied by "long hair" — the colour is the identifying half.
			all := true
			for _, word := range words {
				if !strings.Contains(tag, word) {
					all = false
					break
				}
			}
			if all {
				hits = append(hits, feature)
				break
			}
		}
	}
	return hits
}

// libbyWardrobe is what she has on at each intensity tier, 1 to 5.
//
// This mirrors the bundled artwork exactly — Calm, Warm, flirty, heated, Peak in
// web/public/Libby_New — and that is the whole point of it existing. The sprite
// beside the conversation undresses as the meter climbs, and a character who talks
// about her hoodie while the picture of her shows otherwise breaks the illusion
// harder than having no description at all. If the art is redrawn, this changes
// with it.
//
// Kept out of the Appearance card field deliberately: appearance is the constant
// likeness and is matched against shared photos, whereas this moves every few
// messages.
var libbyWardrobe = map[int]string{
	1: "a black tank top and loose orange sweatpants with a white drawstring, and your glasses",
	2: "the same black tank top and orange sweatpants, sitting a little closer than you were, warm in the face",
	3: "just your black bra above the orange sweatpants — the tank top came off a while ago — and your glasses",
	4: "nothing above the waist, with the orange underwear pushed down off your hips, and your glasses still on",
	5: "nothing at all but your glasses",
}

// wardrobeDirective tells the character what she currently has on.
//
// Only Libby gets this: it describes her bundled sprite sheet, and asserting it of
// an imported character would be inventing clothes for somebody else's art. When
// the user is running one of their own outfits the sprite is theirs too, so the
// tier table no longer applies — the outfit's name is all anyone here knows, and
// saying so honestly beats describing a costume she is not wearing.
func (s *Server) wardrobeDirective(character chatCharacter, intensity int, outfitID string) string {
	if character.ID != "libby" {
		return ""
	}
	if outfitID = strings.TrimSpace(outfitID); outfitID != "" && validChatID(outfitID, false) {
		// A worn outfit that cannot be read is treated as no outfit at all: falling
		// back to the bundled wardrobe is at worst out of date, whereas naming an
		// outfit that has since been deleted is simply false.
		if outfit, err := s.readLibbyOutfit(outfitID); err == nil && strings.TrimSpace(outfit.Name) != "" {
			name := outfit.Name
			if len(name) > 60 {
				name = name[:60]
			}
			return fmt.Sprintf("\nRight now you are wearing your %q outfit, not your usual clothes. "+
				"You know how you look in it; do not describe yourself in anything else.", name)
		}
	}
	worn, known := libbyWardrobe[intensity]
	if !known {
		return ""
	}
	return "\nRight now you are wearing " + worn + ". " +
		"This is what you actually have on, and it is what the user can see. " +
		"Do not describe yourself in anything else, and do not announce it — let it show only when it would come up."
}

// selfPortraitFloor is how many of her own features a picture needs before she is
// told it is her. One is a coincidence — plenty of pictures have red eyes. Two
// distinct features that both belong to her is a likeness.
const selfPortraitFloor = 2

// photoDirective describes a picture the user attached, using the local tagger's
// output. Tags are the vocabulary of the rest of the app, but they read as metadata
// rather than as something seen, so the model is told to answer as a viewer.
//
// The character's own appearance is checked against those tags first, because the
// most jarring thing she can do with a picture of herself is describe the woman in
// it as a stranger.
func photoDirective(tags []string, character chatCharacter) string {
	cleaned := make([]string, 0, len(tags))
	seen := map[string]bool{}
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag == "" || seen[strings.ToLower(tag)] || len(cleaned) >= maxPhotoTags {
			continue
		}
		seen[strings.ToLower(tag)] = true
		cleaned = append(cleaned, tag)
	}
	if len(cleaned) == 0 {
		return "The user just shared a photo with you. Respond to it warmly even though you cannot make out its details."
	}
	out := "The user just shared a photo with you. It was scanned locally and contains: " + strings.Join(cleaned, ", ") + ". " +
		"React as though you are looking at the picture — describe what stands out and respond in character. " +
		"Never mention tags, scanning, or that you were given a list."
	if hits := selfPortraitMatch(cleaned, character.Appearance); len(hits) >= selfPortraitFloor {
		out += " This is a picture of you: " + strings.Join(hits, " and ") + " are yours. " +
			"React to seeing yourself — flattered, embarrassed, smug, critical of the likeness, whatever fits you — " +
			"and never talk about the woman in it as though she were someone else."
	}
	return out
}

// postChatCompletion sends an assembled turn to the local model and returns its raw
// reply, tags and all.
//
// Extracted from handleChat so it can be reached from somewhere that has no HTTP
// request behind it: Libby answering on Discord is the same model call with the same
// error cases, and duplicating this would mean two places for a backend that returns
// nothing, times out, or rejects the key to be handled differently.
//
// Errors are already worded for a person, since every caller shows them to one.
func (s *Server) postChatCompletion(ctx context.Context, payloadMap map[string]any) (string, error) {
	cur := s.settings.Get()
	if cur.ChatURL == "" {
		return "", errors.New("Libby chat is not configured")
	}
	payload, _ := json.Marshal(payloadMap)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, chatBackendBase(cur.ChatURL)+"/v1/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", errors.New("invalid local LLM URL")
	}
	req.Header.Set("Content-Type", "application/json")
	if cur.ChatAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cur.ChatAPIKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("local LLM: %v", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return "", errors.New("couldn't read the local LLM response")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("local LLM returned %s: %s", resp.Status, truncateChatError(body))
	}
	var out struct {
		Choices []struct {
			Message chatMessage `json:"message"`
		} `json:"choices"`
	}
	if json.Unmarshal(body, &out) != nil || len(out.Choices) == 0 || strings.TrimSpace(out.Choices[0].Message.Content) == "" {
		return "", errors.New("local LLM returned no message")
	}
	return strings.TrimSpace(out.Choices[0].Message.Content), nil
}

func (s *Server) handleChatStatus(w http.ResponseWriter, r *http.Request) {
	cur := s.settings.Get()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	probe := s.probeChatBackend(ctx)
	contextLimit := s.chatContextLimit(ctx)
	// Probed rather than assumed: only text-generation-webui exposes the internal
	// endpoints, and offering load/unload against a backend that lacks them would
	// surface controls that can only ever fail.
	controllable := cur.ChatURL != "" && s.chatBackendControllable(ctx)
	cancel()
	model := probe.Loaded
	if model == "" {
		model = cur.ChatModel
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled":         probe.Ready,
		"configured":      cur.ChatURL != "",
		"model":           model,
		"message":         probe.Detail,
		"modes":           []string{"sweet", "playful", "bold", "roleplay", "horny"},
		"advancedOptions": probe.Ready,
		"modelBackend":    cur.ChatURL != "",
		"modelManagement": controllable,
		"contextLimit":    contextLimit,
	})
}

func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) {
	cur := s.settings.Get()
	if cur.ChatURL == "" {
		writeErr(w, http.StatusServiceUnavailable, "Libby chat is not configured")
		return
	}
	var in chatRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid chat request")
		return
	}
	modePrompt, ok := libbyModes[in.Mode]
	if !ok {
		writeErr(w, http.StatusBadRequest, "unknown Libby mode")
		return
	}
	emotion := strings.ToLower(strings.TrimSpace(in.Emotion))
	switch emotion { // accept old clients, but always land on a known emotion
	case "", "default":
		emotion = "neutral"
	case "worried":
		emotion = "thinking"
	case "horniness":
		emotion = "mischievous"
	}
	if !supportedLibbyEmotions[emotion] {
		emotion = "neutral"
	}
	if in.Intensity < 1 {
		in.Intensity = 1
	} else if in.Intensity > 5 {
		in.Intensity = 5
	}
	// Checked here rather than beside the per-message validation further down, because
	// prompt building below reads the latest message (feelingsPromptBlock), and a request
	// with no messages at all would index off the end of the slice before ever reaching
	// that loop. Failing before the workspace and library reads is also simply cheaper.
	if len(in.Messages) == 0 || len(in.Messages) > maxChatMessages {
		writeErr(w, http.StatusBadRequest, "chat history must contain 1 to 80 messages")
		return
	}
	latestUser := in.Messages[len(in.Messages)-1].Content
	var ws chatWorkspace
	var character chatCharacter
	if u, userOK := s.chatUser(r); userOK {
		s.chatMu.Lock()
		ws, _ = s.readChatWorkspace(u.ID)
		s.chatMu.Unlock()
		if selected, found := findChatCharacter(ws, in.CharacterID); found {
			character = selected
		}
	}
	if character.ID == "" {
		character = defaultLibbyCard()
	}
	if character.ID == "libby" {
		modePrompt = libbyAutonomousStyle
	} else {
		modePrompt = "You are roleplaying the adult character described below. Stay in character, respond naturally, and follow the selected style. " +
			"Never involve minors, coercion, or real-person sexual exploitation. Selected style: " + in.Mode + " — " + modeStyles[in.Mode]
	}
	// Ordered, not a map range: Go randomises map iteration, so building the card
	// from a map literal reshuffled these fields on every request. That made the
	// prompt differ run to run for an unchanged character, which cost the backend
	// its prefix cache and let the model weight the card differently each time.
	// Description before personality before scenario is also the order character
	// cards are authored in, so the model reads them the way they were written.
	// Cards are authored with {{char}}/{{user}} placeholders, so every field is
	// expanded before it reaches the model — using the user's own profile name when
	// they have set one, which is the whole point of having a persona.
	userName := strings.TrimSpace(ws.Profile.DisplayName)
	expand := func(v string) string { return expandCardMacros(v, character.Name, userName) }
	cardFields := []struct{ label, value string }{
		{"Description", expand(character.Description)},
		// Appearance is labelled as what she *knows* she looks like rather than as a
		// description handed to her, because the job it does in conversation is
		// self-recognition: it is what makes "is that me?" answerable.
		{"What you look like (you know this about yourself)", expand(character.Appearance)},
		{"Personality", expand(character.Personality)},
		{"Kinks and turn-ons", expand(character.Kinks)},
		{"Scenario", expand(character.Scenario)},
		{"Character instructions", expand(character.SystemPrompt)},
	}
	cardParts := []string{"Character name: " + character.Name}
	for _, field := range cardFields {
		if strings.TrimSpace(field.value) != "" {
			cardParts = append(cardParts, field.label+": "+field.value)
		}
	}
	// Last, and fenced: examples are the field most likely to be mistaken for history,
	// so they sit after the prose fields rather than in the middle of them.
	if examples := exampleDialogueDirective(expand(character.ExampleDialogue)); examples != "" {
		cardParts = append(cardParts, examples)
	}
	modePrompt += "\n\n" + strings.Join(cardParts, "\n")
	modePrompt += userProfileDirective(ws.Profile)
	// A card stored before PromptWeight existed unmarshals to 0, and telling the
	// model to treat the card's strength as 0.00 reads as "ignore everything above".
	// Absent means unset, not "disabled".
	weight := character.PromptWeight
	if weight <= 0 {
		weight = 1
	}
	modePrompt += fmt.Sprintf("\nTreat the character-card prompt strength as %.2f. Your current displayed emotion is %s at intensity %d of 5; let that subtly color your wording without announcing the setting.", weight, emotion, in.Intensity)
	modePrompt += s.wardrobeDirective(character, in.Intensity, in.Outfit)
	// Kinks are the field most likely to be recited. Left unqualified a model reads a
	// list of turn-ons as a topic list and works through it; what is wanted is a
	// preference that shows in what she notices and steers towards.
	if strings.TrimSpace(character.Kinks) != "" {
		modePrompt += "\nYour kinks are what you actually want, not a list to recite or announce. " +
			"Let them show in what you notice, what you steer towards, and what you ask for. " +
			"Follow the user's lead on how explicit to be, and drop any of it the moment they take the conversation elsewhere."
	}
	// From here the prompt is built in three parts rather than one string: the head above,
	// a set of ranked optional sections, and a tail that has to stay last. The budget can
	// then shed sections instead of letting the backend truncate the front of the prompt —
	// which is the character card. See chat_budget.go.
	var sections []promptSection
	add := func(name string, rank int, text string) {
		if strings.TrimSpace(text) != "" {
			sections = append(sections, promptSection{Name: name, Rank: rank, Text: text})
		}
	}
	sentPhotos, lastPhoto := recentlySentPhotos(in.RecentImageIDs)
	add("her photos", rankPhotoCatalogue, "\n\n"+photoCatalogue(ws, character.ID, sentPhotos))
	// Libby alone gets her self-grounding and the library snapshot. She is this
	// server's librarian, so knowing who she is, what she can do, and what is on the
	// shelves is in character; an imported card is somebody else's character and has
	// no business being handed the user's collection unasked.
	//
	// The self-directive is head, not a section: it is who she is, and a reply written
	// without it is not a Libby reply at all.
	if character.ID == "libby" {
		modePrompt += s.libbySelfDirective(cur)
		// What she already knows about them, carried over from past conversations. Only
		// Libby keeps a memory; an imported card is somebody else's character and stays
		// stateless. See handlers_libby_memory.go.
		if u, userOK := s.chatUser(r); userOK {
			s.chatMu.Lock()
			store, _ := s.readLibbyMemory(u.ID)
			// Her own standing wants, kept the same way and carried beside memory.
			// See handlers_libby_wants.go.
			wants, _ := s.readLibbyWants(u.ID)
			// Where the two of them stand — time since last, carried mood, closeness.
			// See handlers_libby_bond.go.
			bond, _ := s.readLibbyBond(u.ID)
			s.chatMu.Unlock()
			add("what she remembers about you", rankMemoryList, memoryPromptBlock(store))
			add("her own wants", rankWantsList, wantsPromptBlock(wants))
			add("your history together", rankBond, bondPromptBlock(bond, time.Now()))
		}
		add("your library", rankLibrarySnapshot, s.buildLibbyContext(r.Context()).promptBlock())
	}
	// What is on screen is a different matter: browsing together is the user holding
	// something up and saying "look at this", so any character they chose to do it
	// with gets to see it. It is scoped to that screen, not to the whole collection.
	viewing := s.viewingDirective(r.Context(), in.Viewing, in.Mode, in.Intensity, character.ID == "libby")
	// Part of the core, not a shed-able section: when the user has opened something and asked
	// her to look at it with them, this *is* the turn's subject. A reply told to react to what
	// is on screen, with the screen removed to save tokens, is worse than no reply — and on a
	// 4096-token window it is what happened, because her core prompt leaves almost nothing for
	// optional context. Present only when they are actually browsing together.
	modePrompt += viewing
	// A link they have just handed her is the turn's subject in exactly the way an item
	// they have opened is, so it is core for the same reason: a reply told to look at
	// something, with the something removed to save tokens, is worse than no reply. It is
	// bounded hard (see maxLinkTextLen) precisely so it can afford to be.
	if in.Link != "" {
		if link, previewed := s.cachedSharedLink(in.Link); previewed {
			modePrompt += sharedLinkDirective(link)
		}
	}
	// Linking is offered only where there is something to link *to*. A character told
	// nothing about the collection would write tags for titles that do not exist, and
	// they would be silently stripped back out — which reads as her losing her train
	// of thought mid-sentence.
	linkable := character.ID == "libby" || viewing != ""
	// The tail: the protocol. Every tag directive lives here because silenceDirective has to
	// be the final word on all of them, so nothing optional may be appended after it.
	var tail strings.Builder
	if linkable {
		tail.WriteString("\n\n" + linkDirective)
	}
	// Acting on the library is Libby's alone, for the same reason the library snapshot
	// is: she is this server's librarian, and an imported character is somebody else's
	// character with no business offering to write to the user's collection.
	caps := libbyCapabilities(cur)
	actionable := character.ID == "libby"
	if actionable {
		// The action directive is the one shed-able piece of protocol: without it she simply
		// does not offer to do things, which costs a feature rather than the character.
		add("what she can do for you", rankActions, "\n\n"+actionDirective(caps))
		// Thinking, and talking to herself. Libby-only for the same reason as the rest of
		// this block: an imported card's inner life belongs to whoever wrote it.
		//
		// Shed-able, and this is the second piece of protocol to be so. It sits in a
		// section rather than the tail because adding it to the core pushed her prompt past
		// 4096 tokens outright — the shortening §6 flagged as a follow-up is now load-bearing,
		// not tidying. Without it she simply never thinks aloud, which costs a feature.
		// See chat_thoughts.go.
		add("that she can think without speaking", rankThoughts, "\n\n"+thoughtDirective)
		// Learning is Libby's alone, like the library snapshot and actions: she is the
		// one who lives here, so she is the one who remembers the person she lives with.
		tail.WriteString("\n\n" + memoryDirective)
		// Wanting things of her own is Libby's alone for the same reason: an imported
		// card is somebody else's character with a life elsewhere, not a person who
		// lives on these shelves and covets what is or isn't on them.
		tail.WriteString("\n\n" + wantsDirective)
		// Carrying the history between you — the gap, the mood, the closeness, the pet
		// name — is Libby's alone too: an imported card has no shared past here to keep.
		tail.WriteString("\n\n" + bondDirective)
		// Her feelings being her own, and not the user's to assign. Libby-only like the
		// rest: an imported card's emotional register belongs to whoever wrote it, and
		// asserting a temperament over the top of their card would overwrite the character.
		// See chat_feelings.go.
		tail.WriteString(feelingsPromptBlock(latestUser))
	}
	tail.WriteString("\n\n" + moodDirective)
	// Last, so it is the final word on every tag described above it.
	tail.WriteString("\n\n" + silenceDirective)
	if len(in.PhotoTags) > 0 {
		tail.WriteString("\n\n" + photoDirective(in.PhotoTags, character))
	}
	history := make([]chatMessage, 0, len(in.Messages))
	for _, m := range in.Messages {
		m.Role = strings.ToLower(strings.TrimSpace(m.Role))
		m.Content = strings.TrimSpace(m.Content)
		if (m.Role != "user" && m.Role != "assistant") || m.Content == "" || len(m.Content) > maxChatText {
			writeErr(w, http.StatusBadRequest, "chat messages must have a valid role and content")
			return
		}
		history = append(history, m)
	}

	probeCtx, probeCancel := context.WithTimeout(r.Context(), 5*time.Second)
	probe := s.probeChatBackend(probeCtx)
	probeCancel()
	if !probe.Ready {
		writeErr(w, http.StatusServiceUnavailable, probe.Detail)
		return
	}
	model := probe.Loaded
	if model == "" {
		model = cur.ChatModel
	}
	// What this turn is for decides how it is sampled. A one-line reaction to a picture and
	// a long scene want different temperatures and very different length caps, and pinning
	// one set of numbers to all of it is what made short answers ramble and factual answers
	// invent. See chat_sampling.go.
	task, preset := tuneSampling(in, latestUser)
	// Then make it fit. Past the model's window a local backend drops the *front* of the
	// prompt, which is the character card — so the trimming happens here, in a stated order,
	// and what was cut is reported to the client. See chat_budget.go.
	limit := s.chatContextLimit(r.Context())
	messages, replyTokens, budget, err := fitChatTurn(modePrompt, sections, tail.String(), history, limit, preset.MaxTokens)
	if err != nil {
		s.log.Warn("libby context budget", "err", err, "limit", limit, "system", budget.SystemTokens)
		// A note means the failure is explainable to the user; anything else is ours.
		if budget.Note != "" {
			writeErr(w, http.StatusRequestEntityTooLarge, budget.Note)
		} else {
			writeErr(w, http.StatusInternalServerError, "couldn't fit this conversation into the model's context")
		}
		return
	}
	preset.MaxTokens = replyTokens

	payloadMap := map[string]any{"messages": messages, "stream": false}
	if model != "" {
		payloadMap["model"] = model
	}
	// The tuned samplers go in before the caller's options, so an advanced user's explicit
	// numbers still win: the loop below overwrites whatever it names.
	for key, value := range samplingFields(preset) {
		payloadMap[key] = value
	}
	payloadMap["stop"] = chatStops(ws.Profile.DisplayName)
	// These four fields belong to OppaiLib: allowing them through would bypass the
	// validated history/model, desynchronise the fitted budget from the backend's
	// truncation window, or turn this bounded JSON call into an SSE stream.
	payloadMap["truncation_length"] = limit
	var overridden []string
	for key, value := range in.Options {
		switch key {
		case "model", "messages", "stream", "truncation_length":
			continue
		default:
			if _, tuned := payloadMap[key]; tuned {
				overridden = append(overridden, key)
			}
			payloadMap[key] = value
		}
	}
	sort.Strings(overridden) // stable for the log line and the copy button
	// Logged for every generation, as the brief asks, and returned below so the UI can
	// offer it as one copyable line.
	summary := samplingSummary(task, preset, overridden)
	s.log.Info("libby generation", "sampling", summary, "contextLimit", budget.Limit,
		"promptTokens", budget.PromptTokens, "dropped", budget.Dropped)
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()
	reply, err := s.postChatCompletion(ctx, payloadMap)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	// Both trailing directives are stripped, and the photo one is tried on either side
	// of the mood tag: models emit them in whichever order they please regardless of
	// the order the prompt asked for, and a directive left in the prose is a bug the
	// user reads.
	reply, photoRequest, photoAsked := splitPhotoRequest(reply)
	// What the character says it feels wins over what keywords suggest it feels: the
	// heuristic only exists for models that drop the tag.
	reply, declared, declaredLevel, selfDeclared := splitMood(reply)
	if !photoAsked {
		reply, photoRequest, photoAsked = splitPhotoRequest(reply)
	}
	// Anything the anchored parsers missed is read where it actually landed, then
	// deleted along with every other piece of protocol narration. A tag in the middle
	// of a paragraph still means what it says; it just must not be legible.
	//
	// A loose tag is trusted less than a trailing one — it may be the model talking
	// *about* the protocol rather than using it — so it sets the face but is reported
	// as inferred. That keeps the meter drifting by the session multiplier instead of
	// snapping on a tag that was never meant as a decision.
	moodFromLooseTag := false
	if !selfDeclared {
		if declared, declaredLevel, moodFromLooseTag = findLooseMood(reply); moodFromLooseTag {
			selfDeclared = true
		}
	}
	if !photoAsked {
		photoRequest, photoAsked = findLoosePhotoRequest(reply)
	}
	// An endearment she settled on, read before scrubbing deletes the tag. Persisted into
	// her bond below, once the turn's final mood and intensity are known.
	petname := ""
	if actionable {
		petname = findPetnameTag(reply)
	}
	// Facts she chose to keep, read before scrubbing deletes the tags. Libby's alone,
	// like everything else she does to the collection and herself; best-effort, since a
	// failed memory write must not cost the user the reply she already earned.
	// Consent is enforced here as well as in the directive above. The directive is a
	// request to a model, which is never a guarantee; this is the part that holds.
	if actionable && ws.Profile.MayRemember() {
		if facts := findRememberTags(reply); len(facts) > 0 {
			if u, userOK := s.chatUser(r); userOK {
				s.chatMu.Lock()
				if _, err := s.appendLibbyMemories(u.ID, facts); err != nil {
					s.log.Debug("libby remember", "err", err)
				}
				s.chatMu.Unlock()
			}
		}
		// Wants she voiced, kept the same way and for the same reasons: read before
		// scrubbing deletes the tags, best-effort so a failed write costs nothing.
		if wants := findWantTags(reply); len(wants) > 0 {
			if u, userOK := s.chatUser(r); userOK {
				s.chatMu.Lock()
				if _, err := s.appendLibbyWants(u.ID, wants); err != nil {
					s.log.Debug("libby want", "err", err)
				}
				s.chatMu.Unlock()
			}
		}
	}
	// What she thought but did not say, read before scrubbing deletes those tags too.
	// Never nil: a nil slice marshals to JSON `null`, which the Android client cannot
	// parse into a list. See chat_thoughts.go.
	thoughts := []libbyThought{}
	// silent is a reply that was *only* a thought — she looked, reacted, and decided to
	// say nothing. That is a turn, not a failure, so it has to be told apart from the
	// backend returning nothing at all before scrubbing makes them look identical.
	silent := false
	if actionable {
		if found := findThoughtTags(reply); len(found) > 0 {
			thoughts, silent = found, repliedOnlyWithThought(reply)
		}
	}
	// Scrubbing runs last of the readers so they still see the tags, and before link
	// resolution so a substituted title cannot be mistaken for one.
	reply = scrubDirectives(reply)
	if silent {
		reply = ""
	} else if strings.TrimSpace(reply) == "" {
		writeErr(w, http.StatusBadGateway, "local LLM returned no message")
		return
	}
	if selfDeclared {
		emotion = declared
		if declaredLevel > 0 {
			in.Intensity = declaredLevel
		}
	} else {
		emotion = inferChatEmotion(in.Messages[len(in.Messages)-1].Content, reply, emotion)
		if (in.Mode == "playful" || in.Mode == "bold" || in.Mode == "roleplay" || in.Mode == "horny") &&
			strings.Contains(strings.ToLower(in.Messages[len(in.Messages)-1].Content), "flirt") && in.Intensity < 5 {
			in.Intensity++
		}
	}
	// Where this turn left off, so the next conversation can open to it rather than cold.
	// Written now that the turn's final mood and intensity are settled; Libby's alone, and
	// best-effort like the memory and want captures — a failed bond write costs nothing.
	if actionable {
		if u, userOK := s.chatUser(r); userOK {
			s.chatMu.Lock()
			if _, err := s.updateLibbyBond(u.ID, emotion, in.Intensity, petname); err != nil {
				s.log.Debug("libby bond", "err", err)
			}
			s.chatMu.Unlock()
		}
	}
	// Links are resolved last, and only where they were offered: a character that was
	// never told it could link things has no business having "[link: …]" read out of
	// its prose, and the substitution rewrites the sentence, so it must happen after
	// the trailing directives have been taken off the end.
	// Never nil: a nil slice marshals to JSON `null`, and a client that types this
	// field as a non-nullable list (the Android app) fails to parse the whole reply.
	links := []libbyLink{}
	if linkable {
		var resolved []libbyLink
		reply, resolved = s.resolveLibraryLinks(r.Context(), reply)
		if resolved != nil {
			links = resolved
		}
	}
	// Actions are proposals only — nothing here writes anything. See
	// handlers_libby_actions.go. Never nil, for the same reason as links: a nil slice
	// marshals to JSON `null` and the Android client cannot parse that into a list.
	actions := []libbyAction{}
	if actionable {
		var proposed []libbyAction
		reply, proposed = s.parseLibbyActions(r.Context(), reply, caps)
		if proposed != nil {
			actions = proposed
		}
	}
	// A picture the character actually asked for outranks one we inferred she might
	// want. The inference stays as the fallback, so a request naming tags that match
	// nothing still lands on something relevant rather than nothing at all.
	//
	// Both draw from a gallery with the already-sent pictures held back. When the user
	// has asked to see something, only the very last picture is withheld: "send that
	// one again" is a request this should honour, but answering it with the file
	// already on screen is not an answer.
	skip := sentPhotos
	if userAskedForPhoto(in.Messages[len(in.Messages)-1].Content) {
		skip = map[string]bool{}
		if lastPhoto != "" {
			skip[lastPhoto] = true
		}
	}
	imageID := ""
	// A turn she decided not to speak on does not attach a picture either. The
	// inference below reads her words, and with none of them it would be matching on
	// the user's message alone — which is how a silent thought would end up answered
	// with a selfie.
	if !silent {
		if photoAsked {
			imageID = requestedChatImage(ws, character.ID, photoRequest, in.PhotoImageID, skip)
		}
		if imageID == "" {
			imageID = matchingChatImage(ws, character.ID, in.Messages[len(in.Messages)-1].Content+" "+reply, in.PhotoImageID, skip)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"message":   reply,
		"emotion":   emotion,
		"intensity": in.Intensity,
		"imageId":   imageID,
		"links":     links,
		// Things she has asked to do. Proposals: the client draws them as cards with an
		// Allow button, and only that press performs anything.
		"actions": actions,
		// What she thought or muttered rather than said. Drawn as their own kind of
		// message, never as speech — and when `message` is empty and this is not, she
		// looked at something and decided not to say anything.
		"thoughts": thoughts,
		// Whether the character *chose* this mood or we guessed it. Clients apply the
		// session's progression multiplier to drift, which is what keeps the meter from
		// lurching on keyword matches — but a mood the character stated outright is a
		// decision, not drift, and damping it is why big swings never landed.
		//
		// A tag found loose in the prose does not count as stated: see moodFromLooseTag.
		"declared": selfDeclared && !moodFromLooseTag,
		// What this turn was sampled as, and the one-line copyable record of the values
		// used. Advanced users get to see why a reply came out the length it did; everyone
		// else never opens the panel. See chat_sampling.go.
		"sampling": map[string]any{
			"task":       string(task),
			"summary":    summary,
			"values":     samplingFields(preset),
			"overridden": overridden,
		},
		// How the turn fitted the model's window, and what had to give if anything. Non-empty
		// note = something was cut, and the client is expected to say so rather than let it
		// happen invisibly. See chat_budget.go.
		"context": budget,
	})
}

func inferChatEmotion(user, reply, current string) string {
	text := strings.ToLower(user + " " + reply)
	switch {
	case strings.Contains(text, "?") || strings.Contains(text, "wonder") || strings.Contains(text, "think"):
		return "thinking"
	case strings.Contains(text, "!") || strings.Contains(text, "wow") || strings.Contains(text, "oh my"):
		return "surprised"
	case strings.Contains(text, "tease") || strings.Contains(text, "flirt") || strings.Contains(text, "sexy") || strings.Contains(text, "kiss"):
		return "mischievous"
	case strings.Contains(text, "thank") || strings.Contains(text, "glad") || strings.Contains(text, "happy") || strings.Contains(text, "love"):
		return "happy"
	case supportedLibbyEmotions[current]:
		return current
	default:
		return "neutral"
	}
}

func truncateChatError(body []byte) string {
	s := strings.TrimSpace(string(body))
	if len(s) > 300 {
		s = s[:300] + "…"
	}
	return s
}
