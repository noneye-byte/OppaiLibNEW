package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// What people say about a model, a post or a picture on Civitai.
//
//	GET /api/imagegen/civitai/comments?entity=model|post|image&id=&cursor=&sort=
//	GET /api/imagegen/civitai/comments?modelId=&cursor=          (the model editor's)
//
// The public API has no comments: the site reads them over its internal tRPC. In
// November 2026 the site moved every comment surface to one suite, `commentv3`, and the
// old `comment.getAll` the model editor used began answering "No procedure found" — so
// a section is read with `commentv3.getSection` ({entityType, entityId, sort, cursor},
// entity types written in lower case: model, image, post), and the old procedure is
// asked only when a mirror has not got the new one. Either answers a caller with no
// account 401 "Please use the public API instead"; with the user's own API key the
// request is theirs, signed in, so it is asked with the key, the same header-only way
// the rest of the catalogue is. Without one the client is told so (409, never 401 — a
// 401 here would sign the web client out) and links to the discussion on the site.
//
// Both shapes were read from the site's source (civitai/civitai on GitHub,
// src/server/services/commentv3/read.service.ts), not seen with a key here, so they are
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
	// Depth is how far down a thread the comment sits, 0 for one on the page itself;
	// ParentID the comment it answers. A section arrives with its threads opened up to
	// a budget, and is listed here in reading order: each comment, then its replies.
	Depth    int   `json:"depth,omitempty"`
	ParentID int64 `json:"parentId,omitempty"`
	Pinned   bool  `json:"pinned,omitempty"`
	// MoreReplies is how many of its replies were not opened in this page; they are
	// read on the site.
	MoreReplies int `json:"moreReplies,omitempty"`
}

// civitaiCommentEntities are the surfaces a comment section is asked for, as the
// site's CommentEntityType names them, with the page each lives on.
var civitaiCommentEntities = map[string]string{"model": "/models/", "post": "/posts/", "image": "/images/"}

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

// rawCivitaiComments is the part of a legacy comment.getAll answer that is read.
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

// rawCivitaiSection is a commentv3.getSection answer: the page's comments by id, the
// top-level ones in reading order (pinned first), and each opened thread's replies.
type rawCivitaiSection struct {
	Result struct {
		Data struct {
			JSON struct {
				Comments []struct {
					ID          int64  `json:"id"`
					Deleted     bool   `json:"deleted"`
					ParentID    *int64 `json:"parentId"`
					Content     string `json:"content"`
					CreatedAt   string `json:"createdAt"`
					PinnedAt    string `json:"pinnedAt"`
					Hidden      bool   `json:"hidden"`
					TosViolated bool   `json:"tosViolation"`
					Reactions   int    `json:"reactionCount"`
					Replies     int    `json:"replyCount"`
					User        *struct {
						Username string `json:"username"`
						Image    string `json:"image"`
					} `json:"user"`
				} `json:"comments"`
				RootIDs  []int64 `json:"rootIds"`
				Children map[string]struct {
					IDs []int64 `json:"ids"`
				} `json:"children"`
				NextCursor *string `json:"nextCursor"`
			} `json:"json"`
		} `json:"data"`
	} `json:"result"`
}

// errNoProcedure is a tRPC "No procedure found": this mirror has not got the suite.
var errNoProcedure = errors.New("no such procedure")

// civitaiCommentSorts maps the client's words onto the site's ThreadSort.
var civitaiCommentSorts = map[string]string{"": "Newest", "newest": "Newest", "oldest": "Oldest", "reactions": "Most Reactions"}

func (s *Server) handleCivitaiComments(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	entity := strings.ToLower(strings.TrimSpace(q.Get("entity")))
	id, _ := strconv.ParseInt(q.Get("id"), 10, 64)
	if m, _ := strconv.ParseInt(q.Get("modelId"), 10, 64); m > 0 {
		entity, id = "model", m
	}
	pagePath, known := civitaiCommentEntities[entity]
	if !known || id <= 0 {
		writeErr(w, http.StatusBadRequest, "entity (model, post or image) and id are required")
		return
	}
	sort, ok := civitaiCommentSorts[strings.ToLower(q.Get("sort"))]
	if !ok {
		sort = "Newest"
	}
	set := s.settings.Get()
	page := civitaiSiteBase(set.CivitaiAPIURL) + pagePath + strconv.FormatInt(id, 10)
	if entity == "model" {
		page += "#comments"
	}
	if set.CivitaiAPIKey == "" {
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":    "Civitai only shares comments with a signed-in account — add your Civitai API key under Settings → Image generation",
			"needsKey": true, "page": page,
		})
		return
	}
	cursor := strings.TrimSpace(q.Get("cursor"))
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	comments, next, err := s.fetchCivitaiSection(ctx, entity, id, sort, cursor)
	if errors.Is(err, errNoProcedure) && entity == "model" {
		// A mirror from before the comment suite moved.
		input := map[string]any{"modelId": id, "limit": 20, "sort": "newest"}
		if n, perr := strconv.ParseInt(cursor, 10, 64); perr == nil {
			input["cursor"] = n
		}
		comments, next, err = s.fetchCivitaiComments(ctx, input)
	}
	if err != nil {
		if errors.Is(err, errNoProcedure) {
			err = fmt.Errorf("this Civitai does not share comments here — read them on the site")
		}
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": err.Error(), "page": page})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": comments, "nextCursor": next, "page": page})
}

// civitaiTRPC asks one tRPC query with the user's key and decodes its answer.
func (s *Server) civitaiTRPC(ctx context.Context, procedure string, input map[string]any, out any) error {
	set := s.settings.Get()
	payload, _ := json.Marshal(map[string]any{"json": input})
	target := civitaiTRPCBase(set.CivitaiAPIURL) + "/" + procedure + "?input=" + url.QueryEscape(string(payload))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "OppaiLib")
	req.Header.Set("Authorization", "Bearer "+set.CivitaiAPIKey)
	resp, err := civitaiHTTP.Do(req)
	if err != nil {
		return fmt.Errorf("Civitai is unreachable")
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	switch {
	case resp.StatusCode == http.StatusNotFound && strings.Contains(string(body), "No procedure found"):
		return errNoProcedure
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return fmt.Errorf("Civitai would not share the comments with this API key (%d) — read them on the site", resp.StatusCode)
	case resp.StatusCode != http.StatusOK:
		return fmt.Errorf("Civitai returned %d for the comments", resp.StatusCode)
	}
	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("Civitai sent comments in a shape OppaiLib does not read")
	}
	return nil
}

// fetchCivitaiSection reads one page of a comment section, threads flattened into
// reading order.
func (s *Server) fetchCivitaiSection(ctx context.Context, entity string, id int64, sort, cursor string) ([]civitaiComment, string, error) {
	input := map[string]any{"entityType": entity, "entityId": id, "sort": sort}
	if cursor != "" && len(cursor) <= 64 {
		input["cursor"] = cursor
	}
	var raw rawCivitaiSection
	if err := s.civitaiTRPC(ctx, "commentv3.getSection", input, &raw); err != nil {
		return nil, "", err
	}
	data := raw.Result.Data.JSON
	type node = struct {
		c        civitaiComment
		children []int64
		hidden   bool
	}
	byID := make(map[int64]*node, len(data.Comments))
	for _, c := range data.Comments {
		n := &node{hidden: c.Hidden || c.TosViolated}
		body := sanitizeCivitaiHTML(c.Content)
		user, avatar := "", ""
		if c.User != nil {
			user, avatar = c.User.Username, civitaiAvatarURL(c.User.Image)
		}
		if c.Deleted || strings.TrimSpace(body) == "" {
			// A deleted comment that still holds live replies stays as a placeholder,
			// so its thread does not read as answering nobody.
			body = "<p><i>Deleted</i></p>"
			user = ""
		}
		n.c = civitaiComment{
			ID: c.ID, User: user, Avatar: avatar, CreatedAt: c.CreatedAt, HTML: body,
			Replies: c.Replies, Likes: c.Reactions, Pinned: c.PinnedAt != "",
		}
		if c.ParentID != nil {
			n.c.ParentID = *c.ParentID
		}
		if kids, ok := data.Children[strconv.FormatInt(c.ID, 10)]; ok {
			n.children = kids.IDs
		}
		byID[c.ID] = n
	}
	out := make([]civitaiComment, 0, len(byID))
	seen := map[int64]bool{}
	var walk func(id int64, depth int)
	walk = func(id int64, depth int) {
		n, ok := byID[id]
		if !ok || seen[id] || n.hidden {
			return
		}
		seen[id] = true
		n.c.Depth = depth
		shown := 0
		for _, kid := range n.children {
			if _, ok := byID[kid]; ok {
				shown++
			}
		}
		n.c.MoreReplies = max(n.c.Replies-shown, 0)
		out = append(out, n.c)
		for _, kid := range n.children {
			walk(kid, min(depth+1, 6))
		}
	}
	for _, root := range data.RootIDs {
		walk(root, 0)
	}
	// Anything the page sent that no thread named, so nothing that came is dropped.
	for _, c := range data.Comments {
		if !seen[c.ID] && c.ParentID == nil {
			walk(c.ID, 0)
		}
	}
	next := ""
	if data.NextCursor != nil {
		next = *data.NextCursor
	}
	return out, next, nil
}

// fetchCivitaiComments reads the legacy comment.getAll, for a mirror without commentv3.
func (s *Server) fetchCivitaiComments(ctx context.Context, input map[string]any) ([]civitaiComment, string, error) {
	var raw rawCivitaiComments
	if err := s.civitaiTRPC(ctx, "comment.getAll", input, &raw); err != nil {
		return nil, "", err
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
			HTML: body, Replies: replies, Likes: len(c.Reactions), MoreReplies: replies,
		})
	}
	next := strings.Trim(string(data.NextCursor), `"`)
	if next == "null" {
		next = ""
	}
	return out, next, nil
}
