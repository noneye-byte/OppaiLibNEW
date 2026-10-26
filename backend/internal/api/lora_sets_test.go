package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	pngenc "image/png"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/youruser/oppailib/internal/db"
)

func pngOf(t *testing.T, w, h int, shade uint8) []byte {
	t.Helper()
	var buf bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	img.Set(0, 0, color.RGBA{shade, 20, 20, 255})
	if err := pngenc.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func newSet(t *testing.T, s *Server, token, name string) trainSetOut {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train-sets", fmt.Sprintf(`{"name":%q}`, name))
	if rec.Code != http.StatusOK {
		t.Fatalf("create set: %d %s", rec.Code, rec.Body)
	}
	var set trainSetOut
	_ = json.Unmarshal(rec.Body.Bytes(), &set)
	return set
}

func uploadToSet(t *testing.T, s *Server, token string, setID int64, data []byte) (int64, int) {
	t.Helper()
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, multipartRequest(t, http.MethodPost, fmt.Sprintf("/api/imagegen/train-sets/%d/pictures", setID), token,
		nil, "pic.png", data))
	var out struct {
		ID int64 `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return out.ID, rec.Code
}

func TestAnUploadedPictureIsInTheSetWithATileAndNotInTheLibrary(t *testing.T) {
	s, token := newTestServer(t)
	set := newSet(t, s, token, "ink")
	id, code := uploadToSet(t, s, token, set.ID, pngOf(t, 900, 600, 1))
	if code != http.StatusCreated || id == 0 {
		t.Fatalf("upload: %d", code)
	}
	if _, code := uploadToSet(t, s, token, set.ID, pngOf(t, 900, 600, 1)); code != http.StatusOK {
		t.Fatalf("the same picture again is the one picture: %d", code)
	}
	if _, code := uploadToSet(t, s, token, set.ID, []byte("GIF89a not a still")); code != http.StatusBadRequest {
		t.Fatalf("a non-picture: %d", code)
	}
	if n, _ := s.db.CountMedia(context.Background(), db.MediaFilter{}); n != 0 {
		t.Fatalf("the library has %d items", n)
	}

	rec := do(t, s.Handler(), token, http.MethodGet, fmt.Sprintf("/api/imagegen/train-sets/%d/pictures/%d?thumb=1", set.ID, id), "")
	cfg, _, err := image.DecodeConfig(rec.Body)
	if rec.Code != http.StatusOK || err != nil || cfg.Width != trainThumbSide || cfg.Height != 213 {
		t.Fatalf("tile: %d %v %dx%d", rec.Code, err, cfg.Width, cfg.Height)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, fmt.Sprintf("/api/imagegen/train-sets/%d/pictures/%d", set.ID, id), "")
	if cfg, _, _ := image.DecodeConfig(rec.Body); cfg.Width != 900 {
		t.Fatalf("full picture is %d wide", cfg.Width)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, fmt.Sprintf("/api/imagegen/train-sets/%d/pictures/%d", set.ID+1, id), "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("a picture read through another set's id: %d", rec.Code)
	}
}

func TestASetsPicturesAreTaggedAndCaptionedInTheSet(t *testing.T) {
	s, token := newTestServer(t)
	ctx := context.Background()
	set := newSet(t, s, token, "ink")
	a, _ := uploadToSet(t, s, token, set.ID, pngOf(t, 8, 8, 1))
	b, _ := uploadToSet(t, s, token, set.ID, pngOf(t, 8, 8, 2))
	if err := s.db.SetTrainPictureTags(ctx, set.ID, a, []db.TrainTag{
		{Name: "blonde_hair", Category: "general", Source: "ai", Score: 0.9},
		{Name: "general", Category: "rating", Source: "ai", Score: 0.9},
	}); err != nil {
		t.Fatal(err)
	}
	rec := do(t, s.Handler(), token, http.MethodPatch, fmt.Sprintf("/api/imagegen/train-sets/%d/pictures/%d", set.ID, a),
		`{"addTags":["smile","Blonde hair"],"removeTags":[]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("edit: %d %s", rec.Code, rec.Body)
	}
	pic, _, _ := s.db.GetTrainPicture(ctx, set.ID, a)
	if len(pic.Tags) != 3 || pic.Tags[1].Name != "blonde hair" || pic.Tags[1].Source != "manual" {
		t.Fatalf("a typed tag over the tagger's becomes the typed one: %+v", pic.Tags)
	}

	rec = do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train/preview",
		fmt.Sprintf(`{"source":{"setId":%d,"exclude":[%d]},"trigger":"ohwx"}`, set.ID, 0))
	var p struct {
		Count    int                `json:"count"`
		Untagged int                `json:"untagged"`
		Items    []trainPreviewItem `json:"items"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &p)
	if p.Count != 2 || p.Untagged != 1 || p.Items[0].ID != a || p.Items[0].Caption != "ohwx, smile, blonde hair" || p.Items[1].ID != b {
		t.Fatalf("preview = %+v", p)
	}
	rec = do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train/preview",
		fmt.Sprintf(`{"source":{"setId":%d,"exclude":[%d]},"trigger":"ohwx"}`, set.ID, b))
	_ = json.Unmarshal(rec.Body.Bytes(), &p)
	if p.Count != 1 {
		t.Fatalf("a dropped picture is still trained on: %+v", p)
	}
}

func TestMovingALorasCollectionOutOfTheLibraryKeepsItsPicturesAndTags(t *testing.T) {
	s, token := newTestServer(t)
	ctx := context.Background()
	coll, _ := s.db.CreateCollection(ctx, "LoRA · ink")
	first := seedTaggedPicture(t, s, 1, "red_hair")
	second := seedTaggedPicture(t, s, 2)
	_, _ = s.db.AddToCollection(ctx, coll, []int64{first, second})
	row, _ := s.db.GetMedia(ctx, first)
	set := newSet(t, s, token, "ink")

	rec := do(t, s.Handler(), token, http.MethodPost, fmt.Sprintf("/api/imagegen/train-sets/%d/from-library", set.ID),
		fmt.Sprintf(`{"collectionId":%d,"move":true}`, coll))
	if rec.Code != http.StatusOK {
		t.Fatalf("move: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Added int         `json:"added"`
		Moved int         `json:"moved"`
		Set   trainSetOut `json:"set"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Added != 2 || out.Moved != 2 || out.Set.Count != 2 {
		t.Fatalf("moved = %+v", out)
	}
	if n, _ := s.db.CountMedia(ctx, db.MediaFilter{}); n != 0 {
		t.Fatalf("%d items are still in the library", n)
	}
	if c, _ := s.db.GetCollection(ctx, coll); c != nil {
		t.Errorf("the emptied collection is still there: %+v", c)
	}
	pics, _ := s.db.TrainPictures(ctx, set.ID)
	if len(pics) != 2 || pics[0].BlobPath != row.BlobPath || len(pics[0].Tags) != 1 || pics[0].Tags[0].Name != "red_hair" {
		t.Fatalf("pictures = %+v", pics)
	}
	rc, err := s.store.Open(pics[0].BlobPath)
	if err != nil {
		t.Fatal("the library's delete took the file the set now holds")
	}
	rc.Close()
}

func TestAFileInBothTheLibraryAndASetGoesOnlyWhenBothLetGo(t *testing.T) {
	s, token := newTestServer(t)
	ctx := context.Background()
	media := seedTaggedPicture(t, s, 7)
	row, _ := s.db.GetMedia(ctx, media)
	set := newSet(t, s, token, "ink")
	rec := do(t, s.Handler(), token, http.MethodPost, fmt.Sprintf("/api/imagegen/train-sets/%d/from-library", set.ID),
		fmt.Sprintf(`{"mediaIds":[%d]}`, media))
	if rec.Code != http.StatusOK {
		t.Fatalf("copy: %d %s", rec.Code, rec.Body)
	}
	exists := func() bool {
		rc, err := s.store.Open(row.BlobPath)
		if err != nil {
			return false
		}
		defer rc.Close()
		_, err = rc.Read(make([]byte, 1))
		return err == nil
	}
	rec = do(t, s.Handler(), token, http.MethodDelete, fmt.Sprintf("/api/media/%d", media), "")
	if rec.Code >= 300 || !exists() {
		t.Fatalf("deleting the library item (%d) took the set's file", rec.Code)
	}
	pics, _ := s.db.TrainPictures(ctx, set.ID)
	rec = do(t, s.Handler(), token, http.MethodDelete, fmt.Sprintf("/api/imagegen/train-sets/%d/pictures/%d", set.ID, pics[0].ID), "")
	if rec.Code != http.StatusNoContent || exists() {
		t.Fatalf("the last holder let go (%d) and the file stayed", rec.Code)
	}
}

func TestDeletingASetTakesItsPictures(t *testing.T) {
	s, token := newTestServer(t)
	set := newSet(t, s, token, "ink")
	if again := newSet(t, s, token, " INK "); again.ID != set.ID {
		t.Fatalf("a set by the same name was made twice: %d, %d", set.ID, again.ID)
	}
	id, _ := uploadToSet(t, s, token, set.ID, pngOf(t, 8, 8, 3))
	pic, _, _ := s.db.GetTrainPicture(context.Background(), set.ID, id)
	rec := do(t, s.Handler(), token, http.MethodDelete, fmt.Sprintf("/api/imagegen/train-sets/%d", set.ID), "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	if _, ok, _ := s.db.GetTrainSet(context.Background(), set.ID); ok {
		t.Fatal("the set is still there")
	}
	if held, _ := s.db.BlobInUse(context.Background(), pic.BlobPath); held {
		t.Fatal("a row still holds the deleted set's picture")
	}
	if rc, err := s.store.Open(pic.BlobPath); err == nil {
		_, err = rc.Read(make([]byte, 1))
		rc.Close()
		if err == nil {
			t.Fatal("the deleted set's file is still in the store")
		}
	}
}
