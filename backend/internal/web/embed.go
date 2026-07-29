// Package web embeds the built Material 3 SPA and serves it with SPA fallback
// (unknown non-API paths return index.html so client-side routing works).
package web

import (
	"bytes"
	"embed"
	"io/fs"
	"net/http"
	"strings"
	"time"
)

//go:embed all:dist
var dist embed.FS

// ── incognito shell ──────────────────────────────────────────────────────────
//
// The HTML shell is the first thing anyone sees and the only thing they see
// before signing in, so it is where the disguise has to start. Rewriting it here
// — rather than shipping two builds or letting the SPA fix the title after the
// fact — means the tab is named and iconed correctly in the very first frame,
// which is the frame someone glancing over your shoulder actually gets.
//
// Only two substitutions, because the icon and manifest links do not need one:
// their URLs are aliased at the other end (see incognitoAliases), so the shell
// can keep asking for /icon.svg and be handed the cloud one. That is deliberately
// the more robust half — the build rewrites those hrefs to relative paths and may
// rewrite them again, whereas a served path is a served path.
//
// Both replacements below are plain string matches against the built index.html.
// If a build ever stops containing one, the replacement quietly does nothing and
// the shell is served as-is: a stale title is a cosmetic bug, whereas failing the
// request would take the whole app down over a marketing detail.
var incognitoShell = strings.NewReplacer(
	"<title>OppaiLib</title>", "<title>Nextcloud</title>",
	`<meta name="theme-color" content="#191410" />`,
	`<meta name="theme-color" content="#0082c9" />`+"\n"+
		// The SPA reads this to know it is wearing the disguise, before it has a
		// session or has asked the server anything. A meta tag rather than an
		// inline <script> because the CSP is script-src 'self' and is staying
		// that way — a disguise is not worth a hole in the injection defence.
		`    <meta name="oppai-mode" content="incognito" />`,
)

// Assets whose *identity* is OppaiLib's. Under the disguise each is answered
// with its cloud counterpart, so a bookmark's icon, an installed PWA's name and
// a directly-fetched manifest all agree with the tab — without the HTML having
// to name any of them.
var incognitoAliases = map[string]string{
	"/manifest.webmanifest": "cloud.webmanifest",
	"/icon.svg":             "cloud-icon.svg",
	"/icon.png":             "cloud-icon.svg",
	"/icon-192.png":         "cloud-icon.svg",
	"/icon-512.png":         "cloud-icon.svg",
	"/favicon-16.png":       "cloud-icon.svg",
	"/favicon-32.png":       "cloud-icon.svg",
	"/apple-touch-icon.png": "cloud-icon.svg",
}

// Handler returns an http.Handler serving the embedded web UI.
//
// incognito is consulted per request rather than at construction because it is a
// live setting: switching the disguise on must not need a restart.
func Handler(incognito func() bool) http.Handler {
	sub, err := fs.Sub(dist, "dist")
	if err != nil {
		panic(err)
	}
	if incognito == nil {
		incognito = func() bool { return false }
	}
	fileServer := http.FileServer(http.FS(sub))
	isAsset := func(p string) bool { return strings.HasPrefix(p, "/assets/") }
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hidden := incognito()
		// An OppaiLib-branded file requested by name while disguised: answer with
		// the cloud one. Serving the real icon here would undo the shell rewrite
		// for anyone (or any browser cache) that asks for it directly.
		if hidden {
			if alias, ok := incognitoAliases[r.URL.Path]; ok {
				w.Header().Set("Cache-Control", "no-cache")
				serveFile(w, r, sub, alias)
				return
			}
		}

		_, statErr := fs.Stat(sub, trimLeadingSlash(r.URL.Path))

		// A missing /assets/* file must 404 — never fall back to index.html.
		// Assets are served "immutable" (below), so answering a missing bundle
		// with the HTML shell makes the browser pin that text/html under the JS
		// URL for a year; the app then white-screens on "Expected a JavaScript
		// module script but the server responded with a MIME type of text/html"
		// until the cache is manually cleared. Crucially, the cache header is set
		// only AFTER this check, so a miss is never cached as immutable.
		if statErr != nil && isAsset(r.URL.Path) {
			http.NotFound(w, r)
			return
		}

		// SPA fallback: unknown non-asset routes serve index.html so client-side
		// routing works. index.html must revalidate (no-cache) so a new deploy's
		// bundle reference is picked up immediately.
		if statErr != nil {
			w.Header().Set("Cache-Control", "no-cache")
			serveShell(w, r, sub, hidden, fileServer)
			return
		}

		// A real file exists here. Content-hash-named /assets/* are safe to cache
		// forever; everything else (index.html, icons, manifest) must revalidate.
		if isAsset(r.URL.Path) {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		if trimLeadingSlash(r.URL.Path) == "index.html" {
			serveShell(w, r, sub, hidden, fileServer)
			return
		}
		fileServer.ServeHTTP(w, r)
	})
}

// serveShell writes index.html, disguised or not. The plain path stays the
// FileServer's so that ETag, Range and conditional requests keep behaving as they
// did; only the rewritten variant is served by hand.
func serveShell(w http.ResponseWriter, r *http.Request, sub fs.FS, hidden bool, fileServer http.Handler) {
	if !hidden {
		r2 := r.Clone(r.Context())
		r2.URL.Path = "/"
		fileServer.ServeHTTP(w, r2)
		return
	}
	raw, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	body := incognitoShell.Replace(string(raw))
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// No ModTime: the shell now depends on a setting, not only on the build, and a
	// Last-Modified that says otherwise would let a cache serve the wrong identity.
	http.ServeContent(w, r, "index.html", time.Time{}, bytes.NewReader([]byte(body)))
}

func serveFile(w http.ResponseWriter, r *http.Request, sub fs.FS, name string) {
	raw, err := fs.ReadFile(sub, name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(raw))
}

func trimLeadingSlash(p string) string {
	if len(p) > 0 && p[0] == '/' {
		p = p[1:]
	}
	if p == "" {
		return "index.html"
	}
	return p
}
