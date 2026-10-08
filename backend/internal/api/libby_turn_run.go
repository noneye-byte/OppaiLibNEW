package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/settings"
)

// turnRun is one turn in progress: the prompt it was built from, the state she is
// moving through, and the stream her messages go out on.
type turnRun struct {
	s       *Server
	ctx     context.Context
	r       *http.Request
	cur     settings.Settings
	userID  int64
	req     *libbyTurnRequest
	model   string
	stream  *turnStream
	v       *turnView
	p       turnPrompt
	isLibby bool

	// Her state, as it moves through the turn.
	emotion          string
	intensity        int
	activity         string
	background       string
	wearing          string
	scene            *libbyScene
	moodSet, heatSet bool
	petname          string
	pendingRoom      string
	remembered       bool

	// replyTo is a quote the next bubble carries; posted is every message she sent this
	// turn, in order; said is her words, for the fallbacks that read them.
	replyTo *chatReplyRef
	posted  []storedChatMessage
	said    []string
	// visible says this round produced something they can see besides words: a picture,
	// a reaction, a thought, a card. A round with none of that and no words is asked again.
	visible bool
	calls   []map[string]any
	rev     int64
}

func (s *Server) newTurnRun(ctx context.Context, r *http.Request, cur settings.Settings, userID int64, isAdmin bool, ws chatWorkspace, req *libbyTurnRequest, model string, stream *turnStream) (*turnRun, error) {
	var conv chatConversation
	found := false
	for _, c := range ws.Conversations {
		if c.ID == req.ConversationID {
			conv, found = c, true
			break
		}
	}
	if !found {
		return nil, errNoConversation
	}
	v, err := newTurnView(ws, conv, userID, isAdmin, req)
	if err != nil {
		return nil, err
	}
	t := &turnRun{
		s: s, ctx: ctx, r: r, cur: cur, userID: userID, req: req, model: model, stream: stream, v: v,
		isLibby:   v.character.ID == "libby",
		emotion:   v.conv.Emotion,
		intensity: v.conv.Intensity,
		activity:  conv.Activity, background: conv.Background, wearing: conv.Wearing, scene: conv.Scene,
	}
	return t, nil
}

// run is the turn.
func (t *turnRun) run() error {
	s, cur, v := t.s, t.cur, t.v
	limit := s.chatContextLimit(t.ctx)
	t.p = s.buildTurnPrompt(t.ctx, cur, v, t.model, limit)
	t.background = v.conv.Background
	tier := resolveModelTier(cur.ChatModelTier, t.model)
	task, preset := tuneSampling(v.in, v.latestUser, tier)
	detailed := detailAsked(v.latestUser) && task == taskCreative
	texts := textsForTurn(task, v.latestUser, rollTexts())
	if !detailed {
		t.p.tail += "\n\n" + textCountDirective(texts)
	}
	tools := libbyToolset(t.p.tools)
	window := limit - t.p.shown*pictureTokens - toolsTokens(tools)
	fitted, replyTokens, budget, err := fitChatTurn(t.p.head, t.p.sections, t.p.tail, t.p.history, window, preset.MaxTokens)
	if err != nil {
		s.log.Warn("libby context budget", "err", err, "limit", limit)
		if budget.Note != "" {
			return &chatBackendStatusError{Status: http.StatusRequestEntityTooLarge, msg: budget.Note}
		}
		return errors.New("couldn't fit this conversation into the model's context")
	}
	if budget.Note != "" && s.chatContextGuessed() {
		budget.Note += guessedWindowHint
	}
	if budget.Note != "" {
		t.stream.send("notice", map[string]any{"text": budget.Note})
	}
	preset.MaxTokens = replyTokens
	stops := chatStops(v.ws.Profile.DisplayName)
	if name := strings.TrimSpace(v.character.Name); name != "" && len(name) <= 40 {
		stops = append(stops, "\n"+name+":")
	}
	payload, overridden := samplingPayload(preset, t.model, limit, replyTokens, v.conv.Options, stops)
	summary := samplingSummary(task, tier, preset, overridden)
	s.log.Info("libby turn", "sampling", summary, "contextLimit", budget.Limit, "promptTokens", budget.PromptTokens, "tools", len(tools))

	var debug *chatDebug
	if t.req.Debug {
		debug = buildChatDebug(t.p.sections, budget.DroppedSections, budget.ClearedSections, fitted, t.p.signals)
	}
	mode := s.toolModeFor(t.ctx, cur.ChatToolMode, cur.ChatURL, t.model)
	msgs := toLLMMessages(fitted, t.p.pictures)
	t.stream.send("status", map[string]any{"phase": "typing"})

	for round := 0; round < maxTurnRounds; round++ {
		reply, used, err := s.completeTurn(t.ctx, payload, msgs, tools, mode)
		mode = used
		var refused *chatBackendStatusError
		if err != nil && round == 0 && len(t.p.pictures) > 0 && errors.As(err, &refused) {
			// The backend will not take pictures: answer from the tags and remember.
			s.log.Info("libby eyes: backend refused pictures", "model", t.model, "status", refused.Status)
			rememberBlind(cur.ChatURL, t.model)
			msgs = toLLMMessages(withoutEyes(fitted), nil)
			reply, mode, err = s.completeTurn(t.ctx, payload, msgs, tools, mode)
		}
		if err != nil {
			if round > 0 {
				// She already said something; a failed follow-up costs the caption, not the turn.
				s.log.Info("libby follow-up round failed", "err", err)
				break
			}
			return err
		}
		if round == 0 && t.isLibby && len(reply.Calls) == 0 && soundsLikeRefusal(reply.Text) {
			s.log.Info("libby refused; asking again", "model", t.model)
			again, _, againErr := s.completeTurn(t.ctx, payload, toLLMMessages(insistOnAdult(fitted), t.p.pictures), tools, mode)
			if againErr == nil && (strings.TrimSpace(again.Text) != "" || len(again.Calls) > 0) {
				reply = again
			}
		}
		if debug != nil && round == 0 {
			debug.Raw = reply.Text
		}
		t.visible = false
		results := make(map[string]string, len(reply.Calls))
		more := false
		// What shapes how her words land goes first — a quote, a thought before speaking,
		// a reaction, her state — then the words, then what she sends after them.
		for _, call := range reply.Calls {
			if !postSpeechTool(call.Function.Name) {
				res, follow := t.exec(call)
				results[call.ID], more = res, more || follow
			}
		}
		spoke := t.speak(reply.Text, texts, detailed)
		for _, call := range reply.Calls {
			if postSpeechTool(call.Function.Name) {
				res, follow := t.exec(call)
				results[call.ID], more = res, more || follow
			}
		}
		if len(reply.Calls) == 0 {
			if !spoke && !t.visible && round == 0 && len(t.posted) == 0 {
				return errors.New("local LLM returned no message")
			}
			break
		}
		if !more && (spoke || t.visible) {
			break
		}
		msgs = append(msgs, llmMessage{Role: "assistant", Content: reply.Text, ToolCalls: reply.Calls})
		for _, call := range reply.Calls {
			msgs = append(msgs, llmMessage{Role: "tool", ToolCallID: call.ID, Name: call.Function.Name, Content: results[call.ID]})
		}
		t.stream.send("status", map[string]any{"phase": "typing"})
	}
	t.settle()

	done := map[string]any{
		"rev": t.rev,
		"sampling": map[string]any{
			"task": string(task), "summary": summary, "values": samplingFields(preset), "overridden": overridden,
			"toolMode": string(mode),
		},
		"context": budget,
	}
	if debug != nil {
		done["debug"] = debug
		done["calls"] = t.calls
	}
	t.stream.send("done", done)
	return nil
}

// postSpeechTool says which tools act after her words: what she sends lands after what
// she says, the way it would from a phone.
func postSpeechTool(name string) bool {
	switch name {
	case toolTakePhoto, toolEditPhoto, toolMakeClip, toolSendSaved, toolSendLibrary, toolVoiceNote, toolOffer:
		return true
	}
	return false
}

// speak turns one round's text into her messages. It reports whether she said anything.
func (t *turnRun) speak(text string, texts int, detailed bool) bool {
	s := t.s
	// Deletion only: bracket narration a model wrote out of habit — a card's examples
	// still teach it — is not dialogue, and nothing reads it as an action any more.
	text = scrubDirectives(text)
	text = stripSpeakerHeading(text, t.v.character.Name)
	text = scrubInventedURLs(text, t.p.caps.KnownURLs)
	text = fillNamePlaceholders(text, t.v.ws.Profile.DisplayName)
	if !detailed {
		text = capTexts(text, texts)
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return false
	}
	var links []libbyLink
	if t.isLibby || t.req.Viewing != nil {
		text, links = s.resolveLibraryLinks(t.ctx, text, t.p.taste)
	}
	bubbles := splitIntoBubbles(text)
	if detailed {
		bubbles = []string{text}
	}
	for i, b := range bubbles {
		msg := storedChatMessage{ID: randomID(), Role: "assistant", Content: b, At: time.Now().UnixMilli()}
		if i == 0 && t.replyTo != nil {
			msg.ReplyTo, t.replyTo = t.replyTo, nil
		}
		if i == len(bubbles)-1 && len(links) > 0 {
			msg.Links = links
		}
		t.post(msg)
	}
	t.said = append(t.said, text)
	if t.isLibby {
		if facts := captureSelfFacts(text); len(facts) > 0 {
			s.chatMu.Lock()
			if _, err := s.appendLibbyMemories(t.userID, asSelfFacts(facts)); err != nil {
				s.log.Debug("libby self", "err", err)
			}
			s.chatMu.Unlock()
		}
	}
	return true
}

// post writes one of her messages into the conversation and sends it.
func (t *turnRun) post(msg storedChatMessage) {
	if msg.At == 0 {
		msg.At = time.Now().UnixMilli()
	}
	// Strictly after the last thing posted, so the stored order is the order she sent.
	if n := len(t.posted); n > 0 && msg.At <= t.posted[n-1].At {
		msg.At = t.posted[n-1].At + 1
	}
	rev, err := t.write(func(c *chatConversation, rev int64) {
		msg.Rev = rev
		c.Messages = append(c.Messages, msg)
	})
	if err != nil {
		t.s.log.Warn("libby turn: couldn't store her message", "err", err)
		return
	}
	t.rev = rev
	t.posted = append(t.posted, msg)
	payload := map[string]any{"message": msg, "rev": rev}
	// The records of the pictures it carries ride with it: the client keeps a gallery
	// list of its own and draws a picture from its record — a clip as a video.
	ids := msg.Images
	if len(ids) == 0 && msg.ImageID != "" {
		ids = []string{msg.ImageID}
	}
	var records []chatImage
	for _, id := range ids {
		if meta, ok := t.s.ownedChatImage(t.userID, id); ok {
			records = append(records, meta)
		}
	}
	if len(records) > 0 {
		payload["images"] = records
	}
	t.stream.send("message", payload)
}

// amend changes one of her messages already posted this turn, and resends it; the
// client replaces it by id.
func (t *turnRun) amend(id string, fn func(m *storedChatMessage)) {
	var updated storedChatMessage
	rev, err := t.write(func(c *chatConversation, rev int64) {
		for i := range c.Messages {
			if c.Messages[i].ID == id {
				fn(&c.Messages[i])
				c.Messages[i].Rev = rev
				updated = c.Messages[i]
			}
		}
	})
	if err != nil || updated.ID == "" {
		return
	}
	t.rev = rev
	for i := range t.posted {
		if t.posted[i].ID == id {
			t.posted[i] = updated
		}
	}
	t.stream.send("message", map[string]any{"message": updated, "rev": rev})
}

// write applies one change to the conversation. A turn writes it into the workspace; an
// ephemeral one (the browse-together drawer, which files nothing) applies it to its
// in-memory copy, so every event is the same either way.
func (t *turnRun) write(fn func(c *chatConversation, rev int64)) (int64, error) {
	if t.req.Ephemeral {
		t.rev++
		fn(&t.v.conv, t.rev)
		return t.rev, nil
	}
	return t.s.writeTurn(t.userID, t.req.ConversationID, fn)
}

// lastSpoken is the newest message she posted this turn that is speech, "" if none.
func (t *turnRun) lastSpoken() string {
	for i := len(t.posted) - 1; i >= 0; i-- {
		if t.posted[i].Thought == "" {
			return t.posted[i].ID
		}
	}
	return ""
}

// settle decides the state she leaves the turn in and writes it.
func (t *turnRun) settle() {
	s, v := t.s, t.v
	said := strings.Join(t.said, "\n")
	if !t.moodSet {
		t.emotion = inferChatEmotion(v.latestUser, said, t.emotion, moodRunLength(v.books.moods, t.emotion))
	}
	if !t.heatSet {
		t.intensity = clampInt(t.intensity+inferHeatDelta(v.latestUser, said), 1, 5)
	}
	if t.activity != "" {
		t.activity = withinLimits(allowedActivity(t.activity, t.intensity), t.p.limits)
	}
	if t.isLibby && t.pendingRoom != "" {
		t.stream.send("status", map[string]any{"phase": "room"})
		if bg, err := s.makeRoom(t.ctx, t.pendingRoom, func(p cameraProgress) {
			t.stream.send("camera", map[string]any{"what": "room", "progress": p})
		}); err == nil {
			t.background = bg.ID
			t.stream.send("room", map[string]any{"background": bg})
		} else {
			s.log.Info("libby: couldn't make the room she moved to", "place", t.pendingRoom, "err", err)
		}
	}
	if t.isLibby {
		s.chatMu.Lock()
		if _, err := s.updateLibbyBond(t.userID, t.emotion, t.intensity, t.petname); err != nil {
			s.log.Debug("libby bond", "err", err)
		}
		// What they stated outright, when she did not think to keep it.
		if !t.remembered && v.ws.Profile.MayRemember() {
			if facts := captureUserFacts(v.latestUser, v.ws.Profile.DisplayName); len(facts) > 0 {
				_, _ = s.appendLibbyMemories(t.userID, facts[:min(len(facts), maxRememberedPerReply)])
			}
		}
		s.chatMu.Unlock()
	}
	last := t.lastSpoken()
	rev, err := t.write(func(c *chatConversation, rev int64) {
		c.Emotion, c.Intensity, c.Progress = t.emotion, t.intensity, float64(t.intensity)
		c.Activity, c.Background, c.Wearing, c.Scene = t.activity, t.background, t.wearing, t.scene
		for i := range c.Messages {
			if c.Messages[i].ID == last {
				c.Messages[i].Mood, c.Messages[i].Heat, c.Messages[i].Rev = t.emotion, t.intensity, rev
			}
		}
	})
	if err == nil {
		t.rev = rev
	}
	t.stream.send("state", map[string]any{
		"emotion": t.emotion, "intensity": t.intensity, "activity": t.activity,
		"background": t.background, "wearing": t.wearing, "scene": t.scene,
		"declared": t.moodSet || t.heatSet, "messageId": last, "rev": t.rev,
	})
}

// makeRoom generates a place she moved to and files it as a background. Her checkpoint
// and board, none of her LoRAs (those draw her into it), landscape.
func (s *Server) makeRoom(ctx context.Context, place string, progress func(cameraProgress)) (libbyBackgroundView, error) {
	cur := s.settings.Get()
	if !cur.ImageGenEnabled {
		return libbyBackgroundView{}, errors.New("no generator")
	}
	if len(s.listLibbyBackgrounds()) >= maxLibbyBackgrounds {
		return libbyBackgroundView{}, errors.New("no room for another background")
	}
	if shotIsRefused(place) {
		return libbyBackgroundView{}, errShotRefused
	}
	gr := generateReq{
		Prompt: scenePrompt(place), NegativePrompt: sceneNegative(cur.LibbyGenNegativePrompt),
		Checkpoint: cur.LibbyGenModel, Board: cur.LibbyGenBoard, Width: 768, Height: 512, Count: 1, Seed: -1,
	}
	gen, _, _ := s.prepareGenerate(&gr)
	gen.Progress = cameraProgressAdapter(progress, 1, "making the room")
	release := s.lendCardToImages(ctx)
	out, err := s.imagegen.Generate(ctx, cur.ImageGenURL, gen)
	release()
	if err != nil {
		return libbyBackgroundView{}, err
	}
	if len(out.Images) == 0 || len(out.Images[0]) > maxModelThumbBytes {
		return libbyBackgroundView{}, fmt.Errorf("the generator's picture is unusable")
	}
	bg := libbyBackground{ID: randomID(), Name: sceneName(place), Tags: sceneTags(place)}
	if err := s.writeLibbyBackground(bg); err != nil {
		return libbyBackgroundView{}, err
	}
	if err := s.writeLibbyBackgroundImage(bg.ID, out.Images[0]); err != nil {
		return libbyBackgroundView{}, err
	}
	return s.libbyBackgroundView(&bg), nil
}
