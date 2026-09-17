package api

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// The account page: what the public API will say about the person the key
// belongs to.
//
// Civitai's own profile page has models, posts, images and collections, a profile
// picture and a cover photo. The public API has models (the model search with a
// username), images (the image feed with a username) and the profile picture
// (/me). It has no endpoint for posts — but every image in the feed carries the
// id of the post it was uploaded in, and the feed comes back newest first, so a
// person's posts are rebuilt here by grouping their images. It has a collections
// listing, but one that ignores every owner filter (userId, username, ids —
// verified against the live mirror), so collections can be searched by name and
// opened, and the person's own are one click away on the site rather than
// pretended to. The cover photo lives in the site's internal API, which refuses
// outside callers; the user record is asked in case it ever says, and the client
// falls back to the newest posted picture as a banner.

// civitaiProfileCover is the profile's cover photo, or "" when the catalogue
// does not share it. Best-effort: the public user record has never carried it,
// but it is the one place it could appear, and asking costs one request.
func (s *Server) civitaiProfileCover(ctx context.Context, userID int64) string {
	if userID <= 0 {
		return ""
	}
	var rec map[string]any
	if err := s.civitaiGet(ctx, "/users/"+strconv.FormatInt(userID, 10), nil, &rec, 1<<20); err != nil {
		return ""
	}
	return civitaiCoverIn(rec)
}

// civitaiCoverIn finds a cover picture in a user record, under any of the names
// the site has used for it, as a full URL or a bare CDN id.
func civitaiCoverIn(rec map[string]any) string {
	if rec == nil {
		return ""
	}
	if profile, ok := rec["profile"].(map[string]any); ok {
		if u := civitaiCoverIn(profile); u != "" {
			return u
		}
	}
	for _, k := range []string{"coverImage", "coverImageUrl", "cover"} {
		switch v := rec[k].(type) {
		case string:
			if u := civitaiImageURLFrom(v); u != "" {
				return u
			}
		case map[string]any:
			for _, kk := range []string{"url", "id"} {
				if str, ok := v[kk].(string); ok {
					if u := civitaiImageURLFrom(str); u != "" {
						return u
					}
				}
			}
		}
	}
	return ""
}

// civitaiCDN is the image CDN's account prefix, the same on every image URL the
// catalogue hands out; a bare id (as the user listing writes avatars) becomes a
// picture under it.
const civitaiCDN = "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/"

func civitaiImageURLFrom(v string) string {
	v = strings.TrimSpace(v)
	switch {
	case v == "":
		return ""
	case civitaiHostAllowed(v):
		return v
	case strings.Contains(v, "/") || strings.Contains(v, ":"):
		return "" // some other host's picture; not proxied
	default:
		return civitaiCDN + url.PathEscape(v) + "/width=1200/cover.jpeg"
	}
}

// ── posts ───────────────────────────────────────────────────────────────────

// civitaiPostOut is one upload of several pictures, as rebuilt from the feed.
type civitaiPostOut struct {
	ID        int64             `json:"id"`
	Username  string            `json:"username,omitempty"`
	CreatedAt string            `json:"createdAt,omitempty"`
	Images    []civitaiImageOut `json:"images"`
}

// groupCivitaiPosts folds a newest-first page of images into posts, in the order
// the posts first appear. A page boundary can split a post in two; the client
// merges a post that continues from the previous page.
func groupCivitaiPosts(images []civitaiImageOut) []civitaiPostOut {
	var out []civitaiPostOut
	index := map[int64]int{}
	for _, img := range images {
		if img.PostID == 0 {
			// An orphan picture is its own post, so nothing goes missing.
			out = append(out, civitaiPostOut{ID: -img.ID, Username: img.Username, CreatedAt: img.CreatedAt, Images: []civitaiImageOut{img}})
			continue
		}
		i, ok := index[img.PostID]
		if !ok {
			index[img.PostID] = len(out)
			out = append(out, civitaiPostOut{ID: img.PostID, Username: img.Username, CreatedAt: img.CreatedAt, Images: []civitaiImageOut{img}})
			continue
		}
		out[i].Images = append(out[i].Images, img)
	}
	if out == nil {
		out = []civitaiPostOut{}
	}
	return out
}

// handleCivitaiPosts lists someone's posts, newest first, each with the pictures
// in it. A page is a page of the image feed grouped by post, so the count of
// posts per page varies.
//
//	username=   whose (required)
//	nsfw=0 cursor=…   as for images
func (s *Server) handleCivitaiPosts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	user := strings.TrimSpace(q.Get("username"))
	if user == "" {
		writeErr(w, http.StatusBadRequest, "username is required")
		return
	}
	page, err := s.civitaiImages(r.Context(), civitaiImageQuery{
		Username: user, Sort: "newest", Cursor: q.Get("cursor"), Limit: 100,
		NSFW: q.Get("nsfw") == "" || isTruthy(q.Get("nsfw")),
	})
	if err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      groupCivitaiPosts(page.Items),
		"nextCursor": page.NextCursor,
	})
}

// ── collections ─────────────────────────────────────────────────────────────

type civitaiCollectionOut struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	// Type is what the collection holds: Image, Post, Model or Article. Only the
	// first two can be opened here — the image feed lists a collection's pictures,
	// while the model search rejects a collectionId (the catalogue's own bug).
	Type     string `json:"type"`
	Count    int64  `json:"count"`
	Cover    string `json:"cover,omitempty"`
	Username string `json:"username,omitempty"`
	UserID   int64  `json:"userId,omitempty"`
	NSFW     bool   `json:"nsfw"`
}

// handleCivitaiCollections searches the catalogue's public collections by name.
//
//	q=…              words in the name (the only filter the endpoint honours)
//	sort=newest | followers   default newest
//	cursor=…
func (s *Server) handleCivitaiCollections(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	params := url.Values{"limit": {"30"}}
	if term := strings.TrimSpace(q.Get("q")); term != "" {
		params.Set("query", term)
	}
	if q.Get("sort") == "followers" {
		params.Set("sort", "Most Followers")
	} else {
		params.Set("sort", "Newest")
	}
	if cursor := q.Get("cursor"); cursor != "" {
		params.Set("cursor", cursor)
	}
	var listing struct {
		Items []struct {
			ID            int64        `json:"id"`
			Name          string       `json:"name"`
			Description   string       `json:"description"`
			Type          string       `json:"type"`
			NSFWLevel     civitaiLevel `json:"nsfwLevel"`
			ItemCount     int64        `json:"itemCount"`
			CoverImageURL string       `json:"coverImageUrl"`
			User          struct {
				ID       int64  `json:"id"`
				Username string `json:"username"`
			} `json:"user"`
		} `json:"items"`
		Metadata struct {
			NextCursor any    `json:"nextCursor"`
			NextPage   string `json:"nextPage"`
		} `json:"metadata"`
	}
	if err := s.civitaiGet(r.Context(), "/collections", params, &listing, 8<<20); err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	out := make([]civitaiCollectionOut, 0, len(listing.Items))
	for _, c := range listing.Items {
		item := civitaiCollectionOut{
			ID: c.ID, Name: c.Name, Description: strings.TrimSpace(c.Description), Type: c.Type,
			Count: c.ItemCount, Username: c.User.Username, UserID: c.User.ID,
			// The level is a bitmask of the browsing levels present; anything past
			// "None" (1) has something adult in it.
			NSFW: int(c.NSFWLevel) > 1,
		}
		if civitaiHostAllowed(c.CoverImageURL) {
			item.Cover = c.CoverImageURL
		}
		out = append(out, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      out,
		"nextCursor": nextCursorOf(listing.Metadata),
	})
}
