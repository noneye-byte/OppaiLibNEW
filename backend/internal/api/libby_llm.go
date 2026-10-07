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
)

// One round of a tool-capable chat completion.
//
// postChatCompletion is the old shape — text in, text out — and stays for the callers
// that only want prose (Discord, compression, reflection). This is the one the turn
// engine uses: it sends the tool set, and returns her words and her calls separately
// whichever of the three shapes the backend answered in (see libby_toolcalls.go).
//
// The mode is decided per backend and model, once. "auto" sends tools; a backend that
// answers a request carrying them with an error is remembered as tool-less and asked
// again in JSON mode, and every later turn goes straight there. "native" and "json"
// in settings pin it, for a backend whose failure is not recognisable as a refusal.

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

// toolless remembers backends that refused tools, by URL and model, for the life of the
// process. A restart asks again, which is right: the operator may have swapped the
// loader for one that takes them.
var toolless = struct {
	sync.Mutex
	m map[string]bool
}{m: map[string]bool{}}

func knownToolless(url, model string) bool {
	toolless.Lock()
	defer toolless.Unlock()
	return toolless.m[url+"\x00"+model]
}

func rememberToolless(url, model string) {
	toolless.Lock()
	toolless.m[url+"\x00"+model] = true
	toolless.Unlock()
}

// resolveToolMode is the mode a turn starts in.
func resolveToolMode(setting, url, model string) toolMode {
	switch strings.ToLower(strings.TrimSpace(setting)) {
	case "json":
		return toolsJSON
	case "native":
		return toolsNative
	}
	if knownToolless(url, model) {
		return toolsJSON
	}
	return toolsNative
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
