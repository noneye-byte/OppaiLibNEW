package api

import (
	"errors"
	"sort"
	"strings"
	"time"
)

// The conversation as the server's to keep.
//
// Every turn used to arrive carrying its own past: the mood run, the heat run, which
// pictures had been sent, what she had on, where she was, what she was doing — each a
// field on the request, each added the release after its absence was noticed, because
// the server held nothing between requests. The log itself lived in the workspace file
// all along; it was only ever round-tripped through the client.
//
// A turn now reads the conversation from the workspace, writes her replies into it, and
// derives that bookkeeping from what is stored. The one hazard is the workspace's own
// save, which is a whole-document PUT: a client that loaded the conversation before her
// reply landed would save it back without the reply. Each conversation therefore
// carries a revision the server bumps on every write, and every message the server
// writes is stamped with the revision it was written at. A client sends back the
// revision it last saw, and mergeServerTurns restores what it could not have seen.

// maxPhotoSet bounds a set of pictures sent as one message.
const maxPhotoSet = 4

// mergeServerTurns folds what the server wrote since a client last looked back into
// the workspace that client is saving.
//
// Per conversation: a server-written message the client has not got, stamped later than
// the revision the client says it saw, is one it never had, so it goes back in, in time
// order. One stamped at or before that revision is one the client had and removed, and
// stays removed. The state a turn settles — mood, heat, activity, room, clothes, scene —
// is the server's when the client is behind, for the same reason.
func mergeServerTurns(ws *chatWorkspace, old chatWorkspace) {
	stored := make(map[string]*chatConversation, len(old.Conversations))
	for i := range old.Conversations {
		stored[old.Conversations[i].ID] = &old.Conversations[i]
	}
	for i := range ws.Conversations {
		c := &ws.Conversations[i]
		prev, ok := stored[c.ID]
		if !ok || prev.Rev <= c.Rev {
			if ok && prev.Rev > 0 {
				c.Rev = prev.Rev
			}
			continue
		}
		have := make(map[string]bool, len(c.Messages))
		for _, m := range c.Messages {
			have[m.ID] = true
		}
		added := false
		for _, m := range prev.Messages {
			if m.Rev > c.Rev && !have[m.ID] {
				c.Messages = append(c.Messages, m)
				added = true
			}
		}
		if added {
			sort.SliceStable(c.Messages, func(a, b int) bool { return c.Messages[a].At < c.Messages[b].At })
			if len(c.Messages) > maxConversationItems {
				c.Messages = c.Messages[len(c.Messages)-maxConversationItems:]
			}
		}
		c.Emotion, c.Intensity, c.Progress = prev.Emotion, prev.Intensity, prev.Progress
		c.Activity, c.Background, c.Wearing, c.Scene = prev.Activity, prev.Background, prev.Wearing, prev.Scene
		if prev.UpdatedAt > c.UpdatedAt {
			c.UpdatedAt = prev.UpdatedAt
		}
		c.Rev = prev.Rev
	}
}

// errNoConversation is a turn for a conversation that does not exist and was not
// described well enough to create.
var errNoConversation = errors.New("that conversation doesn't exist")

// conversationShell is what a client says about a conversation it has just created and
// not yet saved, so the first turn does not have to wait for the autosave.
type conversationShell struct {
	CharacterID string `json:"characterId"`
	Title       string `json:"title"`
	Mode        string `json:"mode"`
}

// findConversation returns the conversation's index, creating it from the shell when it
// is new.
func findConversation(ws *chatWorkspace, id string, shell *conversationShell) (int, error) {
	for i := range ws.Conversations {
		if ws.Conversations[i].ID == id {
			return i, nil
		}
	}
	if shell == nil || !validChatID(id, false) {
		return -1, errNoConversation
	}
	if _, ok := findChatCharacter(*ws, shell.CharacterID); !ok {
		return -1, errNoConversation
	}
	if len(ws.Conversations) >= maxChatConversations {
		return -1, errors.New("too many conversations")
	}
	now := time.Now().UnixMilli()
	title, _ := cleanLimited(shell.Title, 160)
	if title == "" {
		title = "New conversation"
	}
	mode := shell.Mode
	if _, ok := libbyModes[mode]; !ok {
		mode = "sweet"
	}
	ws.Conversations = append(ws.Conversations, chatConversation{
		ID: id, CharacterID: shell.CharacterID, Title: title, Mode: mode,
		Emotion: "neutral", Intensity: 1, Progress: 1,
		Messages: []storedChatMessage{}, CreatedAt: now, UpdatedAt: now,
	})
	return len(ws.Conversations) - 1, nil
}

// asChatMessages is the stored log in the shape the prompt builders read. Thoughts are
// left out: they were never said, and replaying them as her lines teaches the model the
// format belongs inline.
func asChatMessages(stored []storedChatMessage) []chatMessage {
	out := make([]chatMessage, 0, len(stored))
	for _, m := range stored {
		if m.Thought != "" || strings.TrimSpace(m.Content) == "" {
			continue
		}
		cm := chatMessage{Role: m.Role, Content: m.Content, ID: m.ID, ReplyTo: m.ReplyTo, ImageID: m.ImageID, Reactions: m.Reactions}
		if cm.ImageID == "" && len(m.Images) > 0 {
			cm.ImageID = m.Images[0]
		}
		for _, a := range m.Attachments {
			cm.MediaIDs = append(cm.MediaIDs, a.ID)
		}
		out = append(out, cm)
	}
	return out
}

// conversationBookkeeping is what turns used to carry in from the client, read off the
// stored log instead: the faces and heat her recent replies wore, oldest first, and
// what she has already sent.
type conversationBookkeeping struct {
	moods     []string
	heat      []int
	sentImgs  []string
	sentMedia []int64
	lastPhoto *storedChatMessage
}

// bookkeepingWindow is how far back the runs and the sent lists look — the same reach
// the client-side versions had, so nothing about how she repeats herself changes.
const bookkeepingWindow = 12

func readBookkeeping(stored []storedChatMessage) conversationBookkeeping {
	var b conversationBookkeeping
	for i := range stored {
		m := &stored[i]
		if m.Role != "assistant" || m.Thought != "" {
			continue
		}
		if m.Mood != "" {
			b.moods = append(b.moods, m.Mood)
		}
		if m.Heat > 0 {
			b.heat = append(b.heat, m.Heat)
		}
		ids := m.Images
		if len(ids) == 0 && m.ImageID != "" {
			ids = []string{m.ImageID}
		}
		if len(ids) > 0 {
			b.sentImgs = append(b.sentImgs, ids...)
			b.lastPhoto = m
		}
		for _, a := range m.Attachments {
			b.sentMedia = append(b.sentMedia, a.ID)
		}
	}
	tail := func(n int) int { return max(0, n-bookkeepingWindow) }
	b.moods = b.moods[tail(len(b.moods)):]
	b.heat = b.heat[tail(len(b.heat)):]
	b.sentImgs = b.sentImgs[tail(len(b.sentImgs)):]
	b.sentMedia = b.sentMedia[tail(len(b.sentMedia)):]
	return b
}

// lastPictureOfHers is the newest picture she sent in this conversation, the one an
// edit or a clip starts from.
func lastPictureOfHers(stored []storedChatMessage) string {
	for i := len(stored) - 1; i >= 0; i-- {
		m := stored[i]
		if m.Role != "assistant" {
			continue
		}
		if len(m.Images) > 0 {
			return m.Images[len(m.Images)-1]
		}
		if m.ImageID != "" {
			return m.ImageID
		}
	}
	return ""
}

// lastPictureOfTheirs is the newest photo they shared, within the last few messages —
// "copy this pose" means the one they just sent, not one from an hour ago.
func lastPictureOfTheirs(stored []storedChatMessage) string {
	for i := len(stored) - 1; i >= 0 && i >= len(stored)-6; i-- {
		if stored[i].Role == "user" && stored[i].ImageID != "" {
			return stored[i].ImageID
		}
	}
	return ""
}
