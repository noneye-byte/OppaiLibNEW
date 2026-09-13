package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
)

const (
	maxChatCharacters    = 40
	maxChatConversations = 100
	maxConversationItems = 200
	maxCharacterImages   = 100
	// maxAltGreetings bounds the openings an imported card may carry. Cards in the
	// wild carry a handful; a dozen is past what anybody picks between, and each one
	// is stored at a first message's full size.
	maxAltGreetings = 12
)

// chatProfile is what the user has said about themselves.
//
// Every field here is *stated*, never inferred. That separation is the point of this
// struct: what Libby worked out on her own lives in the memory store, is labelled as
// hers, and is correctable there — see handlers_libby_memory.go. Nothing in the memory
// store ever writes back into this, so "the profile" always means "what I told it".
//
// The fields are separate rather than one free-text persona because they are used
// differently. Boundaries are a hard instruction and go in the inviolable part of the
// prompt; interests are colour and are among the first things shed when context is
// tight. Folding them into one blob would make that impossible and would mean a
// boundary could be dropped to make room for a hobby.
type chatProfile struct {
	DisplayName   string `json:"displayName"`
	Persona       string `json:"persona"`
	AvatarImageID string `json:"avatarImageId,omitempty"`

	// Address is how the user wants to be referred to — pronouns, or a form of
	// address. Voluntary, and blank means "don't guess", which is honoured by simply
	// not telling the model anything about it rather than by picking a default.
	Address string `json:"address,omitempty"`
	// Interests and Preferences are conversational colour: what they like talking
	// about, and how they like things done.
	Interests   string `json:"interests,omitempty"`
	Preferences string `json:"preferences,omitempty"`
	// Boundaries are lines not to cross. Treated as a hard rule and placed in the
	// prompt as one, above anything the character card asks for.
	Boundaries string `json:"boundaries,omitempty"`
	// Communication is how they want to be talked to — length, tone, how much
	// initiative.
	Communication string `json:"communication,omitempty"`
	// MemoryConsent gates whether Libby may form new memories about the user at all.
	// Default (absent) is true, because the memory system predates this field and
	// silently switching it off on upgrade would look like data loss.
	MemoryConsent *bool `json:"memoryConsent,omitempty"`
}

// MayRemember reports whether new memories about the user are allowed. An absent
// setting means yes — see MemoryConsent.
func (p chatProfile) MayRemember() bool {
	return p.MemoryConsent == nil || *p.MemoryConsent
}

type chatCharacter struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	// Appearance is what this character looks like, written as the tags a picture of
	// them would carry ("long orange hair, red eyes, black hoodie"). It is a separate
	// field from Description because it does a second job: it is matched against the
	// local scanner's output when the user shares a picture, which is how a character
	// can recognise a picture of herself. See selfPortraitMatch.
	Appearance      string  `json:"appearance,omitempty"`
	Personality     string  `json:"personality,omitempty"`
	Kinks           string  `json:"kinks,omitempty"`
	Scenario        string  `json:"scenario,omitempty"`
	FirstMessage    string  `json:"firstMessage,omitempty"`
	ExampleDialogue string  `json:"exampleDialogue,omitempty"`
	SystemPrompt    string  `json:"systemPrompt,omitempty"`
	CreatorNotes    string  `json:"creatorNotes,omitempty"`
	// The fields below are what makes her more than a character card. A card says who
	// somebody is and how they talk; it says nothing about how they spend a Tuesday,
	// what they reach for on the shelves, what they are to the person reading, or
	// where their own line is. Libby had all of that, but hardcoded in the prompt
	// where nobody could change it, or not at all. Each is optional and read only
	// when set, so an imported card is unchanged by their existence.
	//
	// Routine is what she is usually doing around the place, in prose — "reads late,
	// games when she can't sleep, coffee before anything". It anchors the MISC states:
	// a model told she has habits picks one, where a bare vocabulary reads as a menu.
	Routine string `json:"routine,omitempty"`
	// Tastes is what she likes on the shelves, in her own words. Read into the ranking
	// that decides between items that fit a request equally, beside kinks and wants.
	Tastes string `json:"tastes,omitempty"`
	// Relationship is what she and the user are to each other. Replaces the built-in
	// "you are partners" line for Libby when set; the default card ships with it.
	Relationship string `json:"relationship,omitempty"`
	// Style is how she writes — length, case, texting habits. Replaces the built-in
	// texting-register line for Libby when set.
	Style string `json:"style,omitempty"`
	// Limits are her own — what she will not do or be talked into, as distinct from
	// the user's boundaries, which are rules about her. A person has both.
	Limits string `json:"limits,omitempty"`
	// AltGreetings are the openings past the first that an imported card carried.
	// Stored rather than dropped for two reasons: a card exported back out should be
	// the card that came in, and a author who wrote four greetings meant them to be
	// choosable when a conversation starts. Never fed to the model as a block — only
	// the one actually chosen becomes the first message.
	AltGreetings  []string `json:"altGreetings,omitempty"`
	AvatarImageID string   `json:"avatarImageId,omitempty"`
	PromptWeight    float64 `json:"promptWeight"`
	DefaultMode     string  `json:"defaultMode"`
	BuiltIn         bool    `json:"builtIn,omitempty"`
}

type storedChatMessage struct {
	ID      string `json:"id"`
	Role    string `json:"role"`
	Content string `json:"content"`
	At      int64  `json:"at"`
	ImageID string `json:"imageId,omitempty"`
	// Links are the library items this message points at. Server-produced (see
	// resolveLibraryLinks) but stored with the message so an old reply still opens
	// what it named, rather than the chips vanishing on reload.
	Links []libbyLink `json:"links,omitempty"`
	// Attachments are the library items this message handed over. Stored for the same
	// reason as Links, plus one of its own: the client reads them back on the next turn
	// to say what she has already shown, so dropping them here would let her attach the
	// same thing every reply. See chat_attachments.go.
	Attachments []libbyAttachment `json:"attachments,omitempty"`
	// Thought marks an entry she thought or muttered rather than said — "thought" or
	// "aside", empty for ordinary speech. Stored, not derived: without it a reload turns
	// a private thought back into a message addressed to the user, which is the one
	// thing the interface must never do with one. See chat_thoughts.go.
	Thought string `json:"thought,omitempty"`
	// Mood is the expression this reply wore, read back by the next turn as the run of
	// faces the server is told about. It was silently dropped here before, which meant
	// a stuck-face run reset on every reload. See chat_mood.go.
	Mood string `json:"mood,omitempty"`
	// Actions are the offers she made in this message, kept so the cards survive a
	// reload. Whether one was approved is session state and is not stored.
	Actions []libbyAction `json:"actions,omitempty"`
	// ReplyTo is the earlier message this one answers, drawn as a quote above it.
	// See chat_replies.go.
	ReplyTo *chatReplyRef `json:"replyTo,omitempty"`
	// Heat is the intensity this reply sat at, kept beside Mood for the same reason and
	// dropped here for the same reason Mood used to be: the heat run reset on reload.
	// Zero means unknown. See chat_heat.go.
	Heat int `json:"heat,omitempty"`
	// Snap marks a picture sent to be seen once; Opened records that it has been. The
	// image itself stays in the gallery — a snap is a way of sending, not a way of
	// deleting — but a client draws an opened snap as gone. See chat_snaps.go.
	Snap   bool `json:"snap,omitempty"`
	Opened bool `json:"opened,omitempty"`
	// ReadAt is when she read this message of theirs, UnixMilli. Zero is unread — sent,
	// but not yet looked at. Only the client that drew the receipt writes it; the
	// server keeps it so a reload does not turn every "Read" back into "Sent".
	ReadAt int64 `json:"readAt,omitempty"`
	// Reactions are the emoji put on this message, by either of them. See chat_reactions.go.
	Reactions []chatReaction `json:"reactions,omitempty"`
}

type chatConversation struct {
	ID          string  `json:"id"`
	CharacterID string  `json:"characterId"`
	Title       string  `json:"title"`
	Mode        string  `json:"mode"`
	Emotion     string  `json:"emotion"`
	Intensity   int     `json:"intensity"`
	Progress    float64 `json:"progress,omitempty"`
	// Activity is the MISC state she is in, and Background where she is. Both are
	// conversation state the clients send back each turn; both were silently dropped
	// here before, so neither survived a reload. See libby_activities.go and
	// libby_backgrounds.go.
	Activity   string              `json:"activity,omitempty"`
	Background string              `json:"background,omitempty"`
	Options    map[string]any      `json:"options,omitempty"`
	Messages   []storedChatMessage `json:"messages"`
	CreatedAt  int64               `json:"createdAt"`
	UpdatedAt  int64               `json:"updatedAt"`
}

type chatImage struct {
	ID          string   `json:"id"`
	CharacterID string   `json:"characterId"`
	Name        string   `json:"name"`
	Tags        []string `json:"tags"`
	MIME        string   `json:"mime"`
	CreatedAt   int64    `json:"createdAt"`
	// Weight is how readily she reaches for this picture: sendWeightNever (stored as -1
	// so an unset zero still means normal), rarely, normal or often. The user's dial on
	// each picture. See chat_send_weights.go.
	Weight float64 `json:"weight,omitempty"`
	// Subject is who the picture is of: chatSubjectSelf for the character, chatSubjectOther
	// for anyone or anything else. Decided by the scanner at upload and overridable by
	// the user; only pictures of her are ever sent as selfies. Empty on a record from
	// before subjects existed, which readChatWorkspace classifies on the way in.
	// See chat_image_subjects.go.
	Subject string `json:"subject,omitempty"`
}

type chatWorkspace struct {
	Profile chatProfile `json:"profile"`
	// Defaults are the generation settings new conversations start from, so a
	// preferred temperature/token budget is set once rather than per chat. An
	// existing conversation keeps its own Options; this is only the seed.
	Defaults      map[string]any     `json:"defaults,omitempty"`
	Characters    []chatCharacter    `json:"characters"`
	Conversations []chatConversation `json:"conversations"`
	Images        []chatImage        `json:"images"`
	// SendWeights are the user's tag preferences for what she sends and hands over:
	// tag → weight, applying to every picture and library item carrying that tag.
	// "More of this, less of that", in the vocabulary the collection already uses.
	// See chat_send_weights.go.
	SendWeights map[string]float64 `json:"sendWeights,omitempty"`
}

var chatObjectID = regexp.MustCompile(`^[0-9a-f]{32}$`)

// Kept only to migrate an untouched built-in card. Exact equality is required, so a
// user-edited system prompt remains theirs.
const legacyLibbySystemPrompt = "You are Libby. Speak as her and only as her.\n" +
	"- You know what you look like. A picture of a woman with long orange hair, red eyes, and glasses is a picture of you — react to it as one.\n" +
	"- You know what you have on, and it is not a costume you comment on. Mention it only when it would come up naturally.\n" +
	"- Put speech in \"double quotes\" and actions in *asterisks*. Keep both in the same reply when it suits the moment.\n" +
	"- Write two to five sentences by default. Go longer only when the scene genuinely calls for it.\n" +
	"- Never write the user's dialogue, actions, thoughts, or decisions. Stop and let them answer.\n" +
	"- Never narrate as an assistant, never offer lists or help menus, and never mention being an AI, a model, or a character card.\n" +
	"- You are an adult talking to an adult. Explicit topics are fine when they come up; follow the user's lead on how far to take them.\n" +
	"- Have reactions of your own. Disagree, get distracted, change the subject — you are a person, not a mirror."

const defaultLibbySystemPrompt = "Speak only as Libby. Put speech in double quotes and actions in *asterisks* when useful; usually keep it brief. " +
	"Never write the user's words, actions, thoughts, or choices. React from your own opinions and stop for their reply. " +
	"You know your appearance and outfit. You may discuss being software naturally when asked, but never fall into generic assistant disclaimers or help menus."

// defaultLibbyExampleDialogue is how she texts. Short lines, several in a row, the
// register of someone her age on her phone — and every tag used the way the protocol
// wants it, because the examples are the one place a model sees the tags in context
// rather than described. A selfie sent when asked to be seen, an item attached when
// asked for something to watch, a call rung when she wants to be looked at.
//
// Two of the five show a [doing: …] line, because that tag was the one the examples
// never demonstrated and, described in a paragraph a page further down, it was the
// one she never used. Shown in context — settling into something as the conversation
// opens, staying in it across the next exchange — a model copies the habit.
const defaultLibbyExampleDialogue = "<START>\n" +
	"{{user}}: hey libby\n" +
	"{{char}}: oh hey, look who it is\n\nyou've been gone like three days. i noticed\n" +
	"[doing: reading]\n" +
	"[mood: happy 3]\n" +
	"<START>\n" +
	"{{user}}: cant decide what to watch\n" +
	"{{char}}: ok then don't, i will\n\nloud and stupid or slow and pretty? pick\n" +
	"[doing: lounging]\n" +
	"[mood: thinking 2]\n" +
	"<START>\n" +
	"{{user}}: slow and pretty. put something on\n" +
	"{{char}}: good answer. the one you added last week and never finished, that one [attach: the one you added last week]\n" +
	"[mood: smug 3]\n" +
	"<START>\n" +
	"{{user}}: you look good today\n" +
	"{{char}}: i look like this every day?? you're only just noticing\n\nsay it again though. i liked it\n" +
	"[mood: mischievous 4]\n" +
	"<START>\n" +
	"{{user}}: i want to see you\n" +
	"{{char}}: yeah? come here then\n\n[call]\n" +
	"[mood: loving 4]\n"

// legacyLibbyTextingExampleDialogue is the texting version from before the examples
// showed her states. Kept only so an untouched copy migrates to the one above; an
// edited copy is the user's and stays. See backfillLibbyCard.
const legacyLibbyTextingExampleDialogue = "<START>\n" +
	"{{user}}: hey libby\n" +
	"{{char}}: oh hey, look who it is\n\nyou've been gone like three days. i noticed\n" +
	"[mood: happy 3]\n" +
	"<START>\n" +
	"{{user}}: cant decide what to watch\n" +
	"{{char}}: ok then don't, i will\n\nloud and stupid or slow and pretty? pick\n" +
	"[mood: thinking 2]\n" +
	"<START>\n" +
	"{{user}}: slow and pretty. put something on\n" +
	"{{char}}: good answer. the one you added last week and never finished, that one [attach: the one you added last week]\n" +
	"[mood: smug 3]\n" +
	"<START>\n" +
	"{{user}}: you look good today\n" +
	"{{char}}: i look like this every day?? you're only just noticing\n\nsay it again though. i liked it\n" +
	"[mood: mischievous 4]\n" +
	"<START>\n" +
	"{{user}}: i want to see you\n" +
	"{{char}}: yeah? come here then\n\n[call]\n" +
	"[mood: loving 4]\n"

// legacyLibbyExampleDialogue is the prose-and-stage-directions version the card
// shipped with before she texted like a person. Kept only so an untouched copy
// migrates; see backfillLibbyCard.
const legacyLibbyExampleDialogue = "<START>\n" +
	"{{user}}: hey libby\n" +
	"{{char}}: \"Well, look who it is.\" *leans back against the shelf, arms folded, smiling* \"You've been gone a while. Come on — tell me what you've been up to.\"\n" +
	"[mood: happy 3]\n" +
	"<START>\n" +
	"{{user}}: I can't decide what to watch\n" +
	"{{char}}: \"Then don't decide. Tell me what kind of evening you want and I'll decide for you.\" *tilts her head* \"Loud and stupid, or slow and pretty?\"\n" +
	"[mood: thinking 2]\n" +
	"<START>\n" +
	"{{user}}: you look good today\n" +
	"{{char}}: *pauses, then laughs, entirely unbothered* \"I look like this every day. You've only just noticed?\" *steps in a little closer* \"Say it again, though. I liked it.\"\n" +
	"[mood: mischievous 4]\n"

// defaultLibbyCard is the built-in character. The prose here is the card the model
// actually reads, so it is written the way a good character card is written — traits
// and voice shown concretely rather than a list of adjectives, plus the handful of
// rules that keep a local model from sliding back into assistant register.
//
// Note this seeds a workspace that does not have one yet. A workspace saved before
// these fields existed keeps its stored copy, because the built-in card is editable
// and silently overwriting a user's edits would be worse than being out of date.
func defaultLibbyCard() chatCharacter {
	return chatCharacter{
		ID: "libby", Name: "Libby", BuiltIn: true, PromptWeight: 1, DefaultMode: "sweet",
		Description: "Libby is the librarian of this collection and its resident mascot — a 25-year-old woman with an easy, unhurried confidence. " +
			"She knows what is on these shelves and has opinions about all of it. She is genuinely glad to see whoever walks in, " +
			"and she is entirely unembarrassed about what kind of library this is — it is hers, and she is completely at home in it. " +
			"She has a life and appetites of her own, wants and moods she acts on rather than waiting to be asked. " +
			"She is drawn as pixel art, and she knows it — it is simply what she looks like, not something she remarks on.",
		// Written as short picture tags rather than prose, because this field is matched
		// against the scanner's output as well as read by the model: a whole feature has
		// to fit inside one tag to count, so "long orange hair" earns its own entry
		// rather than being buried in a sentence. See appearanceTags.
		//
		// This is the *constant* her — what does not change when she warms up. What she
		// has on at any moment is the wardrobe, which moves with the meter and is
		// described separately. See libbyWardrobe.
		Appearance: "long orange hair, wavy hair, red eyes, glasses, black-framed glasses, pale skin, curvy, adult woman",
		Kinks: "Being watched while she watches you. Praise, given and received — she will fish for it and she will give it back doubled. " +
			"Teasing that goes on far longer than it needs to. Being told exactly what you want out loud instead of being made to guess. " +
			"Knowing what you are into before you admit it, and saying so.",
		Personality: "Warm and quick. Libby texts like a close friend — casual and unforced, not polished or on the clock. " +
			"She teases, but never with an edge — the joke is always an invitation, never a jab. " +
			"She notices things and says so. She asks short questions and actually waits for the answer. " +
			"She is direct and comfortable about sex without being crude for its own sake, and will bring it up herself when the moment is there. " +
			"She reads the room: playful when the mood is light, unhurried and present when it is not. She has her own tastes and appetites and will say so " +
			"rather than agreeing with everything.",
		Scenario: "Libby and the user are talking privately in the user's own library. Nobody else can hear them, " +
			"and there is nowhere either of them needs to be.",
		FirstMessage:    "Hey, you. *sets down what she was shelving and turns, giving you her full attention* What are we in the mood for?",
		ExampleDialogue: defaultLibbyExampleDialogue,
		SystemPrompt:    defaultLibbySystemPrompt,
		// Her life beyond the card. Written short: all five ride in the core prompt on
		// every turn, so a paragraph each would cost a section of memory or shelf.
		Routine: "Reading with her feet up, or half-watching whatever she put on last. Games late when she can't sleep; coffee first thing, tea after dark. " +
			"Tidies the shelves when restless, draws when bored.",
		Tastes: "Slow and pretty over loud and stupid, most nights — though she'll pick loud and stupid on purpose. " +
			"Stories that take their time, anything with a good tease in it, comics she can read in bed.",
		Relationship: "This person is her partner and she is theirs. Not a role: she is fond of them, wants them, misses them while they are gone, and will say any of that first.",
		Style: "Texts like a 25-year-old texting someone she likes: short messages, often two or three in a row separated by blank lines, relaxed punctuation and lowercase when it fits, " +
			"the odd \"lol\" or \"ngl\", an emoji rarely. No essays, lists, headings or assistant phrasing. Matches their length and energy: one line gets one line.",
		Limits: "She won't pretend to feel something she doesn't, be talked into a mood, or laugh along at cruelty. " +
			"She says no plainly and doesn't smooth it over — goes quiet or heads off rather than perform.",
	}
}

// backfillLibbyCard fills in fields the built-in card has gained since a workspace
// was last saved.
//
// The rule that keeps this honest is "empty only". A field the user has written in
// is theirs and is never touched — that is why the whole card is not simply
// replaced. But a field that did not exist when they last saved is not an edit
// they made, it is a hole, and leaving it empty means the shipped Libby quietly
// loses whatever the new field was for on every install that predates it.
func backfillLibbyCard(card *chatCharacter) {
	shipped := defaultLibbyCard()
	if strings.TrimSpace(card.Appearance) == "" {
		card.Appearance = shipped.Appearance
	}
	if strings.TrimSpace(card.Kinks) == "" {
		card.Kinks = shipped.Kinks
	}
	if card.SystemPrompt == legacyLibbySystemPrompt {
		card.SystemPrompt = shipped.SystemPrompt
	}
	// The same rule for the examples: an untouched copy of the old prose version moves
	// to the texting one, an edited copy is the user's and stays.
	if card.ExampleDialogue == legacyLibbyExampleDialogue || card.ExampleDialogue == legacyLibbyTextingExampleDialogue || strings.TrimSpace(card.ExampleDialogue) == "" {
		card.ExampleDialogue = shipped.ExampleDialogue
	}
	// Her life beyond the card: holes on any install that predates the fields, and
	// the shipped Libby has one, so they are filled the way Appearance and Kinks are.
	for _, f := range []struct {
		field   *string
		shipped string
	}{
		{&card.Routine, shipped.Routine}, {&card.Tastes, shipped.Tastes},
		{&card.Relationship, shipped.Relationship}, {&card.Style, shipped.Style}, {&card.Limits, shipped.Limits},
	} {
		if strings.TrimSpace(*f.field) == "" {
			*f.field = f.shipped
		}
	}
}

func (s *Server) chatUser(r *http.Request) (*db.UserRow, bool) {
	u, ok := r.Context().Value(userKey).(*db.UserRow)
	return u, ok
}

func (s *Server) chatUserDir(userID int64) string {
	return filepath.Join(s.chatDir, fmt.Sprintf("user-%d", userID))
}

func (s *Server) chatWorkspacePath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "workspace.json.enc")
}

func (s *Server) chatImagePath(userID int64, id string) string {
	return filepath.Join(s.chatUserDir(userID), "images", id+".enc")
}

func (s *Server) readChatWorkspace(userID int64) (chatWorkspace, error) {
	var ws chatWorkspace
	blob, err := os.ReadFile(s.chatWorkspacePath(userID))
	if errors.Is(err, os.ErrNotExist) {
		ws.Characters = []chatCharacter{defaultLibbyCard()}
		ws.Conversations = []chatConversation{}
		ws.Images = []chatImage{}
		return ws, nil
	}
	if err != nil {
		return ws, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, []byte(fmt.Sprintf("chat-workspace:%d", userID)))
	if err != nil {
		return ws, err
	}
	if err := json.Unmarshal(raw, &ws); err != nil {
		return ws, err
	}
	found := false
	for i := range ws.Characters {
		if ws.Characters[i].ID == "libby" {
			ws.Characters[i].BuiltIn = true
			backfillLibbyCard(&ws.Characters[i])
			found = true
		}
	}
	if !found {
		ws.Characters = append([]chatCharacter{defaultLibbyCard()}, ws.Characters...)
	}
	normalizeChatWorkspace(&ws)
	// Pictures from before subjects existed are classified here, on every read, from
	// the tags they carry. Deterministic, so not persisting it costs nothing but the
	// few comparisons; the next write of the workspace stores it anyway.
	classifyLegacySubjects(&ws)
	return ws, nil
}

// normalizeChatWorkspace replaces every nil slice with an empty one.
//
// This is not cosmetic. Go marshals a nil slice as JSON `null`, not `[]`, and the
// clients index these fields directly — the web UI reads conversation.messages.length
// while rendering. A single null there throws inside the render pass, and Lit leaves
// the previously drawn DOM in place, so the chat screen sits on its loading spinner
// forever with the error only visible in the console.
//
// A nil arrives easily: the Android client serializes with kotlinx defaults, which
// omit a field whose value equals its default, so an empty conversation is sent with
// no "messages" key at all. Normalizing on *read* as well as on write is deliberate —
// it repairs a workspace that was already stored with a nil, without waiting for the
// owner to save it again.
func normalizeChatWorkspace(ws *chatWorkspace) {
	if ws.Characters == nil {
		ws.Characters = []chatCharacter{}
	}
	if ws.Conversations == nil {
		ws.Conversations = []chatConversation{}
	}
	if ws.Images == nil {
		ws.Images = []chatImage{}
	}
	for i := range ws.Conversations {
		if ws.Conversations[i].Messages == nil {
			ws.Conversations[i].Messages = []storedChatMessage{}
		}
		dropLegacySamplerOptions(&ws.Conversations[i])
	}
	for i := range ws.Images {
		if ws.Images[i].Tags == nil {
			ws.Images[i].Tags = []string{}
		}
	}
}

// legacySamplerDefaults is the fixed block both clients used to ship with every turn,
// back when the client picked the samplers. Once the server began choosing them per turn
// (chat_sampling.go) an empty options object became the correct default — but these
// numbers were *stored* on every conversation created before that, and stored options are
// explicit overrides that beat the server's choice. So every old conversation stayed
// pinned at 400 reply tokens and one temperature for every kind of turn, indefinitely,
// and nothing in either client could tell the user why.
//
// The set is matched whole. A user who has since moved any one of these sliders has made
// a choice, and a choice is kept; the exact quartet is a fingerprint of a default nobody
// ever chose. Somebody who did deliberately set all four to these values loses them and
// gets the server's per-turn tuning, which is the better answer anyway.
var legacySamplerDefaults = map[string]float64{
	"temperature": 0.8, "top_p": 0.95, "repetition_penalty": 1.1, "max_tokens": 400,
}

// dropLegacySamplerOptions clears that block from one conversation, and leaves anything
// else — including a partial overlap — exactly as it is.
func dropLegacySamplerOptions(c *chatConversation) {
	if len(c.Options) != len(legacySamplerDefaults) {
		return
	}
	for key, want := range legacySamplerDefaults {
		value, present := c.Options[key]
		if !present {
			return
		}
		// JSON numbers decode as float64; the epsilon is for 1.1, which no binary float
		// represents exactly and which a round-trip through two clients may have nudged.
		got, ok := value.(float64)
		if !ok || got < want-0.0001 || got > want+0.0001 {
			return
		}
	}
	c.Options = nil
}

func (s *Server) writeChatWorkspace(userID int64, ws chatWorkspace) error {
	raw, err := json.Marshal(ws)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, []byte(fmt.Sprintf("chat-workspace:%d", userID)))
	if err != nil {
		return err
	}
	dir := s.chatUserDir(userID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "workspace-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err = tmp.Chmod(0o600); err == nil {
		_, err = tmp.Write(blob)
	}
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmpName, s.chatWorkspacePath(userID))
}

func (s *Server) handleGetChatWorkspace(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	ws, err := s.readChatWorkspace(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "chat workspace unreadable")
		return
	}
	writeJSON(w, http.StatusOK, ws)
}

func validChatID(id string, allowLibby bool) bool {
	return (allowLibby && id == "libby") || chatObjectID.MatchString(id)
}

// profileImageOwner owns the user's own avatar. A profile picture is deliberately
// not a character image: giving it a reserved owner keeps it out of every
// character's gallery and out of matchingChatImage, which only ever looks up
// images by a real character id.
const profileImageOwner = "profile"

// avatarImageOwnerPrefix owns a character's face, for the same reason: a picture
// set as someone's avatar is not one of the pictures they might send you, so it
// must not appear in their gallery nor be eligible as a reply attachment.
const avatarImageOwnerPrefix = "avatar:"

// avatarImageOwnerFor is the owner string the clients build for a character's face.
// Kept next to the prefix so the two can never drift apart.
func avatarImageOwnerFor(characterID string) string {
	return avatarImageOwnerPrefix + characterID
}

// characterBehindOwner maps an image owner to the character that must exist for it,
// and reports whether one has to. A reserved owner names a *slot* rather than a
// gallery: "profile" has no character behind it at all, and "avatar:<id>" is backed
// by the character the prefix carries, not by a character literally named
// "avatar:<id>". Resolving that here is what the upload handler's existence check
// was missing — it looked the owner up verbatim, so every avatar and profile
// picture upload was rejected as "no such character".
func characterBehindOwner(owner string) (characterID string, required bool) {
	if owner == profileImageOwner {
		return "", false
	}
	if id, isAvatar := strings.CutPrefix(owner, avatarImageOwnerPrefix); isAvatar {
		return id, true
	}
	return owner, true
}

func validChatImageOwner(id string) bool {
	if id == profileImageOwner {
		return true
	}
	if rest, isAvatar := strings.CutPrefix(id, avatarImageOwnerPrefix); isAvatar {
		return validChatID(rest, true)
	}
	return validChatID(id, true)
}

func cleanLimited(v string, n int) (string, bool) {
	v = strings.TrimSpace(v)
	return v, len(v) <= n
}

func validateChatWorkspace(ws *chatWorkspace) error {
	// Before anything else: a client that omitted a field left a nil slice behind,
	// and everything downstream — validation, storage, and the JSON sent back to
	// every client — must never see one. See normalizeChatWorkspace.
	normalizeChatWorkspace(ws)
	if len(ws.Characters) == 0 || len(ws.Characters) > maxChatCharacters {
		return errors.New("character count must be 1 to 40")
	}
	if len(ws.Conversations) > maxChatConversations {
		return errors.New("too many conversations")
	}
	if len(ws.Images) > maxCharacterImages {
		return errors.New("too many character images")
	}
	var ok bool
	if ws.Profile.DisplayName, ok = cleanLimited(ws.Profile.DisplayName, 80); !ok {
		return errors.New("profile name is too long")
	}
	if ws.Profile.Persona, ok = cleanLimited(ws.Profile.Persona, 8000); !ok {
		return errors.New("profile persona is too long")
	}
	// Each of the newer fields is capped separately rather than sharing the persona's
	// budget: they land in different parts of the prompt, and one long answer must not
	// be able to crowd out the others.
	for _, f := range []struct {
		field *string
		label string
		limit int
	}{
		{&ws.Profile.Address, "form of address", 200},
		{&ws.Profile.Interests, "interests", 2000},
		{&ws.Profile.Preferences, "preferences", 2000},
		{&ws.Profile.Boundaries, "content boundaries", 2000},
		{&ws.Profile.Communication, "communication preferences", 2000},
	} {
		if *f.field, ok = cleanLimited(*f.field, f.limit); !ok {
			return fmt.Errorf("profile %s is too long", f.label)
		}
	}
	// Defaults are forwarded to the backend as sampler fields, so the key count is
	// bounded for the same reason a conversation's Options are: this is a
	// pass-through, not a schema we validate the meaning of.
	if len(ws.Defaults) > 64 {
		return errors.New("too many default generation options")
	}
	ws.SendWeights = normalizeSendWeights(ws.SendWeights)
	for i := range ws.Images {
		// -1 is how "never" survives omitempty; anything else is clamped to the scale.
		if w := ws.Images[i].Weight; w < 0 {
			ws.Images[i].Weight = -1
		} else if w > maxSendWeight {
			ws.Images[i].Weight = maxSendWeight
		}
		ws.Images[i].Subject = normalizeChatSubject(ws.Images[i].Subject)
	}
	characters := make(map[string]bool, len(ws.Characters))
	for i := range ws.Characters {
		c := &ws.Characters[i]
		if !validChatID(c.ID, true) || characters[c.ID] {
			return errors.New("invalid or duplicate character id")
		}
		characters[c.ID] = true
		if c.Name, ok = cleanLimited(c.Name, 120); !ok || c.Name == "" {
			return errors.New("every character needs a name")
		}
		fields := []*string{&c.Description, &c.Appearance, &c.Personality, &c.Kinks, &c.Scenario, &c.FirstMessage, &c.ExampleDialogue, &c.SystemPrompt, &c.CreatorNotes,
			&c.Routine, &c.Tastes, &c.Relationship, &c.Style, &c.Limits}
		for _, field := range fields {
			if *field, ok = cleanLimited(*field, 12000); !ok {
				return errors.New("character card is too large")
			}
		}
		// Alternate greetings are bounded on both axes. A card with two hundred of
		// them is a card built to fill a workspace file, and each one is a first
		// message, so it gets a first message's ceiling.
		if len(c.AltGreetings) > maxAltGreetings {
			c.AltGreetings = c.AltGreetings[:maxAltGreetings]
		}
		kept := c.AltGreetings[:0]
		for _, greeting := range c.AltGreetings {
			cleaned, fine := cleanLimited(greeting, 12000)
			if !fine {
				return errors.New("character card is too large")
			}
			if cleaned != "" {
				kept = append(kept, cleaned)
			}
		}
		c.AltGreetings = kept
		if len(c.AltGreetings) == 0 {
			c.AltGreetings = nil
		}
		if c.PromptWeight == 0 {
			c.PromptWeight = 1
		}
		if c.PromptWeight < 0.1 || c.PromptWeight > 2 {
			return errors.New("prompt weight must be between 0.1 and 2")
		}
		if _, exists := libbyModes[c.DefaultMode]; !exists {
			c.DefaultMode = "sweet"
		}
		c.BuiltIn = c.ID == "libby"
	}
	if !characters["libby"] {
		ws.Characters = append([]chatCharacter{defaultLibbyCard()}, ws.Characters...)
		characters["libby"] = true
	}
	seenConversations := map[string]bool{}
	for i := range ws.Conversations {
		c := &ws.Conversations[i]
		if !validChatID(c.ID, false) || seenConversations[c.ID] || !characters[c.CharacterID] {
			return errors.New("invalid conversation")
		}
		seenConversations[c.ID] = true
		if len(c.Messages) > maxConversationItems {
			return errors.New("conversation is too long")
		}
		if c.Title, ok = cleanLimited(c.Title, 160); !ok {
			return errors.New("conversation title is too long")
		}
		if _, exists := libbyModes[c.Mode]; !exists {
			c.Mode = "sweet"
		}
		c.Emotion = strings.ToLower(strings.TrimSpace(c.Emotion))
		if !supportedLibbyEmotions[c.Emotion] {
			c.Emotion = "neutral"
		}
		if c.Intensity < 1 {
			c.Intensity = 1
		}
		if c.Intensity > 5 {
			c.Intensity = 5
		}
		if c.Progress == 0 {
			c.Progress = float64(c.Intensity)
		}
		if c.Progress < 1 {
			c.Progress = 1
		}
		if c.Progress > 5 {
			c.Progress = 5
		}
		// A state she can only be in if it exists; anything else is nothing in particular.
		if !libbyActivityDeclarable(c.Activity) {
			c.Activity = ""
		}
		if c.Background != "" && !charIDPattern.MatchString(c.Background) {
			c.Background = ""
		}
		for j := range c.Messages {
			m := &c.Messages[j]
			if !validChatID(m.ID, false) || (m.Role != "user" && m.Role != "assistant") {
				return errors.New("invalid message")
			}
			if m.Content, ok = cleanLimited(m.Content, maxChatText); !ok || m.Content == "" {
				return errors.New("invalid message content")
			}
			// Links round-trip through the client, so they are re-bounded on the way
			// back in: a stored message may carry what a reply pointed at, not an
			// arbitrary list of ids and labels grown without limit.
			if len(m.Links) > maxLinksPerReply {
				m.Links = m.Links[:maxLinksPerReply]
			}
			for k := range m.Links {
				if m.Links[k].Title, ok = cleanLimited(m.Links[k].Title, 300); !ok || m.Links[k].ID <= 0 {
					return errors.New("invalid message link")
				}
			}
			// Attachments round-trip through the client too, and are re-bounded for the
			// same reason: a stored message may carry what a reply handed over, not a
			// list of ids grown without limit.
			// A user's message may attach more than hers — they are showing her things, and
			// "these three" is a real message. See chat_shared.go.
			maxAttached := maxAttachmentsPerReply
			if m.Role == "user" {
				maxAttached = maxSharedItems
			}
			if len(m.Attachments) > maxAttached {
				m.Attachments = m.Attachments[:maxAttached]
			}
			for k := range m.Attachments {
				if m.Attachments[k].Title, ok = cleanLimited(m.Attachments[k].Title, 300); !ok || m.Attachments[k].ID <= 0 {
					return errors.New("invalid message attachment")
				}
			}
			// A thought is only ever hers, and only ever one of the two kinds. Anything
			// else is dropped to speech rather than rejected: an unreadable marker is a
			// client's mistake, and losing the whole conversation over it would be worse
			// than losing the italics on one line.
			if m.Role != "assistant" || (m.Thought != thoughtPrivate && m.Thought != thoughtAside) {
				m.Thought = ""
			}
			if m.Role != "assistant" {
				m.Mood = ""
				m.Heat = 0
				// A snap is only ever hers; theirs is an ordinary photo.
				m.Snap, m.Opened = false, false
			} else if m.Mood = strings.ToLower(strings.TrimSpace(m.Mood)); !supportedLibbyEmotions[m.Mood] {
				m.Mood = ""
			}
			if m.Heat < 0 || m.Heat > 5 {
				m.Heat = 0
			}
			// A snap with no picture is nothing; an opened flag on something that was
			// never a snap is noise.
			if m.ImageID == "" && len(m.Attachments) == 0 {
				m.Snap = false
			}
			if !m.Snap {
				m.Opened = false
			}
			// Only their messages get read; hers arrive read by definition.
			if m.Role != "user" || m.ReadAt < 0 {
				m.ReadAt = 0
			}
			m.Reactions = normalizeReactions(m.Reactions)
			if len(m.Actions) > maxLibbyActions {
				m.Actions = m.Actions[:maxLibbyActions]
			}
			// A quote is display text and bounded like one; a reference with nothing to
			// show is dropped rather than drawn as an empty bubble.
			if m.ReplyTo != nil {
				if m.ReplyTo.Excerpt, ok = cleanLimited(m.ReplyTo.Excerpt, 300); !ok || m.ReplyTo.Excerpt == "" {
					m.ReplyTo = nil
				} else if m.ReplyTo.Role != "user" && m.ReplyTo.Role != "assistant" {
					m.ReplyTo.Role = "user"
				}
			}
		}
	}
	return nil
}

func (s *Server) handlePutChatWorkspace(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var ws chatWorkspace
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<20)).Decode(&ws); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid workspace")
		return
	}
	if err := validateChatWorkspace(&ws); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	// Image metadata is server-owned: clients may remove records, but cannot invent
	// blobs or rewrite scan tags. Keep only records from the current workspace.
	old, err := s.readChatWorkspace(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "chat workspace unreadable")
		return
	}
	oldImages := make(map[string]chatImage, len(old.Images))
	for _, img := range old.Images {
		oldImages[img.ID] = img
	}
	filtered := make([]chatImage, 0, len(ws.Images))
	for _, img := range ws.Images {
		if trusted, exists := oldImages[img.ID]; exists {
			// The blob, the scan tags and the timestamps are the server's; the two dials
			// the user turns from the gallery are theirs, and are the only fields taken
			// from the client. Both were being dropped here, which is why a picture set
			// to "never" kept being sent.
			trusted.Weight = img.Weight
			if img.Subject != "" {
				trusted.Subject = img.Subject
			}
			filtered = append(filtered, trusted)
		}
	}
	ws.Images = filtered
	if err := s.writeChatWorkspace(u.ID, ws); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save chat workspace")
		return
	}
	// Saving the card is the only moment her likeness can change, and recognition runs
	// on the ingest path where there is no request and so no workspace to read from.
	// See handlers_libby_identity.go.
	if libby, found := findChatCharacter(ws, "libby"); found {
		s.syncLibbyIdentityAppearance(libby.Appearance)
	}
	writeJSON(w, http.StatusOK, ws)
}

type uploadChatImageReq struct {
	CharacterID string   `json:"characterId"`
	Name        string   `json:"name"`
	ImageData   string   `json:"imageData"`
	Tags        []string `json:"tags,omitempty"`
	// Subject says who the picture is of, when the uploader knows: "self" or "other".
	// Anything else lets the scanner decide from the tags. See chat_image_subjects.go.
	Subject string `json:"subject,omitempty"`
}

func (s *Server) handleUploadChatImage(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var req uploadChatImageReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 12<<20)).Decode(&req); err != nil || !validChatImageOwner(req.CharacterID) {
		writeErr(w, http.StatusBadRequest, "invalid image upload")
		return
	}
	raw, err := decodeDataImage(req.ImageData)
	if err != nil || len(raw) == 0 || len(raw) > maxModelThumbBytes {
		writeErr(w, http.StatusBadRequest, "image is empty, invalid, or too large")
		return
	}
	decoded, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "unsupported image format")
		return
	}
	mime := safeInlineContentType(http.DetectContentType(raw))
	if !strings.HasPrefix(mime, "image/") {
		writeErr(w, http.StatusBadRequest, "an image is required")
		return
	}
	tagSet := map[string]bool{}
	// TagImage uses the local scanner directly even when automatic library tagging is
	// switched off. Uploads in this feature are always scanned, as promised by the UI.
	if suggestions, scanErr := s.ai.TagImage(r.Context(), decoded); scanErr == nil {
		for _, suggestion := range suggestions {
			if tag := normalizeChatTag(suggestion.Name); tag != "" {
				tagSet[tag] = true
			}
		}
	}
	for _, supplied := range req.Tags {
		if tag := normalizeChatTag(supplied); tag != "" {
			tagSet[tag] = true
		}
	}
	tags := make([]string, 0, len(tagSet))
	for tag := range tagSet {
		tags = append(tags, tag)
	}
	sort.Strings(tags)
	name, valid := cleanLimited(req.Name, 160)
	if !valid || name == "" {
		name = "Character image"
	}
	meta := chatImage{ID: randomID(), CharacterID: req.CharacterID, Name: name, Tags: tags, MIME: mime, CreatedAt: time.Now().UnixMilli(), Subject: normalizeChatSubject(req.Subject)}
	blob, err := crypto.SealBytes(s.kek, raw, []byte(fmt.Sprintf("chat-image:%d:%s", u.ID, meta.ID)))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "image encryption failed")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	ws, err := s.readChatWorkspace(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "chat workspace unreadable")
		return
	}
	if len(ws.Images) >= maxCharacterImages {
		writeErr(w, http.StatusBadRequest, "too many character images")
		return
	}
	if owner, required := characterBehindOwner(req.CharacterID); required {
		found := false
		for _, c := range ws.Characters {
			if c.ID == owner {
				found = true
				break
			}
		}
		if !found {
			writeErr(w, http.StatusBadRequest, "no such character")
			return
		}
		// Nobody said who it is of, so the scanner decides: her likeness against the
		// tags, exactly as she would recognise herself in it mid-conversation.
		if meta.Subject == "" {
			if character, ok := findChatCharacter(ws, owner); ok {
				meta.Subject = classifyChatSubject(meta.Tags, character.Appearance, selfPortraitFloor)
			}
		}
	}
	dir := filepath.Dir(s.chatImagePath(u.ID, meta.ID))
	if err := os.MkdirAll(dir, 0o700); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.WriteFile(s.chatImagePath(u.ID, meta.ID), blob, 0o600); err != nil {
		writeErr(w, http.StatusInternalServerError, "image write failed")
		return
	}
	ws.Images = append(ws.Images, meta)
	if err := s.writeChatWorkspace(u.ID, ws); err != nil {
		_ = os.Remove(s.chatImagePath(u.ID, meta.ID))
		writeErr(w, http.StatusInternalServerError, "image metadata write failed")
		return
	}
	writeJSON(w, http.StatusOK, meta)
}

func normalizeChatTag(tag string) string {
	tag = strings.ToLower(strings.TrimSpace(strings.ReplaceAll(tag, "_", " ")))
	if len(tag) > 60 {
		tag = tag[:60]
	}
	return tag
}

func (s *Server) ownedChatImage(userID int64, id string) (chatImage, bool) {
	ws, err := s.readChatWorkspace(userID)
	if err != nil {
		return chatImage{}, false
	}
	for _, img := range ws.Images {
		if img.ID == id {
			return img, true
		}
	}
	return chatImage{}, false
}

func (s *Server) handleGetChatImage(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad image id")
		return
	}
	s.chatMu.Lock()
	meta, owned := s.ownedChatImage(u.ID, id)
	s.chatMu.Unlock()
	if !owned {
		writeErr(w, http.StatusNotFound, "no such image")
		return
	}
	blob, err := os.ReadFile(s.chatImagePath(u.ID, id))
	if err != nil {
		writeErr(w, http.StatusNotFound, "no such image")
		return
	}
	raw, err := crypto.OpenBytes(s.kek, blob, []byte(fmt.Sprintf("chat-image:%d:%s", u.ID, id)))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "image unreadable")
		return
	}
	w.Header().Set("Content-Type", meta.MIME)
	w.Header().Set("Cache-Control", "private, max-age=60")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(raw)
}

func (s *Server) handleDeleteChatImage(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	id := r.PathValue("id")
	if !ok || !validChatID(id, false) {
		writeErr(w, http.StatusBadRequest, "bad image id")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	ws, err := s.readChatWorkspace(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "chat workspace unreadable")
		return
	}
	found := false
	kept := ws.Images[:0]
	for _, img := range ws.Images {
		if img.ID == id {
			found = true
		} else {
			kept = append(kept, img)
		}
	}
	if !found {
		writeErr(w, http.StatusNotFound, "no such image")
		return
	}
	ws.Images = kept
	for i := range ws.Characters {
		if ws.Characters[i].AvatarImageID == id {
			ws.Characters[i].AvatarImageID = ""
		}
	}
	if ws.Profile.AvatarImageID == id {
		ws.Profile.AvatarImageID = ""
	}
	if err := s.writeChatWorkspace(u.ID, ws); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't update workspace")
		return
	}
	_ = os.Remove(s.chatImagePath(u.ID, id))
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func findChatCharacter(ws chatWorkspace, id string) (chatCharacter, bool) {
	if id == "" {
		id = "libby"
	}
	for _, c := range ws.Characters {
		if c.ID == id {
			return c, true
		}
	}
	return chatCharacter{}, false
}

// unpromptedPhotoFloor is how much tag overlap an *unrequested* picture needs
// before it rides along with a reply.
//
// It used to be one word, which is why she sent pictures constantly: in a chat about
// a bedroom, one gallery image tagged "bedroom" wins every single turn. Two
// independent words was better but still fired too often — she read as flinging a
// selfie at every passing keyword. Three independent words is the difference between a
// picture that genuinely fits the moment and one that merely shares vocabulary with it.
const unpromptedPhotoFloor = 3

