package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	pngenc "image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

// A fake trainer: jobs are created, filled and started as the real one's are, and a
// test moves them on by setting their state.
type fakeTrainer struct {
	mu       sync.Mutex
	cfg      map[string]any
	files    map[string][]byte
	job      map[string]any
	deleted  bool
	baseSeen string
}

func newFakeTrainer(t *testing.T) (*fakeTrainer, *httptest.Server) {
	t.Helper()
	f := &fakeTrainer{files: map[string][]byte{}}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		f.mu.Lock()
		defer f.mu.Unlock()
		switch {
		case r.URL.Path == "/health":
			fmt.Fprint(w, `{"ok":true,"version":"1","gpu":"Fake GPU","vramMB":24576}`)
		case r.URL.Path == "/bases":
			f.baseSeen = r.URL.Query().Get("key") + "|" + r.URL.Query().Get("size")
			fmt.Fprint(w, `{"present":true,"where":"mount"}`)
		case r.URL.Path == "/jobs" && r.Method == http.MethodPost:
			_ = json.NewDecoder(r.Body).Decode(&f.cfg)
			f.job = map[string]any{"id": "job-1", "name": f.cfg["name"], "state": "receiving"}
			_ = json.NewEncoder(w).Encode(f.job)
		case strings.HasPrefix(r.URL.Path, "/jobs/job-1/files/") && r.Method == http.MethodPut:
			data, _ := io.ReadAll(r.Body)
			f.files[strings.TrimPrefix(r.URL.Path, "/jobs/job-1/files/")] = data
			w.WriteHeader(http.StatusNoContent)
		case r.URL.Path == "/jobs/job-1/start":
			f.job["state"] = "queued"
			_ = json.NewEncoder(w).Encode(f.job)
		case r.URL.Path == "/jobs" && r.Method == http.MethodGet:
			jobs := []any{}
			if f.job != nil && !f.deleted {
				jobs = append(jobs, f.job)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"jobs": jobs})
		case r.URL.Path == "/jobs/job-1" && r.Method == http.MethodGet:
			_ = json.NewEncoder(w).Encode(f.job)
		case r.URL.Path == "/jobs/job-1" && r.Method == http.MethodDelete:
			f.deleted = true
			w.WriteHeader(http.StatusNoContent)
		case strings.HasPrefix(r.URL.Path, "/jobs/job-1/samples/"):
			w.Header().Set("Content-Type", "image/png")
			_, _ = w.Write([]byte("\x89PNG sample"))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return f, srv
}

func (f *fakeTrainer) set(fields map[string]any) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for k, v := range fields {
		f.job[k] = v
	}
}

// A fake InvokeAI with one checkpoint and one LoRA, whose install queue finishes on
// demand, recording what it is told.
type fakeTrainInvoke struct {
	mu          sync.Mutex
	source      string
	installDone bool
	patched     map[string]any
	cover       int
	emptied     int
}

func newFakeTrainInvoke(t *testing.T) (*fakeTrainInvoke, *httptest.Server) {
	t.Helper()
	f := &fakeTrainInvoke{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		defer f.mu.Unlock()
		switch {
		case r.URL.Path == "/api/v1/app/version":
			fmt.Fprint(w, `{"version":"5.0.0"}`)
		case r.URL.Path == "/api/v2/models/" && r.Method == http.MethodGet:
			// Once installed, the new LoRA is listed like any other.
			trained := ""
			if f.installDone {
				trained = `,{"key":"k-trained","name":"ink_2","type":"lora","base":"sdxl"}`
			}
			fmt.Fprintf(w, `{"models":[
				{"key":"k-base","name":"pony","type":"main","base":"sdxl","path":"sdxl/main/pony.safetensors","file_size":1234},
				{"key":"k-ink","name":"ink","type":"lora","base":"sdxl"}%s]}`, trained)
		case r.URL.Path == "/api/v2/models/install" && r.Method == http.MethodPost:
			f.source = r.URL.Query().Get("source")
			fmt.Fprintf(w, `{"id":9,"status":"waiting","source":{"url":%q}}`, f.source)
		case r.URL.Path == "/api/v2/models/install" && r.Method == http.MethodGet:
			status := "downloading"
			if f.installDone {
				status = "completed"
			}
			out, _ := json.Marshal([]any{map[string]any{"id": 9, "status": status, "source": map[string]any{"url": f.source}, "config_out": map[string]any{"key": "k-trained"}}})
			_, _ = w.Write(out)
		case r.URL.Path == "/api/v2/models/empty_model_cache":
			f.emptied++
			fmt.Fprint(w, `{}`)
		case r.URL.Path == "/api/v2/models/i/k-trained/image":
			body, _ := io.ReadAll(r.Body)
			f.cover = len(body)
			fmt.Fprint(w, `{}`)
		case r.URL.Path == "/api/v2/models/i/k-trained" && r.Method == http.MethodPatch:
			_ = json.NewDecoder(r.Body).Decode(&f.patched)
			fmt.Fprint(w, `{"key":"k-trained","name":"ink","type":"lora"}`)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return f, srv
}

// seedTaggedPicture stores a small PNG of its own (the shade keeps it from being
// deduplicated into another) with tags.
func seedTaggedPicture(t *testing.T, s *Server, shade uint8, tags ...string) int64 {
	t.Helper()
	var buf bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	img.Set(2, 2, color.RGBA{shade, 10, 10, 255})
	_ = pngenc.Encode(&buf, img)
	res, err := s.store.Put(bytes.NewReader(buf.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	id, _, err := s.db.InsertMedia(context.Background(), &db.MediaRow{Kind: "image", SHA256: res.SHA256, Size: res.Size, BlobPath: res.RelPath})
	if err != nil {
		t.Fatal(err)
	}
	for i, tag := range tags {
		if err := s.db.AddTag(context.Background(), id, tag, "general", "ai", 0.9-float64(i)/10); err != nil {
			t.Fatal(err)
		}
	}
	return id
}

func TestALoraTrainsFromACollectionAndInstallsItself(t *testing.T) {
	tr, trSrv := newFakeTrainer(t)
	inv, invSrv := newFakeTrainInvoke(t)
	s, token := newTestServer(t)
	set := s.settings.Get()
	set.ImageGenURL, set.TrainerURL, set.TrainerToken = invSrv.URL, trSrv.URL, "tok"
	s.settings.Set(set)
	ctx := context.Background()

	coll, err := s.db.CreateCollection(ctx, "her")
	if err != nil {
		t.Fatal(err)
	}
	ids := []int64{
		seedTaggedPicture(t, s, 1, "blonde_hair", "smile", "beach"),
		seedTaggedPicture(t, s, 2, "blonde_hair", "smile"),
		seedTaggedPicture(t, s, 3, "blonde_hair", "night"),
	}
	if _, err := s.db.AddToCollection(ctx, coll, ids); err != nil {
		t.Fatal(err)
	}

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train/preview",
		fmt.Sprintf(`{"source":{"collectionId":%d},"trigger":"ohwx"}`, coll))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"count":3`) ||
		!strings.Contains(rec.Body.String(), `{"name":"blonde hair","count":3}`) {
		t.Fatalf("preview: %d %s", rec.Code, rec.Body)
	}

	rec = do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train", fmt.Sprintf(
		`{"name":"ink","trigger":"ohwx","base":"k-base","source":{"collectionId":%d},"leaveOut":["blonde hair"],"freeGpu":true,"samples":true}`, coll))
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"status":"preparing"`) {
		t.Fatalf("start: %d %s", rec.Code, rec.Body)
	}
	var started trainingOut
	_ = json.Unmarshal(rec.Body.Bytes(), &started)
	row := waitTraining(t, s, started.ID, "queued")
	if row.TrainerJob != "job-1" || row.Images != 3 {
		t.Fatalf("queued row = %+v", row)
	}

	tr.mu.Lock()
	if tr.baseSeen != "sdxl/main/pony.safetensors|1234" {
		t.Errorf("asked for base %q", tr.baseSeen)
	}
	if tr.cfg["name"] != "ink" || tr.cfg["repeats"] != float64(loraRepeats(3)) {
		t.Errorf("job.json = %v", tr.cfg)
	}
	samples, _ := tr.cfg["samples"].([]any)
	if len(samples) != 1 || !strings.HasPrefix(samples[0].(map[string]any)["prompt"].(string), "ohwx, smile") {
		t.Errorf("samples = %v", tr.cfg["samples"])
	}
	if len(tr.files) != 6 {
		t.Errorf("sent %d files, want 3 pictures and 3 captions", len(tr.files))
	}
	for name, data := range tr.files {
		if strings.HasSuffix(name, ".txt") {
			if c := string(data); !strings.HasPrefix(c, "ohwx") || strings.Contains(c, "blonde") {
				t.Errorf("caption %s = %q", name, c)
			}
		}
	}
	tr.mu.Unlock()

	// It starts on the GPU: the generator is asked to let go.
	tr.set(map[string]any{"state": "running", "step": 10, "total": 100})
	s.trainStep(ctx)
	row, _, _ = s.db.GetLoraTraining(ctx, started.ID)
	if row.Status != "training" || !row.FreedGPU {
		t.Fatalf("running row = %+v", row)
	}
	if inv.emptied != 1 {
		t.Errorf("model cache emptied %d times", inv.emptied)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/train", "")
	if !strings.Contains(rec.Body.String(), `"step":10`) || !strings.Contains(rec.Body.String(), `"gpu":"Fake GPU"`) {
		t.Fatalf("list while training: %s", rec.Body)
	}

	// It finishes: the generator installs it from the trainer.
	tr.set(map[string]any{"state": "done", "output": "ink.safetensors", "download": "dl1", "samples": []string{"ink_e10.png"}, "family": "sdxl"})
	s.trainStep(ctx)
	row, _, _ = s.db.GetLoraTraining(ctx, started.ID)
	if row.Status != "installing" || row.FreedGPU {
		t.Fatalf("installing row = %+v", row)
	}
	if want := trSrv.URL + "/jobs/job-1/output/ink.safetensors?dl=dl1"; inv.source != want {
		t.Fatalf("installed from %q, want %q", inv.source, want)
	}

	inv.mu.Lock()
	inv.installDone = true
	inv.mu.Unlock()
	s.trainStep(ctx)
	row, _, _ = s.db.GetLoraTraining(ctx, started.ID)
	if row.Status != "done" || row.ModelKey != "k-trained" || row.FinishedAt == 0 {
		t.Fatalf("done row = %+v", row)
	}
	inv.mu.Lock()
	words, _ := inv.patched["trigger_phrases"].([]any)
	if len(words) != 1 || words[0] != "ohwx" || inv.cover == 0 {
		t.Errorf("dressed with %v, cover %d bytes", inv.patched, inv.cover)
	}
	inv.mu.Unlock()
	tr.mu.Lock()
	if !tr.deleted {
		t.Error("the trainer's copy was kept after the install")
	}
	tr.mu.Unlock()
}

func TestARunThatLostItsSenderToARestartIsFailedNotLeftSpinning(t *testing.T) {
	s, _ := newTestServer(t)
	ctx := context.Background()
	row, err := s.db.InsertLoraTraining(ctx, db.LoraTraining{Name: "x", BaseModel: "b", Status: "preparing", Settings: "{}"})
	if err != nil {
		t.Fatal(err)
	}
	s.trainStep(ctx)
	row, _, _ = s.db.GetLoraTraining(ctx, row.ID)
	if row.Status != "failed" || !strings.Contains(row.Error, "restarted") {
		t.Fatalf("row = %+v", row)
	}
}

func TestTrainingNeedsATrainer(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train", `{"name":"x","base":"b","source":{"tag":"t"}}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("start without a trainer: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/train", "")
	if !strings.Contains(rec.Body.String(), `"configured":false`) {
		t.Fatalf("list: %s", rec.Body)
	}
}

func waitTraining(t *testing.T, s *Server, id int64, status string) db.LoraTraining {
	t.Helper()
	for i := 0; i < 200; i++ {
		row, _, _ := s.db.GetLoraTraining(context.Background(), id)
		if row.Status == status {
			return row
		}
		if row.Status == "failed" {
			t.Fatalf("failed: %s", row.Error)
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("never reached %s", status)
	return db.LoraTraining{}
}
