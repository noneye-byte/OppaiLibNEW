package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/jpeg"
	"net/http"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"golang.org/x/image/draw"
)

// Covers and trigger words for ComfyUI's files (db/comfy_notes.go).
//
// The Image studio shows each LoRA's picture and puts its trigger words in the prompt
// when it goes on, because Automatic1111 and InvokeAI keep both. ComfyUI keeps only
// the file, so the Video studio's LoRAs were a list of names. Now OppaiLib keeps them:
// an install from Civitai's video mode writes the version's trigger words and first
// showcase still for each file it lands, and the studio can set either by hand — a
// frame of a clip as the cover, or a picture from disk or the gallery.

// comfyCoverSide is a cover's longer side. The studio shows them at 40 pixels; this
// leaves room for a sharp one on a phone's dense screen.
const comfyCoverSide = 384

// comfyCoverAAD binds a sealed cover to what it is.
var comfyCoverAAD = []byte("comfy cover")

type comfyNoteOut struct {
	Triggers []string `json:"triggers"`
	Cover    bool     `json:"cover"`
	// V changes whenever the note does, for the cover's URL to bust the cache by.
	V int64 `json:"v"`
}

// handleComfyNotes lists every note, keyed by the name ComfyUI lists the file under.
func (s *Server) handleComfyNotes(w http.ResponseWriter, r *http.Request) {
	notes, err := s.db.ComfyNotes(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make(map[string]comfyNoteOut, len(notes))
	for name, n := range notes {
		out[name] = comfyNoteOut{Triggers: n.Triggers, Cover: n.HasCover, V: n.UpdatedAt}
	}
	writeJSON(w, http.StatusOK, map[string]any{"notes": out})
}

// handleComfyCover serves one file's cover.
func (s *Server) handleComfyCover(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	enc, err := s.db.ComfyCover(r.Context(), name)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(enc) == 0 {
		writeErr(w, http.StatusNotFound, "no cover for that file")
		return
	}
	data, err := crypto.OpenBytes(s.kek, enc, comfyCoverAAD)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "the cover could not be read")
		return
	}
	w.Header().Set("Content-Type", "image/jpeg")
	// The URL carries the note's version, so a changed cover is a new address.
	w.Header().Set("Cache-Control", "private, max-age=86400")
	_, _ = w.Write(data)
}

type comfyTriggersReq struct {
	Name     string   `json:"name"`
	Triggers []string `json:"triggers"`
}

func (s *Server) handlePutComfyTriggers(w http.ResponseWriter, r *http.Request) {
	var req comfyTriggersReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		writeErr(w, http.StatusBadRequest, "name the file and its trigger words")
		return
	}
	if err := s.db.PutComfyTriggers(r.Context(), req.Name, cleanTriggers(req.Triggers)); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// cleanTriggers trims the words, drops blanks and repeats, and keeps a dozen: a
// LoRA's page that lists forty is listing tags, not words to call it up with.
func cleanTriggers(in []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, t := range in {
		t = strings.TrimSpace(strings.Trim(strings.TrimSpace(t), ","))
		if t == "" || len(t) > 200 || seen[strings.ToLower(t)] {
			continue
		}
		seen[strings.ToLower(t)] = true
		out = append(out, t)
		if len(out) == 12 {
			break
		}
	}
	return out
}

type comfyCoverReq struct {
	Name string `json:"name"`
	// One of: a picture as a data URL (a grabbed frame, a file), a just-made preview,
	// or a picture or clip in the studio's gallery (a clip gives its tile). Clear takes
	// the cover away.
	ImageData   string `json:"imageData"`
	PreviewID   string `json:"previewId"`
	GalleryName string `json:"galleryName"`
	Clear       bool   `json:"clear"`
}

func (s *Server) handlePutComfyCover(w http.ResponseWriter, r *http.Request) {
	var req comfyCoverReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 24<<20)).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		writeErr(w, http.StatusBadRequest, "name the file and its cover")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	if req.Clear {
		if err := s.db.PutComfyCover(ctx, req.Name, nil); err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	data, err := s.comfyCoverSource(ctx, req)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.putComfyCover(ctx, req.Name, data); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// comfyCoverSource reads the picture a cover request names.
func (s *Server) comfyCoverSource(ctx context.Context, req comfyCoverReq) ([]byte, error) {
	switch {
	case req.ImageData != "":
		data, err := decodeDataImage(req.ImageData)
		if err != nil || len(data) == 0 {
			return nil, errors.New("the picture didn't come through")
		}
		return data, nil
	case req.PreviewID != "":
		p, ok := s.genCache.get(req.PreviewID)
		if !ok {
			return nil, errors.New("that preview has expired — pick it from the gallery instead")
		}
		if strings.HasPrefix(p.mime, "video/") {
			return nil, errors.New("that is a clip — take a frame of it for the cover")
		}
		return p.data, nil
	case req.GalleryName != "":
		g, err := s.genImageNamed(ctx, req.GalleryName)
		if err != nil {
			return nil, err
		}
		// A clip's tile is the frame the gallery shows it by.
		return s.genImageBytes(g, isClip(g))
	}
	return nil, errors.New("send a picture, a preview or a gallery picture for the cover")
}

// putComfyCover shrinks a picture to a cover and keeps it sealed.
func (s *Server) putComfyCover(ctx context.Context, name string, data []byte) error {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return errors.New("that isn't a picture this server reads (PNG, JPEG, WebP or GIF)")
	}
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 {
		return errors.New("the picture is empty")
	}
	if long := max(w, h); long > comfyCoverSide {
		w, h = max(1, w*comfyCoverSide/long), max(1, h*comfyCoverSide/long)
	}
	small := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.CatmullRom.Scale(small, small.Bounds(), img, b, draw.Src, nil)
	var out bytes.Buffer
	if err := jpeg.Encode(&out, small, &jpeg.Options{Quality: 86}); err != nil {
		return err
	}
	enc, err := crypto.SealBytes(s.kek, out.Bytes(), comfyCoverAAD)
	if err != nil {
		return err
	}
	return s.db.PutComfyCover(ctx, name, enc)
}

// noteComfyInstall gives a file installed from Civitai the version's trigger words
// and its first showcase still as a cover, where it has neither yet: a cover or words
// set by hand stay. Best-effort and after the download, so a slow image CDN never
// holds up the file itself.
func (s *Server) noteComfyInstall(name string, triggers []string, coverURL string) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	notes, err := s.db.ComfyNotes(ctx)
	if err != nil {
		return
	}
	have := notes[name]
	if words := cleanTriggers(triggers); len(have.Triggers) == 0 && len(words) > 0 {
		if err := s.db.PutComfyTriggers(ctx, name, words); err != nil {
			s.log.Warn("comfy install: trigger words", "file", name, "err", err)
		}
	}
	if have.HasCover || coverURL == "" || !civitaiHostAllowed(coverURL) {
		return
	}
	data, _, err := s.civitaiFetchImage(ctx, coverURL)
	if err == nil {
		err = s.putComfyCover(ctx, name, data)
	}
	if err != nil {
		s.log.Warn("comfy install: cover", "file", name, "err", err)
	}
}
