package matte

import "math"

// Cutting a clip drawn on a green or blue screen.
//
// On white, the cut is a judgement call wherever her colour comes near the backdrop's:
// her white trim and the glint in an eye are the backdrop exactly, and pale skin is
// orange hair mixed with white to within a few levels. edge.go makes those calls as
// well as the model allows, and it is still where a cut goes wrong. A saturated screen
// takes the question away. Nothing of hers is that green (or that blue), so a pixel is
// the screen, her, or a mix of the two, and a mix is told apart by how far it leans
// towards the screen, with hundreds of levels of contrast to read it by, not sixty.
//
// Wan does not hold a screen perfectly flat, though. It shades it, darkens a corner,
// lays a shadow under her feet, and the green it draws drifts from frame to frame. So
// the screen's colour is not one number for the frame but a plate: the colour of the
// screen around each pixel, read off the pixels the model calls background, block by
// block, and filled in behind her from the blocks beside. Each pixel at her edge is
// taken apart against the screen as it is right there.
//
// And a screen lights what stands in front of it. Wan paints a green rim on her where
// a camera would catch the screen's glow, and the half-resolution colour of a video
// carries the screen a pixel or two into her edge. That green is taken back out near
// the edge (despill): the screen's channel is held down to the larger of the other two,
// which leaves skin, hair, white and every colour that is not leaning towards the
// screen exactly as it was. Her middle is left alone, so green eyes stay green.
//
// What the model is sure of still decides where colour may: a screen-coloured patch
// it is certain of all the way across is something of hers (a green ribbon), and a
// pixel it calls background is background whatever its colour.

const (
	// screenLead is how far, in levels, the backdrop's strongest channel has to stand
	// over the larger of the other two for the backdrop to be a screen. White has none
	// of it and the screens OppaiLib draws have over 190.
	screenLead = 80

	// screenBlock is the side of the blocks the plate is read in.
	screenBlock = 16

	// screenNear is the share of the plate's lean, from which a pixel counts as the
	// screen: what is left is too little of her to keep.
	screenNear = 0.85

	// screenResidual is how far off the line between the screen and her colour a pixel
	// may be, as a share of the distance between the two, and still be a mix of them.
	// A screen is far from every colour of hers, and a compressed clip's colour at the
	// edge strays from the line by more than a white backdrop's tolerance allows.
	screenResidual = 0.15

	// screenShade is the share of the screen's lean from which a doubted pixel that is
	// no mix of her and the screen is still the screen: the screen in shadow, which is
	// darker but leans the same way, where none of her colours do.
	screenShade = 0.25

	// screenLow is the share of her under which a mix with the screen counts as none.
	// Video keeps colour at half the resolution, so her colour bleeds a pixel out into
	// the screen beside her, which reads as a little of her there: a haze round her.
	// On the real model and a real square made into clip frames, 0.10 cleared nearly all
	// of it (179 pixels to 14) for 33 more of her edge pixels thinned; higher thinned
	// her edge faster than it cleared anything.
	screenLow = 0.10

	// despillReach is how many pixels in from her edge the screen's glow is taken out.
	despillReach = 4
)

// lean is how far pixel p leans towards channel ch: that channel less the larger of
// the other two. Mixing her with the screen moves it in a straight line between her
// lean and the screen's.
func lean(p []byte, ch int) int {
	return int(p[ch]) - int(max(p[(ch+1)%3], p[(ch+2)%3]))
}

// screenChannel is the channel a backdrop is a screen of — 1 for green, 2 for blue — or
// -1 when it is not a screen.
func screenChannel(b [3]byte) int {
	for _, ch := range []int{1, 2} {
		if lean(b[:], ch) >= screenLead {
			return ch
		}
	}
	return -1
}

// screenPlate fills e.plate with the screen's colour around every pixel.
func (e *edgeWork) screenPlate(rgb []byte, mask []uint8, w, h, ch int) {
	n := w * h
	if len(e.plate) != n*3 {
		e.plate = make([]float32, n*3)
	}
	// What the model calls background and leans as the screen does on the whole. A
	// stray bit of her the model missed, or a deep shadow, would drag a block's colour
	// away from the screen's.
	var total, count float64
	for i, m := range mask {
		if m <= clearBelow {
			if l := lean(rgb[i*3:i*3+3], ch); l > 0 {
				total += float64(l)
				count++
			}
		}
	}
	floor := 0.0
	if count > 0 {
		floor = total / count / 2
	}
	bw, bh := (w+screenBlock-1)/screenBlock, (h+screenBlock-1)/screenBlock
	sum := make([][3]float64, bw*bh)
	got := make([]float64, bw*bh)
	var all [3]float64
	allN := 0.0
	for i, m := range mask {
		p := rgb[i*3 : i*3+3]
		if m > clearBelow || float64(lean(p, ch)) < floor {
			continue
		}
		b := (i/w/screenBlock)*bw + (i%w)/screenBlock
		for c := 0; c < 3; c++ {
			sum[b][c] += float64(p[c])
			all[c] += float64(p[c])
		}
		got[b]++
		allN++
	}
	val := make([][3]float64, bw*bh)
	have := make([]bool, bw*bh)
	any := false
	for b := range val {
		// A block needs a few pixels of screen to say what it is; one or two at the
		// edge of her are mostly her colour bled in.
		if got[b] >= 8 {
			for c := 0; c < 3; c++ {
				val[b][c] = sum[b][c] / got[b]
			}
			have[b], any = true, true
		}
	}
	if !any {
		for b := range val {
			for c := 0; c < 3; c++ {
				if allN > 0 {
					val[b][c] = all[c] / allN
				}
			}
			have[b] = true
		}
	}
	// Behind her, a ring of blocks at a time, from the blocks beside.
	for {
		next := append([]bool(nil), have...)
		filled := false
		for by := 0; by < bh; by++ {
			for bx := 0; bx < bw; bx++ {
				b := by*bw + bx
				if have[b] {
					continue
				}
				var s [3]float64
				k := 0.0
				for dy := -1; dy <= 1; dy++ {
					for dx := -1; dx <= 1; dx++ {
						x, y := bx+dx, by+dy
						if x < 0 || y < 0 || x >= bw || y >= bh || !have[y*bw+x] {
							continue
						}
						for c := 0; c < 3; c++ {
							s[c] += val[y*bw+x][c]
						}
						k++
					}
				}
				if k > 0 {
					for c := 0; c < 3; c++ {
						val[b][c] = s[c] / k
					}
					next[b], filled = true, true
				}
			}
		}
		have = next
		if !filled {
			break
		}
	}
	// Between block centres, so the plate has no steps in it.
	cell := func(f float64, last int) (int, int, float64) {
		f = f/screenBlock - 0.5
		lo := int(math.Floor(f))
		t := f - float64(lo)
		if lo < 0 {
			return 0, 0, 0
		}
		if lo >= last {
			return last, last, 0
		}
		return lo, lo + 1, t
	}
	for y := 0; y < h; y++ {
		y0, y1, ty := cell(float64(y)+0.5, bh-1)
		for x := 0; x < w; x++ {
			x0, x1, tx := cell(float64(x)+0.5, bw-1)
			i := y*w + x
			for c := 0; c < 3; c++ {
				top := val[y0*bw+x0][c]*(1-tx) + val[y0*bw+x1][c]*tx
				bottom := val[y1*bw+x0][c]*(1-tx) + val[y1*bw+x1][c]*tx
				e.plate[i*3+c] = float32(top*(1-ty) + bottom*ty)
			}
		}
	}
}

// plateAt is the screen's colour around pixel i.
func (e *edgeWork) plateAt(i int) [3]float64 {
	return [3]float64{float64(e.plate[i*3]), float64(e.plate[i*3+1]), float64(e.plate[i*3+2])}
}

// onScreen says whether pixel i is the screen's colour: it leans towards the screen
// nearly as far as the screen there does.
func (e *edgeWork) onScreen(rgb []byte, i, ch int) bool {
	return e.leansLikeScreen(rgb, i, ch, screenNear)
}

// leansLikeScreen says whether pixel i leans towards the screen at least share as far
// as the screen around it does.
func (e *edgeWork) leansLikeScreen(rgb []byte, i, ch int, share float64) bool {
	p := e.plateAt(i)
	return float64(lean(rgb[i*3:i*3+3], ch)) >= share*(p[ch]-max(p[(ch+1)%3], p[(ch+2)%3]))
}

// keyed is how much of pixel i is her, against the screen around it: mixed, with the
// tolerance a screen's contrast affords.
func (e *edgeWork) keyed(rgb []byte, i int) (uint8, bool) {
	s := e.src[i]
	if s < 0 {
		return 0, false
	}
	b := e.plateAt(i)
	gap := 0.0
	for c := 0; c < 3; c++ {
		gap += math.Abs(float64(rgb[int(s)*3+c]) - b[c])
	}
	return e.mixed(rgb, i, b, screenResidual*gap, screenLow)
}

// composeScreen is composeEdge for a frame drawn on a screen of channel ch.
func (e *edgeWork) composeScreen(dst, rgb []byte, mask []uint8, w, h, ch int) {
	n := w * h
	e.size(n)
	e.screenPlate(rgb, mask, w, h, ch)
	e.classify(mask, func(i int) bool { return e.onScreen(rgb, i, ch) }, true, w, h)
	e.inset(w, h, despillReach)
	e.spread(dst, rgb, w, h)
	for i := 0; i < n; i++ {
		m := mask[i]
		a, own := uint8(0), false
		beside := false
		switch e.class[i] {
		case pxWhite:
			a, own = edgeAlpha(m), true
		case pxSure:
			a, own = 255, true
			if e.inBand(i) {
				if beside = e.besideWhite(i, w, h); !beside {
					if t, ok := e.keyed(rgb, i); ok {
						a, own = t, t == 255
					}
				}
			}
		case pxUnsure:
			a = edgeAlpha(m)
			if beside = e.besideWhite(i, w, h); !beside {
				if t, ok := e.keyed(rgb, i); ok {
					a = min(t, vote(m))
				} else if e.leansLikeScreen(rgb, i, ch, screenShade) {
					a = 0
				}
			}
			own = a == 255
		}
		if own {
			dst[i*4], dst[i*4+1], dst[i*4+2] = rgb[i*3], rgb[i*3+1], rgb[i*3+2]
		}
		dst[i*4+3] = a
		// Her middle keeps its colour, and so does whatever of hers is the screen's
		// colour and what touches it; everything nearer the screen loses its glow,
		// including the colour hidden under the transparency, which video bleeds out.
		deep := e.class[i] == pxSure && e.depth[i] == 0
		if !deep && !beside && e.class[i] != pxWhite {
			despill(dst[i*4:i*4+3], ch)
		}
	}
}

// despill holds channel ch of a colour down to the larger of the other two: the screen's
// glow comes out, and a colour that does not lean towards the screen is unchanged.
func despill(p []byte, ch int) {
	if other := max(p[(ch+1)%3], p[(ch+2)%3]); p[ch] > other {
		p[ch] = other
	}
}
