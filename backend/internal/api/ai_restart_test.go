package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/youruser/oppailib/internal/docker"
)

func TestEachAIToolSaysHowItWouldBeRestartedAndTheTrainerRestartsItself(t *testing.T) {
	s, token := newTestServer(t)
	// No socket at this path, whatever the machine running the test has.
	s.docker = docker.New(t.TempDir() + "/docker.sock")
	var restarts atomic.Int32
	trainer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/health":
			_, _ = w.Write([]byte(`{"ok":true,"features":["restart"]}`))
		case "/restart":
			restarts.Add(1)
			w.WriteHeader(http.StatusAccepted)
			_, _ = w.Write([]byte(`{"status":"restarting"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer trainer.Close()
	cur := s.settings.Get()
	cur.TrainerURL, cur.TTSURL = trainer.URL, "http://127.0.0.1:1"
	s.settings.Set(cur)
	h := s.Handler()

	rec := do(t, h, token, http.MethodGet, "/api/ai/restart", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("state: %d %s", rec.Code, rec.Body.String())
	}
	var state aiRestartState
	_ = json.Unmarshal(rec.Body.Bytes(), &state)
	how := map[string]aiTool{}
	for _, tool := range state.Tools {
		how[tool.ID] = tool
	}
	if state.Docker || how["trainer"].How != "self" || how["voice"].How != "" || !how["voice"].Set || how["chat"].Set {
		t.Fatalf("state = %+v", state)
	}

	if rec := do(t, h, token, http.MethodPost, "/api/ai/restart/trainer", ""); rec.Code != http.StatusAccepted || restarts.Load() != 1 {
		t.Fatalf("trainer restart: %d %s (asked %d times)", rec.Code, rec.Body.String(), restarts.Load())
	}
	// A speech server has no restart of its own; without Docker the answer says what would give it one.
	rec = do(t, h, token, http.MethodPost, "/api/ai/restart/voice", "")
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "docker.sock") {
		t.Fatalf("voice restart: %d %s", rec.Code, rec.Body.String())
	}
	if rec := do(t, h, token, http.MethodPost, "/api/ai/restart/chat", ""); rec.Code != http.StatusConflict {
		t.Fatalf("restarting a tool with no address: %d", rec.Code)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/ai/restart/router", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("restarting something that is not a tool: %d", rec.Code)
	}
}
