package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCivitaiCommentsAreAskedWithTheKeyAndArriveSafe(t *testing.T) {
	s, token := newTestServer(t)
	var gotAuth, gotInput string
	civ := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/trpc/comment.getAll" {
			http.NotFound(w, r)
			return
		}
		gotAuth, gotInput = r.Header.Get("Authorization"), r.URL.Query().Get("input")
		_, _ = w.Write([]byte(`{"result":{"data":{"json":{"comments":[
			{"id":7,"content":"<p>Great at <b>hands</b></p><script>alert(1)</script>","createdAt":"2026-10-01T10:00:00.000Z",
			 "user":{"username":"ink","image":"abc-123"},"reactions":[{"reaction":"Heart"},{"reaction":"Like"}],"_count":{"comments":2}},
			{"id":8,"content":"   ","user":{"username":"blank"}}
		],"nextCursor":12}}}}`))
	}))
	defer civ.Close()
	cur := s.settings.Get()
	cur.CivitaiAPIURL = civ.URL + "/api/v1"
	s.settings.Set(cur)
	h := s.Handler()

	// Without a key: never a 401, and the page to read them on instead.
	rec := do(t, h, token, http.MethodGet, "/api/imagegen/civitai/comments?modelId=4201", "")
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), `"needsKey":true`) || !strings.Contains(rec.Body.String(), "/models/4201") {
		t.Fatalf("no key: %d %s", rec.Code, rec.Body.String())
	}

	cur.CivitaiAPIKey = "k-123"
	s.settings.Set(cur)
	rec = do(t, h, token, http.MethodGet, "/api/imagegen/civitai/comments?modelId=4201", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("comments: %d %s", rec.Code, rec.Body.String())
	}
	if gotAuth != "Bearer k-123" || !strings.Contains(gotInput, `"modelId":4201`) {
		t.Fatalf("asked with auth %q input %q", gotAuth, gotInput)
	}
	var out struct {
		Items      []civitaiComment `json:"items"`
		NextCursor string           `json:"nextCursor"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out.Items) != 1 || out.NextCursor != "12" {
		t.Fatalf("got %+v", out)
	}
	c := out.Items[0]
	if strings.Contains(c.HTML, "script") || !strings.Contains(c.HTML, "<b>hands</b>") {
		t.Fatalf("html = %q", c.HTML)
	}
	if c.User != "ink" || c.Replies != 2 || c.Likes != 2 || !strings.HasPrefix(c.Avatar, "https://image.civitai.com/") {
		t.Fatalf("comment = %+v", c)
	}
}
