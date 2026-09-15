package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/thumbnail"
)

// Scene bookmarks: the good part, kept.
//
// Progress (handlers_progress.go) is where you *were*; this is where you want to be
// able to get back to. One item can carry several, each with a name and a frame, and
// the frame is what makes the list readable: a row of timestamps is a table, a row of
// pictures is a memory.
//
// Grabbing the frame costs a full decrypt of the video to a temp file, exactly as the
// poster picker pays (handlers_poster.go), because ffmpeg needs something seekable.
// A bookmark is made one at a time by a person pressing a button, so that is a
// tolerable price, and the frame is optional: without ffmpeg the mark still lands and
// the list shows the item's poster in its place.

// maxBookmarkLabel bounds a name. It is a caption under a thumbnail, not notes.
const maxBookmarkLabel = 80

// bookmarkThumbWidth matches the poster strip: a tile in a list, not a still to admire.
const bookmarkThumbWidth = posterStripWidth

type bookmarkReq struct {
	Position float64 `json:"position"`
	Label    string  `json:"label"`
}

// bookmarkJSON is one mark as the clients see it. Title and kind ride along on the
// cross-library list so a "moments" shelf can draw a tile without a media fetch each.
type bookmarkJSON struct {
	ID        int64   `json:"id"`
	MediaID   int64   `json:"mediaId"`
	Position  float64 `json:"position"`
	Label     string  `json:"label"`
	HasThumb  bool    `json:"hasThumb"`
	CreatedAt int64   `json:"createdAt"`
	Title     string  `json:"title,omitempty"`
	Kind      string  `json:"kind,omitempty"`
}

func (s *Server) toBookmarkJSON(b db.Bookmark) bookmarkJSON {
	return bookmarkJSON{
		ID: b.ID, MediaID: b.MediaID, Position: b.Position,
		Label: s.decrypt(b.LabelEnc, "bookmark"), HasThumb: b.ThumbPath != "", CreatedAt: b.CreatedAt,
	}
}

func cleanBookmarkLabel(label string) string {
	label = strings.Join(strings.Fields(label), " ")
	if len(label) > maxBookmarkLabel {
		label = strings.TrimSpace(label[:maxBookmarkLabel])
	}
	return label
}

func (s *Server) handleListBookmarks(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	marks, err := s.db.BookmarksForMedia(r.Context(), userID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]bookmarkJSON, 0, len(marks))
	for _, b := range marks {
		out = append(out, s.toBookmarkJSON(b))
	}
	writeJSON(w, http.StatusOK, map[string]any{"bookmarks": out})
}

// handleAddBookmark marks a moment, grabbing a frame at it when the item is a video
// and ffmpeg is about. The frame failing is not the mark failing: the position and
// the name are the bookmark, the picture is a courtesy.
func (s *Server) handleAddBookmark(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	var req bookmarkReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Position < 0 {
		req.Position = 0
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if row.Kind != "video" && row.Kind != "gif" {
		writeErr(w, http.StatusBadRequest, "only videos have moments to bookmark")
		return
	}
	if row.Duration.Valid && row.Duration.Float64 > 0 && req.Position > row.Duration.Float64 {
		req.Position = row.Duration.Float64
	}
	var labelEnc []byte
	if label := cleanBookmarkLabel(req.Label); label != "" {
		if labelEnc, err = crypto.SealBytes(s.kek, []byte(label), []byte("bookmark")); err != nil {
			writeErr(w, http.StatusInternalServerError, "couldn't store the label")
			return
		}
	}
	thumbPath := ""
	if row.Kind == "video" {
		thumbPath = s.grabBookmarkFrame(r.Context(), row.BlobPath, req.Position)
	}
	bid, err := s.db.AddBookmark(r.Context(), userID, id, req.Position, labelEnc, thumbPath)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	mark, err := s.db.GetBookmark(r.Context(), userID, bid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, s.toBookmarkJSON(mark))
}

// grabBookmarkFrame renders the frame at a position into the blob store and returns
// its path, or "" when it could not — no ffmpeg, an unreadable region, a timeout.
// Logged at debug because none of those is worth a warning per bookmark.
func (s *Server) grabBookmarkFrame(ctx context.Context, blobPath string, at float64) string {
	if !thumbnail.Available() {
		return ""
	}
	tmpPath, cleanup, err := s.decryptToTemp(blobPath)
	defer cleanup()
	if err != nil {
		s.log.Debug("bookmark: decrypt failed", "err", err)
		return ""
	}
	ctx, cancel := context.WithTimeout(ctx, thumbnail.DefaultTimeout)
	defer cancel()
	jpeg, err := thumbnail.FrameAt(ctx, tmpPath, at, bookmarkThumbWidth)
	if err != nil {
		s.log.Debug("bookmark: frame failed", "at", at, "err", err)
		return ""
	}
	put, err := s.store.Put(bytes.NewReader(jpeg))
	if err != nil {
		s.log.Debug("bookmark: store failed", "err", err)
		return ""
	}
	return put.RelPath
}

func (s *Server) handleRelabelBookmark(w http.ResponseWriter, r *http.Request) {
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	bid, ok := pathValueID(w, r, "bookmark")
	if !ok {
		return
	}
	var req bookmarkReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	var labelEnc []byte
	if label := cleanBookmarkLabel(req.Label); label != "" {
		var err error
		if labelEnc, err = crypto.SealBytes(s.kek, []byte(label), []byte("bookmark")); err != nil {
			writeErr(w, http.StatusInternalServerError, "couldn't store the label")
			return
		}
	}
	if err := s.db.RelabelBookmark(r.Context(), userID, bid, labelEnc); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	mark, err := s.db.GetBookmark(r.Context(), userID, bid)
	if err != nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, s.toBookmarkJSON(mark))
}

func (s *Server) handleDeleteBookmark(w http.ResponseWriter, r *http.Request) {
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	bid, ok := pathValueID(w, r, "bookmark")
	if !ok {
		return
	}
	// The frame blob is left in the store on purpose, for the reason a replaced poster
	// is: the store is content-addressed and a frame is small, so an orphan is cheaper
	// than a deletion that turns out to be shared.
	if err := s.db.DeleteBookmark(r.Context(), userID, bid); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleBookmarkThumb serves a mark's frame, falling back to the item's own poster
// when none was grabbed so a list never shows a hole.
func (s *Server) handleBookmarkThumb(w http.ResponseWriter, r *http.Request) {
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	bid, ok := pathValueID(w, r, "bookmark")
	if !ok {
		return
	}
	mark, err := s.db.GetBookmark(r.Context(), userID, bid)
	if err != nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	path := mark.ThumbPath
	if path == "" {
		row, err := s.db.GetMedia(r.Context(), mark.MediaID)
		if err != nil || !row.ThumbPath.Valid || row.ThumbPath.String == "" {
			writeErr(w, http.StatusNotFound, "no frame")
			return
		}
		path = row.ThumbPath.String
	}
	rc, err := s.store.Open(path)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "blob error")
		return
	}
	defer rc.Close()
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "private, max-age=86400")
	_, _ = io.Copy(w, rc)
}

// handleRecentBookmarks is the "moments" shelf: the user's latest marks across the
// library, with each item's title so the tile can be captioned.
func (s *Server) handleRecentBookmarks(w http.ResponseWriter, r *http.Request) {
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	marks, err := s.db.RecentBookmarks(r.Context(), userID, atoiDefault(r.URL.Query().Get("limit"), 50))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	ids := make([]int64, 0, len(marks))
	seen := map[int64]bool{}
	for _, b := range marks {
		if !seen[b.MediaID] {
			seen[b.MediaID] = true
			ids = append(ids, b.MediaID)
		}
	}
	briefs, _ := s.db.BriefsByIDs(r.Context(), ids)
	titles := make(map[int64]db.MediaBrief, len(briefs))
	for _, brief := range briefs {
		titles[brief.ID] = brief
	}
	out := make([]bookmarkJSON, 0, len(marks))
	for _, b := range marks {
		item := s.toBookmarkJSON(b)
		if brief, ok := titles[b.MediaID]; ok {
			item.Title = s.decrypt(brief.TitleEnc, "title")
			item.Kind = brief.Kind
		}
		out = append(out, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"bookmarks": out})
}

// pathValueID reads a named numeric path value, writing the 400 itself like pathID.
func pathValueID(w http.ResponseWriter, r *http.Request, name string) (int64, bool) {
	var id int64
	if _, err := fmt.Sscanf(r.PathValue(name), "%d", &id); err != nil || id <= 0 {
		writeErr(w, http.StatusBadRequest, "bad id")
		return 0, false
	}
	return id, true
}

// formatTimecode renders seconds as m:ss or h:mm:ss, the way a person names a moment.
func formatTimecode(seconds float64) string {
	if seconds < 0 {
		seconds = 0
	}
	total := int(seconds + 0.5)
	h, m, s := total/3600, (total%3600)/60, total%60
	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%d:%02d", m, s)
}

// parseTimecode reads m:ss or h:mm:ss (and a bare number of seconds) back. ok is
// false for anything else, so a title that happens to contain a colon is not a time.
func parseTimecode(text string) (float64, bool) {
	text = strings.TrimSpace(text)
	if text == "" {
		return 0, false
	}
	parts := strings.Split(text, ":")
	if len(parts) > 3 {
		return 0, false
	}
	total := 0.0
	for _, part := range parts {
		var n float64
		if _, err := fmt.Sscanf(strings.TrimSpace(part), "%g", &n); err != nil || n < 0 {
			return 0, false
		}
		total = total*60 + n
	}
	return total, true
}
