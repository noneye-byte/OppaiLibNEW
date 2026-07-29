package api

import (
	"net/http"
	"strings"
)

// contentSecurityPolicy is the app's CSP. The load-bearing directive is
// script-src 'self': the SPA loads its JS as an external module (no inline
// scripts), so scripts are restricted to our own origin and an injected
// <script> or text/html response cannot execute. The rest is tuned to what the
// built UI actually needs:
//
//   - style-src allows 'unsafe-inline' (Lit/Material components set inline styles)
//     and Google Fonts' stylesheet host; script has no such exception.
//   - font-src permits Google Fonts' file host and data: URIs.
//   - img/media-src cover self plus data:/blob: for generated thumbnails and object
//     URLs; all remote media is already proxied through our origin.
//   - object-src 'none', base-uri 'self' and frame-ancestors 'none' close the
//     usual injection side doors (and frame-ancestors backstops X-Frame-Options).
const contentSecurityPolicy = "default-src 'self'; " +
	"base-uri 'self'; " +
	"object-src 'none'; " +
	"frame-ancestors 'none'; " +
	"script-src 'self'; " +
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
	"font-src 'self' https://fonts.gstatic.com data:; " +
	"img-src 'self' data: blob:; " +
	"media-src 'self' blob:; " +
	"connect-src 'self'; " +
	"manifest-src 'self'"

// securityHeaders sets defensive response headers on every request. nosniff is one
// of two load-bearing ones: several endpoints stream bytes whose type is influenced
// by a remote host or a stored title, and without it a browser may sniff an image
// response as HTML and execute script on this origin. The CSP is the other — it
// keeps script execution to our own origin even if a byte stream slips through.
// Framing and referrer are hardened alongside them.
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", contentSecurityPolicy)
		next.ServeHTTP(w, r)
	})
}

// safeInlineContentType maps a claimed content type to one that is safe to serve
// with an inline disposition on this origin. Media the library actually holds
// (images, video, audio, PDF) passes through; anything a browser might render as
// an active document — HTML, XML, SVG (which can script), JavaScript — collapses
// to application/octet-stream so it downloads instead of executing.
//
// This is the content-side half of the XSS defense; the nosniff header is the
// other half. Both matter: nosniff stops a browser from *guessing* HTML for a
// mislabeled body, and this stops it from *honoring* an attacker-chosen text/html.
func safeInlineContentType(ct string) string {
	const fallback = "application/octet-stream"
	// Strip any parameters (e.g. "; charset=utf-8") and normalize.
	base := strings.ToLower(strings.TrimSpace(strings.SplitN(ct, ";", 2)[0]))
	if base == "" {
		return fallback
	}
	switch base {
	case "image/svg+xml", "text/html", "application/xhtml+xml",
		"application/xml", "text/xml", "application/javascript",
		"text/javascript", "application/ecmascript":
		return fallback
	}
	if strings.HasPrefix(base, "image/") ||
		strings.HasPrefix(base, "video/") ||
		strings.HasPrefix(base, "audio/") ||
		base == "application/pdf" {
		return base
	}
	return fallback
}
