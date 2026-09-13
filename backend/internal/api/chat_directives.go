package api

import (
	"regexp"
	"strings"
)

// The net under the protocol parsers.
//
// A reply carries control tags the user is never meant to read: [mood: …] picks the
// face, [send: …] picks a picture, [link: …] points at the library. splitMood,
// splitPhotoRequest and resolveLibraryLinks take those off — but each of them is
// anchored to the end of the reply, because that is where the prompt asks for them
// and because an anchored pattern cannot eat a line of prose that merely looks like
// a tag.
//
// Models do not stay inside that shape. They put the mood tag in the middle, emit it
// twice, wrap it in emphasis, or drop the brackets entirely and narrate the machinery
// as a stage direction — "*sending you a picture*", "*progressing mood to 4*",
// "*changes mood: mischievous*". None of that is dialogue. It is the plumbing being
// read out loud, and it is the single most immersion-breaking thing she does.
//
// So: the anchored parsers still *decide* (they own which mood and which picture,
// and only a well-formed trailing tag should be trusted with that), and everything
// below is deletion only. Nothing here changes what she feels or sends; it only stops
// the user from seeing how it was requested.

// strayTag matches a bracketed control tag anywhere in a reply. Restricted to the
// verbs the protocol actually defines plus the words models substitute for them, so
// bracketed prose ("[laughs]", "[1]") survives untouched.
//
// Bounded to one line and 300 characters: most tags are short, but a [remember: …] note
// can run to a full sentence, and the bound has to clear the longest of them. Still
// short enough that an unbounded match cannot swallow real writing between two brackets.
var strayTag = regexp.MustCompile(`(?i)[*_~` + "`" + `]{0,2}\[\s*(?:(?:` +
	`mood|emotion|feeling|expression|face|pose|intensity|horniness|heat|meter` +
	`|send|sends|sending|show|shows|showing|attach|attaches|attaching` +
	`|photo|photos|pic|pics|picture|pictures|image|images|selfie|selfies` +
	// Library kinds written as a tag head — "[gif: …]", "[video: …]" — are a model
	// reaching for an attach it was not given the word for. Read as one by attachTag
	// (chat_attachments.go); deleted here.
	`|gif|gifs|video|videos|clip|clips` +
	`|remember|remembers|remembering|memory|note|noting|noted` +
	`|want|wants|wanting|craving|cravings|crave|craves|desire|desires` +
	`|petname|petnames|nickname|nicknames|endearment` +
	// Snaps (chat_snaps.go) and reactions (chat_reactions.go), read before deletion.
	`|snap|snaps|snapping|snapchat|react|reacts|reacting|reaction` +
	// Snaps (chat_snaps.go) and reactions (chat_reactions.go), read before deletion.
	`|snap|snaps|snapping|snapchat|react|reacts|reacting|reaction` +
	// The MISC state tag, deleted after findLooseActivity has read it: she is doing
	// the thing, not announcing it. See libby_activities.go.
	`|doing|does|activity|activities|action|state` +
	// Where she is, read before deletion. See libby_backgrounds.go.
	`|scene|background|place|setting|location|room` +
	`)\b[^\]\n]{0,300}` +
	// Ringing and hanging up (chat_call.go), and replying to an earlier message
	// (chat_replies.go). These verbs are ordinary words too — "[rings the bell]",
	// "[answering the door]" — so unlike the nouns above they are only a tag when bare
	// or followed by a delimiter, which is the shape the parsers accept.
	`|(?:call|videocall|video\s+call|facetime|ring|rings|ringing|hangup|hang\s+up|end\s+call)\s*(?:[:=-][^\]\n]{0,60})?` +
	// No hyphen among the delimiters here: "[re-reads the note]" is prose.
	`|(?:replying|reply|quoting|quote|answering|re)\b(?:\s+to\b|\s*[:=])[^\]\n]{0,300}` +
	`)\]` + "[*_~`]{0,2}")

// strayThoughtTag deletes the thought tags after findThoughtTags has read them into
// their own bubbles. A thought left in the prose has been said to the user, which is
// the one thing it must never be. See chat_thoughts.go.
//
// Separate from strayTag because it insists on the delimiter that looseThoughtTag also
// insists on. Folding these verbs into strayTag would have deleted "[thinks]" and
// "[mutters]" written as ordinary bracketed stage directions — prose that pattern
// exists to leave alone.
var strayThoughtTag = regexp.MustCompile(`(?i)[*_~` + "`" + `]{0,2}\[\s*(?:` +
	`think|thinks|thinking|thought|thoughts|inner\s+voice|inner\s+thought|internal|privately` +
	`|aside|asides|mutter|mutters|muttering|to\s+(?:her)?self|to\s+myself` +
	`)\s*[:=-][^\]\n]{0,300}\]` + "[*_~`]{0,2}")

// strayMetaTag deletes a bracketed remark *about* the protocol — "[this image hasn't
// been marked 'already sent' — it's a new one you're offering …]" — which is the
// prompt's own wording coming back out as a stage direction. Recognised by the words
// only the prompt uses: nothing in a scene is "already sent" or "marked".
var strayMetaTag = regexp.MustCompile(`(?i)[*_~` + "`" + `]{0,2}\[[^\]\n]{0,300}?\b(?:already\s+(?:sent|shown)|(?:been|not|is|isn'?t|hasn'?t\s+been)\s+marked|marked\s+(?:as|')|the\s+tag\b|square[- ]bracket)[^\]\n]{0,300}\]` + "[*_~`]{0,2}")

// strayHistoryNote deletes a history note copied whole onto its own line — "(you
// handed over from the library: "p" (video; 1boy, 1girl))". The hand-over note nests
// parentheses, which wrappedSpan cannot see across, so the line form is matched
// directly: the note's opening words, then anything to the end of the line.
var strayHistoryNote = regexp.MustCompile(`(?im)^[ \t]*\((?:you|they|she|i)\s+(?:sent a picture of (?:your|her|my)self|attached (?:a photo|from the library)|handed over from the library)\b[^\n]*\)[ \t]*$`)

// strayCatalogueNote deletes a catalogue entry copied onto its own line — "(gif;
// square)", "(video; 1girl, anus, ass, photo (medium), pussy, solo)". The shelves and
// the history notes both describe an item as "(kind; tags)", and a model handed that
// shape writes it back: asked for a gif she answered with nothing but "(gif; square)",
// and asked what a video was of she pasted its line. The inner parentheses a tag can
// carry — "photo (medium)" — are why this is a line rule rather than a wrappedSpan
// case: wrappedSpan cannot see across them.
var strayCatalogueNote = regexp.MustCompile(`(?im)^[ \t]*\((?:gif|gifs|video|videos|clip|clips|image|images|picture|pictures|comic|comics|game|games)\s*;[^\n]*\)[ \t]*$`)

// wrappedSpan finds the emphasis and parenthesis forms a stage direction is written
// in: *…*, **…**, _…_, (…). Each is capped at one line; emphasis at 160 characters,
// which is longer than any of these ever are and short enough that a mismatched
// delimiter cannot run away with a paragraph.
//
// The parenthetical form is allowed to run longer. A copied history note — "(1girl,
// mouth open around …, audio muted on purpose — lets viewer fill the silence with
// fantasy.)" — is a paragraph, and the cap only bounds what is *examined*: nothing is
// deleted unless machineryPhrase says the span is about the machinery.
//
// Deliberately *not* a filter on emphasis as such. Italic action lines are how she
// writes — "*leans in*" is her voice and must survive. Only spans whose content is
// about the app's own machinery are removed, which machineryPhrase decides.
var wrappedSpan = regexp.MustCompile(`(?i)(\*\*|\*|__|_)([^*_\n]{1,160}?)(\*\*|\*|__|_)|\(([^()\n]{1,400}?)\)`)

// machineryPhrase recognises a stage direction that is narrating the protocol rather
// than the scene.
//
// Four families, which is all of what has actually been seen leaking:
//   - a bare mood readout: "mood: happy 3", "emotion — mischievous"
//   - sending a picture as an announced act: "sending you a photo", "attaches an image"
//   - moving the meter: "progressing mood to 4", "changes her mood", "raising intensity"
//   - filing a memory: "makes a mental note that…", "noting that you like…"
//
// Anchored at the start of the span so it classifies what the direction *is about*.
// A sentence that merely mentions a picture in passing ("*I look at the photo*") does
// not begin with the verb, and is left alone.
var machineryPhrase = regexp.MustCompile(`(?i)^\s*(?:` +
	// "mood: happy 3" / "intensity 4" — a label plus a value, not a sentence.
	`(?:current\s+|displayed\s+|new\s+)?(?:mood|emotion|feeling|expression|intensity|horniness|heat)\s*(?:[:=—–-]|\bis\b|\bto\b)\s*\S` +
	// Announcing an attachment. "you" and "they" are among the subjects because the
	// history's own notes — "(you sent a picture of yourself showing …)", "(they
	// attached a photo …)" — are written that way, and a model shown them writes them
	// back. See chat_history.go. Library kinds are among the objects for the same
	// reason: "(you attached a video file — …)" was her copying the note's shape.
	`|(?:i\s+am\s+|i'?m\s+|i\s+|i'?ve\s+|she\s+|she'?s\s+|you\s+|you'?ve\s+|they\s+|they'?ve\s+|we\s+)?(?:send|sends|sending|sent|attach|attaches|attaching|attached|share|shares|sharing|shared|show|shows|showing|showed|posts?|posting|uploads?|uploading|hand|hands|handed|handing)\b[^\n]{0,60}?\b(?:photo|photos|pic|pics|picture|pictures|image|images|selfie|selfies|nude|nudes|video|videos|gif|gifs|clip|clips|file|files|item|items|library)\b` +
	// The history note for a library hand-over, as she copies it: "you handed over
	// from the library: …". The source is required — "(she hands over the remote)" is
	// a scene.
	`|(?:you\s+|she\s+|i\s+)?(?:hand|hands|handed|handing)\s+over\s+from\s+(?:the\s+|their\s+|your\s+)?(?:library|shelves|collection)\b` +
	// A tag list in parentheses — "(1girl, mouth open, …)", "(1girl, anus, ass, medium
	// quality)" — is the shape of the notes and of the catalogue, never of speech. So is
	// a kind followed by a semicolon — "(gif; square)" — which is how the shelves are
	// listed. The line form is strayCatalogueNote; this catches it mid-line.
	`|\d+\s*(?:girls?|boys?|others?)\s*,` +
	`|(?:gif|gifs|video|videos|clip|clips|image|images|picture|pictures|comic|comics|game|games)\s*;` +
	// A picture referred to as a delivered artifact.
	`|(?:photo|picture|pic|image|selfie)\s+(?:sent|attached|shown|shared|delivered|enclosed)\b` +
	// Moving the meter.
	`|(?:progress|progresses|progressing|advance\w*|change|changes|changing|shift\w*|updat\w*|increas\w*|rais\w*|lower\w*|bump\w*|set|setting|adjust\w*)\b[^\n]{0,40}?\b(?:mood|emotion|feeling|expression|intensity|horniness|heat|meter|tier|level)\b` +
	// Filing a memory. "makes a (mental) note …"; or remembering/noting/jotting a
	// *that/this/how/what* clause. The clausal complement is required so ordinary prose
	// — "*I remember you from before*", "*note the freckle on your shoulder*" — is left
	// alone: those do not begin "<verb> that/this/how/what".
	`|(?:i\s+am\s+|i'?m\s+|i'?ll\s+|i\s+|she\s+)?(?:make|makes|making|made|take|takes|taking|took)\s+(?:a\s+)?(?:mental\s+)?note\b` +
	`|(?:i\s+am\s+|i'?m\s+|i'?ll\s+|i\s+|she\s+)?(?:remember\w*|not(?:e|es|ing)|jot\w*|memoriz\w*)\s+(?:that|this|how|what)\b` +
	`)`)

// looseMoodTag and looseSendTag are the unanchored twins of moodTag and sendTag.
//
// They exist so a tag that landed in the wrong place still *counts*. Scrubbing alone
// would delete a mid-reply "[mood: mischievous 4]" and leave the face on whatever it
// was already showing — which is the same stuck-mood bug as before, just without the
// visible tag. Read here, deleted by scrubDirectives afterwards.
//
// They are consulted only when the anchored parse found nothing, so a well-formed
// trailing tag always wins over a stray one earlier in the text.
var (
	looseMoodTag = regexp.MustCompile(`(?i)\[\s*mood\s*[:=-]?\s*([^\]\d]{0,60}?)\s*[,;:/|-]?\s*(\d{1,2})?\s*\]`)
	// "attach" is absent here for the same reason it left sendTag: it belongs to the
	// library hand-over now. See chat_attachments.go.
	looseSendTag = regexp.MustCompile(`(?i)\[\s*(?:send|show|photo|pic|image)\s*[:=-]?\s*([^\]\n]{1,200}?)\s*\]`)
	// looseRememberTag captures a [remember: …] note wherever it lands. Read here to be
	// persisted; deleted by scrubDirectives (via strayTag) afterwards so it never shows.
	looseRememberTag = regexp.MustCompile(`(?i)\[\s*(?:remember|memory|note)\s*[:=-]?\s*([^\]\n]{1,300}?)\s*\]`)
	// looseWantTag captures a [want: …]/[craving: …] desire wherever it lands. Read here
	// to be persisted; deleted by scrubDirectives (via strayTag) afterwards so it never
	// shows, exactly like the remember tag it is modelled on.
	looseWantTag = regexp.MustCompile(`(?i)\[\s*(?:want|wants|wanting|craving|crave|desire|desires)\s*[:=-]?\s*([^\]\n]{1,300}?)\s*\]`)
	// loosePetnameTag captures the [petname: …] endearment she settles on wherever it
	// lands. Read here to be persisted into her bond; deleted by scrubDirectives (via
	// strayTag) afterwards so it never shows, exactly like the want tag it is modelled on.
	loosePetnameTag = regexp.MustCompile(`(?i)\[\s*(?:petname|nickname|endearment)\s*[:=-]?\s*([^\]\n]{1,60}?)\s*\]`)
)

// maxRememberedPerReply bounds how many facts one reply may file. A model told it can
// remember will occasionally try to summarise the whole conversation into a list; two is
// enough for a reply that genuinely learned something without letting that happen.
const maxRememberedPerReply = 2

// findRememberTags reads every [remember: …] note out of a reply, in order, capped. The
// facts are returned raw; appendLibbyMemories owns trimming, length, and dedup.
func findRememberTags(reply string) []string {
	matches := looseRememberTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return nil
	}
	var facts []string
	for _, match := range matches {
		if fact := strings.TrimSpace(match[1]); fact != "" {
			facts = append(facts, fact)
			if len(facts) >= maxRememberedPerReply {
				break
			}
		}
	}
	return facts
}

// maxWantsPerReply bounds how many desires one reply may file. Kept at one on purpose:
// a person voices a want now and then, not a wishlist per message, and the directive
// asks for the same restraint the parser enforces here.
const maxWantsPerReply = 1

// findWantTags reads the [want: …] desires out of a reply, in order, capped. The wants
// are returned raw; appendLibbyWants owns trimming, length, and dedup.
func findWantTags(reply string) []string {
	matches := looseWantTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return nil
	}
	var wants []string
	for _, match := range matches {
		if want := strings.TrimSpace(match[1]); want != "" {
			wants = append(wants, want)
			if len(wants) >= maxWantsPerReply {
				break
			}
		}
	}
	return wants
}

// findPetnameTag reads the endearment she settled on out of a reply, if any. The last one
// wins: a model that revises lands on the final one. Returned raw; updateLibbyBond owns
// trimming and length.
func findPetnameTag(reply string) string {
	matches := loosePetnameTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return ""
	}
	return strings.TrimSpace(matches[len(matches)-1][1])
}

// findLooseMood reads a mood tag from anywhere in a reply. The last one wins: a model
// that emits several is revising, and the final one is where it landed.
func findLooseMood(reply string) (emotion string, intensity int, ok bool) {
	matches := looseMoodTag.FindAllStringSubmatch(reply, -1)
	if len(matches) == 0 {
		return "", 0, false
	}
	last := matches[len(matches)-1]
	if emotion = canonicalMood(last[1]); emotion == "" {
		return "", 0, false
	}
	intensity = atoiClamped(last[2], 0, 5)
	return emotion, intensity, true
}

// findLoosePhotoRequest reads a picture request from anywhere in a reply. The first
// one wins here, unlike the mood: a second [send: …] is a model repeating itself, and
// only one picture can be attached to a reply anyway.
func findLoosePhotoRequest(reply string) (request string, ok bool) {
	match := looseSendTag.FindStringSubmatch(reply)
	if match == nil {
		return "", false
	}
	if request = strings.TrimSpace(match[1]); request == "" {
		return "", false
	}
	return request, true
}

// atoiClamped parses a small non-negative integer, returning lo for anything
// unreadable and capping at hi. Clamping rather than rejecting mirrors splitMood: a
// model told to pick 1-5 that answers 9 means "as much as possible".
func atoiClamped(s string, lo, hi int) int {
	n := 0
	for _, r := range s {
		if r < '0' || r > '9' {
			return lo
		}
		n = n*10 + int(r-'0')
		if n > hi {
			return hi
		}
	}
	if s == "" {
		return lo
	}
	return n
}

// blankLineRun collapses the gaps deletion leaves behind.
var blankLineRun = regexp.MustCompile(`\n{3,}`)

// spaceRun collapses the double spaces left where a mid-sentence tag was removed.
var spaceRun = regexp.MustCompile(`[ \t]{2,}`)

// danglingSpace tidies punctuation that ends up separated from its word.
var danglingSpace = regexp.MustCompile(`[ \t]+([,.!?;:])`)

// scrubDirectives removes every control tag and machinery stage direction left in a
// reply, and tidies the seams.
//
// Returns the original text unchanged if scrubbing would empty it: a reply that was
// nothing but tags is a backend problem the caller reports as "no message", and
// handing it back blank turns a diagnosable failure into a silent one.
func scrubDirectives(reply string) string {
	cleaned, emptied := scrubDirectivesReporting(reply)
	if emptied {
		return reply
	}
	return cleaned
}

// scrubDirectivesReporting is scrubDirectives with the emptying reported instead of
// hidden: cleaned is "" and emptied is true when the reply was nothing but tags. The
// chat handler wants that distinction — a reply that was only "[send: …]" *is* a turn,
// a picture with no words, and storing the raw tag as her message is how the user
// came to read "[send: red eyes, pixel art]" in a bubble.
func scrubDirectivesReporting(reply string) (cleaned string, emptied bool) {
	cleaned = strayTag.ReplaceAllString(reply, "")
	cleaned = strayMetaTag.ReplaceAllString(cleaned, "")
	cleaned = strayHistoryNote.ReplaceAllString(cleaned, "")
	cleaned = strayCatalogueNote.ReplaceAllString(cleaned, "")
	cleaned = strayThoughtTag.ReplaceAllString(cleaned, "")
	cleaned = wrappedSpan.ReplaceAllStringFunc(cleaned, func(span string) string {
		inner := span
		// Strip whichever wrapper matched. Parentheses and emphasis are separate
		// alternatives in the pattern, so exactly one of these applies.
		if strings.HasPrefix(inner, "(") {
			inner = strings.TrimSuffix(strings.TrimPrefix(inner, "("), ")")
		} else {
			inner = strings.Trim(inner, "*_")
		}
		if machineryPhrase.MatchString(inner) {
			return ""
		}
		return span
	})
	cleaned = spaceRun.ReplaceAllString(cleaned, " ")
	cleaned = danglingSpace.ReplaceAllString(cleaned, "$1")
	// Trim the trailing spaces deletion leaves at line ends before collapsing runs,
	// or a line that is now only whitespace does not read as blank.
	lines := strings.Split(cleaned, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimRight(line, " \t")
	}
	cleaned = blankLineRun.ReplaceAllString(strings.Join(lines, "\n"), "\n\n")
	cleaned = strings.TrimSpace(cleaned)
	return cleaned, cleaned == ""
}
