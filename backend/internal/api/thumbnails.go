package api

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/youruser/oppailib/internal/thumbnail"
)

// handleThumb serves a media item's thumbnail. Videos with a generated poster
// stream that (image/jpeg); image/gif items fall back to their own bytes so the
// grid still has something to show. Anything else 404s and the UI draws its
// gradient-swatch placeholder.
func (s *Server) handleThumb(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	// Prefer the generated thumbnail blob.
	if row.ThumbPath.Valid && row.ThumbPath.String != "" {
		rc, err := s.store.Open(row.ThumbPath.String)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "blob error")
			return
		}
		defer rc.Close()
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Cache-Control", "private, max-age=86400")
		_, _ = io.Copy(w, rc)
		return
	}

	// Fallback: image/gif can act as their own thumbnail.
	if row.Kind == "image" || row.Kind == "gif" {
		rc, err := s.store.Open(row.BlobPath)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "blob error")
			return
		}
		defer rc.Close()
		name := s.decrypt(row.TitleEnc, "title")
		ct := mime.TypeByExtension(filepath.Ext(name))
		if ct == "" {
			ct = contentTypeForKind(row.Kind)
		}
		w.Header().Set("Content-Type", ct)
		w.Header().Set("Cache-Control", "private, max-age=86400")
		_, _ = io.Copy(w, rc)
		return
	}

	writeErr(w, http.StatusNotFound, "no thumbnail")
}

// processIngestAsync is the one post-insert path for a freshly stored blob. It
// always offers the item to auto-tagging, then starts any kind-specific work such
// as video posters or comic indexing. Keeping these together prevents a new
// importer from accidentally creating permanently untagged media.
func (s *Server) processIngestAsync(id int64, blobPath, kind string, size int64, knownDur float64) {
	s.ai.TagMediaAsync(id, blobPath, kind)
	switch kind {
	case "video":
		s.generateThumbAsync(id, blobPath, kind, knownDur)
	case "comic":
		s.indexComicAsync(id, blobPath, size)
	}
}

// backfillAutoTags repairs taggable items whose original background job was
// missed (or lost to a restart). TagMediaAsync applies the live enable/auto-tag
// switches and bounds concurrency, while its in-flight guard keeps this recovery
// pass from duplicating a live import job.
func (s *Server) backfillAutoTags() {
	if opts := s.ai.Options(); !opts.Enabled || !opts.AutoTag {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	rows, err := s.db.MediaMissingAITags(ctx, 1000)
	cancel()
	if err != nil {
		s.log.Warn("ai: backfill query failed", "err", err)
		return
	}
	if len(rows) == 0 {
		return
	}
	s.log.Info("ai: backfilling untagged media", "count", len(rows))
	for _, row := range rows {
		s.ai.TagMediaAsync(row.ID, row.BlobPath, row.Kind)
	}
}

// generateThumbAsync produces a poster frame + probes metadata for a video in the
// background. No-op for non-video kinds or when ffmpeg isn't installed. Safe to
// call fire-and-forget after an upload/import.
func (s *Server) generateThumbAsync(id int64, blobPath, kind string, knownDur float64) {
	if kind != "video" {
		return
	}
	if !thumbnail.Available() {
		s.thumbWarn.Do(func() {
			s.log.Warn("thumbnail: ffmpeg/ffprobe not found on PATH — video posters disabled")
		})
		return
	}
	go func() {
		// Bound concurrency so a burst of imports (or the startup backfill) doesn't
		// spawn one ffmpeg per video at once.
		s.thumbSem <- struct{}{}
		defer func() { <-s.thumbSem }()

		ctx, cancel := context.WithTimeout(context.Background(), thumbnail.DefaultTimeout)
		defer cancel()
		if err := s.generateThumb(ctx, id, blobPath, knownDur); err != nil {
			s.log.Warn("thumbnail: generate failed", "media", id, "err", err)
		}
	}()
}

func (s *Server) generateThumb(ctx context.Context, id int64, blobPath string, knownDur float64) error {
	// Decrypt the blob to a temp file so ffmpeg has a seekable input (needed to
	// locate the moov atom / seek to the poster offset). Removed promptly after.
	tmp, err := os.CreateTemp("", "oppai-thumb-*")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	rc, err := s.store.Open(blobPath)
	if err != nil {
		tmp.Close()
		return err
	}
	_, copyErr := io.Copy(tmp, rc)
	rc.Close()
	if cerr := tmp.Close(); cerr != nil && copyErr == nil {
		copyErr = cerr
	}
	if copyErr != nil {
		return copyErr
	}

	dur := knownDur
	if meta, err := thumbnail.Probe(ctx, tmpPath); err == nil {
		if meta.Duration > 0 {
			dur = meta.Duration
		}
		if err := s.db.UpdateVideoMeta(ctx, id, meta.Duration, meta.Width, meta.Height); err != nil {
			s.log.Warn("thumbnail: persist video meta", "media", id, "err", err)
		}
	} else {
		s.log.Debug("thumbnail: probe failed", "media", id, "err", err)
	}

	jpeg, err := thumbnail.Frame(ctx, tmpPath, dur, 640)
	if err != nil {
		return err
	}
	put, err := s.store.Put(bytes.NewReader(jpeg))
	if err != nil {
		return err
	}
	if err := s.db.SetThumbPath(ctx, id, put.RelPath); err != nil {
		return err
	}
	s.log.Info("thumbnail: generated", "media", id, "bytes", len(jpeg))
	return nil
}

// backfillThumbnails generates posters for videos imported before thumbnailing
// existed. Runs once at startup, sequentially (the semaphore serializes it with
// any live imports), so it never stampedes the box.
func (s *Server) backfillThumbnails() {
	if !thumbnail.Available() {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	rows, err := s.db.VideosMissingThumbs(ctx, 500)
	cancel()
	if err != nil {
		s.log.Warn("thumbnail: backfill query failed", "err", err)
		return
	}
	if len(rows) == 0 {
		return
	}
	s.log.Info("thumbnail: backfilling video posters", "count", len(rows))
	for _, row := range rows {
		s.generateThumbAsync(row.ID, row.BlobPath, row.Kind, row.Duration.Float64)
	}
}
