package api

import (
	"errors"
	"strings"
	"sync"
	"time"
)

// The late note's way out, and what a turn's rounds cost.
//
// fitChatTurnCached puts what changes each turn in a system message after the
// conversation has started. text-generation-webui keeps such a message where it is, and
// the chat templates OppaiLib's users run (Mistral's, ChatML, Llama 3) render one, but a
// strict template can refuse it — Gemma's raises "System role not supported" from
// inside its Jinja. A turn that fails that way is sent again in the old layout, the note
// folded into the first system message, and the backend and model are remembered so
// later turns start there.

var lateNoteRefusals = struct {
	sync.Mutex
	m map[string]bool
}{m: map[string]bool{}}

func lateNoteRefused(url, model string) bool {
	lateNoteRefusals.Lock()
	defer lateNoteRefusals.Unlock()
	return lateNoteRefusals.m[url+"\x00"+model]
}

func rememberLateNoteRefused(url, model string) {
	lateNoteRefusals.Lock()
	lateNoteRefusals.m[url+"\x00"+model] = true
	lateNoteRefusals.Unlock()
}

// refusedLateNote reads a backend error for a template that would not render the
// message order. Narrow on purpose: a turn that failed for any other reason must fail
// as itself, not be sent twice.
func refusedLateNote(err error) bool {
	var status *chatBackendStatusError
	if !errors.As(err, &status) || status.Status < 400 || status.Status > 500 {
		return false
	}
	lower := strings.ToLower(status.msg)
	if !strings.Contains(lower, "system") && !strings.Contains(lower, "role") {
		return false
	}
	// "Conversation roles must alternate user/assistant/…" (Mistral's older templates),
	// "System role not supported" (Gemma's), or a Jinja exception that names either.
	for _, cue := range []string{"alternate", "not supported", "template", "jinja"} {
		if strings.Contains(lower, cue) {
			return true
		}
	}
	return false
}

// hasLateNote reports whether a fitted prompt has a system message after the first
// message that is not one.
func hasLateNote(fitted []chatMessage) bool {
	return lateNoteIndex(fitted) >= 0
}

func lateNoteIndex(fitted []chatMessage) int {
	seenOther := false
	for i, m := range fitted {
		if m.Role != "system" {
			seenOther = true
			continue
		}
		if seenOther {
			return i
		}
	}
	return -1
}

// foldLateNote moves every system message that follows the conversation's start into
// the first system message, in order — the layout fitChatTurn always produced.
func foldLateNote(fitted []chatMessage) []chatMessage {
	if len(fitted) == 0 || fitted[0].Role != "system" {
		return fitted
	}
	out := make([]chatMessage, 0, len(fitted))
	out = append(out, fitted[0])
	seenOther := false
	for _, m := range fitted[1:] {
		if m.Role == "system" && seenOther {
			out[0].Content = strings.TrimRight(out[0].Content, "\n") + "\n\n" + strings.TrimSpace(m.Content)
			continue
		}
		if m.Role != "system" {
			seenOther = true
		}
		out = append(out, m)
	}
	return out
}

// timeRound logs what one round cost and keeps it for the turn's done event.
//
// Without numbers "her replies take far too long" could not be told apart: a prompt
// read again from the top every turn, a slow sampler, a second round, a reply that ran
// to its token limit. The log says which: cached is llama.cpp's cache_n, the share of
// the prompt it did not have to read again (zero for backends that do not report it).
func (t *turnRun) timeRound(round int, began time.Time, reply llmReply) {
	took := time.Since(began)
	entry := map[string]any{
		"round": round, "ms": took.Milliseconds(),
		"promptTokens": reply.Usage.PromptTokens, "replyTokens": reply.Usage.CompletionTokens,
		"calls": len(reply.Calls),
	}
	args := []any{"round", round, "ms", took.Milliseconds(), "promptTokens", reply.Usage.PromptTokens,
		"replyTokens", reply.Usage.CompletionTokens, "calls", len(reply.Calls)}
	if tm := reply.Timings; tm.PromptN > 0 || tm.CacheN > 0 {
		entry["cachedTokens"], entry["readTokens"] = tm.CacheN, tm.PromptN
		entry["readMs"], entry["writeMs"] = int64(tm.PromptMS), int64(tm.PredictedMS)
		args = append(args, "cachedTokens", tm.CacheN, "readTokens", tm.PromptN,
			"readMs", int64(tm.PromptMS), "writeMs", int64(tm.PredictedMS))
	}
	t.rounds = append(t.rounds, entry)
	t.s.log.Info("libby round", args...)
}
