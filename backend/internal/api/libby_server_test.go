package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

func TestAFullDriveIsMentionedUnaskedAndNothingElseIs(t *testing.T) {
	st := serverState{
		Version: "0.45.0", Uptime: 3 * time.Hour, Tagger: "joytag",
		Drives: []driveState{{Label: "Media", Free: 40 << 30, Total: 1000 << 30}},
	}
	quiet := st.render(false)
	if !strings.Contains(quiet, "media drive is 96% full") || !strings.Contains(quiet, "Mention it once") {
		t.Fatalf("alarm render = %q", quiet)
	}
	if strings.Contains(quiet, "joytag") || strings.Contains(quiet, "0.45.0") {
		t.Fatalf("a turn not about the server was told everything: %q", quiet)
	}
	st.Drives[0].Free = 600 << 30
	if len(st.alarms()) != 0 {
		t.Fatalf("a drive at 40%% raised %v", st.alarms())
	}
}

func TestAServerTurnIsToldWhatSheRunsOnAndWhatElseCouldRun(t *testing.T) {
	st := serverState{
		Version: "0.45.0", Uptime: 50 * time.Hour, Tagger: "joytag", AutoTag: true,
		ChatModel: "Mistral-Small-3.2-24B", Window: 32768, Tier: tierLarge, Eyes: true,
		Models:   []string{"Qwen3-32B-Q4_K_M"},
		ImageGen: "invokeai", CardShare: "swap", CardLent: true,
		Describe: describeState{Enabled: true, Pending: 412},
	}
	full := st.render(true)
	for _, want := range []string{
		"Mistral-Small-3.2-24B", "large-model settings", "32768-token window", "can see pictures directly",
		"Qwen3-32B-Q4_K_M", "412 items still have no description", "takes turns with you", "has it right now", "2 days",
	} {
		if !strings.Contains(full, want) {
			t.Errorf("full render is missing %q:\n%s", want, full)
		}
	}
}

func TestAModelSheNamesMustBeOneTheBackendListed(t *testing.T) {
	names := []string{"Mistral-Small-3.2-24B-Q6_K", "Qwen3-32B-Q4_K_M", "Qwen3-32B-Q5_K_M"}
	for asked, want := range map[string]string{
		"mistral-small-3.2-24b-q6_k": "Mistral-Small-3.2-24B-Q6_K", // case
		"Mistral-Small":              "Mistral-Small-3.2-24B-Q6_K", // the one that contains it
		"\"Qwen3-32B-Q5_K_M\"":       "Qwen3-32B-Q5_K_M",           // quoted
		"Qwen3-32B":                  "",                           // two fit: a question, not a guess
		"Llama-3.3-70B":              "",                           // invented
	} {
		got, ok := matchModelName(asked, names)
		if got != want || ok != (want != "") {
			t.Errorf("matchModelName(%q) = %q, %v; want %q", asked, got, ok, want)
		}
	}
}

func TestServerActionsAreOnlyOfferedToAnAdminOnAServerTurn(t *testing.T) {
	s, _ := newTestServer(t)
	reply := "want me to swap? [do: load Qwen3-32B-Q4_K_M] or tidy up [do: cleanup]"
	models := []string{"Qwen3-32B-Q4_K_M"}

	_, none := s.parseLibbyActions(t.Context(), reply, actionCapabilities{Library: true, Models: models})
	if len(none) != 0 {
		t.Fatalf("offered without the server capability: %+v", none)
	}
	text, offered := s.parseLibbyActions(t.Context(), reply, actionCapabilities{Library: true, Server: true, Models: models})
	if len(offered) != 2 || offered[0].Kind != "load" || offered[0].Prompt != "Qwen3-32B-Q4_K_M" || offered[1].Kind != "cleanup" {
		t.Fatalf("offered = %+v", offered)
	}
	if strings.Contains(text, "[do:") {
		t.Fatalf("tags left in the prose: %q", text)
	}
	_, invented := s.parseLibbyActions(t.Context(), "[do: load Llama-3.3-70B]", actionCapabilities{Server: true, Models: models})
	if len(invented) != 0 {
		t.Fatalf("an invented model became a card: %+v", invented)
	}
}

func TestAnAllowedServerActionIsRefusedToANonAdmin(t *testing.T) {
	s, _ := newTestServer(t)
	uid, err := s.db.CreateUser(t.Context(), "housemate", "x", false)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.db.CreateSession(t.Context(), "housemate-token", uid, time.Hour, db.ClientWeb); err != nil {
		t.Fatal(err)
	}
	for _, kind := range []string{"load", "cleanup", "describe", "free"} {
		rec := do(t, s.Handler(), "housemate-token", http.MethodPost, "/api/libby/act", `{"kind":"`+kind+`","prompt":"x"}`)
		if rec.Code != http.StatusForbidden {
			t.Errorf("%s as a non-admin: %d, want 403", kind, rec.Code)
		}
	}
}

// The whole path: asked how the server is doing, an admin's Libby is told what she runs
// on and what else is on disk, and a load she offers comes back as a card.
func TestAskedAboutTheServerSheCanOfferToLoadAnotherModel(t *testing.T) {
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
			_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"all good babe. want me on the qwen for a bit? [do: load Qwen3-32B-Q4_K_M]"}}]}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer llm.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = llm.URL
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","messages":[{"role":"user","content":"how's the server doing? could you run a different model?"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body.String())
	}
	for _, want := range []string{"How the server you live on is doing", "Qwen3-32B-Q4_K_M", "[do: load"} {
		if !strings.Contains(prompt, want) {
			t.Errorf("prompt is missing %q", want)
		}
	}
	var out struct {
		Message string        `json:"message"`
		Actions []libbyAction `json:"actions"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out.Actions) != 1 || out.Actions[0].Kind != "load" || out.Actions[0].Detail != "Qwen3-32B-Q4_K_M" {
		t.Fatalf("actions = %+v (message %q)", out.Actions, out.Message)
	}
}
