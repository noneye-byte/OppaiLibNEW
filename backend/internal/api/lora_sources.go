package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/scraper"
	"github.com/youruser/oppailib/internal/sources"
)

// Filling a training set from an X account or a source, and tagging a set.
//
// Pictures from outside go into a training set (lora_sets.go), never the library.
// Uploads need nothing here: the browser shows the files it was given and sends the
// ones kept to the set itself. An X account is different: the browser cannot see
// x.com, so the server lists the account's pictures (scraper/twitter_user.go), the
// browser shows them through the image proxy, and only the ones kept are downloaded
// into the set. A Browse source (Rule34) is listed through its own browse endpoint
// the same way, and its kept posts come here to be downloaded.
//
// Importing a few hundred pictures, or tagging them, takes minutes, so both run in
// the background as a task the screen polls. A task lives in memory: it is a
// progress bar, not a record, and what it did is in the set either way.

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
	// SetID is the training set an import put the pictures in; PictureIDs are them.
	SetID      int64   `json:"setId,omitempty"`
	PictureIDs []int64 `json:"pictureIds,omitempty"`
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
	out.PictureIDs = append([]int64(nil), t.PictureIDs...)
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
	// Post, in place of URL, is a Browse source's post to read the picture's file
	// from first: Rule34 listed without an API key has thumbnails and post links
	// only, and reading every post just to list them is forty requests a page.
	Post *trainImportPost `json:"post,omitempty"`
}

type trainImportPost struct {
	Source string `json:"source"` // a Browse source's id: "rule34"
	Feed   string `json:"feed"`   // the item's feed id: "post:123"
}

type trainImportReq struct {
	Items []trainImportItem `json:"items"`
	// SetID adds to a set there is; otherwise the set by this name, made if need be.
	SetID   int64  `json:"setId"`
	SetName string `json:"setName"`
}

// handleTrainImport downloads the kept pictures into a training set, in the
// background, and answers with the task to watch.
func (s *Server) handleTrainImport(w http.ResponseWriter, r *http.Request) {
	var req trainImportReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	items := make([]trainImportItem, 0, len(req.Items))
	seen := map[string]bool{}
	for _, it := range req.Items {
		if it.Post != nil && strings.TrimSpace(it.URL) == "" {
			key := it.Post.Source + "/" + it.Post.Feed
			if _, ok := s.sources.Get(it.Post.Source); !ok || it.Post.Feed == "" || seen[key] {
				continue
			}
			seen[key] = true
			items = append(items, it)
			continue
		}
		u, err := url.Parse(strings.TrimSpace(it.URL))
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || seen[u.String()] {
			continue
		}
		seen[u.String()] = true
		it.URL = u.String()
		it.Post = nil
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
	set, err := s.trainSetFor(r.Context(), req.SetID, req.SetName)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	tasks := s.trainTaskList()
	task := tasks.start("import", len(items))
	task.SetID = set.ID
	go s.trainImport(tasks, task, set.ID, items)
	out, _ := tasks.get(task.ID)
	writeJSON(w, http.StatusAccepted, out)
}

func (s *Server) trainImport(tasks *trainTasks, task *trainTask, setID int64, items []trainImportItem) {
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
			// One at a time, as they land: an import cut short keeps what it got.
			id, err := s.trainImportOne(ctx, setID, it)
			tasks.update(task, func(t *trainTask) {
				if err != nil {
					s.log.Warn("train import: skip a picture", "url", it.URL, "err", err)
					t.Failed++
					return
				}
				t.Done++
				t.PictureIDs = append(t.PictureIDs, id)
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

// trainImportOne downloads one picture into a set. It skips the scraper's
// politeness delay, as the image proxy does: these are a CDN's pictures the person
// has just looked at, and the import already bounds how many go at once.
func (s *Server) trainImportOne(ctx context.Context, setID int64, it trainImportItem) (int64, error) {
	if it.URL == "" && it.Post != nil {
		media, err := s.trainPostMedia(ctx, *it.Post)
		if err != nil {
			return 0, err
		}
		it.URL = media
	}
	dl, err := s.scraper.FetchImage(ctx, it.URL)
	if err != nil {
		return 0, err
	}
	defer dl.Body.Close()
	if ct := strings.ToLower(dl.ContentType); ct != "" && !strings.HasPrefix(ct, "image/") {
		return 0, fmt.Errorf("%s is not a picture", ct)
	}
	data, err := io.ReadAll(io.LimitReader(dl.Body, trainMaxPictureBytes+1))
	if err != nil {
		return 0, err
	}
	pic, _, err := s.addTrainPicture(ctx, setID, data, it.Source)
	return pic.ID, err
}

// trainPostMedia reads a source's post for its picture's file. The file's host is
// checked against the sources' own, as the stream proxy checks it: a post is the
// other site's page, and where it points is not ours to follow blindly.
func (s *Server) trainPostMedia(ctx context.Context, post trainImportPost) (string, error) {
	src, ok := s.sources.Get(post.Source)
	if !ok {
		return "", fmt.Errorf("unknown source %q", post.Source)
	}
	listing, err := src.Browse(ctx, sources.BrowseParams{Feed: post.Feed})
	if err != nil {
		return "", err
	}
	for _, item := range listing.Items {
		if item.MediaURL == "" {
			continue
		}
		if item.Kind != "image" {
			return "", fmt.Errorf("that post is a %s, not a still picture", item.Kind)
		}
		u, err := url.Parse(item.MediaURL)
		if err != nil || !s.sources.AllowsHost(u.Hostname()) {
			return "", errors.New("that post's file is somewhere the source doesn't keep its pictures")
		}
		return item.MediaURL, nil
	}
	return "", errors.New("that post has no picture")
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
	pics, err := s.trainPics(ctx, req.Source)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	type job struct {
		pic       trainPic
		staleTags []string
	}
	var jobs []job
	for _, p := range pics {
		tags := p.Tags
		if !req.Redo && len(loraContentTags(tags)) > 0 {
			continue
		}
		j := job{pic: p}
		if req.Redo && req.Source.SetID == 0 {
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
				var err error
				if setID := req.Source.SetID; setID > 0 {
					// A set's picture is tagged in the set; the library never sees it.
					err = s.tagTrainPicture(ctx, setID, j.pic)
				} else {
					// What the tagger said last time goes first, so a picture it now sees
					// differently does not keep both answers. Tags typed by hand stay.
					for _, name := range j.staleTags {
						_ = s.db.RemoveTag(ctx, j.pic.ID, name)
					}
					err = s.ai.TagMedia(ctx, j.pic.ID, j.pic.BlobPath, string(models.KindImage))
				}
				tasks.update(task, func(t *trainTask) {
					if err != nil {
						s.log.Warn("train autotag", "picture", j.pic.ID, "err", err)
						t.Failed++
						return
					}
					t.Done++
				})
			}(j)
		}
		wg.Wait()
		tasks.update(task, func(t *trainTask) { t.Finished = true })
		if req.Source.SetID == 0 {
			s.touchLibraryIndex()
		}
	}()
	out, _ := tasks.get(task.ID)
	writeJSON(w, http.StatusAccepted, out)
}
