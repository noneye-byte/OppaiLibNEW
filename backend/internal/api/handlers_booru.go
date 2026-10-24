package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/youruser/oppailib/internal/imagegen"
)

// handleBooruTags completes the tag being typed into a prompt.
//
//	q=      the tag so far
//	limit=  how many (default 12, at most 50)
//
// items is the ranked completion with each tag's category and post count;
// suggestions and correction are the same answer as plain names, which is all an app
// older than the ranked list reads.
func (s *Server) handleBooruTags(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	extra, err := s.db.SearchTagNames(r.Context(), query, 50)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't search tags")
		return
	}
	items := imagegen.CompleteTags(query, extra, limit)
	names := make([]string, 0, len(items))
	for _, it := range items {
		names = append(names, it.Tag)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":       items,
		"suggestions": names,
		"correction":  imagegen.TagCorrection(query),
	})
}
