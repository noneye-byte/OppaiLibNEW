package api

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"net/http"
	"runtime"
	"strconv"
	"time"

	"github.com/youruser/oppailib/internal/buildinfo"
	"github.com/youruser/oppailib/internal/obs"
)

// Structured request logging and metrics.
//
// The brief asks for structured server logs and performance metrics, and the two
// belong together here: what the operator actually needs when the app "struggles
// with fetching and navigation" is to see which endpoint is slow and whether the
// time went into our own handler or into someone else's website. Both halves land
// in one registry — the scraper's, shared through Engine.Metrics — so a request's
// duration and the outbound fetch it was waiting on are read side by side.
//
// Metric keys are the *routing pattern*, never the request path. "GET /api/media/
// {id}/thumb" is one series; using r.URL.Path would mint a new series per media id
// and turn the registry into a memory leak. Getting the pattern requires asking the
// mux, which is why the middleware takes a *http.ServeMux rather than an
// http.Handler.

// slowRequest is the threshold above which a request is logged as a warning rather
// than at debug. Set where a human would notice: a fifth of a second is invisible,
// three seconds is the point at which the UI looks stuck.
const slowRequest = 3 * time.Second

// observe wraps the router with access logging and metrics.
func (s *Server) observe(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Ask the router which pattern will handle this, before handling it. An
		// unmatched request has no pattern and is bucketed under one key.
		_, pattern := mux.Handler(r)
		key := r.Method + " " + pattern
		if pattern == "" {
			key = r.Method + " (unmatched)"
		}

		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		defer func() {
			// A panicking handler still produced a request worth recording, and the
			// recovery must not swallow the panic — it is re-raised for the server's own
			// recovery so behaviour is unchanged apart from the accounting.
			elapsed := time.Since(start)
			if p := recover(); p != nil {
				s.metrics.Inc("http.panic")
				s.metrics.Observe("http."+key, elapsed)
				s.log.Error("handler panic", "method", r.Method, "route", pattern, "err", fmt.Sprint(p))
				panic(p)
			}
			s.metrics.Observe("http."+key, elapsed)
			s.metrics.Inc("http.requests")
			s.metrics.Inc("http.status." + strconv.Itoa(rec.status/100) + "xx")
			s.metrics.Add("http.response_bytes", rec.bytes)

			attrs := []any{
				"method", r.Method,
				"route", pattern,
				"status", rec.status,
				"ms", elapsed.Milliseconds(),
				"bytes", rec.bytes,
			}
			switch {
			case rec.status >= 500:
				s.log.Error("request failed", attrs...)
			case elapsed >= slowRequest:
				// Deliberately a warning and not a debug line. A slow request is the
				// symptom being chased, and burying it at debug is why nobody has the
				// evidence when it happens.
				s.log.Warn("slow request", attrs...)
			case rec.status >= 400:
				s.log.Info("request rejected", attrs...)
			default:
				s.log.Debug("request", attrs...)
			}
		}()

		mux.ServeHTTP(rec, r)
	})
}

// statusRecorder captures the status code and byte count of a response.
//
// Wrapping a ResponseWriter is where middleware usually breaks streaming, so the
// optional interfaces this app actually relies on are forwarded explicitly:
// Flush for the SSE source stream, Hijack for completeness, and Unwrap so
// http.ResponseController can reach the real writer for read/write deadlines —
// which is what the video range handler needs.
type statusRecorder struct {
	http.ResponseWriter
	status      int
	bytes       int64
	wroteHeader bool
}

func (r *statusRecorder) WriteHeader(code int) {
	if r.wroteHeader {
		return
	}
	r.wroteHeader = true
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	if !r.wroteHeader {
		r.WriteHeader(http.StatusOK)
	}
	n, err := r.ResponseWriter.Write(b)
	r.bytes += int64(n)
	return n, err
}

func (r *statusRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (r *statusRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if h, ok := r.ResponseWriter.(http.Hijacker); ok {
		return h.Hijack()
	}
	return nil, nil, errors.New("hijack unsupported")
}

// Unwrap lets http.ResponseController see through this wrapper.
func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

// diagnostics is the payload of GET /api/diagnostics: the metric snapshot plus the
// process facts that explain it.
type diagnostics struct {
	Version       string  `json:"version"`
	UptimeSeconds float64 `json:"uptimeSeconds"`
	Goroutines    int     `json:"goroutines"`
	HeapMB        float64 `json:"heapMB"`
	SysMB         float64 `json:"sysMB"`
	GCCount       uint32  `json:"gcCount"`
	NumCPU        int     `json:"numCpu"`
	// DBWAL is false when the database could not enter WAL mode, which means every
	// query in the process is serialized on one connection. It belongs in front of
	// the operator because it is invisible otherwise and it dominates everything
	// else on this page.
	DBWAL       bool         `json:"dbWal"`
	DBOpenConns int          `json:"dbOpenConns"`
	DBInUse     int          `json:"dbInUse"`
	DBWaitCount int64        `json:"dbWaitCount"`
	DBWaitMS    int64        `json:"dbWaitMs"`
	Metrics     obs.Snapshot `json:"metrics"`
}

// handleDiagnostics serves the metric snapshot. Admin-only: it names every route
// and every third-party host this install talks to, which is not something to hand
// to a secondary account.
func (s *Server) handleDiagnostics(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	d := diagnostics{
		Version:       buildinfo.String(),
		UptimeSeconds: time.Since(s.startedAt).Seconds(),
		Goroutines:    runtime.NumGoroutine(),
		HeapMB:        mb(m.HeapAlloc),
		SysMB:         mb(m.Sys),
		GCCount:       m.NumGC,
		NumCPU:        runtime.NumCPU(),
		Metrics:       s.metrics.Snapshot(),
	}
	if s.db != nil {
		d.DBWAL = s.db.WAL()
		st := s.db.SQL().Stats()
		d.DBOpenConns = st.OpenConnections
		d.DBInUse = st.InUse
		d.DBWaitCount = st.WaitCount
		d.DBWaitMS = st.WaitDuration.Milliseconds()
	}
	writeJSON(w, http.StatusOK, d)
}

// handleResetDiagnostics zeroes the counters and restarts the window.
//
// Process-lifetime totals are close to unreadable for the thing they are needed
// for: an operator reproducing a slow interaction wants the numbers for *that*
// interaction, not for the fortnight the container has been up.
func (s *Server) handleResetDiagnostics(w http.ResponseWriter, r *http.Request) {
	s.metrics.Reset()
	writeJSON(w, http.StatusOK, map[string]string{"status": "reset"})
}

func mb(b uint64) float64 {
	return float64(int64(float64(b)/(1024*1024)*100+0.5)) / 100
}
