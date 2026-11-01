package api

import (
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
)

// Handing the card to one program by hand.
//
// gpu_share.go moves the card between her model, the image generator and ComfyUI on
// its own, as each kind of work starts. That covers the work OppaiLib starts. It does
// not cover a person about to use text-generation-webui's own UI, or the A1111 tab, or
// ComfyUI's canvas — or a session of clips after an evening of pictures, where waiting
// for the first clip to evict the checkpoint is a minute spent on nothing. So the
// studio has a switch: pick the program, and the other two are asked to let go.
//
// It is the same three operations the automatic sharing uses, under the same lock,
// and it leaves the same record behind: her model unloaded for another program is
// parked, so the next chat turn brings it back exactly as it would after a picture.

// gpuApp is one program the card can be given to, as the switch shows it.
type gpuApp struct {
	ID string `json:"id"` // chat | images | video
	// Name is what it is called on screen; Set is whether its address is filled in.
	Name string `json:"name"`
	Set  bool   `json:"set"`
	// Holding is whether it has its model on the card as far as OppaiLib knows, and
	// Detail says what: the chat model's name, "checkpoint let go", and so on.
	Holding bool   `json:"holding"`
	Detail  string `json:"detail"`
	// CanTake is whether the card can be given to it from here.
	CanTake bool `json:"canTake"`
}

type gpuState struct {
	Apps []gpuApp `json:"apps"`
	// Holder is the program the card was last given to, "" when that is not known.
	Holder string `json:"holder"`
	// Busy says something is being made, when the switch would pull the card out from
	// under it.
	Busy string `json:"busy,omitempty"`
	// VRAM is the card's memory as ComfyUI reports it, in bytes, when it answers; it
	// is the whole card's, whoever uses it.
	VRAMTotal int64 `json:"vramTotal,omitempty"`
	VRAMFree  int64 `json:"vramFree,omitempty"`
}

func (s *Server) handleGPUState(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	writeJSON(w, http.StatusOK, s.gpuState(ctx))
}

// gpuState reads where the card is. Each program is asked in turn, briefly: one that
// is asleep reads as not holding anything, which is true enough for a switch.
func (s *Server) gpuState(ctx context.Context) gpuState {
	cur := s.settings.Get()
	c := s.card
	c.mu.Lock()
	parked, freed, held, holder := c.parked, c.freed, c.comfyHeld, c.holder
	c.mu.Unlock()
	out := gpuState{Holder: holder, Busy: s.cardBusy()}

	chat := gpuApp{ID: "chat", Name: "Libby's chat", Set: cur.ChatURL != ""}
	if chat.Set {
		probe := s.probeChatBackend(ctx)
		chat.CanTake = s.chatBackendControllable(ctx)
		switch {
		case probe.Ready:
			chat.Holding, chat.Detail = true, probe.Loaded
		case parked != "":
			chat.Detail = "lent out — " + parked + " comes back when she's spoken to"
		default:
			chat.Detail = "no model loaded"
		}
		if !chat.CanTake && chat.Detail != "" && probe.Ready {
			chat.Detail += " · this backend can't load or unload from here"
		}
	}

	images := gpuApp{ID: "images", Name: "Pictures", Set: cur.ImageGenEnabled && strings.TrimSpace(cur.ImageGenURL) != ""}
	if images.Set {
		images.Name = "Automatic1111"
		if kind, err := s.imagegen.Backend(ctx, cur.ImageGenURL); err == nil {
			if kind != imagegen.KindA1111 {
				images.Name = "InvokeAI"
			}
			images.CanTake = true
			images.Holding = !freed
			images.Detail = "checkpoint on the card"
			if freed {
				images.Detail = "checkpoint let go"
			}
		} else {
			images.Detail = "not answering"
		}
	}

	video := gpuApp{ID: "video", Name: "ComfyUI", Set: strings.TrimSpace(cur.LibbyClipURL) != ""}
	if video.Set {
		if sys, err := s.comfyReach(ctx, cur.LibbyClipURL); err == nil {
			video.CanTake = true
			video.Holding = held
			video.Detail = "loads Wan with the next clip"
			if held {
				video.Detail = "holding the last clip's models"
			}
			for _, d := range sys.Devices {
				if d.VRAMTotal > out.VRAMTotal {
					out.VRAMTotal, out.VRAMFree = d.VRAMTotal, d.VRAMFree
				}
			}
		} else {
			video.Detail = "not answering"
		}
	}
	out.Apps = []gpuApp{chat, images, video}
	return out
}

// cardBusy says what is being made right now, "" when nothing is.
func (s *Server) cardBusy() string {
	c := s.card
	c.mu.Lock()
	pictures := c.images
	c.mu.Unlock()
	switch {
	case pictures > 0:
		return "a picture is being drawn"
	case s.genJobs.running("clip-") > 0:
		return "a clip is being made"
	}
	return ""
}

type gpuSwitchReq struct {
	To string `json:"to"`
}

// handleGPUSwitch gives the card to one program and asks the others to let go. It
// waits for the hand-over, which for her model is a reload of a minute or so, and
// answers with where the card is after.
func (s *Server) handleGPUSwitch(w http.ResponseWriter, r *http.Request) {
	var req gpuSwitchReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if busy := s.cardBusy(); busy != "" {
		writeErr(w, http.StatusConflict, busy+" — switch once it's done")
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), modelLoadTimeout)
	defer cancel()
	var problems []string
	switch req.To {
	case "chat":
		problems = s.cardToChat(ctx)
	case "images":
		problems = s.cardToImages(ctx)
	case "video":
		problems = s.cardToVideo(ctx)
	default:
		writeErr(w, http.StatusBadRequest, `say which program: "chat", "images" or "video"`)
		return
	}
	s.card.mu.Lock()
	s.card.holder = req.To
	s.card.mu.Unlock()
	stateCtx, stateCancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer stateCancel()
	state := s.gpuState(stateCtx)
	writeJSON(w, http.StatusOK, map[string]any{"state": state, "problems": problems})
}

// cardToChat has the generator and ComfyUI let go, then loads her model: the one lent
// out when there is one, else the one last loaded from here.
func (s *Server) cardToChat(ctx context.Context) []string {
	cur := s.settings.Get()
	var problems []string
	// Bringing a parked model back has the generator let go on its own (handBackCard).
	s.freeImagesAndComfy(ctx, s.card.parkedModel() == "", true, &problems)
	if cur.ChatURL == "" {
		return append(problems, "Libby's chat has no address set")
	}
	if s.card.parkedModel() != "" {
		s.handBackCard()
		if s.card.parkedModel() != "" {
			problems = append(problems, "her model did not load back — the server log says why")
		}
		return problems
	}
	probe := s.probeChatBackend(ctx)
	if probe.Ready {
		return problems
	}
	if !s.chatBackendControllable(ctx) {
		return append(problems, "this chat backend can't load a model from here — load one in its own UI")
	}
	model := lastLoadedModel(s.readTextgenLoads(), cur.ChatModel)
	if model == "" {
		return append(problems, "no model has been loaded from OppaiLib yet — pick one on the chat screen")
	}
	s.modelMu.Lock()
	err := s.loadRemembered(ctx, model)
	s.modelMu.Unlock()
	if err != nil {
		problems = append(problems, err.Error())
	}
	return problems
}

// lastLoadedModel is the model most recently loaded from here, or the configured one.
func lastLoadedModel(loads textgenLoads, fallback string) string {
	names := make([]string, 0, len(loads.Models))
	for name := range loads.Models {
		names = append(names, name)
	}
	sort.Slice(names, func(i, j int) bool { return loads.Models[names[i]].At > loads.Models[names[j]].At })
	if len(names) > 0 {
		return names[0]
	}
	return strings.TrimSpace(fallback)
}

// cardToImages parks her model, has ComfyUI let go, and puts the generator's
// checkpoint back on the card.
func (s *Server) cardToImages(ctx context.Context) []string {
	var problems []string
	s.parkForSwitch(ctx, &problems)
	s.freeImagesAndComfy(ctx, false, true, &problems)
	cur := s.settings.Get()
	if !cur.ImageGenEnabled || strings.TrimSpace(cur.ImageGenURL) == "" {
		return append(problems, "the image generator has no address set")
	}
	c := s.card
	c.swap.Lock()
	defer c.swap.Unlock()
	if err := s.imagegen.ReclaimMemory(ctx, cur.ImageGenURL); err != nil {
		return append(problems, "the generator did not load its checkpoint: "+err.Error())
	}
	c.mu.Lock()
	c.freed = false
	c.mu.Unlock()
	return problems
}

// cardToVideo parks her model and has the generator let go of its checkpoint;
// ComfyUI loads what the next clip needs.
func (s *Server) cardToVideo(ctx context.Context) []string {
	var problems []string
	s.parkForSwitch(ctx, &problems)
	s.freeImagesAndComfy(ctx, true, false, &problems)
	return problems
}

// parkForSwitch unloads her model as a generation would, so a chat turn brings it back.
func (s *Server) parkForSwitch(ctx context.Context, problems *[]string) {
	if s.settings.Get().ChatURL == "" || s.card.parkedModel() != "" {
		return
	}
	if !s.chatBackendControllable(ctx) {
		if s.probeChatBackend(ctx).Ready {
			*problems = append(*problems, "her model stays loaded — this chat backend can't unload from here")
		}
		return
	}
	s.parkChatModel(ctx)
}

// freeImagesAndComfy asks the image generator and/or ComfyUI to let go of their models.
func (s *Server) freeImagesAndComfy(ctx context.Context, images, comfy bool, problems *[]string) {
	cur := s.settings.Get()
	c := s.card
	c.swap.Lock()
	defer c.swap.Unlock()
	if images && cur.ImageGenEnabled && strings.TrimSpace(cur.ImageGenURL) != "" {
		if err := s.imagegen.FreeMemory(ctx, cur.ImageGenURL); err != nil {
			*problems = append(*problems, "the generator would not let go of its checkpoint: "+err.Error())
		} else {
			c.mu.Lock()
			c.freed = true
			c.mu.Unlock()
		}
	}
	if comfy && strings.TrimSpace(cur.LibbyClipURL) != "" {
		if err := s.imagegen.FreeComfyMemory(ctx, cur.LibbyClipURL); err != nil {
			*problems = append(*problems, "ComfyUI would not let go of its models: "+err.Error())
		} else {
			c.mu.Lock()
			c.comfyHeld = false
			c.mu.Unlock()
		}
	}
}
