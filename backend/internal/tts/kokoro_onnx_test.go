//go:build onnx

package tts

import (
	"context"
	"encoding/binary"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// Against the real model and espeak-ng, which only a box with both has — the image, or
// a container built like it. OPPAI_TEST_KOKORO is a directory laid out as the image's
// /opt/oppailib/kokoro; OPPAI_TEST_KOKORO_OUT, when set, is where to leave the WAVs
// for a person to listen to.
func TestKokoroSpeaks(t *testing.T) {
	dir := os.Getenv("OPPAI_TEST_KOKORO")
	if dir == "" {
		t.Skip("set OPPAI_TEST_KOKORO to run against the real Kokoro model")
	}
	k := FindKokoro(dir, "")
	if k == nil {
		t.Fatalf("no Kokoro at %s (model, a voice and espeak-ng are all needed)", dir)
	}
	if ready, detail := k.Ready(context.Background()); !ready {
		t.Fatalf("not ready: %s", detail)
	}
	lines := map[string]Request{
		"calm":   {Text: "Hey, you're back! I missed you — how was your day? Tell me everything.", Heat: 1},
		"heated": {Text: "Mmm... come here. I've been thinking about you all evening, you know that?", Heat: 5},
		"long":   {Text: "Okay, so I found three games you might like. The first one's a slow little farming thing, really cosy. The second is a horror game, which, honestly, I couldn't finish. And the third? That one's a surprise. Yeah, I'm not telling you.", Heat: 2},
	}
	for name, req := range lines {
		ps, err := kokoroPhonemize(context.Background(), req.Text, true, func(ctx context.Context, s string) (string, error) {
			return k.espeak.phonemes(ctx, s, "en-us")
		})
		if err != nil {
			t.Fatal(err)
		}
		t.Logf("%s phonemes: %s", name, ps)
		started := time.Now()
		wav, err := k.Speak(context.Background(), req)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		took := time.Since(started)
		samples := (len(wav) - 44) / 2
		seconds := float64(samples) / kokoroSampleRate
		var sum float64
		for i := 44; i+1 < len(wav); i += 2 {
			v := float64(int16(binary.LittleEndian.Uint16(wav[i:]))) / 32768
			sum += v * v
		}
		rms := math.Sqrt(sum / float64(samples))
		t.Logf("%s: %.2fs of audio in %v (RTF %.2f), rms %.3f", name, seconds, took, took.Seconds()/seconds, rms)
		// Roughly a person's pace: a dozen words is a few seconds, not a blip or a drone.
		if seconds < 1.5 || seconds > 30 || rms < 0.01 {
			t.Errorf("%s does not sound like speech: %.2fs, rms %.3f", name, seconds, rms)
		}
		if out := os.Getenv("OPPAI_TEST_KOKORO_OUT"); out != "" {
			_ = os.WriteFile(filepath.Join(out, "kokoro-"+name+".wav"), wav, 0o644)
		}
	}
}
