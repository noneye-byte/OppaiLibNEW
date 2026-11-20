package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// gif89 is the smallest GIF there is: one transparent pixel.
var gif89 = []byte("GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;")

func addSticker(t *testing.T, s *Server, token, query string, body []byte) libbySticker {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/stickers?"+query, string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("upload: %d %s", rec.Code, rec.Body)
	}
	var item libbySticker
	_ = json.Unmarshal(rec.Body.Bytes(), &item)
	return item
}

func TestAReactionGifIsKeptByteForByteAndServedAsWhatItIs(t *testing.T) {
	s, token := newTestServer(t)
	item := addSticker(t, s, token, "filename=Happy_Dance.gif", gif89)
	if item.Label != "happy dance" || item.MIME != "image/gif" {
		t.Fatalf("item: %+v", item)
	}
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/libby/stickers/"+item.ID, "")
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "image/gif" || !bytes.Equal(rec.Body.Bytes(), gif89) {
		t.Fatalf("served: %d %q %d bytes", rec.Code, rec.Header().Get("Content-Type"), rec.Body.Len())
	}
	// Renamed, it is picked by the new name.
	rec = do(t, s.Handler(), token, http.MethodPatch, "/api/libby/stickers/"+item.ID, `{"label":"  Victory DANCE ","tags":["yay","win"]}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"victory dance"`) {
		t.Fatalf("rename: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, s.Handler(), token, http.MethodDelete, "/api/libby/stickers/"+item.ID, "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", rec.Code)
	}
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/libby/stickers/"+item.ID, ""); rec.Code != http.StatusNotFound {
		t.Fatalf("deleted one still served: %d", rec.Code)
	}
}

func TestOnlyPicturesAndClipsGoOnTheShelf(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/stickers?label=evil", "<html><script>alert(1)</script></html>")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("html accepted: %d", rec.Code)
	}
}

func TestSheSendsAReactionGifByItsLabel(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("omg", callTool("g", toolSendSticker, map[string]any{"label": "facepalm"}))
		}
		return http.StatusOK, say("")
	})
	item := addSticker(t, s, token, "label=facepalm", gif89)
	addSticker(t, s, token, "label=happy+dance", gif89)
	runTurn(t, s, token, turnFor("i locked myself out again", ""))

	// She was offered them by name.
	tools, _ := f.chats()[0]["tools"].([]any)
	var offered string
	for _, raw := range tools {
		fn, _ := raw.(map[string]any)["function"].(map[string]any)
		if fn["name"] == toolSendSticker {
			b, _ := json.Marshal(fn)
			offered = string(b)
		}
	}
	if !strings.Contains(offered, "facepalm") || !strings.Contains(offered, "happy dance") {
		t.Fatalf("the shelf was not offered: %s", offered)
	}
	c := storedConversation(t, s)
	var sent *storedChatMessage
	for i := range c.Messages {
		if c.Messages[i].Sticker != "" {
			sent = &c.Messages[i]
		}
	}
	if sent == nil || sent.Sticker != item.ID || !strings.Contains(sent.Content, "facepalm") {
		t.Fatalf("sent: %+v", sent)
	}
}

func TestWithNoShelfThereIsNoTool(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("hi") })
	runTurn(t, s, token, turnFor("hey", ""))
	b, _ := json.Marshal(f.chats()[0]["tools"])
	if strings.Contains(string(b), toolSendSticker) {
		t.Fatal("an empty shelf was offered")
	}
}

func TestPickingAReactionGif(t *testing.T) {
	shelf := []libbySticker{
		{ID: "a", Label: "facepalm"},
		{ID: "b", Label: "happy dance", Tags: []string{"yay"}},
		{ID: "c", Label: "happy dance", Sent: 3},
		{ID: "d", Label: "happy dance"},
	}
	first := func(int) int { return 0 }
	if got := pickSticker(shelf, "Facepalm!", "", first); got == nil || got.ID != "a" {
		t.Fatalf("exact label: %+v", got)
	}
	if got := pickSticker(shelf, "yay", "", first); got == nil || got.ID != "b" {
		t.Fatalf("by tag: %+v", got)
	}
	// Among the three dances: not the one just sent, not the worn-out one.
	if got := pickSticker(shelf, "happy dance", "b", first); got == nil || got.ID != "d" {
		t.Fatalf("among equals: %+v", got)
	}
	if got := pickSticker(shelf, "crying", "", first); got != nil {
		t.Fatalf("nothing fits, yet: %+v", got)
	}
}
