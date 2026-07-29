//go:build onnx

package ai

import (
	"context"
	"fmt"
	"image"
	"image/color"
	"io"
	"log/slog"
	"math"
	"os"
	"strings"
	"sync"
	"testing"

	"golang.org/x/image/draw"
)

// newTestTagger builds a tagger with no session — enough to exercise the pure
// preprocessing/collection logic without the ONNX Runtime shared library.
func newTestTagger(cfg modelConfig, labels []label) *onnxTagger {
	applyDefaults(&cfg)
	t := &onnxTagger{cfg: cfg, labels: labels}
	for _, l := range labels {
		if l.category == catRating {
			t.hasRating = true
		}
	}
	return t
}

func TestReadLabelsCSV(t *testing.T) {
	const csv = `tag_id,name,category,count
9999999,general,9,1589178
9999996,explicit,9,706509
470575,1girl,0,5113288
8601,breasts,0,2889545
12345,hatsune_miku,4,999
54321,touhou,3,888
`
	got, err := readLabelsCSV(strings.NewReader(csv), catGeneral)
	if err != nil {
		t.Fatalf("readLabelsCSV: %v", err)
	}
	want := []label{
		{"general", catRating},
		{"explicit", catRating},
		{"1girl", catGeneral},
		{"breasts", catGeneral},
		{"hatsune miku", catCharacter}, // underscores become spaces
		{"touhou", catGeneral},         // copyright(3) falls back
	}
	if len(got) != len(want) {
		t.Fatalf("got %d labels, want %d: %v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("label %d = %+v, want %+v", i, got[i], want[i])
		}
	}
}

// The output vector is index-aligned to the label file, so a dropped or extra
// row silently shifts every tag. Guard the header skip explicitly.
func TestReadLabelsCSVWithoutHeader(t *testing.T) {
	got, err := readLabelsCSV(strings.NewReader("470575,1girl,0,5113288\n"), catGeneral)
	if err != nil {
		t.Fatalf("readLabelsCSV: %v", err)
	}
	if len(got) != 1 || got[0].name != "1girl" {
		t.Fatalf("got %+v, want one 1girl label", got)
	}
}

func TestCollectRatingIsArgmaxAndLeads(t *testing.T) {
	labels := []label{
		{"general", catRating},
		{"sensitive", catRating},
		{"questionable", catRating},
		{"explicit", catRating},
		{"1girl", catGeneral},
		{"breasts", catGeneral},
		{"nose", catGeneral},
		{"hatsune miku", catCharacter},
	}
	tag := newTestTagger(modelConfig{Threshold: 0.35, CharThreshold: 0.85}, labels)

	got := tag.collect([]float32{
		0.10, 0.20, 0.30, 0.90, // ratings: explicit wins by argmax
		0.95, 0.50, // general, both over 0.35
		0.20,       // general, under threshold
		0.50,       // character, under the 0.85 character threshold
	})

	want := []Suggestion{
		{"explicit", catRating, 0.90},  // leads despite 1girl scoring higher
		{"1girl", catGeneral, 0.95},
		{"breasts", catGeneral, 0.50},
	}
	if len(got) != len(want) {
		t.Fatalf("got %d suggestions, want %d: %+v", len(got), len(want), got)
	}
	for i := range want {
		if got[i].Name != want[i].Name || got[i].Category != want[i].Category ||
			math.Abs(got[i].Score-want[i].Score) > 1e-6 {
			t.Errorf("suggestion %d = %+v, want %+v", i, got[i], want[i])
		}
	}
}

// A rating is emitted even when every rating score is below the general
// threshold — an image always has exactly one rating.
func TestCollectRatingBelowThreshold(t *testing.T) {
	labels := []label{{"general", catRating}, {"explicit", catRating}}
	tag := newTestTagger(modelConfig{Threshold: 0.35}, labels)
	got := tag.collect([]float32{0.01, 0.02})
	if len(got) != 1 || got[0].Name != "explicit" || got[0].Category != catRating {
		t.Fatalf("got %+v, want one explicit rating", got)
	}
}

func TestCollectNoRatingLabels(t *testing.T) {
	labels := []label{{"1girl", catGeneral}, {"nose", catGeneral}}
	tag := newTestTagger(modelConfig{Threshold: 0.35}, labels)
	got := tag.collect([]float32{0.9, 0.1})
	if len(got) != 1 || got[0].Name != "1girl" {
		t.Fatalf("got %+v, want only 1girl", got)
	}
}

// px reads one NHWC pixel as {c0,c1,c2} from a preprocessed buffer.
func px(dst []float32, size, x, y int) [3]float32 {
	i := (y*size + x) * 3
	return [3]float32{dst[i], dst[i+1], dst[i+2]}
}

func near(got [3]float32, want [3]float32) bool {
	for i := range got {
		if math.Abs(float64(got[i]-want[i])) > 2.0 {
			return false
		}
	}
	return true
}

// A portrait image must be letterboxed onto a white square, not stretched.
// Stretching is what the tagger did before, and it distorts every
// aspect-sensitive tag.
func TestPreprocessPadsToSquareWithWhite(t *testing.T) {
	const size = 4
	// 2 wide x 4 tall, solid opaque red.
	src := image.NewRGBA(image.Rect(0, 0, 2, 4))
	for y := 0; y < 4; y++ {
		for x := 0; x < 2; x++ {
			src.Set(x, y, color.RGBA{255, 0, 0, 255})
		}
	}
	tag := newTestTagger(modelConfig{InputSize: size, Layout: "nhwc", BGR: true, Scale: 1.0}, nil)
	dst := make([]float32, size*size*3)
	tag.preprocess(src, dst)

	// Columns 0 and 3 are padding → white. In BGR, white is still (255,255,255).
	for _, x := range []int{0, 3} {
		if got := px(dst, size, x, 1); !near(got, [3]float32{255, 255, 255}) {
			t.Errorf("pad column x=%d = %v, want white (255,255,255)", x, got)
		}
	}
	// Columns 1 and 2 are the image → red, which in BGR is (0,0,255).
	for _, x := range []int{1, 2} {
		if got := px(dst, size, x, 1); !near(got, [3]float32{0, 0, 255}) {
			t.Errorf("image column x=%d = %v, want BGR red (0,0,255)", x, got)
		}
	}
}

// Go's RGBA is alpha-premultiplied, so a fully transparent pixel reads as zero.
// Handing that straight to the model paints a black rectangle where wd14 expects
// white. Verify we composite onto white first.
func TestPreprocessCompositesAlphaOntoWhite(t *testing.T) {
	const size = 2
	src := image.NewRGBA(image.Rect(0, 0, 2, 2)) // zero value: fully transparent
	tag := newTestTagger(modelConfig{InputSize: size, Layout: "nhwc", BGR: false, Scale: 1.0}, nil)
	dst := make([]float32, size*size*3)
	tag.preprocess(src, dst)

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			if got := px(dst, size, x, y); !near(got, [3]float32{255, 255, 255}) {
				t.Fatalf("transparent pixel (%d,%d) = %v, want white — alpha was not composited", x, y, got)
			}
		}
	}
}

func TestPreprocessNCHWLayoutAndScale(t *testing.T) {
	const size = 2
	src := image.NewRGBA(image.Rect(0, 0, 2, 2))
	for y := 0; y < 2; y++ {
		for x := 0; x < 2; x++ {
			src.Set(x, y, color.RGBA{255, 0, 0, 255})
		}
	}
	tag := newTestTagger(modelConfig{InputSize: size, Layout: "nchw", Scale: 1.0 / 255.0}, nil)
	dst := make([]float32, size*size*3)
	tag.preprocess(src, dst)

	plane := size * size
	// R plane is 1.0, G and B planes are 0.
	for i := 0; i < plane; i++ {
		if math.Abs(float64(dst[i]-1.0)) > 0.01 {
			t.Errorf("R plane [%d] = %v, want 1.0", i, dst[i])
		}
		if math.Abs(float64(dst[plane+i])) > 0.01 {
			t.Errorf("G plane [%d] = %v, want 0", i, dst[plane+i])
		}
	}
}

// A zero-extent image must not panic or index out of range.
func TestPreprocessEmptyImage(t *testing.T) {
	tag := newTestTagger(modelConfig{InputSize: 2, Layout: "nhwc", Scale: 1.0}, nil)
	dst := make([]float32, 2*2*3)
	tag.preprocess(image.NewRGBA(image.Rect(0, 0, 0, 0)), dst)
}

// TestRealModel loads an actual wd14 export and runs a frame through it. It is
// the only check that the graph-introspected tensor names and the label count
// agree with the real artifacts — a label file off by one row silently shifts
// every tag, and no unit test can catch that.
//
// Set OPPAI_TEST_MODEL_DIR to a directory holding model.onnx, selected_tags.csv
// and model.json, plus ONNXRUNTIME_LIB_PATH. Skipped otherwise.
func TestRealModel(t *testing.T) {
	dir := os.Getenv("OPPAI_TEST_MODEL_DIR")
	if dir == "" {
		t.Skip("set OPPAI_TEST_MODEL_DIR to run against a real model")
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	tagger, err := newOnnxTagger(dir, "cpu", log)
	if err != nil {
		t.Fatalf("newOnnxTagger: %v", err)
	}
	ot := tagger.(*onnxTagger)

	if ot.cfg.InputSize != 448 {
		t.Errorf("input_size = %d, want 448 for wd14", ot.cfg.InputSize)
	}
	if ot.cfg.Layout != "nhwc" {
		t.Errorf("layout = %q, want nhwc", ot.cfg.Layout)
	}
	if !ot.hasRating {
		t.Error("no rating labels found; selected_tags.csv category column may be wrong")
	}
	t.Logf("model=%s labels=%d input=%q output=%q size=%d layout=%s",
		ot.cfg.Model, len(ot.labels), ot.cfg.InputName, ot.cfg.OutputName,
		ot.cfg.InputSize, ot.cfg.Layout)

	// A mid-grey frame. We assert on shape and invariants, not on which tags come
	// back — a synthetic image has no ground truth.
	img := image.NewRGBA(image.Rect(0, 0, 600, 900))
	draw.Draw(img, img.Bounds(), image.NewUniform(color.RGBA{128, 128, 128, 255}), image.Point{}, draw.Src)

	got, err := tagger.Tag(context.Background(), img)
	if err != nil {
		t.Fatalf("Tag: %v", err)
	}
	if len(got) == 0 {
		t.Fatal("no suggestions; the model produced nothing at all")
	}
	if got[0].Category != catRating {
		t.Errorf("first suggestion is %+v, want a rating to lead", got[0])
	}
	ratings := 0
	for _, s := range got {
		if s.Category == catRating {
			ratings++
		}
		if s.Score < 0 || s.Score > 1 {
			t.Errorf("score out of [0,1] for %q: %v — output may not be sigmoid", s.Name, s.Score)
		}
		if strings.Contains(s.Name, "_") {
			t.Errorf("tag %q still contains an underscore", s.Name)
		}
	}
	if ratings != 1 {
		t.Errorf("got %d rating tags, want exactly 1", ratings)
	}
	t.Logf("top suggestions: %+v", got[:min(len(got), 8)])
}

// Concurrent Tag calls must not corrupt each other: the Manager runs up to four
// tag jobs at once against this one tagger.
func TestRealModelConcurrent(t *testing.T) {
	dir := os.Getenv("OPPAI_TEST_MODEL_DIR")
	if dir == "" {
		t.Skip("set OPPAI_TEST_MODEL_DIR to run against a real model")
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	tagger, err := newOnnxTagger(dir, "cpu", log)
	if err != nil {
		t.Fatalf("newOnnxTagger: %v", err)
	}

	// Two visually distinct images. Each goroutine must keep getting the result
	// for its own image, not a neighbour's half-written tensor.
	mk := func(c color.RGBA, w, h int) image.Image {
		img := image.NewRGBA(image.Rect(0, 0, w, h))
		draw.Draw(img, img.Bounds(), image.NewUniform(c), image.Point{}, draw.Src)
		return img
	}
	imgs := []image.Image{
		mk(color.RGBA{20, 20, 200, 255}, 500, 700),
		mk(color.RGBA{220, 180, 160, 255}, 900, 500),
	}

	want := make([][]Suggestion, len(imgs))
	for i, img := range imgs {
		if want[i], err = tagger.Tag(context.Background(), img); err != nil {
			t.Fatalf("baseline Tag: %v", err)
		}
	}

	var wg sync.WaitGroup
	errs := make(chan error, 16)
	for range 8 {
		for i, img := range imgs {
			wg.Add(1)
			go func() {
				defer wg.Done()
				got, err := tagger.Tag(context.Background(), img)
				if err != nil {
					errs <- err
					return
				}
				if len(got) != len(want[i]) || (len(got) > 0 && got[0].Name != want[i][0].Name) {
					errs <- fmt.Errorf("image %d: concurrent result diverged from baseline", i)
				}
			}()
		}
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Error(err)
	}
}
