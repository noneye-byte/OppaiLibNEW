package imagegen

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"golang.org/x/net/websocket"
)

// The three shapes InvokeAI has published a denoise preview in, each read into the
// same Progress; an event for another batch, or with nothing to report, is ignored.
func TestInvokeProgressFromPacketAcrossVersions(t *testing.T) {
	index := map[int64]int{11: 0, 12: 1}
	cases := []struct {
		name   string
		packet string
		want   Progress
		ok     bool
	}{
		{"v4 denoise", `42["invocation_denoise_progress",{"batch_id":"b1","item_id":12,"step":5,"total_steps":20,"percentage":0.25,"progress_image":{"dataURL":"data:image/png;base64,AAA","width":64,"height":96}}]`,
			Progress{Index: 1, Step: 5, Total: 20, Percent: 0.25, Image: "data:image/png;base64,AAA"}, true},
		{"v5 progress", `42["invocation_progress",{"batch_id":"b1","item_id":11,"message":"Denoising","percentage":0.5,"image":{"dataURL":"data:image/jpeg;base64,BBB"}}]`,
			Progress{Index: 0, Percent: 0.5, Image: "data:image/jpeg;base64,BBB"}, true},
		{"v3 generator", `42["generator_progress",{"queue_batch_id":"b1","queue_item_id":11,"step":10,"total_steps":20,"progress_image":{"dataURL":"data:image/png;base64,CCC"}}]`,
			Progress{Index: 0, Step: 10, Total: 20, Percent: 0.5, Image: "data:image/png;base64,CCC"}, true},
		{"other batch", `42["invocation_denoise_progress",{"batch_id":"b2","item_id":12,"step":5,"total_steps":20}]`, Progress{}, false},
		{"message only", `42["invocation_progress",{"batch_id":"b1","item_id":11,"message":"Loading model","percentage":null,"image":null}]`, Progress{}, false},
		{"unrelated event", `42["queue_item_status_changed",{"batch_id":"b1"}]`, Progress{}, false},
		{"not an event", `40{"sid":"x"}`, Progress{}, false},
	}
	for _, tc := range cases {
		got, ok := invokeProgressFromPacket(tc.packet, "b1", index)
		if ok != tc.ok || got != tc.want {
			t.Errorf("%s: got %+v, %v; want %+v, %v", tc.name, got, ok, tc.want, tc.ok)
		}
	}
}

// A run against InvokeAI: the previews arrive over socket.io while the queue is
// polled, and cancelling the context cancels the batch on the server.
func TestInvokeGenerateReportsProgressAndCancels(t *testing.T) {
	var previewSent atomic.Bool
	var cancelled atomic.Int32
	var subscribed atomic.Bool
	var releaseItem atomic.Bool
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/app/version", func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, `{"version":"5.4.0"}`) })
	mux.HandleFunc("/api/v2/models/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"models":[{"key":"key-main","hash":"h1","name":"AnimeThing","base":"sd-1","type":"main"}]}`)
	})
	mux.HandleFunc("/api/v1/queue/default/enqueue_batch", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"item_ids":[11],"batch":{"batch_id":"b1"}}`)
	})
	mux.HandleFunc("/api/v1/queue/default/cancel_by_batch_ids", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			BatchIDs []string `json:"batch_ids"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		if r.Method == http.MethodPut && len(body.BatchIDs) == 1 && body.BatchIDs[0] == "b1" {
			cancelled.Add(1)
		}
		fmt.Fprint(w, `{}`)
	})
	mux.HandleFunc("/api/v1/queue/default/i/11", func(w http.ResponseWriter, r *http.Request) {
		if !releaseItem.Load() {
			fmt.Fprint(w, `{"item_id":11,"status":"in_progress"}`)
			return
		}
		fmt.Fprint(w, `{"item_id":11,"status":"completed","session":{"results":{"l2i:0":{"type":"image_output","image":{"image_name":"img.png"}}}}}`)
	})
	mux.HandleFunc("/api/v1/images/i/img.png/full", func(w http.ResponseWriter, r *http.Request) {
		// A 2x2 opaque PNG, so the black-image check passes.
		w.Write(tinyPNG(t))
	})
	mux.Handle("/ws/socket.io/", websocket.Handler(func(conn *websocket.Conn) {
		defer conn.Close()
		_ = websocket.Message.Send(conn, `0{"sid":"s1","upgrades":[],"pingInterval":25000,"pingTimeout":20000}`)
		for {
			var packet string
			if err := websocket.Message.Receive(conn, &packet); err != nil {
				return
			}
			switch {
			case packet == "40":
				_ = websocket.Message.Send(conn, `40{"sid":"n1"}`)
			case strings.HasPrefix(packet, `42["subscribe_queue"`):
				subscribed.Store(true)
				// A ping first, to check the pong; then the preview.
				_ = websocket.Message.Send(conn, "2")
			case packet == "3":
				_ = websocket.Message.Send(conn, `42["invocation_denoise_progress",{"batch_id":"b1","item_id":11,"step":3,"total_steps":10,"percentage":0.3,"progress_image":{"dataURL":"data:image/png;base64,PREVIEW"}}]`)
				previewSent.Store(true)
			}
		}
	}))
	srv := httptest.NewServer(mux)
	defer srv.Close()

	var mu sync.Mutex
	var got []Progress
	req := GenerateRequest{Prompt: "a test", Checkpoint: "key-main", Steps: 10, Width: 64, Height: 64, Count: 1, Seed: 1,
		Progress: func(p Progress) {
			mu.Lock()
			got = append(got, p)
			mu.Unlock()
			if p.Image != "" {
				releaseItem.Store(true)
			}
		}}
	res, err := New().Generate(context.Background(), srv.URL, req)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Images) != 1 {
		t.Fatalf("images = %d", len(res.Images))
	}
	if !subscribed.Load() || !previewSent.Load() {
		t.Fatal("the watch never subscribed to the queue and answered the ping")
	}
	mu.Lock()
	var preview, finished bool
	for _, p := range got {
		if p.Image == "data:image/png;base64,PREVIEW" && p.Step == 3 && p.Total == 10 {
			preview = true
		}
		if p.Percent == 1 && p.Image == "" {
			finished = true
		}
	}
	mu.Unlock()
	if !preview || !finished {
		t.Fatalf("progress reports = %+v; want the preview and the completion", got)
	}

	// Cancel: the run is abandoned and the batch cancelled on the server.
	releaseItem.Store(false)
	ctx, cancel := context.WithCancel(context.Background())
	go func() { time.Sleep(200 * time.Millisecond); cancel() }()
	if _, err := New().Generate(ctx, srv.URL, GenerateRequest{Prompt: "a test", Checkpoint: "key-main", Steps: 10, Width: 64, Height: 64, Count: 1, Seed: 1}); err != context.Canceled {
		t.Fatalf("cancelled run returned %v, want context.Canceled", err)
	}
	deadline := time.Now().Add(2 * time.Second)
	for cancelled.Load() == 0 && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
	}
	if cancelled.Load() == 0 {
		t.Fatal("the batch was not cancelled on the server")
	}
}

// A run against A1111: progress is polled while txt2img is in flight, and cancelling
// interrupts the generator.
func TestA1111GenerateReportsProgressAndInterrupts(t *testing.T) {
	var interrupted atomic.Int32
	var polls atomic.Int32
	release := make(chan struct{})
	mux := http.NewServeMux()
	mux.HandleFunc("/sdapi/v1/sd-models", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `[{"title":"m.safetensors","model_name":"m"}]`)
	})
	mux.HandleFunc("/sdapi/v1/progress", func(w http.ResponseWriter, r *http.Request) {
		polls.Add(1)
		fmt.Fprint(w, `{"progress":0.4,"state":{"sampling_step":4,"sampling_steps":10,"job_no":0},"current_image":"UFJFVklFVw=="}`)
	})
	mux.HandleFunc("/sdapi/v1/interrupt", func(w http.ResponseWriter, r *http.Request) { interrupted.Add(1); fmt.Fprint(w, `{}`) })
	var hold atomic.Bool
	mux.HandleFunc("/sdapi/v1/txt2img", func(w http.ResponseWriter, r *http.Request) {
		if hold.Load() {
			// The cancel half: block until the client gives up (bounded, so the test
			// server can close if the client never does).
			select {
			case <-r.Context().Done():
			case <-time.After(3 * time.Second):
			}
			return
		}
		select {
		case <-release:
		case <-r.Context().Done():
			return
		}
		png := tinyPNG(t)
		fmt.Fprintf(w, `{"images":[%q],"info":"{\"seed\":1}"}`, base64Std(png))
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	var mu sync.Mutex
	var got []Progress
	req := GenerateRequest{Prompt: "a test", Steps: 10, Width: 64, Height: 64, Count: 1, Seed: 1,
		Progress: func(p Progress) {
			mu.Lock()
			got = append(got, p)
			mu.Unlock()
		}}
	go func() {
		for polls.Load() == 0 {
			time.Sleep(20 * time.Millisecond)
		}
		close(release)
	}()
	if _, err := New().Generate(context.Background(), srv.URL, req); err != nil {
		t.Fatal(err)
	}
	mu.Lock()
	found := false
	for _, p := range got {
		if p.Step == 4 && p.Total == 10 && p.Image == "data:image/png;base64,UFJFVklFVw==" {
			found = true
		}
	}
	mu.Unlock()
	if !found {
		t.Fatalf("progress reports = %+v; want the polled preview", got)
	}

	hold.Store(true)
	ctx, cancel := context.WithCancel(context.Background())
	go func() { time.Sleep(150 * time.Millisecond); cancel() }()
	if _, err := New().Generate(ctx, srv.URL, GenerateRequest{Prompt: "a test", Steps: 10, Width: 64, Height: 64, Count: 1, Seed: 1}); err != context.Canceled {
		t.Fatalf("cancelled run returned %v, want context.Canceled", err)
	}
	if interrupted.Load() == 0 {
		t.Fatal("the generator was not interrupted")
	}
}

// tinyPNG is a small opaque white PNG, so the black-image check lets it through.
func tinyPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	for y := 0; y < 2; y++ {
		for x := 0; x < 2; x++ {
			img.Set(x, y, color.White)
		}
	}
	var out bytes.Buffer
	if err := png.Encode(&out, img); err != nil {
		t.Fatal(err)
	}
	return out.Bytes()
}

func base64Std(b []byte) string { return base64.StdEncoding.EncodeToString(b) }
