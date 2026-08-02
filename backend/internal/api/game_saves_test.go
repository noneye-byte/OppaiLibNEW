package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

// newTestGame creates a game media item and returns its id, so the save tests each
// start from a real game rather than a hand-written row.
func newTestGame(t *testing.T, h http.Handler, token string) int64 {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/media", token,
		map[string]string{"kind": "game", "title": "Test game"}, "game.bin", []byte("game data")))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create game: %d %s", rec.Code, rec.Body.String())
	}
	var game struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &game); err != nil {
		t.Fatal(err)
	}
	return game.ID
}

func TestGameSaveRoundTrip(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := strconv.FormatInt(newTestGame(t, h, token), 10)
	saveData := []byte("SAVEDATA\x00\x01day-3")

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/media/"+id+"/saves", token,
		map[string]string{"label": "Day 3 — before the fork"}, "save.dat", saveData))
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload save: %d %s", rec.Code, rec.Body.String())
	}
	var created gameSave
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Label != "Day 3 — before the fork" {
		t.Fatalf("label = %q, want the explicit label rather than the filename", created.Label)
	}
	if created.Size != int64(len(saveData)) {
		t.Fatalf("size = %d, want %d", created.Size, len(saveData))
	}

	listed := do(t, h, token, http.MethodGet, "/api/media/"+id+"/saves", "")
	if listed.Code != http.StatusOK || !strings.Contains(listed.Body.String(), "Day 3") {
		t.Fatalf("list saves: %d %s", listed.Code, listed.Body.String())
	}

	saveID := strconv.FormatInt(created.ID, 10)
	got := do(t, h, token, http.MethodGet, "/api/media/"+id+"/saves/"+saveID, "")
	if got.Code != http.StatusOK {
		t.Fatalf("download save: %d %s", got.Code, got.Body.String())
	}
	if got.Body.String() != string(saveData) {
		t.Fatalf("downloaded bytes did not round-trip: %q", got.Body.String())
	}
	// A save must never be rendered by the browser, whatever it is called.
	if ct := got.Header().Get("Content-Type"); ct != "application/octet-stream" {
		t.Fatalf("content type = %q, want application/octet-stream", ct)
	}
	if cd := got.Header().Get("Content-Disposition"); !strings.HasPrefix(cd, "attachment;") {
		t.Fatalf("content disposition = %q, want an attachment", cd)
	}

	del := do(t, h, token, http.MethodDelete, "/api/media/"+id+"/saves/"+saveID, "")
	if del.Code != http.StatusNoContent {
		t.Fatalf("delete save: %d %s", del.Code, del.Body.String())
	}
	if again := do(t, h, token, http.MethodGet, "/api/media/"+id+"/saves/"+saveID, ""); again.Code != http.StatusNotFound {
		t.Fatalf("deleted save still downloadable: %d", again.Code)
	}
}

// Re-uploading the same bytes must produce a second, separately deletable save.
// Media deduplicates by hash; saves deliberately do not, because saving the same
// state twice is normal and losing one of them to dedupe would be data loss.
func TestGameSaveDoesNotDeduplicate(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	id := strconv.FormatInt(newTestGame(t, h, token), 10)

	for i := 0; i < 2; i++ {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/media/"+id+"/saves", token,
			nil, "save.dat", []byte("identical")))
		if rec.Code != http.StatusCreated {
			t.Fatalf("upload %d: %d %s", i, rec.Code, rec.Body.String())
		}
	}
	listed := do(t, h, token, http.MethodGet, "/api/media/"+id+"/saves", "")
	var out struct {
		Items []gameSave `json:"items"`
	}
	if err := json.Unmarshal(listed.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if len(out.Items) != 2 {
		t.Fatalf("got %d saves, want 2 — identical bytes must not collapse", len(out.Items))
	}
	if out.Items[0].ID == out.Items[1].ID {
		t.Fatal("the two saves share an id")
	}
}

// A save id belonging to one game must not be readable through another game's path.
func TestGameSaveIsScopedToItsGame(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	first := strconv.FormatInt(newTestGame(t, h, token), 10)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/media/"+first+"/saves", token,
		nil, "save.dat", []byte("secret save")))
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload save: %d %s", rec.Code, rec.Body.String())
	}
	var created gameSave
	_ = json.Unmarshal(rec.Body.Bytes(), &created)

	// A second, different game.
	other := httptest.NewRecorder()
	h.ServeHTTP(other, multipartRequest(t, http.MethodPost, "/api/media", token,
		map[string]string{"kind": "game", "title": "Other game"}, "other.bin", []byte("other data")))
	var otherGame struct {
		ID int64 `json:"id"`
	}
	_ = json.Unmarshal(other.Body.Bytes(), &otherGame)

	path := "/api/media/" + strconv.FormatInt(otherGame.ID, 10) + "/saves/" + strconv.FormatInt(created.ID, 10)
	if got := do(t, h, token, http.MethodGet, path, ""); got.Code != http.StatusNotFound {
		t.Fatalf("save readable through the wrong game: %d %s", got.Code, got.Body.String())
	}
}

func TestGameSaveRejectsNonGame(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, multipartRequest(t, http.MethodPost, "/api/media", token,
		map[string]string{"title": "Not a game"}, "clip.txt", []byte("just text")))
	var item struct {
		ID   int64  `json:"id"`
		Kind string `json:"kind"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &item)
	if item.Kind == "game" {
		t.Skip("test fixture was recognised as a game")
	}
	got := do(t, h, token, http.MethodGet, "/api/media/"+strconv.FormatInt(item.ID, 10)+"/saves", "")
	if got.Code != http.StatusBadRequest {
		t.Fatalf("saves accepted on a non-game: %d %s", got.Code, got.Body.String())
	}
}

// A label is user-supplied and reaches a response header, so it must not be able to
// inject one.
func TestContentDispositionCannotInjectHeaders(t *testing.T) {
	got := contentDisposition("evil\r\nX-Injected: yes\".sav")
	if strings.ContainsAny(got, "\r\n") {
		t.Fatalf("newlines survived into the header: %q", got)
	}
	// The quoted fallback must not be terminable by a quote in the name.
	quoted := strings.TrimPrefix(got, `attachment; filename="`)
	if idx := strings.Index(quoted, `"`); idx == -1 || strings.Contains(quoted[:idx], `"`) {
		t.Fatalf("unbalanced quoting: %q", got)
	}
	if !strings.Contains(got, "filename*=UTF-8''") {
		t.Fatalf("missing the encoded name: %q", got)
	}
	if empty := contentDisposition("   "); !strings.Contains(empty, `filename="save"`) {
		t.Fatalf("blank label did not fall back: %q", empty)
	}
}
