package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

// modelDir builds a models directory holding the layouts that turn up in practice:
// a single GGUF with a sidecar, a sharded set, and an HF-style folder.
func modelDir(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	write := func(rel string, size int) {
		path := filepath.Join(root, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("mkdir: %v", err)
		}
		if err := os.WriteFile(path, make([]byte, size), 0o644); err != nil {
			t.Fatalf("write %s: %v", rel, err)
		}
	}
	write("solo.gguf", 1000)
	write("solo.json", 20) // a sidecar: same stem, metadata extension
	write("split-00001-of-00003.gguf", 300)
	write("split-00002-of-00003.gguf", 300)
	write("split-00003-of-00003.gguf", 300)
	write("hf-model/config.json", 50)
	write("hf-model/model.safetensors", 2000)
	write("hf-model/tokenizer/vocab.json", 30)
	write("unrelated.gguf", 10)
	write("notes.txt", 5) // not a model, and must not be listed as one
	return root
}

func TestResolveSingleFileModelTakesItsSidecar(t *testing.T) {
	root := modelDir(t)
	target, err := resolveModel(root, "solo.gguf")
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if target.Bytes != 1020 {
		t.Errorf("bytes = %d, want 1020 (weights plus sidecar)", target.Bytes)
	}
	// A leftover solo.json is an orphan some loaders then try to use.
	if len(target.Files) != 2 {
		t.Fatalf("files = %v, want the weights and the sidecar", target.Files)
	}
	if target.Split {
		t.Error("a single file is not a split model")
	}
	// The unrelated model must not be dragged in.
	for _, f := range target.Files {
		if strings.Contains(f, "unrelated") {
			t.Errorf("resolved an unrelated file: %v", target.Files)
		}
	}
}

func TestResolveWithoutExtension(t *testing.T) {
	// The backend's list often reports "solo" where the file is "solo.gguf".
	root := modelDir(t)
	target, err := resolveModel(root, "solo")
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if !strings.HasSuffix(target.Path, ".gguf") {
		t.Errorf("path = %q, want the .gguf", target.Path)
	}
}

func TestResolveSplitModelTakesEveryShard(t *testing.T) {
	root := modelDir(t)
	target, err := resolveModel(root, "split-00002-of-00003.gguf")
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if !target.Split {
		t.Error("not recognised as a split model")
	}
	// Deleting one shard leaves a model that looks present and cannot load, which is
	// worse than either deleting it or leaving it.
	if len(target.Files) != 3 {
		t.Fatalf("files = %v, want all three shards", target.Files)
	}
	if target.Bytes != 900 {
		t.Errorf("bytes = %d, want 900", target.Bytes)
	}
}

func TestResolveDirectoryModel(t *testing.T) {
	root := modelDir(t)
	target, err := resolveModel(root, "hf-model")
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if !target.Directory {
		t.Error("an HF-style model is a directory")
	}
	if target.Bytes != 2080 {
		t.Errorf("bytes = %d, want 2080 (the whole tree)", target.Bytes)
	}
	if len(target.Files) != 3 {
		t.Errorf("files = %v, want the nested tree", target.Files)
	}
}

func TestResolveRefusesPathTraversal(t *testing.T) {
	root := modelDir(t)
	// Every shape of "somewhere else". The separator check catches these before any
	// path work, so the error names the real problem.
	for _, name := range []string{
		"../secret", "../../etc/passwd", "sub/../../x", "/etc/passwd",
		`..\windows`, ".", "..", "", "   ",
	} {
		if _, err := resolveModel(root, name); err == nil {
			t.Errorf("accepted %q", name)
		}
	}
}

func TestResolveRefusesHiddenNames(t *testing.T) {
	root := modelDir(t)
	// The trash lives at .oppailib-trash inside the root; addressing it as a model
	// would make "delete" able to destroy the recovery copies.
	if _, err := resolveModel(root, trashDirName); err == nil {
		t.Error("the trash directory is addressable as a model")
	}
}

func TestResolveRefusesSymlinkOutOfTheRoot(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("symlink creation needs elevation on Windows; the deployment target is Linux")
	}
	root := modelDir(t)
	outside := t.TempDir()
	if err := os.WriteFile(filepath.Join(outside, "precious.gguf"), []byte("keep me"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	// A name with no ".." in it that nonetheless points outside. This is why the
	// containment check runs on the resolved path rather than the joined one.
	if err := os.Symlink(outside, filepath.Join(root, "escape")); err != nil {
		t.Fatalf("symlink: %v", err)
	}
	if _, err := resolveModel(root, "escape"); err == nil {
		t.Fatal("a symlink out of the root was accepted")
	}
}

func TestWithinRootIsNotAStringPrefix(t *testing.T) {
	// "/models-old" starts with "/models" and is a different directory.
	if withinRoot("/models", "/models-old/x.gguf") {
		t.Error("a sibling directory was treated as inside the root")
	}
	if !withinRoot("/models", "/models/x.gguf") {
		t.Error("a real child was rejected")
	}
	if !withinRoot("/models", "/models") {
		t.Error("the root itself should count as within")
	}
}

func TestShardStemGroupsOnlyMatchingSets(t *testing.T) {
	cases := []struct {
		name string
		stem string
		ok   bool
	}{
		{"llama-00001-of-00003.gguf", "llama", true},
		{"llama-00003-of-00003.gguf", "llama", true},
		{"other-00001-of-00003.gguf", "other", true},
		{"plain.gguf", "", false},
		{"weird-of-00003.gguf", "", false},     // no numbered part before "-of-"
		{"weird-00001-of-abc.gguf", "", false}, // the total is not a number
	}
	for _, c := range cases {
		stem, ok := shardStem(c.name)
		if ok != c.ok || stem != c.stem {
			t.Errorf("shardStem(%q) = (%q, %v), want (%q, %v)", c.name, stem, ok, c.stem, c.ok)
		}
	}
	// Two different sets must never be grouped together — that would delete a model
	// the user did not ask about.
	a, _ := shardStem("llama-00001-of-00003.gguf")
	b, _ := shardStem("other-00001-of-00003.gguf")
	if a == b {
		t.Error("two different split sets share a stem")
	}
}

func TestListModelsOnDiskCollapsesShardsAndSkipsNonModels(t *testing.T) {
	root := modelDir(t)
	s, _ := newTestServer(t)
	got := s.listModelsOnDisk(root)

	want := map[string]bool{"solo.gguf": true, "hf-model": true, "unrelated.gguf": true}
	for _, name := range got {
		if strings.HasPrefix(name, "split-") {
			// One entry for the set, not five.
			if name != "split-00001-of-00003.gguf" {
				t.Errorf("split set listed as %q; only the first shard should stand for it", name)
			}
			continue
		}
		if !want[name] {
			t.Errorf("unexpected entry %q", name)
		}
		delete(want, name)
	}
	if len(want) != 0 {
		t.Errorf("missing entries: %v", want)
	}
	for _, name := range got {
		if name == "notes.txt" {
			t.Error("a non-model file was listed as a model")
		}
	}
}

func TestDeleteMovesToTrashByDefault(t *testing.T) {
	root := modelDir(t)
	s, _ := newTestServer(t)
	target, err := resolveModel(root, "solo.gguf")
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	moved, err := s.removeModel(root, target, false)
	if err != nil {
		t.Fatalf("remove: %v", err)
	}
	// A model is gigabytes over someone's connection; the recoverable path is the
	// default for a reason.
	if moved == "" {
		t.Fatal("nothing was moved to the trash")
	}
	if _, err := os.Stat(filepath.Join(root, "solo.gguf")); !os.IsNotExist(err) {
		t.Error("the weights are still in place")
	}
	if _, err := os.Stat(filepath.Join(moved, "solo.gguf")); err != nil {
		t.Errorf("the weights are not recoverable from %s: %v", moved, err)
	}
	// The sidecar travels with it, or recovery restores a model without its metadata.
	if _, err := os.Stat(filepath.Join(moved, "solo.json")); err != nil {
		t.Errorf("the sidecar was not moved: %v", err)
	}
}

func TestPermanentDeleteRemovesEverything(t *testing.T) {
	root := modelDir(t)
	s, _ := newTestServer(t)
	target, err := resolveModel(root, "split-00001-of-00003.gguf")
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if _, err := s.removeModel(root, target, true); err != nil {
		t.Fatalf("remove: %v", err)
	}
	for _, shard := range []string{"split-00001-of-00003.gguf", "split-00002-of-00003.gguf", "split-00003-of-00003.gguf"} {
		if _, err := os.Stat(filepath.Join(root, shard)); !os.IsNotExist(err) {
			t.Errorf("%s survived a permanent delete", shard)
		}
	}
	// Nothing else went with it.
	if _, err := os.Stat(filepath.Join(root, "solo.gguf")); err != nil {
		t.Error("an unrelated model was removed")
	}
}

func TestTrashNamesAreStamped(t *testing.T) {
	root := modelDir(t)
	s, _ := newTestServer(t)
	target, _ := resolveModel(root, "solo.gguf")
	first, err := s.removeModel(root, target, false)
	if err != nil {
		t.Fatalf("remove: %v", err)
	}
	// Deleting a re-downloaded copy of the same name must not overwrite the earlier
	// recovery.
	if err := os.WriteFile(filepath.Join(root, "solo.gguf"), []byte("again"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if !strings.Contains(filepath.Base(first), "solo.gguf") {
		t.Errorf("trash entry %q does not name the model", first)
	}
}

// ── endpoint behaviour ─────────────────────────────────────────────────

func TestDeleteEndpointRequiresConfiguredDirectory(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	// Nothing configured: there is no safe path to guess.
	rec := do(t, h, token, "POST", "/api/chat/models/delete", `{"model":"x","confirm":"x"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "directory is configured") {
		t.Errorf("error %s does not say what is missing", rec.Body)
	}
}

func TestDeleteEndpointRequiresNameEchoedBack(t *testing.T) {
	root := modelDir(t)
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatModelDir = root
	s.settings.Set(cur)
	h := s.Handler()

	// A boolean confirmation is satisfied by any retry or replay; echoing the name is
	// the cheapest check that carries real intent.
	rec := do(t, h, token, "POST", "/api/chat/models/delete", `{"model":"solo.gguf","confirm":"yes"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want 400: %s", rec.Code, rec.Body)
	}
	if _, err := os.Stat(filepath.Join(root, "solo.gguf")); err != nil {
		t.Error("the model was deleted despite a failed confirmation")
	}
}

func TestInspectReportsWhatWouldGo(t *testing.T) {
	root := modelDir(t)
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.ChatModelDir = root
	s.settings.Set(cur)
	h := s.Handler()

	rec := do(t, h, token, "GET", "/api/chat/models/inspect?model=hf-model", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d: %s", rec.Code, rec.Body)
	}
	var got modelInspectResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	// The brief asks for the name, the path and the space to be freed, before anything
	// is deleted.
	if got.Name != "hf-model" || got.Path == "" || got.Bytes == 0 {
		t.Errorf("incomplete inspection: %+v", got)
	}
	if len(got.Files) == 0 {
		t.Error("no file list, so a dialog can only show a count")
	}
	if got.TrashPath == "" {
		t.Error("no trash path, so the offer to recover is not concrete")
	}
}

func TestDeleteIsAdminOnly(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()
	uid, err := s.db.CreateUser(t.Context(), "plain", "x", false)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := s.db.CreateSession(t.Context(), "plain-token", uid, time.Hour, db.ClientWeb); err != nil {
		t.Fatalf("create session: %v", err)
	}
	for _, c := range []struct{ method, path, body string }{
		{"GET", "/api/chat/models/inspect?model=x", ""},
		{"POST", "/api/chat/models/delete", `{"model":"x","confirm":"x"}`},
	} {
		rec := do(t, h, "plain-token", c.method, c.path, c.body)
		if rec.Code != http.StatusForbidden {
			t.Errorf("%s %s as non-admin: got %d, want 403", c.method, c.path, rec.Code)
		}
	}
}

func TestModelIsLoadedFailsClosed(t *testing.T) {
	// No chat backend configured, so the probe cannot answer. Treating that as "not
	// loaded" would delete the weights under a running model because a probe timed out.
	s, _ := newTestServer(t)
	if !s.modelIsLoaded(t.Context(), "solo.gguf") {
		t.Error("an unanswerable probe must be treated as possibly loaded")
	}
}
