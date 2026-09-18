package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/gamesites"
	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/settings"
)

// The Games tab's catalogue browsers and the update checks that hang off them.
//
//	GET    /api/games/sites                    both sites' sign-in state and sort options
//	POST   /api/games/sites/{site}/login       {username,password} or {cookie}
//	POST   /api/games/sites/{site}/logout
//	GET    /api/games/browse?site=&q=&sort=&page=
//	POST   /api/games/browse/detail            {item}  → the item with its page read
//	POST   /api/games/browse/add               {url}   → the library entry, created or found
//	GET    /api/games/updates                  games with a newer version posted, and the sweep's state
//	POST   /api/games/updates/check            sweep every game that came from a site, in the background
//	GET    /api/media/{id}/remote              where the game came from
//	PUT    /api/media/{id}/remote              {url, knownVersion?}
//	DELETE /api/media/{id}/remote
//	POST   /api/media/{id}/remote/check        read the page now
//	POST   /api/media/{id}/remote/acknowledge  the newest version is the one installed
//	GET    /api/media/{id}/sources             where the build can be had, off the page
//
// A site is browsed signed in or not at all (see gamesites). The sign-in for
// F95zone is the login already in Settings; itch.io's is its session cookie,
// because its login page is behind a browser challenge a server cannot pass — so
// the cookie is pasted here, or pushed by Launchy, which signs in through the
// site's own page in a real browser window.

// remoteRef is what ref_enc seals.
type remoteRef struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

func (s *Server) sealRef(ref remoteRef) ([]byte, error) {
	b, err := json.Marshal(ref)
	if err != nil {
		return nil, err
	}
	return crypto.SealBytes(s.kek, b, []byte("gameref"))
}

func (s *Server) openRef(enc []byte) remoteRef {
	var ref remoteRef
	if raw := s.decrypt(enc, "gameref"); raw != "" {
		_ = json.Unmarshal([]byte(raw), &ref)
	}
	return ref
}

func (s *Server) toGameRemote(row *db.GameRemoteRow) models.GameRemote {
	ref := s.openRef(row.RefEnc)
	site := gamesites.Site(row.Site)
	return models.GameRemote{
		Site:          string(site),
		Label:         site.Label(),
		ID:            ref.ID,
		URL:           ref.URL,
		KnownVersion:  row.KnownVersion,
		LatestVersion: row.LatestVersion,
		Changelog:     s.decrypt(row.ChangelogEnc, "notes"),
		CheckedAt:     row.CheckedAt,
		UpdateSeenAt:  row.UpdateSeenAt,
		HasUpdate:     gamesites.HasUpdate(row.KnownVersion, row.LatestVersion),
	}
}

// applyGameSiteSettings pushes the stored logins into the sites client. Called at
// startup and on every settings save.
func (s *Server) applyGameSiteSettings(cur settings.Settings) {
	if s.games == nil {
		return
	}
	s.games.SetUserAgent(cur.ScrapeUserAgent)
	s.games.SetF95Credentials(cur.F95Username, cur.F95Password)
	if cur.F95Cookie != "" {
		if err := s.games.SetCookie(gamesites.F95, cur.F95Cookie); err != nil {
			s.log.Warn("f95 cookie from settings rejected", "err", err)
		}
	}
	if cur.ItchCookie != "" {
		if err := s.games.SetCookie(gamesites.Itch, cur.ItchCookie); err != nil {
			s.log.Warn("itch cookie from settings rejected", "err", err)
		}
	} else {
		s.games.SignOut(gamesites.Itch)
	}
}

// gameSitesResponse is what the Games tab asks for first.
type gameSitesResponse struct {
	Sites []gamesites.Account                 `json:"sites"`
	Sorts map[gamesites.Site][]gamesites.Sort `json:"sorts"`
	// ItchNSFW mirrors the setting so the browser can show the toggle's state.
	ItchNSFW bool `json:"itchNsfw"`
}

func (s *Server) handleGameSites(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	out := gameSitesResponse{Sorts: gamesites.Sorts, ItchNSFW: s.settings.Get().ItchNSFW}
	for _, site := range gamesites.Sites {
		out.Sites = append(out.Sites, s.games.Account(ctx, site))
	}
	writeJSON(w, http.StatusOK, out)
}

func siteParam(w http.ResponseWriter, r *http.Request) (gamesites.Site, bool) {
	site, ok := gamesites.ParseSite(r.PathValue("site"))
	if !ok {
		writeErr(w, http.StatusNotFound, "unknown site")
		return "", false
	}
	return site, true
}

// handleGameSiteLogin signs a site in and keeps the login: a password for
// F95zone, or a cookie for either.
func (s *Server) handleGameSiteLogin(w http.ResponseWriter, r *http.Request) {
	site, ok := siteParam(w, r)
	if !ok {
		return
	}
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Cookie   string `json:"cookie"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	cur := s.settings.Get()
	switch {
	case strings.TrimSpace(req.Cookie) != "":
		if err := s.games.SetCookie(site, req.Cookie); err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		acct := s.games.Account(ctx, site)
		if !acct.SignedIn {
			writeErr(w, http.StatusBadGateway, site.Label()+" did not accept that cookie — it may have expired")
			return
		}
		if site == gamesites.Itch {
			cur.ItchCookie = strings.TrimSpace(req.Cookie)
		} else {
			cur.F95Cookie = strings.TrimSpace(req.Cookie)
		}
	default:
		if err := s.games.Login(ctx, site, req.Username, req.Password); err != nil {
			// Deliberately not 401. The client treats a 401 from anywhere as "your
			// OppaiLib session has ended" and signs the user out on the spot — which
			// is what a rejected *F95zone* password used to do, throwing you out of
			// your own library for mistyping someone else's. This is an upstream
			// refusal, and it is reported as one.
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		cur.F95Username, cur.F95Password = strings.TrimSpace(req.Username), req.Password
		cur.F95Cookie = ""
	}
	if err := s.db.PutSettings(r.Context(), cur.Map()); err != nil {
		s.log.Warn("game site login: saving settings", "site", site, "err", err)
	}
	s.settings.Set(cur)
	s.scraper.SetF95Credentials(cur.F95Username, cur.F95Password)
	// A sign-in that was accepted and then does not read as signed in is still a
	// failure, and answering 200 with signedIn:false made it an invisible one: the
	// form simply stayed where it was, with nothing said. Say it instead — the
	// credentials are kept either way, so the next read can try renewing them.
	acct := s.games.Account(ctx, site)
	if !acct.SignedIn {
		writeErr(w, http.StatusBadGateway, site.Label()+" took the sign-in but still serves us as a guest — the session did not stick")
		return
	}
	writeJSON(w, http.StatusOK, acct)
}

func (s *Server) handleGameSiteLogout(w http.ResponseWriter, r *http.Request) {
	site, ok := siteParam(w, r)
	if !ok {
		return
	}
	s.games.SignOut(site)
	cur := s.settings.Get()
	if site == gamesites.Itch {
		cur.ItchCookie = ""
	} else {
		cur.F95Cookie = ""
		cur.F95Username, cur.F95Password = "", ""
		s.games.SetF95Credentials("", "")
		s.scraper.SetF95Credentials("", "")
	}
	if err := s.db.PutSettings(r.Context(), cur.Map()); err != nil {
		s.log.Warn("game site logout: saving settings", "site", site, "err", err)
	}
	s.settings.Set(cur)
	writeJSON(w, http.StatusOK, gamesites.Account{Site: site, Label: site.Label(), Password: site == gamesites.F95})
}

// remoteIndex maps every remote reference in the library back to its game, keyed
// by site+id and by URL, so a browse page can mark what is already on the shelf.
func (s *Server) remoteIndex(ctx context.Context) map[string]int64 {
	out := map[string]int64{}
	rows, err := s.db.ListGameRemotes(ctx)
	if err != nil {
		return out
	}
	for _, row := range rows {
		ref := s.openRef(row.RefEnc)
		if ref.ID != "" {
			out[row.Site+":"+ref.ID] = row.GameID
		}
		if ref.URL != "" {
			out["url:"+normalizeGameURL(ref.URL)] = row.GameID
		}
	}
	return out
}

func normalizeGameURL(u string) string {
	return strings.TrimRight(strings.ToLower(strings.TrimSpace(u)), "/")
}

func (s *Server) markInLibrary(index map[string]int64, item *gamesites.Item) {
	if id, ok := index[string(item.Site)+":"+item.ID]; ok && item.ID != "" {
		item.LibraryID = id
		return
	}
	if id, ok := index["url:"+normalizeGameURL(item.URL)]; ok {
		item.LibraryID = id
	}
}

func (s *Server) handleGameBrowse(w http.ResponseWriter, r *http.Request) {
	site, ok := gamesites.ParseSite(r.URL.Query().Get("site"))
	if !ok {
		writeErr(w, http.StatusBadRequest, "site must be itch or f95")
		return
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	listing, err := s.games.Browse(ctx, gamesites.Query{
		Site:  site,
		Query: r.URL.Query().Get("q"),
		Sort:  r.URL.Query().Get("sort"),
		Page:  page,
		NSFW:  s.settings.Get().ItchNSFW,
	})
	if errors.Is(err, gamesites.ErrSignedOut) {
		// 409, not 401 — see handleGameSiteLogin. A site we are not signed in to is
		// a precondition of this request, not a statement about the caller's session.
		writeErr(w, http.StatusConflict, "sign in to "+site.Label()+" to browse it")
		return
	}
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	index := s.remoteIndex(r.Context())
	for i := range listing.Items {
		s.markInLibrary(index, &listing.Items[i])
	}
	writeJSON(w, http.StatusOK, listing)
}

// handleGameBrowseDetail reads a result's own page, for a card the user is
// looking at but has not added.
func (s *Server) handleGameBrowseDetail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Item gamesites.Item `json:"item"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Item.URL == "" {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if _, _, ok := gamesites.RemoteFromURL(req.Item.URL); !ok {
		writeErr(w, http.StatusBadRequest, "not a game page on a known site")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	item, degraded := s.games.Detail(ctx, req.Item)
	s.markInLibrary(s.remoteIndex(r.Context()), &item)
	writeJSON(w, http.StatusOK, map[string]any{"item": item, "degraded": degraded})
}

// handleGameBrowseAdd files a browsed game away: the scraper reads the page into a
// library entry the way a pasted URL would, and the page is remembered as where
// the game came from, which is what later lets its version be checked.
func (s *Server) handleGameBrowseAdd(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL     string `json:"url"`
		Version string `json:"version"`
		ID      string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.URL) == "" {
		writeErr(w, http.StatusBadRequest, "need a url")
		return
	}
	site, threadID, ok := gamesites.RemoteFromURL(req.URL)
	if !ok {
		writeErr(w, http.StatusBadRequest, "not an itch.io or F95zone game page")
		return
	}
	if threadID != "" {
		req.ID = threadID
	}
	if id, ok := s.remoteIndex(r.Context())["url:"+normalizeGameURL(req.URL)]; ok {
		s.writeGame(w, r, id, false)
		return
	}

	// Minutes of downloads must not be undone by a client that stops waiting.
	r, cancel := detachImport(r)
	defer cancel()
	scraped, err := s.scraper.Scrape(r.Context(), req.URL)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	id, err := s.importGame(r, scraped)
	if err != nil {
		s.log.Warn("game browse add failed", "url", req.URL, "err", err)
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}

	// The version the site is on now is the version the user has: they are about to
	// download it. An itch page has no version field, so its page is read for the
	// nearest honest answer; that is a second read and is allowed to fail.
	version := strings.TrimSpace(req.Version)
	if version == "" {
		ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
		if v, _, err := s.games.Latest(ctx, site, req.URL); err == nil {
			version = v
		}
		cancel()
	}
	if err := s.setRemote(r.Context(), id, site, req.ID, req.URL, version, version); err != nil {
		s.log.Warn("game browse add: recording remote", "media", id, "err", err)
	}
	s.writeGame(w, r, id, true)
}

// setRemote records where a game came from, with both versions equal so a fresh
// reference never invents an update the user has not been told about.
func (s *Server) setRemote(ctx context.Context, gameID int64, site gamesites.Site, remoteID, pageURL, known, latest string) error {
	if remoteID == "" {
		if _, tid, ok := gamesites.RemoteFromURL(pageURL); ok {
			remoteID = tid
		}
	}
	enc, err := s.sealRef(remoteRef{ID: remoteID, URL: strings.TrimSpace(pageURL)})
	if err != nil {
		return err
	}
	if err := s.db.UpsertGameRemote(ctx, &db.GameRemoteRow{
		GameID: gameID, Site: string(site), RefEnc: enc,
		KnownVersion: strings.TrimSpace(known), LatestVersion: strings.TrimSpace(latest),
	}); err != nil {
		return err
	}
	return s.db.TouchMedia(ctx, gameID)
}

// writeGame answers with the game as the library shows it, plus its remote.
func (s *Server) writeGame(w http.ResponseWriter, r *http.Request, id int64, created bool) {
	row, err := s.db.GetMedia(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	m := s.toModel(row)
	m.Tags, _ = s.db.TagsForMedia(r.Context(), id)
	out := map[string]any{"media": m, "id": id, "created": created}
	if remote, err := s.db.GetGameRemote(r.Context(), id); err == nil {
		out["remote"] = s.toGameRemote(remote)
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, out)
}

/* --------------------------------------------------------------- per game */

func (s *Server) handleGetGameRemote(w http.ResponseWriter, r *http.Request) {
	id, ok := s.gameID(w, r)
	if !ok {
		return
	}
	row, err := s.db.GetGameRemote(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "this game was not added from itch.io or F95zone")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, s.toGameRemote(row))
}

// handlePutGameRemote points a game at its page — for a game imported before
// its origin was recorded, or one whose thread moved.
func (s *Server) handlePutGameRemote(w http.ResponseWriter, r *http.Request) {
	id, ok := s.gameID(w, r)
	if !ok {
		return
	}
	var req struct {
		URL           string `json:"url"`
		ID            string `json:"id"`
		KnownVersion  string `json:"knownVersion"`
		LatestVersion string `json:"latestVersion"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	site, _, ok := gamesites.RemoteFromURL(req.URL)
	if !ok {
		writeErr(w, http.StatusBadRequest, "not an itch.io or F95zone game page")
		return
	}
	latest := req.LatestVersion
	if latest == "" {
		latest = req.KnownVersion
	}
	if err := s.setRemote(r.Context(), id, site, req.ID, req.URL, req.KnownVersion, latest); err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't record the page")
		return
	}
	row, _ := s.db.GetGameRemote(r.Context(), id)
	writeJSON(w, http.StatusOK, s.toGameRemote(row))
}

func (s *Server) handleDeleteGameRemote(w http.ResponseWriter, r *http.Request) {
	id, ok := s.gameID(w, r)
	if !ok {
		return
	}
	existed, err := s.db.DeleteGameRemote(r.Context(), id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if !existed {
		writeErr(w, http.StatusNotFound, "this game has no page on file")
		return
	}
	_ = s.db.TouchMedia(r.Context(), id)
	w.WriteHeader(http.StatusNoContent)
}

// checkGame re-reads one game's page and records what it says. A page that will
// not load records the attempt and reports the error without touching versions.
func (s *Server) checkGame(ctx context.Context, row *db.GameRemoteRow) (changed bool, err error) {
	ref := s.openRef(row.RefEnc)
	site := gamesites.Site(row.Site)
	version, changelog, err := s.games.Latest(ctx, site, ref.URL)
	now := time.Now().Unix()
	if err != nil {
		_ = s.db.RecordGameCheck(ctx, row.GameID, "", nil, now, row.UpdateSeenAt)
		return false, err
	}
	changed = gamesites.HasUpdate(row.KnownVersion, version)
	// Stamp the moment an update first appeared, and clear it when the source goes
	// back to matching what is installed.
	seen := int64(0)
	if changed {
		seen = row.UpdateSeenAt
		if seen == 0 {
			seen = now
		}
	}
	var changelogEnc []byte
	if changelog != "" {
		changelogEnc, _ = crypto.SealBytes(s.kek, []byte(changelog), []byte("notes"))
	}
	if err := s.db.RecordGameCheck(ctx, row.GameID, version, changelogEnc, now, seen); err != nil {
		return changed, err
	}
	return changed, s.db.TouchMedia(ctx, row.GameID)
}

func (s *Server) handleCheckGameRemote(w http.ResponseWriter, r *http.Request) {
	id, ok := s.gameID(w, r)
	if !ok {
		return
	}
	row, err := s.db.GetGameRemote(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "this game was not added from itch.io or F95zone")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	changed, checkErr := s.checkGame(ctx, row)
	row, _ = s.db.GetGameRemote(r.Context(), id)
	out := map[string]any{"remote": s.toGameRemote(row), "changed": changed}
	if checkErr != nil {
		out["error"] = checkErr.Error()
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) handleAcknowledgeGameRemote(w http.ResponseWriter, r *http.Request) {
	id, ok := s.gameID(w, r)
	if !ok {
		return
	}
	if err := s.db.AcknowledgeGameUpdate(r.Context(), id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	_ = s.db.TouchMedia(r.Context(), id)
	row, err := s.db.GetGameRemote(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "this game was not added from itch.io or F95zone")
		return
	}
	writeJSON(w, http.StatusOK, s.toGameRemote(row))
}

// handleGameSources reads the game's page for the builds it lists. Nothing is
// downloaded here: the links open in the user's browser, where their cookies and
// the file hosts' captchas are.
func (s *Server) handleGameSources(w http.ResponseWriter, r *http.Request) {
	id, ok := s.gameID(w, r)
	if !ok {
		return
	}
	row, err := s.db.GetGameRemote(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "this game was not added from itch.io or F95zone")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	writeJSON(w, http.StatusOK, s.games.Report(ctx, gamesites.Site(row.Site), s.openRef(row.RefEnc).URL))
}

/* --------------------------------------------------------------- the sweep */

// gameUpdateSweep is the one check-everything run that may be in flight. A sweep
// reads one page per game with a courtesy gap between, so a library of a hundred
// games takes a couple of minutes — long enough that it runs in the background
// and the client polls its progress rather than holding a request open.
type gameUpdateSweep struct {
	mu      sync.Mutex
	running bool
	done    int
	total   int
	current string
	lastRun int64
	found   int
	errs    int
}

type gameUpdateState struct {
	Running bool   `json:"running"`
	Done    int    `json:"done"`
	Total   int    `json:"total"`
	Current string `json:"current,omitempty"`
	LastRun int64  `json:"lastRun,omitempty"`
	Found   int    `json:"found"`
	Errors  int    `json:"errors"`
}

func (g *gameUpdateSweep) state() gameUpdateState {
	g.mu.Lock()
	defer g.mu.Unlock()
	return gameUpdateState{Running: g.running, Done: g.done, Total: g.total, Current: g.current, LastRun: g.lastRun, Found: g.found, Errors: g.errs}
}

// startGameUpdateSweep begins a sweep unless one is running. Reports whether it
// started one.
func (s *Server) startGameUpdateSweep() bool {
	g := s.gameUpdates
	g.mu.Lock()
	if g.running {
		g.mu.Unlock()
		return false
	}
	g.running, g.done, g.total, g.current, g.found, g.errs = true, 0, 0, "", 0, 0
	g.mu.Unlock()
	go s.runGameUpdateSweep()
	return true
}

func (s *Server) runGameUpdateSweep() {
	g := s.gameUpdates
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
	defer cancel()
	defer func() {
		g.mu.Lock()
		g.running, g.current, g.lastRun = false, "", time.Now().Unix()
		g.mu.Unlock()
	}()
	rows, err := s.db.ListGameRemotes(ctx)
	if err != nil {
		s.log.Warn("game update sweep: listing", "err", err)
		return
	}
	g.mu.Lock()
	g.total = len(rows)
	g.mu.Unlock()
	for _, row := range rows {
		title := ""
		if m, err := s.db.GetMedia(ctx, row.GameID); err == nil {
			title = s.decrypt(m.TitleEnc, "title")
		}
		g.mu.Lock()
		g.current = title
		g.mu.Unlock()
		checkCtx, cancel := context.WithTimeout(ctx, 90*time.Second)
		changed, err := s.checkGame(checkCtx, row)
		cancel()
		g.mu.Lock()
		g.done++
		if err != nil {
			g.errs++
		} else if changed {
			g.found++
		}
		g.mu.Unlock()
	}
}

// gameUpdate is one row of the "updates waiting" list.
type gameUpdate struct {
	ID       int64             `json:"id"`
	Title    string            `json:"title"`
	HasThumb bool              `json:"hasThumb"`
	Remote   models.GameRemote `json:"remote"`
}

func (s *Server) handleGameUpdates(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.ListGameRemotes(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	items := []gameUpdate{}
	tracked := 0
	for _, row := range rows {
		tracked++
		if !gamesites.HasUpdate(row.KnownVersion, row.LatestVersion) {
			continue
		}
		m, err := s.db.GetMedia(r.Context(), row.GameID)
		if err != nil {
			continue
		}
		items = append(items, gameUpdate{
			ID: row.GameID, Title: s.decrypt(m.TitleEnc, "title"),
			HasThumb: m.ThumbPath.Valid && m.ThumbPath.String != "",
			Remote:   s.toGameRemote(row),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items, "tracked": tracked, "sweep": s.gameUpdates.state()})
}

func (s *Server) handleGameUpdatesCheck(w http.ResponseWriter, r *http.Request) {
	started := s.startGameUpdateSweep()
	writeJSON(w, http.StatusAccepted, map[string]any{"started": started, "sweep": s.gameUpdates.state()})
}

// gameRemoteFor is the remote of a game as its media view carries it, or nil.
func (s *Server) gameRemoteFor(ctx context.Context, id int64) *models.GameRemote {
	row, err := s.db.GetGameRemote(ctx, id)
	if err != nil {
		return nil
	}
	out := s.toGameRemote(row)
	return &out
}
