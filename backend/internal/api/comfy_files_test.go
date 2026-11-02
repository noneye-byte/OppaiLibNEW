package api

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/db"
)

// comfyLoraFolder gives the server a LoRA folder holding one file, as ComfyUI would
// list it, under a subfolder.
func comfyLoraFolder(t *testing.T, s *Server, body string) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "wan"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "wan", "sway_high.safetensors"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	cur := s.settings.Get()
	cur.ComfyLoraDir = dir
	s.settings.Set(cur)
	return dir
}

func TestAVideoLoraIsDeletedFromComfyUIsFolderWithWhatWasKeptOfIt(t *testing.T) {
	s, token := newTestServer(t)
	dir := comfyLoraFolder(t, s, "weights")
	const name = "wan/sway_high.safetensors"
	if err := s.db.PutComfyTriggers(t.Context(), name, []string{"sway"}); err != nil {
		t.Fatal(err)
	}
	h := s.Handler()
	del := func(kind, name string) *httptest.ResponseRecorder {
		return do(t, h, token, http.MethodDelete, "/api/imagegen/comfy/file?kind="+kind+"&name="+url.QueryEscape(name), "")
	}
	// Nothing outside the folder, whatever the name says.
	for _, bad := range []string{"../escape.safetensors", "wan/../../escape.safetensors", `..\escape.safetensors`} {
		if rec := del("loras", bad); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: %d %s", bad, rec.Code, rec.Body)
		}
	}
	if rec := del("diffusion_models", name); rec.Code != http.StatusConflict {
		t.Fatalf("a kind with no folder set: %d %s", rec.Code, rec.Body)
	}
	if rec := del("loras", "wan/elsewhere.safetensors"); rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "another folder") {
		t.Fatalf("a file ComfyUI has from elsewhere: %d %s", rec.Code, rec.Body)
	}
	// ComfyUI on Windows lists a subfolder with a backslash.
	if rec := del("loras", `wan\sway_high.safetensors`); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	if _, err := os.Stat(filepath.Join(dir, "wan", "sway_high.safetensors")); !os.IsNotExist(err) {
		t.Fatal("the file is still there")
	}
	if rec := del("loras", name); rec.Code != http.StatusNotFound {
		t.Fatalf("deleted twice: %d", rec.Code)
	}
	// The note went with it — under the name as ComfyUI listed it to the studio.
	if err := s.db.PutComfyTriggers(t.Context(), name, []string{"sway"}); err != nil {
		t.Fatal(err)
	}
	os.WriteFile(filepath.Join(dir, "wan", "sway_high.safetensors"), []byte("again"), 0o644)
	del("loras", name)
	if _, ok := comfyNotes(t, s, token)[name]; ok {
		t.Fatal("the note outlived the file")
	}
}

func TestAVideoLoraFromElsewhereIsFoundOnCivitaiByItsHash(t *testing.T) {
	const body = "lora weights"
	sum := sha256.Sum256([]byte(body))
	hash := strings.ToUpper(hex.EncodeToString(sum[:]))
	var asked []string
	civ := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		asked = append(asked, r.URL.Path)
		switch r.URL.Path {
		case "/model-versions/by-hash/" + hash:
			fmt.Fprint(w, `{"id":70,"modelId":7,"name":"v2"}`)
		case "/model-versions/71":
			fmt.Fprint(w, `{"id":71,"modelId":7,"name":"v1"}`)
		case "/models/7":
			fmt.Fprint(w, `{"id":7,"name":"Sway","type":"LORA","description":"<p>Recomanded weight is 0.8</p>","modelVersions":[
				{"id":70,"name":"v2","baseModel":"Wan Video 14B i2v 480p","trainedWords":["sway, "],"images":[]},
				{"id":71,"name":"v1","baseModel":"Wan Video 14B i2v 480p","trainedWords":["old sway"],"images":[]}]}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer civ.Close()
	s, token := newTestServer(t)
	comfyLoraFolder(t, s, body)
	cur := s.settings.Get()
	cur.CivitaiAPIURL = civ.URL
	s.settings.Set(cur)
	h := s.Handler()
	const name = "wan/sway_high.safetensors"

	type linked struct {
		Note comfyNoteOut `json:"note"`
	}
	link := func(body string) (int, comfyNoteOut) {
		rec := do(t, h, token, http.MethodPost, "/api/imagegen/comfy/civitai", body)
		var out linked
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return rec.Code, out.Note
	}
	code, n := link(`{"name":"` + name + `","kind":"loras"}`)
	if code != http.StatusOK {
		t.Fatalf("link by hash: %d (asked %v)", code, asked)
	}
	if n.Civitai == nil || *n.Civitai != (db.ComfyCivitai{ModelID: 7, VersionID: 70, ModelName: "Sway", VersionName: "v2"}) {
		t.Fatalf("link: %+v", n.Civitai)
	}
	if !slices.Equal(n.Triggers, []string{"sway"}) || n.Defaults == nil || n.Defaults.Weight != 0.8 {
		t.Fatalf("filled: %+v %+v", n.Triggers, n.Defaults)
	}

	// Another version, by its page's address: the link moves, words set already stay.
	code, n = link(`{"name":"` + name + `","url":"https://civitai.com/models/7/sway?modelVersionId=71"}`)
	if code != http.StatusOK || n.Civitai == nil || n.Civitai.VersionID != 71 || !slices.Equal(n.Triggers, []string{"sway"}) {
		t.Fatalf("relink: %d %+v %v", code, n.Civitai, n.Triggers)
	}
	if code, _ := link(`{"name":"` + name + `","url":"https://example.com/models/7"}`); code != http.StatusBadRequest {
		t.Fatalf("another site's address: %d", code)
	}
	code, n = link(`{"name":"` + name + `","unlink":true}`)
	if code != http.StatusOK || n.Civitai != nil || !slices.Equal(n.Triggers, []string{"sway"}) {
		t.Fatalf("unlink: %d %+v", code, n)
	}
	// A file Civitai has never seen says so, with what to do instead.
	os.WriteFile(filepath.Join(s.settings.Get().ComfyLoraDir, "wan", "sway_high.safetensors"), []byte("home made"), 0o644)
	rec := do(t, h, token, http.MethodPost, "/api/imagegen/comfy/civitai", `{"name":"`+name+`","kind":"loras"}`)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "paste") {
		t.Fatalf("unknown file: %d %s", rec.Code, rec.Body)
	}
}

func TestACivitaiAddressIsReadForItsModelAndVersion(t *testing.T) {
	for raw, want := range map[string][3]int64{
		"https://civitai.com/models/1234/some-lora?modelVersionId=5678": {1234, 5678, 1},
		"civitai.com/models/1234":                                       {1234, 0, 1},
		"https://civitai.red/api/download/models/5678?type=Model":       {0, 5678, 1},
		"5678":                                                          {0, 5678, 1},
		"https://huggingface.co/models/1234":                            {0, 0, 0},
		"a lora":                                                        {0, 0, 0},
	} {
		m, v, ok := civitaiIDsIn(raw)
		okN := int64(0)
		if ok {
			okN = 1
		}
		if got := [3]int64{m, v, okN}; got != want {
			t.Errorf("%s: got %v, want %v", raw, got, want)
		}
	}
}
