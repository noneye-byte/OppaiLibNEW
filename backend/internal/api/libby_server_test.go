package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
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
		"Mistral-Small-3.2-24B", "tuned for a large model", "32768-token context window", "can see pictures directly",
		"Qwen3-32B-Q4_K_M", "412 items still have no description", "takes turns with you", "has it right now", "2 days",
	} {
		if !strings.Contains(full, want) {
			t.Errorf("full render is missing %q:\n%s", want, full)
		}
	}
}

// Told "small-model settings, an 8192-token window" and nothing about the card, she
// said the box had 8 GB. The card's size is only ever what the operator said, and with
// nothing said she is told not to work one out.
func TestSheIsToldTheCardSizeOrToNotGuessIt(t *testing.T) {
	st := serverState{ChatModel: "some-finetune", Window: 8192, Tier: tierSmall}
	if full := st.render(true); !strings.Contains(full, "say you don't know") || strings.Contains(full, "GB of memory") {
		t.Fatalf("an unknown card was described:\n%s", full)
	}
	st.GPUMemoryGB = 32
	if full := st.render(true); !strings.Contains(full, "The graphics card has 32 GB of memory.") {
		t.Fatalf("the card size was not passed on:\n%s", full)
	}
}

func TestTheWindowALoadWasRememberedWithIsTheWindow(t *testing.T) {
	loads := textgenLoads{Models: map[string]textgenLoad{
		"Cydonia-Q6_K.gguf": {Args: map[string]any{"ctx_size": float64(32768), "n_ctx": float64(32768)}},
		"old-exl2":          {Args: map[string]any{"max_seq_len": float64(16384)}},
		"no-context":        {Args: map[string]any{"gpu_layers": float64(99)}},
	}}
	for model, want := range map[string]int{"Cydonia-Q6_K.gguf": 32768, "old-exl2": 16384, "no-context": 0, "never-loaded": 0, "": 0} {
		if got := rememberedContext(loads, model); got != want {
			t.Errorf("%q: %d, want %d", model, got, want)
		}
	}
	// And it counts as what the loader reported: auto follows it, a pin cannot pass it.
	if got := effectiveContextLimit(0, 0, 0, 0, rememberedContext(loads, "Cydonia-Q6_K.gguf")); got != 32768 {
		t.Fatalf("auto with a remembered 32K load = %d", got)
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

// text-generation-webui's API never says what context it loaded with, but "Save
// settings" on its Model tab writes it to config-user.yaml in the models folder, keyed
// by a pattern on the file name.
func TestTheWebUIsSavedContextIsRead(t *testing.T) {
	dir := t.TempDir()
	config := "Cydonia-24B-v4.Q6_K.gguf$:\n  loader: llama.cpp\n  ctx_size: 32768\n  gpu_layers: 99\n" +
		".*qwen:\n  ctx_size: 16384\n"
	if err := os.WriteFile(filepath.Join(dir, "config-user.yaml"), []byte(config), 0o600); err != nil {
		t.Fatal(err)
	}
	for model, want := range map[string]int{
		"Cydonia-24B-v4.Q6_K.gguf": 32768, "cydonia-24b-v4.q6_k.gguf": 32768,
		"Qwen3-32B.gguf": 16384, "Mistral-7B.gguf": 0, "": 0,
	} {
		if got := userConfigContext(dir, model); got != want {
			t.Errorf("%q: %d, want %d", model, got, want)
		}
	}
	if got := userConfigContext("", "Cydonia-24B-v4.Q6_K.gguf"); got != 0 {
		t.Errorf("no models folder read %d", got)
	}
	noteLoad("Loaded-From-Here", map[string]any{"ctx_size": float64(24576)})
	if lastLoadContext("Loaded-From-Here") != 24576 || lastLoadContext("Something-Else") != 0 {
		t.Error("the last load from here was not followed")
	}
}
