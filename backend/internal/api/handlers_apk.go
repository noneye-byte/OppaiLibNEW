package api

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"
)

// The Android app, served from the same box as the library it talks to.
//
// There is no app store for this, and a private NSFW library is not something to go
// hunting for on a file-sharing site — so the server that holds the media is also the
// thing that hands out its client. CI bakes the built APK into the image; an operator
// can override it by dropping their own build into /config (see config.APKPath).
//
// The endpoints sit behind auth like everything else. The APK itself isn't secret, but
// an unauthenticated binary download is a free fingerprint of the deployment, and
// logging in on the phone's browser once before installing costs nothing.

// apkInfo is what the download card renders.
type apkInfo struct {
	Available bool   `json:"available"`
	Size      int64  `json:"size,omitempty"`
	SHA256    string `json:"sha256,omitempty"`
	Modified  int64  `json:"modified,omitempty"` // unix seconds
	Filename  string `json:"filename,omitempty"`
}

// apkCache memoizes the digest. Hashing is cheap but the file is tens of megabytes
// and the info endpoint is polled by every client that opens Settings; the file only
// changes when the image is rebuilt, so keyed on (path, size, mtime) is enough.
type apkCache struct {
	mu     sync.Mutex
	key    string
	sha256 string
}

var apkDigests apkCache

// apkFile resolves the APK to serve: the configured path, or a build the operator has
// dropped into the config dir. Returns "" when there is nothing to serve.
func (s *Server) apkFile() (string, os.FileInfo) {
	candidates := []string{s.cfg.APKPath}
	// The config dir is the operator's escape hatch: their own signed build, which
	// can update an existing install in place where ours can't.
	if s.cfg.ConfigDir != "" {
		candidates = append(candidates, filepath.Join(s.cfg.ConfigDir, "oppailib.apk"))
	}
	for _, p := range candidates {
		if p == "" {
			continue
		}
		fi, err := os.Stat(p)
		if err == nil && !fi.IsDir() && fi.Size() > 0 {
			return p, fi
		}
	}
	return "", nil
}

func (s *Server) handleAPKInfo(w http.ResponseWriter, r *http.Request) {
	path, fi := s.apkFile()
	if path == "" {
		writeJSON(w, http.StatusOK, apkInfo{Available: false})
		return
	}
	sum, err := s.apkDigest(path, fi)
	if err != nil {
		s.log.Warn("hashing the apk", "path", path, "err", err)
		// The digest is a nicety; not being able to compute it shouldn't hide the
		// download.
		sum = ""
	}
	writeJSON(w, http.StatusOK, apkInfo{
		Available: true,
		Size:      fi.Size(),
		SHA256:    sum,
		Modified:  fi.ModTime().Unix(),
		Filename:  "oppailib.apk",
	})
}

func (s *Server) apkDigest(path string, fi os.FileInfo) (string, error) {
	key := path + "|" + fi.ModTime().String() + "|" + strconv.FormatInt(fi.Size(), 10)

	apkDigests.mu.Lock()
	defer apkDigests.mu.Unlock()
	if apkDigests.key == key && apkDigests.sha256 != "" {
		return apkDigests.sha256, nil
	}

	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	sum := hex.EncodeToString(h.Sum(nil))
	apkDigests.key, apkDigests.sha256 = key, sum
	return sum, nil
}

func (s *Server) handleAPKDownload(w http.ResponseWriter, r *http.Request) {
	path, fi := s.apkFile()
	if path == "" {
		writeErr(w, http.StatusNotFound, "no APK is bundled with this server")
		return
	}
	f, err := os.Open(path)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't open the APK")
		return
	}
	defer f.Close()

	// The MIME type is what makes Android's package installer offer to install the
	// file rather than the browser saving it as an opaque blob.
	w.Header().Set("Content-Type", "application/vnd.android.package-archive")
	w.Header().Set("Content-Disposition", `attachment; filename="oppailib.apk"`)
	// The APK changes only when the image is rebuilt, but a stale cached copy would
	// silently install an old client — so revalidate rather than trusting age.
	w.Header().Set("Cache-Control", "private, no-cache")
	// ServeContent handles Range and conditional requests, which matters here: this
	// is a large file downloaded over a phone connection that may well drop.
	http.ServeContent(w, r, "oppailib.apk", fi.ModTime().UTC().Truncate(time.Second), f)
}
