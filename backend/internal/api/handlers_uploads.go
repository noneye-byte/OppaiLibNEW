package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
)

// Resumable, chunked uploads.
//
// The existing POST /api/media is one multipart request carrying the whole file, and
// for a picture that is exactly right. For a phone uploading an hour of video it is
// the wrong shape in every direction at once: a single request that must survive the
// screen turning off, the app being swapped away, a lift ride through a dead spot and
// a reverse proxy's body limit — and which, if any of those happen at 94%, starts
// again from zero.
//
// So a large file is uploaded as a sequence of small, independently retryable
// requests against a server-side session. The server is the authority on what has
// arrived: a client that was killed mid-upload asks what is already there and sends
// the difference. Nothing about resuming depends on the client having remembered
// anything, which matters because the failures being survived here are exactly the
// ones that destroy client-side state.
//
// Nothing is ever held whole in memory on either end. A chunk streams from the
// request body to its own file, and assembly streams those files through the
// encrypting store — the same store, the same dedup, the same background ingest work
// as an ordinary upload, so a resumable upload produces an identical library item.

const (
	// uploadChunkDefault is what a client is told to use unless it asks otherwise.
	// Small enough that losing one to a dropped connection is cheap and a proxy's
	// default body limit is nowhere near it; large enough that an 8 GiB file is a
	// thousand requests rather than eight thousand.
	uploadChunkDefault = 8 << 20
	uploadChunkMin     = 1 << 20
	uploadChunkMax     = 64 << 20

	// uploadStaleLive is how long an untouched unfinished upload is kept before the
	// sweeper reclaims its staging bytes. Generous on purpose: "I'll finish it on
	// wifi tomorrow" is a real thing people do, and the cost of being wrong is a
	// resume that turns into a fresh upload.
	uploadStaleLive = 48 * time.Hour
	// uploadStaleDone is how long a finished/failed row survives as history.
	uploadStaleDone = 14 * 24 * time.Hour
)

// uploadSessionJSON is what every endpoint here returns: enough for a client to know
// what to send next, and enough for an upload manager to draw a row.
type uploadSessionJSON struct {
	ID        string `json:"id"`
	Filename  string `json:"filename"`
	Title     string `json:"title,omitempty"`
	Size      int64  `json:"size"`
	ChunkSize int64  `json:"chunkSize"`
	Mime      string `json:"mime,omitempty"`
	Kind      string `json:"kind,omitempty"`
	Status    string `json:"status"`
	// Received is the sorted list of chunk indices the server holds. It is the whole
	// resume protocol: a client sends the complement of this set.
	Received      []int64 `json:"received"`
	ReceivedBytes int64   `json:"receivedBytes"`
	ChunkCount    int64   `json:"chunkCount"`
	MediaID       int64   `json:"mediaId,omitempty"`
	Error         string  `json:"error,omitempty"`
	CreatedAt     int64   `json:"createdAt"`
	UpdatedAt     int64   `json:"updatedAt"`
}

func (s *Server) uploadJSON(r *http.Request, u *db.UploadRow) uploadSessionJSON {
	out := uploadSessionJSON{
		ID:        u.ID,
		Size:      u.Size,
		ChunkSize: u.ChunkSize,
		Mime:      u.Mime,
		Kind:      u.Kind,
		Status:    u.Status,
		Received:  []int64{},
		MediaID:   u.MediaID,
		Error:     u.Error,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
	out.ChunkCount = chunkCount(u.Size, u.ChunkSize)
	if b, err := crypto.OpenBytes(s.kek, u.FilenameEnc, []byte("title")); err == nil {
		out.Filename = string(b)
	}
	if len(u.TitleEnc) > 0 {
		if b, err := crypto.OpenBytes(s.kek, u.TitleEnc, []byte("title")); err == nil {
			out.Title = string(b)
		}
	}
	chunks, err := s.db.Chunks(r.Context(), u.ID)
	if err == nil {
		for _, c := range chunks {
			out.Received = append(out.Received, c.Index)
			out.ReceivedBytes += c.Size
		}
	}
	return out
}

func chunkCount(size, chunk int64) int64 {
	if chunk <= 0 {
		return 0
	}
	return (size + chunk - 1) / chunk
}

type createUploadReq struct {
	Filename string `json:"filename"`
	Title    string `json:"title"`
	Size     int64  `json:"size"`
	Mime     string `json:"mime"`
	Kind     string `json:"kind"`
	// Fingerprint is the client's identity for this file — name, size and
	// last-modified, hashed. Two presses of the upload button, or a phone that
	// restarted and re-queued its work, produce the same one and therefore resume the
	// same session instead of uploading the file twice.
	Fingerprint string `json:"fingerprint"`
	ChunkSize   int64  `json:"chunkSize"`
}

// handleCreateUpload opens (or rejoins) a resumable upload.
func (s *Server) handleCreateUpload(w http.ResponseWriter, r *http.Request) {
	user := userRow(r)
	if user == nil {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	var req createUploadReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 64<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request")
		return
	}
	req.Filename = strings.TrimSpace(req.Filename)
	if req.Filename == "" {
		writeErr(w, http.StatusBadRequest, "filename is required")
		return
	}
	if req.Size <= 0 {
		writeErr(w, http.StatusBadRequest, "size must be known before an upload starts")
		return
	}
	if req.Size > maxUpload {
		writeErr(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("that file is larger than the %s limit", humanBytes(maxUpload)))
		return
	}
	if req.Fingerprint == "" {
		// Not fatal: without one the duplicate guard simply cannot help, so derive
		// something rather than refuse an otherwise valid upload.
		req.Fingerprint = fmt.Sprintf("%s:%d", req.Filename, req.Size)
	}

	// An existing live session for the same file is a resume, not an error. This is
	// the answer to "the user pressed upload twice" and to "the phone re-queued its
	// work after a restart" alike.
	if existing, err := s.db.LiveUploadByFingerprint(r.Context(), user.ID, req.Fingerprint); err == nil {
		writeJSON(w, http.StatusOK, s.uploadJSON(r, existing))
		return
	} else if !errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	// Refuse before the first byte rather than at 90%: the user can act on "there is
	// not enough room" now, and cannot act on it after twenty minutes of uploading.
	if msg := s.checkUploadRoom(req.Size); msg != "" {
		writeErr(w, http.StatusInsufficientStorage, msg)
		return
	}

	chunk := req.ChunkSize
	if chunk <= 0 {
		chunk = uploadChunkDefault
	}
	if chunk < uploadChunkMin {
		chunk = uploadChunkMin
	}
	if chunk > uploadChunkMax {
		chunk = uploadChunkMax
	}

	id, err := newUploadID()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "server error")
		return
	}
	nameEnc, err := crypto.SealBytes(s.kek, []byte(req.Filename), []byte("title"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "encrypt error")
		return
	}
	var titleEnc []byte
	if t := strings.TrimSpace(req.Title); t != "" {
		if titleEnc, err = crypto.SealBytes(s.kek, []byte(t), []byte("title")); err != nil {
			writeErr(w, http.StatusInternalServerError, "encrypt error")
			return
		}
	}
	row := &db.UploadRow{
		ID:          id,
		UserID:      user.ID,
		Fingerprint: req.Fingerprint,
		FilenameEnc: nameEnc,
		TitleEnc:    titleEnc,
		Size:        req.Size,
		ChunkSize:   chunk,
		Mime:        strings.TrimSpace(req.Mime),
		Kind:        strings.TrimSpace(req.Kind),
		Status:      db.UploadOpen,
	}
	if err := s.db.CreateUpload(r.Context(), row); err != nil {
		// Lost the race against another request for the same file: join theirs.
		if errors.Is(err, db.ErrUploadExists) {
			if existing, e := s.db.LiveUploadByFingerprint(r.Context(), user.ID, req.Fingerprint); e == nil {
				writeJSON(w, http.StatusOK, s.uploadJSON(r, existing))
				return
			}
		}
		s.log.Error("create upload", "err", err)
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if err := os.MkdirAll(s.stagingDir(id), 0o700); err != nil {
		_ = s.db.DeleteUpload(r.Context(), user.ID, id)
		s.log.Error("upload staging", "err", err)
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	row.CreatedAt, row.UpdatedAt = time.Now().Unix(), time.Now().Unix()
	writeJSON(w, http.StatusCreated, s.uploadJSON(r, row))
}

// handleListUploads backs the upload manager, including after a restart: the queue
// the user left behind is server-side, so it is still there.
func (s *Server) handleListUploads(w http.ResponseWriter, r *http.Request) {
	user := userRow(r)
	if user == nil {
		writeErr(w, http.StatusUnauthorized, "no session")
		return
	}
	rows, err := s.db.ListUploads(r.Context(), user.ID, 200)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := make([]uploadSessionJSON, 0, len(rows))
	for _, row := range rows {
		out = append(out, s.uploadJSON(r, row))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (s *Server) handleGetUpload(w http.ResponseWriter, r *http.Request) {
	user, row, ok := s.lookupUpload(w, r)
	if !ok {
		return
	}
	_ = user
	writeJSON(w, http.StatusOK, s.uploadJSON(r, row))
}

// handlePutUploadChunk receives one piece.
//
// The body is streamed straight to its own file. It is never buffered whole, which
// is the property that lets a 12 GB video move through a container with a modest
// memory limit — and the property whose absence is the reported bug.
func (s *Server) handlePutUploadChunk(w http.ResponseWriter, r *http.Request) {
	user, row, ok := s.lookupUpload(w, r)
	if !ok {
		return
	}
	if row.Status != db.UploadOpen {
		writeErr(w, http.StatusConflict, "this upload is no longer accepting data")
		return
	}
	idx, err := strconv.ParseInt(r.PathValue("idx"), 10, 64)
	if err != nil || idx < 0 || idx >= chunkCount(row.Size, row.ChunkSize) {
		writeErr(w, http.StatusBadRequest, "chunk index outside this upload")
		return
	}

	// Exactly how long this chunk must be. Every chunk but the last is a full one;
	// enforcing it means a mis-numbered or truncated chunk is caught here rather than
	// becoming a corrupt file that only fails to play weeks later.
	want := row.ChunkSize
	if idx == chunkCount(row.Size, row.ChunkSize)-1 {
		want = row.Size - idx*row.ChunkSize
	}

	body := http.MaxBytesReader(w, r.Body, want+1)
	defer body.Close()

	dir := s.stagingDir(row.ID)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	// Write to a temp file and rename into place, so a chunk that is interrupted
	// halfway never appears as a complete one. The rename is what makes "the server
	// has chunk 7" mean "the server has all of chunk 7".
	tmp, err := os.CreateTemp(dir, ".part-*")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	tmpName := tmp.Name()
	defer func() {
		tmp.Close()
		os.Remove(tmpName) // no-op once renamed
	}()

	h := sha256.New()
	n, err := io.Copy(io.MultiWriter(tmp, h), body)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "the connection dropped before the chunk finished; send it again")
		return
	}
	if n != want {
		writeErr(w, http.StatusBadRequest, fmt.Sprintf("chunk %d should be %d bytes, got %d", idx, want, n))
		return
	}
	sum := hex.EncodeToString(h.Sum(nil))
	// Integrity check, when the client offers one. A mobile connection that corrupts
	// a chunk rather than dropping it is rare and miserable to debug from the far end;
	// this turns it into one rejected chunk.
	if claimed := strings.TrimSpace(r.Header.Get("X-Chunk-SHA256")); claimed != "" && !strings.EqualFold(claimed, sum) {
		writeErr(w, http.StatusBadRequest, "chunk failed its checksum; send it again")
		return
	}
	if err := tmp.Sync(); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := tmp.Close(); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := os.Rename(tmpName, chunkPath(dir, idx)); err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}
	if err := s.db.RecordChunk(r.Context(), row.ID, db.UploadChunk{Index: idx, Size: n, SHA256: sum}); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	_ = user
	// Return the session rather than an empty 204: a client that has been away gets
	// the authoritative received-set back on every chunk, so it self-corrects.
	fresh, err := s.db.GetUpload(r.Context(), user.ID, row.ID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	writeJSON(w, http.StatusOK, s.uploadJSON(r, fresh))
}

type completeUploadReq struct {
	// SHA256 of the whole file, when the client computed one. Optional: a phone
	// hashing 12 GB costs a full extra read of the file, which is a real battery and
	// time cost, so it is the client's call.
	SHA256 string `json:"sha256"`
}

// handleCompleteUpload assembles the chunks into a library item.
func (s *Server) handleCompleteUpload(w http.ResponseWriter, r *http.Request) {
	user, row, ok := s.lookupUpload(w, r)
	if !ok {
		return
	}
	var req completeUploadReq
	if r.Body != nil {
		_ = json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&req)
	}

	// Already finished: answer with the item rather than an error. A client whose
	// success response was lost to a dropped connection retries completion, and that
	// retry must not read as a failure.
	if row.Status == db.UploadCompleted && row.MediaID != 0 {
		writeJSON(w, http.StatusOK, map[string]any{"id": row.MediaID, "deduped": true, "status": db.UploadCompleted})
		return
	}
	claimed, err := s.db.ClaimUploadForAssembly(r.Context(), user.ID, row.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !claimed {
		writeErr(w, http.StatusConflict, "this upload is already being finished")
		return
	}

	chunks, err := s.db.Chunks(r.Context(), row.ID)
	if err != nil {
		_ = s.db.FinishUpload(r.Context(), row.ID, db.UploadOpen, 0, "")
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	// Gaps are recoverable, not fatal: hand back the received set and reopen the
	// session so the client sends what is missing. This is the ordinary ending for an
	// upload interrupted near the finish.
	if missing := missingChunks(chunks, row.Size, row.ChunkSize); len(missing) > 0 {
		_ = s.db.FinishUpload(r.Context(), row.ID, db.UploadOpen, 0, "")
		fresh, _ := s.db.GetUpload(r.Context(), user.ID, row.ID)
		body := map[string]any{"error": "some chunks are still missing", "missing": missing}
		if fresh != nil {
			body["session"] = s.uploadJSON(r, fresh)
		}
		writeJSON(w, http.StatusConflict, body)
		return
	}

	dir := s.stagingDir(row.ID)
	reader := &chunkReader{dir: dir, count: chunkCount(row.Size, row.ChunkSize)}
	defer reader.Close()

	filename := ""
	if b, err := crypto.OpenBytes(s.kek, row.FilenameEnc, []byte("title")); err == nil {
		filename = string(b)
	}
	title := ""
	if len(row.TitleEnc) > 0 {
		if b, err := crypto.OpenBytes(s.kek, row.TitleEnc, []byte("title")); err == nil {
			title = string(b)
		}
	}

	res, err := s.ingestBlob(r.Context(), reader, ingestMeta{Filename: filename, Title: title, Kind: row.Kind})
	if err != nil {
		// The parts are still on disk and still valid, so reopening is honest: the
		// user can retry completion without re-sending 12 GB.
		_ = s.db.FinishUpload(r.Context(), row.ID, db.UploadOpen, 0, err.Error())
		s.log.Error("assemble upload", "id", row.ID, "err", err)
		writeErr(w, http.StatusInternalServerError, "could not store the assembled file")
		return
	}
	// A whole-file checksum, when offered, is checked *after* storing rather than
	// before: the store computes the hash as it writes, so verifying costs nothing
	// extra, where verifying first would mean reading every byte twice.
	if want := strings.TrimSpace(req.SHA256); want != "" && !strings.EqualFold(want, res.SHA256) {
		_ = s.db.FinishUpload(r.Context(), row.ID, db.UploadFailed, 0, "the assembled file did not match the checksum the client sent")
		s.log.Warn("upload checksum mismatch", "id", row.ID, "want", want, "got", res.SHA256)
		writeErr(w, http.StatusBadRequest, "the uploaded file did not match its checksum; please upload it again")
		return
	}

	if err := s.db.FinishUpload(r.Context(), row.ID, db.UploadCompleted, res.ID, ""); err != nil {
		s.log.Warn("finish upload", "err", err)
	}
	reader.Close()
	s.purgeStaging(row.ID)
	s.log.Info("upload completed",
		"id", row.ID, "media", res.ID, "bytes", row.Size, "deduped", res.Deduped, "user", user.Username)

	status := http.StatusCreated
	if res.Deduped {
		status = http.StatusOK
	}
	writeJSON(w, status, map[string]any{
		"id": res.ID, "sha256": res.SHA256, "deduped": res.Deduped, "kind": res.Kind, "status": db.UploadCompleted,
	})
}

// handleCancelUpload aborts an upload and reclaims its staging bytes.
//
// It is also how a completed row is removed from the manager's history, which is why
// it does not care what state the session is in.
func (s *Server) handleCancelUpload(w http.ResponseWriter, r *http.Request) {
	user, row, ok := s.lookupUpload(w, r)
	if !ok {
		return
	}
	if err := s.db.DeleteUpload(r.Context(), user.ID, row.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	s.purgeStaging(row.ID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

// ── plumbing ───────────────────────────────────────────────────────────

func userRow(r *http.Request) *db.UserRow {
	u, _ := r.Context().Value(userKey).(*db.UserRow)
	return u
}

// lookupUpload resolves the session named in the path, scoped to the caller.
func (s *Server) lookupUpload(w http.ResponseWriter, r *http.Request) (*db.UserRow, *db.UploadRow, bool) {
	user := userRow(r)
	if user == nil {
		writeErr(w, http.StatusUnauthorized, "no session")
		return nil, nil, false
	}
	id := r.PathValue("id")
	if !validUploadID(id) {
		writeErr(w, http.StatusBadRequest, "bad upload id")
		return nil, nil, false
	}
	row, err := s.db.GetUpload(r.Context(), user.ID, id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "no such upload")
		return nil, nil, false
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return nil, nil, false
	}
	return user, row, true
}

// validUploadID gates the one value from a request that becomes a path.
//
// The id is server-minted hex, so this is a tautology in the happy case — which is
// the point. It is checked at the boundary anyway, because "that value is always
// safe" is a property that holds until someone adds a second way to mint one.
func validUploadID(id string) bool {
	if len(id) != 32 {
		return false
	}
	for i := 0; i < len(id); i++ {
		c := id[i]
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return false
		}
	}
	return true
}

func newUploadID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *Server) stagingDir(id string) string { return filepath.Join(s.uploadDir, id) }

func chunkPath(dir string, idx int64) string {
	// Zero-padded so a directory listing sorts in transfer order, which is worth the
	// nothing it costs when someone is looking at the staging area by hand.
	return filepath.Join(dir, fmt.Sprintf("%08d.part", idx))
}

func (s *Server) purgeStaging(id string) {
	if !validUploadID(id) {
		return
	}
	if err := os.RemoveAll(s.stagingDir(id)); err != nil && !os.IsNotExist(err) {
		s.log.Warn("upload staging cleanup", "id", id, "err", err)
	}
}

// missingChunks reports which indices are absent or the wrong length.
func missingChunks(have []db.UploadChunk, size, chunkSize int64) []int64 {
	total := chunkCount(size, chunkSize)
	got := make(map[int64]int64, len(have))
	for _, c := range have {
		got[c.Index] = c.Size
	}
	var missing []int64
	for i := int64(0); i < total; i++ {
		want := chunkSize
		if i == total-1 {
			want = size - i*chunkSize
		}
		if got[i] != want {
			missing = append(missing, i)
		}
	}
	sort.Slice(missing, func(a, b int) bool { return missing[a] < missing[b] })
	return missing
}

// chunkReader presents the staged parts as one stream, opening each only when the
// read reaches it.
//
// Lazily, rather than an io.MultiReader over pre-opened files: an 8 GiB upload in 8
// MiB pieces is a thousand parts, and holding a thousand file handles open for the
// length of an encrypt-and-write is a way to meet the process's descriptor limit for
// no benefit.
type chunkReader struct {
	dir   string
	count int64
	idx   int64
	cur   *os.File
}

func (c *chunkReader) Read(p []byte) (int, error) {
	for {
		if c.cur == nil {
			if c.idx >= c.count {
				return 0, io.EOF
			}
			f, err := os.Open(chunkPath(c.dir, c.idx))
			if err != nil {
				return 0, fmt.Errorf("upload part %d: %w", c.idx, err)
			}
			c.cur = f
		}
		n, err := c.cur.Read(p)
		if n > 0 {
			return n, nil
		}
		if errors.Is(err, io.EOF) {
			c.cur.Close()
			c.cur = nil
			c.idx++
			continue
		}
		if err != nil {
			return 0, err
		}
	}
}

func (c *chunkReader) Close() error {
	if c.cur != nil {
		err := c.cur.Close()
		c.cur = nil
		return err
	}
	return nil
}

// checkUploadRoom returns a user-facing explanation when there is not enough disk to
// see this upload through, or "" when there is.
//
// It counts the file twice when staging and the media store share a filesystem,
// because they genuinely are both on disk at once: assembly reads the parts and
// writes the encrypted blob before anything is deleted. Sharing is inferred from the
// two volumes reporting the same free space, which is a heuristic — but the direction
// it is wrong in is asking for more headroom than strictly needed, which is the safe
// direction for a check whose failure mode is a wedged upload at 99%.
func (s *Server) checkUploadRoom(size int64) string {
	stagingFree, err1 := freeBytes(existingAncestor(s.uploadDir))
	mediaFree, err2 := freeBytes(existingAncestor(s.cfg.MediaDir))
	if err1 != nil || err2 != nil {
		// A filesystem that will not answer is not grounds for refusing an upload.
		return ""
	}
	need := size
	if abs64(stagingFree-mediaFree) < 1<<20 {
		need = size * 2
	}
	// A little headroom beyond the file itself: a filesystem at literally zero free
	// takes the database and the logs down with it, not just this upload.
	need += 256 << 20
	if stagingFree < need {
		return fmt.Sprintf("not enough room to upload this: it needs about %s free and the cache volume has %s. Free some space or point OPPAI_CACHE_DIR at a larger share.",
			humanBytes(need), humanBytes(stagingFree))
	}
	if mediaFree < size+(256<<20) {
		return fmt.Sprintf("not enough room to store this: it needs about %s free and the media volume has %s. Free some space or point OPPAI_MEDIA_DIR at a larger share.",
			humanBytes(size), humanBytes(mediaFree))
	}
	return ""
}

// existingAncestor walks up until it finds a directory that exists, because statfs on
// a path that has not been created yet fails and would read as "no free space".
func existingAncestor(path string) string {
	p := path
	for i := 0; i < 8; i++ {
		if _, err := os.Stat(p); err == nil {
			return p
		}
		parent := filepath.Dir(p)
		if parent == p {
			break
		}
		p = parent
	}
	return p
}

func abs64(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}

// sweepUploads reclaims what abandoned uploads are holding.
//
// Two kinds of rubbish, and both have to be handled or the cache volume grows
// forever: sessions whose client never came back, and staging directories with no
// session at all — the residue of a crash between creating the directory and
// committing the row, or of a database restored from a backup.
func (s *Server) sweepUploads() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	window := uploadStaleLive
	if h := s.settings.Get().UploadStaleHours; h > 0 {
		window = time.Duration(h) * time.Hour
	}
	live := time.Now().Add(-window).Unix()
	done := time.Now().Add(-uploadStaleDone).Unix()
	stale, err := s.db.StaleUploads(ctx, live, done)
	if err != nil {
		s.log.Warn("upload sweep", "err", err)
		return
	}
	for _, row := range stale {
		if err := s.db.DeleteUpload(ctx, row.UserID, row.ID); err != nil {
			s.log.Warn("upload sweep delete", "id", row.ID, "err", err)
			continue
		}
		s.purgeStaging(row.ID)
	}

	known, err := s.db.AllLiveUploadIDs(ctx)
	if err != nil {
		return
	}
	entries, err := os.ReadDir(s.uploadDir)
	if err != nil {
		return // nothing staged yet
	}
	for _, e := range entries {
		if !e.IsDir() || known[e.Name()] || !validUploadID(e.Name()) {
			continue
		}
		s.log.Info("removing orphaned upload staging", "id", e.Name())
		s.purgeStaging(e.Name())
	}
	if n := len(stale); n > 0 {
		s.log.Info("upload sweep", "removed", n)
	}
}
