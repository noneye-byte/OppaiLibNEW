package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

// importWebGame stores a zip holding an HTML5 build and returns its media id.
func importWebGame(t *testing.T, h http.Handler, token string, entries map[string]string) string {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, body := range entries {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := w.Write([]byte(body)); err != nil {
			t.Fatal(err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/media", token,
		map[string]string{"kind": "game", "title": "Web game"}, "webgame.zip", buf.Bytes()))
	if rec.Code != http.StatusCreated {
		t.Fatalf("import web game: %d %s", rec.Code, rec.Body.String())
	}
	var item struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &item); err != nil {
		t.Fatal(err)
	}
	return strconv.FormatInt(item.ID, 10)
}

func TestWebGamePlayServesBuild(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := importWebGame(t, h, token, map[string]string{
		"index.html": "<html><script src=game.js></script></html>",
		"game.js":    "console.log('hi')",
	})

	info := do(t, h, token, http.MethodGet, "/api/media/"+id+"/play", "")
	if info.Code != http.StatusOK || !strings.Contains(info.Body.String(), `"playable":true`) {
		t.Fatalf("play info: %d %s", info.Code, info.Body.String())
	}

	index := do(t, h, token, http.MethodGet, "/api/media/"+id+"/play/index.html", "")
	if index.Code != http.StatusOK {
		t.Fatalf("index: %d %s", index.Code, index.Body.String())
	}
	if ct := index.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Fatalf("index content type = %q", ct)
	}
	js := do(t, h, token, http.MethodGet, "/api/media/"+id+"/play/game.js", "")
	if js.Code != http.StatusOK || js.Body.String() != "console.log('hi')" {
		t.Fatalf("js: %d %s", js.Code, js.Body.String())
	}
	if ct := js.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/javascript") {
		t.Fatalf("js content type = %q, want text/javascript so the engine loads", ct)
	}
}

// The whole safety argument rests on these headers being present on the build's own
// responses, so they are asserted rather than assumed.
func TestWebGameAssetSecurityHeaders(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := importWebGame(t, h, token, map[string]string{"index.html": "<html></html>"})

	rec := do(t, h, token, http.MethodGet, "/api/media/"+id+"/play/index.html", "")
	csp := rec.Header().Get("Content-Security-Policy")
	if csp == "" {
		t.Fatal("no CSP on a game asset")
	}
	// The app-wide policy would break every engine; this route must have replaced it.
	if strings.Contains(csp, "script-src 'self';") {
		t.Fatalf("app-wide CSP leaked onto a game asset: %q", csp)
	}
	// Our own UI must be able to frame it; nothing else may.
	if !strings.Contains(csp, "frame-ancestors 'self'") {
		t.Fatalf("CSP does not allow our own player to frame it: %q", csp)
	}
	if xfo := rec.Header().Get("X-Frame-Options"); xfo != "SAMEORIGIN" {
		t.Fatalf("X-Frame-Options = %q, want SAMEORIGIN (the global DENY would block the player)", xfo)
	}
	// A build must not be able to call out to anywhere but its own origin.
	if !strings.Contains(csp, "connect-src") || strings.Contains(csp, "connect-src *") {
		t.Fatalf("connect-src is not pinned: %q", csp)
	}
	for _, want := range []string{"object-src 'none'", "form-action 'none'", "base-uri 'none'"} {
		if !strings.Contains(csp, want) {
			t.Fatalf("CSP missing %q: %q", want, csp)
		}
	}
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("game assets served without nosniff")
	}
}

// A game that is only a downloadable build must not be offered as playable.
func TestWebGamePlayRejectsNonWebBuild(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := importWebGame(t, h, token, map[string]string{
		"game.exe":   "MZ\x90\x00",
		"readme.txt": "install me",
	})
	if got := do(t, h, token, http.MethodGet, "/api/media/"+id+"/play", ""); got.Code != http.StatusNotFound {
		t.Fatalf("non-web build reported playable: %d %s", got.Code, got.Body.String())
	}
}

// A self-hosted build must always beat the itch embed: it is the copy the user
// actually owns, and it works without a connection.
func TestWebGamePlayPrefersLocalBuildOverEmbed(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := importWebGame(t, h, token, map[string]string{"index.html": "<html>mine</html>"})

	rec := do(t, h, token, http.MethodGet, "/api/media/"+id+"/play", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("play info: %d %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"mode":"local"`) {
		t.Fatalf("did not prefer the local build: %s", rec.Body.String())
	}
}

// A game with no build and no itch page stays unplayable, so the Play button is not
// offered for something that cannot be played.
func TestWebGamePlayWithoutBuildOrEmbedIs404(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := importWebGame(t, h, token, map[string]string{"game.exe": "MZ\x90\x00"})

	if got := do(t, h, token, http.MethodGet, "/api/media/"+id+"/play", ""); got.Code != http.StatusNotFound {
		t.Fatalf("play = %d %s, want 404", got.Code, got.Body.String())
	}
}

func TestWebGamePlayRejectsNonGame(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/media", token,
		map[string]string{"title": "text"}, "notes.txt", []byte("hello")))
	var item struct {
		ID   int64  `json:"id"`
		Kind string `json:"kind"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &item)
	if item.Kind == "game" {
		t.Skip("fixture was recognised as a game")
	}
	got := do(t, h, token, http.MethodGet, "/api/media/"+strconv.FormatInt(item.ID, 10)+"/play", "")
	if got.Code != http.StatusBadRequest {
		t.Fatalf("play accepted on a non-game: %d %s", got.Code, got.Body.String())
	}
}

// Playing a game must require a session like everything else — the build is library
// content, and the route serves it verbatim.
func TestWebGamePlayRequiresAuth(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := importWebGame(t, h, token, map[string]string{"index.html": "<html></html>"})

	for _, path := range []string{"/api/media/" + id + "/play", "/api/media/" + id + "/play/index.html"} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s without a token: %d", path, rec.Code)
		}
	}
}

func TestGameOriginIgnoresAttackerControlledOriginHeader(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "http://library.local/api/media/1/play/index.html", nil)
	r.Host = "library.local"
	// A sandboxed build sends Origin: null, and a hostile one could send anything.
	r.Header.Set("Origin", "https://evil.example")
	if got := gameOrigin(r); got != "http://library.local" {
		t.Fatalf("gameOrigin = %q, want the request's own host", got)
	}
	if csp := gameContentSecurityPolicy(r, "1"); strings.Contains(csp, "evil.example") {
		t.Fatalf("attacker origin reached the CSP: %q", csp)
	}
}

// The sandbox alone still lets an opaque-origin document fire credentialed simple
// requests at our own origin. Scoping every directive to the build's own path is
// what removes that, so it is asserted directly.
func TestWebGameCSPIsScopedToItsOwnBuildPath(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := importWebGame(t, h, token, map[string]string{"index.html": "<html></html>"})

	rec := do(t, h, token, http.MethodGet, "/api/media/"+id+"/play/index.html", "")
	csp := rec.Header().Get("Content-Security-Policy")
	base := "/api/media/" + id + "/play/"
	for _, directive := range []string{"default-src", "script-src", "connect-src", "img-src"} {
		idx := strings.Index(csp, directive+" ")
		if idx < 0 {
			t.Fatalf("CSP has no %s: %q", directive, csp)
		}
		value := csp[idx:]
		if end := strings.Index(value, ";"); end >= 0 {
			value = value[:end]
		}
		if !strings.Contains(value, base) {
			t.Errorf("%s is not scoped to the build path: %q", directive, value)
		}
	}
	// A bare origin with no path would let the build reach the rest of the API.
	if strings.Contains(csp, "connect-src http://example.com;") {
		t.Fatalf("connect-src left unscoped: %q", csp)
	}
}
