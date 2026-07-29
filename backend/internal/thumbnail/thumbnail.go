// Package thumbnail extracts a poster frame and probes basic metadata from a
// video file using ffmpeg/ffprobe (both shipped in the runtime image via the
// `ffmpeg` apt package). It operates on a plaintext temp file the caller has
// already decrypted — nothing here touches the encrypted store directly.
package thumbnail

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"time"
)

// Available reports whether the ffmpeg/ffprobe binaries are on PATH. Callers use
// this to skip thumbnailing gracefully (heuristic-fallback style) rather than
// erroring on a lean image without ffmpeg.
func Available() bool {
	_, e1 := exec.LookPath("ffmpeg")
	_, e2 := exec.LookPath("ffprobe")
	return e1 == nil && e2 == nil
}

// Meta is the subset of probed video metadata OppaiLib stores.
type Meta struct {
	Duration float64 // seconds; 0 if unknown
	Width    int
	Height   int
}

type ffprobeOut struct {
	Format struct {
		Duration string `json:"duration"`
	} `json:"format"`
	Streams []struct {
		CodecType string `json:"codec_type"`
		Width     int    `json:"width"`
		Height    int    `json:"height"`
		Duration  string `json:"duration"`
	} `json:"streams"`
}

// Probe returns duration + dimensions for the video at path. A best-effort call:
// on any failure it returns a zero Meta and the error, and callers treat missing
// metadata as non-fatal.
func Probe(ctx context.Context, path string) (Meta, error) {
	cmd := exec.CommandContext(ctx, "ffprobe",
		"-v", "error",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		path,
	)
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return Meta{}, fmt.Errorf("ffprobe: %w: %s", err, stderr.String())
	}
	var parsed ffprobeOut
	if err := json.Unmarshal(out.Bytes(), &parsed); err != nil {
		return Meta{}, fmt.Errorf("ffprobe: parse: %w", err)
	}
	m := Meta{}
	if d, err := strconv.ParseFloat(parsed.Format.Duration, 64); err == nil {
		m.Duration = d
	}
	for _, s := range parsed.Streams {
		if s.CodecType == "video" && s.Width > 0 && s.Height > 0 {
			m.Width, m.Height = s.Width, s.Height
			if m.Duration == 0 {
				if d, err := strconv.ParseFloat(s.Duration, 64); err == nil {
					m.Duration = d
				}
			}
			break
		}
	}
	return m, nil
}

// Frame renders a single JPEG poster frame from the video at path and returns
// the encoded bytes. It seeks to a representative point (a fraction of the
// duration, capped) so the poster isn't a black lead-in frame, scales down to
// maxWidth preserving aspect, and never upscales.
func Frame(ctx context.Context, path string, dur float64, maxWidth int) ([]byte, error) {
	if maxWidth <= 0 {
		maxWidth = 640
	}
	// Seek to 10% in, capped to 10s, but stay before the end of very short clips.
	seek := dur * 0.1
	if seek > 10 {
		seek = 10
	}
	if dur > 0 && seek > dur-0.1 {
		seek = dur / 2
	}
	if seek < 0 {
		seek = 0
	}
	return FrameAt(ctx, path, seek, maxWidth)
}

// FrameAt renders the single JPEG frame found at offset `at` seconds. A
// maxWidth <= 0 means "no scaling": emit the frame at the video's native
// resolution. The AI tagger relies on that, because a downscaled frame would
// misreport the source's true dimensions to resolution-sensitive taggers.
func FrameAt(ctx context.Context, path string, at float64, maxWidth int) ([]byte, error) {
	if at < 0 {
		at = 0
	}
	// -ss before -i is input seeking (fast, keyframe-accurate enough for a poster).
	args := []string{
		"-nostdin",
		"-ss", strconv.FormatFloat(at, 'f', 3, 64),
		"-i", path,
		"-frames:v", "1",
	}
	if maxWidth > 0 {
		// scale=min(iw,MAX):-2 caps width without upscaling; -2 keeps height even.
		args = append(args, "-vf", fmt.Sprintf("scale='min(%d,iw)':-2", maxWidth))
	}
	args = append(args, "-q:v", "3", "-f", "image2", "-c:v", "mjpeg", "pipe:1")

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg: %w: %s", err, stderr.String())
	}
	if out.Len() == 0 {
		return nil, errors.New("ffmpeg: produced no frame")
	}
	return out.Bytes(), nil
}

// DefaultTimeout bounds a single probe+frame job so a pathological file can't
// wedge a worker forever.
const DefaultTimeout = 90 * time.Second

// scenePTS pulls the timestamp off each showinfo line. ffmpeg prints one such line
// per frame the scene filter let through, e.g.
//
//	[Parsed_showinfo_1 @ 0x…] n:0 pts:123 pts_time:4.104 duration:…
var scenePTS = regexp.MustCompile(`pts_time:([0-9]+\.?[0-9]*)`)

// parseScenePTS extracts the scene-change timestamps (seconds) from ffmpeg's
// showinfo output. Kept separate from the exec call so it can be tested against
// captured ffmpeg logs without a binary or a real video.
//
// Non-monotonic or duplicate values are dropped: the scene filter runs after a
// downscale and its timestamps are already ascending, but a defensive filter keeps
// a malformed log from producing offsets that run backwards.
func parseScenePTS(log string) []float64 {
	var out []float64
	last := -1.0
	for _, m := range scenePTS.FindAllStringSubmatch(log, -1) {
		t, err := strconv.ParseFloat(m[1], 64)
		if err != nil || t <= last {
			continue
		}
		out = append(out, t)
		last = t
	}
	return out
}

// Scenes returns the timestamps (seconds) where the picture changes enough to read
// as a cut — one per scene boundary — so a tagger can sample a frame from each scene
// instead of blindly on a clock. threshold is the scene-change score in [0,1] a
// frame must clear (ffmpeg's `scene` metric; ~0.4 is a whole-frame cut rather than
// motion). scaleWidth downscales the stream before the metric is computed so the
// per-frame comparison stays cheap; <=0 leaves native resolution.
//
// The whole stream is decoded, so this is the expensive part of tagging a video and
// callers give it its own bounded timeout. On any failure it returns the error and
// no timestamps, so the caller can fall back to clock sampling rather than trust a
// partial scan biased toward the start.
func Scenes(ctx context.Context, path string, threshold float64, scaleWidth int) ([]float64, error) {
	// The comma inside gt(scene,X) is protected by single-quoting the expression, the
	// same way the scale filter quotes min(W,iw) — quoting is what stops ffmpeg reading
	// that comma as the separator between two filters. -an drops audio; showinfo prints
	// each surviving frame's timestamp to stderr, which is why the log stays at info.
	vf := fmt.Sprintf("select='gt(scene,%.3f)',showinfo", threshold)
	if scaleWidth > 0 {
		vf = fmt.Sprintf("scale='min(%d,iw)':-2,%s", scaleWidth, vf)
	}
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-nostdin", "-i", path, "-an", "-vf", vf, "-f", "null", "-")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg scenes: %w: %s", err, tailString(stderr.String(), 200))
	}
	return parseScenePTS(stderr.String()), nil
}

// tailString returns the last n characters of s, for putting the useful end of an
// ffmpeg error (where the real message is) into a wrapped error without the banner.
func tailString(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[len(s)-n:]
}
