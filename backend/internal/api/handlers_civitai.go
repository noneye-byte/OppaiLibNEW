package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ── Civitai browser ──────────────────────────────────────────────────────────
//
// A read-only window onto Civitai's public model catalogue, reached through the
// civitai.red mirror (the main domain age-gates and region-blocks; the mirror
// serves the same API without an account). Everything is proxied through the
// server: the browser never talks to Civitai directly, matching how remote
// sources work everywhere else in the app. "Install" hands a download URL to
// InvokeAI, which fetches and registers the file itself — the server never
// stores model weights.

// civitaiHTTP is separate from the imagegen client: that one carries a 10-minute
// timeout sized for generation, far too patient for a catalogue browse.
var civitaiHTTP = &http.Client{Timeout: 30 * time.Second}

// civitaiHostAllowed says whether a URL points at Civitai (either domain). Image
// proxying and installs are limited to these hosts so neither can be aimed at an
// arbitrary server.
func civitaiHostAllowed(raw string) bool {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" {
		return false
	}
	host := strings.ToLower(u.Hostname())
	for _, dom := range []string{"civitai.com", "civitai.red"} {
		if host == dom || strings.HasSuffix(host, "."+dom) {
			return true
		}
	}
	return false
}

// The slice of Civitai's model listing the UI needs.
type civitaiListing struct {
	Items []struct {
		ID      int64  `json:"id"`
		Name    string `json:"name"`
		Type    string `json:"type"`
		Creator struct {
			Username string `json:"username"`
		} `json:"creator"`
		Stats struct {
			DownloadCount int64 `json:"downloadCount"`
			ThumbsUpCount int64 `json:"thumbsUpCount"`
		} `json:"stats"`
		ModelVersions []struct {
			ID           int64    `json:"id"`
			Name         string   `json:"name"`
			BaseModel    string   `json:"baseModel"`
			TrainedWords []string `json:"trainedWords"`
			DownloadURL  string   `json:"downloadUrl"`
			Images       []struct {
				URL    string `json:"url"`
				Type   string `json:"type"`
				Width  int    `json:"width"`
				Height int    `json:"height"`
			} `json:"images"`
			Files []struct {
				SizeKB  float64 `json:"sizeKB"`
				Type    string  `json:"type"`
				Primary bool    `json:"primary"`
			} `json:"files"`
		} `json:"modelVersions"`
	} `json:"items"`
	Metadata struct {
		// Sometimes a string ("10|…"), sometimes a bare number, depending on the
		// endpoint variant — normalize below rather than failing the decode.
		NextCursor any    `json:"nextCursor"`
		NextPage   string `json:"nextPage"`
	} `json:"metadata"`
}

// cursorString renders Civitai's nextCursor as the string the next request wants.
func cursorString(v any) string {
	switch c := v.(type) {
	case string:
		return c
	case float64:
		return strings.TrimSuffix(fmt.Sprintf("%v", c), ".0")
	default:
		return ""
	}
}

type civitaiVersionOut struct {
	ID           int64    `json:"id"`
	Name         string   `json:"name"`
	Base         string   `json:"base"`
	TrainedWords []string `json:"trainedWords"`
	DownloadURL  string   `json:"downloadUrl"`
	SizeMB       int64    `json:"sizeMB,omitempty"`
	Images       []string `json:"images"`
}

type civitaiModelOut struct {
	ID        int64               `json:"id"`
	Name      string              `json:"name"`
	Type      string              `json:"type"`
	Creator   string              `json:"creator,omitempty"`
	Downloads int64               `json:"downloads"`
	Likes     int64               `json:"likes"`
	Versions  []civitaiVersionOut `json:"versions"`
}

type civitaiCategoryOut struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// civitaiRequest builds an authenticated catalogue request from the live Settings.
// The key is header-only, so it never lands in URLs, logs or browser history.
func (s *Server) civitaiRequest(ctx context.Context, endpoint string, params url.Values) (*http.Response, error) {
	set := s.settings.Get()
	base := strings.TrimRight(set.CivitaiAPIURL, "/")
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+endpoint+"?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "OppaiLib")
	if set.CivitaiAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+set.CivitaiAPIKey)
	}
	return civitaiHTTP.Do(req)
}

// handleCivitaiSearch proxies one page of Civitai's model search.
func (s *Server) handleCivitaiSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	params := url.Values{}
	params.Set("limit", "24")
	params.Set("nsfw", "true")
	if term := strings.TrimSpace(q.Get("q")); term != "" {
		params.Set("query", term)
	}
	if tag := strings.TrimSpace(q.Get("category")); tag != "" {
		params.Set("tag", tag)
	}
	params.Set("primaryFileOnly", "true")
	switch q.Get("type") {
	case "checkpoint":
		params.Set("types", "Checkpoint")
	case "lora":
		params.Set("types", "LORA")
	}
	switch q.Get("sort") {
	case "newest":
		params.Set("sort", "Newest")
	case "rated":
		params.Set("sort", "Highest Rated")
	default:
		params.Set("sort", "Most Downloaded")
	}
	if cursor := q.Get("cursor"); cursor != "" {
		if page, ok := strings.CutPrefix(cursor, "page:"); ok {
			params.Set("page", page)
		} else {
			params.Set("cursor", cursor)
		}
	}

	resp, err := s.civitaiRequest(r.Context(), "/models", params)
	if err != nil {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("Civitai is unreachable: %v", err))
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("Civitai returned %d", resp.StatusCode))
		return
	}
	var listing civitaiListing
	if err := json.NewDecoder(io.LimitReader(resp.Body, 16<<20)).Decode(&listing); err != nil {
		writeErr(w, http.StatusBadGateway, "Civitai sent an unreadable answer")
		return
	}

	out := []civitaiModelOut{}
	for _, m := range listing.Items {
		model := civitaiModelOut{
			ID: m.ID, Name: m.Name, Type: m.Type,
			Creator:   m.Creator.Username,
			Downloads: m.Stats.DownloadCount,
			Likes:     m.Stats.ThumbsUpCount,
			Versions:  []civitaiVersionOut{},
		}
		for _, v := range m.ModelVersions {
			ver := civitaiVersionOut{
				ID: v.ID, Name: v.Name, Base: v.BaseModel,
				TrainedWords: v.TrainedWords,
				DownloadURL:  v.DownloadURL,
				Images:       []string{},
			}
			if ver.TrainedWords == nil {
				ver.TrainedWords = []string{}
			}
			for _, f := range v.Files {
				if f.Primary || (ver.SizeMB == 0 && f.Type == "Model") {
					ver.SizeMB = int64(f.SizeKB / 1024)
				}
			}
			// Videos can't be a picker thumbnail; keep a handful of stills.
			for _, img := range v.Images {
				if img.Type != "" && img.Type != "image" {
					continue
				}
				if civitaiHostAllowed(img.URL) {
					ver.Images = append(ver.Images, img.URL)
				}
				if len(ver.Images) >= 4 {
					break
				}
			}
			model.Versions = append(model.Versions, ver)
		}
		out = append(out, model)
	}
	next := cursorString(listing.Metadata.NextCursor)
	if next == "" && listing.Metadata.NextPage != "" {
		if u, err := url.Parse(listing.Metadata.NextPage); err == nil {
			if page := u.Query().Get("page"); page != "" {
				next = "page:" + page
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      out,
		"nextCursor": next,
	})
}

// handleCivitaiCategories returns Civitai's most-used model tags. They are the
// catalogue's category system and can be passed back as the model endpoint's tag
// filter without maintaining a stale hard-coded taxonomy.
func (s *Server) handleCivitaiCategories(w http.ResponseWriter, r *http.Request) {
	params := url.Values{"limit": {"100"}}
	resp, err := s.civitaiRequest(r.Context(), "/tags", params)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "Civitai is unreachable")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("Civitai returned %d", resp.StatusCode))
		return
	}
	var listing struct {
		Items []struct {
			Name       string `json:"name"`
			ModelCount int64  `json:"modelCount"`
		} `json:"items"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(&listing); err != nil {
		writeErr(w, http.StatusBadGateway, "Civitai sent an unreadable category list")
		return
	}
	out := make([]civitaiCategoryOut, 0, len(listing.Items))
	for _, tag := range listing.Items {
		if name := strings.TrimSpace(tag.Name); name != "" {
			out = append(out, civitaiCategoryOut{Name: name, Count: tag.ModelCount})
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"categories": out})
}

// handleCivitaiImage streams one Civitai preview image through the server, so the
// browser never talks to Civitai and hotlink rules can't blank the tiles.
func (s *Server) handleCivitaiImage(w http.ResponseWriter, r *http.Request) {
	raw := r.URL.Query().Get("url")
	if !civitaiHostAllowed(raw) {
		writeErr(w, http.StatusBadRequest, "not a Civitai image URL")
		return
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, raw, nil)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad URL")
		return
	}
	req.Header.Set("User-Agent", "OppaiLib")
	resp, err := civitaiHTTP.Do(req)
	if err != nil {
		writeErr(w, http.StatusBadGateway, "Civitai is unreachable")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		writeErr(w, http.StatusBadGateway, fmt.Sprintf("Civitai returned %d", resp.StatusCode))
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(resp.Header.Get("Content-Type")))
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, io.LimitReader(resp.Body, 32<<20))
}

type civitaiInstallReq struct {
	URL string `json:"url"`
}

// handleCivitaiInstall asks InvokeAI to download and register a model. The
// download happens on the InvokeAI box; progress shows up under /installs.
func (s *Server) handleCivitaiInstall(w http.ResponseWriter, r *http.Request) {
	var req civitaiInstallReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if !civitaiHostAllowed(req.URL) {
		writeErr(w, http.StatusBadRequest, "not a Civitai download URL")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	job, err := s.imagegen.InstallModel(r.Context(), base, req.URL)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func (s *Server) handleCivitaiInstalls(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	jobs, err := s.imagegen.InstallJobs(r.Context(), base)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"jobs": jobs})
}
