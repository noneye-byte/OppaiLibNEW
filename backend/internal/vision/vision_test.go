package vision

import (
	"context"
	"encoding/json"
	"image"
	"image/color"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func frame(w, h int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	img.Set(0, 0, color.RGBA{255, 0, 0, 255})
	return img
}

func TestDescribeSendsFramesAsDataURLsAndReadsTheReply(t *testing.T) {
	var got struct {
		Model    string `json:"model"`
		Messages []struct {
			Role    string           `json:"role"`
			Content []map[string]any `json:"content"`
		} `json:"messages"`
	}
	var auth, path string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth, path = r.Header.Get("Authorization"), r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&got)
		w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"  \"This image shows a woman in a red dress on a balcony at sunset.\"  "}}]}`))
	}))
	defer srv.Close()

	// Either form of the URL works, as it does for the chat backend.
	c := New(srv.URL+"/v1/", "qwen2.5vl", "secret")
	text, err := c.Describe(context.Background(), Request{
		Frames: []image.Image{frame(4000, 2000), frame(10, 10)}, Kind: "video", Tags: []string{"red dress", "sunset"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if text != "A woman in a red dress on a balcony at sunset." {
		t.Fatalf("description = %q", text)
	}
	if auth != "Bearer secret" || path != "/v1/chat/completions" || got.Model != "qwen2.5vl" {
		t.Fatalf("request: auth=%q path=%q model=%q", auth, path, got.Model)
	}
	content := got.Messages[0].Content
	if len(content) != 3 || content[0]["type"] != "text" || content[1]["type"] != "image_url" {
		t.Fatalf("content parts = %v", content)
	}
	prompt := content[0]["text"].(string)
	if !strings.Contains(prompt, "2 frames") || !strings.Contains(prompt, "red dress, sunset") {
		t.Fatalf("prompt = %q", prompt)
	}
	// The 4000px frame was downsized before being sent: a data URL of a 1024-wide
	// JPEG of a flat image is small, one of a 4000-wide one is not.
	url := content[1]["image_url"].(map[string]any)["url"].(string)
	if !strings.HasPrefix(url, "data:image/jpeg;base64,") || len(url) > 200_000 {
		t.Fatalf("frame was not downsized: %d bytes", len(url))
	}
}

func TestDescribeReportsTheModelsErrors(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":{"message":"model does not support images"}}`))
	}))
	defer srv.Close()
	_, err := New(srv.URL, "", "").Describe(context.Background(), Request{Frames: []image.Image{frame(2, 2)}, Kind: "image"})
	if err == nil || !strings.Contains(err.Error(), "400") {
		t.Fatalf("err = %v", err)
	}
	if _, err := (&Client{}).Describe(context.Background(), Request{}); err == nil {
		t.Fatal("a client with no URL must refuse")
	}
}

func TestCleanStripsWhatModelsWrapAnswersIn(t *testing.T) {
	for in, want := range map[string]string{
		"Description: A cat on a **sofa**.\nIt is asleep.": "A cat on a sofa. It is asleep.",
		"The image depicts two figures.":                   "Two figures.",
		"'Sure! In this image, a dog runs.'":               "A dog runs.",
	} {
		if got := Clean(in); got != want {
			t.Errorf("Clean(%q) = %q, want %q", in, got, want)
		}
	}
}
