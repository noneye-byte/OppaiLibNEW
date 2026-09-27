package tts

import (
	"context"
	"encoding/binary"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPunctuationIsKeptBetweenThePhonemisedWords(t *testing.T) {
	var asked []string
	fake := func(_ context.Context, text string) (string, error) {
		asked = append(asked, text)
		return "<" + text + ">", nil
	}
	got, err := kokoroPhonemize(context.Background(), "Hello, you… is it on?", true, fake)
	if err != nil {
		t.Fatal(err)
	}
	if got != "<Hello>, <you>… <is it on>?" {
		t.Errorf("phonemes = %q", got)
	}
	// espeak never sees punctuation: it would drop it, and the pauses with it.
	for _, a := range asked {
		if strings.ContainsAny(a, ",.?…") {
			t.Errorf("espeak was handed punctuation: %q", a)
		}
	}
}

func TestEspeaksSpellingIsMadeIntoKokoros(t *testing.T) {
	if got := kokoroPostProcess("rɪəli xaʊs", true); got != "ɹɪəli kaʊs" {
		t.Errorf("symbols = %q", got)
	}
	if got := kokoroPostProcess("nˈaɪnti", true); got != "nˈaɪndi" {
		t.Errorf("an American ninety = %q", got)
	}
	if got := kokoroPostProcess("nˈaɪnti", false); got != "nˈaɪnti" {
		t.Errorf("a British ninety = %q", got)
	}
}

func TestTheTextIsTidiedTheWayKokoroWasTrainedOnIt(t *testing.T) {
	for in, want := range map[string]string{
		"yeah, Mr. Smith":        "ye'a, Mister Smith",
		"it’s   “fine”":          `it's "fine"`,
		"1,000 people, ages 3-5": "1000 people, ages 3 to 5",
		"Mmm... mhm, mm":         "hmm... uh huh, hmm",
	} {
		if got := kokoroNormalize(in); got != want {
			t.Errorf("%q → %q, want %q", in, got, want)
		}
	}
}

func TestPhonemesOutsideTheVocabularyAreDroppedNotGuessed(t *testing.T) {
	ids := kokoroTokens("hə§lˈoʊ")
	if len(ids) != 6 || ids[0] != kokoroVocab['h'] || ids[2] != kokoroVocab['l'] {
		t.Errorf("ids = %v", ids)
	}
	if n := len(kokoroTokens(strings.Repeat("a", 900))); n != kokoroMaxTokens {
		t.Errorf("an overlong run kept %d tokens", n)
	}
}

func TestALongReplyIsReadInRunsOfWholeSentences(t *testing.T) {
	sentence := "This is a sentence that goes on for a little while. "
	chunks := kokoroChunks(strings.Repeat(sentence, 20))
	if len(chunks) < 2 {
		t.Fatalf("one run for %d characters", 20*len(sentence))
	}
	for _, c := range chunks {
		if len(c) > kokoroChunkChars || !strings.HasSuffix(c, ".") {
			t.Errorf("run of %d ending %q", len(c), c[max(0, len(c)-10):])
		}
	}
	// One sentence longer than a run is cut where a reader would breathe.
	long := strings.Repeat("and then another thing, ", 30)
	for _, c := range kokoroChunks(long) {
		if len(c) > kokoroChunkChars {
			t.Errorf("run of %d", len(c))
		}
	}
	if got := kokoroChunks("hi"); len(got) != 1 || got[0] != "hi" {
		t.Errorf("short line = %q", got)
	}
}

func TestTheStyleRowFollowsTheLengthOfTheLine(t *testing.T) {
	pack := make([]float32, 4*kokoroStyleDim)
	for row := range 4 {
		pack[row*kokoroStyleDim] = float32(row)
	}
	if got := kokoroStyle(pack, 2); got[0] != 2 || len(got) != kokoroStyleDim {
		t.Errorf("row 2 = %v", got[0])
	}
	if got := kokoroStyle(pack, 99); got[0] != 3 {
		t.Errorf("past the end = %v", got[0])
	}
}

// fakeRunner records what reached the model and answers with a tone.
type fakeRunner struct {
	calls  [][]int64
	speeds []float32
}

func (f *fakeRunner) Run(ids []int64, style []float32, speed float32) ([]float32, error) {
	f.calls = append(f.calls, ids)
	f.speeds = append(f.speeds, speed)
	out := make([]float32, 2400)
	for i := range out {
		out[i] = float32(0.5 * math.Sin(float64(i)/10))
	}
	return out, nil
}

// kokoroFixture is a voice directory with one pack in it.
func kokoroFixture(t *testing.T, voices ...string) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "voices"), 0o755); err != nil {
		t.Fatal(err)
	}
	raw := make([]byte, 4*kokoroStyleDim*kokoroMaxTokens)
	for i := 0; i < len(raw); i += 4 {
		binary.LittleEndian.PutUint32(raw[i:], math.Float32bits(0.01))
	}
	for _, v := range voices {
		if err := os.WriteFile(filepath.Join(dir, "voices", v+".bin"), raw, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func TestKokoroReadsEachRunPaddedAndJoinsThemWithAPause(t *testing.T) {
	runner := &fakeRunner{}
	k := &Kokoro{Dir: kokoroFixture(t, "af_heart"), Default: DefaultKokoroVoice, packs: map[string][]float32{}}
	k.loadOnce.Do(func() { k.runner = runner })
	k.espeak = nil
	// A phonemiser stands in for espeak-ng: the model half is what is under test.
	text := strings.Repeat("Hello there. ", 40)
	speak := func(heat int) []byte {
		t.Helper()
		wav, err := k.speakWith(context.Background(), Request{Text: text, Heat: heat, Speed: 1}, func(_ context.Context, s string) (string, error) {
			return "həlˈoʊ ðɛɹ", nil
		})
		if err != nil {
			t.Fatal(err)
		}
		return wav
	}
	wav := speak(0)
	if string(wav[:4]) != "RIFF" || binary.LittleEndian.Uint32(wav[24:]) != kokoroSampleRate {
		t.Fatalf("not 24 kHz WAV")
	}
	if len(runner.calls) < 2 {
		t.Fatalf("a long reply went through in %d run(s)", len(runner.calls))
	}
	for _, ids := range runner.calls {
		if ids[0] != 0 || ids[len(ids)-1] != 0 {
			t.Errorf("a run was not padded: %v…", ids[:3])
		}
	}
	// Runs plus the pauses between them.
	gap := int(HeatDelivery(0).SentenceSilence * kokoroSampleRate)
	want := 44 + 2*(len(runner.calls)*2400+(len(runner.calls)-1)*gap)
	if len(wav) != want {
		t.Errorf("wav is %d bytes, want %d", len(wav), want)
	}
	runner.speeds = nil
	speak(5)
	if runner.speeds[0] >= 1 {
		t.Errorf("heat 5 read at speed %v", runner.speeds[0])
	}
}

func TestAVoiceKokoroDoesNotHaveFallsBackToOneItDoes(t *testing.T) {
	k := &Kokoro{Dir: kokoroFixture(t, "af_bella", "bf_emma"), Default: DefaultKokoroVoice}
	if got := k.voiceFor("en_US-hfc_female-medium"); got != "af_bella" {
		t.Errorf("a piper id left in the settings chose %q", got)
	}
	if got := k.voiceFor("bf_emma"); got != "bf_emma" {
		t.Errorf("an installed voice chose %q", got)
	}
	voices, _ := k.Voices(context.Background())
	if len(voices) != 2 || voices[0].ID != "af_bella" || !voices[0].Installed {
		t.Errorf("voices = %+v", voices)
	}
}
