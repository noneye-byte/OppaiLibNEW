package api

import (
	"regexp"
	"strings"
	"time"
)

// What time it is where they are.
//
// She had rooms, clothes, a routine and a mood that drifts while they are away, and no
// idea whether it was Tuesday lunchtime or two in the morning. A person always knows:
// it decides whether they are up, what they have on, whether a message is a surprise,
// and what light is in the picture they send. So the turn carries the hour — theirs, from
// the device they are on, since that is the clock they are living by — and her prompt and
// her camera both read it.

// turnClock is the moment a turn happens in, in their time zone when the client said
// which one it is and it is a zone this binary knows, in the server's otherwise.
func turnClock(zone string, now time.Time) time.Time {
	if zone = strings.TrimSpace(zone); zone != "" && len(zone) <= 64 {
		if loc, err := time.LoadLocation(zone); err == nil {
			return now.In(loc)
		}
	}
	return now
}

// partOfDay is the hour as people say it.
func partOfDay(hour int) string {
	switch {
	case hour < 5 || hour >= 23:
		return "late night"
	case hour < 9:
		return "early morning"
	case hour < 12:
		return "morning"
	case hour < 17:
		return "afternoon"
	case hour < 20:
		return "evening"
	}
	return "night"
}

// clockDirective tells her when it is. It is in the tail rather than her card because
// it changes every turn, and the card is the prefix the backend caches.
func clockDirective(now time.Time) string {
	if now.IsZero() {
		return ""
	}
	return "\n\nIt is " + now.Format("Monday") + " " + partOfDay(now.Hour()) + " where they are — " +
		strings.ToLower(now.Format("3:04pm")) + ", " + now.Format("2 January") + " — and you live on the same clock. " +
		"What you are doing, how awake you are, what you have on and the light around you follow it: slow in the early morning, " +
		"winding down late at night, the weekend not a workday. Mention the time only when a person would."
}

// namedLight is a shot that already says what its light is; the clock does not argue.
// Phrases rather than words: "light blue dress" and "dark hair" say nothing about light.
var namedLight = regexp.MustCompile(`(?i)\b(?:(?:soft|warm|cold|cool|dim|bright|natural|window|morning|evening|night|sun|moon|lamp|candle|neon|studio|ring|harsh|low|golden|street|fairy|string|screen|tv|red|blue|pink|purple)\s+light(?:s|ing)?|lighting|\w+ly lit|lit by|candlelit|sunlight|sunlit|sunset|sunrise|golden hour|dusk|dawn|night|nighttime|darkness|dark room|in the dark|candlelight|lamplight|moonlight|daylight|daytime|backlit|backlighting|flash photography|camera flash)\b`)

// outdoorPlace is a place with sky over it.
var outdoorPlace = regexp.MustCompile(`(?i)\b(?:outside|outdoors?|beach|park|street|garden|yard|backyard|balcony|rooftop|pool|poolside|forest|woods|lake|river|field|city|sidewalk|patio|porch|mountain|trail|hiking|camping|sea|ocean|seaside|shore)\b`)

// shotLight is the light a picture taken at this moment would have, in generator words,
// or "" when the shot already names its own or there is no moment to go by. Without it
// her selfie at one in the morning was lit like noon, because nothing said otherwise and
// a checkpoint's default is a bright studio.
func shotLight(shot, place string, at time.Time) string {
	if at.IsZero() || namedLight.MatchString(shot) {
		return ""
	}
	outdoors := outdoorPlace.MatchString(place + " " + shot)
	switch part := partOfDay(at.Hour()); {
	case part == "late night" && outdoors, part == "night" && outdoors:
		return "night, night sky, moonlight"
	case part == "late night":
		return "night, dim lighting, warm bedside lamp light"
	case part == "night":
		return "night, warm lamp light, indoors"
	case part == "evening" && outdoors:
		return "evening, dusk"
	case part == "evening":
		return "evening, warm indoor lighting"
	case part == "early morning" && outdoors:
		return "early morning, soft dawn light"
	case part == "early morning":
		return "morning, soft daylight through window"
	case outdoors:
		return "daytime, bright daylight"
	}
	return "daytime, natural light from window"
}
