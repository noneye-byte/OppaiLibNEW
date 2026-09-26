package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// Asked to see her on a client that can generate, with a generator connected, she takes
// a picture rather than sending one she has; a client that cannot is answered as before.
func TestAskedToSeeHerSheTakesAFreshPicture(t *testing.T) {
	s, token := newTestServer(t)
	prompt, _ := chatStub(t, s, "one sec, let me take it\n[mood: happy 3]")
	enableImageGen(t, s, "http://127.0.0.1:1")
	h := s.Handler()

	type reply struct {
		Message  string                `json:"message"`
		ImageID  string                `json:"imageId"`
		Generate *freshPictureResponse `json:"generate"`
		Actions  []libbyAction         `json:"actions"`
	}
	ask := func(canGenerate bool) reply {
		t.Helper()
		flag := ""
		if canGenerate {
			flag = `"canGenerate":true,`
		}
		rec := do(t, h, token, http.MethodPost, "/api/chat",
			`{"mode":"sweet","characterId":"libby",`+flag+`"messages":[{"id":"a","role":"user","content":"send me a pic of you in the kitchen"}]}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("chat: %d %s", rec.Code, rec.Body)
		}
		var out reply
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatalf("decode: %v", err)
		}
		return out
	}

	got := ask(true)
	if got.Generate == nil || !strings.Contains(got.Generate.Prompt, "kitchen") {
		t.Fatalf("no picture was taken: %+v", got.Generate)
	}
	if got.ImageID != "" {
		t.Fatalf("a saved picture was sent alongside the fresh one")
	}
	if !strings.Contains(*prompt, "you are taking a picture of yourself") {
		t.Fatalf("she was not told she is taking it")
	}
	for _, a := range got.Actions {
		if a.Kind == "generate" {
			t.Fatalf("an Allow card was offered for a picture already being taken")
		}
	}

	if old := ask(false); old.Generate != nil {
		t.Fatalf("a client that cannot generate was asked to: %+v", old.Generate)
	}
}
