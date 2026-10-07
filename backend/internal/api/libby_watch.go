package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Watching together.
//
// Browsing with her already let her see what was open. A video is different: what
// matters is the moment, and the moment moves. With "watch with Libby" on, the viewer
// sends a frame of what is on screen every so often — captured from the playing video
// in the browser, so nothing is decrypted or decoded on this side — and she looks at it
// and decides whether it is worth a word. Mostly it is not; a person watching with you
// does not narrate. When it is, the line goes into your conversation with her and
// floats over the video.
//
// Throttled per user so a long video is a handful of comments, not a commentary.

const (
	watchMinGap     = 50 * time.Second
	maxWatchFrame   = 600 << 10
	watchMaxSayRune = 220
)

var watchLast = struct {
	sync.Mutex
	at map[int64]time.Time
}{at: map[int64]time.Time{}}

type watchReq struct {
	ConversationID string  `json:"conversationId"`
	MediaID        int64   `json:"mediaId"`
	Position       float64 `json:"position"`
	// Frame is the moment on screen as a data: URL, captured by the client.
	Frame string `json:"frame"`
}

// watchVerdict is what she decides about the moment.
type watchVerdict struct {
	Say string `json:"say"`
}

func decodeWatchFrame(dataURL string) (image.Image, error) {
	_, payload, found := strings.Cut(dataURL, ",")
	if !found || !strings.HasPrefix(dataURL, "data:image/") {
		return nil, errors.New("the frame is not a picture")
	}
	if len(payload) > maxWatchFrame*4/3+16 {
		return nil, errors.New("the frame is too large")
	}
	raw, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return nil, errors.New("the frame is not a picture")
	}
	img, _, err := image.Decode(bytes.NewReader(raw))
	return img, err
}

// watchPrompt is the one-shot question: is this moment worth a word, and which.
func watchPrompt(character chatCharacter, title, seen string, position float64, recent []storedChatMessage, heat int) string {
	var b strings.Builder
	b.WriteString("You are " + character.Name + ", watching a video with the person you live with, on their screen, right now. ")
	if p := strings.TrimSpace(character.Personality); p != "" {
		b.WriteString("Who you are: " + truncateRunes(p, 500) + " ")
	}
	if st := strings.TrimSpace(character.Style); st != "" {
		b.WriteString("How you write: " + truncateRunes(st, 300) + " ")
	}
	fmt.Fprintf(&b, "Heat between you is %d of 5. ", clampInt(heat, 1, 5))
	if title != "" {
		b.WriteString("The video is \"" + truncateRunes(title, 120) + "\". ")
	}
	fmt.Fprintf(&b, "It is %d:%02d in. ", int(position)/60, int(position)%60)
	if seen != "" {
		b.WriteString("What is on screen: " + truncateRunes(seen, 600) + " ")
	}
	if len(recent) > 0 {
		b.WriteString("\nThe last few lines between you:\n")
		for _, m := range recent {
			who := "Them"
			if m.Role == "assistant" {
				who = "You"
			}
			b.WriteString(who + ": " + truncateRunes(strings.Join(strings.Fields(m.Content), " "), 160) + "\n")
		}
	}
	b.WriteString("\nMost moments deserve nothing — someone watching with you does not narrate. Only if this one genuinely gets a reaction out of you — it's hot, funny, ridiculous, reminds you of something — say one short line, the way you'd say it out loud next to them. ")
	b.WriteString(`Answer with only JSON: {"say": ""} to stay quiet, or {"say": "your line"}.`)
	return b.String()
}

func (s *Server) handleLibbyWatch(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	cur := s.settings.Get()
	if cur.ChatURL == "" {
		writeErr(w, http.StatusServiceUnavailable, "Libby chat is not configured")
		return
	}
	var req watchReq
	if err := json.NewDecoder(io.LimitReader(r.Body, maxWatchFrame*2)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid watch tick")
		return
	}
	watchLast.Lock()
	if last, ok := watchLast.at[u.ID]; ok && time.Since(last) < watchMinGap {
		watchLast.Unlock()
		writeJSON(w, http.StatusOK, map[string]any{"quiet": true})
		return
	}
	watchLast.at[u.ID] = time.Now()
	watchLast.Unlock()
	frame, err := decodeWatchFrame(req.Frame)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	s.chatMu.Lock()
	ws, err := s.readChatWorkspace(u.ID)
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "chat workspace unreadable")
		return
	}
	// The viewer does not know which conversation is open in the chat; unnamed, it is
	// her most recent one.
	var conv *chatConversation
	for i := range ws.Conversations {
		c := &ws.Conversations[i]
		switch {
		case req.ConversationID != "" && c.ID == req.ConversationID:
			conv = c
		case req.ConversationID == "" && c.CharacterID == "libby" && (conv == nil || c.UpdatedAt > conv.UpdatedAt):
			conv = c
		}
	}
	if conv == nil || conv.CharacterID != "libby" {
		writeErr(w, http.StatusNotFound, "that conversation doesn't exist")
		return
	}
	character, _ := findChatCharacter(ws, "libby")
	title := ""
	if req.MediaID > 0 {
		if row, err := s.db.GetMedia(r.Context(), req.MediaID); err == nil {
			title = s.decrypt(row.TitleEnc, "title")
		}
	}
	recent := conv.Messages[max(0, len(conv.Messages)-4):]

	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()
	verdict, err := s.watchVerdict(ctx, character, title, req.Position, frame, recent, conv.Intensity)
	if err != nil {
		s.log.Info("libby watch: no verdict", "err", err)
		writeJSON(w, http.StatusOK, map[string]any{"quiet": true})
		return
	}
	say := truncateRunes(strings.TrimSpace(scrubDirectives(verdict.Say)), watchMaxSayRune)
	if say == "" {
		writeJSON(w, http.StatusOK, map[string]any{"quiet": true})
		return
	}
	msg := storedChatMessage{ID: randomID(), Role: "assistant", Content: say, At: time.Now().UnixMilli()}
	rev, err := s.writeTurn(u.ID, conv.ID, func(c *chatConversation, rev int64) {
		msg.Rev = rev
		c.Messages = append(c.Messages, msg)
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't keep what she said")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"message": msg, "rev": rev, "conversationId": conv.ID})
}

// watchVerdict asks her about the frame: shown it directly when her model can see,
// otherwise told about it by the vision model.
func (s *Server) watchVerdict(ctx context.Context, character chatCharacter, title string, position float64, frame image.Image, recent []storedChatMessage, heat int) (watchVerdict, error) {
	cur := s.settings.Get()
	seen := ""
	sees := chatSeesPictures(cur.ChatVision, cur.ChatModel) && !knownBlind(cur.ChatURL, cur.ChatModel)
	if !sees {
		if !cur.VisionEnabled {
			return watchVerdict{}, errors.New("nothing can see the screen")
		}
		text, err := s.visionClient().Ask(ctx, "Describe what is happening in this video frame in two plain sentences: who, doing what, where.", []image.Image{frame}, 160, 0.3)
		if err != nil {
			return watchVerdict{}, err
		}
		seen = text
	}
	prompt := watchPrompt(character, title, seen, position, recent, heat)
	var content any = prompt
	if sees {
		part, err := visionPart(frame)
		if err != nil {
			return watchVerdict{}, err
		}
		content = []map[string]any{{"type": "text", "text": prompt}, part}
	}
	payload := map[string]any{
		"messages":    []map[string]any{{"role": "user", "content": content}},
		"temperature": 0.8, "max_tokens": 120, "stream": false,
	}
	if cur.ChatModel != "" {
		payload["model"] = cur.ChatModel
	}
	raw, err := s.postChatCompletion(ctx, payload)
	if err != nil {
		return watchVerdict{}, err
	}
	var v watchVerdict
	if match := judgeJSON.FindString(raw); match == "" || json.Unmarshal([]byte(match), &v) != nil {
		return watchVerdict{}, errors.New("no verdict")
	}
	return v, nil
}
