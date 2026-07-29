package api

import (
	"bytes"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
)

func multipartRequest(t *testing.T, method, path, token string, fields map[string]string, filename string, data []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	for name, value := range fields {
		_ = w.WriteField(name, value)
	}
	part, err := w.CreateFormFile("file", filename)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(data); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(method, path, &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

func TestGameGalleryUploads(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	var imageBytes bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, 1, 1))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	if err := png.Encode(&imageBytes, img); err != nil {
		t.Fatal(err)
	}
	pngData := imageBytes.Bytes()

	gameRec := httptest.NewRecorder()
	h.ServeHTTP(gameRec, multipartRequest(t, http.MethodPost, "/api/media", token,
		map[string]string{"kind": "game", "title": "Test game"}, "game.bin", []byte("game data")))
	if gameRec.Code != http.StatusCreated {
		t.Fatalf("create game: %d %s", gameRec.Code, gameRec.Body.String())
	}
	var game struct {
		ID int64 `json:"id"`
	}
	_ = json.Unmarshal(gameRec.Body.Bytes(), &game)

	galleryRec := httptest.NewRecorder()
	h.ServeHTTP(galleryRec, multipartRequest(t, http.MethodPost,
		"/api/media/"+strconv.FormatInt(game.ID, 10)+"/gallery", token, nil, "shot.png", pngData))
	if galleryRec.Code != http.StatusCreated {
		t.Fatalf("upload game gallery: %d %s", galleryRec.Code, galleryRec.Body.String())
	}
	listed := do(t, h, token, http.MethodGet, "/api/media/"+strconv.FormatInt(game.ID, 10)+"/gallery", "")
	if listed.Code != http.StatusOK || !bytes.Contains(listed.Body.Bytes(), []byte(`"kind":"image"`)) {
		t.Fatalf("list game gallery: %d %s", listed.Code, listed.Body.String())
	}
}
