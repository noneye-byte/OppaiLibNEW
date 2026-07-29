package api

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/ai"
	"github.com/youruser/oppailib/internal/models"
)

// Scraped imports used to start thumbnail work but never enqueue AI tagging.
// Exercise that public ingest path with the always-available heuristic tagger so
// adding another importer cannot silently regress automatic tagging again.
func TestScrapedImageImportEnqueuesAutoTagging(t *testing.T) {
	png, err := base64.StdEncoding.DecodeString(validChatPNG)
	if err != nil {
		t.Fatalf("decode fixture: %v", err)
	}
	asset := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(png)
	}))
	t.Cleanup(asset.Close)

	s, _ := newTestServer(t)
	s.ai.SetOptions(ai.Options{Enabled: true, AutoTag: true, MinScore: 0.35, MaxTags: 20})
	req := httptest.NewRequest(http.MethodPost, "/api/scrape/import", nil)
	id, err := s.importOne(req, asset.URL+"/image.png", &models.ScrapeResult{Title: "Imported image"}, "")
	if err != nil {
		t.Fatalf("import image: %v", err)
	}

	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		tags, err := s.db.TagsForMedia(req.Context(), id)
		if err != nil {
			t.Fatalf("read tags: %v", err)
		}
		for _, tag := range tags {
			if tag.Source == "ai" && tag.Name == "square" {
				return
			}
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("scraped image never received its automatic AI tags")
}
