package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/gamesites"
)

// Controlling Launchy, the desktop game launcher.
//
//	GET    /api/launchy                       is the launcher connected, and everything it last said about itself
//	PUT    /api/launchy/state                 the launcher's report: version, sign-ins, sessions, downloads, sync
//	GET    /api/launchy/commands?wait=&running=  the launcher's long poll: check in, collect requests
//	POST   /api/launchy/commands/{cmd}        {ok, error, message, …}  the launcher reports a request's outcome
//	POST   /api/launchy/launch                {gameId}  ask the launcher to start a game (kept for the phone)
//	POST   /api/launchy/requests              {action, gameId?, saveId?, source?, downloadId?}  any request
//	GET    /api/launchy/requests/{cmd}        how a request went (also /api/launchy/launch/{cmd})
//
// The launcher is the client throughout. It holds a key (see api_keys.go), syncs on
// its own schedule, and long-polls for requests; the server never reaches out to
// it, so there is nothing to configure on this side and the launcher works from
// behind any NAT. A request from the web or the phone is queued here and picked up
// on the next poll, which is at most a few seconds away while the launcher is up —
// and answered with "Launchy is not connected" when it is not, rather than queued
// into a void.
//
// The same queue carries the server's own requests: F95zone is read through the
// launcher's browser (see launchyBrowser), so a "fetch" goes down the poll and the
// page comes back up the outcome. Those are the server's business and are not
// counted as pending for anyone watching.

// launchyStale is how long after its last poll the launcher counts as gone. A poll
// waits up to 25 seconds, so a healthy launcher is never more than ~30 away.
const launchyStale = 75 * time.Second

// Actions a client may ask of the launcher, and the capability a launcher must
// report before it is sent one. Launch predates capabilities: every launcher can.
var launchyActions = map[string]string{
	"launch":          "",
	"stop":            "stop",
	"sync":            "sync",
	"backup-saves":    "saves",
	"restore-save":    "saves",
	"download":        "download",
	"cancel-download": "download",
}

// launchCommand is one request queued for the launcher.
type launchCommand struct {
	ID     string `json:"id"`
	Action string `json:"action"`
	GameID int64  `json:"gameId"`
	// What the action needs beyond the game, each only on the actions that use it.
	SaveID     int64                     `json:"saveId,omitempty"`
	DownloadID string                    `json:"downloadId,omitempty"`
	Source     *gamesites.DownloadSource `json:"source,omitempty"`
	Title      string                    `json:"title,omitempty"`
	URL        string                    `json:"url,omitempty"`
	Referer    string                    `json:"referer,omitempty"`

	Status string `json:"status"` // pending|sent|done|failed
	Error  string `json:"error,omitempty"`
	// What the launcher had to say about a success ("Backed up 14 files").
	Message   string `json:"message,omitempty"`
	CreatedAt int64  `json:"createdAt"`
	DoneAt    int64  `json:"doneAt,omitempty"`

	// A fetch's answer, for the read waiting on it and nobody else.
	page       relayedPage
	challenged bool
	done       chan struct{}
}

type relayedPage struct {
	status int
	url    string
	body   string
}

// The launcher's report about itself. Every field is the launcher's to fill and
// the server's only to pass on, so the web and the phone can show what the PC is
// doing without either of them talking to it.
type launchyAccount struct {
	Site     string `json:"site"`
	SignedIn bool   `json:"signedIn"`
	User     string `json:"user,omitempty"`
	// The site answered the launcher with a human check: someone has to press
	// Verify on the PC before it reads again.
	Challenged bool `json:"challenged,omitempty"`
}

type launchySession struct {
	GameID    int64  `json:"gameId"`
	Title     string `json:"title"`
	StartedAt int64  `json:"startedAt"`
}

type launchyDownload struct {
	ID         string `json:"id"`
	GameID     int64  `json:"gameId,omitempty"`
	Title      string `json:"title"`
	Label      string `json:"label,omitempty"`
	Status     string `json:"status"`
	Message    string `json:"message,omitempty"`
	StartedAt  int64  `json:"startedAt"`
	FinishedAt int64  `json:"finishedAt,omitempty"`
}

type launchySync struct {
	Running   bool   `json:"running"`
	LastSync  int64  `json:"lastSync,omitempty"`
	LastError string `json:"lastError,omitempty"`
}

type launchyReport struct {
	Version      string            `json:"version,omitempty"`
	Capabilities []string          `json:"capabilities"`
	Accounts     []launchyAccount  `json:"accounts"`
	Sessions     []launchySession  `json:"sessions"`
	Downloads    []launchyDownload `json:"downloads"`
	Sync         launchySync       `json:"sync"`
	// The launcher's lock screen is up: it will still take requests, but whoever
	// is at the PC has to unlock it to see what they did.
	Locked bool `json:"locked,omitempty"`
}

// normalize caps a report to sane sizes and turns nil lists into empty ones — a
// Go nil slice is JSON null, and the phone's decoder does not forgive a null list.
func (r *launchyReport) normalize() {
	clip := func(n, max int) int {
		if n > max {
			return max
		}
		return n
	}
	r.Capabilities = append([]string{}, r.Capabilities[:clip(len(r.Capabilities), 20)]...)
	r.Accounts = append([]launchyAccount{}, r.Accounts[:clip(len(r.Accounts), 8)]...)
	r.Sessions = append([]launchySession{}, r.Sessions[:clip(len(r.Sessions), 50)]...)
	r.Downloads = append([]launchyDownload{}, r.Downloads[:clip(len(r.Downloads), 100)]...)
	if len(r.Version) > 40 {
		r.Version = r.Version[:40]
	}
}

func (r *launchyReport) can(capability string) bool {
	for _, c := range r.Capabilities {
		if c == capability {
			return true
		}
	}
	return false
}

type launchyRuntime struct {
	mu       sync.Mutex
	name     string
	lastSeen time.Time
	running  map[int64]bool
	report   launchyReport
	reported time.Time
	queue    []*launchCommand
	// Every command by id, so a client can ask how its request went. Swept of
	// anything older than a few minutes on each new request.
	commands map[string]*launchCommand
	// wake is closed and replaced whenever a command is queued, so a poll blocked
	// waiting can return at once.
	wake chan struct{}
}

func newLaunchyRuntime() *launchyRuntime {
	r := &launchyRuntime{running: map[int64]bool{}, commands: map[string]*launchCommand{}, wake: make(chan struct{})}
	r.report.normalize()
	return r
}

func (l *launchyRuntime) connected() bool {
	return !l.lastSeen.IsZero() && time.Since(l.lastSeen) < launchyStale
}

// launchyStatus is what every client sees.
type launchyStatus struct {
	Connected bool    `json:"connected"`
	Name      string  `json:"name,omitempty"`
	LastSeen  int64   `json:"lastSeen,omitempty"`
	Running   []int64 `json:"running"`
	Pending   int     `json:"pending"`
	// What the launcher last said about itself. Empty from a launcher too old to
	// report, which is how a client knows not to offer what it cannot do.
	launchyReport
	ReportedAt int64 `json:"reportedAt,omitempty"`
}

func (l *launchyRuntime) status() launchyStatus {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := launchyStatus{Connected: l.connected(), Name: l.name, Running: []int64{}, launchyReport: l.report}
	for _, cmd := range l.queue {
		if cmd.Action != "fetch" {
			out.Pending++
		}
	}
	if !l.lastSeen.IsZero() {
		out.LastSeen = l.lastSeen.Unix()
	}
	if !l.reported.IsZero() {
		out.ReportedAt = l.reported.Unix()
	}
	for id := range l.running {
		out.Running = append(out.Running, id)
	}
	return out
}

// checkIn records a poll from the launcher: its name and what it is running.
func (l *launchyRuntime) checkIn(name string, running []int64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if name != "" {
		l.name = name
	}
	l.lastSeen = time.Now()
	l.running = map[int64]bool{}
	for _, id := range running {
		l.running[id] = true
	}
}

// setReport keeps what the launcher said about itself. A report is a sign of life
// as much as a poll is.
func (l *launchyRuntime) setReport(r launchyReport) {
	r.normalize()
	l.mu.Lock()
	defer l.mu.Unlock()
	l.report = r
	l.reported = time.Now()
	l.lastSeen = l.reported
}

func (l *launchyRuntime) can(capability string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.connected() && l.report.can(capability)
}

func (l *launchyRuntime) isRunning(gameID int64) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.running[gameID] {
		return true
	}
	for _, s := range l.report.Sessions {
		if s.GameID == gameID {
			return true
		}
	}
	return false
}

// enqueue adds a command and wakes any waiting poll.
func (l *launchyRuntime) enqueue(cmd *launchCommand) *launchCommand {
	cmd.ID = randomToken(8)
	cmd.Status = "pending"
	cmd.CreatedAt = time.Now().Unix()
	cmd.done = make(chan struct{})
	l.mu.Lock()
	defer l.mu.Unlock()
	for id, old := range l.commands {
		if time.Since(time.Unix(old.CreatedAt, 0)) > 10*time.Minute {
			delete(l.commands, id)
		}
	}
	l.commands[cmd.ID] = cmd
	l.queue = append(l.queue, cmd)
	close(l.wake)
	l.wake = make(chan struct{})
	return cmd
}

// take hands every queued command to the launcher and marks them sent.
func (l *launchyRuntime) take() []*launchCommand {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := l.queue
	l.queue = nil
	for _, cmd := range out {
		cmd.Status = "sent"
	}
	if out == nil {
		out = []*launchCommand{}
	}
	return out
}

func (l *launchyRuntime) waiter() <-chan struct{} {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.wake
}

// launchyOutcome is what the launcher says when it is done with a command.
type launchyOutcome struct {
	OK      bool   `json:"ok"`
	Error   string `json:"error"`
	Message string `json:"message"`
	// A fetch's page.
	Status     int    `json:"status"`
	URL        string `json:"url"`
	Body       string `json:"body"`
	Challenged bool   `json:"challenged"`
}

func (l *launchyRuntime) finish(id string, out launchyOutcome) *launchCommand {
	l.mu.Lock()
	defer l.mu.Unlock()
	cmd := l.commands[id]
	if cmd == nil {
		return nil
	}
	if cmd.DoneAt != 0 {
		// Reported twice: the first answer stands, and the waiter has it already.
		return cmd
	}
	cmd.DoneAt = time.Now().Unix()
	if out.OK {
		cmd.Status, cmd.Error, cmd.Message = "done", "", strings.TrimSpace(out.Message)
	} else {
		cmd.Status, cmd.Error = "failed", strings.TrimSpace(out.Error)
	}
	cmd.page = relayedPage{status: out.Status, url: out.URL, body: out.Body}
	cmd.challenged = out.Challenged
	close(cmd.done)
	return cmd
}

// forget drops a command nobody will ask about again — a fetch whose page has been
// read, or whose reader gave up — so a page body is not held for ten minutes.
func (l *launchyRuntime) forget(id string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.commands, id)
	for i, cmd := range l.queue {
		if cmd.ID == id {
			l.queue = append(l.queue[:i], l.queue[i+1:]...)
			break
		}
	}
}

// get returns a copy of a command, so it can be written out while the launcher
// reports on the original. A fetch is the server's own and is nobody's to ask after.
func (l *launchyRuntime) get(id string) *launchCommand {
	l.mu.Lock()
	defer l.mu.Unlock()
	cmd := l.commands[id]
	if cmd == nil || cmd.Action == "fetch" {
		return nil
	}
	c := *cmd
	return &c
}

/* ------------------------------------------------------------- the relay */

// launchyBrowser lends gamesites the launcher's browser. F95zone shows every page
// to a person who has ticked its "Verify you are human" box and to nobody else;
// the launcher's sign-in window is where that person ticks it, and its session is
// what the tick is good for. So a read the server wants goes down the long poll as
// a "fetch", the launcher reads the page with that session, and the page comes back
// as the command's outcome. Nothing here tries to pass the check itself.
type launchyBrowser struct{ l *launchyRuntime }

// relayTimeout bounds one read through the launcher: its own fetch gives up at 20
// seconds, and the poll that carries the request can take a moment to come round.
const relayTimeout = 40 * time.Second

func (b launchyBrowser) Ready(site gamesites.Site) bool {
	return site == gamesites.F95 && b.l.can("fetch")
}

func (b launchyBrowser) Account(site gamesites.Site) (signedIn bool, user, note string) {
	b.l.mu.Lock()
	accounts := b.l.report.Accounts
	b.l.mu.Unlock()
	for _, a := range accounts {
		if a.Site != string(site) {
			continue
		}
		if a.Challenged {
			return a.SignedIn, a.User, site.Label() + " wants Launchy to prove it is a person again — open Launchy on the PC and press Verify next to " + site.Label() + "."
		}
		if !a.SignedIn {
			return false, "", "Launchy is not signed in to " + site.Label() + " — sign in under Settings → Accounts in Launchy."
		}
		return true, a.User, ""
	}
	return false, "", "Launchy is not signed in to " + site.Label() + " — sign in under Settings → Accounts in Launchy."
}

func (b launchyBrowser) Fetch(ctx context.Context, rawURL, referer string) (int, string, string, error) {
	u, err := url.Parse(rawURL)
	if err != nil || u.Scheme != "https" || !isF95Host(u.Hostname()) {
		// The launcher refuses anything else as well; this is the server not asking.
		return 0, "", "", errors.New("only F95zone pages are read through Launchy")
	}
	cmd := b.l.enqueue(&launchCommand{Action: "fetch", URL: rawURL, Referer: referer})
	defer b.l.forget(cmd.ID)
	ctx, cancel := context.WithTimeout(ctx, relayTimeout)
	defer cancel()
	select {
	case <-cmd.done:
	case <-ctx.Done():
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return 0, "", "", gamesites.ErrBrowserGone
		}
		return 0, "", "", ctx.Err()
	}
	if cmd.challenged {
		return cmd.page.status, cmd.page.url, "", fmt.Errorf("%w: F95zone wants Launchy to prove it is a person again — open Launchy on the PC and press Verify next to F95zone", gamesites.ErrChallenged)
	}
	if cmd.Status != "done" {
		msg := cmd.Error
		if msg == "" {
			msg = "Launchy could not read the page"
		}
		return cmd.page.status, cmd.page.url, "", errors.New(msg)
	}
	final := cmd.page.url
	if final == "" {
		final = rawURL
	}
	status := cmd.page.status
	if status == 0 {
		status = http.StatusOK
	}
	return status, final, cmd.page.body, nil
}

func isF95Host(host string) bool {
	host = strings.ToLower(host)
	return host == "f95zone.to" || strings.HasSuffix(host, ".f95zone.to")
}

/* ------------------------------------------------------------ the handlers */

func (s *Server) handleLaunchyStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.launchy.status())
}

func (s *Server) handleLaunchyReport(w http.ResponseWriter, r *http.Request) {
	var report launchyReport
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&report); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid report")
		return
	}
	s.launchy.setReport(report)
	writeJSON(w, http.StatusOK, s.launchy.status())
}

// handleLaunchyCommands is the launcher's long poll. It doubles as the heartbeat:
// the query carries what the launcher is running, and its arrival is what makes
// the launcher "connected".
func (s *Server) handleLaunchyCommands(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var running []int64
	for _, part := range strings.Split(q.Get("running"), ",") {
		if id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64); err == nil {
			running = append(running, id)
		}
	}
	s.launchy.checkIn(strings.TrimSpace(q.Get("name")), running)

	wait, _ := strconv.Atoi(q.Get("wait"))
	if wait < 0 {
		wait = 0
	}
	if wait > 25 {
		wait = 25
	}
	deadline := time.After(time.Duration(wait) * time.Second)
	for {
		cmds := s.launchy.take()
		if len(cmds) > 0 || wait == 0 {
			writeJSON(w, http.StatusOK, map[string]any{"commands": cmds})
			return
		}
		select {
		case <-s.launchy.waiter():
		case <-deadline:
			writeJSON(w, http.StatusOK, map[string]any{"commands": []*launchCommand{}})
			return
		case <-r.Context().Done():
			return
		}
	}
}

func (s *Server) handleLaunchyCommandDone(w http.ResponseWriter, r *http.Request) {
	var out launchyOutcome
	// A fetch's outcome carries a whole forum thread; a big one is a few hundred
	// kilobytes, and nothing honest is anywhere near this.
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<20)).Decode(&out); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if s.launchy.finish(r.PathValue("cmd"), out) == nil {
		writeErr(w, http.StatusNotFound, "no such request")
		return
	}
	cmd := s.launchy.get(r.PathValue("cmd"))
	if cmd == nil {
		// A fetch: its reader has the page, and the launcher needs no echo of it.
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeJSON(w, http.StatusOK, cmd)
}

// handleLaunchyLaunch asks the launcher to start a game. Kept as its own route
// because the phone calls it; it is the "launch" request below.
func (s *Server) handleLaunchyLaunch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		GameID int64 `json:"gameId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.GameID <= 0 {
		writeErr(w, http.StatusBadRequest, "need a gameId")
		return
	}
	s.queueLaunchyRequest(w, r, launchyRequest{Action: "launch", GameID: req.GameID})
}

type launchyRequest struct {
	Action     string                    `json:"action"`
	GameID     int64                     `json:"gameId"`
	SaveID     int64                     `json:"saveId"`
	DownloadID string                    `json:"downloadId"`
	Source     *gamesites.DownloadSource `json:"source"`
}

func (s *Server) handleLaunchyRequest(w http.ResponseWriter, r *http.Request) {
	var req launchyRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	s.queueLaunchyRequest(w, r, req)
}

// queueLaunchyRequest checks a request against what is true right now and queues
// it. Refused outright when the launcher is not connected: a request that sits in
// a queue until a launcher shows up hours later and starts a game unbidden is worse
// than an error. Each refusal is a 409 or a 404 — never a 401, which would sign the
// asker out of OppaiLib over the state of a PC.
func (s *Server) queueLaunchyRequest(w http.ResponseWriter, r *http.Request, req launchyRequest) {
	capability, known := launchyActions[req.Action]
	if !known {
		writeErr(w, http.StatusBadRequest, "unknown request")
		return
	}
	if !s.launchy.status().Connected {
		writeErr(w, http.StatusConflict, "Launchy is not connected")
		return
	}
	if capability != "" && !s.launchy.can(capability) {
		writeErr(w, http.StatusConflict, "the Launchy on the PC is too old to do that from here — update it")
		return
	}
	cmd := &launchCommand{Action: req.Action, GameID: req.GameID}

	// Every action on a game needs the game to be in Launchy, except a download,
	// which may be how it gets there.
	needsPair := req.Action != "sync" && req.Action != "download" && req.Action != "cancel-download"
	if needsPair {
		if req.GameID <= 0 {
			writeErr(w, http.StatusBadRequest, "need a gameId")
			return
		}
		link, err := s.db.GetGameLaunchy(r.Context(), req.GameID)
		if errors.Is(err, sql.ErrNoRows) {
			writeErr(w, http.StatusNotFound, "this game is not in Launchy")
			return
		}
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		if req.Action == "launch" && !link.Installed {
			writeErr(w, http.StatusConflict, "this game is in Launchy but has no executable set")
			return
		}
	}

	switch req.Action {
	case "stop":
		if !s.launchy.isRunning(req.GameID) {
			writeErr(w, http.StatusConflict, "that game is not running on the PC")
			return
		}
	case "restore-save":
		if req.SaveID <= 0 {
			writeErr(w, http.StatusBadRequest, "need a saveId")
			return
		}
		if _, err := s.db.GetGameSave(r.Context(), req.GameID, req.SaveID); err != nil {
			writeErr(w, http.StatusNotFound, "no such save for this game")
			return
		}
		if s.launchy.isRunning(req.GameID) {
			// Writing saves under a running game is how a save gets eaten.
			writeErr(w, http.StatusConflict, "close the game on the PC first — restoring under a running game can lose the save")
			return
		}
		cmd.SaveID = req.SaveID
	case "download":
		src := req.Source
		if src == nil || !(strings.HasPrefix(src.URL, "https://") || strings.HasPrefix(src.URL, "http://")) {
			writeErr(w, http.StatusBadRequest, "need a source with a web address")
			return
		}
		if req.GameID > 0 {
			row, err := s.db.GetMedia(r.Context(), req.GameID)
			if err != nil {
				writeErr(w, http.StatusNotFound, "game not found")
				return
			}
			cmd.Title = s.toModel(row).Title
		}
		cmd.Source = src
	case "cancel-download":
		if strings.TrimSpace(req.DownloadID) == "" {
			writeErr(w, http.StatusBadRequest, "need a downloadId")
			return
		}
		cmd.DownloadID = strings.TrimSpace(req.DownloadID)
	}
	queued := s.launchy.enqueue(cmd)
	writeJSON(w, http.StatusAccepted, s.launchy.get(queued.ID))
}

func (s *Server) handleLaunchyLaunchStatus(w http.ResponseWriter, r *http.Request) {
	cmd := s.launchy.get(r.PathValue("cmd"))
	if cmd == nil {
		writeErr(w, http.StatusNotFound, "no such request")
		return
	}
	writeJSON(w, http.StatusOK, cmd)
}
