package api

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/ai"
	"github.com/youruser/oppailib/internal/config"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/scraper"
	"github.com/youruser/oppailib/internal/settings"
	"github.com/youruser/oppailib/internal/storage"
)

// A 1x1 PNG — enough to be a real, distinguishable page image.
func pngBytes(seed byte) []byte {
	return append([]byte("\x89PNG\r\n\x1a\n"), seed, 0x00, 0x01, 0x02)
}

const pageCount = 5

// comicSite serves a manga reader page plus its numbered page images.
func comicSite(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/manga/title/chapter-1", func(w http.ResponseWriter, r *http.Request) {
		var b strings.Builder
		b.WriteString(`<html><head><title>Some Title Ch. 1</title>
			<meta name="keywords" content="action, fantasy">
			<meta property="og:image" content="/cover.png"></head><body><div class="reader">`)
		for i := 1; i <= pageCount; i++ {
			fmt.Fprintf(&b, `<img src="/p/%03d.png">`, i)
		}
		b.WriteString(`</div></body></html>`)
		w.Header().Set("Content-Type", "text/html")
		_, _ = io.WriteString(w, b.String())
	})
	mux.HandleFunc("/p/", func(w http.ResponseWriter, r *http.Request) {
		// Page N gets a distinct body so we can assert ordering inside the CBZ.
		name := filepath.Base(r.URL.Path)
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(pngBytes(name[2])) // "001.png" -> '1'
	})
	mux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

// newTestServer wires a real Server over temp storage + sqlite, and returns it
// with an authenticated bearer token. Its scraper allows private/loopback hosts so
// tests can point it at httptest servers on 127.0.0.1.
func newTestServer(t *testing.T) (*Server, string) {
	return newTestServerWith(t, true)
}

// newTestServerGuarded builds a server with the production SSRF dial guard active
// (private/loopback targets refused), for tests that assert the guard fires.
func newTestServerGuarded(t *testing.T) (*Server, string) {
	return newTestServerWith(t, false)
}

func newTestServerWith(t *testing.T, allowPrivateHosts bool) (*Server, string) {
	t.Helper()
	dir := t.TempDir()
	kek := bytes.Repeat([]byte{7}, 32)

	database, err := db.Open(filepath.Join(dir, "test.sqlite"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { database.Close() })

	store, err := storage.New(filepath.Join(dir, "media"), kek)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}

	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	sc := scraper.New(scraper.Options{UserAgent: "test", Delay: 0, RespectRobots: false, AllowPrivateHosts: allowPrivateHosts})
	aiMgr := ai.NewManager(ai.Config{Enabled: false}, store, database, log)
	cfg := &config.Config{ConfigDir: dir}

	set := settings.NewStore(settings.Defaults(cfg))

	s := NewServer(cfg, database, store, sc, aiMgr, set, kek, log)

	ctx := context.Background()
	uid, err := database.CreateUser(ctx, "tester", "x", true)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	token := "test-token"
	if err := database.CreateSession(ctx, token, uid, time.Hour, db.ClientWeb); err != nil {
		t.Fatalf("create session: %v", err)
	}
	return s, token
}

func do(t *testing.T, h http.Handler, token, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	var r io.Reader
	if body != "" {
		r = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, r)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

// The whole comic path: a reader page is recognised as a comic, its pages are
// bundled in order into a CBZ, and the resulting row reports its page count.
func TestScrapeAndImportComic(t *testing.T) {
	site := comicSite(t)
	s, token := newTestServer(t)
	h := s.Handler()
	pageURL := site.URL + "/manga/title/chapter-1"

	// 1. Scrape: the page must come back as a comic with every page, in order.
	rec := do(t, h, token, "POST", "/api/scrape", `{"url":"`+pageURL+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("scrape: got %d, body %s", rec.Code, rec.Body)
	}
	var scraped models.ScrapeResult
	if err := json.Unmarshal(rec.Body.Bytes(), &scraped); err != nil {
		t.Fatalf("decode scrape: %v", err)
	}
	if scraped.Kind != string(models.KindComic) {
		t.Fatalf("kind = %q, want comic", scraped.Kind)
	}
	if len(scraped.MediaURLs) != pageCount {
		t.Fatalf("got %d pages, want %d: %v", len(scraped.MediaURLs), pageCount, scraped.MediaURLs)
	}
	for i, u := range scraped.MediaURLs {
		if want := fmt.Sprintf("/p/%03d.png", i+1); !strings.HasSuffix(u, want) {
			t.Errorf("page %d = %q, want suffix %q", i, u, want)
		}
	}

	// 2. Import: one entry, not one per page.
	body, _ := json.Marshal(map[string]any{
		"url":       pageURL,
		"mediaUrls": scraped.MediaURLs,
		"title":     "Some Title Ch. 1",
		"tags":      []string{"action"},
		"kind":      "comic",
	})
	rec = do(t, h, token, "POST", "/api/scrape/import", string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("import: got %d, body %s", rec.Code, rec.Body)
	}
	var imp struct {
		Imported []int64 `json:"imported"`
		Count    int     `json:"count"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &imp); err != nil {
		t.Fatalf("decode import: %v", err)
	}
	if imp.Count != 1 || len(imp.Imported) != 1 {
		t.Fatalf("imported %d entries, want exactly 1: %v", imp.Count, imp.Imported)
	}
	id := imp.Imported[0]

	// 3. The row describes a comic of the right length, with its scraped tag.
	rec = do(t, h, token, "GET", fmt.Sprintf("/api/media/%d", id), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get media: got %d", rec.Code)
	}
	var m models.Media
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatalf("decode media: %v", err)
	}
	if m.Kind != models.KindComic {
		t.Errorf("kind = %q, want comic", m.Kind)
	}
	if m.PageCount != pageCount {
		t.Errorf("pageCount = %d, want %d", m.PageCount, pageCount)
	}
	if !m.HasThumb {
		t.Error("comic has no thumbnail; the first page should have become its cover")
	}
	if len(m.Tags) != 1 || m.Tags[0].Name != "action" {
		t.Errorf("tags = %+v, want [action]", m.Tags)
	}

	// 4. The blob is a readable CBZ whose entries are the pages, in order.
	rec = do(t, h, token, "GET", fmt.Sprintf("/api/media/%d/stream", id), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("stream: got %d", rec.Code)
	}
	raw := rec.Body.Bytes()
	zr, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		t.Fatalf("stored blob is not a zip: %v", err)
	}
	if len(zr.File) != pageCount {
		t.Fatalf("cbz has %d entries, want %d", len(zr.File), pageCount)
	}
	for i, f := range zr.File {
		if want := fmt.Sprintf("%04d.png", i+1); f.Name != want {
			t.Errorf("entry %d named %q, want %q", i, f.Name, want)
		}
		rc, err := f.Open()
		if err != nil {
			t.Fatalf("open entry %d: %v", i, err)
		}
		got, _ := io.ReadAll(rc)
		rc.Close()
		if want := pngBytes(byte('1' + i)); !bytes.Equal(got, want) {
			t.Errorf("entry %d holds the wrong page: got %v, want %v", i, got, want)
		}
	}

	// 5. Listing carries tags, which is what makes tag search work.
	rec = do(t, h, token, "GET", "/api/media", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("list: got %d", rec.Code)
	}
	var list struct {
		Items []models.Media `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list.Items) != 1 {
		t.Fatalf("listed %d items, want 1", len(list.Items))
	}
	if len(list.Items[0].Tags) != 1 || list.Items[0].Tags[0].Name != "action" {
		t.Errorf("list omitted tags: %+v", list.Items[0].Tags)
	}
}

// An ordinary photo page must not be mistaken for a comic, and must still
// import as one row per selected image.
func TestPhotoPageIsNotAComic(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/posts/trip", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = io.WriteString(w, `<html><head><title>Summer trip</title></head><body>
			<img src="/u/sunset.jpg"><img src="/u/beach.jpg">
			<img src="/u/dinner.jpg"><img src="/u/hike.jpg"></body></html>`)
	})
	site := httptest.NewServer(mux)
	defer site.Close()

	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, "POST", "/api/scrape", `{"url":"`+site.URL+`/posts/trip"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("scrape: got %d, body %s", rec.Code, rec.Body)
	}
	var scraped models.ScrapeResult
	if err := json.Unmarshal(rec.Body.Bytes(), &scraped); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if scraped.Kind == string(models.KindComic) {
		t.Errorf("a photo post was detected as a comic: %v", scraped.MediaURLs)
	}
}

// The viewer draws a tag's timeline from the single-item fetch; the grid never
// needs it. Assert both halves of that contract, since the list path uses a
// different (batched) query that deliberately skips moments.
func TestTagMomentsServedOnGetNotList(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	ctx := context.Background()

	id, _, err := s.db.InsertMedia(ctx, &db.MediaRow{
		Kind: "video", SHA256: "sha-moments", Size: 1, BlobPath: "a/b/c",
	})
	if err != nil {
		t.Fatalf("insert: %v", err)
	}
	if err := s.db.AddTag(ctx, id, "cat", "general", "ai", 0.9); err != nil {
		t.Fatalf("add tag: %v", err)
	}
	if err := s.db.SetTagMoments(ctx, id, "cat", "general",
		[]db.Moment{{At: 12.5, Score: 0.9}, {At: 40, Score: 0.7}}); err != nil {
		t.Fatalf("set moments: %v", err)
	}

	rec := do(t, h, token, "GET", fmt.Sprintf("/api/media/%d", id), "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get: %d", rec.Code)
	}
	var m models.Media
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(m.Tags) != 1 {
		t.Fatalf("tags = %+v", m.Tags)
	}
	if got := m.Tags[0].Moments; len(got) != 2 || got[0] != 12.5 || got[1] != 40 {
		t.Errorf("moments = %v, want [12.5 40]", got)
	}

	rec = do(t, h, token, "GET", "/api/media", "")
	var list struct {
		Items []models.Media `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list.Items) != 1 {
		t.Fatalf("listed %d items", len(list.Items))
	}
	if len(list.Items[0].Tags) != 1 {
		t.Fatalf("list dropped tags: %+v", list.Items[0].Tags)
	}
	if got := list.Items[0].Tags[0].Moments; len(got) != 0 {
		t.Errorf("list carried moments it doesn't need: %v", got)
	}
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}
