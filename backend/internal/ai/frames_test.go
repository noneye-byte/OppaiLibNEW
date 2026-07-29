package ai

import (
	"bytes"
	"image"
	"image/color"
	"image/gif"
	"testing"
)

var (
	red  = color.RGBA{255, 0, 0, 255}
	blue = color.RGBA{0, 0, 255, 255}
)

// buildGIF encodes a 10x10 two-frame GIF: a full red canvas, then a 4x4 blue
// square in the top-left corner as a partial delta frame. disposal0 is the
// disposal method declared on the first frame.
func buildGIF(t *testing.T, disposal0 byte) []byte {
	t.Helper()
	const w, h = 10, 10
	pal := color.Palette{red, blue, color.RGBA{0, 0, 0, 0}}

	full := image.NewPaletted(image.Rect(0, 0, w, h), pal)
	for i := range full.Pix {
		full.Pix[i] = 0 // red
	}
	delta := image.NewPaletted(image.Rect(0, 0, 4, 4), pal)
	for i := range delta.Pix {
		delta.Pix[i] = 1 // blue
	}

	var buf bytes.Buffer
	err := gif.EncodeAll(&buf, &gif.GIF{
		Image:    []*image.Paletted{full, delta},
		Delay:    []int{10, 10},
		Disposal: []byte{disposal0, 0},
		Config:   image.Config{ColorModel: pal, Width: w, Height: h},
	})
	if err != nil {
		t.Fatalf("encode gif: %v", err)
	}
	return buf.Bytes()
}

func assertColor(t *testing.T, img image.Image, x, y int, want color.RGBA, ctx string) {
	t.Helper()
	r, g, b, a := img.At(x, y).RGBA()
	wr, wg, wb, wa := want.RGBA()
	if r != wr || g != wg || b != wb || a != wa {
		t.Errorf("%s: pixel (%d,%d) = rgba(%d,%d,%d,%d), want rgba(%d,%d,%d,%d)",
			ctx, x, y, r>>8, g>>8, b>>8, a>>8, wr>>8, wg>>8, wb>>8, wa>>8)
	}
}

// The regression this guards: a naive implementation hands g.Image[1] straight
// to the tagger. That frame is a 4x4 delta, not the 10x10 picture a viewer sees.
func TestGIFFramesCompositesPartialDeltaOntoCanvas(t *testing.T) {
	frames, err := gifFrames(bytes.NewReader(buildGIF(t, gif.DisposalNone)), 2)
	if err != nil {
		t.Fatalf("gifFrames: %v", err)
	}
	if len(frames) != 2 {
		t.Fatalf("got %d frames, want 2", len(frames))
	}

	second := frames[1]
	if got, want := second.Bounds(), image.Rect(0, 0, 10, 10); got != want {
		t.Fatalf("delta frame not composited to full canvas: bounds %v, want %v", got, want)
	}
	assertColor(t, second, 1, 1, blue, "delta region")
	// The pixel the delta never touched must still show frame 0 (DisposalNone).
	assertColor(t, second, 8, 8, red, "retained background")
}

func TestGIFFramesHonoursDisposalBackground(t *testing.T) {
	frames, err := gifFrames(bytes.NewReader(buildGIF(t, gif.DisposalBackground)), 2)
	if err != nil {
		t.Fatalf("gifFrames: %v", err)
	}
	second := frames[1]
	assertColor(t, second, 1, 1, blue, "delta region")
	// Frame 0 declared DisposalBackground over the whole canvas, so everything it
	// painted is cleared to transparent before frame 1 draws.
	if _, _, _, a := second.At(8, 8).RGBA(); a != 0 {
		t.Errorf("DisposalBackground: pixel (8,8) alpha = %d, want 0 (cleared)", a>>8)
	}
}

func TestGIFFramesSamplesAtMostN(t *testing.T) {
	frames, err := gifFrames(bytes.NewReader(buildGIF(t, gif.DisposalNone)), 1)
	if err != nil {
		t.Fatalf("gifFrames: %v", err)
	}
	if len(frames) != 1 {
		t.Fatalf("got %d frames, want 1", len(frames))
	}
}

func TestSampleOffsets(t *testing.T) {
	if got := sampleOffsets(0, 5); len(got) != 1 || got[0] != 0 {
		t.Errorf("unknown duration: got %v, want [0]", got)
	}
	if got := sampleOffsets(100, 1); len(got) != 1 || got[0] != 50 {
		t.Errorf("single frame: got %v, want [50] (midpoint)", got)
	}

	got := sampleOffsets(100, 4)
	if len(got) != 4 {
		t.Fatalf("got %d offsets, want 4", len(got))
	}
	for i, at := range got {
		if at < 5 || at > 95 {
			t.Errorf("offset %d = %v, outside the middle 90%% [5,95]", i, at)
		}
		if i > 0 && at <= got[i-1] {
			t.Errorf("offsets not strictly increasing: %v", got)
		}
	}
}

// The configured count is a floor for short clips and scales up with length, so a
// long video is not sampled as sparsely as a short one — capped so it cannot run away.
func TestFramesForDuration(t *testing.T) {
	if got := framesForDuration(5, 0); got != 5 {
		t.Errorf("unknown duration: got %d, want the 5-frame baseline", got)
	}
	if got := framesForDuration(5, 30); got != 5 {
		t.Errorf("short clip: got %d, want the baseline 5 (not fewer)", got)
	}
	// 600s / 20s-per-frame = 30, above the baseline.
	if got := framesForDuration(5, 600); got != 30 {
		t.Errorf("ten-minute clip: got %d, want 30", got)
	}
	// A feature-length file is clamped to the hard cap.
	if got := framesForDuration(5, 3*3600); got != maxVideoFrames {
		t.Errorf("very long clip: got %d, want the cap %d", got, maxVideoFrames)
	}
	if got := framesForDuration(0, 0); got != 1 {
		t.Errorf("nonsensical base: got %d, want at least 1", got)
	}
}

// pruneTransient drops a lone, weak general tag from a densely sampled clip but
// leaves strong ones, repeated ones, characters, ratings, and sparse clips alone.
func TestPruneTransient(t *testing.T) {
	frames := make([]framed, densePruneFrames)
	// "steady" appears in every frame; "flash" in only the first, weakly; "vivid" in
	// only the first but strongly; "hero" is a single-frame character.
	for i := range frames {
		frames[i].sug = []Suggestion{{Name: "steady", Category: catGeneral, Score: 0.6}}
	}
	frames[0].sug = append(frames[0].sug,
		Suggestion{Name: "flash", Category: catGeneral, Score: 0.4},
		Suggestion{Name: "vivid", Category: catGeneral, Score: 0.9},
		Suggestion{Name: "hero", Category: catCharacter, Score: 0.4},
	)
	counts := tagCounts(frames)
	if counts[tagKey{"steady", catGeneral}] != densePruneFrames {
		t.Fatalf("steady seen %d times, want %d", counts[tagKey{"steady", catGeneral}], densePruneFrames)
	}
	if counts[tagKey{"flash", catGeneral}] != 1 {
		t.Fatalf("flash seen %d times, want 1", counts[tagKey{"flash", catGeneral}])
	}

	kept := names(pruneTransient(aggregate(suggestions(frames)), counts, len(frames)))
	if kept["flash"] {
		t.Error("a lone weak general tag should be pruned from a dense clip")
	}
	for _, want := range []string{"steady", "vivid", "hero"} {
		if !kept[want] {
			t.Errorf("%q should survive pruning", want)
		}
	}

	// Below the density threshold, even a lone weak tag is kept — one sighting is
	// most of the coverage such a clip got.
	sparse := []framed{{sug: []Suggestion{{Name: "flash", Category: catGeneral, Score: 0.4}}}}
	if !names(pruneTransient(aggregate(suggestions(sparse)), tagCounts(sparse), len(sparse)))["flash"] {
		t.Error("a sparsely sampled clip should not be pruned")
	}
}

func names(sugs []Suggestion) map[string]bool {
	out := make(map[string]bool, len(sugs))
	for _, s := range sugs {
		out[s.Name] = true
	}
	return out
}

func TestSegmentsFromCuts(t *testing.T) {
	// Dirty input: unsorted, a duplicate, and values outside (0,dur) that must go.
	segs := segmentsFromCuts([]float64{60, -5, 30, 30, 200}, 100)
	want := []videoSeg{{0, 30}, {30, 60}, {60, 100}}
	if len(segs) != len(want) {
		t.Fatalf("got %d segments, want %d: %+v", len(segs), len(want), segs)
	}
	for i, s := range segs {
		if s != want[i] {
			t.Errorf("segment %d = %+v, want %+v", i, s, want[i])
		}
	}
	// No cuts is a single whole-clip segment.
	if got := segmentsFromCuts(nil, 100); len(got) != 1 || got[0] != (videoSeg{0, 100}) {
		t.Errorf("no cuts: got %+v, want one [0,100] segment", got)
	}
}

// Every extra sample goes to the coarsest scene, so a long scene fills in before a
// short one gets a second frame.
func TestAllocateSamples(t *testing.T) {
	segs := []videoSeg{{0, 90}, {90, 100}} // a 90s scene and a 10s scene
	got := allocateSamples(segs, 4)
	if got[0]+got[1] != 4 {
		t.Fatalf("counts %v do not sum to the budget 4", got)
	}
	if got[0] <= got[1] {
		t.Errorf("counts = %v, want the 90s scene to get more than the 10s one", got)
	}
}

func TestSceneAwareOffsets(t *testing.T) {
	// No real cuts: falls back to clock sampling inside the middle 90%, never at the
	// black lead-in a single-segment subdivision would hit.
	for _, at := range sceneAwareOffsets(nil, 100, 5) {
		if at < 5 || at > 95 {
			t.Errorf("no-cut fallback sampled %v, outside the middle 90%%", at)
		}
	}

	// More scenes than budget: one frame each from a spread of scenes, all interior
	// to their own scene and strictly increasing in time.
	cuts := []float64{10, 20, 30, 40, 50, 60, 70, 80, 90}
	got := sceneAwareOffsets(cuts, 100, 4)
	if len(got) != 4 {
		t.Fatalf("more scenes than budget: got %d offsets, want 4: %v", len(got), got)
	}
	for i, at := range got {
		if i > 0 && at <= got[i-1] {
			t.Errorf("offsets not strictly increasing: %v", got)
		}
	}

	// Fewer scenes than budget: every scene is represented and the budget is spent in
	// full, with the leftover deepening the longest scene.
	got = sceneAwareOffsets([]float64{90}, 100, 5) // scenes [0,90] and [90,100]
	if len(got) != 5 {
		t.Fatalf("fewer scenes than budget: got %d offsets, want 5: %v", len(got), got)
	}
	inLong := 0
	for _, at := range got {
		if at < 90 {
			inLong++
		}
	}
	if inLong < 3 {
		t.Errorf("long scene got %d of 5 frames, want the majority: %v", inLong, got)
	}
}

func TestSampleIndices(t *testing.T) {
	if got := sampleIndices(3, 10); len(got) != 3 {
		t.Errorf("n > total: got %v, want all 3 indices", got)
	}
	for _, idx := range sampleIndices(10, 3) {
		if idx < 0 || idx >= 10 {
			t.Errorf("index %d out of range [0,10)", idx)
		}
	}
	if got := sampleIndices(0, 3); got != nil {
		t.Errorf("empty input: got %v, want nil", got)
	}
}

// A tag true of only one scene is true of the clip, so the highest score across
// frames wins rather than the mean.
func TestAggregateKeepsMaxScorePerTagInFirstSeenOrder(t *testing.T) {
	got := aggregate([][]Suggestion{
		{{Name: "a", Category: "general", Score: 0.2}, {Name: "b", Category: "general", Score: 0.9}},
		{{Name: "a", Category: "general", Score: 0.7}},
	})
	if len(got) != 2 {
		t.Fatalf("got %d suggestions, want 2: %+v", len(got), got)
	}
	if got[0].Name != "a" || got[0].Score != 0.7 {
		t.Errorf("got[0] = %+v, want a@0.7 (max across frames)", got[0])
	}
	if got[1].Name != "b" || got[1].Score != 0.9 {
		t.Errorf("got[1] = %+v, want b@0.9", got[1])
	}
}

// Same name in different categories must not collapse into one tag.
func TestAggregateSeparatesCategories(t *testing.T) {
	got := aggregate([][]Suggestion{
		{{Name: "x", Category: "meta", Score: 0.5}, {Name: "x", Category: "general", Score: 0.4}},
	})
	if len(got) != 2 {
		t.Fatalf("got %d suggestions, want 2: %+v", len(got), got)
	}
}

func ratingsOf(sugs []Suggestion) []string {
	var out []string
	for _, s := range sugs {
		if s.Category == catRating {
			out = append(out, s.Name)
		}
	}
	return out
}

// Ratings are mutually exclusive: a clip gets exactly one, even though its
// frames each contributed their own.
func TestAggregateCollapsesRatingsToMostSevere(t *testing.T) {
	// Four tame frames and one explicit one. "general" scores higher and is seen
	// more often, but a clip containing an explicit scene is explicit.
	got := aggregate([][]Suggestion{
		{{Name: "general", Category: catRating, Score: 0.99}},
		{{Name: "general", Category: catRating, Score: 0.98}},
		{{Name: "sensitive", Category: catRating, Score: 0.60}},
		{{Name: "explicit", Category: catRating, Score: 0.55}},
		{{Name: "general", Category: catRating, Score: 0.97}},
	})
	if names := ratingsOf(got); len(names) != 1 || names[0] != "explicit" {
		t.Fatalf("ratings = %v, want exactly [explicit]", names)
	}
	if got[0].Score != 0.55 {
		t.Errorf("score = %v, want the explicit frame's 0.55", got[0].Score)
	}
}

// The winning rating still reports the best score it achieved on any frame.
func TestAggregateRatingKeepsMaxScoreOfWinner(t *testing.T) {
	got := aggregate([][]Suggestion{
		{{Name: "explicit", Category: catRating, Score: 0.40}},
		{{Name: "explicit", Category: catRating, Score: 0.80}},
	})
	if len(got) != 1 || got[0].Score != 0.80 {
		t.Fatalf("got %+v, want one explicit@0.8", got)
	}
}

// Collapsing ratings must not disturb the other categories.
func TestAggregateRatingCollapseLeavesOtherTags(t *testing.T) {
	got := aggregate([][]Suggestion{
		{{Name: "general", Category: catRating, Score: 0.9}, {Name: "1girl", Category: catGeneral, Score: 0.9}},
		{{Name: "explicit", Category: catRating, Score: 0.7}, {Name: "nude", Category: catGeneral, Score: 0.8}},
	})
	if names := ratingsOf(got); len(names) != 1 || names[0] != "explicit" {
		t.Fatalf("ratings = %v, want exactly [explicit]", names)
	}
	if len(got) != 3 {
		t.Fatalf("got %d suggestions, want 3 (1 rating + 2 general): %+v", len(got), got)
	}
}

// A model whose rating labels are not wd14's four must still yield one rating,
// and a recognised rating outranks an unrecognised one.
func TestAggregateUnknownRatings(t *testing.T) {
	got := aggregate([][]Suggestion{
		{{Name: "spicy", Category: catRating, Score: 0.9}},
		{{Name: "sensitive", Category: catRating, Score: 0.1}},
	})
	if names := ratingsOf(got); len(names) != 1 || names[0] != "sensitive" {
		t.Fatalf("ratings = %v, want exactly [sensitive] (known beats unknown)", names)
	}

	got = aggregate([][]Suggestion{
		{{Name: "spicy", Category: catRating, Score: 0.9}},
		{{Name: "mild", Category: catRating, Score: 0.1}},
	})
	if names := ratingsOf(got); len(names) != 1 || names[0] != "spicy" {
		t.Fatalf("ratings = %v, want exactly [spicy] (first seen wins among unknowns)", names)
	}
}

// A tagger that emits no ratings at all (the heuristic one) is unaffected.
func TestAggregateNoRatings(t *testing.T) {
	got := aggregate([][]Suggestion{
		{{Name: "portrait", Category: "meta", Score: 1}},
		{{Name: "high-res", Category: "meta", Score: 1}},
	})
	if len(got) != 2 {
		t.Fatalf("got %d suggestions, want 2: %+v", len(got), got)
	}
}
