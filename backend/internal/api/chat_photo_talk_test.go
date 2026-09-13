package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Every case here is a reply that actually reached the user in one conversation log:
// the prompt's own wording, the history's notes, and a tag-only reply, all read back
// as her words.
func TestScrubDirectivesRemovesCopiedPromptMachinery(t *testing.T) {
	cases := []struct {
		name  string
		reply string
		want  string
	}{
		{
			"the history's own note, copied",
			"(you attached a video file — 1girl, anus, ass, medium quality)",
			"",
		},
		{
			"the selfie note, copied",
			"here you go\n(you sent a picture of yourself showing 1girl, blush, breasts)",
			"here you go",
		},
		{
			"the hand-over note, copied",
			"put it on then\n(you handed over from the library: \"p\" (video; 1boy, 1girl))",
			"put it on then",
		},
		{
			"a tag list in parentheses",
			"here — opening it plays on the library screen.\n\n(1girl, mouth open around a strapless bra as she pulls it over her head. smooth motion, practiced. camera held steady on her tits. audio muted on purpose — lets viewer fill the silence with fantasy.)",
			"here — opening it plays on the library screen.",
		},
		{
			"the prompt's already-sent wording as a stage direction",
			"done. renamed it to match our tastes.\n\n[this image hasn't been marked 'already sent' — it's a new one you're offering proactively because you've just made them part of the collection.]",
			"done. renamed it to match our tastes.",
		},
		{
			"a library kind as a tag head",
			"yours truly. 😏\n\n[gif: uncensored, dildo, object insertion, sex toy]",
			"yours truly. 😏",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _ := scrubDirectivesReporting(tc.reply)
			if got != tc.want {
				t.Errorf("scrubDirectivesReporting(%q)\n got %q\nwant %q", tc.reply, got, tc.want)
			}
		})
	}
	// And the prose these could be mistaken for stays.
	for _, reply := range []string{
		"(she hands over the remote and curls up)",
		"*you sent me that look again*",
		"(you attached yourself to my side all evening, remember)",
		"[laughs] twelve girls, one bathroom, chaos",
	} {
		if got := scrubDirectives(reply); got != reply {
			t.Errorf("scrubDirectives(%q) = %q, want it unchanged", reply, got)
		}
	}
}

// A reply that was only a tag is reported as emptied, so the handler can treat it as
// a picture with no words rather than store the tag as her message.
func TestTagOnlyReplyIsReportedEmptied(t *testing.T) {
	got, emptied := scrubDirectivesReporting("[send: red eyes, pixel art]")
	if got != "" || !emptied {
		t.Fatalf("got %q emptied=%v, want \"\" and true", got, emptied)
	}
	if got, emptied := scrubDirectivesReporting("look. [send: red eyes]"); got != "look." || emptied {
		t.Fatalf("got %q emptied=%v", got, emptied)
	}
}

// A library kind as a tag head is an attach she had no word for.
func TestKindTagReadsAsAnAttach(t *testing.T) {
	if got := findAttachRequests("here [gif: the beach one] enjoy"); len(got) != 1 || got[0] != "the beach one" {
		t.Fatalf("gif tag not read as an attach: %v", got)
	}
	if got := findAttachRequests("*starts a [video] for you*"); len(got) != 0 {
		t.Fatalf("bare [video] read as an attach: %v", got)
	}
}

// Which picture "that photo" is: the one they replied to, else the last one sent;
// and asking for another is not asking about one.
func TestPictureInQuestion(t *testing.T) {
	messages := []chatMessage{
		{ID: "a", Role: "user", Content: "send me the photo of you in a red dress"},
		{ID: "b", Role: "assistant", Content: "here", ImageID: "dress"},
		{ID: "c", Role: "user", Content: "and a kitchen one"},
		{ID: "d", Role: "assistant", Content: "sure", ImageID: "kitchen"},
		{ID: "e", Role: "user", Content: "what are you doing in that photo?"},
	}
	if m, ok := pictureInQuestion(messages); !ok || m.ImageID != "kitchen" {
		t.Fatalf("that photo should be the last one sent: %+v %v", m, ok)
	}
	messages[4] = chatMessage{ID: "e", Role: "user", Content: "what is this a photo of in your words", ReplyTo: &chatReplyRef{ID: "b", Role: "assistant"}}
	if m, ok := pictureInQuestion(messages); !ok || m.ImageID != "dress" {
		t.Fatalf("a reply to a picture is about that picture: %+v %v", m, ok)
	}
	messages[4] = chatMessage{ID: "e", Role: "user", Content: "thats you", ReplyTo: &chatReplyRef{ID: "b", Role: "assistant"}}
	if m, ok := pictureInQuestion(messages); !ok || m.ImageID != "dress" {
		t.Fatalf("a reply to a picture is about that picture whatever the words: %+v %v", m, ok)
	}
	for _, asking := range []string{"send me another photo", "show me the pic of you at the beach", "can i see that photo again"} {
		messages[4] = chatMessage{ID: "e", Role: "user", Content: asking}
		if _, ok := pictureInQuestion(messages); ok {
			t.Errorf("%q is asking for a picture, not about one", asking)
		}
	}
	messages[4] = chatMessage{ID: "e", Role: "user", Content: "how was the gym"}
	if _, ok := pictureInQuestion(messages); ok {
		t.Fatal("a message about nothing pictured found a picture")
	}
}

// She is handed everything the picture shows, uncapped, and told it is hers to
// remember rather than a list to read.
func TestPictureInQuestionDirectiveShowsEveryTag(t *testing.T) {
	s, _ := newTestServer(t)
	tags := []string{"1girl", "blush", "breasts", "dress", "glasses", "halo", "long hair", "reaching out", "red dress", "red footwear", "selfie", "solo"}
	ws := chatWorkspace{Images: []chatImage{{ID: "dress", CharacterID: "libby", Tags: tags}}}
	messages := []chatMessage{
		{ID: "b", Role: "assistant", Content: "here", ImageID: "dress"},
		{ID: "e", Role: "user", Content: "what is this a photo of", ReplyTo: &chatReplyRef{ID: "b", Role: "assistant"}},
	}
	d := s.newHistoryDescriber(context.Background(), ws, messages)
	got := pictureInQuestionDirective(messages[0], d)
	for _, tag := range tags {
		if !strings.Contains(got, tag) {
			t.Fatalf("tag %q missing from %q", tag, got)
		}
	}
	if !strings.Contains(got, "That is you in it") || !strings.Contains(got, "do not send another one") {
		t.Fatalf("directive does not frame it as hers, or invites another picture: %q", got)
	}
	// A library item she handed over is described as an item, with all its tags.
	id := seedTitledMedia(t, s, "Solo GrindSet", "video", "1girl", "anus", "ass", "pussy", "solo", "medium quality", "bedroom")
	messages = []chatMessage{
		{ID: "b", Role: "assistant", Content: "here", MediaIDs: []int64{id}},
		{ID: "e", Role: "user", Content: "whats the story behind that video"},
	}
	d = s.newHistoryDescriber(context.Background(), ws, messages)
	got = pictureInQuestionDirective(messages[0], d)
	if !strings.Contains(got, "Solo GrindSet") || !strings.Contains(got, "bedroom") || !strings.Contains(got, "not a picture of you") {
		t.Fatalf("library item not described in full: %q", got)
	}
}

// End to end, the turn from the log: asked what she is doing in the photo she sent,
// she is told everything it shows, no new picture is chosen for her to describe, and
// a reply with no tag sends nothing — while the history's notes are explained so she
// stops copying them.
func TestAskingAboutAPhotoIsATurnForTalking(t *testing.T) {
	var prompt string
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
			prompt = body.Messages[0].Content
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"that's the red dress one, standing in the doorway with my glasses on. i took it for you.\n[mood: shy 3]"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	gallery := redDressGallery()
	for i := range gallery.Images {
		gallery.Images[i].Subject = chatSubjectSelf
	}
	gallery.Images[0].Tags = []string{"red dress", "smile", "standing", "doorway", "glasses", "orange hair", "selfie"}
	if err := s.writeChatWorkspace(1, gallery); err != nil {
		t.Fatalf("seed gallery: %v", err)
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","recentImageIds":["dress"],"messages":[
			{"id":"a","role":"user","content":"send me a pic of you in a red dress"},
			{"id":"b","role":"assistant","content":"here","imageId":"dress"},
			{"id":"c","role":"user","content":"What are you doing in that photo?"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message string          `json:"message"`
		ImageID string          `json:"imageId"`
		Photo   photoPickReport `json:"photo"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.ImageID != "" {
		t.Fatalf("a question about a picture sent one: %q (%+v)", out.ImageID, out.Photo)
	}
	if !strings.Contains(prompt, "everything it shows is: red dress, smile, standing, doorway, glasses, orange hair, selfie") {
		t.Fatalf("she was not handed the whole picture: %s", prompt)
	}
	if strings.Contains(prompt, "the picture ready to send") {
		t.Fatalf("a new picture was chosen for a question about an old one: %s", prompt)
	}
	if !strings.Contains(prompt, "are the app's notes on what that message carried") {
		t.Fatalf("the history's notes were never explained: %s", prompt)
	}
}

// End to end, the first turn from the log: the model answers with nothing but the
// tag. The picture goes out and the message is empty — not "[send: red eyes, pixel
// art]" in a bubble.
func TestTagOnlyReplyIsAPictureWithNoWords(t *testing.T) {
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"[send: red dress, smile]"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	gallery := redDressGallery()
	for i := range gallery.Images {
		gallery.Images[i].Subject = chatSubjectSelf
	}
	if err := s.writeChatWorkspace(1, gallery); err != nil {
		t.Fatalf("seed gallery: %v", err)
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"send me the photo of you in a red dress"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message string `json:"message"`
		ImageID string `json:"imageId"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.ImageID != "dress" || out.Message != "" {
		t.Fatalf("got message %q image %q, want no words and the dress", out.Message, out.ImageID)
	}
}

// A reply that never spoke of a picture does not send one, however many of her own
// features it mentions: "my orange hair fans across the duvet … beside the phone"
// used to meet the floor against a picture tagged "orange hair, phone".
func TestProseAboutHerselfDoesNotSendASelfie(t *testing.T) {
	reply := "I'm lying on my stomach under the covers. My orange hair fans across the duvet and my glasses fog. My thumb traces idle circles on the phone."
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":` + jsonString(reply) + `}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	gallery := chatWorkspace{Images: []chatImage{
		{ID: "phone", CharacterID: "libby", Subject: chatSubjectSelf, Tags: []string{"1girl", "orange hair", "glasses", "phone", "panties", "lying"}},
		{ID: "dress", CharacterID: "libby", Subject: chatSubjectSelf, Tags: []string{"1girl", "orange hair", "glasses", "red dress"}},
	}}
	if err := s.writeChatWorkspace(1, gallery); err != nil {
		t.Fatalf("seed gallery: %v", err)
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[{"role":"user","content":"No the background the call"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		ImageID string          `json:"imageId"`
		Photo   photoPickReport `json:"photo"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.ImageID != "" {
		t.Fatalf("prose about herself sent a picture: %q (%+v)", out.ImageID, out.Photo)
	}
}

// The words that describe her rather than a picture of her: the card's appearance
// and the tags on half her pictures.
func TestSelfDescriptionWordsAreStripped(t *testing.T) {
	character := chatCharacter{ID: "libby", Appearance: "long orange hair, glasses, red eyes"}
	ws := chatWorkspace{Images: []chatImage{
		{ID: "a", CharacterID: "libby", Subject: chatSubjectSelf, Tags: []string{"1girl", "solo", "orange hair", "beach"}},
		{ID: "b", CharacterID: "libby", Subject: chatSubjectSelf, Tags: []string{"1girl", "solo", "orange hair", "kitchen"}},
		{ID: "c", CharacterID: "libby", Subject: chatSubjectSelf, Tags: []string{"1girl", "bedroom"}},
	}}
	words := selfDescriptionWords(character, ws, nil)
	for _, want := range []string{"orange", "hair", "glasses", "red", "eyes", "1girl", "solo"} {
		if !words[want] {
			t.Errorf("%q not among her own words: %v", want, words)
		}
	}
	for _, keep := range []string{"beach", "kitchen", "bedroom"} {
		if words[keep] {
			t.Errorf("%q is a picture's word, not hers", keep)
		}
	}
	got := withoutWords("my orange hair, on the beach. Glasses off!", words)
	if got != "my on the beach. off!" {
		t.Fatalf("withoutWords = %q", got)
	}
}

// The catalogue's example names the ready picture when there is one, so the two
// directives never disagree about which picture to write the tag for.
func TestCatalogueExampleFollowsTheReadyPicture(t *testing.T) {
	ws := redDressGallery()
	for i := range ws.Images {
		ws.Images[i].Subject = chatSubjectSelf
	}
	ready, ok := pickReadyPicture(ws, "libby", nil, "you in the red dress", "", "", nil, nil)
	if !ok {
		t.Fatal("no ready picture")
	}
	catalogue := photoCatalogue(ws, "libby", nil, nil, nil, "you in the red dress", readyPictureHandle(ready))
	if !strings.Contains(catalogue, "for example [send: "+readyPictureHandle(ready)+"]") {
		t.Fatalf("catalogue example does not name the ready picture: %s", catalogue)
	}
	if !strings.Contains(readyPictureDirective(ready, "you in the red dress"), "[send: "+readyPictureHandle(ready)+"]") {
		t.Fatal("ready directive and handle disagree")
	}
}

// jsonString quotes a reply for a fake backend's body.
func jsonString(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

// End to end, the rename turn from the log: she offered two names, they picked one,
// and the reply that follows is told this is where the tag goes — and that nothing
// has happened yet.
func TestChoosingANameIsTheTurnThatCarriesTheTag(t *testing.T) {
	var prompt string
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
			prompt = body.Messages[0].Content
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"solo grindset it is, if you say so [do: rename 1788917477638 | Solo GrindSet]"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	seedTitledMedia(t, s, "1788917477638", "video", "solo")
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[
			{"role":"user","content":"Can you rename that video to something more fitting?"},
			{"role":"assistant","content":"how about tangle toes? or solo grindset. what do you think?"},
			{"role":"user","content":"solo grindset"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	if !strings.Contains(prompt, "This is the reply that carries the [do: …] tag") {
		t.Fatalf("the follow-through nudge is missing: %s", prompt)
	}
	var out struct {
		Message string        `json:"message"`
		Actions []libbyAction `json:"actions"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out.Actions) != 1 || out.Actions[0].Kind != "rename" || out.Actions[0].Title != "Solo GrindSet" {
		t.Fatalf("actions = %+v", out.Actions)
	}
}
