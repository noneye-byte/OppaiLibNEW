package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// A named run can be watched while the generate request is in flight — the poll
// shows the generator's preview and step count — and cancelled, at which point the
// generate request returns "cancelled" rather than an error and the generator is
// interrupted.
func TestImageGenProgressAndCancel(t *testing.T) {
	var interrupted atomic.Int32
	hold := make(chan struct{})
	gen := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			_, _ = w.Write([]byte(`[{"title":"rev.safetensors [abc123]","model_name":"rev","hash":"abc123"}]`))
		case "/sdapi/v1/progress":
			_, _ = w.Write([]byte(`{"progress":0.5,"state":{"sampling_step":10,"sampling_steps":20,"job_no":0},"current_image":"` + onePixelPNG + `"}`))
		case "/sdapi/v1/interrupt":
			interrupted.Add(1)
			_, _ = w.Write([]byte(`{}`))
		case "/sdapi/v1/txt2img":
			select {
			case <-hold:
				_, _ = w.Write([]byte(`{"images":["` + onePixelPNG + `"],"info":"{\"seed\":4242}"}`))
			case <-r.Context().Done():
			case <-time.After(5 * time.Second):
			}
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(gen.Close)
	s, token := newTestServer(t)
	enableImageGen(t, s, gen.URL)
	h := s.Handler()

	done := make(chan *httptest.ResponseRecorder, 1)
	go func() {
		done <- do(t, h, token, "POST", "/api/imagegen/generate", `{"jobId":"run-0001","prompt":"a test","steps":20}`)
	}()

	// The poll sees the preview once the generator has been asked (the watch ticks
	// once a second).
	var seen string
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		rec := do(t, h, token, "GET", "/api/imagegen/progress/run-0001?seen=0", "")
		if rec.Code == http.StatusOK && strings.Contains(rec.Body.String(), `"step":10`) && strings.Contains(rec.Body.String(), `"image":"data:image/png;base64,`) {
			seen = rec.Body.String()
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	if seen == "" {
		t.Fatal("the poll never showed the generator's preview")
	}
	// The same seq again withholds the picture.
	seq := seen[strings.Index(seen, `"seq":`)+6:]
	seq = seq[:strings.IndexAny(seq, ",}")]
	if rec := do(t, h, token, "GET", "/api/imagegen/progress/run-0001?seen="+seq, ""); strings.Contains(rec.Body.String(), `"image"`) {
		t.Fatalf("an unchanged preview was re-sent: %s", rec.Body)
	}

	if rec := do(t, h, token, "POST", "/api/imagegen/cancel/run-0001", ""); rec.Code != http.StatusOK {
		t.Fatalf("cancel: %d %s", rec.Code, rec.Body)
	}
	select {
	case rec := <-done:
		if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "cancelled") {
			t.Fatalf("cancelled generate returned %d %s", rec.Code, rec.Body)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("the generate request did not return after cancel")
	}
	if interrupted.Load() == 0 {
		t.Fatal("the generator was not interrupted")
	}
	// The job lingers readable, marked done and cancelled, and an unknown one is 404.
	if rec := do(t, h, token, "GET", "/api/imagegen/progress/run-0001?seen=0", ""); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"cancelled":true`) || !strings.Contains(rec.Body.String(), `"done":true`) {
		t.Fatalf("finished job: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, token, "GET", "/api/imagegen/progress/nope-0001?seen=0", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("unknown job: %d", rec.Code)
	}
	close(hold)
}
