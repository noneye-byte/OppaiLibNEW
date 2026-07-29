// Package comic reads page images out of a comic archive without unpacking it.
//
// Archives are zip-based (.cbz, and plain .zip), which is what lets the reader
// work off an io.ReaderAt: the central directory is read from the tail of the
// blob and each page is inflated on demand. Combined with storage.OpenAt (a
// seekable, chunk-decrypting view of the encrypted blob) this means serving
// page 40 of a 300 MB archive touches only the chunks that page lives in — the
// whole comic is never decrypted, buffered, or handed to the browser.
//
// Only zip containers can be read in-app. RAR (.cbr) and PDF need a decoder we
// don't ship, so Open reports ErrUnsupported for them and the UI falls back to
// offering the file as a download.
package comic

import (
	"archive/zip"
	"bytes"
	"errors"
	"image"
	_ "image/gif" // decoders for Cover()
	"image/jpeg"
	_ "image/png"
	"io"
	"mime"
	"path"
	"sort"
	"strings"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

// ErrUnsupported means the blob isn't a zip container (e.g. .cbr / .pdf).
var ErrUnsupported = errors.New("comic: not a zip-based archive (.cbz/.zip)")

// ErrNoPages means the archive parsed but held no page images.
var ErrNoPages = errors.New("comic: archive contains no page images")

// Archive is an opened comic, with its pages in reading order.
type Archive struct {
	pages []*zip.File
}

// Open parses the archive's directory. ra must cover exactly size bytes of
// plaintext.
func Open(ra io.ReaderAt, size int64) (*Archive, error) {
	zr, err := zip.NewReader(ra, size)
	if err != nil {
		return nil, ErrUnsupported
	}
	pages := make([]*zip.File, 0, len(zr.File))
	for _, f := range zr.File {
		if f.FileInfo().IsDir() || !isPage(f.Name) {
			continue
		}
		pages = append(pages, f)
	}
	if len(pages) == 0 {
		return nil, ErrNoPages
	}
	// Archives number pages in filenames, so plain lexical order puts page 10
	// before page 2. Sort on digit runs as numbers instead.
	sort.Slice(pages, func(i, j int) bool { return naturalLess(pages[i].Name, pages[j].Name) })
	return &Archive{pages: pages}, nil
}

// PageCount reports how many pages the archive holds.
func (a *Archive) PageCount() int { return len(a.pages) }

// Page opens page i (0-based) for streaming, with its image content type.
func (a *Archive) Page(i int) (io.ReadCloser, string, error) {
	if i < 0 || i >= len(a.pages) {
		return nil, "", errors.New("comic: page out of range")
	}
	rc, err := a.pages[i].Open()
	if err != nil {
		return nil, "", err
	}
	ct := mime.TypeByExtension(path.Ext(a.pages[i].Name))
	if ct == "" {
		ct = "application/octet-stream"
	}
	return rc, ct, nil
}

// Cover renders the first page as a JPEG no wider than maxW — the grid tile's
// thumbnail. Downscaling here keeps the library grid cheap: a cover page is
// often a multi-megabyte PNG, and every tile would otherwise pull the full one.
func (a *Archive) Cover(maxW int) ([]byte, error) {
	rc, _, err := a.Page(0)
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	src, _, err := image.Decode(rc)
	if err != nil {
		return nil, err
	}
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w == 0 || h == 0 {
		return nil, errors.New("comic: empty cover image")
	}
	dst := image.Image(src)
	if maxW > 0 && w > maxW {
		nh := h * maxW / w
		if nh < 1 {
			nh = 1
		}
		scaled := image.NewRGBA(image.Rect(0, 0, maxW, nh))
		draw.CatmullRom.Scale(scaled, scaled.Bounds(), src, b, draw.Over, nil)
		dst = scaled
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 82}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// isPage reports whether an archive entry is a page image. Mac/Windows archivers
// leave metadata sidecars behind (__MACOSX/._page1.jpg, Thumbs.db); those carry
// image extensions but aren't pages, so they're filtered out here.
func isPage(name string) bool {
	base := path.Base(name)
	if strings.HasPrefix(base, ".") || strings.HasPrefix(name, "__MACOSX/") {
		return false
	}
	switch strings.ToLower(path.Ext(base)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp":
		return true
	}
	return false
}

// naturalLess compares two names treating digit runs as numbers, so "page2.jpg"
// sorts before "page10.jpg".
func naturalLess(a, b string) bool {
	a, b = strings.ToLower(a), strings.ToLower(b)
	i, j := 0, 0
	for i < len(a) && j < len(b) {
		ca, cb := a[i], b[j]
		if isDigit(ca) && isDigit(cb) {
			na, ia := digitRun(a, i)
			nb, jb := digitRun(b, j)
			if na != nb {
				return na < nb
			}
			i, j = ia, jb
			continue
		}
		if ca != cb {
			return ca < cb
		}
		i++
		j++
	}
	return len(a)-i < len(b)-j
}

func isDigit(c byte) bool { return c >= '0' && c <= '9' }

// digitRun reads the number starting at i and returns it with the index just
// past it. Overlong runs saturate rather than overflow — they only ever need to
// order filenames, not be exact.
func digitRun(s string, i int) (uint64, int) {
	var n uint64
	for i < len(s) && isDigit(s[i]) {
		if n < 1<<40 {
			n = n*10 + uint64(s[i]-'0')
		}
		i++
	}
	return n, i
}
