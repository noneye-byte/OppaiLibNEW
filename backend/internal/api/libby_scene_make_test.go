package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/settings"
)

// A place she moves to that she does not have is one to make — when something can make
// it. One she has is gone to, not made again, even when she calls it new.
func TestAPlaceSheDoesNotHaveIsMadeAndOneSheHasIsGoneTo(t *testing.T) {
	list := []libbyBackgroundView{
		{libbyBackground: libbyBackground{ID: "bed", Name: "Bedroom", Tags: []string{"bed", "night"}}, HasImage: true},
	}
	if got := sceneToMakeFor("beach at sunset, waves", list, true); got == nil || got.Name != "Beach at sunset" || got.Prompt != "beach at sunset, waves" {
		t.Errorf("an unknown place was not made: %+v", got)
	}
	if got := sceneToMakeFor("new: rooftop at night", list, true); got == nil || got.Prompt != "rooftop at night" {
		t.Errorf("a place asked for as new was not made: %+v", got)
	}
	for _, label := range []string{"Bedroom", "my bed", "new: bedroom", "none"} {
		if got := sceneToMakeFor(label, list, true); got != nil {
			t.Errorf("%q made a place instead of going to one: %+v", label, got)
		}
	}
	if got := sceneToMakeFor("beach", list, false); got != nil {
		t.Errorf("a place was made with nothing to make it: %+v", got)
	}
	if place, fresh := sceneLabelPlace("new: rooftop"); place != "rooftop" || !fresh {
		t.Errorf("mark = %q %v", place, fresh)
	}
	// "newsroom" is a place, not the mark.
	if place, fresh := sceneLabelPlace("newsroom"); place != "newsroom" || fresh {
		t.Errorf("newsroom read as marked: %q %v", place, fresh)
	}
}

// With a generator she is told she can make somewhere, even before the user has set up
// a single room; without one, an empty list still teaches nothing.
func TestSheIsToldSheCanMakeAPlaceOnlyWhenOneCanBeMade(t *testing.T) {
	if got := backgroundDirective(nil, "", true); !strings.Contains(got, "[scene: new:") {
		t.Errorf("with a generator and no rooms: %q", got)
	}
	if got := backgroundDirective(nil, "", false); got != "" {
		t.Errorf("with neither: %q", got)
	}
}

// The room she makes is generated without her in it — none of her LoRAs, people kept
// out — landscape, and filed as a background of hers that the next move finds.
func TestThePlaceSheMakesIsFiledAsABackground(t *testing.T) {
	var sent map[string]any
	gen := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/sdapi/v1/txt2img" {
			raw, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(raw, &sent)
			_, _ = w.Write([]byte(`{"images":["` + onePixelPNG + `"],"info":"{\"seed\":1}"}`))
			return
		}
		http.NotFound(w, r)
	}))
	t.Cleanup(gen.Close)
	s, token := newTestServer(t)
	enableImageGen(t, s, gen.URL)
	cur := s.settings.Get()
	cur.LibbyGenLoras = []settings.LoraChoice{{Name: "libby_likeness", Weight: 1}}
	s.settings.Set(cur)

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/act", `{"kind":"background","prompt":"rooftop at night, city lights"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("act: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Background libbyBackgroundView `json:"background"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil || out.Background.ID == "" || !out.Background.HasImage {
		t.Fatalf("no background came back: %s", rec.Body)
	}
	if out.Background.Name != "Rooftop at night" {
		t.Errorf("name = %q", out.Background.Name)
	}
	prompt, _ := sent["prompt"].(string)
	if !strings.HasPrefix(prompt, "rooftop at night, city lights") || strings.Contains(prompt, "libby_likeness") {
		t.Errorf("prompt = %q", prompt)
	}
	if neg, _ := sent["negative_prompt"].(string); !strings.Contains(neg, "1girl") {
		t.Errorf("negative = %q", neg)
	}
	if w, _ := sent["width"].(float64); w <= sent["height"].(float64) {
		t.Errorf("not landscape: %v×%v", sent["width"], sent["height"])
	}
	list := s.listLibbyBackgrounds()
	if len(list) != 1 {
		t.Fatalf("filed %d backgrounds", len(list))
	}
	if id, ok := resolveBackground("the rooftop", list); !ok || id != out.Background.ID {
		t.Errorf("the next move there did not find it: %q %v", id, ok)
	}
	if got := sceneToMakeFor("rooftop", list, true); got != nil {
		t.Errorf("the place she made would be made again: %+v", got)
	}
}
