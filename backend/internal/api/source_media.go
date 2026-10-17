package api

import (
	"container/list"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"
)

// sourceMediaCache holds small remote media files whole, in memory, so the streaming
// proxy can answer every range of one from a single fetch. Which sources use it is
// theirs to say — see sources.WholeMediaCacher for why 4chan does.
//
// It is memory and never disk. What someone browsed is not library content, and a
// plaintext copy of it on the server's disk would outlive the session it belongs to.
// The budget is in bytes and the least recently played file goes first.
type sourceMediaCache struct {
	budget int64

	mu       sync.Mutex
	used     int64
	order    *list.List // of *cachedMedia, most recently used at the front
	entries  map[string]*list.Element
	inflight map[string]*mediaFetch
}

// cachedMedia is one file as the origin served it.
type cachedMedia struct {
	key         string
	data        []byte
	contentType string
	modified    time.Time
}

type mediaFetch struct {
	done  chan struct{}
	media *cachedMedia
	err   error
}

// errMediaTooLarge means the file is bigger than the source asked to have cached, and
// should be streamed through instead.
var errMediaTooLarge = errors.New("media is larger than the whole-file cache takes")

func newSourceMediaCache(budget int64) *sourceMediaCache {
	return &sourceMediaCache{
		budget:   budget,
		order:    list.New(),
		entries:  map[string]*list.Element{},
		inflight: map[string]*mediaFetch{},
	}
}

// get returns the file at key, calling fetch for it if it isn't held. Concurrent
// callers for one key share a single fetch.
//
// fetch is not given the caller's context, on purpose. A player's first request for a
// clip is the one it abandons soonest — it reads the header, then hangs up to go and
// read the WebM cue index at the end — and if that hang-up cancelled the fetch, every
// request after it would start the download again, which is the traffic this cache
// exists to stop. A caller that gives up only stops waiting.
func (c *sourceMediaCache) get(ctx context.Context, key string, fetch func() (*cachedMedia, error)) (*cachedMedia, error) {
	c.mu.Lock()
	if el, ok := c.entries[key]; ok {
		c.order.MoveToFront(el)
		m := el.Value.(*cachedMedia)
		c.mu.Unlock()
		return m, nil
	}
	f, running := c.inflight[key]
	if !running {
		f = &mediaFetch{done: make(chan struct{})}
		c.inflight[key] = f
	}
	c.mu.Unlock()

	if !running {
		go func() {
			m, err := fetch()
			if m != nil {
				m.key = key
			}
			c.mu.Lock()
			delete(c.inflight, key)
			if err == nil {
				c.store(m)
			}
			c.mu.Unlock()
			f.media, f.err = m, err
			close(f.done)
		}()
	}

	select {
	case <-f.done:
		return f.media, f.err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// store adds m and evicts from the cold end until the budget holds. A file larger than
// the whole budget is still handed to the callers waiting on it, just not kept.
// Called with c.mu held.
func (c *sourceMediaCache) store(m *cachedMedia) {
	size := int64(len(m.data))
	if size > c.budget {
		return
	}
	c.entries[m.key] = c.order.PushFront(m)
	c.used += size
	for c.used > c.budget {
		oldest := c.order.Back()
		if oldest == nil {
			break
		}
		gone := oldest.Value.(*cachedMedia)
		c.order.Remove(oldest)
		delete(c.entries, gone.key)
		c.used -= int64(len(gone.data))
	}
}

// fetchWholeMedia downloads one file in a single request, refusing to hold more than
// limit bytes of it. prepare adds whatever headers the request needs.
func fetchWholeMedia(ctx context.Context, client *http.Client, u *url.URL, limit int64, prepare func(*http.Request)) (*cachedMedia, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	prepare(req)
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("upstream fetch failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, &upstreamRefusal{status: resp.StatusCode, retryAfter: resp.Header.Get("Retry-After")}
	}
	if resp.ContentLength > limit {
		return nil, errMediaTooLarge
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return nil, fmt.Errorf("upstream fetch interrupted: %w", err)
	}
	if int64(len(data)) > limit {
		return nil, errMediaTooLarge
	}
	modified, _ := http.ParseTime(resp.Header.Get("Last-Modified"))
	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(data)
	}
	return &cachedMedia{data: data, contentType: contentType, modified: modified}, nil
}

// upstreamRefusal is a non-success status from the origin, kept whole so a 429's
// Retry-After reaches the back-off.
type upstreamRefusal struct {
	status     int
	retryAfter string
}

func (e *upstreamRefusal) Error() string { return fmt.Sprintf("upstream returned %d", e.status) }

// upstreamBackoff remembers an origin telling us to stop, and for how long.
//
// A 429 from a CDN is a statement about this server's address, and every request made
// while it stands is wasted at best — at worst it is what keeps the block in place. So
// once one arrives the proxy answers for the origin until the time it named, instead
// of asking again on behalf of every tile and every retry button.
//
// Keys are a host *and* a file type. 4chan's limit is on video files only — the
// thumbnails of the very same posts keep loading — so blocking the whole host would
// blank the grid to protect the videos.
type upstreamBackoff struct {
	mu    sync.Mutex
	until map[string]time.Time
	now   func() time.Time
}

// maxBackoff caps what a Retry-After can make us wait. An origin that names a day is
// better retried by a person in an hour than believed.
const maxBackoff = 2 * time.Hour

// defaultBackoff is the wait when a 429 names none.
const defaultBackoff = time.Minute

func newUpstreamBackoff() *upstreamBackoff {
	return &upstreamBackoff{until: map[string]time.Time{}, now: time.Now}
}

// backoffKey is the host and lower-cased file extension of u: what an origin's limit
// is scoped to, as far as we can tell from outside it.
func backoffKey(u *url.URL) string {
	return strings.ToLower(u.Hostname()) + " " + strings.ToLower(path.Ext(u.Path))
}

// remaining is how much longer key is blocked; zero when it isn't.
func (b *upstreamBackoff) remaining(key string) time.Duration {
	b.mu.Lock()
	defer b.mu.Unlock()
	until, ok := b.until[key]
	if !ok {
		return 0
	}
	left := until.Sub(b.now())
	if left <= 0 {
		delete(b.until, key)
		return 0
	}
	return left
}

// hold blocks key for as long as retryAfter says, read as seconds or as an HTTP date.
// It returns the wait it settled on.
func (b *upstreamBackoff) hold(key, retryAfter string) time.Duration {
	now := b.now()
	wait := defaultBackoff
	if secs, err := strconv.Atoi(strings.TrimSpace(retryAfter)); err == nil && secs > 0 {
		wait = time.Duration(secs) * time.Second
	} else if at, err := http.ParseTime(retryAfter); err == nil && at.After(now) {
		wait = at.Sub(now)
	}
	if wait > maxBackoff {
		wait = maxBackoff
	}
	b.mu.Lock()
	b.until[key] = now.Add(wait)
	b.mu.Unlock()
	return wait
}

// rateLimitedMessage is what the viewer shows in place of the video, so a block reads
// as the site's limit with an end to it rather than as the app being broken.
func rateLimitedMessage(site string, wait time.Duration) string {
	return fmt.Sprintf("%s is limiting downloads from this server for now. Try again in %s.", site, humanWait(wait))
}

// humanWait rounds a wait up to something a person would say.
func humanWait(d time.Duration) string {
	switch {
	case d <= time.Minute:
		return "a minute"
	case d < 55*time.Minute:
		return fmt.Sprintf("about %d minutes", int((d+time.Minute-1)/time.Minute))
	case d < 90*time.Minute:
		return "about an hour"
	default:
		return fmt.Sprintf("about %d hours", int((d+30*time.Minute)/time.Hour))
	}
}
