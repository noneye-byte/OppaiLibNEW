package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// chatStub is a fake model that records the system prompt it was handed and answers
// with a fixed reply, for the end-to-end tests below.
func chatStub(t *testing.T, s *Server, reply string) (prompt *string, history *[]chatMessage) {
	t.Helper()
	prompt, history = new(string), new([]chatMessage)
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		var body struct {
			Messages []chatMessage `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if len(body.Messages) > 0 {
			*prompt = body.Messages[0].Content
			*history = body.Messages[1:]
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":` + fmt.Sprintf("%q", reply) + `}}]}`))
	}))
	t.Cleanup(llm.Close)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	return prompt, history
}

// ── replying to an earlier message ──────────────────────────────────────────

func TestResolveReplyTargetQuotesAndOverlaps(t *testing.T) {
	messages := []chatMessage{
		{ID: "a1", Role: "user", Content: "did you ever finish that comic i sent you?"},
		{ID: "b2", Role: "assistant", Content: "not yet, tonight maybe"},
		{ID: "c3", Role: "user", Content: "also what do you want for dinner"},
		{ID: "d4", Role: "user", Content: "hello?"},
	}
	// Verbatim quote lands on the message it came from.
	if got := resolveReplyTarget("finish that comic", messages); got == nil || got.ID != "a1" || got.Role != "user" {
		t.Fatalf("verbatim quote resolved to %+v", got)
	}
	// Paraphrase with enough overlap lands too.
	if got := resolveReplyTarget("what you want for dinner", messages); got == nil || got.ID != "c3" {
		t.Fatalf("overlapping quote resolved to %+v", got)
	}
	// The latest message is never a target: replying to it is what every reply does.
	if got := resolveReplyTarget("hello", messages); got != nil {
		t.Fatalf("the latest message was a target: %+v", got)
	}
	// Two common words are not a match.
	if got := resolveReplyTarget("the thing", messages); got != nil {
		t.Fatalf("a vague quote resolved: %+v", got)
	}
	// Messages without ids cannot be pointed at.
	if got := resolveReplyTarget("not yet", []chatMessage{{Role: "assistant", Content: "not yet, tonight"}, {ID: "x", Role: "user", Content: "ok"}}); got != nil {
		t.Fatalf("an id-less message was a target: %+v", got)
	}
}

func TestFindReplyTagAcceptsTheSpellingsModelsUse(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"oh wait [reply: finish that comic] yes i did", "finish that comic"},
		{"[Replying to: \"what do you want for dinner\"] pasta", "what do you want for dinner"},
		{"[re: hello?] here", "hello?"},
		{"nothing here", ""},
	} {
		got, ok := findReplyTag(tc.in)
		if (tc.want == "") != !ok || got != tc.want {
			t.Errorf("%q: got %q, %v", tc.in, got, ok)
		}
	}
	// The scrubber takes it out afterwards.
	if out := scrubDirectives("oh wait [reply: finish that comic] yes i did"); strings.Contains(out, "[") {
		t.Fatalf("the reply tag survived scrubbing: %q", out)
	}
}

func TestChatReturnsWhichMessageSheAnswered(t *testing.T) {
	s, token := newTestServer(t)
	prompt, history := chatStub(t, s, "yes!! i finished it last night [reply: finish that comic]\n[mood: excited 3]")
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[
			{"id":"a1","role":"user","content":"did you ever finish that comic i sent you?"},
			{"id":"b2","role":"assistant","content":"not yet"},
			{"id":"c3","role":"user","content":"ok. also what should i watch","replyTo":{"id":"b2","role":"assistant","excerpt":"not yet"}}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message string        `json:"message"`
		ReplyTo *chatReplyRef `json:"replyTo"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.ReplyTo == nil || out.ReplyTo.ID != "a1" {
		t.Fatalf("replyTo = %+v, want the comic question", out.ReplyTo)
	}
	if strings.Contains(out.Message, "[") {
		t.Fatalf("the tag reached the prose: %q", out.Message)
	}
	// She was told the tag exists, and told what their latest message answered.
	if !strings.Contains(*prompt, "[reply:") || !strings.Contains(*prompt, `direct reply to something you said earlier: "not yet"`) {
		t.Fatalf("prompt is missing the reply directives: %s", *prompt)
	}
	// The history the model reads carries the quote as a quote, and never an id.
	last := (*history)[len(*history)-1]
	if !strings.HasPrefix(last.Content, "> not yet\n") || last.ID != "" {
		t.Fatalf("history did not fold the reply in: %+v", last)
	}
}

// ── ringing them, and hanging up ────────────────────────────────────────────

func TestCallTagsOnlyMeanSomethingInTheRightState(t *testing.T) {
	s, token := newTestServer(t)
	chatStub(t, s, "come here, i want to see your face [call]\n[mood: loving 4]")
	var out struct {
		Message     string `json:"message"`
		CallRequest bool   `json:"callRequest"`
		CallEnd     bool   `json:"callEnd"`
	}
	ask := func(body string) {
		t.Helper()
		rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat", body)
		if rec.Code != http.StatusOK {
			t.Fatalf("chat: %d %s", rec.Code, rec.Body)
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatalf("decode: %v", err)
		}
	}
	ask(`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"hey"}]}`)
	if !out.CallRequest || out.CallEnd || strings.Contains(out.Message, "[") {
		t.Fatalf("off a call, [call] should ring: %+v", out)
	}
	// Already on a call, a ring is noise.
	ask(`{"mode":"sweet","characterId":"libby","call":true,"messages":[{"role":"user","content":"hey"}]}`)
	if out.CallRequest {
		t.Fatalf("she rang during a call: %+v", out)
	}
	chatStub(t, s, "ok i need to go, bye [hangup]\n[mood: sleepy 2]")
	ask(`{"mode":"sweet","characterId":"libby","call":true,"messages":[{"role":"user","content":"hey"}]}`)
	if !out.CallEnd || out.CallRequest || strings.Contains(out.Message, "[") {
		t.Fatalf("on a call, [hangup] should end it: %+v", out)
	}
	ask(`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"hey"}]}`)
	if out.CallEnd {
		t.Fatalf("she hung up a call that was not open: %+v", out)
	}
}

func TestFindCallTagsSpellings(t *testing.T) {
	for _, in := range []string{"[call]", "[video call]", "[videocall: start]", "[facetime]", "[Call: now]"} {
		if req, _ := findCallTags("hey " + in + " ok"); !req {
			t.Errorf("%q was not read as a ring", in)
		}
	}
	for _, in := range []string{"[hangup]", "[hang up]", "[end call]", "[call: end]", "[video call: over]"} {
		if _, end := findCallTags("bye " + in); !end {
			t.Errorf("%q was not read as a hang-up", in)
		}
	}
	// Bracketed prose that merely contains the word is left alone, by the parsers and
	// by the scrubber alike.
	if req, end := findCallTags("[calls out to you]"); req || end {
		t.Fatal("a stage direction was read as a call tag")
	}
	for _, prose := range []string{"[rings the bell]", "[answering the door]", "[re-reads the note]", "[calls your name]"} {
		if out := scrubDirectives("hey " + prose + " ok"); !strings.Contains(out, prose) {
			t.Errorf("the scrubber ate the stage direction %q: %q", prose, out)
		}
	}
	for _, tag := range []string{"[call]", "[hang up]", "[reply: hello]", "[replying to hello]", "[scene: bedroom]"} {
		if out := scrubDirectives("hey " + tag + " ok"); strings.Contains(out, "[") {
			t.Errorf("the scrubber left the tag %q: %q", tag, out)
		}
	}
}

// ── where she is ────────────────────────────────────────────────────────────

func seedBackground(t *testing.T, s *Server, token, name string, tags ...string) string {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"name": name, "tags": tags})
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/backgrounds", string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("save background: %d %s", rec.Code, rec.Body)
	}
	var view libbyBackgroundView
	_ = json.Unmarshal(rec.Body.Bytes(), &view)
	png := "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("\x89PNG\r\n\x1a\nfake"))
	rec = do(t, s.Handler(), token, http.MethodPut, "/api/libby/backgrounds/"+view.ID+"/image", `{"imageData":"`+png+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("set background image: %d %s", rec.Code, rec.Body)
	}
	return view.ID
}

func TestBackgroundsStoreAndResolve(t *testing.T) {
	s, token := newTestServer(t)
	bedroom := seedBackground(t, s, token, "Bedroom", "bed", "night", "lamp")
	kitchen := seedBackground(t, s, token, "Kitchen", "morning", "coffee")
	list := s.listLibbyBackgrounds()
	if len(list) != 2 || !list[0].HasImage {
		t.Fatalf("list = %+v", list)
	}
	for _, tc := range []struct {
		label, want string
		ok          bool
	}{
		{"Bedroom", bedroom, true},
		{"bedroom", bedroom, true},
		{"somewhere with coffee", kitchen, true},
		{"going to bed now", bedroom, true},
		{"none", "", true},
		{"the moon", "", false},
	} {
		got, ok := resolveBackground(tc.label, list)
		if got != tc.want || ok != tc.ok {
			t.Errorf("%q: (%q, %v), want (%q, %v)", tc.label, got, ok, tc.want, tc.ok)
		}
	}
	directive := backgroundDirective(list, kitchen)
	for _, want := range []string{"[scene:", "Bedroom (bed, night, lamp)", "Right now you are in Kitchen"} {
		if !strings.Contains(directive, want) {
			t.Fatalf("directive missing %q: %s", want, directive)
		}
	}
	if backgroundDirective(nil, "") != "" {
		t.Fatal("a directive with nowhere to go")
	}
	rec := do(t, s.Handler(), token, http.MethodDelete, "/api/libby/backgrounds/"+kitchen, "")
	if rec.Code != http.StatusOK || len(s.listLibbyBackgrounds()) != 1 {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
}

func TestChatReturnsTheSceneSheMovedTo(t *testing.T) {
	s, token := newTestServer(t)
	bedroom := seedBackground(t, s, token, "Bedroom", "bed", "night")
	kitchen := seedBackground(t, s, token, "Kitchen", "morning")
	prompt, _ := chatStub(t, s, "ugh, ok, taking this to bed [scene: bedroom]\n[mood: sleepy 2]")
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","background":"`+kitchen+`","messages":[{"role":"user","content":"tired?"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message    string `json:"message"`
		Background string `json:"background"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Background != bedroom || strings.Contains(out.Message, "[") {
		t.Fatalf("out = %+v, want the bedroom", out)
	}
	if !strings.Contains(*prompt, "Right now you are in Kitchen") {
		t.Fatalf("she was not told where she was: %s", *prompt)
	}
	// An unresolvable scene leaves her where she was; a deleted one is nowhere.
	chatStub(t, s, "hm [scene: the moon]\n[mood: thinking 2]")
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","background":"`+kitchen+`","messages":[{"role":"user","content":"where are you"}]}`)
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Background != kitchen {
		t.Fatalf("an unknown scene moved her: %+v", out)
	}
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","background":"0123456789abcdef0123456789abcdef","messages":[{"role":"user","content":"where are you"}]}`)
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Background != "" {
		t.Fatalf("a deleted background survived: %+v", out)
	}
}

// ── things they attached ────────────────────────────────────────────────────

func TestSharedItemsDirectiveDescribesTheirLibraryItems(t *testing.T) {
	s, token := newTestServer(t)
	video := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach", "swimsuit")
	selfie := seedTitledMedia(t, s, "Libby at the desk", "image", libbyIdentityTag, "glasses")
	directive := s.sharedItemsDirective(context.Background(), []int64{video, selfie, 999999}, true)
	for _, want := range []string{`"Summer at the Coast" (video, tagged`, "beach", "picture of you", "seeing yourself"} {
		if !strings.Contains(directive, want) {
			t.Fatalf("directive missing %q: %s", want, directive)
		}
	}
	if strings.Contains(directive, libbyIdentityTag) {
		t.Fatalf("the identity tag was read out: %s", directive)
	}
	if s.sharedItemsDirective(context.Background(), nil, true) != "" || s.sharedItemsDirective(context.Background(), []int64{999999}, true) != "" {
		t.Fatal("a directive for nothing")
	}
	prompt, _ := chatStub(t, s, "oh the beach one!! [link: Summer at the Coast]\n[mood: happy 3]")
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","sharedMediaIds":[`+itoa(video)+`],"messages":[{"role":"user","content":"look at this"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	if !strings.Contains(*prompt, "they attached from their own library") {
		t.Fatalf("the shared item never reached the prompt: %s", *prompt)
	}
}

// ── what the workspace keeps ────────────────────────────────────────────────

// Activity, background, the mood run and quoted replies all live on the workspace
// now. They used to be dropped by the server's struct, which meant every reload
// reset her state and forgot which message a reply answered.
func TestWorkspaceKeepsConversationState(t *testing.T) {
	ws := chatWorkspace{
		Characters: []chatCharacter{defaultLibbyCard()},
		Conversations: []chatConversation{{
			ID: "0123456789abcdef0123456789abcdef", CharacterID: "libby", Title: "t", Mode: "sweet",
			Emotion: "happy", Intensity: 2, Activity: "reading", Background: "fedcba9876543210fedcba9876543210",
			Messages: []storedChatMessage{
				{ID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Role: "user", Content: "hi", At: 1,
					ReplyTo: &chatReplyRef{ID: "x", Role: "assistant", Excerpt: "earlier"}},
				{ID: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", Role: "assistant", Content: "hey", At: 2, Mood: "Happy",
					Actions: []libbyAction{{ID: "1", Kind: "favorite"}, {ID: "2", Kind: "tag"}, {ID: "3", Kind: "tag"}}},
			},
		}},
	}
	if err := validateChatWorkspace(&ws); err != nil {
		t.Fatalf("validate: %v", err)
	}
	c := ws.Conversations[0]
	if c.Activity != "reading" || c.Background != "fedcba9876543210fedcba9876543210" {
		t.Fatalf("conversation state was dropped: %+v", c)
	}
	if c.Messages[0].ReplyTo == nil || c.Messages[0].ReplyTo.Excerpt != "earlier" {
		t.Fatalf("the reply reference was dropped: %+v", c.Messages[0])
	}
	if c.Messages[1].Mood != "happy" || len(c.Messages[1].Actions) != maxLibbyActions {
		t.Fatalf("mood/actions not normalised: %+v", c.Messages[1])
	}
	// Junk is normalised away rather than rejected.
	ws.Conversations[0].Activity = "typing"
	ws.Conversations[0].Background = "not-an-id"
	ws.Conversations[0].Messages[0].Mood = "happy"
	ws.Conversations[0].Messages[0].ReplyTo = &chatReplyRef{Excerpt: "   "}
	if err := validateChatWorkspace(&ws); err != nil {
		t.Fatalf("validate: %v", err)
	}
	c = ws.Conversations[0]
	if c.Activity != "" || c.Background != "" || c.Messages[0].Mood != "" || c.Messages[0].ReplyTo != nil {
		t.Fatalf("junk survived: %+v", c)
	}
}
