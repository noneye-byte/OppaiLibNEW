package ai

import (
	"bytes"
	"context"
	"errors"
	"image"
	"os"

	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/thumbnail"
)

// Frames for a vision model.
//
// The tagger and the describer want the same thing from a blob — a handful of
// representative pictures — and they should not disagree about which pictures those
// are. A still is itself; a GIF is composited frames sampled across the animation;
// a video is frames chosen by scene, as the tagger chooses them, with the same
// fallbacks when ffmpeg or the probe lets us down. The describer just wants fewer:
// a vision model's window is spent per image, so a clip is shown at most a few.

// SampleFrames returns up to want decoded frames from a blob, in playback order,
// for a picture, an animation or a video. Comics and games are not pictures.
func (m *Manager) SampleFrames(ctx context.Context, blobPath, kind string, want int) ([]image.Image, error) {
	if want <= 0 {
		want = 1
	}
	switch models.MediaKind(kind) {
	case models.KindImage:
		rc, err := m.store.Open(blobPath)
		if err != nil {
			return nil, err
		}
		defer rc.Close()
		img, _, err := image.Decode(rc)
		if err != nil {
			return nil, err
		}
		return []image.Image{img}, nil
	case models.KindGIF:
		rc, err := m.store.Open(blobPath)
		if err != nil {
			return nil, err
		}
		imgs, err := gifFrames(rc, want)
		rc.Close()
		if err != nil {
			// Not a real GIF container — a mislabelled webp or png. One frame it is.
			return m.SampleFrames(ctx, blobPath, string(models.KindImage), 1)
		}
		return imgs, nil
	case models.KindVideo:
		return m.videoFrames(ctx, blobPath, want)
	default:
		return nil, errors.New("ai: only pictures, animations and videos have frames")
	}
}

// videoFrames extracts want frames from a clip, chosen the way the tagger chooses
// them. Without ffmpeg there is nothing to extract.
func (m *Manager) videoFrames(ctx context.Context, blobPath string, want int) ([]image.Image, error) {
	if !thumbnail.Available() {
		return nil, errors.New("ffmpeg is not installed, so a video cannot be sampled")
	}
	tmpPath, err := m.decryptToTemp(blobPath)
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpPath)

	var dur float64
	if meta, err := thumbnail.Probe(ctx, tmpPath); err == nil {
		dur = meta.Duration
	}
	offsets := m.videoOffsets(ctx, tmpPath, dur, want)
	out := make([]image.Image, 0, len(offsets))
	for _, at := range offsets {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		jpg, err := thumbnail.FrameAt(ctx, tmpPath, at, 0)
		if err != nil {
			continue
		}
		img, _, err := image.Decode(bytes.NewReader(jpg))
		if err != nil {
			continue
		}
		out = append(out, img)
	}
	if len(out) == 0 {
		return nil, errors.New("ai: no frame could be extracted")
	}
	return out, nil
}

// videoOffsets picks where in a clip to look: by scene when the cuts can be found,
// on the clock otherwise. Detection decodes the whole stream, so it runs under its
// own timeout, and any failure (including that deadline) drops back to clock
// sampling — never to a partial scan, which would bias every frame toward the start.
func (m *Manager) videoOffsets(ctx context.Context, tmpPath string, dur float64, want int) []float64 {
	offsets := sampleOffsets(dur, want)
	if dur <= 0 {
		return offsets
	}
	sceneCtx, cancel := context.WithTimeout(ctx, sceneDetectTimeout)
	cuts, err := thumbnail.Scenes(sceneCtx, tmpPath, sceneThreshold, sceneDetectWidth)
	cancel()
	if err != nil {
		m.log.Debug("ai: scene detection failed, sampling on the clock", "err", err)
		return offsets
	}
	if len(cuts) > 0 {
		return sceneAwareOffsets(cuts, dur, want)
	}
	return offsets
}
