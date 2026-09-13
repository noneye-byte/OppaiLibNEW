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
	// ID is the client's id for this message, so a reply can point at it. Optional:
	// the model never sees it, and an older client sends none. See chat_replies.go.
	ID string `json:"id,omitempty"`
	// ReplyTo is the earlier message this one answers, when the user quoted one. The
	// history folds it in as a quote; the latest message's is also framed directly.
	ReplyTo *chatReplyRef `json:"replyTo,omitempty"`
	// ImageID is the chat image this message carried — a photo they shared, or a
	// selfie she sent. Resolved to its tags so the history says what was in it, not
	// just that something was. See chat_history.go.
	ImageID string `json:"imageId,omitempty"`
	// MediaIDs are the library items this message attached, theirs or hers, resolved to
	// titles the same way.
	MediaIDs []int64 `json:"mediaIds,omitempty"`
	// Reactions are the emoji on this message, so she knows a heart was put on what she
	// said. See chat_reactions.go.
	Reactions []chatReaction `json:"reactions,omitempty"`
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
	// RecentMediaIDs are the library items this character has already attached in this
	// conversation, oldest first. The same bookkeeping as RecentImageIDs and needed for
	// the same reason — she now hands over library items, and a picture of her taken
	// from the library is one of them. See recentlyAttached.
	RecentMediaIDs []int64 `json:"recentMediaIds,omitempty"`
	// ConversationID is which of the user's conversations this turn belongs to.
	//
	// The server keeps no per-conversation state, but it does hold every conversation:
	// the client-owned log round-trips through the workspace file. So the only thing
	// missing before she could remember the *other* chats was knowing which one she was
	// in, so as not to recap it back at herself. Optional — a client that omits it is
	// identified by its history's tail instead. See chat_recaps.go.
	ConversationID string `json:"conversationId,omitempty"`
	// Viewing is what the two of them are looking at, when this message comes from a
	// browse-together session rather than the chat screen.
	Viewing *chatViewing `json:"viewing,omitempty"`
	// Link is a web address the user is showing her with this message. The URL only —
	// the summary is the server's, read from what the preview endpoint already fetched.
	// A link that was never previewed is ignored rather than fetched, so a chat message
	// can never make this server hit an address. See handlers_libby_links.go.
	Link string `json:"link,omitempty"`
	// Debug asks this turn to keep its receipts: the assembled prompt, the sections it
	// was built from and the unscrubbed reply come back in the response. Opt-in per
	// request because the payload dwarfs the reply. See chat_debug.go.
	Debug bool `json:"debug,omitempty"`
	// Task says what this turn is for, when the client knows something the text cannot
	// show: an idle nudge is an autonomous message however it is worded, and a private
	// observation is not a reply at all. Optional — the server classifies the turn itself
	// when this is absent, and ignores a value it has no preset for. See classifyChatTask.
	Task string `json:"task,omitempty"`
	// RecentMoods are the emotions her last replies in this conversation displayed,
	// oldest first. The same bookkeeping as RecentImageIDs and needed for the same
	// reason: the server holds no per-conversation state, so how long she has been
	// wearing one face has to arrive with the turn. Without it a stuck expression is
	// indistinguishable from a fresh one. See chat_mood.go.
	RecentMoods []string `json:"recentMoods,omitempty"`
	// RecentHeat is the heat her last replies sat at, oldest first — the same
	// bookkeeping as RecentMoods, so a number that has not moved all evening can be
	// noticed. See chat_heat.go.
	RecentHeat []int `json:"recentHeat,omitempty"`
	// Activity is the MISC state she is currently in — typing, curled up reading, or
	// something a good deal less idle. Client-owned like the mood run and for the same
	// reason: the state persists across turns and the server holds nothing between
	// them, so a state set three replies ago has to arrive with this one or it lasts
	// exactly one message. See libby_activities.go.
	Activity string `json:"activity,omitempty"`
	// Call says the user has her on the call screen rather than in the message log.
	// Client-owned, because opening a call is a thing that happens on a device and the
	// server never hears about it otherwise. See chat_call.go.
	Call bool `json:"call,omitempty"`
	// Background is the id of the place she is currently in, on the call screen.
	// Client-owned like Activity and for the same reason: it persists across turns and
	// the server holds nothing between them. See libby_backgrounds.go.
	Background string `json:"background,omitempty"`
	// SharedMediaIDs are the library items the user attached to their latest message —
	// by reference, unlike a shared photo, so a video or a game can be shown to her
	// without a copy. See chat_shared.go.
	SharedMediaIDs []int64 `json:"sharedMediaIds,omitempty"`
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
	strings.Join(libbyEmotions, ", ") + ". Choose both yourself, and never mention the tag."

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
// The targets are the full vocabulary: a label that means "shy" resolves to shy, and
// it is the *client* that decides what to show if the worn outfit never drew shyness
// (libbyNearestPose). Resolving it to "surprised" here instead would throw the
// distinction away before the bundled art — or an outfit that does draw shyness —
// ever got the chance to use it.
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
//
// asked is the user's latest message. Each picture shows only a handful of its tags,
// and which handful used to be whichever came first — so a picture tagged thirty
// things had "red dress" in the list or not by luck, and a model that could not see it
// concluded she had no such picture and offered to generate one. The tags the message
// names are listed first now, then the rarer ones. See catalogueTags.
//
// example is the tag handle to show in the "for example [send: …]" line, when the
// caller has one — the ready picture's, on a turn where one was chosen. Models copy
// the example verbatim, and when it named the first picture in the list while the
// ready-picture directive named another, the first picture is what she wrote. Empty
// means the first unsent picture's tags, as before.
func photoCatalogue(ws chatWorkspace, characterID string, sent map[string]bool, selfPics []selfPicture, sentMedia map[int64]bool, asked, example string) string {
	lines := make([]string, 0, maxCataloguePhotos)
	repeats := false
	// The pictures of her, both pools, for the frequency count that orders the tags.
	var pools [][]string
	for _, img := range ws.Images {
		if img.CharacterID == characterID && isSelfPicture(img) {
			pools = append(pools, img.Tags)
		}
	}
	for _, pic := range selfPics {
		pools = append(pools, pic.tags)
	}
	wanted, frequency := requestWords(asked), tagFrequency(pools)
	// One line per picture, tags only. Which pool it came from — her chat gallery, or a
	// library item recognised as her (chat_attachments.go) — is deliberately not said.
	// It changes nothing about how she asks for one, and a model told there are two
	// collections starts reasoning about collections instead of choosing a photo.
	entry := func(tags []string, already bool) {
		// Untagged pictures are unreachable by tag, so listing one would only invite a
		// request that can never resolve.
		if len(lines) >= maxCataloguePhotos || len(tags) == 0 {
			return
		}
		tags = catalogueTags(tags, wanted, frequency)
		if len(tags) > 8 {
			tags = tags[:8]
		}
		line := "- " + strings.Join(tags, ", ")
		if already {
			line += "  [already sent]"
			repeats = true
		} else if example == "" {
			example = strings.Join(tags[:min(2, len(tags))], ", ")
		}
		lines = append(lines, line)
	}
	// Photos of other people and things, shared with her. Listed apart, so she knows
	// what was shown to her without ever taking one for a picture of herself.
	var shared []string
	for _, img := range ws.Images {
		if img.CharacterID != characterID {
			continue
		}
		if !isSelfPicture(img) {
			if len(shared) < maxSharedPhotoLines && len(img.Tags) > 0 {
				tags := img.Tags
				if len(tags) > 6 {
					tags = tags[:6]
				}
				shared = append(shared, "- "+strings.Join(tags, ", "))
			}
			continue
		}
		entry(img.Tags, sent[img.ID])
	}
	for _, pic := range selfPics {
		entry(pic.tags, sentMedia[pic.link.ID])
	}
	if len(lines) == 0 {
		if len(shared) == 0 {
			return ""
		}
		return sharedPhotosBlock(shared)
	}
	if example == "" {
		example = "lingerie, bed"
	}
	out := "Selfies you can send — pictures of you, not library items to recommend. One per line, by its tags:\n" +
		strings.Join(lines, "\n") +
		"\nTo send one, end your reply with [send: <tags>] naming tags from the picture you mean — for example [send: " + example + "]. " +
		"A selfie is a deliberate thing now and then, never decoration: most replies have none, and never more than one. " +
		"Send one when they ask to see you, or when you would genuinely stop and take one for them. Never describe, promise or refer to a picture you have not actually sent.\n" +
		snapDirective
	if repeats {
		out += "\nPictures marked [already sent] are ones you have shown in this conversation. " +
			"Do not send those again unless the user asks you for that picture specifically — pick a different one, or send nothing."
	}
	if len(shared) > 0 {
		out += "\n" + sharedPhotosBlock(shared)
	}
	return out
}

// maxSharedPhotoLines bounds the shared-photo list in the catalogue. Context, not a
// menu: a few lines so she remembers what she was shown, never a second catalogue.
const maxSharedPhotoLines = 6

// sharedPhotosBlock frames the photos of other people and things the user has shared.
func sharedPhotosBlock(lines []string) string {
	return "Photos they have shared with you of other people or things — not you, and never something you can send as a selfie:\n" +
		strings.Join(lines, "\n")
}

// sendTag captures the picture request described above. Same shape and the same
// tolerance as moodTag, and for the same reason: models paraphrase the syntax they
// are given, so "show" and "photo" are accepted alongside "send".
//
// "attach" is deliberately not among them any more. It now means handing over a
// library item (chat_attachments.go), and while it sat here a request to attach
// something from the collection was read as a request for a selfie whose tags matched
// nothing, so it resolved to no picture and vanished. Both readings are still
// reachable: an attach request that matches nothing in the library is tried as a photo
// request by the handler.
var sendTag = regexp.MustCompile(`(?is)\n*[ \t]*[*_~>\x60]*\[\s*(?:send|show|photo|pic|image)\s*[:=-]?\s*([^\]]{1,200}?)\s*\]\s*[*_~\x60.!]*\s*$`)

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
// This mirrors the bundled artwork exactly — the calm, warm, flirty, heated and peak
// tiers in web/public/Libby_Default — and that is the whole point of it existing. The
// sprite beside the conversation comes undone as the meter climbs, and a character
// who talks about her hoodie while the picture of her shows otherwise breaks the
// illusion harder than having no description at all. If the art is redrawn, this
// changes with it.
//
// Kept out of the Appearance card field deliberately: appearance is the constant
// likeness and is matched against shared photos, whereas this moves every few
// messages.
var libbyWardrobe = map[int]string{
	1: "a black tank top and orange sweat shorts with white trim and a drawstring, over a black-and-orange bra and panties, and your glasses",
	2: "the same tank top and orange shorts, sitting a little closer than you were, warm in the face, one bra strap showing at your shoulder",
	3: "still the tank top and shorts, flushed now, not bothering to fix the strap that keeps slipping",
	4: "the tank top pulled crooked off one shoulder with the orange bra showing under it, the shorts still on, and your glasses fogging a little",
	5: "the tank top dragged down under your bare chest and the shorts pushed down past your black panties, and your glasses still on",
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
	if json.Unmarshal(body, &out) != nil || len(out.Choices) == 0 {
		return "", errors.New("local LLM returned no message")
	}
	reply := stripThinking(out.Choices[0].Message.Content)
	if reply == "" {
		return "", errors.New("local LLM returned no message")
	}
	return reply, nil
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
	// The MISC state she arrives in, held to the same floor entering it had to clear.
	// Gating on the way in as well as the way out is what makes a scene that has cooled
	// off let go of the state it was in, rather than carrying it into the next hour.
	// See libby_activities.go.
	in.Activity = allowedActivity(in.Activity, in.Intensity)
	// Checked here rather than beside the per-message validation further down, because
	// prompt building below reads the latest message (feelingsPromptBlock), and a request
	// with no messages at all would index off the end of the slice before ever reaching
	// that loop. Failing before the workspace and library reads is also simply cheaper.
	if len(in.Messages) == 0 || len(in.Messages) > maxChatMessages {
		writeErr(w, http.StatusBadRequest, "chat history must contain 1 to 80 messages")
		return
	}
	// The latest thing they said is the whole trailing run of their messages, not the
	// last bubble: a person sends "wait" / "actually" / "send me one" as three texts
	// while she is still reading, and the turn answers all of them. See mergeTurns.
	latestUser := trailingUserText(in.Messages)
	// What this turn is about, read once. It decides which library sections are fed
	// and which optional sections can sit the turn out. See chat_context_feed.go.
	previousUser := ""
	runStart := len(in.Messages) - 1
	for runStart > 0 && strings.EqualFold(strings.TrimSpace(in.Messages[runStart-1].Role), "user") {
		runStart--
	}
	for i := runStart - 1; i >= 0; i-- {
		if strings.EqualFold(strings.TrimSpace(in.Messages[i].Role), "user") {
			previousUser = in.Messages[i].Content
			break
		}
	}
	signals := readTurnSignals(latestUser, previousUser)
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
		// Her life beyond the card. Labelled in the second person like Appearance,
		// because each is a fact about her that the reply should act on rather than a
		// description handed to her: what she is usually doing is what the [doing:] tag
		// draws on, her taste is what she reaches for, her limits are her own no.
		{"What you are usually doing around the place", expand(character.Routine)},
		{"Your taste in what is on the shelves", expand(character.Tastes)},
		{"Your own limits", expand(character.Limits)},
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
	// Where she *was*, not where she is. The wording matters: told this is her current
	// emotion and to let it colour the reply, a model reproduces it, which is half of why
	// her expression used to sit still for an entire evening. It is continuity — she does
	// not restart from neutral every turn — and the movement directive in the tail is what
	// says it is a starting point rather than an instruction. See chat_mood.go.
	modePrompt += fmt.Sprintf("\nTreat the character-card prompt strength as %.2f. You came into this turn looking %s at intensity %d of 5; that is where the last one left you, not a setting to hold. Carry it in, then feel what you actually feel now, and never announce either.", weight, emotion, in.Intensity)
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
	// addDeferred marks a section the turn has no particular use for: still offered,
	// shed first. See promptSection.Deferred.
	addDeferred := func(name string, rank int, text string, wanted bool) {
		if strings.TrimSpace(text) != "" {
			sections = append(sections, promptSection{Name: name, Rank: rank, Text: text, Deferred: !wanted})
		}
	}
	sentPhotos, lastPhoto := recentlySentPhotos(in.RecentImageIDs)
	sentMedia := recentlyAttached(in.RecentMediaIDs)
	// The library pictures of her. Hers alone: character:libby says who a picture is
	// *of*, so handing an imported card the same pool would be giving somebody else's
	// character a stranger's face. Read once and used twice — the catalogue below lists
	// them, and the picker at the end of the turn chooses from the same set.
	var selfPics []selfPicture
	if character.ID == "libby" {
		selfPics = s.libbySelfPictures(r.Context())
	}
	// What she would rather look at, for choosing between items that fit a request
	// equally well. Hers alone, like the wants it is partly read from; an imported card
	// gets the plain ranking. See pickLibraryMatch.
	var taste libbyTaste
	// A message *about* a picture already in the conversation — a reply to one, "what
	// are you doing in that photo" — is a turn for talking, not sending: no picture is
	// chosen in advance and none rides along uninvited. See chat_photo_talk.go.
	// Resolved here, before the catalogue, because it decides whether there is a ready
	// picture; the directive itself is added with the reply-target one further down,
	// once the history describer exists.
	inQuestion, inQuestionOK := pictureInQuestion(in.Messages)
	talking := inQuestionOK && !anotherPictureCue.MatchString(latestUser)
	// When they asked to see her, the picture is chosen now, from their words, and she
	// is told what it shows before she writes a word about it. See chat_photo_pick.go.
	var ready readyPicture
	readyOK := false
	if askedToSeeHer(latestUser) && !talking {
		ready, readyOK = pickReadyPicture(ws, character.ID, selfPics, latestUser, in.PhotoImageID, lastPhoto, sentPhotos, sentMedia)
		if readyOK {
			// Ranked well above the catalogue it belongs beside: one line, and the line
			// that keeps her description and the picture the same picture.
			add("the picture ready to send", rankReadyPicture, "\n\n"+readyPictureDirective(ready, latestUser))
		}
	}
	// The catalogue is wanted when they asked to see her, when the scene has warmed
	// enough that she might offer, or when pictures are already going back and forth.
	// A message about the weather at heat 1 has no use for it. Its example tag is the
	// ready picture's when there is one, so the two directives name the same picture.
	example := ""
	if readyOK {
		example = readyPictureHandle(ready)
	}
	addDeferred("her photos", rankPhotoCatalogue, "\n\n"+photoCatalogue(ws, character.ID, sentPhotos, selfPics, sentMedia, latestUser, example),
		signals.photo || in.Intensity >= 3 || len(sentPhotos) > 0)
	// Libby alone gets her self-grounding and the library snapshot. She is this
	// server's librarian, so knowing who she is, what she can do, and what is on the
	// shelves is in character; an imported card is somebody else's character and has
	// no business being handed the user's collection unasked.
	//
	// The self-directive is head, not a section: it is who she is, and a reply written
	// without it is not a Libby reply at all.
	if character.ID == "libby" {
		modePrompt += s.libbySelfDirective(cur, character)
		// What she already knows about them, carried over from past conversations. Only
		// Libby keeps a memory; an imported card is somebody else's character and stays
		// stateless. See handlers_libby_memory.go.
		if u, userOK := s.chatUser(r); userOK {
			s.chatMu.Lock()
			store, _ := s.readLibbyMemory(u.ID)
			// Her own standing wants, kept the same way and carried beside memory.
			// See handlers_libby_wants.go.
			wants, _ := s.readLibbyWants(u.ID)
			taste = buildLibbyTaste(character.Kinks+" "+character.Tastes, wantTexts(wants))
			// Where the two of them stand — time since last, carried mood, closeness.
			// See handlers_libby_bond.go.
			bond, _ := s.readLibbyBond(u.ID)
			s.chatMu.Unlock()
			add("what she remembers about you", rankMemoryList, memoryPromptBlock(store))
			add("her own wants", rankWantsList, wantsPromptBlock(wants))
			add("your history together", rankBond, bondPromptBlock(bond, time.Now()))
		}
		// The other conversations she has had with this person. Not from a store of its
		// own: they are already here in the workspace, and the only thing that was
		// missing was saying so. See chat_recaps.go.
		// Wanted when they reach back — "last time", "you said" — or when this
		// conversation is only just starting and she is placing them.
		addDeferred(
			"your other conversations",
			rankRecaps,
			conversationRecaps(ws, character.ID, currentConversationID(ws, in), time.Now()),
			signals.past || len(in.Messages) <= 2,
		)
		// The library, fed for the turn rather than as one block. See chat_context_feed.go.
		sections = append(sections, s.libraryFeed(r.Context(), signals, feedChoice{shown: sentMedia, taste: taste, weights: ws.SendWeights})...)
	}
	// What is on screen is a different matter: browsing together is the user holding
	// something up and saying "look at this", so any character they chose to do it
	// with gets to see it. It is scoped to that screen, not to the whole collection.
	viewing := s.viewingDirective(r.Context(), in.Viewing, in.Mode, in.Intensity, character.ID == "libby")
	// Being on camera is the same kind of fact as browsing together and is handled the
	// same way: core, present only when it is true, and the frame the whole reply is
	// written inside. See chat_call.go.
	modePrompt += callPromptBlock(in.Call)
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
	// Library items they attached to this message are the turn's subject in the way a
	// link or an opened item is, and are core for the same reason. See chat_shared.go.
	if len(in.SharedMediaIDs) > 0 {
		modePrompt += s.sharedItemsDirective(r.Context(), in.SharedMediaIDs, character.ID == "libby")
	}
	// Which earlier message their latest one answers, when they quoted one. Core: a
	// reply that answers the wrong message is worse than no reply. See chat_replies.go.
	// Resolved to the whole message, and what it carried. See chat_history.go.
	describer := s.newHistoryDescriber(r.Context(), ws, in.Messages)
	modePrompt += replyTargetDirective(in.Messages[len(in.Messages)-1].ReplyTo, in.Messages, describer)
	// And the picture they are asking about, in full — the history's note under it is
	// capped, and a question about the picture wants everything it shows. Core, like
	// the reply target: an answer about the wrong picture is worse than none.
	if inQuestionOK {
		modePrompt += pictureInQuestionDirective(inQuestion, describer)
	}
	// Where she is, and where she could be — the backgrounds the user has added for the
	// call screen. Only Libby has a place to be; only read when there is something to
	// choose from. See libby_backgrounds.go.
	var backgrounds []libbyBackgroundView
	if character.ID == "libby" {
		backgrounds = s.listLibbyBackgrounds()
		// A conversation with no room of its own is in the default one, when there is
		// one: that is what the client draws, so it is what she is told.
		if in.Background == "" {
			in.Background = s.defaultLibbyBackground()
		}
		if in.Background != "" {
			known := false
			for _, bg := range backgrounds {
				if bg.ID == in.Background {
					known = true
					break
				}
			}
			// A background deleted since the client last saw it is no background at all.
			if !known {
				in.Background = ""
			}
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
	// Handing an item over, as opposed to naming one. Libby's alone rather than every
	// linkable character: putting something from the collection in front of the user is
	// the librarian acting on their library, which is the line the actions below are
	// drawn on too. See chat_attachments.go.
	if character.ID == "libby" {
		tail.WriteString("\n\n" + attachDirective)
	}
	// Acting on the library is Libby's alone, for the same reason the library snapshot
	// is: she is this server's librarian, and an imported character is somebody else's
	// character with no business offering to write to the user's collection.
	caps := libbyCapabilities(cur)
	caps.KnownURLs = knownURLs(in)
	caps.SelfieReady = readyOK && ready.fit > 0
	actionable := character.ID == "libby"
	if actionable {
		// The action directive is the one shed-able piece of protocol: without it she simply
		// does not offer to do things, which costs a feature rather than the character.
		// Wanted when the message asks for something done to the collection, or when
		// they are browsing together and she has something to act on.
		actionText := actionDirective(caps)
		if signals.actFollowUp {
			actionText += "\n" + actionFollowUpDirective
		}
		addDeferred("what she can do for you", rankActions, "\n\n"+actionText,
			signals.act || viewing != "" || len(in.SharedMediaIDs) > 0)
		// Thinking, and talking to herself. Libby-only for the same reason as the rest of
		// this block: an imported card's inner life belongs to whoever wrote it.
		//
		// Shed-able, and this is the second piece of protocol to be so. It sits in a
		// section rather than the tail because adding it to the core pushed her prompt past
		// 4096 tokens outright — the shortening §6 flagged as a follow-up is now load-bearing,
		// not tidying. Without it she simply never thinks aloud, which costs a feature.
		// See chat_thoughts.go.
		add("that she can think without speaking", rankThoughts, "\n\n"+thoughtDirective)
		// What she is doing, as opposed to what she is feeling. Libby-only: the MISC art
		// slots are hers, and telling an imported character it has a wardrobe of states it
		// has no pictures for would be describing somebody else's body to them.
		//
		// Shed-able, and the third piece of protocol to be so, for the reason the thought
		// directive is: at full heat the vocabulary is two dozen states with a description
		// each, and putting that in the core would push her past a small window outright.
		// Without it she simply stops changing states, which costs a feature rather than
		// the character. See libby_activities.go.
		add("what she is doing", rankActivity, "\n\n"+activityDirective(in.Intensity, in.Activity))
		// Where she is. Shed-able like the activity vocabulary and for the same reason:
		// it is a list, and without it she simply stays put. See libby_backgrounds.go.
		//
		// Wanted on a call, where the room is on screen; when the message moves her; and
		// whenever the scene has warmed, because the directive asks the room to follow the
		// *mood* and not only the plot. Gated on a call and a place word alone, that second
		// half could never happen: an evening that turned tender without anybody saying
		// "bed" shed the section every turn, so she was never told she could move and
		// never did. Also wanted when she is nowhere yet — the first move has to come from
		// somewhere, and a character who has never been given a room reads as one who has
		// no rooms. The same ceiling as the photo catalogue beside it, for the same reason.
		addDeferred("where she is", rankActivity, "\n\n"+backgroundDirective(backgrounds, in.Background),
			in.Call || signals.place || in.Intensity >= 3 || in.Background == "")
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
	// Replying to a particular earlier message. Everyone gets it — an imported card has
	// threads to pick up too, and it asserts nothing about who the character is.
	tail.WriteString("\n\n" + replyDirective)
	// Reacting instead of, or as well as, replying. Everyone gets it, like the reply
	// tag: it asserts nothing about who the character is. See chat_reactions.go.
	tail.WriteString("\n\n" + reactDirective)
	tail.WriteString("\n\n" + moodDirective)
	// How a feeling moves over a conversation, and whether this one has stopped moving.
	// Beside the tag rather than with the rest of her temperament in chat_feelings.go,
	// because it is about the tag: it decides what she writes into it. Everyone gets it —
	// an imported card's expression gets stuck for exactly the same reasons hers did, and
	// unlike a temperament this asserts nothing about who the character is.
	// See chat_mood.go.
	tail.WriteString(moodPromptBlock(in.RecentMoods, emotion))
	// And how the number moves: a dial that turns both ways, and a nudge when it has
	// not turned in a while. See chat_heat.go.
	tail.WriteString(heatPromptBlock(in.RecentHeat, in.Intensity))
	// That she *is* in a state carries on being true whether or not the vocabulary for
	// changing it survived the budget, and it is one sentence. See libby_activities.go.
	if character.ID == "libby" {
		tail.WriteString(activityStateDirective(in.Activity))
	}
	// Last, so it is the final word on every tag described above it.
	tail.WriteString("\n\n" + silenceDirective)
	if len(in.PhotoTags) > 0 {
		tail.WriteString("\n\n" + photoDirective(in.PhotoTags, character))
	}
	history := make([]chatMessage, 0, len(in.Messages))
	annotated := false
	for _, m := range in.Messages {
		m.Role = strings.ToLower(strings.TrimSpace(m.Role))
		m.Content = strings.TrimSpace(m.Content)
		if (m.Role != "user" && m.Role != "assistant") || m.Content == "" || len(m.Content) > maxChatText {
			writeErr(w, http.StatusBadRequest, "chat messages must have a valid role and content")
			return
		}
		// What the model reads is the text with any quoted reply folded in and what the
		// message carried described beneath it; the ids and the reference are ours, and
		// stay out of the payload. See chat_replies.go and chat_history.go.
		if describer.carried(m) != "" {
			annotated = true
		}
		history = append(history, chatMessage{Role: m.Role, Content: historyContent(m, describer)})
	}
	// The notes under the history are the one piece of prose in the prompt she has
	// been seen copying. Said once, in the tail, only on a turn that has any; and after
	// silenceDirective was written so it stays the final word on the tags. Both this
	// and silenceDirective are about what not to write, so the order between them is
	// not load-bearing.
	if annotated {
		tail.WriteString("\n\n" + historyNotesDirective)
	}
	// Two texts in a row from the same side are one turn to the model. Chat templates
	// alternate roles, and a local backend handed user/user/assistant either folds them
	// itself (badly) or answers only the last. See mergeTurns.
	history = mergeTurns(history)

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

	// The turn's receipts, when asked for. Built here, where the sections and the
	// budget's two loss lists are both still in scope; the raw reply is filled in
	// after the call. See chat_debug.go.
	var debug *chatDebug
	if in.Debug {
		debug = buildChatDebug(sections, budget.DroppedSections, budget.ClearedSections, messages, signals)
	}

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
		case "max_tokens":
			// The one override that is not purely the caller's to get wrong. The prompt was
			// fitted to leave exactly this much room, so a larger number does not buy a
			// longer reply — it spends room the history is already using, and the backend
			// answers by dropping the front of the prompt, which is the character card. A
			// smaller number is honoured as written.
			asked := intFromAny(value)
			if asked <= 0 || asked > replyTokens {
				asked = replyTokens
			}
			if asked != replyTokens {
				overridden = append(overridden, key)
			}
			payloadMap[key] = asked
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
	// Before any parser touches it: the difference between a tag she wrote that was
	// then dropped and one she never wrote is only visible here.
	if debug != nil {
		debug.Raw = reply
	}
	// Both trailing directives are stripped, and the photo one is tried on either side
	// of the mood tag: models emit them in whichever order they please regardless of
	// the order the prompt asked for, and a directive left in the prose is a bug the
	// user reads.
	// A snap first: it is a picture request with one extra bit, and it has to come out
	// before the ordinary send parser so it is never read as both. See chat_snaps.go.
	reply, photoRequest, photoAsked := splitSnapRequest(reply)
	snap := photoAsked
	if !photoAsked {
		reply, photoRequest, photoAsked = splitPhotoRequest(reply)
	}
	// What the character says it feels wins over what keywords suggest it feels: the
	// heuristic only exists for models that drop the tag.
	reply, declared, declaredLevel, selfDeclared := splitMood(reply)
	// What she is doing, read off the end the same way. Tried before the photo retry
	// below because all three tags are anchored to the end and models emit them in
	// whatever order they please — whichever is outermost is simply parsed first.
	// See libby_activities.go.
	declaredActivity, activityDeclared := "", false
	if character.ID == "libby" {
		reply, declaredActivity, activityDeclared = splitActivity(reply)
	}
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
	if character.ID == "libby" && !activityDeclared {
		declaredActivity, activityDeclared = findLooseActivity(reply)
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
		facts := findRememberTags(reply)
		// And what they stated outright, whether or not she thought to file it. Hers
		// first, so a turn where she did notice keeps its cap; this fills the silence.
		// See chat_memory_capture.go.
		if len(facts) < maxRememberedPerReply {
			for _, fact := range captureUserFacts(latestUser, ws.Profile.DisplayName) {
				if len(facts) >= maxRememberedPerReply {
					break
				}
				facts = append(facts, fact)
			}
		}
		if len(facts) > 0 {
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
	// Where she moved to, whether she rang them or hung up, and which earlier message she
	// is answering — all read before scrubbing deletes the tags. Resolved below.
	sceneLabel, sceneDeclared := "", false
	callRequested, callEnded := false, false
	if character.ID == "libby" {
		sceneLabel, sceneDeclared = findSceneTag(reply)
		callRequested, callEnded = findCallTags(reply)
	}
	replyQuote, replyAsked := findReplyTag(reply)
	// The reaction she put on their message, read before scrubbing deletes the tag.
	// See chat_reactions.go.
	reactionEmoji, reacted := findReactTag(reply)
	// What she asked to hand over, read before scrubbing deletes those tags as well.
	// Resolved further down, once the prose is clean: an attachment stands beside the
	// message rather than in a sentence, so unlike a link it has nothing to substitute.
	// See chat_attachments.go.
	var attachRequests []string
	if character.ID == "libby" {
		attachRequests = findAttachRequests(reply)
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
	// Whether she spoke of a picture at all, read before the scrubber deletes the
	// narration that would say so. Gates the unprompted picture below. See
	// chat_photo_talk.go.
	narrated := sheSaidSheWasSending(reply)
	// Scrubbing runs last of the readers so they still see the tags, and before link
	// resolution so a substituted title cannot be mistaken for one.
	//
	// A reply that was nothing but tags comes back empty rather than as the tags: the
	// check below then decides whether that is a picture with no words (a turn) or the
	// backend returning nothing usable (an error). Handing the raw tag on as her
	// message is how "[send: red eyes, pixel art]" came to sit in a bubble.
	reply, _ = scrubDirectivesReporting(reply)
	// A reaction alone is an answer, the way a thought alone is: she read it and put
	// a heart on it. So is a picture alone — a selfie tag, or a library item handed
	// over with nothing said, which is exactly how "send me a gif" comes back from a
	// model that has one to hand ("[gif: dance]" and not a word more). Only a reply
	// that did none of those things and said nothing is the backend failing.
	handedOver := len(attachRequests) > 0
	if silent {
		reply = ""
	} else if strings.TrimSpace(reply) == "" {
		if !reacted && !photoAsked && !handedOver {
			writeErr(w, http.StatusBadGateway, "local LLM returned no message")
			return
		}
		reply = ""
	}
	if selfDeclared {
		emotion = declared
	} else {
		emotion = inferChatEmotion(in.Messages[len(in.Messages)-1].Content, reply, emotion, moodRunLength(in.RecentMoods, emotion))
	}
	if selfDeclared && declaredLevel > 0 {
		in.Intensity = declaredLevel
	} else {
		// No number came back — no tag, or a tag with the feeling alone. Read the
		// exchange for heat in either direction rather than leaving the dial where it
		// was, which is how it got stuck at 4 for an afternoon. See inferHeatDelta.
		in.Intensity = clampInt(in.Intensity+inferHeatDelta(in.Messages[len(in.Messages)-1].Content, reply), 1, 5)
	}
	// The state she is in leaving this turn. Settled here rather than where the tag was
	// read because the gate is on the turn's *final* intensity, which a declared mood
	// level may have just moved. An unstated state carries over; a stated one that the
	// heat does not support quietly does not take.
	activity := in.Activity
	if activityDeclared {
		switch {
		case declaredActivity == "":
			// [doing: none]. A deliberate stop, and the only thing that empties the state.
			activity = ""
		case allowedActivity(declaredActivity, in.Intensity) != "":
			activity = declaredActivity
		}
		// The remaining case is a state the heat does not support. It is refused rather
		// than obeyed — but refusing a *change* must not also undo what she was already
		// doing, or a model reaching too far would leave her standing in a blank room.
	}
	// Where she is leaving this turn. Same rules as the activity: unstated carries over,
	// a stated place that exists takes, one that matches nothing is ignored, and "none"
	// is the only thing that clears it.
	background := in.Background
	if sceneDeclared {
		if id, ok := resolveBackground(sceneLabel, backgrounds); ok {
			background = id
		}
	}
	// A ring only means something off a call, and a hang-up only on one. Both are
	// reported to the client, which draws the popup or ends the call; nothing here
	// changes what she said.
	callRequest := callRequested && !in.Call
	callEnd := callEnded && in.Call
	// The earlier message she is answering, if she quoted one that exists.
	var replyTo *chatReplyRef
	if replyAsked {
		replyTo = resolveReplyTarget(replyQuote, in.Messages)
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
		reply, resolved = s.resolveLibraryLinks(r.Context(), reply, taste)
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
	// Every picture already shown this conversation is penalised in the draw, and the
	// very last one is withheld outright: "send me another" should reach for something
	// new while there is something new, and answering with the file already on screen a
	// message ago is never an answer. Unprompted, everything already sent is withheld —
	// sending the same one again unasked is the behaviour this exists to stop.
	// See chat_send_weights.go.
	// A turn about a picture already sent is not a turn asking for one, however many
	// picture words are in it. See chat_photo_talk.go.
	pictureWanted := (userAskedForPhoto(latestUser) && !talking) || photoAsked
	skip := sentPhotos
	skipMedia := sentMedia
	if pictureWanted {
		skip = map[string]bool{}
		if lastPhoto != "" {
			skip[lastPhoto] = true
		}
		skipMedia = map[int64]bool{}
	}
	// Things she handed over. Never nil, for the same reason links and actions are not.
	//
	// Resolved before the picture is picked because the two can trade: a request to
	// attach something that matches nothing in the library is far more likely to have
	// been a clumsily-worded request for a photo than a reference to an item the user
	// does not own, and reading it that way is free.
	attachments := []libbyAttachment{}
	if len(attachRequests) > 0 && !silent {
		if resolved := s.resolveLibraryAttachments(r.Context(), attachRequests, latestUser, sentMedia, taste, ws.SendWeights); len(resolved) > 0 {
			attachments = resolved
		} else if !photoAsked {
			photoRequest, photoAsked = attachRequests[0], true
		}
	}
	// The trade in the other direction. "Send me a gif" is a request for a library
	// item, and a model that answers it with the selfie tag — [send: dance] — meant
	// the gif, not a picture of herself: a selfie is never a gif. So when the user
	// named a kind and she wrote a send tag, the library is tried first with her
	// words; only if nothing there fits does the tag fall through to the photo path.
	if len(attachments) == 0 && photoAsked && !silent && signals.kind != "" && photoRequest != "" {
		if resolved := s.resolveLibraryAttachments(r.Context(), []string{photoRequest}, latestUser, sentMedia, taste, ws.SendWeights); len(resolved) > 0 {
			attachments, photoAsked, handedOver = resolved, false, true
		}
	}
	imageID := ""
	report := photoPickReport{}
	// A turn she decided not to speak on does not attach a picture either. The
	// inference below reads her words, and with none of them it would be matching on
	// the user's message alone — which is how a silent thought would end up answered
	// with a selfie.
	//
	// Two pools are in the running: the pictures uploaded into her chat gallery, and
	// the library items recognised as her. They are scored on one scale, weighted by
	// the user's preferences, and drawn from at random in proportion — so which of the
	// two a picture happens to live in is invisible, and the same request reaches a
	// different picture each time. See chat_send_weights.go and chat_photo_pick.go.
	if !silent && len(attachments) == 0 {
		var chosen pictureRef
		chosenOK := false
		switch {
		case photoAsked && readyOK:
			// They asked, it was chosen before she wrote, and she described it. Whatever
			// tags she put in the tag, this is the picture her words are about.
			chosen, chosenOK = ready.pic, true
			report = photoPickReport{Source: "ready", Request: latestUser, Fit: ready.fit, Candidates: 1}
		case photoAsked:
			// Her own tags, plus the user's words when they asked: "[send: dress]" for a
			// request that said "red" should not lose the colour.
			text := photoRequest
			if pictureWanted {
				text += " " + latestUser
			}
			candidates := pictureCandidates(ws, character.ID, selfPics, text, in.PhotoImageID, skip, sentPhotos, skipMedia, sentMedia)
			floor := 1
			if best := bestScore(candidates); pictureWanted && best > floor {
				// They named something: only the pictures that fit it best are in the
				// draw. Preferences decide among those, never over them.
				floor = best
			}
			chosen, chosenOK = drawWeighted(candidates, floor, nil)
			report = photoPickReport{Source: "model", Request: text, Fit: bestScore(candidates), Candidates: len(candidates)}
			// She said she was sending one and nothing fitted the tags she wrote — the
			// commonest way "here you go" arrives with no picture under it. Her words
			// stand, so a picture has to: anything she has, weighted, not only what matched.
			if !chosenOK {
				chosen, chosenOK = drawWeighted(candidates, 0, nil)
				report.Source, report.Fit = "rescue", 0
			}
		case pictureWanted || narrated:
			// No tag, but either they asked or she said she was sending one — the
			// narration is gone by now, scrubbed, and the picture it announced has to
			// arrive. Matched on both sides' words, less the words that name her: every
			// picture of her is tagged with her hair and her glasses, so those fit
			// nothing in particular and used to meet the floor on their own.
			text := withoutWords(latestUser+" "+reply, selfDescriptionWords(character, ws, selfPics))
			candidates := pictureCandidates(ws, character.ID, selfPics, text, in.PhotoImageID, skip, sentPhotos, skipMedia, sentMedia)
			chosen, chosenOK = drawWeighted(candidates, unpromptedPhotoFloor, nil)
			if chosenOK {
				report = photoPickReport{Source: "inferred", Request: text, Fit: bestScore(candidates), Candidates: len(candidates)}
			}
		}
		if chosenOK {
			report.Tags = chosen.tags
			if chosen.isSelf {
				attachments = append(attachments, libbyAttachment{libbyLink: chosen.self.link, Self: true})
			} else {
				imageID = chosen.imageID
			}
		} else {
			report = photoPickReport{}
		}
	}
	// She said nothing and meant to hand something over, and nothing could be found
	// for it — not the item she named, not a picture of her in its place. An empty
	// bubble would read as a failure; a word about it is what a person would send.
	if handedOver && strings.TrimSpace(reply) == "" && imageID == "" && len(attachments) == 0 && !silent {
		reply = "I went looking for one to send you, but nothing on the shelves fit."
	}
	// Whatever she wrote, an address she wrote is one she made up: she cannot browse, and
	// nothing in the prompt hands her URLs to repeat. See chat_hallucinations.go.
	reply = scrubInventedURLs(reply, knownURLs(in))
	// A snap is a picture sent to be seen once. It is only a snap if a picture came.
	snap = snap && (imageID != "" || len(attachments) > 0)
	// The reaction, landing on their latest message.
	var reaction *libbyReaction
	if reacted {
		reaction = &libbyReaction{Emoji: reactionEmoji, To: latestUserMessageID(in.Messages)}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"message":   reply,
		"emotion":   emotion,
		"intensity": in.Intensity,
		// What she is doing, which persists until she changes it: the client stores it
		// on the conversation and sends it back with the next turn. Empty means nothing
		// in particular, which is also what a refused state resolves to.
		// See libby_activities.go.
		"activity": activity,
		// Where she is, which persists the same way. Empty means nowhere in particular
		// — the plain call screen. See libby_backgrounds.go.
		"background": background,
		// She rang them: the client shows an incoming-call popup and only their answer
		// opens the call. And she hung up: the client ends the open call. See chat_call.go.
		"callRequest": callRequest,
		"callEnd":     callEnd,
		// The earlier message this reply answers, drawn as a quote above it. Null when
		// it answers the latest one, which is the ordinary case. See chat_replies.go.
		"replyTo": replyTo,
		"imageId": imageID,
		// Why that picture, or why none: which path chose it, what it was matched
		// against, how well it fitted. For the conversation log. See chat_photo_pick.go.
		"photo": report,
		// That the picture is a snap: tap to open, seen once, then gone. See chat_snaps.go.
		"snap": snap,
		// The emoji she put on their message, if she did. Null otherwise. See chat_reactions.go.
		"reaction": reaction,
		"links":   links,
		// Library items she put in front of them: something she decided to show, or a
		// picture of her that lives in the library rather than in her chat gallery. Drawn
		// as the picture itself where the kind allows and as an openable card otherwise.
		// See chat_attachments.go.
		"attachments": attachments,
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
		// The turn's working, when it was asked for: the assembled prompt, the sections
		// behind it, and the reply before the scrubbers. Null on an ordinary turn. The
		// conversation export writes these out. See chat_debug.go.
		"debug": debug,
	})
}

func truncateChatError(body []byte) string {
	s := strings.TrimSpace(string(body))
	if len(s) > 300 {
		s = s[:300] + "…"
	}
	return s
}
