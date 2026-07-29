package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"testing"
)

// taggedAsHer is the question every test here asks: does this item carry the label.
func taggedAsHer(t *testing.T, s *Server, id int64) bool {
	t.Helper()
	tags, err := s.db.TagsForMedia(context.Background(), id)
	if err != nil {
		t.Fatalf("read tags: %v", err)
	}
	return hasIdentityTag(tags)
}

func TestRecognitionNeedsMoreThanACoincidence(t *testing.T) {
	s, _ := newTestServer(t)
	// Her bundled likeness is what recognition matches against, and a single shared
	// feature is not a likeness — half a booru has red eyes.
	oneFeature := seedTitledMedia(t, s, "Somebody Else", "image", "red eyes", "beach")
	s.recognizeLibbyMedia(oneFeature)
	if taggedAsHer(t, s, oneFeature) {
		t.Error("one shared feature must not be enough to claim a picture is her")
	}

	features := appearanceTags(defaultLibbyCard().Appearance)
	if len(features) < identityAutoFloor {
		t.Fatalf("her card describes only %d features; recognition needs %d", len(features), identityAutoFloor)
	}
	her := seedTitledMedia(t, s, "Her, Apparently", "image", features[:identityAutoFloor]...)
	s.recognizeLibbyMedia(her)
	if !taggedAsHer(t, s, her) {
		t.Errorf("a picture matching %d of her features should have been recognised", identityAutoFloor)
	}
}

func TestAManualNoIsRemembered(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	features := appearanceTags(defaultLibbyCard().Appearance)
	id := seedTitledMedia(t, s, "Not Her", "image", features[:identityAutoFloor]...)

	s.recognizeLibbyMedia(id)
	if !taggedAsHer(t, s, id) {
		t.Fatal("setup: the picture should have been auto-recognised first")
	}
	body := `{"mediaId":` + strconv.FormatInt(id, 10) + `,"isLibby":false}`
	if rec := do(t, h, token, http.MethodPost, "/api/libby/identity/mark", body); rec.Code != http.StatusOK {
		t.Fatalf("mark not-her: %d %s", rec.Code, rec.Body)
	}
	if taggedAsHer(t, s, id) {
		t.Error("saying no should have taken the tag off")
	}
	// The point of recording it: the next pass must not simply put it back, or the
	// user has to keep saying no until they give up.
	s.recognizeLibbyMedia(id)
	if taggedAsHer(t, s, id) {
		t.Error("recognition put the tag back on a picture that was rejected by hand")
	}
}

func TestManualTaggingAndReferences(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	// Nothing about this picture looks like her — a manual verdict does not need to
	// agree with recognition, which is the whole reason it exists.
	id := seedTitledMedia(t, s, "A Drawing", "image", "sketch", "monochrome")

	body := `{"mediaId":` + strconv.FormatInt(id, 10) + `,"isLibby":true,"reference":true}`
	rec := do(t, h, token, http.MethodPost, "/api/libby/identity/mark", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("mark as her: %d %s", rec.Code, rec.Body)
	}
	if !taggedAsHer(t, s, id) {
		t.Error("a manual yes should have tagged it")
	}
	var view libbyIdentityView
	if err := json.Unmarshal(rec.Body.Bytes(), &view); err != nil {
		t.Fatalf("decode identity: %v", err)
	}
	if view.Tag != libbyIdentityTag {
		t.Errorf("the view should name the tag it uses, got %q", view.Tag)
	}
	if len(view.References) != 1 || view.References[0].ID != id {
		t.Errorf("the reference set should hold the picture just marked: %+v", view.References)
	}
	if view.References[0].Title != "A Drawing" {
		t.Errorf("a reference should be named: %+v", view.References[0])
	}
	// Multiple references, which is what makes outfit and pose variation representable.
	second := seedTitledMedia(t, s, "Another Drawing", "image", "sketch")
	rec = do(t, h, token, http.MethodPost, "/api/libby/identity/mark",
		`{"mediaId":`+strconv.FormatInt(second, 10)+`,"isLibby":true,"reference":true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("second reference: %d %s", rec.Code, rec.Body)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &view)
	if len(view.References) != 2 {
		t.Errorf("references should accumulate, got %+v", view.References)
	}
	if view.Tagged < 2 {
		t.Errorf("both pictures should be counted as tagged, got %d", view.Tagged)
	}
}

func TestSheKnowsHerOwnPictureOnTheSharedScreen(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	her := seedTitledMedia(t, s, "That One From Tuesday", "image", "bedroom")
	if rec := do(t, h, token, http.MethodPost, "/api/libby/identity/mark",
		`{"mediaId":`+strconv.FormatInt(her, 10)+`,"isLibby":true}`); rec.Code != http.StatusOK {
		t.Fatalf("mark: %d %s", rec.Code, rec.Body)
	}
	block := s.viewingDirective(context.Background(), &chatViewing{FocusID: her}, "sweet", 1, true)
	if !strings.Contains(block, "picture of you") {
		t.Errorf("she was not told the open item is her: %s", block)
	}
	// Somebody else's character does not get told they are looking at themselves.
	if other := s.viewingDirective(context.Background(), &chatViewing{FocusID: her}, "sweet", 1, false); strings.Contains(other, "picture of you") {
		t.Errorf("an imported character was told a picture of Libby was them: %s", other)
	}
}

func TestIdentityScanSweepsWhatIsAlreadyThere(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	features := appearanceTags(defaultLibbyCard().Appearance)
	// Seeded without going through recognition, standing in for a library that
	// predates the feature.
	old := seedTitledMedia(t, s, "From Before", "image", features[:identityAutoFloor]...)

	rec := do(t, h, token, http.MethodPost, "/api/libby/identity/scan", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("scan: %d %s", rec.Code, rec.Body)
	}
	if !taggedAsHer(t, s, old) {
		t.Errorf("the sweep missed a picture of her: %s", rec.Body)
	}
	// Running it again finds nothing new, so it is safe to press twice.
	rec = do(t, h, token, http.MethodPost, "/api/libby/identity/scan", "")
	var result struct{ Tagged int }
	_ = json.Unmarshal(rec.Body.Bytes(), &result)
	if result.Tagged != 0 {
		t.Errorf("a second sweep should tag nothing, got %d", result.Tagged)
	}
}

func TestRecognitionCanBeSwitchedOff(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	if rec := do(t, h, token, http.MethodPut, "/api/libby/identity", `{"auto":false}`); rec.Code != http.StatusOK {
		t.Fatalf("disable: %d %s", rec.Code, rec.Body)
	}
	features := appearanceTags(defaultLibbyCard().Appearance)
	id := seedTitledMedia(t, s, "Would Have Matched", "image", features[:identityAutoFloor]...)
	s.recognizeLibbyMedia(id)
	if taggedAsHer(t, s, id) {
		t.Error("automatic recognition ran while switched off")
	}
}
