package obs

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestCountersAndReset(t *testing.T) {
	r := NewRegistry()
	r.Inc("http.requests")
	r.Inc("http.requests")
	r.Add("http.bytes", 4096)

	snap := r.Snapshot()
	if snap.Counters["http.requests"] != 2 {
		t.Fatalf("requests = %d, want 2", snap.Counters["http.requests"])
	}
	if snap.Counters["http.bytes"] != 4096 {
		t.Fatalf("bytes = %d, want 4096", snap.Counters["http.bytes"])
	}

	r.Reset()
	if got := r.Snapshot().Counters; len(got) != 0 {
		t.Fatalf("after reset counters = %v, want empty", got)
	}
}

func TestTimingSummary(t *testing.T) {
	r := NewRegistry()
	// 99 fast requests and one slow one: the average must stay near the fast group
	// while p99 and max expose the outlier. This is the whole point of keeping a
	// histogram rather than a running mean.
	for i := 0; i < 99; i++ {
		r.Observe("http.GET /api/media", 8*time.Millisecond)
	}
	r.Observe("http.GET /api/media", 9*time.Second)

	timings := r.Snapshot().Timings
	if len(timings) != 1 {
		t.Fatalf("timings = %d, want 1", len(timings))
	}
	got := timings[0]
	if got.Count != 100 {
		t.Fatalf("count = %d, want 100", got.Count)
	}
	if got.P50Ms > 10 {
		t.Errorf("p50 = %v ms, want <= 10 (the fast group)", got.P50Ms)
	}
	if got.MaxMs < 8999 {
		t.Errorf("max = %v ms, want the 9s outlier", got.MaxMs)
	}
	if got.P99Ms <= got.P50Ms {
		t.Errorf("p99 %v not above p50 %v", got.P99Ms, got.P50Ms)
	}
}

func TestSnapshotOrdersByTotalTime(t *testing.T) {
	r := NewRegistry()
	// "chatty" is called often but is cheap; "heavy" is rare but slow. Total wall
	// clock is what an operator is hunting, so heavy must sort first.
	for i := 0; i < 1000; i++ {
		r.Observe("chatty", 1*time.Millisecond)
	}
	for i := 0; i < 5; i++ {
		r.Observe("heavy", 4*time.Second)
	}
	timings := r.Snapshot().Timings
	if timings[0].Name != "heavy" {
		t.Fatalf("first timing = %q, want heavy", timings[0].Name)
	}
}

func TestSeriesCapIsBounded(t *testing.T) {
	r := NewRegistry()
	for i := 0; i < maxSeries*3; i++ {
		r.Inc(fmt.Sprintf("unbounded.%d", i))
		r.Observe(fmt.Sprintf("unbounded.%d", i), time.Millisecond)
	}
	snap := r.Snapshot()
	if len(snap.Counters) > maxSeries+1 {
		t.Errorf("counters grew to %d, cap is %d", len(snap.Counters), maxSeries)
	}
	if len(snap.Timings) > maxSeries+1 {
		t.Errorf("timings grew to %d, cap is %d", len(snap.Timings), maxSeries)
	}
	// The overflow bucket must still account for the discarded names, or the cap
	// would quietly under-report load.
	if snap.Counters[overflowKey] == 0 {
		t.Error("overflow counter is zero; the cap dropped observations silently")
	}
}

func TestNilRegistryIsInert(t *testing.T) {
	// Handlers take the registry from the server; a zero-value server in a test
	// must not panic just because nobody wired metrics.
	var r *Registry
	r.Inc("x")
	r.Add("y", 2)
	r.Observe("z", time.Second)
	r.Reset()
	if snap := r.Snapshot(); len(snap.Counters) != 0 {
		t.Fatal("nil registry produced counters")
	}
}

func TestConcurrentUse(t *testing.T) {
	r := NewRegistry()
	var wg sync.WaitGroup
	for i := 0; i < 16; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 200; j++ {
				r.Inc("hits")
				r.Observe("dur", time.Duration(j)*time.Millisecond)
			}
		}()
	}
	wg.Wait()
	if got := r.Snapshot().Counters["hits"]; got != 3200 {
		t.Fatalf("hits = %d, want 3200", got)
	}
}
