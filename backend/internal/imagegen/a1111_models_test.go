package imagegen

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// a1111FolderFake serves the listings an A1111 gives, reading the models folder the way
// A1111 would so an install shows up once it is "rescanned".
type a1111FolderFake struct {
	mu        sync.Mutex
	dir       string // the folder A1111 reads, under its own root
	refreshed []string
	title     string // a checkpoint's title, overridable to test the "[hash]" suffix
}

func (f *a1111FolderFake) handler(t *testing.T) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v1/app/version":
			http.NotFound(w, r)
		case "/sdapi/v1/sd-models":
			var out []map[string]any
			entries, _ := os.ReadDir(filepath.Join(f.dir, "Stable-diffusion"))
			for _, e := range entries {
				if strings.HasSuffix(e.Name(), ".safetensors") {
					title := e.Name()
					f.mu.Lock()
					if f.title != "" {
						title = f.title
					}
					f.mu.Unlock()
					out = append(out, map[string]any{
						"title": title, "model_name": strings.TrimSuffix(e.Name(), ".safetensors"),
						"filename": "/webui/models/Stable-diffusion/" + e.Name(),
					})
				}
			}
			_ = json.NewEncoder(w).Encode(out)
		case "/sdapi/v1/loras":
			var out []map[string]any
			entries, _ := os.ReadDir(filepath.Join(f.dir, "Lora"))
			for _, e := range entries {
				if strings.HasSuffix(e.Name(), ".safetensors") {
					name := strings.TrimSuffix(e.Name(), ".safetensors")
					out = append(out, map[string]any{"name": name, "alias": name, "path": "/webui/models/Lora/" + e.Name()})
				}
			}
			_ = json.NewEncoder(w).Encode(out)
		case "/sdapi/v1/sd-vae":
			fmt.Fprint(w, `[]`)
		case "/sdapi/v1/refresh-checkpoints", "/sdapi/v1/refresh-loras":
			f.mu.Lock()
			f.refreshed = append(f.refreshed, r.URL.Path)
			f.mu.Unlock()
			fmt.Fprint(w, `null`)
		default:
			http.NotFound(w, r)
		}
	})
}

func a1111Fixture(t *testing.T) (*Client, *a1111FolderFake, string, string) {
	t.Helper()
	dir := t.TempDir()
	for _, sub := range []string{"Stable-diffusion", "Lora"} {
		if err := os.MkdirAll(filepath.Join(dir, sub), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	fake := &a1111FolderFake{dir: dir}
	srv := httptest.NewServer(fake.handler(t))
	t.Cleanup(srv.Close)
	c := New()
	c.ModelsDir = func() string { return dir }
	c.HashCachePath = filepath.Join(t.TempDir(), "hashes.json")
	return c, fake, srv.URL, dir
}

func waitForJob(t *testing.T, c *Client, base string, id int64) InstallJob {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		jobs, err := c.InstallJobs(context.Background(), base)
		if err != nil {
			t.Fatal(err)
		}
		for _, j := range jobs {
			if j.ID == id && j.Status != "waiting" && j.Status != "downloading" {
				return j
			}
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("the install never finished")
	return InstallJob{}
}

func TestA1111InstallLandsInItsFolderHashedAndRescanned(t *testing.T) {
	c, fake, base, dir := a1111Fixture(t)
	body := []byte("pretend these are weights")
	var auth string
	files := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		w.Header().Set("Content-Disposition", `attachment; filename="ignored.safetensors"`)
		_, _ = w.Write(body)
	}))
	defer files.Close()

	job, err := c.InstallModel(context.Background(), base, InstallSpec{
		Source: files.URL + "/api/download/models/7", Type: "LORA", FileName: "../ink style.safetensors", Token: "k",
	})
	if err != nil {
		t.Fatal(err)
	}
	done := waitForJob(t, c, base, job.ID)
	if done.Status != "completed" || done.ModelKey != "Lora/ink style.safetensors" {
		t.Fatalf("job = %+v", done)
	}
	if auth != "Bearer k" {
		t.Fatalf("download was not authorised: %q", auth)
	}
	got, err := os.ReadFile(filepath.Join(dir, "Lora", "ink style.safetensors"))
	if err != nil || string(got) != string(body) {
		t.Fatalf("file = %q, %v", got, err)
	}
	if _, err := os.Stat(filepath.Join(dir, "Lora", "ink style.safetensors.part")); !os.IsNotExist(err) {
		t.Fatal("the partial file was left behind")
	}
	fake.mu.Lock()
	refreshed := strings.Join(fake.refreshed, ",")
	fake.mu.Unlock()
	if refreshed != "/sdapi/v1/refresh-loras" {
		t.Fatalf("A1111 was asked to rescan %q", refreshed)
	}
	// The hash taken on the way in is the record's, without reading the file again.
	sum := sha256.Sum256(body)
	records, err := c.ModelRecords(context.Background(), base)
	if err != nil {
		t.Fatal(err)
	}
	var found bool
	for _, r := range records {
		if r.Key == "Lora/ink style.safetensors" {
			found = true
			if r.Hash != "sha256:"+hex.EncodeToString(sum[:]) || r.Type != "lora" || r.Name != "ink style" {
				t.Fatalf("record = %+v", r)
			}
		}
	}
	if !found {
		t.Fatalf("the installed LoRA is not listed: %+v", records)
	}
}

func TestA1111InstallIsRefusedWithoutAModelsFolder(t *testing.T) {
	c, _, base, _ := a1111Fixture(t)
	c.ModelsDir = func() string { return "" }
	_, err := c.InstallModel(context.Background(), base, InstallSpec{Source: "https://civitai.com/x", Type: "Checkpoint"})
	if !errors.Is(err, ErrNoModelsDir) {
		t.Fatalf("err = %v", err)
	}
	// A folder that is there but is not a models folder is no better.
	c.ModelsDir = func() string { return t.TempDir() }
	if c.A1111ModelsDirReady() {
		t.Fatal("an empty folder passed for A1111's models folder")
	}
}

func TestTheMountedModelsFolderIsUsedWhenTheSettingIsBlank(t *testing.T) {
	c, _, _, dir := a1111Fixture(t)
	old := a1111MountPoint
	t.Cleanup(func() { a1111MountPoint = old })
	a1111MountPoint = dir
	c.ModelsDir = func() string { return "" }
	st := c.A1111ModelsDir()
	if st.Path != dir || st.Dir != dir || !st.Writable || st.Problem != "" {
		t.Fatalf("status = %+v", st)
	}
	// Nothing mounted and nothing set is "not set", not a problem to explain.
	a1111MountPoint = filepath.Join(t.TempDir(), "absent")
	if st := c.A1111ModelsDir(); st.Path != "" || st.Problem != "" {
		t.Fatalf("status = %+v", st)
	}
}

func TestTheWebuiFolderOrAFolderInsideModelsIsTakenForModels(t *testing.T) {
	c, _, _, dir := a1111Fixture(t)
	// The fixture's folder is "models" itself; its parent stands in for the webui.
	models := filepath.Join(t.TempDir(), "models")
	if err := os.Rename(dir, models); err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{filepath.Dir(models), filepath.Join(models, "Lora")} {
		c.ModelsDir = func() string { return p }
		if st := c.A1111ModelsDir(); st.Dir != models {
			t.Fatalf("%s resolved to %+v", p, st)
		}
	}
}

func TestAWrongFolderSaysWhatIsWrongWithIt(t *testing.T) {
	c, _, base, _ := a1111Fixture(t)
	missing := filepath.Join(t.TempDir(), "nowhere")
	c.ModelsDir = func() string { return missing }
	st := c.A1111ModelsDir()
	if st.Dir != "" || !strings.Contains(st.Problem, "does not exist") {
		t.Fatalf("status = %+v", st)
	}
	_, err := c.InstallModel(context.Background(), base, InstallSpec{Source: "https://civitai.com/x", Type: "Checkpoint"})
	if !errors.Is(err, ErrNoModelsDir) || !strings.Contains(err.Error(), "does not exist") {
		t.Fatalf("err = %v", err)
	}
	empty := t.TempDir()
	c.ModelsDir = func() string { return empty }
	if st := c.A1111ModelsDir(); !strings.Contains(st.Problem, "neither Stable-diffusion nor Lora") {
		t.Fatalf("status = %+v", st)
	}
}

func TestA1111EditsGoToTheSidecarAndKeepWhatA1111Wrote(t *testing.T) {
	c, _, base, dir := a1111Fixture(t)
	lora := filepath.Join(dir, "Lora", "ink.safetensors")
	if err := os.WriteFile(lora, []byte("w"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "Lora", "ink.json"), []byte(`{"notes":"mine","preferred weight":0.6}`), 0o644); err != nil {
		t.Fatal(err)
	}
	desc := "Ink wash style"
	words := []string{"inkwash", " sumi-e "}
	base1 := "SDXL 1.0"
	d, err := c.UpdateModel(context.Background(), base, "ink", ModelChanges{Description: &desc, TriggerPhrases: &words, Base: &base1})
	if err != nil {
		t.Fatal(err)
	}
	if d.Key != "Lora/ink.safetensors" || d.Description != desc || strings.Join(d.TriggerPhrases, "|") != "inkwash|sumi-e" ||
		d.Defaults == nil || d.Defaults.Weight != 0.6 || d.Base != "SDXL" {
		t.Fatalf("detail = %+v", d)
	}
	raw, _ := os.ReadFile(filepath.Join(dir, "Lora", "ink.json"))
	var sc map[string]any
	_ = json.Unmarshal(raw, &sc)
	if sc["notes"] != "mine" || sc["activation text"] != "inkwash, sumi-e" {
		t.Fatalf("sidecar = %s", raw)
	}
	// The picker reads the same file: trigger phrases and weight come with the LoRA.
	loras, err := c.Loras(context.Background(), base)
	if err != nil || len(loras) != 1 || strings.Join(loras[0].TriggerPhrases, "|") != "inkwash|sumi-e" || loras[0].Weight != 0.6 {
		t.Fatalf("loras = %+v, %v", loras, err)
	}
	// A1111 names a model by its file; a rename is refused rather than half done.
	other := "Brush"
	if _, err := c.UpdateModel(context.Background(), base, "ink", ModelChanges{Name: &other}); err == nil {
		t.Fatal("a rename went through")
	}
}

func TestA1111CheckpointKeyedByItsFileSurvivesItsTitleGainingAHash(t *testing.T) {
	c, fake, base, dir := a1111Fixture(t)
	if err := os.WriteFile(filepath.Join(dir, "Stable-diffusion", "dream.safetensors"), []byte("w"), 0o644); err != nil {
		t.Fatal(err)
	}
	before, err := c.ModelDetail(context.Background(), base, "dream.safetensors")
	if err != nil {
		t.Fatal(err)
	}
	fake.mu.Lock()
	fake.title = "dream.safetensors [abcdef1234]"
	fake.mu.Unlock()
	after, err := c.ModelDetail(context.Background(), base, "dream.safetensors [abcdef1234]")
	if err != nil {
		t.Fatal(err)
	}
	if before.Key != "Stable-diffusion/dream.safetensors" || after.Key != before.Key {
		t.Fatalf("keys %q then %q", before.Key, after.Key)
	}
}

func TestA1111CoverIsWrittenBesideTheModelAndReplacesTheOldOne(t *testing.T) {
	c, _, base, dir := a1111Fixture(t)
	model := filepath.Join(dir, "Stable-diffusion", "dream.safetensors")
	_ = os.WriteFile(model, []byte("w"), 0o644)
	_ = os.WriteFile(filepath.Join(dir, "Stable-diffusion", "dream.png"), []byte("old"), 0o644)
	jpeg := []byte("\xff\xd8\xff\xe0 jpeg")
	if err := c.UpdateCover(context.Background(), base, "dream.safetensors", jpeg, "image/jpeg"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "Stable-diffusion", "dream.png")); !os.IsNotExist(err) {
		t.Fatal("the old preview is still there for A1111 to find first")
	}
	data, _, err := c.Cover(context.Background(), base, "Stable-diffusion/dream.safetensors")
	if err != nil || string(data) != string(jpeg) {
		t.Fatalf("cover = %q, %v", data, err)
	}
}

func TestA1111DeleteTakesTheSidecarsWithTheFile(t *testing.T) {
	c, fake, base, dir := a1111Fixture(t)
	for _, name := range []string{"ink.safetensors", "ink.json", "ink.preview.png", "keep.safetensors"} {
		_ = os.WriteFile(filepath.Join(dir, "Lora", name), []byte("w"), 0o644)
	}
	if err := c.DeleteModel(context.Background(), base, "Lora/ink.safetensors"); err != nil {
		t.Fatal(err)
	}
	entries, _ := os.ReadDir(filepath.Join(dir, "Lora"))
	if len(entries) != 1 || entries[0].Name() != "keep.safetensors" {
		t.Fatalf("left behind: %v", entries)
	}
	fake.mu.Lock()
	defer fake.mu.Unlock()
	if len(fake.refreshed) != 1 {
		t.Fatalf("A1111 was not asked to rescan: %v", fake.refreshed)
	}
}

func TestA1111KeysCannotClimbOutOfTheModelsFolder(t *testing.T) {
	if p := localPath("/models", "Lora/../../etc/passwd"); p != "" && !strings.HasPrefix(p, filepath.FromSlash("/models")) {
		t.Fatalf("resolved outside the folder: %q", p)
	}
	if got := a1111KeyOf(`C:\sd\models\Lora\sub\ink.safetensors`, a1111LoraFolder); got != "Lora/sub/ink.safetensors" {
		t.Fatalf("windows path key = %q", got)
	}
	if got := safeFileName("../../evil/../ink.safetensors"); got != "ink.safetensors" {
		t.Fatalf("file name = %q", got)
	}
}

func TestAFolderThatIsNotTheOneA1111ReadsIsCaught(t *testing.T) {
	c, _, base, dir := a1111Fixture(t)
	for _, f := range []string{"Stable-diffusion/dream.safetensors", "Lora/ink.safetensors"} {
		if err := os.WriteFile(filepath.Join(dir, filepath.FromSlash(f)), []byte("w"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	m, err := c.A1111FolderMatch(context.Background(), base)
	if err != nil || m.Reported != 2 || m.Found != 2 || m.Files["Lora"] != 1 {
		t.Fatalf("match = %+v, %v", m, err)
	}
	// A second folder shaped like a models folder, but not the one A1111 lists from.
	other := t.TempDir()
	if err := os.MkdirAll(filepath.Join(other, "Lora"), 0o755); err != nil {
		t.Fatal(err)
	}
	c.ModelsDir = func() string { return other }
	m, err = c.A1111FolderMatch(context.Background(), base)
	if err != nil || m.Reported != 2 || m.Found != 0 || m.Missing == "" {
		t.Fatalf("match = %+v, %v", m, err)
	}
	if err := c.A1111Rescan(context.Background(), base); err != nil {
		t.Fatal(err)
	}
}
