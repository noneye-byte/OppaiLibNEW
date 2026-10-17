package api

import (
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestTheClockIsTheirsWhenTheirZoneIsKnown(t *testing.T) {
	utc := time.Date(2026, 10, 16, 14, 30, 0, 0, time.UTC)
	if got := turnClock("Asia/Tokyo", utc); got.Hour() != 23 || got.Day() != 16 {
		t.Fatalf("Tokyo = %v, want 23:30 on the 16th", got)
	}
	// A zone this binary does not know, or none, is the server's clock rather than an error.
	for _, zone := range []string{"", "Mars/Olympus_Mons", strings.Repeat("x", 100)} {
		if got := turnClock(zone, utc); !got.Equal(utc) || got.Location() != time.UTC {
			t.Fatalf("zone %q = %v, want the time as given", zone, got)
		}
	}
}

func TestHerPromptSaysTheDayAndTheHourInWords(t *testing.T) {
	at := time.Date(2026, 10, 16, 23, 42, 0, 0, time.UTC)
	got := clockDirective(at)
	for _, want := range []string{"Friday late night", "11:42pm", "16 October"} {
		if !strings.Contains(got, want) {
			t.Fatalf("%q is missing %q", got, want)
		}
	}
	if clockDirective(time.Time{}) != "" {
		t.Fatal("no moment should say nothing")
	}
}

func TestAPictureIsLitForTheHourItIsTakenIn(t *testing.T) {
	day := func(h int) time.Time { return time.Date(2026, 10, 16, h, 0, 0, 0, time.UTC) }
	cases := []struct {
		shot, place string
		hour        int
		want        string
	}{
		{"sitting on bed, smiling", "her bedroom", 1, "bedside lamp"},
		{"sitting on bed, smiling", "her bedroom", 13, "natural light from window"},
		{"sitting on bed, smiling", "her bedroom", 7, "morning"},
		{"lying on the sofa", "living room", 21, "warm lamp light"},
		{"walking barefoot", "the beach", 22, "night sky"},
		{"walking barefoot", "the beach", 15, "bright daylight"},
		// A colour and a hair colour are not the light.
		{"light blue sundress, dark hair down", "kitchen", 2, "dim lighting"},
	}
	for _, c := range cases {
		if got := shotLight(c.shot, c.place, day(c.hour)); !strings.Contains(got, c.want) {
			t.Errorf("%q in %q at %d:00 = %q, want %q", c.shot, c.place, c.hour, got, c.want)
		}
	}
}

func TestAShotThatNamesItsOwnLightKeepsIt(t *testing.T) {
	at := time.Date(2026, 10, 16, 13, 0, 0, 0, time.UTC)
	for _, shot := range []string{"neon lights, city at night", "candlelit dinner", "golden hour, field", "dimly lit room", "in the dark, phone screen light"} {
		if got := shotLight(shot, "", at); got != "" {
			t.Errorf("%q was relit as %q", shot, got)
		}
	}
	if got := shotLight("selfie", "bedroom", time.Time{}); got != "" {
		t.Errorf("a picture with no moment was lit as %q", got)
	}
}

func TestAPictureSheTakesInATurnIsLitForTheirHour(t *testing.T) {
	const shot = "lying on bed, smiling"
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("one sec", callTool("p1", toolTakePhoto, map[string]any{"shot": shot, "framing": "selfie"}))
		}
		return http.StatusOK, say("there")
	})
	want := shotLight(shot, "", turnClock("Asia/Tokyo", time.Now()))
	runTurn(t, s, token, strings.Replace(firstTurn, `"messages"`, `"timeZone":"Asia/Tokyo","messages"`, 1))
	if len(f.gens) != 1 {
		t.Fatalf("generations = %d", len(f.gens))
	}
	if prompt := f.gens[0]["prompt"].(string); !strings.Contains(prompt, want) {
		t.Fatalf("prompt %q has no %q", prompt, want)
	}
}
