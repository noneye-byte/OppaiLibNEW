package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
)

// The categories the studio's LoRAs are sorted into. They are OppaiLib's own (see
// the table comment in schema.sql): the status hands each LoRA its category and the
// list of them, and these endpoints make, rename, delete and fill them.

// loraCategoryOut is one category as the clients see it. Count is how many LoRAs
// are in it, which may count one the generator no longer lists.
type loraCategoryOut struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// loraCategoryList is every category with its count.
func (s *Server) loraCategoryList(ctx context.Context) ([]loraCategoryOut, error) {
	cats, err := s.db.LoraCategories(ctx)
	if err != nil {
		return nil, err
	}
	members, err := s.db.LoraCategoryMembers(ctx)
	if err != nil {
		return nil, err
	}
	counts := map[int64]int{}
	for _, id := range members {
		counts[id]++
	}
	out := make([]loraCategoryOut, 0, len(cats))
	for _, c := range cats {
		out = append(out, loraCategoryOut{ID: c.ID, Name: c.Name, Count: counts[c.ID]})
	}
	return out, nil
}

// overlayLoraCategories gives the status's LoRAs their categories and returns the
// list of them, counted over the LoRAs the generator lists now. Best-effort: a
// failed read leaves the picker without categories rather than failing the status.
func (s *Server) overlayLoraCategories(ctx context.Context, loras []imagegen.Lora) []loraCategoryOut {
	cats, err := s.db.LoraCategories(ctx)
	if err != nil {
		s.log.Warn("lora categories", "err", err)
		return []loraCategoryOut{}
	}
	members, err := s.db.LoraCategoryMembers(ctx)
	if err != nil {
		s.log.Warn("lora categories", "err", err)
		members = nil
	}
	counts := map[int64]int{}
	for i := range loras {
		if id, ok := members[loras[i].Name]; ok {
			loras[i].Category = id
			counts[id]++
		}
	}
	out := make([]loraCategoryOut, 0, len(cats))
	for _, c := range cats {
		out = append(out, loraCategoryOut{ID: c.ID, Name: c.Name, Count: counts[c.ID]})
	}
	return out
}

type loraCategoryReq struct {
	Name string `json:"name"`
}

// readCategoryName reads and checks a category's name, writing the 400 itself.
func readCategoryName(w http.ResponseWriter, r *http.Request) (string, bool) {
	var req loraCategoryReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		writeErr(w, http.StatusBadRequest, "a category name is required")
		return "", false
	}
	name := strings.TrimSpace(req.Name)
	if len([]rune(name)) > 80 {
		writeErr(w, http.StatusBadRequest, "that name is too long")
		return "", false
	}
	return name, true
}

func (s *Server) handleLoraCategories(w http.ResponseWriter, r *http.Request) {
	list, err := s.loraCategoryList(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"categories": list})
}

// handleLoraCategoryCreate makes a category, or answers with the one by that name.
func (s *Server) handleLoraCategoryCreate(w http.ResponseWriter, r *http.Request) {
	name, ok := readCategoryName(w, r)
	if !ok {
		return
	}
	c, err := s.db.CreateLoraCategory(r.Context(), name)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.writeLoraCategory(w, r.Context(), c.ID, http.StatusCreated)
}

func (s *Server) handleLoraCategoryRename(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	name, ok := readCategoryName(w, r)
	if !ok {
		return
	}
	switch err := s.db.RenameLoraCategory(r.Context(), id, name); {
	case errors.Is(err, db.ErrCategoryNameTaken):
		writeErr(w, http.StatusConflict, err.Error())
		return
	case errors.Is(err, sql.ErrNoRows):
		writeErr(w, http.StatusNotFound, "no such category")
		return
	case err != nil:
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.writeLoraCategory(w, r.Context(), id, http.StatusOK)
}

// handleLoraCategoryDelete removes a category. Its LoRAs stay, in none.
func (s *Server) handleLoraCategoryDelete(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := s.db.DeleteLoraCategory(r.Context(), id); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type loraCategoryAssignReq struct {
	// Category 0 takes the LoRAs out of whichever they are in.
	Category int64    `json:"category"`
	Loras    []string `json:"loras"`
}

// handleLoraCategoryAssign puts LoRAs in a category, or in none, and answers with
// the categories as they now stand.
func (s *Server) handleLoraCategoryAssign(w http.ResponseWriter, r *http.Request) {
	var req loraCategoryAssignReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256<<10)).Decode(&req); err != nil || req.Category < 0 {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	names := make([]string, 0, len(req.Loras))
	for _, n := range req.Loras {
		if n = strings.TrimSpace(n); n != "" {
			names = append(names, n)
		}
	}
	if len(names) == 0 || len(names) > 1000 {
		writeErr(w, http.StatusBadRequest, "name between 1 and 1000 LoRAs")
		return
	}
	if err := s.db.SetLoraCategory(r.Context(), req.Category, names); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeErr(w, http.StatusNotFound, "no such category")
			return
		}
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.handleLoraCategories(w, r)
}

// writeLoraCategory answers with one category, counted.
func (s *Server) writeLoraCategory(w http.ResponseWriter, ctx context.Context, id int64, status int) {
	list, err := s.loraCategoryList(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	for _, c := range list {
		if c.ID == id {
			writeJSON(w, status, c)
			return
		}
	}
	writeErr(w, http.StatusNotFound, "no such category")
}
