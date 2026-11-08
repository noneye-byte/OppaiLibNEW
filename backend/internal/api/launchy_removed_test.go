package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

// The sync used to undo both ways of ending a pairing on purpose. A game deleted here
// left Launchy holding an entry it could no longer find, which it sent back as new; a
// game removed from Launchy was unpaired, and the next sync adopted it back onto the PC.

func createLaunchyGame(t *testing.T, h http.Handler, token, meta string) launchyGame {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/launchy/games", token, map[string]string{"meta": meta}, "", nil))
	if rec.Code != http.StatusCreated && rec.Code != http.StatusOK {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	var g launchyGame
	if err := json.Unmarshal(rec.Body.Bytes(), &g); err != nil {
		t.Fatal(err)
	}
	return g
}

type launchyList struct {
	Items   []launchyGame `json:"items"`
	Removed []string      `json:"removed"`
}

func listLaunchyGames(t *testing.T, h http.Handler, token string) launchyList {
	t.Helper()
	rec := do(t, h, token, http.MethodGet, "/api/launchy/games", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("list: %d %s", rec.Code, rec.Body.String())
	}
	var l launchyList
	if err := json.Unmarshal(rec.Body.Bytes(), &l); err != nil {
		t.Fatal(err)
	}
	return l
}

func TestAGameDeletedFromTheLibraryIsNotSentBackByTheNextSync(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	g := createLaunchyGame(t, h, token, `{"launchyId":"L-del","title":"Gone Soon"}`)

	if rec := do(t, h, token, http.MethodDelete, "/api/media/"+strconv.FormatInt(g.ID, 10), ""); rec.Code != http.StatusNoContent && rec.Code != http.StatusOK {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body.String())
	}
	list := listLaunchyGames(t, h, token)
	if len(list.Items) != 0 || len(list.Removed) != 1 || list.Removed[0] != "L-del" {
		t.Fatalf("after deleting: %+v, want no items and L-del named as removed", list)
	}

	// What the old launcher does next: the entry is unknown to it now, so it is sent as new.
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/launchy/games", token,
		map[string]string{"meta": `{"launchyId":"L-del","title":"Gone Soon"}`}, "", nil))
	if rec.Code != http.StatusGone {
		t.Fatalf("sending it again: %d %s, want 410", rec.Code, rec.Body.String())
	}
	if games, _ := s.db.ListGames(t.Context()); len(games) != 0 {
		t.Fatalf("library has %d games, want the deleted one to stay deleted", len(games))
	}

	// A different entry is a game added on purpose, and is welcome.
	createLaunchyGame(t, h, token, `{"launchyId":"L-new","title":"Brand New"}`)

	// Letting them back: the same entry may be sent again.
	rec = do(t, h, token, http.MethodDelete, "/api/launchy/removed", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"removed":1`) {
		t.Fatalf("forget: %d %s", rec.Code, rec.Body.String())
	}
	createLaunchyGame(t, h, token, `{"launchyId":"L-del","title":"Gone Soon"}`)
	if l := listLaunchyGames(t, h, token); len(l.Items) != 2 || len(l.Removed) != 0 {
		t.Fatalf("after letting it back: %+v", l)
	}
}

func TestAGameTakenOffThePCIsNotAdoptedBackByTheNextSync(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	g := createLaunchyGame(t, h, token,
		`{"launchyId":"L-pc","title":"Off The PC","remote":{"site":"f95","id":"77","url":"https://f95zone.to/threads/77/"}}`)
	id := strconv.FormatInt(g.ID, 10)

	if rec := do(t, h, token, http.MethodDelete, "/api/launchy/games/"+id, ""); rec.Code != http.StatusNoContent {
		t.Fatalf("unpair: %d", rec.Code)
	}
	// Still in the library, but no longer offered to a launcher to adopt.
	if rec := do(t, h, token, http.MethodGet, "/api/media/"+id, ""); rec.Code != http.StatusOK {
		t.Fatalf("the game itself should stay: %d", rec.Code)
	}
	if l := listLaunchyGames(t, h, token); len(l.Items) != 0 {
		t.Fatalf("after taking it off the PC: %d items, want none to adopt", len(l.Items))
	}
	rec := do(t, h, token, http.MethodGet, "/api/launchy/removed", "")
	if !strings.Contains(rec.Body.String(), `"declined":1`) {
		t.Fatalf("removals: %s", rec.Body.String())
	}

	// Adding the same game to Launchy again pairs with the copy here, not a second one.
	again := createLaunchyGame(t, h, token,
		`{"launchyId":"L-pc-2","title":"Off The PC","remote":{"site":"f95","id":"77","url":"https://F95zone.to/threads/77"}}`)
	if again.ID != g.ID {
		t.Fatalf("re-added as %d, want it paired with %d", again.ID, g.ID)
	}
	if l := listLaunchyGames(t, h, token); len(l.Items) != 1 {
		t.Fatalf("after pairing again: %d items, want it back in the list", len(l.Items))
	}
}
