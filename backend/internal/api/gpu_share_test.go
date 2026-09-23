package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeTextgen is text-generation-webui's model slot: one model, loaded or not, and a log
// of what was asked of it.
type fakeTextgen struct {
	mu     sync.Mutex
	loaded string
	calls  []string
	args   map[string]any
}

func (f *fakeTextgen) server() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		defer f.mu.Unlock()
		switch r.URL.Path {
		case "/v1/internal/model/info":
			name := f.loaded
			if name == "" {
				name = "None"
			}
			_ = json.NewEncoder(w).Encode(map[string]string{"model_name": name})
		case "/v1/internal/model/list":
			_, _ = w.Write([]byte(`{"model_names":["Mistral-Small-3.2-24B-Q6_K"]}`))
		case "/v1/internal/model/unload":
			f.calls = append(f.calls, "unload")
			f.loaded = ""
		case "/v1/internal/model/load":
			var body struct {
				Model string         `json:"model_name"`
				Args  map[string]any `json:"args"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			f.calls = append(f.calls, "load "+body.Model)
			f.args = body.Args
			f.loaded = body.Model
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
}

func (f *fakeTextgen) snapshot() (string, []string, map[string]any) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.loaded, append([]string(nil), f.calls...), f.args
}

func TestSwapParksHerForAPictureAndLoadsHerBackAsSheWasLoaded(t *testing.T) {
	backend := &fakeTextgen{loaded: "Mistral-Small-3.2-24B-Q6_K"}
	srv := backend.server()
	defer srv.Close()
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = srv.URL
	cur.GPUShare = "swap"
	s.settings.Set(cur)
	s.rememberTextgenLoad("Mistral-Small-3.2-24B-Q6_K", map[string]any{"ctx_size": float64(32768), "cache_type": "q8_0"}, nil)

	// Two generations at once unload her once.
	releaseA := s.lendCardToImages(t.Context())
	releaseB := s.lendCardToImages(t.Context())
	if loaded, calls, _ := backend.snapshot(); loaded != "" || len(calls) != 1 || calls[0] != "unload" {
		t.Fatalf("after two lends: loaded=%q calls=%v", loaded, calls)
	}
	if s.card.parkedModel() != "Mistral-Small-3.2-24B-Q6_K" {
		t.Fatalf("parked = %q", s.card.parkedModel())
	}

	// While she is parked, the chat screen says so rather than calling her broken.
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chat/status", "")
	if !strings.Contains(rec.Body.String(), "lent the graphics card") {
		t.Fatalf("status while parked: %s", rec.Body.String())
	}

	releaseA()
	releaseA() // a second call is harmless
	if s.handBackCardNow() {
		t.Fatal("handed back while a generation was still running")
	}
	releaseB()
	if !s.handBackCardNow() {
		t.Fatal("no hand-back once the generator was idle")
	}
	deadline := time.Now().Add(5 * time.Second)
	for s.card.parkedModel() != "" && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	loaded, calls, args := backend.snapshot()
	if loaded != "Mistral-Small-3.2-24B-Q6_K" || calls[len(calls)-1] != "load Mistral-Small-3.2-24B-Q6_K" {
		t.Fatalf("after hand-back: loaded=%q calls=%v", loaded, calls)
	}
	if args["cache_type"] != "q8_0" || args["ctx_size"] != float64(32768) {
		t.Fatalf("she came back without her loader arguments: %v", args)
	}
}

func TestWithoutSwapTheCardIsNeverTouched(t *testing.T) {
	backend := &fakeTextgen{loaded: "m-24B"}
	srv := backend.server()
	defer srv.Close()
	s, _ := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = srv.URL
	s.settings.Set(cur)
	s.lendCardToImages(t.Context())()
	if _, calls, _ := backend.snapshot(); len(calls) != 0 {
		t.Fatalf("calls without swap: %v", calls)
	}
}

func TestAHandLoadInProgressIsNeverEvicted(t *testing.T) {
	backend := &fakeTextgen{loaded: "m-24B"}
	srv := backend.server()
	defer srv.Close()
	s, _ := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = srv.URL
	cur.GPUShare = "swap"
	s.settings.Set(cur)
	s.modelMu.Lock()
	release := s.lendCardToImages(t.Context())
	s.modelMu.Unlock()
	release()
	if _, calls, _ := backend.snapshot(); len(calls) != 0 || s.card.parkedModel() != "" {
		t.Fatalf("a load in progress was interrupted: %v", calls)
	}
}

func TestACardLentWhenTheServerStoppedIsHandedBack(t *testing.T) {
	backend := &fakeTextgen{}
	srv := backend.server()
	defer srv.Close()
	s, _ := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatURL = srv.URL
	s.settings.Set(cur)
	s.writeParkedModel("m-24B")
	s.resumeParkedCard()
	if loaded, _, _ := backend.snapshot(); loaded != "m-24B" {
		t.Fatalf("after resume, loaded = %q", loaded)
	}
	if s.card.parkedModel() != "" {
		t.Fatal("still reported parked after the hand-back")
	}
}
