package ai

import "testing"

// A tag seen in every sampled frame describes the whole clip; one seen in a single
// frame of ten describes a tenth of it. That share is what the library stores as the
// tag's weight — "this video has more of this than that".
func TestPrevalenceIsTheShareOfSampledFrames(t *testing.T) {
	frames := []framed{
		{at: 0, sug: []Suggestion{{Name: "beach"}, {Name: "swimsuit"}}},
		{at: 1, sug: []Suggestion{{Name: "beach"}, {Name: "swimsuit"}, {Name: "swimsuit"}}},
		{at: 2, sug: []Suggestion{{Name: "beach"}}},
		{at: 3, sug: []Suggestion{{Name: "beach"}, {Name: "car"}}},
	}
	got := prevalence(tagCounts(frames), len(frames))
	want := map[string]float64{"beach": 1, "swimsuit": 0.5, "car": 0.25}
	for name, share := range want {
		if got[tagKey{name, catGeneral}] != share {
			t.Errorf("%s: share %v, want %v", name, got[tagKey{name, catGeneral}], share)
		}
	}
	// The same tag emitted twice in one frame counts as one sighting, so swimsuit is
	// half the clip rather than three quarters of it.
	if prevalence(nil, 0) != nil || prevalence(tagCounts(frames), 0) != nil {
		t.Fatal("nothing sampled should measure nothing, not divide by zero")
	}
}
