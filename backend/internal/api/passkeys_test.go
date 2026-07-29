package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/youruser/oppailib/internal/auth"
	"github.com/youruser/oppailib/internal/db"
)

// testCredential is the shape of a just-registered credential, for the naming test.
func testCredential() *webauthn.Credential {
	return &webauthn.Credential{
		Transport: []protocol.AuthenticatorTransport{protocol.Internal},
		Flags:     webauthn.CredentialFlags{BackupEligible: true},
	}
}

// A full WebAuthn ceremony needs a real authenticator, which cannot be produced here.
// What these tests cover is everything around the protocol — the parts a deployment
// actually gets wrong, and the parts where a mistake is a security hole rather than a
// failed login: challenge single-use and expiry, relying-party derivation, ownership
// scoping on every management route, and password sign-in still working.

func TestCeremonyIsSingleUse(t *testing.T) {
	store := newCeremonyStore()
	id, err := store.put(&pendingCeremony{userID: 7})
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	if _, ok := store.take(id); !ok {
		t.Fatal("the ceremony could not be redeemed once")
	}
	// A challenge that can be redeemed twice is a replayable one. This is the whole of
	// the replay protection.
	if _, ok := store.take(id); ok {
		t.Fatal("the same ceremony was redeemed twice")
	}
}

func TestCeremonyExpires(t *testing.T) {
	store := newCeremonyStore()
	id, err := store.put(&pendingCeremony{userID: 7})
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	// Reach in and age it, rather than sleeping for the real TTL.
	store.mu.Lock()
	store.byID[id].expires = time.Now().Add(-time.Second)
	store.mu.Unlock()

	if _, ok := store.take(id); ok {
		t.Fatal("an expired challenge was accepted")
	}
}

func TestCeremonyIDsAreUnguessable(t *testing.T) {
	store := newCeremonyStore()
	seen := map[string]bool{}
	for i := 0; i < 200; i++ {
		id, err := store.put(&pendingCeremony{})
		if err != nil {
			t.Fatalf("put: %v", err)
		}
		if seen[id] {
			t.Fatal("a ceremony id repeated")
		}
		// 32 random bytes, base64url: anything shorter would be worth guessing at.
		if len(id) < 40 {
			t.Fatalf("ceremony id %q is too short to be unguessable", id)
		}
		seen[id] = true
	}
	if _, ok := store.take("not-a-real-id"); ok {
		t.Fatal("an invented ceremony id was accepted")
	}
	if _, ok := store.take(""); ok {
		t.Fatal("an empty ceremony id was accepted")
	}
}

func TestCeremonySweepDoesNotGrowUnbounded(t *testing.T) {
	store := newCeremonyStore()
	for i := 0; i < 50; i++ {
		id, _ := store.put(&pendingCeremony{})
		store.mu.Lock()
		store.byID[id].expires = time.Now().Add(-time.Minute)
		store.mu.Unlock()
	}
	// The sweep runs on write, so one more put must clear the abandoned ones. An
	// unauthenticated endpoint that can add a map entry per request is a memory leak
	// with a URL.
	if _, err := store.put(&pendingCeremony{}); err != nil {
		t.Fatalf("put: %v", err)
	}
	store.mu.Lock()
	n := len(store.byID)
	store.mu.Unlock()
	if n != 1 {
		t.Fatalf("%d ceremonies left after the sweep, want 1", n)
	}
}

func TestRequestOriginPrefersTheOriginHeader(t *testing.T) {
	// The Origin header is what the browser signs into the client data, so matching it
	// is the check that has to pass.
	r := httptest.NewRequest("POST", "http://192.168.1.5:8080/api/auth/passkey/login/begin", nil)
	r.Header.Set("Origin", "https://oppai.example.com")
	if got := requestOrigin(r); got != "https://oppai.example.com" {
		t.Errorf("origin = %q, want the Origin header", got)
	}
}

func TestRequestOriginFallsBackToHostAndScheme(t *testing.T) {
	r := httptest.NewRequest("POST", "http://oppai.local:8080/x", nil)
	if got := requestOrigin(r); got != "http://oppai.local:8080" {
		t.Errorf("origin = %q", got)
	}

	// Behind a TLS-terminating proxy: the browser saw https and a different host, and
	// the RP ID has to be derived from what the browser saw, not from what reached us.
	r = httptest.NewRequest("POST", "http://10.0.0.9:8080/x", nil)
	r.Header.Set("X-Forwarded-Proto", "https")
	r.Header.Set("X-Forwarded-Host", "lib.example.com, internal-lb")
	if got := requestOrigin(r); got != "https://lib.example.com" {
		t.Errorf("origin = %q, want the client-facing host", got)
	}
}

func TestRelyingPartyIDIsTheHostnameWithoutThePort(t *testing.T) {
	s, _ := newTestServer(t)
	r := httptest.NewRequest("POST", "http://oppai.local:8080/x", nil)
	wa, err := s.webauthnFor(r)
	if err != nil {
		t.Fatalf("webauthnFor: %v", err)
	}
	// WebAuthn requires the RP ID to be a domain, never host:port — including the port
	// makes every registration fail with a browser error that names nothing.
	if wa.Config.RPID != "oppai.local" {
		t.Errorf("RPID = %q, want oppai.local", wa.Config.RPID)
	}
	if len(wa.Config.RPOrigins) != 1 || wa.Config.RPOrigins[0] != "http://oppai.local:8080" {
		t.Errorf("RPOrigins = %v, want the full origin including the port", wa.Config.RPOrigins)
	}
}

func TestPasskeyAvailabilityRequiresASecureContext(t *testing.T) {
	// Browsers only allow WebAuthn in a secure context. Loopback counts; a LAN IP over
	// plain HTTP does not, and the browser refuses with nothing the user can act on.
	secure := []string{"https://oppai.example.com/x", "http://localhost:8080/x", "http://127.0.0.1:8080/x"}
	for _, target := range secure {
		r := httptest.NewRequest("GET", target, nil)
		if strings.HasPrefix(target, "https") {
			r.Header.Set("X-Forwarded-Proto", "https")
		}
		if ok, why := passkeyAvailability(r); !ok {
			t.Errorf("%s reported unavailable: %s", target, why)
		}
	}

	r := httptest.NewRequest("GET", "http://192.168.1.20:8080/x", nil)
	ok, why := passkeyAvailability(r)
	if ok {
		t.Error("a LAN IP over plain HTTP was reported as usable")
	}
	// Saying why is the difference between a useful message and a button that silently
	// does nothing.
	if !strings.Contains(why, "HTTPS") {
		t.Errorf("reason %q does not explain the requirement", why)
	}
	if !strings.Contains(strings.ToLower(why), "password") {
		t.Errorf("reason %q does not point at the fallback that still works", why)
	}
}

func TestPasskeyListSaysWhatItIsBoundTo(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	req := httptest.NewRequest("GET", "http://oppai.local:8080/api/auth/passkeys", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d: %s", rec.Code, rec.Body)
	}
	var out passkeyListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out.Passkeys) != 0 {
		t.Errorf("a fresh account has passkeys: %+v", out.Passkeys)
	}
	// A credential is bound to the RP ID it was created under, so one registered at a
	// hostname is not offered at the LAN IP. Showing the binding is what stops that
	// being baffling.
	if out.RelyingPartyID != "oppai.local" {
		t.Errorf("relyingPartyId = %q", out.RelyingPartyID)
	}
}

func TestPasskeyRegistrationRefusedWithoutASecureContext(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	// httptest's default host is example.com over plain HTTP: not a secure context.
	rec := do(t, h, token, "POST", "/api/auth/passkeys/begin", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want 400: %s", rec.Code, rec.Body)
	}
	if !strings.Contains(rec.Body.String(), "HTTPS") {
		t.Errorf("error %s does not explain the requirement", rec.Body)
	}
}

func TestPasskeyRegistrationBeginsOverHTTPS(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	req := httptest.NewRequest("POST", "https://oppai.example.com/api/auth/passkeys/begin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Forwarded-Proto", "https")
	req.Header.Set("Origin", "https://oppai.example.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d: %s", rec.Code, rec.Body)
	}
	var out passkeyBeginResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Ceremony == "" {
		t.Error("no ceremony handle returned, so the server could not find its own challenge")
	}
	// The challenge must be in the options for the browser to sign, and it must not be
	// something the client chose.
	blob, _ := json.Marshal(out.Options)
	if !bytes.Contains(blob, []byte("challenge")) {
		t.Errorf("options carry no challenge: %s", blob)
	}
	if !bytes.Contains(blob, []byte("oppai.example.com")) {
		t.Errorf("options do not name the relying party: %s", blob)
	}
}

func TestPasskeyRegistrationRejectsAnotherAccountsCeremony(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	// A ceremony filed against a different user id. Finishing it must not attach an
	// authenticator to the signed-in account.
	id, err := s.ceremonies.put(&pendingCeremony{userID: 99999})
	if err != nil {
		t.Fatalf("put: %v", err)
	}
	body, _ := json.Marshal(map[string]any{"ceremony": id, "credential": json.RawMessage(`{}`)})
	rec := do(t, h, token, "POST", "/api/auth/passkeys/finish", string(body))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("got %d, want 403: %s", rec.Code, rec.Body)
	}
}

func TestPasskeyFinishRejectsAnUnknownCeremony(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	body := `{"ceremony":"made-up","credential":{}}`
	rec := do(t, h, token, "POST", "/api/auth/passkeys/finish", body)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want 400: %s", rec.Code, rec.Body)
	}
}

func TestPasskeyLoginBeginDoesNotEnumerateAccounts(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()

	// "tester" exists (created by newTestServer) but has no passkeys; "nobody" does not
	// exist at all. Both must answer identically, or this is an account-enumeration
	// endpoint that needs no credentials.
	begin := func(username string) (int, string) {
		req := httptest.NewRequest("POST", "https://oppai.example.com/api/auth/passkey/login/begin",
			strings.NewReader(`{"username":"`+username+`"}`))
		req.Header.Set("X-Forwarded-Proto", "https")
		req.Header.Set("Origin", "https://oppai.example.com")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec.Code, rec.Body.String()
	}
	existingCode, existingBody := begin("tester")
	missingCode, missingBody := begin("nobody-at-all")
	if existingCode != missingCode || existingBody != missingBody {
		t.Errorf("an existing account is distinguishable from a missing one:\n  %d %s\n  %d %s",
			existingCode, existingBody, missingCode, missingBody)
	}
}

func TestDiscoverableLoginBeginsWithoutAUsername(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()
	// An empty body is the discoverable flow, not an error: the authenticator offers
	// what it holds and nothing has to be typed.
	req := httptest.NewRequest("POST", "https://oppai.example.com/api/auth/passkey/login/begin", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	req.Header.Set("Origin", "https://oppai.example.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d: %s", rec.Code, rec.Body)
	}
	var out passkeyBeginResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Ceremony == "" {
		t.Error("no ceremony handle for a discoverable login")
	}
}

func TestPasskeyManagementRequiresASession(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()
	for _, c := range []struct{ method, path string }{
		{"GET", "/api/auth/passkeys"},
		{"POST", "/api/auth/passkeys/begin"},
		{"POST", "/api/auth/passkeys/finish"},
		{"PATCH", "/api/auth/passkeys/1"},
		{"POST", "/api/auth/passkeys/1/revoke"},
	} {
		req := httptest.NewRequest(c.method, c.path, strings.NewReader("{}"))
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s unauthenticated: got %d, want 401", c.method, c.path, rec.Code)
		}
	}
}

// The store scopes every mutation to the owner. Without that, an id from the client is
// enough for any signed-in user to rename or revoke anyone's key.
func TestPasskeyMutationsAreScopedToTheirOwner(t *testing.T) {
	s, _ := newTestServer(t)
	ctx := t.Context()

	mine, err := s.db.UserByName(ctx, "tester")
	if err != nil {
		t.Fatalf("user: %v", err)
	}
	otherID, err := s.db.CreateUser(ctx, "someone-else", "x", false)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	id, err := s.db.AddPasskey(ctx, &db.PasskeyRow{
		UserID:       mine.ID,
		CredentialID: []byte("credential-one"),
		PublicKey:    []byte("public-key"),
		Name:         "My laptop",
	})
	if err != nil {
		t.Fatalf("add: %v", err)
	}

	if err := s.db.RenamePasskey(ctx, otherID, id, "Mine now"); err == nil {
		t.Error("another user renamed a passkey they do not own")
	}
	if err := s.db.DeletePasskey(ctx, otherID, id); err == nil {
		t.Error("another user revoked a passkey they do not own")
	}
	// And the owner can.
	if err := s.db.RenamePasskey(ctx, mine.ID, id, "Work laptop"); err != nil {
		t.Errorf("the owner could not rename their own passkey: %v", err)
	}
	rows, err := s.db.PasskeysForUser(ctx, mine.ID)
	if err != nil || len(rows) != 1 || rows[0].Name != "Work laptop" {
		t.Errorf("rename did not take: %v %+v", err, rows)
	}
}

func TestTheSameCredentialCannotBeClaimedTwice(t *testing.T) {
	s, _ := newTestServer(t)
	ctx := t.Context()
	mine, _ := s.db.UserByName(ctx, "tester")
	otherID, _ := s.db.CreateUser(ctx, "someone-else", "x", false)

	row := &db.PasskeyRow{UserID: mine.ID, CredentialID: []byte("shared-id"), PublicKey: []byte("k")}
	if _, err := s.db.AddPasskey(ctx, row); err != nil {
		t.Fatalf("add: %v", err)
	}
	// Registering the same credential id against another account would let one
	// authenticator sign in as two people.
	_, err := s.db.AddPasskey(ctx, &db.PasskeyRow{UserID: otherID, CredentialID: []byte("shared-id"), PublicKey: []byte("k")})
	if !errors.Is(err, db.ErrPasskeyExists) {
		t.Fatalf("second registration of the same credential: %v, want ErrPasskeyExists", err)
	}
}

func TestRevokeRequiresThePassword(t *testing.T) {
	s, _ := newTestServer(t)
	ctx := t.Context()

	// Give the test account a real password hash: newTestServer stores a placeholder.
	hash, err := auth.HashPassword("correct-horse-battery")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	mine, _ := s.db.UserByName(ctx, "tester")
	if err := s.db.SetPassword(ctx, mine.ID, hash); err != nil {
		t.Fatalf("set password: %v", err)
	}
	id, err := s.db.AddPasskey(ctx, &db.PasskeyRow{
		UserID: mine.ID, CredentialID: []byte("cred"), PublicKey: []byte("k"), Name: "Phone",
	})
	if err != nil {
		t.Fatalf("add: %v", err)
	}

	h := s.Handler()
	token := "test-token"

	// A live session is not proof that the person at the keyboard owns the account — an
	// unattended browser is enough — and revoking a passkey is the first thing someone
	// taking over an account would do.
	rec := do(t, h, token, "POST", "/api/auth/passkeys/"+strconv.FormatInt(id, 10)+"/revoke", `{"password":"wrong"}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("wrong password: got %d, want 401: %s", rec.Code, rec.Body)
	}
	if n, _ := s.db.CountPasskeys(ctx, mine.ID); n != 1 {
		t.Fatal("the passkey was revoked despite a wrong password")
	}

	rec = do(t, h, token, "POST", "/api/auth/passkeys/"+strconv.FormatInt(id, 10)+"/revoke", `{"password":"correct-horse-battery"}`)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("correct password: got %d, want 204: %s", rec.Code, rec.Body)
	}
	if n, _ := s.db.CountPasskeys(ctx, mine.ID); n != 0 {
		t.Fatal("the passkey survived its own revocation")
	}
}

// Passkeys must not have changed password sign-in, which the brief requires to keep
// working and which is also the recovery path for a lost authenticator.
func TestPasswordLoginStillWorks(t *testing.T) {
	s, _ := newTestServer(t)
	ctx := t.Context()
	hash, err := auth.HashPassword("still-works")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	mine, _ := s.db.UserByName(ctx, "tester")
	if err := s.db.SetPassword(ctx, mine.ID, hash); err != nil {
		t.Fatalf("set password: %v", err)
	}

	h := s.Handler()
	req := httptest.NewRequest("POST", "/api/auth/login",
		strings.NewReader(`{"username":"tester","password":"still-works","client":"web"}`))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("password login: got %d: %s", rec.Code, rec.Body)
	}
	var out struct{ Token string }
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil || out.Token == "" {
		t.Fatalf("no session token from a password login: %v %s", err, rec.Body)
	}
}

func TestPasskeyNameFallsBackToSomethingRecognisable(t *testing.T) {
	// "Passkey 1" is useless on the revocation screen, which is the one place these
	// names matter — you have to be able to tell which device you are revoking.
	cases := []struct {
		given string
		want  string
	}{
		{"My YubiKey", "My YubiKey"},
		{"   ", ""}, // falls through to the authenticator-derived name
	}
	for _, c := range cases {
		got := passkeyName(c.given, testCredential())
		if c.want != "" && got != c.want {
			t.Errorf("passkeyName(%q) = %q, want %q", c.given, got, c.want)
		}
		if got == "" {
			t.Errorf("passkeyName(%q) produced an empty label", c.given)
		}
	}
}
