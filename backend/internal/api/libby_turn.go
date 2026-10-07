package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// A turn, run on the server.
//
// POST /api/libby/turn takes what they just said — or a request to redo her last
// reply, or to speak first — and answers it: the conversation is read from the
// workspace, their message is written into it, the model is run with her tools until
// she has said and done what she meant to, and each thing she sends is written into the
// conversation and streamed to the client the moment it exists.
//
// The stream is Server-Sent Events, so the web client draws a bubble as it lands and
// the camera's progress as it develops, and the phone can read the same events line by
// line. A client that asks for JSON (Accept: application/json) gets every event at the
// end in one array instead, for anything that cannot read a stream.
//
// What used to happen in the client — the reading delay aside, which is presentation —
// happens here: which picture, which room, what she has on, the mood run, what she has
// already sent. The client draws; the server decides.

// libbyTurnRequest is one turn.
type libbyTurnRequest struct {
	ConversationID string `json:"conversationId"`
	// Conversation describes a conversation the client created and has not saved yet.
	Conversation *conversationShell `json:"conversation,omitempty"`
	// Messages are their new texts, oldest first. Ones already in the conversation (the
	// autosave got there first) are recognised by id and not written twice.
	Messages []storedChatMessage `json:"messages,omitempty"`
	// Redo takes her last reply back and answers again; Nudge steers that one attempt.
	Redo  bool   `json:"redo,omitempty"`
	Nudge string `json:"nudge,omitempty"`
	// TruncateAfter drops everything after one of their messages before answering it —
	// "retry from here". Said in the turn rather than left to the client's next save,
	// which is debounced and would land after the turn had already read the old tail.
	TruncateAfter string `json:"truncateAfter,omitempty"`
	// Task says what the turn is for when the text cannot: "autonomous" is her speaking
	// first, "afterglow" the morning after.
	Task string `json:"task,omitempty"`
	// Device state: whether they have her on the call screen, and the outfit this device
	// shows her in.
	Call   bool   `json:"call,omitempty"`
	Outfit string `json:"outfit,omitempty"`
	// What they are looking at together, a link they are showing her, and library items
	// attached by reference.
	Viewing        *chatViewing `json:"viewing,omitempty"`
	Link           string       `json:"link,omitempty"`
	SharedMediaIDs []int64      `json:"sharedMediaIds,omitempty"`
	Debug          bool         `json:"debug,omitempty"`
	// Cue is a one-off instruction for this turn, never stored: "they have just opened
	// this, say what you think of it". It is what makes a reaction to something on screen
	// a turn without putting words in their mouth.
	Cue string `json:"cue,omitempty"`
	// Ephemeral is a turn whose words are not kept: the browse-together drawer is a
	// running commentary, not correspondence. History is its recent lines, and
	// CharacterID, Mode, Emotion and Intensity stand in for the conversation it has not
	// got. She still remembers what she learns and still takes pictures; only the
	// lines themselves go nowhere.
	Ephemeral   bool          `json:"ephemeral,omitempty"`
	History     []chatMessage `json:"history,omitempty"`
	CharacterID string        `json:"characterId,omitempty"`
	Mode        string        `json:"mode,omitempty"`
	Emotion     string        `json:"emotion,omitempty"`
	Intensity   int           `json:"intensity,omitempty"`
}

// maxEphemeralHistory bounds what an ephemeral turn may carry of its own past.
const maxEphemeralHistory = 24

// ephemeralConversation is the conversation an ephemeral turn stands in for, built from
// what the client sent and added to the in-memory workspace only.
func ephemeralConversation(ws *chatWorkspace, req *libbyTurnRequest) error {
	characterID := req.CharacterID
	if characterID == "" {
		characterID = "libby"
	}
	if _, ok := findChatCharacter(*ws, characterID); !ok && characterID != "libby" {
		return errors.New("no such character")
	}
	conv := chatConversation{
		ID: "ephemeral", CharacterID: characterID, Mode: req.Mode,
		Emotion: strings.ToLower(strings.TrimSpace(req.Emotion)), Intensity: clampInt(req.Intensity, 1, 5),
		Messages: []storedChatMessage{},
	}
	history := req.History
	if len(history) > maxEphemeralHistory {
		history = history[len(history)-maxEphemeralHistory:]
	}
	for i, m := range history {
		content, ok := cleanLimited(m.Content, maxChatText)
		if !ok || content == "" || (m.Role != "user" && m.Role != "assistant") {
			continue
		}
		conv.Messages = append(conv.Messages, storedChatMessage{ID: randomID(), Role: m.Role, Content: content, At: int64(i + 1)})
	}
	if len(conv.Messages) == 0 && req.Cue == "" {
		return errors.New("there is nothing to answer")
	}
	ws.Conversations = append(ws.Conversations, conv)
	req.ConversationID = conv.ID
	return nil
}

// maxTurnRounds bounds the tool loop. Three is a picture and her reaction to it plus one
// spare; past that a model is calling tools in circles.
const maxTurnRounds = 3

// turnStream writes events, or collects them for a JSON reply.
type turnStream struct {
	mu      sync.Mutex
	w       http.ResponseWriter
	flusher http.Flusher
	collect bool
	events  []map[string]any
	stop    chan struct{}
}

// keepaliveEvery is how often a quiet stream says it is still there. A turn can be
// silent for a minute while the judge looks at candidates or a clip renders, and a
// reverse proxy with a 60-second read timeout would cut it off mid-picture.
const keepaliveEvery = 15 * time.Second

func newTurnStream(w http.ResponseWriter, r *http.Request) *turnStream {
	t := &turnStream{w: w}
	flusher, ok := w.(http.Flusher)
	if !ok || strings.Contains(r.Header.Get("Accept"), "application/json") {
		t.collect = true
		return t
	}
	t.flusher = flusher
	t.stop = make(chan struct{})
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()
	go func() {
		ticker := time.NewTicker(keepaliveEvery)
		defer ticker.Stop()
		for {
			select {
			case <-t.stop:
				return
			case <-ticker.C:
				t.mu.Lock()
				fmt.Fprint(t.w, ": keepalive\n\n")
				t.flusher.Flush()
				t.mu.Unlock()
			}
		}
	}()
	return t
}

func (t *turnStream) send(event string, data any) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.collect {
		t.events = append(t.events, map[string]any{"event": event, "data": data})
		return
	}
	raw, _ := json.Marshal(data)
	fmt.Fprintf(t.w, "event: %s\ndata: %s\n\n", event, raw)
	t.flusher.Flush()
}

// finish ends the turn: a JSON client gets everything now.
func (t *turnStream) finish() {
	if t.stop != nil {
		t.mu.Lock()
		close(t.stop)
		t.stop = nil
		t.mu.Unlock()
	}
	if t.collect {
		writeJSON(t.w, http.StatusOK, map[string]any{"events": t.events})
	}
}

// fail ends a turn that could not run. Before anything was streamed it is an ordinary
// error response; after, it is an error event.
func (t *turnStream) fail(status int, msg string) {
	t.send("error", map[string]any{"message": msg, "status": status})
}

func (s *Server) handleLibbyTurn(w http.ResponseWriter, r *http.Request) {
	s.lastChatAt.Store(time.Now().UnixMilli())
	cur := s.settings.Get()
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var req libbyTurnRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid turn")
		return
	}
	if cur.ChatURL == "" {
		writeErr(w, http.StatusServiceUnavailable, "Libby chat is not configured")
		return
	}
	// Their messages go in before anything else can fail, so what they said is kept
	// whatever happens to her answer. An ephemeral turn keeps nothing.
	var stored receivedTurn
	var ws chatWorkspace
	var err error
	if req.Ephemeral {
		s.chatMu.Lock()
		ws, err = s.readChatWorkspace(u.ID)
		s.chatMu.Unlock()
		if err == nil {
			err = ephemeralConversation(&ws, &req)
		}
	} else {
		stored, ws, err = s.receiveTurnMessages(u.ID, &req)
	}
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, errNoConversation) {
			status = http.StatusNotFound
		}
		writeErr(w, status, err.Error())
		return
	}
	probeCtx, probeCancel := context.WithTimeout(r.Context(), 5*time.Second)
	probe := s.probeChatBackend(probeCtx)
	probeCancel()
	if !probe.Ready {
		if s.card.parkedModel() != "" {
			s.handBackCardNow()
			writeErr(w, http.StatusServiceUnavailable, cardLentNote)
			return
		}
		writeErr(w, http.StatusServiceUnavailable, probe.Detail)
		return
	}
	model := probe.Loaded
	if model == "" {
		model = cur.ChatModel
	}

	stream := newTurnStream(w, r)
	defer stream.finish()
	stream.send("turn", map[string]any{"conversationId": req.ConversationID, "rev": stored.Rev, "messages": stored.received})

	ctx, cancel := context.WithTimeout(r.Context(), 6*time.Minute)
	defer cancel()
	run, err := s.newTurnRun(ctx, r, cur, u.ID, u.IsAdmin, ws, &req, model, stream)
	if err != nil {
		stream.fail(http.StatusBadRequest, err.Error())
		return
	}
	if err := run.run(); err != nil {
		var status *chatBackendStatusError
		code := http.StatusBadGateway
		if errors.As(err, &status) && status.Status == http.StatusRequestEntityTooLarge {
			code = status.Status
		}
		stream.fail(code, err.Error())
	}
}

// receivedTurn is what receiveTurnMessages wrote.
type receivedTurn struct {
	Rev      int64
	received []storedChatMessage
}

// receiveTurnMessages writes their new texts into the conversation, marks everything of
// theirs read, and applies a redo. It returns the workspace as it now stands.
func (s *Server) receiveTurnMessages(userID int64, req *libbyTurnRequest) (receivedTurn, chatWorkspace, error) {
	var out receivedTurn
	if len(req.Messages) > 8 {
		return out, chatWorkspace{}, errors.New("too many messages in one turn")
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	ws, err := s.readChatWorkspace(userID)
	if err != nil {
		return out, ws, errors.New("chat workspace unreadable")
	}
	idx, err := findConversation(&ws, req.ConversationID, req.Conversation)
	if err != nil {
		return out, ws, err
	}
	c := &ws.Conversations[idx]
	images := map[string]bool{}
	for _, img := range ws.Images {
		images[img.ID] = true
	}
	have := map[string]bool{}
	for _, m := range c.Messages {
		have[m.ID] = true
	}
	c.Rev++
	now := time.Now().UnixMilli()
	if req.TruncateAfter != "" {
		for i, m := range c.Messages {
			if m.ID == req.TruncateAfter && m.Role == "user" {
				c.Messages = c.Messages[:i+1]
				break
			}
		}
	}
	for _, m := range req.Messages {
		clean, err := cleanIncomingMessage(m, images)
		if err != nil {
			return out, ws, err
		}
		if have[m.ID] {
			// One the autosave already brought: theirs to have edited since, so the text
			// they are asking her to answer is the text sent with the turn.
			for i := range c.Messages {
				if c.Messages[i].ID == m.ID && c.Messages[i].Role == "user" {
					c.Messages[i].Content, c.Messages[i].ImageID, c.Messages[i].Attachments = clean.Content, clean.ImageID, clean.Attachments
				}
			}
			continue
		}
		clean.Rev = c.Rev
		if clean.At <= 0 || clean.At > now {
			clean.At = now
		}
		// Never before what is already there: the log is ordered by time, and a phone
		// whose clock runs slow would otherwise file what they just said above her last
		// reply — and the turn would answer her own message.
		if n := len(c.Messages); n > 0 && clean.At <= c.Messages[n-1].At {
			clean.At = c.Messages[n-1].At + 1
		}
		c.Messages = append(c.Messages, clean)
		have[clean.ID] = true
		out.received = append(out.received, clean)
		if c.Title == "New conversation" {
			c.Title = truncateRunes(strings.TrimSpace(clean.Content), 42)
		}
	}
	if req.Redo {
		// Nothing of hers at the end is not an error: the client may already have saved
		// the cut it made before asking.
		cut := len(c.Messages)
		for cut > 0 && c.Messages[cut-1].Role == "assistant" {
			cut--
		}
		c.Messages = c.Messages[:cut]
	}
	for i := range c.Messages {
		if c.Messages[i].Role == "user" && c.Messages[i].ReadAt == 0 {
			c.Messages[i].ReadAt = now
		}
	}
	if len(c.Messages) == 0 && req.Task == "" {
		return out, ws, errors.New("there is nothing to answer")
	}
	sort.SliceStable(c.Messages, func(a, b int) bool { return c.Messages[a].At < c.Messages[b].At })
	c.UpdatedAt = now
	if err := s.writeChatWorkspace(userID, ws); err != nil {
		return out, ws, errors.New("couldn't save your message")
	}
	out.Rev = c.Rev
	return out, ws, nil
}

// cleanIncomingMessage validates one of their texts the way the workspace save does.
func cleanIncomingMessage(m storedChatMessage, images map[string]bool) (storedChatMessage, error) {
	if !validChatID(m.ID, false) {
		return m, errors.New("invalid message")
	}
	content, ok := cleanLimited(m.Content, maxChatText)
	if !ok || content == "" {
		return m, errors.New("invalid message content")
	}
	out := storedChatMessage{ID: m.ID, Role: "user", Content: content, At: m.At, ReplyTo: m.ReplyTo}
	if m.ImageID != "" {
		if !images[m.ImageID] {
			return m, errors.New("that photo isn't in the chat gallery")
		}
		out.ImageID = m.ImageID
	}
	for _, a := range m.Attachments {
		if len(out.Attachments) == maxSharedItems {
			break
		}
		if a.ID > 0 {
			title, _ := cleanLimited(a.Title, 300)
			a.Title = title
			out.Attachments = append(out.Attachments, a)
		}
	}
	if out.ReplyTo != nil {
		if out.ReplyTo.Excerpt, ok = cleanLimited(out.ReplyTo.Excerpt, 300); !ok || out.ReplyTo.Excerpt == "" {
			out.ReplyTo = nil
		}
	}
	return out, nil
}

// writeTurn applies fn to the stored conversation under chatMu, bumping its revision,
// and returns the revision written. Messages fn appends must be stamped with it, which
// is why fn is handed it.
func (s *Server) writeTurn(userID int64, convID string, fn func(c *chatConversation, rev int64)) (int64, error) {
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	ws, err := s.readChatWorkspace(userID)
	if err != nil {
		return 0, err
	}
	for i := range ws.Conversations {
		c := &ws.Conversations[i]
		if c.ID != convID {
			continue
		}
		c.Rev++
		fn(c, c.Rev)
		c.UpdatedAt = time.Now().UnixMilli()
		if len(c.Messages) > maxConversationItems {
			c.Messages = c.Messages[len(c.Messages)-maxConversationItems:]
		}
		return c.Rev, s.writeChatWorkspace(userID, ws)
	}
	// Deleted mid-turn: the user asked for that, and the reply has nowhere to go.
	return 0, errNoConversation
}

// turnView builds the view of the stored conversation a turn's helpers read.
func newTurnView(ws chatWorkspace, conv chatConversation, userID int64, isAdmin bool, req *libbyTurnRequest) (*turnView, error) {
	character, ok := findChatCharacter(ws, conv.CharacterID)
	if !ok {
		character = defaultLibbyCard()
	}
	v := &turnView{ws: ws, conv: conv, character: character, userID: userID, isAdmin: isAdmin}
	v.books = readBookkeeping(conv.Messages)
	messages := asChatMessages(conv.Messages)
	if len(messages) > maxChatMessages {
		messages = messages[len(messages)-maxChatMessages:]
	}
	// A turn with no message to answer — her speaking first, a nudge — still needs a
	// user line for the template, and it is the instruction, never stored.
	switch {
	case req.Task == "autonomous" || (len(messages) == 0 && req.Task != ""):
		messages = append(messages, chatMessage{Role: "user", Content: "(Continue the scene on your own. Speak or act again without waiting for a reply, and do not answer for me.)"})
	case req.Nudge != "":
		nudge, _ := cleanLimited(req.Nudge, 300)
		messages = append(messages, chatMessage{Role: "user", Content: "(Try that reply again. " + nudge + " Do not mention this note.)"})
	}
	if cue, _ := cleanLimited(strings.Trim(strings.TrimSpace(req.Cue), "()"), 300); cue != "" {
		messages = append(messages, chatMessage{Role: "user", Content: "(" + cue + ")"})
	}
	if len(messages) == 0 {
		return nil, errors.New("there is nothing to answer")
	}
	v.latestUser = trailingUserText(messages)
	runStart := len(messages) - 1
	for runStart > 0 && messages[runStart-1].Role == "user" {
		runStart--
	}
	for i := runStart - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			v.prevUser = messages[i].Content
			break
		}
	}
	mode := conv.Mode
	if _, ok := libbyModes[mode]; !ok {
		mode = character.DefaultMode
	}
	v.in = chatRequest{
		Mode: mode, Messages: messages, CharacterID: character.ID,
		Emotion: conv.Emotion, Intensity: clampInt(conv.Intensity, 1, 5),
		Outfit: req.Outfit, RecentImageIDs: v.books.sentImgs, RecentMediaIDs: v.books.sentMedia,
		ConversationID: conv.ID, Viewing: req.Viewing, Link: req.Link, Debug: req.Debug, Task: req.Task,
		RecentMoods: v.books.moods, RecentHeat: v.books.heat, Activity: conv.Activity, Call: req.Call,
		Background: conv.Background, Wearing: conv.Wearing, SharedMediaIDs: req.SharedMediaIDs,
		CanGenerate: true, Summary: conv.Summary, Options: conv.Options,
	}
	// The photo they just shared, read from their latest message rather than sent beside it.
	for i := len(conv.Messages) - 1; i >= 0 && conv.Messages[i].Role == "user"; i-- {
		if id := conv.Messages[i].ImageID; id != "" {
			v.in.PhotoImageID = id
			if meta, ok := imageMeta(ws, id); ok {
				v.in.PhotoTags = firstN(meta.Tags, maxPhotoTags)
			}
			break
		}
	}
	// Library items they attached to their latest texts count as shared with this turn.
	if len(v.in.SharedMediaIDs) == 0 {
		for i := len(conv.Messages) - 1; i >= 0 && conv.Messages[i].Role == "user"; i-- {
			for _, a := range conv.Messages[i].Attachments {
				v.in.SharedMediaIDs = append(v.in.SharedMediaIDs, a.ID)
			}
		}
	}
	v.in.Intensity = clampInt(v.in.Intensity, 1, 5)
	v.conv.Intensity = v.in.Intensity
	if !supportedLibbyEmotions[v.conv.Emotion] {
		v.conv.Emotion = "neutral"
	}
	return v, nil
}

func imageMeta(ws chatWorkspace, id string) (chatImage, bool) {
	for _, img := range ws.Images {
		if img.ID == id {
			return img, true
		}
	}
	return chatImage{}, false
}

// toLLMMessages is the fitted prompt in the tool-capable shape, with this turn's
// pictures on their latest message.
func toLLMMessages(fitted []chatMessage, pictures []map[string]any) []llmMessage {
	shaped := withPictures(fitted, pictures)
	out := make([]llmMessage, 0, len(shaped))
	for _, m := range shaped {
		mm := m.(map[string]any)
		out = append(out, llmMessage{Role: mm["role"].(string), Content: mm["content"]})
	}
	return out
}

// samplingPayload is the request body less messages and tools: model, the tuned
// samplers, the conversation's own overrides, stop strings and the window.
func samplingPayload(preset samplingPreset, model string, limit, replyTokens int, options map[string]any, stops []string) (map[string]any, []string) {
	payload := map[string]any{"stream": false}
	if model != "" {
		payload["model"] = model
	}
	for k, v := range samplingFields(preset) {
		payload[k] = v
	}
	payload["stop"] = stops
	payload["truncation_length"] = limit
	var overridden []string
	for key, value := range options {
		switch key {
		case "model", "messages", "stream", "truncation_length", "tools", "tool_choice", "response_format":
			continue
		case "max_tokens":
			asked := intFromAny(value)
			if asked <= 0 || asked > replyTokens {
				asked = replyTokens
			}
			if asked != replyTokens {
				overridden = append(overridden, key)
			}
			payload[key] = asked
		default:
			if _, tuned := payload[key]; tuned {
				overridden = append(overridden, key)
			}
			payload[key] = value
		}
	}
	sort.Strings(overridden)
	return payload, overridden
}
