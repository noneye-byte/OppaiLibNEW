package api

import (
	"archive/zip"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

const maxBulkURLs = 50

// Different hosts can be downloaded in parallel while the scraper's per-host limiter
// still enforces the configured politeness delay. Keeping this small avoids turning a
// large paste into a disk/DB stampede on modest Unraid boxes.
const maxImportConcurrency = 4

// scrapeTimeout bounds a single preview fetch (robots + page, including the
// polite per-host wait). Because every URL in a bulk request is capped here and
// they run concurrently, the whole batch can't outlast this — a slow or dead
// host can't leave the UI stuck on "Fetching…". Large same-host batches at a
// high OPPAI_SCRAPE_DELAY_MS may hit this on the tail; lower the delay if so.
const scrapeTimeout = 30 * time.Second

// importTimeout bounds a whole import rather than a single fetch. A comic is dozens
// of page downloads with a politeness delay between each, so it is minutes of work,
// not seconds.
const importTimeout = 20 * time.Minute

// detachImport gives an import a context that outlives the client's connection.
//
// Every download in importComic runs on the request context, so a client that hangs
// up takes the import down with it — and a 32-page gallery reliably outlives a phone
// that gets backgrounded or a browser's own fetch timeout. That failed at page 29 of
// 32 with "context canceled" and threw the whole thing away, having already done all
// the work and hammered the origin for it. Once the request has been accepted the
// import is the server's job to finish; the client's connection only decides whether
// anyone is still listening for the result.
//
// WithoutCancel keeps the context's *values* (the authenticated user), and drops only
// the cancellation.
func detachImport(r *http.Request) (*http.Request, context.CancelFunc) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), importTimeout)
	return r.WithContext(ctx), cancel
}

type scrapeReq struct {
	URL string `json:"url"`
}

// handleScrape fetches a URL and returns extracted metadata + candidate media
// URLs without importing anything (a "preview" for the user to confirm).
func (s *Server) handleScrape(w http.ResponseWriter, r *http.Request) {
	var req scrapeReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.URL == "" {
		writeErr(w, http.StatusBadRequest, "missing url")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), scrapeTimeout)
	defer cancel()
	res, err := s.scraper.Scrape(ctx, req.URL)
	if err != nil {
		s.log.Warn("scrape failed", "url", req.URL, "err", err)
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	res.EnsureSlices()
	writeJSON(w, http.StatusOK, res)
}

type scrapeBulkReq struct {
	URLs []string `json:"urls"`
}

type scrapeBulkItem struct {
	URL    string               `json:"url"`
	Result *models.ScrapeResult `json:"result,omitempty"`
	Error  string               `json:"error,omitempty"`
}

// handleScrapeBulk previews several page URLs in one request. Each URL is
// fetched independently; a failure on one doesn't sink the others. The scraper
// engine still throttles per host, so this stays polite.
func (s *Server) handleScrapeBulk(w http.ResponseWriter, r *http.Request) {
	var req scrapeBulkReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	urls := dedupeNonEmpty(req.URLs)
	if len(urls) == 0 {
		writeErr(w, http.StatusBadRequest, "no urls")
		return
	}
	if len(urls) > maxBulkURLs {
		writeErr(w, http.StatusBadRequest, "too many urls")
		return
	}

	items := make([]scrapeBulkItem, len(urls))
	var wg sync.WaitGroup
	for i, u := range urls {
		wg.Add(1)
		go func(i int, u string) {
			defer wg.Done()
			items[i].URL = u
			ctx, cancel := context.WithTimeout(r.Context(), scrapeTimeout)
			defer cancel()
			res, err := s.scraper.Scrape(ctx, u)
			if err != nil {
				items[i].Error = err.Error()
				s.log.Warn("bulk scrape failed", "url", u, "err", err)
				return
			}
			res.EnsureSlices()
			items[i].Result = res
		}(i, u)
	}
	wg.Wait()
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// proxyMaxBytes caps a single proxied asset so a huge/hostile file can't exhaust
// server memory or bandwidth while previewing.
const proxyMaxBytes = 64 << 20

// handleScrapeProxy streams a remote asset through the polite scraper client so
// the import dialog can preview candidate media the browser can't load directly
// — most image hosts block hotlinking (they reject requests with no/foreign
// Referer). Routing previews through here means what the user sees is exactly
// what import will fetch. Auth-gated; http(s) only.
func (s *Server) handleScrapeProxy(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimSpace(r.URL.Query().Get("url"))
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		writeErr(w, http.StatusBadRequest, "bad url")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), scrapeTimeout)
	defer cancel()
	dl, err := s.scraper.Download(ctx, u.String())
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	defer dl.Body.Close()
	// The proxied body is attacker-influenced (it comes from whatever host the URL
	// named), so it must never be served as an active document on our origin — a
	// text/html response here would run script with the user's session. Constrain it
	// to safe media types; the global nosniff header stops content sniffing.
	w.Header().Set("Content-Type", safeInlineContentType(dl.ContentType))
	w.Header().Set("Cache-Control", "private, max-age=300")
	_, _ = io.Copy(w, io.LimitReader(dl.Body, proxyMaxBytes))
}

func dedupeNonEmpty(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, v := range in {
		v = strings.TrimSpace(v)
		if v == "" || seen[v] {
			continue
		}
		seen[v] = true
		out = append(out, v)
	}
	return out
}

type scrapeImportReq struct {
	URL       string   `json:"url"`
	MediaURLs []string `json:"mediaUrls"` // optional subset chosen by the user
	Title     string   `json:"title"`
	Tags      []string `json:"tags"`
	Kind      string   `json:"kind"` // "game" imports one enriched game entry
	// CategorizedTags is the preview scrape's structured tags, echoed back by the
	// client. The import doesn't re-fetch the page when the client already picked
	// its media URLs, so this round-trip is the only way the categories survive.
	// A client that doesn't send it still imports fine — its tags land as general,
	// which is what every client did before categories existed.
	CategorizedTags []models.ScrapedTag `json:"categorizedTags"`
}

// handleScrapeImport scrapes (or takes provided media URLs), downloads each
// asset into the encrypted store, and creates media rows + tags.
func (s *Server) handleScrapeImport(w http.ResponseWriter, r *http.Request) {
	var req scrapeImportReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Same reasoning as the source save: a multi-page import is minutes of downloads,
	// and a client that stops waiting must not undo all of it. See detachImport.
	r, cancel := detachImport(r)
	defer cancel()

	// Game import is a distinct flow: one enriched entry (cover art as thumbnail,
	// description, screenshots, download link) rather than one item per media URL.
	// It always (re)scrapes the source so it has the full game metadata.
	if req.Kind == string(models.KindGame) {
		if req.URL == "" {
			writeErr(w, http.StatusBadRequest, "game import needs a url")
			return
		}
		scraped, err := s.scraper.Scrape(r.Context(), req.URL)
		if err != nil {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		if req.Title != "" {
			scraped.Title = req.Title
		}
		scraped.Tags = append(scraped.Tags, req.Tags...)
		scraped.CategorizedTags = append(scraped.CategorizedTags, req.CategorizedTags...)
		id, err := s.importGame(r, scraped)
		if err != nil {
			s.log.Warn("import game failed", "url", req.URL, "err", err)
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"imported": []int64{id}, "count": 1})
		return
	}

	result := &models.ScrapeResult{
		Title:           req.Title,
		Tags:            req.Tags,
		CategorizedTags: req.CategorizedTags,
		MediaURLs:       req.MediaURLs,
		SourceURL:       req.URL,
	}
	if len(result.MediaURLs) == 0 && req.URL != "" {
		scraped, err := s.scraper.Scrape(r.Context(), req.URL)
		if err != nil {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		result = scraped
		if req.Title != "" {
			result.Title = req.Title
		}
		result.Tags = append(result.Tags, req.Tags...)
		result.CategorizedTags = append(result.CategorizedTags, req.CategorizedTags...)
	}
	// The dialog's type chip is the user's final word — it starts at whatever the
	// scraper detected, and overriding it there must reach the import.
	if req.Kind != "" {
		result.Kind = req.Kind
	}

	// A comic is one entry whose pages are bundled, not one entry per page.
	if result.Kind == string(models.KindComic) {
		id, err := s.importComic(r, result)
		if err != nil {
			s.log.Warn("import comic failed", "url", req.URL, "err", err)
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"imported": []int64{id}, "count": 1})
		return
	}

	ids := make([]int64, len(result.MediaURLs))
	sem := make(chan struct{}, maxImportConcurrency)
	var wg sync.WaitGroup
	for i, mu := range result.MediaURLs {
		wg.Add(1)
		go func(i int, mu string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			id, err := s.importOne(r, mu, result, req.Kind)
			if err != nil {
				s.log.Warn("import media failed", "url", mu, "err", err)
				return
			}
			ids[i] = id
		}(i, mu)
	}
	wg.Wait()
	imported := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id != 0 {
			imported = append(imported, id)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"imported": imported, "count": len(imported)})
}

// importOne stores one media URL as one library item.
//
// kindOverride, when set, is the user's explicit choice from the import dialog and
// is final. Otherwise the kind is read out of the downloaded bytes rather than
// taken from result.Kind: a parser's kind is a guess about the *page* (the generic
// one just says "image"), so a WebM linked from an ordinary page would be filed as
// a picture. The bytes are never wrong about this.
func (s *Server) importOne(r *http.Request, mediaURL string, result *models.ScrapeResult, kindOverride string) (int64, error) {
	dl, err := s.scraper.Download(r.Context(), mediaURL)
	if err != nil {
		return 0, err
	}
	defer dl.Body.Close()

	put, err := s.store.Put(dl.Body)
	if err != nil {
		return 0, err
	}

	title := result.Title
	if title == "" {
		title = dl.Filename
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(title), []byte("title"))
	var sourceEnc []byte
	if result.SourceURL != "" {
		sourceEnc, _ = crypto.SealBytes(s.kek, []byte(result.SourceURL), []byte("source"))
	}

	kind := kindOverride
	if kind == "" {
		kind = string(s.recognizeKind(put.RelPath, put.Size, dl.Filename))
	}
	id, existed, err := s.db.InsertMedia(r.Context(), &db.MediaRow{
		Kind:      kind,
		SHA256:    put.SHA256,
		Size:      put.Size,
		BlobPath:  put.RelPath,
		TitleEnc:  titleEnc,
		SourceEnc: sourceEnc,
	})
	if err != nil {
		return 0, err
	}
	if !existed {
		s.processIngestAsync(id, put.RelPath, kind, put.Size, 0)
	}
	s.applyScrapeTags(r, id, result)
	return id, nil
}

// applyScrapeTags persists everything the scrape learned about an item's tags,
// preserving the category each one came in under (artist, character, parody, …)
// rather than flattening the lot into "general". One failed tag doesn't abort
// the import — a half-tagged item still beats no item.
func (s *Server) applyScrapeTags(r *http.Request, id int64, result *models.ScrapeResult) {
	for _, t := range result.ImportTags() {
		if err := s.db.AddTag(r.Context(), id, t.Name, t.Category, "scrape", 0); err != nil {
			s.log.Warn("add scraped tag", "tag", t.Name, "category", t.Category, "err", err)
		}
	}
}

const (
	// maxComicPages caps a single comic import. Deep enough for a long chapter,
	// shallow enough that a misdetected image-heavy page can't fetch forever.
	maxComicPages = 500
	// maxComicPageBytes bounds one page image inside the archive.
	maxComicPageBytes = 32 << 20
	// maxCoverBytes bounds the first page held in memory to serve as the cover.
	maxCoverBytes = 16 << 20
)

// importComic creates a single comic entry from an ordered run of page images by
// downloading them in order and bundling them into a CBZ (a zip of images, named
// so any reader sorts them correctly) stored as one encrypted blob. The first
// page is kept as the thumbnail, mirroring how importGame uses its cover art.
//
// A single asset needs no assembly: it is either an already-bundled comic (.cbz,
// .pdf — the direct-media fast path in the scraper produces these) or one stray
// image. Both store as themselves.
//
// Unlike a gallery import, a failed page is fatal. A comic missing page 7 reads
// as corrupt, and silently importing it would hide that from the user.
func (s *Server) importComic(r *http.Request, result *models.ScrapeResult) (int64, error) {
	pages := result.MediaURLs
	if len(pages) == 0 {
		return 0, fmt.Errorf("no pages found on that page")
	}
	if len(pages) == 1 {
		// One page is not a comic, whatever the dialog said — and storing a bare JPEG
		// under kind=comic leaves the reader trying to open it as an archive. Let the
		// bytes decide, which files it as the image it is.
		return s.importOne(r, pages[0], result, "")
	}
	if len(pages) > maxComicPages {
		return 0, fmt.Errorf("too many pages (%d, max %d)", len(pages), maxComicPages)
	}

	tmp, err := os.CreateTemp("", "oppai-cbz-*.zip")
	if err != nil {
		return 0, err
	}
	tmpPath := tmp.Name()
	defer func() {
		tmp.Close()
		os.Remove(tmpPath)
	}()

	cover, err := s.writeCBZ(r, tmp, pages)
	if err != nil {
		return 0, err
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		return 0, err
	}

	put, err := s.store.Put(tmp)
	if err != nil {
		return 0, err
	}

	title := result.Title
	if title == "" {
		title = "Comic"
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(title), []byte("title"))

	row := &db.MediaRow{
		Kind:      string(models.KindComic),
		SHA256:    put.SHA256,
		Size:      put.Size,
		BlobPath:  put.RelPath,
		TitleEnc:  titleEnc,
		PageCount: sql.NullInt64{Int64: int64(len(pages)), Valid: true},
	}
	if result.Description != "" {
		row.NotesEnc, _ = crypto.SealBytes(s.kek, []byte(result.Description), []byte("notes"))
	}
	if result.SourceURL != "" {
		row.SourceEnc, _ = crypto.SealBytes(s.kek, []byte(result.SourceURL), []byte("source"))
	}

	id, existed, err := s.db.InsertMedia(r.Context(), row)
	if err != nil {
		return 0, err
	}
	if !existed && len(cover) > 0 {
		if coverPut, err := s.store.Put(bytes.NewReader(cover)); err != nil {
			s.log.Warn("comic cover store", "media", id, "err", err)
		} else if err := s.db.SetThumbPath(r.Context(), id, coverPut.RelPath); err != nil {
			s.log.Warn("comic cover thumb", "media", id, "err", err)
		}
	}
	s.applyScrapeTags(r, id, result)
	return id, nil
}

// writeCBZ downloads each page in order into a zip written to w, returning the
// first page's bytes for use as the cover. Entries are numbered so a reader's
// filename sort reproduces reading order, and stored uncompressed — JPEG and PNG
// pages are already compressed, so deflating them only burns CPU.
func (s *Server) writeCBZ(r *http.Request, w io.Writer, pages []string) (cover []byte, err error) {
	zw := zip.NewWriter(w)
	for i, pageURL := range pages {
		dl, err := s.scraper.Download(r.Context(), pageURL)
		if err != nil {
			return nil, fmt.Errorf("page %d of %d: %w", i+1, len(pages), err)
		}
		ext := strings.ToLower(filepath.Ext(dl.Filename))
		if ext == "" {
			ext = ".jpg"
		}
		entry, err := zw.CreateHeader(&zip.FileHeader{
			Name:   fmt.Sprintf("%04d%s", i+1, ext),
			Method: zip.Store,
		})
		if err != nil {
			dl.Body.Close()
			return nil, err
		}

		// Read one byte past the cap: a page that reaches it was being silently cut in
		// half, and half a JPEG in the archive is a corrupt page the reader will choke
		// on. Better to fail the import loudly than to quietly produce a broken comic.
		var src io.Reader = io.LimitReader(dl.Body, maxComicPageBytes+1)
		var coverBuf bytes.Buffer
		if i == 0 {
			src = io.TeeReader(src, &capWriter{w: &coverBuf, remaining: maxCoverBytes})
		}
		written, copyErr := io.Copy(entry, src)
		dl.Body.Close()
		if copyErr != nil {
			return nil, fmt.Errorf("page %d of %d: %w", i+1, len(pages), copyErr)
		}
		if written > maxComicPageBytes {
			return nil, fmt.Errorf("page %d of %d: larger than the %d MB per-page limit",
				i+1, len(pages), maxComicPageBytes>>20)
		}
		if i == 0 && coverBuf.Len() < maxCoverBytes {
			// A buffer that reached the cap was cut mid-image; half a JPEG is a worse
			// thumbnail than none, so leave the comic to its gradient swatch instead.
			cover = coverBuf.Bytes()
		}
	}
	return cover, zw.Close()
}

// capWriter keeps the first n bytes and silently drops the rest, reporting every
// write as fully consumed. io.TeeReader treats a short write as ErrShortWrite and
// would abort the copy, so an oversized first page must cost us the cover — not
// the whole import.
type capWriter struct {
	w         io.Writer
	remaining int
}

func (c *capWriter) Write(p []byte) (int, error) {
	if c.remaining <= 0 {
		return len(p), nil
	}
	chunk := p
	if len(chunk) > c.remaining {
		chunk = chunk[:c.remaining]
	}
	n, err := c.w.Write(chunk)
	c.remaining -= n
	if err != nil {
		return n, err
	}
	return len(p), nil
}

// importGame creates a single game entry from a scraped page: the cover image is
// downloaded and stored as the blob (and set as the thumbnail so tiles show cover
// art), with the description, source, download link and screenshot gallery saved
// as encrypted metadata. itch (and other) game pages gate the actual binary, so
// the download link points the user at where to get it rather than fetching it.
func (s *Server) importGame(r *http.Request, result *models.ScrapeResult) (int64, error) {
	cover := firstNonEmptyStr(result.Cover, firstOf(result.MediaURLs), firstOf(result.Screenshots))
	if cover == "" {
		return 0, fmt.Errorf("no cover image found on that page")
	}

	dl, err := s.scraper.Download(r.Context(), cover)
	if err != nil {
		return 0, fmt.Errorf("fetch cover: %w", err)
	}
	defer dl.Body.Close()
	put, err := s.store.Put(dl.Body)
	if err != nil {
		return 0, err
	}

	title := result.Title
	if title == "" {
		title = dl.Filename
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(title), []byte("title"))

	row := &db.MediaRow{
		Kind:     string(models.KindGame),
		SHA256:   put.SHA256,
		Size:     put.Size,
		BlobPath: put.RelPath,
		TitleEnc: titleEnc,
	}
	if result.Description != "" {
		row.NotesEnc, _ = crypto.SealBytes(s.kek, []byte(result.Description), []byte("notes"))
	}
	if result.SourceURL != "" {
		row.SourceEnc, _ = crypto.SealBytes(s.kek, []byte(result.SourceURL), []byte("source"))
	}
	downloadURL := firstNonEmptyStr(result.DownloadURL, result.SourceURL)
	if downloadURL != "" {
		row.DownloadEnc, _ = crypto.SealBytes(s.kek, []byte(downloadURL), []byte("download"))
	}
	if len(result.Screenshots) > 0 {
		if b, err := json.Marshal(result.Screenshots); err == nil {
			row.GalleryEnc, _ = crypto.SealBytes(s.kek, b, []byte("gallery"))
		}
	}

	id, existed, err := s.db.InsertMedia(r.Context(), row)
	if err != nil {
		return 0, err
	}
	if !existed {
		// The cover doubles as the game's thumbnail.
		if err := s.db.SetThumbPath(r.Context(), id, put.RelPath); err != nil {
			s.log.Warn("game cover thumb", "media", id, "err", err)
		}
	}
	s.applyScrapeTags(r, id, result)
	return id, nil
}

func firstNonEmptyStr(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func firstOf(s []string) string {
	if len(s) > 0 {
		return s[0]
	}
	return ""
}

func kindOrDefault(kind string, def models.MediaKind) string {
	if kind != "" {
		return kind
	}
	return string(def)
}
