package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"image"
	"net/http"
	"strconv"
)

// handleAutotag runs the AI tagger synchronously for one media item and returns
// its refreshed tag list. Useful for re-tagging or tagging older imports.
func (s *Server) handleAutotag(w http.ResponseWriter, r *http.Request) {
	if !s.ai.Enabled() {
		writeErr(w, http.StatusServiceUnavailable, "ai tagging disabled")
		return
	}
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
	if err := s.ai.TagMedia(r.Context(), id, row.BlobPath, row.Kind); err != nil {
		writeErr(w, http.StatusInternalServerError, "tagging failed: "+err.Error())
		return
	}
	tags, _ := s.db.TagsForMedia(r.Context(), id)
	writeJSON(w, http.StatusOK, map[string]any{"tags": tags})
}

type scanImageReq struct {
	ImageData string `json:"imageData"`
}

type scanTag struct {
	Tag      string  `json:"tag"`
	Category string  `json:"category"`
	Score    float64 `json:"score"`
}

// handleScanImage runs the AI tagger over an uploaded image (not a library item)
// and returns the booru-style tags it finds. It's used by the character editor to
// pre-fill a character's prompt from a reference picture. The image is never
// stored: it's decoded, tagged, and discarded.
func (s *Server) handleScanImage(w http.ResponseWriter, r *http.Request) {
	if !s.ai.Enabled() {
		writeErr(w, http.StatusServiceUnavailable, "ai tagging disabled")
		return
	}
	var req scanImageReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ImageData == "" {
		writeErr(w, http.StatusBadRequest, "imageData is required")
		return
	}
	raw, err := decodeDataImage(req.ImageData)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad image data")
		return
	}
	if len(raw) == 0 || len(raw) > maxModelThumbBytes {
		writeErr(w, http.StatusBadRequest, "image is empty or too large")
		return
	}
	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "unsupported image format")
		return
	}
	sug, err := s.ai.TagImage(r.Context(), img)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "scan failed: "+err.Error())
		return
	}
	out := make([]scanTag, 0, len(sug))
	for _, x := range sug {
		out = append(out, scanTag{Tag: x.Name, Category: x.Category, Score: x.Score})
	}
	writeJSON(w, http.StatusOK, map[string]any{"tags": out})
}
