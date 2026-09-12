package tts

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// What reaches the synthesiser is the words: markup, tags and emoji are gone, actions
// stay, and line breaks read as pauses.
func TestCleanForSpeech(t *testing.T) {
	cases := map[string]string{
		"*leans in* \"You kept it?\" **Good.** [mood: smug 3]":      "leans in \"You kept it?\" Good.",
		"Try [Summer at the Coast](/media/12) tonight ~~or not~~ 🙂": "Try Summer at the Coast tonight or not",
		"line one\nline two":  "line one. line two",
		"code `x` here":       "code x here",
		"   ":                 "",
		"# heading\n> quoted": "heading. quoted",
	}
	for in, want := range cases {
		if got := CleanForSpeech(in); got != want {
			t.Errorf("CleanForSpeech(%q) = %q, want %q", in, got, want)
		}
	}
}

// The remote engine speaks the OpenAI shape and reports the voices a Kokoro-style
// server lists; the speaker caches a line so the second ask never reaches it.
func TestRemoteSpeakAndCache(t *testing.T) {
	var calls int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/audio/voices":
			w.Write([]byte(`{"voices":["af_bella","am_adam"]}`))
		case "/v1/audio/speech":
			calls++
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			if body["input"] != "Hello there." || body["voice"] != "af_bella" || body["response_format"] != "wav" || r.Header.Get("Authorization") != "Bearer k" {
				t.Errorf("request = %v, auth %q", body, r.Header.Get("Authorization"))
			}
			w.Write(append(wavHeader(4, 22050), 0, 0, 0, 0))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	remote := NewRemote(srv.URL+"/v1", "", "k", "af_bella")
	voices, err := remote.Voices(context.Background())
	if err != nil || len(voices) != 2 || voices[0].ID != "af_bella" {
		t.Fatalf("voices = %+v, %v", voices, err)
	}
	speaker := NewSpeaker(nil, remote)
	if engine := speaker.Engine("auto"); engine == nil || engine.Name() != "openai" {
		t.Fatal("auto should pick the remote engine when there is no piper")
	}
	if speaker.Engine("piper") != nil || speaker.Engine("off") != nil {
		t.Fatal("piper and off must not resolve to the remote engine")
	}
	for i := 0; i < 2; i++ {
		audio, err := speaker.Speak(context.Background(), "auto", Request{Text: "**Hello** there. [mood: happy]"})
		if err != nil || !bytes.HasPrefix(audio, []byte("RIFF")) {
			t.Fatalf("speak: %v, %d bytes", err, len(audio))
		}
	}
	if calls != 1 {
		t.Fatalf("the server was asked %d times; the second should have come from the cache", calls)
	}
	if _, err := NewSpeaker(nil, nil).Speak(context.Background(), "auto", Request{Text: "x"}); err != ErrNoEngine {
		t.Fatalf("no engine: %v", err)
	}
}

// Voice ids resolve to their place in the piper-voices repository.
func TestVoiceURL(t *testing.T) {
	got, err := voiceURL("en_US-hfc_female-medium")
	if err != nil || got != "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx" {
		t.Fatalf("voiceURL = %q, %v", got, err)
	}
	if _, err := voiceURL("../etc/passwd"); err == nil {
		t.Fatal("a path was accepted as a voice id")
	}
}

// Piper itself, when the binary and a voice are on this machine (OPPAI_TEST_PIPER
// and OPPAI_TEST_PIPER_VOICES): a line comes back as playable WAV at the voice's
// sample rate, and a missing voice falls back to an installed one.
func TestPiperSpeak(t *testing.T) {
	bin, voices := os.Getenv("OPPAI_TEST_PIPER"), os.Getenv("OPPAI_TEST_PIPER_VOICES")
	if bin == "" || voices == "" {
		t.Skip("set OPPAI_TEST_PIPER and OPPAI_TEST_PIPER_VOICES to run against a real piper")
	}
	p := FindPiper(bin, voices, filepath.Join(t.TempDir(), "none"))
	if p == nil {
		t.Fatalf("piper not found at %s", bin)
	}
	if ready, detail := p.Ready(context.Background()); !ready {
		t.Fatalf("not ready: %s", detail)
	}
	list, _ := p.Voices(context.Background())
	installed := 0
	for _, v := range list {
		if v.Installed {
			installed++
		}
	}
	if installed == 0 {
		t.Fatal("no voice reported installed")
	}
	audio, err := p.Speak(context.Background(), Request{Text: "Saved to your library. Nice pick.", Voice: "en_US-nonexistent-medium", Speed: 1.1})
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(audio, []byte("RIFF")) || len(audio) < 44+20000 {
		t.Fatalf("audio = %d bytes", len(audio))
	}
}
