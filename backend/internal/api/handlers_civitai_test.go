package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCivitaiCategoriesCredentialsAndPaging(t *testing.T) {
	var gotTag, gotAuth, gotPage bool
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = gotAuth || r.Header.Get("Authorization") == "Bearer test-key"
		switch r.URL.Path {
		case "/tags":
			fmt.Fprint(w, `{"items":[{"name":"style","modelCount":91}]}`)
		case "/models":
			gotTag = gotTag || r.URL.Query().Get("tag") == "style"
			gotPage = gotPage || r.URL.Query().Get("page") == "2"
			fmt.Fprintf(w, `{"items":[],"metadata":{"nextPage":%q}}`, upstreamURL(r)+"?page=2")
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	s, token := newTestServer(t)
	set := s.settings.Get()
	set.CivitaiAPIURL = upstream.URL
	set.CivitaiAPIKey = "test-key"
	s.settings.Set(set)
	h := s.Handler()
	rec := do(t, h, token, http.MethodGet, "/api/imagegen/civitai/categories", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"name":"style"`) {
		t.Fatalf("categories: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodGet, "/api/imagegen/civitai/search?category=style", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"nextCursor":"page:2"`) {
		t.Fatalf("search: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodGet, "/api/imagegen/civitai/search?cursor=page%3A2", "")
	if rec.Code != http.StatusOK || !gotAuth || !gotTag || !gotPage {
		t.Fatalf("auth=%v tag=%v page=%v response=%d %s", gotAuth, gotTag, gotPage, rec.Code, rec.Body)
	}
}

func upstreamURL(r *http.Request) string {
	return "http://" + r.Host + r.URL.Path
}
