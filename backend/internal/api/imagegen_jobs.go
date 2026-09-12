package api

import (
	"context"
	"net/http"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
)

// Watching a generation from the studio, and stopping one.
//
// The generate call is one long request: the studio sends it and waits. That is fine
// for the pictures — they are the response — but it leaves nothing for the studio to
// look at while it waits, and no handle to stop it by. So the studio names the run:
// it makes up a job id, sends it with the request, and while the request is in
// flight it polls /api/imagegen/progress/{id} for the step count and the preview the
// generator publishes, and can hit /api/imagegen/cancel/{id} to end it. The generate
// request itself then returns ctx.Err() as a 499-ish error, which the studio treats
// as "you stopped it" rather than a failure.
//
// Nothing here is persistent: a job lives as long as its request, plus a grace period
// so a last poll after completion still answers rather than 404s. The registry is a
// map on the server; a restart forgets every run, and a run without an id from an
// older client is served exactly as before.

// genJobGrace is how long a finished job stays readable after its request returned.
const genJobGrace = 30 * time.Second

// genJobIDPattern is what a client-made id may look like: short, URL-safe.
var genJobIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{4,64}$`)

// genJob is one run in flight, or just finished.
type genJob struct {
	cancel context.CancelFunc
	mu     sync.Mutex
	// latest is the last progress report, per image index; the studio shows the one
	// currently being drawn.
	latest    imagegen.Progress
	seq       int64 // bumped on every report, so a poll can tell "new preview" from "same one"
	done      bool
	cancelled bool
	// endedAt is when the request returned; zero while running.
	endedAt time.Time
}

// genJobs is the registry.
type genJobs struct {
	mu   sync.Mutex
	jobs map[string]*genJob
}

func newGenJobs() *genJobs { return &genJobs{jobs: map[string]*genJob{}} }

// start registers a run and returns the context it should run under. A second run
// under an id still in flight replaces the first's handle — the client that made the
// id is the only one that knows it, so this is a page that retried, not a stranger.
func (g *genJobs) start(parent context.Context, id string) (context.Context, *genJob) {
	ctx, cancel := context.WithCancel(parent)
	job := &genJob{cancel: cancel}
	g.mu.Lock()
	g.sweep()
	g.jobs[id] = job
	g.mu.Unlock()
	return ctx, job
}

// finish marks a run over. The entry lingers for the grace period.
func (g *genJobs) finish(id string, job *genJob) {
	job.mu.Lock()
	job.done = true
	job.endedAt = time.Now()
	job.mu.Unlock()
	job.cancel()
}

func (g *genJobs) get(id string) *genJob {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.jobs[id]
}

// sweep drops entries past their grace. Called under g.mu.
func (g *genJobs) sweep() {
	for id, job := range g.jobs {
		job.mu.Lock()
		stale := job.done && time.Since(job.endedAt) > genJobGrace
		job.mu.Unlock()
		if stale {
			delete(g.jobs, id)
		}
	}
}

// report is the imagegen.Progress callback for one job.
func (job *genJob) report(p imagegen.Progress) {
	job.mu.Lock()
	defer job.mu.Unlock()
	// A report without a preview keeps the last preview: the generator sends the
	// picture every few steps and the step count every step.
	if p.Image == "" && p.Index == job.latest.Index {
		p.Image = job.latest.Image
	}
	job.latest = p
	job.seq++
}

// genProgressResponse is what a poll answers.
type genProgressResponse struct {
	Index     int     `json:"index"`
	Step      int     `json:"step"`
	Total     int     `json:"total"`
	Percent   float64 `json:"percent"`
	Image     string  `json:"image,omitempty"`
	Seq       int64   `json:"seq"`
	Done      bool    `json:"done"`
	Cancelled bool    `json:"cancelled"`
}

// handleImageGenProgress answers the studio's poll. The preview is omitted when the
// client says it already has this seq, so a poll that finds nothing new is a few
// bytes rather than a picture.
func (s *Server) handleImageGenProgress(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	job := s.genJobs.get(id)
	if job == nil {
		writeErr(w, http.StatusNotFound, "no such generation")
		return
	}
	job.mu.Lock()
	out := genProgressResponse{
		Index: job.latest.Index, Step: job.latest.Step, Total: job.latest.Total, Percent: job.latest.Percent,
		Image: job.latest.Image, Seq: job.seq, Done: job.done, Cancelled: job.cancelled,
	}
	job.mu.Unlock()
	if r.URL.Query().Get("seen") == strconv.FormatInt(out.Seq, 10) {
		out.Image = ""
	}
	writeJSON(w, http.StatusOK, out)
}

// handleImageGenCancel stops a run. The generate request in flight returns with the
// context error; the generator is told to stop by the imagegen client.
func (s *Server) handleImageGenCancel(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	job := s.genJobs.get(id)
	if job == nil {
		writeErr(w, http.StatusNotFound, "no such generation")
		return
	}
	job.mu.Lock()
	job.cancelled = true
	job.mu.Unlock()
	job.cancel()
	writeJSON(w, http.StatusOK, map[string]any{"cancelled": true})
}
