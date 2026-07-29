package api

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/youruser/oppailib/internal/comic"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/storage"
)

// openComic gives a page-addressable view of a comic's archive, straight out of
// the encrypted blob — no unpacking to disk, no whole-file decrypt.
func (s *Server) openComic(row *db.MediaRow) (*comic.Archive, storage.ReaderAtCloser, error) {
	ra, err := s.store.OpenAt(row.BlobPath, row.Size)
	if err != nil {
		return nil, nil, err
	}
	arc, err := comic.Open(ra, row.Size)
	if err != nil {
		ra.Close()
		return nil, nil, err
	}
	return arc, ra, nil
}

// handleComicInfo tells the reader whether it can page through this item and how
// many pages it has. A comic we can't decode (.cbr / .pdf) reports readable
// false with a reason, and the UI offers the download instead of pretending.
func (s *Server) handleComicInfo(w http.ResponseWriter, r *http.Request) {
	row, ok := s.comicRow(w, r)
	if !ok {
		return
	}
	arc, ra, err := s.openComic(row)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"readable": false,
			"pages":    0,
			"reason":   err.Error(),
		})
		return
	}
	defer ra.Close()

	pages := arc.PageCount()
	// Keep the stored count honest for the grid tile's "N pages" badge.
	if int(row.PageCount.Int64) != pages {
		if err := s.db.SetPageCount(r.Context(), row.ID, pages); err != nil {
			s.log.Warn("comic: persist page count", "media", row.ID, "err", err)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"readable": true, "pages": pages})
}

// handleComicPage streams a single page image. Pages are 1-based in the URL to
// match what the reader shows the user.
func (s *Server) handleComicPage(w http.ResponseWriter, r *http.Request) {
	row, ok := s.comicRow(w, r)
	if !ok {
		return
	}
	n, err := strconv.Atoi(r.PathValue("n"))
	if err != nil || n < 1 {
		writeErr(w, http.StatusBadRequest, "bad page")
		return
	}
	arc, ra, err := s.openComic(row)
	if err != nil {
		writeErr(w, http.StatusUnsupportedMediaType, err.Error())
		return
	}
	defer ra.Close()

	rc, ct, err := arc.Page(n - 1)
	if err != nil {
		writeErr(w, http.StatusNotFound, "no such page")
		return
	}
	defer rc.Close()

	// ct is derived from the entry name inside the archive, which an imported CBZ
	// controls; a page named ".html" must not render as a document on our origin.
	w.Header().Set("Content-Type", safeInlineContentType(ct))
	// Pages are immutable for a given media id (the blob is content-addressed), so
	// the reader can cache them and page back and forth for free.
	w.Header().Set("Cache-Control", "private, max-age=86400")
	if _, err := io.Copy(w, rc); err != nil {
		s.log.Debug("comic: page copy interrupted", "media", row.ID, "page", n, "err", err)
	}
}

// comicRow loads the media row for a comic request, writing the error response
// itself if the id is bad, missing, or not a comic.
func (s *Server) comicRow(w http.ResponseWriter, r *http.Request) (*db.MediaRow, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return nil, false
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return nil, false
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return nil, false
	}
	if row.Kind != "comic" {
		writeErr(w, http.StatusBadRequest, "not a comic")
		return nil, false
	}
	return row, true
}

// indexComicAsync records a comic's page count and stores its first page as the
// grid thumbnail. Fire-and-forget after an upload/import; silently no-ops for a
// format we can't read.
func (s *Server) indexComicAsync(id int64, blobPath string, size int64) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		if err := s.indexComic(ctx, id, blobPath, size); err != nil {
			s.log.Info("comic: not indexed", "media", id, "err", err)
		}
	}()
}

func (s *Server) indexComic(ctx context.Context, id int64, blobPath string, size int64) error {
	ra, err := s.store.OpenAt(blobPath, size)
	if err != nil {
		return err
	}
	defer ra.Close()
	arc, err := comic.Open(ra, size)
	if err != nil {
		return err
	}
	if err := s.db.SetPageCount(ctx, id, arc.PageCount()); err != nil {
		return err
	}
	cover, err := arc.Cover(640)
	if err != nil {
		return err
	}
	put, err := s.store.Put(bytes.NewReader(cover))
	if err != nil {
		return err
	}
	if err := s.db.SetThumbPath(ctx, id, put.RelPath); err != nil {
		return err
	}
	s.log.Info("comic: indexed", "media", id, "pages", arc.PageCount())
	return nil
}

// backfillComics indexes comics imported before the reader existed, so they get
// a page count and a cover without the user re-adding them.
func (s *Server) backfillComics() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	rows, err := s.db.ComicsMissingIndex(ctx, 500)
	cancel()
	if err != nil {
		s.log.Warn("comic: backfill query failed", "err", err)
		return
	}
	if len(rows) == 0 {
		return
	}
	s.log.Info("comic: backfilling page counts + covers", "count", len(rows))
	for _, row := range rows {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		if err := s.indexComic(ctx, row.ID, row.BlobPath, row.Size); err != nil {
			s.log.Info("comic: not indexed", "media", row.ID, "err", err)
		}
		cancel()
	}
}
