package api

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// A hostile origin that answers the proxy with an HTML document + script, the
// exact payload an SSRF/XSS chain would use to run code on our origin.
func hostileHTMLSite(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<script>alert(document.cookie)</script>`))
	}))
	t.Cleanup(srv.Close)
	return srv
}

// The scrape proxy must never relay an attacker's text/html as an active document
// on our origin: the type is forced to a non-rendering one and nosniff is set, so
// the browser downloads the bytes instead of executing them.
func TestScrapeProxyNeutralizesHTML(t *testing.T) {
	evil := hostileHTMLSite(t)
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, "GET", "/api/scrape/proxy?url="+url.QueryEscape(evil.URL), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("proxy: got %d, body %s", rec.Code, rec.Body)
	}
	if ct := rec.Header().Get("Content-Type"); strings.Contains(ct, "text/html") {
		t.Errorf("proxy served active Content-Type %q; expected it neutralized", ct)
	}
	if got := rec.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Errorf("X-Content-Type-Options = %q, want nosniff", got)
	}
}

// The SSRF dial guard must refuse a loopback target when private hosts aren't
// explicitly allowed — the production configuration.
func TestScrapeProxyBlocksLoopbackSSRF(t *testing.T) {
	evil := hostileHTMLSite(t) // bound on 127.0.0.1
	s, token := newTestServerGuarded(t)
	h := s.Handler()

	rec := do(t, h, token, "GET", "/api/scrape/proxy?url="+url.QueryEscape(evil.URL), "")
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("proxy to loopback: got %d, want 502; body %s", rec.Code, rec.Body)
	}
}
