package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/youruser/oppailib/internal/db"
)

// A phone's key for what is shared to it.
//
//	POST   /api/share/key        (session)  {name} → {key, id}: this phone's share key, replacing one of the same name
//	DELETE /api/share/key        (the key)  the phone dropping its own key on sign-out
//	GET    /api/share/keys       (session)  the phones holding one
//	DELETE /api/share/keys/{id}  (session)  revoke one — a phone that was lost
//
// Sharing a video from the gallery to OppaiLib queued its upload on the phone's
// session, and the phone ends that session the moment it leaves the screen: it locks
// itself (or signs out) on every trip to the background, so that the library is never
// one app switch away for whoever picks it up. A share is by its nature a trip to the
// background — you share, and you go back to what you were doing — so every upload
// bigger than a few chunks was refused halfway with a 401, and every link imported
// through the worker likewise. The lock was doing its job; the upload was simply
// standing on the wrong credential.
//
// A share key is the right one. It opens what adding needs and nothing that shows
// anything: the upload session, a page scraped for its media and that media imported.
// Whoever finds the phone unlocked and the app locked can put things into the library
// through it, and cannot see one thing that is in it.
const scopeShare = "share"

// shareKeyPath is every route a share key opens. The upload routes are the resumable
// upload's whole lifecycle (handlers_uploads.go) — the list included, since resuming
// reads it — and the scrape pair is what a shared link becomes.
var shareKeyPath = regexp.MustCompile(`^/api/(uploads(/[A-Za-z0-9_-]+(/chunk/\d+|/complete)?)?|scrape|scrape/import|share/key)$`)

func (s *Server) handleCreateShareKey(w http.ResponseWriter, r *http.Request) {
	u, ok := r.Context().Value(userKey).(*db.UserRow)
	if !ok || u == nil {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	if _, isKey := r.Context().Value(apiKeyCtx).(*db.APIKeyRow); isKey {
		// A share key asking for another would be a way to outlive its own revocation.
		writeErr(w, http.StatusForbidden, "a key cannot make keys")
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req)
	name, _ := cleanLimited(req.Name, 80)
	if name = strings.TrimSpace(name); name == "" {
		name = "Phone"
	}
	// One key per phone. A phone that asks again — reinstalled, or signed in afresh —
	// replaces its key rather than leaving the old one working beside it.
	if keys, err := s.db.ListAPIKeys(r.Context(), u.ID, scopeShare); err == nil {
		for _, k := range keys {
			if k.Name == name {
				_, _ = s.db.DeleteAPIKey(r.Context(), u.ID, k.ID)
			}
		}
	}
	key := apiKeyPrefix + randomToken(32)
	id, err := s.db.CreateAPIKey(r.Context(), u.ID, scopeShare, name, hashAPIKey(key), key[len(key)-4:])
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"key": key, "id": id, "name": name})
}

// handleDropShareKey is the phone revoking its own key when it is signed out, so a
// sign-out leaves nothing that can still add to the library.
func (s *Server) handleDropShareKey(w http.ResponseWriter, r *http.Request) {
	row, ok := r.Context().Value(apiKeyCtx).(*db.APIKeyRow)
	if !ok || row.Scope != scopeShare {
		writeErr(w, http.StatusBadRequest, "only a share key can drop itself — revoke keys from the list instead")
		return
	}
	if _, err := s.db.DeleteAPIKey(r.Context(), row.UserID, row.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListShareKeys(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userKey).(*db.UserRow)
	keys, err := s.db.ListAPIKeys(r.Context(), u.ID, scopeShare)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]apiKeyView, 0, len(keys))
	for _, k := range keys {
		out = append(out, apiKeyView{ID: k.ID, Name: k.Name, Hint: k.Hint, CreatedAt: k.CreatedAt, LastUsedAt: k.LastUsedAt})
	}
	sort.SliceStable(out, func(a, b int) bool { return out[a].CreatedAt > out[b].CreatedAt })
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (s *Server) handleRevokeShareKey(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userKey).(*db.UserRow)
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	// Only a share key: this list must not become a way to revoke another kind.
	keys, err := s.db.ListAPIKeys(r.Context(), u.ID, scopeShare)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	found := false
	for _, k := range keys {
		found = found || k.ID == id
	}
	if !found {
		writeErr(w, http.StatusNotFound, "no such key")
		return
	}
	if _, err := s.db.DeleteAPIKey(r.Context(), u.ID, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
