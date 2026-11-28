package api

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
)

func shareKey(t *testing.T, s *Server, token, name string) string {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/share/key", fmt.Sprintf(`{"name":%q}`, name))
	if rec.Code != http.StatusCreated {
		t.Fatalf("make share key: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Key string `json:"key"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return out.Key
}

// The reason the key exists: the phone ends its session as soon as it leaves the
// screen, and a shared video is uploaded after that, on the key alone.
func TestAShareKeyUploadsAfterTheSessionHasEnded(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	key := shareKey(t, s, token, "Pixel 9")
	if rec := do(t, h, token, http.MethodPost, "/api/auth/logout", ""); rec.Code >= 300 {
		t.Fatalf("logout: %d", rec.Code)
	}

	data := payload(5000)
	sess := createUpload(t, h, key, len(data), uploadChunkMin, "fp-shared")
	if rec := putChunk(t, h, key, sess.ID, 0, data, ""); rec.Code != http.StatusOK {
		t.Fatalf("chunk on the share key: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, key, http.MethodGet, "/api/uploads/"+sess.ID, ""); rec.Code != http.StatusOK {
		t.Fatalf("resume read on the share key: %d %s", rec.Code, rec.Body)
	}
	sum := sha256.Sum256(data)
	rec := do(t, h, key, http.MethodPost, "/api/uploads/"+sess.ID+"/complete", fmt.Sprintf(`{"sha256":%q}`, hex.EncodeToString(sum[:])))
	if rec.Code != http.StatusCreated {
		t.Fatalf("complete on the share key: %d %s", rec.Code, rec.Body)
	}
}

// Whoever has the phone can add through it and see nothing.
func TestAShareKeyAddsButReadsNothing(t *testing.T) {
	s, token := newTestServer(t)
	key := shareKey(t, s, token, "Pixel 9")
	for _, c := range []struct{ method, path string }{
		{http.MethodGet, "/api/media"},
		{http.MethodGet, "/api/media/1/thumb"},
		{http.MethodGet, "/api/chat/workspace"},
		{http.MethodGet, "/api/share/keys"},
		{http.MethodGet, "/api/settings"},
	} {
		if rec := do(t, s.Handler(), key, c.method, c.path, ""); rec.Code != http.StatusForbidden {
			t.Fatalf("%s %s with a share key: %d", c.method, c.path, rec.Code)
		}
	}
	// Nor can it make itself a successor before it is revoked.
	if rec := do(t, s.Handler(), key, http.MethodPost, "/api/share/key", `{"name":"other"}`); rec.Code != http.StatusForbidden {
		t.Fatalf("a share key made a key: %d", rec.Code)
	}
}

func TestAPhoneAskingAgainReplacesItsKey(t *testing.T) {
	s, token := newTestServer(t)
	first := shareKey(t, s, token, "Pixel 9")
	second := shareKey(t, s, token, "Pixel 9")
	if rec := do(t, s.Handler(), first, http.MethodGet, "/api/uploads", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("the replaced key still works: %d", rec.Code)
	}
	if rec := do(t, s.Handler(), second, http.MethodGet, "/api/uploads", ""); rec.Code != http.StatusOK {
		t.Fatalf("the new key: %d %s", rec.Code, rec.Body)
	}
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/share/keys", "")
	var list struct {
		Items []apiKeyView `json:"items"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if len(list.Items) != 1 || list.Items[0].Name != "Pixel 9" {
		t.Fatalf("list: %s", rec.Body)
	}
}

func TestSigningOutDropsTheShareKeyAndALostPhoneCanBeRevoked(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	key := shareKey(t, s, token, "Pixel 9")
	if rec := do(t, h, key, http.MethodDelete, "/api/share/key", ""); rec.Code != http.StatusNoContent {
		t.Fatalf("drop: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, key, http.MethodGet, "/api/uploads", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("a dropped key still works: %d", rec.Code)
	}

	lost := shareKey(t, s, token, "Old phone")
	rec := do(t, h, token, http.MethodGet, "/api/share/keys", "")
	var list struct {
		Items []apiKeyView `json:"items"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if len(list.Items) != 1 {
		t.Fatalf("list: %s", rec.Body)
	}
	if rec := do(t, h, token, http.MethodDelete, "/api/share/keys/"+jsonNumber(list.Items[0].ID), ""); rec.Code != http.StatusNoContent {
		t.Fatalf("revoke: %d", rec.Code)
	}
	if rec := do(t, h, lost, http.MethodGet, "/api/uploads", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("a revoked key still works: %d", rec.Code)
	}
	// The list revokes share keys only, so it is not a way to take an MCP key away.
	mcpKey(t, s, token)
	rec = do(t, h, token, http.MethodGet, "/api/mcp/keys", "")
	var mcpList struct {
		Items []apiKeyView `json:"items"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &mcpList)
	if rec := do(t, h, token, http.MethodDelete, "/api/share/keys/"+jsonNumber(mcpList.Items[0].ID), ""); rec.Code != http.StatusNotFound {
		t.Fatalf("the share list revoked an MCP key: %d", rec.Code)
	}
}
