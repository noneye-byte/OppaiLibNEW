package matte

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// Cutting the background off a clip.
//
// A clip is cut a frame at a time: ffmpeg decodes it to raw RGB on a pipe, each frame
// is masked, and the frames go back into a second ffmpeg as RGBA. What comes out is a
// WebM in VP9 with an alpha channel — the one moving-picture format every browser the
// app runs in plays with its transparency kept (H.264 has no alpha at all). Nothing is
// written to disk but the source, which ffprobe and ffmpeg both need as a file.
//
// Each frame is masked on its own. A mask that drifts a pixel between frames shows as
// a shimmer at the edge, so where it flickers it is eased towards the frame before; and
// nothing of the backdrop it was drawn on is left in the frame. See edge.go for both.

// ClipFrames bounds a clip: Wan's longest is 161 frames at 16 fps, and every frame is
// a second or two of CPU.
const ClipFrames = 400

// ClipInfo is what ffprobe says of a clip.
type ClipInfo struct {
	Width, Height int
	FPS           string // as a rational, "16/1"
}

// CutClip is the clip with its background cut away, as a VP9 WebM with alpha. ext
// is the source's extension (".mp4", ".webm"), which ffmpeg reads the container by.
// progress, when set, is called with the share of frames done.
func (m *Matter) CutClip(ctx context.Context, src []byte, ext string, progress func(float64)) ([]byte, error) {
	if err := m.load(); err != nil {
		return nil, err
	}
	ffmpeg, ffprobe, err := tools()
	if err != nil {
		return nil, err
	}
	dir, err := os.MkdirTemp("", "oppailib-matte-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	if ext == "" || len(ext) > 6 {
		ext = ".mp4"
	}
	in := filepath.Join(dir, "in"+ext)
	if err := os.WriteFile(in, src, 0o600); err != nil {
		return nil, err
	}
	info, frames, err := probe(ctx, ffprobe, in)
	if err != nil {
		return nil, err
	}
	if info.Width <= 0 || info.Height <= 0 || info.Width > 4096 || info.Height > 4096 {
		return nil, fmt.Errorf("the clip is %d×%d, which is not a size this cuts", info.Width, info.Height)
	}
	if frames > ClipFrames {
		return nil, fmt.Errorf("the clip has %d frames; background removal takes up to %d", frames, ClipFrames)
	}

	dec := exec.CommandContext(ctx, ffmpeg, "-v", "error", "-i", in, "-map", "0:v:0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-")
	decOut, err := dec.StdoutPipe()
	if err != nil {
		return nil, err
	}
	var decErr bytes.Buffer
	dec.Stderr = &decErr

	out := filepath.Join(dir, "out.webm")
	size := fmt.Sprintf("%dx%d", info.Width, info.Height)
	enc := exec.CommandContext(ctx, ffmpeg, "-v", "error", "-y",
		"-f", "rawvideo", "-pix_fmt", "rgba", "-s", size, "-framerate", info.FPS, "-i", "-",
		// yuva420p is what carries the alpha; auto-alt-ref has to be off for libvpx to
		// encode it. CRF 30 with no bitrate cap is VP9's constant quality mode.
		"-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "30",
		"-row-mt", "1", "-deadline", "good", "-cpu-used", "4", "-an", out)
	encIn, err := enc.StdinPipe()
	if err != nil {
		return nil, err
	}
	var encErr bytes.Buffer
	enc.Stderr = &encErr

	if err := dec.Start(); err != nil {
		return nil, fmt.Errorf("ffmpeg would not start: %w", err)
	}
	if err := enc.Start(); err != nil {
		_ = dec.Process.Kill()
		_ = dec.Wait()
		return nil, fmt.Errorf("ffmpeg would not start: %w", err)
	}
	cutErr := m.cutFrames(ctx, bufio.NewReaderSize(decOut, 1<<20), encIn, info, frames, progress)
	encIn.Close()
	if cutErr != nil {
		_ = dec.Process.Kill()
	}
	decWait, encWait := dec.Wait(), enc.Wait()
	switch {
	case cutErr != nil:
		return nil, cutErr
	case decWait != nil:
		return nil, fmt.Errorf("ffmpeg could not read the clip: %s", lastLine(decErr.String(), decWait))
	case encWait != nil:
		return nil, fmt.Errorf("ffmpeg could not write the cut clip: %s", lastLine(encErr.String(), encWait))
	}
	return os.ReadFile(out)
}

// cutFrames reads raw RGB frames until the decoder is done and writes each as RGBA,
// masked.
func (m *Matter) cutFrames(ctx context.Context, r io.Reader, w io.Writer, info ClipInfo, frames int, progress func(float64)) error {
	rgb := make([]byte, info.Width*info.Height*3)
	frame := image.NewRGBA(image.Rect(0, 0, info.Width, info.Height))
	rgba := make([]byte, info.Width*info.Height*4)
	var prev []uint8
	var edge edgeWork
	for n := 0; ; n++ {
		if _, err := io.ReadFull(r, rgb); err != nil {
			// A short last frame is a decoder that stopped mid-frame; what came before
			// it is the clip.
			if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
				if n == 0 {
					return errors.New("ffmpeg found no frames in the clip")
				}
				return nil
			}
			return err
		}
		if n >= ClipFrames {
			return fmt.Errorf("the clip has more than %d frames; background removal takes up to that", ClipFrames)
		}
		for i, j := 0, 0; i < len(rgb); i, j = i+3, j+4 {
			frame.Pix[j], frame.Pix[j+1], frame.Pix[j+2], frame.Pix[j+3] = rgb[i], rgb[i+1], rgb[i+2], 255
		}
		mask, err := m.Mask(ctx, frame)
		if err != nil {
			return err
		}
		if prev != nil {
			steadied(mask.Pix, prev)
		} else {
			prev = make([]uint8, len(mask.Pix))
		}
		copy(prev, mask.Pix)
		edge.composeEdge(rgba, rgb, mask.Pix, info.Width, info.Height)
		if _, err := w.Write(rgba); err != nil {
			return fmt.Errorf("ffmpeg stopped taking frames: %w", err)
		}
		if progress != nil && frames > 0 {
			progress(min(float64(n+1)/float64(frames), 0.99))
		}
	}
}

// probe reads a clip's size, frame rate and frame count. A count ffprobe cannot give
// without decoding (a WebM's) is 0, which only costs the progress bar its scale.
func probe(ctx context.Context, ffprobe, path string) (ClipInfo, int, error) {
	raw, err := exec.CommandContext(ctx, ffprobe, "-v", "error", "-select_streams", "v:0",
		"-show_entries", "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames", "-of", "json", path).Output()
	if err != nil {
		return ClipInfo{}, 0, fmt.Errorf("ffprobe could not read the clip: %w", err)
	}
	var res struct {
		Streams []struct {
			Width   int    `json:"width"`
			Height  int    `json:"height"`
			Rate    string `json:"r_frame_rate"`
			Avg     string `json:"avg_frame_rate"`
			NBFrame string `json:"nb_frames"`
		} `json:"streams"`
	}
	if err := json.Unmarshal(raw, &res); err != nil || len(res.Streams) == 0 {
		return ClipInfo{}, 0, errors.New("ffprobe found no picture in the clip")
	}
	st := res.Streams[0]
	fps := st.Avg
	if !goodRate(fps) {
		fps = st.Rate
	}
	if !goodRate(fps) {
		fps = "16/1"
	}
	n, _ := strconv.Atoi(st.NBFrame)
	return ClipInfo{Width: st.Width, Height: st.Height, FPS: fps}, n, nil
}

func goodRate(r string) bool {
	num, den, ok := strings.Cut(r, "/")
	if !ok {
		f, err := strconv.ParseFloat(r, 64)
		return err == nil && f > 0 && f <= 240
	}
	a, err1 := strconv.ParseFloat(num, 64)
	b, err2 := strconv.ParseFloat(den, 64)
	return err1 == nil && err2 == nil && a > 0 && b > 0 && a/b <= 240
}

// tools finds ffmpeg and ffprobe, which the Docker image has and a bare binary may not.
func tools() (string, string, error) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		return "", "", unavailable{"cutting a clip needs ffmpeg, which this server doesn't have"}
	}
	ffprobe, err := exec.LookPath("ffprobe")
	if err != nil {
		return "", "", unavailable{"cutting a clip needs ffprobe, which this server doesn't have"}
	}
	return ffmpeg, ffprobe, nil
}

func lastLine(stderr string, err error) string {
	lines := strings.Split(strings.TrimSpace(stderr), "\n")
	if l := strings.TrimSpace(lines[len(lines)-1]); l != "" {
		return l
	}
	return err.Error()
}
