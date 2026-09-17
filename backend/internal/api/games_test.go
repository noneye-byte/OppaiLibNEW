package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/models"
)

func TestGameSitesStartSignedOutAndBrowsingRefusesUntilSignedIn(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, http.MethodGet, "/api/games/sites", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("sites: %d %s", rec.Code, rec.Body.String())
	}
	var sites gameSitesResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &sites); err != nil {
		t.Fatal(err)
	}
	if len(sites.Sites) != 2 || sites.Sites[0].SignedIn || sites.Sites[1].SignedIn {
		t.Fatalf("sites = %+v, want both signed out", sites.Sites)
	}
	// itch.io cannot take a password; F95zone can.
	if sites.Sites[0].Password || !sites.Sites[1].Password {
		t.Fatalf("password capability: %+v", sites.Sites)
	}
	if len(sites.Sorts["itch"]) == 0 || len(sites.Sorts["f95"]) == 0 {
		t.Fatalf("sorts missing: %+v", sites.Sorts)
	}

	rec = do(t, h, token, http.MethodGet, "/api/games/browse?site=itch", "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("browsing signed out: %d %s, want 401", rec.Code, rec.Body.String())
	}
	rec = do(t, h, token, http.MethodGet, "/api/games/browse?site=steam", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown site: %d, want 400", rec.Code)
	}
	// A guest cookie proves nothing and is refused before any network is touched.
	rec = do(t, h, token, http.MethodPost, "/api/games/sites/itch/login", `{"cookie":"itchio_token=abc"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("guest cookie: %d %s, want 400", rec.Code, rec.Body.String())
	}
}

func TestGameRemoteRoundTripAndAcknowledge(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := strconv.FormatInt(newTestGame(t, h, token), 10)

	if rec := do(t, h, token, http.MethodGet, "/api/media/"+id+"/remote", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("no remote yet: %d, want 404", rec.Code)
	}
	if rec := do(t, h, token, http.MethodPut, "/api/media/"+id+"/remote", `{"url":"https://example.com/game"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("a page off both sites: %d, want 400", rec.Code)
	}

	rec := do(t, h, token, http.MethodPut, "/api/media/"+id+"/remote",
		`{"url":"https://f95zone.to/threads/lussuria-academy.270043/","knownVersion":"0.7","latestVersion":"0.8"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("put remote: %d %s", rec.Code, rec.Body.String())
	}
	var remote models.GameRemote
	if err := json.Unmarshal(rec.Body.Bytes(), &remote); err != nil {
		t.Fatal(err)
	}
	if remote.Site != "f95" || remote.ID != "270043" || !remote.HasUpdate {
		t.Fatalf("remote = %+v; the thread id comes off the URL and 0.7 vs 0.8 is an update", remote)
	}

	// The single-item read carries it, so a detail screen needs one call.
	rec = do(t, h, token, http.MethodGet, "/api/media/"+id, "")
	var m models.Media
	if err := json.Unmarshal(rec.Body.Bytes(), &m); err != nil {
		t.Fatal(err)
	}
	if m.Remote == nil || m.Remote.URL != "https://f95zone.to/threads/lussuria-academy.270043/" {
		t.Fatalf("media.remote = %+v", m.Remote)
	}

	// And the updates list names it.
	rec = do(t, h, token, http.MethodGet, "/api/games/updates", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"id":`+id) {
		t.Fatalf("updates: %d %s", rec.Code, rec.Body.String())
	}

	rec = do(t, h, token, http.MethodPost, "/api/media/"+id+"/remote/acknowledge", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("acknowledge: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &remote); err != nil {
		t.Fatal(err)
	}
	if remote.KnownVersion != "0.8" || remote.HasUpdate {
		t.Fatalf("after acknowledging, known = %q hasUpdate = %v", remote.KnownVersion, remote.HasUpdate)
	}

	if rec := do(t, h, token, http.MethodDelete, "/api/media/"+id+"/remote", ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete remote: %d", rec.Code)
	}
	if rec := do(t, h, token, http.MethodGet, "/api/media/"+id+"/remote", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("after delete: %d, want 404", rec.Code)
	}
}

func TestLaunchyEntryBecomesAGameAndSyncsBothSides(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	meta := `{"launchyId":"L-1","title":"Desk Job","developer":"Some Dev","description":"A game about desks.","rating":4,"favorite":true,"tags":["Visual Novel"],"installed":true,"version":"0.3","playSeconds":600,"launchCount":2,"remote":{"site":"f95","id":"123","url":"https://f95zone.to/threads/123/","knownVersion":"0.3","latestVersion":"0.3"}}`
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/launchy/games", token, map[string]string{"meta": meta}, "", nil))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	var created launchyGame
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Title != "Desk Job" || created.Developer != "Some Dev" || created.Rating != 4 || !created.Favorite {
		t.Fatalf("created = %+v", created)
	}
	if created.Launchy == nil || created.Launchy.LaunchyID != "L-1" || !created.Launchy.Installed || created.Launchy.PlaySeconds != 600 {
		t.Fatalf("launchy link = %+v", created.Launchy)
	}
	if created.Remote == nil || created.Remote.ID != "123" || created.Remote.HasUpdate {
		t.Fatalf("remote = %+v", created.Remote)
	}
	if !created.HasThumb {
		t.Fatal("a game with no cover gets a placeholder so its tile is not blank")
	}

	// The same entry sent again is the same game, not a second one.
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/launchy/games", token, map[string]string{"meta": meta}, "", nil))
	var again launchyGame
	if err := json.Unmarshal(rec.Body.Bytes(), &again); err != nil || again.ID != created.ID {
		t.Fatalf("second create: %d %s (want id %d)", rec.Code, rec.Body.String(), created.ID)
	}

	// Two placeholders must not collide on the store's hash.
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/launchy/games", token,
		map[string]string{"meta": `{"launchyId":"L-2","title":"Other"}`}, "", nil))
	var other launchyGame
	if err := json.Unmarshal(rec.Body.Bytes(), &other); err != nil || other.ID == created.ID {
		t.Fatalf("second entry: %d %s", rec.Code, rec.Body.String())
	}

	id := strconv.FormatInt(created.ID, 10)
	// A sync from the launcher: more playtime, and the site moved on.
	rec = do(t, h, token, http.MethodPut, "/api/launchy/games/"+id,
		`{"launchyId":"L-1","installed":true,"version":"0.3","playSeconds":900,"launchCount":3,"remote":{"site":"f95","id":"123","url":"https://f95zone.to/threads/123/","knownVersion":"0.3","latestVersion":"0.4","changelog":"- new chapter"}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("sync: %d %s", rec.Code, rec.Body.String())
	}
	var synced launchyGame
	if err := json.Unmarshal(rec.Body.Bytes(), &synced); err != nil {
		t.Fatal(err)
	}
	if synced.Launchy.PlaySeconds != 900 || !synced.Remote.HasUpdate || synced.Remote.Changelog != "- new chapter" {
		t.Fatalf("synced = launchy %+v remote %+v", synced.Launchy, synced.Remote)
	}
	// The rating was not sent, so it stays.
	if synced.Rating != 4 {
		t.Fatalf("rating = %d, want the earlier 4 untouched", synced.Rating)
	}

	rec = do(t, h, token, http.MethodGet, "/api/launchy/games", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"launchyId":"L-1"`) {
		t.Fatalf("list: %d %s", rec.Code, rec.Body.String())
	}

	if rec := do(t, h, token, http.MethodDelete, "/api/launchy/games/"+id, ""); rec.Code != http.StatusNoContent {
		t.Fatalf("unpair: %d", rec.Code)
	}
	rec = do(t, h, token, http.MethodGet, "/api/media/"+id, "")
	var m models.Media
	_ = json.Unmarshal(rec.Body.Bytes(), &m)
	if m.Launchy != nil || m.Remote == nil {
		t.Fatalf("after unpairing: launchy=%+v remote=%+v (the remote is the library's, not the launcher's)", m.Launchy, m.Remote)
	}
}

func TestLaunchRequestsWaitForAConnectedLauncher(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/launchy/games", token,
		map[string]string{"meta": `{"launchyId":"L-9","title":"Runnable","installed":true}`}, "", nil))
	var game launchyGame
	if err := json.Unmarshal(rec.Body.Bytes(), &game); err != nil {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	body := `{"gameId":` + strconv.FormatInt(game.ID, 10) + `}`

	// Nobody has polled: the launcher is not connected, and the request is refused
	// rather than queued into a void.
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/launch", body); rec.Code != http.StatusConflict {
		t.Fatalf("launch with no launcher: %d %s, want 409", rec.Code, rec.Body.String())
	}

	// The launcher checks in (a zero-wait poll), reporting what it is running.
	rec = do(t, h, token, http.MethodGet, "/api/launchy/commands?wait=0&name=desk&running=42", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"commands":[]`) {
		t.Fatalf("empty poll: %d %s", rec.Code, rec.Body.String())
	}
	rec = do(t, h, token, http.MethodGet, "/api/launchy", "")
	var status launchyStatus
	if err := json.Unmarshal(rec.Body.Bytes(), &status); err != nil || !status.Connected || status.Name != "desk" || len(status.Running) != 1 {
		t.Fatalf("status: %d %s", rec.Code, rec.Body.String())
	}

	// Now a launch is accepted, and a waiting poll returns it at once.
	polled := make(chan *httptest.ResponseRecorder, 1)
	go func() { polled <- do(t, h, token, http.MethodGet, "/api/launchy/commands?wait=20", "") }()
	time.Sleep(50 * time.Millisecond)
	rec = do(t, h, token, http.MethodPost, "/api/launchy/launch", body)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("launch: %d %s", rec.Code, rec.Body.String())
	}
	var cmd launchCommand
	if err := json.Unmarshal(rec.Body.Bytes(), &cmd); err != nil {
		t.Fatal(err)
	}
	select {
	case got := <-polled:
		if !strings.Contains(got.Body.String(), cmd.ID) {
			t.Fatalf("the poll did not carry the request: %s", got.Body.String())
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the waiting poll was not woken by the request")
	}

	// The launcher reports back, and the requester can read the outcome.
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/commands/"+cmd.ID, `{"ok":false,"error":"exe missing"}`); rec.Code != http.StatusOK {
		t.Fatalf("done: %d %s", rec.Code, rec.Body.String())
	}
	rec = do(t, h, token, http.MethodGet, "/api/launchy/launch/"+cmd.ID, "")
	if !strings.Contains(rec.Body.String(), `"status":"failed"`) || !strings.Contains(rec.Body.String(), "exe missing") {
		t.Fatalf("outcome: %s", rec.Body.String())
	}
}
