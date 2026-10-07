package api

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
)

// Running what she called.
//
// Each tool validates its own arguments — the schema is a request to the model, never
// a guarantee — and returns a result written to her, in plain words, saying what
// happened. A result is the only way she learns that a picture came out, what it
// shows, that a room she named does not exist, or that a state was refused; a tool
// that fails quietly leaves her describing something that did not happen.
//
// follow says the result is worth her reacting to in another round: a picture she has
// not seen yet, something she looked up. State changes and reactions are not.

func (t *turnRun) exec(call llmToolCall) (result string, follow bool) {
	args := call.argsMap()
	t.calls = append(t.calls, map[string]any{"name": call.Function.Name, "args": args})
	switch call.Function.Name {
	case toolSetState:
		return t.execSetState(args), false
	case toolTakePhoto:
		return t.execTakePhoto(args)
	case toolEditPhoto:
		return t.execEditPhoto(args)
	case toolMakeClip:
		return t.execMakeClip(args)
	case toolSendSaved:
		return t.execSendSaved(args)
	case toolSendLibrary:
		return t.execSendLibrary(args)
	case toolRemember:
		return t.execRemember(args), false
	case toolRecall:
		return t.execRecall(args), true
	case toolReact:
		return t.execReact(args), false
	case toolThink:
		return t.execThink(args), false
	case toolReplyTo:
		if ref := resolveReplyTarget(argString(args, "quote"), t.v.in.Messages); ref != nil {
			t.replyTo = ref
			return "Your reply is shown as answering that message.", false
		}
		return "No earlier message of theirs matches that quote; your reply answers their latest.", false
	case toolCall:
		return t.execCall(args), false
	case toolVoiceNote:
		return t.execVoiceNote(args), false
	case toolOffer:
		return t.execOffer(args), false
	case toolPlanScene:
		if sc := planScene(args); sc != nil {
			t.scene = sc
			return fmt.Sprintf("Planned: %s, starting with %s.", sc.Title, sc.Beats[0]), false
		}
		return "A scene needs a title and at least two beats.", false
	}
	return "There is no such tool.", false
}

func (t *turnRun) execSetState(args map[string]any) string {
	var done []string
	if mood := strings.ToLower(argString(args, "mood")); mood != "" {
		if !supportedLibbyEmotions[mood] {
			mood = canonicalMood(mood)
		}
		if mood != "" {
			t.emotion, t.moodSet = mood, true
			done = append(done, "you look "+mood)
		}
	}
	if heat, ok := argInt(args, "heat"); ok {
		t.intensity, t.heatSet = clampInt(heat, 1, 5), true
		done = append(done, fmt.Sprintf("heat %d", t.intensity))
	}
	if !t.isLibby {
		return "Done: " + strings.Join(done, ", ") + "."
	}
	if raw := strings.ToLower(argString(args, "activity")); raw != "" {
		switch {
		case raw == "none":
			t.activity = ""
			done = append(done, "doing nothing in particular")
		case withinLimits(allowedActivity(raw, t.intensity), t.p.limits) != "":
			t.activity = raw
			done = append(done, libbyActivityByID[raw].Says)
		default:
			done = append(done, "not "+raw+" — the scene is not there yet, or they have ruled it out")
		}
	}
	if place := argString(args, "place"); place != "" {
		if id, ok := resolveBackground(place, t.p.rooms); ok {
			t.background = id
			done = append(done, "moved")
		} else if t.p.tools.camera && !shotIsRefused(place) {
			t.pendingRoom = truncateRunes(place, 120)
			done = append(done, "moving somewhere new — it is being made")
		} else {
			done = append(done, "you have no room like "+place+"; you stay where you are")
		}
	}
	if w := argString(args, "wearing"); w != "" {
		t.wearing = normalizeWearing(w)
		done = append(done, "dressed")
	}
	if beat := argString(args, "scene_beat"); beat != "" && t.scene != nil {
		t.scene = advanceScene(t.scene, beat)
		if t.scene == nil {
			done = append(done, "the scene is over")
		} else {
			done = append(done, "on to: "+t.scene.Beats[t.scene.Beat])
		}
	}
	if len(done) == 0 {
		return "Nothing changed."
	}
	return "Done: " + strings.Join(done, ", ") + "."
}

// cameraReq is a camera request carrying her state as it stands at this point in the turn.
func (t *turnRun) cameraReq() cameraRequest {
	place := backgroundWords(t.background, t.p.rooms)
	if t.pendingRoom != "" {
		place = t.pendingRoom
	}
	jobID := "libby-" + randomID()[:12]
	return cameraRequest{
		userID: t.userID, r: t.r, jobID: jobID,
		outfitID: t.req.Outfit, wearing: t.wearing, activity: t.activity, place: place,
		intensity: t.intensity, weights: t.v.ws.SendWeights,
		progress: func(p cameraProgress) {
			t.stream.send("camera", map[string]any{"jobId": jobID, "progress": p})
		},
	}
}

func (t *turnRun) execTakePhoto(args map[string]any) (string, bool) {
	shot := argString(args, "shot")
	if shot == "" {
		return "Describe the shot to take one.", true
	}
	count, _ := argInt(args, "count")
	req := t.cameraReq()
	req.shot, req.framing, req.outfit, req.count = shot, argString(args, "framing"), argString(args, "outfit"), max(count, 1)
	if argBool(args, "copy_their_pose") {
		req.poseFrom = lastPictureOfTheirs(t.v.conv.Messages)
	}
	t.stream.send("status", map[string]any{"phase": "photo", "count": req.count})
	res, err := t.s.takePictures(t.ctx, req)
	return t.sendCameraResult(res, err, argBool(args, "snap"), "sends a picture")
}

func (t *turnRun) execEditPhoto(args map[string]any) (string, bool) {
	change := argString(args, "change")
	last := lastPictureOfHers(append(t.v.conv.Messages, t.posted...))
	if change == "" || last == "" {
		return "There is no picture of yours here to redo.", true
	}
	req := t.cameraReq()
	req.editOf, req.change, req.strength = last, change, argString(args, "strength")
	t.stream.send("status", map[string]any{"phase": "photo", "count": 1})
	res, err := t.s.takePictures(t.ctx, req)
	return t.sendCameraResult(res, err, false, "sends another")
}

// sendCameraResult posts what the camera made and writes her the result.
func (t *turnRun) sendCameraResult(res cameraResult, err error, snap bool, direction string) (string, bool) {
	if errors.Is(err, errShotRefused) {
		return "You won't take that one: everyone in any picture of you is an adult, and that shot was not. Say no in your own words.", true
	}
	if err != nil {
		t.s.log.Info("libby camera failed", "err", err)
		// A camera that failed still leaves her a picture she already has, if one fits.
		if fallback := t.pickSaved(t.v.latestUser); fallback != nil {
			t.post(*fallback)
			t.visible = true
			return "The camera failed (" + err.Error() + "), so you sent one you already had instead. Say so lightly.", true
		}
		return "The camera failed: " + err.Error() + ". Nothing was sent; tell them it didn't work.", true
	}
	if res.wearingSet {
		t.wearing = res.wearing
	}
	msg := storedChatMessage{ID: randomID(), Role: "assistant", Content: stageDirection(direction), Snap: snap}
	for _, img := range res.images {
		msg.Images = append(msg.Images, img.ID)
	}
	if len(msg.Images) == 0 {
		return "Nothing came out of the camera.", true
	}
	msg.ImageID = msg.Images[0]
	if len(msg.Images) == 1 {
		msg.Images = nil
	}
	t.post(msg)
	t.visible = true
	result := "Sent. What it actually shows: " + res.seen + "."
	if len(res.notes) > 0 {
		result += " Note: " + strings.Join(res.notes, "; ") + "."
	}
	return result + " React to it as the picture it is, briefly — they are looking at it now.", true
}

func (t *turnRun) execMakeClip(args map[string]any) (string, bool) {
	motion := argString(args, "motion")
	last := lastPictureOfHers(append(t.v.conv.Messages, t.posted...))
	if motion == "" || last == "" {
		return "There is no picture of yours to animate.", true
	}
	t.stream.send("status", map[string]any{"phase": "clip"})
	jobID := "libby-" + randomID()[:12]
	clip, err := t.s.makeClip(t.ctx, t.userID, last, motion, func(p cameraProgress) {
		t.stream.send("camera", map[string]any{"jobId": jobID, "what": "clip", "progress": p})
	})
	if errors.Is(err, errShotRefused) {
		return "You won't make that one. Say no in your own words.", true
	}
	if err != nil {
		return "The clip failed: " + err.Error() + ". Tell them.", true
	}
	t.post(storedChatMessage{ID: randomID(), Role: "assistant", Content: stageDirection("sends a clip"), ImageID: clip.ID})
	t.visible = true
	return "Sent: a few seconds of " + motion + ".", true
}

// pickSaved chooses a picture she already has for a request, or nil.
func (t *turnRun) pickSaved(query string) *storedChatMessage {
	skip := map[string]bool{}
	if t.p.lastImg != "" {
		skip[t.p.lastImg] = true
	}
	candidates := pictureCandidates(t.v.ws, t.v.character.ID, t.p.selfPics, query, t.v.in.PhotoImageID, skip, t.p.sentImgs, map[int64]bool{}, t.p.sentLib)
	floor := 1
	if best := bestScore(candidates); best > floor {
		floor = best
	}
	chosen, ok := drawWeighted(candidates, floor, nil)
	if !ok {
		chosen, ok = drawWeighted(candidates, 0, nil)
	}
	if !ok {
		return nil
	}
	msg := storedChatMessage{ID: randomID(), Role: "assistant", Content: stageDirection("sends a picture")}
	if chosen.isSelf {
		msg.Attachments = []libbyAttachment{{libbyLink: chosen.self.link, Self: true}}
	} else {
		msg.ImageID = chosen.imageID
	}
	return &msg
}

func (t *turnRun) execSendSaved(args map[string]any) (string, bool) {
	query := argString(args, "query")
	msg := t.pickSaved(query + " " + t.v.latestUser)
	if msg == nil {
		return "You have no saved picture of yourself to send.", true
	}
	t.post(*msg)
	t.visible = true
	tags := ""
	if msg.ImageID != "" {
		if meta, ok := imageMeta(t.v.ws, msg.ImageID); ok {
			tags = strings.Join(firstN(meta.Tags, 12), ", ")
		}
	} else if len(msg.Attachments) > 0 {
		tags = msg.Attachments[0].Title
	}
	return "Sent one you already had; it shows: " + tags + ".", true
}

func (t *turnRun) execSendLibrary(args map[string]any) (string, bool) {
	query := argString(args, "query")
	if query == "" {
		return "Name or describe what to hand over.", true
	}
	if at := argString(args, "at"); at != "" {
		query += " @ " + at
	}
	kind := strings.ToLower(argString(args, "kind"))
	if kind == "any" {
		kind = ""
	}
	found := t.s.resolveLibraryAttachments(t.ctx, []string{query}, t.v.latestUser, kind, t.p.sentLib, t.p.taste, t.v.ws.SendWeights)
	if len(found) == 0 {
		return "Nothing on the shelves matches that. Say so rather than inventing it.", true
	}
	titles := make([]string, 0, len(found))
	for _, a := range found {
		titles = append(titles, a.Title)
		t.p.sentLib[a.ID] = true
	}
	t.post(storedChatMessage{ID: randomID(), Role: "assistant", Content: stageDirection("hands over " + strings.Join(titles, ", ")), Attachments: found})
	t.visible = true
	return "Handed over: " + strings.Join(titles, ", ") + ".", len(t.said) == 0
}

func (t *turnRun) execRemember(args map[string]any) string {
	if !t.isLibby {
		return "Noted."
	}
	text := truncateRunes(argString(args, "text"), 300)
	if text == "" {
		return "Nothing to keep."
	}
	s := t.s
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	switch argString(args, "kind") {
	case "about_me":
		_, _ = s.appendLibbyMemories(t.userID, asSelfFacts([]string{text}))
	case "my_want":
		_, _ = s.appendLibbyWants(t.userID, []string{text})
	case "petname":
		t.petname = truncateRunes(text, 40)
	default:
		// Consent holds here, whatever the model was told.
		if !t.v.ws.Profile.MayRemember() {
			return "They asked you not to keep notes about them; it was not kept."
		}
		_, _ = s.appendLibbyMemories(t.userID, []string{text})
		t.remembered = true
	}
	return "Kept."
}

// execRecall searches what she has: her memory, her journal, her other conversations.
func (t *turnRun) execRecall(args map[string]any) string {
	query := argString(args, "query")
	words := requestWords(query)
	if len(words) == 0 || !t.isLibby {
		return "You don't remember anything about that."
	}
	s := t.s
	s.chatMu.Lock()
	store, _ := s.readLibbyMemory(t.userID)
	journal, _ := s.readLibbyJournal(t.userID)
	s.chatMu.Unlock()
	type hit struct {
		text  string
		score int
	}
	var hits []hit
	score := func(text string) int {
		n := 0
		for w := range requestWords(text) {
			if words[w] {
				n++
			}
		}
		return n
	}
	for _, m := range store.Memories {
		if n := score(m.Text); n > 0 {
			hits = append(hits, hit{"You remember: " + m.Text, n + 1})
		}
	}
	for _, e := range journal.Entries {
		if n := score(e.Text); n > 0 {
			hits = append(hits, hit{"You wrote after a conversation on " + time.UnixMilli(e.At).Format("Jan 2") + ": " + truncateRunes(e.Text, 300), n})
		}
	}
	for _, c := range t.v.ws.Conversations {
		if c.ID == t.v.conv.ID || c.CharacterID != t.v.character.ID {
			continue
		}
		for _, m := range c.Messages {
			if m.Thought != "" {
				continue
			}
			if n := score(m.Content); n >= 2 || (n == 1 && len(words) == 1) {
				who := "They said"
				if m.Role == "assistant" {
					who = "You said"
				}
				hits = append(hits, hit{fmt.Sprintf("%s on %s: %s", who, time.UnixMilli(m.At).Format("Jan 2"), truncateRunes(m.Content, 200)), n})
			}
		}
	}
	if len(hits) == 0 {
		return "Nothing you have written down or said with them mentions that. You don't remember — say so honestly rather than making something up."
	}
	sort.SliceStable(hits, func(a, b int) bool { return hits[a].score > hits[b].score })
	lines := make([]string, 0, 6)
	for i := 0; i < len(hits) && i < 6; i++ {
		lines = append(lines, hits[i].text)
	}
	return strings.Join(lines, "\n") + "\nThat is all you have; anything beyond it you don't remember."
}

func (t *turnRun) execReact(args map[string]any) string {
	emoji, ok := resolveReactionEmoji(argString(args, "emoji"))
	if !ok {
		return "That is not an emoji you can react with."
	}
	to := latestUserMessageID(t.v.in.Messages)
	if to == "" {
		return "There is nothing of theirs to react to."
	}
	rev, err := t.write(func(c *chatConversation, rev int64) {
		for i := range c.Messages {
			if c.Messages[i].ID == to {
				others := c.Messages[i].Reactions[:0:0]
				for _, r := range c.Messages[i].Reactions {
					if r.By != "assistant" {
						others = append(others, r)
					}
				}
				c.Messages[i].Reactions = append(others, chatReaction{Emoji: emoji, By: "assistant"})
				c.Messages[i].Rev = rev
			}
		}
	})
	if err == nil {
		t.rev = rev
		t.visible = true
		t.stream.send("react", map[string]any{"to": to, "emoji": emoji, "rev": rev})
	}
	return "Reacted " + emoji + "."
}

func (t *turnRun) execThink(args map[string]any) string {
	text := truncateRunes(argString(args, "text"), maxThoughtText)
	if text == "" {
		return "Nothing thought."
	}
	kind := thoughtPrivate
	if argBool(args, "aloud") {
		kind = thoughtAside
	}
	t.post(storedChatMessage{ID: randomID(), Role: "assistant", Content: text, Thought: kind})
	t.visible = true
	return "Thought."
}

func (t *turnRun) execCall(args map[string]any) string {
	if !t.isLibby {
		return "You can't call."
	}
	switch argString(args, "action") {
	case "ring":
		if t.req.Call {
			return "You are already on a call with them."
		}
		t.stream.send("call", map[string]any{"action": "ring"})
		t.visible = true
		return "It's ringing on their screen."
	case "hang_up":
		if !t.req.Call {
			return "There is no call to hang up."
		}
		t.stream.send("call", map[string]any{"action": "hang_up"})
		t.visible = true
		return "Hung up."
	}
	return "Ring or hang up."
}

func (t *turnRun) execVoiceNote(args map[string]any) string {
	text, _ := cleanLimited(argString(args, "text"), 600)
	if text == "" {
		return "Say something to send a voice note."
	}
	t.post(storedChatMessage{ID: randomID(), Role: "assistant", Content: text, Voice: true})
	t.visible = true
	t.said = append(t.said, text)
	return "Sent as a voice note."
}

func (t *turnRun) execOffer(args map[string]any) string {
	kind := strings.ToLower(argString(args, "kind"))
	allowed := false
	for _, k := range t.p.tools.offers {
		if k == kind {
			allowed = true
		}
	}
	if !allowed {
		return "That is not something you can offer here."
	}
	argument := offerArgument(kind, argString(args, "item"), argString(args, "value"))
	var candidates []libraryCandidate
	switch kind {
	case "tag", "favorite", "rename":
		candidates = t.s.libraryCandidates(t.ctx, normalizeLookupWords(actionTitle(argument)))
	}
	action, ok := t.s.buildLibbyAction(kind, argument, t.p.caps, candidates)
	if !ok {
		return "That offer could not be made — the item is not in the library, or the address was not one they gave you. Do not claim to have offered it."
	}
	action.ID = randomID()
	if id := t.lastSpoken(); id != "" {
		t.amend(id, func(m *storedChatMessage) {
			if len(m.Actions) < maxLibbyActions {
				m.Actions = append(m.Actions, action)
			}
		})
	} else {
		t.post(storedChatMessage{ID: randomID(), Role: "assistant", Content: stageDirection("offers: " + strings.ToLower(action.Label)), Actions: []libbyAction{action}})
	}
	t.visible = true
	return "Offered: " + action.Label + " — " + action.Detail + ". It waits for them to press Allow; nothing has happened yet."
}

// cameraProgressAdapter turns the generator's progress into the camera's.
func cameraProgressAdapter(progress func(cameraProgress), total int, phase string) func(imagegen.Progress) {
	return func(p imagegen.Progress) {
		if progress != nil {
			progress(cameraProgress{Phase: phase, Percent: (float64(p.Index) + p.Percent) / float64(max(total, 1)), Preview: p.Image, Of: total})
		}
	}
}
