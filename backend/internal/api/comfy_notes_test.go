package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image/jpeg"
	"net/http"
	"net/url"
	"slices"
	"testing"
)

type comfyNotesOut struct {
	Notes map[string]comfyNoteOut `json:"notes"`
}

func comfyNotes(t *testing.T, s *Server, token string) map[string]comfyNoteOut {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/comfy/notes", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("notes: %d %s", rec.Code, rec.Body)
	}
	var out comfyNotesOut
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return out.Notes
}

func TestAVideoLoraKeepsTheTriggerWordsAndCoverItIsGiven(t *testing.T) {
	s, token := newTestServer(t)
	const name = "wan/bounce_high.safetensors"
	rec := do(t, s.Handler(), token, http.MethodPut, "/api/imagegen/comfy/notes",
		`{"name":"`+name+`","triggers":[" bouncing ", "bouncing", "", "jiggle,"]}`)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("put words: %d %s", rec.Code, rec.Body)
	}
	cover := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngOf(t, 900, 600, 120))
	raw, _ := json.Marshal(map[string]string{"name": name, "imageData": cover})
	if rec := do(t, s.Handler(), token, http.MethodPut, "/api/imagegen/comfy/cover", string(raw)); rec.Code != http.StatusNoContent {
		t.Fatalf("put cover: %d %s", rec.Code, rec.Body)
	}

	n := comfyNotes(t, s, token)[name]
	if !slices.Equal(n.Triggers, []string{"bouncing", "jiggle"}) || !n.Cover {
		t.Fatalf("note: %+v", n)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/comfy/cover?name="+url.QueryEscape(name), "")
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "image/jpeg" {
		t.Fatalf("cover: %d %s", rec.Code, rec.Header().Get("Content-Type"))
	}
	img, err := jpeg.Decode(bytes.NewReader(rec.Body.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	if b := img.Bounds(); b.Dx() != comfyCoverSide || b.Dy() != 256 {
		t.Fatalf("cover is %v, want shrunk to %d on the long side", b, comfyCoverSide)
	}
	// What is kept is sealed, not the picture.
	enc, _ := s.db.ComfyCover(t.Context(), name)
	if bytes.Contains(enc, rec.Body.Bytes()[:64]) {
		t.Fatal("the cover is stored in the clear")
	}

	// Clearing both forgets the file altogether.
	do(t, s.Handler(), token, http.MethodPut, "/api/imagegen/comfy/cover", `{"name":"`+name+`","clear":true}`)
	do(t, s.Handler(), token, http.MethodPut, "/api/imagegen/comfy/notes", `{"name":"`+name+`","triggers":[]}`)
	if _, ok := comfyNotes(t, s, token)[name]; ok {
		t.Fatal("an empty note should be dropped")
	}
}

func TestAnInstallFromCivitaiFillsOnlyWhatWasNotSetByHand(t *testing.T) {
	s, token := newTestServer(t)
	if err := s.db.PutComfyTriggers(t.Context(), "mine.safetensors", []string{"my words"}); err != nil {
		t.Fatal(err)
	}
	// No cover fetch: the address is not Civitai's, so only the words are considered.
	s.noteComfyInstall("mine.safetensors", []string{"their words"}, "")
	s.noteComfyInstall("fresh.safetensors", []string{"twirl", "twirl"}, "https://example.com/x.jpeg")
	notes := comfyNotes(t, s, token)
	if got := notes["mine.safetensors"].Triggers; !slices.Equal(got, []string{"my words"}) {
		t.Fatalf("hand-set words replaced: %v", got)
	}
	if got := notes["fresh.safetensors"]; !slices.Equal(got.Triggers, []string{"twirl"}) || got.Cover {
		t.Fatalf("fresh install: %+v", got)
	}
}

func TestAClipsTileCanBeALorasCover(t *testing.T) {
	s, token, _, _ := clipStudio(t)
	clip := animate(t, s, token)
	if clip.Clip.Gallery == "" {
		t.Fatal("the clip was not kept in the gallery")
	}
	raw, _ := json.Marshal(map[string]string{"name": "x.safetensors", "galleryName": clip.Clip.Gallery})
	if rec := do(t, s.Handler(), token, http.MethodPut, "/api/imagegen/comfy/cover", string(raw)); rec.Code != http.StatusNoContent {
		t.Fatalf("cover from a gallery clip: %d %s", rec.Code, rec.Body)
	}
	if !comfyNotes(t, s, token)["x.safetensors"].Cover {
		t.Fatal("no cover kept")
	}
}
