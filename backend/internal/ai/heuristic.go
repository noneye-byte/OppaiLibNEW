package ai

import (
	"context"
	"image"
)

// HeuristicTagger derives cheap structural tags without any model. It is the
// always-available CPU fallback. It intentionally does NOT attempt content
// classification — that is the ONNX tagger's job (build with -tags onnx).
type HeuristicTagger struct{}

func (HeuristicTagger) Name() string { return "heuristic" }

func (HeuristicTagger) Tag(_ context.Context, img image.Image) ([]Suggestion, error) {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	var out []Suggestion

	switch {
	case w == 0 || h == 0:
		// nothing
	case float64(w)/float64(h) > 1.25:
		out = append(out, Suggestion{Name: "landscape", Category: "meta", Score: 1})
	case float64(h)/float64(w) > 1.25:
		out = append(out, Suggestion{Name: "portrait", Category: "meta", Score: 1})
	default:
		out = append(out, Suggestion{Name: "square", Category: "meta", Score: 1})
	}

	if w >= 1920 || h >= 1920 {
		out = append(out, Suggestion{Name: "high-res", Category: "meta", Score: 1})
	}
	return out, nil
}
