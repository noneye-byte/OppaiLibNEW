package imagegen

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"
)

// ComfyUI, for the one job the other two generators cannot do: moving pictures.
//
// A short clip made from a still — Wan's image-to-video, AnimateDiff, LTX — is a
// workflow of a dozen nodes whose names and wiring change with every model release, and
// any version this client hard-coded would be stale before it shipped. So nothing is
// hard-coded. The operator exports the workflow they already use from ComfyUI in API
// format and pastes it into settings with placeholders where the run varies:
//
//	"{{image}}"    the uploaded starting picture's name, for a LoadImage node
//	"{{prompt}}"   what should happen in the clip
//	"{{negative}}" what should not
//	"{{seed}}"     a fresh seed (written as a number when it is the whole value)
//
// The runner uploads the picture, fills the placeholders, queues the prompt, waits for
// its history entry and fetches whatever files the workflow saved. Which node saved
// them, and in what format, is the workflow's business.

// ComfyOutput is one file a workflow produced.
type ComfyOutput struct {
	Data []byte
	Name string
	MIME string
}

// comfyPollEvery is how often the history endpoint is asked. A clip takes minutes; a
// second and a half is responsive without hammering a box that is busy rendering.
const comfyPollEvery = 1500 * time.Millisecond

// RunComfyWorkflow runs one API-format workflow and returns its saved outputs, videos
// before stills. progress, when set, is called with a rising Percent while it waits.
func (c *Client) RunComfyWorkflow(ctx context.Context, base, workflow string, vars map[string]string, init []byte, progress func(Progress)) ([]ComfyOutput, error) {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	if base == "" || strings.TrimSpace(workflow) == "" {
		return nil, fmt.Errorf("clips are not set up: ComfyUI's address and a workflow are both needed")
	}
	filled := map[string]string{}
	for k, v := range vars {
		filled[k] = v
	}
	if len(init) > 0 {
		name, err := c.comfyUpload(ctx, base, init)
		if err != nil {
			return nil, err
		}
		filled["image"] = name
	}
	graph, err := substituteComfyVars(workflow, filled)
	if err != nil {
		return nil, err
	}
	clientID := comfyClientID()
	var queued struct {
		PromptID string         `json:"prompt_id"`
		Error    any            `json:"error"`
		Nodes    map[string]any `json:"node_errors"`
	}
	if err := c.postJSON(ctx, base+"/prompt", map[string]any{"prompt": graph, "client_id": clientID}, &queued); err != nil {
		return nil, fmt.Errorf("ComfyUI refused the clip workflow: %w", err)
	}
	if queued.PromptID == "" {
		return nil, fmt.Errorf("ComfyUI accepted the workflow but returned no prompt id")
	}

	started := time.Now()
	ticker := time.NewTicker(comfyPollEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			c.comfyInterrupt(base)
			return nil, ctx.Err()
		case <-ticker.C:
		}
		var history map[string]comfyHistory
		if err := c.getJSON(ctx, base+"/history/"+url.PathEscape(queued.PromptID), &history); err != nil {
			return nil, err
		}
		entry, done := history[queued.PromptID]
		if !done {
			if progress != nil {
				// ComfyUI reports steps over a websocket this client does not hold open, so
				// the bar is an honest crawl towards — never reaching — the end.
				progress(Progress{Percent: crawl(time.Since(started))})
			}
			continue
		}
		if entry.Status.StatusStr == "error" {
			return nil, fmt.Errorf("ComfyUI's clip workflow failed: %s", entry.errText())
		}
		files := comfyFiles(entry)
		if len(files) == 0 {
			return nil, fmt.Errorf("the clip workflow finished without saving anything")
		}
		out := make([]ComfyOutput, 0, len(files))
		for _, f := range files {
			data, err := c.comfyView(ctx, base, f)
			if err != nil {
				return nil, err
			}
			out = append(out, ComfyOutput{Data: data, Name: f.Filename, MIME: comfyMIME(f.Filename, data)})
		}
		return out, nil
	}
}

// crawl maps elapsed time onto 0.05–0.95 with a long tail, so the bar keeps moving on a
// render that takes ten minutes without claiming to be nearly done after one.
func crawl(elapsed time.Duration) float64 {
	s := elapsed.Seconds()
	return 0.05 + 0.9*(s/(s+90))
}

// substituteComfyVars fills a workflow's placeholders and parses the result.
//
// A placeholder that is a whole JSON string — "seed": "{{seed}}" — becomes the value as
// a JSON literal, so a numeric value lands as a number: ComfyUI rejects a seed written
// as a string. One inside a longer string — "masterpiece, {{prompt}}" — is spliced in
// escaped. A placeholder nothing was supplied for is left alone, so the error ComfyUI
// gives names it.
func substituteComfyVars(workflow string, vars map[string]string) (map[string]any, error) {
	text := workflow
	for key, value := range vars {
		whole := `"{{` + key + `}}"`
		literal, _ := json.Marshal(value)
		if _, err := strconv.ParseInt(value, 10, 64); err == nil {
			literal = []byte(value)
		}
		text = strings.ReplaceAll(text, whole, string(literal))
		escaped, _ := json.Marshal(value)
		inner := string(escaped[1 : len(escaped)-1])
		text = strings.ReplaceAll(text, "{{"+key+"}}", inner)
	}
	var graph map[string]any
	if err := json.Unmarshal([]byte(text), &graph); err != nil {
		return nil, fmt.Errorf("the clip workflow is not valid JSON: %w", err)
	}
	// The API format is a map of node id → node. The UI's "Save" format is a document
	// with a nodes array, which /prompt cannot run; saying so beats ComfyUI's own error.
	if _, uiFormat := graph["nodes"]; uiFormat {
		return nil, fmt.Errorf("the clip workflow is in ComfyUI's UI format; export it with \"Save (API Format)\" instead")
	}
	return graph, nil
}

type comfyFile struct {
	Filename  string `json:"filename"`
	Subfolder string `json:"subfolder"`
	Type      string `json:"type"`
}

type comfyHistory struct {
	Outputs map[string]map[string]json.RawMessage `json:"outputs"`
	Status  struct {
		StatusStr string  `json:"status_str"`
		Messages  [][]any `json:"messages"`
	} `json:"status"`
}

func (h comfyHistory) errText() string {
	for _, m := range h.Status.Messages {
		if len(m) == 2 && m[0] == "execution_error" {
			if detail, ok := m[1].(map[string]any); ok {
				if msg, ok := detail["exception_message"].(string); ok && msg != "" {
					return strings.TrimSpace(msg)
				}
			}
		}
	}
	return "no reason given"
}

// comfyFiles lists a finished run's saved outputs, moving pictures first. Nodes put
// them under different keys — SaveImage under "images", VHS_VideoCombine under "gifs",
// the core video nodes under "videos" — so every list of files is read, and only files
// of type "output" are kept: "temp" ones are previews.
func comfyFiles(h comfyHistory) []comfyFile {
	var moving, still []comfyFile
	for _, outputs := range h.Outputs {
		for _, raw := range outputs {
			var files []comfyFile
			if json.Unmarshal(raw, &files) != nil {
				continue
			}
			for _, f := range files {
				if f.Filename == "" || (f.Type != "" && f.Type != "output") {
					continue
				}
				switch strings.ToLower(path.Ext(f.Filename)) {
				case ".mp4", ".webm", ".gif", ".webp", ".mov":
					moving = append(moving, f)
				default:
					still = append(still, f)
				}
			}
		}
	}
	return append(moving, still...)
}

func comfyMIME(name string, data []byte) string {
	switch strings.ToLower(path.Ext(name)) {
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".mov":
		return "video/quicktime"
	case ".webp":
		return "image/webp"
	case ".gif":
		return "image/gif"
	}
	return http.DetectContentType(data)
}

func (c *Client) comfyUpload(ctx context.Context, base string, data []byte) (string, error) {
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="image"; filename="oppailib-`+comfyClientID()+`.png"`)
	h.Set("Content-Type", http.DetectContentType(data))
	part, err := mw.CreatePart(h)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(data); err != nil {
		return "", err
	}
	_ = mw.WriteField("overwrite", "true")
	if err := mw.Close(); err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/upload/image", &body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	resp, err := c.hc.Do(req)
	if err != nil {
		return "", fmt.Errorf("ComfyUI unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<10))
		return "", fmt.Errorf("ComfyUI returned %d taking the starting picture: %s", resp.StatusCode, bytes.TrimSpace(msg))
	}
	var out struct {
		Name      string `json:"name"`
		Subfolder string `json:"subfolder"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil || out.Name == "" {
		return "", fmt.Errorf("ComfyUI did not say where it put the starting picture")
	}
	if out.Subfolder != "" {
		return out.Subfolder + "/" + out.Name, nil
	}
	return out.Name, nil
}

func (c *Client) comfyView(ctx context.Context, base string, f comfyFile) ([]byte, error) {
	q := url.Values{"filename": {f.Filename}, "subfolder": {f.Subfolder}, "type": {f.Type}}
	if f.Type == "" {
		q.Set("type", "output")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/view?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ComfyUI unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ComfyUI returned %d for the finished clip", resp.StatusCode)
	}
	// A clip is a few megabytes; the bound is there for a workflow that saved a
	// lossless sequence by mistake.
	return io.ReadAll(io.LimitReader(resp.Body, 96<<20))
}

// comfyInterrupt stops the run on the server when the caller gave up on it, so a
// closed conversation does not leave the card rendering for nobody.
func (c *Client) comfyInterrupt(base string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = c.postJSON(ctx, base+"/interrupt", map[string]any{}, nil)
}

func comfyClientID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
