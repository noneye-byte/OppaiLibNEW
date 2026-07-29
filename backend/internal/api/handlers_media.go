package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/recognize"
)

const maxUpload = 8 << 30 // 8 GiB

// recognizeKind identifies a stored blob by reading it. The filename is a claim,
// not evidence — it's consulted only when the bytes say nothing.
func (s *Server) recognizeKind(relPath string, size int64, filename string) models.MediaKind {
	ra, err := s.store.OpenAt(relPath, size)
	if err != nil {
		s.log.Warn("recognize: cannot open blob", "path", relPath, "err", err)
		return recognize.KindFromFilename(filename)
	}
	defer ra.Close()
	return recognize.Kind(ra, size, filename)
}

func (s *Server) handleUploadMedia(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid multipart form")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "missing 'file'")
		return
	}
	defer file.Close()

	res, err := s.ingestBlob(r.Context(), file, ingestMeta{
		Filename: header.Filename,
		Title:    r.FormValue("title"),
		Source:   r.FormValue("source"),
		Kind:     r.FormValue("kind"),
	})
	if err != nil {
		s.log.Error("ingest", "err", err)
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}

	status := http.StatusCreated
	if res.Deduped {
		status = http.StatusOK
	}
	writeJSON(w, status, map[string]any{"id": res.ID, "sha256": res.SHA256, "deduped": res.Deduped})
}

// ingestMeta is what a caller knows about a blob it is handing to the store. Every
// field is optional except Filename, which is only ever a *hint* — the bytes decide
// what the thing actually is.
type ingestMeta struct {
	Filename string
	Title    string
	Source   string
	Kind     string // explicit override; the user deciding we recognized it wrongly
}

// ingestResult is the library row a blob became.
type ingestResult struct {
	ID      int64
	SHA256  string
	Size    int64
	Kind    string
	Deduped bool
}

// ingestBlob is the one path by which bytes become a library item: encrypt-and-store,
// recognize, insert, kick off the per-kind background work.
//
// Extracted so a multipart upload and a reassembled chunked upload cannot drift
// apart. They differ only in how the reader was obtained, and a resumable upload
// that skipped, say, the poster generation would be a subtly second-class import.
func (s *Server) ingestBlob(ctx context.Context, src io.Reader, meta ingestMeta) (*ingestResult, error) {
	res, err := s.store.Put(src)
	if err != nil {
		return nil, err
	}

	title := meta.Title
	if title == "" {
		title = meta.Filename
	}
	titleEnc, err := crypto.SealBytes(s.kek, []byte(title), []byte("title"))
	if err != nil {
		return nil, err
	}
	var sourceEnc []byte
	if meta.Source != "" {
		sourceEnc, _ = crypto.SealBytes(s.kek, []byte(meta.Source), []byte("source"))
	}

	// What the file *is*, read from the file. An explicit kind from the client still
	// wins: that's the user overriding us on purpose.
	kind := s.recognizeKind(res.RelPath, res.Size, meta.Filename)
	if meta.Kind != "" {
		kind = models.MediaKind(meta.Kind)
	}

	id, existed, err := s.db.InsertMedia(ctx, &db.MediaRow{
		Kind:      string(kind),
		SHA256:    res.SHA256,
		Size:      res.Size,
		BlobPath:  res.RelPath,
		TitleEnc:  titleEnc,
		SourceEnc: sourceEnc,
	})
	if err != nil {
		return nil, err
	}
	// Fire-and-forget AI auto-tagging (no-op if disabled or non-image) and the
	// per-kind ingest work (video posters, comic page index + cover).
	if !existed {
		s.processIngestAsync(id, res.RelPath, string(kind), res.Size, 0)
	}
	return &ingestResult{ID: id, SHA256: res.SHA256, Size: res.Size, Kind: string(kind), Deduped: existed}, nil
}

func (s *Server) handleListMedia(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	rows, err := s.db.ListMedia(r.Context(), q.Get("kind"), limit, offset)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]models.Media, 0, len(rows))
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		out = append(out, s.toModel(row))
		ids = append(ids, row.ID)
	}
	// Tags ride along with the list: the client searches and filters over them
	// without a round trip per item. One batched query, not one per row.
	if tags, err := s.db.TagsForMediaBatch(r.Context(), ids); err == nil {
		for i := range out {
			out[i].Tags = tags[out[i].ID]
		}
	} else {
		s.log.Warn("list tags", "err", err)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (s *Server) handleGetMedia(w http.ResponseWriter, r *http.Request) {
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
	m := s.toModel(row)
	if tags, err := s.db.TagsForMedia(r.Context(), row.ID); err == nil {
		m.Tags = tags
	}
	writeJSON(w, http.StatusOK, m)
}

// mediaPatchReq is the editable subset of a media item. Pointer fields are
// "present or not" so a caller can change just the title (or just the kind)
// without touching the rest. Tags are add/remove lists (manual source).
type mediaPatchReq struct {
	Title      *string  `json:"title"`
	Notes      *string  `json:"notes"`
	Kind       *string  `json:"kind"`
	Rating     *int     `json:"rating"`
	Favorite   *bool    `json:"favorite"`
	AddTags    []string `json:"addTags"`
	RemoveTags []string `json:"removeTags"`
}

// updateMediaByID applies a patch (fields + tag add/remove) to one item. Returns
// sql.ErrNoRows if the id doesn't exist.
func (s *Server) updateMediaByID(r *http.Request, id int64, p mediaPatchReq) error {
	ctx := r.Context()
	patch := db.MediaPatch{}
	if p.Title != nil {
		enc, err := crypto.SealBytes(s.kek, []byte(*p.Title), []byte("title"))
		if err != nil {
			return err
		}
		patch.SetTitle, patch.TitleEnc = true, enc
	}
	if p.Notes != nil {
		patch.SetNotes = true
		if *p.Notes != "" {
			enc, err := crypto.SealBytes(s.kek, []byte(*p.Notes), []byte("notes"))
			if err != nil {
				return err
			}
			patch.NotesEnc = enc
		}
	}
	if p.Kind != nil {
		patch.SetKind, patch.Kind = true, *p.Kind
	}
	if p.Rating != nil {
		// Stars, not a free-form score: anything outside 0–5 is a client bug, and
		// storing it would put a row in the table no UI can render or clear.
		patch.SetRating, patch.Rating = true, min(max(*p.Rating, 0), 5)
	}
	if p.Favorite != nil {
		patch.SetFavorite, patch.Favorite = true, *p.Favorite
	}
	if err := s.db.UpdateMedia(ctx, id, patch); err != nil {
		return err
	}
	for _, t := range p.AddTags {
		if t = strings.TrimSpace(t); t != "" {
			if err := s.db.AddTag(ctx, id, t, "general", "manual", 0); err != nil {
				s.log.Warn("add tag", "media", id, "tag", t, "err", err)
			}
		}
	}
	for _, t := range p.RemoveTags {
		if t = strings.TrimSpace(t); t != "" {
			if err := s.db.RemoveTag(ctx, id, t); err != nil {
				s.log.Warn("remove tag", "media", id, "tag", t, "err", err)
			}
		}
	}
	return nil
}

// deleteMediaByID removes a row and unlinks its blob (+ thumb, if unreferenced).
func (s *Server) deleteMediaByID(r *http.Request, id int64) error {
	blob, thumb, err := s.db.DeleteMedia(r.Context(), id)
	if err != nil {
		return err
	}
	if blob != "" {
		if err := s.store.Delete(blob); err != nil {
			s.log.Warn("delete blob", "media", id, "path", blob, "err", err)
		}
	}
	// Thumbs are content-addressed and may be shared; only unlink when no other
	// row references this poster.
	if thumb != "" && thumb != blob {
		if n, err := s.db.CountByThumbPath(r.Context(), thumb); err == nil && n == 0 {
			_ = s.store.Delete(thumb)
		}
	}
	return nil
}

func (s *Server) handleUpdateMedia(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	var p mediaPatchReq
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := s.updateMediaByID(r, id, p); errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		s.log.Error("update media", "media", id, "err", err)
		writeErr(w, http.StatusInternalServerError, "update failed")
		return
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	m := s.toModel(row)
	if tags, err := s.db.TagsForMedia(r.Context(), id); err == nil {
		m.Tags = tags
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleDeleteMedia(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	if err := s.deleteMediaByID(r, id); errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		s.log.Error("delete media", "media", id, "err", err)
		writeErr(w, http.StatusInternalServerError, "delete failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

const maxBulkIDs = 500

type bulkMediaReq struct {
	Action string        `json:"action"` // "delete" | "update"
	IDs    []int64       `json:"ids"`
	Patch  mediaPatchReq `json:"patch"`
}

// handleBulkMedia applies one action across many ids. A failure on one id doesn't
// sink the rest; the response lists which ids succeeded and which failed.
func (s *Server) handleBulkMedia(w http.ResponseWriter, r *http.Request) {
	var req bulkMediaReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if len(req.IDs) == 0 {
		writeErr(w, http.StatusBadRequest, "no ids")
		return
	}
	if len(req.IDs) > maxBulkIDs {
		writeErr(w, http.StatusBadRequest, "too many ids")
		return
	}
	if req.Action != "delete" && req.Action != "update" {
		writeErr(w, http.StatusBadRequest, "unknown action")
		return
	}
	ok := make([]int64, 0, len(req.IDs))
	failed := make([]int64, 0)
	for _, id := range req.IDs {
		var err error
		if req.Action == "delete" {
			err = s.deleteMediaByID(r, id)
		} else {
			err = s.updateMediaByID(r, id, req.Patch)
		}
		if err != nil {
			s.log.Warn("bulk media item failed", "action", req.Action, "media", id, "err", err)
			failed = append(failed, id)
			continue
		}
		ok = append(ok, id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": ok, "failed": failed})
}

func (s *Server) handleStreamMedia(w http.ResponseWriter, r *http.Request) {
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
	name := s.decrypt(row.TitleEnc, "title")
	ct := mime.TypeByExtension(filepath.Ext(name))
	if ct == "" {
		// Scraped items are often titled without a file extension; fall back to a
		// type implied by the stored kind so the browser still plays it inline.
		ct = contentTypeForKind(row.Kind)
	}
	// The title is user-controlled, so its extension can drive Content-Type to
	// text/html (an item titled "x.html"); serving that inline would execute script
	// on our origin. Restrict to safe media types. ServeContent honors the header we
	// set here rather than sniffing, and the global nosniff header covers the rest.
	w.Header().Set("Content-Type", safeInlineContentType(ct))

	rs, err := s.store.OpenSeeker(row.BlobPath, row.Size)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "blob error")
		return
	}
	defer rs.Close()
	// ServeContent advertises Accept-Ranges and answers Range requests with 206 +
	// Content-Range — this is what lets the browser seek/scrub video and audio
	// (and resume interrupted downloads). A zero modtime skips Last-Modified.
	http.ServeContent(w, r, name, time.Time{}, rs)
}

// contentTypeForKind gives a best-effort MIME type from a media kind, used when
// the stored title carries no usable file extension. These are the most common
// container per kind; exact-typed items still win via the extension above.
func contentTypeForKind(kind string) string {
	switch models.MediaKind(kind) {
	case models.KindVideo:
		return "video/mp4"
	case models.KindGIF:
		return "image/gif"
	case models.KindImage:
		return "image/jpeg"
	default:
		return "application/octet-stream"
	}
}

// toModel decrypts sensitive columns and builds the API view.
func (s *Server) toModel(row *db.MediaRow) models.Media {
	m := models.Media{
		ID:        row.ID,
		Kind:      models.MediaKind(row.Kind),
		SHA256:    row.SHA256,
		Size:      row.Size,
		Title:     s.decrypt(row.TitleEnc, "title"),
		Notes:     s.decrypt(row.NotesEnc, "notes"),
		Source:    s.decrypt(row.SourceEnc, "source"),
		Rating:    row.Rating,
		Favorite:  row.Favorite,
		Duration:  row.Duration.Float64,
		Width:     int(row.Width.Int64),
		Height:    int(row.Height.Int64),
		PageCount: int(row.PageCount.Int64),
		HasThumb:  row.ThumbPath.Valid && row.ThumbPath.String != "",
		Download:  s.decrypt(row.DownloadEnc, "download"),
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
	}
	if gj := s.decrypt(row.GalleryEnc, "gallery"); gj != "" {
		_ = json.Unmarshal([]byte(gj), &m.Gallery)
	}
	return m
}

func (s *Server) decrypt(blob []byte, aad string) string {
	if len(blob) == 0 {
		return ""
	}
	pt, err := crypto.OpenBytes(s.kek, blob, []byte(aad))
	if err != nil {
		s.log.Warn("decrypt field failed", "aad", aad, "err", err)
		return ""
	}
	return string(pt)
}
