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
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
)

// A fake vision endpoint that records what it was shown and answers with prose.
func newFakeVision(t *testing.T, answer string) (*httptest.Server, *int) {
	t.Helper()
	frames := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Messages []struct {
				Content []map[string]any `json:"content"`
			} `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		for _, part := range body.Messages[0].Content {
			if part["type"] == "image_url" {
				frames++
			}
		}
		fmt.Fprintf(w, `{"choices":[{"message":{"content":%q}}]}`, answer)
	}))
	t.Cleanup(srv.Close)
	return srv, &frames
}

// seedPicture stores a real one-pixel PNG so the describer has bytes to sample.
func seedPicture(t *testing.T, s *Server, title string) int64 {
	t.Helper()
	var png bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	img.Set(1, 1, color.RGBA{200, 30, 30, 255})
	_ = pngenc.Encode(&png, img)
	res, err := s.store.Put(bytes.NewReader(png.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(title), []byte("title"))
	id, _, err := s.db.InsertMedia(context.Background(), &db.MediaRow{
		Kind: "image", SHA256: res.SHA256, Size: res.Size, BlobPath: res.RelPath, TitleEnc: titleEnc,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.db.AddTag(context.Background(), id, "red dress", "general", "ai", 0.9); err != nil {
		t.Fatal(err)
	}
	s.touchLibraryIndex()
	return id
}

func TestDescribeStoresProseEncryptedAndMakesItSearchable(t *testing.T) {
	vis, frames := newFakeVision(t, "A woman in a red dress leans on a balcony rail at sunset.")
	s, token := newTestServer(t)
	set := s.settings.Get()
	set.VisionURL = vis.URL
	set.VisionModel = "llava"
	s.settings.Set(set)
	id := seedPicture(t, s, "IMG_0042")

	rec := do(t, s.Handler(), token, http.MethodPost, fmt.Sprintf("/api/media/%d/describe", id), "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "balcony rail") {
		t.Fatalf("describe: %d %s", rec.Code, rec.Body)
	}
	if *frames != 1 {
		t.Fatalf("a still should be shown once, got %d frames", *frames)
	}
	// Ciphertext on disk, prose on the wire.
	blob, _ := s.db.Description(context.Background(), id)
	if len(blob) == 0 || bytes.Contains(blob, []byte("balcony")) {
		t.Fatalf("description stored in the clear or not at all: %q", blob)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, fmt.Sprintf("/api/media/%d", id), "")
	if !strings.Contains(rec.Body.String(), `"description":"A woman in a red dress`) {
		t.Fatalf("item without its description: %s", rec.Body)
	}
	// The search index files the prose beside the title and notes.
	if items, total := listMedia(t, s, token, "q=balcony+sunset"); total != 1 || len(items) != 1 || items[0].ID != id {
		t.Fatalf("search by description returned %v (total %d)", titlesOf(items), total)
	}
	// Editing by hand goes through the same field, and clearing it clears it.
	rec = do(t, s.Handler(), token, http.MethodPatch, fmt.Sprintf("/api/media/%d", id), `{"description":"Just a balcony."}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body)
	}
	if got := s.mediaDescription(context.Background(), id); got != "Just a balcony." {
		t.Fatalf("edited description = %q", got)
	}
	rec = do(t, s.Handler(), token, http.MethodPatch, fmt.Sprintf("/api/media/%d", id), `{"description":""}`)
	if rec.Code != http.StatusOK || s.mediaDescription(context.Background(), id) != "" {
		t.Fatalf("clearing: %d %q", rec.Code, s.mediaDescription(context.Background(), id))
	}
	if n, _ := s.db.CountUndescribed(context.Background()); n != 1 {
		t.Fatalf("undescribed after clearing = %d, want 1", n)
	}
}

func TestDescribeRefusesWithoutAModelAndForNonPictures(t *testing.T) {
	s, token := newTestServer(t)
	id := seedPicture(t, s, "IMG_0001")
	rec := do(t, s.Handler(), token, http.MethodPost, fmt.Sprintf("/api/media/%d/describe", id), "")
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("describe without a model: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/ai/describe", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"enabled":false`) || !strings.Contains(rec.Body.String(), `"undescribed":1`) {
		t.Fatalf("status: %d %s", rec.Code, rec.Body)
	}
	comic := seedFull(t, s, seedRow{title: "A Comic", kind: "comic", at: 1})
	vis, _ := newFakeVision(t, "x")
	set := s.settings.Get()
	set.VisionURL = vis.URL
	s.settings.Set(set)
	rec = do(t, s.Handler(), token, http.MethodPost, fmt.Sprintf("/api/media/%d/describe", comic), "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("describe a comic: %d %s", rec.Code, rec.Body)
	}
}
