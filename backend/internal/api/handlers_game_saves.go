package api

import (
	"database/sql"
	"errors"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
)

// Game save backup/restore.
//
//	GET    /api/media/{id}/saves            list a game's saves
//	POST   /api/media/{id}/saves            upload one
//	GET    /api/media/{id}/saves/{save}     download it back
//	DELETE /api/media/{id}/saves/{save}     drop it
//
// A save is an attachment on a game, not a library item — see the game_saves table
// for why. Uploads are accepted as opaque bytes with no kind recognition: a save is
// whatever the game writes (a .sav, a RenPy .save, a zipped folder, a bare JSON
// blob), and guessing at its type could only ever reject something valid.

// maxSaveUpload caps one save file. Saves are kilobytes to a few megabytes; a
// hundred is already far past anything real, and the cap is what stops this
// endpoint from becoming an unmetered way to fill the volume.
const maxSaveUpload = 100 << 20

// gameSave is the JSON shape of one save. The blob path never leaves the server:
// clients address a save by id.
type gameSave struct {
	ID        int64  `json:"id"`
	GameID    int64  `json:"gameId"`
	Label     string `json:"label"`
	Size      int64  `json:"size"`
	SHA256    string `json:"sha256"`
	CreatedAt int64  `json:"createdAt"`
}

func (s *Server) toGameSave(row *db.GameSaveRow) gameSave {
	return gameSave{
		ID:        row.ID,
		GameID:    row.GameID,
		Label:     s.decrypt(row.LabelEnc, "title"),
		Size:      row.Size,
		SHA256:    row.SHA256,
		CreatedAt: row.CreatedAt,
	}
}

// saveIDs resolves both path parameters, confirming the game exists and is a game
// before the save id is trusted for anything.
func (s *Server) saveIDs(w http.ResponseWriter, r *http.Request) (gameID, saveID int64, ok bool) {
	gameID, ok = s.gameID(w, r)
	if !ok {
		return 0, 0, false
	}
	saveID, err := strconv.ParseInt(r.PathValue("save"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad save id")
		return 0, 0, false
	}
	return gameID, saveID, true
}

func (s *Server) handleListGameSaves(w http.ResponseWriter, r *http.Request) {
	gameID, ok := s.gameID(w, r)
	if !ok {
		return
	}
	rows, err := s.db.ListGameSaves(r.Context(), gameID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't list saves")
		return
	}
	items := make([]gameSave, 0, len(rows))
	for _, row := range rows {
		items = append(items, s.toGameSave(row))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Server) handleUploadGameSave(w http.ResponseWriter, r *http.Request) {
	gameID, ok := s.gameID(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxSaveUpload)
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid save upload")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "missing 'file'")
		return
	}
	defer file.Close()

	put, err := s.store.Put(file)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "storage error")
		return
	}

	// The label is what the user will pick from later, so an explicit one wins over
	// the filename — several games write every save as the same "save.dat", and a
	// list of identical names would be useless.
	label := strings.TrimSpace(r.FormValue("label"))
	if label == "" {
		label = filepath.Base(header.Filename)
	}
	if label == "" || label == "." || label == string(filepath.Separator) {
		label = "save"
	}
	if len(label) > 200 {
		label = label[:200]
	}
	labelEnc, err := crypto.SealBytes(s.kek, []byte(label), []byte("title"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't seal the save label")
		return
	}

	row := &db.GameSaveRow{
		GameID:   gameID,
		LabelEnc: labelEnc,
		BlobPath: put.RelPath,
		SHA256:   put.SHA256,
		Size:     put.Size,
	}
	if _, err := s.db.AddGameSave(r.Context(), row); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't record the save")
		return
	}
	writeJSON(w, http.StatusCreated, s.toGameSave(row))
}

func (s *Server) handleDownloadGameSave(w http.ResponseWriter, r *http.Request) {
	gameID, saveID, ok := s.saveIDs(w, r)
	if !ok {
		return
	}
	row, err := s.db.GetGameSave(r.Context(), gameID, saveID)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "save not found")
		return
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	rc, err := s.store.Open(row.BlobPath)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "blob error")
		return
	}
	defer rc.Close()

	// Always an attachment, always octet-stream. A save is bytes to be written back
	// to a game directory; nothing good comes of a browser trying to render one, and
	// a save whose label ends in .html rendering inline would be stored XSS.
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", contentDisposition(s.decrypt(row.LabelEnc, "title")))
	w.Header().Set("Content-Length", strconv.FormatInt(row.Size, 10))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "private, no-store")
	if _, err := io.Copy(w, rc); err != nil {
		s.log.Debug("game save download interrupted", "save", saveID, "err", err)
	}
}

func (s *Server) handleDeleteGameSave(w http.ResponseWriter, r *http.Request) {
	gameID, saveID, ok := s.saveIDs(w, r)
	if !ok {
		return
	}
	existed, err := s.db.DeleteGameSave(r.Context(), gameID, saveID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't delete the save")
		return
	}
	if !existed {
		writeErr(w, http.StatusNotFound, "save not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// contentDisposition builds an attachment header for a user-supplied name.
//
// The name reaches us from a filename the user chose, so it cannot be interpolated
// raw: a quote or newline in it would let the caller inject header content. The
// ASCII fallback is sanitised down to something always safe to quote, and the
// RFC 5987 filename* carries the real name for clients that understand it.
func contentDisposition(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "save"
	}
	var ascii strings.Builder
	for _, r := range name {
		switch {
		case r < 0x20 || r == 0x7f:
			// control characters, including the CR/LF that would split the header
		case r == '"' || r == '\\' || r > 0x7e:
			ascii.WriteByte('_')
		default:
			ascii.WriteRune(r)
		}
	}
	fallback := ascii.String()
	if strings.TrimSpace(fallback) == "" {
		fallback = "save"
	}
	return `attachment; filename="` + fallback + `"; filename*=UTF-8''` + urlPathEscape(name)
}

// urlPathEscape percent-encodes everything outside the RFC 5987 attr-char set, so
// the encoded name can't terminate the header value or the parameter list.
func urlPathEscape(s string) string {
	const hex = "0123456789ABCDEF"
	var b strings.Builder
	for _, c := range []byte(s) {
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9',
			c == '!', c == '#', c == '$', c == '&', c == '+', c == '-',
			c == '.', c == '^', c == '_', c == '`', c == '|', c == '~':
			b.WriteByte(c)
		default:
			b.WriteByte('%')
			b.WriteByte(hex[c>>4])
			b.WriteByte(hex[c&0x0f])
		}
	}
	return b.String()
}
