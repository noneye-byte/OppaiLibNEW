package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// fakeTurnBackend is one local server playing both her model and the generator. script
// answers the n-th chat completion (from 0) given its decoded body. The tool-mode probe
// is answered apart and not counted, so a script numbers only the turn's own requests;
// dropsTools makes it a backend that takes tools and never shows them to the model.
type fakeTurnBackend struct {
	mu         sync.Mutex
	bodies     []map[string]any
	gens       []map[string]any
	script     func(n int, body map[string]any) (status int, reply map[string]any)
	pngSeed    uint8
	dropsTools bool
	probes     int
}

func isToolProbe(body map[string]any) bool {
	tools, _ := body["tools"].([]any)
	if len(tools) != 1 {
		return false
	}
	fn, _ := tools[0].(map[string]any)["function"].(map[string]any)
	return fn["name"] == toolProbeName
}

func (f *fakeTurnBackend) chats() []map[string]any {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]map[string]any{}, f.bodies...)
}

func testPNG(shade uint8) []byte {
	img := image.NewRGBA(image.Rect(0, 0, 16, 16))
	for y := 0; y < 16; y++ {
		for x := 0; x < 16; x++ {
			img.Set(x, y, color.RGBA{R: shade, G: 90, B: 120, A: 255})
		}
	}
	var b bytes.Buffer
	_ = png.Encode(&b, img)
	return b.Bytes()
}

func newFakeTurnBackend(t *testing.T, script func(n int, body map[string]any) (int, map[string]any)) (*fakeTurnBackend, string) {
	t.Helper()
	f := &fakeTurnBackend{script: script, pngSeed: 40}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/internal/model/info":
			_, _ = w.Write([]byte(`{"model_name":"test-local-24b"}`))
		case "/v1/models":
			_, _ = w.Write([]byte(`{"data":[{"id":"test-local-24b"}]}`))
		case "/api/v1/app/version":
			http.NotFound(w, r)
		case "/sdapi/v1/txt2img", "/sdapi/v1/img2img":
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			f.mu.Lock()
			f.gens = append(f.gens, body)
			n := 1
			if it, ok := body["n_iter"].(float64); ok && it > 0 {
				n = int(it)
			}
			var images []string
			for i := 0; i < n; i++ {
				f.pngSeed += 7
				images = append(images, base64.StdEncoding.EncodeToString(testPNG(f.pngSeed)))
			}
			f.mu.Unlock()
			raw, _ := json.Marshal(map[string]any{"images": images, "info": `{"seed":1234}`})
			_, _ = w.Write(raw)
		case "/v1/chat/completions":
			raw, _ := io.ReadAll(r.Body)
			var body map[string]any
			_ = json.Unmarshal(raw, &body)
			f.mu.Lock()
			if isToolProbe(body) {
				f.probes++
				reply := say("", callTool("p", toolProbeName, map[string]any{"ready": true}))
				if f.dropsTools {
					reply = say("Sure! I'm ready.")
				}
				f.mu.Unlock()
				out, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"message": reply}}})
				_, _ = w.Write(out)
				return
			}
			n := len(f.bodies)
			f.bodies = append(f.bodies, body)
			f.mu.Unlock()
			status, reply := f.script(n, body)
			if status != http.StatusOK {
				w.WriteHeader(status)
				out, _ := json.Marshal(reply)
				_, _ = w.Write(out)
				return
			}
			out, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"message": reply}}})
			_, _ = w.Write(out)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return f, srv.URL
}

func say(text string, calls ...map[string]any) map[string]any {
	msg := map[string]any{"role": "assistant", "content": text}
	if len(calls) > 0 {
		msg["tool_calls"] = calls
	}
	return msg
}

func callTool(id, name string, args map[string]any) map[string]any {
	raw, _ := json.Marshal(args)
	return map[string]any{"id": id, "type": "function", "function": map[string]any{"name": name, "arguments": string(raw)}}
}

type turnEvent struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
}

func runTurn(t *testing.T, s *Server, token, body string) []turnEvent {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/libby/turn", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("turn = %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Events []turnEvent `json:"events"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v %s", err, rec.Body)
	}
	return out.Events
}

func eventsNamed(events []turnEvent, name string) []turnEvent {
	var out []turnEvent
	for _, e := range events {
		if e.Event == name {
			out = append(out, e)
		}
	}
	return out
}

func turnServer(t *testing.T, script func(n int, body map[string]any) (int, map[string]any)) (*Server, string, *fakeTurnBackend) {
	t.Helper()
	f, url := newFakeTurnBackend(t, script)
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = url
	cur.ImageGenURL = url
	cur.ChatContextTokens = 16384
	s.settings.Set(cur)
	return s, token, f
}

const firstTurn = `{"conversationId":"0123456789abcdef0123456789abcdef","conversation":{"characterId":"libby","title":"New conversation","mode":"sweet"},` +
	`"messages":[{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","role":"user","content":"hey, missed you","at":1}]}`

func storedConversation(t *testing.T, s *Server) chatConversation {
	t.Helper()
	u, _ := s.db.UserByName(t.Context(), "tester")
	ws, err := s.readChatWorkspace(u.ID)
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range ws.Conversations {
		if c.ID == "0123456789abcdef0123456789abcdef" {
			return c
		}
	}
	t.Fatal("conversation was not stored")
	return chatConversation{}
}

func TestATurnStoresTheirMessageAndHerTextsAsSeparateBubbles(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("hiii\n\nwhere have you been 😤", callTool("c1", toolSetState, map[string]any{"mood": "happy", "heat": 2}))
	})
	events := runTurn(t, s, token, firstTurn)
	if got := eventsNamed(events, "message"); len(got) != 2 {
		t.Fatalf("messages = %d, want 2 bubbles: %+v", len(got), events)
	}
	if len(eventsNamed(events, "done")) != 1 {
		t.Fatal("no done event")
	}
	c := storedConversation(t, s)
	if len(c.Messages) != 3 || c.Messages[0].Role != "user" || c.Messages[0].ReadAt == 0 {
		t.Fatalf("stored = %+v", c.Messages)
	}
	if c.Messages[2].Mood != "happy" || c.Messages[2].Heat != 2 || c.Emotion != "happy" || c.Intensity != 2 {
		t.Fatalf("state not settled: conv %s/%d last %+v", c.Emotion, c.Intensity, c.Messages[2])
	}
	if c.Messages[1].Rev == 0 || c.Rev < c.Messages[2].Rev {
		t.Fatalf("server messages are not stamped: %+v rev %d", c.Messages, c.Rev)
	}
	// The tools went out with the request, and the model was told how to act.
	body := f.chats()[0]
	if _, ok := body["tools"]; !ok {
		t.Fatal("no tools were offered")
	}
	system := body["messages"].([]any)[0].(map[string]any)["content"].(string)
	if !strings.Contains(system, "How you act") || strings.Contains(system, "[mood:") {
		t.Fatalf("system prompt still teaches tags: %s", system)
	}
}

// text-generation-webui answers 200 to a request carrying tools whether or not the
// model's template shows them; the model then narrates "*sends a pic*" and nothing
// happens. Asking once, with a tool it could not guess, is what tells the two apart.
func TestABackendThatSilentlyDropsToolsGetsHerActionsAsJSON(t *testing.T) {
	envelope, _ := json.Marshal(map[string]any{
		"messages": []string{"hiii", "missed you too"},
		"actions":  []any{map[string]any{"tool": toolSetState, "args": map[string]any{"mood": "happy", "heat": 2}}},
	})
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say(string(envelope))
	})
	f.dropsTools = true
	events := runTurn(t, s, token, firstTurn)
	if got := len(eventsNamed(events, "message")); got != 2 {
		t.Fatalf("the envelope's texts arrived as %d messages", got)
	}
	body := f.chats()[0]
	if _, ok := body["tools"]; ok {
		t.Fatal("tools were still sent to a backend that drops them")
	}
	if !strings.Contains(systemPrompt(body), "Answer with one JSON object") {
		t.Fatal("she was not told how to act without tools")
	}
	if c := storedConversation(t, s); c.Emotion != "happy" || c.Intensity != 2 {
		t.Fatalf("the action in the envelope did not run: %s/%d", c.Emotion, c.Intensity)
	}
	runTurn(t, s, token, turnFor("again", ""))
	if f.probes != 1 {
		t.Fatalf("the backend was asked about tools %d times", f.probes)
	}
}

func TestABackendThatShowsToolsKeepsNativeCallsAndIsAskedOnce(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("hi") })
	runTurn(t, s, token, firstTurn)
	runTurn(t, s, token, turnFor("again", ""))
	if f.probes != 1 {
		t.Fatalf("the backend was asked about tools %d times", f.probes)
	}
	for _, body := range f.chats() {
		if _, ok := body["tools"]; !ok {
			t.Fatal("a backend that calls tools was not sent them")
		}
	}
}

func TestAPictureSheTakesIsMadeFiledSentAndThenReactedTo(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("one sec 😏", callTool("p1", toolTakePhoto, map[string]any{"shot": "lying on bed, smiling", "framing": "selfie"}))
		}
		return http.StatusOK, say("there. happy now?")
	})
	events := runTurn(t, s, token, firstTurn)
	if len(f.gens) != 1 {
		t.Fatalf("generations = %d", len(f.gens))
	}
	prompt := f.gens[0]["prompt"].(string)
	if !strings.Contains(prompt, "selfie, holding phone") || !strings.Contains(prompt, "lying on bed") {
		t.Fatalf("prompt = %s", prompt)
	}
	if neg := f.gens[0]["negative_prompt"].(string); !strings.Contains(neg, "loli") {
		t.Fatalf("the adult negative is missing: %s", neg)
	}
	c := storedConversation(t, s)
	var pic *storedChatMessage
	for i := range c.Messages {
		if c.Messages[i].ImageID != "" {
			pic = &c.Messages[i]
		}
	}
	if pic == nil {
		t.Fatalf("no picture message stored: %+v", c.Messages)
	}
	if last := c.Messages[len(c.Messages)-1]; last.Content != "there. happy now?" {
		t.Fatalf("she did not react to the picture: %+v", last)
	}
	// The second round was told it was sent, as a tool result.
	second := f.chats()[1]["messages"].([]any)
	tool := second[len(second)-1].(map[string]any)
	if tool["role"] != "tool" || !strings.Contains(tool["content"].(string), "Sent.") {
		t.Fatalf("tool result = %v", tool)
	}
	u, _ := s.db.UserByName(t.Context(), "tester")
	meta, ok := s.ownedChatImage(u.ID, pic.ImageID)
	if !ok || meta.Gen == nil || meta.Gen.Seed != 1234 || meta.Subject != chatSubjectSelf {
		t.Fatalf("the picture's record = %+v", meta)
	}
	if len(eventsNamed(events, "camera")) == 0 {
		t.Fatal("no camera progress was streamed")
	}
}

func TestAShotThatCrossesTheLineNeverReachesTheGenerator(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("", callTool("p1", toolTakePhoto, map[string]any{"shot": "dressed as a schoolchild, 15 years old"}))
		}
		return http.StatusOK, say("no. not that.")
	})
	runTurn(t, s, token, firstTurn)
	if len(f.gens) != 0 {
		t.Fatalf("the generator was called: %v", f.gens)
	}
	second := f.chats()[1]["messages"].([]any)
	if res := second[len(second)-1].(map[string]any)["content"].(string); !strings.Contains(res, "won't take that one") {
		t.Fatalf("result = %s", res)
	}
}

func TestABackendThatRefusesToolsIsAnsweredInJSONModeAndRemembered(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if _, hasTools := body["tools"]; hasTools {
			return http.StatusBadRequest, map[string]any{"error": "this template does not support tools"}
		}
		return http.StatusOK, say(`{"messages":["hey you"],"actions":[{"tool":"set_state","args":{"mood":"loving"}}]}`)
	})
	runTurn(t, s, token, firstTurn)
	c := storedConversation(t, s)
	if c.Messages[len(c.Messages)-1].Content != "hey you" || c.Emotion != "loving" {
		t.Fatalf("JSON turn not applied: %+v %s", c.Messages, c.Emotion)
	}
	before := len(f.chats())
	runTurn(t, s, token, `{"conversationId":"0123456789abcdef0123456789abcdef","messages":[{"id":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","role":"user","content":"again","at":2}]}`)
	if _, hasTools := f.chats()[before]["tools"]; hasTools {
		t.Fatal("the tool-less backend was offered tools again")
	}
}

func TestAStateBelowItsHeatDoesNotTakeAndAnUnknownRoomIsMadeOnlyWithAGenerator(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("mm", callTool("s", toolSetState, map[string]any{"heat": 1, "activity": "riding", "wearing": "a red sundress"}))
	})
	runTurn(t, s, token, firstTurn)
	c := storedConversation(t, s)
	if c.Activity != "" {
		t.Fatalf("a heat-5 state took at heat 1: %q", c.Activity)
	}
	if c.Wearing != "red sundress" {
		t.Fatalf("wearing = %q", c.Wearing)
	}
}

func TestRedoTakesHerLastReplyBackAndAnswersAgain(t *testing.T) {
	replies := []string{"first try", "second try"}
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say(replies[min(n, 1)])
	})
	runTurn(t, s, token, firstTurn)
	runTurn(t, s, token, `{"conversationId":"0123456789abcdef0123456789abcdef","redo":true}`)
	c := storedConversation(t, s)
	if len(c.Messages) != 2 || c.Messages[1].Content != "second try" {
		t.Fatalf("after redo: %+v", c.Messages)
	}
}

func TestAStaleClientSaveKeepsHerRepliesButNotWhatItDeleted(t *testing.T) {
	old := chatWorkspace{Conversations: []chatConversation{{
		ID: "c", Rev: 5, Emotion: "happy", Intensity: 3,
		Messages: []storedChatMessage{
			{ID: "u1", Role: "user", Content: "hi", At: 1},
			{ID: "a1", Role: "assistant", Content: "seen and deleted", At: 2, Rev: 3},
			{ID: "a2", Role: "assistant", Content: "never seen", At: 3, Rev: 5},
		},
	}}}
	incoming := chatWorkspace{Conversations: []chatConversation{{
		ID: "c", Rev: 3, Emotion: "neutral", Intensity: 1,
		Messages: []storedChatMessage{{ID: "u1", Role: "user", Content: "hi", At: 1, ReadAt: 9}},
	}}}
	mergeServerTurns(&incoming, old)
	c := incoming.Conversations[0]
	if len(c.Messages) != 2 || c.Messages[1].ID != "a2" || c.Messages[0].ReadAt != 9 {
		t.Fatalf("merged = %+v", c.Messages)
	}
	if c.Rev != 5 || c.Emotion != "happy" || c.Intensity != 3 {
		t.Fatalf("server state lost: rev %d %s %d", c.Rev, c.Emotion, c.Intensity)
	}
}

func TestAnImportedCardGetsNoCameraAndNoLibraryTools(t *testing.T) {
	names := libbyToolset(toolsetOptions{libby: false, camera: true, saved: true, emotions: libbyEmotions})
	for _, tool := range names {
		switch tool.Function.Name {
		case toolTakePhoto, toolSendLibrary, toolRemember, toolOffer, toolCall:
			t.Fatalf("a card was offered %s", tool.Function.Name)
		}
	}
}

func TestBubblesSplitOnBlankLinesAndCapAtThree(t *testing.T) {
	got := splitIntoBubbles("one\n\ntwo\n\nthree\n\nfour")
	if len(got) != 3 || got[2] != "three\n\nfour" {
		t.Fatalf("got %q", got)
	}
	if got := splitIntoBubbles("short and sweet. two sentences."); len(got) != 1 {
		t.Fatalf("a short reply was split: %q", got)
	}
}
