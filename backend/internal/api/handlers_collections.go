package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

// Collections: the endpoints for a named, ordered list of library items.
//
// The tables were in the schema from the first commit with nothing to reach them, so
// there is no compatibility to keep here — the shape is just what the grid needs:
// list them, make one, put items on it, read one back as a page of media the same
// way /api/media returns a page.

type collectionReq struct {
	Name string `json:"name"`
}

type collectionItemsReq struct {
	MediaIDs []int64 `json:"mediaIds"`
}

// collectionJSON is one collection as the client sees it.
type collectionJSON struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Count     int    `json:"count"`
	Cover     int64  `json:"cover"`
	CreatedAt int64  `json:"createdAt"`
}

func toCollectionJSON(c db.Collection) collectionJSON {
	return collectionJSON{ID: c.ID, Name: c.Name, Count: c.Count, Cover: c.Cover, CreatedAt: c.CreatedAt}
}

func (s *Server) handleListCollections(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.ListCollections(r.Context())
	if err != nil {
		s.log.Error("list collections", "err", err)
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]collectionJSON, 0, len(rows))
	for _, c := range rows {
		out = append(out, toCollectionJSON(c))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (s *Server) handleCreateCollection(w http.ResponseWriter, r *http.Request) {
	var req collectionReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	id, err := s.db.CreateCollection(r.Context(), req.Name)
	if errors.Is(err, db.ErrDuplicateName) {
		writeErr(w, http.StatusConflict, err.Error())
		return
	} else if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id, "name": req.Name})
}

func (s *Server) handleRenameCollection(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req collectionReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	err := s.db.RenameCollection(r.Context(), id, req.Name)
	switch {
	case errors.Is(err, db.ErrDuplicateName):
		writeErr(w, http.StatusConflict, err.Error())
	case errors.Is(err, sql.ErrNoRows):
		writeErr(w, http.StatusNotFound, "no such collection")
	case err != nil:
		writeErr(w, http.StatusBadRequest, err.Error())
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func (s *Server) handleDeleteCollection(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	err := s.db.DeleteCollection(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "no such collection")
		return
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleCollectionItems returns one page of a collection, in the collection's own
// order — the same item shape /api/media returns, so the grid renders it with the
// code it already has.
func (s *Server) handleCollectionItems(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	ctx := r.Context()
	c, err := s.db.GetCollection(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "no such collection")
		return
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	offset, _ := strconv.Atoi(q.Get("offset"))
	if offset < 0 {
		offset = 0
	}
	ids, err := s.db.CollectionMediaIDs(ctx, id, limit, offset)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	rows, err := s.db.MediaByIDs(ctx, ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]models.Media, 0, len(rows))
	rowIDs := make([]int64, 0, len(rows))
	for _, row := range rows {
		out = append(out, s.toModel(row))
		rowIDs = append(rowIDs, row.ID)
	}
	if tags, err := s.db.TagsForMediaBatch(ctx, rowIDs); err == nil {
		for i := range out {
			out[i].Tags = tags[out[i].ID]
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"collection": toCollectionJSON(*c),
		"items":      out,
		"total":      c.Count,
	})
}

func (s *Server) handleAddToCollection(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req collectionItemsReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if _, err := s.db.GetCollection(r.Context(), id); errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "no such collection")
		return
	}
	added, err := s.db.AddToCollection(r.Context(), id, req.MediaIDs)
	if err != nil {
		s.log.Error("add to collection", "collection", id, "err", err)
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"added": added})
}

func (s *Server) handleRemoveFromCollection(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	mediaID, err := strconv.ParseInt(r.PathValue("media"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad media id")
		return
	}
	err = s.db.RemoveFromCollection(r.Context(), id, mediaID)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not on that collection")
		return
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleReorderCollection(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req collectionItemsReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := s.db.ReorderCollection(r.Context(), id, req.MediaIDs); err != nil {
		s.log.Error("reorder collection", "collection", id, "err", err)
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleMediaCollections is which lists one item is on, for the viewer's own menu.
func (s *Server) handleMediaCollections(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	rows, err := s.db.CollectionsOfMedia(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]collectionJSON, 0, len(rows))
	for _, c := range rows {
		out = append(out, toCollectionJSON(c))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

// pathID reads the {id} path value, writing the 400 itself so every handler above
// stays two lines shorter.
func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return 0, false
	}
	return id, true
}
