package tts

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"math"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// Turning a line into what Kokoro reads: phonemes, then token ids, then a style.
//
// Kokoro does not read text. It reads IPA — the phonemes espeak-ng writes for a line —
// with the punctuation left in, because the punctuation is where its pauses and its
// questions come from. espeak drops punctuation, so the line is cut at it, the words
// between are phonemised, and the punctuation is put back between them verbatim. This
// is what kokoro.js and the Python phonemizer both do; doing it differently gives the
// model a shape of input it never trained on, and it answers with mumbling.
//
// All of it is pure and lives here, beside its test, so the part that needs ONNX
// Runtime is only the part that runs the network (kokoro_onnx.go).

// kokoroSampleRate is what the model writes: 24 kHz mono float.
const kokoroSampleRate = 24000

// kokoroStyleDim is one row of a voice pack: the style vector for one sequence length.
const kokoroStyleDim = 256

// kokoroMaxTokens is the most phonemes one run takes, less the two pads. A voice pack
// has a style row per length up to here.
const kokoroMaxTokens = 510

// kokoroChunkChars bounds the text of one run. English IPA runs a little longer than
// its spelling, so this keeps a run well inside kokoroMaxTokens; a reply longer than
// this is read in several runs joined by a sentence's pause.
const kokoroChunkChars = 320

var (
	kokoroPunct       = regexp.MustCompile(`(?:\s*[;:,.!?¡¿—…"«»“”(){}\[\]]+\s*)+`)
	kokoroSpaces      = regexp.MustCompile(`[^\S\n]+`)
	kokoroDoctor      = regexp.MustCompile(`\bD[Rr]\.( [A-Z])`)
	kokoroMister      = regexp.MustCompile(`\b(?:Mr\.|MR\.( [A-Z]))`)
	kokoroMiss        = regexp.MustCompile(`\b(?:Ms\.|MS\.( [A-Z]))`)
	kokoroMrs         = regexp.MustCompile(`\b(?:Mrs\.|MRS\.( [A-Z]))`)
	kokoroYeah        = regexp.MustCompile(`(?i)\b(y)eah?\b`)
	kokoroHum         = regexp.MustCompile(`(?i)\bm{2,}\b`)
	kokoroMhm         = regexp.MustCompile(`(?i)\bmhm+\b`)
	kokoroThousands   = regexp.MustCompile(`(\d),(\d)`)
	kokoroRange       = regexp.MustCompile(`(\d)-(\d)`)
	kokoroHundred     = regexp.MustCompile(`([a-zɹː])(hˈʌndɹɪd)`)
	kokoroLooseZ      = regexp.MustCompile(` z([;:,.!?¡¿—…"«»“” ]|$)`)
	kokoroNinety      = regexp.MustCompile(`(nˈaɪn)ti([^ː]|$)`)
	kokoroSentenceEnd = regexp.MustCompile(`[^.!?…]*(?:[.!?…]+["”']?\s*|$)`)
)

// kokoroNormalize is the text clean-up kokoro.js makes before phonemising: curly
// quotes straightened, whitespace collapsed, the abbreviations espeak would spell,
// and "yeah", which espeak reads as "yeh-ah". Numbers are left to espeak, which reads
// them well enough. Then her own noises: espeak spells "Mmm" and "mhm" out as letters —
// "em em em" is what the first test line said — so they become the words it can say.
func kokoroNormalize(text string) string {
	text = strings.NewReplacer("‘", "'", "’", "'", "“", `"`, "”", `"`, "、", ", ", "。", ". ", "！", "! ", "，", ", ", "：", ": ", "；", "; ", "？", "? ").Replace(text)
	text = kokoroSpaces.ReplaceAllString(text, " ")
	text = kokoroDoctor.ReplaceAllString(text, "Doctor$1")
	text = kokoroMister.ReplaceAllString(text, "Mister$1")
	text = kokoroMiss.ReplaceAllString(text, "Miss$1")
	text = kokoroMrs.ReplaceAllString(text, "Mrs$1")
	text = kokoroYeah.ReplaceAllString(text, "${1}e'a")
	text = kokoroMhm.ReplaceAllString(text, "uh huh")
	text = kokoroHum.ReplaceAllString(text, "hmm")
	text = kokoroThousands.ReplaceAllString(text, "$1$2")
	text = kokoroRange.ReplaceAllString(text, "$1 to $2")
	return strings.TrimSpace(text)
}

// kokoroSection is a run of words to phonemise, or of punctuation to keep as it is.
type kokoroSection struct {
	text  string
	punct bool
}

// kokoroSplit cuts a line at its punctuation, keeping the punctuation — and the
// spaces around it — as sections of their own.
func kokoroSplit(text string) []kokoroSection {
	var out []kokoroSection
	last := 0
	for _, loc := range kokoroPunct.FindAllStringIndex(text, -1) {
		if loc[0] > last {
			out = append(out, kokoroSection{text: text[last:loc[0]]})
		}
		out = append(out, kokoroSection{text: text[loc[0]:loc[1]], punct: true})
		last = loc[1]
	}
	if last < len(text) {
		out = append(out, kokoroSection{text: text[last:]})
	}
	return out
}

// kokoroPostProcess makes espeak's IPA into Kokoro's: the handful of symbols the two
// disagree on, and the few pronunciations kokoro.js corrects after espeak.
func kokoroPostProcess(ps string, american bool) string {
	ps = strings.NewReplacer("ʲ", "j", "r", "ɹ", "x", "k", "ɬ", "l").Replace(ps)
	ps = kokoroHundred.ReplaceAllString(ps, "$1 $2")
	ps = kokoroLooseZ.ReplaceAllString(ps, "z$1")
	if american {
		ps = kokoroNinety.ReplaceAllString(ps, "${1}di$2")
	}
	return strings.TrimSpace(ps)
}

// kokoroTokens maps phonemes to ids, dropping anything outside the vocabulary.
func kokoroTokens(ps string) []int64 {
	out := make([]int64, 0, len(ps))
	for _, r := range ps {
		if id, ok := kokoroVocab[r]; ok {
			out = append(out, id)
		}
	}
	if len(out) > kokoroMaxTokens {
		out = out[:kokoroMaxTokens]
	}
	return out
}

// kokoroChunks cuts a reply into runs of whole sentences, each short enough for one
// pass through the model. A single sentence longer than a run is cut at its last
// comma or space inside the limit, which is where a reader would breathe anyway.
func kokoroChunks(text string) []string {
	var out []string
	var cur strings.Builder
	flush := func() {
		if s := strings.TrimSpace(cur.String()); s != "" {
			out = append(out, s)
		}
		cur.Reset()
	}
	for _, sentence := range kokoroSentenceEnd.FindAllString(text, -1) {
		if strings.TrimSpace(sentence) == "" {
			continue
		}
		for len(sentence) > kokoroChunkChars {
			cut := strings.LastIndexAny(sentence[:kokoroChunkChars], ",;:—")
			if cut < kokoroChunkChars/3 {
				cut = strings.LastIndex(sentence[:kokoroChunkChars], " ")
			}
			if cut <= 0 {
				cut = kokoroChunkChars - 1
			}
			flush()
			cur.WriteString(sentence[:cut+1])
			flush()
			sentence = sentence[cut+1:]
		}
		if cur.Len()+len(sentence) > kokoroChunkChars {
			flush()
		}
		cur.WriteString(sentence)
	}
	flush()
	return out
}

// kokoroStyle is the style row a voice pack holds for a sequence of n phonemes.
func kokoroStyle(pack []float32, n int) []float32 {
	rows := len(pack) / kokoroStyleDim
	if rows == 0 {
		return nil
	}
	n = min(max(n, 0), rows-1)
	return pack[n*kokoroStyleDim : (n+1)*kokoroStyleDim]
}

// kokoroVoicePack reads a voice file: raw little-endian float32, a style row per
// sequence length.
func kokoroVoicePack(raw []byte) ([]float32, error) {
	if len(raw) == 0 || len(raw)%(4*kokoroStyleDim) != 0 {
		return nil, errors.New("not a Kokoro voice pack")
	}
	out := make([]float32, len(raw)/4)
	for i := range out {
		out[i] = math.Float32frombits(binary.LittleEndian.Uint32(raw[i*4:]))
	}
	return out, nil
}

// kokoroHeatSpeed is how fast she reads at a heat. Kokoro has no breathiness knob the
// way piper does, and none is needed — its voices already sound like a person — so the
// heat only slows her, gently, from where a line is already flirting.
func kokoroHeatSpeed(heat int) float64 {
	switch heat {
	case 3:
		return 0.96
	case 4:
		return 0.92
	case 5:
		return 0.88
	default:
		return 1
	}
}

// pcm16 turns float samples into 16-bit PCM, clipped.
func pcm16(samples []float32) []byte {
	out := make([]byte, len(samples)*2)
	for i, s := range samples {
		v := int16(math.Round(float64(min(max(s, -1), 1)) * 32767))
		binary.LittleEndian.PutUint16(out[i*2:], uint16(v))
	}
	return out
}

// ── espeak-ng ───────────────────────────────────────────────────────────────

// espeak is the phonemiser: the espeak-ng binary, asked for IPA. One process per
// section of a line; espeak starts in a few milliseconds, and a reply is a handful
// of sections.
type espeak struct {
	binary string
}

// findEspeak locates espeak-ng: the configured path, then the places Debian and the
// image put it, then PATH.
func findEspeak(configured string) *espeak {
	for _, c := range []string{configured, "/usr/bin/espeak-ng", "/usr/local/bin/espeak-ng"} {
		if c == "" {
			continue
		}
		if path, err := exec.LookPath(c); err == nil {
			return &espeak{binary: path}
		}
	}
	if path, err := exec.LookPath("espeak-ng"); err == nil {
		return &espeak{binary: path}
	}
	return nil
}

// phonemes is one section's IPA. espeak writes a clause per line; a section has no
// clause punctuation left in it, but a long one can still wrap, so lines are joined.
func (e *espeak) phonemes(ctx context.Context, text, voice string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, e.binary, "-q", "--ipa", "-b", "1", "-v", voice, "--stdin")
	cmd.Stdin = strings.NewReader(text)
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("espeak-ng: %w", err)
	}
	return strings.Join(strings.Fields(strings.ReplaceAll(string(out), "\n", " ")), " "), nil
}

// kokoroPhonemize is a whole line's phonemes, punctuation kept.
func kokoroPhonemize(ctx context.Context, text string, american bool, phonemes func(context.Context, string) (string, error)) (string, error) {
	var b strings.Builder
	for _, section := range kokoroSplit(kokoroNormalize(text)) {
		if section.punct {
			b.WriteString(section.text)
			continue
		}
		if strings.TrimSpace(section.text) == "" {
			b.WriteString(section.text)
			continue
		}
		ps, err := phonemes(ctx, section.text)
		if err != nil {
			return "", err
		}
		b.WriteString(ps)
	}
	return kokoroPostProcess(b.String(), american), nil
}
