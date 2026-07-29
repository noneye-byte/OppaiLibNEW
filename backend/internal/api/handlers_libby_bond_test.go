package api

import (
	"strings"
	"testing"
	"time"
)

func TestDecayHeat(t *testing.T) {
	now := time.Now()
	cases := []struct {
		name string
		bond libbyBond
		want float64
	}{
		{"no bond reads calm", libbyBond{}, 1},
		{"just stopped stays hot", libbyBond{Heat: 5, LastSeenAt: now.UnixMilli()}, 5},
		{"an hour cools a little", libbyBond{Heat: 5, LastSeenAt: now.Add(-1 * time.Hour).UnixMilli()}, 5 - heatDecayPerHour},
		{"a day is back to calm", libbyBond{Heat: 5, LastSeenAt: now.Add(-24 * time.Hour).UnixMilli()}, 1},
		{"never goes below one", libbyBond{Heat: 2, LastSeenAt: now.Add(-100 * time.Hour).UnixMilli()}, 1},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := decayHeat(c.bond, now)
			if diff := got - c.want; diff > 0.001 || diff < -0.001 {
				t.Fatalf("decayHeat = %v, want %v", got, c.want)
			}
		})
	}
}

func TestHumanizeGap(t *testing.T) {
	cases := []struct {
		d    time.Duration
		want string
	}{
		{30 * time.Second, ""},
		{10 * time.Minute, "a few minutes"},
		{2 * time.Hour, "a little while"},
		{5 * time.Hour, "a few hours"},
		{28 * time.Hour, "about a day"},
		{3 * 24 * time.Hour, "a few days"},
		{10 * 24 * time.Hour, "over a week"},
		{60 * 24 * time.Hour, "a long time"},
	}
	for _, c := range cases {
		if got := humanizeGap(c.d); got != c.want {
			t.Errorf("humanizeGap(%v) = %q, want %q", c.d, got, c.want)
		}
	}
}

func TestBondPromptBlock(t *testing.T) {
	now := time.Now()

	// A fresh user with no history gets no block, so a first conversation reads fresh.
	if got := bondPromptBlock(libbyBond{}, now); got != "" {
		t.Fatalf("empty bond should render nothing, got %q", got)
	}

	// Mid-conversation (just spoke): the gap/mood/afterglow lines stay silent because the
	// live history already carries them. A close bond still surfaces its standing facts.
	mid := libbyBond{LastSeenAt: now.Add(-30 * time.Second).UnixMilli(), Mood: "mischievous", Heat: 5, Warmth: 0.9, Petname: "trouble"}
	got := bondPromptBlock(mid, now)
	if strings.Contains(got, "since the two of you last talked") || strings.Contains(got, "were feeling") || strings.Contains(got, "warmed up") {
		t.Errorf("mid-conversation block should not restate gap/mood/afterglow, got %q", got)
	}
	if !strings.Contains(got, "trouble") {
		t.Errorf("standing pet name should always show, got %q", got)
	}

	// Returning after a real break: the gap, carried mood, and afterglow all surface.
	back := libbyBond{LastSeenAt: now.Add(-2 * time.Hour).UnixMilli(), Mood: "loving", Heat: 5, Warmth: 0.9, Petname: "trouble"}
	got = bondPromptBlock(back, now)
	for _, want := range []string{"since the two of you last talked", "were feeling loving", "warmed up", "trouble"} {
		if !strings.Contains(got, want) {
			t.Errorf("returning block missing %q, got %q", want, got)
		}
	}
}

func TestIdleMoodDrift(t *testing.T) {
	// Anchored mid-afternoon so the late-hours sleepy branch is not what is under test.
	now := time.Date(2026, 7, 23, 15, 0, 0, 0, time.Local)
	at := func(d time.Duration) int64 { return now.Add(-d).UnixMilli() }

	// A short absence holds the feeling exactly: step out for a coffee and she is still
	// annoyed with you.
	if mood, spontaneous := idleMoodDrift(libbyBond{Mood: "annoyed", LastSeenAt: at(30 * time.Minute)}, now); mood != "annoyed" || spontaneous {
		t.Errorf("short gap = (%q, %v), want (annoyed, false)", mood, spontaneous)
	}
	// Long enough to cool one step, but still hers rather than her own weather.
	if mood, spontaneous := idleMoodDrift(libbyBond{Mood: "annoyed", LastSeenAt: at(6 * time.Hour)}, now); mood != "thinking" || spontaneous {
		t.Errorf("settling gap = (%q, %v), want (thinking, false)", mood, spontaneous)
	}
	// Past a day it is her own mood, not a decayed copy of the one you left her in.
	overnight := libbyBond{Mood: "annoyed", LastSeenAt: at(30 * time.Hour), Warmth: 0.9}
	mood, _ := idleMoodDrift(overnight, now)
	if mood == "annoyed" {
		t.Errorf("a long gap should not hold the old mood, got %q", mood)
	}
	// Stable within the hour: the system prompt is the backend's cache prefix, so this
	// must not reroll from message to message.
	for i := 0; i < 5; i++ {
		if again, _ := idleMoodDrift(overnight, now.Add(time.Duration(i)*time.Minute)); again != mood {
			t.Fatalf("drift is not stable within the hour: %q then %q", mood, again)
		}
	}
	// The clock owns the small hours regardless of everything else.
	night := time.Date(2026, 7, 24, 2, 0, 0, 0, time.Local)
	if mood, spontaneous := idleMoodDrift(libbyBond{Mood: "excited", LastSeenAt: night.Add(-30 * time.Hour).UnixMilli()}, night); mood != "sleepy" || !spontaneous {
		t.Errorf("small hours = (%q, %v), want (sleepy, true)", mood, spontaneous)
	}
	// No history, nothing to drift.
	if mood, spontaneous := idleMoodDrift(libbyBond{}, now); mood != "" || spontaneous {
		t.Errorf("empty bond = (%q, %v), want (\"\", false)", mood, spontaneous)
	}
}

func TestSameCalendarDay(t *testing.T) {
	base := time.Date(2026, 7, 23, 23, 0, 0, 0, time.Local)
	if !sameCalendarDay(base, base.Add(30*time.Minute)) {
		t.Error("same evening should be the same day")
	}
	if sameCalendarDay(base, base.Add(2*time.Hour)) {
		t.Error("crossing midnight should be a new day")
	}
}
