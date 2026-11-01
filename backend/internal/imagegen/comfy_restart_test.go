package imagegen

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

func TestComfyUIRestartsThroughWhicheverManagerItHas(t *testing.T) {
	var rebooted atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/manager/version":
			_, _ = w.Write([]byte("V3.30"))
		case "/manager/reboot":
			rebooted.Add(1)
			// It execs over itself mid-answer.
			hj, _ := w.(http.Hijacker)
			conn, _, _ := hj.Hijack()
			conn.Close()
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()
	c := New()
	if !c.ComfyCanRestart(context.Background(), srv.URL) {
		t.Fatal("a ComfyUI with the Manager can be restarted")
	}
	if err := c.ComfyRestart(context.Background(), srv.URL); err != nil {
		t.Fatalf("restart: %v", err)
	}
	if rebooted.Load() != 1 {
		t.Fatalf("reboot asked %d times", rebooted.Load())
	}
}

func TestComfyUIWithoutAManagerSaysWhatToInstall(t *testing.T) {
	srv := httptest.NewServer(http.NotFoundHandler())
	defer srv.Close()
	c := New()
	if c.ComfyCanRestart(context.Background(), srv.URL) {
		t.Fatal("no Manager, no restart")
	}
	if err := c.ComfyRestart(context.Background(), srv.URL); !errors.Is(err, ErrRestartUnsupported) {
		t.Fatalf("err = %v", err)
	}
}

func TestTouchingTheFoldersMovesTheirTime(t *testing.T) {
	dir := t.TempDir()
	old := time.Now().Add(-time.Hour)
	if err := os.Chtimes(dir, old, old); err != nil {
		t.Fatal(err)
	}
	_ = os.MkdirAll(filepath.Join(dir, "x"), 0o755)
	_ = os.Chtimes(dir, old, old)
	ComfyPlaces{"loras": {Dir: dir}, "vae": {}}.TouchComfyFolders()
	info, _ := os.Stat(dir)
	if time.Since(info.ModTime()) > time.Minute {
		t.Fatalf("folder time %v was not moved", info.ModTime())
	}
}
