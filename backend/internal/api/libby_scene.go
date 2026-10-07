package api

import (
	"fmt"
	"strings"
)

// A scene she plans.
//
// Left to herself, an evening with her goes from hello to the peak in four messages,
// because every reply is written fresh against the last one and the heat dial only
// knows "more". A person planning a night has a shape in mind — dinner, then the sofa,
// then — and lets each part last. plan_scene gives her that: a title and a handful of
// beats, stored on the conversation, shown to her every turn with the one she is on,
// and moved on only when she says so. The pacing stays hers; the plan is what keeps her
// from skipping it.

const (
	maxSceneBeats    = 6
	maxSceneBeatText = 160
)

type libbyScene struct {
	Title string   `json:"title"`
	Beats []string `json:"beats"`
	// Beat is the index of the beat under way. len(Beats) is a finished scene, which is
	// cleared rather than kept: a scene that is over is not one to be reminded of.
	Beat int `json:"beat"`
}

// normalizeScene bounds a scene from a client or a tool call, and drops one with
// nothing left to play.
func normalizeScene(sc *libbyScene) *libbyScene {
	if sc == nil {
		return nil
	}
	title, _ := cleanLimited(sc.Title, 120)
	var beats []string
	for _, b := range sc.Beats {
		b = strings.Join(strings.Fields(b), " ")
		if b == "" {
			continue
		}
		if len([]rune(b)) > maxSceneBeatText {
			b = string([]rune(b)[:maxSceneBeatText])
		}
		beats = append(beats, b)
		if len(beats) == maxSceneBeats {
			break
		}
	}
	if title == "" || len(beats) < 2 || sc.Beat < 0 || sc.Beat >= len(beats) {
		return nil
	}
	return &libbyScene{Title: title, Beats: beats, Beat: sc.Beat}
}

// planScene reads plan_scene's arguments.
func planScene(args map[string]any) *libbyScene {
	sc := &libbyScene{Title: argString(args, "title")}
	if list, ok := args["beats"].([]any); ok {
		for _, b := range list {
			if text, ok := b.(string); ok {
				sc.Beats = append(sc.Beats, text)
			}
		}
	}
	return normalizeScene(sc)
}

// advanceScene moves a scene on, returning nil when it is over.
func advanceScene(sc *libbyScene, how string) *libbyScene {
	if sc == nil {
		return nil
	}
	switch how {
	case "done":
		return nil
	case "next":
		next := *sc
		next.Beat++
		if next.Beat >= len(next.Beats) {
			return nil
		}
		return &next
	}
	return sc
}

// scenePromptBlock is the scene as she is reminded of it.
func scenePromptBlock(sc *libbyScene) string {
	if sc == nil {
		return ""
	}
	var b strings.Builder
	fmt.Fprintf(&b, "\n\nYou planned a scene: %s. ", sc.Title)
	for i, beat := range sc.Beats {
		switch {
		case i < sc.Beat:
			fmt.Fprintf(&b, "Done: %s. ", beat)
		case i == sc.Beat:
			fmt.Fprintf(&b, "Now (%d of %d): %s. ", i+1, len(sc.Beats), beat)
		default:
			fmt.Fprintf(&b, "Later: %s. ", beat)
		}
	}
	b.WriteString("Stay in the beat you are on until it has really happened, then move on with set_state's scene_beat. If they take it elsewhere, follow them — the plan is yours to drop.")
	return b.String()
}

// argString reads one string argument, trimmed. Models send numbers and booleans as
// strings and strings as numbers; a string argument is whatever prints as one.
func argString(args map[string]any, key string) string {
	switch v := args[key].(type) {
	case string:
		return strings.TrimSpace(v)
	case float64:
		return strings.TrimSpace(fmt.Sprintf("%g", v))
	case bool:
		return fmt.Sprintf("%t", v)
	}
	return ""
}

// argInt reads one integer argument, with the same tolerance.
func argInt(args map[string]any, key string) (int, bool) {
	switch v := args[key].(type) {
	case float64:
		return int(v), true
	case string:
		var n int
		if _, err := fmt.Sscanf(strings.TrimSpace(v), "%d", &n); err == nil {
			return n, true
		}
	}
	return 0, false
}

// argBool reads one boolean argument.
func argBool(args map[string]any, key string) bool {
	switch v := args[key].(type) {
	case bool:
		return v
	case string:
		return strings.EqualFold(strings.TrimSpace(v), "true") || strings.EqualFold(strings.TrimSpace(v), "yes")
	case float64:
		return v != 0
	}
	return false
}
