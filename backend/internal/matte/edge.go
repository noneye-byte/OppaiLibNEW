package matte

// The edge of a cut clip.
//
// A sprite's clip is drawn on a flat white backdrop, and a mask alone does not get her
// off it. The model's edge is a few pixels of partial alpha, and the pixels there are
// part white, so laid over anything darker than the backdrop she wore a pale halo. It
// was worse than a mask's softness explains, for two more reasons, and each is fixed
// here rather than papered over with a harder edge:
//
// Each frame's mask used to be blended with the last one's everywhere, to steady the
// rim. Where she had moved away that left a quarter of her old shape as alpha over the
// white behind it: a literal white ghost trailing every movement. Now only a small
// difference is steadied, which is what a shimmer is. A big one is her moving.
//
// The pixels under the transparency stayed white. They look harmless, being invisible,
// but video keeps colour at half the resolution of alpha and a player scales both, so
// the colour of a hidden pixel bleeds into the visible one beside it. However clean the
// alpha, white under it comes back as a fringe. So nothing of the backdrop is left in
// the frame at all: everything that is not solidly her takes the colour of the nearest
// pixel that is. Alpha then decides what shows, and whatever it lets through is hers.
//
// These numbers have been checked against drawn test frames, not yet against the model
// on a real clip. If a cut comes out eaten or still fringed, edgeFloor and edgeFull are
// the ones to move.

const (
	// steady is how much of the previous frame's mask a flickering pixel keeps, and
	// steadyReach the largest difference that counts as flicker rather than movement.
	steady      = 0.25
	steadyReach = 40

	// edgeFloor and edgeFull are the mask values that become fully clear and fully
	// solid. The rim the model leaves reaches out past her onto the backdrop, so its
	// outer part is dropped; a midpoint above half pulls the edge in onto her.
	edgeFloor = 64
	edgeFull  = 224

	// edgeInset is how far in from the rim a solid pixel can still be partly backdrop:
	// a drawn edge is antialiased against the white, and the mask is not that exact.
	edgeInset = 2
	// backdropNear is how close to the backdrop such a pixel has to be, as the summed
	// difference of its channels, to be taken for backdrop rather than her.
	backdropNear = 48
	// backdropSpread is how much the pixels the mask calls background may vary, per
	// channel, and still be a flat backdrop. A room behind her is not one, and colours
	// in it say nothing about what is contaminated.
	backdropSpread = 12

	// bleedReach is how many pixels her colour is carried out past her. Far enough for
	// the half-resolution colour and a player's scaling; the rest of the frame is one
	// flat colour, which costs the encoder nothing.
	bleedReach = 12
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

// backdropOf is the colour of what the mask calls background, and whether it is flat
// enough to be a backdrop at all.
func backdropOf(rgb []byte, alpha []uint8) ([3]byte, bool) {
	var sum, sumSq [3]float64
	n := 0.0
	// Every few pixels: a backdrop is flat, which is the point.
	for i := 0; i < len(alpha); i += 3 {
		if alpha[i] != 0 {
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
		return mean, false
	}
	flat := true
	for c := 0; c < 3; c++ {
		m := sum[c] / n
		mean[c] = byte(m + 0.5)
		if sumSq[c]/n-m*m > backdropSpread*backdropSpread {
			flat = false
		}
	}
	return mean, flat
}

// edgeWork is the buffers one clip's frames share: a clip is a few hundred frames, each
// about a megapixel.
type edgeWork struct {
	alpha []uint8
	depth []uint8
	queue []int32
	next  []int32
}

func (e *edgeWork) size(n int) {
	if len(e.alpha) != n {
		e.alpha, e.depth = make([]uint8, n), make([]uint8, n)
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

const (
	edgeUnset = 0
	edgeRim   = 1 // within edgeInset of the rim, and so perhaps partly backdrop
	edgeDone  = 2 // has a colour of hers
)

// composeEdge writes one frame as straight RGBA: mask, tightened, as its alpha, and in
// its colour nothing of the backdrop.
func (e *edgeWork) composeEdge(dst, rgb []byte, mask []uint8, w, h int) {
	n := w * h
	e.size(n)
	for i, v := range mask {
		e.alpha[i] = edgeAlpha(v)
		e.depth[i] = edgeUnset
	}
	backdrop, flat := backdropOf(rgb, e.alpha)

	// The rim: solid pixels within edgeInset of anything that is not solid.
	e.queue = e.queue[:0]
	for i := 0; i < n; i++ {
		if e.alpha[i] == 255 {
			continue
		}
		e.depth[i] = edgeRim
		e.queue = append(e.queue, int32(i))
	}
	for pass := 0; pass < edgeInset; pass++ {
		e.next = e.next[:0]
		for _, at := range e.queue {
			neighbours(int(at), w, h, func(j int) {
				if e.alpha[j] == 255 && e.depth[j] == edgeUnset {
					e.depth[j] = edgeRim
					e.next = append(e.next, int32(j))
				}
			})
		}
		e.queue, e.next = e.next, e.queue
	}

	// What is certainly her: solid, and either clear of the rim or plainly not backdrop.
	var sum [3]int64
	solid := int64(0)
	e.queue = e.queue[:0]
	for i := 0; i < n; i++ {
		if e.alpha[i] != 255 {
			continue
		}
		p := rgb[i*3 : i*3+3]
		if e.depth[i] == edgeRim && flat && near(p, backdrop) {
			continue
		}
		e.depth[i] = edgeDone
		dst[i*4], dst[i*4+1], dst[i*4+2] = p[0], p[1], p[2]
		sum[0] += int64(p[0])
		sum[1] += int64(p[1])
		sum[2] += int64(p[2])
		solid++
		e.queue = append(e.queue, int32(i))
	}

	// Her colour carried outwards, a ring at a time, so each pixel gets the nearest.
	for pass := 0; pass < bleedReach && len(e.queue) > 0; pass++ {
		e.next = e.next[:0]
		for _, at := range e.queue {
			from := int(at)
			neighbours(from, w, h, func(j int) {
				if e.depth[j] != edgeDone {
					e.depth[j] = edgeDone
					dst[j*4], dst[j*4+1], dst[j*4+2] = dst[from*4], dst[from*4+1], dst[from*4+2]
					e.next = append(e.next, int32(j))
				}
			})
		}
		e.queue, e.next = e.next, e.queue
	}

	// The rest of the frame cannot be seen and is one flat colour, hers on average. A
	// frame with none of her in it is black: there is nothing to bleed from.
	var fill [3]byte
	if solid > 0 {
		fill = [3]byte{byte(sum[0] / solid), byte(sum[1] / solid), byte(sum[2] / solid)}
	}
	for i := 0; i < n; i++ {
		if e.depth[i] != edgeDone {
			dst[i*4], dst[i*4+1], dst[i*4+2] = fill[0], fill[1], fill[2]
		}
		dst[i*4+3] = e.alpha[i]
	}
}

func near(p []byte, c [3]byte) bool {
	d := 0
	for i := range c {
		v := int(p[i]) - int(c[i])
		if v < 0 {
			v = -v
		}
		d += v
	}
	return d <= backdropNear
}
