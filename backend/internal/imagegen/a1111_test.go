package imagegen

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBlackGenerationDetection(t *testing.T) {
	makePNG := func(c color.Color) []byte {
		img := image.NewRGBA(image.Rect(0, 0, 8, 8))
		for y := 0; y < 8; y++ {
			for x := 0; x < 8; x++ {
				img.Set(x, y, c)
			}
		}
		var out bytes.Buffer
		_ = png.Encode(&out, img)
		return out.Bytes()
	}
	if !containsBlackImage(&GenerateResult{Images: [][]byte{makePNG(color.Black)}}) {
		t.Fatal("uniform black PNG was not detected")
	}
	if containsBlackImage(&GenerateResult{Images: [][]byte{makePNG(color.RGBA{R: 8, G: 3, B: 2, A: 255})}}) {
		t.Fatal("dark but non-black PNG was rejected")
	}
}

func TestA1111DetailerPayloadAndDetection(t *testing.T) {
	var payload map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v1/app/version":
			http.NotFound(w, r)
		case "/sdapi/v1/scripts":
			fmt.Fprint(w, `{"txt2img":["ADetailer"]}`)
		case "/sdapi/v1/txt2img":
			_ = json.NewDecoder(r.Body).Decode(&payload)
			fmt.Fprint(w, `{"images":["aGVsbG8="],"info":"{\"seed\":1}"}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()
	c := New()
	if !c.SupportsADetailer(context.Background(), srv.URL) {
		t.Fatal("ADetailer script was not detected")
	}
	_, err := c.Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "portrait", Steps: 20, Width: 512, Height: 512, CfgScale: 7, Seed: 1, Count: 1,
		Detailer: Detailer{Enabled: true, Model: "hand_yolov8n.pt", Confidence: .4, Denoise: .5, MaskBlur: 6},
	})
	if err != nil {
		t.Fatal(err)
	}
	scripts, ok := payload["alwayson_scripts"].(map[string]any)
	if !ok || scripts["ADetailer"] == nil {
		t.Fatalf("ADetailer payload missing: %#v", payload)
	}
}

// fakeImg2Img is an A1111 that records the body of its img2img call.
func fakeImg2Img(t *testing.T, got *map[string]any) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sdapi/v1/img2img":
			_ = json.NewDecoder(r.Body).Decode(got)
			fmt.Fprint(w, `{"images":["aGVsbG8="],"info":"{\"seed\":7}"}`)
		case "/sdapi/v1/txt2img":
			t.Error("a picture to start from must go to img2img")
			http.Error(w, "wrong endpoint", http.StatusBadRequest)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestPaintingToFixRepaintsOnlyTheMaskAtFullSize(t *testing.T) {
	var payload map[string]any
	srv := fakeImg2Img(t, &payload)
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "detailed hand", Steps: 20, Width: 512, Height: 768, CfgScale: 7, Seed: 7, Count: 1,
		InitImage: []byte("picture"), Mask: []byte("mask"), MaskBlur: 8, Denoise: 0.6,
	})
	if err != nil {
		t.Fatal(err)
	}
	if payload["mask"] != "bWFzaw==" || payload["init_images"] == nil || payload["denoising_strength"] != 0.6 {
		t.Fatalf("payload = %#v", payload)
	}
	// "Original" fill and "only masked": the area starts from the picture and is drawn
	// at the whole size, not a 512-pixel canvas's worth of one hand.
	if payload["inpainting_fill"] != float64(1) || payload["inpaint_full_res"] != true || payload["mask_blur"] != float64(8) {
		t.Fatalf("payload = %#v", payload)
	}
}

func TestFixingFacesSkipsTheImg2ImgPassAndKeepsThePicture(t *testing.T) {
	var payload map[string]any
	srv := fakeImg2Img(t, &payload)
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "portrait", Steps: 20, Width: 512, Height: 512, CfgScale: 7, Seed: 7, Count: 1,
		InitImage: []byte("picture"), DetailOnly: true,
		Detailer: Detailer{Enabled: true, Model: "face_yolov8n.pt", Confidence: .3, Denoise: .4},
	})
	if err != nil {
		t.Fatal(err)
	}
	args := payload["alwayson_scripts"].(map[string]any)["ADetailer"].(map[string]any)["args"].([]any)
	if args[0] != true || args[1] != true {
		t.Fatalf("ADetailer args = %#v; the second is skip-img2img", args)
	}
	if _, saved := payload["save_images"]; saved {
		t.Fatal("only the studio asks for its pictures to be saved")
	}
}

func TestInvokeAIRefusesAMaskRatherThanIgnoringIt(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/app/version" {
			fmt.Fprint(w, `{"version":"5.6.0"}`)
			return
		}
		t.Errorf("nothing is sent once the mask is refused: %s", r.URL.Path)
		http.NotFound(w, r)
	}))
	defer srv.Close()
	_, err := New().Generate(context.Background(), srv.URL, GenerateRequest{
		Prompt: "x", InitImage: []byte("picture"), Mask: []byte("mask"),
	})
	if !errors.Is(err, ErrInpaintUnsupported) {
		t.Fatalf("err = %v", err)
	}
}
