// Package crypto implements OppaiLib's envelope encryption.
//
// A passphrase-derived Key-Encryption-Key (KEK) wraps a random per-file
// Data-Encryption-Key (DEK). File content is encrypted with AES-256-GCM in
// fixed-size chunks; each chunk uses a fresh random nonce and binds its index
// (plus a final-chunk terminator) as AAD, which prevents reordering and
// truncation of the ciphertext stream. Small metadata fields use a single
// GCM seal with a random nonce.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/subtle"
	"encoding/binary"
	"errors"
	"fmt"
	"io"

	"golang.org/x/crypto/argon2"
)

const (
	KeySize   = 32               // AES-256
	nonceSize = 12               // GCM standard nonce
	ChunkSize = 64 * 1024        // 64 KiB plaintext per chunk
	magic     = "OPLB1"          // blob header magic
	version   = 1

	// Argon2id parameters for KEK derivation.
	argonTime    = 3
	argonMemory  = 64 * 1024 // KiB → 64 MiB
	argonThreads = 4
)

var (
	ErrBadMagic   = errors.New("crypto: bad blob header")
	ErrAuthFailed = errors.New("crypto: authentication failed (wrong key or corrupt data)")
)

// DeriveKEK stretches a passphrase into a 32-byte key-encryption key.
func DeriveKEK(passphrase string, salt []byte) []byte {
	return argon2.IDKey([]byte(passphrase), salt, argonTime, argonMemory, argonThreads, KeySize)
}

// RandomBytes returns n cryptographically random bytes.
func RandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return nil, err
	}
	return b, nil
}

func newGCM(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

// SealBytes encrypts plaintext with key; output is nonce||ciphertext||tag.
// Used for small metadata fields. Optional aad binds associated context.
func SealBytes(key, plaintext, aad []byte) ([]byte, error) {
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	nonce, err := RandomBytes(nonceSize)
	if err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, plaintext, aad), nil
}

// OpenBytes reverses SealBytes.
func OpenBytes(key, blob, aad []byte) ([]byte, error) {
	if len(blob) < nonceSize {
		return nil, ErrAuthFailed
	}
	gcm, err := newGCM(key)
	if err != nil {
		return nil, err
	}
	nonce, ct := blob[:nonceSize], blob[nonceSize:]
	pt, err := gcm.Open(nil, nonce, ct, aad)
	if err != nil {
		return nil, ErrAuthFailed
	}
	return pt, nil
}

// WrapKey encrypts a DEK under the KEK. Output: nonce||ciphertext||tag.
func WrapKey(kek, dek []byte) ([]byte, error) { return SealBytes(kek, dek, []byte("dek")) }

// UnwrapKey reverses WrapKey.
func UnwrapKey(kek, wrapped []byte) ([]byte, error) { return OpenBytes(kek, wrapped, []byte("dek")) }

// ConstantTimeEqual reports whether a and b are equal without leaking timing.
func ConstantTimeEqual(a, b []byte) bool { return subtle.ConstantTimeCompare(a, b) == 1 }

// chunkAAD binds a chunk's ordinal index and whether it is the final chunk.
func chunkAAD(index uint64, final bool) []byte {
	aad := make([]byte, 9)
	binary.BigEndian.PutUint64(aad[:8], index)
	if final {
		aad[8] = 1
	}
	return aad
}

// EncryptStream reads plaintext from src and writes an encrypted blob to dst.
//
// Blob layout:
//
//	magic[5] version[1] wrappedLen[2] wrapped[...]
//	then repeated: chunkNonce[12] chunkCTLen[4] chunkCT[...]
//	the final chunk (possibly zero-length plaintext) carries the final-flag AAD.
//
// A fresh DEK is generated and wrapped under kek; the blob is self-contained.
func EncryptStream(dst io.Writer, src io.Reader, kek []byte) error {
	dek, err := RandomBytes(KeySize)
	if err != nil {
		return err
	}
	wrapped, err := WrapKey(kek, dek)
	if err != nil {
		return err
	}
	gcm, err := newGCM(dek)
	if err != nil {
		return err
	}

	// Header.
	if _, err := io.WriteString(dst, magic); err != nil {
		return err
	}
	if _, err := dst.Write([]byte{version}); err != nil {
		return err
	}
	var lenBuf [4]byte
	binary.BigEndian.PutUint16(lenBuf[:2], uint16(len(wrapped)))
	if _, err := dst.Write(lenBuf[:2]); err != nil {
		return err
	}
	if _, err := dst.Write(wrapped); err != nil {
		return err
	}

	buf := make([]byte, ChunkSize)
	var index uint64
	for {
		n, readErr := io.ReadFull(src, buf)
		final := readErr == io.EOF || readErr == io.ErrUnexpectedEOF
		if readErr != nil && !final {
			return readErr
		}
		if err := writeChunk(dst, gcm, buf[:n], index, final); err != nil {
			return err
		}
		index++
		if final {
			return nil
		}
	}
}

func writeChunk(dst io.Writer, gcm cipher.AEAD, plain []byte, index uint64, final bool) error {
	nonce, err := RandomBytes(nonceSize)
	if err != nil {
		return err
	}
	ct := gcm.Seal(nil, nonce, plain, chunkAAD(index, final))
	if _, err := dst.Write(nonce); err != nil {
		return err
	}
	var lb [4]byte
	binary.BigEndian.PutUint32(lb[:], uint32(len(ct)))
	if _, err := dst.Write(lb[:]); err != nil {
		return err
	}
	_, err = dst.Write(ct)
	return err
}

// DecryptStream reads an encrypted blob from src and writes plaintext to dst.
func DecryptStream(dst io.Writer, src io.Reader, kek []byte) error {
	dek, gcm, err := readHeader(src, kek)
	if err != nil {
		return err
	}
	_ = dek

	var index uint64
	nonce := make([]byte, nonceSize)
	var lb [4]byte
	for {
		if _, err := io.ReadFull(src, nonce); err != nil {
			if err == io.EOF {
				// Stream ended without a final-flagged chunk → truncated.
				return ErrAuthFailed
			}
			return err
		}
		if _, err := io.ReadFull(src, lb[:]); err != nil {
			return err
		}
		ct := make([]byte, binary.BigEndian.Uint32(lb[:]))
		if _, err := io.ReadFull(src, ct); err != nil {
			return err
		}
		// Try non-final first, then final. Exactly one AAD authenticates.
		plain, err := gcm.Open(nil, nonce, ct, chunkAAD(index, false))
		if err != nil {
			plain, err = gcm.Open(nil, nonce, ct, chunkAAD(index, true))
			if err != nil {
				return ErrAuthFailed
			}
			// Final chunk: write remainder and stop.
			if _, err := dst.Write(plain); err != nil {
				return err
			}
			return nil
		}
		if _, err := dst.Write(plain); err != nil {
			return err
		}
		index++
	}
}

func readHeader(src io.Reader, kek []byte) ([]byte, cipher.AEAD, error) {
	hdr := make([]byte, len(magic)+1)
	if _, err := io.ReadFull(src, hdr); err != nil {
		return nil, nil, err
	}
	if string(hdr[:len(magic)]) != magic {
		return nil, nil, ErrBadMagic
	}
	if hdr[len(magic)] != version {
		return nil, nil, fmt.Errorf("crypto: unsupported blob version %d", hdr[len(magic)])
	}
	var lb [2]byte
	if _, err := io.ReadFull(src, lb[:]); err != nil {
		return nil, nil, err
	}
	wrapped := make([]byte, binary.BigEndian.Uint16(lb[:]))
	if _, err := io.ReadFull(src, wrapped); err != nil {
		return nil, nil, err
	}
	dek, err := UnwrapKey(kek, wrapped)
	if err != nil {
		return nil, nil, err
	}
	gcm, err := newGCM(dek)
	if err != nil {
		return nil, nil, err
	}
	return dek, gcm, nil
}

// BlobReader provides seekable, on-demand decryption of a blob produced by
// EncryptStream, implementing io.ReadSeeker over the plaintext. This is what
// lets the HTTP layer answer Range requests (video/audio scrubbing) without
// decrypting the whole file: because every non-final chunk is a fixed size on
// disk, the file offset of the chunk covering any plaintext position is computed
// directly, and only that chunk is opened.
//
// size is the plaintext length recorded at ingest; the caller supplies it so
// Seek(0, SeekEnd) and range math don't require walking the ciphertext.
type BlobReader struct {
	ra        io.ReaderAt
	gcm       cipher.AEAD
	dataStart int64 // file offset where the first chunk begins
	diskChunk int64 // on-disk size of a full (non-final) chunk
	size      int64 // total plaintext length
	pos       int64 // current plaintext offset

	cachedIdx  int64  // index of the chunk currently in cache, -1 if none
	cachedData []byte // decrypted plaintext of the cached chunk
}

// NewBlobReader parses the blob header (deriving the per-file key) and returns a
// reader positioned at plaintext offset 0.
func NewBlobReader(ra io.ReaderAt, kek []byte, size int64) (*BlobReader, error) {
	// Fixed header prefix: magic || version || wrappedLen(uint16).
	hdr := make([]byte, len(magic)+1+2)
	if err := readAtFull(ra, hdr, 0); err != nil {
		return nil, err
	}
	if string(hdr[:len(magic)]) != magic {
		return nil, ErrBadMagic
	}
	if hdr[len(magic)] != version {
		return nil, fmt.Errorf("crypto: unsupported blob version %d", hdr[len(magic)])
	}
	wrappedLen := int(binary.BigEndian.Uint16(hdr[len(magic)+1:]))
	wrapped := make([]byte, wrappedLen)
	if err := readAtFull(ra, wrapped, int64(len(hdr))); err != nil {
		return nil, err
	}
	dek, err := UnwrapKey(kek, wrapped)
	if err != nil {
		return nil, err
	}
	gcm, err := newGCM(dek)
	if err != nil {
		return nil, err
	}
	return &BlobReader{
		ra:        ra,
		gcm:       gcm,
		dataStart: int64(len(hdr) + wrappedLen),
		diskChunk: int64(nonceSize + 4 + ChunkSize + gcm.Overhead()),
		size:      size,
		cachedIdx: -1,
	}, nil
}

// loadChunk decrypts chunk idx into the cache (idempotent for repeat reads).
func (b *BlobReader) loadChunk(idx int64) error {
	if b.cachedIdx == idx {
		return nil
	}
	off := b.dataStart + idx*b.diskChunk
	head := make([]byte, nonceSize+4)
	if err := readAtFull(b.ra, head, off); err != nil {
		return err
	}
	ct := make([]byte, binary.BigEndian.Uint32(head[nonceSize:]))
	if err := readAtFull(b.ra, ct, off+int64(len(head))); err != nil {
		return err
	}
	nonce := head[:nonceSize]
	// A non-final chunk authenticates under the non-final AAD, the last chunk
	// under the final one (mirrors DecryptStream). Try non-final first.
	plain, err := b.gcm.Open(nil, nonce, ct, chunkAAD(uint64(idx), false))
	if err != nil {
		plain, err = b.gcm.Open(nil, nonce, ct, chunkAAD(uint64(idx), true))
		if err != nil {
			return ErrAuthFailed
		}
	}
	b.cachedIdx = idx
	b.cachedData = plain
	return nil
}

func (b *BlobReader) Read(p []byte) (int, error) {
	if b.pos >= b.size {
		return 0, io.EOF
	}
	idx := b.pos / ChunkSize
	if err := b.loadChunk(idx); err != nil {
		return 0, err
	}
	within := int(b.pos - idx*ChunkSize)
	if within >= len(b.cachedData) {
		return 0, io.EOF
	}
	n := copy(p, b.cachedData[within:])
	b.pos += int64(n)
	return n, nil
}

func (b *BlobReader) Seek(offset int64, whence int) (int64, error) {
	var abs int64
	switch whence {
	case io.SeekStart:
		abs = offset
	case io.SeekCurrent:
		abs = b.pos + offset
	case io.SeekEnd:
		abs = b.size + offset
	default:
		return 0, errors.New("crypto: invalid whence")
	}
	if abs < 0 {
		return 0, errors.New("crypto: negative seek position")
	}
	b.pos = abs
	return abs, nil
}

// readAtFull reads exactly len(p) bytes at off. Unlike a bare ReadAt it treats a
// completely-filled buffer as success even when the source reports io.EOF at the
// boundary (which ReaderAt is permitted to do on an exact end-of-file read).
func readAtFull(ra io.ReaderAt, p []byte, off int64) error {
	n, err := ra.ReadAt(p, off)
	if n == len(p) {
		return nil
	}
	if err == nil {
		err = io.ErrUnexpectedEOF
	}
	return err
}
