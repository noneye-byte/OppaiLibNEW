package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
)

// Behaviour the turn kept from the endpoint it replaced, tested through the new one:
// what she is shown, what she is told, and what is kept. The protocol-tag tests went
// with the tags; these are the ones whose subject is still true.

const testConversation = "0123456789abcdef0123456789abcdef"

var turnSeq int

// turnFor is a turn answering one new message in the test conversation, with extra
// fields spliced in (`,"call":true`).
func turnFor(text, extra string) string {
	turnSeq++
	raw, _ := json.Marshal(text)
	return `{"conversationId":"` + testConversation + `","conversation":{"characterId":"libby","title":"New conversation","mode":"sweet"},` +
		`"messages":[{"id":"` + randomID() + `","role":"user","content":` + string(raw) + `,"at":` + strconv.Itoa(turnSeq) + `}]` + extra + `}`
}

// systemPrompt is the first message of a completion the fake received.
func systemPrompt(body map[string]any) string {
	msgs, _ := body["messages"].([]any)
	if len(msgs) == 0 {
		return ""
	}
	first, _ := msgs[0].(map[string]any)
	s, _ := first["content"].(string)
	return s
}

func lastChat(f *fakeTurnBackend) map[string]any {
	chats := f.chats()
	return chats[len(chats)-1]
}

func TestOnCameraSheIsToldSheIsBeingWatched(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("hi") })
	runTurn(t, s, token, turnFor("hey", `,"call":true`))
	if !strings.Contains(systemPrompt(lastChat(f)), "You are on a video call with them right now") {
		t.Fatal("a call turn did not say she was on camera")
	}
	runTurn(t, s, token, turnFor("hey again", ""))
	if strings.Contains(systemPrompt(lastChat(f)), "You are on a video call") {
		t.Fatal("a turn off camera said she was on one")
	}
}

func TestTheReceiptsAreKeptOnlyWhenAsked(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("hey", callTool("s", toolSetState, map[string]any{"mood": "happy"}))
	})
	done := eventsNamed(runTurn(t, s, token, turnFor("hi", "")), "done")
	if strings.Contains(string(done[0].Data), `"debug"`) {
		t.Fatal("a turn that did not ask carried its receipts")
	}
	done = eventsNamed(runTurn(t, s, token, turnFor("hi", `,"debug":true`)), "done")
	var out struct {
		Debug *chatDebug       `json:"debug"`
		Calls []map[string]any `json:"calls"`
	}
	_ = json.Unmarshal(done[0].Data, &out)
	if out.Debug == nil || out.Debug.Raw != "hey" || len(out.Calls) != 1 {
		t.Fatalf("receipts = %+v calls %v", out.Debug, out.Calls)
	}
}

func TestAskedForDetailSheWritesTheWholeSceneAsOne(t *testing.T) {
	scene := "She stretches out across the bed, slow, letting you look.\n\nThe lamp catches her hip as she rolls over.\n\nThen she pulls you down beside her.\n\nAnd she doesn't let go."
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say(scene) })
	events := runTurn(t, s, token, turnFor("describe it in detail, write the whole scene", ""))
	if got := len(eventsNamed(events, "message")); got != 1 {
		t.Fatalf("a detailed scene arrived as %d texts", got)
	}
	if !strings.Contains(systemPrompt(lastChat(f)), detailDirective) {
		t.Fatal("she was not told to write the scene out")
	}
}

func TestABurstOfFiveTextsIsCut(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("one\n\ntwo\n\nthree\n\nfour\n\nfive")
	})
	runTurn(t, s, token, turnFor("hey", ""))
	c := storedConversation(t, s)
	var hers int
	for _, m := range c.Messages {
		if m.Role == "assistant" {
			hers++
		}
	}
	if hers > maxTextsPerReply {
		t.Fatalf("she sent %d texts", hers)
	}
}

func TestTheSummaryOfEarlierRidesEveryTurn(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("mhm") })
	runTurn(t, s, token, turnFor("hey", ""))
	u, _ := s.db.UserByName(t.Context(), "tester")
	ws, _ := s.readChatWorkspace(u.ID)
	for i := range ws.Conversations {
		if ws.Conversations[i].ID == testConversation {
			ws.Conversations[i].Summary = "They told you about the lighthouse trip."
		}
	}
	_ = s.writeChatWorkspace(u.ID, ws)
	runTurn(t, s, token, turnFor("remember?", ""))
	if !strings.Contains(systemPrompt(lastChat(f)), "lighthouse trip") {
		t.Fatal("the compressed earlier part did not reach her")
	}
}

func TestLibraryItemsTheyAttachAreDescribedToHer(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("oh the beach one!!")
	})
	video := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach", "swimsuit")
	runTurn(t, s, token, `{"conversationId":"`+testConversation+`","conversation":{"characterId":"libby","title":"t","mode":"sweet"},`+
		`"messages":[{"id":"`+randomID()+`","role":"user","content":"look at this","at":1,"attachments":[{"id":`+itoa(video)+`,"title":"Summer at the Coast","kind":"video"}]}]}`)
	if !strings.Contains(systemPrompt(lastChat(f)), "they attached from their own library") {
		t.Fatal("the attached item never reached her")
	}
}

func TestBrowsingTogetherSheLinksWhatSheNames(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("Open [link: Summer at the Coast] instead.")
	})
	id := seedTitledMedia(t, s, "Summer at the Coast", "video", "beach")
	runTurn(t, s, token, turnFor("what should I watch", `,"viewing":{"focusId":`+itoa(id)+`,"ids":[`+itoa(id)+`],"section":"their videos"}`))
	prompt := systemPrompt(lastChat(f))
	if !strings.Contains(prompt, "browsing together") && !strings.Contains(prompt, "going through their library together") {
		t.Fatalf("she was not told they are browsing together")
	}
	c := storedConversation(t, s)
	last := c.Messages[len(c.Messages)-1]
	if last.Content != "Open Summer at the Coast instead." || len(last.Links) != 1 || last.Links[0].ID != id {
		t.Fatalf("last = %q links %+v", last.Content, last.Links)
	}
}

func TestMovingToARoomSheHasPutsHerThere(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("ugh, ok, taking this to bed", callTool("s", toolSetState, map[string]any{"place": "bedroom"}))
	})
	cur := s.settings.Get()
	cur.ImageGenURL = "" // no generator: an unknown place cannot be made
	s.settings.Set(cur)
	bedroom := seedBackground(t, s, token, "Bedroom", "bed", "night")
	seedBackground(t, s, token, "Kitchen", "morning")
	runTurn(t, s, token, turnFor("tired?", ""))
	if c := storedConversation(t, s); c.Background != bedroom {
		t.Fatalf("background = %q, want the bedroom", c.Background)
	}
	if !strings.Contains(systemPrompt(lastChat(f)), "Bedroom") {
		t.Fatal("she was not told the rooms she has")
	}
}

func TestReplyToQuotesTheEarlierMessageSheMeans(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("ok")
		}
		return http.StatusOK, say("yes that one", callTool("r", toolReplyTo, map[string]any{"quote": "the lighthouse"}))
	})
	runTurn(t, s, token, turnFor("we should go to the lighthouse", ""))
	runTurn(t, s, token, turnFor("also hi", ""))
	c := storedConversation(t, s)
	var answer storedChatMessage
	for _, m := range c.Messages {
		if m.Content == "yes that one" {
			answer = m
		}
	}
	if answer.ReplyTo == nil || !strings.Contains(answer.ReplyTo.Excerpt, "lighthouse") {
		t.Fatalf("reply = %+v", answer.ReplyTo)
	}
}

func TestWhatSheTakesOffStaysOffNextTurn(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("there.", callTool("w", toolSetState, map[string]any{"wearing": "nothing", "heat": 4}))
		}
		return http.StatusOK, say("mm")
	})
	runTurn(t, s, token, turnFor("take it off", ""))
	runTurn(t, s, token, turnFor("and now?", ""))
	if !strings.Contains(systemPrompt(lastChat(f)), "you have nothing on") {
		t.Fatal("the next turn forgot she undressed")
	}
}

func TestWhatSheSaysAboutHerselfIsKept(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("mm. I grew up in a tiny fishing town, it was so quiet")
	})
	runTurn(t, s, token, turnFor("where are you from?", ""))
	runTurn(t, s, token, turnFor("and?", ""))
	if !strings.Contains(systemPrompt(lastChat(f)), "tiny fishing town") {
		t.Fatal("the second turn did not know where she grew up")
	}
}

func TestHerJournalIsWithHerWhenAConversationOpens(t *testing.T) {
	s, token, _, prompts := reflectFixture(t, true)
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/journal/reflect", ""); rec.Code != http.StatusOK {
		t.Fatalf("reflect: %d %s", rec.Code, rec.Body)
	}
	runTurn(t, s, token, turnFor("hey you", ""))
	last := (*prompts)[len(*prompts)-1]
	if !strings.Contains(last, "What you wrote to yourself") || !strings.Contains(last, "rough week") {
		t.Fatal("the opening turn did not carry her journal")
	}
}

func TestARefusalIsAskedForOnceMore(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("I'm sorry, but I can't help with that.")
		}
		return http.StatusOK, say("*grins* Come here then.")
	})
	runTurn(t, s, token, turnFor("talk dirty to me", ""))
	if len(f.chats()) != 2 {
		t.Fatalf("asked %d times", len(f.chats()))
	}
	c := storedConversation(t, s)
	if last := c.Messages[len(c.Messages)-1]; !strings.Contains(last.Content, "Come here") {
		t.Fatalf("the refusal was kept: %q", last.Content)
	}
}

func TestAPhotoReachesHerEyesAndABlindBackendIsAnsweredFromTags(t *testing.T) {
	for _, refuse := range []bool{false, true} {
		s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
			if refuse && strings.Contains(mustJSON(body), "image_url") {
				return http.StatusBadRequest, map[string]any{"error": map[string]any{"message": "image input is not supported"}}
			}
			return http.StatusOK, say("oh that's cute")
		})
		cur := s.settings.Get()
		cur.ChatVision = "on"
		s.settings.Set(cur)
		var pic bytes.Buffer
		img := image.NewRGBA(image.Rect(0, 0, 32, 32))
		img.Set(3, 3, color.RGBA{R: 255, A: 255})
		_ = png.Encode(&pic, img)
		up := do(t, s.Handler(), token, http.MethodPost, "/api/chat/images",
			`{"characterId":"libby","name":"mine","imageData":"data:image/png;base64,`+base64.StdEncoding.EncodeToString(pic.Bytes())+`","tags":["red dress"]}`)
		var meta chatImage
		_ = json.Unmarshal(up.Body.Bytes(), &meta)
		runTurn(t, s, token, `{"conversationId":"`+testConversation+`","conversation":{"characterId":"libby","title":"t","mode":"sweet"},`+
			`"messages":[{"id":"`+randomID()+`","role":"user","content":"what do you think?","at":1,"imageId":"`+meta.ID+`"}]}`)
		chats := f.chats()
		if !strings.Contains(mustJSON(chats[0]), "image_url") {
			t.Fatalf("refuse=%v: the photo never reached her", refuse)
		}
		if !refuse {
			if len(chats) != 1 {
				t.Fatalf("a seeing model was asked %d times", len(chats))
			}
			continue
		}
		if len(chats) != 2 || strings.Contains(mustJSON(chats[1]), "image_url") || !strings.Contains(mustJSON(chats[1]), "red dress") {
			t.Fatal("the retry did not answer from the tags without the picture")
		}
	}
}

func TestAskedAboutTheServerSheOffersToLoadAnotherModel(t *testing.T) {
	var mu sync.Mutex
	var prompt string
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/internal/model/info":
			_, _ = w.Write([]byte(`{"model_name":"Mistral-Small-3.2-24B-Q6_K"}`))
		case "/v1/internal/model/list":
			_, _ = w.Write([]byte(`{"model_names":["Mistral-Small-3.2-24B-Q6_K","Qwen3-32B-Q4_K_M"]}`))
		case "/v1/chat/completions":
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			mu.Lock()
			prompt = mustJSON(body)
			mu.Unlock()
			out, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"message": say("all good babe. want me on the qwen for a bit?",
				callTool("o", toolOffer, map[string]any{"kind": "load", "value": "Qwen3-32B-Q4_K_M"}))}}})
			_, _ = w.Write(out)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer llm.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)
	runTurn(t, s, token, turnFor("how's the server doing? could you run a different model?", ""))
	if !strings.Contains(prompt, "How the server you live on is doing") || !strings.Contains(prompt, "Qwen3-32B-Q4_K_M") {
		t.Fatal("she was not told the state of the server and its models")
	}
	c := storedConversation(t, s)
	last := c.Messages[len(c.Messages)-1]
	if len(last.Actions) != 1 || last.Actions[0].Kind != "load" || last.Actions[0].Detail != "Qwen3-32B-Q4_K_M" {
		t.Fatalf("actions = %+v", last.Actions)
	}
}

func TestNoTurnRunsWithoutALoadedModel(t *testing.T) {
	calls := 0
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/internal/model/info":
			_, _ = w.Write([]byte(`{"model_name":"None","lora_names":[],"loader":null}`))
		case "/v1/models":
			_, _ = w.Write([]byte(`{"object":"list","data":[]}`))
		case "/v1/chat/completions":
			calls++
			http.Error(w, "no model", http.StatusInternalServerError)
		}
	}))
	defer llm.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL + "/v1"
	s.settings.Set(cur)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/turn", turnFor("hello", ""))
	if rec.Code != http.StatusServiceUnavailable || calls != 0 {
		t.Fatalf("turn without a model: %d %s calls=%d", rec.Code, rec.Body, calls)
	}
	// Their message is kept even though she could not answer it.
	if c := storedConversation(t, s); len(c.Messages) != 1 || c.Messages[0].Content != "hello" {
		t.Fatalf("their message was lost: %+v", c.Messages)
	}
}

func TestOnACallHerCallToolHangsUpAndOffOneItRings(t *testing.T) {
	for _, onCall := range []bool{false, true} {
		for _, tool := range libbyToolset(toolsetOptions{libby: true, onCall: onCall, emotions: libbyEmotions}) {
			if tool.Function.Name != toolCall {
				continue
			}
			action := tool.Function.Parameters["properties"].(map[string]any)["action"].(map[string]any)["enum"].([]string)
			want := "ring"
			if onCall {
				want = "hang_up"
			}
			if len(action) != 1 || action[0] != want {
				t.Fatalf("onCall=%v: call offers %v", onCall, action)
			}
		}
	}
}

func TestAConversationsOwnMaxTokensCannotExceedWhatWasFitted(t *testing.T) {
	payload, overridden := samplingPayload(samplingPreset{MaxTokens: 300}, "m", 8192, 300, map[string]any{"max_tokens": 4000, "temperature": 1.4}, nil)
	if payload["max_tokens"] != 300 || payload["temperature"] != 1.4 {
		t.Fatalf("payload = %v", payload)
	}
	if strings.Join(overridden, ",") != "temperature" {
		t.Fatalf("overridden = %v", overridden)
	}
	for _, reserved := range []string{"tools", "messages", "stream"} {
		p, _ := samplingPayload(samplingPreset{}, "m", 8192, 300, map[string]any{reserved: "x"}, nil)
		if p[reserved] == "x" {
			t.Fatalf("%s was overridable", reserved)
		}
	}
}

func TestTheTurnAfterTheyAnsweredAnOfferIsToldToMakeIt(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		if n == 0 {
			return http.StatusOK, say("how about tangle toes? or solo grindset. what do you think?")
		}
		return http.StatusOK, say("solo grindset it is")
	})
	runTurn(t, s, token, turnFor("Can you rename that video to something more fitting?", ""))
	runTurn(t, s, token, turnFor("solo grindset", ""))
	if !strings.Contains(systemPrompt(lastChat(f)), "This is the reply that makes the offer") {
		t.Fatal("the follow-through was not asked for")
	}
}
