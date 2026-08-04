package hanime

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestEnvelopeRoundTrip(t *testing.T) {
	want := []byte(`{"directive":"get_download_links","slug":"example"}`)
	token, err := encryptEnvelope(want)
	if err != nil {
		t.Fatal(err)
	}
	got, err := decryptEnvelope(token)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("round trip = %q, want %q", got, want)
	}
}

func TestCurrentWebSignatureFormula(t *testing.T) {
	const input = "1784863419,Xkdi29,https://hanime.tv,mn2,1784863419"
	sum := sha256.Sum256([]byte(input))
	got := hex.EncodeToString(sum[:])
	const want = "0532d7e7acd48ffa393e2a8a4513666efad0e20502ba4b585556926d2e4bc0de"
	if got != want {
		t.Fatalf("signature = %q, want %q", got, want)
	}
}

func TestDirectPixeldrainURL(t *testing.T) {
	for _, tc := range []struct{ raw, want string }{
		{"https://pixeldrain.com/d/ATF3Kqhs", "https://pixeldrain.com/api/filesystem/ATF3Kqhs"},
		// The single-file shape, which a good share of the catalogue uses. Left
		// alone it streamed pixeldrain's HTML viewer page into the player.
		{"https://pixeldrain.com/u/GKNWRtfK", "https://pixeldrain.com/api/file/GKNWRtfK"},
		{"https://pixeldrain.net/u/GKNWRtfK?embed", "https://pixeldrain.com/api/file/GKNWRtfK"},
		// Shapes with no known file endpoint are passed through rather than guessed at.
		{"https://pixeldrain.com/l/abc123", "https://pixeldrain.com/l/abc123"},
		{"https://pixeldrain.com/u/", "https://pixeldrain.com/u/"},
		{"https://cdn.example.com/u/GKNWRtfK.mp4", "https://cdn.example.com/u/GKNWRtfK.mp4"},
	} {
		if got := directPixeldrainURL(tc.raw); got != tc.want {
			t.Errorf("directPixeldrainURL(%q) = %q, want %q", tc.raw, got, tc.want)
		}
	}
}

func TestLiveGuestDownload(t *testing.T) {
	if os.Getenv("HANIME_LIVE") != "1" {
		t.Skip("set HANIME_LIVE=1 to check the current guest API")
	}
	ctx := context.Background()
	client := New(http.DefaultClient, Options{})
	videos, err := client.Index(ctx, "OppaiLib integration test")
	if err != nil {
		t.Fatal(err)
	}
	if len(videos) == 0 {
		t.Fatal("guest catalogue was empty")
	}
	direct, err := client.DownloadURL(ctx, "OppaiLib integration test", videos[0])
	if err != nil {
		t.Fatal(err)
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, direct, nil)
	req.Header.Set("Range", "bytes=0-31")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusPartialContent && resp.StatusCode != http.StatusOK {
		t.Fatalf("MP4 returned %d", resp.StatusCode)
	}
	if contentType := resp.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "video/") {
		t.Fatalf("MP4 content type = %q", contentType)
	}
}
