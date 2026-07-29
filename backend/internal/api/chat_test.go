package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestChatProxiesLocalOpenAIEndpoint(t *testing.T) {
	var gotAuth string
	var got struct {
		Model            string        `json:"model"`
		Messages         []chatMessage `json:"messages"`
		TopK             int           `json:"top_k"`
		Preset           string        `json:"preset"`
		TruncationLength int           `json:"truncation_length"`
	}
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && r.URL.Path == "/v1/internal/model/info" {
			_, _ = w.Write([]byte(`{"model_name":"test-local"}`))
			return
		}
		gotAuth = r.Header.Get("Authorization")
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("path = %q", r.URL.Path)
		}
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"Hi from Libby"}}]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	cur.ChatModel = "stale-configured-name"
	cur.ChatAPIKey = "local-secret"
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"playful","messages":[{"role":"user","content":"hello"}],"options":{"top_k":37,"preset":"Libby","truncation_length":2048}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body.String())
	}
	if got.Model != "test-local" || len(got.Messages) != 2 || got.Messages[0].Role != "system" {
		t.Fatalf("forwarded request = %+v", got)
	}
	if got.TopK != 37 || got.Preset != "Libby" {
		t.Fatalf("advanced options not forwarded: %+v", got)
	}
	if got.TruncationLength != targetContextLimit {
		t.Fatalf("truncation_length = %d, want OppaiLib's fitted %d", got.TruncationLength, targetContextLimit)
	}
	if gotAuth != "Bearer local-secret" {
		t.Fatalf("Authorization = %q", gotAuth)
	}
	var out map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out["message"] != "Hi from Libby" {
		t.Fatalf("response = %q", out["message"])
	}
}

func TestChatRejectsUnknownMode(t *testing.T) {
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = "http://127.0.0.1:1"
	cur.ChatModel = "local"
	s.settings.Set(cur)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"anything","messages":[{"role":"user","content":"hello"}]}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestChatModelLifecycle(t *testing.T) {
	loaded := "old.gguf"
	mutations := 0
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method + " " + r.URL.Path {
		case "GET /v1/internal/model/list":
			_, _ = w.Write([]byte(`{"model_names":["old.gguf","new.gguf"]}`))
		case "GET /v1/internal/model/info":
			_, _ = w.Write([]byte(`{"model_name":"` + loaded + `"}`))
		case "POST /v1/internal/model/load":
			mutations++
			var body struct {
				ModelName string `json:"model_name"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			loaded = body.ModelName
			_, _ = w.Write([]byte(`{}`))
		case "POST /v1/internal/model/unload":
			mutations++
			loaded = ""
			_, _ = w.Write([]byte(`{}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL + "/v1"
	cur.ChatModel = loaded
	s.settings.Set(cur)
	h := s.Handler()
	if rec := do(t, h, token, http.MethodGet, "/api/chat/models", ""); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"supported":true`) {
		t.Fatalf("list models: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/chat/models/load", `{"modelName":"new.gguf"}`); rec.Code != http.StatusOK {
		t.Fatalf("load model: %d %s", rec.Code, rec.Body)
	}
	if loaded != "new.gguf" {
		t.Fatalf("loaded model = %q, want new.gguf", loaded)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/chat/models/unload", `{}`); rec.Code != http.StatusOK {
		t.Fatalf("unload model: %d %s", rec.Code, rec.Body)
	}
	if loaded != "" {
		t.Fatalf("model still resident after unload = %q", loaded)
	}
	if mutations != 2 {
		t.Fatalf("lifecycle requests = %d, want 2 (one load, one unload)", mutations)
	}
}

// An empty model name would otherwise reach text-generation-webui and unload
// whatever is resident, which is not what "load" should ever do.
func TestChatModelLoadRejectsEmptyName(t *testing.T) {
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			t.Errorf("backend must not be called for an empty model name: %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"model_names":["a.gguf"]}`))
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL + "/v1"
	s.settings.Set(cur)
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat/models/load", `{"modelName":"  "}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("load with blank name: %d %s, want 400", rec.Code, rec.Body)
	}
}

// A backend with no internal endpoints (llama.cpp, vLLM) must be reported as
// uncontrollable rather than being offered controls that can only fail.
func TestChatModelControlUnsupportedBackend(t *testing.T) {
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/models" {
			_, _ = w.Write([]byte(`{"object":"list","data":[{"id":"local"}]}`))
			return
		}
		http.NotFound(w, r)
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL + "/v1"
	s.settings.Set(cur)
	h := s.Handler()
	if rec := do(t, h, token, http.MethodGet, "/api/chat/models", ""); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"supported":false`) {
		t.Fatalf("list models: %d %s, want supported:false", rec.Code, rec.Body)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/chat/models/load", `{"modelName":"local"}`); rec.Code != http.StatusConflict {
		t.Fatalf("load against uncontrollable backend: %d %s, want 409", rec.Code, rec.Body)
	}
}

func TestChatStatusReportsReachableBackendWithNoLoadedModel(t *testing.T) {
	generationCalls := 0
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/internal/model/info":
			_, _ = w.Write([]byte(`{"model_name":"None","lora_names":[],"loader":null}`))
		case "/v1/models":
			_, _ = w.Write([]byte(`{"object":"list","data":[]}`))
		case "/v1/chat/completions":
			generationCalls++
			http.Error(w, "must not generate without a model", http.StatusInternalServerError)
		default:
			http.NotFound(w, r)
		}
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL + "/v1"
	cur.ChatModel = "stale-configured-name"
	s.settings.Set(cur)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chat/status", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"configured":true`) || !strings.Contains(rec.Body.String(), `"enabled":false`) {
		t.Fatalf("status: %d %s", rec.Code, rec.Body)
	}
	if !strings.Contains(rec.Body.String(), "No model is loaded") {
		t.Fatalf("status is not actionable: %s", rec.Body)
	}
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/chat", `{"mode":"sweet","messages":[{"role":"user","content":"hello"}]}`)
	if rec.Code != http.StatusServiceUnavailable || generationCalls != 0 {
		t.Fatalf("generation without a model: %d %s calls=%d", rec.Code, rec.Body, generationCalls)
	}
}

// Models drift from the mood-tag spelling they are given: the directive asks for
// "[mood: happy 3]" and a capable model answers "[Mood: Happy & Excited 9]". The
// original pattern accepted only a single lowercase word and a literal 1-5, so those
// replies kept their tag as visible prose and never moved the face — which is exactly
// how the feature was reported broken. Each case here is a real observed shape.
func TestSplitMoodAcceptsModelDrift(t *testing.T) {
	cases := []struct {
		name      string
		reply     string
		emotion   string
		intensity int
	}{
		{"as specified", "Hey you.\n[mood: happy 3]", "happy", 3},
		{"reported shape", "Hey you.\n[ Mood : Happy & Excited 9 ]", "happy", 5},
		{"title case", "Hey you.\n[Mood: Mischievous 4]", "mischievous", 4},
		{"synonym", "Hey you.\n[mood: flirty 5]", "mischievous", 5},
		{"first word wins", "Hey you.\n[mood: happy and teasing 2]", "happy", 2},
		{"markdown wrapped", "Hey you.\n**[mood: surprised 4]**", "surprised", 4},
		{"no intensity", "Hey you.\n[mood: thinking]", "thinking", 0},
		{"legacy alias", "Hey you.\n[mood: worried 2]", "thinking", 2},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			text, emotion, intensity, ok := splitMood(tc.reply)
			if !ok || emotion != tc.emotion || intensity != tc.intensity {
				t.Fatalf("got (%q,%d,%v), want (%q,%d,true)", emotion, intensity, ok, tc.emotion, tc.intensity)
			}
			if text != "Hey you." {
				t.Fatalf("tag left in prose: %q", text)
			}
		})
	}
}

// A tag whose label means nothing to us still must not reach the user, and a tag the
// character wrote mid-scene as dialogue still must not move the face.
func TestSplitMoodStripsUnreadableTagAndIgnoresMidScene(t *testing.T) {
	text, emotion, _, ok := splitMood("Hey you.\n[mood: peckish 2]")
	if ok || emotion != "" {
		t.Fatalf("unknown label was accepted as %q", emotion)
	}
	if text != "Hey you." {
		t.Fatalf("unreadable tag left in prose: %q", text)
	}

	midScene := "She read the sign: [mood: happy 3], it said, and laughed."
	if got, _, _, ok := splitMood(midScene); ok || got != midScene {
		t.Fatalf("mid-scene tag was consumed: %q ok=%v", got, ok)
	}
}

// The character picks a picture by naming tags, which is the only handle a text-only
// model can use sensibly. As with the mood tag, the directive must never survive into
// the prose the user reads — and it arrives on either side of the mood tag, because
// models order trailing directives however they like.
func TestSplitPhotoRequestAndResolution(t *testing.T) {
	ws := chatWorkspace{Images: []chatImage{
		{ID: "a", CharacterID: "libby", Tags: []string{"beach", "bikini", "smiling"}},
		{ID: "b", CharacterID: "libby", Tags: []string{"bedroom", "lingerie", "lying down"}},
		{ID: "c", CharacterID: "other", Tags: []string{"bedroom", "lingerie"}},
	}}

	for _, order := range []string{
		"Here, look.\n[send: bedroom lingerie]\n[mood: mischievous 4]",
		"Here, look.\n[mood: mischievous 4]\n[send: bedroom lingerie]",
	} {
		text, request, asked := splitPhotoRequest(order)
		if !asked {
			text, _, _, _ = splitMood(text)
			text, request, asked = splitPhotoRequest(text)
		} else {
			text, _, _, _ = splitMood(text)
		}
		if !asked {
			t.Fatalf("no photo request found in %q", order)
		}
		if text != "Here, look." {
			t.Fatalf("directive left in prose: %q", text)
		}
		if got := requestedChatImage(ws, "libby", request, "", nil); got != "b" {
			t.Fatalf("resolved to %q, want b", got)
		}
	}

	// Another character's gallery is not hers to send from.
	if got := requestedChatImage(ws, "libby", "nothing like this at all", "", nil); got != "" {
		t.Fatalf("unmatched request resolved to %q", got)
	}
	if got := requestedChatImage(ws, "libby", "beach bikini", "a", nil); got != "" {
		t.Fatalf("excluded image was returned: %q", got)
	}
}

// The catalogue is what makes the pictures callable: without tags in the prompt the
// model has nothing to name. Untagged pictures are omitted precisely because a
// request naming them could never resolve.
func TestPhotoCatalogueListsOnlyCallablePictures(t *testing.T) {
	ws := chatWorkspace{Images: []chatImage{
		{ID: "a", CharacterID: "libby", Tags: []string{"beach", "bikini"}},
		{ID: "b", CharacterID: "libby", Tags: nil},
		{ID: "c", CharacterID: "other", Tags: []string{"kitchen"}},
	}}
	catalogue := photoCatalogue(ws, "libby", nil)
	if !strings.Contains(catalogue, "beach, bikini") {
		t.Fatalf("tagged picture missing from catalogue: %q", catalogue)
	}
	if strings.Contains(catalogue, "kitchen") {
		t.Fatalf("another character's picture leaked into the catalogue: %q", catalogue)
	}
	if !strings.Contains(catalogue, "[send:") {
		t.Fatalf("catalogue never says how to send: %q", catalogue)
	}
	if photoCatalogue(chatWorkspace{}, "libby", nil) != "" {
		t.Fatal("a character with no pictures should contribute no catalogue")
	}
}

// horny is a mode, not a pose: it must be selectable everywhere a mode is validated,
// and must not have quietly become an emotion.
func TestHornyModeIsAModeNotAnEmotion(t *testing.T) {
	if _, ok := libbyModes["horny"]; !ok {
		t.Fatal("horny is not a selectable mode")
	}
	if modeStyles["horny"] == "" {
		t.Fatal("horny has no character-neutral style for imported cards")
	}
	if supportedLibbyEmotions["horny"] {
		t.Fatal("horny leaked into the emotion vocabulary, which has no artwork for it")
	}
	for mode := range libbyModes {
		if modeStyles[mode] == "" {
			t.Fatalf("mode %q has no style text, so cards played in it get no direction", mode)
		}
	}
}
