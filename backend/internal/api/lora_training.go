package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/trainer"
)

// Training a LoRA on the library's own pictures.
//
// The training happens on the trainer (trainer/, a container of its own with the
// GPU); this side does everything around it. Starting a run picks the pictures — a
// collection, or everything with a tag — captions them from their tags
// (lora_dataset.go), makes sure the trainer has the checkpoint to train against
// (sending it from A1111's models folder when the trainer cannot see it), and hands
// the pictures over one at a time. From there a watcher follows the run, here and
// not in the browser, so it carries on with every tab closed: when the run starts it
// can ask the generator to let go of its checkpoint, so the two are not fighting
// over the card; when it finishes the file is installed into the generator the way
// a Civitai download is (the generator fetches it from the trainer), given its
// trigger word and the last sample picture as its cover, and the generator is given
// its checkpoint back.
//
// Each run's state is a row (lora_trainings), and the watcher moves it:
//
//	preparing → queued → training → installing → done
//	                              ↘ failed / cancelled
//
// "preparing" belongs to the goroutine sending the pictures. A restart in the middle
// of it cannot pick the upload up again, so a preparing row with no goroutine behind
// it is failed rather than left spinning.

// trainWatchEvery is how often the watcher asks the trainer how its runs are going.
// A run takes tens of minutes; the progress bar moves often enough at this rate.
const trainWatchEvery = 10 * time.Second

// trainInstallGiveUp retires a run whose install never showed up as finished.
const trainInstallGiveUp = 3 * time.Hour

// trainMaxPictures bounds a training set. Past a few hundred, a LoRA is not better,
// only slower, and every one is decrypted and sent.
const trainMaxPictures = 400

// trainMaxPictureBytes skips a picture too large to be worth sending whole.
const trainMaxPictureBytes = 40 << 20

// trainRunner is the watcher's state, and which runs are still being sent.
type trainRunner struct {
	mu        sync.Mutex
	watching  bool
	preparing map[int64]bool
	// step lets one pass over the live runs happen at a time, so a finished run is
	// installed once however many callers notice it.
	step sync.Mutex
}

func (s *Server) trainState() *trainRunner {
	s.trainOnce.Do(func() { s.train = &trainRunner{preparing: map[int64]bool{}} })
	return s.train
}

// trainSource is which pictures a run is trained on: one of these.
type trainSource struct {
	CollectionID int64   `json:"collectionId,omitempty"`
	Tag          string  `json:"tag,omitempty"`
	MediaIDs     []int64 `json:"mediaIds,omitempty"`
}

// trainRequest is what the studio asks for. Zero numbers take the trainer's defaults.
type trainRequest struct {
	Name    string      `json:"name"`
	Trigger string      `json:"trigger"`
	Base    string      `json:"base"`
	Source  trainSource `json:"source"`
	// Captions is "tags" (the default) or "trigger" (the trigger word alone).
	Captions     string   `json:"captions,omitempty"`
	LeaveOut     []string `json:"leaveOut,omitempty"`
	Epochs       int      `json:"epochs,omitempty"`
	Repeats      int      `json:"repeats,omitempty"`
	Rank         int      `json:"rank,omitempty"`
	Resolution   int      `json:"resolution,omitempty"`
	LearningRate float64  `json:"learningRate,omitempty"`
	Optimizer    string   `json:"optimizer,omitempty"`
	ClipSkip     int      `json:"clipSkip,omitempty"`
	// LowVRAM trains the UNet alone at a smaller size, for a card under 12 GB.
	LowVRAM bool `json:"lowVram,omitempty"`
	Flip    bool `json:"flip,omitempty"`
	// FreeGPU asks the generator to let go of its checkpoint while the run trains.
	FreeGPU bool `json:"freeGpu,omitempty"`
	// Samples renders a picture with the LoRA at the end, which becomes its cover.
	Samples bool `json:"samples,omitempty"`
}

func (s *Server) trainerSettings() (base, token string, ok bool) {
	set := s.settings.Get()
	return set.TrainerURL, set.TrainerToken, set.TrainerURL != ""
}

// ── what the studio sees ─────────────────────────────────────────────────────

type trainingOut struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	Trigger    string  `json:"trigger"`
	BaseModel  string  `json:"baseModel"`
	Images     int     `json:"images"`
	Status     string  `json:"status"`
	Error      string  `json:"error,omitempty"`
	ModelKey   string  `json:"modelKey,omitempty"`
	CreatedAt  int64   `json:"createdAt"`
	FinishedAt int64   `json:"finishedAt,omitempty"`
	Phase      string  `json:"phase,omitempty"`
	Step       int     `json:"step,omitempty"`
	Total      int     `json:"total,omitempty"`
	Epoch      int     `json:"epoch,omitempty"`
	Epochs     int     `json:"epochs,omitempty"`
	Loss       float64 `json:"loss,omitempty"`
	ETA        string  `json:"eta,omitempty"`
	Elapsed    string  `json:"elapsed,omitempty"`
	Family     string  `json:"family,omitempty"`
	// Samples are the trainer's sample pictures, while the trainer still has them.
	Samples []string `json:"samples,omitempty"`
	Log     []string `json:"log,omitempty"`
	// Request is what the run was started with, for "train again".
	Request json.RawMessage `json:"request,omitempty"`
}

func trainingOutOf(t db.LoraTraining, job *trainer.Job) trainingOut {
	out := trainingOut{
		ID: t.ID, Name: t.Name, Trigger: t.Trigger, BaseModel: t.BaseModel, Images: t.Images,
		Status: t.Status, Error: t.Error, ModelKey: t.ModelKey, CreatedAt: t.CreatedAt, FinishedAt: t.FinishedAt,
	}
	if json.Valid([]byte(t.Settings)) {
		out.Request = json.RawMessage(t.Settings)
	}
	if job != nil {
		out.Phase, out.Step, out.Total, out.Epoch, out.Epochs = job.Phase, job.Step, job.Total, job.Epoch, job.Epochs
		out.Loss, out.ETA, out.Elapsed, out.Family, out.Samples = job.Loss, job.ETA, job.Elapsed, job.Family, job.Samples
		if t.Active() || t.Status == "failed" {
			out.Log = job.Log
			if len(out.Log) > 15 {
				out.Log = out.Log[len(out.Log)-15:]
			}
		}
	}
	return out
}

// handleTrainList answers the studio's Train tab: whether a trainer is set up and
// what it is, and the runs, the live ones with their progress.
func (s *Server) handleTrainList(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	base, token, ok := s.trainerSettings()
	out := map[string]any{"configured": ok}
	jobs := map[string]trainer.Job{}
	if ok {
		if h, err := s.trainer.Health(ctx, base, token); err != nil {
			out["trainerError"] = err.Error()
		} else {
			out["trainer"] = h
			if list, err := s.trainer.Jobs(ctx, base, token); err == nil {
				for _, j := range list {
					jobs[j.ID] = j
				}
			}
		}
	}
	rows, err := s.db.LoraTrainings(ctx, false, 30)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	list := make([]trainingOut, 0, len(rows))
	for _, t := range rows {
		var job *trainer.Job
		if j, found := jobs[t.TrainerJob]; found && t.TrainerJob != "" {
			job = &j
		}
		list = append(list, trainingOutOf(t, job))
	}
	out["trainings"] = list
	if len(rows) > 0 {
		s.trainWatch()
	}
	writeJSON(w, http.StatusOK, out)
}

// ── choosing the pictures ───────────────────────────────────────────────────

// trainPictureRows are the stills a source names, at most trainMaxPictures of them.
func (s *Server) trainPictureRows(ctx context.Context, src trainSource) ([]*db.MediaRow, error) {
	var ids []int64
	switch {
	case len(src.MediaIDs) > 0:
		ids = src.MediaIDs
	case src.CollectionID > 0:
		for offset := 0; len(ids) < trainMaxPictures*2; offset += 200 {
			page, err := s.db.CollectionMediaIDs(ctx, src.CollectionID, 200, offset)
			if err != nil {
				return nil, err
			}
			ids = append(ids, page...)
			if len(page) < 200 {
				break
			}
		}
	case strings.TrimSpace(src.Tag) != "":
		rows, err := s.db.MediaPage(ctx, db.MediaFilter{Kind: string(models.KindImage), Tag: strings.TrimSpace(src.Tag)}, trainMaxPictures, 0)
		if err != nil {
			return nil, err
		}
		return rows, nil
	default:
		return nil, errors.New("pick a collection or a tag to train on")
	}
	var out []*db.MediaRow
	for _, id := range ids {
		row, err := s.db.GetMedia(ctx, id)
		if err != nil || row == nil || row.Kind != string(models.KindImage) {
			continue
		}
		out = append(out, row)
		if len(out) >= trainMaxPictures {
			break
		}
	}
	return out, nil
}

type trainPreviewReq struct {
	Source   trainSource `json:"source"`
	Trigger  string      `json:"trigger"`
	Captions string      `json:"captions"`
	LeaveOut []string    `json:"leaveOut"`
}

// handleTrainPreview says what a source would train on before anything is sent:
// how many pictures, which (for thumbnails), the tags they share — which is what
// the leave-out list is picked from — and one caption as it would be written.
func (s *Server) handleTrainPreview(w http.ResponseWriter, r *http.Request) {
	var req trainPreviewReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	rows, err := s.trainPictureRows(ctx, req.Source)
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
	sets := make([][]models.Tag, 0, len(ids))
	for _, id := range ids {
		sets = append(sets, tagsByID[id])
	}
	example := ""
	if len(ids) > 0 {
		example = loraCaption(req.Trigger, tagsByID[ids[0]], loraLeaveOut(req.LeaveOut), req.Captions)
	}
	shown := ids
	if len(shown) > 24 {
		shown = shown[:24]
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"count": len(ids), "mediaIds": shown, "commonTags": loraCommonTags(sets, 40),
		"exampleCaption": example, "suggestedRepeats": loraRepeats(len(ids)),
		"limit": trainMaxPictures,
	})
}

// ── starting a run ──────────────────────────────────────────────────────────

func (s *Server) handleTrainStart(w http.ResponseWriter, r *http.Request) {
	var req trainRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	base, token, ok := s.trainerSettings()
	if !ok {
		writeErr(w, http.StatusConflict, "no trainer is set up — add its address under Settings → Image generation")
		return
	}
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		writeErr(w, http.StatusConflict, "image generation is not configured")
		return
	}
	req.Name = loraFileName(req.Name)
	req.Trigger = strings.TrimSpace(req.Trigger)
	if req.Name == "" {
		writeErr(w, http.StatusBadRequest, "the LoRA needs a name")
		return
	}
	if strings.TrimSpace(req.Base) == "" {
		writeErr(w, http.StatusBadRequest, "pick the checkpoint to train against")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	if _, err := s.trainer.Health(ctx, base, token); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	ckpt, err := s.imagegen.CheckpointFile(ctx, set.ImageGenURL, req.Base)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	rows, err := s.trainPictureRows(ctx, req.Source)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if len(rows) == 0 {
		writeErr(w, http.StatusBadRequest, "there are no pictures there to train on (GIFs and videos are left out)")
		return
	}
	settingsJSON, _ := json.Marshal(req)
	t, err := s.db.InsertLoraTraining(ctx, db.LoraTraining{
		Name: req.Name, Trigger: req.Trigger, BaseModel: s.trainBaseName(ctx, set.ImageGenURL, req.Base), Images: len(rows),
		Settings: string(settingsJSON), Status: "preparing",
	})
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	st := s.trainState()
	st.mu.Lock()
	st.preparing[t.ID] = true
	st.mu.Unlock()
	go s.trainPrepare(t, req, ckpt, rows)
	s.trainWatch()
	writeJSON(w, http.StatusOK, trainingOutOf(t, nil))
}

// trainBaseName is the checkpoint as a person knows it. The studio picks one by its
// selector, which on InvokeAI is a record key — a UUID nobody would recognise in the
// run list or in the LoRA's description.
func (s *Server) trainBaseName(ctx context.Context, genBase, selector string) string {
	if models, err := s.imagegen.Models(ctx, genBase); err == nil {
		for _, m := range models {
			if (m.Title == selector || m.Key == selector) && m.Name != "" {
				return m.Name
			}
		}
	}
	return selector
}

// trainPrepare makes sure the trainer has the checkpoint and sends it the pictures.
// It runs in the background: a checkpoint is gigabytes.
func (s *Server) trainPrepare(t db.LoraTraining, req trainRequest, ckpt imagegen.CheckpointFile, rows []*db.MediaRow) {
	st := s.trainState()
	defer func() {
		st.mu.Lock()
		delete(st.preparing, t.ID)
		st.mu.Unlock()
	}()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Hour)
	defer cancel()
	fail := func(err error) {
		t.Status, t.Error = "failed", err.Error()
		if err := s.db.PutLoraTraining(context.Background(), t); err != nil {
			s.log.Warn("train: record failure", "id", t.ID, "err", err)
		}
	}
	base, token, _ := s.trainerSettings()
	ref := trainer.BaseRef{Key: ckpt.Key, Size: ckpt.Size}
	have, err := s.trainer.HasBase(ctx, base, token, ref)
	if err != nil {
		fail(err)
		return
	}
	if !have {
		if ckpt.Local == "" {
			fail(fmt.Errorf("the trainer can't see %s — mount the generator's models folder into the trainer at /models, or Automatic1111's models folder into OppaiLib so the checkpoint can be sent", ckpt.Key))
			return
		}
		f, err := os.Open(ckpt.Local)
		if err != nil {
			fail(fmt.Errorf("can't read the checkpoint to send it: %w", err))
			return
		}
		err = s.trainer.UploadBase(ctx, base, token, ref, f)
		f.Close()
		if err != nil {
			fail(fmt.Errorf("sending the checkpoint to the trainer: %w", err))
			return
		}
	}

	// Stop here if the run was cancelled while the checkpoint went over.
	if cur, ok, _ := s.db.GetLoraTraining(ctx, t.ID); !ok || cur.Status != "preparing" {
		return
	}

	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
	}
	tagsByID, err := s.db.TagsForMediaBatch(ctx, ids)
	if err != nil {
		fail(err)
		return
	}
	leaveOut := loraLeaveOut(req.LeaveOut)
	sent, i := 0, 0
	next := func() (trainer.Picture, bool, error) {
		for i < len(rows) {
			row := rows[i]
			i++
			data, err := s.trainReadPicture(row)
			if err != nil {
				s.log.Warn("train: skip a picture", "media", row.ID, "err", err)
				continue
			}
			ext := loraPictureExt(data)
			if ext == "" {
				continue
			}
			sent++
			return trainer.Picture{Ext: ext, Data: data, Caption: loraCaption(req.Trigger, tagsByID[row.ID], leaveOut, req.Captions)}, true, nil
		}
		if sent == 0 {
			return trainer.Picture{}, false, errors.New("none of the pictures could be read")
		}
		return trainer.Picture{}, false, nil
	}
	job, err := s.trainer.Submit(ctx, base, token, s.trainSpec(ctx, req, ckpt, sets(tagsByID, ids), len(rows)), next)
	if err != nil {
		fail(err)
		return
	}
	t.TrainerJob, t.Images, t.Status = job.ID, sent, "queued"
	if cur, ok, _ := s.db.GetLoraTraining(ctx, t.ID); ok && cur.Status != "preparing" {
		// Cancelled while the pictures were going over: the job goes too.
		_ = s.trainer.Delete(ctx, base, token, job.ID)
		return
	}
	if err := s.db.PutLoraTraining(ctx, t); err != nil {
		s.log.Warn("train: record queued", "id", t.ID, "err", err)
	}
	s.trainWatch()
}

func sets(tagsByID map[int64][]models.Tag, ids []int64) [][]models.Tag {
	out := make([][]models.Tag, 0, len(ids))
	for _, id := range ids {
		out = append(out, tagsByID[id])
	}
	return out
}

// trainReadPicture decrypts one picture into memory. It never touches the disk on
// this side; the trainer deletes its copy when the run ends.
func (s *Server) trainReadPicture(row *db.MediaRow) ([]byte, error) {
	if row.Size > trainMaxPictureBytes {
		return nil, fmt.Errorf("%d MB is too large to train on", row.Size>>20)
	}
	rc, err := s.store.Open(row.BlobPath)
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(io.LimitReader(rc, trainMaxPictureBytes))
}

// trainSpec is the trainer's job for a request. The sample, when asked for, is the
// trigger word and the tags the set has most in common — something that should look
// like the pictures — with the checkpoint's own recommended negative.
func (s *Server) trainSpec(ctx context.Context, req trainRequest, ckpt imagegen.CheckpointFile, tagSets [][]models.Tag, images int) trainer.Spec {
	spec := trainer.Spec{
		Name: req.Name, Trigger: req.Trigger, Base: trainer.BaseRef{Key: ckpt.Key, Size: ckpt.Size},
		Resolution: req.Resolution, Rank: req.Rank, Epochs: req.Epochs, Repeats: req.Repeats,
		LearningRate: req.LearningRate, Optimizer: req.Optimizer, ClipSkip: req.ClipSkip, Flip: req.Flip,
	}
	if spec.Repeats <= 0 {
		spec.Repeats = loraRepeats(images)
	}
	if req.LowVRAM {
		spec.UnetOnly = true
		if spec.Resolution == 0 || spec.Resolution > 768 {
			spec.Resolution = 768
		}
	}
	if req.Samples {
		words := []string{}
		if req.Trigger != "" {
			words = append(words, req.Trigger)
		}
		leaveOut := loraLeaveOut(req.LeaveOut)
		for _, t := range loraCommonTags(tagSets, 12) {
			if !leaveOut[loraTagKey(t.Name)] && len(words) < 10 {
				words = append(words, t.Name)
			}
		}
		negative := "lowres, worst quality, bad anatomy"
		if x, err := s.db.GetModelDefaults(ctx, ckpt.Key); err == nil && x.Negative != "" {
			negative = x.Negative
		}
		spec.Samples = []trainer.SamplePrompt{{Prompt: strings.Join(words, ", "), Negative: negative}}
	}
	return spec
}

// ── stopping and forgetting ─────────────────────────────────────────────────

func (s *Server) trainRow(w http.ResponseWriter, r *http.Request) (db.LoraTraining, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return db.LoraTraining{}, false
	}
	t, ok, err := s.db.GetLoraTraining(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return t, false
	}
	if !ok {
		writeErr(w, http.StatusNotFound, "no such training")
		return t, false
	}
	return t, true
}

// handleTrainCancel stops a run. One still being prepared stops at the next step;
// one on the trainer is stopped there and the watcher records how it ended.
func (s *Server) handleTrainCancel(w http.ResponseWriter, r *http.Request) {
	t, ok := s.trainRow(w, r)
	if !ok {
		return
	}
	if !t.Active() {
		writeJSON(w, http.StatusOK, trainingOutOf(t, nil))
		return
	}
	base, token, _ := s.trainerSettings()
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	switch t.Status {
	case "preparing":
		t.Status = "cancelled"
	case "queued", "training":
		if err := s.trainer.Cancel(ctx, base, token, t.TrainerJob); err != nil && !errors.Is(err, trainer.ErrNotFound) {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		// The trainer says when it has stopped; until then it is still "training".
		if t.Status == "queued" {
			t.Status = "cancelled"
		}
	case "installing":
		writeErr(w, http.StatusConflict, "it has finished training and is being installed")
		return
	}
	if !t.Active() {
		s.trainEnded(ctx, &t)
	}
	if err := s.db.PutLoraTraining(ctx, t); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, trainingOutOf(t, nil))
}

// handleTrainDelete forgets a finished run, and the trainer's copy of it.
func (s *Server) handleTrainDelete(w http.ResponseWriter, r *http.Request) {
	t, ok := s.trainRow(w, r)
	if !ok {
		return
	}
	if t.Active() {
		writeErr(w, http.StatusConflict, "stop it first")
		return
	}
	if t.TrainerJob != "" {
		base, token, _ := s.trainerSettings()
		ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
		defer cancel()
		if err := s.trainer.Delete(ctx, base, token, t.TrainerJob); err != nil && !errors.Is(err, trainer.ErrNotFound) {
			s.log.Warn("train: forget on the trainer", "job", t.TrainerJob, "err", err)
		}
	}
	if err := s.db.DeleteLoraTraining(r.Context(), t.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// handleTrainSample streams one of a run's sample pictures from the trainer.
func (s *Server) handleTrainSample(w http.ResponseWriter, r *http.Request) {
	t, ok := s.trainRow(w, r)
	if !ok {
		return
	}
	name := r.URL.Query().Get("name")
	base, token, configured := s.trainerSettings()
	if !configured || t.TrainerJob == "" || name == "" {
		writeErr(w, http.StatusNotFound, "no such sample")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	data, err := s.trainer.Sample(ctx, base, token, t.TrainerJob, name)
	if err != nil {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "private, max-age=3600")
	_, _ = w.Write(data)
}

// ── the watcher ─────────────────────────────────────────────────────────────

// trainWatch starts the watcher if it is not running. Called on every start, every
// look at the list, and at boot, so a run started before a restart is followed.
func (s *Server) trainWatch() {
	st := s.trainState()
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.watching {
		return
	}
	st.watching = true
	go func() {
		defer func() {
			st.mu.Lock()
			st.watching = false
			st.mu.Unlock()
		}()
		for {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			remaining := s.trainStep(ctx)
			cancel()
			if remaining == 0 {
				return
			}
			time.Sleep(trainWatchEvery)
		}
	}()
}

// trainStep moves every live run on by what the trainer and the generator say, and
// returns how many are still live.
func (s *Server) trainStep(ctx context.Context) int {
	st := s.trainState()
	st.step.Lock()
	defer st.step.Unlock()
	rows, err := s.db.LoraTrainings(ctx, true, 50)
	if err != nil || len(rows) == 0 {
		return 0
	}
	base, token, configured := s.trainerSettings()
	set := s.settings.Get()
	var jobs map[string]trainer.Job
	var installs []imagegen.InstallJob
	installsRead := false
	live := 0
	for i := range rows {
		t := rows[i]
		before := t
		switch t.Status {
		case "preparing":
			st := s.trainState()
			st.mu.Lock()
			sending := st.preparing[t.ID]
			st.mu.Unlock()
			if !sending {
				t.Status, t.Error = "failed", "OppaiLib restarted while it was sending the pictures; start it again"
			}
		case "queued", "training":
			if !configured {
				t.Status, t.Error = "failed", "the trainer is no longer set up"
				break
			}
			if jobs == nil {
				list, err := s.trainer.Jobs(ctx, base, token)
				if err != nil {
					// Unreachable for now; ask again next time rather than fail a run
					// that is quite possibly still going.
					live++
					continue
				}
				jobs = map[string]trainer.Job{}
				for _, j := range list {
					jobs[j.ID] = j
				}
			}
			job, ok := jobs[t.TrainerJob]
			if !ok {
				t.Status, t.Error = "failed", "the trainer no longer has this run"
				break
			}
			s.trainFollow(ctx, &t, job, set.ImageGenURL)
		case "installing":
			if !installsRead {
				installs, _ = s.imagegen.InstallJobs(ctx, set.ImageGenURL)
				installsRead = true
			}
			s.trainFollowInstall(ctx, &t, installs, set.ImageGenURL)
		}
		if !t.Active() && before.Active() {
			s.trainEnded(ctx, &t)
		}
		if t != before {
			if err := s.db.PutLoraTraining(ctx, t); err != nil {
				s.log.Warn("train: record", "id", t.ID, "err", err)
			}
		}
		if t.Active() {
			live++
		}
	}
	return live
}

// trainFollow moves a run on by its job on the trainer.
func (s *Server) trainFollow(ctx context.Context, t *db.LoraTraining, job trainer.Job, genBase string) {
	switch job.State {
	case "running":
		t.Status = "training"
		if !t.FreedGPU && trainWantsFreeGPU(t.Settings) && genBase != "" {
			if err := s.imagegen.FreeMemory(ctx, genBase); err != nil {
				s.log.Warn("train: generator would not let go of its checkpoint", "err", err)
			}
			// Marked either way: one try per run, not one per watcher step.
			t.FreedGPU = true
		}
	case "done":
		s.trainInstall(ctx, t, job, genBase)
	case "error":
		t.Status, t.Error = "failed", job.Error
		if t.Error == "" {
			t.Error = "training stopped"
		}
	case "cancelled":
		t.Status = "cancelled"
	}
}

func trainWantsFreeGPU(settings string) bool {
	var req trainRequest
	return json.Unmarshal([]byte(settings), &req) == nil && req.FreeGPU
}

// trainInstall hands the finished file to the generator, which fetches it from the
// trainer itself (InvokeAI) or has it fetched into its Lora folder (A1111), the
// same install a Civitai download is.
func (s *Server) trainInstall(ctx context.Context, t *db.LoraTraining, job trainer.Job, genBase string) {
	base, _, _ := s.trainerSettings()
	fileName := s.trainFreeLoraName(ctx, genBase, t.Name) + ".safetensors"
	source := trainer.OutputURL(base, job)
	if _, err := s.imagegen.InstallModel(ctx, genBase, imagegen.InstallSpec{Source: source, Type: "lora", FileName: fileName}); err != nil {
		t.Status, t.Error = "failed", "it trained, but the generator would not install it: "+err.Error()+" — the file is still on the trainer"
		return
	}
	t.Status, t.InstallSource = "installing", source
	// The run itself is over; the card can go back while the file is copied.
	s.trainGiveBackGPU(ctx, t)
}

// trainFreeLoraName is name, or name_2, name_3 … when the generator already has a
// LoRA by that name: an install never replaces one.
func (s *Server) trainFreeLoraName(ctx context.Context, genBase, name string) string {
	loras, err := s.imagegen.Loras(ctx, genBase)
	if err != nil {
		return name
	}
	taken := map[string]bool{}
	for _, l := range loras {
		taken[strings.ToLower(l.Name)] = true
	}
	candidate := name
	for n := 2; taken[strings.ToLower(candidate)] && n < 100; n++ {
		candidate = fmt.Sprintf("%s_%d", name, n)
	}
	return candidate
}

// trainFollowInstall finishes a run whose file the generator is installing.
func (s *Server) trainFollowInstall(ctx context.Context, t *db.LoraTraining, installs []imagegen.InstallJob, genBase string) {
	var job *imagegen.InstallJob
	for i := range installs {
		if installs[i].Source == t.InstallSource {
			job = &installs[i]
			break
		}
	}
	switch {
	case job == nil:
		if time.Since(time.Unix(t.UpdatedAt, 0)) > trainInstallGiveUp {
			t.Status, t.Error = "failed", "the generator never finished installing it; the file is still on the trainer"
		}
	case job.Status == "completed":
		t.ModelKey = job.ModelKey
		t.Status = "done"
		s.trainDress(ctx, t, genBase)
	case job.Status == "error" || job.Status == "cancelled":
		t.Status, t.Error = "failed", "installing it: "+job.Error
	}
}

// trainDress gives the installed LoRA its trigger word, a note of what it is, and a
// sample picture as its cover, then drops the trainer's copy of the run.
func (s *Server) trainDress(ctx context.Context, t *db.LoraTraining, genBase string) {
	base, token, _ := s.trainerSettings()
	job, jobErr := s.trainer.Job(ctx, base, token, t.TrainerJob)
	if t.ModelKey != "" {
		phrases := []string{}
		if t.Trigger != "" {
			phrases = append(phrases, t.Trigger)
		}
		desc := fmt.Sprintf("Trained in OppaiLib on %d pictures against %s.", t.Images, t.BaseModel)
		weight := imagegen.ModelDefaults{Weight: 1}
		changes := imagegen.ModelChanges{Description: &desc, TriggerPhrases: &phrases, Defaults: &weight}
		if jobErr == nil && job.Family != "" {
			family := map[string]string{"sdxl": "SDXL 1.0", "sd1": "SD 1.5"}[job.Family]
			changes.Base = &family
		}
		if _, err := s.imagegen.UpdateModel(ctx, genBase, t.ModelKey, changes); err != nil {
			s.log.Warn("train: dress the LoRA", "model", t.ModelKey, "err", err)
		}
		if jobErr == nil && len(job.Samples) > 0 {
			names := append([]string(nil), job.Samples...)
			sort.Strings(names)
			if data, err := s.trainer.Sample(ctx, base, token, t.TrainerJob, names[len(names)-1]); err == nil {
				if err := s.imagegen.UpdateCover(ctx, genBase, t.ModelKey, data, "image/png"); err != nil {
					s.log.Warn("train: cover", "model", t.ModelKey, "err", err)
				}
			}
		}
		s.installedHashCache.forget(genBase)
	}
	if err := s.trainer.Delete(ctx, base, token, t.TrainerJob); err != nil && !errors.Is(err, trainer.ErrNotFound) {
		s.log.Warn("train: forget on the trainer", "job", t.TrainerJob, "err", err)
	}
}

// trainEnded is the end of a run, however it ended.
func (s *Server) trainEnded(ctx context.Context, t *db.LoraTraining) {
	s.trainGiveBackGPU(ctx, t)
}

// trainGiveBackGPU asks the generator to load its checkpoint again if this run had
// asked it to let go. Automatic1111 does not reload on its own.
func (s *Server) trainGiveBackGPU(ctx context.Context, t *db.LoraTraining) {
	if !t.FreedGPU {
		return
	}
	t.FreedGPU = false
	if genBase := s.settings.Get().ImageGenURL; genBase != "" {
		if err := s.imagegen.ReclaimMemory(ctx, genBase); err != nil {
			s.log.Warn("train: generator did not reload its checkpoint", "err", err)
		}
	}
}
