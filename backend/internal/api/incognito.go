package api

import (
	"encoding/json"
	"net/http"

	"github.com/youruser/oppailib/internal/buildinfo"
)

// ── Incognito: answering as Nextcloud ────────────────────────────────────────
//
// With the setting on, this install stops looking like OppaiLib to anything that
// asks. Three surfaces, because that is how an install is actually recognised:
//
//  1. The HTML shell — title, icon, manifest. Handled where it is served, in
//     internal/web. That is the surface a person sees.
//  2. Response headers. A Go server is conspicuous by its silence: no Server
//     header, no X-Powered-By, none of the header set PHP applications emit. The
//     values below are what a Nextcloud behind Apache sends.
//  3. The endpoints a scanner probes. /status.php is the canonical Nextcloud
//     fingerprint and is how every "what is this host running" tool identifies
//     one; the DAV discovery paths and robots.txt are the next few it tries.
//     Unanswered, they are as good as a sign saying "not Nextcloud" — and worse,
//     the SPA fallback used to answer all of them with an HTML page, which is
//     exactly what a real Nextcloud never does.
//
// What this is and is not: over HTTPS a network observer sees the hostname and
// traffic sizes, not paths or bodies, so this is aimed at the people and tools
// that can see more than that — someone using the browser, a reverse-proxy
// access log, a port scanner, a bookmark, a tab strip. It is a disguise, not
// anonymity, and it does not pretend to survive anyone who signs in.

// Nextcloud version answered to probes. A specific, plausible, recent release:
// "installed but a couple of point releases behind" is the single most common
// thing a real self-hosted instance says.
const (
	nextcloudVersion   = "28.0.4.1"
	nextcloudVersionUI = "28.0.4"
)

func (s *Server) incognito() bool { return s.settings.Get().Incognito }

// nextcloudHeaders adds the headers a PHP-on-Apache Nextcloud sends, and only
// those that are safe to add. The app's own security headers are set first and
// are never removed or weakened by the disguise: X-Frame-Options, nosniff and the
// CSP stay exactly as they are, and it happens that Nextcloud sends the first two
// as well. A disguise that switched off the injection defences would be trading a
// real protection for a cosmetic one.
func (s *Server) nextcloudHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.incognito() {
			h := w.Header()
			h.Set("Server", "Apache")
			h.Set("X-Powered-By", "PHP/8.2.18")
			h.Set("X-Robots-Tag", "noindex, nofollow")
			h.Set("X-Download-Options", "noopen")
			h.Set("X-Permitted-Cross-Domain-Policies", "none")
			h.Set("X-XSS-Protection", "1; mode=block")
		}
		next.ServeHTTP(w, r)
	})
}

// registerIncognitoDecoys wires the paths a Nextcloud answers and this app
// otherwise would not. Each falls through to `fallback` (the SPA handler) when
// the disguise is off, so nothing about the ordinary install changes.
func (s *Server) registerIncognitoDecoys(mux *http.ServeMux, fallback http.Handler) {
	decoy := func(pattern string, h http.HandlerFunc) {
		mux.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
			if !s.incognito() {
				fallback.ServeHTTP(w, r)
				return
			}
			h(w, r)
		})
	}

	// The fingerprint endpoint. Every Nextcloud serves this unauthenticated, and
	// every scanner asks for it first.
	decoy("GET /status.php", func(w http.ResponseWriter, r *http.Request) {
		writeNextcloudJSON(w, map[string]any{
			"installed":       true,
			"maintenance":     false,
			"needsDbUpgrade":  false,
			"version":         nextcloudVersion,
			"versionstring":   nextcloudVersionUI,
			"edition":         "",
			"productname":     "Nextcloud",
			"extendedSupport": false,
		})
	})

	// The capabilities call every Nextcloud client makes right after login. XML is
	// the default and JSON needs ?format=json, exactly as OCS does it.
	decoy("GET /ocs/v2.php/cloud/capabilities", s.handleFakeCapabilities)
	decoy("GET /ocs/v1.php/cloud/capabilities", s.handleFakeCapabilities)

	// DAV discovery. A real instance redirects these; a client that follows the
	// redirect then gets a Basic-auth challenge, which is what /remote.php does.
	for _, path := range []string{"/.well-known/webdav", "/.well-known/caldav", "/.well-known/carddav"} {
		decoy("GET "+path, func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/remote.php/dav/", http.StatusMovedPermanently)
		})
	}
	decoy("/remote.php/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("WWW-Authenticate", `Basic realm="Nextcloud", charset="UTF-8"`)
		writeNextcloudDAVError(w)
	})

	// Nextcloud ships exactly this robots.txt.
	decoy("GET /robots.txt", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte("User-agent: *\nDisallow: /\n"))
	})
}

func (s *Server) handleFakeCapabilities(w http.ResponseWriter, r *http.Request) {
	version := map[string]any{
		"major": 28, "minor": 0, "micro": 4,
		"string": nextcloudVersionUI, "edition": "", "extendedSupport": false,
	}
	capabilities := map[string]any{
		"core": map[string]any{
			"pollinterval": 60,
			"webdav-root":  "remote.php/webdav",
		},
		"theming": map[string]any{
			"name":   "Nextcloud",
			"url":    "https://nextcloud.com",
			"slogan": "a safe home for all your data",
			"color":  "#0082c9",
		},
	}
	if r.URL.Query().Get("format") != "json" {
		// OCS answers XML unless asked otherwise, and a client that gets JSON from a
		// bare capabilities call knows it is not talking to Nextcloud.
		w.Header().Set("Content-Type", "text/xml; charset=UTF-8")
		_, _ = w.Write([]byte(`<?xml version="1.0"?>
<ocs>
 <meta>
  <status>ok</status>
  <statuscode>200</statuscode>
  <message>OK</message>
 </meta>
 <data>
  <version>
   <major>28</major>
   <minor>0</minor>
   <micro>4</micro>
   <string>` + nextcloudVersionUI + `</string>
   <edition></edition>
  </version>
 </data>
</ocs>
`))
		return
	}
	writeNextcloudJSON(w, map[string]any{"ocs": map[string]any{
		"meta": map[string]any{"status": "ok", "statuscode": 200, "message": "OK"},
		"data": map[string]any{"version": version, "capabilities": capabilities},
	}})
}

func writeNextcloudJSON(w http.ResponseWriter, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(body)
}

// The body Nextcloud's DAV endpoint returns to an unauthenticated request.
func writeNextcloudDAVError(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`<?xml version="1.0" encoding="utf-8"?>
<d:error xmlns:d="DAV:" xmlns:s="http://sabredav.org/ns">
  <s:exception>Sabre\DAV\Exception\NotAuthenticated</s:exception>
  <s:message>No public access to this resource., No 'Authorization: Basic' header found.</s:message>
</d:error>
`))
}

// healthBody is what GET /api/health answers.
//
// The endpoint stays public and keeps answering, because a container health check
// and "am I running the build with my fix?" both depend on it — that second
// question is the reason it reports a version at all, and taking it away under the
// disguise would trade a real operational answer for very little.
//
// What it does drop is the AI fields. "aiTagger: wd-v1-4-moat-tagger-v2" identifies
// the product from one unauthenticated GET; a bare version tag identifies nothing,
// since every self-hosted thing on earth serves a number that looks like that.
func (s *Server) healthBody() map[string]any {
	if s.incognito() {
		return map[string]any{"status": "ok", "version": buildinfo.String()}
	}
	return map[string]any{
		"status":    "ok",
		"version":   buildinfo.String(),
		"aiEnabled": s.ai.Enabled(),
		"aiTagger":  s.ai.TaggerName(),
	}
}

// loginRealm is the product name shown by anything that has to name this install
// before a session exists — currently the WebAuthn relying party.
func (s *Server) loginRealm() string {
	if s.incognito() {
		return "Nextcloud"
	}
	return "OppaiLib"
}
