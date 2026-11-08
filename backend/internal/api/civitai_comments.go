package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// What people say about a model on Civitai, for the model editor.
//
//	GET /api/imagegen/civitai/comments?modelId=&cursor=
//
// The public API has no comments: the site reads them over its internal tRPC
// (`comment.getAll`), which answers a caller with no account 401 "Please use the public
// API instead" (checked 2026-11-07). With the user's own API key the request is theirs,
// signed in, so it is asked with the key, the same header-only way the rest of the
// catalogue is. Without one the client is told so (409, never 401 — a 401 here would
// sign the web client out) and links to the discussion on the site instead.
//
// The answer's shape was read from the site's code, not seen with a key here, so it is
// parsed loosely: what is missing is left out rather than failing the list.

type civitaiComment struct {
	ID        int64  `json:"id"`
	User      string `json:"user"`
	Avatar    string `json:"avatar,omitempty"`
	CreatedAt string `json:"createdAt,omitempty"`
	// HTML is the comment as safe markup (sanitizeCivitaiHTML): it is rich text there.
	HTML    string `json:"html"`
	Replies int    `json:"replies,omitempty"`
	Likes   int    `json:"likes,omitempty"`
}

// civitaiSiteBase is the site the API address belongs to: civitai.com for
// civitai.com/api/v1, and likewise for a mirror.
func civitaiSiteBase(apiURL string) string {
	u, err := url.Parse(strings.TrimSpace(apiURL))
	if err != nil || u.Host == "" {
		return "https://civitai.com"
	}
	return u.Scheme + "://" + u.Host
}

// civitaiTRPCBase is where the site's tRPC answers, beside /api/v1.
func civitaiTRPCBase(apiURL string) string {
	base := strings.TrimRight(strings.TrimSpace(apiURL), "/")
	return strings.TrimSuffix(base, "/v1") + "/trpc"
}

// civitaiAvatarURL turns a user image as the site stores it (often a bare CDN id)
// into a URL the image proxy will fetch.
func civitaiAvatarURL(image string) string {
	image = strings.TrimSpace(image)
	switch {
	case image == "":
		return ""
	case strings.HasPrefix(image, "http://") || strings.HasPrefix(image, "https://"):
		return image
	default:
		return "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/" + url.PathEscape(image) + "/width=96/avatar.jpeg"
	}
}

// rawCivitaiComments is the part of a comment.getAll answer that is read.
type rawCivitaiComments struct {
	Result struct {
		Data struct {
			JSON struct {
				Comments []struct {
					ID        int64  `json:"id"`
					Content   string `json:"content"`
					CreatedAt string `json:"createdAt"`
					User      struct {
						Username string `json:"username"`
						Image    string `json:"image"`
					} `json:"user"`
					Reactions []json.RawMessage `json:"reactions"`
					Count     struct {
						Comments int `json:"comments"`
					} `json:"_count"`
					ChildThread *struct {
						Count struct {
							Comments int `json:"commentCount"`
						} `json:"_count"`
					} `json:"childThread"`
				} `json:"comments"`
				NextCursor json.RawMessage `json:"nextCursor"`
			} `json:"json"`
		} `json:"data"`
	} `json:"result"`
}

func (s *Server) handleCivitaiComments(w http.ResponseWriter, r *http.Request) {
	modelID, _ := strconv.ParseInt(r.URL.Query().Get("modelId"), 10, 64)
	if modelID <= 0 {
		writeErr(w, http.StatusBadRequest, "modelId is required")
		return
	}
	set := s.settings.Get()
	page := civitaiSiteBase(set.CivitaiAPIURL) + "/models/" + strconv.FormatInt(modelID, 10) + "#comments"
	if set.CivitaiAPIKey == "" {
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":    "Civitai only shares a model's comments with a signed-in account — add your Civitai API key under Settings → Image generation",
			"needsKey": true, "page": page,
		})
		return
	}
	input := map[string]any{"modelId": modelID, "limit": 20, "sort": "newest"}
	if c := strings.TrimSpace(r.URL.Query().Get("cursor")); c != "" {
		if n, err := strconv.ParseInt(c, 10, 64); err == nil {
			input["cursor"] = n
		}
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	comments, next, err := s.fetchCivitaiComments(ctx, input)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "page": page})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": comments, "nextCursor": next, "page": page})
}

func (s *Server) fetchCivitaiComments(ctx context.Context, input map[string]any) ([]civitaiComment, string, error) {
	set := s.settings.Get()
	payload, _ := json.Marshal(map[string]any{"json": input})
	target := civitaiTRPCBase(set.CivitaiAPIURL) + "/comment.getAll?input=" + url.QueryEscape(string(payload))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("User-Agent", "OppaiLib")
	req.Header.Set("Authorization", "Bearer "+set.CivitaiAPIKey)
	resp, err := civitaiHTTP.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("Civitai is unreachable")
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return nil, "", fmt.Errorf("Civitai would not share the comments with this API key (%d) — read them on the site", resp.StatusCode)
	case resp.StatusCode != http.StatusOK:
		return nil, "", fmt.Errorf("Civitai returned %d for the comments", resp.StatusCode)
	}
	var raw rawCivitaiComments
	if err := json.NewDecoder(io.LimitReader(resp.Body, 8<<20)).Decode(&raw); err != nil {
		return nil, "", fmt.Errorf("Civitai sent comments in a shape OppaiLib does not read")
	}
	data := raw.Result.Data.JSON
	out := make([]civitaiComment, 0, len(data.Comments))
	for _, c := range data.Comments {
		body := sanitizeCivitaiHTML(c.Content)
		if strings.TrimSpace(body) == "" {
			continue
		}
		replies := c.Count.Comments
		if c.ChildThread != nil && c.ChildThread.Count.Comments > replies {
			replies = c.ChildThread.Count.Comments
		}
		out = append(out, civitaiComment{
			ID: c.ID, User: c.User.Username, Avatar: civitaiAvatarURL(c.User.Image), CreatedAt: c.CreatedAt,
			HTML: body, Replies: replies, Likes: len(c.Reactions),
		})
	}
	next := strings.Trim(string(data.NextCursor), `"`)
	if next == "null" {
		next = ""
	}
	return out, next, nil
}
