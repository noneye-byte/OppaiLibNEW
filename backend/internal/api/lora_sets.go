package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	_ "golang.org/x/image/bmp"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
)

// Training sets: the pictures a LoRA learns from, kept apart from the library.
//
// An upload, an X account or a copy out of the library lands in a set (the
// train_sets table explains why sets are not media rows). A set is only ever seen
// here and on the Train screen: no grid lists it, no search finds it, and nothing
// tags it but the Train screen's own Auto-tag — the library's tagger used to tag
// every imported training picture on arrival, ahead of the library's own backlog.
//
//	GET    /api/imagegen/train-sets                        the sets
//	POST   /api/imagegen/train-sets                        {name} → one, joined by name if it exists
//	PATCH  /api/imagegen/train-sets/{id}                   {name}
//	DELETE /api/imagegen/train-sets/{id}                   with its pictures
//	POST   /api/imagegen/train-sets/{id}/pictures          multipart file (+ source)
//	POST   /api/imagegen/train-sets/{id}/from-library      {collectionId|tag|mediaIds, move?}
//	GET    /api/imagegen/train-sets/{id}/pictures/{pic}    ?thumb=1 for the tile
//	PATCH  /api/imagegen/train-sets/{id}/pictures/{pic}    {addTags, removeTags}
//	DELETE /api/imagegen/train-sets/{id}/pictures/{pic}

// trainThumbSide is the long side of a set picture's tile.
const trainThumbSide = 320

type trainSetOut struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Count     int    `json:"count"`
	CoverID   int64  `json:"coverId,omitempty"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

func trainSetOutOf(t db.TrainSet) trainSetOut {
	return trainSetOut{ID: t.ID, Name: t.Name, Count: t.Count, CoverID: t.CoverID, CreatedAt: t.CreatedAt, UpdatedAt: t.UpdatedAt}
}

func (s *Server) handleTrainSets(w http.ResponseWriter, r *http.Request) {
	sets, err := s.db.TrainSets(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]trainSetOut, 0, len(sets))
	for _, t := range sets {
		out = append(out, trainSetOutOf(t))
	}
	writeJSON(w, http.StatusOK, map[string]any{"sets": out})
}

type trainSetReq struct {
	Name string `json:"name"`
}

func trainSetName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", errors.New("the set needs a name")
	}
	if len([]rune(name)) > 120 {
		return "", errors.New("that name is too long")
	}
	return name, nil
}

// handleTrainSetCreate makes a set, or answers with the one by that name: a second
// try at the same LoRA adds to the set the first try left rather than starting a
// twin of it.
func (s *Server) handleTrainSetCreate(w http.ResponseWriter, r *http.Request) {
	var req trainSetReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	name, err := trainSetName(req.Name)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	set, err := s.trainSetFor(r.Context(), 0, name)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, trainSetOutOf(set))
}

// trainSetFor is the set named by id, or the one by name — made if there is none.
func (s *Server) trainSetFor(ctx context.Context, id int64, name string) (db.TrainSet, error) {
	if id > 0 {
		set, ok, err := s.db.GetTrainSet(ctx, id)
		if err == nil && !ok {
			err = errors.New("that training set is gone")
		}
		return set, err
	}
	if name = strings.TrimSpace(name); name == "" {
		name = "Training set"
	}
	if set, ok, err := s.db.TrainSetNamed(ctx, name); err != nil || ok {
		return set, err
	}
	return s.db.CreateTrainSet(ctx, name)
}

// trainSetParam reads {id} and the set behind it, answering for the caller when
// there is none.
func (s *Server) trainSetParam(w http.ResponseWriter, r *http.Request) (db.TrainSet, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad set id")
		return db.TrainSet{}, false
	}
	set, ok, err := s.db.GetTrainSet(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return set, false
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "no such training set")
		return set, false
	}
	return set, true
}

func (s *Server) handleTrainSetRename(w http.ResponseWriter, r *http.Request) {
	set, ok := s.trainSetParam(w, r)
	if !ok {
		return
	}
	var req trainSetReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	name, err := trainSetName(req.Name)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.db.RenameTrainSet(r.Context(), set.ID, name); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	set.Name = name
	writeJSON(w, http.StatusOK, trainSetOutOf(set))
}

func (s *Server) handleTrainSetDelete(w http.ResponseWriter, r *http.Request) {
	set, ok := s.trainSetParam(w, r)
	if !ok {
		return
	}
	paths, err := s.db.DeleteTrainSet(r.Context(), set.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.unlinkUnheld(r.Context(), paths...)
	w.WriteHeader(http.StatusNoContent)
}

// unlinkUnheld deletes stored files no row holds any longer. A picture can be in the
// library and a set at once as the one file, so whichever side lets go last takes it.
func (s *Server) unlinkUnheld(ctx context.Context, paths ...string) {
	seen := map[string]bool{}
	for _, p := range paths {
		if p == "" || seen[p] {
			continue
		}
		seen[p] = true
		if held, err := s.db.BlobInUse(ctx, p); err != nil || held {
			continue
		}
		if err := s.store.Delete(p); err != nil {
			s.log.Warn("training set: unlink", "path", p, "err", err)
		}
	}
}

// ── putting pictures in ─────────────────────────────────────────────────────

// errTrainSetFull refuses a picture past what a set holds.
var errTrainSetFull = fmt.Errorf("a training set holds at most %d pictures — a LoRA trains no better on more", trainMaxPictures)

// addTrainPicture stores one picture in a set: the bytes encrypted like any other
// blob, a tile made while the picture is decoded anyway, and no tags — tagging is
// the Train screen's to ask for.
func (s *Server) addTrainPicture(ctx context.Context, setID int64, data []byte, source string) (db.TrainPicture, bool, error) {
	if len(data) > trainMaxPictureBytes {
		return db.TrainPicture{}, false, fmt.Errorf("%d MB is too large to train on", len(data)>>20)
	}
	if loraPictureExt(data) == "" {
		return db.TrainPicture{}, false, errors.New("that isn't a still picture the trainer can read (JPEG, PNG, WebP or BMP)")
	}
	if set, ok, _ := s.db.GetTrainSet(ctx, setID); ok && set.Count >= trainMaxPictures {
		return db.TrainPicture{}, false, errTrainSetFull
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return db.TrainPicture{}, false, fmt.Errorf("can't read that picture: %w", err)
	}
	put, err := s.store.Put(bytes.NewReader(data))
	if err != nil {
		return db.TrainPicture{}, false, err
	}
	pic := db.TrainPicture{
		SetID: setID, SHA256: put.SHA256, Size: put.Size, BlobPath: put.RelPath,
		Width: int64(img.Bounds().Dx()), Height: int64(img.Bounds().Dy()),
	}
	if thumb, err := trainThumb(img); err == nil {
		if tp, err := s.store.Put(bytes.NewReader(thumb)); err == nil {
			pic.ThumbPath = tp.RelPath
		}
	}
	if source = strings.TrimSpace(source); source != "" {
		pic.SourceEnc, _ = crypto.SealBytes(s.kek, []byte(source), []byte("source"))
	}
	existed, err := s.db.AddTrainPicture(ctx, &pic)
	return pic, existed, err
}

// trainThumb is a picture's tile, a JPEG no longer than trainThumbSide either way.
func trainThumb(src image.Image) ([]byte, error) {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w > trainThumbSide || h > trainThumbSide {
		if w >= h {
			w, h = trainThumbSide, max(1, h*trainThumbSide/w)
		} else {
			w, h = max(1, w*trainThumbSide/h), trainThumbSide
		}
	}
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.ApproxBiLinear.Scale(dst, dst.Bounds(), src, b, draw.Src, nil)
	var buf bytes.Buffer
	err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 82})
	return buf.Bytes(), err
}

func (s *Server) handleTrainSetUpload(w http.ResponseWriter, r *http.Request) {
	set, ok := s.trainSetParam(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, trainMaxPictureBytes+(1<<20))
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeErr(w, http.StatusBadRequest, "that picture is too large, or the upload was cut off")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "missing 'file'")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, trainMaxPictureBytes+1))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "the upload was cut off")
		return
	}
	pic, existed, err := s.addTrainPicture(r.Context(), set.ID, data, r.FormValue("source"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	status := http.StatusCreated
	if existed {
		status = http.StatusOK
	}
	writeJSON(w, status, map[string]any{"id": pic.ID, "existed": existed})
}

type trainFromLibraryReq struct {
	CollectionID int64   `json:"collectionId"`
	Tag          string  `json:"tag"`
	MediaIDs     []int64 `json:"mediaIds"`
	// Move takes the pictures out of the library once they are in the set — what a
	// LoRA's pictures imported into the library before sets existed want.
	Move bool `json:"move"`
}

// handleTrainSetFromLibrary copies library pictures into a set, tags and all. A copy
// shares the stored file, so it costs a row, not the picture again.
func (s *Server) handleTrainSetFromLibrary(w http.ResponseWriter, r *http.Request) {
	set, ok := s.trainSetParam(w, r)
	if !ok {
		return
	}
	var req trainFromLibraryReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
	defer cancel()
	rows, err := s.trainSourceRows(ctx, trainSource{CollectionID: req.CollectionID, Tag: req.Tag, MediaIDs: req.MediaIDs})
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	tagsByID, err := s.db.TagsForMediaBatch(ctx, ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	room := trainMaxPictures - set.Count
	added, moved := 0, 0
	for _, row := range rows {
		pic := db.TrainPicture{
			SetID: set.ID, SHA256: row.SHA256, Size: row.Size, BlobPath: row.BlobPath, ThumbPath: row.ThumbPath.String,
			SourceEnc: row.SourceEnc, Width: row.Width.Int64, Height: row.Height.Int64,
		}
		for _, t := range tagsByID[row.ID] {
			pic.Tags = append(pic.Tags, db.TrainTag{Name: t.Name, Category: t.Category, Source: t.Source, Score: t.Score})
		}
		if room <= 0 {
			// A full set: what did not fit stays in the library, moved or not.
			if in, _ := s.db.TrainSetHas(ctx, set.ID, row.SHA256); !in {
				continue
			}
		} else {
			existed, err := s.db.AddTrainPicture(ctx, &pic)
			if err != nil {
				writeErr(w, http.StatusInternalServerError, err.Error())
				return
			}
			if !existed {
				added++
				room--
			}
		}
		if req.Move {
			// The set holds the file now, so deleting the library's row leaves it.
			if err := s.deleteMediaByID(r, row.ID); err != nil {
				s.log.Warn("training set: move out of the library", "media", row.ID, "err", err)
				continue
			}
			moved++
		}
	}
	if req.Move && req.CollectionID > 0 {
		// A collection that only held the LoRA's pictures is empty now; it goes too.
		if left, err := s.db.CollectionMediaIDs(ctx, req.CollectionID, 1, 0); err == nil && len(left) == 0 {
			_ = s.db.DeleteCollection(ctx, req.CollectionID)
		}
	}
	if set, ok, _ = s.db.GetTrainSet(ctx, set.ID); !ok {
		writeErr(w, http.StatusNotFound, "no such training set")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"added": added, "moved": moved, "set": trainSetOutOf(set)})
}

// ── one picture ─────────────────────────────────────────────────────────────

func (s *Server) trainPictureParam(w http.ResponseWriter, r *http.Request) (db.TrainPicture, bool) {
	setID, err1 := strconv.ParseInt(r.PathValue("id"), 10, 64)
	id, err2 := strconv.ParseInt(r.PathValue("pic"), 10, 64)
	if err1 != nil || err2 != nil {
		writeErr(w, http.StatusBadRequest, "bad picture id")
		return db.TrainPicture{}, false
	}
	pic, ok, err := s.db.GetTrainPicture(r.Context(), setID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return pic, false
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "no such picture in that set")
		return pic, false
	}
	return pic, true
}

func (s *Server) handleTrainPicture(w http.ResponseWriter, r *http.Request) {
	pic, ok := s.trainPictureParam(w, r)
	if !ok {
		return
	}
	path, size := pic.BlobPath, pic.Size
	if isTruthy(r.URL.Query().Get("thumb")) && pic.ThumbPath != "" {
		path, size = pic.ThumbPath, 0
	}
	rc, err := s.store.Open(path)
	if err != nil {
		writeErr(w, http.StatusNotFound, "that picture's file is missing")
		return
	}
	defer rc.Close()
	limit := int64(trainMaxPictureBytes)
	if size > 0 {
		limit = size
	}
	data, err := io.ReadAll(io.LimitReader(rc, limit))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't read that picture")
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
	// A picture never changes under its id; an edit to its tags is not its bytes.
	w.Header().Set("Cache-Control", "private, max-age=86400")
	_, _ = w.Write(data)
}

type trainPictureEdit struct {
	AddTags    []string `json:"addTags"`
	RemoveTags []string `json:"removeTags"`
}

func (s *Server) handleTrainPictureEdit(w http.ResponseWriter, r *http.Request) {
	pic, ok := s.trainPictureParam(w, r)
	if !ok {
		return
	}
	var req trainPictureEdit
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	tags := editTrainTags(pic.Tags, req.AddTags, req.RemoveTags)
	if err := s.db.SetTrainPictureTags(r.Context(), pic.SetID, pic.ID, tags); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": pic.ID, "tags": tags})
}

// editTrainTags removes and adds tags by their caption form, so "red_hair" and
// "Red hair" are the one tag; a tag typed over the tagger's becomes the typed one.
func editTrainTags(tags []db.TrainTag, add, remove []string) []db.TrainTag {
	drop := map[string]bool{}
	for _, t := range remove {
		drop[loraTagKey(t)] = true
	}
	for _, t := range add {
		drop[loraTagKey(t)] = true
	}
	out := make([]db.TrainTag, 0, len(tags)+len(add))
	seen := map[string]bool{}
	for _, t := range add {
		// Lower case, as the tagger's are: a caption's capitals are noise the
		// trainer would learn.
		name := strings.ToLower(loraCaptionTag(strings.TrimSpace(t)))
		key := loraTagKey(name)
		if name == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, db.TrainTag{Name: name, Category: "general", Source: "manual"})
	}
	for _, t := range tags {
		if !drop[loraTagKey(t.Name)] {
			out = append(out, t)
		}
	}
	return out
}

func (s *Server) handleTrainPictureDelete(w http.ResponseWriter, r *http.Request) {
	pic, ok := s.trainPictureParam(w, r)
	if !ok {
		return
	}
	blob, thumb, _, err := s.db.DeleteTrainPicture(r.Context(), pic.SetID, pic.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.unlinkUnheld(r.Context(), blob, thumb)
	w.WriteHeader(http.StatusNoContent)
}

// ── what a run reads ────────────────────────────────────────────────────────

// trainPic is one picture a run trains on, from a set or from the library: where
// its bytes are and the tags it is captioned from.
type trainPic struct {
	ID       int64
	BlobPath string
	Size     int64
	Width    int64
	Height   int64
	Tags     []models.Tag
}

// trainPics are the pictures a source names, less its exclusions, at most
// trainMaxPictures of them.
func (s *Server) trainPics(ctx context.Context, src trainSource) ([]trainPic, error) {
	if src.SetID == 0 {
		rows, err := s.trainPictureRows(ctx, src)
		if err != nil {
			return nil, err
		}
		ids := make([]int64, 0, len(rows))
		for _, row := range rows {
			ids = append(ids, row.ID)
		}
		tagsByID, err := s.db.TagsForMediaBatch(ctx, ids)
		if err != nil {
			return nil, err
		}
		out := make([]trainPic, 0, len(rows))
		for _, row := range rows {
			out = append(out, trainPic{
				ID: row.ID, BlobPath: row.BlobPath, Size: row.Size,
				Width: row.Width.Int64, Height: row.Height.Int64, Tags: tagsByID[row.ID],
			})
		}
		return out, nil
	}
	if _, ok, err := s.db.GetTrainSet(ctx, src.SetID); err != nil || !ok {
		if err == nil {
			err = errors.New("that training set is gone")
		}
		return nil, err
	}
	pics, err := s.db.TrainPictures(ctx, src.SetID)
	if err != nil {
		return nil, err
	}
	drop := make(map[int64]bool, len(src.Exclude))
	for _, id := range src.Exclude {
		drop[id] = true
	}
	out := make([]trainPic, 0, len(pics))
	for _, p := range pics {
		if drop[p.ID] {
			continue
		}
		out = append(out, trainPic{
			ID: p.ID, BlobPath: p.BlobPath, Size: p.Size, Width: p.Width, Height: p.Height, Tags: trainTagsAsModel(p.Tags),
		})
		if len(out) >= trainMaxPictures {
			break
		}
	}
	return out, nil
}

func trainTagsAsModel(tags []db.TrainTag) []models.Tag {
	out := make([]models.Tag, 0, len(tags))
	for _, t := range tags {
		cat := t.Category
		if cat == "" {
			cat = "general"
		}
		out = append(out, models.Tag{Name: t.Name, Category: cat, Source: t.Source, Score: t.Score})
	}
	return out
}

// tagTrainPicture runs the tagger over one set picture and keeps what it says in
// place of what it said before; typed tags stay. Nothing of the library is touched.
func (s *Server) tagTrainPicture(ctx context.Context, setID int64, p trainPic) error {
	rc, err := s.store.Open(p.BlobPath)
	if err != nil {
		return err
	}
	img, _, err := image.Decode(io.LimitReader(rc, trainMaxPictureBytes))
	rc.Close()
	if err != nil {
		return err
	}
	sugs, err := s.ai.TagImage(ctx, img)
	if err != nil {
		return err
	}
	cur, ok, err := s.db.GetTrainPicture(ctx, setID, p.ID)
	if err != nil || !ok {
		return err
	}
	tags := make([]db.TrainTag, 0, len(sugs)+len(cur.Tags))
	have := map[string]bool{}
	for _, t := range cur.Tags {
		if t.Source == "manual" {
			tags = append(tags, t)
			have[loraTagKey(t.Name)] = true
		}
	}
	for _, sg := range sugs {
		if key := loraTagKey(sg.Name); !have[key] {
			have[key] = true
			tags = append(tags, db.TrainTag{Name: sg.Name, Category: sg.Category, Source: "ai", Score: sg.Score})
		}
	}
	if cur.Width == 0 {
		_ = s.db.SetTrainPictureSize(ctx, p.ID, int64(img.Bounds().Dx()), int64(img.Bounds().Dy()))
	}
	return s.db.SetTrainPictureTags(ctx, setID, p.ID, tags)
}
