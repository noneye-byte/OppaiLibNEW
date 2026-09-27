package tts

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
)

// Kokoro is the natural voice.
//
// Piper was chosen for being light, and it is: but it is a voice that reads, even and
// a little flat, and next to a person on a call it sounds like a system. Kokoro-82M is
// the smallest model that stops sounding like one — its voices breathe, lift a
// question, and slow into the end of a sentence — and it runs on the CPU through the
// ONNX Runtime the image already carries for the tagger, so it costs no Python, no
// GPU and no second service. What it does cost is time: a sentence takes a few times
// longer than piper's, still well inside the time it takes to say.
//
// The model is kept loaded once it has spoken (unlike piper's process per line): a
// session is a few hundred milliseconds to build and a hundred-odd megabytes to keep,
// and paying the first on every line would undo the point.
//
// Two things must be on the box: the model and its voice packs (baked into the image
// under /opt/oppailib/kokoro), and espeak-ng, which turns text into the phonemes the
// model reads (kokoro_text.go). Without either, or in a build without ONNX Runtime,
// there is no Kokoro and piper speaks as before.
type Kokoro struct {
	// Dir holds model.onnx and voices/*.bin.
	Dir string
	// Default is the voice used when a request names none, or names one that is not
	// a Kokoro voice (a piper id left in the settings from before).
	Default string

	espeak *espeak

	loadOnce sync.Once
	runner   kokoroRunner
	loadErr  error
	// run serialises passes through the model: one pass already uses every thread
	// it is given, and two at once only make both slower.
	run sync.Mutex

	packsMu sync.Mutex
	packs   map[string][]float32
}

// kokoroRunner is one pass through the network: phoneme ids (pads included), the
// style row, the speed, and the samples back.
type kokoroRunner interface {
	Run(ids []int64, style []float32, speed float32) ([]float32, error)
}

// DefaultKokoroVoice is af_heart, the voice Kokoro's own card grades best: warm, close,
// and the least like a narrator of any of them.
const DefaultKokoroVoice = "af_heart"

// kokoroVoiceID is a voice pack's name: language and gender, underscore, name.
var kokoroVoiceID = regexp.MustCompile(`^[a-z]{2}_[a-z0-9]+$`)

// KokoroCatalogue is the English voices, best first by Kokoro's own grading. Only the
// ones whose packs are in the voice directory are offered; the image bakes these.
var KokoroCatalogue = []Voice{
	{ID: "af_heart", Label: "Heart — warm, natural (default)", Language: "en-US"},
	{ID: "af_bella", Label: "Bella — bright, lively", Language: "en-US"},
	{ID: "af_nicole", Label: "Nicole — soft, breathy, close", Language: "en-US"},
	{ID: "af_aoede", Label: "Aoede — easy, relaxed", Language: "en-US"},
	{ID: "af_kore", Label: "Kore — clear, steady", Language: "en-US"},
	{ID: "af_sarah", Label: "Sarah — gentle, a little husky", Language: "en-US"},
	{ID: "af_nova", Label: "Nova — crisp", Language: "en-US"},
	{ID: "af_sky", Label: "Sky — light, young", Language: "en-US"},
	{ID: "bf_emma", Label: "Emma — British, warm", Language: "en-GB"},
	{ID: "bf_isabella", Label: "Isabella — British, soft", Language: "en-GB"},
}

// FindKokoro returns the engine when this build can run it and the box has what it
// needs: the model, at least one voice, and espeak-ng. Nil otherwise.
func FindKokoro(dir, espeakPath string) *Kokoro {
	if !kokoroRuntime || dir == "" {
		return nil
	}
	if _, err := os.Stat(filepath.Join(dir, "model.onnx")); err != nil {
		return nil
	}
	e := findEspeak(espeakPath)
	if e == nil {
		return nil
	}
	k := &Kokoro{Dir: dir, Default: DefaultKokoroVoice, espeak: e, packs: map[string][]float32{}}
	if len(k.installed()) == 0 {
		return nil
	}
	return k
}

func (k *Kokoro) Name() string { return "kokoro" }

// Ready reports whether the model loads. The first call pays for loading it, which is
// what a status check before the first line should do anyway.
func (k *Kokoro) Ready(ctx context.Context) (bool, string) {
	if k == nil {
		return false, "Kokoro is not installed"
	}
	if _, err := k.load(); err != nil {
		return false, "Kokoro's model would not load: " + err.Error()
	}
	return true, ""
}

// installed lists the voice packs on disk, by id.
func (k *Kokoro) installed() map[string]bool {
	out := map[string]bool{}
	entries, err := os.ReadDir(filepath.Join(k.Dir, "voices"))
	if err != nil {
		return out
	}
	for _, e := range entries {
		if id, ok := strings.CutSuffix(e.Name(), ".bin"); ok && !e.IsDir() && kokoroVoiceID.MatchString(id) {
			out[id] = true
		}
	}
	return out
}

// Voices lists the catalogue voices that are installed, then any other pack dropped
// into the directory.
func (k *Kokoro) Voices(ctx context.Context) ([]Voice, error) {
	have := k.installed()
	var out []Voice
	for _, v := range KokoroCatalogue {
		if have[v.ID] {
			v.Installed, v.Bundled = true, true
			out = append(out, v)
			delete(have, v.ID)
		}
	}
	extra := make([]string, 0, len(have))
	for id := range have {
		extra = append(extra, id)
	}
	sort.Strings(extra)
	for _, id := range extra {
		out = append(out, Voice{ID: id, Label: id, Installed: true, Bundled: true})
	}
	return out, nil
}

// voiceFor is the voice to read with: the one asked for when it is installed, the
// default when that is, and any installed one otherwise.
func (k *Kokoro) voiceFor(id string) string {
	have := k.installed()
	switch {
	case have[id]:
		return id
	case have[k.Default]:
		return k.Default
	}
	for _, v := range KokoroCatalogue {
		if have[v.ID] {
			return v.ID
		}
	}
	for id := range have {
		return id
	}
	return ""
}

func (k *Kokoro) pack(id string) ([]float32, error) {
	k.packsMu.Lock()
	defer k.packsMu.Unlock()
	if p, ok := k.packs[id]; ok {
		return p, nil
	}
	raw, err := os.ReadFile(filepath.Join(k.Dir, "voices", id+".bin"))
	if err != nil {
		return nil, err
	}
	p, err := kokoroVoicePack(raw)
	if err != nil {
		return nil, err
	}
	k.packs[id] = p
	return p, nil
}

func (k *Kokoro) load() (kokoroRunner, error) {
	k.loadOnce.Do(func() {
		k.runner, k.loadErr = newKokoroRunner(filepath.Join(k.Dir, "model.onnx"))
	})
	return k.runner, k.loadErr
}

// Speak reads a line: cut into runs of whole sentences, each phonemised and passed
// through the model, joined by the pause the heat asks for.
func (k *Kokoro) Speak(ctx context.Context, req Request) ([]byte, error) {
	if k == nil {
		return nil, ErrNoEngine
	}
	return k.speakWith(ctx, req, nil)
}

// speakWith is Speak with the phonemiser given, for a test; nil is espeak-ng in the
// voice's accent.
func (k *Kokoro) speakWith(ctx context.Context, req Request, phonemes func(context.Context, string) (string, error)) ([]byte, error) {
	voice := k.voiceFor(req.Voice)
	if voice == "" {
		return nil, errors.New("no Kokoro voice is installed")
	}
	pack, err := k.pack(voice)
	if err != nil {
		return nil, err
	}
	runner, err := k.load()
	if err != nil {
		return nil, err
	}
	speed := kokoroHeatSpeed(req.Heat)
	if req.Speed > 0 {
		speed *= req.Speed
	}
	// A British voice reads with British phonemes; the American ones with American.
	american := !strings.HasPrefix(voice, "b")
	lang := "en-us"
	if !american {
		lang = "en-gb"
	}
	if phonemes == nil {
		phonemes = func(ctx context.Context, text string) (string, error) {
			return k.espeak.phonemes(ctx, text, lang)
		}
	}
	gap := make([]float32, int(HeatDelivery(req.Heat).SentenceSilence*kokoroSampleRate))
	var samples []float32
	for _, chunk := range kokoroChunks(req.Text) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		ps, err := kokoroPhonemize(ctx, chunk, american, phonemes)
		if err != nil {
			return nil, err
		}
		ids := kokoroTokens(ps)
		if len(ids) == 0 {
			continue
		}
		input := make([]int64, 0, len(ids)+2)
		input = append(append(append(input, 0), ids...), 0)
		k.run.Lock()
		out, err := runner.Run(input, kokoroStyle(pack, len(ids)), float32(speed))
		k.run.Unlock()
		if err != nil {
			return nil, err
		}
		if len(samples) > 0 {
			samples = append(samples, gap...)
		}
		samples = append(samples, out...)
	}
	if len(samples) == 0 {
		return nil, errors.New("Kokoro produced no audio")
	}
	pcm := pcm16(samples)
	return append(wavHeader(len(pcm), kokoroSampleRate), pcm...), nil
}
