// Package recognize identifies what a blob actually is by reading its bytes.
//
// The filename is the weakest possible evidence and was, until this package, the
// only evidence: a ".zip" was filed as a game even when it held a comic's pages, a
// still image saved as ".gif" became an animation, and anything a browser had
// stripped the extension from became an "image" by default. Every one of those is
// decidable from the content itself, so decide it there. The extension survives
// only as the last resort, for a file whose bytes tell us nothing.
package recognize

import (
	"archive/zip"
	"bytes"
	"io"
	"path/filepath"
	"strings"

	"github.com/youruser/oppailib/internal/models"
)

// headerBytes is how much of the front of a file we sniff. Every magic number we
// care about lives in the first few bytes; the slack is for the APNG/WebP chunk
// walk, where the marker sits after a variable-length header.
const headerBytes = 64 << 10

// minComicEntries is the fewest images an archive must hold before it's a comic
// rather than an archive that merely happens to contain a picture.
const minComicEntries = 2

// Kind identifies the media kind of a blob. size must be the blob's true length;
// filename may be empty and is consulted only when the bytes are inconclusive.
func Kind(ra io.ReaderAt, size int64, filename string) models.MediaKind {
	head := make([]byte, min64(headerBytes, size))
	if len(head) > 0 {
		if n, err := ra.ReadAt(head, 0); err != nil && err != io.EOF {
			return KindFromFilename(filename)
		} else {
			head = head[:n]
		}
	}

	// A container has to be opened, not just sniffed: "a zip" is not a kind. What's
	// inside decides whether it's a comic, an Android game, or neither.
	if hasPrefix(head, "PK\x03\x04", "PK\x05\x06", "PK\x07\x08") {
		if k, ok := kindOfZip(ra, size); ok {
			return k
		}
		return KindFromFilename(filename)
	}

	if k, ok := kindOfBytes(head); ok {
		return k
	}
	return KindFromFilename(filename)
}

// KindFromBytes is Kind for a blob already held in memory.
func KindFromBytes(b []byte, filename string) models.MediaKind {
	return Kind(bytes.NewReader(b), int64(len(b)), filename)
}

// kindOfBytes decides from a file header alone. ok is false when nothing matches.
func kindOfBytes(head []byte) (models.MediaKind, bool) {
	switch {
	case hasPrefix(head, "GIF87a", "GIF89a"):
		// A single-frame GIF is a picture that happens to be in a GIF container;
		// filing it under "GIFs" next to the animations is just wrong.
		if gifIsAnimated(head) {
			return models.KindGIF, true
		}
		return models.KindImage, true

	case hasPrefix(head, "\x89PNG\r\n\x1a\n"):
		// APNG announces itself with an acTL chunk ahead of the first frame.
		if containsChunk(head, "acTL") {
			return models.KindGIF, true
		}
		return models.KindImage, true

	case hasPrefix(head, "RIFF") && hasAt(head, 8, "WEBP"):
		// Animated WebP carries an ANIM chunk; the still form has none.
		if containsChunk(head, "ANIM") || containsChunk(head, "ANMF") {
			return models.KindGIF, true
		}
		return models.KindImage, true

	case hasPrefix(head, "RIFF") && hasAt(head, 8, "AVI "):
		return models.KindVideo, true

	case hasAt(head, 4, "ftyp"):
		return ftypKind(head), true

	case hasPrefix(head, "\x1a\x45\xdf\xa3"): // EBML: Matroska / WebM
		return models.KindVideo, true

	case hasPrefix(head, "FLV\x01"):
		return models.KindVideo, true

	case hasPrefix(head, "\x00\x00\x01\xba", "\x00\x00\x01\xb3"): // MPEG program stream
		return models.KindVideo, true

	case isMPEGTS(head):
		return models.KindVideo, true

	case hasPrefix(head, "\xff\xd8\xff"): // JPEG
		return models.KindImage, true

	case hasPrefix(head, "BM"): // BMP
		return models.KindImage, true

	case hasPrefix(head, "\x00\x00\x01\x00"): // ICO
		return models.KindImage, true

	case hasPrefix(head, "Rar!\x1a\x07"): // RAR — a .cbr
		return models.KindComic, true

	case hasPrefix(head, "%PDF-"):
		return models.KindComic, true

	case hasPrefix(head, "7z\xbc\xaf\x27\x1c"): // 7z: not a comic format; a bundle
		return models.KindGame, true

	case hasPrefix(head, "MZ"): // Windows executable
		return models.KindGame, true

	case hasPrefix(head, "\x7fELF"):
		return models.KindGame, true
	}
	return "", false
}

// ftypKind splits the ISO base-media container family. The brand is the only thing
// separating an AVIF/HEIC still from an MP4 video — both are "ftyp" boxes.
func ftypKind(head []byte) models.MediaKind {
	if len(head) < 12 {
		return models.KindVideo
	}
	switch strings.ToLower(string(head[8:12])) {
	case "avif", "avis", "heic", "heix", "heif", "mif1", "msf1":
		return models.KindImage
	}
	return models.KindVideo
}

// isMPEGTS checks for the transport-stream sync byte at the start of two
// consecutive 188-byte packets. One 0x47 is a coincidence; two, spaced exactly a
// packet apart, is the format.
func isMPEGTS(head []byte) bool {
	return len(head) > 188 && head[0] == 0x47 && head[188] == 0x47
}

// kindOfZip decides what a zip archive *is* from what it holds.
func kindOfZip(ra io.ReaderAt, size int64) (models.MediaKind, bool) {
	zr, err := zip.NewReader(ra, size)
	if err != nil {
		return "", false
	}

	images, files := 0, 0
	for _, f := range zr.File {
		name := f.Name
		if strings.HasSuffix(name, "/") {
			continue
		}
		// An APK is a zip too, and it's the one archive that's unambiguously a game.
		base := strings.ToLower(filepath.Base(name))
		if base == "androidmanifest.xml" || base == "classes.dex" {
			return models.KindGame, true
		}
		files++
		if isImageExt(filepath.Ext(name)) {
			images++
		}
	}

	// A comic is an archive that is *mostly pages*. A game's zip may well contain a
	// few PNGs among its assets, so a bare "contains images" test would swallow it.
	if images >= minComicEntries && images*2 >= files {
		return models.KindComic, true
	}
	if files > 0 {
		return models.KindGame, true
	}
	return "", false
}

// gifIsAnimated reports whether a GIF holds more than one frame, by walking its
// block structure. Counting raw 0x2C bytes would be wrong — the image separator's
// value occurs freely inside compressed pixel data — so the blocks have to be
// stepped over properly.
//
// A truncated header (we only ever read the front of the file) reads as "not
// animated", which is the safe way to be wrong: a long animation's second frame
// arrives early, so anything we can't see the end of was a still.
func gifIsAnimated(b []byte) bool {
	const (
		extensionIntroducer = 0x21
		imageSeparator      = 0x2c
		trailer             = 0x3b
	)
	p := 6 // past "GIF89a"
	if len(b) < p+7 {
		return false
	}
	flags := b[p+4]
	p += 7 // logical screen descriptor
	if flags&0x80 != 0 {
		p += 3 * (1 << ((flags & 0x07) + 1)) // global colour table
	}

	frames := 0
	for p < len(b) {
		switch b[p] {
		case extensionIntroducer:
			if p+2 >= len(b) {
				return false
			}
			p += 2 // introducer + label
			var ok bool
			if p, ok = skipSubBlocks(b, p); !ok {
				return false
			}
		case imageSeparator:
			frames++
			if frames > 1 {
				return true
			}
			if p+10 > len(b) {
				return false
			}
			local := b[p+9]
			p += 10 // image descriptor
			if local&0x80 != 0 {
				p += 3 * (1 << ((local & 0x07) + 1)) // local colour table
			}
			if p >= len(b) {
				return false
			}
			p++ // LZW minimum code size
			var ok bool
			if p, ok = skipSubBlocks(b, p); !ok {
				return false
			}
		case trailer:
			return false
		default:
			return false // not a structure we understand; don't guess
		}
	}
	return false
}

// skipSubBlocks steps over a GIF sub-block chain (length-prefixed runs, ended by a
// zero length), returning the offset just past it.
func skipSubBlocks(b []byte, p int) (int, bool) {
	for p < len(b) {
		n := int(b[p])
		p++
		if n == 0 {
			return p, true
		}
		p += n
	}
	return p, false
}

// containsChunk reports whether a four-character chunk tag appears in the header.
// Both PNG and RIFF lay out chunks as (length, tag, payload), so a tag can be
// found by scanning — the false-positive risk is a payload happening to spell the
// tag, which for "acTL"/"ANIM" ahead of the first frame is not a real concern.
func containsChunk(b []byte, tag string) bool {
	return bytes.Contains(b, []byte(tag))
}

// imageExts are the page formats a comic archive is built from.
var imageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
	".webp": true, ".bmp": true, ".avif": true, ".jxl": true,
}

func isImageExt(ext string) bool { return imageExts[strings.ToLower(ext)] }

// KindFromFilename is the fallback: the extension, when the bytes said nothing.
func KindFromFilename(name string) models.MediaKind {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".mp4", ".mkv", ".webm", ".mov", ".avi", ".m4v", ".ts", ".flv":
		return models.KindVideo
	case ".gif":
		return models.KindGIF
	case ".cbz", ".cbr", ".pdf":
		return models.KindComic
	case ".7z", ".exe", ".apk", ".rar":
		return models.KindGame
	default:
		return models.KindImage
	}
}

func hasPrefix(b []byte, prefixes ...string) bool {
	for _, p := range prefixes {
		if len(b) >= len(p) && string(b[:len(p)]) == p {
			return true
		}
	}
	return false
}

func hasAt(b []byte, off int, want string) bool {
	return len(b) >= off+len(want) && string(b[off:off+len(want)]) == want
}

func min64(a int, b int64) int {
	if int64(a) < b {
		return a
	}
	return int(b)
}
