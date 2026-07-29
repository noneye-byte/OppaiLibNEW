package ai

import (
	"errors"
	"image"
	"image/draw"
	"image/gif"
	"io"
	"math"
	"sort"

	"github.com/youruser/oppailib/internal/db"
)

// tagKey identifies a tag across frames. Category is normalised, so a tagger
// that leaves it blank still collides with the "general" it will be stored as.
type tagKey struct{ name, category string }

func keyFor(s Suggestion) tagKey { return tagKey{s.Name, catOrGeneral(s.Category)} }

func catOrGeneral(c string) string {
	if c == "" {
		return catGeneral
	}
	return c
}

// framed pairs the timestamp a frame was taken at with what the tagger saw in it.
type framed struct {
	at  float64 // seconds from the start of the clip
	sug []Suggestion
}

// suggestions flattens frames into the per-frame slices aggregate consumes.
func suggestions(frames []framed) [][]Suggestion {
	out := make([][]Suggestion, len(frames))
	for i, f := range frames {
		out[i] = f.sug
	}
	return out
}

// momentsByTag inverts per-frame suggestions into, for each tag, the timestamps
// where it was seen — the data the viewer draws on a video's timeline. Frames
// arrive in ascending time order, so each list is already sorted.
//
// Ratings are excluded. aggregate reduces them to a single verdict about the
// whole clip (see ratingSeverity), so pinning "explicit" to the four offsets
// that happened to be sampled would imply a precision the model never claimed.
func momentsByTag(frames []framed) map[tagKey][]db.Moment {
	out := make(map[tagKey][]db.Moment)
	for _, f := range frames {
		for _, s := range f.sug {
			if s.Category == catRating {
				continue
			}
			k := keyFor(s)
			out[k] = append(out[k], db.Moment{At: f.at, Score: s.Score})
		}
	}
	return out
}

// sampleOffsets returns n evenly spaced timestamps (seconds) across a clip of
// the given duration, kept inside the middle 90% so we never sample the black
// lead-in or the trailing credits. An unknown duration yields a single offset at
// 0 — without a probe there is nothing better to aim at.
func sampleOffsets(dur float64, n int) []float64 {
	if n < 1 {
		n = 1
	}
	if dur <= 0 {
		return []float64{0}
	}
	const lead, span = 0.05, 0.90
	out := make([]float64, 0, n)
	for i := range n {
		// Midpoint of the i-th of n equal buckets inside [lead, lead+span].
		frac := lead + span*(float64(i)+0.5)/float64(n)
		out = append(out, dur*frac)
	}
	return out
}

// framesForDuration scales the sample count to the length of the clip. The
// configured value (base) is a floor, not a fixed budget: five frames cover a
// thirty-second clip well and leave a thirty-minute one nearly blind, which is why
// a fixed count is the wrong tool for "understand what happens in the video". Past
// the baseline, one more frame is added for roughly every videoSecondsPerFrame of
// runtime, capped at maxVideoFrames so a feature-length file cannot monopolise a
// worker. An unknown duration keeps the baseline — there is nothing to scale to.
func framesForDuration(base int, dur float64) int {
	if base < 1 {
		base = 1
	}
	want := base
	if dur > 0 {
		if n := int(math.Ceil(dur / videoSecondsPerFrame)); n > want {
			want = n
		}
	}
	if want > maxVideoFrames {
		want = maxVideoFrames
	}
	return want
}

// tagCounts reports, for each tag, how many distinct frames it was seen in. A
// tagger that emits the same tag twice for one frame still counts as one sighting,
// so prevalence measures spread across the clip rather than per-frame noise.
func tagCounts(frames []framed) map[tagKey]int {
	counts := make(map[tagKey]int)
	for _, f := range frames {
		seen := make(map[tagKey]bool, len(f.sug))
		for _, s := range f.sug {
			k := keyFor(s)
			if seen[k] {
				continue
			}
			seen[k] = true
			counts[k]++
		}
	}
	return counts
}

// pruneTransient drops one-frame flukes from a densely sampled clip. Once enough
// frames were taken for prevalence to mean anything, a general tag seen in a single
// frame at middling confidence is far more likely a compression or seek artefact
// than something that was in the video, and keeping it dilutes what the clip is
// actually about. Strong single-frame tags survive (a brief but unmistakable
// moment), as do characters and the rating, and a sparsely sampled clip is left
// untouched because there one sighting is most of the coverage it got.
//
// It shrinks agg in place, preserving order.
func pruneTransient(agg []Suggestion, counts map[tagKey]int, sampled int) []Suggestion {
	if sampled < densePruneFrames {
		return agg
	}
	out := agg[:0]
	for _, s := range agg {
		if s.Category == catGeneral && counts[keyFor(s)] <= 1 && s.Score < transientKeepScore {
			continue
		}
		out = append(out, s)
	}
	return out
}

// videoSeg is one scene: the span between two cuts.
type videoSeg struct{ start, end float64 }

func (s videoSeg) length() float64 { return s.end - s.start }

// points returns k timestamps evenly spread inside the segment. k==1 is its
// midpoint; higher k gives a long scene interior coverage.
func (s videoSeg) points(k int) []float64 {
	if k < 1 {
		k = 1
	}
	out := make([]float64, 0, k)
	for j := range k {
		out = append(out, s.start+s.length()*(float64(j)+0.5)/float64(k))
	}
	return out
}

// segmentsFromCuts turns a clip of length dur and a list of cut timestamps into the
// scenes between them. Cuts outside (0,dur) are ignored and the boundaries are
// sorted and de-duplicated, so an unsorted or dirty cut list still yields sane,
// non-overlapping segments in time order.
func segmentsFromCuts(cuts []float64, dur float64) []videoSeg {
	bounds := make([]float64, 0, len(cuts)+2)
	bounds = append(bounds, 0)
	for _, c := range cuts {
		if c > 0 && c < dur {
			bounds = append(bounds, c)
		}
	}
	bounds = append(bounds, dur)
	sort.Float64s(bounds)
	var segs []videoSeg
	for i := 1; i < len(bounds); i++ {
		if bounds[i]-bounds[i-1] > 1e-6 {
			segs = append(segs, videoSeg{bounds[i-1], bounds[i]})
		}
	}
	return segs
}

// allocateSamples spreads want samples over the segments, one each first so every
// scene is represented, then handing each extra sample to whichever segment is
// currently the coarsest (largest span per sample). That evens out coverage in
// time: a long scene ends up with several interior frames while a two-second cut
// keeps its one. Callers guarantee want >= len(segs).
func allocateSamples(segs []videoSeg, want int) []int {
	counts := make([]int, len(segs))
	for i := range counts {
		counts[i] = 1
	}
	for assigned := len(segs); assigned < want; assigned++ {
		coarsest, worst := 0, -1.0
		for i, s := range segs {
			if span := s.length() / float64(counts[i]); span > worst {
				worst, coarsest = span, i
			}
		}
		counts[coarsest]++
	}
	return counts
}

// sceneAwareOffsets plans where to sample a clip using detected scene cuts, so each
// scene gets a frame instead of the clock deciding what gets seen. want is the frame
// budget (see framesForDuration).
//
// It falls back to even clock sampling when there is nothing better to do: no real
// cuts (one segment spanning the whole clip) keeps the middle-90% trim that avoids a
// black lead-in, which subdividing a single segment would lose. With more scenes
// than budget, the budget is spread evenly across scenes by time; with fewer, every
// scene gets a frame and the leftover budget deepens the longest scenes.
func sceneAwareOffsets(cuts []float64, dur float64, want int) []float64 {
	if want < 1 {
		want = 1
	}
	if dur <= 0 {
		return []float64{0}
	}
	segs := segmentsFromCuts(cuts, dur)
	if len(segs) <= 1 {
		return sampleOffsets(dur, want)
	}
	if len(segs) >= want {
		idx := sampleIndices(len(segs), want)
		out := make([]float64, 0, len(idx))
		for _, i := range idx {
			out = append(out, segs[i].points(1)...)
		}
		return out
	}
	counts := allocateSamples(segs, want)
	out := make([]float64, 0, want)
	for i, seg := range segs {
		out = append(out, seg.points(counts[i])...)
	}
	sort.Float64s(out)
	return out
}

// sampleIndices picks n evenly spaced indices from [0,total). If n >= total it
// returns every index.
func sampleIndices(total, n int) []int {
	if total <= 0 {
		return nil
	}
	if n < 1 {
		n = 1
	}
	if n >= total {
		out := make([]int, total)
		for i := range out {
			out[i] = i
		}
		return out
	}
	out := make([]int, 0, n)
	for i := range n {
		idx := int((float64(i) + 0.5) * float64(total) / float64(n))
		if idx >= total {
			idx = total - 1
		}
		out = append(out, idx)
	}
	return out
}

// gifFrames decodes an animated GIF and returns up to n fully composited frames,
// evenly sampled across the animation.
//
// Compositing is not optional. Every frame after the first is typically a
// partial delta — a sub-rectangle of the canvas with everything else
// transparent — whose meaning depends on the disposal method of the frame
// before it. Handing a raw delta to a tagger would classify a transparent
// sliver rather than the picture a viewer sees. So we replay the animation onto
// a persistent canvas and snapshot only the frames we intend to tag.
func gifFrames(r io.Reader, n int) ([]image.Image, error) {
	g, err := gif.DecodeAll(r)
	if err != nil {
		return nil, err
	}
	if len(g.Image) == 0 {
		return nil, errors.New("gif: no frames")
	}

	// g.Config is normally populated by DecodeAll; fall back to the first frame's
	// extent for GIFs with a malformed logical-screen descriptor.
	w, h := g.Config.Width, g.Config.Height
	if w <= 0 || h <= 0 {
		b := g.Image[0].Bounds()
		w, h = b.Dx(), b.Dy()
	}

	keep := make(map[int]bool, n)
	for _, idx := range sampleIndices(len(g.Image), n) {
		keep[idx] = true
	}

	canvas := image.NewRGBA(image.Rect(0, 0, w, h))
	var prev *image.RGBA // canvas snapshot, for DisposalPrevious

	out := make([]image.Image, 0, len(keep))
	for i, frame := range g.Image {
		// Apply the *previous* frame's disposal before drawing this one.
		if i > 0 && i-1 < len(g.Disposal) {
			switch g.Disposal[i-1] {
			case gif.DisposalBackground:
				draw.Draw(canvas, g.Image[i-1].Bounds(), image.Transparent, image.Point{}, draw.Src)
			case gif.DisposalPrevious:
				if prev != nil {
					draw.Draw(canvas, canvas.Bounds(), prev, canvas.Bounds().Min, draw.Src)
				}
			}
		}
		// If this frame wants "restore to previous", capture the canvas as it looks
		// before the frame is drawn — that is the state its successor restores.
		if i < len(g.Disposal) && g.Disposal[i] == gif.DisposalPrevious {
			prev = image.NewRGBA(canvas.Bounds())
			draw.Draw(prev, canvas.Bounds(), canvas, canvas.Bounds().Min, draw.Src)
		}

		// draw.Over honours the palette's transparent index, leaving the canvas
		// showing through wherever this frame is transparent.
		draw.Draw(canvas, frame.Bounds(), frame, frame.Bounds().Min, draw.Over)

		if keep[i] {
			snap := image.NewRGBA(canvas.Bounds())
			draw.Draw(snap, canvas.Bounds(), canvas, canvas.Bounds().Min, draw.Src)
			out = append(out, snap)
		}
	}
	return out, nil
}

// aggregate collapses per-frame suggestions into one set for the whole item,
// keeping the highest confidence seen for each (name, category). Max rather than
// mean: a tag that is only true for part of a clip — a costume that appears in
// one scene — is still true of the clip, and averaging would bury it under the
// frames where it is legitimately absent.
//
// Ratings are the exception. They are mutually exclusive, so the frames are
// reduced to the single most severe rating any of them reported rather than to
// one tag per distinct rating seen. See ratingSeverity.
func aggregate(frames [][]Suggestion) []Suggestion {
	type key struct{ name, category string }
	best := make(map[key]Suggestion)
	var order []key

	for _, fs := range frames {
		for _, s := range fs {
			k := key{s.Name, s.Category}
			cur, seen := best[k]
			if !seen {
				order = append(order, k)
				best[k] = s
				continue
			}
			if s.Score > cur.Score {
				best[k] = s
			}
		}
	}

	// Pick the winning rating before emitting, so the losers can be skipped.
	winner, hasRating := key{}, false
	for _, k := range order {
		if k.category != catRating {
			continue
		}
		if !hasRating || moreSevere(k.name, winner.name) {
			winner, hasRating = k, true
		}
	}

	// Stable, first-seen order so repeated runs write tags deterministically.
	out := make([]Suggestion, 0, len(order))
	for _, k := range order {
		if k.category == catRating && k != winner {
			continue
		}
		out = append(out, best[k])
	}
	return out
}

// moreSevere reports whether rating a outranks rating b. Unknown ratings — a
// model whose rating labels are not wd14's four — sort below every known one, so
// a recognised rating always wins over a name we cannot place.
func moreSevere(a, b string) bool {
	sa, oka := ratingSeverity[a]
	sb, okb := ratingSeverity[b]
	if oka != okb {
		return oka
	}
	return sa > sb
}
