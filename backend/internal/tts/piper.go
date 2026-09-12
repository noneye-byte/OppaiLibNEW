package tts

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	bracketTag  = regexp.MustCompile(`\[[^\]\n]{0,200}\]`)
	mdLink      = regexp.MustCompile(`\[([^\]\n]{1,200})\]\([^)\n]{0,400}\)`)
	fencedCode  = regexp.MustCompile("(?s)```.*?```")
	inlineCode  = regexp.MustCompile("`([^`\n]{0,200})`")
	headingMark = regexp.MustCompile(`(?m)^#{1,6}\s+`)
	quoteMark   = regexp.MustCompile(`(?m)^>\s?`)
	doubleStop  = regexp.MustCompile(`([.!?…])\s*\.\s+`)
)

// Piper runs the piper binary.
//
// One process per line rather than a resident one: piper's own CLI reads lines from
// stdin and writes them out, but with raw output there is no boundary between
// utterances on the stream, and with file output there is a file to clean up per
// line. Loading a medium voice costs a quarter of a second, which a chat reply
// absorbs without anyone noticing; if it ever matters the process can be kept warm
// behind the same interface.
type Piper struct {
	// Binary is the piper executable.
	Binary string
	// VoiceDir is where downloaded voices live, writable.
	VoiceDir string
	// BundledDir is where the image bakes its default voice; read-only, may not exist.
	BundledDir string
	// Default is the voice used when a request names none, when installed.
	Default string

	downloads sync.Mutex
	// active is what is being downloaded right now, so a second request for the
	// same voice waits rather than downloading it twice.
	active map[string]*download
}

// download is one voice fetch in progress.
type download struct {
	done chan struct{}
	err  error
}

// FindPiper locates the binary: the configured path, then the places the image
// puts it, then PATH. Nil when there is none — the box simply has no local voice.
func FindPiper(configured, voiceDir, bundledDir string) *Piper {
	candidates := []string{}
	if configured != "" {
		candidates = append(candidates, configured)
	}
	candidates = append(candidates, "/opt/piper/piper", "/usr/local/bin/piper", "/usr/bin/piper")
	if runtime.GOOS == "windows" {
		candidates = append(candidates, "piper.exe")
	}
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && !info.IsDir() {
			return &Piper{Binary: c, VoiceDir: voiceDir, BundledDir: bundledDir, Default: DefaultVoice, active: map[string]*download{}}
		}
	}
	if path, err := exec.LookPath("piper"); err == nil {
		return &Piper{Binary: path, VoiceDir: voiceDir, BundledDir: bundledDir, Default: DefaultVoice, active: map[string]*download{}}
	}
	return nil
}

func (p *Piper) Name() string { return "piper" }

// Ready reports whether there is a binary and at least one voice.
func (p *Piper) Ready(ctx context.Context) (bool, string) {
	if p == nil {
		return false, "piper is not installed"
	}
	if !p.HasVoices() {
		return false, "no voice is installed — download one in Settings → Libby's voice"
	}
	return true, ""
}

// HasVoices reports whether any voice is on disk.
func (p *Piper) HasVoices() bool {
	if p == nil {
		return false
	}
	for _, dir := range []string{p.VoiceDir, p.BundledDir} {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if strings.HasSuffix(e.Name(), ".onnx") && !e.IsDir() {
				if _, err := os.Stat(filepath.Join(dir, e.Name()+".json")); err == nil {
					return true
				}
			}
		}
	}
	return false
}

// voicePath finds the .onnx for a voice id, downloaded first then bundled.
func (p *Piper) voicePath(id string) (string, bool) {
	if !voiceIDPattern.MatchString(id) {
		return "", false
	}
	for _, dir := range []string{p.VoiceDir, p.BundledDir} {
		path := filepath.Join(dir, id+".onnx")
		if _, err := os.Stat(path); err != nil {
			continue
		}
		if _, err := os.Stat(path + ".json"); err != nil {
			continue
		}
		return path, true
	}
	return "", false
}

// Voices lists the catalogue with what is installed marked, plus any installed voice
// the catalogue does not know.
func (p *Piper) Voices(ctx context.Context) ([]Voice, error) {
	out := make([]Voice, 0, len(Catalogue)+4)
	seen := map[string]bool{}
	for _, v := range Catalogue {
		voice := v
		if path, ok := p.voicePath(v.ID); ok {
			voice.Installed = true
			voice.Bundled = p.BundledDir != "" && strings.HasPrefix(path, filepath.Clean(p.BundledDir))
		}
		seen[v.ID] = true
		out = append(out, voice)
	}
	for _, dir := range []string{p.VoiceDir, p.BundledDir} {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			id := strings.TrimSuffix(e.Name(), ".onnx")
			if id == e.Name() || seen[id] || !voiceIDPattern.MatchString(id) {
				continue
			}
			if _, err := os.Stat(filepath.Join(dir, e.Name()+".json")); err != nil {
				continue
			}
			seen[id] = true
			out = append(out, Voice{ID: id, Label: id, Installed: true, Bundled: dir == p.BundledDir, Quality: qualityOf(id), Language: languageOf(id)})
		}
	}
	sort.SliceStable(out, func(a, b int) bool {
		if out[a].Installed != out[b].Installed {
			return out[a].Installed
		}
		return false
	})
	return out, nil
}

// piperConfig is the slice of a voice's .onnx.json this reads.
type piperConfig struct {
	Audio struct {
		SampleRate int `json:"sample_rate"`
	} `json:"audio"`
	NumSpeakers int `json:"num_speakers"`
}

// Speak runs piper on one line and returns WAV.
func (p *Piper) Speak(ctx context.Context, req Request) ([]byte, error) {
	if p == nil {
		return nil, ErrNoEngine
	}
	id := req.Voice
	if id == "" {
		id = p.Default
	}
	path, ok := p.voicePath(id)
	if !ok {
		// The named voice is missing: fall back to whatever is installed rather
		// than staying silent over a preference.
		voices, _ := p.Voices(ctx)
		for _, v := range voices {
			if v.Installed {
				path, ok = p.voicePath(v.ID)
				if ok {
					break
				}
			}
		}
		if !ok {
			return nil, errors.New("no voice is installed")
		}
	}
	raw, err := os.ReadFile(path + ".json")
	if err != nil {
		return nil, err
	}
	var cfg piperConfig
	if err := json.Unmarshal(raw, &cfg); err != nil || cfg.Audio.SampleRate <= 0 {
		return nil, fmt.Errorf("voice config is unreadable: %s", filepath.Base(path))
	}
	lengthScale := 1.0
	if req.Speed > 0 {
		lengthScale = 1 / req.Speed
	}
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, p.Binary,
		"--model", path,
		"--output-raw",
		"--length_scale", strconv.FormatFloat(lengthScale, 'f', 2, 64),
		"--sentence_silence", "0.25",
	)
	// The bundled espeak-ng-data sits beside the binary; piper looks there by
	// default, but only when run from that directory on some builds.
	cmd.Dir = filepath.Dir(p.Binary)
	cmd.Stdin = strings.NewReader(req.Text + "\n")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if len(msg) > 300 {
			msg = msg[len(msg)-300:]
		}
		return nil, fmt.Errorf("piper failed: %v: %s", err, msg)
	}
	pcm := stdout.Bytes()
	if len(pcm) < 2 {
		return nil, errors.New("piper produced no audio")
	}
	out := make([]byte, 0, 44+len(pcm))
	out = append(out, wavHeader(len(pcm), cfg.Audio.SampleRate)...)
	return append(out, pcm...), nil
}

// ── voices ──────────────────────────────────────────────────────────────────

// DefaultVoice is what she sounds like out of the box. hfc_female is the most
// natural of the medium English voices in piper's set — a warm, even register that
// suits reading a chat line — and medium is the tier where quality stops improving
// faster than the model grows.
const DefaultVoice = "en_US-hfc_female-medium"

// voiceIDPattern is a piper voice id: locale-name-quality.
var voiceIDPattern = regexp.MustCompile(`^[a-z]{2,3}_[A-Z]{2}-[A-Za-z0-9_]+-(?:x_low|low|medium|high)$`)

// Catalogue is the voices offered for download: a curated handful of English voices
// from rhasspy/piper-voices, chosen to sound like a person reading rather than a
// system announcement. Anything else piper publishes can still be dropped into the
// voice directory by hand and is listed alongside.
var Catalogue = []Voice{
	{ID: "en_US-hfc_female-medium", Label: "HFC Female — warm, natural (default)", Language: "en-US", Quality: "medium", Bytes: 63_201_294},
	{ID: "en_US-amy-medium", Label: "Amy — clear, friendly", Language: "en-US", Quality: "medium", Bytes: 63_201_294},
	{ID: "en_US-kristin-medium", Label: "Kristin — soft, low", Language: "en-US", Quality: "medium", Bytes: 63_201_294},
	{ID: "en_US-ljspeech-high", Label: "LJSpeech — bright, high quality (slower)", Language: "en-US", Quality: "high", Bytes: 114_000_000},
	{ID: "en_US-lessac-medium", Label: "Lessac — measured, neutral", Language: "en-US", Quality: "medium", Bytes: 63_201_294},
	{ID: "en_GB-jenny_dioco-medium", Label: "Jenny — British, gentle", Language: "en-GB", Quality: "medium", Bytes: 63_201_294},
	{ID: "en_GB-southern_english_female-low", Label: "Southern English Female — light, quick", Language: "en-GB", Quality: "low", Bytes: 20_000_000},
	{ID: "en_US-amy-low", Label: "Amy — light, quick", Language: "en-US", Quality: "low", Bytes: 20_000_000},
}

// voiceURL is where a voice lives on Hugging Face: piper-voices lays them out as
// <family>/<locale>/<name>/<quality>/<id>.onnx.
func voiceURL(id string) (string, error) {
	if !voiceIDPattern.MatchString(id) {
		return "", fmt.Errorf("not a piper voice id: %q", id)
	}
	// en_US-hfc_female-medium → locale en_US, name hfc_female, quality medium.
	first := strings.Index(id, "-")
	last := strings.LastIndex(id, "-")
	locale, name, quality := id[:first], id[first+1:last], id[last+1:]
	family := strings.SplitN(locale, "_", 2)[0]
	return fmt.Sprintf("https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/%s/%s/%s/%s/%s.onnx", family, locale, name, quality, id), nil
}

func qualityOf(id string) string  { return id[strings.LastIndex(id, "-")+1:] }
func languageOf(id string) string { return strings.ReplaceAll(strings.SplitN(id, "-", 2)[0], "_", "-") }

// Download fetches a voice into VoiceDir. Concurrent requests for the same voice
// share one fetch; a second voice downloads beside the first. The model is written
// to a temp file and renamed only once it is complete and its config has been read,
// so a dropped connection never leaves a half-voice that fails at first use.
func (p *Piper) Download(ctx context.Context, id string) error {
	if p == nil {
		return ErrNoEngine
	}
	if _, ok := p.voicePath(id); ok {
		return nil
	}
	src, err := voiceURL(id)
	if err != nil {
		return err
	}
	p.downloads.Lock()
	if d, ok := p.active[id]; ok {
		p.downloads.Unlock()
		select {
		case <-d.done:
			return d.err
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	d := &download{done: make(chan struct{})}
	p.active[id] = d
	p.downloads.Unlock()
	defer func() {
		p.downloads.Lock()
		delete(p.active, id)
		p.downloads.Unlock()
		close(d.done)
	}()

	d.err = p.fetchVoice(ctx, id, src)
	return d.err
}

func (p *Piper) fetchVoice(ctx context.Context, id, src string) error {
	if err := os.MkdirAll(p.VoiceDir, 0o755); err != nil {
		return err
	}
	// The config first: it is small, and its sample rate is what proves the model
	// file that follows is a voice at all.
	cfgRaw, err := fetch(ctx, src+".json", 1<<20)
	if err != nil {
		return fmt.Errorf("voice config: %w", err)
	}
	var cfg piperConfig
	if json.Unmarshal(cfgRaw, &cfg) != nil || cfg.Audio.SampleRate <= 0 {
		return errors.New("the voice's config is not a piper voice")
	}
	tmp, err := os.CreateTemp(p.VoiceDir, id+"-*.part")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, src, nil)
	if err != nil {
		tmp.Close()
		return err
	}
	resp, err := (&http.Client{Timeout: 30 * time.Minute}).Do(req)
	if err != nil {
		tmp.Close()
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		tmp.Close()
		return fmt.Errorf("voice download returned HTTP %d", resp.StatusCode)
	}
	n, err := io.Copy(tmp, resp.Body)
	if closeErr := tmp.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	if n < 1<<20 {
		return errors.New("the voice download was truncated")
	}
	if err := os.WriteFile(filepath.Join(p.VoiceDir, id+".onnx.json"), cfgRaw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmpName, filepath.Join(p.VoiceDir, id+".onnx"))
}

// Delete removes a downloaded voice. Bundled voices cannot be deleted.
func (p *Piper) Delete(id string) error {
	if p == nil || !voiceIDPattern.MatchString(id) {
		return errors.New("no such voice")
	}
	path := filepath.Join(p.VoiceDir, id+".onnx")
	if _, err := os.Stat(path); err != nil {
		return errors.New("that voice is not one you downloaded")
	}
	_ = os.Remove(path + ".json")
	return os.Remove(path)
}

func fetch(ctx context.Context, u string, limit int64) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	resp, err := (&http.Client{Timeout: 2 * time.Minute}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, limit))
}
