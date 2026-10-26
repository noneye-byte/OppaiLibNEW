package imagegen

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"hash/crc32"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// pngWithText is a small PNG carrying A1111's "parameters" text, written where A1111
// writes it: straight after the header, before the pixels.
func pngWithText(t *testing.T, w, h int, text string) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{uint8(x), uint8(y), 90, 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	if text == "" {
		return buf.Bytes()
	}
	raw := buf.Bytes()
	ihdrEnd := 8 + 8 + 13 + 4
	data := append([]byte("parameters\x00"), []byte(text)...)
	chunk := make([]byte, 8, 12+len(data))
	binary.BigEndian.PutUint32(chunk[:4], uint32(len(data)))
	copy(chunk[4:8], "tEXt")
	chunk = append(chunk, data...)
	crc := crc32.ChecksumIEEE(append([]byte("tEXt"), data...))
	chunk = binary.BigEndian.AppendUint32(chunk, crc)
	out := append([]byte{}, raw[:ihdrEnd]...)
	out = append(out, chunk...)
	return append(out, raw[ihdrEnd:]...)
}

const sampleInfotext = `masterpiece, 1girl, <lora:ink_style:0.8>, red hair
Negative prompt: lowres, bad hands
Steps: 28, Sampler: DPM++ 2M, Schedule type: Karras, CFG scale: 6.5, Seed: 123456789, Size: 832x1216, Model hash: abc123, Model: ponyDiffusionV6XL, Clip skip: 2, Lora hashes: "ink_style: 9f8e7d", Version: v1.10.1`

func TestInfotextReadsThePromptNegativeAndSettings(t *testing.T) {
	m := ParseInfotext(sampleInfotext)
	if m.Prompt != "masterpiece, 1girl, <lora:ink_style:0.8>, red hair" || m.NegativePrompt != "lowres, bad hands" {
		t.Fatalf("prompt %q negative %q", m.Prompt, m.NegativePrompt)
	}
	if m.Steps != 28 || m.CfgScale != 6.5 || m.Seed != 123456789 || m.Width != 832 || m.Height != 1216 || m.ClipSkip != 2 {
		t.Fatalf("settings %+v", m)
	}
	if m.Sampler != "DPM++ 2M Karras" || m.Model != "ponyDiffusionV6XL" || m.ModelHash != "abc123" {
		t.Fatalf("sampler %q model %q hash %q", m.Sampler, m.Model, m.ModelHash)
	}
	if len(m.Loras) != 1 || m.Loras[0].Name != "ink_style" || m.Loras[0].Weight != 0.8 || m.Loras[0].Hash != "9f8e7d" {
		t.Fatalf("loras %+v", m.Loras)
	}
}

func TestInfotextWithNoSettingsLineIsAllPrompt(t *testing.T) {
	m := ParseInfotext("just a prompt\nover two lines")
	if m.Prompt != "just a prompt\nover two lines" || m.Steps != 0 || m.NegativePrompt != "" {
		t.Fatalf("%+v", m)
	}
	if ParseInfotext("").Loras == nil {
		t.Fatal("loras must be an empty list, not null, for the client")
	}
}

func TestPngTextFindsTheParametersChunk(t *testing.T) {
	got, err := pngText(bytes.NewReader(pngWithText(t, 4, 4, sampleInfotext)), "parameters")
	if err != nil || got != sampleInfotext {
		t.Fatalf("got %q, %v", got, err)
	}
	got, _ = pngText(bytes.NewReader(pngWithText(t, 4, 4, "")), "parameters")
	if got != "" {
		t.Fatalf("a PNG with no text read %q", got)
	}
}

// outputsFixture is an outputs folder laid out as A1111 writes it, served to a client
// that sees an A1111 backend.
func outputsFixture(t *testing.T) (*Client, string, string) {
	t.Helper()
	root := t.TempDir()
	write := func(rel string, data []byte, age time.Duration) {
		p := filepath.Join(root, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, data, 0o644); err != nil {
			t.Fatal(err)
		}
		at := time.Now().Add(-age)
		_ = os.Chtimes(p, at, at)
	}
	write("txt2img-images/2026-10-24/00001-1.png", pngWithText(t, 8, 8, sampleInfotext), 3*time.Hour)
	write("txt2img-images/2026-10-25/00002-2.png", pngWithText(t, 64, 32, ""), time.Hour)
	write("img2img-images/2026-10-25/00003-3.png", pngWithText(t, 600, 400, ""), 2*time.Hour)
	write("txt2img-images/2026-10-25/00002-2.txt", []byte("settings"), time.Hour)
	write("txt2img-images/.thumbs/hidden.png", pngWithText(t, 2, 2, ""), 0)

	a1111 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/sdapi/v1/options" || r.URL.Path == "/sdapi/v1/sd-models" {
			_, _ = w.Write([]byte(`{}`))
			return
		}
		http.NotFound(w, r)
	}))
	t.Cleanup(a1111.Close)
	c := New()
	c.OutputsDir = func() string { return root }
	c.ThumbCacheDir = t.TempDir()
	c.kinds[a1111.URL] = kindEntry{kind: KindA1111, at: time.Now()}
	return c, root, a1111.URL
}

func TestTheOutputsFolderIsAGalleryWithAFolderPerBoard(t *testing.T) {
	c, _, base := outputsFixture(t)
	ctx := context.Background()
	boards, err := c.Boards(ctx, base)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]int{"none": 3, "txt2img-images": 2, "img2img-images": 1}
	if len(boards) != len(want) {
		t.Fatalf("boards %+v", boards)
	}
	for _, b := range boards {
		if want[b.ID] != b.Count {
			t.Fatalf("board %s has %d, want %d", b.ID, b.Count, want[b.ID])
		}
	}

	page, err := c.BoardImages(ctx, base, "none", "newest", 0, 10)
	if err != nil {
		t.Fatal(err)
	}
	labels := func(p *GalleryPage) []string {
		var out []string
		for _, it := range p.Items {
			out = append(out, it.Label)
		}
		return out
	}
	if got := labels(page); len(got) != 3 || got[0] != "00002-2.png" || got[1] != "00003-3.png" || got[2] != "00001-1.png" {
		t.Fatalf("newest first: %v", got)
	}
	if page.Items[0].Width != 64 || page.Items[0].Height != 32 {
		t.Fatalf("dimensions %+v", page.Items[0])
	}
	page, _ = c.BoardImages(ctx, base, "none", "largest", 0, 10)
	if got := labels(page); got[0] != "00003-3.png" {
		t.Fatalf("largest first: %v", got)
	}
	page, _ = c.BoardImages(ctx, base, "none", "oldest", 1, 1)
	if got := labels(page); len(got) != 1 || got[0] != "00003-3.png" || page.Total != 3 {
		t.Fatalf("oldest, second page of one: %v of %d", got, page.Total)
	}
	page, _ = c.BoardImages(ctx, base, "img2img-images", "", 0, 10)
	if got := labels(page); len(got) != 1 || got[0] != "00003-3.png" {
		t.Fatalf("one board: %v", got)
	}
}

func TestAGalleryPictureReadsItsSettingsAndHasAThumbnail(t *testing.T) {
	c, _, base := outputsFixture(t)
	ctx := context.Background()
	page, _ := c.BoardImages(ctx, base, "none", "oldest", 0, 10)
	first := page.Items[0].Name
	meta, err := c.GalleryImageMetadata(ctx, base, first)
	if err != nil || meta.Seed != 123456789 || meta.Backend != "a1111" {
		t.Fatalf("meta %+v, %v", meta, err)
	}
	if got := c.GalleryImagePrompt(ctx, base, first); got != "masterpiece, 1girl, <lora:ink_style:0.8>, red hair" {
		t.Fatalf("prompt %q", got)
	}
	big := page.Items[1].Name // 600×400
	data, ct, err := c.GalleryImage(ctx, base, big, true)
	if err != nil || ct != "image/jpeg" {
		t.Fatalf("thumb: %v %q", err, ct)
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || cfg.Width != a1111ThumbWidth || cfg.Height != 213 {
		t.Fatalf("thumb is %dx%d, %v", cfg.Width, cfg.Height, err)
	}
	full, _, err := c.GalleryImage(ctx, base, big, false)
	if err != nil || !bytes.HasPrefix(full, []byte("\x89PNG")) {
		t.Fatalf("full: %v", err)
	}
}

func TestAGalleryNameCannotReachOutsideTheOutputsFolder(t *testing.T) {
	c, root, base := outputsFixture(t)
	outside := filepath.Join(filepath.Dir(root), "secret.png")
	_ = os.WriteFile(outside, pngWithText(t, 2, 2, ""), 0o644)
	t.Cleanup(func() { os.Remove(outside) })
	for _, rel := range []string{"../secret.png", "/etc/passwd.png", "txt2img-images/../../secret.png", "txt2img-images/2026-10-25/00002-2.txt", "not base64!"} {
		name := base64.RawURLEncoding.EncodeToString([]byte(rel))
		if rel == "not base64!" {
			name = rel
		}
		if _, _, err := c.GalleryImage(context.Background(), base, name, false); err == nil {
			t.Fatalf("%q was served", rel)
		}
		if err := c.DeleteGalleryImages(context.Background(), base, []string{name}); err == nil {
			t.Fatalf("%q was deleted", rel)
		}
	}
	if _, err := os.Stat(outside); err != nil {
		t.Fatal("the file outside the folder is gone")
	}
}

func TestDeletingAGalleryPictureTakesItsSettingsFileToo(t *testing.T) {
	c, root, base := outputsFixture(t)
	ctx := context.Background()
	name := base64.RawURLEncoding.EncodeToString([]byte("txt2img-images/2026-10-25/00002-2.png"))
	if err := c.DeleteGalleryImages(ctx, base, []string{name}); err != nil {
		t.Fatal(err)
	}
	for _, rel := range []string{"00002-2.png", "00002-2.txt"} {
		if _, err := os.Stat(filepath.Join(root, "txt2img-images", "2026-10-25", rel)); !os.IsNotExist(err) {
			t.Fatalf("%s is still there", rel)
		}
	}
	page, _ := c.BoardImages(ctx, base, "none", "", 0, 10)
	if page.Total != 2 {
		t.Fatalf("the listing still has %d", page.Total)
	}
	if _, err := c.CreateBoard(ctx, base, "x"); err == nil {
		t.Fatal("a board was made in a folder gallery")
	}
}

func TestTheWebuiFolderGivenByHandOpensItsOutputsFolder(t *testing.T) {
	webui := t.TempDir()
	outputs := filepath.Join(webui, "outputs")
	if err := os.MkdirAll(filepath.Join(outputs, "txt2img-images"), 0o755); err != nil {
		t.Fatal(err)
	}
	c := New()
	c.ModelsDir = func() string { return "" }
	c.OutputsDir = func() string { return webui }
	if got := c.A1111OutputsDir(); got != outputs {
		t.Fatalf("outputs = %q, want %q", got, outputs)
	}
	// The outputs folder itself is taken as it is, not looked inside again.
	c.OutputsDir = func() string { return outputs }
	if got := c.A1111OutputsDir(); got != outputs {
		t.Fatalf("outputs = %q, want %q", got, outputs)
	}
}

func TestAnOutputsFolderMountedUnderAnyNameIsFound(t *testing.T) {
	t.Cleanup(func() {
		a1111MountInfo = "/proc/self/mountinfo"
		notModelMounts = []string{"/proc", "/sys", "/dev", "/etc", "/run", "/usr", "/tmp", "/var", "/opt", "/config", "/media", "/db", "/cache"}
		discoveredOutputs.at = time.Time{}
	})
	mounted := t.TempDir()
	if err := os.MkdirAll(filepath.Join(mounted, "img2img-images"), 0o755); err != nil {
		t.Fatal(err)
	}
	notModelMounts = []string{"/config"}
	info := filepath.Join(t.TempDir(), "mountinfo")
	lines := "22 1 0:21 / / rw - overlay overlay rw\n" +
		"31 22 0:41 / " + filepath.ToSlash(mounted) + " rw - fuse.shfs shfs rw\n"
	if err := os.WriteFile(info, []byte(lines), 0o644); err != nil {
		t.Fatal(err)
	}
	a1111MountInfo = info
	discoveredOutputs.at = time.Time{}
	c := New()
	c.ModelsDir = func() string { return "" }
	if got := c.A1111OutputsDir(); got != mounted && got != filepath.ToSlash(mounted) {
		t.Fatalf("outputs = %q, want %q", got, mounted)
	}
}

func TestAnOutputsSettingThatIsNotThereSaysWhichPath(t *testing.T) {
	t.Cleanup(func() { a1111MountInfo = "/proc/self/mountinfo"; discoveredOutputs.at = time.Time{} })
	a1111MountInfo = filepath.Join(t.TempDir(), "no-mountinfo")
	discoveredOutputs.at = time.Time{}
	c := New()
	c.ModelsDir = func() string { return "" }
	c.OutputsDir = func() string { return "/mnt/user/appdata/a1111/outputs" }
	if dir := c.A1111OutputsDir(); dir != "" {
		t.Fatalf("outputs = %q, want none", dir)
	}
	if p := c.A1111OutputsProblem(); !strings.Contains(p, "/mnt/user/appdata/a1111/outputs") {
		t.Fatalf("problem = %q", p)
	}
	_, err := c.a1111Outputs()
	if !errors.Is(err, ErrNoOutputsDir) {
		t.Fatalf("err = %v, want ErrNoOutputsDir", err)
	}
	// Nothing set and nothing found is the plain instruction.
	c.OutputsDir = func() string { return "" }
	if p := c.A1111OutputsProblem(); p != ErrNoOutputsDir.Error() {
		t.Fatalf("problem = %q", p)
	}
}
