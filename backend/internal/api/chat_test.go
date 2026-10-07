package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

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

// The catalogue is what makes the pictures callable: without tags in the prompt the
// model has nothing to name. Untagged pictures are omitted precisely because a
// request naming them could never resolve.
func TestPhotoCatalogueListsOnlyCallablePictures(t *testing.T) {
	ws := chatWorkspace{Images: []chatImage{
		{ID: "a", CharacterID: "libby", Tags: []string{"beach", "bikini"}},
		{ID: "b", CharacterID: "libby", Tags: nil},
		{ID: "c", CharacterID: "other", Tags: []string{"kitchen"}},
	}}
	catalogue := photoCatalogue(ws, "libby", nil, nil, nil, "", "")
	if !strings.Contains(catalogue, "beach, bikini") {
		t.Fatalf("tagged picture missing from catalogue: %q", catalogue)
	}
	if strings.Contains(catalogue, "kitchen") {
		t.Fatalf("another character's picture leaked into the catalogue: %q", catalogue)
	}
	if !strings.Contains(catalogue, "send_saved_photo") {
		t.Fatalf("catalogue never says how to send: %q", catalogue)
	}
	if photoCatalogue(chatWorkspace{}, "libby", nil, nil, nil, "", "") != "" {
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
