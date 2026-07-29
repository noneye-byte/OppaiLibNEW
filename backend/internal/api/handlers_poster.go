package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/youruser/oppailib/internal/thumbnail"
)

// Choosing a video's poster frame.
//
// The automatic poster is a frame 10% in (see thumbnail.Frame), which is a decent
// guess and regularly the wrong one: a title card, a black fade, the back of
// somebody's head. This lets the user scroll through the video and pick.
//
// The shape of the API is dictated by the storage model. Blobs are encrypted, and
// ffmpeg needs a seekable file, so *every* frame read costs a full decrypt to a temp
// file. A naive "give me the frame at t" endpoint called once per thumbnail in a strip
// would decrypt the whole video twenty times over. So the strip is one request that
// decrypts once and returns every candidate, and committing a choice is a second
// request that decrypts once more for a full-resolution frame.

const (
	// posterStripMax bounds the candidate strip. Twenty-odd frames is enough to scrub
	// a feature-length video meaningfully, and the response is inline base64 — a
	// hundred would be megabytes of JSON for a picker.
	posterStripMax = 40
	// posterStripDefault is what a client that does not care gets.
	posterStripDefault = 20
	// posterStripWidth is the candidate thumbnail width. Small: these are picked from
	// a strip, and the chosen one is re-rendered at poster size afterwards.
	posterStripWidth = 240
	// posterWidth matches generateThumb, so a chosen poster is indistinguishable in
	// quality from an automatic one.
	posterWidth = 640
	// posterStripTimeout is generous because it covers one decrypt plus N ffmpeg
	// seeks. Each seek is fast; the decrypt of a large file is not.
	posterStripTimeout = 4 * time.Minute
)

type posterCandidate struct {
	At    float64 `json:"at"`
	Image string  `json:"image"` // data URL, ready to drop straight into an <img>
}

// decryptToTemp writes a media blob out to a temp file ffmpeg can seek in, and returns
// the path plus a cleanup func. The caller must always call cleanup.
//
// This is generateThumb's preamble, lifted out because the poster picker needs the
// same thing twice and duplicating a decrypt-to-disk is how one of the copies ends up
// leaking the plaintext it forgot to remove.
func (s *Server) decryptToTemp(blobPath string) (path string, cleanup func(), err error) {
	tmp, err := os.CreateTemp("", "oppai-poster-*")
	if err != nil {
		return "", func() {}, err
	}
	name := tmp.Name()
	cleanup = func() { _ = os.Remove(name) }

	rc, err := s.store.Open(blobPath)
	if err != nil {
		tmp.Close()
		cleanup()
		return "", func() {}, err
	}
	_, copyErr := io.Copy(tmp, rc)
	rc.Close()
	if cerr := tmp.Close(); cerr != nil && copyErr == nil {
		copyErr = cerr
	}
	if copyErr != nil {
		cleanup()
		return "", func() {}, copyErr
	}
	return name, cleanup, nil
}

// posterVideo loads a video row and reports the problem in the user's terms when it
// is not one. Shared by both handlers so "this isn't a video" reads the same either way.
func (s *Server) posterVideo(w http.ResponseWriter, r *http.Request) (id int64, blobPath string, dur float64, ok bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return 0, "", 0, false
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return 0, "", 0, false
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return 0, "", 0, false
	}
	if row.Kind != "video" {
		writeErr(w, http.StatusBadRequest, "only videos have a poster frame to choose")
		return 0, "", 0, false
	}
	if !thumbnail.Available() {
		writeErr(w, http.StatusServiceUnavailable, "ffmpeg isn't installed, so frames can't be read")
		return 0, "", 0, false
	}
	return id, row.BlobPath, row.Duration.Float64, true
}

// posterOffsets spreads count sample points across a video.
//
// Evenly spaced rather than scene-detected, deliberately. Scene changes are what the
// *tagger* wants — distinct content to look at — but a person scrubbing for a poster
// is navigating by time ("about a third of the way in"), and a strip whose gaps vary
// with cut density is unreadable as a timeline. The first and last samples are inset
// so the strip does not open on a black lead-in and close on the credits fade, which
// is exactly where posters should not come from.
func posterOffsets(dur float64, count int) []float64 {
	if count < 1 {
		count = 1
	}
	// A video whose duration never got probed still has to be scrubbable. A minute of
	// samples is wrong for a two-hour film and right for the short clips that are
	// usually the ones missing metadata; the chosen frame is read from the real file
	// either way, so the worst case is a strip that stops early.
	if dur <= 0 {
		dur = 60
	}
	first, last := dur*0.02, dur*0.98
	if count == 1 {
		return []float64{dur / 2}
	}
	step := (last - first) / float64(count-1)
	out := make([]float64, 0, count)
	for i := 0; i < count; i++ {
		out = append(out, first+step*float64(i))
	}
	return out
}

// handlePosterFrames returns a strip of candidate frames to scroll through.
//
// Frames that fail to render are skipped rather than failing the request: a seek past
// a damaged region is a normal thing to hit in a real library, and one bad offset
// should cost the user one thumbnail, not the whole picker.
func (s *Server) handlePosterFrames(w http.ResponseWriter, r *http.Request) {
	_, blobPath, dur, ok := s.posterVideo(w, r)
	if !ok {
		return
	}
	count := atoiDefault(r.URL.Query().Get("count"), posterStripDefault)
	count = clampInt(count, 1, posterStripMax)

	tmpPath, cleanup, err := s.decryptToTemp(blobPath)
	defer cleanup()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the video")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), posterStripTimeout)
	defer cancel()

	// A duration the database never learned is worth probing now: we have the
	// decrypted file open anyway, and the offsets are meaningless without it.
	if dur <= 0 {
		if meta, err := thumbnail.Probe(ctx, tmpPath); err == nil && meta.Duration > 0 {
			dur = meta.Duration
		}
	}

	frames := make([]posterCandidate, 0, count)
	for _, at := range posterOffsets(dur, count) {
		jpeg, err := thumbnail.FrameAt(ctx, tmpPath, at, posterStripWidth)
		if err != nil {
			s.log.Debug("poster: frame failed", "at", at, "err", err)
			continue
		}
		frames = append(frames, posterCandidate{
			At:    at,
			Image: "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(jpeg),
		})
	}
	if len(frames) == 0 {
		writeErr(w, http.StatusBadGateway, "couldn't read any frames from this video")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"duration": dur, "frames": frames})
}

type setPosterReq struct {
	// At is the offset in seconds to grab. It comes from a strip candidate, but any
	// offset is valid — a client with a scrubber of its own can name one directly.
	At float64 `json:"at"`
}

// handleSetPoster re-renders the poster from a chosen offset and stores it.
//
// The old poster blob is deliberately not deleted. The store is content-addressed and
// deduplicated, so a blob may be shared with another item, and a poster is small
// enough that orphaning one is a far cheaper mistake than removing a picture something
// else is still pointing at.
func (s *Server) handleSetPoster(w http.ResponseWriter, r *http.Request) {
	id, blobPath, dur, ok := s.posterVideo(w, r)
	if !ok {
		return
	}
	var req setPosterReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.At < 0 {
		req.At = 0
	}
	// Clamped rather than rejected: a client working from a duration the server has
	// since re-probed should still land on the last frame, not an error.
	if dur > 0 && req.At > dur {
		req.At = dur
	}

	tmpPath, cleanup, err := s.decryptToTemp(blobPath)
	defer cleanup()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read the video")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), thumbnail.DefaultTimeout)
	defer cancel()

	jpeg, err := thumbnail.FrameAt(ctx, tmpPath, req.At, posterWidth)
	if err != nil {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("couldn't read a frame at %.1fs", req.At))
		return
	}
	put, err := s.store.Put(bytes.NewReader(jpeg))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't store the thumbnail")
		return
	}
	if err := s.db.SetThumbPath(ctx, id, put.RelPath); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save the thumbnail")
		return
	}
	s.log.Info("poster: set from chosen frame", "media", id, "at", req.At)
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "at": req.At})
}
