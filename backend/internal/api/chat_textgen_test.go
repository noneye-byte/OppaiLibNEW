package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The loader arguments reach the backend untouched, and are remembered per model once
// the load has worked — the next panel draw starts from them.
func TestTextgenLoadRemembersArgs(t *testing.T) {
	var gotArgs map[string]any
	var gotSettings map[string]any
	loras := []string{}
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method + " " + r.URL.Path {
		case "GET /v1/internal/model/list":
			_, _ = w.Write([]byte(`{"model_names":["big.gguf"]}`))
		case "GET /v1/internal/model/info":
			raw, _ := json.Marshal(map[string]any{"model_name": "big.gguf", "lora_names": loras})
			_, _ = w.Write(raw)
		case "POST /v1/internal/model/load":
			var body struct {
				Args     map[string]any `json:"args"`
				Settings map[string]any `json:"settings"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			gotArgs, gotSettings = body.Args, body.Settings
			_, _ = w.Write([]byte(`{}`))
		case "GET /v1/internal/lora/list":
			_, _ = w.Write([]byte(`{"lora_names":["style-b","style-a"]}`))
		case "POST /v1/internal/lora/load":
			var body struct {
				LoraNames []string `json:"lora_names"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			loras = body.LoraNames
			_, _ = w.Write([]byte(`{}`))
		case "POST /v1/internal/lora/unload":
			loras = []string{}
			_, _ = w.Write([]byte(`{}`))
		case "POST /v1/internal/stop-generation":
			_, _ = w.Write([]byte(`"OK"`))
		case "POST /v1/internal/token-count":
			_, _ = w.Write([]byte(`{"length":7}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer llm.Close()

	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL + "/v1"
	s.settings.Set(cur)
	h := s.Handler()

	body := `{"modelName":"big.gguf","args":{"loader":"llama.cpp","ctx_size":8192,"n_ctx":8192,"gpu_layers":35},"settings":{"truncation_length":8192},"remember":true}`
	if rec := do(t, h, token, http.MethodPost, "/api/chat/models/load", body); rec.Code != http.StatusOK {
		t.Fatalf("load: %d %s", rec.Code, rec.Body)
	}
	if gotArgs["loader"] != "llama.cpp" || gotArgs["gpu_layers"] != float64(35) || gotArgs["n_ctx"] != float64(8192) {
		t.Fatalf("args did not reach the backend untouched: %v", gotArgs)
	}
	if gotSettings["truncation_length"] != float64(8192) {
		t.Fatalf("settings did not reach the backend: %v", gotSettings)
	}

	rec := do(t, h, token, http.MethodGet, "/api/chat/backend", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("backend info: %d %s", rec.Code, rec.Body)
	}
	var info struct {
		Supported bool                   `json:"supported"`
		Loaders   []string               `json:"loaders"`
		Loads     map[string]textgenLoad `json:"loads"`
		Loras     textgenLorasResponse   `json:"loras"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &info); err != nil {
		t.Fatal(err)
	}
	if !info.Supported || len(info.Loaders) == 0 {
		t.Fatalf("a text-generation-webui backend should be reported as controllable: %s", rec.Body)
	}
	if info.Loads["big.gguf"].Args["gpu_layers"] != float64(35) {
		t.Fatalf("the load was not remembered: %v", info.Loads)
	}
	if strings.Join(info.Loras.Available, ",") != "style-a,style-b" || len(info.Loras.Loaded) != 0 {
		t.Fatalf("loras = %+v", info.Loras)
	}

	// LoRAs: apply a set, read it back, clear it.
	rec = do(t, h, token, http.MethodPost, "/api/chat/loras", `{"names":["style-a"]}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"loaded":["style-a"]`) {
		t.Fatalf("apply lora: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPost, "/api/chat/loras", `{"names":[]}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"loaded":[]`) {
		t.Fatalf("clear loras: %d %s", rec.Code, rec.Body)
	}

	if rec := do(t, h, token, http.MethodPost, "/api/chat/stop", ""); rec.Code != http.StatusOK {
		t.Fatalf("stop: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPost, "/api/chat/tokens", `{"text":"seven tokens worth of text here"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"tokens":7`) || !strings.Contains(rec.Body.String(), `"exact":true`) {
		t.Fatalf("token count: %d %s", rec.Code, rec.Body)
	}
}

// A generic OpenAI-compatible server has none of the internal API: the panel is told
// so rather than shown controls that can only fail, and a token count still answers
// with the estimate.
func TestTextgenControlsAbsentOnGenericBackend(t *testing.T) {
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/models" {
			_, _ = w.Write([]byte(`{"data":[{"id":"local"}]}`))
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
	if rec := do(t, h, token, http.MethodGet, "/api/chat/backend", ""); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"supported":false`) {
		t.Fatalf("backend info: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/chat/loras", `{"names":["x"]}`); rec.Code != http.StatusConflict {
		t.Fatalf("lora on generic backend: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/chat/tokens", `{"text":"some text"}`); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"exact":false`) {
		t.Fatalf("token estimate: %d %s", rec.Code, rec.Body)
	}
}
