// Package obs holds the in-process observability primitives: counters and latency
// histograms, plus a JSON snapshot of both.
//
// Deliberately not Prometheus. This is a single-container self-hosted app on an
// Unraid box with no scraper pointed at it; the thing the operator actually needs
// is to open a page and see which endpoint is slow and which outbound host is
// failing. A pull-based exporter with a client library would add a dependency and
// still require them to run a second service to read it. So: fixed-bucket
// histograms, bounded cardinality, one snapshot endpoint.
//
// Bounded is the important word. Every metric name here is derived from a routing
// pattern or a hostname, never from a path with ids in it — an unbounded key space
// in a map that lives for the process lifetime is a memory leak with extra steps.
// Registry enforces that with a hard cap and an overflow key.
package obs

import (
	"sort"
	"sync"
	"time"
)

// maxSeries caps distinct keys per collection. Reached only if something is
// feeding in unbounded names, which is a bug — the cap makes it a flat line in
// the snapshot instead of unbounded growth.
const maxSeries = 512

// overflowKey collects everything past the cap so the totals stay truthful.
const overflowKey = "(overflow)"

// bucketsMs are the histogram boundaries in milliseconds. Chosen for this app's
// actual latency spread: local DB reads land in the first two, thumbnail and
// scrape work in the middle, and anything past 10s is a request the user has
// already given up on.
var bucketsMs = []float64{5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000}

// Registry is a set of counters and histograms. Safe for concurrent use.
type Registry struct {
	mu       sync.Mutex
	counters map[string]int64
	hists    map[string]*histogram
	since    time.Time
}

type histogram struct {
	count   int64
	sumMs   float64
	maxMs   float64
	buckets []int64 // len(bucketsMs)+1; last is the +Inf overflow
}

func NewRegistry() *Registry {
	return &Registry{
		counters: map[string]int64{},
		hists:    map[string]*histogram{},
		since:    time.Now(),
	}
}

// Inc adds one to a counter.
func (r *Registry) Inc(name string) { r.Add(name, 1) }

// Add adds n to a counter.
func (r *Registry) Add(name string, n int64) {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.counters[name]; !ok && len(r.counters) >= maxSeries {
		name = overflowKey
	}
	r.counters[name] += n
}

// Observe records a duration against a histogram.
func (r *Registry) Observe(name string, d time.Duration) {
	if r == nil {
		return
	}
	ms := float64(d) / float64(time.Millisecond)
	if ms < 0 {
		ms = 0
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	h, ok := r.hists[name]
	if !ok {
		if len(r.hists) >= maxSeries {
			name = overflowKey
			h, ok = r.hists[name]
		}
		if !ok {
			h = &histogram{buckets: make([]int64, len(bucketsMs)+1)}
			r.hists[name] = h
		}
	}
	h.count++
	h.sumMs += ms
	if ms > h.maxMs {
		h.maxMs = ms
	}
	h.buckets[bucketIndex(ms)]++
}

func bucketIndex(ms float64) int {
	// Linear scan: eleven comparisons on a slice this small beats a binary search,
	// and this runs under the registry lock so short matters more than clever.
	for i, b := range bucketsMs {
		if ms <= b {
			return i
		}
	}
	return len(bucketsMs)
}

// Timing is one histogram's summary. The percentiles are interpolated from the
// fixed buckets, so they are estimates — good enough to spot "this endpoint got
// ten times slower", not a substitute for a real trace.
type Timing struct {
	Name  string  `json:"name"`
	Count int64   `json:"count"`
	AvgMs float64 `json:"avgMs"`
	P50Ms float64 `json:"p50Ms"`
	P95Ms float64 `json:"p95Ms"`
	P99Ms float64 `json:"p99Ms"`
	MaxMs float64 `json:"maxMs"`
}

// Snapshot is the whole registry at one instant, ready to marshal.
type Snapshot struct {
	// WindowSeconds is how long these numbers have been accumulating. Counters are
	// monotonic since process start (or since the last Reset), not a rate — without
	// this the reader has no way to turn them into one.
	WindowSeconds float64          `json:"windowSeconds"`
	Counters      map[string]int64 `json:"counters"`
	Timings       []Timing         `json:"timings"`
}

// Snapshot copies the current values out. Timings are sorted by total time spent
// (count × average) descending, because "where did the wall clock go" is the
// question an operator opens this for.
func (r *Registry) Snapshot() Snapshot {
	if r == nil {
		return Snapshot{Counters: map[string]int64{}}
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	snap := Snapshot{
		WindowSeconds: time.Since(r.since).Seconds(),
		Counters:      make(map[string]int64, len(r.counters)),
		Timings:       make([]Timing, 0, len(r.hists)),
	}
	for k, v := range r.counters {
		snap.Counters[k] = v
	}
	for name, h := range r.hists {
		t := Timing{Name: name, Count: h.count, MaxMs: round2(h.maxMs)}
		if h.count > 0 {
			t.AvgMs = round2(h.sumMs / float64(h.count))
		}
		t.P50Ms = round2(h.quantile(0.50))
		t.P95Ms = round2(h.quantile(0.95))
		t.P99Ms = round2(h.quantile(0.99))
		snap.Timings = append(snap.Timings, t)
	}
	sort.Slice(snap.Timings, func(i, j int) bool {
		a := snap.Timings[i].AvgMs * float64(snap.Timings[i].Count)
		b := snap.Timings[j].AvgMs * float64(snap.Timings[j].Count)
		if a != b {
			return a > b
		}
		return snap.Timings[i].Name < snap.Timings[j].Name
	})
	return snap
}

// quantile linearly interpolates within the bucket the target rank falls in.
// Values past the last boundary can only be reported as the observed maximum —
// the +Inf bucket keeps no detail, which is the price of fixed buckets.
func (h *histogram) quantile(q float64) float64 {
	if h.count == 0 {
		return 0
	}
	target := q * float64(h.count)
	var cum float64
	lo := 0.0
	for i, c := range h.buckets {
		next := cum + float64(c)
		if next >= target && c > 0 {
			if i == len(h.buckets)-1 {
				return h.maxMs
			}
			hi := bucketsMs[i]
			// Where in this bucket does the rank sit?
			frac := (target - cum) / float64(c)
			v := lo + frac*(hi-lo)
			if v > h.maxMs {
				return h.maxMs
			}
			return v
		}
		cum = next
		if i < len(bucketsMs) {
			lo = bucketsMs[i]
		}
	}
	return h.maxMs
}

// Reset clears everything and restarts the window. Exposed so an operator can
// zero the numbers before reproducing a slow interaction, which is the only way
// to read process-lifetime counters usefully.
func (r *Registry) Reset() {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.counters = map[string]int64{}
	r.hists = map[string]*histogram{}
	r.since = time.Now()
}

func round2(f float64) float64 {
	return float64(int64(f*100+0.5)) / 100
}
