package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// noProcedure is how tRPC answers a procedure a site has not got.
func noProcedure(w http.ResponseWriter, path string) {
	w.WriteHeader(http.StatusNotFound)
	_, _ = w.Write([]byte(`{"error":{"json":{"message":"No procedure found on path \"` + path + `\"","code":-32004}}}`))
}

func TestCivitaiCommentsAreAskedWithTheKeyAndArriveSafe(t *testing.T) {
	s, token := newTestServer(t)
	var gotAuth, gotInput string
	civ := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// A mirror from before the comment suite moved: only the old procedure.
		if r.URL.Path != "/api/trpc/comment.getAll" {
			noProcedure(w, strings.TrimPrefix(r.URL.Path, "/api/trpc/"))
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

	// A post or a picture has no old procedure to fall back on, and says so as a 502.
	rec = do(t, h, token, http.MethodGet, "/api/imagegen/civitai/comments?entity=image&id=99", "")
	if rec.Code != http.StatusBadGateway || !strings.Contains(rec.Body.String(), "/images/99") {
		t.Fatalf("image on an old mirror: %d %s", rec.Code, rec.Body.String())
	}
}

func TestCivitaiCommentSectionsArriveInReadingOrderWithTheirThreads(t *testing.T) {
	s, token := newTestServer(t)
	var gotInput string
	civ := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/trpc/commentv3.getSection" {
			noProcedure(w, strings.TrimPrefix(r.URL.Path, "/api/trpc/"))
			return
		}
		gotInput = r.URL.Query().Get("input")
		// Ids out of order on purpose: the order is rootIds' and the threads', not the list's.
		_, _ = w.Write([]byte(`{"result":{"data":{"json":{
			"comments":[
				{"id":3,"parentId":1,"depth":1,"content":"<p>agreed</p>","createdAt":"2026-11-19T10:00:00.000Z","user":{"username":"b","image":null},"reactionCount":1,"replyCount":0},
				{"id":1,"parentId":null,"depth":0,"content":"<p>lovely <a href=\"javascript:x\">light</a></p>","pinnedAt":"2026-11-19T09:00:00.000Z","user":{"username":"a","image":"img-1"},"reactionCount":4,"replyCount":3},
				{"id":2,"parentId":null,"depth":0,"deleted":true,"content":"","user":null,"reactionCount":0,"replyCount":1},
				{"id":4,"parentId":2,"depth":1,"content":"<p>what did they say?</p>","user":{"username":"c"},"replyCount":0},
				{"id":5,"parentId":null,"content":"<p>hidden</p>","hidden":true,"user":{"username":"d"}}
			],
			"rootIds":[1,2,5],
			"children":{"1":{"ids":[3],"nextCursor":"x"},"2":{"ids":[4],"nextCursor":null}},
			"nextCursor":"c-2"
		}}}}`))
	}))
	defer civ.Close()
	cur := s.settings.Get()
	cur.CivitaiAPIURL, cur.CivitaiAPIKey = civ.URL+"/api/v1", "k"
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/comments?entity=post&id=321&sort=oldest&cursor=c-1", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("section: %d %s", rec.Code, rec.Body.String())
	}
	for _, want := range []string{`"entityType":"post"`, `"entityId":321`, `"sort":"Oldest"`, `"cursor":"c-1"`} {
		if !strings.Contains(gotInput, want) {
			t.Fatalf("input %s lacks %s", gotInput, want)
		}
	}
	var out struct {
		Items      []civitaiComment `json:"items"`
		NextCursor string           `json:"nextCursor"`
		Page       string           `json:"page"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	var order []int64
	for _, c := range out.Items {
		order = append(order, c.ID)
	}
	if len(order) != 4 || order[0] != 1 || order[1] != 3 || order[2] != 2 || order[3] != 4 {
		t.Fatalf("order = %v, want [1 3 2 4] (the hidden one left out)", order)
	}
	first, reply, gone := out.Items[0], out.Items[1], out.Items[2]
	if !first.Pinned || first.Likes != 4 || first.MoreReplies != 2 || strings.Contains(first.HTML, "javascript") {
		t.Fatalf("first = %+v", first)
	}
	if reply.Depth != 1 || reply.ParentID != 1 || reply.User != "b" {
		t.Fatalf("reply = %+v", reply)
	}
	if gone.User != "" || !strings.Contains(gone.HTML, "Deleted") {
		t.Fatalf("a deleted comment holding a reply stays as a placeholder: %+v", gone)
	}
	if out.NextCursor != "c-2" || !strings.HasSuffix(out.Page, "/posts/321") {
		t.Fatalf("next %q page %q", out.NextCursor, out.Page)
	}

	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/comments?entity=article&id=1", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("an entity this does not read: %d", rec.Code)
	}
}
