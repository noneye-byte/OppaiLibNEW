package matte

import (
	"context"
	"errors"
	"image"
	"image/color"
	"testing"
)

func TestALandscapePictureSitsInTheMiddleOfTheSquare(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 200, 100))
	for i := range img.Pix {
		img.Pix[i] = 255
	}
	in, box := letterbox(img, 64)
	if box != image.Rect(0, 16, 64, 48) {
		t.Fatalf("box = %v, want the middle half", box)
	}
	plane := 64 * 64
	if in[0] != 0 || in[plane+15*64] != 0 {
		t.Fatal("the padding above the picture should be black")
	}
	if in[20*64+10] != 1 || in[2*plane+40*64+63] != 1 {
		t.Fatal("the picture should read as 1 in every channel")
	}
}

func TestTheMaskComesBackAtThePicturesOwnSize(t *testing.T) {
	side := 32
	out := make([]float32, side*side)
	// Her in the left half of the letterboxed picture.
	for y := 8; y < 24; y++ {
		for x := 0; x < 16; x++ {
			out[y*side+x] = 1
		}
	}
	mask := unletterbox(out, side, image.Rect(0, 8, 32, 24), 100, 50)
	if mask.Bounds().Dx() != 100 || mask.Bounds().Dy() != 50 {
		t.Fatalf("mask is %v", mask.Bounds())
	}
	if mask.GrayAt(10, 25).Y < 250 || mask.GrayAt(90, 25).Y > 5 {
		t.Fatalf("left %d, right %d — the left half is her", mask.GrayAt(10, 25).Y, mask.GrayAt(90, 25).Y)
	}
}

func TestAnExportThatEndsAtLogitsIsSquashed(t *testing.T) {
	out := []float32{-8, 8, 0, 8}
	mask := unletterbox(out, 2, image.Rect(0, 0, 2, 2), 2, 2)
	if got := mask.Pix; got[0] > 1 || got[1] < 254 || got[2] < 126 || got[2] > 129 {
		t.Fatalf("mask %v, want sigmoid of the logits", got)
	}
}

func TestMaskRunsTheModelOnTheLetterboxedPicture(t *testing.T) {
	m := NewFunc(16, func(in []float32, side int) ([]float32, error) {
		// Her wherever the red channel is bright.
		out := make([]float32, side*side)
		for i := range out {
			out[i] = in[i]
		}
		return out, nil
	})
	img := image.NewRGBA(image.Rect(0, 0, 16, 16))
	for y := 0; y < 16; y++ {
		for x := 0; x < 16; x++ {
			if x < 8 {
				img.Set(x, y, color.RGBA{255, 0, 0, 255})
			} else {
				img.Set(x, y, color.RGBA{0, 0, 255, 255})
			}
		}
	}
	mask, err := m.Mask(context.Background(), img)
	if err != nil {
		t.Fatal(err)
	}
	if mask.GrayAt(2, 2).Y != 255 || mask.GrayAt(13, 2).Y != 0 {
		t.Fatalf("red side %d, blue side %d", mask.GrayAt(2, 2).Y, mask.GrayAt(13, 2).Y)
	}
	cut := Cut(img, mask)
	if cut.NRGBAAt(2, 2).A != 255 || cut.NRGBAAt(13, 2).A != 0 {
		t.Fatal("the cutout should keep her and drop the rest")
	}
}

func TestAMissingModelSaysWhatIsMissing(t *testing.T) {
	m := New("/nowhere/isnetis.onnx")
	if m.Problem() == "" {
		t.Fatal("a model that isn't there is a problem")
	}
	if _, err := m.Mask(context.Background(), image.NewRGBA(image.Rect(0, 0, 4, 4))); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("err = %v, want ErrUnavailable", err)
	}
}

func TestFrameRatesAreReadAsFfprobeWritesThem(t *testing.T) {
	for r, want := range map[string]bool{"16/1": true, "30000/1001": true, "0/0": false, "": false, "24": true, "1000/1": false} {
		if got := goodRate(r); got != want {
			t.Errorf("goodRate(%q) = %v, want %v", r, got, want)
		}
	}
}
