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
	"github.com/youruser/oppailib/internal/db"
	"golang.org/x/image/draw"
)

// Covers, trigger words and defaults for ComfyUI's files (db/comfy_notes.go).
//
// The Image studio shows each LoRA's picture, puts its trigger words in the prompt when
// it goes on and sets its weight to the one recommended, because Automatic1111 and
// InvokeAI keep all three. ComfyUI keeps only the file, so the Video studio's LoRAs
// were a list of names. Now OppaiLib keeps them: an install from Civitai's video mode
// writes the version's trigger words, recommended strength and first showcase still for
// each file it lands, with the version it was, and the studio can set any of it by hand
// — a frame of a clip as the cover, a picture from disk or the gallery, or another of
// the version's showcase stills.

// comfyCoverSide is a cover's longer side. The studio shows them at 40 pixels; this
// leaves room for a sharp one on a phone's dense screen.
const comfyCoverSide = 384

// comfyCoverAAD binds a sealed cover to what it is.
var comfyCoverAAD = []byte("comfy cover")

type comfyNoteOut struct {
	Triggers []string          `json:"triggers"`
	Cover    bool              `json:"cover"`
	Defaults *db.ComfyDefaults `json:"defaults,omitempty"`
	Civitai  *db.ComfyCivitai  `json:"civitai,omitempty"`
	// V changes whenever the note does, for the cover's URL to bust the cache by.
	V int64 `json:"v"`
}

func comfyNoteOutOf(n db.ComfyNote) comfyNoteOut {
	out := comfyNoteOut{Triggers: n.Triggers, Cover: n.HasCover, V: n.UpdatedAt}
	if !n.Defaults.IsZero() {
		d := n.Defaults
		out.Defaults = &d
	}
	if !n.Civitai.IsZero() {
		c := n.Civitai
		out.Civitai = &c
	}
	return out
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
		out[name] = comfyNoteOutOf(n)
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

// comfyNoteReq changes what it names: words, defaults, or both. An older client sends
// only the words.
type comfyNoteReq struct {
	Name     string            `json:"name"`
	Triggers *[]string         `json:"triggers"`
	Defaults *db.ComfyDefaults `json:"defaults"`
}

func (s *Server) handlePutComfyNote(w http.ResponseWriter, r *http.Request) {
	var req comfyNoteReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		writeErr(w, http.StatusBadRequest, "name the file and its trigger words or defaults")
		return
	}
	if req.Triggers != nil {
		if err := s.db.PutComfyTriggers(r.Context(), req.Name, cleanTriggers(*req.Triggers)); err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	if req.Defaults != nil {
		if err := s.db.PutComfyDefaults(r.Context(), req.Name, cleanComfyDefaults(*req.Defaults)); err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
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

// cleanComfyDefaults keeps a strength the studio's slider can show, a range only when
// it runs low to high, and a negative of a sentence or two.
func cleanComfyDefaults(d db.ComfyDefaults) db.ComfyDefaults {
	clamp := func(v float64) float64 { return max(-5, min(5, v)) }
	d.Weight, d.WeightMin, d.WeightMax = clamp(d.Weight), clamp(d.WeightMin), clamp(d.WeightMax)
	if d.WeightMin != 0 && d.WeightMax != 0 && d.WeightMin > d.WeightMax {
		d.WeightMin, d.WeightMax = d.WeightMax, d.WeightMin
	}
	d.Negative = strings.TrimSpace(d.Negative)
	if len(d.Negative) > 2000 {
		d.Negative = d.Negative[:2000]
	}
	return d
}

type comfyCoverReq struct {
	Name string `json:"name"`
	// One of: a picture as a data URL (a grabbed frame, a file), a just-made preview,
	// a picture or clip in the studio's gallery (a clip gives its tile), or one of
	// Civitai's showcase stills by its address. Clear takes the cover away.
	ImageData   string `json:"imageData"`
	PreviewID   string `json:"previewId"`
	GalleryName string `json:"galleryName"`
	URL         string `json:"url"`
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
	case req.URL != "":
		// Only the catalogue's own pictures: the server fetching any address it is
		// handed would be a way to have it fetch the LAN.
		if !civitaiHostAllowed(req.URL) {
			return nil, errors.New("that isn't a picture on Civitai")
		}
		data, _, err := s.civitaiFetchImage(ctx, req.URL)
		if err != nil {
			return nil, err
		}
		return data, nil
	}
	return nil, errors.New("send a picture, a preview, a gallery picture or a Civitai picture for the cover")
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

// comfyFill is what the catalogue says of a file: what an install from it, or a link
// made from the studio, fills the file's note with.
type comfyFill struct {
	Triggers []string
	// Cover is a showcase still's address.
	Cover    string
	Defaults db.ComfyDefaults
	Civitai  db.ComfyCivitai
}

// civitaiComfyFill reads version v of model m as a fill: its words, its first still,
// and for a LoRA the strength and negative its page recommends (civitai_suggest.go).
func civitaiComfyFill(m *civitaiRawModel, v civitaiRawVersion) comfyFill {
	f := comfyFill{
		Triggers: v.TrainedWords,
		Civitai:  db.ComfyCivitai{ModelID: m.ID, VersionID: v.ID, ModelName: m.Name, VersionName: v.Name},
	}
	if stills := civitaiPreviewURLs(v.Images, 1); len(stills) > 0 {
		f.Cover = stills[0]
	}
	if civitaiIsLora(m.Type) {
		sug := civitaiSuggestionFor(m, v.ID)
		f.Defaults = db.ComfyDefaults{Weight: sug.Weight, WeightMin: sug.WeightMin, WeightMax: sug.WeightMax, Negative: sug.Negative}
	}
	return f
}

// fillComfyNote records which version a file is, and gives it that version's words,
// defaults and cover wherever it has none: what was set by hand stays. The cover is
// fetched last, so a slow image CDN holds up nothing else.
func (s *Server) fillComfyNote(ctx context.Context, name string, f comfyFill) error {
	notes, err := s.db.ComfyNotes(ctx)
	if err != nil {
		return err
	}
	have := notes[name]
	if !f.Civitai.IsZero() {
		if err := s.db.PutComfyCivitai(ctx, name, f.Civitai); err != nil {
			return err
		}
	}
	if words := cleanTriggers(f.Triggers); len(have.Triggers) == 0 && len(words) > 0 {
		if err := s.db.PutComfyTriggers(ctx, name, words); err != nil {
			return err
		}
	}
	d, want := have.Defaults, cleanComfyDefaults(f.Defaults)
	if d.Weight == 0 {
		d.Weight = want.Weight
	}
	if d.WeightMin == 0 && d.WeightMax == 0 {
		d.WeightMin, d.WeightMax = want.WeightMin, want.WeightMax
	}
	if d.Negative == "" {
		d.Negative = want.Negative
	}
	if d != have.Defaults {
		if err := s.db.PutComfyDefaults(ctx, name, d); err != nil {
			return err
		}
	}
	if have.HasCover || f.Cover == "" || !civitaiHostAllowed(f.Cover) {
		return nil
	}
	data, _, err := s.civitaiFetchImage(ctx, f.Cover)
	if err == nil {
		err = s.putComfyCover(ctx, name, data)
	}
	return err
}

// noteComfyInstall is fillComfyNote for a file just installed from Civitai.
// Best-effort and after the download, so nothing here can fail the file itself.
func (s *Server) noteComfyInstall(name string, f comfyFill) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	if err := s.fillComfyNote(ctx, name, f); err != nil {
		s.log.Warn("comfy install: note", "file", name, "err", err)
	}
}
