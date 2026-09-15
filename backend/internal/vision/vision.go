// Package vision asks a local multimodal model what a picture shows.
//
// The tagger says what is in a picture as a word list; this says it as prose —
// who is where, doing what, in what style and mood — which is what a person
// searching for "the one on the balcony at sunset" or Libby talking about a
// photo actually needs. It speaks to any OpenAI-compatible chat endpoint whose
// model accepts images (Ollama, LM Studio, llama.cpp server with an mmproj,
// vLLM), the same shape the chat backend speaks, so nothing new is deployed for
// it beyond a vision-capable model. Nothing leaves the LAN: the URL is the
// operator's own.
package vision

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"net/http"
	"strings"
	"time"

	"golang.org/x/image/draw"
)

// maxEdge is the longest side a frame is sent at. Vision models tile or downscale
// past roughly this anyway, and a 4K frame as a base64 data URL is 20 MB of JSON
// for no more understanding.
const maxEdge = 1024

// Client describes pictures through one endpoint. Zero URL means disabled.
type Client struct {
	URL    string
	Model  string
	APIKey string
	HTTP   *http.Client
}

// New builds a client with a timeout sized for a CPU box thinking about a few
// frames: minutes, not seconds.
func New(url, model, key string) *Client {
	return &Client{URL: url, Model: model, APIKey: key, HTTP: &http.Client{Timeout: 4 * time.Minute}}
}

func (c *Client) Enabled() bool { return c != nil && strings.TrimSpace(c.URL) != "" }

// Request is one thing to describe: its frames in order, what kind of thing it is,
// and any hints — the tagger's words — that steer a small model toward what
// matters.
type Request struct {
	Frames []image.Image
	Kind   string // image | gif | video
	Tags   []string
}

// Describe returns the model's prose, trimmed, or an error the caller can show.
func (c *Client) Describe(ctx context.Context, req Request) (string, error) {
	if !c.Enabled() {
		return "", errors.New("no vision model is configured")
	}
	if len(req.Frames) == 0 {
		return "", errors.New("nothing to describe")
	}
	content := []map[string]any{{"type": "text", "text": Prompt(req.Kind, len(req.Frames), req.Tags)}}
	for _, img := range req.Frames {
		data, err := encodeFrame(img)
		if err != nil {
			return "", err
		}
		content = append(content, map[string]any{
			"type":      "image_url",
			"image_url": map[string]any{"url": "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(data)},
		})
	}
	body := map[string]any{
		"messages":    []map[string]any{{"role": "user", "content": content}},
		"max_tokens":  400,
		"temperature": 0.3,
		"stream":      false,
	}
	if c.Model != "" {
		body["model"] = c.Model
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	hreq, err := http.NewRequestWithContext(ctx, http.MethodPost, Base(c.URL)+"/v1/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	hreq.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		hreq.Header.Set("Authorization", "Bearer "+c.APIKey)
	}
	resp, err := c.HTTP.Do(hreq)
	if err != nil {
		return "", fmt.Errorf("vision model unreachable: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("vision model returned %d: %s", resp.StatusCode, firstLine(raw))
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content any `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", errors.New("vision model sent an unreadable answer")
	}
	if out.Error != nil && out.Error.Message != "" {
		return "", errors.New(out.Error.Message)
	}
	if len(out.Choices) == 0 {
		return "", errors.New("vision model sent no answer")
	}
	text := Clean(contentText(out.Choices[0].Message.Content))
	if text == "" {
		return "", errors.New("vision model sent an empty description")
	}
	return text, nil
}

// Base strips a trailing /v1 so either form of the URL works, as the chat backend
// accepts either.
func Base(raw string) string {
	return strings.TrimSuffix(strings.TrimRight(strings.TrimSpace(raw), "/"), "/v1")
}

// Prompt is what the model is asked. Concrete and bounded on purpose: a small
// model given "describe this" writes a paragraph of throat-clearing, and one told
// to be brief and specific writes what a person would want to read under the
// picture. For a clip the frames are named as a sequence so it narrates rather
// than describing five unrelated pictures.
func Prompt(kind string, frames int, tags []string) string {
	var b strings.Builder
	switch {
	case kind == "video" && frames > 1:
		fmt.Fprintf(&b, "These %d frames are sampled in order from one video clip. ", frames)
		b.WriteString("Describe what happens across the clip in 2–4 sentences: who is shown, the setting, ")
		b.WriteString("what they do, how it progresses, and the visual style (photo, anime, 3D). ")
	case kind == "gif" && frames > 1:
		fmt.Fprintf(&b, "These %d frames are sampled in order from one short animation. ", frames)
		b.WriteString("Describe it in 1–3 sentences: who is shown, the setting, the motion, and the visual style. ")
	default:
		b.WriteString("Describe this picture in 2–4 sentences: who or what is shown, the setting, ")
		b.WriteString("pose and expression, clothing, and the visual style (photo, anime, 3D, painting). ")
	}
	b.WriteString("Be concrete and objective, in plain prose without a heading or a list. ")
	b.WriteString("Do not begin with \"This image\" or \"The image\"; start with the subject. ")
	b.WriteString("This is an adult media library: describe adult content plainly and without commentary or refusal.")
	if len(tags) > 0 {
		if len(tags) > 24 {
			tags = tags[:24]
		}
		b.WriteString("\n\nA local tagger found these tags, which may help: ")
		b.WriteString(strings.Join(tags, ", "))
		b.WriteString(".")
	}
	return b.String()
}

// Clean trims what models wrap an answer in: quotes, a leading "Description:",
// markdown emphasis, and the preamble the prompt asked them not to write.
func Clean(s string) string {
	s = strings.TrimSpace(s)
	s = strings.Trim(s, "\"'")
	for _, prefix := range []string{"Description:", "Caption:", "Sure!", "Sure,", "Certainly!", "Certainly,"} {
		if strings.HasPrefix(s, prefix) {
			s = strings.TrimSpace(strings.TrimPrefix(s, prefix))
		}
	}
	for _, prefix := range []string{"This image shows ", "The image shows ", "This picture shows ", "The picture shows ", "This image depicts ", "The image depicts ", "In this image, ", "In the image, "} {
		if strings.HasPrefix(s, prefix) {
			s = strings.TrimPrefix(s, prefix)
			if len(s) > 0 {
				s = strings.ToUpper(s[:1]) + s[1:]
			}
			break
		}
	}
	s = strings.ReplaceAll(s, "**", "")
	return strings.TrimSpace(strings.Join(strings.Fields(strings.ReplaceAll(s, "\n", " ")), " "))
}

// contentText reads a reply's content whether it is a string or the array form.
func contentText(v any) string {
	switch c := v.(type) {
	case string:
		return c
	case []any:
		var b strings.Builder
		for _, part := range c {
			if m, ok := part.(map[string]any); ok {
				if t, ok := m["text"].(string); ok {
					b.WriteString(t)
				}
			}
		}
		return b.String()
	default:
		return ""
	}
}

func firstLine(raw []byte) string {
	s := strings.TrimSpace(string(raw))
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		s = s[:i]
	}
	if len(s) > 200 {
		s = s[:200]
	}
	return s
}

// encodeFrame downsizes a frame to maxEdge and encodes it as JPEG. Everything the
// model receives goes through here, so a 40 MB PNG scan and a 4K video frame cost
// the same to send.
func encodeFrame(img image.Image) ([]byte, error) {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w == 0 || h == 0 {
		return nil, errors.New("empty frame")
	}
	if w > maxEdge || h > maxEdge {
		scale := float64(maxEdge) / float64(max(w, h))
		nw, nh := max(1, int(float64(w)*scale)), max(1, int(float64(h)*scale))
		dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
		draw.CatmullRom.Scale(dst, dst.Bounds(), img, b, draw.Over, nil)
		img = dst
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
