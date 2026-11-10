package matte

import "math"

// The edge of a cut clip.
//
// A sprite's clip is drawn on a flat white or black backdrop (the start frame is laid
// on one before it goes to the generator), and a mask alone does not get her off it.
// Three things left white in the cut, and each is answered here rather than papered
// over with a harder edge:
//
// Each frame's mask used to be blended with the last one's everywhere, to steady the
// rim. Where she had moved away that left a quarter of her old shape as alpha over the
// white behind it: a white ghost trailing every movement. Now only a small difference
// is steadied, which is what a shimmer is. A big one is her moving.
//
// The pixels under the transparency stayed white. Video keeps colour at half the
// resolution of alpha and a player scales both, so the colour of a hidden pixel bleeds
// into the visible one beside it. So nothing of the backdrop is left in the frame:
// whatever is not certainly her takes the colour of the nearest pixel that is.
//
// And the mask was taken as the alpha, which is where the white between her hair and
// the rest of her came from. A clip's frames are softer than a still, and a strand that
// sways is smeared across the frame, so the gaps between strands are no longer white
// but part hair, part backdrop. The model calls those pixels her, at 224–249 out of 255
// on the real model, and they were kept solid in their own washed-out colour. So the
// mask is now read as a verdict on where colour may decide, not as the alpha itself.
// The backdrop is known, so a pixel that is a mix of it and her can be taken apart
// exactly: what it shows is alpha·F + (1−alpha)·backdrop, where F is the colour of the
// nearest pixel that is certainly her. Alpha is what is left of her, and her colour
// replaces the mix.
//
// Colour alone would be wrong, which is why the model still decides where it may be
// used. Pale skin is, to within a few levels, orange hair mixed with white, and her
// own white (a trim, a drawstring, the glint in an eye) is the backdrop's colour
// exactly. On the real model her whites sit at 250 or more, so only a pixel the model
// doubts, or one right beside such a pixel, is taken apart. Backdrop-coloured pixels
// are judged as a patch: one the model doubts is backdrop, one it is sure of is hers.
//
// The numbers were checked against the real model (skytnt's anime-seg) on real sprite
// squares made into clip frames: Wan's size, its softness, a sway smeared across the
// frame, and lossy 4:2:0 compression. Not yet on a clip out of Wan itself.

const (
	// steady is how much of the previous frame's mask a flickering pixel keeps, and
	// steadyReach the largest difference that counts as flicker rather than movement.
	steady      = 0.25
	steadyReach = 40

	// clearBelow is the mask value at or under which a pixel is background whatever
	// its colour, and sureHer the value from which the model is taken at its word.
	clearBelow = 16
	sureHer    = 250

	// edgeFloor and edgeFull are the mask values that become fully clear and fully
	// solid when the mask is all there is to go on: a backdrop that is not flat, or a
	// pixel whose colour is no mix of the backdrop and her. A midpoint above half pulls
	// the edge in onto her.
	edgeFloor = 64
	edgeFull  = 224

	// coreInset is how far in from a pixel the model doubts a sure pixel can still be
	// part backdrop. Pixels deeper than that are the ones her colour is taken from.
	coreInset = 2

	// mixContrast is how far, as the summed difference of its channels, her colour has
	// to be from the backdrop's for a mix of the two to be told apart; mixResidual how
	// far off that line a pixel can be and still be a mix rather than a colour of her
	// own. mixLow and mixHigh are the shares of her that count as none and all, so the
	// backdrop's noise is not kept as a haze and her inside is not thinned.
	mixContrast = 60
	mixResidual = 48
	mixLow      = 0.03
	mixHigh     = 0.92

	// modelVote is the mask value from which colour alone decides how much of a doubted
	// pixel is her. Under it the model's doubt caps the answer: a shadow Wan draws under
	// her feet is grey, which is a mix of black shoes and white, and is not her.
	modelVote = 128

	// plateNearMin and plateNearMax bound how close to the backdrop a pixel has to be,
	// as the summed difference of its channels, to be its colour. Between them it is
	// three times the backdrop's own noise, which a compressed clip has plenty of.
	plateNearMin = 24
	plateNearMax = 60

	// backdropSpread is how much the pixels the mask calls background may vary, per
	// channel, and still be a flat backdrop. A room behind her is not one: colours in
	// it say nothing about what is mixed with what, and the mask alone decides.
	backdropSpread = 12

	// bleedReach is how many pixels her colour is carried out past her. Far enough for
	// the half-resolution colour and a player's scaling; the rest of the frame is one
	// flat colour, which costs the encoder nothing.
	bleedReach = 16
)

// steadied eases cur towards prev where the two differ by no more than a flicker.
func steadied(cur, prev []uint8) {
	for i, v := range cur {
		d := int(v) - int(prev[i])
		if d < 0 {
			d = -d
		}
		if d <= steadyReach {
			cur[i] = uint8(float64(v)*(1-steady) + float64(prev[i])*steady + 0.5)
		}
	}
}

// steadyAlpha steadies a composed frame's alpha against the last frame's, as steadied
// does the mask. The alpha at the edge is read partly off the colour now, and a
// compressed clip's colour shimmers from frame to frame where nothing moved.
func (e *edgeWork) steadyAlpha(rgba []byte, first bool) {
	n := len(rgba) / 4
	if len(e.alpha) != n {
		e.alpha = make([]uint8, n)
		first = true
	}
	for i := range e.alpha {
		a := rgba[i*4+3]
		if !first {
			d := int(a) - int(e.alpha[i])
			if d < 0 {
				d = -d
			}
			if d <= steadyReach {
				a = uint8(float64(a)*(1-steady) + float64(e.alpha[i])*steady + 0.5)
				rgba[i*4+3] = a
			}
		}
		e.alpha[i] = a
	}
}

// edgeAlpha is a mask value as the frame's alpha: edgeFloor to edgeFull stretched to
// the whole range.
func edgeAlpha(v uint8) uint8 {
	switch {
	case v <= edgeFloor:
		return 0
	case v >= edgeFull:
		return 255
	}
	return uint8((int(v) - edgeFloor) * 255 / (edgeFull - edgeFloor))
}

// vote is how much of a pixel the model allows to be her, whatever its colour says.
func vote(v uint8) uint8 {
	switch {
	case v <= clearBelow:
		return 0
	case v >= modelVote:
		return 255
	}
	return uint8((int(v) - clearBelow) * 255 / (modelVote - clearBelow))
}

// backdropOf is the colour of what the mask calls background, how close a pixel has to
// be to it to be its colour, and whether it is flat enough to be a backdrop at all.
func backdropOf(rgb []byte, mask []uint8) ([3]byte, int, bool) {
	var sum, sumSq [3]float64
	n := 0.0
	// Every few pixels: a backdrop is flat, which is the point.
	for i := 0; i < len(mask); i += 3 {
		if mask[i] > clearBelow {
			continue
		}
		for c := 0; c < 3; c++ {
			v := float64(rgb[i*3+c])
			sum[c] += v
			sumSq[c] += v * v
		}
		n++
	}
	var mean [3]byte
	if n < 16 {
		return mean, 0, false
	}
	flat := true
	spread := 0.0
	for c := 0; c < 3; c++ {
		m := sum[c] / n
		mean[c] = byte(m + 0.5)
		sd := math.Sqrt(max(sumSq[c]/n-m*m, 0))
		if sd > backdropSpread {
			flat = false
		}
		spread += sd
	}
	return mean, min(max(int(3*spread+0.5), plateNearMin), plateNearMax), flat
}

// What the mask and the colour together say a pixel is.
const (
	pxClear  = iota // background
	pxUnsure        // the model doubts it, and its colour is not the backdrop's
	pxSure          // the model is sure, and its colour is not the backdrop's
	pxWhite         // the backdrop's colour, in a patch the model is sure is her
	pxPlate         // the backdrop's colour, not yet judged
)

// edgeWork is the buffers one clip's frames share: a clip is a few hundred frames, each
// about a megapixel.
type edgeWork struct {
	class []uint8
	depth []uint8 // rings in from a doubted pixel, 1..coreInset (despillReach on a screen); 0 is deeper
	plate []float32 // a screen's colour at each pixel, three to a pixel (screen.go)
	src   []int32 // the nearest pixel certainly hers, -1 for none in reach
	alpha []uint8 // the last frame's alpha, for steadyAlpha
	queue []int32
	next  []int32
}

func (e *edgeWork) size(n int) {
	if len(e.class) != n {
		e.class, e.depth, e.src = make([]uint8, n), make([]uint8, n), make([]int32, n)
	}
}

// neighbours calls fn with each pixel beside i, staying inside a w×h frame.
func neighbours(i, w, h int, fn func(int)) {
	x := i % w
	if x > 0 {
		fn(i - 1)
	}
	if x < w-1 {
		fn(i + 1)
	}
	if i >= w {
		fn(i - w)
	}
	if i < w*(h-1) {
		fn(i + w)
	}
}

// composeEdge writes one frame as straight RGBA: her alpha, and in its colour nothing
// of the backdrop.
func (e *edgeWork) composeEdge(dst, rgb []byte, mask []uint8, w, h int) {
	n := w * h
	e.size(n)
	backdrop, plateNear, flat := backdropOf(rgb, mask)
	if ch := screenChannel(backdrop); ch >= 0 {
		e.composeScreen(dst, rgb, mask, w, h, ch)
		return
	}
	e.classify(mask, func(i int) bool { return flat && near(rgb[i*3:i*3+3], backdrop, plateNear) }, flat, w, h)
	e.inset(w, h, coreInset)
	e.spread(dst, rgb, w, h)
	back := [3]float64{float64(backdrop[0]), float64(backdrop[1]), float64(backdrop[2])}

	for i := 0; i < n; i++ {
		m := mask[i]
		a, own := uint8(0), false
		switch e.class[i] {
		case pxWhite:
			a, own = edgeAlpha(m), true
		case pxSure:
			a, own = 255, true
			if flat && e.inBand(i) && !e.besideWhite(i, w, h) {
				if t, ok := e.mixed(rgb, i, back, mixResidual, mixLow); ok {
					a, own = t, t == 255
				}
			}
		case pxUnsure:
			a = edgeAlpha(m)
			if flat && !e.besideWhite(i, w, h) {
				if t, ok := e.mixed(rgb, i, back, mixResidual, mixLow); ok {
					a = min(t, vote(m))
				}
			}
			own = a == 255
		}
		if own {
			dst[i*4], dst[i*4+1], dst[i*4+2] = rgb[i*3], rgb[i*3+1], rgb[i*3+2]
		}
		dst[i*4+3] = a
	}
}

// classify reads each pixel as the mask and its colour say; plate says whether a
// pixel is the backdrop's colour. A backdrop-coloured patch is judged whole, by the
// model's average over it: her white trim is sure in the model's eyes all the way
// across, and a gap between strands is not.
func (e *edgeWork) classify(mask []uint8, plate func(int) bool, flat bool, w, h int) {
	for i, m := range mask {
		switch {
		case m <= clearBelow:
			e.class[i] = pxClear
		case flat && plate(i):
			e.class[i] = pxPlate
		case m >= sureHer || !flat && m >= edgeFull:
			e.class[i] = pxSure
		default:
			e.class[i] = pxUnsure
		}
	}
	if !flat {
		return
	}
	for start := range mask {
		if e.class[start] != pxPlate {
			continue
		}
		// The patch is gathered first and judged after: its verdict depends on all of it.
		e.queue = append(e.queue[:0], int32(start))
		e.class[start] = pxClear
		total := 0
		for k := 0; k < len(e.queue); k++ {
			at := int(e.queue[k])
			total += int(mask[at])
			neighbours(at, w, h, func(j int) {
				if e.class[j] == pxPlate {
					e.class[j] = pxClear
					e.queue = append(e.queue, int32(j))
				}
			})
		}
		if total >= sureHer*len(e.queue) {
			for _, at := range e.queue {
				e.class[at] = pxWhite
			}
		}
	}
}

// inset marks the pixels within rings of one that is not certainly her. The first
// coreInset are the band that may be part backdrop, and so is not where her colour is
// taken from; a screen's cut looks further in, for its colour on her (screen.go).
func (e *edgeWork) inset(w, h, rings int) {
	e.queue = e.queue[:0]
	for i, c := range e.class {
		e.depth[i] = 0
		if c == pxClear || c == pxUnsure {
			e.queue = append(e.queue, int32(i))
		}
	}
	for ring := uint8(1); int(ring) <= rings && len(e.queue) > 0; ring++ {
		e.next = e.next[:0]
		for _, at := range e.queue {
			neighbours(int(at), w, h, func(j int) {
				if (e.class[j] == pxSure || e.class[j] == pxWhite) && e.depth[j] == 0 {
					e.depth[j] = ring
					e.next = append(e.next, int32(j))
				}
			})
		}
		e.queue, e.next = e.next, e.queue
	}
}

// spread finds, for every pixel near her, the nearest pixel certainly hers (a sure one
// clear of the band) and paints its colour there; the rest of the frame is one flat
// colour, hers on average. A pixel that keeps its own colour is painted over after.
func (e *edgeWork) spread(dst, rgb []byte, w, h int) {
	var sum [3]int64
	core := int64(0)
	e.queue = e.queue[:0]
	for i, c := range e.class {
		e.src[i] = -1
		if c != pxSure || e.inBand(i) {
			continue
		}
		e.src[i] = int32(i)
		p := rgb[i*3 : i*3+3]
		dst[i*4], dst[i*4+1], dst[i*4+2] = p[0], p[1], p[2]
		sum[0] += int64(p[0])
		sum[1] += int64(p[1])
		sum[2] += int64(p[2])
		core++
		e.queue = append(e.queue, int32(i))
	}
	for pass := 0; pass < bleedReach && len(e.queue) > 0; pass++ {
		e.next = e.next[:0]
		for _, at := range e.queue {
			from := int(at)
			neighbours(from, w, h, func(j int) {
				if e.src[j] < 0 {
					e.src[j] = e.src[from]
					dst[j*4], dst[j*4+1], dst[j*4+2] = dst[from*4], dst[from*4+1], dst[from*4+2]
					e.next = append(e.next, int32(j))
				}
			})
		}
		e.queue, e.next = e.next, e.queue
	}
	// A frame with none of her in it is black: there is nothing to bleed from.
	var fill [3]byte
	if core > 0 {
		fill = [3]byte{byte(sum[0] / core), byte(sum[1] / core), byte(sum[2] / core)}
	}
	for i, s := range e.src {
		if s < 0 {
			dst[i*4], dst[i*4+1], dst[i*4+2] = fill[0], fill[1], fill[2]
		}
	}
}

// inBand says whether pixel i is within coreInset of a pixel that is not certainly
// her: close enough to the edge to be part backdrop.
func (e *edgeWork) inBand(i int) bool { return e.depth[i] != 0 && e.depth[i] <= coreInset }

// mixed is how much of pixel i is her, read as a mix of the backdrop and the colour of
// the nearest pixel certainly hers. It is not a mix (ok false) when there is no such
// pixel in reach, when that colour is too near the backdrop's to tell the two apart, or
// when the pixel lies more than residual off the line between them: then it is a
// colour of hers. A share of her under low counts as none.
func (e *edgeWork) mixed(rgb []byte, i int, backdrop [3]float64, residual, low float64) (uint8, bool) {
	s := e.src[i]
	if s < 0 {
		return 0, false
	}
	var fb, cb [3]float64
	contrast, dot, den := 0.0, 0.0, 0.0
	for c := 0; c < 3; c++ {
		fb[c] = float64(rgb[int(s)*3+c]) - backdrop[c]
		cb[c] = float64(rgb[i*3+c]) - backdrop[c]
		contrast += math.Abs(fb[c])
		dot += cb[c] * fb[c]
		den += fb[c] * fb[c]
	}
	if contrast < mixContrast {
		return 0, false
	}
	t := min(max(dot/den, 0), 1)
	off := 0.0
	for c := 0; c < 3; c++ {
		off += math.Abs(cb[c] - t*fb[c])
	}
	if off > max(residual, mixResidual) {
		return 0, false
	}
	share := min(max((t-low)/(mixHigh-low), 0), 1)
	return uint8(share*255 + 0.5), true
}

// besideWhite says whether pixel i touches a patch of her own white. The pixels there
// are a mix of her white and her, not of the backdrop and her, and taking them apart
// would cut a seam around every trim and glint.
func (e *edgeWork) besideWhite(i, w, h int) bool {
	found := false
	neighbours(i, w, h, func(j int) {
		if e.class[j] == pxWhite {
			found = true
		}
	})
	return found
}

func near(p []byte, c [3]byte, within int) bool {
	d := 0
	for i := range c {
		v := int(p[i]) - int(c[i])
		if v < 0 {
			v = -v
		}
		d += v
	}
	return d <= within
}
