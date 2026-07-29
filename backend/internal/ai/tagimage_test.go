package ai

import (
	"context"
	"image"
	"testing"
)

// fakeTagger returns a fixed set of suggestions regardless of the image, so we can
// exercise TagImage's filtering without a real model.
type fakeTagger struct{ out []Suggestion }

func (fakeTagger) Name() string { return "fake" }
func (f fakeTagger) Tag(context.Context, image.Image) ([]Suggestion, error) {
	return f.out, nil
}

func TestTagImageFiltersByScoreAndCap(t *testing.T) {
	m := &Manager{
		tagger: fakeTagger{out: []Suggestion{
			{Name: "1girl", Category: catGeneral, Score: 0.99},
			{Name: "red_hair", Category: catGeneral, Score: 0.90},
			{Name: "blurry", Category: catGeneral, Score: 0.10}, // below floor
			{Name: "explicit", Category: catRating, Score: 0.20}, // rating: exempt from floor/cap
		}},
		opts: Options{Enabled: true, MinScore: 0.35, MaxTags: 1},
	}
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	got, err := m.TagImage(context.Background(), img)
	if err != nil {
		t.Fatalf("TagImage: %v", err)
	}
	// The rating is always kept; the cap of 1 keeps the single highest-scoring
	// general tag; the below-floor tag is dropped.
	var haveRating, have1girl, haveBlurry bool
	for _, s := range got {
		switch s.Name {
		case "explicit":
			haveRating = true
		case "1girl":
			have1girl = true
		case "blurry":
			haveBlurry = true
		}
	}
	if !haveRating {
		t.Errorf("rating dropped: %+v", got)
	}
	if !have1girl {
		t.Errorf("top general tag missing: %+v", got)
	}
	if haveBlurry {
		t.Errorf("below-floor tag kept: %+v", got)
	}
}
