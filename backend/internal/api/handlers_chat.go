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
	// Wearing is what she has on when it is not her own clothes: "nothing", or what she
	// changed into. Client-owned like Background and for the same reason. Empty is her
	// own clothes — the worn outfit, or the bundled wardrobe's tier. See libby_wearing.go.
	Wearing string `json:"wearing,omitempty"`
	// SharedMediaIDs are the library items the user attached to their latest message —
	// by reference, unlike a shared photo, so a video or a game can be shown to her
	// without a copy. See chat_shared.go.
	SharedMediaIDs []int64 `json:"sharedMediaIds,omitempty"`
	// CanGenerate says this client will make a picture itself when the reply asks for one
	// (the `generate` field of the response), and fall back to a saved one if that fails.
	// A client that does not say so gets a saved picture as before. See freshPicture.
	CanGenerate bool `json:"canGenerate,omitempty"`
	// Summary is what the older part of this conversation was compressed into, which the
	// client keeps on the conversation and sends with every turn. See chat_compress.go.
	Summary string `json:"summary,omitempty"`
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
//
// "one of you in …" and "how about you in …" are requests too: "how about one of you in
// a cat maid outfit?" names no picture word, and was answered with a description of a
// picture that was never sent.
var photoRequestWords = regexp.MustCompile(`(?i)\b(pic|pics|picture|pictures|photo|photos|selfie|selfies|nude|nudes|send me|show me|let me see|see you|see it again|another one|one of (?:you|u|yourself)|(?:how|what) about (?:you|u|one) (?:in|wearing|with))\b`)

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
		"\nTo send one, call send_saved_photo with tags from the picture you mean — for example \"" + example + "\". " +
		"A selfie is a deliberate thing now and then, never decoration: most replies have none, and never more than one. " +
		"Send one when they ask to see you, or when you would genuinely stop and take one for them. Never describe, promise or refer to a picture you have not actually sent.\n"
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
func (s *Server) wardrobeDirective(character chatCharacter, intensity int, outfitID, wearing string) string {
	if character.ID != "libby" {
		return ""
	}
	// Clothes she changed into earlier outrank the wardrobe until she changes back.
	if wearing != "" {
		return wearingDirective(wearing) + wearTagDirective
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
				"You know how you look in it; do not describe yourself in anything else.", name) + wearTagDirective
		}
	}
	worn, known := libbyWardrobe[intensity]
	if !known {
		return ""
	}
	return "\nRight now you are wearing " + worn + ". " +
		"This is what you actually have on, and it is what the user can see. " +
		"Do not describe yourself in anything else, and do not announce it — let it show only when it would come up." + wearTagDirective
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
		return "", &chatBackendStatusError{Status: resp.StatusCode,
			msg: fmt.Sprintf("local LLM returned %s: %s", resp.Status, truncateChatError(body))}
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

// chatBackendStatusError is the backend answering with an error status, as opposed to
// not answering at all. The distinction is what lets a turn that sent pictures tell "this
// model will not take images" from "the backend is down", and retry only the first.
type chatBackendStatusError struct {
	Status int
	msg    string
}

func (e *chatBackendStatusError) Error() string { return e.msg }

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
	detail := probe.Detail
	lent := s.card.parkedModel()
	if lent != "" && !probe.Ready {
		detail = cardLentNote
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"cardLent":        lent,
		"enabled":         probe.Ready,
		"configured":      cur.ChatURL != "",
		"model":           model,
		"message":         detail,
		"modes":           []string{"sweet", "playful", "bold", "roleplay", "horny"},
		"advancedOptions": probe.Ready,
		"modelBackend":    cur.ChatURL != "",
		"modelManagement": controllable,
		"contextLimit":    contextLimit,
	})
}

func truncateChatError(body []byte) string {
	s := strings.TrimSpace(string(body))
	if len(s) > 300 {
		s = s[:300] + "…"
	}
	return s
}
