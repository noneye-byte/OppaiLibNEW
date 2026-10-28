package api

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/settings"
)

func TestALorasNameIsWhatTheCatalogueCallsItWithoutTheTagsAroundIt(t *testing.T) {
	cases := []struct{ model, version, want string }{
		{"Makima (Chainsaw Man) | LoRA [Pony]", "Pony v2", "Makima Chainsaw Man - Pony v2"},
		{"Ink Style", "v1.0", "Ink Style"},
		{"Ink Style", "V1", "Ink Style"},
		{"✨ Detail Tweaker LoRA ✨", "v2.0", "Detail Tweaker - v2.0"},
		{"Hatsune Miku [SDXL/Pony/Illustrious]", "Illustrious", "Hatsune Miku - Illustrious"},
		{"Asuka Langley - Illustrious", "Illustrious", "Asuka Langley - Illustrious"},
		{"雷電将軍 Raiden Shogun", "v3", "雷電将軍 Raiden Shogun - v3"},
		{"Pose: sitting <on> a chair", "", "Pose sitting on a chair"},
		{"LoRA", "v1", ""},
	}
	for _, c := range cases {
		if got := loraNameFor(c.model, c.version); got != c.want {
			t.Errorf("loraNameFor(%q, %q) = %q, want %q", c.model, c.version, got, c.want)
		}
	}
}

func TestADetectorsNameSaysWhatItFindsAndWhichYoloItIsAsADetailersOwnDo(t *testing.T) {
	cases := []struct {
		model, version, file string
		set                  bool
		want                 string
	}{
		{"Adetailer Feet Detection", "v1.0", "foot_yolov8x_v2.pt", false, "feet_yolov8x.pt"},
		{"Nipples segmentation for ADetailer", "yolov8s seg", "adetailerAfterDetailer_v10.pt", false, "nipples_yolov8s-seg.pt"},
		{"Eyes Detection [SD 1.5]", "v1", "Eyes.pt", false, "eyes.pt"},
		{"Eyes segmentation for ADetailer", "v1", "Eyes.pt", false, "eyes_seg.pt"},
		// A set of several: each file says what it finds, the set's name does not.
		{"ADetailer all-in-one pack", "v1", "Lips_yolov8n.pt", true, "lips_yolov8n.pt"},
		{"Open vocabulary YOLO", "v1", "yolov8s-world.pt", false, "open_vocabulary_yolov8s-world.pt"},
		{"Detection", "v1", "", false, ""},
	}
	for _, c := range cases {
		if got := detectorNameFor(c.model, c.version, c.file, c.set); got != c.want {
			t.Errorf("detectorNameFor(%q, %q, %q) = %q, want %q", c.model, c.version, c.file, got, c.want)
		}
	}
}

// renameA1111 lists whatever LoRAs are in the models folder's Lora folder, as A1111
// would after a rescan, and counts the rescans it is asked for.
func renameA1111(t *testing.T, dir string, rescans *atomic.Int32) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			_, _ = w.Write([]byte(`[{"title":"rev.safetensors [abc123]","model_name":"rev","filename":"/m/Stable-diffusion/rev.safetensors"}]`))
		case "/sdapi/v1/loras":
			entries, _ := os.ReadDir(filepath.Join(dir, "Lora"))
			var out []map[string]any
			for _, e := range entries {
				if filepath.Ext(e.Name()) == ".safetensors" {
					stem := strings.TrimSuffix(e.Name(), ".safetensors")
					out = append(out, map[string]any{"name": stem, "path": "/m/Lora/" + e.Name()})
				}
			}
			_ = json.NewEncoder(w).Encode(out)
		case "/sdapi/v1/refresh-loras":
			rescans.Add(1)
			_, _ = w.Write([]byte(`{}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestRenamingALoraTakesItsSidecarsCatalogueLinkCategoryAndLibbysUseOfItAlong(t *testing.T) {
	dir := t.TempDir()
	_ = os.MkdirAll(filepath.Join(dir, "Stable-diffusion"), 0o755)
	_ = os.MkdirAll(filepath.Join(dir, "Lora"), 0o755)
	for name, body := range map[string]string{
		"ink_v1-000012.safetensors": "weights", "ink_v1-000012.json": `{"activation text":"ink"}`,
		"ink_v1-000012.preview.png": "cover", "other.safetensors": "other",
	} {
		_ = os.WriteFile(filepath.Join(dir, "Lora", name), []byte(body), 0o644)
	}
	var rescans atomic.Int32
	s, token := newTestServer(t)
	enableImageGen(t, s, renameA1111(t, dir, &rescans).URL)
	set := s.settings.Get()
	set.ImageGenModelsDir = dir
	set.LibbyGenLoras = []settings.LoraChoice{{Name: "ink_v1-000012", Weight: 0.7}, {Name: "other", Weight: 1}}
	s.settings.Set(set)
	ctx := context.Background()
	_ = s.db.PutCivitaiLink(ctx, db.CivitaiLink{ModelKey: "Lora/ink_v1-000012.safetensors", ModelID: 1, VersionID: 11, ModelName: "Ink Style"})
	_ = s.db.SetLoraCategory(ctx, "style", []string{"ink_v1-000012"})
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/imagegen/names/rename",
		`{"kind":"lora","renames":[{"name":"ink_v1-000012","to":"Ink Style"},{"name":"other","to":"Ink Style"}]}`)
	var got struct {
		Renamed []imagegen.ModelRename `json:"renamed"`
		Failed  []renameFailure        `json:"failed"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	want := imagegen.ModelRename{OldKey: "Lora/ink_v1-000012.safetensors", NewKey: "Lora/Ink Style.safetensors", OldName: "ink_v1-000012", NewName: "Ink Style"}
	if len(got.Renamed) != 1 || got.Renamed[0] != want {
		t.Fatalf("renamed = %+v", got.Renamed)
	}
	if len(got.Failed) != 1 || got.Failed[0].Name != "other" || !strings.Contains(got.Failed[0].Error, "already") {
		t.Errorf("a second LoRA given the same name should be refused, not overwrite the first: %+v", got.Failed)
	}
	for _, f := range []string{"Ink Style.safetensors", "Ink Style.json", "Ink Style.preview.png", "other.safetensors"} {
		if _, err := os.Stat(filepath.Join(dir, "Lora", f)); err != nil {
			t.Errorf("%s is missing after the rename", f)
		}
	}
	if _, err := os.Stat(filepath.Join(dir, "Lora", "ink_v1-000012.json")); err == nil {
		t.Error("the old sidecar was left behind")
	}
	if rescans.Load() == 0 {
		t.Error("A1111 was not asked to list its LoRAs again")
	}
	if link, ok, _ := s.db.CivitaiLink(ctx, "Lora/Ink Style.safetensors"); !ok || link.ModelID != 1 {
		t.Errorf("the catalogue link did not move: %+v %v", link, ok)
	}
	if cats, _ := s.db.LoraCategories(ctx); cats["Ink Style"] != "style" || cats["ink_v1-000012"] != "" {
		t.Errorf("categories = %v", cats)
	}
	if l := s.settings.Get().LibbyGenLoras; l[0].Name != "Ink Style" || l[0].Weight != 0.7 || l[1].Name != "other" {
		t.Errorf("Libby's LoRAs = %+v", l)
	}
}

func TestDetectorNamesAreSuggestedFromTheModelTheirHashFindsOnCivitai(t *testing.T) {
	sum := sha256.Sum256([]byte("adetailerAfterDetailer_v10.pt"))
	hash := strings.ToUpper(hex.EncodeToString(sum[:]))
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/model-versions/by-hash/" + hash:
			fmt.Fprint(w, `{"id":55,"modelId":5}`)
		case "/models/5":
			fmt.Fprint(w, `{"id":5,"type":"Detection","name":"ADetailer Feet","modelVersions":[{"id":55,"name":"yolov8s"}]}`)
		default:
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, `{"error":"Model not found"}`)
		}
	}))
	t.Cleanup(upstream.Close)
	s, token := newTestServer(t)
	enableImageGen(t, s, detectorA1111(t).URL)
	set := s.settings.Get()
	// Each test file holds its own name, so the first one hashes to `hash`.
	set.ImageGenModelsDir = detectorModelsDir(t, "adetailerAfterDetailer_v10.pt", "mystery.pt", "feet_yolov8s.pt")
	set.CivitaiAPIURL = upstream.URL
	s.settings.Set(set)
	_ = s.db.PutCivitaiLink(context.Background(), db.CivitaiLink{ModelKey: "adetailer/feet_yolov8s.pt", ModelID: 5, VersionID: 55, ModelName: "ADetailer Feet"})

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/names/suggest",
		`{"kind":"detector","names":["adetailerAfterDetailer_v10.pt","mystery.pt","feet_yolov8s.pt","gone.pt"]}`)
	var got struct {
		Suggestions []nameSuggestion `json:"suggestions"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	want := []nameSuggestion{
		{Name: "adetailerAfterDetailer_v10.pt", To: "feet_yolov8s.pt", Civitai: "ADetailer Feet", Outcome: "named"},
		{Name: "mystery.pt", Outcome: "unknown"},
		{Name: "feet_yolov8s.pt", To: "feet_yolov8s.pt", Civitai: "ADetailer Feet", Outcome: "same"},
		{Name: "gone.pt", Outcome: "error", Error: "there is nothing called that"},
	}
	for i, w := range want {
		if got.Suggestions[i] != w {
			t.Errorf("suggestion %d = %+v, want %+v", i, got.Suggestions[i], w)
		}
	}
}

func TestRestartIsAskedOfAutomatic1111AndARefusalSaysWhatToChange(t *testing.T) {
	for _, c := range []struct {
		name   string
		status int
		want   int
		says   string
	}{
		{"started with --api-server-stop", http.StatusOK, http.StatusAccepted, ""},
		{"without the flag", http.StatusNotFound, http.StatusConflict, "--api-server-stop"},
		{"from a launcher that won't bring it back", http.StatusNotImplemented, http.StatusConflict, "webui.sh"},
	} {
		t.Run(c.name, func(t *testing.T) {
			gen := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				switch r.URL.Path {
				case "/sdapi/v1/sd-models":
					_, _ = w.Write([]byte(`[]`))
				case "/sdapi/v1/server-restart":
					w.WriteHeader(c.status)
				default:
					http.NotFound(w, r)
				}
			}))
			t.Cleanup(gen.Close)
			s, token := newTestServer(t)
			enableImageGen(t, s, gen.URL)
			rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/restart", "")
			if rec.Code != c.want || !strings.Contains(rec.Body.String(), c.says) {
				t.Errorf("%d %s", rec.Code, rec.Body)
			}
		})
	}
}
