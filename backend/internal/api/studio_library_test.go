package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The pose library is the character library's shape under another name: create with
// a thumbnail, list, update, delete — and the two folders never see each other.
func TestImageGenPoses(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, "GET", "/api/imagegen/poses", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"poses":[]`) {
		t.Fatalf("empty list: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "POST", "/api/imagegen/poses",
		`{"name":"Sitting","prompt":"sitting cross-legged, holding a mug","negativePrompt":"standing","imageData":"`+onePixelPNG+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var created struct {
		ID       string `json:"id"`
		HasThumb bool   `json:"hasThumb"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.ID == "" || !created.HasThumb {
		t.Fatalf("created = %+v", created)
	}
	rec = do(t, h, token, "GET", "/api/imagegen/poses/"+created.ID+"/thumb", "")
	if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "image/") {
		t.Fatalf("thumb: %d %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	// A pose is not a character.
	rec = do(t, h, token, "GET", "/api/imagegen/characters", "")
	if !strings.Contains(rec.Body.String(), `"characters":[]`) {
		t.Fatalf("pose leaked into characters: %s", rec.Body)
	}
	rec = do(t, h, token, "POST", "/api/imagegen/poses", `{"id":"`+created.ID+`","name":"Sitting (mug)","prompt":"sitting, mug"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"hasThumb":true`) {
		t.Fatalf("update: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "DELETE", "/api/imagegen/poses/"+created.ID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/imagegen/poses", "")
	if !strings.Contains(rec.Body.String(), `"poses":[]`) {
		t.Fatalf("list after delete: %s", rec.Body)
	}
}

// Wildcards: a list made in the app, a plain text file dropped into the folder, and
// the generate call rolling both into the prompt it sends.
func TestImageGenWildcards(t *testing.T) {
	gen := stubA1111(t)
	s, token := newTestServer(t)
	enableImageGen(t, s, gen.URL)
	h := s.Handler()

	rec := do(t, h, token, "POST", "/api/imagegen/wildcards", `{"name":"Hair Colour","text":"red hair\n\n# a comment\nred hair\n"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var created struct {
		ID      string   `json:"id"`
		Name    string   `json:"name"`
		Entries []string `json:"entries"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.Name != "hair_colour" || len(created.Entries) != 2 {
		t.Fatalf("created = %+v, want the name folded and blank/comment lines dropped", created)
	}
	// A second list under the same name is refused.
	rec = do(t, h, token, "POST", "/api/imagegen/wildcards", `{"name":"hair_colour","entries":["x"]}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("duplicate name: %d %s", rec.Code, rec.Body)
	}
	// A plain .txt in the folder is listed, read-only.
	if err := os.WriteFile(filepath.Join(s.wildcardDir, "Eyes.txt"), []byte("green eyes\r\nblue eyes\r\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	rec = do(t, h, token, "GET", "/api/imagegen/wildcards", "")
	if !strings.Contains(rec.Body.String(), `"name":"eyes"`) || !strings.Contains(rec.Body.String(), `"readOnly":true`) {
		t.Fatalf("txt list missing: %s", rec.Body)
	}
	rec = do(t, h, token, "DELETE", "/api/imagegen/wildcards/txt:eyes", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("deleting a txt list: %d %s", rec.Code, rec.Body)
	}

	// Generating rolls both kinds into the prompt the generator receives.
	rec = do(t, h, token, "POST", "/api/imagegen/generate", `{"prompt":"1girl, __hair_colour__, __EYES__, {smile|smile}","negativePrompt":"__missing__","count":1}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("generate: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Positive string `json:"positive"`
		Negative string `json:"negative"`
		Rolled   bool   `json:"rolled"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if !out.Rolled || out.Positive != "1girl, red hair, green eyes, smile" && out.Positive != "1girl, red hair, blue eyes, smile" {
		t.Fatalf("expanded prompt = %q (rolled=%v)", out.Positive, out.Rolled)
	}
	if out.Negative != "__missing__" {
		t.Fatalf("an unknown wildcard should be left as written, got %q", out.Negative)
	}

	rec = do(t, h, token, "DELETE", "/api/imagegen/wildcards/"+created.ID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
}

// A save can carry the studio's full record, which the generation endpoint hands back
// beside the prompt and tags; and a picture sent as Libby lands in her chat, tagged
// as her.
func TestImageGenSaveRecordAndSendAsLibby(t *testing.T) {
	gen := stubA1111(t)
	s, token := newTestServer(t)
	enableImageGen(t, s, gen.URL)
	h := s.Handler()

	rec := do(t, h, token, "POST", "/api/imagegen/generate", `{"prompt":"libby at the beach","count":1}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("generate: %d %s", rec.Code, rec.Body)
	}
	var genOut struct {
		Images []struct {
			ID string `json:"id"`
		} `json:"images"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &genOut)
	rec = do(t, h, token, "POST", "/api/imagegen/save",
		`{"id":"`+genOut.Images[0].ID+`","title":"beach","info":{"prompt":"libby at the beach","steps":20,"loras":[{"name":"x","weight":0.5}]}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("save: %d %s", rec.Code, rec.Body)
	}
	var saved struct {
		ID int64 `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &saved)

	rec = do(t, h, token, "GET", "/api/media/"+itoa(saved.ID)+"/generation", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("generation: %d %s", rec.Code, rec.Body)
	}
	var generation struct {
		Prompt string          `json:"prompt"`
		Info   json.RawMessage `json:"info"`
		Tags   []string        `json:"tags"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &generation)
	if !strings.Contains(generation.Prompt, "libby at the beach") || !strings.Contains(string(generation.Info), `"steps":20`) {
		t.Fatalf("generation = %s", rec.Body)
	}

	// Sent as her: a message from her in a fresh conversation, and the picture is hers.
	rec = do(t, h, token, "POST", "/api/libby/send", `{"mediaId":`+itoa(saved.ID)+`,"text":"look what I made"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("send: %d %s", rec.Code, rec.Body)
	}
	var sent struct {
		ConversationID string `json:"conversationId"`
		MessageID      string `json:"messageId"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &sent)
	if sent.ConversationID == "" || sent.MessageID == "" {
		t.Fatalf("send = %s", rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/chat/workspace", "")
	body := rec.Body.String()
	if !strings.Contains(body, `"content":"look what I made"`) || !strings.Contains(body, `"self":true`) || !strings.Contains(body, `"role":"assistant"`) {
		t.Fatalf("workspace after send: %s", body)
	}
	rec = do(t, h, token, "GET", "/api/media/"+itoa(saved.ID)+"/generation", "")
	if !strings.Contains(rec.Body.String(), `"character:libby"`) {
		t.Fatalf("picture not tagged as her: %s", rec.Body)
	}
	// A second send into the named conversation appends rather than opening another.
	rec = do(t, h, token, "POST", "/api/libby/send", `{"mediaId":`+itoa(saved.ID)+`,"conversationId":"`+sent.ConversationID+`","snap":true}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), sent.ConversationID) {
		t.Fatalf("second send: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/chat/workspace", "")
	if strings.Count(rec.Body.String(), `"characterId":"libby","title":"Libby"`) != 1 || !strings.Contains(rec.Body.String(), `*sends a snap*`) {
		t.Fatalf("second send should append: %s", rec.Body)
	}
	// Only pictures.
	rec = do(t, h, token, "POST", "/api/libby/send", `{"mediaId":999999}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("unknown media: %d", rec.Code)
	}
}
