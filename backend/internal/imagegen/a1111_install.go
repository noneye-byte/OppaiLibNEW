package imagegen

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Installing into Automatic1111.
//
// InvokeAI downloads a model itself when handed a URL. A1111 has nothing of the kind,
// so this side does the download: the file is streamed into the right folder under
// the mounted models directory, hashed as it arrives (which is what lets it be found
// on Civitai again without reading it a second time), renamed into place only once
// it is whole, and A1111 is asked to rescan. The job list has InvokeAI's shape, so
// the catalogue's watcher keeps its promise to dress the model the same way for both
// backends — once the job is "completed", its ModelKey is the file, and the cover and
// description land as A1111's own sidecar files.
//
// The jobs live in memory. A restart mid-download loses that download and leaves its
// ".part" file, which the next install of the same file overwrites.

// InstallSpec says what to install. InvokeAI needs only the Source; A1111 also needs
// to know where the file goes and what to call it, which the catalogue knows and the
// URL does not.
type InstallSpec struct {
	Source string
	// Type is the catalogue's model type ("Checkpoint", "LORA", "VAE" …).
	Type string
	// FileName is the catalogue's name for the file. Blank takes the name the
	// download itself gives.
	FileName string
	// Token authorises the download: many of Civitai's files need an account.
	Token string
}

// downloadHTTP has no overall timeout — a checkpoint is gigabytes — but gives up on a
// server that never starts answering.
var downloadHTTP = &http.Client{
	Transport: &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		ResponseHeaderTimeout: 60 * time.Second,
		IdleConnTimeout:       90 * time.Second,
	},
}

type a1111Jobs struct {
	mu   sync.Mutex
	next int64
	jobs []*InstallJob
}

func (c *Client) a1111JobList() *a1111Jobs {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.installs == nil {
		c.installs = &a1111Jobs{}
	}
	return c.installs
}

func (j *a1111Jobs) add(source string) *InstallJob {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.next++
	job := &InstallJob{ID: j.next, Status: "waiting", Source: source}
	j.jobs = append([]*InstallJob{job}, j.jobs...)
	if len(j.jobs) > 50 {
		j.jobs = j.jobs[:50]
	}
	return job
}

func (j *a1111Jobs) update(job *InstallJob, fn func(*InstallJob)) {
	j.mu.Lock()
	defer j.mu.Unlock()
	fn(job)
}

func (j *a1111Jobs) list() []InstallJob {
	j.mu.Lock()
	defer j.mu.Unlock()
	out := make([]InstallJob, 0, len(j.jobs))
	for _, job := range j.jobs {
		out = append(out, *job)
	}
	return out
}

// busy says whether a download of the same source is already running, so a double
// click does not write one file from two streams.
func (j *a1111Jobs) busy(source string) bool {
	j.mu.Lock()
	defer j.mu.Unlock()
	for _, job := range j.jobs {
		if job.Source == source && (job.Status == "waiting" || job.Status == "downloading") {
			return true
		}
	}
	return false
}

var unsafeFileChars = regexp.MustCompile(`[^A-Za-z0-9._+\- ()\[\]]+`)

// safeFileName keeps a downloaded file's name inside the folder it is put in and
// readable on any filesystem the share might be.
func safeFileName(name string) string {
	name = path.Base(strings.ReplaceAll(name, "\\", "/"))
	name = strings.TrimSpace(unsafeFileChars.ReplaceAllString(name, "_"))
	name = strings.Trim(name, ". ")
	if len(name) > 180 {
		ext := path.Ext(name)
		name = name[:180-len(ext)] + ext
	}
	return name
}

// a1111Install starts a download into the models folder and returns its job.
func (c *Client) a1111Install(ctx context.Context, base string, spec InstallSpec) (*InstallJob, error) {
	dir, err := c.requireModelsDir()
	if err != nil {
		return nil, err
	}
	folder, ok := a1111InstallFolders[strings.ToLower(strings.TrimSpace(spec.Type))]
	if !ok {
		if strings.EqualFold(spec.Type, "TextualInversion") {
			return nil, errors.New("Automatic1111 keeps embeddings outside its models folder; put this one in its embeddings folder by hand")
		}
		return nil, fmt.Errorf("Automatic1111 has no folder for a %s", spec.Type)
	}
	jobs := c.a1111JobList()
	if jobs.busy(spec.Source) {
		return nil, errors.New("that file is already downloading")
	}
	if err := os.MkdirAll(subfolderPath(dir, folder), 0o755); err != nil {
		return nil, fmt.Errorf("can't write to the models folder: %w", err)
	}
	forgetSubfolders(dir)
	job := jobs.add(spec.Source)
	go c.a1111Download(base, dir, folder, spec, job)
	out := *job
	return &out, nil
}

func (c *Client) a1111Download(base, dir string, folder a1111Folder, spec InstallSpec, job *InstallJob) {
	jobs := c.a1111JobList()
	fail := func(err error) {
		jobs.update(job, func(j *InstallJob) { j.Status, j.Error = "error", err.Error() })
	}
	ctx := context.Background()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, spec.Source, nil)
	if err != nil {
		fail(err)
		return
	}
	req.Header.Set("User-Agent", "OppaiLib")
	if spec.Token != "" {
		// Header, not ?token=: the file comes from a signed CDN URL after a redirect,
		// and net/http drops the header when the redirect leaves the domain, so the
		// key goes to Civitai and nowhere else.
		req.Header.Set("Authorization", "Bearer "+spec.Token)
	}
	// Most installs are Civitai's, and its refusals have a known cause; a LoRA from
	// the trainer comes from somewhere else and is not to be blamed on Civitai.
	from := "Civitai"
	if !strings.Contains(strings.ToLower(req.URL.Host), "civitai") {
		from = req.URL.Host
	}
	resp, err := downloadHTTP.Do(req)
	if err != nil {
		fail(fmt.Errorf("%s is unreachable: %w", from, err))
		return
	}
	defer resp.Body.Close()
	switch {
	case (resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden) && from == "Civitai":
		fail(errors.New("Civitai wants an account for this file; add an API key under Settings"))
		return
	case resp.StatusCode != http.StatusOK:
		fail(fmt.Errorf("%s returned %d", from, resp.StatusCode))
		return
	}
	// A sign-in page instead of a file is the other way a missing key shows.
	if ct := resp.Header.Get("Content-Type"); strings.HasPrefix(ct, "text/html") {
		fail(errors.New("Civitai sent a web page instead of the file; it probably needs an API key"))
		return
	}

	name := spec.FileName
	if name == "" {
		if _, params, err := mime.ParseMediaType(resp.Header.Get("Content-Disposition")); err == nil {
			name = params["filename"]
		}
	}
	if name == "" {
		if u, err := url.Parse(resp.Request.URL.String()); err == nil {
			name = path.Base(u.Path)
		}
	}
	name = safeFileName(name)
	if name == "" || path.Ext(name) == "" {
		fail(errors.New("Civitai did not say what the file is called"))
		return
	}
	key := folder.Folder + "/" + name
	target := localPath(dir, key)
	if _, err := os.Stat(target); err == nil {
		fail(fmt.Errorf("%s is already in the models folder", key))
		return
	}

	jobs.update(job, func(j *InstallJob) {
		j.Status = "downloading"
		if resp.ContentLength > 0 {
			j.TotalBytes = resp.ContentLength
		}
	})
	part := target + ".part"
	out, err := os.Create(part)
	if err != nil {
		fail(fmt.Errorf("can't write to the models folder: %w", err))
		return
	}
	sum := sha256.New()
	counter := &progressWriter{report: func(n int64) {
		jobs.update(job, func(j *InstallJob) { j.Bytes = n })
	}}
	_, copyErr := io.Copy(io.MultiWriter(out, sum, counter), resp.Body)
	closeErr := out.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(part)
		if copyErr == nil {
			copyErr = closeErr
		}
		fail(fmt.Errorf("the download broke off: %w", copyErr))
		return
	}
	if err := os.Rename(part, target); err != nil {
		_ = os.Remove(part)
		fail(err)
		return
	}
	var files []string
	if folder.Type == a1111DetectorFolder.Type && strings.EqualFold(path.Ext(name), ".zip") {
		// ADetailer reads .pt files and nothing else; see a1111_detectors.go.
		unpacked, err := unpackDetectors(target, filepath.Dir(target))
		_ = removeSoon(target)
		if err != nil {
			fail(err)
			return
		}
		for _, d := range unpacked {
			files = append(files, d.Name)
			if d.SHA256 != "" {
				c.hashes().record(filepath.Join(filepath.Dir(target), d.Name), d.SHA256)
			}
		}
		key = folder.Folder + "/" + unpacked[0].Name
	} else {
		c.hashes().record(target, hex.EncodeToString(sum.Sum(nil)))
	}

	rctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	c.a1111Refresh(rctx, base, folder.Type)
	cancel()
	jobs.update(job, func(j *InstallJob) {
		j.Status, j.ModelKey, j.Bytes, j.Files = "completed", key, counter.n, files
		if j.TotalBytes == 0 {
			j.TotalBytes = counter.n
		}
	})
}

// progressWriter counts what has been written and reports it at most a few times a
// second, so a gigabyte download is not a gigabyte of lock round trips.
type progressWriter struct {
	n      int64
	last   time.Time
	report func(int64)
}

func (p *progressWriter) Write(b []byte) (int, error) {
	p.n += int64(len(b))
	if time.Since(p.last) > 250*time.Millisecond {
		p.last = time.Now()
		p.report(p.n)
	}
	return len(b), nil
}

// sha256File hashes a file on disk, for models that arrived some other way.
func sha256File(local string) (string, error) {
	f, err := os.Open(local)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
