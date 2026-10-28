package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	pngenc "image/png"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

func TestABucketIsThePicturesShapeFillingTheResolutionInSixtyFours(t *testing.T) {
	cases := []struct{ w, h, res, bw, bh int }{
		{512, 768, 1024, 832, 1216},   // 2:3, as SDXL's own portrait bucket
		{400, 400, 1024, 1024, 1024},  // a small square grows to the whole of it
		{4000, 3000, 1024, 1152, 832}, // a photo shrinks into it
		{300, 450, 512, 384, 576},     // SD 1.5
		{100, 2000, 1024, 256, 2048},  // a strip held at the smallest side the trainer takes
	}
	for _, c := range cases {
		bw, bh := loraBucket(c.w, c.h, c.res)
		if bw != c.bw || bh != c.bh {
			t.Errorf("%d×%d at %d = %d×%d, want %d×%d", c.w, c.h, c.res, bw, bh, c.bw, c.bh)
		}
		if bw%64 != 0 || bh%64 != 0 || bw*bh > c.res*c.res {
			t.Errorf("%d×%d at %d: %d×%d is not a bucket", c.w, c.h, c.res, bw, bh)
		}
	}
}

func TestTheUpscalerIsAnAnimeEsrganBeforeAnyGeneralOneAndNeverAResampler(t *testing.T) {
	if got := loraPickUpscaler([]string{"Lanczos", "Nearest", "ESRGAN_4x", "R-ESRGAN 4x+ Anime6B"}); got != "R-ESRGAN 4x+ Anime6B" {
		t.Errorf("got %q", got)
	}
	if got := loraPickUpscaler([]string{"Lanczos", "SwinIR_4x"}); got != "SwinIR_4x" {
		t.Errorf("got %q", got)
	}
	if got := loraPickUpscaler([]string{"Lanczos", "Nearest"}); got != "" {
		t.Errorf("a resampler was picked: %q", got)
	}
}

func TestAFittedPictureIsCroppedFromTheMiddleAndItsTransparencyLaidOnWhite(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 300, 100))
	for x := 100; x < 200; x++ {
		for y := 0; y < 100; y++ {
			src.Set(x, y, color.NRGBA{200, 0, 0, 255})
		}
	}
	out := loraFitImage(src, 128, 128)
	if b := out.Bounds(); b.Dx() != 128 || b.Dy() != 128 {
		t.Fatalf("size %v", b)
	}
	// The middle third was red and is what is left of the width.
	if r, g, _, _ := out.At(64, 64).RGBA(); r>>8 < 180 || g>>8 > 20 {
		t.Errorf("middle = %v, want red", out.At(64, 64))
	}
	// The clear background either side came out white, not black.
	wide := loraFitImage(src, 384, 128)
	if r, g, b, _ := wide.At(5, 64).RGBA(); r>>8 < 250 || g>>8 < 250 || b>>8 < 250 {
		t.Errorf("edge = %v, want white", wide.At(5, 64))
	}
}

// upscalingA1111 is an Automatic1111 whose extras upscaler makes a picture bigger
// by the factor it is asked for, and remembers what it was asked.
type upscalingA1111 struct {
	mu       sync.Mutex
	upscaler string
	scale    float64
}

func newUpscalingA1111(t *testing.T, u *upscalingA1111) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			_, _ = w.Write([]byte(`[{"title":"anything-v5.safetensors [abc]","model_name":"anything-v5"}]`))
		case "/sdapi/v1/upscalers":
			_, _ = w.Write([]byte(`[{"name":"None"},{"name":"Lanczos"},{"name":"R-ESRGAN 4x+ Anime6B"}]`))
		case "/sdapi/v1/extra-single-image":
			var body struct {
				Image    string  `json:"image"`
				Scale    float64 `json:"upscaling_resize"`
				Upscaler string  `json:"upscaler_1"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			raw, _ := base64.StdEncoding.DecodeString(body.Image)
			src, _, err := image.Decode(bytes.NewReader(raw))
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			u.mu.Lock()
			u.upscaler, u.scale = body.Upscaler, body.Scale
			u.mu.Unlock()
			b := src.Bounds()
			big := pngOf(t, int(float64(b.Dx())*body.Scale), int(float64(b.Dy())*body.Scale), 9)
			_, _ = w.Write([]byte(`{"image":"` + base64.StdEncoding.EncodeToString(big) + `"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestASmallPictureReachesTheTrainerUpscaledByTheGeneratorToItsBucket(t *testing.T) {
	s, _ := newTestServer(t)
	u := &upscalingA1111{}
	gen := newUpscalingA1111(t, u)
	enableImageGen(t, s, gen.URL)
	ctx := context.Background()

	fit := s.trainFitFor(ctx, gen.URL, trainRequest{Base: "anything-v5.safetensors [abc]"})
	if fit.Resolution != 1024 || fit.Upscaler != "R-ESRGAN 4x+ Anime6B" {
		t.Fatalf("fit = %+v", fit)
	}

	data, ext := s.trainFitPicture(ctx, fit, pngOf(t, 300, 450, 4))
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || ext != ".png" || cfg.Width != 832 || cfg.Height != 1216 {
		t.Fatalf("sent %s %d×%d (%v), want an 832×1216 PNG", ext, cfg.Width, cfg.Height, err)
	}
	u.mu.Lock()
	if u.upscaler != "R-ESRGAN 4x+ Anime6B" || u.scale != 3 {
		t.Errorf("asked the generator for %q ×%v, want the anime upscaler ×3", u.upscaler, u.scale)
	}
	u.upscaler = ""
	u.mu.Unlock()

	// One that needs only a little more is resampled here, with no round trip.
	data, _ = s.trainFitPicture(ctx, fit, pngOf(t, 800, 1170, 4))
	cfg, _, _ = image.DecodeConfig(bytes.NewReader(data))
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.upscaler != "" || cfg.Width != 832 || cfg.Height != 1216 {
		t.Errorf("a near-enough picture: asked %q, sent %d×%d", u.upscaler, cfg.Width, cfg.Height)
	}
}

func TestAPictureAlreadyAtItsBucketIsSentAsItCame(t *testing.T) {
	s, _ := newTestServer(t)
	var buf bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 832, 1216))
	for i := range img.Pix {
		img.Pix[i] = 255
	}
	_ = pngenc.Encode(&buf, img)
	in := buf.Bytes()
	out, ext := s.trainFitPicture(context.Background(), trainFit{Resolution: 1024}, in)
	if ext != ".png" || !bytes.Equal(in, out) {
		t.Fatalf("re-encoded a picture that was already right")
	}
}

func TestAnSD1CheckpointFitsTo512AndNoFitSendsThePicturesAsTheyAre(t *testing.T) {
	if !trainLooksSD1("SD 1.5 anything-v5") || trainLooksSD1("SDXL 1.0 pony") || trainLooksSD1("Illustrious") {
		t.Fatal("families misread")
	}
	s, _ := newTestServer(t)
	if fit := s.trainFitFor(context.Background(), "http://127.0.0.1:1", trainRequest{NoFit: true}); fit.Resolution != 0 {
		t.Fatalf("noFit still fits: %+v", fit)
	}
	if fit := s.trainFitFor(context.Background(), "http://127.0.0.1:1", trainRequest{LowVRAM: true}); fit.Resolution != 768 {
		t.Fatalf("low VRAM = %+v", fit)
	}
}
