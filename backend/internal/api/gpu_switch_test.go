package api

import (
	"encoding/json"
	"net/http"
	"slices"
	"testing"
)

type gpuSwitchOut struct {
	State struct {
		Holder string   `json:"holder"`
		Apps   []gpuApp `json:"apps"`
	} `json:"state"`
	Problems []string `json:"problems"`
}

func switchCard(t *testing.T, s *Server, token, to string) gpuSwitchOut {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/gpu", `{"to":"`+to+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("switch to %s: %d %s", to, rec.Code, rec.Body)
	}
	var out gpuSwitchOut
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return out
}

func TestTheSwitchHandsTheCardRoundAllThreePrograms(t *testing.T) {
	s, token, comfy, a1111 := clipStudio(t)
	backend := &fakeTextgen{loaded: "Mistral-Small-3.2-24B-Q6_K"}
	srv := backend.server()
	defer srv.Close()
	cur := s.settings.Get()
	cur.ChatURL = srv.URL
	s.settings.Set(cur)
	s.rememberTextgenLoad("Mistral-Small-3.2-24B-Q6_K", map[string]any{"ctx_size": float64(32768)}, nil)

	// Video: her model is parked and the generator lets go of its checkpoint.
	out := switchCard(t, s, token, "video")
	if loaded, calls, _ := backend.snapshot(); loaded != "" || !slices.Equal(calls, []string{"unload"}) {
		t.Fatalf("after video: loaded=%q calls=%v", loaded, calls)
	}
	if s.card.parkedModel() != "Mistral-Small-3.2-24B-Q6_K" {
		t.Fatalf("parked = %q, want her model kept to come back", s.card.parkedModel())
	}
	a1111.mu.Lock()
	gen := append([]string(nil), a1111.calls...)
	a1111.mu.Unlock()
	if !slices.Equal(gen, []string{"unload"}) {
		t.Fatalf("generator calls after video: %v", gen)
	}
	if out.State.Holder != "video" {
		t.Fatalf("holder = %q", out.State.Holder)
	}

	// Pictures: ComfyUI lets go and the checkpoint comes back; she stays parked.
	switchCard(t, s, token, "images")
	if comfy.freeCount() != 1 {
		t.Fatalf("ComfyUI asked to free %d times, want once", comfy.freeCount())
	}
	a1111.mu.Lock()
	gen = append([]string(nil), a1111.calls...)
	a1111.mu.Unlock()
	if !slices.Equal(gen, []string{"unload", "reload"}) {
		t.Fatalf("generator calls after images: %v", gen)
	}

	// Chat: both let go and her model loads back as it was loaded.
	out = switchCard(t, s, token, "chat")
	if loaded, calls, args := backend.snapshot(); loaded != "Mistral-Small-3.2-24B-Q6_K" || calls[len(calls)-1] != "load Mistral-Small-3.2-24B-Q6_K" || args["ctx_size"] != float64(32768) {
		t.Fatalf("after chat: loaded=%q calls=%v args=%v", loaded, calls, args)
	}
	if s.card.parkedModel() != "" || comfy.freeCount() != 2 {
		t.Fatalf("parked=%q frees=%d", s.card.parkedModel(), comfy.freeCount())
	}
	if len(out.Problems) != 0 {
		t.Fatalf("problems: %v", out.Problems)
	}
	var chat gpuApp
	for _, a := range out.State.Apps {
		if a.ID == "chat" {
			chat = a
		}
	}
	if !chat.Holding || chat.Detail != "Mistral-Small-3.2-24B-Q6_K" {
		t.Fatalf("chat as shown: %+v", chat)
	}
}

func TestTheSwitchWaitsForAPictureBeingDrawn(t *testing.T) {
	s, token := newTestServer(t)
	release := s.lendCardToImages(t.Context())
	defer release()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/gpu", `{"to":"video"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("switch mid-picture: %d %s", rec.Code, rec.Body)
	}
}

func TestTheLastModelLoadedFromHereIsTheOneThatComesBack(t *testing.T) {
	loads := textgenLoads{Models: map[string]textgenLoad{"old": {At: 1}, "new": {At: 5}, "mid": {At: 3}}}
	if got := lastLoadedModel(loads, "configured"); got != "new" {
		t.Fatalf("got %q", got)
	}
	if got := lastLoadedModel(textgenLoads{}, " configured "); got != "configured" {
		t.Fatalf("with nothing loaded yet: %q", got)
	}
}
