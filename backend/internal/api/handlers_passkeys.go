package api

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/youruser/oppailib/internal/auth"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

// Passkeys (WebAuthn).
//
// A password over a LAN is the weakest thing in this app: it is typed, it is reused, and
// on a plain-HTTP deployment it crosses the wire in the clear. A passkey is a keypair
// held by the device, so nothing guessable is transmitted and nothing worth stealing is
// stored — the database holds public keys only.
//
// The protocol work is delegated to go-webauthn rather than hand-rolled. Signing in is
// not a place to discover that a CBOR parser or an attestation check has an edge case:
// the failure mode is silent acceptance of a forged assertion, which is invisible until
// it matters. What this file owns is everything around the library, and those are the
// parts a deployment gets wrong:
//
//   - Relying-party configuration derived from the actual request, because an RP ID that
//     doesn't match the origin makes every registration fail with a browser-side error
//     that says nothing useful. It is derived per request rather than fixed at startup
//     since this app is reached by LAN IP, by hostname and through a reverse proxy, often
//     all three on one install.
//   - Challenges held server-side, single-use, and expiring. A challenge the client
//     supplies or that can be replayed is the whole of the replay protection.
//   - Passwords deliberately left working. The brief asks for that, and it is also the
//     recovery method: a lost authenticator must not be an unrecoverable account.

// challengeTTL bounds a ceremony. Long enough to find a security key in a drawer, short
// enough that an intercepted challenge is worthless by the time it is used.
const challengeTTL = 5 * time.Minute

// maxPasskeysPerUser bounds registrations. Generous — a phone, a laptop, a tablet and
// two hardware keys is a real setup — but not unbounded, since each row is storage an
// unauthenticated flow can never create but an authenticated one otherwise could grow
// without limit.
const maxPasskeysPerUser = 20

// pendingCeremony is one in-flight registration or login.
type pendingCeremony struct {
	session *webauthn.SessionData
	// userID is set for registration (we know who is enrolling) and for a login started
	// with a username. Zero for a discoverable login, where the credential names the user.
	userID  int64
	expires time.Time
}

// ceremonyStore holds in-flight challenges.
//
// In memory, not in the database. A challenge lives for one exchange over a handful of
// seconds and has no value afterwards, so persisting it would add a write per login
// attempt for nothing — and a restart invalidating in-flight ceremonies is correct
// behaviour rather than a limitation.
type ceremonyStore struct {
	mu   sync.Mutex
	byID map[string]*pendingCeremony
}

func newCeremonyStore() *ceremonyStore {
	return &ceremonyStore{byID: map[string]*pendingCeremony{}}
}

// put files a ceremony under a fresh opaque id and returns it.
func (c *ceremonyStore) put(p *pendingCeremony) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	id := base64.RawURLEncoding.EncodeToString(raw)
	p.expires = time.Now().Add(challengeTTL)

	c.mu.Lock()
	defer c.mu.Unlock()
	// Sweep on write. There is no background goroutine to leak, and the volume here is
	// a handful of entries — a login attempt, not a request stream.
	now := time.Now()
	for k, v := range c.byID {
		if now.After(v.expires) {
			delete(c.byID, k)
		}
	}
	c.byID[id] = p
	return id, nil
}

// take removes and returns a ceremony. Single use: a challenge that could be redeemed
// twice is a replayable one, and removing it here is the whole of that guarantee.
func (c *ceremonyStore) take(id string) (*pendingCeremony, bool) {
	if id == "" {
		return nil, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	p, ok := c.byID[id]
	if !ok {
		return nil, false
	}
	delete(c.byID, id)
	if time.Now().After(p.expires) {
		return nil, false
	}
	return p, ok
}

// ── relying party ──────────────────────────────────────────────────────

// webauthnFor builds a relying party for this request's origin.
//
// Derived per request, not configured once. This app is reached at a LAN IP, at a
// hostname, and through a reverse proxy — frequently all three against one install — and
// WebAuthn requires the RP ID to be the origin's registrable domain or a suffix of it. A
// single configured value would work for exactly one of those routes and fail on the rest
// with a browser error that names nothing.
//
// The consequence is worth stating: a credential is bound to the RP ID it was created
// under, so a passkey registered at "oppai.local" will not be offered at the LAN IP.
// That is WebAuthn working as designed rather than a bug, and the UI says so.
func (s *Server) webauthnFor(r *http.Request) (*webauthn.WebAuthn, error) {
	origin := requestOrigin(r)
	u, err := url.Parse(origin)
	if err != nil || u.Host == "" {
		return nil, fmt.Errorf("could not work out this server's origin for passkeys")
	}
	rpID := u.Hostname()
	if rpID == "" {
		return nil, errors.New("this server has no hostname to bind a passkey to")
	}

	return webauthn.New(&webauthn.Config{
		// The name the browser's own passkey sheet shows. It follows the disguise:
		// a system prompt announcing "OppaiLib" over a Nextcloud sign-in page would
		// undo the whole thing at the one moment someone is watching the screen.
		// Display-only — the credential is bound to RPID, which is the hostname and
		// does not change, so existing passkeys keep working either way.
		RPDisplayName: s.loginRealm(),
		RPID:          rpID,
		RPOrigins:     []string{origin},
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			// Deliberately unset (not "platform"): a hardware key and a phone's built-in
			// authenticator are both wanted, and pinning either excludes the other.
			ResidentKey: protocol.ResidentKeyRequirementPreferred,
			// Preferred rather than required: a device with no biometric or PIN can still
			// enrol, and demanding verification would lock out the older security keys
			// people already own.
			UserVerification: protocol.VerificationPreferred,
		},
		// None: this is a self-hosted app for its own operator. Requiring attestation
		// would mean deciding which authenticator vendors to trust, which is a policy an
		// enterprise has and a personal library does not.
		AttestationPreference: protocol.PreferNoAttestation,
		Timeouts: webauthn.TimeoutsConfig{
			Login:        webauthn.TimeoutConfig{Enforce: true, Timeout: challengeTTL, TimeoutUVD: challengeTTL},
			Registration: webauthn.TimeoutConfig{Enforce: true, Timeout: challengeTTL, TimeoutUVD: challengeTTL},
		},
	})
}

// requestOrigin reconstructs the origin the browser used.
//
// The Origin header is preferred because it is what the browser will actually sign into
// the client data, and matching it is the check that must pass. Host plus scheme is the
// fallback for a client that sends no Origin.
func requestOrigin(r *http.Request) string {
	if o := strings.TrimSpace(r.Header.Get("Origin")); o != "" && o != "null" {
		return o
	}
	scheme := "http"
	if isHTTPS(r) {
		scheme = "https"
	}
	host := r.Host
	if fwd := r.Header.Get("X-Forwarded-Host"); fwd != "" {
		// First value: a proxy chain appends, so the first is the client-facing host.
		host = strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	return scheme + "://" + host
}

// passkeysUsable reports whether the browser will even attempt WebAuthn here, and why
// not when it won't.
//
// WebAuthn requires a secure context. localhost counts as one; a LAN IP over plain HTTP
// does not, and the browser refuses without a message the user can act on. Saying so up
// front is the difference between "passkeys need HTTPS — here's why" and a button that
// silently does nothing.
func passkeyAvailability(r *http.Request) (bool, string) {
	if isHTTPS(r) {
		return true, ""
	}
	host := r.Host
	if h, _, err := splitHostPortSafe(host); err == nil {
		host = h
	}
	if host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "[::1]" {
		// Browsers treat loopback as a secure context precisely so local development
		// works without a certificate.
		return true, ""
	}
	return false, "Passkeys need a secure connection. Browsers only allow them over HTTPS " +
		"(or on localhost), so reach OppaiLib through a hostname with TLS — a reverse proxy " +
		"in front of the container is the usual way. Password sign-in keeps working meanwhile."
}

func splitHostPortSafe(host string) (string, string, error) {
	if !strings.Contains(host, ":") {
		return host, "", nil
	}
	i := strings.LastIndex(host, ":")
	if strings.Contains(host[i:], "]") {
		return host, "", nil
	}
	return host[:i], host[i+1:], nil
}

// ── the webauthn.User adapter ──────────────────────────────────────────

// passkeyUser adapts our rows onto the interface go-webauthn expects.
type passkeyUser struct {
	row   *db.UserRow
	creds []webauthn.Credential
}

// WebAuthnID must be a stable, opaque handle. The numeric user id is stable and is
// already public to the account's owner; a username would not be, since renaming would
// invalidate every credential.
func (u *passkeyUser) WebAuthnID() []byte {
	return []byte(strconv.FormatInt(u.row.ID, 10))
}
func (u *passkeyUser) WebAuthnName() string                     { return u.row.Username }
func (u *passkeyUser) WebAuthnDisplayName() string              { return u.row.Username }
func (u *passkeyUser) WebAuthnCredentials() []webauthn.Credential { return u.creds }

func (s *Server) passkeyUserFor(ctx context.Context, row *db.UserRow) (*passkeyUser, error) {
	rows, err := s.db.PasskeysForUser(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	u := &passkeyUser{row: row}
	for _, p := range rows {
		u.creds = append(u.creds, credentialFromRow(p))
	}
	return u, nil
}

func credentialFromRow(p *db.PasskeyRow) webauthn.Credential {
	c := webauthn.Credential{
		ID:              p.CredentialID,
		PublicKey:       p.PublicKey,
		AttestationType: p.Attestation,
		Flags: webauthn.CredentialFlags{
			BackupEligible: p.BackupEligible,
			BackupState:    p.BackupState,
		},
		Authenticator: webauthn.Authenticator{
			AAGUID:    p.AAGUID,
			SignCount: p.SignCount,
		},
	}
	for _, t := range strings.Split(p.Transports, ",") {
		if t = strings.TrimSpace(t); t != "" {
			c.Transport = append(c.Transport, protocol.AuthenticatorTransport(t))
		}
	}
	return c
}

// ── registration ───────────────────────────────────────────────────────

type passkeyBeginResponse struct {
	// Ceremony is the opaque handle for this exchange. Returned to the client and
	// required back: it is how the server finds the challenge it issued, without ever
	// trusting the client to carry the challenge itself.
	Ceremony string `json:"ceremony"`
	// Options is the raw PublicKeyCredentialCreationOptions / RequestOptions, passed
	// through to navigator.credentials untouched.
	Options any `json:"options"`
}

// handleBeginPasskeyRegistration starts enrolling a new passkey for the signed-in user.
//
// Requires an existing session, which is the enrolment model this app wants: you sign in
// with your password once and add a passkey, rather than a passkey being a second way to
// create an account.
func (s *Server) handleBeginPasskeyRegistration(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(userKey).(*db.UserRow)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "sign in first")
		return
	}
	if ok, why := passkeyAvailability(r); !ok {
		writeErr(w, http.StatusBadRequest, why)
		return
	}
	n, err := s.db.CountPasskeys(r.Context(), user.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	if n >= maxPasskeysPerUser {
		writeErr(w, http.StatusConflict, fmt.Sprintf("you already have %d passkeys — remove one first", n))
		return
	}

	wa, err := s.webauthnFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	pu, err := s.passkeyUserFor(r.Context(), user)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}

	// Excluding the credentials already registered is what makes the authenticator say
	// "you've already set this up here" instead of silently creating a duplicate the
	// user then has to work out which of.
	exclude := make([]protocol.CredentialDescriptor, 0, len(pu.creds))
	for _, c := range pu.creds {
		exclude = append(exclude, c.Descriptor())
	}

	options, session, err := wa.BeginRegistration(pu, webauthn.WithExclusions(exclude))
	if err != nil {
		s.log.Warn("passkey registration could not start", "user", user.Username, "err", err)
		writeErr(w, http.StatusInternalServerError, "could not start passkey registration")
		return
	}
	id, err := s.ceremonies.put(&pendingCeremony{session: session, userID: user.ID})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	writeJSON(w, http.StatusOK, passkeyBeginResponse{Ceremony: id, Options: options})
}

type finishRegistrationRequest struct {
	Ceremony string `json:"ceremony"`
	// Name is the device-friendly label. Optional; defaulted from the authenticator.
	Name string `json:"name"`
	// Credential is the browser's attestation response, verbatim.
	Credential json.RawMessage `json:"credential"`
}

func (s *Server) handleFinishPasskeyRegistration(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(userKey).(*db.UserRow)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "sign in first")
		return
	}
	var in finishRegistrationRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 64<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid registration response")
		return
	}
	pending, ok := s.ceremonies.take(in.Ceremony)
	if !ok {
		writeErr(w, http.StatusBadRequest, "that registration expired — start again")
		return
	}
	// The ceremony belongs to the account that started it. Without this, a user could
	// finish someone else's registration and attach their own authenticator to it.
	if pending.userID != user.ID {
		writeErr(w, http.StatusForbidden, "that registration belongs to a different account")
		return
	}

	wa, err := s.webauthnFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	pu, err := s.passkeyUserFor(r.Context(), user)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}

	parsed, err := protocol.ParseCredentialCreationResponseBody(strings.NewReader(string(in.Credential)))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "that passkey response could not be read")
		return
	}
	cred, err := wa.CreateCredential(pu, *pending.session, parsed)
	if err != nil {
		// The library's message names the real cause (origin mismatch, bad challenge,
		// failed attestation) and is far more useful than a generic rejection.
		s.log.Warn("passkey registration rejected", "user", user.Username, "err", err)
		writeErr(w, http.StatusBadRequest, "that passkey was rejected: "+err.Error())
		return
	}

	transports := make([]string, 0, len(cred.Transport))
	for _, t := range cred.Transport {
		transports = append(transports, string(t))
	}
	row := &db.PasskeyRow{
		UserID:         user.ID,
		CredentialID:   cred.ID,
		PublicKey:      cred.PublicKey,
		AAGUID:         cred.Authenticator.AAGUID,
		SignCount:      cred.Authenticator.SignCount,
		Transports:     strings.Join(transports, ","),
		Attestation:    cred.AttestationType,
		BackupEligible: cred.Flags.BackupEligible,
		BackupState:    cred.Flags.BackupState,
		Name:           passkeyName(in.Name, cred),
	}
	id, err := s.db.AddPasskey(r.Context(), row)
	if err != nil {
		if errors.Is(err, db.ErrPasskeyExists) {
			writeErr(w, http.StatusConflict, "that passkey is already registered")
			return
		}
		writeErr(w, http.StatusInternalServerError, "could not save that passkey")
		return
	}
	row.ID = id
	s.log.Info("passkey registered", "user", user.Username, "passkey", row.Name, "synced", row.BackupEligible)
	writeJSON(w, http.StatusOK, passkeyInfoFrom(row))
}

// passkeyName falls back to something recognisable when the user gave no label.
//
// "Passkey 1" would be useless on the revocation screen, which is the one place these
// names matter — you have to be able to tell which device you are revoking.
func passkeyName(given string, cred *webauthn.Credential) string {
	if n := strings.TrimSpace(given); n != "" {
		return trimTo(n, 60)
	}
	for _, t := range cred.Transport {
		switch t {
		case protocol.Internal:
			return "This device"
		case protocol.Hybrid:
			return "Phone or tablet"
		case protocol.USB:
			return "Security key (USB)"
		case protocol.NFC:
			return "Security key (NFC)"
		case protocol.BLE:
			return "Security key (Bluetooth)"
		}
	}
	if cred.Flags.BackupEligible {
		return "Synced passkey"
	}
	return "Passkey"
}

func trimTo(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return strings.TrimSpace(s[:n])
}

// ── login ──────────────────────────────────────────────────────────────

type beginLoginRequest struct {
	// Username is optional. Given, the response lists that account's credentials;
	// omitted, the ceremony is discoverable and the authenticator chooses — which is the
	// nicer flow and the one that needs no typing at all.
	Username string `json:"username"`
}

func (s *Server) handleBeginPasskeyLogin(w http.ResponseWriter, r *http.Request) {
	// Same rate limit as password login. A passkey assertion is cheap to verify, but the
	// endpoint still enumerates and still costs a database read per attempt.
	if !s.login.allow(clientIP(r)) {
		writeErr(w, http.StatusTooManyRequests, "too many attempts, slow down")
		return
	}
	if ok, why := passkeyAvailability(r); !ok {
		writeErr(w, http.StatusBadRequest, why)
		return
	}
	var in beginLoginRequest
	// A missing or empty body is the discoverable flow, not an error.
	_ = json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&in)

	wa, err := s.webauthnFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	if name := strings.TrimSpace(in.Username); name != "" {
		user, err := s.db.UserByName(r.Context(), name)
		if err != nil {
			// Deliberately the same shape of answer as a real account with no passkeys.
			// Distinguishing them here would make this an account-enumeration endpoint.
			writeErr(w, http.StatusUnauthorized, "no passkey is registered for that account")
			return
		}
		pu, err := s.passkeyUserFor(r.Context(), user)
		if err != nil || len(pu.creds) == 0 {
			writeErr(w, http.StatusUnauthorized, "no passkey is registered for that account")
			return
		}
		options, session, err := wa.BeginLogin(pu)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "could not start passkey sign-in")
			return
		}
		id, err := s.ceremonies.put(&pendingCeremony{session: session, userID: user.ID})
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "server error")
			return
		}
		writeJSON(w, http.StatusOK, passkeyBeginResponse{Ceremony: id, Options: options})
		return
	}

	// Discoverable: no user named, the authenticator offers what it holds.
	options, session, err := wa.BeginDiscoverableLogin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not start passkey sign-in")
		return
	}
	id, err := s.ceremonies.put(&pendingCeremony{session: session})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	writeJSON(w, http.StatusOK, passkeyBeginResponse{Ceremony: id, Options: options})
}

type finishLoginRequest struct {
	Ceremony string `json:"ceremony"`
	// Client says who is signing in, exactly as password login does, so a passkey
	// session gets the same idle rules as a password one.
	Client     string          `json:"client"`
	Credential json.RawMessage `json:"credential"`
}

func (s *Server) handleFinishPasskeyLogin(w http.ResponseWriter, r *http.Request) {
	if !s.login.allow(clientIP(r)) {
		writeErr(w, http.StatusTooManyRequests, "too many attempts, slow down")
		return
	}
	var in finishLoginRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 64<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid sign-in response")
		return
	}
	pending, ok := s.ceremonies.take(in.Ceremony)
	if !ok {
		writeErr(w, http.StatusBadRequest, "that sign-in expired — try again")
		return
	}
	wa, err := s.webauthnFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	parsed, err := protocol.ParseCredentialRequestResponseBody(strings.NewReader(string(in.Credential)))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "that passkey response could not be read")
		return
	}

	// Resolving the user by the *credential* rather than by anything the client asserted
	// is the crux: an assertion proves possession of one specific private key, and the
	// account it signs in to must be the one that key was registered against.
	stored, err := s.db.PasskeyByCredentialID(r.Context(), parsed.RawID)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "that passkey is not registered here")
		return
	}
	if pending.userID != 0 && pending.userID != stored.UserID {
		// A ceremony started for one account, finished with another's credential.
		writeErr(w, http.StatusUnauthorized, "that passkey belongs to a different account")
		return
	}
	owner, err := s.db.UserByID(r.Context(), stored.UserID)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "that passkey's account no longer exists")
		return
	}
	pu, err := s.passkeyUserFor(r.Context(), owner)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}

	cred, err := wa.ValidateLogin(pu, *pending.session, parsed)
	if err != nil {
		s.log.Warn("passkey sign-in rejected", "user", owner.Username, "err", err)
		writeErr(w, http.StatusUnauthorized, "that passkey was not accepted")
		return
	}
	if cred.Authenticator.CloneWarning {
		// The signature counter went backwards. That means either a cloned credential or
		// a badly-behaved authenticator, and there is no way to tell which — so refuse,
		// and say what to do. Accepting it would defeat the counter's only purpose.
		s.log.Warn("passkey clone warning", "user", owner.Username, "passkey", stored.Name)
		writeErr(w, http.StatusUnauthorized,
			"that passkey's counter went backwards, which can mean it has been cloned. "+
				"Sign in with your password and remove it.")
		return
	}

	if err := s.db.TouchPasskey(r.Context(), stored.ID, cred.Authenticator.SignCount, cred.Flags.BackupState); err != nil {
		// Not fatal to the sign-in — but it does mean the next login has a stale counter
		// to compare against, so it is worth a line.
		s.log.Warn("could not record passkey use", "passkey", stored.ID, "err", err)
	}

	token, err := auth.NewToken()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	client := db.ClientWeb
	if in.Client == db.ClientAndroid {
		client = db.ClientAndroid
	}
	if err := s.db.CreateSession(r.Context(), token, owner.ID, s.cfg.SessionTTL, client); err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "oppai_session",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   isHTTPS(r),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(s.cfg.SessionTTL.Seconds()),
	})
	s.log.Info("passkey sign-in", "user", owner.Username, "passkey", stored.Name)
	writeJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  models.User{ID: owner.ID, Username: owner.Username, IsAdmin: owner.IsAdmin},
	})
}

// ── management ─────────────────────────────────────────────────────────

// passkeyInfo is a credential as the owner sees it. No key material: the public key is
// harmless but of no use to a client, and omitting it keeps the response about the thing
// the user is deciding on — which device is this, and do I still have it.
type passkeyInfo struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	// Synced marks a credential backed up to an account (iCloud, Google). Worth showing:
	// a synced key survives losing the device and a device-bound one does not, which
	// changes whether you need a second one.
	Synced     bool   `json:"synced"`
	Transports string `json:"transports,omitempty"`
	CreatedAt  int64  `json:"createdAt"`
	LastUsedAt int64  `json:"lastUsedAt"`
}

func passkeyInfoFrom(p *db.PasskeyRow) passkeyInfo {
	return passkeyInfo{
		ID:         p.ID,
		Name:       p.Name,
		Synced:     p.BackupEligible,
		Transports: p.Transports,
		CreatedAt:  p.CreatedAt * 1000,
		LastUsedAt: p.LastUsedAt * 1000,
	}
}

type passkeyListResponse struct {
	Passkeys []passkeyInfo `json:"passkeys"`
	// Available says whether the browser will attempt WebAuthn at all here, and Reason
	// explains a no. Sent so the UI can say why rather than offering a button that
	// silently fails.
	Available bool   `json:"available"`
	Reason    string `json:"reason,omitempty"`
	// RelyingPartyID is the domain these passkeys are bound to. Shown because a
	// credential created at one hostname is not offered at another, and that is
	// otherwise a baffling experience.
	RelyingPartyID string `json:"relyingPartyId,omitempty"`
}

func (s *Server) handleListPasskeys(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userKey).(*db.UserRow)
	rows, err := s.db.PasskeysForUser(r.Context(), user.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	out := passkeyListResponse{Passkeys: make([]passkeyInfo, 0, len(rows))}
	for _, p := range rows {
		out.Passkeys = append(out.Passkeys, passkeyInfoFrom(p))
	}
	out.Available, out.Reason = passkeyAvailability(r)
	if u, err := url.Parse(requestOrigin(r)); err == nil {
		out.RelyingPartyID = u.Hostname()
	}
	writeJSON(w, http.StatusOK, out)
}

type renamePasskeyRequest struct {
	Name string `json:"name"`
}

func (s *Server) handleRenamePasskey(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userKey).(*db.UserRow)
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad passkey id")
		return
	}
	var in renamePasskeyRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	name := trimTo(strings.TrimSpace(in.Name), 60)
	if name == "" {
		writeErr(w, http.StatusBadRequest, "give it a name you'll recognise")
		return
	}
	if err := s.db.RenamePasskey(r.Context(), user.ID, id, name); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeErr(w, http.StatusNotFound, "no such passkey")
			return
		}
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type revokePasskeyRequest struct {
	// Password re-authenticates the revocation.
	//
	// Required because a live session is not proof that the person at the keyboard owns
	// the account — an unattended browser is enough — and revoking a passkey is exactly
	// the step someone taking over an account would perform first. It is also the only
	// factor guaranteed to be available: revoking the passkey you are holding cannot be
	// confirmed with that passkey.
	Password string `json:"password"`
}

func (s *Server) handleRevokePasskey(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value(userKey).(*db.UserRow)
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad passkey id")
		return
	}
	var in revokePasskeyRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}

	s.login.acquireHash()
	ok, verr := auth.VerifyPassword(user.PwHash, in.Password)
	s.login.releaseHash()
	if verr != nil || !ok {
		writeErr(w, http.StatusUnauthorized, "that password is not right")
		return
	}

	if err := s.db.DeletePasskey(r.Context(), user.ID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeErr(w, http.StatusNotFound, "no such passkey")
			return
		}
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	s.log.Info("passkey revoked", "user", user.Username, "passkey", id)
	w.WriteHeader(http.StatusNoContent)
}
