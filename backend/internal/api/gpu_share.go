package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// One card, two tenants.
//
// A 32 GB card holds a 24B chat model at Q6 with a 32K window and room to spare, or a
// generator with an SDXL checkpoint, a LoRA and a detailer — comfortably either, and
// both only by squeezing one of them. The squeeze is what goes wrong: the generator
// runs out of memory mid-picture, or the loader offloads layers of her model to the CPU
// and she types at a word a second.
//
// So there is a second way to share the card, chosen in Settings: swap. When a picture
// is asked for, her model is unloaded first and the generator has the whole card; when
// the generator has been quiet for a moment, it is asked to let go of its checkpoint
// and her model is loaded back with the loader arguments it was last loaded with. The
// moment is what keeps a sixty-square wardrobe from reloading her fifty-nine times.
//
// What swap does not do is decide on its own. It only runs when the operator picked it,
// only against a backend that exposes load and unload (text-generation-webui), and it
// never fights a load somebody started by hand: a model operation already in progress
// means this generation runs beside her rather than evicting anything.
//
// A clip is the other tenant that wants the whole card, and wants it whatever the chat
// setting says: a Wan pair is two 14B models, and ComfyUI given less than it needs
// offloads to system memory and crawls. So a clip asks the image generator to let go of
// its checkpoint first, unless Settings says to keep it (ClipKeepImageModel), and the
// next picture asks ComfyUI to let go of Wan and the generator to load its checkpoint
// back. Neither program knows the other is on the card; this is where that is known.

// cardReturnGrace is how long the generator must be idle before her model goes back.
// Long enough to cover the gap between one studio run and the tweak-and-rerun after it;
// short enough that a person who goes back to chatting is not kept waiting much beyond
// the reload itself. A chat turn that arrives during it cuts it short — see
// handBackCardNow.
const cardReturnGrace = 60 * time.Second

// cardParkedFile remembers which model was parked, so a restart in the middle of a
// generation hands the card back rather than leaving her unloaded until someone
// notices.
const cardParkedFile = "card-parked.json"

// cardShare is the state of the swap.
type cardShare struct {
	mu sync.Mutex
	// active is how many generations are running right now.
	active int
	// parked is the chat model unloaded for them, "" while she has the card.
	parked string
	// freed says the generator was last asked to let go of its checkpoint — for her
	// model, or for a clip — so the next picture should ask for it back (Automatic1111
	// does not reload on its own).
	freed bool
	// images is how many pictures are being drawn right now, in any sharing mode: a
	// clip does not pull the checkpoint out from under one.
	images int
	// comfyHeld says a clip has run since the last picture, so ComfyUI is still holding
	// its models and is asked to let go before the generator needs the room.
	comfyHeld bool
	// timer is the pending hand-back, nil when none is pending.
	timer *time.Timer
	// swap serialises the backend operations themselves — an unload, a reload — so two
	// generations starting together unload once, and a generation starting mid-reload
	// waits for the reload to finish before unloading again rather than racing it.
	swap sync.Mutex
}

// parkedModel is the chat model currently lent out, "" when there is none.
func (c *cardShare) parkedModel() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.parked
}

// lendCardToImages is called before a picture. It returns the function to call when
// the generation ends, which is always safe to call and a no-op when nothing was lent.
func (s *Server) lendCardToImages(ctx context.Context) func() {
	c := s.card
	c.mu.Lock()
	c.images++
	c.mu.Unlock()
	swapped := s.lendSwap(ctx)
	s.readyGenerator(ctx)
	var once sync.Once
	return func() {
		once.Do(func() {
			c.mu.Lock()
			c.images--
			c.mu.Unlock()
			swapped()
		})
	}
}

// lendCardToVideo is lendCardToImages for a clip: her model steps off the card as it
// does for a picture, and the image generator's checkpoint goes too, so ComfyUI has
// all of it.
func (s *Server) lendCardToVideo(ctx context.Context) func() {
	swapped := s.lendSwap(ctx)
	cur := s.settings.Get()
	unload := !cur.ClipKeepImageModel && cur.ImageGenEnabled && strings.TrimSpace(cur.ImageGenURL) != ""
	if unload {
		s.freeGenerator(ctx)
	}
	c := s.card
	var once sync.Once
	return func() {
		once.Do(func() {
			if unload {
				c.mu.Lock()
				c.comfyHeld = true
				c.mu.Unlock()
			}
			swapped()
		})
	}
}

// freeGenerator asks the image generator to let go of its checkpoint for a clip. It is
// asked every time rather than trusting freed, since a checkpoint may have been loaded
// in the generator's own UI since; letting go of nothing is a no-op there.
func (s *Server) freeGenerator(ctx context.Context) {
	c := s.card
	c.swap.Lock()
	defer c.swap.Unlock()
	c.mu.Lock()
	busy := c.images > 0
	c.mu.Unlock()
	if busy {
		s.log.Info("card share: a picture is being drawn; the clip renders beside the generator's checkpoint")
		return
	}
	opCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
	defer cancel()
	if err := s.imagegen.FreeMemory(opCtx, s.settings.Get().ImageGenURL); err != nil {
		s.log.Warn("card share: the generator would not let go of its checkpoint for the clip", "err", err)
		return
	}
	c.mu.Lock()
	c.freed = true
	c.mu.Unlock()
}

// readyGenerator puts the card back the way a picture needs it: ComfyUI's models off
// it when a clip left them there, and the generator's checkpoint back on it when it was
// let go of. Best-effort, as the rest of this is — a generator that will not reload
// fails the picture with its own error, which says more than this could.
func (s *Server) readyGenerator(ctx context.Context) {
	c := s.card
	c.swap.Lock()
	defer c.swap.Unlock()
	c.mu.Lock()
	freed, held := c.freed, c.comfyHeld
	c.freed, c.comfyHeld = false, false
	c.mu.Unlock()
	if !freed && !held {
		return
	}
	cur := s.settings.Get()
	opCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
	defer cancel()
	if held {
		if err := s.imagegen.FreeComfyMemory(opCtx, cur.LibbyClipURL); err != nil {
			s.log.Warn("card share: ComfyUI did not let go of its models", "err", err)
		}
	}
	if freed && cur.ImageGenURL != "" {
		if err := s.imagegen.ReclaimMemory(opCtx, cur.ImageGenURL); err != nil {
			s.log.Warn("card share: generator did not reload its checkpoint", "err", err)
		}
	}
}

// lendSwap is the swap with her model, for any generation: nothing unless Settings
// chose swap. It returns the function to call when the generation ends.
func (s *Server) lendSwap(ctx context.Context) func() {
	cur := s.settings.Get()
	if cur.GPUShare != "swap" || cur.ChatURL == "" {
		return func() {}
	}
	c := s.card
	c.mu.Lock()
	c.active++
	if c.timer != nil {
		c.timer.Stop()
		c.timer = nil
	}
	c.mu.Unlock()
	s.parkChatModel(ctx)
	var once sync.Once
	return func() { once.Do(s.returnCard) }
}

// parkChatModel unloads her model for a generation, unless it is already parked or
// somebody else is operating on it.
func (s *Server) parkChatModel(ctx context.Context) {
	c := s.card
	c.swap.Lock()
	defer c.swap.Unlock()
	c.mu.Lock()
	already := c.parked != ""
	c.mu.Unlock()
	if already {
		return
	}
	opCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
	defer cancel()
	// A load someone started by hand is theirs to finish. The generation runs beside
	// her this once, which is the behaviour without swap — slower, not broken.
	if !s.modelMu.TryLock() {
		s.log.Info("card share: a model operation is in progress; generating beside her")
		return
	}
	defer s.modelMu.Unlock()
	probe := s.probeChatBackend(opCtx)
	if !probe.Ready || !s.chatBackendControllable(opCtx) {
		return
	}
	status, raw, err := s.chatBackendRequest(opCtx, http.MethodPost, "/v1/internal/model/unload", nil)
	if err != nil || status < 200 || status >= 300 {
		s.log.Warn("card share: unload refused; generating beside her", "status", status, "err", err, "body", truncateChatError(raw))
		return
	}
	c.mu.Lock()
	c.parked = probe.Loaded
	c.mu.Unlock()
	s.writeParkedModel(probe.Loaded)
	s.log.Info("card share: her model is parked for the generator", "model", probe.Loaded)
}

// returnCard is the end of one generation: once none is left running, the hand-back is
// scheduled after the grace.
func (s *Server) returnCard() {
	c := s.card
	c.mu.Lock()
	defer c.mu.Unlock()
	c.active--
	if c.active > 0 || c.parked == "" {
		return
	}
	if c.timer != nil {
		c.timer.Stop()
	}
	c.timer = time.AfterFunc(cardReturnGrace, s.handBackCard)
}

// handBackCardNow skips the rest of the grace, for a chat turn that arrived while she
// was parked with nothing generating: somebody wants to talk, and waiting out the timer
// would only add a minute to the reload they are already waiting for. Returns whether a
// hand-back was started.
func (s *Server) handBackCardNow() bool {
	c := s.card
	c.mu.Lock()
	idle := c.parked != "" && c.active == 0
	if idle && c.timer != nil {
		c.timer.Stop()
		c.timer = nil
	}
	c.mu.Unlock()
	if idle {
		go s.handBackCard()
	}
	return idle
}

// handBackCard asks the generator to let go and loads her model back.
func (s *Server) handBackCard() {
	c := s.card
	c.swap.Lock()
	defer c.swap.Unlock()
	c.mu.Lock()
	if c.active > 0 || c.parked == "" {
		c.mu.Unlock()
		return
	}
	model := c.parked
	c.timer = nil
	c.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), modelLoadTimeout)
	defer cancel()
	cur := s.settings.Get()
	if cur.ImageGenURL != "" {
		if err := s.imagegen.FreeMemory(ctx, cur.ImageGenURL); err != nil {
			s.log.Warn("card share: generator would not let go of its checkpoint", "err", err)
		} else {
			c.mu.Lock()
			c.freed = true
			c.mu.Unlock()
		}
	}
	s.modelMu.Lock()
	err := s.loadRemembered(ctx, model)
	s.modelMu.Unlock()
	// Cleared whether or not the load worked. A failed reload left parked would have her
	// reported as "lent to the generator" forever; cleared, the chat screen reports the
	// truth — no model loaded — and the operator can load it by hand.
	c.mu.Lock()
	c.parked = ""
	c.mu.Unlock()
	s.writeParkedModel("")
	if err != nil {
		s.log.Error("card share: could not load her model back", "model", model, "err", err)
		return
	}
	s.log.Info("card share: her model is back", "model", model)
}

// loadRemembered loads a model with the loader arguments it was last loaded with from
// OppaiLib. The caller holds s.modelMu.
func (s *Server) loadRemembered(ctx context.Context, model string) error {
	load := s.readTextgenLoads().Models[model]
	body := map[string]any{"model_name": model, "args": load.Args}
	if len(load.Settings) > 0 {
		body["settings"] = load.Settings
	}
	if body["args"] == nil {
		body["args"] = map[string]any{}
	}
	payload, _ := json.Marshal(body)
	status, raw, err := s.chatBackendRequest(ctx, http.MethodPost, "/v1/internal/model/load", payload)
	if err != nil {
		return err
	}
	if status < 200 || status >= 300 {
		return fmt.Errorf("text-generation-webui refused the load (HTTP %d): %s", status, truncateChatError(raw))
	}
	return nil
}

func (s *Server) cardParkedPath() string { return filepath.Join(s.chatDir, cardParkedFile) }

// writeParkedModel records the parked model, or clears the record for "". Best-effort:
// losing it costs only the restart case.
func (s *Server) writeParkedModel(model string) {
	if model == "" {
		_ = os.Remove(s.cardParkedPath())
		return
	}
	raw, _ := json.Marshal(map[string]string{"model": model})
	if err := os.MkdirAll(s.chatDir, 0o700); err == nil {
		_ = os.WriteFile(s.cardParkedPath(), raw, 0o600)
	}
}

// resumeParkedCard hands back a card that was lent when the server last stopped. Run
// once at startup: whatever generation had it is gone with the old process.
func (s *Server) resumeParkedCard() {
	raw, err := os.ReadFile(s.cardParkedPath())
	if err != nil {
		return
	}
	var rec struct {
		Model string `json:"model"`
	}
	if json.Unmarshal(raw, &rec) != nil || strings.TrimSpace(rec.Model) == "" {
		_ = os.Remove(s.cardParkedPath())
		return
	}
	s.card.mu.Lock()
	s.card.parked = rec.Model
	s.card.mu.Unlock()
	s.log.Info("card share: her model was parked when the server stopped; handing it back", "model", rec.Model)
	s.handBackCard()
}

// cardLentNote is what the chat screen says while she is parked.
const cardLentNote = "Libby has lent the graphics card to the image generator. She'll be back as soon as it goes quiet — give her a moment."

// forgetParkedCard drops a pending hand-back, for a model load somebody asked for by
// hand: the model they chose is the one that should end up on the card, not the one
// that was parked before they chose.
func (s *Server) forgetParkedCard() {
	c := s.card
	c.mu.Lock()
	if c.timer != nil {
		c.timer.Stop()
		c.timer = nil
	}
	had := c.parked != ""
	c.parked = ""
	c.mu.Unlock()
	if had {
		s.writeParkedModel("")
	}
}

// splitAcrossDevices says a generation failed because the generator's model is partly
// on the CPU and partly on the GPU — PyTorch's "Expected all tensors to be on the same
// device". On Automatic1111 it comes after its checkpoint was let go of (for a clip, or
// for her model) and brought back with reload-checkpoint, which moves the model back
// but, on some setups (--medvram, and extensions holding tensors of their own), not
// all of it.
func splitAcrossDevices(err error) bool {
	return err != nil && strings.Contains(err.Error(), "Expected all tensors to be on the same device")
}

// recoverSplitModel asks the generator to put its checkpoint back on the card again,
// under the same lock as the card's other hand-offs. Best-effort: when it does not
// help, the second failure goes to the studio, which says to restart A1111.
func (s *Server) recoverSplitModel(ctx context.Context, base string) {
	c := s.card
	c.swap.Lock()
	defer c.swap.Unlock()
	opCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
	defer cancel()
	if err := s.imagegen.ReclaimMemory(opCtx, base); err != nil {
		s.log.Warn("card share: generator did not reload its checkpoint", "err", err)
	}
}
