package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// When Libby is allowed to speak first.
//
// The client used to decide this on its own: one nudge per idle stretch, cleared whenever the
// user did anything. That is the right shape and far too little of it. It has no memory across
// page loads, so every refresh bought another nudge; no notion of night, so she opened
// conversations at 4am; no notion of being ignored, so an unanswered message was followed by
// another the moment the timer came round; and no record of why any of it fired, so "she keeps
// messaging me" was not diagnosable.
//
// The decision therefore moves here, where the state survives a reload and is shared between
// the web client and the phone. The client still owns the *timer* — it is the thing that knows
// whether anyone is looking at the screen — but it must ask before sending, and say afterwards
// what it sent and why.
//
// Built like her memory, wants and bond: one encrypted file per user, atomic writes,
// server-authoritative, Libby-only.

const (
	// casualUnansweredLimit is how many unanswered messages she will send before backing off.
	// Two: one is a nudge, two is trying again, three is pestering someone who is not there.
	casualUnansweredLimit = 2
	// backoffAfterUnanswered is how long casual messages pause once that limit is hit. Long
	// enough to be a different part of the day, so she comes back as someone picking the
	// conversation up rather than as a retry loop.
	backoffAfterUnanswered = 5 * time.Hour
	// importantUnansweredLimit is the ceiling for anything she has judged genuinely worth
	// saying. The brief's five, and it is a hard stop: past this she is silent until answered,
	// however important the trigger claims to be.
	importantUnansweredLimit = 5
	// minAutoGap is the floor between two unprompted messages of any kind. This is also the
	// loop guard: her own message cannot become the trigger for the next one inside it.
	minAutoGap = 20 * time.Minute
	// autoReasonLog bounds the kept record of what fired and why.
	autoReasonLog = 20
)

// libbyAutoSettings is the user's control over all of it.
//
// Defaults are chosen so an untouched install behaves like the old client-side nudge but
// politely: on, quiet overnight, and no more than a couple of messages an hour.
type libbyAutoSettings struct {
	// Enabled is the complete off switch. When false nothing below is consulted.
	Enabled bool `json:"enabled"`
	// QuietFrom and QuietTo are local hours, 0–23, during which she does not start anything.
	// Equal values mean no quiet hours. The window wraps midnight when From > To, which is
	// the normal case for "overnight".
	QuietFrom int `json:"quietFrom"`
	QuietTo   int `json:"quietTo"`
	// MinGapMinutes is the user's own floor between unprompted messages, never below minAutoGap.
	MinGapMinutes int `json:"minGapMinutes"`
	// MaxPerDay caps how many she may start in one local day, 0 for no cap beyond the rest.
	MaxPerDay int `json:"maxPerDay"`
	// AllowImportant lets the important triggers past the casual back-off. Off makes her
	// strictly two-messages-then-silent, which is what someone who found her chatty will want.
	AllowImportant bool `json:"allowImportant"`
}

func defaultLibbyAutoSettings() libbyAutoSettings {
	return libbyAutoSettings{
		Enabled: true, QuietFrom: 1, QuietTo: 9, MinGapMinutes: 30, MaxPerDay: 6, AllowImportant: true,
	}
}

func (a *libbyAutoSettings) clamp() {
	a.QuietFrom = clampInt(a.QuietFrom, 0, 23)
	a.QuietTo = clampInt(a.QuietTo, 0, 23)
	a.MinGapMinutes = clampInt(a.MinGapMinutes, int(minAutoGap/time.Minute), 24*60)
	a.MaxPerDay = clampInt(a.MaxPerDay, 0, 50)
}

// libbyAutoEvent is one record of her having spoken first, kept for the user to inspect.
//
// The brief asks for why each automated message was triggered to be recorded for debugging,
// and this is it. Kept deliberately small — a trigger name, an importance, the time — because
// the useful question is "what keeps setting her off", not "what did she say".
type libbyAutoEvent struct {
	At         int64  `json:"at"`
	Trigger    string `json:"trigger"`
	Importance int    `json:"importance"`
	// Detail is the trigger's own short explanation, e.g. which want turned up.
	Detail string `json:"detail,omitempty"`
	// Answered records whether the user ever replied to this one. Written retroactively when
	// they do, which is what makes the log show her being ignored rather than just her talking.
	Answered bool `json:"answered,omitempty"`
}

// libbyAutoState is the whole file.
type libbyAutoState struct {
	Settings libbyAutoSettings `json:"settings"`
	// Unanswered counts consecutive unprompted messages with no reply since.
	Unanswered int `json:"unanswered"`
	// LastAutoAt is when she last spoke first, UnixMilli.
	LastAutoAt int64 `json:"lastAutoAt"`
	// SentToday and SentDay implement the daily cap. The day is stored as a local date string
	// rather than a count of days, so a timezone change cannot make the counter meaningless.
	SentToday int    `json:"sentToday"`
	SentDay   string `json:"sentDay"`
	// PausedUntil is set when the casual back-off engages, UnixMilli.
	PausedUntil int64 `json:"pausedUntil"`
	// Log is the recent history, newest last.
	Log []libbyAutoEvent `json:"log"`
}

// ── triggers ─────────────────────────────────────────────────────────────────
//
// A trigger is a named reason with a fixed importance. Naming them, rather than letting the
// caller pass an importance, is the brief's "importance must be based on explicit rules and
// confidence thresholds, not arbitrary repeated model generation" — a client cannot declare
// its own nudge urgent, and a model is never asked to rate itself.

// autoTrigger names why she is speaking first.
type autoTrigger string

const (
	// triggerIdle is the plain one: the conversation went quiet and she has something to say.
	triggerIdle autoTrigger = "idle"
	// triggerMood is her own weather — a mood that arrived while she was alone.
	triggerMood autoTrigger = "mood"
	// triggerAbsence is a long gap she is remarking on.
	triggerAbsence autoTrigger = "absence"
	// triggerWantArrived is something she has been wanting appearing on the shelves. Important:
	// it is about her, it is specific, and it is the kind of thing a person would actually
	// message you unprompted about.
	triggerWantArrived autoTrigger = "want-arrived"
	// triggerUnfinished is something they left part-way through.
	triggerUnfinished autoTrigger = "unfinished"
)

// autoTriggerImportance is the fixed rule table. Anything above importanceFloor may continue
// past the casual back-off, up to importantUnansweredLimit.
var autoTriggerImportance = map[autoTrigger]int{
	triggerIdle:        0,
	triggerMood:        0,
	triggerAbsence:     1,
	triggerUnfinished:  1,
	triggerWantArrived: 2,
}

// importanceFloor is what counts as "unusually important". Set above the casual triggers and
// below the specific ones, so the distinction is a property of the trigger table rather than
// of anything a caller says about itself.
const importanceFloor = 2

func (t autoTrigger) importance() (int, bool) {
	importance, known := autoTriggerImportance[t]
	return importance, known
}

// ── persistence ──────────────────────────────────────────────────────────────

func (s *Server) libbyAutoPath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "libby-auto.json.enc")
}

func libbyAutoAAD(userID int64) []byte {
	return []byte(fmt.Sprintf("libby-auto:%d", userID))
}

// readLibbyAuto loads the state, treating an absent file as the defaults — a user who has
// never had her speak first has no file, and that is not an error.
func (s *Server) readLibbyAuto(userID int64) (libbyAutoState, error) {
	state := libbyAutoState{Settings: defaultLibbyAutoSettings(), Log: []libbyAutoEvent{}}
	blob, err := os.ReadFile(s.libbyAutoPath(userID))
	if errors.Is(err, os.ErrNotExist) {
		return state, nil
	}
	if err != nil {
		return state, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, libbyAutoAAD(userID))
	if err != nil {
		return state, err
	}
	if err := json.Unmarshal(raw, &state); err != nil {
		return state, err
	}
	if state.Log == nil {
		state.Log = []libbyAutoEvent{}
	}
	// A file written before a field existed, or edited by hand, is clamped rather than trusted:
	// a MinGapMinutes of 0 would turn the loop guard off entirely.
	state.Settings.clamp()
	return state, nil
}

// writeLibbyAuto persists atomically, mirroring the other Libby stores: a partial write must
// never replace a good file, so it lands on a temp file and renames.
func (s *Server) writeLibbyAuto(userID int64, state libbyAutoState) error {
	if state.Log == nil {
		state.Log = []libbyAutoEvent{}
	}
	if len(state.Log) > autoReasonLog {
		state.Log = state.Log[len(state.Log)-autoReasonLog:]
	}
	raw, err := json.Marshal(state)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, libbyAutoAAD(userID))
	if err != nil {
		return err
	}
	dir := s.chatUserDir(userID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, "libby-auto-*.tmp")
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
	return os.Rename(tmpName, s.libbyAutoPath(userID))
}

// ── the decision ─────────────────────────────────────────────────────────────

// autoDecision is the answer to "may she say something now?".
//
// Reason is populated whether or not she may, and is written for a person: it is what the
// settings screen shows to explain her silence, and what a bug report quotes. A refusal
// nobody can read is how "why won't she ever message me" becomes unanswerable.
type autoDecision struct {
	Allow  bool   `json:"allow"`
	Reason string `json:"reason"`
	// RetryAfterSec is when it is worth asking again, so a client can set its timer from the
	// server's own arithmetic instead of guessing.
	RetryAfterSec int64 `json:"retryAfterSec,omitempty"`
	// Trigger and Importance echo what was asked about, so a client logging the answer has it.
	Trigger    string `json:"trigger"`
	Importance int    `json:"importance"`
}

// inQuietHours reports whether a local hour falls inside the quiet window, which may wrap
// midnight.
func inQuietHours(settings libbyAutoSettings, now time.Time) bool {
	if settings.QuietFrom == settings.QuietTo {
		return false
	}
	hour := now.Hour()
	if settings.QuietFrom < settings.QuietTo {
		return hour >= settings.QuietFrom && hour < settings.QuietTo
	}
	// Wrapped: 22 → 7 means late evening through early morning.
	return hour >= settings.QuietFrom || hour < settings.QuietTo
}

// localDay is the date key the daily cap counts against. A date string rather than a count of
// days, so a timezone change cannot silently renumber the days and make the counter mean
// something else.
func localDay(now time.Time) string { return now.Format("2006-01-02") }

// nextHour is the top of the hour after this one.
func nextHour(now time.Time) time.Time {
	return time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, now.Location()).Add(time.Hour)
}

// nextLocalMidnight is when the daily cap resets.
//
// Built from the calendar rather than by truncating to 24 hours: Truncate works on the instant
// since the epoch, so it lands on UTC midnight, which is the wrong time of day everywhere that
// is not on UTC — and it would put the reset hours early or late for the user whose local day
// the cap is counted in.
func nextLocalMidnight(now time.Time) time.Time {
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, 1)
}

// mayLibbySpeak decides. Pure, given the state and the clock, so the rules are testable
// without touching disk or a request.
//
// The checks run cheapest and most absolute first, and each returns its own reason. Ordering
// matters for the message the user reads: "you turned this off" is a better answer than "she
// is in her quiet hours", even when both are true.
func mayLibbySpeak(state libbyAutoState, trigger autoTrigger, now time.Time) autoDecision {
	importance, known := trigger.importance()
	decision := autoDecision{Trigger: string(trigger), Importance: importance}
	if !known {
		decision.Reason = "Unrecognised trigger, so nothing was sent. This is a bug in the client, not a setting."
		return decision
	}
	settings := state.Settings
	if !settings.Enabled {
		decision.Reason = "Libby is set never to message first."
		return decision
	}
	if inQuietHours(settings, now) {
		decision.Reason = fmt.Sprintf("It is her quiet hours (%02d:00–%02d:00), so she leaves you alone.", settings.QuietFrom, settings.QuietTo)
		// Worth asking again at the top of the next hour rather than in a minute. Measured
		// against the now that was passed in, not the wall clock: this function is pure so it
		// can be tested at an arbitrary hour, and time.Until would quietly reintroduce the
		// real clock and make every quiet-hours test depend on when it ran.
		decision.RetryAfterSec = int64(nextHour(now).Sub(now).Seconds()) + 1
		return decision
	}
	// The loop guard, and the frequency floor, in one check: her own message cannot trigger
	// the next one inside this window however it is dressed up.
	gap := time.Duration(settings.MinGapMinutes) * time.Minute
	if gap < minAutoGap {
		gap = minAutoGap
	}
	if state.LastAutoAt != 0 {
		since := now.Sub(time.UnixMilli(state.LastAutoAt))
		if since < gap {
			decision.Reason = fmt.Sprintf("She messaged first %s ago; she waits at least %s between unprompted messages.",
				roundDuration(since), roundDuration(gap))
			decision.RetryAfterSec = int64((gap - since).Seconds()) + 1
			return decision
		}
	}
	if settings.MaxPerDay > 0 && state.SentDay == localDay(now) && state.SentToday >= settings.MaxPerDay {
		decision.Reason = fmt.Sprintf("She has already started %d conversations today, which is her limit.", settings.MaxPerDay)
		decision.RetryAfterSec = int64(nextLocalMidnight(now).Sub(now).Seconds()) + 1
		return decision
	}
	important := importance >= importanceFloor && settings.AllowImportant
	// Being ignored. Casual messages stop at the limit and stay stopped for a few hours;
	// something genuinely worth saying may continue, up to a hard ceiling.
	if state.Unanswered >= casualUnansweredLimit && !important {
		if state.PausedUntil != 0 && now.Before(time.UnixMilli(state.PausedUntil)) {
			decision.Reason = fmt.Sprintf("You have not replied to her last %d messages, so she has gone quiet for a while.", state.Unanswered)
			decision.RetryAfterSec = int64(time.UnixMilli(state.PausedUntil).Sub(now).Seconds()) + 1
			return decision
		}
		if state.PausedUntil == 0 {
			// The limit has just been reached and nothing has set the pause yet. Refuse and say
			// so; recordLibbyAuto sets PausedUntil when the message that hit the limit was sent,
			// so this only happens to a state written by an older build.
			decision.Reason = fmt.Sprintf("You have not replied to her last %d messages, so she is waiting rather than sending another.", state.Unanswered)
			decision.RetryAfterSec = int64(backoffAfterUnanswered.Seconds())
			return decision
		}
	}
	if state.Unanswered >= importantUnansweredLimit {
		decision.Reason = fmt.Sprintf("She has sent %d messages with no reply. She will not send more until you answer.", state.Unanswered)
		return decision
	}
	decision.Allow = true
	switch {
	case important:
		decision.Reason = fmt.Sprintf("%s — important enough to say even though you have not replied.", triggerDescription(trigger))
	default:
		decision.Reason = triggerDescription(trigger)
	}
	return decision
}

// triggerDescription is the human sentence for a trigger, used in the decision and the log.
func triggerDescription(trigger autoTrigger) string {
	switch trigger {
	case triggerIdle:
		return "The conversation went quiet and she had something to say."
	case triggerMood:
		return "Her mood shifted while she was on her own."
	case triggerAbsence:
		return "It had been a long time since you last talked."
	case triggerWantArrived:
		return "Something she had been wanting turned up on the shelves."
	case triggerUnfinished:
		return "You left something part-way through."
	default:
		return string(trigger)
	}
}

// roundDuration is a short phrase for a gap, for the reasons above. Minutes below an hour,
// hours above it — nobody needs "1h37m12s" in an explanation.
func roundDuration(d time.Duration) string {
	switch {
	case d < time.Minute:
		return "less than a minute"
	case d < time.Hour:
		return fmt.Sprintf("%d minutes", int(d.Minutes()))
	case d < 36*time.Hour:
		return fmt.Sprintf("%.0f hours", d.Hours())
	default:
		return fmt.Sprintf("%d days", int(d.Hours()/24))
	}
}

// recordLibbyAuto notes that she did speak, and engages the back-off if this was the message
// that reached the casual limit.
func (s *Server) recordLibbyAuto(userID int64, trigger autoTrigger, detail string) (libbyAutoState, error) {
	state, err := s.readLibbyAuto(userID)
	if err != nil {
		return state, err
	}
	now := time.Now()
	importance, _ := trigger.importance()
	if len(detail) > 200 {
		detail = detail[:200]
	}
	state.Unanswered++
	state.LastAutoAt = now.UnixMilli()
	if state.SentDay != localDay(now) {
		state.SentDay, state.SentToday = localDay(now), 0
	}
	state.SentToday++
	// Set the pause as soon as the limit is reached, rather than discovering it on the next
	// request: the decision then only has to compare against a timestamp, and a client that
	// never asks again cannot leave the state in a half-committed spot.
	if state.Unanswered >= casualUnansweredLimit {
		state.PausedUntil = now.Add(backoffAfterUnanswered).UnixMilli()
	}
	state.Log = append(state.Log, libbyAutoEvent{
		At: now.UnixMilli(), Trigger: string(trigger), Importance: importance, Detail: strings.TrimSpace(detail),
	})
	return state, s.writeLibbyAuto(userID, state)
}

// answerLibbyAuto clears the back-off because the user replied.
//
// The brief asks for the delay to be reset or reduced on a reply. Reset, not reduced: someone
// answering is the signal that she was not being ignored, and carrying a penalty past it would
// make her cagey with the people who do talk to her.
func (s *Server) answerLibbyAuto(userID int64) (libbyAutoState, error) {
	state, err := s.readLibbyAuto(userID)
	if err != nil {
		return state, err
	}
	if state.Unanswered == 0 && state.PausedUntil == 0 {
		return state, nil // nothing to clear; no disk write for an ordinary message
	}
	// Mark the messages that were waiting on this reply as answered, so the log distinguishes
	// "she messaged and was ignored" from "she messaged and they talked".
	for i := len(state.Log) - 1; i >= 0 && state.Unanswered > 0; i-- {
		if !state.Log[i].Answered {
			state.Log[i].Answered = true
			state.Unanswered--
		}
	}
	state.Unanswered, state.PausedUntil = 0, 0
	return state, s.writeLibbyAuto(userID, state)
}

// ── endpoints ────────────────────────────────────────────────────────────────

// handleGetLibbyAuto serves the settings, the state, and whether a plain idle nudge would be
// allowed right now — which is what the settings screen needs to explain her silence without
// the user having to wait and find out.
func (s *Server) handleGetLibbyAuto(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	state, err := s.readLibbyAuto(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read her messaging settings")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"settings":   state.Settings,
		"unanswered": state.Unanswered,
		"lastAutoAt": state.LastAutoAt,
		"sentToday":  state.SentToday,
		"log":        state.Log,
		"idle":       mayLibbySpeak(state, triggerIdle, time.Now()),
	})
}

func (s *Server) handlePutLibbyAutoSettings(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var in libbyAutoSettings
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	in.clamp()
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	state, err := s.readLibbyAuto(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read her messaging settings")
		return
	}
	state.Settings = in
	// Turning the feature back on clears a stale back-off: the user has just said they want to
	// hear from her, and making them wait out a pause from before they changed their mind is
	// the setting appearing not to work.
	if in.Enabled {
		state.PausedUntil, state.Unanswered = 0, 0
	}
	if err := s.writeLibbyAuto(u.ID, state); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save her messaging settings")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"settings": state.Settings})
}

type libbyAutoCheckReq struct {
	Trigger string `json:"trigger"`
	Detail  string `json:"detail,omitempty"`
}

// handleCheckLibbyAuto answers "may she say something now?" without changing anything.
//
// Separate from recording it on purpose: generating her message can fail, and a check that
// spent the allowance would let a broken backend silence her for hours.
func (s *Server) handleCheckLibbyAuto(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var in libbyAutoCheckReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	s.chatMu.Lock()
	state, err := s.readLibbyAuto(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read her messaging settings")
		return
	}
	writeJSON(w, http.StatusOK, mayLibbySpeak(state, autoTrigger(strings.TrimSpace(in.Trigger)), time.Now()))
}

// handleRecordLibbyAuto notes that she did speak first, and why.
//
// The decision is re-checked here rather than taken on trust. A client that asked, then took a
// minute to generate, then sent, would otherwise be able to slip past a limit that was reached
// in between — and a client with a bug could ignore the check entirely.
func (s *Server) handleRecordLibbyAuto(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var in libbyAutoCheckReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	trigger := autoTrigger(strings.TrimSpace(in.Trigger))
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	state, err := s.readLibbyAuto(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read her messaging settings")
		return
	}
	if decision := mayLibbySpeak(state, trigger, time.Now()); !decision.Allow {
		writeJSON(w, http.StatusConflict, decision)
		return
	}
	if _, err := s.recordLibbyAuto(u.ID, trigger, in.Detail); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't record that")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleAnswerLibbyAuto is the client saying the user replied, so the back-off clears.
func (s *Server) handleAnswerLibbyAuto(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	_, err := s.answerLibbyAuto(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't clear her back-off")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
