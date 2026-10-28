package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/youruser/oppailib/internal/db"
)

// detectorA1111 is an Automatic1111 whose ADetailer lists its own face model and
// one detector from its folder.
func detectorA1111(t *testing.T) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			_, _ = w.Write([]byte(`[{"title":"rev.safetensors [abc123]","model_name":"rev","hash":"abc123"}]`))
		case "/adetailer/v1/ad_model":
			_, _ = w.Write([]byte(`{"ad_model":["None","face_yolov8n.pt","Eyes.pt"]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func detectorModelsDir(t *testing.T, files ...string) string {
	dir := t.TempDir()
	_ = os.MkdirAll(filepath.Join(dir, "Stable-diffusion"), 0o755)
	_ = os.MkdirAll(filepath.Join(dir, "adetailer"), 0o755)
	for _, f := range files {
		_ = os.WriteFile(filepath.Join(dir, "adetailer", f), []byte(f), 0o644)
	}
	return dir
}

func TestDetectorsListTheFolderBesideADetailersOwnAndSayWhichWantARestart(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, detectorA1111(t).URL)
	set := s.settings.Get()
	set.ImageGenModelsDir = detectorModelsDir(t, "Eyes.pt", "feet.pt")
	s.settings.Set(set)
	_ = s.db.PutCivitaiLink(context.Background(), db.CivitaiLink{ModelKey: "adetailer/feet.pt", ModelID: 5, VersionID: 55, ModelName: "Foot detection"})

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/detectors", "")
	var got struct {
		Detectors []detectorOut `json:"detectors"`
		Folder    bool          `json:"folder"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if !got.Folder || len(got.Detectors) != 3 {
		t.Fatalf("got %+v", got)
	}
	eyes, feet, face := got.Detectors[0], got.Detectors[1], got.Detectors[2]
	if eyes.Name != "Eyes.pt" || !eyes.Listed || eyes.Key != "adetailer/Eyes.pt" {
		t.Errorf("eyes = %+v", eyes)
	}
	if feet.Name != "feet.pt" || feet.Listed || feet.Civitai == nil || feet.Civitai.Name != "Foot detection" {
		t.Errorf("feet, on disk but not yet read by ADetailer, = %+v", feet)
	}
	if face.Name != "face_yolov8n.pt" || !face.Listed || face.Key != "" {
		t.Errorf("ADetailer's own face model = %+v", face)
	}

	if rec := do(t, s.Handler(), token, http.MethodDelete, "/api/imagegen/detectors?key="+url.QueryEscape("adetailer/feet.pt"), ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	if _, ok, _ := s.db.CivitaiLink(context.Background(), "adetailer/feet.pt"); ok {
		t.Error("the deleted detector's catalogue link was kept")
	}
}

func TestTheDetectorShopAsksForDetectionModelsAndOtherOnesTaggedForADetailer(t *testing.T) {
	var mu sync.Mutex
	var asked []string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		mu.Lock()
		asked = append(asked, q.Get("types")+"|"+q.Get("tag")+"|"+q.Get("cursor")+"|"+q.Get("query"))
		mu.Unlock()
		switch q.Get("types") {
		case "Detection":
			fmt.Fprint(w, `{"items":[{"id":1,"type":"Detection","name":"Eyes","modelVersions":[{"id":11,"images":[{"url":"https://image.civitai.com/x/eyes.jpeg","type":"image"}]}]}],"metadata":{"nextCursor":"c2"}}`)
		case "Other":
			fmt.Fprint(w, `{"items":[
				{"id":2,"type":"Other","name":"Feet","tags":["adetailer"],"modelVersions":[{"id":21}]},
				{"id":1,"type":"Detection","name":"Eyes again","modelVersions":[{"id":11}]},
				{"id":3,"type":"Other","name":"A workflow","tags":["tool"],"modelVersions":[{"id":31}]}],"metadata":{}}`)
		}
	}))
	t.Cleanup(upstream.Close)
	s, token := newTestServer(t)
	set := s.settings.Get()
	set.CivitaiAPIURL = upstream.URL
	s.settings.Set(set)
	_ = s.db.PutCivitaiLink(context.Background(), db.CivitaiLink{ModelKey: "adetailer/Eyes.pt", ModelID: 1, VersionID: 11})

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/detectors/civitai?q=eye", "")
	var page struct {
		Items      []detectorModelOut `json:"items"`
		NextCursor string             `json:"nextCursor"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &page); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	if len(page.Items) != 2 || page.Items[0].Name != "Eyes" || page.Items[1].Name != "Feet" {
		t.Fatalf("items = %+v", page.Items)
	}
	if !page.Items[0].Installed || page.Items[0].Cover == "" || page.Items[1].Installed {
		t.Errorf("installed/cover = %+v", page.Items)
	}
	all := strings.Join(asked, ",")
	if len(asked) != 2 || !strings.Contains(all, "Detection|||eye") || !strings.Contains(all, "Other|adetailer||eye") {
		t.Errorf("asked %v", asked)
	}
	// The Other listing ran out; the next page asks the Detection one alone.
	mu.Lock()
	asked = nil
	mu.Unlock()
	do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/detectors/civitai?cursor="+page.NextCursor, "")
	if len(asked) != 1 || asked[0] != "Detection||c2|" {
		t.Errorf("second page asked %v", asked)
	}
}

func TestADetectorsFileNameIsToldApartOnlyWhenTheFolderHasOneCalledThat(t *testing.T) {
	existing := map[string]bool{"adetailerafterdetailer_v10.pt": true}
	if got := detectorFileName("adetailerAfterDetailer_v10.pt", 77, existing); got != "adetailerAfterDetailer_v10-77.pt" {
		t.Errorf("got %q", got)
	}
	if got := detectorFileName("feet.pt", 77, existing); got != "feet.pt" {
		t.Errorf("got %q", got)
	}
	if got := detectorFileName("adetailerAfterDetailer_v10.zip", 77, existing); got != "adetailerAfterDetailer_v10.zip" {
		t.Errorf("an archive was renamed: %q", got)
	}
	if f := detectorFileOf([]civitaiRawFile{{Name: "a.zip"}, {Name: "a.pt"}}); f == nil || f.Name != "a.pt" {
		t.Errorf("a version with a .pt installs %+v", f)
	}
}

// sortA1111 has three LoRAs: one Civitai knows, one it does not, one with no hash.
func sortA1111(t *testing.T) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			_, _ = w.Write([]byte(`[{"title":"rev.safetensors [abc123]","model_name":"rev","hash":"abc123"}]`))
		case "/sdapi/v1/loras":
			_, _ = w.Write([]byte(`[
				{"name":"ink","path":"/m/Lora/ink.safetensors","metadata":{"sshs_model_hash":"aaa"}},
				{"name":"mika","path":"/m/Lora/mika.safetensors","metadata":{"sshs_model_hash":"bbb"}},
				{"name":"plain","path":"/m/Lora/plain.safetensors"},
				{"name":"kept","path":"/m/Lora/kept.safetensors"}]`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestSortingWithCivitaiFilesEachLoraByItsModelsTagAndSaysWhyNot(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/model-versions/by-hash/AAA":
			fmt.Fprint(w, `{"id":11,"modelId":1}`)
		case "/models/1":
			fmt.Fprint(w, `{"id":1,"type":"LORA","name":"Ink Style","tags":["anime","style"],"modelVersions":[{"id":11}]}`)
		default:
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, `{"error":"Model not found"}`)
		}
	}))
	t.Cleanup(upstream.Close)
	s, token := newTestServer(t)
	enableImageGen(t, s, sortA1111(t).URL)
	set := s.settings.Get()
	set.CivitaiAPIURL = upstream.URL
	s.settings.Set(set)
	_ = s.db.SetLoraCategory(context.Background(), "poses", []string{"kept"})
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/civitai", `{"loras":["ink","mika","plain","kept"]}`)
	var got struct {
		Results []loraCivitaiResult `json:"results"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	want := []loraCivitaiResult{
		{Lora: "ink", Category: "style", Civitai: "Ink Style", Outcome: "filed"},
		{Lora: "mika", Outcome: "unknown"},
		{Lora: "plain", Outcome: "unhashed"},
		{Lora: "kept", Category: "poses", Outcome: "filed"},
	}
	for i, w := range want {
		if got.Results[i] != w {
			t.Errorf("result %d = %+v, want %+v", i, got.Results[i], w)
		}
	}
	if cats := statusCategories(t, h, token); cats["ink"] != "style" || cats["kept"] != "poses" || cats["mika"] != "" {
		t.Errorf("status categories = %v", cats)
	}
	if link, ok, _ := s.db.CivitaiLink(context.Background(), "Lora/ink.safetensors"); !ok || link.ModelID != 1 {
		t.Errorf("the catalogue link was not kept: %+v %v", link, ok)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/civitai", `{"loras":[]}`); rec.Code != http.StatusBadRequest {
		t.Errorf("an empty batch answered %d", rec.Code)
	}
}
