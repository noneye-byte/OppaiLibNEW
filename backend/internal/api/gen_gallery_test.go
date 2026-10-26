package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

// galleryA1111 is an Automatic1111 that draws real PNGs — the gallery decodes what it
// keeps — and remembers the last img2img picture it was handed.
type galleryA1111 struct {
	mu      sync.Mutex
	shade   uint8
	initPic string
	hold    chan struct{} // when set, txt2img waits for it
	asked   chan struct{} // closed once txt2img has been called, when set
}

func newGalleryA1111(t *testing.T, g *galleryA1111) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			_, _ = w.Write([]byte(`[{"title":"rev.safetensors [abc123]","model_name":"rev","hash":"abc123"}]`))
		case "/sdapi/v1/txt2img", "/sdapi/v1/img2img":
			var body struct {
				InitImages []string `json:"init_images"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			g.mu.Lock()
			if len(body.InitImages) > 0 {
				g.initPic = body.InitImages[0]
			}
			g.shade++
			pic := base64.StdEncoding.EncodeToString(pngOf(t, 64, 96, g.shade))
			hold, asked := g.hold, g.asked
			g.mu.Unlock()
			if asked != nil {
				close(asked)
			}
			if hold != nil {
				<-hold
			}
			_, _ = w.Write([]byte(`{"images":["` + pic + `"],"info":"{\"seed\":4242,\"all_seeds\":[4242]}"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

type galleryPageOut struct {
	Items []struct {
		Name   string `json:"name"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	} `json:"items"`
	Total int `json:"total"`
}

func galleryPage(t *testing.T, s *Server, token, board string) galleryPageOut {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/images?board="+board, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("gallery page %q: %d %s", board, rec.Code, rec.Body)
	}
	var page galleryPageOut
	_ = json.Unmarshal(rec.Body.Bytes(), &page)
	return page
}

type generateOut struct {
	Images []struct {
		ID      string `json:"id"`
		Seed    int64  `json:"seed"`
		Gallery string `json:"gallery"`
	} `json:"images"`
}

func generateOn(t *testing.T, s *Server, token, body string) generateOut {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/generate", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("generate: %d %s", rec.Code, rec.Body)
	}
	var out generateOut
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return out
}

func TestARunOnA1111IsKeptInTheGalleryAndNotTheLibrary(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, &galleryA1111{}).URL)

	out := generateOn(t, s, token, `{"prompt":"a red fox in snow","negativePrompt":"blurry","steps":12,"seed":-1}`)
	if len(out.Images) != 1 || out.Images[0].Gallery == "" {
		t.Fatalf("the run's picture was not kept: %+v", out)
	}
	if n, _ := s.db.CountMedia(context.Background(), db.MediaFilter{}); n != 0 {
		t.Fatalf("the library has %d items", n)
	}
	page := galleryPage(t, s, token, "none")
	if page.Total != 1 || page.Items[0].Name != out.Images[0].Gallery || page.Items[0].Width != 64 || page.Items[0].Height != 96 {
		t.Fatalf("Unsorted = %+v", page)
	}
	name := page.Items[0].Name

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/image/"+name+"/metadata", "")
	var meta genRecord
	_ = json.Unmarshal(rec.Body.Bytes(), &meta)
	if meta.Prompt != "a red fox in snow" || meta.NegativePrompt != "blurry" || meta.Seed != 4242 || meta.Steps != 12 || meta.Width != 64 {
		t.Fatalf("record = %d %+v", rec.Code, meta)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/image/"+name+"/thumb", "")
	if _, _, err := image.DecodeConfig(rec.Body); rec.Code != http.StatusOK || err != nil {
		t.Fatalf("tile: %d %v", rec.Code, err)
	}

	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/status", "")
	if !strings.Contains(rec.Body.String(), `"gallery":"oppailib"`) {
		t.Fatalf("status does not name this gallery: %s", rec.Body)
	}
}

func TestARunIsFiledIntoTheFolderOpenAndFoldersHandBackTheirPictures(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, &galleryA1111{}).URL)
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/imagegen/gallery/boards", `{"name":"Portraits"}`)
	var folder struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &folder)
	if rec.Code != http.StatusCreated || folder.ID == "" {
		t.Fatalf("create folder: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPost, "/api/imagegen/gallery/boards", `{"name":"portraits"}`)
	if !strings.Contains(rec.Body.String(), `"id":"`+folder.ID+`"`) {
		t.Fatalf("the same name again made a second folder: %s", rec.Body)
	}

	generateOn(t, s, token, fmt.Sprintf(`{"prompt":"a face","board":%q}`, folder.ID))
	loose := generateOn(t, s, token, `{"prompt":"a landscape","board":"all"}`)
	if got := galleryPage(t, s, token, folder.ID).Total; got != 1 {
		t.Fatalf("the folder holds %d", got)
	}
	if got := galleryPage(t, s, token, "all").Total; got != 2 {
		t.Fatalf("All pictures holds %d", got)
	}

	rec = do(t, h, token, http.MethodPost, "/api/imagegen/gallery/board", fmt.Sprintf(`{"board":%q,"names":[%q]}`, folder.ID, loose.Images[0].Gallery))
	if rec.Code != http.StatusOK || galleryPage(t, s, token, folder.ID).Total != 2 || galleryPage(t, s, token, "none").Total != 0 {
		t.Fatalf("move into the folder: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPatch, "/api/imagegen/gallery/boards/"+folder.ID, `{"name":"Faces"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("rename: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodGet, "/api/imagegen/gallery/boards", "")
	if !strings.Contains(rec.Body.String(), `"name":"Faces","count":2`) {
		t.Fatalf("boards = %s", rec.Body)
	}

	if rec := do(t, h, token, http.MethodDelete, "/api/imagegen/gallery/boards/"+folder.ID, ""); rec.Code != http.StatusOK {
		t.Fatalf("delete folder: %d %s", rec.Code, rec.Body)
	}
	if got := galleryPage(t, s, token, "none").Total; got != 2 {
		t.Fatalf("a deleted folder's pictures are not back in Unsorted: %d", got)
	}
}

func TestMovingAPictureToTheLibraryTakesItOutOfTheGallery(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, &galleryA1111{}).URL)
	ctx := context.Background()

	first := generateOn(t, s, token, `{"prompt":"masterpiece, a lighthouse at dusk"}`).Images[0].Gallery
	second := generateOn(t, s, token, `{"prompt":"a harbour"}`).Images[0].Gallery
	kept, _ := s.genImageNamed(ctx, first)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/gallery/save", fmt.Sprintf(`{"names":[%q,%q]}`, first, second))
	if rec.Code != http.StatusOK {
		t.Fatalf("move: %d %s", rec.Code, rec.Body)
	}
	if got := galleryPage(t, s, token, "all").Total; got != 0 {
		t.Fatalf("%d pictures are still in the gallery", got)
	}
	rows, err := s.db.ListMedia(ctx, "", 10, 0)
	if err != nil || len(rows) != 2 {
		t.Fatalf("library = %d rows, %v", len(rows), err)
	}
	var moved *db.MediaRow
	for _, r := range rows {
		if r.SHA256 == kept.SHA256 {
			moved = r
		}
	}
	if s.decrypt(moved.TitleEnc, "title") != "masterpiece, a lighthouse at dusk" || moved.BlobPath != kept.BlobPath {
		t.Fatalf("moved row: %q %s", s.decrypt(moved.TitleEnc, "title"), moved.BlobPath)
	}
	if held, _ := s.db.BlobInUse(ctx, kept.BlobPath); !held {
		t.Fatal("the picture's file is no longer held")
	}
	if rc, err := s.store.Open(kept.BlobPath); err != nil {
		t.Fatalf("the picture's file went with the gallery row: %v", err)
	} else {
		rc.Close()
	}
	if _, err := s.store.Open(kept.ThumbPath); err == nil {
		t.Fatal("the gallery's tile outlived its row")
	}
	rec = do(t, s.Handler(), token, http.MethodGet, fmt.Sprintf("/api/media/%d/generation", moved.ID), "")
	if !strings.Contains(rec.Body.String(), `"seed":4242`) {
		t.Fatalf("the generation record did not come along: %s", rec.Body)
	}
	tags, _ := s.db.TagsForMedia(ctx, moved.ID)
	if len(tags) == 0 || tags[0].Name != "ai-generated" {
		t.Fatalf("tags = %+v", tags)
	}
}

func TestSavingAPreviewMovesItsGalleryCopy(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, &galleryA1111{}).URL)

	out := generateOn(t, s, token, `{"prompt":"a cat"}`)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/save", fmt.Sprintf(`{"id":%q,"title":"Cat"}`, out.Images[0].ID))
	if rec.Code != http.StatusOK {
		t.Fatalf("save: %d %s", rec.Code, rec.Body)
	}
	if got := galleryPage(t, s, token, "all").Total; got != 0 {
		t.Fatalf("the saved picture is in the gallery too: %d", got)
	}
}

func TestAComparisonRunIsNotKept(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, &galleryA1111{}).URL)

	out := generateOn(t, s, token, `{"prompt":"a cat","noGallery":true}`)
	if len(out.Images) != 1 || out.Images[0].Gallery != "" || galleryPage(t, s, token, "all").Total != 0 {
		t.Fatalf("a comparison picture was kept: %+v", out)
	}
}

func TestARunStartedFromAGalleryPictureReadsItOnTheServer(t *testing.T) {
	fake := &galleryA1111{}
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, fake).URL)

	name := generateOn(t, s, token, `{"prompt":"a face"}`).Images[0].Gallery
	g, _ := s.genImageNamed(context.Background(), name)
	want, _ := s.genImageBytes(g, false)

	generateOn(t, s, token, fmt.Sprintf(`{"prompt":"a face","initGallery":%q,"denoise":0.4}`, name))
	fake.mu.Lock()
	got := fake.initPic
	fake.mu.Unlock()
	if got != base64.StdEncoding.EncodeToString(want) {
		t.Fatal("img2img was not handed the gallery picture")
	}
}

// A proxy that gives up on a long run closes the studio's request. The run goes on,
// is kept, and its last poll carries what the call would have answered.
func TestARunWhoseRequestIsDroppedFinishesAndLeavesItsResultOnTheJob(t *testing.T) {
	fake := &galleryA1111{hold: make(chan struct{}), asked: make(chan struct{})}
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, fake).URL)
	h := s.Handler()

	ctx, cancel := context.WithCancel(context.Background())
	req := httptest.NewRequest(http.MethodPost, "/api/imagegen/generate", strings.NewReader(`{"jobId":"run-drop1","prompt":"a long one"}`)).WithContext(ctx)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	returned := make(chan struct{})
	go func() {
		h.ServeHTTP(httptest.NewRecorder(), req)
		close(returned)
	}()
	<-fake.asked
	cancel()
	close(fake.hold)
	select {
	case <-returned:
	case <-time.After(5 * time.Second):
		t.Fatal("the generate request never returned")
	}

	rec := do(t, h, token, http.MethodGet, "/api/imagegen/progress/run-drop1?seen=0", "")
	var poll genProgressResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &poll)
	if !poll.Done || poll.Cancelled || poll.Result == nil || len(poll.Result.Images) != 1 || poll.Result.Images[0].Gallery == "" {
		t.Fatalf("poll = %d %s", rec.Code, rec.Body)
	}
	if got := galleryPage(t, s, token, "all").Total; got != 1 {
		t.Fatalf("the gallery holds %d", got)
	}
}
