package comic

import (
	"archive/zip"
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/png"
	"io"
	"strings"
	"testing"
)

// buildZip writes a zip holding one entry per name. Image entries get a real
// 2x3 PNG so decoding paths (Cover) work; anything else gets junk bytes.
func buildZip(t *testing.T, names ...string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for _, name := range names {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatalf("create %s: %v", name, err)
		}
		if _, err := w.Write(pngBytes(t)); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("close zip: %v", err)
	}
	return buf.Bytes()
}

func pngBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 2, 3))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

func openBytes(t *testing.T, b []byte) *Archive {
	t.Helper()
	a, err := Open(bytes.NewReader(b), int64(len(b)))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	return a
}

// Page order is the whole contract of a reader: lexical sorting would put page
// 10 before page 2 and silently scramble every comic with 10+ pages.
func TestOpenSortsPagesNaturally(t *testing.T) {
	raw := buildZip(t, "page10.jpg", "page2.jpg", "page1.jpg", "page20.jpg", "page3.jpg")
	a := openBytes(t, raw)

	if got := a.PageCount(); got != 5 {
		t.Fatalf("PageCount() = %d, want 5", got)
	}
	want := []string{"page1.jpg", "page2.jpg", "page3.jpg", "page10.jpg", "page20.jpg"}
	for i, wantName := range want {
		if got := a.pages[i].Name; got != wantName {
			t.Errorf("page %d = %q, want %q", i+1, got, wantName)
		}
	}
}

// Archivers leave sidecars behind that carry image extensions but aren't pages.
// Counting them would offset every page number the reader shows.
func TestOpenSkipsNonPageEntries(t *testing.T) {
	raw := buildZip(t,
		"001.jpg",
		"__MACOSX/._001.jpg",
		".hidden.png",
		"notes.txt",
		"002.jpg",
	)
	a := openBytes(t, raw)

	if got := a.PageCount(); got != 2 {
		t.Fatalf("PageCount() = %d, want 2 (got %v)", got, names(a))
	}
}

func names(a *Archive) []string {
	out := make([]string, 0, len(a.pages))
	for _, p := range a.pages {
		out = append(out, p.Name)
	}
	return out
}

func TestPageStreamsBytesAndContentType(t *testing.T) {
	raw := buildZip(t, "001.png", "002.png")
	a := openBytes(t, raw)

	rc, ct, err := a.Page(0)
	if err != nil {
		t.Fatalf("Page(0): %v", err)
	}
	defer rc.Close()
	if !strings.HasPrefix(ct, "image/png") {
		t.Errorf("content type = %q, want image/png", ct)
	}
	got, err := io.ReadAll(rc)
	if err != nil {
		t.Fatalf("read page: %v", err)
	}
	if !bytes.Equal(got, pngBytes(t)) {
		t.Errorf("page bytes did not round-trip")
	}
}

func TestPageOutOfRange(t *testing.T) {
	a := openBytes(t, buildZip(t, "001.png"))
	for _, i := range []int{-1, 1, 99} {
		if _, _, err := a.Page(i); err == nil {
			t.Errorf("Page(%d) succeeded, want an error", i)
		}
	}
}

// A .cbr or .pdf isn't a zip. It must report ErrUnsupported so the UI can offer
// the download instead of showing a broken reader.
func TestOpenRejectsNonZip(t *testing.T) {
	raw := []byte("Rar!\x1a\x07\x00 not actually a zip file, just bytes")
	_, err := Open(bytes.NewReader(raw), int64(len(raw)))
	if !errors.Is(err, ErrUnsupported) {
		t.Fatalf("err = %v, want ErrUnsupported", err)
	}
}

// A zip full of non-images is a container we can open but not read as a comic.
func TestOpenRejectsArchiveWithNoPages(t *testing.T) {
	raw := buildZip(t, "readme.txt", "meta.xml")
	_, err := Open(bytes.NewReader(raw), int64(len(raw)))
	if !errors.Is(err, ErrNoPages) {
		t.Fatalf("err = %v, want ErrNoPages", err)
	}
}

func TestCoverDownscalesToJPEG(t *testing.T) {
	a := openBytes(t, buildZip(t, "001.png"))
	cover, err := a.Cover(1) // 1px wide forces the scaling path
	if err != nil {
		t.Fatalf("Cover: %v", err)
	}
	cfg, format, err := image.DecodeConfig(bytes.NewReader(cover))
	if err != nil {
		t.Fatalf("decode cover: %v", err)
	}
	if format != "jpeg" {
		t.Errorf("format = %q, want jpeg", format)
	}
	if cfg.Width != 1 {
		t.Errorf("width = %d, want 1", cfg.Width)
	}
}

func TestNaturalLess(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{
		{"page2.jpg", "page10.jpg", true},
		{"page10.jpg", "page2.jpg", false},
		{"ch1/p2.jpg", "ch1/p10.jpg", true},
		{"ch2/p1.jpg", "ch10/p1.jpg", true},
		{"a.jpg", "b.jpg", true},
		{"Page1.jpg", "page1.jpg", false}, // case-insensitive: equal, so not less
		{"p01.jpg", "p2.jpg", true},       // zero-padding must not beat magnitude
	}
	for _, c := range cases {
		if got := naturalLess(c.a, c.b); got != c.want {
			t.Errorf("naturalLess(%q, %q) = %v, want %v", c.a, c.b, got, c.want)
		}
	}
}
