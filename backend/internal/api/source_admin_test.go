package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

// gallerySite serves a two-page listing shaped like a real gallery site: numeric
// detail links, lazy-loaded covers, query-parameter paging, a search form.
func gallerySite(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	page := func(ids []int) string {
		var b strings.Builder
		b.WriteString(`<html><head><title>Test Gallery | Home</title></head><body>
			<form action="/search"><input type="search" name="q"></form>
			<nav><a href="/about">About</a></nav><div class="grid">`)
		for _, id := range ids {
			fmt.Fprintf(&b, `<a href="/g/%d"><img data-src="/covers/%d.jpg" src="/blank.gif"><div class="title">Book %d</div></a>`, id, id, id)
		}
		b.WriteString(`</div><div class="pager"><a href="/?page=2">2</a></div></body></html>`)
		return b.String()
	}
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		if r.URL.Query().Get("page") == "2" {
			_, _ = w.Write([]byte(page([]int{4, 5, 6})))
			return
		}
		_, _ = w.Write([]byte(page([]int{1, 2, 3})))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

// The whole add-a-site path: analyse a listing page, get a proposal with a preview of
// what it actually extracted, save it, browse it, and remove it again.
func TestAddSiteFromAnalysis(t *testing.T) {
	site := gallerySite(t)
	s, token := newTestServer(t)
	h := s.Handler()

	// 1. Analyse.
	rec := do(t, h, token, "POST", "/api/sources/analyze", `{"url":"`+site.URL+`/"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("analyze: got %d, body %s", rec.Code, rec.Body)
	}
	var an analyzeResp
	if err := json.Unmarshal(rec.Body.Bytes(), &an); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if an.YAML == "" {
		t.Fatal("no proposal returned")
	}
	// The preview is the whole point of the review step: selectors cannot be judged
	// by reading them, only by seeing what they pulled out.
	if an.PreviewError != "" {
		t.Fatalf("dry run failed: %s\n%s", an.PreviewError, an.YAML)
	}
	if len(an.Preview) != 3 {
		t.Fatalf("preview returned %d items, want the page's 3: %+v", len(an.Preview), an.Preview)
	}
	if !strings.Contains(an.Preview[0].Title, "Book") {
		t.Errorf("preview title = %q, want the card caption", an.Preview[0].Title)
	}
	// Lazy-loaded covers: picking up the src placeholder instead of data-src is the
	// classic failure and it produces a grid of blank tiles.
	if strings.Contains(an.Preview[0].ThumbURL, "blank.gif") {
		t.Errorf("thumb = %q, took the lazy-load placeholder", an.Preview[0].ThumbURL)
	}

	// 2. A successfully fetched listing saves directly as a public source; adding a
	// site must not stop to demand credentials or an NSFW acknowledgement.
	if !strings.Contains(an.YAML, "authentication: none") || strings.Contains(an.YAML, "content_warning:") {
		t.Fatalf("proposal was not immediately usable as a public source:\n%s", an.YAML)
	}
	body, _ := json.Marshal(map[string]string{"yaml": an.YAML})
	rec = do(t, h, token, "POST", "/api/sources", string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("save: got %d, body %s", rec.Code, rec.Body)
	}
	var saved struct{ ID, Name string }
	_ = json.Unmarshal(rec.Body.Bytes(), &saved)
	if saved.ID == "" {
		t.Fatal("save returned no id")
	}

	// 3. It must be browsable immediately — a source that needs a restart to appear
	// would make this feature not worth having.
	rec = do(t, h, token, "GET", "/api/sources", "")
	var list struct{ Sources []sourceInfo }
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatalf("decode sources: %v", err)
	}
	var found *sourceInfo
	for i := range list.Sources {
		if list.Sources[i].ID == saved.ID {
			found = &list.Sources[i]
		}
	}
	if found == nil {
		t.Fatalf("saved source %q is not registered: %+v", saved.ID, list.Sources)
	}
	if !found.UserAdded {
		t.Error("a source added from the UI must be marked userAdded, or it can't be removed again")
	}
	if found.Authentication != "none" || found.ContentWarning != "" {
		t.Errorf("source access policy was not preserved: %+v", found)
	}

	rec = do(t, h, token, "GET", "/api/sources/"+saved.ID+"/browse?feed=recent", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("browse the new source: got %d, body %s", rec.Code, rec.Body)
	}
	var listing struct {
		Items []struct {
			ID, Title string
		}
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &listing); err != nil {
		t.Fatalf("decode listing: %v", err)
	}
	if len(listing.Items) != 3 {
		t.Fatalf("browse returned %d items, want 3: %+v", len(listing.Items), listing.Items)
	}

	// 4. Remove it, and confirm it goes.
	rec = do(t, h, token, "DELETE", "/api/sources/"+saved.ID, "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: got %d, body %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, "GET", "/api/sources", "")
	if strings.Contains(rec.Body.String(), `"id":"`+saved.ID+`"`) {
		t.Error("deleted source is still registered")
	}
}

func TestDeleteBuiltInSourceIsRefused(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	// 3hentai ships in the binary. "Deleting" it would either be a lie or a second
	// hidden kind of state; overriding it by id is the mechanism that exists.
	rec := do(t, h, token, "DELETE", "/api/sources/3hentai", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "built-in") {
		t.Errorf("error %s does not explain why", rec.Body)
	}
	if _, ok := s.sources.Get("3hentai"); !ok {
		t.Fatal("the built-in source was removed anyway")
	}
}

func TestBuiltInSourcesDeclareAccessWithoutNSFWWarnings(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, "GET", "/api/sources", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("list: got %d, body %s", rec.Code, rec.Body)
	}
	var list struct{ Sources []sourceInfo }
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	want := map[string]string{"4chan": "none", "rule34": "optional", "hanime": "none", "3hentai": "none"}
	for id, auth := range want {
		var found *sourceInfo
		for i := range list.Sources {
			if list.Sources[i].ID == id {
				found = &list.Sources[i]
				break
			}
		}
		if found == nil {
			t.Errorf("built-in %q is missing", id)
			continue
		}
		if found.Authentication != auth || found.ContentWarning != "" {
			t.Errorf("%s policy = %+v, want auth %q and no NSFW warning", id, found, auth)
		}
	}
}

func TestSaveSourceRejectsOpenProxyAllowlist(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	// hosts is the streaming proxy's allowlist. A bare wildcard would make the proxy
	// fetch anything reachable from the server on request.
	spec := `
id: evil
name: Evil
base_url: https://evil.test
kind: image
authentication: none
hosts: ["*"]
feeds:
  - id: recent
    label: Recent
    path: "/{page}"
listing:
  item: "a[href*='/p/']"
  id: {attr: href, pattern: "/p/(\\d+)"}
`
	body, _ := json.Marshal(map[string]string{"yaml": spec})
	rec := do(t, h, token, "POST", "/api/sources", string(body))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "wildcard") {
		t.Errorf("error %s does not name the problem", rec.Body)
	}
	if _, ok := s.sources.Get("evil"); ok {
		t.Fatal("the rejected source was registered anyway")
	}
}

func TestSourceAdminIsAdminOnly(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()

	uid, err := s.db.CreateUser(t.Context(), "plain", "x", false)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := s.db.CreateSession(t.Context(), "plain-token", uid, time.Hour, db.ClientWeb); err != nil {
		t.Fatalf("create session: %v", err)
	}

	for _, c := range []struct{ method, path, body string }{
		{"POST", "/api/sources/analyze", `{"url":"https://example.test/"}`},
		{"POST", "/api/sources", `{"yaml":"id: x"}`},
		{"DELETE", "/api/sources/3hentai", ""},
	} {
		rec := do(t, h, "plain-token", c.method, c.path, c.body)
		if rec.Code != http.StatusForbidden {
			t.Errorf("%s %s as non-admin: got %d, want 403", c.method, c.path, rec.Code)
		}
	}
}

func TestAnalyzeRefusesUnsupportedScheme(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	for _, raw := range []string{"file:///etc/passwd", "gopher://x/", "not a url at all"} {
		body, _ := json.Marshal(map[string]string{"url": raw})
		rec := do(t, h, token, "POST", "/api/sources/analyze", string(body))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("analyze %q: got %d, want 400", raw, rec.Code)
		}
	}
}

func TestAnalyzeGuardsAgainstPrivateAddresses(t *testing.T) {
	// With the production dial guard active, analysis must not become a way to make
	// the server fetch things on its own network.
	s, token := newTestServerGuarded(t)
	h := s.Handler()
	body, _ := json.Marshal(map[string]string{"url": "http://127.0.0.1:9/listing"})
	rec := do(t, h, token, "POST", "/api/sources/analyze", string(body))
	if rec.Code == http.StatusOK {
		t.Fatalf("analysed a loopback address: %s", rec.Body)
	}
}
