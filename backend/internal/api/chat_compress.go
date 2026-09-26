package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

// One conversation per character, kept short by summarising what it has left behind.
//
// Each character now has one running conversation, the way a phone has one thread per
// person — which means a conversation that never ends, and a log the workspace caps at
// a few hundred messages and a prompt that holds a few dozen. Before this the only
// thing that happened to old messages was the per-turn digest (chat_budget.go): each
// dropped message's opening clause, rebuilt every turn and never kept.
//
// So the older part of a conversation can be compressed: the model writes a summary of
// it — folding in the summary from last time — the conversation keeps that and its
// newest messages, and the summary rides every turn as her notes on what came before.
// The client asks, either when told to or on its own once the log grows long or the
// conversation has gone quiet, and applies the answer itself: the log is the client's,
// and a server that rewrote the workspace here would race the client's autosave.

const (
	// maxCompressMessages bounds one request, and matches the conversation cap.
	maxCompressMessages = maxConversationItems
	// maxSummaryLen bounds the summary she is given every turn, in bytes.
	maxSummaryLen = 2400
	// compressLineLen bounds one message in the transcript she summarises. A long
	// paragraph of hers is still recognisable from its first few hundred characters.
	compressLineLen = 480
	// compressReplyTokens is the summary's allowance: comfortably past the ~250 words asked for.
	compressReplyTokens = 520
)

type compressRequest struct {
	CharacterID string        `json:"characterId"`
	Summary     string        `json:"summary"`
	Messages    []chatMessage `json:"messages"`
}

// compressDirective is what the summariser is told. Written to her, as her own notes,
// because that is how the summary is read back: as what she remembers.
func compressDirective(charName, userName string) string {
	return "You keep " + charName + "'s memory of a long, ongoing text conversation with " + userName + ". " +
		"Write a new summary that covers everything given: the previous summary, if there is one, and the messages after it. " +
		"Write it as " + charName + "'s own notes, in the past tense and plain prose, addressed to her as \"you\" (\"they told you…\", \"you promised…\"). " +
		"Keep what matters later: what you talked about, anything decided, promised or left open, what was shared, how it felt between you, and anything to pick back up. " +
		"Leave out small talk. At most 250 words. No headings, no lists, no square-bracket tags."
}

// compressTranscript renders the messages as the summariser reads them.
func compressTranscript(messages []chatMessage, charName, userName string) string {
	var b strings.Builder
	for _, m := range messages {
		text := strings.TrimSpace(m.Content)
		if text == "" {
			continue
		}
		who := userName
		if strings.EqualFold(m.Role, "assistant") {
			who = charName
		}
		b.WriteString(who + ": " + truncateRunes(strings.Join(strings.Fields(text), " "), compressLineLen) + "\n")
	}
	return b.String()
}

// handleCompressConversation writes the summary for the older part of a conversation.
func (s *Server) handleCompressConversation(w http.ResponseWriter, r *http.Request) {
	var in compressRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 2<<20)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid compress request")
		return
	}
	if len(in.Messages) == 0 || len(in.Messages) > maxCompressMessages {
		writeErr(w, http.StatusBadRequest, "nothing to compress")
		return
	}
	var ws chatWorkspace
	if u, ok := s.chatUser(r); ok {
		s.chatMu.Lock()
		ws, _ = s.readChatWorkspace(u.ID)
		s.chatMu.Unlock()
	}
	character, found := findChatCharacter(ws, in.CharacterID)
	if !found {
		character = defaultLibbyCard()
	}
	userName := strings.TrimSpace(ws.Profile.DisplayName)
	if userName == "" {
		userName = "them"
	}
	transcript := compressTranscript(in.Messages, character.Name, userName)
	// Within the window, less the instructions and the summary's own room: the oldest
	// lines go first, since the previous summary already stands for what came before them.
	limit := s.chatContextLimit(r.Context())
	room := (limit - compressReplyTokens - replyHeadroom - 400 - estimateTokens(in.Summary)) * 4
	for room > 0 && len(transcript) > room {
		cut := strings.IndexByte(transcript, '\n')
		if cut < 0 {
			break
		}
		transcript = transcript[cut+1:]
	}
	var user strings.Builder
	if summary := strings.TrimSpace(in.Summary); summary != "" {
		user.WriteString("Previous summary:\n" + summary + "\n\n")
	}
	user.WriteString("Messages since:\n" + transcript)

	probeCtx, probeCancel := context.WithTimeout(r.Context(), 5*time.Second)
	probe := s.probeChatBackend(probeCtx)
	probeCancel()
	if !probe.Ready {
		writeErr(w, http.StatusServiceUnavailable, probe.Detail)
		return
	}
	payload := map[string]any{
		"messages": []chatMessage{
			{Role: "system", Content: compressDirective(character.Name, userName)},
			{Role: "user", Content: user.String()},
		},
		"stream": false, "temperature": 0.3, "top_p": 0.9, "max_tokens": compressReplyTokens,
		"truncation_length": limit,
	}
	if probe.Loaded != "" {
		payload["model"] = probe.Loaded
	}
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Minute)
	defer cancel()
	reply, err := s.postChatCompletion(ctx, payload)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	summary := strings.TrimSpace(scrubDirectives(reply))
	if summary == "" {
		writeErr(w, http.StatusBadGateway, "the model wrote no summary")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"summary": truncateRunes(summary, maxSummaryLen)})
}

// summaryDirective is how the summary reaches her on a turn: her notes on what came
// before the messages she can see.
func summaryDirective(summary string) string {
	summary = strings.TrimSpace(summary)
	if summary == "" {
		return ""
	}
	return "\n\nEarlier in this conversation — your own notes on what came before the messages below:\n" + truncateRunes(summary, maxSummaryLen)
}
