package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestChatWorkspacePersistsCharactersProfileAndConversations(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, http.MethodGet, "/api/chat/workspace", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"id":"libby"`) {
		t.Fatalf("initial workspace: %d %s", rec.Code, rec.Body)
	}

	characterID := strings.Repeat("a", 32)
	conversationID := strings.Repeat("b", 32)
	messageID := strings.Repeat("c", 32)
	body := `{
		"profile":{"displayName":"Owen","persona":"Likes concise replies"},
		"characters":[
			{"id":"libby","name":"Edited Libby","promptWeight":1.25,"defaultMode":"playful","builtIn":true},
			{"id":"` + characterID + `","name":"Mina","personality":"Cheerful","promptWeight":0.9,"defaultMode":"roleplay"}
		],
		"conversations":[{"id":"` + conversationID + `","characterId":"` + characterID + `","title":"Hello","mode":"roleplay","emotion":"happy","intensity":2,"messages":[{"id":"` + messageID + `","role":"user","content":"hello","at":1}],"createdAt":1,"updatedAt":2}],
		"images":[]
	}`
	rec = do(t, h, token, http.MethodPut, "/api/chat/workspace", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("save workspace: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodGet, "/api/chat/workspace", "")
	if !strings.Contains(rec.Body.String(), `"displayName":"Owen"`) ||
		!strings.Contains(rec.Body.String(), `"name":"Edited Libby"`) ||
		!strings.Contains(rec.Body.String(), `"name":"Mina"`) {
		t.Fatalf("reloaded workspace: %s", rec.Body)
	}
}

func TestChatImageIsScannedStoredAndOwned(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/chat/images",
		`{"characterId":"libby","name":"Beach pose","tags":["beach"],"imageData":"data:image/png;base64,`+validChatPNG+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("upload image: %d %s", rec.Code, rec.Body)
	}
	var image chatImage
	if err := json.Unmarshal(rec.Body.Bytes(), &image); err != nil || image.ID == "" {
		t.Fatalf("image response: %v %+v", err, image)
	}
	if !containsString(image.Tags, "beach") || !containsString(image.Tags, "square") {
		t.Fatalf("scan tags = %v, want supplied + scanner tags", image.Tags)
	}
	rec = do(t, h, token, http.MethodGet, "/api/chat/images/"+image.ID, "")
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("stream image: %d %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	rec = do(t, h, token, http.MethodDelete, "/api/chat/images/"+image.ID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("delete image: %d %s", rec.Code, rec.Body)
	}
	if rec = do(t, h, token, http.MethodGet, "/api/chat/images/"+image.ID, ""); rec.Code != http.StatusNotFound {
		t.Fatalf("stream after delete: %d, want 404", rec.Code)
	}
}

// Both reserved owners are exercised here because neither is a character: "profile"
// has no character behind it at all, and "avatar:<id>" is backed by the character the
// prefix names. The upload handler used to look the owner string up verbatim in the
// character list, so setting either picture failed with "no such character".
func TestChatReservedImageOwnersAreAcceptedAndKeptOutOfGalleries(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	for _, owner := range []string{"profile", "avatar:libby"} {
		rec := do(t, h, token, http.MethodPost, "/api/chat/images",
			`{"characterId":"`+owner+`","name":"Face","imageData":"data:image/png;base64,`+validChatPNG+`"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("upload under %q: %d %s", owner, rec.Code, rec.Body)
		}
		var image chatImage
		if err := json.Unmarshal(rec.Body.Bytes(), &image); err != nil || image.ID == "" {
			t.Fatalf("upload under %q response: %v %+v", owner, err, image)
		}
		if image.CharacterID != owner {
			t.Fatalf("upload under %q kept owner %q", owner, image.CharacterID)
		}
		// The point of the reserved owner: a face is never a picture the character
		// might send, so it must not be attachable to a reply.
		ws, err := s.readChatWorkspace(1)
		if err != nil {
			t.Fatalf("read workspace: %v", err)
		}
		if got := matchingChatImage(ws, "libby", "face", "", nil); got == image.ID {
			t.Fatalf("image under %q was offered as a reply attachment", owner)
		}
	}

	// An avatar owner still has to name a real character.
	rec := do(t, h, token, http.MethodPost, "/api/chat/images",
		`{"characterId":"avatar:`+strings.Repeat("d", 32)+`","name":"Face","imageData":"data:image/png;base64,`+validChatPNG+`"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("avatar for unknown character: %d %s, want 400", rec.Code, rec.Body)
	}
}

// A conversation stored without a "messages" key must never come back as
// "messages":null. Go marshals a nil slice as null, the web client reads
// conversation.messages.length while rendering, and the resulting throw leaves the
// chat screen stuck on its loading spinner. The Android client omits the key
// whenever a conversation is empty, because kotlinx does not encode defaults.
func TestChatWorkspaceNeverReturnsNullSlices(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	conversationID := strings.Repeat("e", 32)
	body := `{
		"profile":{"displayName":"","persona":""},
		"characters":[{"id":"libby","name":"Libby","promptWeight":1,"defaultMode":"sweet"}],
		"conversations":[{"id":"` + conversationID + `","characterId":"libby","title":"Empty","mode":"sweet","emotion":"neutral","intensity":1,"createdAt":1,"updatedAt":2}]
	}`
	rec := do(t, h, token, http.MethodPut, "/api/chat/workspace", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("save workspace: %d %s", rec.Code, rec.Body)
	}
	if strings.Contains(rec.Body.String(), `"messages":null`) {
		t.Fatalf("PUT echoed a null message list: %s", rec.Body)
	}

	rec = do(t, h, token, http.MethodGet, "/api/chat/workspace", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("load workspace: %d %s", rec.Code, rec.Body)
	}
	for _, nulled := range []string{`"messages":null`, `"conversations":null`, `"images":null`, `"characters":null`} {
		if strings.Contains(rec.Body.String(), nulled) {
			t.Fatalf("workspace contains %s: %s", nulled, rec.Body)
		}
	}
	if !strings.Contains(rec.Body.String(), `"messages":[]`) {
		t.Fatalf("empty conversation lost its message list: %s", rec.Body)
	}
}

const validChatPNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAQSURBVBhXY/jPwPCfARkAAB7zAf+x9MCaAAAAAElFTkSuQmCC"

func containsString(items []string, wanted string) bool {
	for _, item := range items {
		if item == wanted {
			return true
		}
	}
	return false
}
