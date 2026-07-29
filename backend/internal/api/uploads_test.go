package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

// The tests here aim at the ways a resumable upload goes wrong in the field rather
// than at the happy path alone: a client that comes back after being killed, a
// button pressed twice, a chunk that arrives short, and a session addressed by
// somebody who does not own it.

// putChunk sends one piece with an optional checksum header.
func putChunk(t *testing.T, h http.Handler, token, id string, idx int, body []byte, sum string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest("PUT", fmt.Sprintf("/api/uploads/%s/chunk/%d", id, idx), bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	if sum != "" {
		req.Header.Set("X-Chunk-SHA256", sum)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func createUpload(t *testing.T, h http.Handler, token string, size int, chunk int, fingerprint string) uploadSessionJSON {
	t.Helper()
	body := fmt.Sprintf(`{"filename":"holiday.mp4","size":%d,"chunkSize":%d,"mime":"video/mp4","fingerprint":%q}`,
		size, chunk, fingerprint)
	rec := do(t, h, token, "POST", "/api/uploads", body)
	if rec.Code != http.StatusCreated && rec.Code != http.StatusOK {
		t.Fatalf("create upload: %d %s", rec.Code, rec.Body)
	}
	var out uploadSessionJSON
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode session: %v", err)
	}
	return out
}

// payload is a deterministic body big enough to need several chunks.
func payload(n int) []byte {
	b := make([]byte, n)
	for i := range b {
		b[i] = byte(i * 7)
	}
	return b
}

func TestResumableUploadRoundTrip(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	data := payload(5000)
	const chunk = uploadChunkMin
	sess := createUpload(t, h, token, len(data), chunk, "fp-roundtrip")
	if sess.ChunkCount != 1 {
		t.Fatalf("chunkCount = %d, want 1 for a small file", sess.ChunkCount)
	}

	if rec := putChunk(t, h, token, sess.ID, 0, data, ""); rec.Code != http.StatusOK {
		t.Fatalf("chunk: %d %s", rec.Code, rec.Body)
	}
	sum := sha256.Sum256(data)
	rec := do(t, h, token, "POST", "/api/uploads/"+sess.ID+"/complete",
		fmt.Sprintf(`{"sha256":%q}`, hex.EncodeToString(sum[:])))
	if rec.Code != http.StatusCreated {
		t.Fatalf("complete: %d %s", rec.Code, rec.Body)
	}
	var done struct {
		ID     int64  `json:"id"`
		SHA256 string `json:"sha256"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &done); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if done.ID == 0 {
		t.Fatal("completion did not produce a library item")
	}
	if done.SHA256 != hex.EncodeToString(sum[:]) {
		t.Errorf("stored hash %s, want %s", done.SHA256, hex.EncodeToString(sum[:]))
	}

	// The staged bytes are the point of the cache volume; leaving them behind after a
	// successful upload would double the disk cost of every import.
	if _, err := os.Stat(s.stagingDir(sess.ID)); !os.IsNotExist(err) {
		t.Errorf("staging directory survived completion: %v", err)
	}
}

// The reason this feature exists: a client that died mid-upload asks what arrived
// and sends only the difference.
func TestResumeSendsOnlyWhatIsMissing(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	const chunk = uploadChunkMin
	data := payload(chunk*3 + 17) // four chunks, the last a short one
	sess := createUpload(t, h, token, len(data), chunk, "fp-resume")
	if sess.ChunkCount != 4 {
		t.Fatalf("chunkCount = %d, want 4", sess.ChunkCount)
	}

	// Two chunks land, out of order — which is legal, and is what a client uploading
	// in parallel actually does.
	putChunk(t, h, token, sess.ID, 2, data[2*chunk:3*chunk], "")
	putChunk(t, h, token, sess.ID, 0, data[:chunk], "")

	// The client is killed here. On coming back it asks, rather than assuming.
	rec := do(t, h, token, "GET", "/api/uploads/"+sess.ID, "")
	var state uploadSessionJSON
	if err := json.Unmarshal(rec.Body.Bytes(), &state); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(state.Received) != 2 || state.Received[0] != 0 || state.Received[1] != 2 {
		t.Fatalf("received = %v, want [0 2] in order", state.Received)
	}
	if state.ReceivedBytes != int64(2*chunk) {
		t.Errorf("receivedBytes = %d, want %d", state.ReceivedBytes, 2*chunk)
	}

	// Completing early must not fail the upload — it must say what is missing and
	// leave the session usable.
	rec = do(t, h, token, "POST", "/api/uploads/"+sess.ID+"/complete", "{}")
	if rec.Code != http.StatusConflict {
		t.Fatalf("early complete: %d %s", rec.Code, rec.Body)
	}
	var gap struct {
		Missing []int64 `json:"missing"`
	}
	json.Unmarshal(rec.Body.Bytes(), &gap)
	if len(gap.Missing) != 2 || gap.Missing[0] != 1 || gap.Missing[1] != 3 {
		t.Fatalf("missing = %v, want [1 3]", gap.Missing)
	}
	row, err := s.db.GetUpload(t.Context(), 1, sess.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if row.Status != db.UploadOpen {
		t.Errorf("status after an early complete = %q, want it reopened", row.Status)
	}

	// The rest arrives and the file assembles to exactly the original bytes.
	putChunk(t, h, token, sess.ID, 1, data[chunk:2*chunk], "")
	putChunk(t, h, token, sess.ID, 3, data[3*chunk:], "")
	rec = do(t, h, token, "POST", "/api/uploads/"+sess.ID+"/complete", "{}")
	if rec.Code != http.StatusCreated {
		t.Fatalf("complete: %d %s", rec.Code, rec.Body)
	}
	var done struct {
		ID     int64  `json:"id"`
		SHA256 string `json:"sha256"`
	}
	json.Unmarshal(rec.Body.Bytes(), &done)
	want := sha256.Sum256(data)
	if done.SHA256 != hex.EncodeToString(want[:]) {
		t.Errorf("assembled hash %s, want %s — the parts were joined wrongly", done.SHA256, hex.EncodeToString(want[:]))
	}
}

// Pressing upload twice, or a phone re-queueing its work after a restart, must
// resume one upload rather than start a second.
func TestDuplicateStartResumesTheSameSession(t *testing.T) {
	s, token := newTestServer(t)
	handler := s.Handler()

	first := createUpload(t, handler, token, 4096, uploadChunkMin, "same-file")
	second := createUpload(t, handler, token, 4096, uploadChunkMin, "same-file")
	if first.ID != second.ID {
		t.Fatalf("second start opened a new session (%s vs %s) — the file would upload twice", first.ID, second.ID)
	}
}

// A chunk that is not the length the session says it must be is a corrupt file
// waiting to be discovered weeks later. It is refused at the door.
func TestShortChunkIsRefused(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	const chunk = uploadChunkMin
	data := payload(chunk * 2)
	sess := createUpload(t, h, token, len(data), chunk, "fp-short")

	rec := putChunk(t, h, token, sess.ID, 0, data[:chunk-10], "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("short chunk accepted: %d %s", rec.Code, rec.Body)
	}
	chunks, _ := s.db.Chunks(t.Context(), sess.ID)
	if len(chunks) != 0 {
		t.Errorf("a refused chunk was recorded as received: %v", chunks)
	}
	// And nothing was left in staging under its real name.
	if _, err := os.Stat(chunkPath(s.stagingDir(sess.ID), 0)); !os.IsNotExist(err) {
		t.Error("a refused chunk was left in staging where a resume would count it")
	}
}

func TestChunkChecksumMismatchIsRefused(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	data := payload(2048)
	sess := createUpload(t, h, token, len(data), uploadChunkMin, "fp-sum")

	bad := hex.EncodeToString(bytes.Repeat([]byte{1}, 32))
	rec := putChunk(t, h, token, sess.ID, 0, data, bad)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("corrupt chunk accepted: %d %s", rec.Code, rec.Body)
	}
	if chunks, _ := s.db.Chunks(t.Context(), sess.ID); len(chunks) != 0 {
		t.Error("a chunk that failed its checksum was recorded")
	}
}

// A whole-file checksum that does not match means the assembled bytes are not the
// file the user chose, and that must not become a library item silently.
func TestWholeFileChecksumMismatchFailsTheUpload(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	data := payload(1500)
	sess := createUpload(t, h, token, len(data), uploadChunkMin, "fp-whole")
	putChunk(t, h, token, sess.ID, 0, data, "")

	rec := do(t, h, token, "POST", "/api/uploads/"+sess.ID+"/complete",
		`{"sha256":"0000000000000000000000000000000000000000000000000000000000000000"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("mismatched file accepted: %d %s", rec.Code, rec.Body)
	}
	row, err := s.db.GetUpload(t.Context(), 1, sess.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if row.Status != db.UploadFailed {
		t.Errorf("status = %q, want failed", row.Status)
	}
}

// A session id is unguessable, but unguessable is not an authorization model.
func TestUploadsAreScopedToTheirOwner(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	sess := createUpload(t, h, token, 4096, uploadChunkMin, "fp-owner")

	uid, err := s.db.CreateUser(t.Context(), "someone-else", "x", false)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	other := "other-token"
	if err := s.db.CreateSession(t.Context(), other, uid, time.Hour, db.ClientWeb); err != nil {
		t.Fatalf("session: %v", err)
	}

	for _, tc := range []struct{ method, path, body string }{
		{"GET", "/api/uploads/" + sess.ID, ""},
		{"POST", "/api/uploads/" + sess.ID + "/complete", "{}"},
		{"DELETE", "/api/uploads/" + sess.ID, ""},
	} {
		rec := do(t, h, other, tc.method, tc.path, tc.body)
		if rec.Code != http.StatusNotFound {
			t.Errorf("%s %s by a stranger = %d, want 404", tc.method, tc.path, rec.Code)
		}
	}
	if rec := putChunk(t, h, other, sess.ID, 0, payload(100), ""); rec.Code != http.StatusNotFound {
		t.Errorf("chunk PUT by a stranger = %d, want 404", rec.Code)
	}
}

// The id is the one request value that becomes a filesystem path.
func TestUploadIDsAreValidatedBeforeBecomingPaths(t *testing.T) {
	for _, bad := range []string{
		"", "..", "../../etc", "0011223344556677889900aabbccddee/../..",
		"0011223344556677889900AABBCCDDEE", // upper case is not what we mint
		"0011223344556677889900aabbccdde",  // one short
		"zz11223344556677889900aabbccddee",
	} {
		if validUploadID(bad) {
			t.Errorf("validUploadID(%q) = true", bad)
		}
	}
	if !validUploadID("0011223344556677889900aabbccddee") {
		t.Error("a well-formed id was refused")
	}
}

func TestCancelReclaimsStaging(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	data := payload(2048)
	sess := createUpload(t, h, token, len(data), uploadChunkMin, "fp-cancel")
	putChunk(t, h, token, sess.ID, 0, data, "")

	dir := s.stagingDir(sess.ID)
	if _, err := os.Stat(dir); err != nil {
		t.Fatalf("staging missing before cancel: %v", err)
	}
	if rec := do(t, h, token, "DELETE", "/api/uploads/"+sess.ID, ""); rec.Code != http.StatusOK {
		t.Fatalf("cancel: %d %s", rec.Code, rec.Body)
	}
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Error("cancelling left the chunks on disk")
	}
	if _, err := s.db.GetUpload(t.Context(), 1, sess.ID); err == nil {
		t.Error("cancelled session still readable")
	}
}

// The sweeper has to distinguish a staging directory that belongs to a live session
// from one left behind by a crash — deleting the wrong one destroys an upload in
// progress.
func TestSweepRemovesOrphansAndKeepsLiveSessions(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	sess := createUpload(t, h, token, 2048, uploadChunkMin, "fp-sweep")
	putChunk(t, h, token, sess.ID, 0, payload(2048), "")

	orphan := "aaaaaaaabbbbbbbbccccccccdddddddd"
	if err := os.MkdirAll(s.stagingDir(orphan), 0o700); err != nil {
		t.Fatalf("mkdir orphan: %v", err)
	}
	if err := os.WriteFile(filepath.Join(s.stagingDir(orphan), "00000000.part"), payload(10), 0o600); err != nil {
		t.Fatalf("write orphan: %v", err)
	}
	// A directory that is not one of ours at all must be left strictly alone.
	stranger := filepath.Join(s.uploadDir, "not-an-upload")
	if err := os.MkdirAll(stranger, 0o700); err != nil {
		t.Fatalf("mkdir stranger: %v", err)
	}

	s.sweepUploads()

	if _, err := os.Stat(s.stagingDir(sess.ID)); err != nil {
		t.Errorf("the sweep deleted a live upload's chunks: %v", err)
	}
	if _, err := os.Stat(s.stagingDir(orphan)); !os.IsNotExist(err) {
		t.Error("the sweep left an orphaned staging directory behind")
	}
	if _, err := os.Stat(stranger); err != nil {
		t.Errorf("the sweep removed a directory it does not own: %v", err)
	}
}

func TestMissingChunksAccountsForTheShortLastChunk(t *testing.T) {
	const chunk = 100
	size := int64(250) // three chunks: 100, 100, 50
	have := []db.UploadChunk{{Index: 0, Size: 100}, {Index: 2, Size: 50}}
	got := missingChunks(have, size, chunk)
	if len(got) != 1 || got[0] != 1 {
		t.Fatalf("missing = %v, want [1] — the 50-byte final chunk is complete", got)
	}
	// A chunk recorded at the wrong length is missing, not present.
	have = []db.UploadChunk{{Index: 0, Size: 100}, {Index: 1, Size: 100}, {Index: 2, Size: 40}}
	if got := missingChunks(have, size, chunk); len(got) != 1 || got[0] != 2 {
		t.Fatalf("missing = %v, want [2]", got)
	}
}

func TestChunkCountRoundsUp(t *testing.T) {
	for _, tc := range []struct{ size, chunk, want int64 }{
		{0, 100, 0}, {1, 100, 1}, {100, 100, 1}, {101, 100, 2}, {250, 100, 3},
	} {
		if got := chunkCount(tc.size, tc.chunk); got != tc.want {
			t.Errorf("chunkCount(%d,%d) = %d, want %d", tc.size, tc.chunk, got, tc.want)
		}
	}
}

// The staged parts are read as one stream without ever holding the file in memory,
// and without holding a descriptor per part open.
func TestChunkReaderJoinsPartsInOrder(t *testing.T) {
	dir := t.TempDir()
	parts := [][]byte{[]byte("hello "), []byte("resumable "), []byte("world")}
	for i, p := range parts {
		if err := os.WriteFile(chunkPath(dir, int64(i)), p, 0o600); err != nil {
			t.Fatalf("write: %v", err)
		}
	}
	r := &chunkReader{dir: dir, count: int64(len(parts))}
	defer r.Close()
	var got bytes.Buffer
	buf := make([]byte, 4) // deliberately smaller than a part, to cross boundaries
	for {
		n, err := r.Read(buf)
		got.Write(buf[:n])
		if err != nil {
			break
		}
	}
	if got.String() != "hello resumable world" {
		t.Errorf("joined = %q", got.String())
	}
}

// A file larger than the hard ceiling is refused before a session exists, not after
// the client has spent twenty minutes discovering it.
func TestOversizeUploadIsRefusedUpFront(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	rec := do(t, h, token, "POST", "/api/uploads",
		fmt.Sprintf(`{"filename":"huge.mkv","size":%d,"fingerprint":"fp-huge"}`, int64(maxUpload)+1))
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("oversize accepted: %d %s", rec.Code, rec.Body)
	}
}

func TestUploadRequiresAKnownSize(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	rec := do(t, h, token, "POST", "/api/uploads", `{"filename":"x.mp4","size":0}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("sizeless upload accepted: %d %s", rec.Code, rec.Body)
	}
}
