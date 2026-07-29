package api

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// Reopening a comic must not re-fetch the gallery page it was read from — that fetch
// costs a throttled round trip to someone else's site.
func TestResolveCacheServesAHit(t *testing.T) {
	c := newResolveCache[[]string](time.Minute)
	var calls atomic.Int32

	resolve := func(context.Context) ([]string, error) {
		calls.Add(1)
		return []string{"p1", "p2"}, nil
	}

	for i := 0; i < 3; i++ {
		got, err := c.get(context.Background(), "3hentai/123", resolve)
		if err != nil {
			t.Fatalf("get: %v", err)
		}
		if len(got) != 2 {
			t.Fatalf("pages = %v, want 2", got)
		}
	}
	if n := calls.Load(); n != 1 {
		t.Errorf("resolved %d times, want 1 — a reopen should not refetch", n)
	}
}

// A double-tap on a comic used to mean two concurrent fetches of the same gallery,
// each queued behind the other's politeness delay. Callers now share one resolution.
func TestResolveCacheSingleFlights(t *testing.T) {
	c := newResolveCache[[]string](time.Minute)
	var calls atomic.Int32
	release := make(chan struct{})

	resolve := func(context.Context) ([]string, error) {
		calls.Add(1)
		<-release // hold the fetch open so every caller piles up behind it
		return []string{"p1"}, nil
	}

	var wg sync.WaitGroup
	errs := make(chan error, 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			got, err := c.get(context.Background(), "3hentai/123", resolve)
			if err != nil {
				errs <- err
				return
			}
			if len(got) != 1 {
				errs <- errors.New("waiter got the wrong value")
			}
		}()
	}

	// Let them all arrive, then let the single fetch finish.
	time.Sleep(50 * time.Millisecond)
	close(release)
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatalf("concurrent get: %v", err)
	}

	if n := calls.Load(); n != 1 {
		t.Errorf("resolved %d times, want 1 — concurrent opens must share one fetch", n)
	}
}

// A site that was briefly unreachable should be retried on the next click, not
// remembered as broken.
func TestResolveCacheDoesNotCacheFailures(t *testing.T) {
	c := newResolveCache[[]string](time.Minute)
	var calls atomic.Int32

	resolve := func(context.Context) ([]string, error) {
		if calls.Add(1) == 1 {
			return nil, errors.New("upstream is down")
		}
		return []string{"p1"}, nil
	}

	if _, err := c.get(context.Background(), "k", resolve); err == nil {
		t.Fatal("first get should fail")
	}
	got, err := c.get(context.Background(), "k", resolve)
	if err != nil {
		t.Fatalf("a retry after a failure should be allowed through: %v", err)
	}
	if len(got) != 1 {
		t.Errorf("pages = %v, want the retry's value", got)
	}
}

// A stale entry is re-resolved rather than served.
func TestResolveCacheExpires(t *testing.T) {
	c := newResolveCache[[]string](20 * time.Millisecond)
	var calls atomic.Int32

	resolve := func(context.Context) ([]string, error) {
		calls.Add(1)
		return []string{"p1"}, nil
	}

	if _, err := c.get(context.Background(), "k", resolve); err != nil {
		t.Fatalf("get: %v", err)
	}
	time.Sleep(40 * time.Millisecond)
	if _, err := c.get(context.Background(), "k", resolve); err != nil {
		t.Fatalf("get: %v", err)
	}
	if n := calls.Load(); n != 2 {
		t.Errorf("resolved %d times, want 2 — a stale entry must be refetched", n)
	}
}

// Two comics are two entries; the cache must not confuse them.
func TestResolveCacheKeysApart(t *testing.T) {
	c := newResolveCache[[]string](time.Minute)
	resolve := func(v string) func(context.Context) ([]string, error) {
		return func(context.Context) ([]string, error) { return []string{v}, nil }
	}

	a, err := c.get(context.Background(), "3hentai/1", resolve("a"))
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	b, err := c.get(context.Background(), "3hentai/2", resolve("b"))
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if a[0] != "a" || b[0] != "b" {
		t.Errorf("got %v and %v — entries are crossing", a, b)
	}
}
