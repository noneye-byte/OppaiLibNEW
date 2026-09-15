package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// A fake InvokeAI with one installed model and an install queue whose job finishes
// on demand, recording what it is told about its models.
type fakeInvoke struct {
	mu          sync.Mutex
	jobDone     bool
	patched     map[string]any
	coverBytes  int
	coverKey    string
	description string
}

func newFakeInvoke(t *testing.T) (*fakeInvoke, *httptest.Server) {
	t.Helper()
	f := &fakeInvoke{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		defer f.mu.Unlock()
		switch {
		case r.URL.Path == "/api/v1/app/version":
			fmt.Fprint(w, `{"version":"5.0.0"}`)
		case r.URL.Path == "/api/v2/models/" && r.Method == http.MethodGet:
			fmt.Fprintf(w, `{"models":[
				{"key":"k-dream","hash":"blake3:771c807db56dbfc33feda5638d920f6c507db971da44772ee44a08dc38c3b437","name":"dreamshaper_8","base":"sd-1","type":"main","description":%q},
				{"key":"k-lora","hash":"blake3:aaaa","name":"some-lora","base":"sd-1","type":"lora"},
				{"key":"k-new","hash":"blake3:cafe","name":"fresh_model","base":"sdxl","type":"main"}]}`, f.description)
		case r.URL.Path == "/api/v2/models/install" && r.Method == http.MethodPost:
			fmt.Fprintf(w, `{"id":7,"status":"waiting","source":{"url":%q}}`, r.URL.Query().Get("source"))
		case r.URL.Path == "/api/v2/models/install" && r.Method == http.MethodGet:
			if f.jobDone {
				fmt.Fprint(w, `[{"id":7,"status":"completed","source":{"url":"https://civitai.com/api/download/models/999"},"config_out":{"key":"k-new"}}]`)
			} else {
				fmt.Fprint(w, `[{"id":7,"status":"downloading","source":{"url":"https://civitai.com/api/download/models/999"},"bytes":10,"total_bytes":100}]`)
			}
		case strings.HasSuffix(r.URL.Path, "/image") && r.Method == http.MethodPatch:
			body, _ := io.ReadAll(r.Body)
			f.coverBytes = len(body)
			f.coverKey = strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v2/models/i/"), "/image")
			fmt.Fprint(w, `{}`)
		case strings.HasPrefix(r.URL.Path, "/api/v2/models/i/") && r.Method == http.MethodPatch:
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			f.patched = body
			key := strings.TrimPrefix(r.URL.Path, "/api/v2/models/i/")
			fmt.Fprintf(w, `{"key":%q,"name":"fresh_model","type":"main","description":%q}`, key, body["description"])
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return f, srv
}

// A fake Civitai that knows one model with two versions and answers by hash.
func newFakeCivitai(t *testing.T) *httptest.Server {
	t.Helper()
	const model = `{"id":4384,"name":"DreamShaper","type":"Checkpoint","nsfw":false,
		"description":"<h1>DreamShaper</h1><p>A <b>versatile</b> model.<script>x()</script></p>",
		"tags":["base model","anime"],"creator":{"username":"Lykon","image":"https://image.civitai.com/a.jpeg"},
		"stats":{"downloadCount":10,"thumbsUpCount":2},
		"modelVersions":[
		 {"id":999,"name":"9","baseModel":"SD 1.5","trainedWords":["dream"],"downloadUrl":"https://civitai.com/api/download/models/999",
		  "description":"<p>newest</p>","publishedAt":"2024-01-01T00:00:00Z",
		  "images":[{"url":"https://image.civitai.com/new1.jpeg","type":"image","width":1,"height":1,"nsfwLevel":1},{"url":"https://evil.example/x.jpeg","type":"image"}],
		  "files":[{"name":"dreamshaper_9.safetensors","sizeKB":2048,"type":"Model","primary":true,"downloadUrl":"https://civitai.com/api/download/models/999","hashes":{"SHA256":"S9","BLAKE3":"BEEF"},"metadata":{"format":"SafeTensor","fp":"fp16"}}]},
		 {"id":128713,"name":"8","baseModel":"SD 1.5","trainedWords":[],"downloadUrl":"https://civitai.com/api/download/models/128713",
		  "images":[{"url":"https://image.civitai.com/old1.jpeg","type":"image"}],
		  "files":[{"name":"dreamshaper_8.safetensors","sizeKB":1024,"type":"Model","primary":true,"downloadUrl":"https://civitai.com/api/download/models/128713","hashes":{"SHA256":"S8","BLAKE3":"771C807DB56DBFC33FEDA5638D920F6C507DB971DA44772EE44A08DC38C3B437"}}]}
		]}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/models":
			fmt.Fprintf(w, `{"items":[%s],"metadata":{"nextCursor":"abc"}}`, model)
		case r.URL.Path == "/models/4384":
			fmt.Fprint(w, model)
		case r.URL.Path == "/model-versions/by-hash/771C807DB56DBFC33FEDA5638D920F6C507DB971DA44772EE44A08DC38C3B437":
			fmt.Fprint(w, `{"id":128713,"modelId":4384,"name":"8","baseModel":"SD 1.5","model":{"name":"DreamShaper","type":"Checkpoint"}}`)
		case strings.HasPrefix(r.URL.Path, "/model-versions/by-hash/"):
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, `{"error":"Model not found"}`)
		case strings.HasPrefix(r.URL.Path, "/images"):
			fmt.Fprint(w, `{"items":[{"id":1,"url":"https://image.civitai.com/g1.jpeg","width":512,"height":768,"nsfwLevel":"Soft","username":"jus98",
				"meta":{"prompt":"1girl, dream","negativePrompt":"bad","sampler":"Euler a","steps":"30","cfgScale":7,"seed":12345,"Model":"dreamshaper_8","Size":"512x768"}}],"metadata":{"nextCursor":"n2"}}`)
		case r.URL.Path == "/me":
			if r.Header.Get("Authorization") != "Bearer test-key" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			fmt.Fprint(w, `{"id":5,"username":"Lykon","image":"https://image.civitai.com/a.jpeg"}`)
		case r.URL.Path == "/preview.jpeg":
			w.Header().Set("Content-Type", "image/jpeg")
			_, _ = w.Write([]byte("jpegjpegjpeg"))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func civitaiTestServer(t *testing.T) (*Server, string, *fakeInvoke) {
	t.Helper()
	civ := newFakeCivitai(t)
	inv, invSrv := newFakeInvoke(t)
	s, token := newTestServer(t)
	set := s.settings.Get()
	set.CivitaiAPIURL = civ.URL
	set.CivitaiAPIKey = "test-key"
	set.ImageGenURL = invSrv.URL
	s.settings.Set(set)
	// Cover art is fetched from the image's own URL, which must be a Civitai host;
	// point the fetch at the fake instead of the internet.
	orig := civitaiHTTP.Transport
	civitaiHTTP.Transport = rewriteTransport{to: civ.URL}
	t.Cleanup(func() { civitaiHTTP.Transport = orig })
	return s, token, inv
}

// rewriteTransport sends every image.civitai.com request to the fake's /preview.jpeg.
type rewriteTransport struct{ to string }

func (rt rewriteTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	if strings.HasSuffix(r.URL.Host, "civitai.com") {
		u := strings.TrimPrefix(rt.to, "http://")
		r.URL.Scheme, r.URL.Host, r.URL.Path = "http", u, "/preview.jpeg"
	}
	return http.DefaultTransport.RoundTrip(r)
}

func TestCivitaiSearchMarksInstalledModelsByHash(t *testing.T) {
	s, token, _ := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/search?type=lora&base=SD+1.5&period=month&creator=Lykon&nsfw=0", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("search: %d %s", rec.Code, rec.Body)
	}
	var res struct {
		Items []civitaiModelOut `json:"items"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	if len(res.Items) != 1 || !res.Items[0].Installed {
		t.Fatalf("model should read as installed: %s", rec.Body)
	}
	v := res.Items[0].Versions
	if len(v) != 2 || v[0].Installed || !v[1].Installed || v[1].InstalledKey != "k-dream" {
		t.Fatalf("version install flags = %+v", v)
	}
	// A search page stays light: no description, no file list, only a few previews.
	if res.Items[0].Description != "" || v[0].Files != nil {
		t.Fatalf("search carried detail fields: %s", rec.Body)
	}
	if len(v[0].Images) != 1 {
		t.Fatalf("a preview on a foreign host survived: %v", v[0].Images)
	}
}

func TestCivitaiModelDetailIsSanitizedAndComplete(t *testing.T) {
	s, token, _ := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/models/4384", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("detail: %d %s", rec.Code, rec.Body)
	}
	var m civitaiModelOut
	_ = json.Unmarshal(rec.Body.Bytes(), &m)
	if m.Description != "<h1>DreamShaper</h1><p>A <b>versatile</b> model.</p>" {
		t.Fatalf("description = %q", m.Description)
	}
	if m.Creator != "Lykon" || m.CreatorImage == "" || len(m.Tags) != 2 {
		t.Fatalf("creator/tags: %+v", m)
	}
	f := m.Versions[0].Files
	if len(f) != 1 || f[0].BLAKE3 != "BEEF" || f[0].Format != "SafeTensor" || f[0].SizeMB != 2 {
		t.Fatalf("files = %+v", f)
	}
	if m.Versions[0].Description != "<p>newest</p>" || m.Versions[0].PublishedAt == "" {
		t.Fatalf("version detail = %+v", m.Versions[0])
	}
}

func TestCivitaiImagesCarryThePrompt(t *testing.T) {
	s, token, _ := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/images?versionId=999", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("images: %d %s", rec.Code, rec.Body)
	}
	var res struct {
		Items      []civitaiImageOut `json:"items"`
		NextCursor string            `json:"nextCursor"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	if len(res.Items) != 1 || res.NextCursor != "n2" {
		t.Fatalf("images = %s", rec.Body)
	}
	img := res.Items[0]
	if img.NSFWLevel != 2 || img.Prompt != "1girl, dream" || img.Steps != 30 || img.CfgScale != 7 || img.Seed != 12345 || img.Model != "dreamshaper_8" || img.Size != "512x768" {
		t.Fatalf("meta = %+v", img)
	}
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/images", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("images without a subject: %d", rec.Code)
	}
}

func TestCivitaiMeNeedsAKey(t *testing.T) {
	s, token, _ := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/me", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"username":"Lykon"`) {
		t.Fatalf("me: %d %s", rec.Code, rec.Body)
	}
	set := s.settings.Get()
	set.CivitaiAPIKey = ""
	s.settings.Set(set)
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/me", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("me without a key: %d %s", rec.Code, rec.Body)
	}
}

// The point of the change: a model installed from the browser is dressed once
// InvokeAI has it, and a model that was already there can be found by its hash.
func TestCivitaiInstallAppliesCoverDescriptionAndTriggerWords(t *testing.T) {
	s, token, inv := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/install",
		`{"url":"https://civitai.com/api/download/models/999","modelId":4384,"versionId":999}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("install: %d %s", rec.Code, rec.Body)
	}
	ctx := context.Background()
	if pending, _ := s.db.CivitaiInstalls(ctx); len(pending) != 1 || pending[0].VersionID != 999 {
		t.Fatalf("pending installs = %+v", pending)
	}
	// Still downloading: the promise waits.
	if n := s.civitaiApplyFinishedInstalls(ctx); n != 1 {
		t.Fatalf("waiting = %d, want 1", n)
	}
	inv.mu.Lock()
	inv.jobDone = true
	inv.mu.Unlock()
	if n := s.civitaiApplyFinishedInstalls(ctx); n != 0 {
		t.Fatalf("waiting after completion = %d, want 0", n)
	}
	inv.mu.Lock()
	defer inv.mu.Unlock()
	if inv.patched["description"] != "DreamShaper\n\nA versatile model." {
		t.Fatalf("description written = %q", inv.patched["description"])
	}
	if words, _ := inv.patched["trigger_phrases"].([]any); len(words) != 1 || words[0] != "dream" {
		t.Fatalf("trigger phrases written = %v", inv.patched["trigger_phrases"])
	}
	if inv.coverKey != "k-new" || inv.coverBytes == 0 {
		t.Fatalf("cover not applied: key=%q bytes=%d", inv.coverKey, inv.coverBytes)
	}
	link, ok, _ := s.db.CivitaiLink(ctx, "k-new")
	if !ok || link.ModelID != 4384 || link.VersionID != 999 || link.LatestVersionID != 999 || len(link.Previews) != 1 {
		t.Fatalf("link = %+v ok=%v", link, ok)
	}
	if pending, _ := s.db.CivitaiInstalls(ctx); len(pending) != 0 {
		t.Fatalf("promise not retired: %+v", pending)
	}
}

func TestCivitaiInstalledMatchesByHashAndNoticesUpdates(t *testing.T) {
	s, token, _ := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/installed", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("installed: %d %s", rec.Code, rec.Body)
	}
	var res struct {
		Models []civitaiInstalledOut `json:"models"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	byKey := map[string]civitaiInstalledOut{}
	for _, m := range res.Models {
		byKey[m.Key] = m
	}
	dream := byKey["k-dream"].Civitai
	if dream == nil || dream.ModelID != 4384 || dream.VersionID != 128713 || !dream.UpdateAvailable || dream.Creator != "Lykon" {
		t.Fatalf("dreamshaper link = %+v", dream)
	}
	if byKey["k-lora"].Civitai != nil {
		t.Fatalf("a hash the catalogue does not know should stay unlinked: %+v", byKey["k-lora"].Civitai)
	}
	// The negative answer is remembered, so the catalogue is not asked again.
	links, _ := s.db.CivitaiLinks(context.Background())
	if l, ok := links["k-lora"]; !ok || l.ModelID != 0 {
		t.Fatalf("negative lookup not recorded: %+v", links)
	}
}
