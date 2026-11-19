package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// spritePack is a SillyTavern sprite pack: a zip of pictures named by expression, in a
// folder of its own the way they are passed around, with a second joy and some litter.
func spritePack(t *testing.T) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, shade := range map[string]uint8{
		"Mira/joy.png": 10, "Mira/joy-1.png": 20, "Mira/anger.png": 30, "Mira/Neutral.PNG": 40,
		"__MACOSX/Mira/._joy.png": 50, "Mira/readme.txt": 0,
	} {
		w, _ := zw.Create(name)
		if shade == 0 {
			w.Write([]byte("made by someone"))
			continue
		}
		w.Write(testPNG(shade))
	}
	zw.Close()
	return buf.Bytes()
}

func uploadExpressions(t *testing.T, s *Server, token, characterID string, files map[string][]byte) (int, map[string]any) {
	t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	for name, data := range files {
		w, _ := mw.CreateFormFile("files", name)
		w.Write(data)
	}
	mw.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/chat/characters/"+characterID+"/expressions", &body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	var out map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec.Code, out
}

func TestASpritePackIsFiledByExpressionAndServedBack(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("hi") })
	if code, body := saveCard(t, s, token, map[string]any{"description": "A barmaid."}, "roleplay"); code != http.StatusOK {
		t.Fatalf("save = %d %s", code, body)
	}
	code, out := uploadExpressions(t, s, token, cardID, map[string][]byte{"mira.zip": spritePack(t), "surprise.webp": []byte("not a picture")})
	if code != http.StatusOK {
		t.Fatalf("upload = %d %v", code, out)
	}
	got, _ := json.Marshal(out["expressions"])
	if string(got) != `{"anger":["anger.png"],"joy":["joy-1.png","joy.png"],"neutral":["neutral.png"]}` {
		t.Fatalf("filed as %s", got)
	}
	if skipped := out["skipped"].([]any); len(skipped) != 2 {
		t.Fatalf("skipped %v, want the readme and the fake picture", skipped)
	}
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chat/characters/"+cardID+"/expressions/joy-1.png", "")
	if rec.Code != http.StatusOK || !bytes.Equal(rec.Body.Bytes(), testPNG(20)) || rec.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("served %d %s", rec.Code, rec.Header().Get("Content-Type"))
	}
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/chat/characters/"+cardID+"/expressions/..%2Fworkspace.json", ""); rec.Code == http.StatusOK {
		t.Fatal("a path outside the pack was served")
	}
	if code, _ := uploadExpressions(t, s, token, "libby", map[string][]byte{"joy.png": testPNG(1)}); code != http.StatusBadRequest {
		t.Fatalf("Libby took a sprite pack: %d", code)
	}
	rec = do(t, s.Handler(), token, http.MethodDelete, "/api/chat/characters/"+cardID+"/expressions/joy.png", "")
	if !strings.Contains(rec.Body.String(), `"joy":["joy-1.png"]`) {
		t.Fatalf("after deleting one joy: %s", rec.Body.String())
	}
}

func TestACardIsAnsweredInPlainProseAndItsFaceReadOffTheReplyFromItsPack(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if _, ok := body["grammar_string"]; ok {
			return http.StatusOK, say("anger")
		}
		return http.StatusOK, say("*Mira slams the tankard down.* You did WHAT?")
	})
	if code, body := saveCard(t, s, token, map[string]any{"description": "A barmaid.", "tastes": "Old comics."}, "sweet"); code != http.StatusOK {
		t.Fatalf("save = %d %s", code, body)
	}
	uploadExpressions(t, s, token, cardID, map[string][]byte{"mira.zip": spritePack(t)})
	events := runTurn(t, s, token, cardTurn("I sold your horse"))

	chats := f.chats()
	if len(chats) != 2 {
		t.Fatalf("%d requests, want the reply and the expression read", len(chats))
	}
	reply, read := chats[0], chats[1]
	if _, ok := reply["tools"]; ok {
		t.Fatal("a card character was offered tools")
	}
	if _, ok := reply["grammar_string"]; ok {
		t.Fatal("a card character's reply was held to a JSON envelope")
	}
	prompt := systemPrompt(reply)
	for _, libbys := range []string{"How you act", "Old comics", "the shelves", "heat"} {
		if strings.Contains(prompt, libbys) {
			t.Fatalf("a card character was told Libby's %q:\n%s", libbys, prompt)
		}
	}
	if len(eventsNamed(events, "message")) != 1 {
		t.Fatal("a card's reply was split into texts")
	}
	// The read continues the turn's own prompt, so the backend has it cached.
	sent, asked := reply["messages"].([]any), read["messages"].([]any)
	a, _ := json.Marshal(sent)
	b, _ := json.Marshal(asked[:len(sent)])
	if string(a) != string(b) {
		t.Fatal("the expression read did not continue the turn's prompt")
	}
	if g := read["grammar_string"].(string); g != `root ::= "anger" | "joy" | "neutral"` {
		t.Fatalf("grammar = %s", g)
	}
	var state struct {
		Emotion string `json:"emotion"`
	}
	_ = json.Unmarshal(eventsNamed(events, "state")[0].Data, &state)
	if state.Emotion != "anger" {
		t.Fatalf("state emotion = %q", state.Emotion)
	}
	if c := storedConversation(t, s); c.Emotion != "anger" {
		t.Fatalf("stored emotion = %q", c.Emotion)
	}
	// And a save from the client keeps it: the label is not one of Libby's.
	ws, _ := s.readChatWorkspace(mustUserID(t, s))
	raw, _ := json.Marshal(ws)
	if rec := do(t, s.Handler(), token, http.MethodPut, "/api/chat/workspace", string(raw)); rec.Code != http.StatusOK {
		t.Fatalf("resave = %d %s", rec.Code, rec.Body.String())
	}
	if c := storedConversation(t, s); c.Emotion != "anger" {
		t.Fatalf("a save reset the expression to %q", c.Emotion)
	}
}

func TestACardWithoutAPackCostsNoSecondRequest(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("Hello.") })
	saveCard(t, s, token, map[string]any{"description": "A barmaid."}, "roleplay")
	runTurn(t, s, token, cardTurn("hi"))
	if n := len(f.chats()); n != 1 {
		t.Fatalf("%d requests for a card with no expressions", n)
	}
}

func TestTheExpressionIsTheWordAnsweredOrTheFirstLabelNamed(t *testing.T) {
	labels := []string{"anger", "joy", "neutral"}
	for answer, want := range map[string]string{
		"joy": "joy", " Anger.": "anger", "I'd say joy, maybe anger": "joy", "enjoyment": "", "": "",
	} {
		got, ok := pickExpression(answer, labels)
		if got != want || ok != (want != "") {
			t.Errorf("%q: %q %v, want %q", answer, got, ok, want)
		}
	}
}

func mustUserID(t *testing.T, s *Server) int64 {
	t.Helper()
	u, err := s.db.UserByName(t.Context(), "tester")
	if err != nil {
		t.Fatal(err)
	}
	return u.ID
}
