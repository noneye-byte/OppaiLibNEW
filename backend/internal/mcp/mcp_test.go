package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func echoServer() *Server {
	s := New("test", "1.0", "Look things up.")
	s.Add(Tool{
		Name: "echo", Description: "Says it back.", ReadOnly: true,
		InputSchema: map[string]any{"type": "object", "properties": map[string]any{"text": map[string]any{"type": "string"}}},
		Call: func(ctx context.Context, args map[string]any) (Result, error) {
			text, _ := args["text"].(string)
			if text == "" {
				return Result{Text: "Nothing to say.", IsError: true}, nil
			}
			return Result{Text: text, Structured: map[string]any{"text": text}}, nil
		},
	})
	s.Add(Tool{Name: "broken", Call: func(context.Context, map[string]any) (Result, error) { return Result{}, errors.New("disk on fire") }})
	s.Add(Tool{Name: "panics", Call: func(context.Context, map[string]any) (Result, error) { panic("boom") }})
	return s
}

func post(t *testing.T, s *Server, body string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(body)))
	return rec
}

func result(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var resp struct {
		Result map[string]any `json:"result"`
		Error  *rpcError      `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode %s: %v", rec.Body, err)
	}
	if resp.Error != nil {
		t.Fatalf("error: %+v", resp.Error)
	}
	return resp.Result
}

func TestTheHandshakeAgreesOnAVersionTheClientSpeaks(t *testing.T) {
	s := echoServer()
	got := result(t, post(t, s, `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"x","version":"1"}}}`))
	if got["protocolVersion"] != "2025-03-26" || got["instructions"] != "Look things up." {
		t.Fatalf("initialize: %v", got)
	}
	got = result(t, post(t, s, `{"jsonrpc":"2.0","id":2,"method":"initialize","params":{"protocolVersion":"1999-01-01"}}`))
	if got["protocolVersion"] != LatestVersion {
		t.Fatalf("an unknown version was not answered with the newest: %v", got["protocolVersion"])
	}
}

func TestANotificationIsAcceptedWithNothingToSay(t *testing.T) {
	rec := post(t, echoServer(), `{"jsonrpc":"2.0","method":"notifications/initialized"}`)
	if rec.Code != http.StatusAccepted || rec.Body.Len() != 0 {
		t.Fatalf("notification: %d %q", rec.Code, rec.Body)
	}
}

func TestToolsAreListedAndCalled(t *testing.T) {
	s := echoServer()
	list := result(t, post(t, s, `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`))
	tools := list["tools"].([]any)
	first := tools[0].(map[string]any)
	if len(tools) != 3 || first["name"] != "echo" || first["annotations"].(map[string]any)["readOnlyHint"] != true {
		t.Fatalf("list: %v", list)
	}
	got := result(t, post(t, s, `{"jsonrpc":"2.0","id":"a","method":"tools/call","params":{"name":"echo","arguments":{"text":"hi"}}}`))
	content := got["content"].([]any)[0].(map[string]any)
	if content["text"] != "hi" || got["isError"] != false || got["structuredContent"].(map[string]any)["text"] != "hi" {
		t.Fatalf("call: %v", got)
	}
}

func TestAToolThatFailsSaysSoToTheModel(t *testing.T) {
	s := echoServer()
	for _, name := range []string{"broken", "panics"} {
		got := result(t, post(t, s, `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"`+name+`"}}`))
		if got["isError"] != true {
			t.Fatalf("%s: %v", name, got)
		}
	}
	// A tool that does not exist is the client's mistake, not the model's.
	rec := post(t, s, `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"nope"}}`)
	if !strings.Contains(rec.Body.String(), `"code":-32602`) {
		t.Fatalf("unknown tool: %s", rec.Body)
	}
}

func TestAnOlderClientsBatchIsAnswered(t *testing.T) {
	rec := post(t, echoServer(), `[{"jsonrpc":"2.0","id":1,"method":"ping"},{"jsonrpc":"2.0","method":"notifications/initialized"},{"jsonrpc":"2.0","id":2,"method":"nope"}]`)
	var out []response
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil || len(out) != 2 || out[1].Error == nil || out[1].Error.Code != codeMethodNotFound {
		t.Fatalf("batch: %v %s", err, rec.Body)
	}
}

func TestThereIsNoStreamToOpen(t *testing.T) {
	rec := httptest.NewRecorder()
	echoServer().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/mcp", nil))
	if rec.Code != http.StatusMethodNotAllowed || rec.Header().Get("Allow") != "POST" {
		t.Fatalf("GET: %d", rec.Code)
	}
}
