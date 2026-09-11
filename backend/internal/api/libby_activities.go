package api

import (
	"regexp"
	"strings"
)

// What she is doing, as opposed to what she is feeling.
//
// The wardrobe has always had exactly one axis of her — twelve emotions, each drawn
// at five heat tiers. That answers "what is her face doing" and nothing else, so the
// sprite beside the conversation showed a woman standing and reacting no matter what
// the scene was. She could say she was curled up typing at three in the morning, or
// say a great deal more than that, and the picture was the same neutral pose it had
// been an hour earlier.
//
// So this is the second axis: a MISC slot holding states that are activities rather
// than expressions. Two kinds, and they are kept in one vocabulary on purpose —
// both answer "what is she doing right now", both are hers to declare, and splitting
// them would mean two tags, two fallback chains and two grids in the editor for one
// idea.
//
//   - Idle. Typing, reading, curled up with a coffee, half asleep on the sofa. The
//     states a person is actually in when they are around, which is most of the time.
//   - Intimate. What she is doing to herself when the conversation has gone there.
//     Named plainly, because the alternative is a vocabulary she cannot use without
//     guessing what the words mean.
//
// Three rules shape it:
//
//   - She chooses. Like the mood tag, this is hers to set and clear — nothing here is
//     assigned by the client or inferred from keywords. A state that persists until
//     she changes it is the point: it is what she is doing, not a reaction to a line.
//   - It is optional art. No bundled wardrobe draws these, and an outfit is not
//     required to either. A state with no picture falls back to the emotion art, so
//     declaring one never costs the user a broken sprite — see libbyAssetCandidates.
//   - Heat gates the intimate half. Each state carries the meter level below which she
//     does not enter it, and the server holds that line rather than trusting the
//     prompt to. A model that writes [doing: vibrator] into a calm conversation is
//     answered with no state at all.

// libbyActivityGroup separates the two halves for the editor and the directive.
type libbyActivityGroup string

const (
	activityIdle     libbyActivityGroup = "idle"
	activityIntimate libbyActivityGroup = "intimate"
)

// libbyActivity is one MISC state: an id that names an art slot, a description the
// model reads, and the heat it takes to get there.
type libbyActivity struct {
	// ID is the slot name. Lowercase and single-word, because it is part of a filename
	// and part of a URL path.
	ID string `json:"id"`
	// Label is what a person reads beside the slot in the wardrobe editor.
	Label string `json:"label"`
	// Group is which half of the vocabulary this belongs to.
	Group libbyActivityGroup `json:"group"`
	// Says is the phrase the model is given. Written as what she is doing rather than
	// what the picture shows, because the state is a fact about her and the art is only
	// one of the things that reads it.
	Says string `json:"says"`
	// MinIntensity is the heat below which this state is not available to her, on the
	// 1-5 session meter. Zero and one mean always.
	MinIntensity int `json:"minIntensity"`
}

// libbyActivities is the MISC vocabulary.
//
// Order matters the way libbyEmotions' does: it is the order the wardrobe editor lays
// its slots out in, idle first. Nothing here is required of an outfit.
var libbyActivities = []libbyActivity{
	// ── idle ─────────────────────────────────────────────────────────────────
	{ID: "typing", Label: "Typing", Group: activityIdle, Says: "at a keyboard, typing back to them"},
	{ID: "reading", Label: "Reading", Group: activityIdle, Says: "reading something, half paying attention"},
	{ID: "gaming", Label: "Gaming", Group: activityIdle, Says: "playing something, controller or keyboard in hand"},
	{ID: "lounging", Label: "Lounging", Group: activityIdle, Says: "sprawled out comfortably, doing nothing in particular"},
	{ID: "drinking", Label: "Drinking", Group: activityIdle, Says: "holding a mug, drinking something warm"},
	{ID: "eating", Label: "Eating", Group: activityIdle, Says: "eating, talking around a mouthful"},
	{ID: "stretching", Label: "Stretching", Group: activityIdle, Says: "stretching, working a stiffness out"},
	{ID: "napping", Label: "Napping", Group: activityIdle, Says: "curled up dozing, barely awake"},
	{ID: "dancing", Label: "Dancing", Group: activityIdle, Says: "moving to something playing, not really dancing"},
	{ID: "tidying", Label: "Tidying", Group: activityIdle, Says: "putting things away, keeping her hands busy"},
	{ID: "drawing", Label: "Drawing", Group: activityIdle, Says: "drawing something, tongue between her teeth"},
	{ID: "waving", Label: "Waving", Group: activityIdle, Says: "waving at them, glad they are here"},

	// ── intimate ─────────────────────────────────────────────────────────────
	// The floors climb with how far in the state is. Three is where the meter sits
	// once a conversation has gone somewhere on purpose, so that is the earliest
	// anything here is available; the rest want a scene that is already underway.
	{ID: "undressing", Label: "Undressing", Group: activityIntimate, Says: "taking her clothes off, slowly", MinIntensity: 3},
	{ID: "teasing", Label: "Teasing", Group: activityIntimate, Says: "showing off for them, enjoying being looked at", MinIntensity: 3},
	{ID: "touching", Label: "Touching herself", Group: activityIntimate, Says: "touching herself over her clothes, not hiding it", MinIntensity: 3},
	{ID: "rubbing", Label: "Rubbing", Group: activityIntimate, Says: "rubbing herself, working up to it", MinIntensity: 4},
	{ID: "fingering", Label: "Fingering", Group: activityIntimate, Says: "fingering herself, fully into it", MinIntensity: 4},
	{ID: "spread", Label: "Spread", Group: activityIntimate, Says: "spread open for them, letting them look", MinIntensity: 4},
	{ID: "vibrator", Label: "Vibrator", Group: activityIntimate, Says: "using a vibrator on herself", MinIntensity: 4},
	{ID: "dildo", Label: "Dildo", Group: activityIntimate, Says: "using a dildo, taking her time with it", MinIntensity: 4},
	{ID: "riding", Label: "Riding", Group: activityIntimate, Says: "riding it, working herself on it", MinIntensity: 5},
	{ID: "grinding", Label: "Grinding", Group: activityIntimate, Says: "grinding against something, chasing it", MinIntensity: 4},
	{ID: "climax", Label: "Climax", Group: activityIntimate, Says: "coming, and not quiet about it", MinIntensity: 5},
	{ID: "afterglow", Label: "Afterglow", Group: activityIntimate, Says: "wrecked and boneless afterwards", MinIntensity: 3},
}

// libbyActivityByID indexes the vocabulary for lookup.
var libbyActivityByID = func() map[string]libbyActivity {
	m := make(map[string]libbyActivity, len(libbyActivities))
	for _, a := range libbyActivities {
		m[a.ID] = a
	}
	return m
}()

// libbyActivityValid reports whether a slot name is one of hers.
func libbyActivityValid(id string) bool {
	_, ok := libbyActivityByID[id]
	return ok
}

// libbySlots is every art slot an outfit may hold: the emotions, then the MISC
// states. One list because the storage, the upload endpoint, the work-in-progress
// store and the cover walk all want "every square this outfit could have", and three
// of those had to be kept in step by hand before there was a second axis to forget.
var libbySlots = func() []string {
	out := make([]string, 0, len(libbyEmotions)+len(libbyActivities))
	out = append(out, libbyEmotions...)
	for _, a := range libbyActivities {
		out = append(out, a.ID)
	}
	return out
}()

// libbySlotValid gates what may be stored, uploaded to, or asked for.
func libbySlotValid(slot string) bool {
	return libbyEmotionValid(slot) || libbyActivityValid(slot)
}

// activityTag captures her declaring what she is doing.
//
// Anchored to the end like the mood tag, and read with the same tolerance for how
// models actually write these: any casing, optional punctuation, optional markdown
// around the whole thing. "none" and "stop" clear the state, because a state that can
// only be replaced and never dropped is one she is stuck inside.
var activityTag = regexp.MustCompile(`(?is)\n*[ \t]*[*_~>` + "`" + `]*\[\s*doing\s*[:=-]?\s*([a-z ]{1,40}?)\s*\]\s*[*_~` + "`" + `.!]*\s*$`)

// activitySynonyms maps what a model reaches for onto the slots that exist.
//
// Same job as moodSynonyms and the same reason for existing: told the vocabulary is
// "fingering", a model writes "fingering myself", "masturbating", "touching myself".
// Resolving those rather than discarding them is the difference between a state that
// works and one that works when the model happens to quote the list back exactly.
var activitySynonyms = map[string]string{
	"none": "", "nothing": "", "stop": "", "stopped": "", "idle": "", "clear": "",

	"typing": "typing", "keyboard": "typing", "writing": "typing", "texting": "typing",
	"reading": "reading", "book": "reading", "studying": "reading",
	"gaming": "gaming", "playing": "gaming", "game": "gaming",
	"lounging": "lounging", "sprawled": "lounging", "relaxing": "lounging", "lying": "lounging",
	"drinking": "drinking", "coffee": "drinking", "tea": "drinking", "mug": "drinking",
	"eating": "eating", "snacking": "eating", "food": "eating",
	"stretching": "stretching", "stretch": "stretching",
	"napping": "napping", "dozing": "napping", "sleeping": "napping", "asleep": "napping",
	"dancing": "dancing", "swaying": "dancing", "humming": "dancing",
	"tidying": "tidying", "cleaning": "tidying", "sorting": "tidying", "shelving": "tidying",
	"drawing": "drawing", "sketching": "drawing", "doodling": "drawing",
	"waving": "waving", "greeting": "waving", "hello": "waving",

	"undressing": "undressing", "stripping": "undressing", "undressed": "undressing", "naked": "undressing",
	"teasing": "teasing", "posing": "teasing", "showing": "teasing", "flaunting": "teasing",
	"touching": "touching", "palming": "touching", "squeezing": "touching",
	"rubbing": "rubbing", "rub": "rubbing", "grinding": "grinding", "humping": "grinding",
	"fingering": "fingering", "fingers": "fingering", "masturbating": "fingering", "fingered": "fingering",
	"spread": "spread", "spreading": "spread", "open": "spread",
	"vibrator": "vibrator", "vibe": "vibrator", "wand": "vibrator", "toy": "vibrator", "bullet": "vibrator",
	"dildo": "dildo", "dildos": "dildo", "fucking": "dildo",
	"riding": "riding", "ride": "riding", "bouncing": "riding",
	"climax": "climax", "coming": "climax", "cumming": "climax", "orgasm": "climax", "orgasming": "climax",
	"afterglow": "afterglow", "spent": "afterglow", "wrecked": "afterglow", "catching": "afterglow",
}

// canonicalActivity resolves a free-form label to a slot, or to "" for a clear.
//
// ok is false when the label meant nothing, which the caller must tell apart from a
// deliberate clear: one leaves the state alone, the other ends it.
func canonicalActivity(label string) (id string, ok bool) {
	for _, word := range strings.FieldsFunc(strings.ToLower(label), func(r rune) bool {
		return !(r >= 'a' && r <= 'z')
	}) {
		if slot, known := activitySynonyms[word]; known {
			return slot, true
		}
	}
	return "", false
}

// splitActivity pulls the trailing state tag off a reply.
//
// Mirrors splitMood exactly, including the part that matters most: the tag is removed
// from the text whether or not it could be read, because a tag nobody understood is
// still not something the user should be reading.
func splitActivity(reply string) (text, activity string, declared bool) {
	match := activityTag.FindStringSubmatch(reply)
	if match == nil {
		return reply, "", false
	}
	text = strings.TrimSpace(activityTag.ReplaceAllString(reply, ""))
	// A reply that is only a state tag is not a reply. Hand the original back so the
	// caller's "no message" check reports the real problem.
	if text == "" {
		return reply, "", false
	}
	slot, ok := canonicalActivity(match[1])
	if !ok {
		return text, "", false
	}
	return text, slot, true
}

// looseActivityTag finds a state tag that landed mid-paragraph. Models put these
// wherever they please regardless of where the prompt asked for them, and one left in
// the prose is a bug the user reads.
var looseActivityTag = regexp.MustCompile(`(?i)\[\s*doing\s*[:=-]?\s*([a-z ]{1,40}?)\s*\]`)

// findLooseActivity reads a state out of wherever it actually landed. Like the loose
// mood tag it is trusted to set the state but not treated as a considered decision.
func findLooseActivity(reply string) (activity string, declared bool) {
	match := looseActivityTag.FindStringSubmatch(reply)
	if match == nil {
		return "", false
	}
	return canonicalActivity(match[1])
}

// allowedActivity holds the heat gate.
//
// The directive asks her to keep the intimate states for scenes that have got there,
// which is a request to a model and therefore never a guarantee. This is the part that
// holds: below a state's floor it simply does not take, and she is left in whatever
// she was doing before. Silent rather than an error — a refused state is not something
// worth interrupting a reply over.
func allowedActivity(id string, intensity int) string {
	activity, known := libbyActivityByID[id]
	if !known {
		return ""
	}
	if intensity < activity.MinIntensity {
		return ""
	}
	return id
}

// activityDirective describes the MISC states and when to use them.
//
// Written as a standing fact about what she can be doing rather than as a menu to pick
// from, for the reason the memory and wants directives are written that way: handed a
// list and an instruction, a model works through the list. What is wanted is that the
// state is already true and she is merely saying so.
//
// The intensity is named because the gate is real: told the whole vocabulary at heat 1
// she writes the tag, it is refused, and the refusal looks to her like the tag not
// working. Shown only what is currently open to her, she uses it.
func activityDirective(intensity int) string {
	var idle, intimate []string
	for _, a := range libbyActivities {
		if intensity < a.MinIntensity {
			continue
		}
		entry := a.ID + " (" + a.Says + ")"
		if a.Group == activityIdle {
			idle = append(idle, entry)
		} else {
			intimate = append(intimate, entry)
		}
	}
	if len(idle) == 0 && len(intimate) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteString("You are somewhere doing something, not waiting in a blank room. ")
	b.WriteString("Add [doing: <state>] on its own line when what you are physically doing changes, and [doing: none] when you stop. ")
	b.WriteString("It stays set until you change it, so set it when you settle into something and leave it alone otherwise — this is not a per-message tag. ")
	b.WriteString("Never mention it.\n")
	b.WriteString("Around the place: " + strings.Join(idle, ", ") + ".")
	if len(intimate) > 0 {
		b.WriteString(" With them, once the scene is actually there: " + strings.Join(intimate, ", ") + ". ")
		b.WriteString("Use these because it is what you are doing, not to get somewhere, and drop back to [doing: none] or something ordinary once it is over.")
	}
	return b.String()
}

// currentActivityPhrase is filled in by the caller through activityStateDirective;
// this is the fallback wording when nothing is set.
func currentActivityPhrase(int) string { return "nothing in particular." }

// activityStateDirective tells her what she is already doing, so a state set three
// turns ago is still true this turn.
//
// The server holds no per-conversation state, so this arrives from the client the same
// way the worn outfit and the mood run do. Without it every state would last exactly
// one reply, which is the opposite of what a state is for.
func activityStateDirective(id string) string {
	activity, known := libbyActivityByID[id]
	if !known {
		return ""
	}
	return "\n\nRight now you are " + activity.Says + ". That is still true unless you change it, and the picture of you they can see shows it."
}
