package ai

import "testing"

// momentsByTag is what lets the viewer answer "where in this clip?" — it must
// keep every offset a tag was seen at, in time order, and must not pretend a
// whole-clip rating belongs to particular moments.
func TestMomentsByTag(t *testing.T) {
	frames := []framed{
		{at: 10, sug: []Suggestion{
			{Name: "cat", Category: catGeneral, Score: 0.9},
			{Name: "general", Category: catRating, Score: 0.8},
		}},
		{at: 20, sug: []Suggestion{
			{Name: "dog", Category: catGeneral, Score: 0.7},
			{Name: "explicit", Category: catRating, Score: 0.6},
		}},
		{at: 30, sug: []Suggestion{
			{Name: "cat", Category: catGeneral, Score: 0.5},
		}},
	}

	got := momentsByTag(frames)

	if _, ok := got[tagKey{"general", catRating}]; ok {
		t.Error("ratings must not get timeline moments")
	}
	if _, ok := got[tagKey{"explicit", catRating}]; ok {
		t.Error("ratings must not get timeline moments")
	}

	cat := got[tagKey{"cat", catGeneral}]
	if len(cat) != 2 || cat[0].At != 10 || cat[1].At != 30 {
		t.Errorf("cat moments = %+v, want offsets 10 then 30", cat)
	}
	if cat[0].Score != 0.9 {
		t.Errorf("cat first score = %v, want 0.9", cat[0].Score)
	}
	dog := got[tagKey{"dog", catGeneral}]
	if len(dog) != 1 || dog[0].At != 20 {
		t.Errorf("dog moments = %+v, want a single offset 20", dog)
	}
}

// A tagger that leaves Category blank still stores its tags under "general", so
// the moment key must normalise the same way or the moments never attach.
func TestMomentsByTagNormalisesCategory(t *testing.T) {
	got := momentsByTag([]framed{
		{at: 5, sug: []Suggestion{{Name: "landscape", Category: "", Score: 1}}},
	})
	if ms := got[tagKey{"landscape", catGeneral}]; len(ms) != 1 {
		t.Errorf("blank category not normalised to %q: %+v", catGeneral, got)
	}
}

// The heuristic tagger emits no category of its own for ratings, so aggregate
// and momentsByTag must agree on which keys exist for the same suggestions.
func TestMomentsKeysMatchAggregatedTags(t *testing.T) {
	frames := []framed{
		{at: 1, sug: []Suggestion{{Name: "portrait", Category: "meta", Score: 1}}},
		{at: 2, sug: []Suggestion{{Name: "portrait", Category: "meta", Score: 1}}},
	}
	tags := aggregate(suggestions(frames))
	moments := momentsByTag(frames)
	for _, s := range tags {
		if len(moments[keyFor(s)]) == 0 {
			t.Errorf("tag %+v aggregated but has no moments under its key", s)
		}
	}
}
