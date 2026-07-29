package recognize

import (
	"archive/zip"
	"bytes"
	"image"
	"image/color"
	"image/gif"
	"testing"

	"github.com/youruser/oppailib/internal/models"
)

func check(t *testing.T, name string, b []byte, filename string, want models.MediaKind) {
	t.Helper()
	if got := KindFromBytes(b, filename); got != want {
		t.Errorf("%s: kind = %q, want %q", name, got, want)
	}
}

// buildGIF encodes a real GIF with the given number of frames, so the frame walk is
// tested against bytes an encoder actually produces rather than a hand-rolled fake.
func buildGIF(t *testing.T, frames int) []byte {
	t.Helper()
	g := &gif.GIF{}
	for i := 0; i < frames; i++ {
		img := image.NewPaletted(image.Rect(0, 0, 4, 4), color.Palette{color.Black, color.White})
		g.Image = append(g.Image, img)
		g.Delay = append(g.Delay, 10)
	}
	var buf bytes.Buffer
	if err := gif.EncodeAll(&buf, g); err != nil {
		t.Fatalf("encode gif: %v", err)
	}
	return buf.Bytes()
}

func TestGIFStillIsAnImage(t *testing.T) {
	// The whole point: a one-frame GIF is a picture, and must not land in the GIF
	// section next to the animations just because of its container.
	check(t, "single-frame gif", buildGIF(t, 1), "anim.gif", models.KindImage)
}

func TestGIFAnimatedIsAGIF(t *testing.T) {
	check(t, "multi-frame gif", buildGIF(t, 3), "still.gif", models.KindGIF)
}

func TestHeadersBeatTheExtension(t *testing.T) {
	// Each of these is a file whose extension lies. The bytes must win.
	check(t, "jpeg named .txt", []byte("\xff\xd8\xff\xe0blah"), "photo.txt", models.KindImage)
	check(t, "png named .mp4", []byte("\x89PNG\r\n\x1a\n....IHDR"), "x.mp4", models.KindImage)
	check(t, "matroska named .jpg", []byte("\x1a\x45\xdf\xa3\x01\x02"), "clip.jpg", models.KindVideo)
	check(t, "pdf with no extension", []byte("%PDF-1.7\n..."), "scan", models.KindComic)
	check(t, "windows exe named .png", []byte("MZ\x90\x00\x03"), "setup.png", models.KindGame)
}

func TestISOBaseMediaBrandSplitsStillFromVideo(t *testing.T) {
	mp4 := append([]byte{0, 0, 0, 0x20}, []byte("ftypisom")...)
	avif := append([]byte{0, 0, 0, 0x20}, []byte("ftypavif")...)
	check(t, "mp4", mp4, "", models.KindVideo)
	check(t, "avif", avif, "", models.KindImage)
}

func TestAnimatedWebPIsAGIF(t *testing.T) {
	still := append([]byte("RIFF\x00\x00\x00\x00WEBPVP8 "), make([]byte, 16)...)
	anim := append([]byte("RIFF\x00\x00\x00\x00WEBPVP8X"), []byte("\x00\x00\x00\x00ANIM....")...)
	check(t, "still webp", still, "", models.KindImage)
	check(t, "animated webp", anim, "", models.KindGIF)
}

func TestAPNGIsAGIF(t *testing.T) {
	apng := append([]byte("\x89PNG\r\n\x1a\n"), []byte("....IHDR........acTL....")...)
	check(t, "apng", apng, "x.png", models.KindGIF)
}

// zipOf builds a zip holding the named (empty) entries.
func zipOf(t *testing.T, names ...string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for _, n := range names {
		w, err := zw.Create(n)
		if err != nil {
			t.Fatalf("create %s: %v", n, err)
		}
		if _, err := w.Write([]byte("x")); err != nil {
			t.Fatalf("write %s: %v", n, err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("close zip: %v", err)
	}
	return buf.Bytes()
}

func TestZipOfPagesIsAComicNotAGame(t *testing.T) {
	// This is the regression that mattered: the old extension-only rule filed every
	// .zip as a game, so a comic's pages went into the games section.
	z := zipOf(t, "001.jpg", "002.jpg", "003.jpg", "004.jpg")
	check(t, "zip of pages", z, "pages.zip", models.KindComic)
}

func TestZipOfMostlyNonImagesIsAGame(t *testing.T) {
	// A game's bundle may well carry a couple of PNGs among its assets; that must
	// not be enough to make it a comic.
	z := zipOf(t, "game.exe", "data.pak", "readme.txt", "icon.png", "logo.png")
	check(t, "game bundle", z, "game.zip", models.KindGame)
}

func TestAPKIsAGame(t *testing.T) {
	// An APK is mostly a zip full of images and would otherwise read as a comic.
	z := zipOf(t, "AndroidManifest.xml", "res/a.png", "res/b.png", "res/c.png", "res/d.png")
	check(t, "apk", z, "game.apk", models.KindGame)
}

func TestUnreadableBytesFallBackToTheExtension(t *testing.T) {
	junk := []byte("not a format anyone knows")
	check(t, "unknown → mp4", junk, "clip.mp4", models.KindVideo)
	check(t, "unknown → cbz", junk, "book.cbz", models.KindComic)
	check(t, "unknown → nothing", junk, "mystery", models.KindImage)
}

func TestEmptyBlob(t *testing.T) {
	check(t, "empty", nil, "x.mp4", models.KindVideo)
}
