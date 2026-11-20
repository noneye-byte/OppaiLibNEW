package api

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestHerPicturesExportAsOneZipWithAManifest(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	upload := func(name, subject string) {
		rec := do(t, h, token, http.MethodPost, "/api/chat/images",
			`{"characterId":"libby","name":"`+name+`","subject":"`+subject+`","tags":["beach"],"imageData":"data:image/png;base64,`+validChatPNG+`"}`)
		if rec.Code != http.StatusOK {
			t.Fatalf("upload %s: %d %s", name, rec.Code, rec.Body)
		}
	}
	upload("By the sea", "self")
	upload("By the sea", "self")
	upload("Their cat", "other")

	rec := do(t, h, token, http.MethodGet, "/api/chat/images/export?character=libby", "")
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "application/zip" ||
		!strings.Contains(rec.Header().Get("Content-Disposition"), "attachment") {
		t.Fatalf("export: %d %v %s", rec.Code, rec.Header(), rec.Body)
	}
	zr, err := zip.NewReader(bytes.NewReader(rec.Body.Bytes()), int64(rec.Body.Len()))
	if err != nil {
		t.Fatalf("not a zip: %v", err)
	}
	want, _ := base64.StdEncoding.DecodeString(validChatPNG)
	var pictures []string
	var manifest []chatImageExportEntry
	for _, f := range zr.File {
		rc, _ := f.Open()
		body, _ := io.ReadAll(rc)
		rc.Close()
		if f.Name == "manifest.json" {
			if err := json.Unmarshal(body, &manifest); err != nil {
				t.Fatalf("manifest: %v", err)
			}
			continue
		}
		pictures = append(pictures, f.Name)
		// The picture comes out as it went in, not as the sealed blob it is on disk.
		if !bytes.Equal(body, want) {
			t.Fatalf("%s is not the uploaded picture", f.Name)
		}
	}
	// Two of her — the same name twice, two files — and not the cat, which is not her.
	if len(pictures) != 2 || pictures[0] == pictures[1] {
		t.Fatalf("pictures: %v", pictures)
	}
	for _, p := range pictures {
		if !strings.HasPrefix(p, "By the sea ") || !strings.HasSuffix(p, ".png") {
			t.Fatalf("file name %q", p)
		}
	}
	if len(manifest) != 2 || manifest[0].Name != "By the sea" || len(manifest[0].Tags) == 0 {
		t.Fatalf("manifest: %+v", manifest)
	}

	others := do(t, h, token, http.MethodGet, "/api/chat/images/export?character=libby&shelf=others", "")
	zr, err = zip.NewReader(bytes.NewReader(others.Body.Bytes()), int64(others.Body.Len()))
	if err != nil || len(zr.File) != 2 || !strings.HasPrefix(zr.File[0].Name, "Their cat ") {
		t.Fatalf("the other shelf: %v %d", err, len(zr.File))
	}
}

func TestAnEmptyShelfIsNotAnEmptyZip(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chat/images/export?character=libby", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("empty export: %d", rec.Code)
	}
}

func TestAPictureNameCannotLeaveTheArchive(t *testing.T) {
	got := exportFileName(chatImage{ID: "abcdef0123456789", Name: `../..\evil:name?`, MIME: "image/jpeg"})
	if strings.ContainsAny(got, `/\:?`) || !strings.HasSuffix(got, " abcdef01.jpg") {
		t.Fatalf("unsafe name: %q", got)
	}
}
