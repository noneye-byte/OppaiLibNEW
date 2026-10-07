package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// Her stories.
//
// She has a life between conversations — it is in her card, her routine, her journal —
// and none of it was ever visible: she existed while you were typing to her. A story is
// that life shown. While they are away, at an hour a person posts things, she takes a
// picture of herself doing something and writes a line under it; it waits at the top of
// the chat as a ring, for a day, and replying to it opens a conversation the way a reply
// to anyone's story does.
//
// Strictly bounded: off unless the operator turns it on, at most a few a day, never
// while they are chatting or within hours of the last story, never at night, never when
// the generator or her model is busy. Each story is one generation and one short model
// call, run by the same camera and the same line every picture of her is held to.

const (
	storyTTL        = 24 * time.Hour
	storyIdleAfter  = 3 * time.Hour
	storyGap        = 4 * time.Hour
	storySweepEvery = 20 * time.Minute
	maxStories      = 12
	storyFirstHour  = 9
	storyLastHour   = 23
)

type libbyStory struct {
	ID      string `json:"id"`
	ImageID string `json:"imageId"`
	Caption string `json:"caption"`
	At      int64  `json:"at"`
	Seen    bool   `json:"seen,omitempty"`
}

type libbyStories struct {
	Stories []libbyStory `json:"stories"`
}

var storiesMu sync.Mutex

func (s *Server) libbyStoriesPath(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "libby-stories.json.enc")
}

func storiesAAD(userID int64) []byte { return []byte(fmt.Sprintf("libby-stories:%d", userID)) }

// readStories reads a user's stories, dropping expired ones. Called under storiesMu.
func (s *Server) readStories(userID int64, now time.Time) libbyStories {
	out := libbyStories{Stories: []libbyStory{}}
	blob, err := os.ReadFile(s.libbyStoriesPath(userID))
	if err != nil {
		return out
	}
	raw, err := crypto.OpenBytes(s.kek, blob, storiesAAD(userID))
	if err != nil || json.Unmarshal(raw, &out) != nil {
		return libbyStories{Stories: []libbyStory{}}
	}
	live := out.Stories[:0]
	for _, st := range out.Stories {
		if now.Sub(time.UnixMilli(st.At)) < storyTTL {
			live = append(live, st)
		}
	}
	out.Stories = live
	return out
}

func (s *Server) writeStories(userID int64, st libbyStories) error {
	if len(st.Stories) > maxStories {
		st.Stories = st.Stories[len(st.Stories)-maxStories:]
	}
	raw, err := json.Marshal(st)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, storiesAAD(userID))
	if err != nil {
		return err
	}
	dir := s.chatUserDir(userID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	tmp := s.libbyStoriesPath(userID) + ".tmp"
	if err := os.WriteFile(tmp, blob, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, s.libbyStoriesPath(userID))
}

// storyDue says whether she may post one now. Pure, for testing.
func storyDue(now time.Time, lastChat, lastStory time.Time, todayCount, perDay int) bool {
	if h := now.Hour(); h < storyFirstHour || h >= storyLastHour {
		return false
	}
	if !lastChat.IsZero() && now.Sub(lastChat) < storyIdleAfter {
		return false
	}
	if !lastStory.IsZero() && now.Sub(lastStory) < storyGap {
		return false
	}
	return todayCount < perDay
}

// storiesToday counts stories posted since local midnight.
func storiesToday(st libbyStories, now time.Time) (int, time.Time) {
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	n := 0
	var last time.Time
	for _, s := range st.Stories {
		at := time.UnixMilli(s.At)
		if !at.Before(midnight) {
			n++
		}
		if at.After(last) {
			last = at
		}
	}
	return n, last
}

// startStories runs the sweep for the life of the server.
func (s *Server) startStories() {
	ticker := time.NewTicker(storySweepEvery)
	defer ticker.Stop()
	for range ticker.C {
		s.storySweep(context.Background())
	}
}

func (s *Server) storySweep(ctx context.Context) {
	cur := s.settings.Get()
	if !cur.LibbyStories || !cur.ImageGenEnabled || cur.ChatURL == "" || s.card.parkedModel() != "" {
		return
	}
	now := time.Now()
	var lastChat time.Time
	if at := s.lastChatAt.Load(); at != 0 {
		lastChat = time.UnixMilli(at)
	}
	for _, userID := range s.chatUserIDs() {
		storiesMu.Lock()
		st := s.readStories(userID, now)
		storiesMu.Unlock()
		count, last := storiesToday(st, now)
		if !storyDue(now, lastChat, last, count, cur.LibbyStoriesPerDay) {
			continue
		}
		if _, err := s.postStory(ctx, userID); err != nil {
			s.log.Info("libby story: skipped", "err", err)
			return
		}
	}
}

// storyIdea is what she is asked for: a line and the picture under it.
type storyIdea struct {
	Caption string `json:"caption"`
	Shot    string `json:"shot"`
	Framing string `json:"framing"`
	Place   string `json:"place"`
	Doing   string `json:"doing"`
}

// postStory has her come up with a moment from her day, takes it, and posts it.
func (s *Server) postStory(ctx context.Context, userID int64) (libbyStory, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	s.chatMu.Lock()
	ws, err := s.readChatWorkspace(userID)
	journal, _ := s.readLibbyJournal(userID)
	s.chatMu.Unlock()
	if err != nil {
		return libbyStory{}, err
	}
	character, ok := findChatCharacter(ws, "libby")
	if !ok {
		character = defaultLibbyCard()
	}
	// Where she last was and what she last had on, so the story is of the same woman.
	var latest chatConversation
	for _, c := range ws.Conversations {
		if c.CharacterID == "libby" && c.UpdatedAt > latest.UpdatedAt {
			latest = c
		}
	}
	idea, err := s.storyIdea(ctx, character, journal, time.Now())
	if err != nil {
		return libbyStory{}, err
	}
	rooms := s.listLibbyBackgrounds()
	place := idea.Place
	if id, ok := resolveBackground(place, rooms); ok {
		place = backgroundWords(id, rooms)
	}
	activity := ""
	if a := strings.ToLower(strings.TrimSpace(idea.Doing)); libbyActivityDeclarable(a) && allowedActivity(a, 1) != "" {
		activity = a
	}
	res, err := s.takePictures(ctx, cameraRequest{
		userID: userID, shot: idea.Shot, framing: idea.Framing,
		wearing: latest.Wearing, activity: activity, place: place, intensity: 1,
		weights: ws.SendWeights,
	})
	if err != nil {
		return libbyStory{}, err
	}
	if len(res.images) == 0 {
		return libbyStory{}, errors.New("no picture")
	}
	story := libbyStory{ID: randomID(), ImageID: res.images[0].ID, Caption: idea.Caption, At: time.Now().UnixMilli()}
	storiesMu.Lock()
	defer storiesMu.Unlock()
	st := s.readStories(userID, time.Now())
	st.Stories = append(st.Stories, story)
	return story, s.writeStories(userID, st)
}

// storyIdeaPrompt asks for one ordinary moment, not a performance: a story is her day,
// and it is posted at heat 1 to someone who is not there.
func storyIdeaPrompt(character chatCharacter, journal libbyJournal, now time.Time) string {
	var b strings.Builder
	b.WriteString("You are Libby, posting a story — one picture and one short line — for the person you live with to see later. ")
	b.WriteString("It is " + now.Format("Monday, 3pm") + ". ")
	if r := strings.TrimSpace(character.Routine); r != "" {
		b.WriteString("Your days: " + r + " ")
	}
	if t := strings.TrimSpace(character.Tastes); t != "" {
		b.WriteString("Your taste: " + t + " ")
	}
	if n := len(journal.Entries); n > 0 {
		b.WriteString("What you last wrote to yourself: " + truncateRunes(journal.Entries[n-1].Text, 400) + " ")
	}
	b.WriteString("Pick an ordinary moment from right now — something you are doing, somewhere you are — the kind a person posts. ")
	b.WriteString("The caption is lowercase texting, under 15 words, maybe aimed at them. The shot is booru-style tags for the picture: angle, pose, hands, expression, surroundings, light — not your face, hair, body or clothes. ")
	b.WriteString("Keep it safe for a story: clothed, nothing explicit. ")
	b.WriteString(`Answer with only JSON: {"caption": "...", "shot": "...", "framing": "selfie|mirror selfie|close-up|upper body|full body|from above|pov", "place": "a few words", "doing": "one of reading, gaming, lounging, drinking, eating, stretching, napping, dancing, tidying, drawing, or empty"}`)
	return b.String()
}

func (s *Server) storyIdea(ctx context.Context, character chatCharacter, journal libbyJournal, now time.Time) (storyIdea, error) {
	cur := s.settings.Get()
	payload := map[string]any{
		"messages":    []chatMessage{{Role: "user", Content: storyIdeaPrompt(character, journal, now)}},
		"temperature": 0.9, "max_tokens": 220, "stream": false,
	}
	if cur.ChatModel != "" {
		payload["model"] = cur.ChatModel
	}
	raw, err := s.postChatCompletion(ctx, payload)
	if err != nil {
		return storyIdea{}, err
	}
	match := judgeJSON.FindString(raw)
	var idea storyIdea
	if match == "" || json.Unmarshal([]byte(match), &idea) != nil {
		return storyIdea{}, errors.New("no story idea came back")
	}
	idea.Caption = truncateRunes(strings.TrimSpace(scrubDirectives(idea.Caption)), 160)
	idea.Shot = cleanShot(idea.Shot)
	if idea.Caption == "" || idea.Shot == "" {
		return storyIdea{}, errors.New("the story idea was empty")
	}
	if shotIsRefused(idea.Shot, idea.Caption, idea.Place) {
		return storyIdea{}, errShotRefused
	}
	return idea, nil
}

// ── endpoints ────────────────────────────────────────────────────────────────

func (s *Server) handleListLibbyStories(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	storiesMu.Lock()
	st := s.readStories(u.ID, time.Now())
	storiesMu.Unlock()
	sort.Slice(st.Stories, func(a, b int) bool { return st.Stories[a].At < st.Stories[b].At })
	unseen := 0
	for _, story := range st.Stories {
		if !story.Seen {
			unseen++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"stories": st.Stories, "unseen": unseen, "enabled": s.settings.Get().LibbyStories})
}

func (s *Server) handleSeenLibbyStory(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	id := r.PathValue("id")
	storiesMu.Lock()
	defer storiesMu.Unlock()
	st := s.readStories(u.ID, time.Now())
	for i := range st.Stories {
		if st.Stories[i].ID == id {
			st.Stories[i].Seen = true
			if err := s.writeStories(u.ID, st); err != nil {
				writeErr(w, http.StatusInternalServerError, "couldn't save")
				return
			}
			writeJSON(w, http.StatusOK, st.Stories[i])
			return
		}
	}
	writeErr(w, http.StatusNotFound, "no such story")
}

// handlePostLibbyStory is "post one now", which skips the schedule but not the rules a
// picture of her is held to.
func (s *Server) handlePostLibbyStory(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	cur := s.settings.Get()
	if !cur.ImageGenEnabled || cur.ChatURL == "" {
		writeErr(w, http.StatusServiceUnavailable, "stories need her model and an image generator")
		return
	}
	story, err := s.postStory(r.Context(), u.ID)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, story)
}
