package api

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/youruser/oppailib/internal/ai"
)

func launchyTestPNG(t *testing.T, shade uint8) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			img.Set(x, y, color.RGBA{R: shade, G: uint8(x * 30), B: uint8(y * 30), A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// The launcher's LoRA capture: its key finds (or makes) a training set by name
// and adds pictures to it, and the same picture twice is one picture. It reaches
// nothing else of the sets.
func TestLaunchyAddsLoRAPicturesToATrainingSetByName(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	key := pairLaunchy(t, h, token, "desk")

	rec := do(t, h, key, http.MethodPost, "/api/launchy/train-sets", `{"name":"Fixture Quest"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("set: %d %s", rec.Code, rec.Body.String())
	}
	var set trainSetOut
	_ = json.Unmarshal(rec.Body.Bytes(), &set)
	if set.ID == 0 || set.Name != "Fixture Quest" {
		t.Fatalf("set = %+v", set)
	}
	// Asked again in other capitals, it is the same set.
	rec = do(t, h, key, http.MethodPost, "/api/launchy/train-sets", `{"name":"fixture quest"}`)
	var again trainSetOut
	_ = json.Unmarshal(rec.Body.Bytes(), &again)
	if again.ID != set.ID {
		t.Fatalf("second ask made set %d, want %d", again.ID, set.ID)
	}

	upload := func(data []byte) (int, bool) {
		path := "/api/launchy/train-sets/" + strconv.FormatInt(set.ID, 10) + "/pictures"
		req := multipartRequest(t, http.MethodPost, path, key, map[string]string{"source": "Launchy · Fixture Quest"}, "frame.png", data)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		var out struct {
			ID      int64 `json:"id"`
			Existed bool  `json:"existed"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return rec.Code, out.Existed
	}
	if code, existed := upload(launchyTestPNG(t, 10)); code != http.StatusCreated || existed {
		t.Fatalf("first picture: %d existed=%v", code, existed)
	}
	if code, existed := upload(launchyTestPNG(t, 10)); code != http.StatusOK || !existed {
		t.Fatalf("same picture again: %d existed=%v, want 200 and existed", code, existed)
	}
	if code, _ := upload(launchyTestPNG(t, 200)); code != http.StatusCreated {
		t.Fatalf("second picture: %d", code)
	}

	// The set is there for the Train screen, with both pictures.
	rec = do(t, h, token, http.MethodGet, "/api/imagegen/train-sets", "")
	var listed struct {
		Sets []trainSetOut `json:"sets"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &listed)
	if len(listed.Sets) != 1 || listed.Sets[0].Count != 2 {
		t.Fatalf("sets = %+v", listed.Sets)
	}

	// The key cannot list, read, rename or delete sets through the Train screen's routes.
	id := strconv.FormatInt(set.ID, 10)
	for _, c := range []struct{ method, path, body string }{
		{http.MethodGet, "/api/imagegen/train-sets", ""},
		{http.MethodPost, "/api/imagegen/train-sets", `{"name":"x"}`},
		{http.MethodPatch, "/api/imagegen/train-sets/" + id, `{"name":"x"}`},
		{http.MethodDelete, "/api/imagegen/train-sets/" + id, ""},
	} {
		if rec := do(t, h, key, c.method, c.path, c.body); rec.Code != http.StatusForbidden {
			t.Fatalf("%s %s with the key: %d, want 403", c.method, c.path, rec.Code)
		}
	}
}

// fakeFrameTagger answers by the picture's first pixel: red means someone is in it.
type fakeFrameTagger struct {
	enabled bool
	name    string
	calls   int
}

func (f *fakeFrameTagger) Enabled() bool      { return f.enabled }
func (f *fakeFrameTagger) TaggerName() string { return f.name }
func (f *fakeFrameTagger) TagImage(_ context.Context, img image.Image) ([]ai.Suggestion, error) {
	f.calls++
	r, _, _, _ := img.At(0, 0).RGBA()
	if r>>8 >= 128 {
		return []ai.Suggestion{{Name: "1girl", Category: "general", Score: 0.98}, {Name: "red hair", Category: "general", Score: 0.9}}, nil
	}
	return []ai.Suggestion{{Name: "no humans", Category: "general", Score: 0.95}, {Name: "scenery", Category: "general", Score: 0.9}}, nil
}

// Asked for characters or backgrounds, the tagger decides which frames are kept;
// a kept one keeps its tags, and with no tagger that knows people every frame is kept.
func TestLaunchyKeepsOnlyTheFramesItWasAskedFor(t *testing.T) {
	s, token := newTestServer(t)
	tagger := &fakeFrameTagger{enabled: true, name: "joytag"}
	s.loraFrameTagger = tagger
	h := s.Handler()
	key := pairLaunchy(t, h, token, "desk")

	rec := do(t, h, key, http.MethodPost, "/api/launchy/train-sets", `{"name":"Fixture Quest · characters"}`)
	var set trainSetOut
	_ = json.Unmarshal(rec.Body.Bytes(), &set)
	path := "/api/launchy/train-sets/" + strconv.FormatInt(set.ID, 10) + "/pictures"

	type reply struct {
		ID      int64  `json:"id"`
		Existed bool   `json:"existed"`
		Checked bool   `json:"checked"`
		Skipped string `json:"skipped"`
	}
	upload := func(want string, data []byte) (int, reply) {
		fields := map[string]string{"source": "Launchy · Fixture Quest"}
		if want != "" {
			fields["want"] = want
		}
		req := multipartRequest(t, http.MethodPost, path, key, fields, "frame.png", data)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		var out reply
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return rec.Code, out
	}
	person, place := launchyTestPNG(t, 220), launchyTestPNG(t, 20)

	if code, out := upload("characters", place); code != http.StatusOK || out.Skipped == "" || !out.Checked || out.ID != 0 {
		t.Fatalf("a place asked for characters: %d %+v, want it turned away", code, out)
	}
	if code, out := upload("characters", person); code != http.StatusCreated || !out.Checked || out.Skipped != "" {
		t.Fatalf("a person asked for characters: %d %+v", code, out)
	}
	if code, out := upload("backgrounds", person); code != http.StatusOK || out.Skipped == "" {
		t.Fatalf("a person asked for backgrounds: %d %+v, want it turned away", code, out)
	}
	if code, out := upload("backgrounds", place); code != http.StatusCreated || out.Skipped != "" {
		t.Fatalf("a place asked for backgrounds: %d %+v", code, out)
	}
	if code, _ := upload("people", place); code != http.StatusBadRequest {
		t.Fatalf("an unknown want: %d, want 400", code)
	}
	// Nothing asked for: nothing is checked, and the tagger is not asked.
	calls := tagger.calls
	if code, out := upload("", launchyTestPNG(t, 90)); code != http.StatusCreated || out.Checked || tagger.calls != calls {
		t.Fatalf("no want: %d %+v, tagger asked %d times", code, out, tagger.calls-calls)
	}

	// The kept person carries the tagger's tags.
	pics, err := s.db.TrainPictures(context.Background(), set.ID)
	if err != nil {
		t.Fatal(err)
	}
	tagged := 0
	for _, p := range pics {
		for _, tg := range p.Tags {
			if tg.Name == "1girl" && tg.Source == "ai" {
				tagged++
			}
		}
	}
	if len(pics) != 3 || tagged != 1 {
		t.Fatalf("set holds %d pictures, %d tagged 1girl; want 3 and 1", len(pics), tagged)
	}

	// The tagger off, or only the heuristic one: kept, unchecked.
	for _, tg := range []*fakeFrameTagger{{enabled: false, name: "joytag"}, {enabled: true, name: "heuristic"}} {
		s.loraFrameTagger = tg
		if code, out := upload("characters", launchyTestPNG(t, uint8(30+tg.calls+len(tg.name)))); code != http.StatusCreated || out.Checked || tg.calls != 0 {
			t.Fatalf("tagger %+v: %d %+v", tg, code, out)
		}
	}
}
