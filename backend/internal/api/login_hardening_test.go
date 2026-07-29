package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/auth"
)

// postLogin sends a raw login request so a test can control headers and see the
// Set-Cookie back.
func postLogin(h http.Handler, body string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest("POST", "/api/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

// After the burst is spent, further attempts are rejected with 429 before any
// hashing happens.
func TestLoginRateLimited(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()

	var got429 bool
	for i := 0; i < 40; i++ {
		rec := postLogin(h, `{"username":"nobody","password":"x"}`, nil)
		if rec.Code == http.StatusTooManyRequests {
			got429 = true
			break
		}
	}
	if !got429 {
		t.Fatal("expected a 429 after exhausting the login burst, never got one")
	}
}

// The session cookie is marked Secure only when the request arrived over TLS
// (directly or via a proxy's X-Forwarded-Proto), so a plaintext LAN login still works.
func TestLoginCookieSecureFlag(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()

	// Give the seeded user a real, verifiable password.
	hash, err := auth.HashPassword("correct horse battery")
	if err != nil {
		t.Fatal(err)
	}
	uid, err := s.db.CreateUser(context.Background(), "loginuser", hash, false)
	if err != nil {
		t.Fatal(err)
	}
	_ = uid

	body := `{"username":"loginuser","password":"correct horse battery"}`

	// Plain HTTP: cookie must not be Secure (or it would never be sent back).
	rec := postLogin(h, body, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("plain login: got %d, body %s", rec.Code, rec.Body)
	}
	if c := findCookie(rec, "oppai_session"); c == nil || c.Secure {
		t.Errorf("plain-HTTP login cookie: secure=%v, want false", c != nil && c.Secure)
	}

	// Proxied HTTPS: cookie must be Secure.
	rec = postLogin(h, body, map[string]string{"X-Forwarded-Proto": "https"})
	if rec.Code != http.StatusOK {
		t.Fatalf("https login: got %d, body %s", rec.Code, rec.Body)
	}
	if c := findCookie(rec, "oppai_session"); c == nil || !c.Secure {
		t.Errorf("HTTPS login cookie: secure=%v, want true", c != nil && c.Secure)
	}
}

// A login for a user that doesn't exist still returns the generic 401 — and, via
// WasteVerify, pays the same hashing cost so it can't be told apart by timing.
func TestLoginUnknownUserIsGeneric(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()
	rec := postLogin(h, `{"username":"ghost","password":"whatever"}`, nil)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unknown user: got %d, want 401", rec.Code)
	}
	if strings.Contains(strings.ToLower(rec.Body.String()), "user") {
		t.Errorf("error leaks whether the user exists: %s", rec.Body)
	}
}

func TestSecurityHeadersPresent(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/health", nil))
	for _, hdr := range []string{"X-Content-Type-Options", "X-Frame-Options", "Content-Security-Policy"} {
		if rec.Header().Get(hdr) == "" {
			t.Errorf("missing %s header", hdr)
		}
	}
	if csp := rec.Header().Get("Content-Security-Policy"); !strings.Contains(csp, "script-src 'self'") {
		t.Errorf("CSP missing script-src 'self': %q", csp)
	}
}

func findCookie(rec *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range rec.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}
