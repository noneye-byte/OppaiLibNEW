package tts

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Remote is an OpenAI-compatible speech server: POST /v1/audio/speech with a model,
// a voice and the text, WAV back. Kokoro-FastAPI, openedai-speech and
// text-generation-webui's TTS extensions all answer this shape, and it is the one
// endpoint nearly every local speech server has agreed on.
type Remote struct {
	// URL is the server's base; "/v1" is tolerated and trimmed.
	URL string
	// Model is what the server calls its model ("tts-1", "kokoro"); blank sends
	// "tts-1", which every compatible server accepts as "the default".
	Model string
	// APIKey is sent as a bearer token when set.
	APIKey string
	// Default is the voice used when a request names none.
	Default string

	hc *http.Client
}

// NewRemote builds the engine, or nil for an empty URL.
func NewRemote(rawURL, model, apiKey, defaultVoice string) *Remote {
	rawURL = strings.TrimRight(strings.TrimSpace(rawURL), "/")
	if rawURL == "" {
		return nil
	}
	rawURL = strings.TrimSuffix(rawURL, "/v1")
	if model == "" {
		model = "tts-1"
	}
	return &Remote{URL: rawURL, Model: model, APIKey: apiKey, Default: defaultVoice, hc: &http.Client{Timeout: 2 * time.Minute}}
}

func (r *Remote) Name() string { return "openai" }

func (r *Remote) Ready(ctx context.Context) (bool, string) {
	if r == nil {
		return false, "no speech server is configured"
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	// /v1/audio/voices is Kokoro-FastAPI's and openedai-speech's; a server without it
	// still counts as reachable if it answers anything at all under /v1.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.URL+"/v1/audio/voices", nil)
	if err != nil {
		return false, err.Error()
	}
	r.auth(req)
	resp, err := r.hc.Do(req)
	if err != nil {
		return false, "speech server is unreachable: " + err.Error()
	}
	resp.Body.Close()
	return true, ""
}

// Voices asks the server; a server without the voices endpoint offers only the
// configured default.
func (r *Remote) Voices(ctx context.Context) ([]Voice, error) {
	if r == nil {
		return nil, ErrNoEngine
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.URL+"/v1/audio/voices", nil)
	if err != nil {
		return nil, err
	}
	r.auth(req)
	resp, err := r.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		if r.Default != "" {
			return []Voice{{ID: r.Default, Label: r.Default, Installed: true}}, nil
		}
		return []Voice{}, nil
	}
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	// Kokoro-FastAPI: {"voices":["af_bella", ...]}. openedai-speech and others vary;
	// a bare list of strings is also accepted.
	var shaped struct {
		Voices []json.RawMessage `json:"voices"`
	}
	var names []string
	if json.Unmarshal(raw, &shaped) == nil && len(shaped.Voices) > 0 {
		for _, v := range shaped.Voices {
			var name string
			if json.Unmarshal(v, &name) == nil {
				names = append(names, name)
				continue
			}
			var obj struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			}
			if json.Unmarshal(v, &obj) == nil {
				if obj.ID != "" {
					names = append(names, obj.ID)
				} else if obj.Name != "" {
					names = append(names, obj.Name)
				}
			}
		}
	} else {
		_ = json.Unmarshal(raw, &names)
	}
	out := make([]Voice, 0, len(names))
	for _, name := range names {
		out = append(out, Voice{ID: name, Label: name, Installed: true})
	}
	return out, nil
}

// Speak posts one line and returns what came back, which is asked for as WAV.
func (r *Remote) Speak(ctx context.Context, req Request) ([]byte, error) {
	if r == nil {
		return nil, ErrNoEngine
	}
	voice := req.Voice
	if voice == "" {
		voice = r.Default
	}
	body := map[string]any{"model": r.Model, "input": req.Text, "response_format": "wav"}
	if voice != "" {
		body["voice"] = voice
	}
	if req.Speed > 0 && req.Speed != 1 {
		body["speed"] = req.Speed
	}
	payload, _ := json.Marshal(body)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, r.URL+"/v1/audio/speech", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	r.auth(httpReq)
	resp, err := r.hc.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("speech server: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<10))
		return nil, fmt.Errorf("speech server returned %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}
	audio, err := io.ReadAll(io.LimitReader(resp.Body, 64<<20))
	if err != nil {
		return nil, err
	}
	if len(audio) == 0 {
		return nil, errors.New("speech server returned no audio")
	}
	return audio, nil
}

func (r *Remote) auth(req *http.Request) {
	if r.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+r.APIKey)
	}
}
