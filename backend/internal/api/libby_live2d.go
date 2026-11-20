package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// Libby as a Live2D model.
//
//	GET    /api/libby/live2d                 the model's settings, and whether the runtime is here
//	POST   /api/libby/live2d                 the body is the model folder, zipped
//	PATCH  /api/libby/live2d                 {enabled, moods, worn, scale, x, y}
//	DELETE /api/libby/live2d
//	GET    /api/libby/live2d/files/{name...} one of its files, by served name
//	GET    /api/libby/live2d/core.js         Live2D's Cubism Core, when it has been provided
//	POST   /api/libby/live2d/core            (admin) the body is live2dcubismcore.min.js
//	POST   /api/libby/live2d/core/fetch      (admin) fetch it from Live2D's own CDN
//
// Her portrait has been pictures: an outfit's art per mood, swapped as she feels. A
// Live2D model is her drawn once and moved — blinking, breathing, her hair swinging, her
// mouth moving with her voice, her face changing with her mood through the model's own
// expressions. The model is the user's, per user like everything else of hers, sealed
// on disk file by file; the renderer is the browser's (web/src/views/libby-live2d.ts).
//
// What cannot be shipped is Live2D's runtime. Cubism Core is Live2D Inc.'s, under their
// proprietary licence, and is not in this repository or the image. An admin provides it
// once for the server — uploaded, or fetched from Live2D's CDN on asking, which needs the
// internet that once and never again. It is a script run on this origin, which is why
// only an admin may put it there, and it is checked to be Live2D's before it is kept.

// live2dMaxZip bounds an upload. Models with 8K textures run to tens of megabytes.
const live2dMaxZip = 200 << 20

// live2dCoreURL is where Live2D publishes Cubism Core for the web.
const live2dCoreURL = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"

// live2dSettings is what is kept about her model.
type live2dSettings struct {
	Name        string             `json:"name"`
	Enabled     bool               `json:"enabled"`
	Expressions []live2dExpression `json:"expressions"`
	Idle        string             `json:"idle,omitempty"`
	Motions     int                `json:"motions"`
	// Moods are which expressions she wears for each of her moods; Worn the ones she
	// wears all the time — a hat, glasses — whatever her mood.
	Moods map[string][]string `json:"moods"`
	Worn  []string            `json:"worn,omitempty"`
	// Scale, X and Y frame her in the portrait: 1 fits her height, and the offsets are
	// fractions of the frame.
	Scale float64 `json:"scale"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	// Files are her served names; Size their total.
	Files     []string `json:"files"`
	Size      int64    `json:"size"`
	Texture   int      `json:"texture"`
	CreatedAt int64    `json:"createdAt"`
}

func (s *Server) live2dDir(userID int64) string {
	return filepath.Join(s.chatUserDir(userID), "live2d")
}

func (s *Server) live2dSettingsPath(userID int64) string {
	return filepath.Join(s.live2dDir(userID), "model.enc")
}

// live2dFilePath is where one served file is sealed. Served names are plain
// ("exp/3.exp3.json"); on disk the separator becomes an underscore so the folder is flat.
func (s *Server) live2dFilePath(userID int64, name string) string {
	return filepath.Join(s.live2dDir(userID), "f_"+strings.ReplaceAll(name, "/", "_")+".enc")
}

func live2dAAD(userID int64, name string) []byte {
	return []byte(fmt.Sprintf("libby-live2d:%d:%s", userID, name))
}

func (s *Server) live2dCorePath() string { return filepath.Join(s.chatDir, "live2dcubismcore.js") }

// readLive2D reads her model's settings; nil when she has none. The caller holds chatMu.
func (s *Server) readLive2D(userID int64) (*live2dSettings, error) {
	blob, err := os.ReadFile(s.live2dSettingsPath(userID))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, live2dAAD(userID, "settings"))
	if err != nil {
		return nil, err
	}
	var out live2dSettings
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if out.Moods == nil {
		out.Moods = map[string][]string{}
	}
	return &out, nil
}

func (s *Server) writeLive2D(userID int64, m *live2dSettings) error {
	raw, err := json.Marshal(m)
	if err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, raw, live2dAAD(userID, "settings"))
	if err != nil {
		return err
	}
	return writeFileAtomic(s.live2dSettingsPath(userID), blob)
}

// live2dView is the settings with what the browser needs besides.
type live2dView struct {
	Model *live2dSettings `json:"model"`
	// Core says the runtime is on the server; CoreAdmin that this user may provide it.
	Core      bool `json:"core"`
	CoreAdmin bool `json:"coreAdmin"`
}

func (s *Server) live2dViewFor(r *http.Request, userID int64) (live2dView, error) {
	s.chatMu.Lock()
	m, err := s.readLive2D(userID)
	s.chatMu.Unlock()
	if err != nil {
		return live2dView{}, err
	}
	_, statErr := os.Stat(s.live2dCorePath())
	u, _ := s.chatUser(r)
	return live2dView{Model: m, Core: statErr == nil, CoreAdmin: u != nil && u.IsAdmin}, nil
}

func (s *Server) handleGetLive2D(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	view, err := s.live2dViewFor(r, u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read her model")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (s *Server) handleUploadLive2D(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, live2dMaxZip+1))
	if err != nil || len(data) > live2dMaxZip {
		writeErr(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("a model can be at most %d MB zipped", live2dMaxZip>>20))
		return
	}
	model, err := readLive2DZip(data)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	settings := &live2dSettings{
		Name: model.Name, Enabled: true, Expressions: model.Expressions, Idle: model.Idle, Motions: model.Motions,
		Moods: guessLive2DMoods(model.Expressions), Scale: 1, Texture: model.Texture, CreatedAt: time.Now().UnixMilli(),
	}
	for name, body := range model.Files {
		settings.Files = append(settings.Files, name)
		settings.Size += int64(len(body))
	}

	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	// The old model goes first: its files are named the same way, and a half-replaced
	// folder would load a new moc against old textures.
	if err := os.RemoveAll(s.live2dDir(u.ID)); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't clear the old model")
		return
	}
	for name, body := range model.Files {
		blob, err := crypto.SealBytes(s.kek, body, live2dAAD(u.ID, name))
		if err == nil {
			err = writeFileAtomic(s.live2dFilePath(u.ID, name), blob)
		}
		if err != nil {
			_ = os.RemoveAll(s.live2dDir(u.ID))
			writeErr(w, http.StatusInternalServerError, "couldn't store the model")
			return
		}
	}
	if err := s.writeLive2D(u.ID, settings); err != nil {
		_ = os.RemoveAll(s.live2dDir(u.ID))
		writeErr(w, http.StatusInternalServerError, "couldn't store the model")
		return
	}
	_, statErr := os.Stat(s.live2dCorePath())
	writeJSON(w, http.StatusOK, live2dView{Model: settings, Core: statErr == nil, CoreAdmin: u.IsAdmin})
}

func (s *Server) handlePatchLive2D(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var req struct {
		Enabled *bool                `json:"enabled"`
		Moods   *map[string][]string `json:"moods"`
		Worn    *[]string            `json:"worn"`
		Scale   *float64             `json:"scale"`
		X       *float64             `json:"x"`
		Y       *float64             `json:"y"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	s.chatMu.Lock()
	defer s.chatMu.Unlock()
	m, err := s.readLive2D(u.ID)
	if err != nil || m == nil {
		writeErr(w, http.StatusNotFound, "she has no Live2D model")
		return
	}
	if req.Enabled != nil {
		m.Enabled = *req.Enabled
	}
	if req.Moods != nil {
		m.Moods = cleanLive2DMoods(*req.Moods, m.Expressions)
	}
	if req.Worn != nil {
		m.Worn = cleanLive2DWorn(*req.Worn, m.Expressions)
	}
	if req.Scale != nil {
		m.Scale = clampFloat(*req.Scale, 0.3, 4)
	}
	if req.X != nil {
		m.X = clampFloat(*req.X, -1, 1)
	}
	if req.Y != nil {
		m.Y = clampFloat(*req.Y, -1, 1)
	}
	if err := s.writeLive2D(u.ID, m); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't save it")
		return
	}
	writeJSON(w, http.StatusOK, m)
}

func (s *Server) handleDeleteLive2D(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	s.chatMu.Lock()
	err := os.RemoveAll(s.live2dDir(u.ID))
	s.chatMu.Unlock()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't remove it")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// live2dTypes is what each kind of file is served as.
func live2dType(name string) string {
	switch strings.ToLower(path.Ext(name)) {
	case ".json":
		return "application/json"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".webp":
		return "image/webp"
	case ".wav":
		return "audio/wav"
	case ".mp3":
		return "audio/mpeg"
	case ".ogg":
		return "audio/ogg"
	}
	return "application/octet-stream"
}

func (s *Server) handleGetLive2DFile(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	name := r.PathValue("name")
	s.chatMu.Lock()
	m, err := s.readLive2D(u.ID)
	s.chatMu.Unlock()
	if err != nil || m == nil {
		writeErr(w, http.StatusNotFound, "she has no Live2D model")
		return
	}
	// Only a name the model was stored under: the path wildcard never reaches the disk.
	known := false
	for _, f := range m.Files {
		known = known || f == name
	}
	if !known {
		writeErr(w, http.StatusNotFound, "no such file in her model")
		return
	}
	blob, err := os.ReadFile(s.live2dFilePath(u.ID, name))
	if err != nil {
		writeErr(w, http.StatusNotFound, "no such file in her model")
		return
	}
	raw, err := crypto.OpenBytes(s.kek, blob, live2dAAD(u.ID, name))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "unreadable")
		return
	}
	w.Header().Set("Content-Type", live2dType(name))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	// The names are the same for every model, so a new upload must not be served from
	// cache: revalidated by the upload time, which changes with every model.
	etag := fmt.Sprintf(`"%d-%s"`, m.CreatedAt, name)
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "private, no-cache")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	_, _ = w.Write(raw)
}

/* ------------------------------------------------------------ the runtime */

func (s *Server) handleGetLive2DCore(w http.ResponseWriter, r *http.Request) {
	body, err := os.ReadFile(s.live2dCorePath())
	if err != nil {
		writeErr(w, http.StatusNotFound, "Live2D's Cubism Core has not been added to this server")
		return
	}
	w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "private, no-cache")
	_, _ = w.Write(body)
}

// validLive2DCore says a file is Cubism Core for the web: Live2D's notice and the
// global it defines, at a plausible size. It is a script that will run on this origin,
// so anything else is refused.
func validLive2DCore(body []byte) error {
	if len(body) < 50<<10 || len(body) > 4<<20 {
		return errors.New("that is not Cubism Core — it should be live2dcubismcore.min.js, about 200 KB")
	}
	head := body[:min(len(body), 4096)]
	if !bytes.Contains(head, []byte("Live2D Cubism Core")) || !bytes.Contains(body, []byte("Live2DCubismCore")) {
		return errors.New("that is not Cubism Core — it should be live2dcubismcore.min.js from the Cubism SDK for Web")
	}
	return nil
}

func (s *Server) keepLive2DCore(body []byte) error {
	if err := validLive2DCore(body); err != nil {
		return err
	}
	return writeFileAtomic(s.live2dCorePath(), body)
}

func (s *Server) handleUploadLive2DCore(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4<<20+1))
	if err != nil {
		writeErr(w, http.StatusRequestEntityTooLarge, "that is too large to be Cubism Core")
		return
	}
	if err := s.keepLive2DCore(body); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"core": true})
}

// live2dCoreHTTP fetches the runtime; a var so a test can point it elsewhere.
var (
	live2dCoreHTTP   = &http.Client{Timeout: 60 * time.Second}
	live2dCoreSource = live2dCoreURL
)

func (s *Server) handleFetchLive2DCore(w http.ResponseWriter, r *http.Request) {
	body, err := fetchLive2DCore(r.Context())
	if err != nil {
		// Live2D refusing, or no internet: theirs, not the user's session (502, never 401).
		writeErr(w, http.StatusBadGateway, "couldn't fetch Cubism Core from Live2D: "+err.Error()+" — download it from live2d.com and upload it instead")
		return
	}
	if err := s.keepLive2DCore(body); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"core": true})
}

func fetchLive2DCore(ctx context.Context) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, live2dCoreSource, nil)
	if err != nil {
		return nil, err
	}
	resp, err := live2dCoreHTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Live2D answered %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 4<<20+1))
}
