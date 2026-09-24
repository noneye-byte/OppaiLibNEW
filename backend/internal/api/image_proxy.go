package api

import (
	"container/list"
	"context"
	"strings"
	"sync"
)

// Pictures through the proxy, fast.
//
// Every artwork a browsing screen shows from another site — F95zone's covers and
// screenshots, itch.io's, a booru's thumbnails — comes through /api/scrape/proxy, which
// used to fetch it afresh through the polite scraper each time. Two things made that
// slow enough to break screens:
//
//   - The politeness delay. It spaces requests to one host 1.5 s apart, which is right
//     for reading a site's pages and wrong for a grid of thumbnails. A listing of thirty
//     covers took most of a minute to fill, and the screenshots of a game opened in the
//     middle of that queued behind every cover still waiting, and timed out.
//   - Nothing was kept. Scrolling back up, or opening the same game twice, fetched every
//     picture again — behind the same delay.
//
// So pictures skip the delay (scraper.FetchImage) and are limited instead by how many
// may be in flight to one host at once, which is what a browser does; and what comes
// back is kept in a bounded in-memory cache. These are pictures on content-addressed
// CDNs that tell clients to keep them for a year, so a stale entry is not a thing.

const (
	// imageCacheBytes bounds the whole cache. A screen of covers is a few megabytes;
	// this holds several evenings of browsing and never becomes the server's memory.
	imageCacheBytes = 96 << 20
	// imageCacheMaxItem is the largest single picture kept. Bigger ones are served but
	// not remembered, so one enormous PNG cannot evict a hundred covers.
	imageCacheMaxItem = 3 << 20
	// imageHostParallel is how many pictures may be fetched from one host at once —
	// the number a browser opens, and polite enough for a CDN.
	imageHostParallel = 6
)

// cachedImage is one picture as it was served.
type cachedImage struct {
	key         string
	contentType string
	body        []byte
}

// imageProxyCache is a byte-bounded LRU of pictures, keyed by URL.
type imageProxyCache struct {
	mu    sync.Mutex
	order *list.List // front is most recently used
	items map[string]*list.Element
	bytes int

	slotsMu sync.Mutex
	slots   map[string]chan struct{}
}

func newImageProxyCache() *imageProxyCache {
	return &imageProxyCache{order: list.New(), items: map[string]*list.Element{}, slots: map[string]chan struct{}{}}
}

func (c *imageProxyCache) get(key string) (cachedImage, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	el, ok := c.items[key]
	if !ok {
		return cachedImage{}, false
	}
	c.order.MoveToFront(el)
	return el.Value.(cachedImage), true
}

func (c *imageProxyCache) put(img cachedImage) {
	if len(img.body) == 0 || len(img.body) > imageCacheMaxItem {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[img.key]; ok {
		c.bytes -= len(el.Value.(cachedImage).body)
		c.order.Remove(el)
	}
	c.items[img.key] = c.order.PushFront(img)
	c.bytes += len(img.body)
	for c.bytes > imageCacheBytes {
		oldest := c.order.Back()
		if oldest == nil {
			break
		}
		gone := oldest.Value.(cachedImage)
		c.order.Remove(oldest)
		delete(c.items, gone.key)
		c.bytes -= len(gone.body)
	}
}

// acquire waits for one of the host's fetch slots and returns the function that gives
// it back.
func (c *imageProxyCache) acquire(ctx context.Context, host string) (func(), error) {
	host = strings.ToLower(host)
	c.slotsMu.Lock()
	slot, ok := c.slots[host]
	if !ok {
		slot = make(chan struct{}, imageHostParallel)
		c.slots[host] = slot
	}
	c.slotsMu.Unlock()
	select {
	case slot <- struct{}{}:
		return func() { <-slot }, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// isPictureType says a response is a picture, and so worth keeping.
func isPictureType(contentType string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(contentType)), "image/")
}
