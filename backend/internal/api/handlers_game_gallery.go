package api

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

func (s *Server) gameID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad game id")
		return 0, false
	}
	ok, err := s.db.IsGame(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "game not found")
		return 0, false
	}
	if err != nil || !ok {
		writeErr(w, http.StatusBadRequest, "gallery uploads require a game")
		return 0, false
	}
	return id, true
}

func (s *Server) handleListGameGallery(w http.ResponseWriter, r *http.Request) {
	gameID, ok := s.gameID(w, r)
	if !ok {
		return
	}
	rows, err := s.db.ListGameGallery(r.Context(), gameID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't list game gallery")
		return
	}
	items := make([]models.Media, 0, len(rows))
	for _, row := range rows {
		items = append(items, s.toModel(row))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) handleUploadGameGallery(w http.ResponseWriter, r *http.Request) {
	gameID, ok := s.gameID(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxUpload)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid gallery upload")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "missing 'file'")
		return
	}
	defer file.Close()
	put, err := s.store.Put(file)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	kind := s.recognizeKind(put.RelPath, put.Size, header.Filename)
	if kind != models.KindImage && kind != models.KindGIF && kind != models.KindVideo {
		writeErr(w, http.StatusBadRequest, "game galleries accept photos, GIFs, and videos")
		return
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(header.Filename), []byte("title"))
	mediaID, existed, err := s.db.InsertMedia(r.Context(), &db.MediaRow{
		Kind: string(kind), SHA256: put.SHA256, Size: put.Size, BlobPath: put.RelPath, TitleEnc: titleEnc,
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if err := s.db.AddGameGalleryMedia(r.Context(), gameID, mediaID); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't attach gallery item")
		return
	}
	if !existed {
		s.processIngestAsync(mediaID, put.RelPath, string(kind), put.Size, 0)
	}
	row, err := s.db.GetMedia(r.Context(), mediaID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read gallery item")
		return
	}
	writeJSON(w, http.StatusCreated, s.toModel(row))
}

func (s *Server) handleRemoveGameGallery(w http.ResponseWriter, r *http.Request) {
	gameID, ok := s.gameID(w, r)
	if !ok {
		return
	}
	mediaID, err := strconv.ParseInt(r.PathValue("media"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad gallery media id")
		return
	}
	if err := s.db.RemoveGameGalleryMedia(r.Context(), gameID, mediaID); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't remove gallery item")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
