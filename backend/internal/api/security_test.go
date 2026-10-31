package api

import (
	"slices"
	"strings"
	"testing"
)

func TestSafeInlineContentType(t *testing.T) {
	cases := map[string]string{
		// Active/document types collapse to a download.
		"text/html":                "application/octet-stream",
		"text/html; charset=utf-8": "application/octet-stream",
		"TEXT/HTML":                "application/octet-stream",
		"image/svg+xml":            "application/octet-stream",
		"application/xhtml+xml":    "application/octet-stream",
		"application/javascript":   "application/octet-stream",
		"application/xml":          "application/octet-stream",
		"":                         "application/octet-stream",
		"application/x-msdownload": "application/octet-stream",
		// Real media passes through, parameters stripped.
		"image/jpeg":           "image/jpeg",
		"image/png; something": "image/png",
		"video/mp4":            "video/mp4",
		"audio/mpeg":           "audio/mpeg",
		"application/pdf":      "application/pdf",
	}
	for in, want := range cases {
		if got := safeInlineContentType(in); got != want {
			t.Errorf("safeInlineContentType(%q) = %q, want %q", in, got, want)
		}
	}
}

// A picture chosen from disk reaches the studios as an object URL that they fetch()
// to send as a run's start. The policy once left blob: out of connect-src, and every
// clip or picture started from a file failed in the browser before it was sent.
func TestThePolicyLetsThePageReadItsOwnObjectURLs(t *testing.T) {
	for _, directive := range strings.Split(contentSecurityPolicy, ";") {
		f := strings.Fields(directive)
		if len(f) == 0 || f[0] != "connect-src" {
			continue
		}
		if !slices.Contains(f, "blob:") {
			t.Fatalf("connect-src has no blob: — %q", directive)
		}
		if slices.Contains(f, "*") || slices.Contains(f, "http:") || slices.Contains(f, "https:") {
			t.Fatalf("connect-src reaches off the origin: %q", directive)
		}
		return
	}
	t.Fatal("the policy has no connect-src")
}
