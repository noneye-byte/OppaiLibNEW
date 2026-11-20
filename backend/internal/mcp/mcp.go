// Package mcp serves tools over the Model Context Protocol.
//
// It is the protocol and nothing else: JSON-RPC 2.0 framing, the initialize handshake,
// tools/list and tools/call, over the Streamable HTTP transport (one POST, one JSON
// reply). What the tools do is the caller's, registered as functions — the library's
// are in api/library_mcp.go — and the same registry is called in-process by Libby's turn,
// so what she can look up and what an outside client can look up are one set of code.
//
// What is left out is left out on purpose. There are no resources or prompts (the
// library is reached through tools), no server-to-client stream (nothing here happens
// unasked, so a GET is refused as the spec allows), and no sessions: every call carries
// its own credentials and nothing is remembered between them.
package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"sort"
	"strings"
)

// LatestVersion is the newest protocol revision spoken here; Versions are all of them,
// newest first. A client asking for one of these gets it back; any other gets the newest.
const LatestVersion = "2025-06-18"

var Versions = []string{LatestVersion, "2025-03-26", "2024-11-05"}

// Tool is one callable thing.
type Tool struct {
	Name        string
	Title       string
	Description string
	// InputSchema is a JSON Schema object for the arguments.
	InputSchema map[string]any
	// ReadOnly says the tool changes nothing, which clients may use to call it without
	// asking. Every tool registered here today is.
	ReadOnly bool
	Call     func(ctx context.Context, args map[string]any) (Result, error)
}

// Result is what a tool returns: text for the model, and optionally the same answer as
// data for a client that reads structured content.
type Result struct {
	Text       string
	Structured any
	// IsError marks a failure the model should read and recover from — nothing found,
	// a bad argument — as opposed to a protocol error, which a Call returns as error.
	IsError bool
}

// Server is a set of tools and how they are introduced.
type Server struct {
	Name, Version string
	// Instructions is offered to the client at initialize: how the tools fit together.
	Instructions string
	tools        []Tool
	byName       map[string]int
}

// New makes an empty server.
func New(name, version, instructions string) *Server {
	return &Server{Name: name, Version: version, Instructions: instructions, byName: map[string]int{}}
}

// Add registers a tool. Names are unique; a second registration replaces the first.
func (s *Server) Add(t Tool) {
	if i, ok := s.byName[t.Name]; ok {
		s.tools[i] = t
		return
	}
	s.byName[t.Name] = len(s.tools)
	s.tools = append(s.tools, t)
}

// Tools are the registered tools in registration order.
func (s *Server) Tools() []Tool { return slices.Clone(s.tools) }

// Has reports whether a tool of that name is registered.
func (s *Server) Has(name string) bool {
	_, ok := s.byName[name]
	return ok
}

// ErrNoTool is a call to a name that is not registered.
var ErrNoTool = errors.New("no such tool")

// Call runs one tool. A panic in a tool is a failed call, not a dead server.
func (s *Server) Call(ctx context.Context, name string, args map[string]any) (res Result, err error) {
	i, ok := s.byName[name]
	if !ok {
		return Result{}, fmt.Errorf("%w: %s", ErrNoTool, name)
	}
	if args == nil {
		args = map[string]any{}
	}
	defer func() {
		if p := recover(); p != nil {
			res, err = Result{}, fmt.Errorf("tool %s failed: %v", name, p)
		}
	}()
	return s.tools[i].Call(ctx, args)
}

/* ------------------------------------------------------------- JSON-RPC */

type request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type response struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// JSON-RPC's own error codes.
const (
	codeParse          = -32700
	codeInvalidRequest = -32600
	codeMethodNotFound = -32601
	codeInvalidParams  = -32602
	codeInternal       = -32603
)

// maxBody bounds a request. Tool arguments here are a query and a number.
const maxBody = 1 << 20

// ServeHTTP is the Streamable HTTP transport's endpoint. Authentication is the caller's,
// done before this is reached.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		// No server-initiated stream and no sessions to end: the spec's answer to a GET
		// or DELETE on such a server is 405.
		w.Header().Set("Allow", "POST")
		http.Error(w, "this MCP endpoint only takes POST", http.StatusMethodNotAllowed)
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBody))
	if err != nil {
		writeJSON(w, http.StatusRequestEntityTooLarge, response{JSONRPC: "2.0", ID: json.RawMessage("null"), Error: &rpcError{codeInvalidRequest, "request too large"}})
		return
	}
	trimmed := strings.TrimSpace(string(body))
	// A batch, which 2025-03-26 allowed and 2025-06-18 removed. Answered rather than
	// refused: it costs nothing, and an older client may send one.
	if strings.HasPrefix(trimmed, "[") {
		var batch []json.RawMessage
		if err := json.Unmarshal(body, &batch); err != nil || len(batch) == 0 {
			writeJSON(w, http.StatusBadRequest, response{JSONRPC: "2.0", ID: json.RawMessage("null"), Error: &rpcError{codeParse, "invalid batch"}})
			return
		}
		var out []response
		for _, raw := range batch {
			if resp, ok := s.handle(r.Context(), raw); ok {
				out = append(out, resp)
			}
		}
		if len(out) == 0 {
			w.WriteHeader(http.StatusAccepted)
			return
		}
		writeJSON(w, http.StatusOK, out)
		return
	}
	resp, ok := s.handle(r.Context(), body)
	if !ok {
		// A notification or a response from the client: nothing to answer.
		w.WriteHeader(http.StatusAccepted)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

// handle answers one message. ok is false when there is nothing to send back.
func (s *Server) handle(ctx context.Context, raw json.RawMessage) (response, bool) {
	var req request
	if err := json.Unmarshal(raw, &req); err != nil {
		return response{JSONRPC: "2.0", ID: json.RawMessage("null"), Error: &rpcError{codeParse, "invalid JSON"}}, true
	}
	if len(req.ID) == 0 || string(req.ID) == "null" {
		// Notifications (notifications/initialized, cancelled) and stray responses.
		return response{}, false
	}
	if req.JSONRPC != "2.0" || req.Method == "" {
		return response{JSONRPC: "2.0", ID: req.ID, Error: &rpcError{codeInvalidRequest, "not a JSON-RPC 2.0 request"}}, true
	}
	result, rerr := s.dispatch(ctx, req)
	if rerr != nil {
		return response{JSONRPC: "2.0", ID: req.ID, Error: rerr}, true
	}
	return response{JSONRPC: "2.0", ID: req.ID, Result: result}, true
}

func (s *Server) dispatch(ctx context.Context, req request) (any, *rpcError) {
	switch req.Method {
	case "initialize":
		var p struct {
			ProtocolVersion string `json:"protocolVersion"`
		}
		_ = json.Unmarshal(req.Params, &p)
		version := LatestVersion
		if slices.Contains(Versions, p.ProtocolVersion) {
			version = p.ProtocolVersion
		}
		out := map[string]any{
			"protocolVersion": version,
			"capabilities":    map[string]any{"tools": map[string]any{"listChanged": false}},
			"serverInfo":      map[string]any{"name": s.Name, "version": s.Version},
		}
		if s.Instructions != "" {
			out["instructions"] = s.Instructions
		}
		return out, nil
	case "ping":
		return map[string]any{}, nil
	case "tools/list":
		list := make([]map[string]any, 0, len(s.tools))
		for _, t := range s.tools {
			schema := t.InputSchema
			if schema == nil {
				schema = map[string]any{"type": "object", "properties": map[string]any{}}
			}
			entry := map[string]any{"name": t.Name, "description": t.Description, "inputSchema": schema}
			if t.Title != "" {
				entry["title"] = t.Title
			}
			if t.ReadOnly {
				entry["annotations"] = map[string]any{"readOnlyHint": true, "openWorldHint": false}
			}
			list = append(list, entry)
		}
		return map[string]any{"tools": list}, nil
	case "tools/call":
		var p struct {
			Name      string         `json:"name"`
			Arguments map[string]any `json:"arguments"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil || p.Name == "" {
			return nil, &rpcError{codeInvalidParams, "tools/call needs a name"}
		}
		res, err := s.Call(ctx, p.Name, p.Arguments)
		if errors.Is(err, ErrNoTool) {
			return nil, &rpcError{codeInvalidParams, err.Error()}
		}
		if err != nil {
			// A tool that failed is reported to the model as a result it can read, as
			// the spec asks, not as a protocol error the client swallows.
			res = Result{Text: err.Error(), IsError: true}
		}
		out := map[string]any{
			"content": []map[string]any{{"type": "text", "text": res.Text}},
			"isError": res.IsError,
		}
		if res.Structured != nil {
			out["structuredContent"] = res.Structured
		}
		return out, nil
	}
	return nil, &rpcError{codeMethodNotFound, "method not found: " + req.Method}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Names lists the registered tool names, sorted. For logs and tests.
func (s *Server) Names() []string {
	out := make([]string, 0, len(s.tools))
	for _, t := range s.tools {
		out = append(out, t.Name)
	}
	sort.Strings(out)
	return out
}
