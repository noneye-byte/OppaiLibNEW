package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// linkDreamshaper records k-dream as version 8 of DreamShaper, the way a hash
// lookup would have, so the management endpoints have something to work on.
func linkDreamshaper(t *testing.T, s *Server) {
	t.Helper()
	m, err := s.civitaiModel(context.Background(), 4384)
	if err != nil {
		t.Fatalf("fake model page: %v", err)
	}
	link := civitaiLinkFrom("k-dream", "771C807DB56DBFC33FEDA5638D920F6C507DB971DA44772EE44A08DC38C3B437", m, 128713)
	if err := s.db.PutCivitaiLink(context.Background(), link); err != nil {
		t.Fatal(err)
	}
}

func TestCivitaiUpdateInstallsTheNewerVersionThenRetiresTheOld(t *testing.T) {
	s, token, inv := civitaiTestServer(t)
	linkDreamshaper(t, s)

	// Nothing to do for a model the catalogue does not know.
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/update", `{"key":"k-lora"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("update of an unlinked model: %d %s", rec.Code, rec.Body)
	}
	// Left to the default, the update goes to the newest version.
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/update", `{"key":"k-dream"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"status":"waiting"`) {
		t.Fatalf("update: %d %s", rec.Code, rec.Body)
	}
	ctx := context.Background()
	pending, _ := s.db.CivitaiInstalls(ctx)
	if len(pending) != 1 || pending[0].VersionID != 999 || pending[0].ReplaceKey != "k-dream" ||
		pending[0].Source != "https://civitai.com/api/download/models/999" {
		t.Fatalf("promise = %+v", pending)
	}
	// Asking again for the version it already has is refused rather than
	// downloading the same file over itself.
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/update", `{"key":"k-dream","versionId":128713}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("update to the current version: %d %s", rec.Code, rec.Body)
	}
	// While it downloads, the old record stays.
	if n := s.civitaiApplyFinishedInstalls(ctx); n != 1 {
		t.Fatalf("waiting = %d", n)
	}
	inv.mu.Lock()
	if len(inv.deleted) != 0 {
		t.Fatalf("deleted before the download finished: %v", inv.deleted)
	}
	inv.jobDone = true
	inv.mu.Unlock()
	if n := s.civitaiApplyFinishedInstalls(ctx); n != 0 {
		t.Fatalf("waiting after completion = %d", n)
	}
	inv.mu.Lock()
	defer inv.mu.Unlock()
	if len(inv.deleted) != 1 || inv.deleted[0] != "k-dream" {
		t.Fatalf("old record not retired: deleted=%v", inv.deleted)
	}
	if inv.coverKey != "k-new" {
		t.Fatalf("new record not dressed: cover on %q", inv.coverKey)
	}
	if _, ok, _ := s.db.CivitaiLink(ctx, "k-dream"); ok {
		t.Fatal("the old link survived the update")
	}
	if link, ok, _ := s.db.CivitaiLink(ctx, "k-new"); !ok || link.VersionID != 999 {
		t.Fatalf("new link = %+v ok=%v", link, ok)
	}
}

func TestCivitaiCoverChoiceIsAppliedAndKeptAcrossAFetch(t *testing.T) {
	s, token, inv, civ := civitaiTestServerFull(t)
	linkDreamshaper(t, s)

	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/cover",
		`{"key":"k-dream","url":"https://evil.example/x.jpeg"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("cover from a foreign host: %d", rec.Code)
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/cover",
		`{"key":"k-dream","url":"https://image.civitai.com/old1.jpeg"}`)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("cover: %d %s", rec.Code, rec.Body)
	}
	inv.mu.Lock()
	if inv.coverKey != "k-dream" || inv.coverBytes == 0 {
		t.Fatalf("cover not written: key=%q bytes=%d", inv.coverKey, inv.coverBytes)
	}
	inv.mu.Unlock()
	ctx := context.Background()
	if link, _, _ := s.db.CivitaiLink(ctx, "k-dream"); link.CoverURL != "https://image.civitai.com/old1.jpeg" {
		t.Fatalf("choice not remembered: %+v", link)
	}
	// Fetching from the catalogue again keeps the chosen picture rather than
	// putting the first preview back.
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/sync", `{"key":"k-dream"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"coverUrl":"https://image.civitai.com/old1.jpeg"`) {
		t.Fatalf("sync: %d %s", rec.Code, rec.Body)
	}
	civ.mu.Lock()
	defer civ.mu.Unlock()
	if n := len(civ.previews); n == 0 || civ.previews[n-1] != "https://image.civitai.com/old1.jpeg" {
		t.Fatalf("sync fetched %v, want the chosen cover last", civ.previews)
	}
}

func TestDeleteModelRemovesTheRecordAndItsLink(t *testing.T) {
	s, token, inv := civitaiTestServer(t)
	linkDreamshaper(t, s)

	// A LoRA goes by its display name in the picker; the record is resolved.
	rec := do(t, s.Handler(), token, http.MethodDelete, "/api/imagegen/model?key=some-lora", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, s.Handler(), token, http.MethodDelete, "/api/imagegen/model?key=k-dream", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	inv.mu.Lock()
	defer inv.mu.Unlock()
	if strings.Join(inv.deleted, ",") != "k-lora,k-dream" {
		t.Fatalf("deleted = %v", inv.deleted)
	}
	if _, ok, _ := s.db.CivitaiLink(context.Background(), "k-dream"); ok {
		t.Fatal("link outlived the model")
	}
	if rec := do(t, s.Handler(), token, http.MethodDelete, "/api/imagegen/model?key=nope", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("delete of nothing: %d", rec.Code)
	}
}

func TestCivitaiPostsAreRebuiltFromTheImageFeed(t *testing.T) {
	img := func(id, post int64) civitaiImageOut {
		return civitaiImageOut{ID: id, PostID: post, URL: "https://image.civitai.com/x.jpeg", CreatedAt: "2024-01-0" + string(rune('0'+id)) + "T00:00:00Z"}
	}
	posts := groupCivitaiPosts([]civitaiImageOut{img(1, 10), img(2, 10), img(3, 11), img(4, 0), img(5, 10)})
	if len(posts) != 3 {
		t.Fatalf("posts = %+v", posts)
	}
	// Pictures of one post stay together in feed order; the first picture's date
	// is the post's; an orphan picture is a post of its own.
	if posts[0].ID != 10 || len(posts[0].Images) != 3 || posts[0].CreatedAt != "2024-01-01T00:00:00Z" {
		t.Fatalf("post 10 = %+v", posts[0])
	}
	if posts[1].ID != 11 || posts[2].ID != -4 || len(posts[2].Images) != 1 {
		t.Fatalf("posts = %+v", posts[1:])
	}
	if groupCivitaiPosts(nil) == nil {
		t.Fatal("no pictures should be an empty list, not null")
	}

	s, token, _ := civitaiTestServer(t)
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/posts", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("posts without a user: %d", rec.Code)
	}
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/posts?username=Lykon", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("posts: %d %s", rec.Code, rec.Body)
	}
	var res struct {
		Items      []civitaiPostOut `json:"items"`
		NextCursor string           `json:"nextCursor"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	if len(res.Items) != 1 || len(res.Items[0].Images) != 1 || res.Items[0].Images[0].Prompt != "1girl, dream" || res.NextCursor != "n2" {
		t.Fatalf("posts = %s", rec.Body)
	}
}

func TestCivitaiCollectionsAndProfileCover(t *testing.T) {
	s, token, _ := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/collections?q=anime&sort=followers", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("collections: %d %s", rec.Code, rec.Body)
	}
	var res struct {
		Items      []civitaiCollectionOut `json:"items"`
		NextCursor string                 `json:"nextCursor"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	if len(res.Items) != 2 || res.NextCursor != "17981229" {
		t.Fatalf("collections = %s", rec.Body)
	}
	if c := res.Items[0]; c.ID != 18010391 || c.Type != "Image" || c.Count != 1 || c.Username != "hermes7" || c.NSFW || c.Cover != "" || c.Description != "" {
		t.Fatalf("collection = %+v", c)
	}
	if c := res.Items[1]; !c.NSFW || c.Cover != "https://image.civitai.com/c.jpeg" {
		t.Fatalf("collection = %+v", c)
	}
	// A collection's pictures come through the image feed.
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/images?collectionId=18010391", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"prompt":"1girl, dream"`) {
		t.Fatalf("collection images: %d %s", rec.Code, rec.Body)
	}

	// The profile: picture from /me, cover from the user record when it says.
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/me", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("me: %d %s", rec.Code, rec.Body)
	}
	var me struct {
		Username string `json:"username"`
		Image    string `json:"image"`
		Cover    string `json:"cover"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &me)
	if me.Image != "https://image.civitai.com/a.jpeg" || me.Cover != civitaiCDN+"cover-uuid/width=1200/cover.jpeg" {
		t.Fatalf("me = %+v", me)
	}
	// Whatever shape the cover arrives in, only Civitai's own pictures are proxied.
	if civitaiCoverIn(map[string]any{"coverImage": "https://evil.example/x.jpeg"}) != "" {
		t.Fatal("a foreign cover URL got through")
	}
	if civitaiCoverIn(map[string]any{"cover": map[string]any{"url": "https://image.civitai.com/c.jpeg"}}) != "https://image.civitai.com/c.jpeg" {
		t.Fatal("a cover given as an object was missed")
	}
}
