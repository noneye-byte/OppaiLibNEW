package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// setIncognito flips the disguise on the live settings store, the way a PUT to
// /api/settings does.
func setIncognito(s *Server, on bool) {
	cur := s.settings.Get()
	cur.Incognito = on
	s.settings.Set(cur)
}

// get makes an unauthenticated request, which is what every probe in this file is:
// the whole point of the disguise is what a stranger sees.
func get(h http.Handler, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
	return rec
}

// Off by default: an install nobody has configured behaves exactly as it always did.
func TestIncognitoOffLeavesEverythingAlone(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()

	rec := get(h, "/api/health")
	if !strings.Contains(rec.Body.String(), `"version"`) {
		t.Fatalf("health without incognito should name the build: %s", rec.Body)
	}
	if rec.Header().Get("Server") != "" || rec.Header().Get("X-Powered-By") != "" {
		t.Fatalf("unexpected disguise headers: %v", rec.Header())
	}
	// The decoys fall through to the SPA, which is what these paths did before.
	if rec = get(h, "/status.php"); rec.Code != http.StatusOK ||
		!strings.Contains(rec.Header().Get("Content-Type"), "text/html") {
		t.Fatalf("status.php should fall through to the SPA: %d %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	if rec = get(h, "/"); !strings.Contains(rec.Body.String(), "<title>OppaiLib</title>") {
		t.Fatalf("shell should be unbranded-disguise: %s", rec.Body)
	}
}

// The shell: title, icon, manifest and the flag the SPA reads.
func TestIncognitoShell(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()
	setIncognito(s, true)

	rec := get(h, "/")
	body := rec.Body.String()
	for _, want := range []string{
		"<title>Nextcloud</title>",
		`content="#0082c9"`,
		`name="oppai-mode" content="incognito"`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("disguised shell missing %q:\n%s", want, body)
		}
	}
	if strings.Contains(body, "OppaiLib") {
		t.Fatalf("disguised shell still names the product:\n%s", body)
	}

	// A deep link gets the same disguised shell, not the branded one — the SPA
	// fallback is how most visits actually arrive.
	if rec = get(h, "/index.php/login"); !strings.Contains(rec.Body.String(), "<title>Nextcloud</title>") {
		t.Fatalf("SPA fallback served the branded shell: %s", rec.Body)
	}

	// Branded assets asked for by name answer with the cloud ones. This is what
	// makes the shell's own /icon.svg and favicon links show a cloud without the
	// HTML being rewritten, and it also covers a bookmark or a warm cache.
	for _, path := range []string{"/icon.svg", "/favicon-32.png", "/apple-touch-icon.png"} {
		rec = get(h, path)
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "0082c9") {
			t.Fatalf("%s not aliased to the cloud icon: %d %s", path, rec.Code, rec.Body)
		}
	}
	rec = get(h, "/manifest.webmanifest")
	if !strings.Contains(rec.Body.String(), `"name": "Nextcloud"`) {
		t.Fatalf("manifest not aliased: %s", rec.Body)
	}
}

// The headers and the probe endpoints.
func TestIncognitoTraffic(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()
	setIncognito(s, true)

	rec := get(h, "/")
	if rec.Header().Get("Server") != "Apache" || !strings.HasPrefix(rec.Header().Get("X-Powered-By"), "PHP/") {
		t.Fatalf("missing PHP-stack headers: %v", rec.Header())
	}
	// The disguise adds headers; it must never drop the real defences.
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" ||
		rec.Header().Get("Content-Security-Policy") == "" ||
		rec.Header().Get("X-Frame-Options") != "DENY" {
		t.Fatalf("security headers weakened by the disguise: %v", rec.Header())
	}

	// The fingerprint endpoint every scanner asks for first.
	rec = get(h, "/status.php")
	if !strings.Contains(rec.Header().Get("Content-Type"), "application/json") {
		t.Fatalf("status.php content type: %q", rec.Header().Get("Content-Type"))
	}
	for _, want := range []string{`"productname":"Nextcloud"`, `"installed":true`, `"versionstring"`} {
		if !strings.Contains(rec.Body.String(), want) {
			t.Fatalf("status.php missing %q: %s", want, rec.Body)
		}
	}

	// OCS answers XML by default and JSON on request, as the real one does.
	rec = get(h, "/ocs/v2.php/cloud/capabilities")
	if !strings.Contains(rec.Header().Get("Content-Type"), "xml") || !strings.Contains(rec.Body.String(), "<ocs>") {
		t.Fatalf("capabilities should default to XML: %q %s", rec.Header().Get("Content-Type"), rec.Body)
	}
	rec = get(h, "/ocs/v2.php/cloud/capabilities?format=json")
	if !strings.Contains(rec.Body.String(), `"statuscode":200`) {
		t.Fatalf("capabilities json: %s", rec.Body)
	}

	// DAV discovery redirects, and the target challenges for Basic auth.
	rec = get(h, "/.well-known/caldav")
	if rec.Code != http.StatusMovedPermanently || rec.Header().Get("Location") != "/remote.php/dav/" {
		t.Fatalf("caldav discovery: %d %q", rec.Code, rec.Header().Get("Location"))
	}
	rec = get(h, "/remote.php/dav/")
	if rec.Code != http.StatusUnauthorized ||
		!strings.Contains(rec.Header().Get("WWW-Authenticate"), `realm="Nextcloud"`) {
		t.Fatalf("dav challenge: %d %q", rec.Code, rec.Header().Get("WWW-Authenticate"))
	}
	if !strings.Contains(rec.Body.String(), "Sabre") {
		t.Fatalf("dav body is not sabre-shaped: %s", rec.Body)
	}

	if rec = get(h, "/robots.txt"); !strings.Contains(rec.Body.String(), "Disallow: /") {
		t.Fatalf("robots.txt: %s", rec.Body)
	}

	// Health keeps answering — a container health check and "which build is this?"
	// both depend on it — but stops naming anything that identifies the product.
	rec = get(h, "/api/health")
	body := rec.Body.String()
	if !strings.Contains(body, `"status":"ok"`) || !strings.Contains(body, `"version"`) {
		t.Fatalf("health should stay a liveness and build check: %s", body)
	}
	if strings.Contains(body, "aiTagger") || strings.Contains(body, "aiEnabled") {
		t.Fatalf("health identifies the product under incognito: %s", body)
	}
}

// The setting is what drives it, and it survives a round trip through storage.
func TestIncognitoSettingRoundTrip(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, "PUT", "/api/settings", `{"incognito":true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("put settings: %d %s", rec.Code, rec.Body)
	}
	if !s.incognito() {
		t.Fatal("incognito did not take effect on the live settings")
	}
	if rec = do(t, h, token, "GET", "/api/settings", ""); !strings.Contains(rec.Body.String(), `"incognito":true`) {
		t.Fatalf("settings should report the mode: %s", rec.Body)
	}
	// And the disguise is off again the moment it is switched off — no restart.
	if rec = do(t, h, token, "PUT", "/api/settings", `{"incognito":false}`); rec.Code != http.StatusOK {
		t.Fatalf("put settings off: %d %s", rec.Code, rec.Body)
	}
	if rec = get(h, "/"); !strings.Contains(rec.Body.String(), "<title>OppaiLib</title>") {
		t.Fatalf("shell still disguised after switching off: %s", rec.Body)
	}
}
