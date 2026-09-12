package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// The rest of text-generation-webui, from inside OppaiLib.
//
// Load and unload were already here (handlers_chat_models.go). What was missing was
// everything a person opens the WebUI's Model tab for besides the model name: which
// loader, how much of it goes on the GPU, how long a context, what the KV cache is
// quantised to, and the LoRAs on top. Without those, "load" meant "load with whatever
// the WebUI last had set", which is a different thing on every box and invisible from
// here. So loading a model from OppaiLib meant keeping the WebUI open beside it, which
// is the thing this exists to make unnecessary.
//
// Everything below is the backend's own internal API
// (extensions/openai/script.py in text-generation-webui), reached through the same
// chatBackendRequest as the load, and offered only when that API answers — a
// llama.cpp server or vLLM has none of it, and the client hides the controls when
// modelManagement is false.
//
// Two things are deliberate about the loader arguments:
//
//   - They are remembered per model, server-side, in a plain file under the chat
//     directory. Loader settings are a property of the model on that box — this one
//     wants 35 layers and an 8K context, that one fits entirely — and a person should
//     set them once, not on every load and not on every device.
//   - They are passed through untouched. text-generation-webui applies each key to its
//     own argument namespace and ignores what it does not recognise, and the names
//     have changed across its releases (n_ctx became ctx_size, n_gpu_layers became
//     gpu_layers). Validating them here would only go stale; the client sends both
//     spellings for the ones that moved, and the backend takes the one it knows.

// textgenLoadsFile is where the per-model loader arguments live.
const textgenLoadsFile = "textgen-loads.json"

// textgenLoad is what one model was last loaded with.
type textgenLoad struct {
	// Args are the loader arguments (loader, ctx_size, gpu_layers, ...).
	Args map[string]any `json:"args,omitempty"`
	// Settings are text-generation-webui's generation defaults applied at load
	// (truncation_length, instruction_template, ...). Rarely needed; passed through.
	Settings map[string]any `json:"settings,omitempty"`
	// At is when it was last loaded this way, UnixMilli.
	At int64 `json:"at"`
}

// textgenLoads is the file: model name → what it was last loaded with.
type textgenLoads struct {
	Models map[string]textgenLoad `json:"models"`
}

var textgenLoadsMu sync.Mutex

func (s *Server) textgenLoadsPath() string {
	return filepath.Join(s.chatDir, textgenLoadsFile)
}

func (s *Server) readTextgenLoads() textgenLoads {
	out := textgenLoads{Models: map[string]textgenLoad{}}
	raw, err := os.ReadFile(s.textgenLoadsPath())
	if err != nil {
		return out
	}
	_ = json.Unmarshal(raw, &out)
	if out.Models == nil {
		out.Models = map[string]textgenLoad{}
	}
	return out
}

// rememberTextgenLoad records the arguments a model was loaded with. Best-effort: a
// failure here costs the memory of the settings, not the load.
func (s *Server) rememberTextgenLoad(model string, args, settings map[string]any) {
	textgenLoadsMu.Lock()
	defer textgenLoadsMu.Unlock()
	loads := s.readTextgenLoads()
	loads.Models[model] = textgenLoad{Args: args, Settings: settings, At: time.Now().UnixMilli()}
	raw, err := json.MarshalIndent(loads, "", "  ")
	if err != nil {
		return
	}
	if err := os.MkdirAll(s.chatDir, 0o700); err != nil {
		return
	}
	tmp, err := os.CreateTemp(s.chatDir, "textgen-loads-*.tmp")
	if err != nil {
		return
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err = tmp.Write(raw); err == nil {
		err = tmp.Close()
	} else {
		tmp.Close()
	}
	if err != nil {
		return
	}
	if err := os.Rename(tmpName, s.textgenLoadsPath()); err != nil {
		s.log.Warn("textgen loads: write", "err", err)
	}
}

// textgenLoaders is the loader menu, in the order the WebUI lists them. A static list
// rather than a probe because the backend exposes no endpoint for it; a loader the
// running version lacks is refused at load with the backend's own message, which the
// handler passes through.
var textgenLoaders = []string{
	"llama.cpp", "Transformers", "ExLlamav3_HF", "ExLlamav3", "ExLlamav2_HF", "ExLlamav2", "HQQ", "TensorRT-LLM",
}

// textgenLorasResponse is what the LoRA endpoints return.
type textgenLorasResponse struct {
	Available []string `json:"available"`
	Loaded    []string `json:"loaded"`
}

// textgenLoras reads what is installed and what is applied. Both come from the
// internal API; either failing is reported as an error rather than an empty list, so
// the client can tell "none" from "could not ask".
func (s *Server) textgenLoras(ctx context.Context) (textgenLorasResponse, error) {
	var out textgenLorasResponse
	status, raw, err := s.chatBackendRequest(ctx, http.MethodGet, "/v1/internal/lora/list", nil)
	if err != nil {
		return out, err
	}
	if status < 200 || status >= 300 {
		return out, fmt.Errorf("LoRA list returned HTTP %d", status)
	}
	var list struct {
		LoraNames []string `json:"lora_names"`
	}
	if err := json.Unmarshal(raw, &list); err != nil {
		return out, errors.New("invalid LoRA list")
	}
	out.Available = list.LoraNames
	sort.Strings(out.Available)
	status, raw, err = s.chatBackendRequest(ctx, http.MethodGet, "/v1/internal/model/info", nil)
	if err == nil && status >= 200 && status < 300 {
		var info struct {
			LoraNames []string `json:"lora_names"`
		}
		if json.Unmarshal(raw, &info) == nil {
			out.Loaded = info.LoraNames
		}
	}
	if out.Available == nil {
		out.Available = []string{}
	}
	if out.Loaded == nil {
		out.Loaded = []string{}
	}
	return out, nil
}

// handleChatBackendInfo is the one call the model panel makes to draw itself: the
// loader menu, every model's remembered arguments, and the LoRAs.
//
// Separate from /api/chat/models so that a generic backend — which answers the model
// list but none of this — keeps its cheap, working panel, and so the model list itself
// stays as fast as it was: the LoRA calls are two more round trips to the backend.
func (s *Server) handleChatBackendInfo(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	if !s.chatBackendControllable(ctx) {
		writeJSON(w, http.StatusOK, map[string]any{"supported": false})
		return
	}
	textgenLoadsMu.Lock()
	loads := s.readTextgenLoads()
	textgenLoadsMu.Unlock()
	out := map[string]any{
		"supported": true,
		"loaders":   textgenLoaders,
		"loads":     loads.Models,
	}
	if loras, err := s.textgenLoras(ctx); err == nil {
		out["loras"] = loras
	} else {
		out["lorasError"] = err.Error()
	}
	writeJSON(w, http.StatusOK, out)
}

// loraRequest names the LoRAs to apply. All of them at once: the backend's own
// endpoint replaces the applied set rather than adding to it, so the client sends the
// whole list it wants applied.
type loraRequest struct {
	Names []string `json:"names"`
}

// handleLoadChatLoras applies a set of LoRAs to the loaded model. Serialized behind
// modelMu like a load, because applying a LoRA underneath a load in progress is one of
// the ways the backend gets wedged.
func (s *Server) handleLoadChatLoras(w http.ResponseWriter, r *http.Request) {
	var in loraRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid LoRA request")
		return
	}
	names := make([]string, 0, len(in.Names))
	for _, name := range in.Names {
		if name = strings.TrimSpace(name); name != "" {
			names = append(names, name)
		}
	}
	if !s.modelMu.TryLock() {
		writeErr(w, http.StatusConflict, "another model operation is already in progress")
		return
	}
	defer s.modelMu.Unlock()
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 5*time.Minute)
	defer cancel()
	if !s.chatBackendControllable(ctx) {
		writeErr(w, http.StatusConflict, "this chat backend does not support LoRAs over its API")
		return
	}
	if len(names) == 0 {
		// An empty set is an unload, and the backend has a separate call for that.
		status, raw, err := s.chatBackendRequest(ctx, http.MethodPost, "/v1/internal/lora/unload", nil)
		if err != nil {
			writeErr(w, http.StatusBadGateway, "LoRA unload failed: "+err.Error())
			return
		}
		if status < 200 || status >= 300 {
			writeErr(w, http.StatusBadGateway, fmt.Sprintf("text-generation-webui refused the LoRA unload (HTTP %d): %s", status, truncateChatError(raw)))
			return
		}
	} else {
		payload, _ := json.Marshal(map[string]any{"lora_names": names})
		status, raw, err := s.chatBackendRequest(ctx, http.MethodPost, "/v1/internal/lora/load", payload)
		if err != nil {
			writeErr(w, http.StatusBadGateway, "LoRA load failed: "+err.Error())
			return
		}
		if status < 200 || status >= 300 {
			writeErr(w, http.StatusBadGateway, fmt.Sprintf("text-generation-webui refused the LoRA load (HTTP %d): %s", status, truncateChatError(raw)))
			return
		}
	}
	loras, err := s.textgenLoras(ctx)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "applied, but could not read the LoRA state back: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, loras)
}

// handleStopChatGeneration tells the backend to stop whatever it is generating.
//
// Not serialized behind modelMu — it is the call a person makes while a reply is
// stuck, and queuing it behind the thing that is stuck would defeat it. The backend
// treats it as a request to the current generation, whoever started it; on a
// single-user box that is the reply in flight from this chat, which then returns
// whatever had been written so far.
func (s *Server) handleStopChatGeneration(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	status, raw, err := s.chatBackendRequest(ctx, http.MethodPost, "/v1/internal/stop-generation", nil)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "stop failed: "+err.Error())
		return
	}
	if status < 200 || status >= 300 {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("the backend refused the stop (HTTP %d): %s", status, truncateChatError(raw)))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"stopped": true})
}

// tokenCountRequest is a piece of text to measure.
type tokenCountRequest struct {
	Text string `json:"text"`
}

// handleChatTokenCount measures text with the loaded model's own tokenizer, for the
// card editor: "your character card is 1,240 tokens" is the number that decides
// whether a 4K model has room left to reply, and the estimate the budget uses is a
// heuristic. Falls back to that heuristic when the backend cannot count.
func (s *Server) handleChatTokenCount(w http.ResponseWriter, r *http.Request) {
	var in tokenCountRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<20)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	payload, _ := json.Marshal(map[string]any{"text": in.Text})
	status, raw, err := s.chatBackendRequest(ctx, http.MethodPost, "/v1/internal/token-count", payload)
	if err == nil && status >= 200 && status < 300 {
		var out struct {
			Length int `json:"length"`
		}
		if json.Unmarshal(raw, &out) == nil {
			writeJSON(w, http.StatusOK, map[string]any{"tokens": out.Length, "exact": true})
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"tokens": estimateTokens(in.Text), "exact": false})
}
