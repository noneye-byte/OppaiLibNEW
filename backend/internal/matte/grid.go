package matte

// Putting a cut clip on a pixel-art sprite's grid.
//
// A sprite drawn as pixel art is made so by Forge's sd-pixel extension (imagegen's
// Pixel): the picture is shrunk to a grid of int(width/size) × int(height/size) cells
// and blown back up with nearest-neighbour, so every cell is one flat colour. Wan
// animates that picture but does not keep it: its frames come back at its own size,
// soft, with the cells smeared. And a picture's cutout is cut on the grid (web's
// cutout.ts), but a clip's is cut a pixel at a time. So the cut frames are put back on
// the same grid here: each cell takes the average of her colour in it, and is either
// her or not, as a pixel-art sprite's pixels are.
//
// The grid is given in cells, not pixels, because the clip is not the picture's size:
// a 104-cell-wide sprite is 104 cells wide whether Wan drew it 480 or 720 across. A
// cell is placed as the nearest-neighbour enlargement places it, so the clip's cells
// fall where the picture's did.
//
// The palette sd-pixel can limit a picture to is not applied: a palette chosen afresh
// for every frame would shift colours between frames, which is a flicker no pixel-art
// sprite has.

// Grid is a pixel-art sprite's cells, across and down.
type Grid struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}

// Active says whether there is a grid to snap to.
func (g Grid) Active() bool { return g.Cols > 1 && g.Rows > 1 }

const (
	// gridOn and gridOff are the share of a cell, out of 255, that has to be her for an
	// empty cell to fill and under which a filled one empties. Apart, so a cell at her
	// edge that is half her does not blink from frame to frame; the first frame takes
	// the halfway mark.
	gridOn  = 152
	gridOff = 104
)

// gridWork is what snapping keeps between one clip's frames.
type gridWork struct {
	on         []bool
	started    bool
	colOf      []int32
	rowOf      []int32
	sums       []float64 // per cell: alpha, then red, green, blue weighted by alpha
	pixels     []int32
	cols, rows int
}

// cellOf is the cell of each of n pixels across a side of cells cells: where a
// nearest-neighbour enlargement from cells to n takes each pixel from.
func cellOf(n, cells int) []int32 {
	out := make([]int32, n)
	for x := range out {
		out[x] = int32(min(cells-1, int((float64(x)+0.5)*float64(cells)/float64(n))))
	}
	return out
}

// snap puts one straight-RGBA frame of w×h onto the grid, in place.
func (g *gridWork) snap(rgba []byte, w, h int, grid Grid) {
	cols, rows := min(grid.Cols, w), min(grid.Rows, h)
	if len(g.colOf) != w || len(g.rowOf) != h || g.cols != cols || g.rows != rows {
		g.colOf, g.rowOf = cellOf(w, cols), cellOf(h, rows)
		g.cols, g.rows = cols, rows
		g.on, g.started = make([]bool, cols*rows), false
		g.sums, g.pixels = make([]float64, cols*rows*4), make([]int32, cols*rows)
	}
	clear(g.sums)
	clear(g.pixels)
	for y := 0; y < h; y++ {
		row := int(g.rowOf[y]) * cols
		for x := 0; x < w; x++ {
			c := row + int(g.colOf[x])
			p := rgba[(y*w+x)*4:]
			a := float64(p[3])
			s := g.sums[c*4:]
			s[0] += a
			s[1] += float64(p[0]) * a
			s[2] += float64(p[1]) * a
			s[3] += float64(p[2]) * a
			g.pixels[c]++
		}
	}
	colour := make([][4]byte, cols*rows)
	for c := range g.on {
		s := g.sums[c*4:]
		share := s[0] / float64(max(g.pixels[c], 1))
		switch {
		case !g.started:
			g.on[c] = share >= 128
		case g.on[c]:
			g.on[c] = share >= gridOff
		default:
			g.on[c] = share >= gridOn
		}
		colour[c][3] = 0
		if g.on[c] {
			colour[c][3] = 255
		}
		if s[0] > 0 {
			for k := 0; k < 3; k++ {
				colour[c][k] = byte(s[k+1]/s[0] + 0.5)
			}
		}
	}
	g.started = true
	for y := 0; y < h; y++ {
		row := int(g.rowOf[y]) * cols
		for x := 0; x < w; x++ {
			c := row + int(g.colOf[x])
			p := rgba[(y*w+x)*4 : (y*w+x)*4+4]
			if g.sums[c*4] > 0 {
				// A cell with nothing of her in it keeps the colour edge.go carried out
				// under the transparency, which is hers already.
				p[0], p[1], p[2] = colour[c][0], colour[c][1], colour[c][2]
			}
			p[3] = colour[c][3]
		}
	}
}
