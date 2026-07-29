package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type chatModelsResponse struct {
	Models    []string `json:"models"`
	Loaded    string   `json:"loaded"`
	Supported bool     `json:"supported"`
}

type chatBackendProbe struct {
	Ready  bool
	Loaded string
	Detail string
}

func chatBackendBase(raw string) string {
	return strings.TrimSuffix(strings.TrimRight(raw, "/"), "/v1")
}

func (s *Server) chatBackendRequest(ctx context.Context, method, path string, body []byte) (int, []byte, error) {
	cur := s.settings.Get()
	if cur.ChatURL == "" {
		return 0, nil, fmt.Errorf("chat backend URL is not configured")
	}
	req, err := http.NewRequestWithContext(ctx, method, chatBackendBase(cur.ChatURL)+path, bytes.NewReader(body))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if cur.ChatAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cur.ChatAPIKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	return resp.StatusCode, raw, err
}

// modelLoadTimeout bounds a load. A large quantized model read off a cold spinning
// disk genuinely takes minutes, so this is deliberately far longer than any other
// call in this file.
const modelLoadTimeout = 10 * time.Minute

// chatBackendControllable reports whether the backend exposes text-generation-webui's
// internal model endpoints. Generic OpenAI-compatible servers (llama.cpp, vLLM,
// TabbyAPI) serve /v1/models but have no notion of loading a model on demand, so
// the UI must not offer controls that would always fail against them.
func (s *Server) chatBackendControllable(ctx context.Context) bool {
	status, _, err := s.chatBackendRequest(ctx, http.MethodGet, "/v1/internal/model/list", nil)
	return err == nil && status >= 200 && status < 300
}

// probeChatBackend reports readiness. Load/unload is exposed separately and is
// serialized behind s.modelMu: driving it from here would race the backend's own
// WebUI, so mutation only ever happens on an explicit user action.
func (s *Server) probeChatBackend(ctx context.Context) chatBackendProbe {
	cur := s.settings.Get()
	if cur.ChatURL == "" {
		return chatBackendProbe{Detail: "Chat API URL is not configured."}
	}
	status, raw, err := s.chatBackendRequest(ctx, http.MethodGet, "/v1/internal/model/info", nil)
	if err == nil && status >= 200 && status < 300 {
		var info struct {
			ModelName string `json:"model_name"`
		}
		if json.Unmarshal(raw, &info) == nil {
			loaded := strings.TrimSpace(info.ModelName)
			if loaded == "" || strings.EqualFold(loaded, "none") {
				return chatBackendProbe{Detail: "No model is loaded in text-generation-webui. Load one in its WebUI, then refresh."}
			}
			return chatBackendProbe{Ready: true, Loaded: loaded}
		}
	}

	// Generic OpenAI-compatible backends do not expose text-generation-webui's
	// internal endpoint. A non-empty /models response is the best portable
	// readiness signal; prefer the configured model when it appears in the list.
	status, raw, err = s.chatBackendRequest(ctx, http.MethodGet, "/v1/models", nil)
	if err != nil {
		return chatBackendProbe{Detail: "Chat API is unreachable: " + err.Error()}
	}
	if status < 200 || status >= 300 {
		return chatBackendProbe{Detail: fmt.Sprintf("Chat API readiness check returned HTTP %d.", status)}
	}
	var generic struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if json.Unmarshal(raw, &generic) != nil {
		return chatBackendProbe{Detail: "Chat API returned an invalid model list."}
	}
	if len(generic.Data) == 0 {
		return chatBackendProbe{Detail: "Chat API is online, but it reports no loaded model."}
	}
	loaded := strings.TrimSpace(generic.Data[0].ID)
	for _, model := range generic.Data {
		if model.ID == cur.ChatModel {
			loaded = model.ID
			break
		}
	}
	return chatBackendProbe{Ready: true, Loaded: loaded}
}

func (s *Server) handleChatModels(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	status, raw, err := s.chatBackendRequest(ctx, http.MethodGet, "/v1/internal/model/list", nil)
	if err == nil && status >= 200 && status < 300 {
		var list struct {
			ModelNames []string `json:"model_names"`
		}
		if json.Unmarshal(raw, &list) == nil {
			loaded := ""
			if infoStatus, infoRaw, infoErr := s.chatBackendRequest(ctx, http.MethodGet, "/v1/internal/model/info", nil); infoErr == nil && infoStatus >= 200 && infoStatus < 300 {
				var info struct {
					ModelName string `json:"model_name"`
				}
				_ = json.Unmarshal(infoRaw, &info)
				loaded = strings.TrimSpace(info.ModelName)
				if strings.EqualFold(loaded, "none") {
					loaded = ""
				}
			}
			// The internal endpoints answered, so this backend accepts load/unload.
			writeJSON(w, http.StatusOK, chatModelsResponse{Models: list.ModelNames, Loaded: loaded, Supported: true})
			return
		}
	}
	// Generic OpenAI-compatible backends can usually list models but do not expose
	// load/unload. Show that list read-only instead of failing the whole chat panel.
	status, raw, err = s.chatBackendRequest(ctx, http.MethodGet, "/v1/models", nil)
	if err != nil || status < 200 || status >= 300 {
		writeErr(w, http.StatusBadGateway, "chat backend does not expose model controls")
		return
	}
	var generic struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if json.Unmarshal(raw, &generic) != nil {
		writeErr(w, http.StatusBadGateway, "invalid model list response")
		return
	}
	models := make([]string, 0, len(generic.Data))
	for _, model := range generic.Data {
		if model.ID != "" {
			models = append(models, model.ID)
		}
	}
	loaded := ""
	if len(models) > 0 {
		loaded = models[0]
		configuredModel := s.settings.Get().ChatModel
		for _, model := range models {
			if model == configuredModel {
				loaded = model
				break
			}
		}
	}
	writeJSON(w, http.StatusOK, chatModelsResponse{Models: models, Loaded: loaded, Supported: false})
}

type loadModelRequest struct {
	// modelName matches what the web and Android clients already send.
	Model string `json:"modelName"`
	// Args passes text-generation-webui loader flags through untouched
	// (gpu_split, n_gpu_layers, load_in_4bit, ...). The backend owns their
	// meaning; validating them here would only go stale as loaders change.
	Args map[string]any `json:"args,omitempty"`
}

// handleLoadChatModel loads a model in text-generation-webui.
//
// Two things are deliberate. The call runs on a background context rather than
// the request's: a load takes minutes, and a user closing the tab midway would
// otherwise abort it and leave the backend with no model resident. And the whole
// operation holds s.modelMu, so a second load queued from another tab cannot
// interleave with the first — text-generation-webui has one model slot.
func (s *Server) handleLoadChatModel(w http.ResponseWriter, r *http.Request) {
	var in loadModelRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid load request")
		return
	}
	in.Model = strings.TrimSpace(in.Model)
	if in.Model == "" {
		writeErr(w, http.StatusBadRequest, "a model name is required")
		return
	}

	if !s.modelMu.TryLock() {
		writeErr(w, http.StatusConflict, "another model operation is already in progress")
		return
	}
	defer s.modelMu.Unlock()

	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), modelLoadTimeout)
	defer cancel()

	if !s.chatBackendControllable(ctx) {
		writeErr(w, http.StatusConflict, "this chat backend does not support loading models over its API")
		return
	}

	payload, _ := json.Marshal(map[string]any{"model_name": in.Model, "args": in.Args})
	status, raw, err := s.chatBackendRequest(ctx, http.MethodPost, "/v1/internal/model/load", payload)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "load failed: "+err.Error())
		return
	}
	if status < 200 || status >= 300 {
		// The backend's own message names the real cause (out of memory, missing
		// loader, bad quantization), which is far more useful than a generic 502.
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("text-generation-webui refused the load (HTTP %d): %s", status, truncateChatError(raw)))
		return
	}

	// A 200 from /model/load means the request was accepted, not that a model is
	// resident. Confirm against the backend so the UI never reports a load that
	// silently produced nothing.
	probe := s.probeChatBackend(ctx)
	if !probe.Ready {
		writeErr(w, http.StatusBadGateway, "the backend accepted the load but reports no model: "+probe.Detail)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"loaded": probe.Loaded})
}

// handleUnloadChatModel frees the model in text-generation-webui. Unlike a load
// this is fast, but it is still serialized: unloading underneath an in-flight
// load is what leaves the backend wedged.
func (s *Server) handleUnloadChatModel(w http.ResponseWriter, r *http.Request) {
	if !s.modelMu.TryLock() {
		writeErr(w, http.StatusConflict, "another model operation is already in progress")
		return
	}
	defer s.modelMu.Unlock()

	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 2*time.Minute)
	defer cancel()

	if !s.chatBackendControllable(ctx) {
		writeErr(w, http.StatusConflict, "this chat backend does not support unloading models over its API")
		return
	}
	status, raw, err := s.chatBackendRequest(ctx, http.MethodPost, "/v1/internal/model/unload", nil)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "unload failed: "+err.Error())
		return
	}
	if status < 200 || status >= 300 {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("text-generation-webui refused the unload (HTTP %d): %s", status, truncateChatError(raw)))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"loaded": ""})
}
