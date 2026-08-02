package api

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/webgame"
)

// Playing an imported HTML5 game build in place.
//
//	GET /api/media/{id}/play           is this game playable, and where does it start
//	GET /api/media/{id}/play/{path...} one file out of the build
//
// # Why this is safe to serve from our own origin
//
// This endpoint serves attacker-controlled HTML and JavaScript — a game zip is a
// file someone downloaded off the internet — from the same origin as the API the
// user is logged into. Served naively that is a total compromise: the game's script
// could call /api/media, read the library, change settings, or post the session
// somewhere, all with the user's own credentials.
//
// Three things stop that, and all three are required:
//
//  1. The client frames this in an iframe with `sandbox` and *without*
//     allow-same-origin, which puts the document in an opaque origin. It gets no
//     cookies, no localStorage, no access to the framing page, and every request it
//     makes to /api is cross-origin and uncredentialed — so reaching the API buys
//     nothing.
//  2. The CSP below is served *with the build's own files* and pins where the game
//     may load and send. connect-src is limited to the game's own origin, so a build
//     cannot phone home even if it wants to.
//  3. Content types come from a fixed allowlist (see webgame.ContentType) with
//     nosniff, so nothing is executed because a browser guessed at it.
//
// Because the sandboxed document has an opaque origin, the CSP cannot use 'self' —
// 'self' would match nothing and block the game's own assets. The concrete origin is
// substituted at request time instead.

// gameBuild opens the web build for a media id, answering the HTTP error itself when
// the item isn't a playable game.
func (s *Server) gameBuild(w http.ResponseWriter, r *http.Request) (*webgame.Build, func(), bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return nil, nil, false
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return nil, nil, false
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return nil, nil, false
	}
	if row.Kind != "game" {
		writeErr(w, http.StatusBadRequest, "not a game")
		return nil, nil, false
	}
	build, cleanup, err := s.openGameBuild(row)
	if err != nil {
		if errors.Is(err, webgame.ErrNotWebGame) || errors.Is(err, webgame.ErrUnsupported) {
			writeErr(w, http.StatusNotFound, "this game has no browser build")
			return nil, nil, false
		}
		writeErr(w, http.StatusInternalServerError, "couldn't read the game archive")
		return nil, nil, false
	}
	return build, cleanup, true
}

// openGameBuild opens a media row's blob as a web build. The returned cleanup closes
// the underlying decrypting reader and must always be called.
func (s *Server) openGameBuild(row *db.MediaRow) (*webgame.Build, func(), error) {
	ra, err := s.store.OpenAt(row.BlobPath, row.Size)
	if err != nil {
		return nil, nil, err
	}
	build, err := webgame.Open(ra, row.Size)
	if err != nil {
		ra.Close()
		return nil, nil, err
	}
	return build, func() { ra.Close() }, nil
}

// handleGamePlayInfo reports whether a game can be played in the browser, and how.
//
// Two answers are possible, and the order matters — a self-hosted build always wins:
//
//	{"playable":true, "mode":"local", "entry":"index.html"}
//	{"playable":true, "mode":"embed", "embedUrl":"https://html-classic.itch.zone/…"}
//
// The embed exists because an itch.io browser game *cannot* be self-hosted. itch
// never offers the HTML build as a download — only the project page — so nothing is
// imported to serve, and the local player would forever report "no browser build" for
// a game that plainly has one. Falling back to itch's own iframe is the only way to
// play those, at the cost of a direct connection from the user's browser to itch and
// nothing archived locally.
//
// The client asks this before offering a Play button, so the local check is first and
// cheap: it reads only the archive's central directory.
func (s *Server) handleGamePlayInfo(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if row.Kind != "game" {
		writeErr(w, http.StatusBadRequest, "not a game")
		return
	}

	if build, cleanup, err := s.openGameBuild(row); err == nil {
		defer cleanup()
		// A build's contents are fixed once imported, so the answer keeps.
		w.Header().Set("Cache-Control", "private, max-age=3600")
		writeJSON(w, http.StatusOK, map[string]any{
			"playable": true, "mode": "local", "entry": build.Entry(),
		})
		return
	}

	if embed := s.itchEmbedFor(r.Context(), row); embed != "" {
		// Shorter: itch rebuilds an embed URL when the author uploads a new version,
		// and a stale one 404s inside the player where it reads as a broken game.
		w.Header().Set("Cache-Control", "private, max-age=300")
		writeJSON(w, http.StatusOK, map[string]any{
			"playable": true, "mode": "embed", "embedUrl": embed,
		})
		return
	}

	writeErr(w, http.StatusNotFound, "this game has no browser build")
}

// itchEmbedFor resolves a game's browser build on itch, or "" when it has none.
//
// Both recorded URLs are tried because they carry different things: source is the
// page the item was scraped from, while download is where the parser decided the file
// lives — which for itch is usually the same page, but is an external host when the
// project links out. Resolution is cached: it costs a throttled fetch of someone
// else's page, and the viewer asks on every open.
func (s *Server) itchEmbedFor(ctx context.Context, row *db.MediaRow) string {
	if s.scraper == nil {
		return ""
	}
	for _, candidate := range []string{
		s.decrypt(row.SourceEnc, "source"),
		s.decrypt(row.DownloadEnc, "download"),
	} {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		embed, err := s.embedCache.get(ctx, candidate, func(ctx context.Context) (string, error) {
			ctx, cancel := context.WithTimeout(ctx, scrapeTimeout)
			defer cancel()
			return s.scraper.ItchEmbed(ctx, candidate)
		})
		if err != nil {
			s.log.Debug("itch embed lookup failed", "media", row.ID, "err", err)
			continue
		}
		if embed != "" {
			return embed
		}
	}
	return ""
}

// handleGamePlayAsset streams one file out of the build.
func (s *Server) handleGamePlayAsset(w http.ResponseWriter, r *http.Request) {
	build, cleanup, ok := s.gameBuild(w, r)
	if !ok {
		return
	}
	defer cleanup()

	name := r.PathValue("path")
	rc, size, err := build.Open(name)
	if err != nil {
		writeErr(w, http.StatusNotFound, "no such file in this build")
		return
	}
	defer rc.Close()

	h := w.Header()
	h.Set("Content-Type", webgame.ContentType(name))
	h.Set("X-Content-Type-Options", "nosniff")
	if size > 0 {
		h.Set("Content-Length", strconv.FormatInt(size, 10))
	}
	// Override the global policy for this one subtree. The app-wide CSP is built for
	// our own UI (script-src 'self', no eval) and would stop every real game engine
	// dead; the app-wide X-Frame-Options: DENY would stop the page framing it at all.
	h.Set("Content-Security-Policy", gameContentSecurityPolicy(r, r.PathValue("id")))
	h.Set("X-Frame-Options", "SAMEORIGIN")
	// A build's bytes never change — the blob is content-addressed, and re-importing
	// makes a different item — so let the browser keep them. Games are many small
	// files and this is the difference between a fast restart and a full refetch.
	h.Set("Cache-Control", "private, max-age=86400")

	if _, err := io.Copy(w, rc); err != nil {
		s.log.Debug("game asset stream interrupted", "path", name, "err", err)
	}
}

// gameContentSecurityPolicy builds the policy served alongside a build's files.
//
// Two things shape it.
//
// It cannot use 'self'. The player frames this sandboxed, which puts the document in
// an opaque origin, and under an opaque origin 'self' matches nothing — the game
// would be unable to load its own assets. The concrete origin is named instead.
//
// And it is scoped to a *path*, not just the origin. CSP source expressions match on
// path prefix, so pinning every directive to this game's own /play/ subtree is what
// closes the last gap in the sandbox: an opaque-origin document can still issue
// credentialed simple requests to our origin, which would be CSRF against the API.
// With the policy below the browser refuses to let a build address anything outside
// its own files at all — it can load its assets and nothing else on this server.
//
// What it permits is what real engines need: inline and eval'd script (Unity, Godot,
// RenPy and Emscripten builds all generate them) plus blob:/data: for their workers
// and generated assets.
func gameContentSecurityPolicy(r *http.Request, mediaID string) string {
	origin := gameOrigin(r)
	if origin == "'none'" {
		// Nothing trustworthy to build a policy from — deny everything rather than
		// emit one with a hole in it.
		return "default-src 'none'; frame-ancestors 'self'"
	}
	// The trailing slash is what makes this a prefix match over the build's files
	// rather than an exact-URL match.
	base := origin + "/api/media/" + mediaID + "/play/"
	return "default-src " + base + " blob: data:; " +
		"script-src " + base + " blob: data: 'unsafe-inline' 'unsafe-eval'; " +
		"style-src " + base + " blob: data: 'unsafe-inline'; " +
		"img-src " + base + " blob: data:; " +
		"media-src " + base + " blob: data:; " +
		"font-src " + base + " blob: data:; " +
		"worker-src " + base + " blob:; " +
		"child-src " + base + " blob:; " +
		"connect-src " + base + " blob: data:; " +
		"form-action 'none'; " +
		"base-uri 'none'; " +
		"object-src 'none'; " +
		// Only our own UI may frame a game. Without this the app-wide 'none' would
		// apply and the player would show an empty box.
		"frame-ancestors 'self'"
}

// gameOrigin reconstructs the scheme://host this build is being served from, for the
// CSP to name.
//
// Deliberately *not* the requestOrigin helper the passkey code uses: that one prefers
// the Origin header, which is exactly the header the sandboxed game controls (it sends
// "null", and a hostile build could send anything). This derives the origin only from
// where the request actually arrived — Host plus scheme, honouring the proxy headers a
// reverse-proxied install depends on.
func gameOrigin(r *http.Request) string {
	scheme := "http"
	if isHTTPS(r) {
		scheme = "https"
	}
	host := r.Host
	if fwd := r.Header.Get("X-Forwarded-Host"); fwd != "" {
		// First value: a proxy chain appends, so the first is the client-facing host.
		host = strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	if strings.TrimSpace(host) == "" {
		// Nothing trustworthy to name. Fail closed rather than emit a policy with a
		// hole in it: a game that won't load is a bug report, a game with no CSP is not.
		return "'none'"
	}
	return scheme + "://" + host
}
