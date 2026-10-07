package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// One round of a tool-capable chat completion.
//
// postChatCompletion is the old shape — text in, text out — and stays for the callers
// that only want prose (Discord, compression, reflection). This is the one the turn
// engine uses: it sends the tool set, and returns her words and her calls separately
// whichever of the three shapes the backend answered in (see libby_toolcalls.go).
//
// The mode is decided per backend and model, once. "auto" asks the backend first, with
// one tiny request carrying one tool (probeToolCalls), because the common failure is not
// a refusal: text-generation-webui takes a tools field and answers 200 whether or not
// the loaded model's chat template renders it, and a roleplay fine-tune's template
// usually does not. She was then told every action is a tool call, given none, and
// wrote "*sends a pic*" instead. A backend that refuses tools mid-turn is still caught
// and remembered as well. "native" and "json" in settings pin it.

// llmTool is one tool in the OpenAI shape.
type llmTool struct {
	Type     string          `json:"type"`
	Function llmToolFunction `json:"function"`
}

type llmToolFunction struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  map[string]any `json:"parameters"`
}

// toolMode is how actions travel for this backend.
type toolMode string

const (
	toolsNative toolMode = "native"
	toolsJSON   toolMode = "json"
)

// toolModes remembers what each backend and model was found to take, for the life of
// the process. A restart asks again, which is right: the operator may have swapped the
// loader or the template for one that takes tools.
var toolModes = struct {
	sync.Mutex
	m map[string]toolMode
}{m: map[string]toolMode{}}

func knownToolMode(url, model string) (toolMode, bool) {
	toolModes.Lock()
	defer toolModes.Unlock()
	mode, ok := toolModes.m[url+"\x00"+model]
	return mode, ok
}

func rememberToolMode(url, model string, mode toolMode) {
	toolModes.Lock()
	toolModes.m[url+"\x00"+model] = mode
	toolModes.Unlock()
}

func rememberToolless(url, model string) { rememberToolMode(url, model, toolsJSON) }

// resolveToolMode is the mode a turn starts in, when it is already settled — pinned in
// settings, or found out earlier. ok is false when only asking the backend can tell.
func resolveToolMode(setting, url, model string) (toolMode, bool) {
	switch strings.ToLower(strings.TrimSpace(setting)) {
	case "json":
		return toolsJSON, true
	case "native":
		return toolsNative, true
	}
	return knownToolMode(url, model)
}

// toolModeFor is the mode a turn starts in, asking the backend the first time.
func (s *Server) toolModeFor(ctx context.Context, setting, url, model string) toolMode {
	if mode, ok := resolveToolMode(setting, url, model); ok {
		return mode
	}
	mode, ok := s.probeToolCalls(ctx, model)
	if ok {
		s.log.Info("libby: tool mode decided", "model", model, "mode", string(mode))
		rememberToolMode(url, model, mode)
	}
	return mode
}

// toolProbeName is the probe's one tool. It is a name nothing could guess: the probe
// never says it in words, so a model can only call it if the template showed it the
// tool — which is the whole question. A guessable name ("ping") would be written out
// as bare JSON by a model that never saw a schema, and read back as a working call.
const toolProbeName = "amber_lantern"

// probeToolCalls asks the backend whether tools reach the model at all. ok is false
// when the answer is not an answer — the backend is down or slow — so the turn goes on
// natively, where a refusal is still caught, and the next turn asks again.
func (s *Server) probeToolCalls(ctx context.Context, model string) (toolMode, bool) {
	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	payload := map[string]any{
		"stream":     false,
		"max_tokens": 160,
		"messages": []llmMessage{
			{Role: "system", Content: "You have been given exactly one tool. Reply only by calling it, never with text."},
			{Role: "user", Content: "Call your tool now, with ready set to true."},
		},
		"tools": []llmTool{{Type: "function", Function: llmToolFunction{
			Name:        toolProbeName,
			Description: "Call this to show you can call tools.",
			Parameters: map[string]any{
				"type":       "object",
				"properties": map[string]any{"ready": map[string]any{"type": "boolean"}},
				"required":   []any{"ready"},
			},
		}}},
		"tool_choice": "auto",
	}
	if model != "" {
		payload["model"] = model
	}
	reply, err := s.postTurn(ctx, payload, map[string]bool{toolProbeName: true})
	switch {
	case err == nil && len(reply.Calls) > 0:
		return toolsNative, true
	case err == nil:
		s.log.Info("libby: backend took tools but the model never saw them; using JSON mode", "model", model, "reply", truncateRunes(reply.Text, 120))
		return toolsJSON, true
	case refusedTools(err):
		s.log.Info("libby: backend refused tools; using JSON mode", "model", model, "err", err)
		return toolsJSON, true
	}
	s.log.Info("libby: couldn't ask the backend about tools", "model", model, "err", err)
	return toolsNative, false
}

// refusedTools reads a backend's error for a refusal of the tools field itself, rather
// than any other failure — a model that is not loaded must not be mistaken for one that
// cannot call tools, or the turn would retry in a mode that fails the same way.
func refusedTools(err error) bool {
	var status *chatBackendStatusError
	// 500 is included: llama.cpp answers a template that cannot render tools with one.
	if !errors.As(err, &status) || status.Status < 400 || status.Status > 500 {
		return false
	}
	lower := strings.ToLower(status.msg)
	return strings.Contains(lower, "tool") || strings.Contains(lower, "function call") || strings.Contains(lower, "jinja")
}

// completeTurn runs one round. payload is everything but the messages and tools, which
// are passed separately because JSON mode rewrites both.
func (s *Server) completeTurn(ctx context.Context, payload map[string]any, messages []llmMessage, tools []llmTool, mode toolMode) (llmReply, toolMode, error) {
	cur := s.settings.Get()
	model, _ := payload["model"].(string)
	known := make(map[string]bool, len(tools))
	for _, t := range tools {
		known[t.Function.Name] = true
	}
	if mode == toolsNative && len(tools) > 0 {
		out := cloneMap(payload)
		out["messages"] = messages
		out["tools"] = tools
		out["tool_choice"] = "auto"
		reply, err := s.postTurn(ctx, out, known)
		if err == nil {
			return reply, toolsNative, nil
		}
		if !refusedTools(err) {
			return llmReply{}, toolsNative, err
		}
		s.log.Info("libby: backend refused tools; using JSON mode", "model", model, "err", err)
		rememberToolless(cur.ChatURL, model)
	}
	out := cloneMap(payload)
	out["messages"] = withJSONMode(messages, tools)
	if len(tools) > 0 {
		out["response_format"] = map[string]any{
			"type":        "json_schema",
			"json_schema": map[string]any{"name": "turn", "schema": jsonModeSchema(tools)},
		}
	}
	reply, err := s.postTurn(ctx, out, nil)
	if err != nil && len(tools) > 0 {
		// A backend that also refuses the schema still gets the instruction in the prompt.
		var status *chatBackendStatusError
		if errors.As(err, &status) && status.Status >= 400 && status.Status < 500 {
			delete(out, "response_format")
			reply, err = s.postTurn(ctx, out, nil)
		}
	}
	if err != nil {
		return llmReply{}, toolsJSON, err
	}
	parsed := parseJSONTurn(reply.Text, known)
	return parsed, toolsJSON, nil
}

// withJSONMode folds the JSON-mode instruction into the first system message and turns
// tool exchanges from earlier rounds into plain text, since a template without tool
// support cannot render a tool message.
func withJSONMode(messages []llmMessage, tools []llmTool) []llmMessage {
	out := make([]llmMessage, 0, len(messages))
	directive := jsonModeDirective(tools)
	for i, m := range messages {
		switch {
		case i == 0 && m.Role == "system":
			if text, ok := m.Content.(string); ok {
				m.Content = text + directive
			}
			out = append(out, m)
		case m.Role == "tool":
			text, _ := m.Content.(string)
			out = append(out, llmMessage{Role: "user", Content: "(Result of your " + m.Name + " action: " + text + ")"})
		case len(m.ToolCalls) > 0:
			names := make([]string, 0, len(m.ToolCalls))
			for _, c := range m.ToolCalls {
				names = append(names, c.Function.Name)
			}
			text, _ := m.Content.(string)
			body, _ := json.Marshal(map[string]any{"messages": []string{text}, "actions": names})
			out = append(out, llmMessage{Role: "assistant", Content: string(body)})
		default:
			out = append(out, m)
		}
	}
	if len(out) == 0 || out[0].Role != "system" {
		out = append([]llmMessage{{Role: "system", Content: strings.TrimSpace(directive)}}, out...)
	}
	return out
}

// postTurn is the HTTP call. known, when set, enables reading calls written into the
// content (native mode); JSON mode passes nil and parses the envelope itself.
func (s *Server) postTurn(ctx context.Context, payload map[string]any, known map[string]bool) (llmReply, error) {
	cur := s.settings.Get()
	if cur.ChatURL == "" {
		return llmReply{}, errors.New("Libby chat is not configured")
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return llmReply{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, chatBackendBase(cur.ChatURL)+"/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return llmReply{}, errors.New("invalid local LLM URL")
	}
	req.Header.Set("Content-Type", "application/json")
	if cur.ChatAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cur.ChatAPIKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return llmReply{}, fmt.Errorf("local LLM: %v", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return llmReply{}, errors.New("couldn't read the local LLM response")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return llmReply{}, &chatBackendStatusError{Status: resp.StatusCode,
			msg: fmt.Sprintf("local LLM returned %s: %s", resp.Status, truncateChatError(raw))}
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content   any           `json:"content"`
				ToolCalls []llmToolCall `json:"tool_calls"`
			} `json:"message"`
		} `json:"choices"`
	}
	if json.Unmarshal(raw, &out) != nil || len(out.Choices) == 0 {
		return llmReply{}, errors.New("local LLM returned no message")
	}
	msg := out.Choices[0].Message
	text := stripThinking(contentString(msg.Content))
	reply := llmReply{Text: text}
	for i, c := range msg.ToolCalls {
		if c.Function.Name == "" {
			continue
		}
		if c.ID == "" {
			c.ID = fmt.Sprintf("call_%d", i)
		}
		c.Type = "function"
		reply.Calls = append(reply.Calls, c)
	}
	if known != nil {
		var embedded []llmToolCall
		reply.Text, embedded = extractEmbeddedToolCalls(reply.Text, known)
		reply.Calls = append(reply.Calls, embedded...)
	}
	return reply, nil
}

// contentString flattens a message's content, which a backend may return as parts.
func contentString(v any) string {
	switch c := v.(type) {
	case string:
		return c
	case []any:
		var b strings.Builder
		for _, part := range c {
			if m, ok := part.(map[string]any); ok {
				if t, ok := m["text"].(string); ok {
					b.WriteString(t)
				}
			}
		}
		return b.String()
	}
	return ""
}

func cloneMap(m map[string]any) map[string]any {
	out := make(map[string]any, len(m)+3)
	for k, v := range m {
		out[k] = v
	}
	return out
}
