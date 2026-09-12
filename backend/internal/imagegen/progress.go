package imagegen

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"golang.org/x/net/websocket"
)

// Watching a generation while it runs, and stopping one.
//
// Generate used to be a black box: a request went in and, half a minute to several
// minutes later, pictures came out or an error did. Nothing in between. On a slow
// board that is a long time to wonder whether the prompt is coming out right, and
// finding out that it was not — the wrong pose, the wrong outfit, a hand with seven
// fingers — cost the whole run plus the wait. Both generators show their own users a
// preview every few steps; this reaches the same previews and hands them up through
// GenerateRequest.Progress, so the studio can show the picture forming and the user
// can cancel a run that is going wrong.
//
// The two dialects get there differently:
//
//   - A1111 has a polling endpoint, /sdapi/v1/progress, that answers with the step
//     count and the current preview as base64. Cancel is /sdapi/v1/interrupt.
//   - InvokeAI publishes progress only over socket.io — its REST API says whether a
//     queue item is pending or done and nothing finer. So a small engine.io/socket.io
//     client is written here, enough to subscribe to the queue and read the denoise
//     events, and no more. Cancel is a REST call, by batch id.
//
// Cancellation rides the context: when the caller's ctx is cancelled the generator
// is told to stop with a fresh, short-lived context (the cancelled one cannot make
// the request), and Generate returns ctx.Err(). Either failure is best-effort: a
// preview that does not arrive costs the preview, and a stop that does not land
// costs the GPU a minute, neither of which is worth failing the run over.

// Progress is one update on a running generation.
type Progress struct {
	// Index is which of the batch's images this is about, from 0.
	Index int
	// Step and Total are the denoise steps, when the generator reports them.
	Step, Total int
	// Percent is completion of the current image, 0..1.
	Percent float64
	// Image is a preview of the picture so far as a data: URL, when one came with
	// the update; empty otherwise. Passed through as the generator sent it — a small
	// PNG or JPEG — since the client only ever puts it in an <img>.
	Image string
}

// progressReport calls the request's callback if it has one.
func (req GenerateRequest) progressReport(p Progress) {
	if req.Progress != nil {
		req.Progress(p)
	}
}

// ── A1111 ───────────────────────────────────────────────────────────────────

// a1111Progress is what /sdapi/v1/progress answers.
type a1111Progress struct {
	Progress float64 `json:"progress"`
	State    struct {
		SamplingStep  int `json:"sampling_step"`
		SamplingSteps int `json:"sampling_steps"`
		JobNo         int `json:"job_no"`
		JobCount      int `json:"job_count"`
	} `json:"state"`
	CurrentImage string `json:"current_image"`
}

// a1111WatchProgress polls the generator while a txt2img call is in flight, until
// ctx is done. It runs beside the request, not inside it, since the request itself
// blocks until the last image is decoded.
func (c *Client) a1111WatchProgress(ctx context.Context, base string, req GenerateRequest) {
	if req.Progress == nil {
		return
	}
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
		var p a1111Progress
		if err := c.getJSON(ctx, base+"/sdapi/v1/progress?skip_current_image=false", &p); err != nil {
			continue
		}
		if p.State.SamplingSteps == 0 && p.CurrentImage == "" {
			continue
		}
		update := Progress{Index: p.State.JobNo, Step: p.State.SamplingStep, Total: p.State.SamplingSteps, Percent: p.Progress}
		if p.CurrentImage != "" {
			update.Image = "data:image/png;base64," + p.CurrentImage
		}
		req.progressReport(update)
	}
}

// a1111Interrupt tells the generator to stop. Called after the caller's context is
// already cancelled, so it uses its own.
func (c *Client) a1111Interrupt(base string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/sdapi/v1/interrupt", nil)
	if err != nil {
		return
	}
	if resp, err := c.hc.Do(httpReq); err == nil {
		resp.Body.Close()
	}
}

// ── InvokeAI ────────────────────────────────────────────────────────────────

// invokeCancelBatch asks InvokeAI to cancel every item of a batch. Called after the
// caller's context is cancelled, so it uses its own. Falls back to cancelling the
// items one at a time for versions without the batch endpoint.
func (c *Client) invokeCancelBatch(base, batchID string, itemIDs []int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if batchID != "" {
		body := map[string]any{"batch_ids": []string{batchID}}
		if err := c.sendJSON(ctx, http.MethodPut, base+"/api/v1/queue/"+invokeQueue+"/cancel_by_batch_ids", body, nil); err == nil {
			return
		}
	}
	for _, id := range itemIDs {
		_ = c.sendJSON(ctx, http.MethodPut, fmt.Sprintf("%s/api/v1/queue/%s/i/%d/cancel", base, invokeQueue, id), nil, nil)
	}
}

// invokeProgressEvent is the union of the denoise-progress payloads InvokeAI has
// published across versions: generator_progress (3.x), invocation_denoise_progress
// (4.x) and invocation_progress (5.x). Only the fields read here are named.
type invokeProgressEvent struct {
	BatchID      string `json:"batch_id"`
	QueueBatchID string `json:"queue_batch_id"`
	ItemID       int64  `json:"item_id"`
	QueueItemID  int64  `json:"queue_item_id"`
	Step         int    `json:"step"`
	TotalSteps   int    `json:"total_steps"`
	// Percentage is 0..1 in the versions that send it; null when the event carries
	// no progress figure (a message-only invocation_progress).
	Percentage    *float64        `json:"percentage"`
	ProgressImage *invokeDataURL  `json:"progress_image"`
	Image         *invokeDataURL  `json:"image"`
	Invocation    json.RawMessage `json:"invocation"`
}

type invokeDataURL struct {
	DataURL string `json:"dataURL"`
}

func (e *invokeProgressEvent) batch() string {
	if e.BatchID != "" {
		return e.BatchID
	}
	return e.QueueBatchID
}

func (e *invokeProgressEvent) item() int64 {
	if e.ItemID != 0 {
		return e.ItemID
	}
	return e.QueueItemID
}

func (e *invokeProgressEvent) dataURL() string {
	if e.ProgressImage != nil && e.ProgressImage.DataURL != "" {
		return e.ProgressImage.DataURL
	}
	if e.Image != nil && e.Image.DataURL != "" {
		return e.Image.DataURL
	}
	return ""
}

// invokeProgressEvents are the event names that carry a denoise preview, across the
// versions this client has met.
var invokeProgressEvents = map[string]bool{
	"generator_progress":          true,
	"invocation_denoise_progress": true,
	"invocation_progress":         true,
}

// invokeWatchProgress subscribes to InvokeAI's queue over socket.io and reports the
// denoise previews for one batch until ctx is done. Best-effort throughout: any
// failure ends the watch silently, and the poll in invokeAwaitImage still finishes
// the job.
func (c *Client) invokeWatchProgress(ctx context.Context, base, batchID string, itemIDs []int64, req GenerateRequest) {
	if req.Progress == nil {
		return
	}
	index := make(map[int64]int, len(itemIDs))
	for i, id := range itemIDs {
		index[id] = i
	}
	conn, err := dialInvokeSocket(base)
	if err != nil {
		return
	}
	defer conn.Close()
	// Closing the connection is what unblocks a read; there is no context on the
	// websocket package's receive.
	go func() {
		<-ctx.Done()
		conn.Close()
	}()

	for {
		var packet string
		if err := websocket.Message.Receive(conn, &packet); err != nil {
			return
		}
		switch {
		case packet == "2":
			// engine.io ping; the server drops the connection without a pong.
			_ = websocket.Message.Send(conn, "3")
		case strings.HasPrefix(packet, "0"):
			// engine.io open. Connect to the default socket.io namespace.
			_ = websocket.Message.Send(conn, "40")
		case strings.HasPrefix(packet, "40"):
			// Namespace connected. Ask for the queue's events.
			sub, _ := json.Marshal([]any{"subscribe_queue", map[string]any{"queue_id": invokeQueue}})
			_ = websocket.Message.Send(conn, "42"+string(sub))
		case strings.HasPrefix(packet, "42"):
			if update, ok := invokeProgressFromPacket(packet, batchID, index); ok {
				req.progressReport(update)
			}
		}
	}
}

// invokeProgressFromPacket reads one socket.io event frame into a Progress, when it
// is a denoise event for the batch being watched. Split from the read loop so a test
// can drive it with the frames each InvokeAI version sends.
func invokeProgressFromPacket(packet, batchID string, index map[int64]int) (Progress, bool) {
	name, payload := parseSocketIOEvent(packet)
	if !invokeProgressEvents[name] {
		return Progress{}, false
	}
	var e invokeProgressEvent
	if json.Unmarshal(payload, &e) != nil || e.batch() != batchID {
		return Progress{}, false
	}
	update := Progress{Index: index[e.item()], Step: e.Step, Total: e.TotalSteps, Image: e.dataURL()}
	switch {
	case e.Percentage != nil:
		update.Percent = *e.Percentage
	case e.TotalSteps > 0:
		update.Percent = float64(e.Step) / float64(e.TotalSteps)
	}
	if update.Image == "" && e.Percentage == nil && e.TotalSteps == 0 {
		return Progress{}, false
	}
	return update, true
}

// dialInvokeSocket opens the engine.io websocket InvokeAI serves at /ws/socket.io.
func dialInvokeSocket(base string) (*websocket.Conn, error) {
	u, err := url.Parse(base)
	if err != nil {
		return nil, err
	}
	scheme := "ws"
	if u.Scheme == "https" {
		scheme = "wss"
	}
	target := fmt.Sprintf("%s://%s/ws/socket.io/?EIO=4&transport=websocket", scheme, u.Host)
	config, err := websocket.NewConfig(target, base+"/")
	if err != nil {
		return nil, err
	}
	config.Dialer = &net.Dialer{Timeout: 10 * time.Second}
	return websocket.DialConfig(config)
}

// parseSocketIOEvent is the packet decoder, split out so a test can drive it without
// a socket: given one text frame it returns the event name and payload, or "" when the
// frame is not an event.
func parseSocketIOEvent(packet string) (name string, payload json.RawMessage) {
	if !strings.HasPrefix(packet, "42") {
		return "", nil
	}
	var event []json.RawMessage
	if json.Unmarshal([]byte(packet[2:]), &event) != nil || len(event) < 2 {
		return "", nil
	}
	if json.Unmarshal(event[0], &name) != nil {
		return "", nil
	}
	return name, bytes.TrimSpace(event[1])
}
