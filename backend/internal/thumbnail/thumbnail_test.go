package thumbnail

import (
	"bytes"
	"context"
	"image"
	_ "image/jpeg"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

// testVideo renders a 320x240, 2-second clip with ffmpeg's synthetic source.
func testVideo(t *testing.T) string {
	t.Helper()
	if !Available() {
		t.Skip("ffmpeg/ffprobe not on PATH")
	}
	path := filepath.Join(t.TempDir(), "test.mp4")
	cmd := exec.Command("ffmpeg", "-nostdin", "-y",
		"-f", "lavfi", "-i", "testsrc=size=320x240:rate=10:duration=2",
		"-pix_fmt", "yuv420p", path)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		t.Fatalf("ffmpeg fixture: %v: %s", err, stderr.String())
	}
	return path
}

func frameWidth(t *testing.T, jpg []byte) int {
	t.Helper()
	cfg, _, err := image.DecodeConfig(bytes.NewReader(jpg))
	if err != nil {
		t.Fatalf("decode frame: %v", err)
	}
	return cfg.Width
}

// The AI tagger calls FrameAt with maxWidth=0 and relies on getting native
// pixels back — a silently downscaled frame would make resolution-sensitive
// tags ("high-res") report on the thumbnail rather than the source.
func TestFrameAtNativeResolutionWhenMaxWidthUnset(t *testing.T) {
	path := testVideo(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jpg, err := FrameAt(ctx, path, 1.0, 0)
	if err != nil {
		t.Fatalf("FrameAt: %v", err)
	}
	if got := frameWidth(t, jpg); got != 320 {
		t.Errorf("native frame width = %d, want 320", got)
	}
}

func TestFrameAtScalesDownButNeverUp(t *testing.T) {
	path := testVideo(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jpg, err := FrameAt(ctx, path, 1.0, 160)
	if err != nil {
		t.Fatalf("FrameAt scaled: %v", err)
	}
	if got := frameWidth(t, jpg); got != 160 {
		t.Errorf("scaled frame width = %d, want 160", got)
	}

	// maxWidth above the source width must not upscale.
	jpg, err = FrameAt(ctx, path, 1.0, 640)
	if err != nil {
		t.Fatalf("FrameAt oversized: %v", err)
	}
	if got := frameWidth(t, jpg); got != 320 {
		t.Errorf("oversized maxWidth upscaled to %d, want 320", got)
	}
}

// Frame is now a thin wrapper over FrameAt; keep its poster contract covered.
func TestFrameStillProducesAPoster(t *testing.T) {
	path := testVideo(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	jpg, err := Frame(ctx, path, 2.0, 640)
	if err != nil {
		t.Fatalf("Frame: %v", err)
	}
	if got := frameWidth(t, jpg); got != 320 {
		t.Errorf("poster width = %d, want 320 (no upscale)", got)
	}
}

func TestProbeReadsDurationAndDimensions(t *testing.T) {
	path := testVideo(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	meta, err := Probe(ctx, path)
	if err != nil {
		t.Fatalf("Probe: %v", err)
	}
	if meta.Width != 320 || meta.Height != 240 {
		t.Errorf("dimensions = %dx%d, want 320x240", meta.Width, meta.Height)
	}
	if meta.Duration < 1.5 || meta.Duration > 2.5 {
		t.Errorf("duration = %v, want ~2s", meta.Duration)
	}
}

func TestParseScenePTS(t *testing.T) {
	// A trimmed but realistic showinfo capture: two selected frames, plus noise
	// lines that must be ignored, and one out-of-order value that must be dropped.
	log := "" +
		"[Parsed_showinfo_1 @ 0x55] n:0 pts:41 pts_time:1.708 duration:0.041 fmt:yuv420p\n" +
		"frame= 1 fps=0.0 q=-0.0 size=N/A time=00:00:01.70 bitrate=N/A\n" +
		"[Parsed_showinfo_1 @ 0x55] n:1 pts:88 pts_time:3.667 duration:0.041 fmt:yuv420p\n" +
		"[Parsed_showinfo_1 @ 0x55] n:2 pts:20 pts_time:0.833 duration:0.041 fmt:yuv420p\n"
	got := parseScenePTS(log)
	if len(got) != 2 {
		t.Fatalf("got %d timestamps, want 2 (out-of-order dropped): %v", len(got), got)
	}
	if got[0] != 1.708 || got[1] != 3.667 {
		t.Errorf("timestamps = %v, want [1.708 3.667]", got)
	}
	if len(parseScenePTS("no showinfo here")) != 0 {
		t.Error("a log with no pts_time should yield no timestamps")
	}
}

// cutVideo renders a 2-second clip that is solid red for the first second and solid
// blue for the second, so there is exactly one hard cut at ~1.0s to detect.
func cutVideo(t *testing.T) string {
	t.Helper()
	if !Available() {
		t.Skip("ffmpeg/ffprobe not on PATH")
	}
	path := filepath.Join(t.TempDir(), "cut.mp4")
	cmd := exec.Command("ffmpeg", "-nostdin", "-y",
		"-f", "lavfi", "-i", "color=c=red:s=320x240:d=1:r=10",
		"-f", "lavfi", "-i", "color=c=blue:s=320x240:d=1:r=10",
		"-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0",
		"-pix_fmt", "yuv420p", path)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		t.Fatalf("ffmpeg cut fixture: %v: %s", err, stderr.String())
	}
	return path
}

func TestScenesDetectsHardCut(t *testing.T) {
	path := cutVideo(t)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cuts, err := Scenes(ctx, path, 0.4, 320)
	if err != nil {
		t.Fatalf("Scenes: %v", err)
	}
	if len(cuts) == 0 {
		t.Fatal("no scene cut detected across a hard red→blue transition")
	}
	// The cut is at ~1.0s; allow slack for keyframe/timestamp rounding.
	found := false
	for _, c := range cuts {
		if c > 0.6 && c < 1.4 {
			found = true
		}
	}
	if !found {
		t.Errorf("cuts = %v, expected one near 1.0s", cuts)
	}
}
