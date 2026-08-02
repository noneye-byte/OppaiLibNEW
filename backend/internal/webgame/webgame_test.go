package webgame

import (
	"archive/zip"
	"bytes"
	"errors"
	"io"
	"testing"
)

// buildZip packs the given path→contents into a zip and returns the bytes.
func buildZip(t *testing.T, entries map[string]string) ([]byte, int64) {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, body := range entries {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := w.Write([]byte(body)); err != nil {
			t.Fatal(err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes(), int64(buf.Len())
}

func open(t *testing.T, entries map[string]string) *Build {
	t.Helper()
	data, size := buildZip(t, entries)
	b, err := Open(bytes.NewReader(data), size)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	return b
}

func read(t *testing.T, b *Build, name string) string {
	t.Helper()
	rc, _, err := b.Open(name)
	if err != nil {
		t.Fatalf("Open(%q): %v", name, err)
	}
	defer rc.Close()
	data, err := io.ReadAll(rc)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func TestOpenFindsRootIndex(t *testing.T) {
	b := open(t, map[string]string{
		"index.html":    "<html>game</html>",
		"game.js":       "console.log(1)",
		"data/blob.bin": "bytes",
	})
	if got := read(t, b, "index.html"); got != "<html>game</html>" {
		t.Fatalf("index = %q", got)
	}
	if got := read(t, b, "data/blob.bin"); got != "bytes" {
		t.Fatalf("nested asset = %q", got)
	}
}

// itch builds are frequently zipped with a single wrapper folder. The player must
// not require the user to know that.
func TestOpenStripsWrapperDirectory(t *testing.T) {
	b := open(t, map[string]string{
		"MyGame-web/index.html":      "<html>wrapped</html>",
		"MyGame-web/Build/game.wasm": "\x00asm",
	})
	if got := read(t, b, "index.html"); got != "<html>wrapped</html>" {
		t.Fatalf("index = %q", got)
	}
	if got := read(t, b, "Build/game.wasm"); got != "\x00asm" {
		t.Fatalf("wasm = %q", got)
	}
}

// When a zip holds several index.html files, the shallowest is the build root —
// a nested one belongs to a subsystem of the game, not to the game.
func TestOpenPrefersShallowestIndex(t *testing.T) {
	b := open(t, map[string]string{
		"index.html":       "<html>root</html>",
		"docs/index.html":  "<html>docs</html>",
		"a/b/c/index.html": "<html>deep</html>",
	})
	if got := read(t, b, "index.html"); got != "<html>root</html>" {
		t.Fatalf("picked the wrong index: %q", got)
	}
}

func TestOpenEmptyPathServesEntry(t *testing.T) {
	b := open(t, map[string]string{"index.html": "<html>start</html>"})
	for _, name := range []string{"", "/", ".", "index.html"} {
		if got := read(t, b, name); got != "<html>start</html>" {
			t.Fatalf("path %q served %q", name, got)
		}
	}
}

// A game with no index.html is a download, not something to play. The distinction
// is what the Play button is offered on.
func TestOpenRejectsArchiveWithoutIndex(t *testing.T) {
	data, size := buildZip(t, map[string]string{"game.exe": "MZ", "readme.txt": "hi"})
	_, err := Open(bytes.NewReader(data), size)
	if !errors.Is(err, ErrNotWebGame) {
		t.Fatalf("err = %v, want ErrNotWebGame", err)
	}
}

func TestOpenRejectsNonZip(t *testing.T) {
	data := []byte("this is not a zip file at all, not even close")
	_, err := Open(bytes.NewReader(data), int64(len(data)))
	if !errors.Is(err, ErrUnsupported) {
		t.Fatalf("err = %v, want ErrUnsupported", err)
	}
}

// The served path comes straight from a URL, so traversal must resolve to nothing
// rather than to a file outside the build.
func TestOpenRejectsTraversal(t *testing.T) {
	b := open(t, map[string]string{
		"wrapper/index.html": "<html>in</html>",
		"outside.txt":        "SHOULD NOT BE REACHABLE",
	})
	for _, bad := range []string{
		"../outside.txt",
		"../../outside.txt",
		"foo/../../outside.txt",
		"..\\outside.txt",
		"/../outside.txt",
	} {
		if _, _, err := b.Open(bad); err == nil {
			t.Fatalf("traversal %q resolved to a file", bad)
		}
	}
}

// Content types decide what the browser will execute, so the mapping must be exact
// and must not fall back to something executable.
func TestContentType(t *testing.T) {
	cases := map[string]string{
		"index.html":     "text/html; charset=utf-8",
		"Build/game.js":  "text/javascript; charset=utf-8",
		"game.wasm":      "application/wasm",
		"style.css":      "text/css; charset=utf-8",
		"art.PNG":        "image/png",
		"archive.rpa":    "application/octet-stream",
		"noextension":    "application/octet-stream",
		"weird.exe":      "application/octet-stream",
		"payload.xhtml":  "application/octet-stream",
		"data/save.json": "application/json; charset=utf-8",
	}
	for name, want := range cases {
		if got := ContentType(name); got != want {
			t.Errorf("ContentType(%q) = %q, want %q", name, got, want)
		}
	}
}

func TestHas(t *testing.T) {
	b := open(t, map[string]string{"index.html": "x", "sub/a.js": "y"})
	if !b.Has("sub/a.js") || !b.Has("index.html") {
		t.Fatal("Has missed a present file")
	}
	if b.Has("nope.js") || b.Has("../outside") {
		t.Fatal("Has reported an absent file")
	}
	if b.Entry() != "index.html" {
		t.Fatalf("Entry = %q", b.Entry())
	}
}
