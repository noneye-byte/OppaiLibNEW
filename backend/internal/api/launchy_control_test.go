package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

// pairLaunchy runs the whole link: a signed-in user asks for a code, and the
// launcher trades it for a key.
func pairLaunchy(t *testing.T, h http.Handler, token, name string) string {
	t.Helper()
	rec := do(t, h, token, http.MethodPost, "/api/launchy/pairing", "")
	if rec.Code != http.StatusCreated {
		t.Fatalf("pairing: %d %s", rec.Code, rec.Body.String())
	}
	var pairing struct {
		Code string `json:"code"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &pairing)
	rec = do(t, h, "", http.MethodPost, "/api/launchy/pair", `{"code":"`+pairing.Code+`","name":"`+name+`"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("pair: %d %s", rec.Code, rec.Body.String())
	}
	var paired struct {
		Key  string `json:"key"`
		User string `json:"user"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &paired)
	if !strings.HasPrefix(paired.Key, apiKeyPrefix) || paired.User == "" {
		t.Fatalf("paired = %+v", paired)
	}
	return paired.Key
}

func TestALinkCodeBuysOneKeyThatOnlyOpensLaunchysDoor(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/launchy/pairing", "")
	var pairing struct {
		Code string `json:"code"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &pairing)
	rec = do(t, h, "", http.MethodPost, "/api/launchy/pair", `{"code":"`+pairing.Code+`","name":"desk"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("pair: %d %s", rec.Code, rec.Body.String())
	}
	var paired struct {
		Key string `json:"key"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &paired)
	key := paired.Key

	// The code was spent: a second launcher holding the same link gets nothing.
	if rec := do(t, h, "", http.MethodPost, "/api/launchy/pair", `{"code":"`+pairing.Code+`","name":"other"}`); rec.Code != http.StatusForbidden {
		t.Fatalf("second redemption: %d, want 403", rec.Code)
	}
	// A made-up code is refused the same way, and never as a 401.
	if rec := do(t, h, "", http.MethodPost, "/api/launchy/pair", `{"code":"nope"}`); rec.Code != http.StatusForbidden {
		t.Fatalf("bad code: %d, want 403", rec.Code)
	}

	// The key opens what the launcher uses…
	for _, path := range []string{"/api/launchy", "/api/launchy/games", "/api/launchy/commands?wait=0&name=desk"} {
		if rec := do(t, h, key, http.MethodGet, path, ""); rec.Code != http.StatusOK {
			t.Fatalf("GET %s with the key: %d %s", path, rec.Code, rec.Body.String())
		}
	}
	// …and nothing else, including more keys.
	for _, path := range []string{"/api/media", "/api/settings", "/api/chat/workspace", "/api/launchy/keys"} {
		if rec := do(t, h, key, http.MethodGet, path, ""); rec.Code != http.StatusForbidden {
			t.Fatalf("GET %s with the key: %d, want 403", path, rec.Code)
		}
	}
	if rec := do(t, h, key, http.MethodPost, "/api/launchy/pairing", ""); rec.Code != http.StatusForbidden {
		t.Fatalf("a key minting a link: %d, want 403", rec.Code)
	}

	// A restart signs browsers out; it must not unpair the launcher. That was the bug
	// a key exists to fix.
	if _, err := s.db.PurgeBrowserSessions(context.Background()); err != nil {
		t.Fatal(err)
	}
	if rec := do(t, h, key, http.MethodGet, "/api/launchy", ""); rec.Code != http.StatusOK {
		t.Fatalf("after a restart: %d, want the key still good", rec.Code)
	}
}

func TestRevokingOrUnlinkingAKeyEndsIt(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	key := pairLaunchy(t, h, token, "desk")
	// Linking the same PC again replaces its key rather than adding a second.
	newer := pairLaunchy(t, h, token, "desk")
	if rec := do(t, h, key, http.MethodGet, "/api/launchy", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("the replaced key: %d, want 401", rec.Code)
	}

	rec := do(t, h, token, http.MethodGet, "/api/launchy/keys", "")
	var list struct {
		Items []apiKeyView `json:"items"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if len(list.Items) != 1 || list.Items[0].Name != "desk" || list.Items[0].Hint != newer[len(newer)-4:] {
		t.Fatalf("keys = %+v", list.Items)
	}

	if rec := do(t, h, token, http.MethodDelete, "/api/launchy/keys/"+strconv.FormatInt(list.Items[0].ID, 10), ""); rec.Code != http.StatusNoContent {
		t.Fatalf("revoke: %d", rec.Code)
	}
	if rec := do(t, h, newer, http.MethodGet, "/api/launchy", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("revoked key: %d, want 401", rec.Code)
	}

	// The launcher unlinking itself takes its own key with it.
	third := pairLaunchy(t, h, token, "laptop")
	if rec := do(t, h, third, http.MethodDelete, "/api/launchy/key", ""); rec.Code != http.StatusNoContent {
		t.Fatalf("unlink: %d", rec.Code)
	}
	if rec := do(t, h, third, http.MethodGet, "/api/launchy", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("after unlinking: %d, want 401", rec.Code)
	}
	// A person's session has no key to unlink.
	if rec := do(t, h, token, http.MethodDelete, "/api/launchy/key", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("unlink with a session: %d, want 400", rec.Code)
	}
}

// fakeLaunchy answers the long poll the way the launcher does: every fetch gets
// the page the test hands it, and every other request is reported done.
func fakeLaunchy(t *testing.T, h http.Handler, key string, page func(url string) (int, string, bool)) (stop func(), seen chan string) {
	t.Helper()
	seen = make(chan string, 32)
	done := make(chan struct{})
	go func() {
		for {
			select {
			case <-done:
				return
			default:
			}
			rec := do(t, h, key, http.MethodGet, "/api/launchy/commands?wait=1&name=desk", "")
			var got struct {
				Commands []launchCommand `json:"commands"`
			}
			_ = json.Unmarshal(rec.Body.Bytes(), &got)
			for _, cmd := range got.Commands {
				seen <- cmd.Action + " " + cmd.URL
				out := map[string]any{"ok": true}
				if cmd.Action == "fetch" {
					status, body, challenged := page(cmd.URL)
					out = map[string]any{"ok": !challenged, "status": status, "url": cmd.URL, "body": body, "challenged": challenged}
				}
				b, _ := json.Marshal(out)
				do(t, h, key, http.MethodPost, "/api/launchy/commands/"+cmd.ID, string(b))
			}
		}
	}()
	return func() { close(done) }, seen
}

func TestF95zoneIsReadThroughLaunchysBrowser(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	key := pairLaunchy(t, h, token, "desk")

	// A launcher that can fetch, signed in to F95zone as Owen.
	report := `{"version":"0.5.0","capabilities":["fetch","stop","sync","saves","download"],
		"accounts":[{"site":"f95","signedIn":true,"user":"Owen"},{"site":"itch","signedIn":false}],
		"sessions":[],"downloads":[],"sync":{"running":false}}`
	if rec := do(t, h, key, http.MethodPut, "/api/launchy/state", report); rec.Code != http.StatusOK {
		t.Fatalf("report: %d %s", rec.Code, rec.Body.String())
	}

	rec := do(t, h, token, http.MethodGet, "/api/games/sites", "")
	var sites gameSitesResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &sites)
	f95 := sites.Sites[1]
	if !f95.SignedIn || f95.User != "Owen" || f95.Via != "launchy" || f95.Note != "" {
		t.Fatalf("F95zone through Launchy = %+v", f95)
	}

	listing := `{"status":"ok","msg":{"data":[{"thread_id":270043,"title":"Lussuria Academy","creator":"Dev","version":"v0.7","rating":4.5,"cover":"https://attachments.f95zone.to/c.png","screens":[]}],"pagination":{"page":1,"total":3}}}`
	stop, seen := fakeLaunchy(t, h, key, func(u string) (int, string, bool) { return 200, listing, false })
	defer stop()

	rec = do(t, h, token, http.MethodGet, "/api/games/browse?site=f95", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "Lussuria Academy") {
		t.Fatalf("browse through Launchy: %d %s", rec.Code, rec.Body.String())
	}
	if got := <-seen; !strings.HasPrefix(got, "fetch https://f95zone.to/sam/latest_alpha/latest_data.php") {
		t.Fatalf("the launcher was asked for %q", got)
	}
	// The server's own reads are not anyone's pending requests.
	rec = do(t, h, token, http.MethodGet, "/api/launchy", "")
	var st launchyStatus
	_ = json.Unmarshal(rec.Body.Bytes(), &st)
	if st.Pending != 0 || st.Version != "0.5.0" || len(st.Accounts) != 2 {
		t.Fatalf("status = %+v", st)
	}
}

func TestAHumanCheckOnThePCSaysWhereToGoAndNeverSignsAnyoneOut(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	key := pairLaunchy(t, h, token, "desk")
	do(t, h, key, http.MethodPut, "/api/launchy/state",
		`{"capabilities":["fetch"],"accounts":[{"site":"f95","signedIn":true,"user":"Owen"}]}`)

	stop, _ := fakeLaunchy(t, h, key, func(u string) (int, string, bool) { return 403, "", true })
	defer stop()

	rec := do(t, h, token, http.MethodGet, "/api/games/browse?site=f95", "")
	if rec.Code == http.StatusUnauthorized || rec.Code < 400 {
		t.Fatalf("challenged browse: %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Verify") {
		t.Fatalf("the error should say where to press Verify: %s", rec.Body.String())
	}

	// Once the launcher reports the check, the account says so before anyone tries.
	do(t, h, key, http.MethodPut, "/api/launchy/state",
		`{"capabilities":["fetch"],"accounts":[{"site":"f95","signedIn":true,"user":"Owen","challenged":true}]}`)
	rec = do(t, h, token, http.MethodGet, "/api/games/sites", "")
	var sites gameSitesResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &sites)
	if !strings.Contains(sites.Sites[1].Note, "Verify") {
		t.Fatalf("note = %q", sites.Sites[1].Note)
	}
}

func TestRequestsAreCheckedAgainstWhatThePCCanDoNow(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	key := pairLaunchy(t, h, token, "desk")

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/launchy/games", key,
		map[string]string{"meta": `{"launchyId":"L-7","title":"Runnable","installed":true}`}, "", nil))
	var game launchyGame
	if err := json.Unmarshal(rec.Body.Bytes(), &game); err != nil {
		t.Fatalf("create with the key: %d %s", rec.Code, rec.Body.String())
	}
	id := strconv.FormatInt(game.ID, 10)

	// Offline: everything is refused, as a 409.
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", `{"action":"sync"}`); rec.Code != http.StatusConflict {
		t.Fatalf("sync offline: %d", rec.Code)
	}

	// An old launcher: it polls but never reports, so it can launch and nothing else.
	do(t, h, key, http.MethodGet, "/api/launchy/commands?wait=0&name=desk", "")
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", `{"action":"sync"}`); rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "update") {
		t.Fatalf("sync on an old launcher: %d %s", rec.Code, rec.Body.String())
	}
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", `{"action":"launch","gameId":`+id+`}`); rec.Code != http.StatusAccepted {
		t.Fatalf("launch on an old launcher: %d %s", rec.Code, rec.Body.String())
	}

	// A current one.
	do(t, h, key, http.MethodPut, "/api/launchy/state", `{"capabilities":["stop","sync","saves","download"],
		"sessions":[{"gameId":`+id+`,"title":"Runnable","startedAt":1}]}`)
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", `{"action":"warp"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("unknown action: %d", rec.Code)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", `{"action":"stop","gameId":`+id+`}`); rec.Code != http.StatusAccepted {
		t.Fatalf("stop a running game: %d %s", rec.Code, rec.Body.String())
	}
	// Restoring saves under a running game is refused; so is a save that is not this game's.
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", `{"action":"restore-save","gameId":`+id+`,"saveId":99}`); rec.Code != http.StatusNotFound {
		t.Fatalf("restore a save that does not exist: %d", rec.Code)
	}
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/media/"+id+"/saves", key,
		map[string]string{"label": "before the fork"}, "save.zip", []byte("PK\x03\x04save")))
	var save struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &save); err != nil || save.ID == 0 {
		t.Fatalf("save upload with the key: %d %s", rec.Code, rec.Body.String())
	}
	restore := `{"action":"restore-save","gameId":` + id + `,"saveId":` + strconv.FormatInt(save.ID, 10) + `}`
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", restore); rec.Code != http.StatusConflict {
		t.Fatalf("restore under a running game: %d, want 409", rec.Code)
	}
	do(t, h, key, http.MethodPut, "/api/launchy/state", `{"capabilities":["stop","sync","saves","download"],"sessions":[]}`)
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", restore); rec.Code != http.StatusAccepted {
		t.Fatalf("restore once it has closed: %d %s", rec.Code, rec.Body.String())
	}
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", `{"action":"stop","gameId":`+id+`}`); rec.Code != http.StatusConflict {
		t.Fatalf("stop a game that is not running: %d", rec.Code)
	}

	// A download needs a web address, and carries the game's title for the PC to show.
	if rec := do(t, h, token, http.MethodPost, "/api/launchy/requests", `{"action":"download","gameId":`+id+`,"source":{"url":"file:///c:/x"}}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("download from a file URL: %d", rec.Code)
	}
	rec = do(t, h, token, http.MethodPost, "/api/launchy/requests",
		`{"action":"download","gameId":`+id+`,"source":{"id":"s1","label":"MEGA · Win","host":"mega.nz","url":"https://mega.nz/file/x","kind":"external"}}`)
	var cmd launchCommand
	if err := json.Unmarshal(rec.Body.Bytes(), &cmd); err != nil || rec.Code != http.StatusAccepted || cmd.Title != "Runnable" || cmd.Source == nil {
		t.Fatalf("download: %d %s", rec.Code, rec.Body.String())
	}

	// The launcher reports back with a message, and the asker reads it.
	poll := do(t, h, key, http.MethodGet, "/api/launchy/commands?wait=0", "")
	if !strings.Contains(poll.Body.String(), cmd.ID) {
		t.Fatalf("the poll did not carry the download: %s", poll.Body.String())
	}
	do(t, h, key, http.MethodPost, "/api/launchy/commands/"+cmd.ID, `{"ok":true,"message":"Opened in Firefox"}`)
	rec = do(t, h, token, http.MethodGet, "/api/launchy/requests/"+cmd.ID, "")
	if !strings.Contains(rec.Body.String(), `"status":"done"`) || !strings.Contains(rec.Body.String(), "Opened in Firefox") {
		t.Fatalf("outcome: %s", rec.Body.String())
	}
}

// A launcher that goes quiet mid-read must not hold a browse open forever.
func TestARelayedReadGivesUpWhenTheLauncherNeverAnswers(t *testing.T) {
	rt := newLaunchyRuntime()
	rt.checkIn("desk", nil)
	rt.setReport(launchyReport{Capabilities: []string{"fetch"}})
	b := launchyBrowser{l: rt}
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	if _, _, _, err := b.Fetch(ctx, "https://f95zone.to/threads/1/", ""); err == nil {
		t.Fatal("wanted an error from a read nobody answered")
	}
	if len(rt.commands) != 0 || len(rt.queue) != 0 {
		t.Fatalf("an abandoned read was left behind: %d commands, %d queued", len(rt.commands), len(rt.queue))
	}
	if _, _, _, err := b.Fetch(context.Background(), "https://example.com/", ""); err == nil {
		t.Fatal("only F95zone pages go through the launcher")
	}
}
