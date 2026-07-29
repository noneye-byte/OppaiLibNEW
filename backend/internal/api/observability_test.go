package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/db"
)

func TestDiagnosticsRecordsRoutePatternNotPath(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	// Several distinct media ids. Each is a different URL path and the same route.
	// Keying metrics on the path would mint a series per id and grow without bound,
	// which is why the middleware asks the mux for the pattern instead.
	for _, id := range []string{"1", "2", "3", "4", "5"} {
		do(t, h, token, "GET", "/api/media/"+id, "")
	}

	rec := do(t, h, token, "GET", "/api/diagnostics", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("diagnostics: got %d, body %s", rec.Code, rec.Body)
	}
	var d diagnostics
	if err := json.Unmarshal(rec.Body.Bytes(), &d); err != nil {
		t.Fatalf("decode: %v", err)
	}

	var found string
	for _, tm := range d.Metrics.Timings {
		if strings.Contains(tm.Name, "/api/media/{id}") {
			found = tm.Name
			if tm.Count != 5 {
				t.Errorf("%s count = %d, want 5 in one series", tm.Name, tm.Count)
			}
		}
		if strings.Contains(tm.Name, "/api/media/1") {
			t.Errorf("metric keyed on a concrete path: %s", tm.Name)
		}
	}
	if found == "" {
		t.Fatalf("no series for the media route; timings = %+v", d.Metrics.Timings)
	}
	if d.Metrics.Counters["http.requests"] < 5 {
		t.Errorf("http.requests = %d, want at least 5", d.Metrics.Counters["http.requests"])
	}
	if d.Goroutines <= 0 || d.NumCPU <= 0 {
		t.Error("process facts missing from the snapshot")
	}
	// The database's journal mode dominates every other number on this page, so it
	// has to be in the payload.
	if !d.DBWAL {
		t.Error("dbWal is false; the test database should be in WAL mode")
	}
}

func TestDiagnosticsCountsStatusClasses(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	do(t, h, token, "GET", "/api/media/999999", "") // 404
	do(t, h, token, "GET", "/api/stats", "")        // 200

	rec := do(t, h, token, "GET", "/api/diagnostics", "")
	var d diagnostics
	if err := json.Unmarshal(rec.Body.Bytes(), &d); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if d.Metrics.Counters["http.status.4xx"] < 1 {
		t.Errorf("no 4xx recorded: %v", d.Metrics.Counters)
	}
	if d.Metrics.Counters["http.status.2xx"] < 1 {
		t.Errorf("no 2xx recorded: %v", d.Metrics.Counters)
	}
}

func TestDiagnosticsIsAdminOnly(t *testing.T) {
	s, _ := newTestServer(t)
	h := s.Handler()

	// No token at all.
	req := httptest.NewRequest("GET", "/api/diagnostics", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated diagnostics: got %d, want 401", rec.Code)
	}

	// A signed-in non-admin. The snapshot lists every route and third-party host
	// this install touches, which is not a secondary account's business.
	uid, err := s.db.CreateUser(req.Context(), "plain", "x", false)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := s.db.CreateSession(req.Context(), "plain-token", uid, time.Hour, db.ClientWeb); err != nil {
		t.Fatalf("create session: %v", err)
	}
	rec = do(t, h, "plain-token", "GET", "/api/diagnostics", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("non-admin diagnostics: got %d, want 403", rec.Code)
	}
}

func TestDiagnosticsReset(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()

	do(t, h, token, "GET", "/api/stats", "")
	if rec := do(t, h, token, "POST", "/api/diagnostics/reset", ""); rec.Code != http.StatusOK {
		t.Fatalf("reset: got %d", rec.Code)
	}

	rec := do(t, h, token, "GET", "/api/diagnostics", "")
	var d diagnostics
	if err := json.Unmarshal(rec.Body.Bytes(), &d); err != nil {
		t.Fatalf("decode: %v", err)
	}
	// Only the reset and this read should be counted — an operator resets in order
	// to measure one interaction cleanly.
	if d.Metrics.Counters["http.requests"] > 2 {
		t.Errorf("http.requests = %d after reset, want <= 2", d.Metrics.Counters["http.requests"])
	}
}

// The middleware wraps the ResponseWriter, which is the usual way streaming gets
// broken. The SSE source stream needs Flush to reach the real writer.
func TestStatusRecorderForwardsFlush(t *testing.T) {
	rec := httptest.NewRecorder()
	sr := &statusRecorder{ResponseWriter: rec, status: http.StatusOK}
	if _, ok := interface{}(sr).(http.Flusher); !ok {
		t.Fatal("statusRecorder is not an http.Flusher")
	}
	sr.Write([]byte("data: hi\n\n"))
	sr.Flush()
	if !rec.Flushed {
		t.Error("Flush did not reach the underlying writer")
	}
	if sr.bytes == 0 {
		t.Error("byte count not recorded")
	}
	// http.ResponseController reaches the real writer through Unwrap; the video
	// range handler sets deadlines that way.
	if sr.Unwrap() != http.ResponseWriter(rec) {
		t.Error("Unwrap does not expose the underlying writer")
	}
}
