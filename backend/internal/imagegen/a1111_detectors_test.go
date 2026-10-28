package imagegen

import (
	"archive/zip"
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// writeZip makes an archive of name → contents in dir.
func writeZip(t *testing.T, dir string, files map[string]string, order []string) string {
	t.Helper()
	p := filepath.Join(dir, "detectors.zip")
	f, err := os.Create(p)
	if err != nil {
		t.Fatal(err)
	}
	zw := zip.NewWriter(f)
	for _, name := range order {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write([]byte(files[name]))
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	_ = f.Close()
	return p
}

func TestADetectorArchiveUnpacksToItsPtFilesAndNothingElse(t *testing.T) {
	src, dst := t.TempDir(), t.TempDir()
	order := []string{"readme.txt", "models/Eyes.pt", "__MACOSX/models/._Eyes.pt", "sample.png", "Nipples-seg.PT"}
	archive := writeZip(t, src, map[string]string{
		"readme.txt": "hi", "models/Eyes.pt": "eyes", "__MACOSX/models/._Eyes.pt": "fork",
		"sample.png": "png", "Nipples-seg.PT": "nipples",
	}, order)
	got, err := unpackDetectors(archive, dst)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].Name != "Eyes.pt" || got[1].Name != "Nipples-seg.PT" {
		t.Fatalf("unpacked %+v", got)
	}
	if got[0].SHA256 == "" {
		t.Error("an unpacked detector was not hashed")
	}
	entries, _ := os.ReadDir(dst)
	if len(entries) != 2 {
		t.Fatalf("the folder holds %d files, want the two detectors", len(entries))
	}
	if b, _ := os.ReadFile(filepath.Join(dst, "Eyes.pt")); string(b) != "eyes" {
		t.Errorf("Eyes.pt holds %q", b)
	}
}

func TestADetectorAlreadyInTheFolderIsKeptRatherThanOverwritten(t *testing.T) {
	src, dst := t.TempDir(), t.TempDir()
	_ = os.WriteFile(filepath.Join(dst, "Eyes.pt"), []byte("tuned"), 0o644)
	archive := writeZip(t, src, map[string]string{"Eyes.pt": "fresh"}, []string{"Eyes.pt"})
	got, err := unpackDetectors(archive, dst)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || !got[0].Existed {
		t.Fatalf("unpacked %+v", got)
	}
	if b, _ := os.ReadFile(filepath.Join(dst, "Eyes.pt")); string(b) != "tuned" {
		t.Errorf("the file there was replaced with %q", b)
	}
}

func TestAnArchiveWithoutADetectorIsRefused(t *testing.T) {
	src, dst := t.TempDir(), t.TempDir()
	archive := writeZip(t, src, map[string]string{"workflow.json": "{}"}, []string{"workflow.json"})
	if _, err := unpackDetectors(archive, dst); err == nil {
		t.Fatal("an archive of no .pt files was unpacked")
	}
}

func TestDetectorsAreListedFromTheAdetailerFolderAndItsSubfolders(t *testing.T) {
	dir := t.TempDir()
	_ = os.MkdirAll(filepath.Join(dir, "Stable-diffusion"), 0o755)
	_ = os.MkdirAll(filepath.Join(dir, "adetailer", "body"), 0o755)
	_ = os.WriteFile(filepath.Join(dir, "adetailer", "Eyes.pt"), []byte("e"), 0o644)
	_ = os.WriteFile(filepath.Join(dir, "adetailer", "Eyes.preview.png"), []byte("p"), 0o644)
	_ = os.WriteFile(filepath.Join(dir, "adetailer", "body", "feet.pt"), []byte("ff"), 0o644)
	c := New()
	c.ModelsDir = func() string { return dir }
	c.HashCachePath = filepath.Join(t.TempDir(), "hashes.json")
	got, err := c.A1111DetectorFiles()
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].Name != "Eyes.pt" || got[1].Key != "adetailer/body/feet.pt" || got[1].Size != 2 {
		t.Fatalf("listed %+v", got)
	}
	if err := c.A1111DeleteDetector("adetailer/Eyes.pt"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "adetailer", "Eyes.preview.png")); !os.IsNotExist(err) {
		t.Error("the deleted detector's cover was left behind")
	}
	if err := c.A1111DeleteDetector("Lora/ink.safetensors"); err == nil {
		t.Error("a LoRA was deleted as a detector")
	}
}

func TestADetectorInstalledAsAnArchiveArrivesAsItsPtFiles(t *testing.T) {
	c, _, base, dir := a1111Fixture(t)
	var archive bytes.Buffer
	zw := zip.NewWriter(&archive)
	for _, name := range []string{"Eyes.pt", "readme.md"} {
		w, _ := zw.Create(name)
		_, _ = w.Write([]byte(name))
	}
	_ = zw.Close()
	files := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/zip")
		_, _ = w.Write(archive.Bytes())
	}))
	t.Cleanup(files.Close)
	job, err := c.InstallModel(context.Background(), base, InstallSpec{
		Source: files.URL + "/api/download/models/9", Type: "detection", FileName: "eyesDetection_v10.zip",
	})
	if err != nil {
		t.Fatal(err)
	}
	done := waitForJob(t, c, base, job.ID)
	if done.Status != "completed" || done.ModelKey != "adetailer/Eyes.pt" || len(done.Files) != 1 {
		t.Fatalf("job = %+v", done)
	}
	entries, _ := os.ReadDir(filepath.Join(dir, "adetailer"))
	if len(entries) != 1 || entries[0].Name() != "Eyes.pt" {
		t.Fatalf("the detector folder holds %v, want Eyes.pt alone", entries)
	}
}
