package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"io"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/recognize"
	"github.com/youruser/oppailib/internal/thumbnail"
)

// The studio's own gallery, on Automatic1111.
//
// InvokeAI keeps every picture it makes in a gallery of boards, and the gallery
// endpoints browse that. A1111 keeps nothing a client can list — the outputs folder
// it writes to was read as its gallery for a while, and needed a container mapping
// that most installs never had, so for most it was a panel saying how to set it up.
// So on A1111 the gallery is OppaiLib's: every picture made in Create is kept here
// as it comes back (gen_images, apart from the library — see schema.sql), filed into
// the folder open in the panel, and reaches the library only when moved there.
//
// The endpoints are the same ones InvokeAI's gallery answers on, so a client needs
// no second code path: boards are folders, an image's name is its row id, and the
// two boards that are not folders are "all" and "none" (Unsorted).

// genGalleryAll is the board that lists every picture, in a folder or not.
const genGalleryAll = "all"

// genGalleryMaxBytes bounds one kept picture; a generated PNG is a few megabytes.
const genGalleryMaxBytes = 64 << 20

// genClipMaxBytes bounds one kept clip: what ComfyUI is read for (imagegen.comfyView).
const genClipMaxBytes = 96 << 20

// ownGallery says whether the gallery endpoints are this store rather than the
// generator's: anything that is not InvokeAI. A generator that cannot be reached
// is taken as A1111 too, so the pictures already kept here can still be browsed.
func (s *Server) ownGallery(ctx context.Context, base string) bool {
	kind, err := s.imagegen.Backend(ctx, base)
	return err != nil || kind != imagegen.KindInvokeAI
}

// genRecord is how a kept picture was made: the studio's GenInfo shape, so the
// library takes it unchanged when the picture is moved there, and a superset of the
// portable metadata the gallery's viewer reads from InvokeAI.
type genRecord struct {
	Prompt         string                       `json:"prompt"`
	NegativePrompt string                       `json:"negativePrompt"`
	Model          string                       `json:"model"`
	ModelHash      string                       `json:"modelHash,omitempty"`
	VAE            string                       `json:"vae"`
	VAEPrecision   string                       `json:"vaePrecision"`
	Sampler        string                       `json:"sampler"`
	Seed           int64                        `json:"seed"`
	Steps          int                          `json:"steps"`
	CfgScale       float64                      `json:"cfgScale"`
	CfgRescale     float64                      `json:"cfgRescale"`
	ClipSkip       int                          `json:"clipSkip"`
	Width          int                          `json:"width"`
	Height         int                          `json:"height"`
	SeamlessX      bool                         `json:"seamlessX"`
	SeamlessY      bool                         `json:"seamlessY"`
	CPUNoise       bool                         `json:"cpuNoise"`
	Loras          []imagegen.ImageMetadataLora `json:"loras"`
	Triggers       []string                     `json:"triggers"`
	Characters     []string                     `json:"characters"`
	Denoise        float64                      `json:"denoise,omitempty"`
	Refiner        *genRecordRefiner            `json:"refiner,omitempty"`
	Hires          *genRecordUpscale            `json:"hires,omitempty"`
	Upscaled       *genRecordUpscale            `json:"upscaled,omitempty"`
	// StartedFrom is the picture an enlargement was made from, in GenInfo's shape.
	StartedFrom *genRecordStart   `json:"startedFrom,omitempty"`
	Regions     *genRecordRegions `json:"regions,omitempty"`
	// Clip is what only a clip has, beside the fields a picture shares with it.
	Clip    *genRecordClip `json:"clip,omitempty"`
	Backend string         `json:"backend"`
	At      int64          `json:"at"`
}

// genRecordClip is how a clip was made, past what a picture's record holds: Model is
// its (high-noise) model and Sampler its sampler, as for a picture.
type genRecordClip struct {
	// From is "image" or "text".
	From        string  `json:"from"`
	Frames      int     `json:"frames,omitempty"`
	FPS         int     `json:"fps,omitempty"`
	Shift       float64 `json:"shift,omitempty"`
	LowModel    string  `json:"lowModel,omitempty"`
	TextEncoder string  `json:"textEncoder,omitempty"`
	Scheduler   string  `json:"scheduler,omitempty"`
	// Recipe is the line said under the clip in the studio.
	Recipe string `json:"recipe,omitempty"`
	// Loop says it ends on the picture it starts from.
	Loop bool `json:"loop,omitempty"`
	// Source is the gallery clip this one was enlarged from, when it was.
	Source string `json:"source,omitempty"`
}

type genRecordRefiner struct {
	Model string `json:"model"`
	// Models is every pass, in order, when there was more than the one.
	Models         []string `json:"models,omitempty"`
	Prompt         string   `json:"prompt"`
	NegativePrompt string   `json:"negativePrompt"`
	Confidence     float64  `json:"confidence"`
	Denoise        float64  `json:"denoise"`
	MaskBlur       int      `json:"maskBlur"`
	// Custom is the passes with detectors of their own, after the faces and hands.
	Custom []genRecordPass `json:"custom,omitempty"`
}

// genRecordPass is one custom detailer pass, in the request's own shape so a
// picture's "use these settings" puts it back as it was.
type genRecordPass struct {
	Model          string                       `json:"model"`
	Prompt         string                       `json:"prompt,omitempty"`
	NegativePrompt string                       `json:"negativePrompt,omitempty"`
	Loras          []imagegen.ImageMetadataLora `json:"loras,omitempty"`
	Confidence     float64                      `json:"confidence,omitempty"`
	Denoise        float64                      `json:"denoise,omitempty"`
}

// genRecordRegions is the people a picture was drawn in parts for, in order.
type genRecordRegions struct {
	Rows  bool                  `json:"rows,omitempty"`
	Parts []genRecordRegionPart `json:"parts"`
}

type genRecordRegionPart struct {
	Prompt string                       `json:"prompt"`
	Loras  []imagegen.ImageMetadataLora `json:"loras,omitempty"`
	Share  float64                      `json:"share,omitempty"`
}

// recordLoras is LoRAs as a record keeps them.
func recordLoras(loras []imagegen.LoraWeight) []imagegen.ImageMetadataLora {
	var out []imagegen.ImageMetadataLora
	for _, l := range loras {
		out = append(out, imagegen.ImageMetadataLora{Name: l.Name, Weight: l.Weight})
	}
	return out
}

type genRecordStart struct {
	Name string `json:"name"`
	Mode string `json:"mode"`
}

// genRecordUpscale is how a picture was enlarged: by a hires fix as it was drawn,
// or by an upscale of a finished one (no denoise or steps).
type genRecordUpscale struct {
	Upscaler string  `json:"upscaler"`
	Scale    float64 `json:"scale"`
	Denoise  float64 `json:"denoise,omitempty"`
	Steps    int     `json:"steps,omitempty"`
}

// genRecordOf is the record of one picture of a run, from the request as it went to
// the generator — after defaults and wildcards — and the seed that came back.
func genRecordOf(gen imagegen.GenerateRequest, seed int64, width, height int) genRecord {
	rec := genRecord{
		Prompt: gen.Prompt, NegativePrompt: gen.NegativePrompt, Model: gen.Checkpoint, VAE: gen.VAE,
		VAEPrecision: gen.VAEPrecision, Sampler: gen.Sampler, Seed: seed, Steps: gen.Steps,
		CfgScale: gen.CfgScale, CfgRescale: gen.CfgRescale, ClipSkip: gen.ClipSkip,
		Width: width, Height: height, SeamlessX: gen.SeamlessX, SeamlessY: gen.SeamlessY, CPUNoise: gen.CPUNoise,
		Loras: []imagegen.ImageMetadataLora{}, Triggers: []string{}, Characters: []string{},
		Backend: string(imagegen.KindA1111), At: time.Now().UnixMilli(),
	}
	if rec.VAEPrecision == "" {
		rec.VAEPrecision = "fp32"
	}
	for _, l := range gen.Loras {
		rec.Loras = append(rec.Loras, imagegen.ImageMetadataLora{Name: l.Name, Weight: l.Weight})
	}
	if len(gen.InitImage) > 0 && !gen.DetailOnly {
		rec.Denoise = gen.Denoise
	}
	if d := gen.Detailer; d.Enabled && !gen.UpscaleOnly {
		passes := d.Passes()
		first := ""
		if len(passes) > 0 {
			first = passes[0]
		}
		rec.Refiner = &genRecordRefiner{Model: first, Prompt: d.Prompt, NegativePrompt: d.NegativePrompt,
			Confidence: d.Confidence, Denoise: d.Denoise, MaskBlur: d.MaskBlur}
		if len(passes) > 1 {
			rec.Refiner.Models = passes
		}
		for _, p := range d.Custom {
			rec.Refiner.Custom = append(rec.Refiner.Custom, genRecordPass{
				Model: p.Model, Prompt: p.Prompt, NegativePrompt: p.NegativePrompt,
				Loras: recordLoras(p.Loras), Confidence: p.Confidence, Denoise: p.Denoise,
			})
		}
	}
	if r := gen.Regions; r.Active() && len(gen.InitImage) == 0 {
		rec.Regions = &genRecordRegions{Rows: r.Rows}
		for _, p := range r.Parts {
			rec.Regions.Parts = append(rec.Regions.Parts, genRecordRegionPart{Prompt: p.Prompt, Loras: recordLoras(p.Loras), Share: p.Share})
		}
	}
	if up := gen.Upscale; gen.UpscaleOnly {
		rec.Upscaled = &genRecordUpscale{Upscaler: up.Upscaler, Scale: up.Scale}
	} else if up.Enabled && len(gen.InitImage) == 0 {
		rec.Hires = &genRecordUpscale{Upscaler: up.Upscaler, Scale: up.Scale, Denoise: up.Denoise, Steps: up.Steps}
	}
	return rec
}

// upscaledRecord is an enlarged picture's record: the record of the picture it was
// enlarged from — its prompt, model, seed and LoRAs, which are what made it and what
// Civitai reads off an export — with its new size and the enlargement on top. The
// upscale's own request carries none of that: it draws nothing, so the studio sends
// whatever its form happens to say, and the copy used to be kept as a picture with
// no prompt at all. ok is false for a source with no record to inherit.
func upscaledRecord(source json.RawMessage, from string, gen imagegen.GenerateRequest, width, height int) (genRecord, bool) {
	var rec genRecord
	if len(source) == 0 || json.Unmarshal(source, &rec) != nil || rec.Clip != nil {
		return genRecord{}, false
	}
	// Enlarged twice is enlarged by the product, said with the upscaler used last.
	scale := gen.Upscale.Scale
	if prev := rec.Upscaled; prev != nil && prev.Scale > 0 {
		scale *= prev.Scale
	}
	rec.Upscaled = &genRecordUpscale{Upscaler: gen.Upscale.Upscaler, Scale: math.Round(scale*100) / 100}
	rec.StartedFrom = &genRecordStart{Name: "Picture " + from, Mode: "upscale"}
	rec.Width, rec.Height = width, height
	rec.At = time.Now().UnixMilli()
	if rec.Loras == nil {
		rec.Loras = []imagegen.ImageMetadataLora{}
	}
	return rec, true
}

// galleryRecord is a gallery picture's record when the gallery is this one, nil for
// none or for InvokeAI's (whose upscales the studio does not run).
func (s *Server) galleryRecord(ctx context.Context, base, name string) json.RawMessage {
	if !s.ownGallery(ctx, base) {
		return nil
	}
	g, err := s.genImageNamed(ctx, name)
	if err != nil {
		return nil
	}
	return s.genInfo(g)
}

// genFolderOf reads the board a run asked to be filed into: a folder's id, or
// Unsorted for anything else — "all", "none", a folder deleted since, InvokeAI's
// board ids from a client that had them.
func (s *Server) genFolderOf(ctx context.Context, board string) int64 {
	id, err := strconv.ParseInt(strings.TrimSpace(board), 10, 64)
	if err != nil || id <= 0 {
		return 0
	}
	if ok, _ := s.db.GenFolderExists(ctx, id); !ok {
		return 0
	}
	return id
}

// keepGenerated stores one run's pictures in the gallery and returns their ids,
// index-aligned with the pictures; 0 for one that could not be kept. A picture
// that fails to keep is logged and skipped — the run itself still succeeded, and
// its preview is on the canvas to be saved by hand.
//
// source is the record of the gallery picture an upscale enlarged, which the copy
// inherits (upscaledRecord); from is that picture's name.
func (s *Server) keepGenerated(ctx context.Context, gen imagegen.GenerateRequest, res *imagegen.GenerateResult, source json.RawMessage, from string) []int64 {
	folder := s.genFolderOf(ctx, gen.Board)
	ids := make([]int64, len(res.Images))
	for i, data := range res.Images {
		seed := res.Seed
		if i < len(res.Seeds) {
			seed = res.Seeds[i]
		}
		g, err := s.keepGenImage(ctx, data, folder, func(w, h int) genRecord {
			if gen.UpscaleOnly {
				if rec, ok := upscaledRecord(source, from, gen, w, h); ok {
					return rec
				}
			}
			return genRecordOf(gen, seed, w, h)
		})
		if err != nil {
			s.log.Warn("studio gallery: keep", "err", err)
			continue
		}
		ids[i] = g.ID
	}
	return ids
}

// keepGenImage stores one picture with its record and a tile.
func (s *Server) keepGenImage(ctx context.Context, data []byte, folder int64, record func(w, h int) genRecord) (db.GenImage, error) {
	if len(data) == 0 || len(data) > genGalleryMaxBytes {
		return db.GenImage{}, errors.New("the picture is empty or too large")
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return db.GenImage{}, fmt.Errorf("can't read that picture: %w", err)
	}
	put, err := s.store.Put(bytes.NewReader(data))
	if err != nil {
		return db.GenImage{}, err
	}
	w, h := img.Bounds().Dx(), img.Bounds().Dy()
	g := db.GenImage{FolderID: folder, SHA256: put.SHA256, Size: put.Size, BlobPath: put.RelPath, Width: int64(w), Height: int64(h)}
	if thumb, err := trainThumb(img); err == nil {
		if tp, err := s.store.Put(bytes.NewReader(thumb)); err == nil {
			g.ThumbPath = tp.RelPath
		}
	}
	rec := record(w, h)
	g.Upscaled = rec.Upscaled != nil
	if raw, err := json.Marshal(rec); err == nil {
		g.InfoEnc, _ = crypto.SealBytes(s.kek, raw, []byte("generation"))
	}
	if err := s.db.AddGenImage(ctx, &g); err != nil {
		s.unlinkUnheld(ctx, g.BlobPath, g.ThumbPath)
		return db.GenImage{}, err
	}
	return g, nil
}

// keepGenClip stores one clip with its record. Its tile is a frame of it when ffmpeg
// is there to take one (the container image has it), else the picture it started
// from, else none, and the gallery draws it as a film. Its size is read off the clip
// when ffprobe can, else the record's stands.
func (s *Server) keepGenClip(ctx context.Context, data []byte, mime string, folder int64, rec genRecord, still []byte) (db.GenImage, error) {
	if len(data) == 0 || len(data) > genClipMaxBytes {
		return db.GenImage{}, errors.New("the clip is empty or too large")
	}
	w, h, tile := clipPoster(ctx, data)
	if tile == nil && len(still) > 0 {
		if img, _, err := image.Decode(bytes.NewReader(still)); err == nil {
			tile, _ = trainThumb(img)
		}
	}
	if w > 0 && h > 0 {
		rec.Width, rec.Height = w, h
	}
	put, err := s.store.Put(bytes.NewReader(data))
	if err != nil {
		return db.GenImage{}, err
	}
	g := db.GenImage{FolderID: folder, SHA256: put.SHA256, Size: put.Size, BlobPath: put.RelPath,
		Width: int64(rec.Width), Height: int64(rec.Height), MIME: mime, Upscaled: rec.Upscaled != nil}
	if tile != nil {
		if tp, err := s.store.Put(bytes.NewReader(tile)); err == nil {
			g.ThumbPath = tp.RelPath
		}
	}
	if raw, err := json.Marshal(rec); err == nil {
		g.InfoEnc, _ = crypto.SealBytes(s.kek, raw, []byte("generation"))
	}
	if err := s.db.AddGenImage(ctx, &g); err != nil {
		s.unlinkUnheld(ctx, g.BlobPath, g.ThumbPath)
		return db.GenImage{}, err
	}
	return g, nil
}

// clipPoster is a clip's size and a JPEG tile of it, or zeros and nil without ffmpeg
// or with a clip it cannot read. ffmpeg wants a seekable file, so the clip is written
// to one for the moment it takes.
func clipPoster(ctx context.Context, data []byte) (w, h int, tile []byte) {
	if !thumbnail.Available() {
		return 0, 0, nil
	}
	tmp, err := os.CreateTemp("", "oppai-clip-*")
	if err != nil {
		return 0, 0, nil
	}
	defer os.Remove(tmp.Name())
	_, err = tmp.Write(data)
	if cerr := tmp.Close(); err != nil || cerr != nil {
		return 0, 0, nil
	}
	ctx, cancel := context.WithTimeout(ctx, thumbnail.DefaultTimeout)
	defer cancel()
	meta, err := thumbnail.Probe(ctx, tmp.Name())
	if err != nil {
		return 0, 0, nil
	}
	tile, _ = thumbnail.Frame(ctx, tmp.Name(), meta.Duration, trainThumbSide)
	return meta.Width, meta.Height, tile
}

// backfillGenUpscaled reads, once, whether each item kept before the gallery could be
// filtered by kind was an enlargement: the record that says so is sealed, so the
// column could not be filled when it was added.
func (s *Server) backfillGenUpscaled() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	for {
		rows, err := s.db.GenUnclassified(ctx, 200)
		if err != nil {
			s.log.Warn("studio gallery: classify", "err", err)
			return
		}
		if len(rows) == 0 {
			return
		}
		for _, g := range rows {
			var rec struct {
				Upscaled *genRecordUpscale `json:"upscaled"`
			}
			if raw := s.genInfo(g); raw != nil {
				_ = json.Unmarshal(raw, &rec)
			}
			if err := s.db.SetGenUpscaled(ctx, g.ID, rec.Upscaled != nil); err != nil {
				s.log.Warn("studio gallery: classify", "err", err)
				return
			}
		}
	}
}

// isClip says a kept item is a clip rather than a picture.
func isClip(g db.GenImage) bool { return g.MIME != "" }

// genInfo opens a kept picture's record, nil when it has none.
func (s *Server) genInfo(g db.GenImage) json.RawMessage {
	if len(g.InfoEnc) == 0 {
		return nil
	}
	raw, err := crypto.OpenBytes(s.kek, g.InfoEnc, []byte("generation"))
	if err != nil || !json.Valid(raw) {
		return nil
	}
	return raw
}

// genImageNamed reads the picture an image name stands for.
func (s *Server) genImageNamed(ctx context.Context, name string) (db.GenImage, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(name), 10, 64)
	if err != nil || id <= 0 {
		return db.GenImage{}, errors.New("no such picture")
	}
	g, ok, err := s.db.GetGenImage(ctx, id)
	if err != nil {
		return g, err
	}
	if !ok {
		return g, errors.New("that picture is no longer in the gallery")
	}
	return g, nil
}

// genImageBytes reads a kept picture, or its tile.
func (s *Server) genImageBytes(g db.GenImage, thumb bool) ([]byte, error) {
	path, limit := g.BlobPath, g.Size
	if thumb && g.ThumbPath != "" {
		path, limit = g.ThumbPath, genGalleryMaxBytes
	}
	rc, err := s.store.Open(path)
	if err != nil {
		return nil, errors.New("that picture's file is missing")
	}
	defer rc.Close()
	return io.ReadAll(io.LimitReader(rc, limit))
}

// galleryPicture reads a gallery picture's bytes whichever gallery it is in: this
// one, or the generator's. For a cover, or a run started from it.
func (s *Server) galleryPicture(ctx context.Context, base, name string) ([]byte, error) {
	if s.ownGallery(ctx, base) {
		g, err := s.genImageNamed(ctx, name)
		if err != nil {
			return nil, err
		}
		if isClip(g) {
			return nil, errors.New("that is a clip, not a picture — a frame of it can be taken in the Video studio")
		}
		return s.genImageBytes(g, false)
	}
	data, _, err := s.imagegen.GalleryImage(ctx, base, name, false)
	return data, err
}

// ── the endpoints, on this store ────────────────────────────────────────────

func (s *Server) ownGalleryBoards(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	all, unsorted, err := s.db.GenCounts(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	folders, err := s.db.GenFolders(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	newestAll, newestUnsorted, err := s.db.GenNewest(ctx)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	// Unsorted first: it is where a run lands when no folder is open, and the panel
	// opens on the first board it is given.
	boards := []imagegen.Board{
		{ID: "none", Name: "Unsorted", Count: unsorted, Cover: genImageName(newestUnsorted)},
		{ID: genGalleryAll, Name: "All pictures", Count: all, Cover: genImageName(newestAll)},
	}
	for _, f := range folders {
		boards = append(boards, imagegen.Board{ID: strconv.FormatInt(f.ID, 10), Name: f.Name, Count: f.Count, Cover: genImageName(f.CoverID)})
	}
	writeJSON(w, http.StatusOK, map[string]any{"boards": boards})
}

func (s *Server) ownGalleryCreateFolder(w http.ResponseWriter, r *http.Request, name string) {
	f, err := s.db.CreateGenFolder(r.Context(), name)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, imagegen.Board{ID: strconv.FormatInt(f.ID, 10), Name: f.Name})
}

func (s *Server) ownGalleryFolderParam(w http.ResponseWriter, r *http.Request, id string) (int64, bool) {
	n, err := strconv.ParseInt(id, 10, 64)
	if err != nil || n <= 0 {
		writeErr(w, http.StatusBadRequest, "that folder can't be changed")
		return 0, false
	}
	if ok, err := s.db.GenFolderExists(r.Context(), n); err != nil || !ok {
		writeErr(w, http.StatusNotFound, "no such folder")
		return 0, false
	}
	return n, true
}

func (s *Server) ownGalleryDeleteFolder(w http.ResponseWriter, r *http.Request, id string) {
	n, ok := s.ownGalleryFolderParam(w, r, id)
	if !ok {
		return
	}
	if err := s.db.DeleteGenFolder(r.Context(), n); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

// genImageName is a kept picture's name in the gallery endpoints, "" for none.
func genImageName(id int64) string {
	if id <= 0 {
		return ""
	}
	return strconv.FormatInt(id, 10)
}

type galleryBoardChangeReq struct {
	Name *string `json:"name"`
	// Cover is one of the board's pictures, by its gallery name; "" goes back to
	// showing the newest (this gallery) or clears it (InvokeAI).
	Cover *string `json:"cover"`
}

// handleGalleryRenameBoard renames a folder or sets its cover. InvokeAI's boards
// are renamed in InvokeAI, but take a cover from here as they do from its own UI.
func (s *Server) handleGalleryRenameBoard(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	var req galleryBoardChangeReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil || (req.Name == nil && req.Cover == nil) {
		writeErr(w, http.StatusBadRequest, "a folder name or a cover is required")
		return
	}
	if !s.ownGallery(r.Context(), base) {
		if req.Name != nil {
			writeErr(w, http.StatusConflict, "InvokeAI's boards are renamed in InvokeAI")
			return
		}
		if err := s.imagegen.SetBoardCover(r.Context(), base, r.PathValue("id"), *req.Cover); err != nil {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
		return
	}
	n, ok := s.ownGalleryFolderParam(w, r, r.PathValue("id"))
	if !ok {
		return
	}
	if req.Cover != nil {
		id := int64(0)
		if *req.Cover != "" {
			v, err := strconv.ParseInt(*req.Cover, 10, 64)
			if err != nil || v <= 0 {
				writeErr(w, http.StatusBadRequest, "no such picture")
				return
			}
			id = v
		}
		switch err := s.db.SetGenFolderCover(r.Context(), n, id); {
		case errors.Is(err, db.ErrNotInFolder):
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		case err != nil:
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if req.Name == nil {
			writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
			return
		}
	}
	name := *req.Name
	if strings.TrimSpace(name) == "" {
		writeErr(w, http.StatusBadRequest, "a folder name is required")
		return
	}
	if len([]rune(name)) > 120 {
		writeErr(w, http.StatusBadRequest, "that name is too long")
		return
	}
	if err := s.db.RenameGenFolder(r.Context(), n, name); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, imagegen.Board{ID: strconv.FormatInt(n, 10), Name: strings.TrimSpace(name)})
}

func (s *Server) ownGalleryImages(w http.ResponseWriter, r *http.Request, board, order, kind string, offset, limit int) {
	scope := db.GenScope{All: board == genGalleryAll}
	switch kind {
	case db.GenTypePictures, db.GenTypeUpscaled, db.GenTypeVideos:
		scope.Type = kind
	}
	if !scope.All && board != "" && board != "none" {
		n, err := strconv.ParseInt(board, 10, 64)
		if err != nil || n <= 0 {
			writeErr(w, http.StatusBadRequest, "no such folder")
			return
		}
		scope.FolderID = n
	}
	rows, total, err := s.db.GenImages(r.Context(), scope, order, offset, limit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	page := imagegen.GalleryPage{Items: make([]imagegen.GalleryImage, 0, len(rows)), Total: total}
	for _, g := range rows {
		item := imagegen.GalleryImage{
			Name: strconv.FormatInt(g.ID, 10), Width: int(g.Width), Height: int(g.Height), Size: g.Size,
			Created:  time.Unix(g.CreatedAt, 0).UTC().Format(time.RFC3339),
			Label:    fmt.Sprintf("Picture %d", g.ID),
			Upscaled: g.Upscaled,
		}
		if isClip(g) {
			item.Kind, item.Label, item.Tile = "video", fmt.Sprintf("Clip %d", g.ID), g.ThumbPath != ""
		}
		page.Items = append(page.Items, item)
	}
	writeJSON(w, http.StatusOK, page)
}

func (s *Server) ownGalleryServe(w http.ResponseWriter, r *http.Request, name string, thumb bool) {
	g, err := s.genImageNamed(r.Context(), name)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	// A clip with no tile has nothing to show as a picture; the gallery draws a film.
	if thumb && isClip(g) && g.ThumbPath == "" {
		writeErr(w, http.StatusNotFound, "this clip has no tile")
		return
	}
	data, err := s.genImageBytes(g, thumb)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	ct := http.DetectContentType(data)
	if isClip(g) && !thumb {
		ct = g.MIME
	}
	w.Header().Set("Content-Type", safeInlineContentType(ct))
	// A kept picture never changes under its id.
	w.Header().Set("Cache-Control", "private, max-age=86400")
	// Served as content rather than written whole, for the ranges a <video> asks for
	// to seek, and that Safari will not play a clip without.
	http.ServeContent(w, r, "", time.Unix(g.CreatedAt, 0), bytes.NewReader(data))
}

func (s *Server) ownGalleryMetadata(w http.ResponseWriter, r *http.Request, name string) {
	g, err := s.genImageNamed(r.Context(), name)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	if raw := s.genInfo(g); raw != nil {
		writeJSON(w, http.StatusOK, raw)
		return
	}
	writeJSON(w, http.StatusOK, imagegen.ImageMetadata{Loras: []imagegen.ImageMetadataLora{}, Width: int(g.Width), Height: int(g.Height), Backend: string(imagegen.KindA1111)})
}

func (s *Server) ownGalleryDelete(ctx context.Context, names []string) error {
	var paths []string
	for _, name := range names {
		g, err := s.genImageNamed(ctx, name)
		if err != nil {
			continue
		}
		blob, thumb, ok, err := s.db.DeleteGenImage(ctx, g.ID)
		if err != nil {
			return err
		}
		if ok {
			paths = append(paths, blob, thumb)
		}
	}
	s.unlinkUnheld(ctx, paths...)
	return nil
}

func (s *Server) ownGalleryMove(ctx context.Context, board string, names []string) error {
	folder := int64(0)
	if board != "" && board != "none" && board != genGalleryAll {
		folder = s.genFolderOf(ctx, board)
		if folder == 0 {
			return errors.New("that folder is gone")
		}
	}
	ids := make([]int64, 0, len(names))
	for _, name := range names {
		if id, err := strconv.ParseInt(name, 10, 64); err == nil && id > 0 {
			ids = append(ids, id)
		}
	}
	return s.db.MoveGenImages(ctx, folder, ids)
}

// moveGenToLibrary makes a kept picture a library item and takes it out of the
// gallery. The library row shares the stored file, so moving costs no copy; the
// gallery's tile is the only file that goes.
func (s *Server) moveGenToLibrary(ctx context.Context, g db.GenImage, title string, tags []string) (int64, bool, error) {
	info := s.genInfo(g)
	var prompt string
	if info != nil {
		var rec struct {
			Prompt string `json:"prompt"`
		}
		_ = json.Unmarshal(info, &rec)
		prompt = strings.TrimSpace(rec.Prompt)
	}
	kind := "image"
	if isClip(g) {
		kind = s.storedKind(g.BlobPath)
	}
	if title = strings.TrimSpace(title); title == "" {
		title = genTitle(prompt)
		if kind != "image" && prompt != "" {
			title = "Clip: " + title
		} else if kind != "image" {
			title = "Generated clip"
		}
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(title), []byte("title"))
	var notesEnc []byte
	if prompt != "" {
		notesEnc, _ = crypto.SealBytes(s.kek, []byte(prompt), []byte("notes"))
	}
	id, existed, err := s.db.InsertMedia(ctx, &db.MediaRow{
		Kind: kind, SHA256: g.SHA256, Size: g.Size, BlobPath: g.BlobPath, TitleEnc: titleEnc, NotesEnc: notesEnc,
	})
	if err != nil {
		return 0, false, err
	}
	if !existed {
		s.processIngestAsync(id, g.BlobPath, kind, g.Size, 0)
		if info != nil {
			if genEnc, err := crypto.SealBytes(s.kek, info, []byte("generation")); err == nil {
				_ = s.db.SetGeneration(ctx, id, genEnc)
			}
		}
	}
	if err := s.db.AddTag(ctx, id, "ai-generated", "source", "generated", 0); err != nil {
		s.log.Debug("tag generated image", "err", err)
	}
	for _, t := range tags {
		if t = strings.TrimSpace(t); t != "" {
			_ = s.db.AddTag(ctx, id, t, "general", "manual", 0)
		}
	}
	blob, thumb, _, err := s.db.DeleteGenImage(ctx, g.ID)
	if err != nil {
		return id, existed, err
	}
	s.unlinkUnheld(ctx, blob, thumb)
	s.touchLibraryIndex()
	return id, existed, nil
}

// storedKind is a kept clip's library kind, by its first bytes as an upload's is: a
// video, or an animated GIF or WebP, which the library files apart.
func (s *Server) storedKind(blob string) string {
	rc, err := s.store.Open(blob)
	if err != nil {
		return "video"
	}
	defer rc.Close()
	head, _ := io.ReadAll(io.LimitReader(rc, 4<<10))
	return string(recognize.KindFromBytes(head, ""))
}

// genTitle is a moved picture's title when none was given: the start of its prompt,
// which is what it is of, cut at a word.
func genTitle(prompt string) string {
	prompt = strings.Join(strings.Fields(prompt), " ")
	if prompt == "" {
		return "Generated image"
	}
	if r := []rune(prompt); len(r) > 80 {
		cut := string(r[:80])
		if i := strings.LastIndexAny(cut, " ,"); i > 40 {
			cut = cut[:i]
		}
		return strings.TrimRight(cut, " ,")
	}
	return prompt
}

// ownGallerySave moves one picture, or several, into the library.
func (s *Server) ownGallerySave(w http.ResponseWriter, r *http.Request, req gallerySaveReq) {
	names := req.Names
	if req.Name != "" {
		names = append([]string{req.Name}, names...)
	}
	ids := make([]int64, 0, len(names))
	for _, name := range names {
		g, err := s.genImageNamed(r.Context(), name)
		if err != nil {
			continue
		}
		title := ""
		if len(names) == 1 {
			title = req.Title
		}
		id, _, err := s.moveGenToLibrary(r.Context(), g, title, req.Tags)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		writeErr(w, http.StatusNotFound, "those pictures are no longer in the gallery")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": ids[0], "ids": ids, "moved": true})
}
