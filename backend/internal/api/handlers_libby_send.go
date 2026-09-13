package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

// ── a picture sent as her ────────────────────────────────────────────────────
//
// The studio can hand a finished picture straight into the conversation as something
// Libby sent: the picture is filed in the library as one of her (the identity tag,
// so she knows it is her from now on and can reach for it again), and a message from
// her carrying it lands in the chat. The message is written server-side because the
// workspace is server-owned and the chat screen may not be open — the studio is a
// different screen, and on the phone a different activity entirely.

type libbySendReq struct {
	MediaID int64 `json:"mediaId"`
	// Text is her line under the picture. Empty means the stage direction every
	// wordless picture carries.
	Text string `json:"text"`
	// ConversationID names the chat to drop it into; empty means her most recent
	// one, or a new one when there is none.
	ConversationID string `json:"conversationId"`
	// Snap sends it to be seen once, like a selfie sent that way.
	Snap bool `json:"snap"`
	// Mood is the face she wears on the message; unset means happy — she is showing
	// you something she made.
	Mood string `json:"mood"`
}

const maxLibbySendText = 2000

func (s *Server) handleLibbySend(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var in libbySendReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&in); err != nil || in.MediaID <= 0 {
		writeErr(w, http.StatusBadRequest, "which picture?")
		return
	}
	ctx := r.Context()
	row, err := s.db.GetMedia(ctx, in.MediaID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "no such item")
		return
	}
	if !pictureKinds[row.Kind] {
		writeErr(w, http.StatusBadRequest, "only a picture can be sent as her")
		return
	}
	text := strings.TrimSpace(in.Text)
	if len(text) > maxLibbySendText {
		writeErr(w, http.StatusBadRequest, "that caption is too long")
		return
	}
	mood := strings.ToLower(strings.TrimSpace(in.Mood))
	if !supportedLibbyEmotions[mood] {
		mood = "happy"
	}
	if in.ConversationID != "" && !chatObjectID.MatchString(in.ConversationID) {
		writeErr(w, http.StatusBadRequest, "bad conversation id")
		return
	}

	// The picture is hers from now on. The manual verdict path, minus the reference
	// bookkeeping: a picture sent as her is a picture of her, and a picture the user
	// had ruled out earlier is un-ruled by sending it.
	if err := s.db.AddTag(ctx, in.MediaID, libbyIdentityTag, libbyIdentityCategory, "manual", 0); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't tag that as her")
		return
	}
	_ = s.db.AddTag(ctx, in.MediaID, "libby", "general", "manual", 0)
	identityMu.Lock()
	identity := s.readLibbyIdentity()
	if len(withoutID(identity.Rejected, in.MediaID)) != len(identity.Rejected) {
		identity.Rejected = withoutID(identity.Rejected, in.MediaID)
		_ = s.writeLibbyIdentity(identity)
	}
	identityMu.Unlock()
	s.touchLibraryIndex()

	title := s.decrypt(row.TitleEnc, "title")
	if title == "" {
		title = "Untitled"
	}
	attachment := libbyAttachment{
		libbyLink: libbyLink{ID: in.MediaID, Title: title, Kind: row.Kind, HasThumb: row.ThumbPath.Valid && row.ThumbPath.String != ""},
		Self:      true,
	}
	if text == "" {
		if in.Snap {
			text = "*sends a snap*"
		} else {
			text = "*sends a picture*"
		}
	}

	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	ws, err := s.readChatWorkspace(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "chat workspace unreadable")
		return
	}
	now := time.Now().UnixMilli()
	at := -1
	if in.ConversationID != "" {
		for i := range ws.Conversations {
			if ws.Conversations[i].ID == in.ConversationID {
				at = i
				break
			}
		}
		if at < 0 {
			writeErr(w, http.StatusNotFound, "no such conversation")
			return
		}
	} else {
		// Her most recent chat, whichever screen it was had on.
		for i := range ws.Conversations {
			c := ws.Conversations[i]
			if c.CharacterID != "libby" {
				continue
			}
			if at < 0 || c.UpdatedAt > ws.Conversations[at].UpdatedAt {
				at = i
			}
		}
	}
	if at < 0 {
		card, _ := findChatCharacter(ws, "libby")
		mode := card.DefaultMode
		if mode == "" {
			mode = defaultLibbyCard().DefaultMode
		}
		ws.Conversations = append(ws.Conversations, chatConversation{
			ID: randomID(), CharacterID: "libby", Title: "Libby", Mode: mode, Emotion: mood, Intensity: 1,
			Messages: []storedChatMessage{}, CreatedAt: now, UpdatedAt: now,
		})
		at = len(ws.Conversations) - 1
	}
	message := storedChatMessage{
		ID: randomID(), Role: "assistant", Content: text, At: now,
		Attachments: []libbyAttachment{attachment}, Mood: mood, Snap: in.Snap,
	}
	ws.Conversations[at].Messages = append(ws.Conversations[at].Messages, message)
	ws.Conversations[at].Emotion = mood
	ws.Conversations[at].UpdatedAt = now
	if err := s.writeChatWorkspace(u.ID, ws); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the chat")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"conversationId": ws.Conversations[at].ID,
		"messageId":      message.ID,
		"attachment":     attachment,
	})
}
