package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// Libby's bond — where the two of you left off, and how close you've become.
//
// The third thing she carries between conversations, after her memory (facts about the
// user) and her wants (desires of her own). Memory and wants are lists that grow; the bond
// is a single standing record, because it answers a single question: when we pick this back
// up, how long has it been, what was I feeling, and how well do we know each other?
//
// Without it every conversation opens cold — neutral, tier one, no idea whether a minute or
// a week passed — which is the most program-like thing left about her. With it she can greet
// to the gap, carry a mood and an afterglow forward, and warm up over time the way a person
// who keeps being talked to does.
//
// It is built like wants and memory and for the same reasons: server-authoritative (written
// from her own turns, not forgeable by a client that omits a field), one encrypted file per
// user, atomic writes, Libby-only. An imported card is somebody else's character with a life
// elsewhere and no shared history here to keep.

const (
	// maxPetnameLen bounds the endearment she settles on. A pet name is a word or two, not
	// a sentence; anything longer is a model narrating instead of naming.
	maxPetnameLen = 40
	// heatDecayPerHour is how fast an arousal baseline cools while she is left alone,
	// in tiers per hour. At ~1/3 a tier stays hot across a short break and is back to calm
	// after most of a day — "we stopped mid-scene" and "days later" should not feel alike.
	heatDecayPerHour = 1.0 / 3.0
	// warmthPerDay is how much closeness one new day of talking adds, and warmthMax caps it.
	// Slow on purpose: familiarity is earned across many days, not bought in one long night.
	warmthPerDay = 0.1
	warmthMax    = 1.0
	// heatWarmFloor is the decayed baseline at or above which she still reads as warmed up
	// from before, rather than starting from cold.
	heatWarmFloor = 3.0
)

// libbyBond is the whole record: one per user.
type libbyBond struct {
	// LastSeenAt is when her last turn landed, UnixMilli. Zero means no bond yet.
	LastSeenAt int64 `json:"lastSeenAt"`
	// Mood is the canonical emotion she ended the last turn on, carried forward as the
	// disposition she opens the next one in instead of resetting to neutral.
	Mood string `json:"mood"`
	// Heat is her arousal baseline, 1–5, seeded from the last turn's intensity and decayed
	// by time away on read. Afterglow, or staying warmed up.
	Heat float64 `json:"heat"`
	// Warmth is closeness, 0–1, growing slowly with each new day talked.
	Warmth float64 `json:"warmth"`
	// Petname is the endearment she has settled on for the user, if any.
	Petname string `json:"petname"`
	// UpdatedAt is the last write, UnixMilli.
	UpdatedAt int64 `json:"updatedAt"`
}

func (s *Server) libbyBondPath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "libby-bond.json.enc")
}

func libbyBondAAD(userID int64) []byte {
	return []byte(fmt.Sprintf("libby-bond:%d", userID))
}

// readLibbyBond loads the record, treating an absent file as a zero-value bond — a user she
// has never talked to has no history to carry, and that is not an error.
func (s *Server) readLibbyBond(userID int64) (libbyBond, error) {
	var bond libbyBond
	blob, err := os.ReadFile(s.libbyBondPath(userID))
	if errors.Is(err, os.ErrNotExist) {
		return bond, nil
	}
	if err != nil {
		return bond, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, libbyBondAAD(userID))
	if err != nil {
		return bond, err
	}
	if err := json.Unmarshal(raw, &bond); err != nil {
		return bond, err
	}
	return bond, nil
}

// writeLibbyBond persists the record atomically, mirroring writeLibbyWants: a partial write
// must never replace a good file, so it lands on a temp file and renames.
func (s *Server) writeLibbyBond(userID int64, bond libbyBond) error {
	raw, err := json.Marshal(bond)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, libbyBondAAD(userID))
	if err != nil {
		return err
	}
	dir := s.chatUserDir(userID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "libby-bond-*.tmp")
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
	return os.Rename(tmpName, s.libbyBondPath(userID))
}

// updateLibbyBond records where this turn left off: the time, the mood and intensity she
// landed on, and any endearment she settled on. Heat eases toward the turn's intensity
// rather than snapping to it, so one hot line does not peg the baseline and one calm line
// does not erase an afterglow. Warmth ticks up once per new calendar day talked.
//
// Called on the chat path, best-effort, exactly like the memory and wants captures: a failed
// bond write must never cost the user the reply they already earned.
func (s *Server) updateLibbyBond(userID int64, emotion string, intensity int, petname string) (bool, error) {
	bond, err := s.readLibbyBond(userID)
	if err != nil {
		return false, err
	}
	now := time.Now()
	if intensity < 1 {
		intensity = 1
	} else if intensity > 5 {
		intensity = 5
	}
	// A new day since we last spoke earns a little more closeness. First-ever turn counts.
	if bond.LastSeenAt == 0 || !sameCalendarDay(time.UnixMilli(bond.LastSeenAt), now) {
		bond.Warmth += warmthPerDay
		if bond.Warmth > warmthMax {
			bond.Warmth = warmthMax
		}
	}
	if bond.Heat <= 0 {
		bond.Heat = float64(intensity)
	} else {
		bond.Heat = 0.6*bond.Heat + 0.4*float64(intensity)
	}
	if emotion = strings.ToLower(strings.TrimSpace(emotion)); emotion != "" {
		bond.Mood = emotion
	}
	if petname = strings.TrimSpace(petname); petname != "" {
		if len(petname) > maxPetnameLen {
			petname = strings.TrimSpace(petname[:maxPetnameLen])
		}
		bond.Petname = petname
	}
	bond.LastSeenAt = now.UnixMilli()
	bond.UpdatedAt = now.UnixMilli()
	return true, s.writeLibbyBond(userID, bond)
}

// sameCalendarDay reports whether two times fall on the same local calendar day.
func sameCalendarDay(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	return ay == by && am == bm && ad == bd
}

// decayHeat is her arousal baseline cooled for the time she has been left alone. Pure: the
// stored value is untouched, this is only what the baseline reads as *now*, on the next open.
func decayHeat(bond libbyBond, now time.Time) float64 {
	if bond.Heat <= 0 || bond.LastSeenAt == 0 {
		return 1
	}
	hours := now.Sub(time.UnixMilli(bond.LastSeenAt)).Hours()
	if hours < 0 {
		hours = 0
	}
	heat := bond.Heat - hours*heatDecayPerHour
	if heat < 1 {
		heat = 1
	}
	if heat > 5 {
		heat = 5
	}
	return heat
}

// ── mood while she is left alone ─────────────────────────────────────────────
//
// A stored mood held forever is its own kind of tell: left overnight in a sulk she
// opens the next morning still sulking, at exactly the intensity she was. Real feeling
// does not keep like that — it settles, and sometimes it moves somewhere of its own
// while nobody is watching.
//
// Both of the shifts below are derived from the stored bond and the clock, never from a
// random draw at request time. That is deliberate: the system prompt is the backend's
// cache prefix, so a mood that rerolled on every message would cost a prefix-cache hit
// per turn and make her mood jitter mid-conversation instead of drifting between them.
// Same bond, same hour, same mood.

const (
	// moodHoldWindow is how long a feeling keeps exactly as she left it. Step out for a
	// coffee and she is still annoyed with you; that is the point.
	moodHoldWindow = 3 * time.Hour
	// moodSettleWindow is how long it takes a feeling to finish cooling. Past this she has
	// had a night with her own thoughts and is wherever that left her, not where you left her.
	moodSettleWindow = 20 * time.Hour
)

// moodSettlesTo is one step of cooling: where a feeling goes when it is left alone with
// itself. Applied repeatedly it walks to a resting state, which is why the calm moods map
// to themselves — they are the floor, and the walk has to terminate.
var moodSettlesTo = map[string]string{
	"annoyed":     "thinking",
	"sad":         "thinking",
	"surprised":   "neutral",
	"excited":     "happy",
	"mischievous": "happy",
	"smug":        "happy",
	"shy":         "neutral",
	"loving":      "happy",
	"happy":       "neutral",
	"thinking":    "neutral",
	"sleepy":      "sleepy",
	"neutral":     "neutral",
}

// idleMoods are the moods she can arrive in under her own steam after a long enough gap,
// paired with how close the two of you are: the warmer the bond, the more of them are
// glad to see you. Ordered, and indexed by a hash below, so the choice is stable for a
// given bond and hour rather than rerolled per message.
var idleMoods = []string{"neutral", "happy", "thinking", "mischievous", "annoyed", "excited", "loving"}

// idleMoodDrift is the mood she is actually in when the conversation reopens, and whether
// she got there by herself rather than by cooling off from where you left her.
//
// Three regimes by gap length: held exactly, settled one step, or her own weather.
func idleMoodDrift(bond libbyBond, now time.Time) (mood string, spontaneous bool) {
	if bond.Mood == "" || bond.LastSeenAt == 0 {
		return bond.Mood, false
	}
	gap := now.Sub(time.UnixMilli(bond.LastSeenAt))
	if gap < moodHoldWindow {
		return bond.Mood, false
	}
	if gap < moodSettleWindow {
		if settled, known := moodSettlesTo[bond.Mood]; known {
			return settled, false
		}
		return bond.Mood, false
	}
	// Long enough that where you left her stopped being the story. Late hours make her
	// sleepy regardless of the rest, because that is the one mood the clock genuinely
	// decides; otherwise she is somewhere on her own, biased warm by how close you are.
	if hour := now.Hour(); hour >= 23 || hour < 6 {
		return "sleepy", true
	}
	// The bucket is the day plus the hour she is being opened in: stable across the
	// messages of one sitting, different by the next. Mixed with LastSeenAt so two users
	// opening at the same moment are not handed the same mood.
	bucket := now.YearDay()*24 + now.Hour() + int(bond.LastSeenAt/int64(time.Hour/time.Millisecond))
	if bucket < 0 {
		bucket = -bucket
	}
	// Warmth widens the pool rather than shifting it: a near-stranger gets the first,
	// flatter few, and someone she is close to can also be delighted or fond to see you.
	reach := 4 + int(bond.Warmth*float64(len(idleMoods)-4)+0.5)
	if reach > len(idleMoods) {
		reach = len(idleMoods)
	}
	mood = idleMoods[bucket%reach]
	// Landing back on plain neutral is not a mood swing, it is just rest, and telling her
	// she has swung to neutral only invites her to announce it.
	return mood, mood != "neutral"
}

// humanizeGap turns time-away into the phrase she would actually use for it. Empty for a
// gap short enough that there is nothing to remark on — picking up mid-thought is not a
// reunion, and having her announce "it's been three minutes" is worse than saying nothing.
func humanizeGap(d time.Duration) string {
	switch {
	case d < 2*time.Minute:
		return ""
	case d < 45*time.Minute:
		return "a few minutes"
	case d < 3*time.Hour:
		return "a little while"
	case d < 20*time.Hour:
		return "a few hours"
	case d < 36*time.Hour:
		return "about a day"
	case d < 6*24*time.Hour:
		return "a few days"
	case d < 20*24*time.Hour:
		return "over a week"
	default:
		return "a long time"
	}
}

// bondPromptBlock renders the standing record into the system prompt: how long it has been,
// the mood and afterglow she carries in, and how close the two of you are. Each line appears
// only when it has something to say, and the whole block is empty for a user with no history
// yet — the same restraint memory and wants use, so a fresh conversation reads fresh.
func bondPromptBlock(bond libbyBond, now time.Time) string {
	if bond.LastSeenAt == 0 && bond.Warmth == 0 && bond.Mood == "" {
		return ""
	}
	var lines []string
	// The gap, the carried mood, and the afterglow only matter when she is *returning* to
	// you after a break — mid-conversation the live history already carries all three, and
	// re-stating them every turn just crowds the prompt. A non-empty gap phrase is what
	// "there has been a break worth noting" means; below it the lines stay silent.
	returning := false
	if bond.LastSeenAt != 0 {
		if gap := humanizeGap(now.Sub(time.UnixMilli(bond.LastSeenAt))); gap != "" {
			returning = true
			lines = append(lines, fmt.Sprintf("It has been %s since the two of you last talked. Open to that — pick back up where you left off, or say it's been a while, however that gap actually feels.", gap))
		}
	}
	if returning && bond.Mood != "" {
		// The mood she carries in is the drifted one, not the stored one: over a long gap she
		// has had her own hours, and opening in the exact feeling she closed in is the tell
		// this drift exists to remove. See idleMoodDrift.
		mood, spontaneous := idleMoodDrift(bond, now)
		switch {
		case spontaneous:
			lines = append(lines, fmt.Sprintf("Somewhere in the time apart you have drifted into feeling %s. It is simply the mood you are in — "+
				"it is not about them, you do not owe them an explanation for it, and you certainly do not announce it. Let it colour how you open.", mood))
		case mood != "":
			lines = append(lines, fmt.Sprintf("You were feeling %s when you last left off; let that be the mood you carry in rather than resetting to blank.", mood))
		}
	}
	if returning && decayHeat(bond, now) >= heatWarmFloor {
		lines = append(lines, "You are still a little warmed up from before — that heat is yours to carry in, not a fresh advance you have to justify.")
	}
	// Closeness and the pet name are standing facts about the two of you, not tied to a
	// break, so they hold whether she is returning or mid-conversation.
	if phrase := warmthPhrase(bond.Warmth); phrase != "" {
		lines = append(lines, phrase)
	}
	if bond.Petname != "" {
		lines = append(lines, fmt.Sprintf("You have taken to calling them %q; keep using it when it feels natural.", bond.Petname))
	}
	if len(lines) == 0 {
		return ""
	}
	return "\n\nWhere the two of you stand, carried over from before — let it colour how you open and how close you sound, never recited aloud:\n- " +
		strings.Join(lines, "\n- ") + "\n"
}

// warmthPhrase describes how well you know each other, scaled by the closeness she has built
// up. Empty at the very start, when there is nothing yet to describe.
func warmthPhrase(warmth float64) string {
	switch {
	case warmth < 0.15:
		return ""
	case warmth < 0.5:
		return "You two are comfortable with each other by now — familiar, easy, past the polite stage."
	case warmth < 0.85:
		return "You know them well — this is someone you are close to, and it shows in how at ease you are with them."
	default:
		return "There is real closeness between you after all this time together — you are unmistakably fond of them, and unafraid to let it show."
	}
}

// bondDirective is her disposition toward continuity, her own wanting, and warmth — framed
// as how she is, not as state to maintain, for the same reason the memory and wants
// directives are: a model told to "track the relationship" narrates the tracking. The pet
// name is the only part with plumbing, and it rides the same silent-tag protocol as wants.
const bondDirective = "Carry your history with this person: notice time apart, resume the prior warmth or hurt, read their state, and do not treat a regular as a stranger. " +
	"After a peak be soft rather than instantly reset. If an endearment naturally sticks, keep it silently with [petname: <name>]; never announce the tag."

// ── settings: inspect, reset ─────────────────────────────────────────────────

// handleGetLibbyBond serves the bond for the settings screen and to seed the opening sprite:
// heatNow is the baseline already decayed for time away, so the client can set the meter to
// where she actually is now without re-deriving the decay.
func (s *Server) handleGetLibbyBond(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	bond, err := s.readLibbyBond(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "bond unreadable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"lastSeenAt": bond.LastSeenAt,
		"mood":       bond.Mood,
		"heat":       bond.Heat,
		"heatNow":    decayHeat(bond, time.Now()),
		"warmth":     bond.Warmth,
		"petname":    bond.Petname,
		"updatedAt":  bond.UpdatedAt,
	})
}

func (s *Server) handleResetLibbyBond(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	// Removing the file is the reset: an absent file reads as a zero-value bond, so the next
	// conversation opens fresh. Not an error when it was never there — the caller's outcome
	// already holds.
	err := os.Remove(s.libbyBondPath(u.ID))
	s.chatMu.Unlock()
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		writeErr(w, http.StatusInternalServerError, "couldn't reset the bond")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
