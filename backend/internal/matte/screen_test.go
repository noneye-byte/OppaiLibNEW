package matte

import "testing"

// screenAt is a green screen as Wan draws one: not flat, but lit brighter at the top
// than the bottom.
func screenAt(y, h int) [3]byte {
	return [3]byte{30, byte(250 - 80*y/h), 40}
}

// screenHair is hairFrame on that screen: a band of hair, with a gap two pixels wide
// down its middle that is half hair, half the screen behind it.
func screenHair(w, h int, hair, gap uint8) (rgb []byte, mask []uint8) {
	rgb, mask = make([]byte, w*h*3), make([]uint8, w*h)
	strand := [3]byte{200, 90, 20}
	for y := 0; y < h; y++ {
		back := screenAt(y, h)
		for x := 0; x < w; x++ {
			i := y*w + x
			c := back
			switch {
			case x == 15 || x == 16:
				for k := range c {
					c[k] = byte((int(strand[k]) + int(back[k])) / 2)
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

func cut(rgb []byte, mask []uint8, w, h int) []byte {
	dst := make([]byte, w*h*4)
	var e edgeWork
	e.composeEdge(dst, rgb, mask, w, h)
	return dst
}

func TestAGapBetweenStrandsIsTakenApartAgainstTheScreenWhereItIs(t *testing.T) {
	const w, h = 32, 48
	rgb, mask := screenHair(w, h, 255, 235)
	dst := cut(rgb, mask, w, h)
	// Top and bottom: the screen behind the gap is a different green at each.
	for _, y := range []int{4, h - 4} {
		at := (y*w + 15) * 4
		if a := dst[at+3]; a < 100 || a > 160 {
			t.Fatalf("row %d: a gap that is half screen has alpha %d; it should be about half", y, a)
		}
		if r, g, b := dst[at], dst[at+1], dst[at+2]; r != 200 || g != 90 || b != 20 {
			t.Fatalf("row %d: the gap shows rgb %d,%d,%d, not her hair", y, r, g, b)
		}
	}
	for _, y := range []int{4, h - 4} {
		if a := dst[(y*w+1)*4+3]; a != 0 {
			t.Fatalf("row %d: the screen kept alpha %d", y, a)
		}
	}
}

func TestOnAScreenHerWhitesAreHersEvenWhereTheModelDoubtsThem(t *testing.T) {
	// The case a white backdrop cannot settle: white the model is unsure of, inside her.
	// On white it is cleared; on a screen it is no mix of her and the screen, so it stays.
	const w, h = 32, 16
	rgb, mask := screenHair(w, h, 255, 230)
	for y := 0; y < h; y++ {
		for _, x := range []int{15, 16} {
			copy(rgb[(y*w+x)*3:], []byte{252, 252, 252})
		}
	}
	dst := cut(rgb, mask, w, h)
	at := (8*w + 15) * 4
	if dst[at+3] != 255 || dst[at] != 252 || dst[at+1] != 252 || dst[at+2] != 252 {
		t.Fatalf("her white became rgb %d,%d,%d alpha %d", dst[at], dst[at+1], dst[at+2], dst[at+3])
	}
}

func TestTheScreensGlowOnHerEdgeComesOutButGreenInHerMiddleStays(t *testing.T) {
	const w, h = 40, 16
	rgb, mask := screenHair(w, h, 255, 255)
	grey, glow, eye := []byte{180, 180, 180}, []byte{180, 235, 180}, []byte{40, 170, 70}
	for y := 0; y < h; y++ {
		for x := 4; x < 28; x++ {
			c := grey
			switch {
			case x == 4 || x == 27:
				c = glow
			case x == 15 || x == 16:
				c = eye
			}
			copy(rgb[(y*w+x)*3:], c)
		}
	}
	dst := cut(rgb, mask, w, h)
	if at := (8*w + 4) * 4; dst[at+3] != 255 || dst[at+1] != 180 {
		t.Fatalf("the glow on her edge is rgb %d,%d,%d alpha %d", dst[at], dst[at+1], dst[at+2], dst[at+3])
	}
	if at := (8*w + 15) * 4; dst[at+3] != 255 || dst[at] != 40 || dst[at+1] != 170 || dst[at+2] != 70 {
		t.Fatalf("a green eye in her middle became rgb %d,%d,%d alpha %d", dst[at], dst[at+1], dst[at+2], dst[at+3])
	}
}

func TestAShadowOnTheScreenBesideHerIsClearedEvenWhereTheModelDoubtsIt(t *testing.T) {
	const w, h = 40, 16
	rgb, mask := screenHair(w, h, 255, 255)
	for y := 0; y < h; y++ {
		for x := 28; x < 32; x++ {
			copy(rgb[(y*w+x)*3:], []byte{15, 120, 20})
			mask[y*w+x] = 90
		}
	}
	dst := cut(rgb, mask, w, h)
	if a := dst[(8*w+29)*4+3]; a != 0 {
		t.Fatalf("a shadow on the screen kept alpha %d", a)
	}
}

func TestAScreenColouredThingSheIsSureOfIsKeptWhole(t *testing.T) {
	// A green ribbon: the screen's colour, and certain in the model's eyes all the way across.
	const w, h = 32, 16
	rgb, mask := screenHair(w, h, 255, 255)
	for y := 0; y < h; y++ {
		for _, x := range []int{15, 16} {
			copy(rgb[(y*w+x)*3:], []byte{30, 245, 40})
		}
	}
	dst := cut(rgb, mask, w, h)
	if at := (8*w + 15) * 4; dst[at+3] != 255 || dst[at+1] != 245 {
		t.Fatalf("her green ribbon became g %d alpha %d", dst[at+1], dst[at+3])
	}
}

func TestWhiteIsNotAScreen(t *testing.T) {
	for _, c := range []struct {
		b  [3]byte
		ch int
	}{{[3]byte{243, 244, 243}, -1}, {[3]byte{0, 0, 0}, -1}, {[3]byte{0, 255, 0}, 1}, {[3]byte{0, 64, 255}, 2}, {[3]byte{40, 170, 60}, 1}} {
		if got := screenChannel(c.b); got != c.ch {
			t.Errorf("%v is screen %d, want %d", c.b, got, c.ch)
		}
	}
}
