package matte

import "testing"

func TestTheGridsCellsFallWhereANearestNeighbourEnlargementPutsThem(t *testing.T) {
	// The picture's own size: every cell is the size sd-pixel shrank by.
	at := cellOf(832, 104)
	for x, c := range at {
		if int(c) != x/8 {
			t.Fatalf("pixel %d is in cell %d, want %d", x, c, x/8)
		}
	}
	// Wan's size: the same 104 cells across, every one of them used, left to right.
	at = cellOf(480, 104)
	seen := map[int32]bool{}
	for x := 1; x < len(at); x++ {
		if at[x] < at[x-1] || at[x]-at[x-1] > 1 {
			t.Fatalf("cells jump at pixel %d: %d then %d", x, at[x-1], at[x])
		}
		seen[at[x]] = true
	}
	if len(seen) != 104 || at[0] != 0 || at[479] != 103 {
		t.Fatalf("%d cells used, from %d to %d", len(seen), at[0], at[479])
	}
}

// softFrame is a straight-RGBA w×h frame: transparent, with a solid red block from
// x0 to x1 whose left column is half solid.
func softFrame(w, h, x0, x1 int, edge uint8) []byte {
	f := make([]byte, w*h*4)
	for y := 0; y < h; y++ {
		for x := x0; x < x1; x++ {
			p := f[(y*w+x)*4:]
			p[0], p[3] = 220, 255
			if x == x0 {
				p[3] = edge
			}
		}
	}
	return f
}

func TestEveryCellIsOneColourAndEitherHerOrNot(t *testing.T) {
	const w, h = 16, 16
	f := softFrame(w, h, 3, 13, 128)
	var g gridWork
	g.snap(f, w, h, Grid{Cols: 4, Rows: 4})
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			p, first := f[(y*w+x)*4:], f[(y/4*4*w+x/4*4)*4:]
			if p[3] != 0 && p[3] != 255 {
				t.Fatalf("pixel %d,%d is alpha %d", x, y, p[3])
			}
			if p[0] != first[0] || p[3] != first[3] {
				t.Fatalf("pixel %d,%d differs from its cell", x, y)
			}
		}
	}
	// Cell 0 has one column in four of her, at half: empty. Cell 1 is three quarters
	// her: solid, in her colour, with nothing of the transparency mixed in.
	if f[3] != 0 || f[(4)*4+3] != 255 || f[(4)*4] != 220 {
		t.Fatalf("cells came out %v and %v", f[0:4], f[16:20])
	}
}

func TestACellAtHerEdgeDoesNotBlinkBetweenFrames(t *testing.T) {
	const w, h = 8, 8
	var g gridWork
	grid := Grid{Cols: 2, Rows: 2}
	// Her edge is the middle of the left cells: 4 of 4 columns, then 2.
	g.snap(softFrame(w, h, 0, 8, 255), w, h, grid)
	f := softFrame(w, h, 2, 8, 255)
	f2 := append([]byte(nil), f...)
	g.snap(f, w, h, grid)
	if f[3] != 255 {
		t.Fatal("a cell half her emptied the frame after it was full")
	}
	// The same half-full cell coming from empty stays empty.
	var fresh gridWork
	fresh.snap(softFrame(w, h, 4, 8, 255), w, h, grid)
	fresh.snap(f2, w, h, grid)
	if f2[3] != 0 {
		t.Fatal("a cell half her filled the frame after it was empty")
	}
}
