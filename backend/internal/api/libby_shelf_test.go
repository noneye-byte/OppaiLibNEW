package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
)

// She can offer to put a shelf together, and Allow builds one collection with her
// name on it — rebuilt, not grown, the next time.
func TestTonightsShelfIsOneCollectionSheRebuilds(t *testing.T) {
	s, token := newTestServer(t)
	var seeded []int64
	for i := 0; i < 12; i++ {
		seeded = append(seeded, seedFull(t, s, seedRow{title: fmt.Sprintf("Clip %d", i), kind: "video", at: int64(100 + i), tags: map[string]string{"beach": "general"}}))
	}
	caps := actionCapabilities{Library: true}
	action, ok := s.buildLibbyAction("shelf", "something slow for a rainy night", caps, nil)
	if !ok || action.Kind != "shelf" || action.Prompt == "" {
		t.Fatalf("offer = %+v %v", action, ok)
	}

	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/act", fmt.Sprintf(`{"kind":"shelf","prompt":"beach","recentMediaIds":[%d]}`, seeded[0]))
	if rec.Code != http.StatusOK {
		t.Fatalf("act: %d %s", rec.Code, rec.Body)
	}
	var made struct {
		CollectionID int64  `json:"collectionId"`
		Name         string `json:"name"`
		Count        int    `json:"count"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &made); err != nil || made.Name != libbyShelfName || made.Count != libbyShelfSize {
		t.Fatalf("shelf = %s (%v)", rec.Body, err)
	}
	for _, item := range collectionItems(t, s, token, made.CollectionID, "") {
		if item.ID == seeded[0] {
			t.Errorf("the shelf holds something she already handed over")
		}
	}

	rec = do(t, s.Handler(), token, http.MethodPost, "/api/libby/act", `{"kind":"shelf","prompt":""}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("second act: %d %s", rec.Code, rec.Body)
	}
	var again struct {
		CollectionID int64 `json:"collectionId"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &again)
	if again.CollectionID != made.CollectionID {
		t.Errorf("a second shelf made a second collection: %d vs %d", again.CollectionID, made.CollectionID)
	}
	if items := collectionItems(t, s, token, made.CollectionID, ""); len(items) != libbyShelfSize {
		t.Errorf("rebuilt shelf holds %d items, want %d", len(items), libbyShelfSize)
	}
}
