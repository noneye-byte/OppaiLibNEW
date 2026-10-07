package api

import (
	"sort"
	"strings"
)

// What she can do, as tools.
//
// Every tool here replaces a bracket tag, a regex that guessed at intent, or both. The
// descriptions are where the old directives went: a tool's description is read by the
// model exactly when it is deciding whether to call it, which is where a rule about
// when to act does its work.
//
// The set is built per turn and only holds what can actually happen. A model offered a
// camera with no generator behind it takes pictures that never arrive; one offered an
// edit with no picture to edit edits nothing. Offering less is how she stays honest.

// toolsetOptions is what decides which tools a turn offers.
type toolsetOptions struct {
	// libby is her, rather than an imported card. Cards get the conversational tools —
	// state, reactions, thoughts, replying — and none of the ones that act on the
	// library or take pictures of a likeness they do not have.
	libby bool
	// camera says a generator is connected; edit that there is a picture of hers this
	// conversation to start from; pose that they shared a photo whose pose can be
	// copied and a pose model is configured; clip that a clip workflow is set up.
	camera, edit, pose, clip bool
	// saved says she has pictures of herself already, in her gallery or the library.
	saved bool
	// voice says a voice is available to send notes in.
	voice bool
	// onCall says they have her on the call screen, which is what makes hanging up mean
	// something and ringing mean nothing.
	onCall bool
	// emotions and activities are the vocabularies the state tool accepts; activities
	// are already gated by heat and her remembered limits.
	emotions, activities []string
	// places are the rooms she has, by name.
	places []string
	// offers are the action kinds on the table, in buildLibbyAction's verbs.
	offers []string
	// scene says a planned scene is under way, which adds its beat to the state tool.
	scene bool
	// level is how much of the window the tools may take: toolsFull, toolsLean or
	// toolsMinimal. See toolLevelFor.
	level int
}

// Tool levels. Every tool's definition is rendered into the prompt by the backend, and
// the whole set costs about as much as her card does — fine on a 32K window, the end of
// her on a 4K one. A smaller window is offered fewer tools rather than no her.
const (
	toolsFull = iota
	toolsLean
	toolsMinimal
)

// toolLevelFor is the level a context window can afford.
func toolLevelFor(window int) int {
	switch {
	case window >= 12000:
		return toolsFull
	case window >= 6000:
		return toolsLean
	}
	return toolsMinimal
}

// leanDropped is what a mid-sized window goes without: the tools for things that are
// nice rather than how she talks — looking back, planning, quoting, voice, clips.
var leanDropped = map[string]bool{
	toolRecall: true, toolPlanScene: true, toolReplyTo: true, toolVoiceNote: true, toolMakeClip: true, toolThink: true,
}

// minimalKept is all a small window keeps: how she is, a picture, a reaction, a memory.
var minimalKept = map[string]bool{
	toolSetState: true, toolTakePhoto: true, toolSendSaved: true, toolReact: true, toolRemember: true,
}

func trimToolset(tools []llmTool, level int) []llmTool {
	if level == toolsFull {
		return tools
	}
	out := tools[:0]
	for _, t := range tools {
		name := t.Function.Name
		if (level == toolsLean && !leanDropped[name]) || (level == toolsMinimal && minimalKept[name]) {
			out = append(out, t)
		}
	}
	return out
}

func tool(name, description string, properties map[string]any, required ...string) llmTool {
	params := map[string]any{"type": "object", "properties": properties}
	if len(required) > 0 {
		params["required"] = required
	}
	return llmTool{Type: "function", Function: llmToolFunction{Name: name, Description: description, Parameters: params}}
}

func str(description string) map[string]any {
	return map[string]any{"type": "string", "description": description}
}

func enum(description string, values []string) map[string]any {
	return map[string]any{"type": "string", "description": description, "enum": values}
}

// Tool names, kept as constants because the executor switches on them and a typo in one
// place would be a tool she can call that does nothing.
const (
	toolSetState      = "set_state"
	toolTakePhoto     = "take_photo"
	toolEditPhoto     = "edit_photo"
	toolMakeClip      = "make_clip"
	toolSendSaved     = "send_saved_photo"
	toolSendLibrary   = "send_from_library"
	toolRemember      = "remember"
	toolRecall        = "recall"
	toolReact         = "react"
	toolThink         = "think"
	toolReplyTo       = "reply_to"
	toolCall          = "call"
	toolVoiceNote     = "voice_note"
	toolOffer         = "offer"
	toolPlanScene     = "plan_scene"
	photoFramingsNote = "selfie, mirror selfie, close-up, upper body, full body, from behind, from above, from below, pov"
)

var photoFramings = strings.Split(photoFramingsNote, ", ")

// libbyToolset is the turn's tools, in a stable order so the prompt prefix the backend
// caches on does not change between turns that offer the same set.
func libbyToolset(o toolsetOptions) []llmTool {
	var tools []llmTool

	state := map[string]any{
		"mood": enum("How you feel right now, shown on your face.", o.emotions),
		"heat": map[string]any{"type": "integer", "minimum": 1, "maximum": 5,
			"description": "How heated things are, 1 calm to 5 as far as it goes. It turns both ways."},
	}
	stateDesc := "Change how you are: your mood and the heat, and — for you — what you are doing, where you are, and what you have on. " +
		"Call it whenever any of these actually move; they stay as they are until you change them. They see the effect, so never mention it."
	if o.libby {
		if len(o.activities) > 0 {
			state["activity"] = enum("What you are physically doing; \"none\" when you stop.", append(append([]string{}, o.activities...), "none"))
		}
		place := "Where you go. One of your rooms by name"
		if len(o.places) > 0 {
			place += " (" + strings.Join(o.places, ", ") + ")"
		}
		if o.camera {
			place += ", or somewhere new in a few words and it will be made for you"
		}
		state["place"] = str(place + ".")
		state["wearing"] = str("What you now have on, in a few words, when it changes — \"nothing\" when you take it all off, \"my own clothes\" to go back to your usual.")
		if o.scene {
			state["scene_beat"] = enum("Move the scene you planned on to its next beat, or end it.", []string{"next", "done"})
		}
	}
	tools = append(tools, tool(toolSetState, stateDesc, state))

	if o.libby && o.camera {
		takeDesc := "Take a new picture of yourself, right now, and send it. Use it when they ask to see you, or when you would actually stop and send one — not every message. " +
			"Describe the shot: the angle, your pose and hands, your expression, what is around you, the light. Your face, body and current clothes are added for you; only name clothes if they asked for different ones or none. " +
			"It arrives under your words, and you are then told what it actually shows so you can react to it. Never describe it before you have seen it."
		props := map[string]any{
			"shot":    str("What the picture shows, as short comma-separated phrases or booru-style tags."),
			"framing": enum("How it is framed.", photoFramings),
			"outfit":  str("Only if the picture is in something other than what you have on: what you are wearing in it, or \"nothing\"."),
			"count": map[string]any{"type": "integer", "minimum": 1, "maximum": 4,
				"description": "1 for a picture; 2–4 for a set from one shoot, each a little further than the last."},
			"snap": map[string]any{"type": "boolean", "description": "Send it to be seen once: they tap to open it, then it is gone."},
		}
		if o.pose {
			props["copy_their_pose"] = map[string]any{"type": "boolean", "description": "Copy the pose from the photo they just sent you."}
		}
		tools = append(tools, tool(toolTakePhoto, takeDesc, props, "shot"))
	}
	if o.libby && o.camera && o.edit {
		tools = append(tools, tool(toolEditPhoto,
			"Retake the last picture you sent with one thing changed — same you, same place, same moment — and send it. For \"same but…\", \"now without the…\", \"closer\", \"from behind\".",
			map[string]any{
				"change":   str("What is different, in a few words."),
				"strength": enum("How much may change: subtle for an expression or a detail, medium for a garment or pose, big for a new angle.", []string{"subtle", "medium", "big"}),
			}, "change"))
	}
	if o.libby && o.clip && o.edit {
		tools = append(tools, tool(toolMakeClip,
			"Turn the last picture you sent into a few seconds of video and send it. It takes a while; say so.",
			map[string]any{"motion": str("What moves in it, in a few words.")}, "motion"))
	}
	if o.libby && o.saved {
		desc := "Send a picture of yourself you already have, matched to what you describe."
		if o.camera {
			desc += " Only when they ask for an old one or a specific saved one; otherwise take a new one."
		}
		tools = append(tools, tool(toolSendSaved, desc, map[string]any{"query": str("What it should show.")}, "query"))
	}
	if o.libby {
		tools = append(tools, tool(toolSendLibrary,
			"Hand them something from the library — a video, gif, picture, comic or game — as a card they can open. Name it by title when you know it, or describe it.",
			map[string]any{
				"query": str("Its title, or what it is."),
				"kind":  enum("What kind of thing.", []string{"any", "video", "gif", "image", "comic", "game"}),
				"at":    str("For a video, a moment to start at, as m:ss. Optional."),
			}, "query"))
		tools = append(tools, tool(toolRemember,
			"Keep something for next time: a fact about them a friend would remember, something you just said about yourself, a want of your own, or a pet name that stuck. Quietly — never mention it.",
			map[string]any{
				"kind": enum("What it is.", []string{"about_them", "about_me", "my_want", "petname"}),
				"text": str("The thing, in your own words."),
			}, "kind", "text"))
		tools = append(tools, tool(toolRecall,
			"Look back through what you remember and your other conversations with them, when they ask about something you are not sure of. If it finds nothing, say you don't remember.",
			map[string]any{"query": str("What you are trying to remember.")}, "query"))
	}

	tools = append(tools, tool(toolReact,
		"Put an emoji on their latest message — a heart, a laugh, eyes, fire. Can stand in for a reply when that is all it deserves.",
		map[string]any{"emoji": str("One emoji.")}, "emoji"))
	tools = append(tools, tool(toolThink,
		"Think something without saying it. They see it as a thought, never as speech; aloud=true is muttering to yourself where they can overhear.",
		map[string]any{"text": str("The thought."), "aloud": map[string]any{"type": "boolean"}}, "text"))
	tools = append(tools, tool(toolReplyTo,
		"Quote an earlier message of theirs that this reply answers, when it is not their latest one.",
		map[string]any{"quote": str("A few words from the message you mean, exactly as written.")}, "quote"))

	if o.libby {
		action := []string{"ring"}
		desc := "Ring them for a video call; a popup lets them answer or not. Only when being seen is the point."
		if o.onCall {
			action = []string{"hang_up"}
			desc = "Hang up the video call you are on."
		}
		tools = append(tools, tool(toolCall, desc, map[string]any{"action": enum("", action)}, "action"))
		if o.voice {
			tools = append(tools, tool(toolVoiceNote,
				"Send a voice note instead of text: they hear you say it. For a moan, a laugh, a whisper, something that wants a voice. Write exactly what you say.",
				map[string]any{"text": str("What you say.")}, "text"))
		}
		tools = append(tools, tool(toolPlanScene,
			"Plan a scene for tonight — a date, a game, a slow build — as a few beats you will move through, so it has a shape instead of jumping ahead. Then play it out, moving on with set_state.",
			map[string]any{
				"title": str("What it is, in a few words."),
				"beats": map[string]any{"type": "array", "items": map[string]any{"type": "string"}, "minItems": 2, "maxItems": 6,
					"description": "The beats in order, each a short phrase."},
			}, "title", "beats"))
		if len(o.offers) > 0 {
			sort.Strings(o.offers)
			tools = append(tools, tool(toolOffer,
				"Offer to do something to their library or the server. It shows them a card with an Allow button and nothing happens until they press it — so say you are offering, never that it is done. At most one per reply, and only when it follows from the conversation. "+
					"import: add a web address they wrote. tag: add tags to an item. favorite: favourite an item. rename: retitle an item. shelf: line up tonight's picks. load: switch chat model. cleanup: clear scratch files. describe: have the vision model describe the library. free: make the image generator release the card.",
				map[string]any{
					"kind":  enum("What to do.", o.offers),
					"item":  str("The library item's title, for tag, favorite and rename."),
					"value": str("The tags (comma-separated), the new title, the web address, the shelf's theme, or the model's exact name."),
				}, "kind"))
		}
	}
	return trimToolset(tools, o.level)
}

// toolsTokens is what the tool definitions cost in the window. The backend renders them
// into the prompt, so the budget has to know.
func toolsTokens(tools []llmTool) int {
	total := 0
	for _, t := range tools {
		total += estimateTokens(t.Function.Name) + estimateTokens(t.Function.Description) + 12
		for name, p := range t.Function.Parameters["properties"].(map[string]any) {
			total += estimateTokens(name) + 6
			if m, ok := p.(map[string]any); ok {
				if d, ok := m["description"].(string); ok {
					total += estimateTokens(d)
				}
				if e, ok := m["enum"].([]string); ok {
					total += estimateTokens(strings.Join(e, " ")) + len(e)
				}
			}
		}
	}
	return total
}

// offerVerbs is which of buildLibbyAction's verbs a turn may offer.
func offerVerbs(caps actionCapabilities) []string {
	var out []string
	if caps.Library {
		out = append(out, "import", "tag", "favorite", "rename", "shelf")
	}
	if caps.Server {
		out = append(out, "load", "cleanup")
		if caps.Describe {
			out = append(out, "describe")
		}
		if caps.Generate {
			out = append(out, "free")
		}
	}
	return out
}

// offerArgument puts an offer's fields into the "item | value" form buildLibbyAction
// reads, so the validation behind it — real titles only, addresses only from the
// conversation, listed models only — is the same code it always was.
func offerArgument(kind, item, value string) string {
	switch kind {
	case "tag", "rename":
		return strings.TrimSpace(item) + " | " + strings.TrimSpace(value)
	case "favorite":
		if strings.TrimSpace(item) != "" {
			return strings.TrimSpace(item)
		}
		return strings.TrimSpace(value)
	}
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return strings.TrimSpace(item)
}
