// Package webgame reads an HTML5 game build out of a stored zip so it can be played
// in place, the way itch.io's own web player runs one.
//
// A "web build" here means exactly one thing: a zip with an index.html in it. That is
// the same contract itch.io enforces on an uploaded HTML build, so a zip downloaded
// from itch and imported into the library is playable without any repackaging.
//
// Nothing in this package writes, extracts, or executes anything. It resolves a
// request path to an entry in the archive and streams that entry's bytes; the
// archive stays encrypted at rest and is read through the store's random-access
// decrypting view, so playing a game never unpacks it to disk.
package webgame

import (
	"archive/zip"
	"errors"
	"io"
	"path"
	"strings"
)

// ErrNotWebGame means the blob parsed as a zip but has no index.html, so it is a
// downloadable game rather than a playable one.
var ErrNotWebGame = errors.New("webgame: archive has no index.html")

// ErrUnsupported means the blob isn't a zip at all.
var ErrUnsupported = errors.New("webgame: not a zip archive")

// Build is an opened web build: its entries, and the directory its index.html
// lives in.
type Build struct {
	// files maps a build-relative path ("index.html", "Build/game.wasm") to its
	// entry. A map rather than a scan both keeps lookup cheap and removes path
	// traversal as a concern — a request can only ever name a key that exists, so
	// "../../etc/passwd" resolves to nothing rather than to a file.
	files map[string]*zip.File
	// entry is the build-relative path of the index, always "index.html".
	entry string
}

// Open parses the archive and locates its index.html. ra must cover exactly size
// bytes of decrypted content.
func Open(ra io.ReaderAt, size int64) (*Build, error) {
	zr, err := zip.NewReader(ra, size)
	if err != nil {
		return nil, ErrUnsupported
	}

	// itch builds are packed both ways: index.html at the root, or everything under
	// a single wrapper folder the author zipped. The shallowest index.html wins, and
	// its directory becomes the build root — that is what makes a wrapper folder
	// invisible to the player instead of something the user has to know about.
	root := ""
	found := false
	for _, f := range zr.File {
		name := path.Clean(strings.ReplaceAll(f.Name, "\\", "/"))
		if path.Base(name) != "index.html" {
			continue
		}
		dir := path.Dir(name)
		if dir == "." {
			dir = ""
		}
		if !found || depth(dir) < depth(root) {
			root, found = dir, true
		}
	}
	if !found {
		return nil, ErrNotWebGame
	}

	files := make(map[string]*zip.File, len(zr.File))
	for _, f := range zr.File {
		if f.FileInfo().IsDir() {
			continue
		}
		name := path.Clean(strings.ReplaceAll(f.Name, "\\", "/"))
		rel, ok := underRoot(name, root)
		if !ok {
			// Outside the build root — a sibling readme or a second build in the same
			// zip. Not addressable, so not served.
			continue
		}
		files[rel] = f
	}
	if _, ok := files["index.html"]; !ok {
		return nil, ErrNotWebGame
	}
	return &Build{files: files, entry: "index.html"}, nil
}

// Entry is the build-relative path the player should load first.
func (b *Build) Entry() string { return b.entry }

// Open returns the contents of one build-relative path, and its size.
//
// A request for "" or a directory resolves to the entry, so both /play/ and
// /play/index.html land on the game.
func (b *Build) Open(name string) (io.ReadCloser, int64, error) {
	name = strings.TrimPrefix(path.Clean("/"+strings.ReplaceAll(name, "\\", "/")), "/")
	if name == "" || name == "." {
		name = b.entry
	}
	f, ok := b.files[name]
	if !ok {
		// A build that links "assets/" expecting the server to serve the index there.
		if f, ok = b.files[path.Join(name, "index.html")]; !ok {
			return nil, 0, errors.New("webgame: no such file in build")
		}
	}
	rc, err := f.Open()
	if err != nil {
		return nil, 0, err
	}
	return rc, int64(f.UncompressedSize64), nil
}

// Has reports whether the build contains a path, without opening it.
func (b *Build) Has(name string) bool {
	name = strings.TrimPrefix(path.Clean("/"+strings.ReplaceAll(name, "\\", "/")), "/")
	_, ok := b.files[name]
	return ok
}

// depth counts path segments, so the shallowest index.html can be picked.
func depth(dir string) int {
	if dir == "" {
		return 0
	}
	return strings.Count(dir, "/") + 1
}

// underRoot rebases an archive path onto the build root, reporting false when it
// lies outside.
func underRoot(name, root string) (string, bool) {
	if root == "" {
		if strings.HasPrefix(name, "../") || name == ".." {
			return "", false
		}
		return name, true
	}
	rel, ok := strings.CutPrefix(name, root+"/")
	if !ok {
		return "", false
	}
	return rel, true
}

// ContentType maps a build path to the type a browser needs to run it.
//
// This is deliberately an allowlist keyed on extension rather than sniffing. A web
// build is served to a browser that will execute what it is given, so the mapping
// that decides "this is JavaScript" must come from a fixed table — and anything
// unrecognised falls back to a type browsers will not execute or render.
func ContentType(name string) string {
	switch strings.ToLower(path.Ext(name)) {
	case ".html", ".htm":
		return "text/html; charset=utf-8"
	case ".js", ".mjs":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".wasm":
		return "application/wasm"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".ico":
		return "image/x-icon"
	case ".bmp":
		return "image/bmp"
	case ".mp3":
		return "audio/mpeg"
	case ".ogg", ".oga":
		return "audio/ogg"
	case ".wav":
		return "audio/wav"
	case ".m4a":
		return "audio/mp4"
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	case ".ttf":
		return "font/ttf"
	case ".otf":
		return "font/otf"
	case ".txt", ".md":
		return "text/plain; charset=utf-8"
	case ".xml":
		return "text/plain; charset=utf-8"
	default:
		// Unknown types are common in engine builds (RenPy .rpa, Unity .data,
		// Godot .pck) and are fetched by the engine, not interpreted by the browser.
		return "application/octet-stream"
	}
}
