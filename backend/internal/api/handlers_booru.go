package api

import (
	"net/http"
	"strings"

	"github.com/youruser/oppailib/internal/imagegen"
)

func (s *Server) handleBooruTags(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	extra, err := s.db.SearchTagNames(r.Context(), query, 50)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't search tags")
		return
	}
	suggestions, correction := imagegen.SuggestTags(query, extra, 12)
	writeJSON(w, http.StatusOK, map[string]any{
		"suggestions": suggestions,
		"correction":  correction,
	})
}
