// Package tts gives Libby a voice.
//
// Two engines, one interface. Piper is the one this exists for: a small VITS model
// per voice (twenty to sixty megabytes), synthesised by a single C++ binary on the
// CPU faster than the words would be spoken — a sentence takes a tenth of a second
// of inference and a quarter of a second to load the voice. It needs no GPU, no
// Python and no service to keep running, so the Docker image simply carries the
// binary and one voice, and a box that already runs the library can speak without
// being asked for anything else. The other engine is any OpenAI-compatible speech
// server (/v1/audio/speech — Kokoro-FastAPI, openedai-speech), for someone who
// already runs one and prefers its voices.
//
// Both produce WAV. The clients play it and cache nothing; the server keeps a small
// in-memory cache keyed on the text and the voice, because the same line — a
// greeting, a reaction — is asked for more than once and synthesis, while quick, is
// not free.
//
// Nothing here reaches a cloud service. Piper runs in-process on this box; the
// remote engine goes only where the operator pointed it.
package tts

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

// Voice is one voice a client may pick.
type Voice struct {
	// ID is what a client sends back: a piper voice id such as en_US-amy-medium, or
	// the remote server's voice name.
	ID string `json:"id"`
	// Label is what a person reads.
	Label string `json:"label"`
	// Language is the BCP-47-ish code the voice speaks, when known.
	Language string `json:"language,omitempty"`
	// Installed says the voice's files are on disk (piper) — a catalogue entry that
	// is not installed can be downloaded.
	Installed bool `json:"installed"`
	// Bundled marks the voice shipped in the image: installed, and not deletable.
	Bundled bool `json:"bundled,omitempty"`
	// Quality is piper's tier: x_low, low, medium, high.
	Quality string `json:"quality,omitempty"`
	// Bytes is the download size, when known.
	Bytes int64 `json:"bytes,omitempty"`
}

// Request is one line to speak.
type Request struct {
	Text string
	// Voice is a Voice.ID; blank means the engine's default.
	Voice string
	// Speed is a multiplier on the pace, 1 being the voice's own; 0.5–2.
	Speed float64
}

// Engine turns a line into audio.
type Engine interface {
	// Name is the engine's id: "piper" or "openai".
	Name() string
	// Ready reports whether the engine can speak right now, and if not, why.
	Ready(ctx context.Context) (bool, string)
	// Voices lists what can be picked.
	Voices(ctx context.Context) ([]Voice, error)
	// Speak synthesises one line as WAV.
	Speak(ctx context.Context, req Request) ([]byte, error)
}

// ErrNoEngine is returned when nothing is configured to speak.
var ErrNoEngine = errors.New("no speech engine is available")

// maxTextLen bounds one request. A reply is a few sentences; a whole essay through
// piper is minutes of CPU and tens of megabytes of WAV.
const maxTextLen = 2000

// cacheMax bounds the in-memory audio cache. At a few hundred kilobytes a line this
// is tens of megabytes, on a box already running a language model.
const cacheMax = 64

// Speaker is the front door: it picks the engine per the settings and caches.
type Speaker struct {
	piper  *Piper
	remote *Remote

	mu    sync.Mutex
	cache map[string]cacheEntry
	order []string
}

type cacheEntry struct {
	audio []byte
	at    time.Time
}

// NewSpeaker builds the front door. piper may be nil (binary not found) and remote
// may be nil (no URL); a Speaker with neither answers ErrNoEngine.
func NewSpeaker(piper *Piper, remote *Remote) *Speaker {
	return &Speaker{piper: piper, remote: remote, cache: map[string]cacheEntry{}}
}

// Configure swaps the remote engine, for a settings change at runtime.
func (s *Speaker) Configure(remote *Remote) {
	s.mu.Lock()
	s.remote = remote
	s.cache = map[string]cacheEntry{}
	s.order = nil
	s.mu.Unlock()
}

// Piper returns the local engine, or nil.
func (s *Speaker) Piper() *Piper { return s.piper }

// Engine picks the engine for a mode: "auto", "piper", "openai" or "off".
func (s *Speaker) Engine(mode string) Engine {
	s.mu.Lock()
	remote := s.remote
	s.mu.Unlock()
	switch mode {
	case "off":
		return nil
	case "piper":
		if s.piper != nil {
			return s.piper
		}
		return nil
	case "openai":
		if remote != nil {
			return remote
		}
		return nil
	default:
		if s.piper != nil && s.piper.HasVoices() {
			return s.piper
		}
		if remote != nil {
			return remote
		}
		if s.piper != nil {
			return s.piper
		}
		return nil
	}
}

// Speak synthesises through the engine for mode, from the cache when it can.
func (s *Speaker) Speak(ctx context.Context, mode string, req Request) ([]byte, error) {
	engine := s.Engine(mode)
	if engine == nil {
		return nil, ErrNoEngine
	}
	req.Text = CleanForSpeech(req.Text)
	if req.Text == "" {
		return nil, errors.New("nothing to say")
	}
	if len(req.Text) > maxTextLen {
		req.Text = req.Text[:maxTextLen]
	}
	if req.Speed <= 0 {
		req.Speed = 1
	}
	key := cacheKey(engine.Name(), req)
	s.mu.Lock()
	if entry, ok := s.cache[key]; ok {
		s.mu.Unlock()
		return entry.audio, nil
	}
	s.mu.Unlock()

	audio, err := engine.Speak(ctx, req)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	if _, ok := s.cache[key]; !ok {
		s.cache[key] = cacheEntry{audio: audio, at: time.Now()}
		s.order = append(s.order, key)
		for len(s.order) > cacheMax {
			delete(s.cache, s.order[0])
			s.order = s.order[1:]
		}
	}
	s.mu.Unlock()
	return audio, nil
}

func cacheKey(engine string, req Request) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s\x00%s\x00%.2f\x00%s", engine, req.Voice, req.Speed, req.Text)))
	return hex.EncodeToString(sum[:])
}

// CleanForSpeech reduces a chat line to what should be read aloud.
//
// Her replies are written for a screen: *actions in asterisks*, **emphasis**,
// "quoted speech", markdown links, the odd code span, and — before the server strips
// them — protocol tags in square brackets. Read literally, a screen reader says
// "asterisk asterisk" and a synthesiser says nothing useful about a bracket. The
// actions are kept, since she narrates them in the first person and they are hers;
// the markup around them goes.
func CleanForSpeech(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	// Markdown links keep their text — before the bracket pass, which would
	// otherwise eat the text and leave the address.
	text = mdLink.ReplaceAllString(text, "$1")
	// Protocol tags and stage directions in square brackets: dropped whole.
	text = bracketTag.ReplaceAllString(text, " ")
	// Fenced and inline code: the contents are rarely words.
	text = fencedCode.ReplaceAllString(text, " ")
	text = inlineCode.ReplaceAllString(text, "$1")
	// Emphasis and strike markers, headings, blockquotes.
	text = strings.NewReplacer("**", "", "__", "", "~~", "", "*", "", "_ ", " ", " _", " ").Replace(text)
	text = headingMark.ReplaceAllString(text, "")
	text = quoteMark.ReplaceAllString(text, "")
	// Emoji and symbols the voices spell out.
	text = strings.Map(func(r rune) rune {
		if r >= 0x1F000 || (r >= 0x2600 && r <= 0x27BF) {
			return -1
		}
		return r
	}, text)
	// Collapse whitespace; keep line breaks as sentence breaks.
	var b strings.Builder
	lastSpace := false
	for _, r := range text {
		switch {
		case r == '\n':
			b.WriteString(". ")
			lastSpace = true
		case r == ' ' || r == '\t' || r == '\r':
			if !lastSpace {
				b.WriteByte(' ')
			}
			lastSpace = true
		default:
			b.WriteRune(r)
			lastSpace = false
		}
	}
	out := strings.TrimSpace(b.String())
	out = doubleStop.ReplaceAllString(out, ". ")
	return strings.TrimSpace(out)
}

// wavHeader wraps raw 16-bit mono PCM in a RIFF header.
func wavHeader(pcmLen int, sampleRate int) []byte {
	var b bytes.Buffer
	le32 := func(v uint32) { b.Write([]byte{byte(v), byte(v >> 8), byte(v >> 16), byte(v >> 24)}) }
	le16 := func(v uint16) { b.Write([]byte{byte(v), byte(v >> 8)}) }
	b.WriteString("RIFF")
	le32(uint32(36 + pcmLen))
	b.WriteString("WAVE")
	b.WriteString("fmt ")
	le32(16)
	le16(1) // PCM
	le16(1) // mono
	le32(uint32(sampleRate))
	le32(uint32(sampleRate * 2))
	le16(2)  // block align
	le16(16) // bits per sample
	b.WriteString("data")
	le32(uint32(pcmLen))
	return b.Bytes()
}
