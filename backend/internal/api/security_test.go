package api

import "testing"

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
