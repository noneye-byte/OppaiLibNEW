package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

// Keys, and how Launchy gets one.
//
//	POST   /api/launchy/pairing     (session)  a one-time code for a launchy://link link
//	POST   /api/launchy/pair        (none)     {code, name} → {key, user}: the launcher redeems the code
//	GET    /api/launchy/keys        (session)  the keys Launchy holds
//	DELETE /api/launchy/keys/{id}   (session)  revoke one
//	DELETE /api/launchy/key         (the key)  the launcher unlinking itself
//
// Launchy used to pair by signing in with a username and password, and hold the
// session that bought it. That session was a browser's as far as the server could
// tell, so it idled out after an hour without a request it counted as activity and
// was purged on every restart — the launcher came unpaired by itself, over and over,
// with nothing on screen to say why. A key does not idle and survives a restart;
// it lasts until someone revokes it.
//
// The key never travels in a link. The web client asks for a pairing *code* — single
// use, gone in ten minutes, held only in memory — and puts that in the
// launchy://link link; Launchy trades it for the key directly. So a link left in a
// browser's history or pasted into a chat is worthless by the time anyone finds it,
// and the key exists in exactly two places: the server's hash and the launcher.

const (
	apiKeyPrefix = "olk_"
	scopeLaunchy = "launchy"
	// pairingTTL is how long a link stays good. Long enough to click it on the PC
	// after finding the page; short enough that a stale one is useless.
	pairingTTL = 10 * time.Minute
)

const apiKeyCtx ctxKey = "apiKey"

func hashAPIKey(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

func randomToken(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// launchyKeyPath matches the routes outside /api/launchy that the launcher's sync
// genuinely uses: a game's cover, its save bundles, and handing over an itch.io
// sign-in. Everything else — the library, the chat, settings — is out of a key's
// reach even though the key belongs to a full account, so a launcher's key lifted
// from a PC opens the launcher's door and no other.
var launchyKeyPath = regexp.MustCompile(`^/api/(media/\d+/thumb|media/\d+/saves(/\d+)?|games/sites/[a-z0-9.]+/login)$`)

// keyScopeAllows reports whether a key of this scope may make the request.
func keyScopeAllows(scope string, r *http.Request) bool {
	if scope != scopeLaunchy {
		return false
	}
	p := r.URL.Path
	if p == "/api/launchy" || strings.HasPrefix(p, "/api/launchy/") {
		// A key cannot mint or list keys: that is a person's decision, made signed in.
		return !strings.HasPrefix(p, "/api/launchy/keys") && p != "/api/launchy/pairing"
	}
	return launchyKeyPath.MatchString(p)
}

// serveWithKey is requireSession's half for a request signed with a key.
func (s *Server) serveWithKey(w http.ResponseWriter, r *http.Request, key string, next http.HandlerFunc) {
	row, user, err := s.db.APIKeyUser(r.Context(), hashAPIKey(key))
	if err != nil {
		// Launchy reads a 401 as "pair again", which is exactly right for a revoked key.
		writeErr(w, http.StatusUnauthorized, "this key has been revoked")
		return
	}
	if !keyScopeAllows(row.Scope, r) {
		writeErr(w, http.StatusForbidden, "this key only opens Launchy's part of the server")
		return
	}
	if err := s.db.TouchAPIKey(r.Context(), row.ID); err != nil {
		s.log.Debug("touch api key", "err", err)
	}
	ctx := context.WithValue(r.Context(), userKey, user)
	ctx = context.WithValue(ctx, apiKeyCtx, row)
	next(w, r.WithContext(ctx))
}

/* -------------------------------------------------------------- pairing */

type pairing struct {
	userID  int64
	expires time.Time
}

// pairings holds the codes waiting to be redeemed. Memory only: a restart forgets
// them, which costs nothing worse than asking for a fresh link.
type pairings struct {
	mu    sync.Mutex
	codes map[string]pairing
}

func (p *pairings) issue(userID int64) (string, time.Time) {
	code := randomToken(24)
	expires := time.Now().Add(pairingTTL)
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.codes == nil {
		p.codes = map[string]pairing{}
	}
	for c, old := range p.codes {
		if time.Now().After(old.expires) {
			delete(p.codes, c)
		}
	}
	p.codes[code] = pairing{userID: userID, expires: expires}
	return code, expires
}

// redeem spends a code. A code works once: the second launcher to present it is
// refused even inside the ten minutes.
func (p *pairings) redeem(code string) (int64, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	got, ok := p.codes[code]
	delete(p.codes, code)
	if !ok || time.Now().After(got.expires) {
		return 0, false
	}
	return got.userID, true
}

func (s *Server) handleLaunchyPairing(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userKey).(*db.UserRow)
	code, expires := s.launchyPairings.issue(u.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"code": code, "expiresAt": expires.Unix()})
}

// handleLaunchyPair is the launcher redeeming a code. Unauthenticated by necessity —
// the code is the credential — and it answers a bad code the same whether it never
// existed, was spent, or ran out, so nothing can be learned by guessing.
func (s *Server) handleLaunchyPair(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
		Name string `json:"name"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil || strings.TrimSpace(req.Code) == "" {
		writeErr(w, http.StatusBadRequest, "need a code")
		return
	}
	userID, ok := s.launchyPairings.redeem(strings.TrimSpace(req.Code))
	if !ok {
		// Deliberately 403, not 401: this is not anyone's session ending.
		writeErr(w, http.StatusForbidden, "that link has expired or was already used — make a new one in OppaiLib")
		return
	}
	user, err := s.db.UserByID(r.Context(), userID)
	if err != nil {
		writeErr(w, http.StatusForbidden, "the account that made this link is gone")
		return
	}
	name := strings.TrimSpace(req.Name)
	if len(name) > 80 {
		name = name[:80]
	}
	if name == "" {
		name = "Launchy"
	}
	// Linking the same PC again replaces its key rather than leaving the old one
	// working beside it: a PC re-linked because something went wrong should not
	// leave a second way in behind.
	if keys, err := s.db.ListAPIKeys(r.Context(), userID, scopeLaunchy); err == nil {
		for _, k := range keys {
			if k.Name == name {
				_, _ = s.db.DeleteAPIKey(r.Context(), userID, k.ID)
			}
		}
	}
	key := apiKeyPrefix + randomToken(32)
	id, err := s.db.CreateAPIKey(r.Context(), userID, scopeLaunchy, name, hashAPIKey(key), key[len(key)-4:])
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"key": key, "id": id, "user": user.Username})
}

type apiKeyView struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Hint       string `json:"hint"`
	CreatedAt  int64  `json:"createdAt"`
	LastUsedAt int64  `json:"lastUsedAt,omitempty"`
}

func (s *Server) handleListLaunchyKeys(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userKey).(*db.UserRow)
	keys, err := s.db.ListAPIKeys(r.Context(), u.ID, scopeLaunchy)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]apiKeyView, 0, len(keys))
	for _, k := range keys {
		out = append(out, apiKeyView{ID: k.ID, Name: k.Name, Hint: k.Hint, CreatedAt: k.CreatedAt, LastUsedAt: k.LastUsedAt})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (s *Server) handleRevokeLaunchyKey(w http.ResponseWriter, r *http.Request) {
	u := r.Context().Value(userKey).(*db.UserRow)
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	existed, err := s.db.DeleteAPIKey(r.Context(), u.ID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !existed {
		writeErr(w, http.StatusNotFound, "no such key")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleUnlinkLaunchy is the launcher revoking its own key when told to unlink, so
// "Unlink" on the PC leaves nothing behind on the server.
func (s *Server) handleUnlinkLaunchy(w http.ResponseWriter, r *http.Request) {
	row, ok := r.Context().Value(apiKeyCtx).(*db.APIKeyRow)
	if !ok {
		writeErr(w, http.StatusBadRequest, "only a key can unlink itself — revoke keys from the list instead")
		return
	}
	if _, err := s.db.DeleteAPIKey(r.Context(), row.UserID, row.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
