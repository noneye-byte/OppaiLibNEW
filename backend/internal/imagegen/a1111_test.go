package imagegen

import (
	"bytes"
	"context"
	"encoding/json"
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
