package api

import (
	"encoding/json"
	"net/http"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

// Resume: where this user was in something, kept server-side.
//
// It used to be localStorage, which made it per-device — the page you reached on the
// phone was not the page the desktop opened on — and videos had none at all. Both
// clients now write here, so a film started on the sofa carries on in bed.

type progressReq struct {
	Position float64 `json:"position"`
}

// progressJSON is one saved position. Duration rides along so a client can draw the
// bar without also holding the media row.
type progressJSON struct {
	MediaID   int64   `json:"mediaId"`
	Position  float64 `json:"position"`
	Duration  float64 `json:"duration"`
	UpdatedAt int64   `json:"updatedAt"`
}

func toProgressJSON(p db.Progress) progressJSON {
	return progressJSON{MediaID: p.MediaID, Position: p.Position, Duration: p.Duration, UpdatedAt: p.UpdatedAt}
}

// currentUserID is the id of the user this request is authenticated as. Handlers
// behind requireAuth always have one; zero means the middleware was bypassed, which
// the callers below treat as unauthenticated rather than as user zero.
func currentUserID(r *http.Request) int64 {
	if u, ok := r.Context().Value(userKey).(*db.UserRow); ok && u != nil {
		return u.ID
	}
	return 0
}

func (s *Server) handleGetProgress(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	p, err := s.db.GetProgress(r.Context(), userID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, toProgressJSON(p))
}

// handleSetProgress records a position. A position of zero deletes the row rather
// than storing it: "back at the start" is not something to resume, and keeping it
// would put an item on the resume shelf that nobody is part-way through.
func (s *Server) handleSetProgress(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	var req progressReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	var err error
	if req.Position <= 0 {
		err = s.db.ClearProgress(r.Context(), userID, id)
	} else {
		err = s.db.SetProgress(r.Context(), userID, id, req.Position)
	}
	if err != nil {
		s.log.Error("set progress", "media", id, "err", err)
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleClearProgress(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	if err := s.db.ClearProgress(r.Context(), userID, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleResume is the "carry on with" shelf: the items this user is part-way
// through, most recent first, as full media rows with their positions attached.
func (s *Server) handleResume(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := currentUserID(r)
	if userID == 0 {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	ids, err := s.db.ResumeIDs(ctx, userID, 20)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	rows, err := s.db.MediaByIDs(ctx, ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	positions, err := s.db.ProgressForMedia(ctx, userID, ids)
	if err != nil {
		s.log.Warn("resume positions", "err", err)
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
	progress := make([]progressJSON, 0, len(rowIDs))
	for _, id := range rowIDs {
		if p, ok := positions[id]; ok {
			progress = append(progress, toProgressJSON(p))
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "progress": progress})
}
