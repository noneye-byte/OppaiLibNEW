package matte

import (
	"bytes"
	"context"
	"math"
	"testing"
)

// A figure on a white backdrop: a solid disc whose edge is antialiased against the
// white, as a drawn picture's is, so the pixels on its rim are part white.
func discFrame(w, h, cx, cy, r int) []byte {
	const ink = 40
	rgb := make([]byte, w*h*3)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			d := math.Hypot(float64(x-cx), float64(y-cy)) - float64(r)
			cover := min(max(0.5-d, 0), 1)
			v := byte(255 - cover*(255-ink))
			i := (y*w + x) * 3
			rgb[i], rgb[i+1], rgb[i+2] = v, v, v
		}
	}
	return rgb
}

// softSeg is a stand-in for the model: it reads the figure off the backdrop and answers
// with a rim a few pixels wide, as a segmentation model scaled back to a clip does.
func softSeg(in []float32, side int) ([]float32, error) {
	out := make([]float32, side*side)
	for y := 0; y < side; y++ {
		for x := 0; x < side; x++ {
			at := y*side + x
			// The letterbox padding is black and so is not figure; the backdrop is white.
			if v := in[at]; v > 0.01 && v < 0.9 {
				out[at] = 1
			}
		}
	}
	blurred := make([]float32, len(out))
	const reach = 2
	for y := 0; y < side; y++ {
		for x := 0; x < side; x++ {
			var sum, n float32
			for dy := -reach; dy <= reach; dy++ {
				for dx := -reach; dx <= reach; dx++ {
					if xx, yy := x+dx, y+dy; xx >= 0 && yy >= 0 && xx < side && yy < side {
						sum += out[yy*side+xx]
						n++
					}
				}
			}
			blurred[y*side+x] = sum / n
		}
	}
	return blurred, nil
}

// cutTwoFrames cuts a figure that jumps between two frames.
func cutTwoFrames(t *testing.T, w, h int, first, second []byte) []byte {
	t.Helper()
	var out bytes.Buffer
	m := NewFunc(64, softSeg)
	info := ClipInfo{Width: w, Height: h, FPS: "16/1"}
	if err := m.cutFrames(context.Background(), bytes.NewReader(append(append([]byte{}, first...), second...)), &out, info, 2, nil); err != nil {
		t.Fatal(err)
	}
	if out.Len() != w*h*4*2 {
		t.Fatalf("wrote %d bytes", out.Len())
	}
	return out.Bytes()[w*h*4:]
}

func TestWhereSheMovedAwayFromLeavesNoGhostOfTheBackdrop(t *testing.T) {
	const w, h = 64, 64
	frame := cutTwoFrames(t, w, h, discFrame(w, h, 20, 32, 10), discFrame(w, h, 44, 32, 10))
	at := (32*w + 20) * 4 // the middle of where she was
	if a := frame[at+3]; a != 0 {
		t.Fatalf("alpha %d where she no longer is: the white behind her shows through as a ghost", a)
	}
}

func TestNoBackdropIsLeftInTheEdgeOfTheCut(t *testing.T) {
	const w, h = 64, 64
	still := discFrame(w, h, 32, 32, 16)
	frame := cutTwoFrames(t, w, h, still, still)
	for i := 0; i < len(frame); i += 4 {
		// Laid over black, which is where a pale fringe shows: anything visible is hers.
		shown := int(frame[i]) * int(frame[i+3]) / 255
		if shown > 60 {
			x, y := i/4%w, i/4/w
			t.Fatalf("(%d,%d) shows %d over black (rgb %d, alpha %d); she is drawn in 40", x, y, shown, frame[i], frame[i+3])
		}
	}
}

func TestWhatIsHiddenUnderTheCutCarriesHerColourNotTheBackdrops(t *testing.T) {
	const w, h = 64, 64
	still := discFrame(w, h, 32, 32, 16)
	frame := cutTwoFrames(t, w, h, still, still)
	// Video keeps colour at half the resolution of alpha, and a player scales both: a
	// hidden pixel's colour bleeds into the visible one beside it, so white here would
	// come back as a fringe however clean the alpha is.
	for i := 0; i < len(frame); i += 4 {
		if frame[i+3] == 0 && frame[i] > 60 {
			t.Fatalf("hidden pixel %d kept rgb %d", i/4, frame[i])
		}
	}
}

func TestAFlickerAtTheEdgeIsSteadiedButAMovementIsNot(t *testing.T) {
	cur, prev := []uint8{100, 255}, []uint8{120, 0}
	steadied(cur, prev)
	if cur[0] <= 100 || cur[0] >= 120 {
		t.Fatalf("a small flicker became %d", cur[0])
	}
	if cur[1] != 255 {
		t.Fatalf("a real change was blended to %d", cur[1])
	}
}

func TestWhiteClothesAgainstAWhiteBackdropKeepTheirMiddle(t *testing.T) {
	// She is the same colour as the backdrop here, so colour cannot be what says where
	// she ends. Only the rim is doubted; a pixel well inside the mask stays hers.
	const w, h = 32, 32
	rgb := bytes.Repeat([]byte{250}, w*h*3)
	mask := make([]uint8, w*h)
	for y := 8; y < 24; y++ {
		for x := 8; x < 24; x++ {
			mask[y*w+x] = 255
		}
	}
	dst := make([]byte, w*h*4)
	var e edgeWork
	e.composeEdge(dst, rgb, mask, w, h)
	at := (16*w + 16) * 4
	if dst[at] != 250 || dst[at+3] != 255 {
		t.Fatalf("middle of her is rgb %d alpha %d", dst[at], dst[at+3])
	}
}

func TestABusyBackgroundIsNotTakenForABackdrop(t *testing.T) {
	// Over a room, a rim pixel that happens to match the average of the room is hers.
	const w, h = 16, 16
	rgb := make([]byte, w*h*3)
	for i := range rgb {
		rgb[i] = byte(i * 37)
	}
	if _, _, flat := backdropOf(rgb, make([]uint8, w*h)); flat {
		t.Fatal("a noisy background read as flat")
	}
}

func TestAFrameWithoutHerIsClearAndDoesNotPanic(t *testing.T) {
	const w, h = 8, 8
	dst := make([]byte, w*h*4)
	var e edgeWork
	e.composeEdge(dst, bytes.Repeat([]byte{255}, w*h*3), make([]uint8, w*h), w, h)
	for i := 3; i < len(dst); i += 4 {
		if dst[i] != 0 {
			t.Fatalf("alpha %d in an empty frame", dst[i])
		}
	}
}

// hairFrame is a band of hair on a white backdrop, with a gap two pixels wide down its
// middle that is half hair, half backdrop: what a gap between strands becomes once a
// clip has softened and smeared it. mask is how sure the model is of the hair and of
// the gap.
func hairFrame(w, h int, hair, gap uint8) (rgb []byte, mask []uint8) {
	rgb, mask = make([]byte, w*h*3), make([]uint8, w*h)
	strand := [3]byte{200, 90, 20}
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			i := y*w + x
			c := [3]byte{255, 255, 255}
			switch {
			case x == 15 || x == 16:
				for k := range c {
					c[k] = byte((int(strand[k]) + 255) / 2)
				}
				mask[i] = gap
			case x >= 4 && x < 28:
				c = strand
				mask[i] = hair
			}
			copy(rgb[i*3:], c[:])
		}
	}
	return rgb, mask
}

func TestAGapBetweenStrandsTheModelFillsIsNotLeftWhite(t *testing.T) {
	const w, h = 32, 16
	rgb, mask := hairFrame(w, h, 255, 235)
	dst := make([]byte, w*h*4)
	var e edgeWork
	e.composeEdge(dst, rgb, mask, w, h)
	at := (8*w + 15) * 4
	if a := dst[at+3]; a < 90 || a > 170 {
		t.Fatalf("a gap that is half backdrop has alpha %d; it should be about half", a)
	}
	if r, g, b := dst[at], dst[at+1], dst[at+2]; r != 200 || g != 90 || b != 20 {
		t.Fatalf("the gap shows rgb %d,%d,%d: the white it was mixed with is still in it", r, g, b)
	}
	if mid := (8*w + 8) * 4; dst[mid+3] != 255 || dst[mid] != 200 {
		t.Fatalf("the hair beside the gap is rgb %d alpha %d", dst[mid], dst[mid+3])
	}
}

func TestPaleColoursSheIsSureOfAreNotTakenApart(t *testing.T) {
	// Pale skin is orange hair mixed with white, to within a few levels. Where the model
	// is sure, well inside her, a pale colour is hers and stays solid.
	const w, h = 32, 16
	rgb, mask := hairFrame(w, h, 255, 255)
	for y := 0; y < h; y++ {
		for _, x := range []int{15, 16} {
			copy(rgb[(y*w+x)*3:], []byte{250, 215, 190})
		}
	}
	dst := make([]byte, w*h*4)
	var e edgeWork
	e.composeEdge(dst, rgb, mask, w, h)
	at := (8*w + 15) * 4
	if dst[at+3] != 255 || dst[at] != 250 || dst[at+1] != 215 {
		t.Fatalf("a pale highlight she is sure of became rgb %d,%d alpha %d", dst[at], dst[at+1], dst[at+3])
	}
}

func TestBackdropShowingThroughHerIsClearedWhereTheModelDoubtsIt(t *testing.T) {
	const w, h = 32, 16
	rgb, mask := hairFrame(w, h, 255, 230)
	for y := 0; y < h; y++ {
		for _, x := range []int{15, 16} {
			copy(rgb[(y*w+x)*3:], []byte{255, 255, 255})
		}
	}
	dst := make([]byte, w*h*4)
	var e edgeWork
	e.composeEdge(dst, rgb, mask, w, h)
	if a := dst[(8*w+15)*4+3]; a != 0 {
		t.Fatalf("white the model doubts, inside her hair, kept alpha %d", a)
	}
}

func TestHerOwnWhiteTheModelIsSureOfIsKeptWhole(t *testing.T) {
	// A trim or a drawstring is the backdrop's colour exactly, and the model is sure of
	// it all the way across. So are the pixels where it meets the rest of her.
	const w, h = 32, 16
	rgb, mask := hairFrame(w, h, 255, 255)
	for y := 0; y < h; y++ {
		for _, x := range []int{15, 16} {
			copy(rgb[(y*w+x)*3:], []byte{255, 255, 255})
		}
	}
	dst := make([]byte, w*h*4)
	var e edgeWork
	e.composeEdge(dst, rgb, mask, w, h)
	for _, x := range []int{14, 15, 16, 17} {
		at := (8*w + x) * 4
		if dst[at+3] != 255 {
			t.Fatalf("(%d,8) of her trim and what borders it has alpha %d", x, dst[at+3])
		}
	}
	if at := (8*w + 15) * 4; dst[at] != 255 {
		t.Fatalf("her white trim was recoloured to %d", dst[at])
	}
}

func TestTheAlphaIsSteadiedWhereItShimmersButNotWhereSheMoves(t *testing.T) {
	var e edgeWork
	first := []byte{0, 0, 0, 100, 0, 0, 0, 255}
	e.steadyAlpha(first, true)
	next := []byte{0, 0, 0, 120, 0, 0, 0, 0}
	e.steadyAlpha(next, false)
	if a := next[3]; a <= 100 || a >= 120 {
		t.Fatalf("a shimmer of 20 became %d", a)
	}
	if a := next[7]; a != 0 {
		t.Fatalf("where she moved away the alpha was held at %d: a ghost", a)
	}
}
