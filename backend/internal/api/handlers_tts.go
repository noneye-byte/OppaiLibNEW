package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/settings"
	"github.com/youruser/oppailib/internal/tts"
)

// Libby's voice, over the API.
//
// The clients ask for a line as audio and play it; which engine speaks and in what
// voice is the server's business, set in Settings, so a phone and a browser sound
// the same. When the server has nothing to speak with — no piper, no remote server,
// or the engine switched off — status says so and the clients fall back to the
// device's own voice, which is worse but never silent.

// speakRequest is one line to read aloud.
type speakRequest struct {
	Text string `json:"text"`
	// Voice and Speed override the settings for this line; blank/zero use them.
	Voice string  `json:"voice,omitempty"`
	Speed float64 `json:"speed,omitempty"`
}

// ttsStatus is what the clients read to decide whether to ask the server or the
// device.
type ttsStatus struct {
	// Engine is what would speak now: piper, openai, or "" for nothing.
	Engine string `json:"engine"`
	Ready  bool   `json:"ready"`
	Detail string `json:"detail,omitempty"`
	// Mode is the setting: auto, piper, openai, off.
	Mode  string  `json:"mode"`
	Voice string  `json:"voice"`
	Speed float64 `json:"speed"`
	// PiperInstalled says the binary is on this box, whatever the voices.
	PiperInstalled bool `json:"piperInstalled"`
	// RemoteConfigured says a speech server URL is set.
	RemoteConfigured bool        `json:"remoteConfigured"`
	Voices           []tts.Voice `json:"voices"`
	// Downloading lists piper voices being fetched right now.
	Downloading []string `json:"downloading,omitempty"`
}

// applyTTSSettings rebuilds the remote engine from the settings. Called from
// ApplySettings; cheap, so it runs on every save.
func (s *Server) applyTTSSettings(cur settings.Settings) {
	if s.speaker == nil {
		return
	}
	s.speaker.Configure(tts.NewRemote(cur.TTSURL, cur.TTSModel, cur.TTSAPIKey, cur.TTSVoice))
}

func (s *Server) handleTTSStatus(w http.ResponseWriter, r *http.Request) {
	cur := s.settings.Get()
	out := ttsStatus{Mode: cur.TTSEngine, Voice: cur.TTSVoice, Speed: cur.TTSSpeed, Voices: []tts.Voice{}}
	if s.speaker == nil {
		out.Detail = "speech is not available on this server"
		writeJSON(w, http.StatusOK, out)
		return
	}
	out.PiperInstalled = s.speaker.Piper() != nil
	out.RemoteConfigured = cur.TTSURL != ""
	engine := s.speaker.Engine(cur.TTSEngine)
	if engine == nil {
		switch cur.TTSEngine {
		case "off":
			out.Detail = "server speech is switched off"
		case "piper":
			out.Detail = "piper is not installed on this server"
		case "openai":
			out.Detail = "no speech server URL is set"
		default:
			out.Detail = "no speech engine: install piper or set a speech server URL"
		}
		writeJSON(w, http.StatusOK, out)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	out.Engine = engine.Name()
	out.Ready, out.Detail = engine.Ready(ctx)
	if voices, err := engine.Voices(ctx); err == nil {
		out.Voices = voices
	}
	if piper := s.speaker.Piper(); piper != nil {
		s.ttsMu.Lock()
		for id := range s.ttsDownloads {
			out.Downloading = append(out.Downloading, id)
		}
		s.ttsMu.Unlock()
	}
	writeJSON(w, http.StatusOK, out)
}

// handleTTSSpeak reads one line aloud. The audio is WAV from piper, and whatever the
// remote server sent for the rest — sniffed, since some ignore the requested format.
func (s *Server) handleTTSSpeak(w http.ResponseWriter, r *http.Request) {
	var in speakRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 64<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	if s.speaker == nil {
		writeErr(w, http.StatusServiceUnavailable, "speech is not available on this server")
		return
	}
	cur := s.settings.Get()
	req := tts.Request{Text: in.Text, Voice: cur.TTSVoice, Speed: cur.TTSSpeed}
	if in.Voice != "" {
		req.Voice = in.Voice
	}
	if in.Speed > 0 {
		req.Speed = in.Speed
	}
	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()
	audio, err := s.speaker.Speak(ctx, cur.TTSEngine, req)
	if err != nil {
		if errors.Is(err, tts.ErrNoEngine) {
			writeErr(w, http.StatusServiceUnavailable, "no speech engine is available")
			return
		}
		s.log.Warn("tts", "err", err)
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	w.Header().Set("Content-Type", sniffAudio(audio))
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.Header().Set("Content-Length", strconv.Itoa(len(audio)))
	_, _ = w.Write(audio)
}

func sniffAudio(b []byte) string {
	switch {
	case bytes.HasPrefix(b, []byte("RIFF")):
		return "audio/wav"
	case bytes.HasPrefix(b, []byte("ID3")), len(b) > 1 && b[0] == 0xFF && b[1]&0xE0 == 0xE0:
		return "audio/mpeg"
	case bytes.HasPrefix(b, []byte("OggS")):
		return "audio/ogg"
	case bytes.HasPrefix(b, []byte("fLaC")):
		return "audio/flac"
	default:
		return "application/octet-stream"
	}
}

// voiceRequest names a piper voice to download.
type voiceRequest struct {
	ID string `json:"id"`
}

// handleTTSDownloadVoice fetches a piper voice in the background and returns at
// once; status lists it as downloading until it is installed. Admin-only, since it
// is a sixty-megabyte download onto the config volume.
func (s *Server) handleTTSDownloadVoice(w http.ResponseWriter, r *http.Request) {
	var in voiceRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	in.ID = strings.TrimSpace(in.ID)
	if s.speaker == nil || s.speaker.Piper() == nil {
		writeErr(w, http.StatusConflict, "piper is not installed on this server")
		return
	}
	piper := s.speaker.Piper()
	s.ttsMu.Lock()
	if s.ttsDownloads == nil {
		s.ttsDownloads = map[string]bool{}
	}
	if s.ttsDownloads[in.ID] {
		s.ttsMu.Unlock()
		writeJSON(w, http.StatusAccepted, map[string]any{"downloading": in.ID})
		return
	}
	s.ttsDownloads[in.ID] = true
	s.ttsMu.Unlock()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()
		if err := piper.Download(ctx, in.ID); err != nil {
			s.log.Warn("tts: voice download", "voice", in.ID, "err", err)
			s.ttsMu.Lock()
			s.ttsErrors[in.ID] = err.Error()
			s.ttsMu.Unlock()
		} else {
			s.log.Info("tts: voice installed", "voice", in.ID)
		}
		s.ttsMu.Lock()
		delete(s.ttsDownloads, in.ID)
		s.ttsMu.Unlock()
	}()
	writeJSON(w, http.StatusAccepted, map[string]any{"downloading": in.ID})
}

// handleTTSVoiceErrors reports the last failure per voice, so a download that died
// is not just a voice that never appears.
func (s *Server) handleTTSVoiceErrors(w http.ResponseWriter, r *http.Request) {
	s.ttsMu.Lock()
	out := make(map[string]string, len(s.ttsErrors))
	for id, msg := range s.ttsErrors {
		out[id] = msg
	}
	s.ttsMu.Unlock()
	writeJSON(w, http.StatusOK, out)
}

// handleTTSDeleteVoice removes a downloaded voice. Admin-only.
func (s *Server) handleTTSDeleteVoice(w http.ResponseWriter, r *http.Request) {
	if s.speaker == nil || s.speaker.Piper() == nil {
		writeErr(w, http.StatusConflict, "piper is not installed on this server")
		return
	}
	if err := s.speaker.Piper().Delete(r.PathValue("id")); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": r.PathValue("id")})
}
