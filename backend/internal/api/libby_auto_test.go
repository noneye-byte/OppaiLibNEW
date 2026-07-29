package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"
)

// A state with the defaults and nothing sent yet, ready to be poked at.
func freshAuto() libbyAutoState {
	return libbyAutoState{Settings: defaultLibbyAutoSettings(), Log: []libbyAutoEvent{}}
}

// Mid-afternoon, well clear of the default quiet hours.
func daytime() time.Time { return time.Date(2026, 7, 23, 15, 0, 0, 0, time.Local) }

func TestMayLibbySpeakAllowsAQuietConversation(t *testing.T) {
	decision := mayLibbySpeak(freshAuto(), triggerIdle, daytime())
	if !decision.Allow {
		t.Fatalf("a fresh state should allow an idle nudge, got %q", decision.Reason)
	}
	if decision.Reason == "" {
		t.Error("a decision must always explain itself, allowed or not")
	}
}

func TestMayLibbySpeakRespectsTheOffSwitch(t *testing.T) {
	state := freshAuto()
	state.Settings.Enabled = false
	decision := mayLibbySpeak(state, triggerWantArrived, daytime())
	if decision.Allow {
		t.Error("disabled must mean disabled, even for an important trigger")
	}
	if !strings.Contains(decision.Reason, "never to message first") {
		t.Errorf("the off switch should be named as the cause, got %q", decision.Reason)
	}
}

func TestMayLibbySpeakRespectsQuietHours(t *testing.T) {
	state := freshAuto() // quiet 01:00–09:00 by default
	night := time.Date(2026, 7, 24, 3, 0, 0, 0, time.Local)
	if decision := mayLibbySpeak(state, triggerIdle, night); decision.Allow {
		t.Error("she should not open a conversation at 3am")
	}
	// The window wraps midnight, which is the normal case for "overnight".
	state.Settings.QuietFrom, state.Settings.QuietTo = 22, 7
	for _, hour := range []int{22, 23, 0, 3, 6} {
		at := time.Date(2026, 7, 24, hour, 0, 0, 0, time.Local)
		if !inQuietHours(state.Settings, at) {
			t.Errorf("%02d:00 should be inside a 22:00–07:00 window", hour)
		}
	}
	for _, hour := range []int{7, 12, 21} {
		at := time.Date(2026, 7, 24, hour, 0, 0, 0, time.Local)
		if inQuietHours(state.Settings, at) {
			t.Errorf("%02d:00 should be outside a 22:00–07:00 window", hour)
		}
	}
	// Equal bounds mean no quiet hours at all, rather than a zero-length window nobody can
	// reason about.
	state.Settings.QuietFrom, state.Settings.QuietTo = 0, 0
	if inQuietHours(state.Settings, night) {
		t.Error("equal bounds should mean no quiet hours")
	}
}

func TestMayLibbySpeakGuardsAgainstLoops(t *testing.T) {
	now := daytime()
	state := freshAuto()
	state.LastAutoAt = now.Add(-2 * time.Minute).UnixMilli()
	decision := mayLibbySpeak(state, triggerIdle, now)
	if decision.Allow {
		t.Error("she must not send a second unprompted message two minutes after the first")
	}
	if decision.RetryAfterSec <= 0 {
		t.Error("a refusal on timing should say when to ask again")
	}
	// The floor holds even if the stored settings say otherwise: this is the loop guard, and a
	// hand-edited file must not be able to switch it off.
	state.Settings.MinGapMinutes = 0
	state.Settings.clamp()
	if mayLibbySpeak(state, triggerIdle, now).Allow {
		t.Error("the minimum gap must not be settable below the loop guard")
	}
}

func TestMayLibbySpeakBacksOffWhenIgnored(t *testing.T) {
	now := daytime()
	state := freshAuto()
	state.Unanswered = casualUnansweredLimit
	state.PausedUntil = now.Add(time.Hour).UnixMilli()

	if decision := mayLibbySpeak(state, triggerIdle, now); decision.Allow {
		t.Error("two unanswered messages should stop casual ones")
	} else if !strings.Contains(decision.Reason, "not replied") {
		t.Errorf("the back-off should say it is because she was ignored, got %q", decision.Reason)
	}
	// Something genuinely worth saying still gets through — that is the whole point of the
	// importance table.
	if decision := mayLibbySpeak(state, triggerWantArrived, now); !decision.Allow {
		t.Errorf("an important trigger should pass the casual back-off, got %q", decision.Reason)
	}
	// Unless the user has said they do not want that.
	state.Settings.AllowImportant = false
	if mayLibbySpeak(state, triggerWantArrived, now).Allow {
		t.Error("AllowImportant=false should make the back-off absolute")
	}
	// And there is a hard ceiling regardless.
	state.Settings.AllowImportant = true
	state.Unanswered = importantUnansweredLimit
	if decision := mayLibbySpeak(state, triggerWantArrived, now); decision.Allow {
		t.Error("five unanswered messages should silence her entirely")
	}
}

func TestMayLibbySpeakRespectsTheDailyCap(t *testing.T) {
	now := daytime()
	state := freshAuto()
	state.SentDay, state.SentToday = localDay(now), state.Settings.MaxPerDay
	if decision := mayLibbySpeak(state, triggerIdle, now); decision.Allow {
		t.Error("the daily cap should hold")
	}
	// Yesterday's count does not count against today.
	state.SentDay = localDay(now.AddDate(0, 0, -1))
	if !mayLibbySpeak(state, triggerIdle, now).Allow {
		t.Error("yesterday's messages should not count against today's cap")
	}
}

func TestMayLibbySpeakRejectsAnUnknownTrigger(t *testing.T) {
	// A client cannot invent a reason, which is what keeps importance a fixed rule rather than
	// something the caller asserts about itself.
	if decision := mayLibbySpeak(freshAuto(), autoTrigger("super-urgent"), daytime()); decision.Allow {
		t.Error("an unknown trigger must not be allowed")
	}
}

// The round trip through the endpoints: check, send, be ignored, then be answered.
func TestLibbyAutoEndpoints(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	// Quiet hours are on by default and the test may well run inside them, so widen the window
	// to nothing first — otherwise this test passes or fails depending on the clock.
	rec := do(t, h, token, http.MethodPut, "/api/libby/auto", `{"enabled":true,"quietFrom":0,"quietTo":0,"minGapMinutes":30,"maxPerDay":6,"allowImportant":true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("save settings: %d %s", rec.Code, rec.Body)
	}

	rec = do(t, h, token, http.MethodPost, "/api/libby/auto/check", `{"trigger":"idle"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("check: %d %s", rec.Code, rec.Body)
	}
	var decision autoDecision
	_ = json.Unmarshal(rec.Body.Bytes(), &decision)
	if !decision.Allow {
		t.Fatalf("first idle nudge refused: %q", decision.Reason)
	}

	rec = do(t, h, token, http.MethodPost, "/api/libby/auto/sent", `{"trigger":"idle","detail":"went quiet after the film"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("record sent: %d %s", rec.Code, rec.Body)
	}
	// Immediately afterwards the gap guard refuses, and the endpoint refuses too rather than
	// trusting the client to have asked first.
	rec = do(t, h, token, http.MethodPost, "/api/libby/auto/sent", `{"trigger":"idle"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("a second immediate message should be refused, got %d %s", rec.Code, rec.Body)
	}

	// The log records what fired, which is what makes "she keeps messaging me" diagnosable.
	rec = do(t, h, token, http.MethodGet, "/api/libby/auto", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "went quiet after the film") {
		t.Fatalf("get auto state: %d %s", rec.Code, rec.Body)
	}
	if !strings.Contains(rec.Body.String(), `"unanswered":1`) {
		t.Errorf("an unanswered message was not counted: %s", rec.Body)
	}

	// Answering clears the count and marks the waiting message as answered.
	if rec := do(t, h, token, http.MethodPost, "/api/libby/auto/answered", ""); rec.Code != http.StatusOK {
		t.Fatalf("answered: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodGet, "/api/libby/auto", "")
	if !strings.Contains(rec.Body.String(), `"unanswered":0`) {
		t.Errorf("replying should clear the unanswered count: %s", rec.Body)
	}
	if !strings.Contains(rec.Body.String(), `"answered":true`) {
		t.Errorf("the log should record that she was answered: %s", rec.Body)
	}
}
