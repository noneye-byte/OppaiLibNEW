package api

import (
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
//   - It is optional art for an outfit. The bundled wardrobe draws every state here
//     (web/public/Libby_Default/default-libby-misc-<id>.png), and the clients fall to
//     that when a worn outfit has no picture for the state, then to the emotion art —
//     so declaring one never costs the user a broken sprite, and adding a state here
//     before its art exists costs only the picture. See libbyAssetCandidates.
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
	// Gen is the state in generator words — the tags a picture of her doing this is
	// prompted with when she draws herself from chat. Kept beside Says rather than
	// derived from it, because prose and booru tags are different languages: "curled
	// up dozing, barely awake" is not a prompt, "lying down, sleeping, closed eyes" is.
	Gen string `json:"-"`
	// MinIntensity is the heat below which this state is not available to her, on the
	// 1-5 session meter. Zero and one mean always.
	MinIntensity int `json:"minIntensity"`
	// Auto marks a state the app sets rather than one she declares. There is one:
	// typing. It used to be a state she could put herself into, which made no sense —
	// "at a keyboard, typing back to them" is what she is doing whenever a reply is on
	// its way, and the client already knows exactly when that is. So the slot is now
	// the picture behind the typing indicator: shown while a reply is being written,
	// with a speech bubble of dots beside it, and never chosen by a tag. The editor
	// says so beside the slot, and the directive leaves it out.
	Auto bool `json:"auto,omitempty"`
}

// libbyActivities is the MISC vocabulary.
//
// Order matters the way libbyEmotions' does: it is the order the wardrobe editor lays
// its slots out in, idle first. Nothing here is required of an outfit.
var libbyActivities = []libbyActivity{
	// ── idle ─────────────────────────────────────────────────────────────────
	// Shown by the client while she is composing a reply — the art behind the "…"
	// speech bubble — and never declared by her. See Auto.
	{ID: "typing", Label: "Typing", Group: activityIdle, Says: "typing a reply to them", Auto: true, Gen: "holding phone, typing"},
	{ID: "reading", Label: "Reading", Group: activityIdle, Says: "reading something, half paying attention", Gen: "reading, holding book"},
	{ID: "gaming", Label: "Gaming", Group: activityIdle, Says: "playing something, controller or keyboard in hand", Gen: "playing games, holding controller"},
	{ID: "lounging", Label: "Lounging", Group: activityIdle, Says: "sprawled out comfortably, doing nothing in particular", Gen: "lying on couch, relaxed, lounging"},
	{ID: "drinking", Label: "Drinking", Group: activityIdle, Says: "holding a mug, drinking something warm", Gen: "holding mug, drinking, steam"},
	{ID: "eating", Label: "Eating", Group: activityIdle, Says: "eating, talking around a mouthful", Gen: "eating, holding food, food in mouth"},
	{ID: "stretching", Label: "Stretching", Group: activityIdle, Says: "stretching, working a stiffness out", Gen: "stretching, arms up, arched back"},
	{ID: "napping", Label: "Napping", Group: activityIdle, Says: "curled up dozing, barely awake", Gen: "lying down, sleeping, closed eyes, blanket"},
	{ID: "dancing", Label: "Dancing", Group: activityIdle, Says: "moving to something playing, not really dancing", Gen: "dancing, headphones, motion"},
	{ID: "tidying", Label: "Tidying", Group: activityIdle, Says: "putting things away, keeping her hands busy", Gen: "tidying, holding box, shelves"},
	{ID: "drawing", Label: "Drawing", Group: activityIdle, Says: "drawing something, tongue between her teeth", Gen: "drawing, holding pencil, sketchbook, tongue out"},
	{ID: "waving", Label: "Waving", Group: activityIdle, Says: "waving at them, glad they are here", Gen: "waving, looking at viewer, smile"},

	// ── intimate ─────────────────────────────────────────────────────────────
	// The floors climb with how far in the state is. Three is where the meter sits
	// once a conversation has gone somewhere on purpose, so that is the earliest
	// anything here is available; the rest want a scene that is already underway.
	{ID: "undressing", Label: "Undressing", Group: activityIntimate, Says: "taking her clothes off, slowly", MinIntensity: 3, Gen: "undressing, clothes pull, partially undressed"},
	{ID: "teasing", Label: "Teasing", Group: activityIntimate, Says: "showing off for them, enjoying being looked at", MinIntensity: 3, Gen: "seductive pose, presenting, looking at viewer, naughty face"},
	{ID: "touching", Label: "Touching herself", Group: activityIntimate, Says: "touching herself over her clothes, not hiding it", MinIntensity: 3, Gen: "hand on own chest, hand between legs, clothed, blush"},
	{ID: "rubbing", Label: "Rubbing", Group: activityIntimate, Says: "rubbing herself, working up to it", MinIntensity: 4, Gen: "masturbation, hand between legs, rubbing, blush, open mouth"},
	{ID: "fingering", Label: "Fingering", Group: activityIntimate, Says: "fingering herself, fully into it", MinIntensity: 4, Gen: "female masturbation, fingering, spread legs, blush, heavy breathing"},
	{ID: "spread", Label: "Spread", Group: activityIntimate, Says: "spread open for them, letting them look", MinIntensity: 4, Gen: "spread legs, spread pussy, presenting, looking at viewer"},
	{ID: "vibrator", Label: "Vibrator", Group: activityIntimate, Says: "using a vibrator on herself", MinIntensity: 4, Gen: "vibrator, sex toy, female masturbation, trembling"},
	{ID: "dildo", Label: "Dildo", Group: activityIntimate, Says: "using a dildo, taking her time with it", MinIntensity: 4, Gen: "dildo, sex toy, insertion, female masturbation"},
	{ID: "riding", Label: "Riding", Group: activityIntimate, Says: "riding it, working herself on it", MinIntensity: 5, Gen: "riding dildo, squatting, sex toy, bouncing, ahegao"},
	{ID: "grinding", Label: "Grinding", Group: activityIntimate, Says: "grinding against something, chasing it", MinIntensity: 4, Gen: "grinding, pillow humping, straddling, blush"},
	{ID: "climax", Label: "Climax", Group: activityIntimate, Says: "coming, and not quiet about it", MinIntensity: 5, Gen: "orgasm, female ejaculation, trembling, ahegao, rolling eyes"},
	{ID: "afterglow", Label: "Afterglow", Group: activityIntimate, Says: "wrecked and boneless afterwards", MinIntensity: 3, Gen: "after sex, lying down, exhausted, messy hair, satisfied smile, sweat"},
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

// libbyActivityDeclarable reports whether a state is one she can be in between turns
// — every state but the app-driven ones. What the workspace and the request may
// carry as her current state.
func libbyActivityDeclarable(id string) bool {
	activity, ok := libbyActivityByID[id]
	return ok && !activity.Auto
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

// allowedActivity holds the heat gate.
//
// The directive asks her to keep the intimate states for scenes that have got there,
// which is a request to a model and therefore never a guarantee. This is the part that
// holds: below a state's floor it simply does not take, and she is left in whatever
// she was doing before. Silent rather than an error — a refused state is not something
// worth interrupting a reply over.
func allowedActivity(id string, intensity int) string {
	activity, known := libbyActivityByID[id]
	if !known || activity.Auto {
		return ""
	}
	if intensity < activity.MinIntensity {
		return ""
	}
	return id
}

// ── the lines they have drawn ───────────────────────────────────────────────
//
// A boundary in her memory ("they asked me never to bring up toys") is already the
// highest-ranked, never-evicted thing in her prompt, and a prompt is a request to a
// model. The heat gate exists because a request is not a guarantee, and a boundary
// deserves the same: a state that a remembered limit rules out is refused here, the
// way one below the heat floor is, so "no toys" holds on the turn the model forgets it.
//
// The matching is by words, and deliberately generous: a limit is written in the
// user's own terms by a model paraphrasing them, so "no toys", "doesn't like sex
// toys", "not into penetration" all have to land on the vibrator. A false positive
// costs one state she could have used; a false negative is a line crossed.

// activityLimitWords is, per intimate state, the words a boundary about it uses.
var activityLimitWords = map[string][]string{
	"undressing": {"undress", "strip", "naked", "nude", "nudity"},
	"teasing":    {"teasing", "tease", "showing off"},
	"touching":   {"touching herself", "touch herself", "masturbat"},
	"rubbing":    {"rubbing", "masturbat", "touching herself", "touch herself"},
	"fingering":  {"fingering", "finger", "masturbat", "penetrat"},
	"spread":     {"spread", "genital", "explicit"},
	"vibrator":   {"vibrator", "toy", "toys", "wand"},
	"dildo":      {"dildo", "toy", "toys", "penetrat", "insertion"},
	"riding":     {"dildo", "toy", "toys", "riding", "penetrat"},
	"grinding":   {"grinding", "humping", "masturbat"},
	"climax":     {"orgasm", "climax", "cumming", "coming", "masturbat"},
}

// blanketLimitWords are a boundary that rules the whole intimate half out.
var blanketLimitWords = []string{
	"nothing sexual", "no sexual", "not sexual", "keep it clean", "no nsfw", "nothing explicit",
	"no explicit", "not explicit", "sfw only", "no lewd", "nothing lewd", "no touching herself",
	"no masturbat", "not to masturbate", "never masturbate",
}

// activityLimits reads the boundaries out of her memory and returns the states they
// rule out. Only boundaries count: a preference ("they're not that into toys") is a
// thing to lean away from, not a line, and treating it as one would make her refuse
// things they merely said were not their favourite.
func activityLimits(store libbyMemoryStore) map[string]bool {
	out := map[string]bool{}
	for _, m := range store.Memories {
		if m.Kind != memoryBoundary {
			continue
		}
		text := strings.ToLower(m.Text)
		blanket := false
		for _, phrase := range blanketLimitWords {
			if strings.Contains(text, phrase) {
				blanket = true
				break
			}
		}
		for _, a := range libbyActivities {
			if a.Group != activityIntimate {
				continue
			}
			if blanket {
				out[a.ID] = true
				continue
			}
			for _, word := range activityLimitWords[a.ID] {
				if strings.Contains(text, word) {
					out[a.ID] = true
					break
				}
			}
		}
	}
	return out
}

// withinLimits is allowedActivity's other half: the state, or "" when a line they
// have drawn rules it out.
func withinLimits(id string, limits map[string]bool) string {
	if limits[id] {
		return ""
	}
	return id
}

// activityStateDirective tells her what she is already doing, so a state set three
// turns ago is still true this turn.
//
// The server holds no per-conversation state, so this arrives from the client the same
// way the worn outfit and the mood run do. Without it every state would last exactly
// one reply, which is the opposite of what a state is for.
func activityStateDirective(id string) string {
	activity, known := libbyActivityByID[id]
	if !known || activity.Auto {
		return ""
	}
	return "\n\nRight now you are " + activity.Says + ". That is still true unless you change it, and the picture of you they can see shows it."
}

// ── what they asked her to do, when she did it without the tag ──────────────
