package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
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
	Regions        *genRecordRegions            `json:"regions,omitempty"`
	Backend        string                       `json:"backend"`
	At             int64                        `json:"at"`
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
func (s *Server) keepGenerated(ctx context.Context, gen imagegen.GenerateRequest, res *imagegen.GenerateResult) []int64 {
	folder := s.genFolderOf(ctx, gen.Board)
	ids := make([]int64, len(res.Images))
	for i, data := range res.Images {
		seed := res.Seed
		if i < len(res.Seeds) {
			seed = res.Seeds[i]
		}
		g, err := s.keepGenImage(ctx, data, folder, func(w, h int) genRecord { return genRecordOf(gen, seed, w, h) })
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
	if raw, err := json.Marshal(record(w, h)); err == nil {
		g.InfoEnc, _ = crypto.SealBytes(s.kek, raw, []byte("generation"))
	}
	if err := s.db.AddGenImage(ctx, &g); err != nil {
		s.unlinkUnheld(ctx, g.BlobPath, g.ThumbPath)
		return db.GenImage{}, err
	}
	return g, nil
}

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

func (s *Server) ownGalleryImages(w http.ResponseWriter, r *http.Request, board, order string, offset, limit int) {
	scope := db.GenScope{All: board == genGalleryAll}
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
		page.Items = append(page.Items, imagegen.GalleryImage{
			Name: strconv.FormatInt(g.ID, 10), Width: int(g.Width), Height: int(g.Height), Size: g.Size,
			Created: time.Unix(g.CreatedAt, 0).UTC().Format(time.RFC3339),
			Label:   fmt.Sprintf("Picture %d", g.ID),
		})
	}
	writeJSON(w, http.StatusOK, page)
}

func (s *Server) ownGalleryServe(w http.ResponseWriter, r *http.Request, name string, thumb bool) {
	g, err := s.genImageNamed(r.Context(), name)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	data, err := s.genImageBytes(g, thumb)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
	// A kept picture never changes under its id.
	w.Header().Set("Cache-Control", "private, max-age=86400")
	_, _ = w.Write(data)
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
	if title = strings.TrimSpace(title); title == "" {
		title = genTitle(prompt)
	}
	titleEnc, _ := crypto.SealBytes(s.kek, []byte(title), []byte("title"))
	var notesEnc []byte
	if prompt != "" {
		notesEnc, _ = crypto.SealBytes(s.kek, []byte(prompt), []byte("notes"))
	}
	id, existed, err := s.db.InsertMedia(ctx, &db.MediaRow{
		Kind: "image", SHA256: g.SHA256, Size: g.Size, BlobPath: g.BlobPath, TitleEnc: titleEnc, NotesEnc: notesEnc,
	})
	if err != nil {
		return 0, false, err
	}
	if !existed {
		s.processIngestAsync(id, g.BlobPath, "image", g.Size, 0)
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
