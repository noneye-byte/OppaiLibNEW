package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/docker"
	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/trainer"
)

// Restarting the AI tools, from one place.
//
//	GET  /api/ai/restart        each tool, and how it would be restarted
//	POST /api/ai/restart/{id}   restart one: chat | images | video | trainer | voice
//
// A wedged generator or a model that has started answering in nonsense is fixed by a
// restart more often than by anything else, and the restarts there were sat in three
// different screens — the studio's model menu, the Video drawer's setup card — or did
// not exist. Each tool is restarted the gentlest way it allows:
//
//   - her chat model is unloaded and loaded again, which is what "restart" means for a
//     model that has gone strange, and the only thing text-generation-webui's API can do;
//   - Automatic1111 / Forge restart themselves (--api-server-stop), ComfyUI through its
//     Manager — the existing imagegen restarts;
//   - the trainer replaces its own process (POST /restart, trainer/server.py).
//
// When a tool cannot do it itself, and Docker's socket is mapped in, its container is
// restarted instead (internal/docker): the one restart that works for any of them.
// Which container is worked out from the tool's address, never named by the request.

// aiTool is one tool as the restart list shows it.
type aiTool struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Set is whether it has an address at all.
	Set bool `json:"set"`
	// How is what a restart would do: "self" (its own restart), "docker" (its
	// container), "" (nothing can, and Detail says what would let it).
	How string `json:"how"`
	// Container is the container a docker restart would restart.
	Container string `json:"container,omitempty"`
	Detail    string `json:"detail"`
}

type aiRestartState struct {
	Tools []aiTool `json:"tools"`
	// Docker is whether the socket is mapped, so the UI can say what mapping it adds.
	Docker bool `json:"docker"`
}

// aiToolAddresses are the tools that are set up, with their addresses, in list order.
func (s *Server) aiToolAddresses() []aiTool {
	cur := s.settings.Get()
	gen := strings.TrimSpace(cur.GenURL())
	clips := strings.TrimSpace(cur.LibbyClipURL)
	tools := []aiTool{
		{ID: "chat", Name: "Libby's chat", Set: strings.TrimSpace(cur.ChatURL) != ""},
		{ID: "images", Name: "Pictures", Set: cur.ImageGenEnabled && gen != ""},
		// The clips' ComfyUI is listed only when it is not the picture generator itself:
		// one program, one row.
		{ID: "video", Name: "ComfyUI (clips)", Set: clips != "" && !sameAddress(clips, gen)},
		{ID: "trainer", Name: "LoRA trainer", Set: strings.TrimSpace(cur.TrainerURL) != ""},
		{ID: "voice", Name: "Speech server", Set: strings.TrimSpace(cur.TTSURL) != ""},
	}
	return tools
}

func sameAddress(a, b string) bool {
	norm := func(s string) string { return strings.TrimRight(strings.ToLower(strings.TrimSpace(s)), "/") }
	return norm(a) != "" && norm(a) == norm(b)
}

// aiToolURL is the address a tool is reached at.
func (s *Server) aiToolURL(id string) string {
	cur := s.settings.Get()
	switch id {
	case "chat":
		return cur.ChatURL
	case "images":
		return cur.GenURL()
	case "video":
		return cur.LibbyClipURL
	case "trainer":
		return cur.TrainerURL
	case "voice":
		return cur.TTSURL
	}
	return ""
}

// canRestartItself asks a tool whether it has a restart of its own, and names it.
func (s *Server) canRestartItself(ctx context.Context, id string) (bool, string) {
	cur := s.settings.Get()
	switch id {
	case "chat":
		if s.chatBackendControllable(ctx) {
			return true, "unloads her model and loads it again"
		}
		return false, "this chat backend can't reload its model from here"
	case "images":
		kind, err := s.imagegen.Backend(ctx, cur.GenURL())
		if err != nil {
			return false, "not answering"
		}
		name := map[imagegen.Kind]string{imagegen.KindComfy: "ComfyUI", imagegen.KindInvokeAI: "InvokeAI"}[kind]
		if name == "" {
			name = "Automatic1111"
			if s.imagegen.IsForge(ctx, cur.GenURL()) {
				name = "Forge"
			}
		}
		if s.imagegen.CanRestart(ctx, cur.GenURL()) {
			return true, name + " restarts itself"
		}
		switch kind {
		case imagegen.KindComfy:
			return false, "ComfyUI restarts itself only with ComfyUI-Manager installed"
		case imagegen.KindInvokeAI:
			return false, "InvokeAI has no restart of its own"
		}
		return false, name + " restarts itself only when started with --api-server-stop"
	case "video":
		if s.imagegen.ComfyCanRestart(ctx, cur.LibbyClipURL) {
			return true, "ComfyUI-Manager restarts it"
		}
		return false, "ComfyUI restarts itself only with ComfyUI-Manager installed"
	case "trainer":
		h, err := s.trainer.Health(ctx, cur.TrainerURL, cur.TrainerToken)
		if err != nil {
			return false, "not answering"
		}
		if h.Has(trainer.FeatureRestart) {
			return true, "the trainer restarts itself"
		}
		return false, "this trainer is too old to restart itself — update the oppailib-trainer container"
	case "voice":
		return false, "a speech server has no restart of its own"
	}
	return false, ""
}

func (s *Server) handleAIRestartState(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	out := aiRestartState{Tools: s.aiToolAddresses(), Docker: s.docker.Available()}
	var containers []docker.Container
	if out.Docker {
		containers, _ = s.docker.Containers(ctx)
	}
	// Asked side by side: one tool that is down costs its timeout once, not five times.
	var wg sync.WaitGroup
	for i := range out.Tools {
		t := &out.Tools[i]
		if !t.Set {
			t.Detail = "not set up"
			continue
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			self, why := s.canRestartItself(ctx, t.ID)
			if ct := docker.Match(containers, s.aiToolURL(t.ID), s.docker.Self()); ct != nil {
				t.Container = ct.Name()
			}
			switch {
			case self:
				t.How, t.Detail = "self", why
			case t.Container != "":
				t.How, t.Detail = "docker", "restarts the "+t.Container+" container"
			default:
				t.Detail = why
				if out.Docker {
					t.Detail += " — and no container answers at its address"
				}
			}
		}()
	}
	wg.Wait()
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleAIRestart(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var tool *aiTool
	for _, t := range s.aiToolAddresses() {
		if t.ID == id {
			tool = &t
			break
		}
	}
	if tool == nil {
		writeErr(w, http.StatusNotFound, "no such tool")
		return
	}
	if !tool.Set {
		writeErr(w, http.StatusConflict, tool.Name+" has no address set")
		return
	}
	// What would be lost with the process.
	switch id {
	case "images":
		if busy := s.cardBusy(); strings.HasPrefix(busy, "a picture") {
			writeErr(w, http.StatusConflict, busy+" — restart once it's done")
			return
		}
	case "video":
		if s.genJobs.running("clip-") > 0 {
			writeErr(w, http.StatusConflict, "a clip is being made — restart once it's done")
			return
		}
	}

	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), modelLoadTimeout)
	defer cancel()
	self, why := s.canRestartItself(ctx, id)
	var selfErr error
	if self {
		if selfErr = s.restartItself(ctx, id); selfErr == nil {
			s.log.Info("ai restart", "tool", id, "how", "self")
			writeJSON(w, http.StatusAccepted, map[string]string{"how": "self", "message": restartedMessage(tool.Name, id)})
			return
		}
		// A refusal it gave itself (a launcher that does not loop, a busy trainer) may
		// still be got round by its container — unless the refusal is about work.
		if strings.Contains(selfErr.Error(), "training") {
			writeErr(w, http.StatusConflict, selfErr.Error())
			return
		}
	}

	if !s.docker.Available() {
		msg := why
		if selfErr != nil {
			msg = selfErr.Error()
		}
		writeErr(w, http.StatusConflict, msg+". Or map Docker's socket (/var/run/docker.sock) into OppaiLib's container, and it restarts the tool's container instead.")
		return
	}
	ct, err := s.docker.Find(ctx, s.aiToolURL(id))
	if errors.Is(err, docker.ErrNoMatch) {
		writeErr(w, http.StatusConflict, "no container answers at "+tool.Name+"'s address — use the address Unraid shows for its WebUI")
		return
	} else if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	// Read before it goes down: the model is the one thing that does not come back.
	model := ""
	if id == "chat" {
		model = s.chatModelToReload(ctx)
	}
	if err := s.docker.Restart(ctx, ct.ID); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	s.log.Info("ai restart", "tool", id, "how", "docker", "container", ct.Name())
	s.afterContainerRestart(id, model)
	writeJSON(w, http.StatusAccepted, map[string]string{
		"how": "docker", "container": ct.Name(), "message": "Restarted the " + ct.Name() + " container.",
	})
}

func restartedMessage(name, id string) string {
	if id == "chat" {
		return "Her model is loaded again."
	}
	return name + " is restarting — give it a minute."
}

// restartItself is a tool's own restart.
func (s *Server) restartItself(ctx context.Context, id string) error {
	cur := s.settings.Get()
	switch id {
	case "chat":
		return s.reloadChatModel(ctx)
	case "images":
		return s.imagegen.Restart(ctx, cur.GenURL())
	case "video":
		err := s.imagegen.ComfyRestart(ctx, cur.LibbyClipURL)
		if err == nil {
			s.card.mu.Lock()
			s.card.comfyHeld = false
			s.card.mu.Unlock()
		}
		return err
	case "trainer":
		return s.trainer.Restart(ctx, cur.TrainerURL, cur.TrainerToken)
	}
	return errors.New("no restart of its own")
}

// reloadChatModel unloads her model and loads the same one again. A model lent out
// to the generator is not loaded to be reloaded; it comes back on her next turn.
func (s *Server) reloadChatModel(ctx context.Context) error {
	if parked := s.card.parkedModel(); parked != "" {
		return errors.New("her model is lent to the image generator — it loads fresh when she's next spoken to")
	}
	if !s.modelMu.TryLock() {
		return errors.New("a model is already loading — wait for it to finish")
	}
	defer s.modelMu.Unlock()
	model := s.chatModelToReload(ctx)
	if model == "" {
		return errors.New("no model is loaded, and none has been loaded from OppaiLib to load again")
	}
	if status, raw, err := s.chatBackendRequest(ctx, http.MethodPost, "/v1/internal/model/unload", nil); err != nil {
		return err
	} else if status < 200 || status >= 300 {
		return errors.New("text-generation-webui would not unload: " + truncateChatError(raw))
	}
	return s.loadRemembered(ctx, model)
}

// chatModelToReload is the model loaded now, else the one last loaded from here.
func (s *Server) chatModelToReload(ctx context.Context) string {
	if probe := s.probeChatBackend(ctx); probe.Ready {
		return probe.Loaded
	}
	return lastLoadedModel(s.readTextgenLoads(), s.settings.Get().ChatModel)
}

// afterContainerRestart puts right what OppaiLib believed about a tool whose process
// just went away. Her model is the one thing that does not come back with the
// container, so it is loaded again once text-generation-webui answers.
func (s *Server) afterContainerRestart(id, model string) {
	switch id {
	case "video":
		s.card.mu.Lock()
		s.card.comfyHeld = false
		s.card.mu.Unlock()
	case "images":
		s.card.mu.Lock()
		s.card.freed = false
		s.card.mu.Unlock()
	case "chat":
		if model == "" || s.card.parkedModel() != "" {
			return
		}
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute+modelLoadTimeout)
			defer cancel()
			for ctx.Err() == nil {
				time.Sleep(5 * time.Second)
				if !s.chatBackendControllable(ctx) {
					continue
				}
				if s.probeChatBackend(ctx).Ready {
					return // it loaded one by itself (--model)
				}
				s.modelMu.Lock()
				err := s.loadRemembered(ctx, model)
				s.modelMu.Unlock()
				if err != nil {
					s.log.Warn("ai restart: her model did not load back", "model", model, "err", err)
				}
				return
			}
		}()
	}
}
