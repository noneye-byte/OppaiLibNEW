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
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
)

func TestThePreviewShowsEveryPictureLessTheOnesDropped(t *testing.T) {
	s, token := newTestServer(t)
	ctx := context.Background()
	coll, _ := s.db.CreateCollection(ctx, "set")
	keep := seedTaggedPicture(t, s, 1, "blonde_hair", "smile")
	drop := seedTaggedPicture(t, s, 2, "blonde_hair", "night")
	bare := seedTaggedPicture(t, s, 3)
	if _, err := s.db.AddToCollection(ctx, coll, []int64{keep, drop, bare}); err != nil {
		t.Fatal(err)
	}

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train/preview",
		fmt.Sprintf(`{"source":{"collectionId":%d,"exclude":[%d]},"trigger":"ohwx","leaveOut":["blonde hair"]}`, coll, drop))
	if rec.Code != http.StatusOK {
		t.Fatalf("preview: %d %s", rec.Code, rec.Body)
	}
	var p struct {
		Count    int                `json:"count"`
		Untagged int                `json:"untagged"`
		Items    []trainPreviewItem `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &p); err != nil {
		t.Fatal(err)
	}
	if p.Count != 2 || len(p.Items) != 2 || p.Untagged != 1 {
		t.Fatalf("preview = %+v", p)
	}
	byID := map[int64]trainPreviewItem{}
	for _, it := range p.Items {
		byID[it.ID] = it
	}
	if _, ok := byID[drop]; ok {
		t.Error("a dropped picture is still in the set")
	}
	if got := byID[keep]; got.Caption != "ohwx, smile" || len(got.Tags) != 2 || got.Tags[0].Name != "blonde hair" {
		t.Errorf("the kept picture reads %+v", got)
	}
	if got := byID[bare]; got.Caption != "ohwx" || len(got.Tags) != 0 {
		t.Errorf("the untagged picture reads %+v", got)
	}
}

func TestAPresetsFinerSettingsReachTheTrainer(t *testing.T) {
	s, _ := newTestServer(t)
	spec := s.trainSpec(context.Background(), trainRequest{
		Name: "ink", Preset: "style", Alpha: 8, NoiseOffset: 0.05, TextEncoderLR: 0.00005,
	}, imagegen.CheckpointFile{Key: "base.safetensors"}, nil, 20)
	if spec.Alpha != 8 || spec.NoiseOffset != 0.05 || spec.TextEncoderLR != 0.00005 {
		t.Fatalf("spec = %+v", spec)
	}
}

// pictureHost serves a different small PNG for each path, and 404 for /missing.
func pictureHost(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/missing.jpg" {
			http.NotFound(w, r)
			return
		}
		var buf bytes.Buffer
		img := image.NewRGBA(image.Rect(0, 0, 8, 8))
		img.Set(1, 1, color.RGBA{uint8(len(r.URL.Path) * 17), 40, 40, 255})
		_ = pngenc.Encode(&buf, img)
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write(buf.Bytes())
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestKeptPicturesAreImportedIntoANewCollectionAndAMissingOneIsCounted(t *testing.T) {
	host := pictureHost(t)
	s, token := newTestServer(t)
	body := fmt.Sprintf(`{"collectionName":"LoRA: ink","items":[
		{"url":"%[1]s/a.png","source":"https://x.com/ink/status/1","title":"first"},
		{"url":"%[1]s/bb.png","source":"https://x.com/ink/status/2"},
		{"url":"%[1]s/a.png"},
		{"url":"%[1]s/missing.jpg"},
		{"url":"javascript:alert(1)"}]}`, host.URL)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train/import", body)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("import: %d %s", rec.Code, rec.Body)
	}
	var task trainTask
	_ = json.Unmarshal(rec.Body.Bytes(), &task)
	if task.Total != 3 || task.CollectionID == 0 {
		t.Fatalf("the duplicate and the non-web link are dropped before it starts: %+v", task)
	}
	task = waitTask(t, s, token, task.ID)
	if task.Done != 2 || task.Failed != 1 || task.Error != "" || len(task.MediaIDs) != 2 {
		t.Fatalf("finished task = %+v", task)
	}
	ids, err := s.db.CollectionMediaIDs(context.Background(), task.CollectionID, 10, 0)
	if err != nil || len(ids) != 2 {
		t.Fatalf("collection holds %v (%v)", ids, err)
	}
	c, _ := s.db.GetCollection(context.Background(), task.CollectionID)
	if c == nil || c.Name != "LoRA: ink" {
		t.Errorf("collection = %+v", c)
	}
}

func waitTask(t *testing.T, s *Server, token, id string) trainTask {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/train-tasks/"+id, "")
		var task trainTask
		_ = json.Unmarshal(rec.Body.Bytes(), &task)
		if task.Finished {
			return task
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("task %s never finished", id)
	return trainTask{}
}

func TestTaggingASetWithTheTaggerOffSaysWhereToTurnItOn(t *testing.T) {
	s, token := newTestServer(t)
	if s.ai.Enabled() {
		t.Skip("the test server has the tagger on")
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train/autotag", `{"source":{"tag":"x"}}`)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "Settings") {
		t.Fatalf("autotag: %d %s", rec.Code, rec.Body)
	}
}

func TestAnXAccountThatIsNotOneIsRefusedBeforeAnythingIsFetched(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/train/twitter?user=https://example.com/ink", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("twitter: %d %s", rec.Code, rec.Body)
	}
}

func TestASecondImportForTheSameLoraJoinsItsCollection(t *testing.T) {
	host := pictureHost(t)
	s, token := newTestServer(t)
	existing, err := s.db.CreateCollection(context.Background(), "LoRA: ink")
	if err != nil {
		t.Fatal(err)
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/train/import",
		fmt.Sprintf(`{"collectionName":"lora: INK","items":[{"url":"%s/c.png"}]}`, host.URL))
	if rec.Code != http.StatusAccepted {
		t.Fatalf("import: %d %s", rec.Code, rec.Body)
	}
	var task trainTask
	_ = json.Unmarshal(rec.Body.Bytes(), &task)
	if task.CollectionID != existing {
		t.Fatalf("went into collection %d, want the existing %d", task.CollectionID, existing)
	}
	waitTask(t, s, token, task.ID)
}
