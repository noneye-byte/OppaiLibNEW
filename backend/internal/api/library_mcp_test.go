package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func mcpKey(t *testing.T, s *Server, token string) string {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/mcp/keys", `{"name":"Claude Desktop"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("make key: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Key string `json:"key"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return out.Key
}

func mcpCall(t *testing.T, s *Server, key, body string) (int, map[string]any) {
	t.Helper()
	rec := do(t, s.Handler(), key, http.MethodPost, "/api/mcp", body)
	var out map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec.Code, out
}

func toolText(t *testing.T, resp map[string]any) string {
	t.Helper()
	res, _ := resp["result"].(map[string]any)
	content, _ := res["content"].([]any)
	if len(content) == 0 {
		t.Fatalf("no content: %v", resp)
	}
	return content[0].(map[string]any)["text"].(string)
}

func TestAnMCPClientSearchesTheLibraryWithItsKey(t *testing.T) {
	s, token := newTestServer(t)
	seedTitledMedia(t, s, "The Lighthouse Keeper", "video", "lighthouse", "sea")
	seedTitledMedia(t, s, "Desert Run", "game", "sand")
	key := mcpKey(t, s, token)

	code, init := mcpCall(t, s, key, `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}`)
	if code != http.StatusOK || init["result"].(map[string]any)["serverInfo"].(map[string]any)["name"] != "oppailib-library" {
		t.Fatalf("initialize: %d %v", code, init)
	}
	_, list := mcpCall(t, s, key, `{"jsonrpc":"2.0","id":2,"method":"tools/list"}`)
	b, _ := json.Marshal(list)
	for _, name := range []string{toolSearchLibrary, toolLibraryItem, toolSuggestLibrary, toolRecentLibrary, toolLibraryInfo, toolWatching} {
		if !strings.Contains(string(b), `"`+name+`"`) {
			t.Fatalf("%s not listed: %s", name, b)
		}
	}
	_, found := mcpCall(t, s, key, `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_library","arguments":{"query":"lighthouse"}}}`)
	text := toolText(t, found)
	if !strings.Contains(text, "The Lighthouse Keeper") || strings.Contains(text, "Desert Run") {
		t.Fatalf("search: %s", text)
	}
	_, item := mcpCall(t, s, key, `{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"library_item","arguments":{"item":"the lighthouse keeper"}}}`)
	if text := toolText(t, item); !strings.Contains(text, "a video") || !strings.Contains(text, "lighthouse") {
		t.Fatalf("item: %s", text)
	}
	_, none := mcpCall(t, s, key, `{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"search_library","arguments":{"query":"submarine"}}}`)
	if text := toolText(t, none); !strings.Contains(text, "not in the library") {
		t.Fatalf("a miss: %s", text)
	}
}

func TestAnMCPKeyOpensOnlyTheMCPEndpoint(t *testing.T) {
	s, token := newTestServer(t)
	key := mcpKey(t, s, token)
	for _, path := range []string{"/api/media", "/api/mcp/keys", "/api/chat/workspace"} {
		if rec := do(t, s.Handler(), key, http.MethodGet, path, ""); rec.Code != http.StatusForbidden {
			t.Fatalf("%s with an MCP key: %d", path, rec.Code)
		}
	}
	// A signed-in browser's session is not an MCP client, so a page elsewhere cannot use
	// the cookie it would carry to drive the endpoint.
	if code, _ := mcpCall(t, s, token, `{"jsonrpc":"2.0","id":1,"method":"ping"}`); code != http.StatusForbidden {
		t.Fatalf("a session reached MCP: %d", code)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/mcp", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"ping"}`))
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("a cross-origin call was let through: %d", rec.Code)
	}
}

func TestRevokingAnMCPKeyLocksItOut(t *testing.T) {
	s, token := newTestServer(t)
	key := mcpKey(t, s, token)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/mcp/keys", "")
	var list struct {
		Items []apiKeyView `json:"items"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if len(list.Items) != 1 || list.Items[0].Name != "Claude Desktop" {
		t.Fatalf("list: %s", rec.Body)
	}
	if rec := do(t, s.Handler(), token, http.MethodDelete, "/api/mcp/keys/"+jsonNumber(list.Items[0].ID), ""); rec.Code != http.StatusNoContent {
		t.Fatalf("revoke: %d", rec.Code)
	}
	if code, _ := mcpCall(t, s, key, `{"jsonrpc":"2.0","id":1,"method":"ping"}`); code != http.StatusUnauthorized {
		t.Fatalf("a revoked key still works: %d", code)
	}
}

func jsonNumber(n int64) string { b, _ := json.Marshal(n); return string(b) }

func TestSheLooksTheShelvesUpRatherThanBeingFedThem(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("", callTool("l", toolSearchLibrary, map[string]any{"query": "lighthouse"}))
		}
		return http.StatusOK, say("yes! The Lighthouse Keeper, it's so good")
	})
	seedTitledMedia(t, s, "The Lighthouse Keeper", "video", "lighthouse", "sea")
	runTurn(t, s, token, turnFor("do i have anything with a lighthouse in it?", ""))

	chats := f.chats()
	first := systemPrompt(chats[0])
	// Not fed: the turn that named a lighthouse did not have it written into her prompt.
	if strings.Contains(first, "The Lighthouse Keeper") {
		t.Fatal("the shelves were pushed into her prompt")
	}
	if !strings.Contains(first, "search_library") {
		t.Fatal("she was not told to look")
	}
	b, _ := json.Marshal(chats[0]["tools"])
	if !strings.Contains(string(b), `"`+toolSearchLibrary+`"`) {
		t.Fatal("she was not offered the search")
	}
	// The result went back to her before she answered.
	if len(chats) < 2 {
		t.Fatalf("no second round: %d", len(chats))
	}
	msgs, _ := chats[1]["messages"].([]any)
	var result string
	for _, raw := range msgs {
		if m := raw.(map[string]any); m["role"] == "tool" {
			result, _ = m["content"].(string)
		}
	}
	if !strings.Contains(result, "The Lighthouse Keeper") {
		t.Fatalf("the search result she read: %q", result)
	}
	c := storedConversation(t, s)
	last := c.Messages[len(c.Messages)-1]
	if !strings.Contains(last.Content, "Lighthouse Keeper") {
		t.Fatalf("her answer: %+v", last)
	}
}

func TestASmallWindowIsStillFedTheShelves(t *testing.T) {
	sig := pulledFeedSignals(turnSignals{words: []string{"lighthouse"}, recommend: true, kind: "video", photo: true})
	if len(sig.words) != 0 || sig.recommend || sig.kind != "" || !sig.photo {
		t.Fatalf("pulled: %+v", sig)
	}
	if libraryToolsOffered(toolsMinimal) || !libraryToolsOffered(toolsLean) {
		t.Fatal("the levels that look are the wrong ones")
	}
	s, _ := newTestServer(t)
	if tools := s.libbyLibraryToolset(toolsLean); len(tools) != 2 {
		t.Fatalf("lean offers %d library tools", len(tools))
	}
}
