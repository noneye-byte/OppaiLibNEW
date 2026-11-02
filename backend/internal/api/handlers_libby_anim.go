package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
)

// ── Outfit animations ────────────────────────────────────────────────────────
//
// A wardrobe square becomes an animated sprite in two steps after its picture: a clip
// made from the picture (ComfyUI), then that clip with its background cut away
// (internal/matte). Both are kept here, per square, for the reason the pictures are
// kept in work in progress: a clip comes back into the preview cache, which empties
// after six hours and on every restart, and a set of sixty clips takes longer than
// that to make.
//
// The record and the bytes are two files rather than the one envelope a WIP square
// is. A clip is megabytes, and the board reads every record each time it opens; sixty
// clips decrypted to learn their seeds would be the board's load time.

// libbyAnimStages are the two kinds of clip a square can hold, in the order they are
// made: the clip is made from the picture, and the cut from the clip.
var libbyAnimStages = []string{"clip", "cut"}

func libbyAnimStageValid(stage string) bool {
	for _, s := range libbyAnimStages {
		if s == stage {
			return true
		}
	}
	return false
}

// libbyAnim is one stage of one square, as its record is stored and listed.
type libbyAnim struct {
	Emotion string `json:"emotion"`
	Level   int    `json:"level"`
	Stage   string `json:"stage"`
	MIME    string `json:"mime"`
	Seed    int64  `json:"seed"`
	Recipe  string `json:"recipe,omitempty"`
	Width   int    `json:"width,omitempty"`
	Height  int    `json:"height,omitempty"`
	// From is what this stage was made from, in the studio's words: the picture's take
	// for a clip, the clip's for a cut. Stored as given and compared by the studio
	// with what the square holds now, which is how a redone picture shows its clip as
	// out of date without the server having to know what a take is.
	From      string `json:"from,omitempty"`
	Bytes     int    `json:"bytes"`
	UpdatedAt int64  `json:"updatedAt"`
}

func (s *Server) libbyAnimPath(id, emotion string, level int, stage string) string {
	return filepath.Join(s.libbyDir, id+".anim."+emotion+".L"+strconv.Itoa(level)+"."+stage+".enc")
}

// The record's name ends in .meta.enc, not .json.enc: the wardrobe list takes every
// file ending in .json.enc for an outfit.
func (s *Server) libbyAnimMetaPath(id, emotion string, level int, stage string) string {
	return filepath.Join(s.libbyDir, id+".anim."+emotion+".L"+strconv.Itoa(level)+"."+stage+".meta.enc")
}

func (s *Server) readLibbyAnim(id, emotion string, level int, stage string) (*libbyAnim, error) {
	blob, err := os.ReadFile(s.libbyAnimMetaPath(id, emotion, level, stage))
	if err != nil {
		return nil, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, []byte("libby-outfit-anim-meta"))
	if err != nil {
		return nil, err
	}
	var a libbyAnim
	if err := json.Unmarshal(raw, &a); err != nil {
		return nil, err
	}
	a.Emotion, a.Level, a.Stage = emotion, level, stage
	return &a, nil
}

func (s *Server) readLibbyAnimBytes(id, emotion string, level int, stage string) ([]byte, error) {
	blob, err := os.ReadFile(s.libbyAnimPath(id, emotion, level, stage))
	if err != nil {
		return nil, err
	}
	return crypto.OpenBytes(s.kek, blob, []byte("libby-outfit-anim"))
}

// writeLibbyAnim files one stage: the bytes first, then the record, so a record never
// names bytes that are not there yet.
func (s *Server) writeLibbyAnim(id string, a libbyAnim, data []byte) error {
	if err := os.MkdirAll(s.libbyDir, 0o755); err != nil {
		return err
	}
	blob, err := crypto.SealBytes(s.kek, data, []byte("libby-outfit-anim"))
	if err != nil {
		return err
	}
	if err := os.WriteFile(s.libbyAnimPath(id, a.Emotion, a.Level, a.Stage), blob, 0o600); err != nil {
		return err
	}
	raw, err := json.Marshal(a)
	if err != nil {
		return err
	}
	meta, err := crypto.SealBytes(s.kek, raw, []byte("libby-outfit-anim-meta"))
	if err != nil {
		return err
	}
	return os.WriteFile(s.libbyAnimMetaPath(id, a.Emotion, a.Level, a.Stage), meta, 0o600)
}

func (s *Server) removeLibbyAnim(id, emotion string, level int, stage string) {
	_ = os.Remove(s.libbyAnimMetaPath(id, emotion, level, stage))
	_ = os.Remove(s.libbyAnimPath(id, emotion, level, stage))
}

// removeLibbyAnims drops every clip of one outfit, with the outfit.
func (s *Server) removeLibbyAnims(id string) {
	for _, e := range libbySlots {
		for level := 0; level <= maxLibbyLevel; level++ {
			for _, stage := range libbyAnimStages {
				s.removeLibbyAnim(id, e, level, stage)
			}
		}
	}
}

// libbyAnimSlot reads and checks the path's outfit and slot, and the square's tier
// and stage from the query. It writes the error itself.
func (s *Server) libbyAnimSlot(w http.ResponseWriter, r *http.Request, needStage bool) (id, emotion string, level int, stage string, ok bool) {
	id, emotion = r.PathValue("id"), r.PathValue("emotion")
	if !charIDPattern.MatchString(id) || !libbySlotValid(emotion) {
		writeErr(w, http.StatusBadRequest, "bad outfit id or slot")
		return
	}
	stage = r.URL.Query().Get("stage")
	if stage != "" && !libbyAnimStageValid(stage) || needStage && stage == "" {
		writeErr(w, http.StatusBadRequest, "stage is clip or cut")
		return
	}
	if _, err := s.readLibbyOutfit(id); err != nil {
		writeErr(w, http.StatusNotFound, "no such outfit")
		return
	}
	return id, emotion, slotLevel(emotion, libbyLevelParam(r)), stage, true
}

// handleListLibbyOutfitAnims returns every clip's record, without its bytes.
func (s *Server) handleListLibbyOutfitAnims(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !charIDPattern.MatchString(id) {
		writeErr(w, http.StatusBadRequest, "bad outfit id")
		return
	}
	if _, err := s.readLibbyOutfit(id); err != nil {
		writeErr(w, http.StatusNotFound, "no such outfit")
		return
	}
	out := []libbyAnim{}
	for _, e := range libbySlots {
		levels := []int{0}
		if !libbyActivityValid(e) {
			levels = []int{0, 1, 2, 3, 4}
		}
		for _, level := range levels {
			for _, stage := range libbyAnimStages {
				if a, err := s.readLibbyAnim(id, e, level, stage); err == nil {
					out = append(out, *a)
				}
			}
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Level != out[j].Level {
			return out[i].Level < out[j].Level
		}
		if out[i].Emotion != out[j].Emotion {
			return out[i].Emotion < out[j].Emotion
		}
		return out[i].Stage < out[j].Stage
	})
	writeJSON(w, http.StatusOK, map[string]any{"anims": out})
}

type putLibbyAnimReq struct {
	// The clip, as the Video studio names one: its preview's id, or its name in the
	// studio's gallery once the preview has gone.
	ID      string `json:"id"`
	Gallery string `json:"gallery"`
	From    string `json:"from"`
	Recipe  string `json:"recipe"`
}

// handlePutLibbyOutfitAnim files a finished clip as one stage of a square. The clip is
// read from where the server already has it, so megabytes of video never make the
// round trip through the browser; a redo overwrites the stage, as a picture's does.
func (s *Server) handlePutLibbyOutfitAnim(w http.ResponseWriter, r *http.Request) {
	id, emotion, level, stage, ok := s.libbyAnimSlot(w, r, true)
	if !ok {
		return
	}
	var req putLibbyAnimReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil || req.ID == "" && req.Gallery == "" {
		writeErr(w, http.StatusBadRequest, "name the clip by its preview id or its gallery name")
		return
	}
	src, ok := s.clipToUpscale(w, r, s.settings.Get(), clipUpscaleReq{ID: req.ID, Gallery: req.Gallery})
	if !ok {
		return
	}
	if _, video := clipVideoExt(src.mime); !video {
		writeErr(w, http.StatusBadRequest, "only a video clip can be an animated sprite")
		return
	}
	a := libbyAnim{
		Emotion: emotion, Level: level, Stage: stage, MIME: src.mime, Seed: src.record.Seed,
		Recipe: strings.TrimSpace(req.Recipe), Width: src.width, Height: src.height,
		From: strings.TrimSpace(req.From), Bytes: len(src.data), UpdatedAt: time.Now().UnixMilli(),
	}
	if a.Width == 0 {
		a.Width, a.Height = src.record.Width, src.record.Height
	}
	if err := s.writeLibbyAnim(id, a, src.data); err != nil {
		writeErr(w, http.StatusInternalServerError, "write failed")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

// handleGetLibbyOutfitAnim plays one stage of a square, with ranges, as a video
// element seeks.
func (s *Server) handleGetLibbyOutfitAnim(w http.ResponseWriter, r *http.Request) {
	id, emotion, level, stage, ok := s.libbyAnimSlot(w, r, true)
	if !ok {
		return
	}
	a, err := s.readLibbyAnim(id, emotion, level, stage)
	if err != nil {
		writeErr(w, http.StatusNotFound, "nothing animated for that square yet")
		return
	}
	data, err := s.readLibbyAnimBytes(id, emotion, level, stage)
	if err != nil {
		writeErr(w, http.StatusNotFound, "nothing animated for that square yet")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(a.MIME))
	// A redo replaces the clip under the same URL; clients add a version, as for pictures.
	w.Header().Set("Cache-Control", "private, max-age=60")
	http.ServeContent(w, r, "", time.UnixMilli(a.UpdatedAt), bytes.NewReader(data))
}

// handleDeleteLibbyOutfitAnim throws away one stage of a square, or both when no stage
// is named. Taking the clip away takes its cut with it: a cut is only ever of a clip,
// and one left behind would play a take the square no longer has.
func (s *Server) handleDeleteLibbyOutfitAnim(w http.ResponseWriter, r *http.Request) {
	id, emotion, level, stage, ok := s.libbyAnimSlot(w, r, false)
	if !ok {
		return
	}
	if stage != "cut" {
		s.removeLibbyAnim(id, emotion, level, "clip")
	}
	s.removeLibbyAnim(id, emotion, level, "cut")
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

// outfitClipRef names a square's stored clip, for the cut and the enlargement to read
// when its preview has expired: a set takes longer to make than a preview lasts.
type outfitClipRef struct {
	Outfit  string `json:"outfit"`
	Emotion string `json:"emotion"`
	Level   int    `json:"level"`
	// Stage is "clip" (the default) or "cut".
	Stage string `json:"stage"`
}

// libbyAnimClipSource reads a square's stored clip as a clip to work on, its record
// built on base. It says what is wrong as an error the caller writes.
func (s *Server) libbyAnimClipSource(ref outfitClipRef, base genRecord) (clipSource, int, string) {
	stage := ref.Stage
	if stage == "" {
		stage = "clip"
	}
	if !charIDPattern.MatchString(ref.Outfit) || !libbySlotValid(ref.Emotion) || !libbyAnimStageValid(stage) || ref.Level < 0 || ref.Level > maxLibbyLevel {
		return clipSource{}, http.StatusBadRequest, "bad outfit square"
	}
	level := slotLevel(ref.Emotion, ref.Level)
	a, err := s.readLibbyAnim(ref.Outfit, ref.Emotion, level, stage)
	if err != nil {
		return clipSource{}, http.StatusNotFound, "that square has no " + stage + " yet"
	}
	data, err := s.readLibbyAnimBytes(ref.Outfit, ref.Emotion, level, stage)
	if err != nil {
		return clipSource{}, http.StatusNotFound, "that square has no " + stage + " yet"
	}
	base.Seed, base.Width, base.Height = a.Seed, a.Width, a.Height
	base.Clip = &genRecordClip{From: "image", Recipe: a.Recipe}
	return clipSource{data: data, mime: a.MIME, width: a.Width, height: a.Height, record: base}, 0, ""
}
