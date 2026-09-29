package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// "send me a pic of you rn" is a request to see her and nothing more; "rn" is not a
// thing to draw.
func TestTextingShorthandIsNotASubject(t *testing.T) {
	for _, ask := range []string{"send me a pic of you rn", "pic of u rn plz", "lemme see you atm"} {
		if got := pictureRequestSubject(ask); got != "" {
			t.Fatalf("%q left %q as the subject", ask, got)
		}
	}
}

func TestTheSceneWritersTagsAreReadAndItsProseIsNot(t *testing.T) {
	cases := []struct{ raw, want string }{
		{"selfie, from above, lying on bed, smile, lamp light, night", "selfie, from above, lying on bed, smile, lamp light, night"},
		{"Tags: selfie, mirror, bathroom, steam, towel\nhope that helps!", "selfie, mirror, bathroom, steam, towel"},
		{"\"close-up, you, blush, looking at viewer, Libby, window light.\"", "close-up, blush, looking at viewer, window light"},
		{"one sec, let me grab my phone", ""},
		{"", ""},
	}
	for _, c := range cases {
		if got := cleanPictureScene(c.raw); got != c.want {
			t.Fatalf("%q read as %q, want %q", c.raw, got, c.want)
		}
	}
}

func TestWhatTheyAskedForLeadsTheScene(t *testing.T) {
	if got := freshPicturePrompt("red dress", "selfie, kitchen, smile"); got != "red dress, selfie, kitchen, smile" {
		t.Fatalf("got %q", got)
	}
	if got := freshPicturePrompt("", "selfie, kitchen, smile"); got != "selfie, kitchen, smile" {
		t.Fatalf("got %q", got)
	}
	// With no scene written, the prompt is what it always was.
	if got := freshPicturePrompt("red dress", ""); got != "you red dress" {
		t.Fatalf("got %q", got)
	}
	if got := freshPicturePrompt("", ""); got != "you, a selfie" {
		t.Fatalf("got %q", got)
	}
}

// The bug: asked to see her with nothing more said, the picture was "you rn". Now the
// model writes the picture from the moment, told where she is and what she just said.
func TestThePictureSheTakesIsWrittenFromTheMoment(t *testing.T) {
	s, token := newTestServer(t)
	var sceneAsk string
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		var body struct {
			Messages []chatMessage `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		reply := "ok hold on, lying down for this one\n[mood: happy 3]"
		if len(body.Messages) > 1 && strings.HasPrefix(body.Messages[0].Content, pictureSceneMark) {
			sceneAsk = body.Messages[1].Content
			reply = "selfie, from above, lying on bed, hair spread on pillow, smile, lamp light"
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":` + fmt.Sprintf("%q", reply) + `}}]}`))
	}))
	t.Cleanup(llm.Close)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	enableImageGen(t, s, "http://127.0.0.1:1")

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","canGenerate":true,"messages":[{"id":"a","role":"user","content":"send me a pic of you rn"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Generate *freshPictureResponse `json:"generate"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Generate == nil || out.Generate.Prompt != "selfie, from above, lying on bed, hair spread on pillow, smile, lamp light" {
		t.Fatalf("the picture was not the one written for it: %+v", out.Generate)
	}
	if !strings.Contains(sceneAsk, "lying down for this one") {
		t.Fatalf("the scene writer was not told what she said: %q", sceneAsk)
	}
}
