package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/scraper"
)

// Filling a training set from outside the library, and tagging it.
//
// The training set is always pictures in the library — a run reads them from the
// store like any other — so bringing pictures in from elsewhere means importing
// them, and the import puts them in a collection the Train screen then trains on.
// Uploads need nothing here: the browser shows the files it was given, sends the
// ones kept through the ordinary upload, and adds them to the collection itself.
// An X account is different: the browser cannot see x.com, so the server lists the
// account's pictures (scraper/twitter_user.go), the browser shows them through the
// image proxy, and only the ones kept are downloaded and imported.
//
// Importing a few hundred pictures, or tagging them, takes minutes, so both run in
// the background as a task the screen polls. A task lives in memory: it is a
// progress bar, not a record, and what it did is in the library either way.

// trainImportMax bounds one import, at the size of a training set.
const trainImportMax = trainMaxPictures

// trainTaskKeep is how long a finished task stays to be read.
const trainTaskKeep = time.Hour

type trainTask struct {
	ID       string `json:"id"`
	Kind     string `json:"kind"` // "import" | "autotag"
	Total    int    `json:"total"`
	Done     int    `json:"done"`
	Failed   int    `json:"failed"`
	Finished bool   `json:"finished"`
	Error    string `json:"error,omitempty"`
	// CollectionID is where an import put the pictures.
	CollectionID int64   `json:"collectionId,omitempty"`
	MediaIDs     []int64 `json:"mediaIds,omitempty"`
	ended        time.Time
}

type trainTasks struct {
	mu sync.Mutex
	m  map[string]*trainTask
}

func (s *Server) trainTaskList() *trainTasks {
	st := s.trainState()
	st.mu.Lock()
	defer st.mu.Unlock()
	if st.tasks == nil {
		st.tasks = &trainTasks{m: map[string]*trainTask{}}
	}
	return st.tasks
}

func (ts *trainTasks) start(kind string, total int) *trainTask {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	t := &trainTask{ID: hex.EncodeToString(b), Kind: kind, Total: total}
	ts.mu.Lock()
	defer ts.mu.Unlock()
	for id, old := range ts.m {
		if old.Finished && time.Since(old.ended) > trainTaskKeep {
			delete(ts.m, id)
		}
	}
	ts.m[t.ID] = t
	return t
}

// update changes a task under the lock.
func (ts *trainTasks) update(t *trainTask, fn func(*trainTask)) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	fn(t)
	if t.Finished && t.ended.IsZero() {
		t.ended = time.Now()
	}
}

func (ts *trainTasks) get(id string) (trainTask, bool) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	t, ok := ts.m[id]
	if !ok {
		return trainTask{}, false
	}
	out := *t
	out.MediaIDs = append([]int64(nil), t.MediaIDs...)
	return out, true
}

func (s *Server) handleTrainTask(w http.ResponseWriter, r *http.Request) {
	t, ok := s.trainTaskList().get(r.PathValue("id"))
	if !ok {
		writeErr(w, http.StatusNotFound, "no such task — it finished a while ago, or OppaiLib restarted")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// ── an X account ────────────────────────────────────────────────────────────

// handleTrainTwitter lists one page of an account's pictures.
//
//	user=@name     the account, or a link to it or to one of its posts
//	cursor=…       the page after the one that handed this cursor back
func (s *Server) handleTrainTwitter(w http.ResponseWriter, r *http.Request) {
	handle := scraper.TwitterHandle(r.URL.Query().Get("user"))
	if handle == "" {
		writeErr(w, http.StatusBadRequest, "that isn't an X account — type its @name or paste a link to it")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	page, err := s.scraper.TwitterUserMedia(ctx, handle, r.URL.Query().Get("cursor"))
	if errors.Is(err, scraper.ErrTwitterNoAccount) {
		writeErr(w, http.StatusNotFound, fmt.Sprintf("there's no X account @%s", handle))
		return
	}
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, page)
}

// ── importing what was kept ─────────────────────────────────────────────────

type trainImportItem struct {
	URL string `json:"url"`
	// Source is where the picture was found — the post — kept as the item's source.
	Source string `json:"source"`
	Title  string `json:"title"`
}

type trainImportReq struct {
	Items []trainImportItem `json:"items"`
	// CollectionID adds to a collection there is; otherwise one is made by this name.
	CollectionID   int64  `json:"collectionId"`
	CollectionName string `json:"collectionName"`
}

// handleTrainImport downloads the kept pictures into the library and a collection,
// in the background, and answers with the task to watch.
func (s *Server) handleTrainImport(w http.ResponseWriter, r *http.Request) {
	var req trainImportReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	items := make([]trainImportItem, 0, len(req.Items))
	seen := map[string]bool{}
	for _, it := range req.Items {
		u, err := url.Parse(strings.TrimSpace(it.URL))
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || seen[u.String()] {
			continue
		}
		seen[u.String()] = true
		it.URL = u.String()
		items = append(items, it)
	}
	if len(items) == 0 {
		writeErr(w, http.StatusBadRequest, "pick the pictures to keep first")
		return
	}
	if len(items) > trainImportMax {
		writeErr(w, http.StatusBadRequest, fmt.Sprintf("that's more than %d pictures — a LoRA trains no better on more", trainImportMax))
		return
	}
	collID, err := s.trainCollection(r.Context(), req.CollectionID, req.CollectionName)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	tasks := s.trainTaskList()
	task := tasks.start("import", len(items))
	task.CollectionID = collID
	go s.trainImport(tasks, task, collID, items)
	out, _ := tasks.get(task.ID)
	writeJSON(w, http.StatusAccepted, out)
}

// trainCollection is the collection an import goes into: the one named by id, or a
// new one by name. Names are unique, so a collection an earlier try at the same LoRA
// left behind — whatever its capitals — is joined rather than refused or doubled.
func (s *Server) trainCollection(ctx context.Context, id int64, name string) (int64, error) {
	if id > 0 {
		if _, err := s.db.GetCollection(ctx, id); err != nil {
			return 0, errors.New("that collection is gone")
		}
		return id, nil
	}
	name = strings.TrimSpace(name)
	if name == "" {
		name = "LoRA training"
	}
	all, err := s.db.ListCollections(ctx)
	if err != nil {
		return 0, err
	}
	for _, c := range all {
		if strings.EqualFold(c.Name, name) {
			return c.ID, nil
		}
	}
	return s.db.CreateCollection(ctx, name)
}

func (s *Server) trainImport(tasks *trainTasks, task *trainTask, collID int64, items []trainImportItem) {
	ctx, cancel := context.WithTimeout(context.Background(), importTimeout)
	defer cancel()
	sem := make(chan struct{}, maxImportConcurrency)
	var wg sync.WaitGroup
	for _, it := range items {
		wg.Add(1)
		sem <- struct{}{}
		go func(it trainImportItem) {
			defer wg.Done()
			defer func() { <-sem }()
			id, err := s.trainImportOne(ctx, it)
			if err == nil {
				// One at a time, as they land: an import cut short keeps what it got.
				_, err = s.db.AddToCollection(ctx, collID, []int64{id})
			}
			tasks.update(task, func(t *trainTask) {
				if err != nil {
					s.log.Warn("train import: skip a picture", "url", it.URL, "err", err)
					t.Failed++
					return
				}
				t.Done++
				t.MediaIDs = append(t.MediaIDs, id)
			})
		}(it)
	}
	wg.Wait()
	tasks.update(task, func(t *trainTask) {
		t.Finished = true
		if t.Done == 0 {
			t.Error = "none of the pictures could be downloaded"
		}
	})
}

// trainImportOne downloads one picture into the library. It skips the scraper's
// politeness delay, as the image proxy does: these are a CDN's pictures the person
// has just looked at, and the import already bounds how many go at once.
func (s *Server) trainImportOne(ctx context.Context, it trainImportItem) (int64, error) {
	dl, err := s.scraper.FetchImage(ctx, it.URL)
	if err != nil {
		return 0, err
	}
	defer dl.Body.Close()
	if ct := strings.ToLower(dl.ContentType); ct != "" && !strings.HasPrefix(ct, "image/") {
		return 0, fmt.Errorf("%s is not a picture", ct)
	}
	title := strings.TrimSpace(it.Title)
	if len(title) > 200 {
		title = strings.TrimSpace(title[:200]) + "…"
	}
	res, err := s.ingestBlob(ctx, dl.Body, ingestMeta{Filename: dl.Filename, Title: title, Source: it.Source})
	if err != nil {
		return 0, err
	}
	if res.Kind != string(models.KindImage) {
		return 0, fmt.Errorf("it came in as a %s, not a still", res.Kind)
	}
	return res.ID, nil
}

// ── tagging a set ───────────────────────────────────────────────────────────

type trainAutotagReq struct {
	Source trainSource `json:"source"`
	// Redo tags every picture again, replacing what the tagger said before; without
	// it only the pictures with no tags are tagged.
	Redo bool `json:"redo"`
}

// trainAutotagConcurrency is how many pictures are tagged at once. The tagger is the
// same model the import path runs; two keeps it busy without starving an import.
const trainAutotagConcurrency = 2

// handleTrainAutotag runs the tagger over a training set's pictures in the background.
func (s *Server) handleTrainAutotag(w http.ResponseWriter, r *http.Request) {
	var req trainAutotagReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if !s.ai.Enabled() {
		writeErr(w, http.StatusConflict, "the tagger is off — turn on AI tagging under Settings → AI")
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
	type job struct {
		id        int64
		blob      string
		staleTags []string
	}
	var jobs []job
	for _, row := range rows {
		tags := tagsByID[row.ID]
		if !req.Redo && len(loraContentTags(tags)) > 0 {
			continue
		}
		j := job{id: row.ID, blob: row.BlobPath}
		if req.Redo {
			for _, t := range tags {
				if t.Source == "ai" {
					j.staleTags = append(j.staleTags, t.Name)
				}
			}
		}
		jobs = append(jobs, j)
	}
	tasks := s.trainTaskList()
	task := tasks.start("autotag", len(jobs))
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Hour)
		defer cancel()
		sem := make(chan struct{}, trainAutotagConcurrency)
		var wg sync.WaitGroup
		for _, j := range jobs {
			wg.Add(1)
			sem <- struct{}{}
			go func(j job) {
				defer wg.Done()
				defer func() { <-sem }()
				// What the tagger said last time goes first, so a picture it now sees
				// differently does not keep both answers. Tags typed by hand stay.
				for _, name := range j.staleTags {
					_ = s.db.RemoveTag(ctx, j.id, name)
				}
				err := s.ai.TagMedia(ctx, j.id, j.blob, string(models.KindImage))
				tasks.update(task, func(t *trainTask) {
					if err != nil {
						s.log.Warn("train autotag", "media", j.id, "err", err)
						t.Failed++
						return
					}
					t.Done++
				})
			}(j)
		}
		wg.Wait()
		tasks.update(task, func(t *trainTask) { t.Finished = true })
		s.touchLibraryIndex()
	}()
	out, _ := tasks.get(task.ID)
	writeJSON(w, http.StatusAccepted, out)
}
