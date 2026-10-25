// Package trainer talks to the OppaiLib trainer: the companion container in
// trainer/ that trains LoRAs with kohya's sd-scripts on a box with a GPU.
//
// OppaiLib keeps no Python and no PyTorch, so it never trains anything itself. It
// gathers the pictures, captions them, hands the trainer a job and follows it;
// the trainer runs one job at a time and keeps its own queue, so a job outlives
// the browser tab that started it and either side's restart.
package trainer

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Client is safe for concurrent use. Base and token are passed per call, because
// both are live settings.
type Client struct {
	hc *http.Client
	// upload has no overall timeout: a dataset is hundreds of megabytes and a base
	// checkpoint gigabytes, and both go over the network.
	upload *http.Client
}

func New() *Client {
	return &Client{
		hc: &http.Client{Timeout: 30 * time.Second},
		upload: &http.Client{Transport: &http.Transport{
			Proxy:                 http.ProxyFromEnvironment,
			ResponseHeaderTimeout: 10 * time.Minute,
		}},
	}
}

// Health is what the trainer says about itself.
type Health struct {
	OK            bool   `json:"ok"`
	Version       string `json:"version"`
	SDScripts     string `json:"sdScripts"`
	Busy          bool   `json:"busy"`
	Queued        int    `json:"queued"`
	ModelsMounted bool   `json:"modelsMounted"`
	GPU           string `json:"gpu"`
	VRAMMB        int    `json:"vramMB,omitempty"`
	VRAMUsedMB    int    `json:"vramUsedMB,omitempty"`
}

// Job is one training run as the trainer reports it.
type Job struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	State    string   `json:"state"` // queued | running | done | error | cancelled
	Phase    string   `json:"phase"`
	Family   string   `json:"family"`
	Images   int      `json:"images"`
	Step     int      `json:"step"`
	Total    int      `json:"total"`
	Epoch    int      `json:"epoch"`
	Epochs   int      `json:"epochs"`
	Loss     float64  `json:"loss"`
	Elapsed  string   `json:"elapsed"`
	ETA      string   `json:"eta"`
	Error    string   `json:"error"`
	Output   string   `json:"output"`
	Download string   `json:"download"`
	Samples  []string `json:"samples"`
	Log      []string `json:"log"`
	Created  int64    `json:"created"`
	Started  int64    `json:"started"`
	Finished int64    `json:"finished"`
}

// Over says the job will not change any more.
func (j Job) Over() bool {
	return j.State == "done" || j.State == "error" || j.State == "cancelled"
}

// BaseRef names the checkpoint a LoRA is trained on, as the generator knows it.
type BaseRef struct {
	Key  string `json:"key"`
	Size int64  `json:"size"`
}

// SamplePrompt is a picture rendered with the LoRA during training.
type SamplePrompt struct {
	Prompt   string `json:"prompt"`
	Negative string `json:"negative,omitempty"`
}

// Spec is a job's job.json. Zero numbers take the trainer's defaults.
type Spec struct {
	Name          string         `json:"name"`
	Trigger       string         `json:"trigger,omitempty"`
	Base          BaseRef        `json:"base"`
	Resolution    int            `json:"resolution,omitempty"`
	Rank          int            `json:"rank,omitempty"`
	Alpha         float64        `json:"alpha,omitempty"`
	Epochs        int            `json:"epochs,omitempty"`
	Repeats       int            `json:"repeats,omitempty"`
	BatchSize     int            `json:"batchSize,omitempty"`
	LearningRate  float64        `json:"learningRate,omitempty"`
	TextEncoderLR float64        `json:"textEncoderLr,omitempty"`
	Optimizer     string         `json:"optimizer,omitempty"`
	UnetOnly      bool           `json:"unetOnly,omitempty"`
	ClipSkip      int            `json:"clipSkip,omitempty"`
	Flip          bool           `json:"flip,omitempty"`
	NoiseOffset   float64        `json:"noiseOffset,omitempty"`
	Seed          int64          `json:"seed,omitempty"`
	Samples       []SamplePrompt `json:"samples,omitempty"`
	SampleEvery   int            `json:"sampleEvery,omitempty"`
	// ShuffleCaption is a pointer because its default is on.
	ShuffleCaption *bool `json:"shuffleCaption,omitempty"`
}

// Picture is one dataset entry: the image's bytes with its extension, and its
// caption.
type Picture struct {
	Ext     string // ".png", ".jpg", ".webp" …
	Data    []byte
	Caption string
}

// ErrNotFound is a job the trainer does not have.
var ErrNotFound = errors.New("the trainer has no such job")

type apiError struct {
	Error string `json:"error"`
}

func (c *Client) do(ctx context.Context, hc *http.Client, method, base, token, path string, body io.Reader, length int64, ctype string, out any) error {
	req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(base, "/")+path, body)
	if err != nil {
		return err
	}
	if length >= 0 && body != nil {
		req.ContentLength = length
	}
	if ctype != "" {
		req.Header.Set("Content-Type", ctype)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := hc.Do(req)
	if err != nil {
		return fmt.Errorf("the trainer is unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound && strings.HasPrefix(path, "/jobs/") {
		return ErrNotFound
	}
	if resp.StatusCode == http.StatusUnauthorized {
		return errors.New("the trainer refused the token — check it under Settings → Image generation")
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		var e apiError
		data, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
		if json.Unmarshal(data, &e) == nil && e.Error != "" {
			return errors.New(e.Error)
		}
		return fmt.Errorf("the trainer answered %d", resp.StatusCode)
	}
	if out == nil {
		return nil
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 16<<20)).Decode(out)
}

// Health asks the trainer what it is.
func (c *Client) Health(ctx context.Context, base, token string) (*Health, error) {
	var h Health
	if err := c.do(ctx, c.hc, http.MethodGet, base, token, "/health", nil, -1, "", &h); err != nil {
		return nil, err
	}
	return &h, nil
}

// HasBase says whether the trainer already has a checkpoint, mounted or cached.
func (c *Client) HasBase(ctx context.Context, base, token string, ref BaseRef) (bool, error) {
	var out struct {
		Present bool `json:"present"`
	}
	q := url.Values{"key": {ref.Key}, "size": {strconv.FormatInt(ref.Size, 10)}}
	if err := c.do(ctx, c.hc, http.MethodGet, base, token, "/bases?"+q.Encode(), nil, -1, "", &out); err != nil {
		return false, err
	}
	return out.Present, nil
}

// UploadBase sends a checkpoint into the trainer's cache.
func (c *Client) UploadBase(ctx context.Context, base, token string, ref BaseRef, r io.Reader) error {
	q := url.Values{"key": {ref.Key}, "size": {strconv.FormatInt(ref.Size, 10)}}
	return c.do(ctx, c.upload, http.MethodPut, base, token, "/bases?"+q.Encode(), r, ref.Size, "application/octet-stream", nil)
}

// Submit hands the trainer a job: its spec, then each picture and its caption as a
// request of its own, then the word to start. next is called for each picture in
// turn and returns false when there are no more, so only one picture at a time is
// ever in memory — they arrive decrypted, and nothing of the library is spooled to
// disk on this side. A job that fails part way is deleted from the trainer.
func (c *Client) Submit(ctx context.Context, base, token string, spec Spec, next func() (Picture, bool, error)) (*Job, error) {
	cfg, err := json.Marshal(spec)
	if err != nil {
		return nil, err
	}
	var job Job
	if err := c.do(ctx, c.hc, http.MethodPost, base, token, "/jobs", bytes.NewReader(cfg), int64(len(cfg)), "application/json", &job); err != nil {
		return nil, err
	}
	put := func(name string, data []byte) error {
		return c.do(ctx, c.upload, http.MethodPut, base, token, "/jobs/"+url.PathEscape(job.ID)+"/files/"+name,
			bytes.NewReader(data), int64(len(data)), "application/octet-stream", nil)
	}
	send := func() error {
		for i := 1; ; i++ {
			pic, ok, err := next()
			if err != nil {
				return err
			}
			if !ok {
				return nil
			}
			stem := fmt.Sprintf("%04d", i)
			if err := put(stem+pic.Ext, pic.Data); err != nil {
				return err
			}
			if err := put(stem+".txt", []byte(pic.Caption)); err != nil {
				return err
			}
		}
	}
	if err := send(); err != nil {
		c.forget(job.ID, base, token)
		return nil, err
	}
	if err := c.do(ctx, c.hc, http.MethodPost, base, token, "/jobs/"+url.PathEscape(job.ID)+"/start", nil, -1, "", &job); err != nil {
		c.forget(job.ID, base, token)
		return nil, err
	}
	return &job, nil
}

// forget deletes a job that never got going, on a context of its own: the one it
// failed on may be the reason.
func (c *Client) forget(id, base, token string) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = c.Delete(ctx, base, token, id)
}

// Jobs lists every job the trainer has.
func (c *Client) Jobs(ctx context.Context, base, token string) ([]Job, error) {
	var out struct {
		Jobs []Job `json:"jobs"`
	}
	if err := c.do(ctx, c.hc, http.MethodGet, base, token, "/jobs", nil, -1, "", &out); err != nil {
		return nil, err
	}
	return out.Jobs, nil
}

// Job reads one job.
func (c *Client) Job(ctx context.Context, base, token, id string) (*Job, error) {
	var job Job
	if err := c.do(ctx, c.hc, http.MethodGet, base, token, "/jobs/"+url.PathEscape(id), nil, -1, "", &job); err != nil {
		return nil, err
	}
	return &job, nil
}

// Cancel stops a job, queued or running.
func (c *Client) Cancel(ctx context.Context, base, token, id string) error {
	return c.do(ctx, c.hc, http.MethodPost, base, token, "/jobs/"+url.PathEscape(id)+"/cancel", nil, -1, "", nil)
}

// Delete forgets a finished job and its files.
func (c *Client) Delete(ctx context.Context, base, token, id string) error {
	return c.do(ctx, c.hc, http.MethodDelete, base, token, "/jobs/"+url.PathEscape(id), nil, -1, "", nil)
}

// OutputURL is where a finished job's file can be downloaded without the trainer's
// token: the job's own download token is in it. It is what the generator is told
// to install from, so a multi-gigabyte path through OppaiLib is never needed.
func OutputURL(base string, job Job) string {
	return strings.TrimRight(base, "/") + "/jobs/" + url.PathEscape(job.ID) + "/output/" +
		url.PathEscape(job.Output) + "?dl=" + url.QueryEscape(job.Download)
}

// Sample fetches one sample picture.
func (c *Client) Sample(ctx context.Context, base, token, id, name string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		strings.TrimRight(base, "/")+"/jobs/"+url.PathEscape(id)+"/samples/"+url.PathEscape(name), nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, fmt.Errorf("the trainer is unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("the trainer answered %d", resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 32<<20))
}
