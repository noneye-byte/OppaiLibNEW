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

// ── Civitai browser ──────────────────────────────────────────────────────────
//
// A window onto Civitai's public catalogue, reached through the civitai.red mirror
// (the main domain age-gates and region-blocks; the mirror serves the same API
// without an account). Everything is proxied through the server: the browser never
// talks to Civitai directly, matching how remote sources work everywhere else in
// the app. "Install" hands a download URL to InvokeAI, which fetches and registers
// the file itself — the server never stores model weights — and once the file is
// in, the catalogue's cover, description and trigger words are written onto the
// InvokeAI record so the model arrives looking the way it did on the site
// (civitai_installs.go).
//
// What the public API offers, and therefore what this does: search with the site's
// own filters (type, base model, period, creator, NSFW), one model's full page,
// the pictures people posted with a version, who an API key belongs to, and a
// lookup by file hash that ties the models already in InvokeAI back to their
// catalogue pages. What it does not offer is uploading — the site's own uploads go
// through an internal, undocumented tRPC and S3 flow with no public counterpart —
// so nothing here pretends to.

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

// ── the catalogue's shapes ──────────────────────────────────────────────────

type civitaiRawImage struct {
	URL       string         `json:"url"`
	Type      string         `json:"type"`
	Width     int            `json:"width"`
	Height    int            `json:"height"`
	NSFWLevel civitaiLevel   `json:"nsfwLevel"`
	Meta      map[string]any `json:"meta"`
}

// civitaiLevel is a browsing level, which the catalogue writes as a number on a
// model's showcase images (1, 2, 4, 8, 16) and as a word on the image feed
// ("None", "Soft", "Mature", "X", "XXX"). One type reads both, as the number.
type civitaiLevel int

func (l *civitaiLevel) UnmarshalJSON(b []byte) error {
	var n int
	if err := json.Unmarshal(b, &n); err == nil {
		*l = civitaiLevel(n)
		return nil
	}
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		*l = 0
		return nil // an unknown shape is not worth failing the whole page for
	}
	switch strings.ToLower(s) {
	case "none":
		*l = 1
	case "soft":
		*l = 2
	case "mature":
		*l = 4
	case "x":
		*l = 8
	case "xxx":
		*l = 16
	default:
		*l = 0
	}
	return nil
}

type civitaiRawFile struct {
	Name        string            `json:"name"`
	SizeKB      float64           `json:"sizeKB"`
	Type        string            `json:"type"`
	Primary     bool              `json:"primary"`
	DownloadURL string            `json:"downloadUrl"`
	Hashes      map[string]string `json:"hashes"`
	Metadata    struct {
		Format string `json:"format"`
		Fp     string `json:"fp"`
		Size   string `json:"size"`
	} `json:"metadata"`
}

type civitaiRawVersion struct {
	ID           int64             `json:"id"`
	ModelID      int64             `json:"modelId"`
	Name         string            `json:"name"`
	BaseModel    string            `json:"baseModel"`
	TrainedWords []string          `json:"trainedWords"`
	DownloadURL  string            `json:"downloadUrl"`
	PublishedAt  string            `json:"publishedAt"`
	Description  string            `json:"description"`
	Images       []civitaiRawImage `json:"images"`
	Files        []civitaiRawFile  `json:"files"`
	Stats        struct {
		DownloadCount int64 `json:"downloadCount"`
		ThumbsUpCount int64 `json:"thumbsUpCount"`
	} `json:"stats"`
	// Present on the by-hash and by-id version endpoints, which describe the parent
	// model in brief rather than nesting the version under it.
	Model *struct {
		Name string `json:"name"`
		Type string `json:"type"`
		NSFW bool   `json:"nsfw"`
	} `json:"model"`
}

type civitaiRawModel struct {
	ID          int64    `json:"id"`
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Description string   `json:"description"`
	NSFW        bool     `json:"nsfw"`
	NSFWLevel   int      `json:"nsfwLevel"`
	Tags        []string `json:"tags"`
	Creator     struct {
		Username string `json:"username"`
		Image    string `json:"image"`
	} `json:"creator"`
	Stats struct {
		DownloadCount int64 `json:"downloadCount"`
		ThumbsUpCount int64 `json:"thumbsUpCount"`
	} `json:"stats"`
	ModelVersions []civitaiRawVersion `json:"modelVersions"`
}

// The slice of Civitai's model listing the UI needs.
type civitaiListing struct {
	Items    []civitaiRawModel `json:"items"`
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

// nextCursorOf turns either paging shape the API uses into one opaque cursor.
func nextCursorOf(meta struct {
	NextCursor any    `json:"nextCursor"`
	NextPage   string `json:"nextPage"`
}) string {
	next := cursorString(meta.NextCursor)
	if next == "" && meta.NextPage != "" {
		if u, err := url.Parse(meta.NextPage); err == nil {
			if page := u.Query().Get("page"); page != "" {
				next = "page:" + page
			}
		}
	}
	return next
}

// ── what the clients receive ────────────────────────────────────────────────

type civitaiFileOut struct {
	Name        string `json:"name"`
	SizeMB      int64  `json:"sizeMB"`
	Type        string `json:"type"`
	Format      string `json:"format,omitempty"`
	Precision   string `json:"precision,omitempty"`
	SHA256      string `json:"sha256,omitempty"`
	BLAKE3      string `json:"blake3,omitempty"`
	Primary     bool   `json:"primary"`
	DownloadURL string `json:"downloadUrl"`
}

type civitaiVersionOut struct {
	ID           int64    `json:"id"`
	Name         string   `json:"name"`
	Base         string   `json:"base"`
	TrainedWords []string `json:"trainedWords"`
	DownloadURL  string   `json:"downloadUrl"`
	SizeMB       int64    `json:"sizeMB,omitempty"`
	Images       []string `json:"images"`
	// The rest is filled in on the detail page only; a search page stays light.
	Description string           `json:"description,omitempty"`
	PublishedAt string           `json:"publishedAt,omitempty"`
	Downloads   int64            `json:"downloads,omitempty"`
	Likes       int64            `json:"likes,omitempty"`
	Files       []civitaiFileOut `json:"files,omitempty"`
	// Installed says InvokeAI already holds this version's file, matched by hash,
	// and InstalledKey is its record — what "open in the studio" needs.
	Installed    bool   `json:"installed"`
	InstalledKey string `json:"installedKey,omitempty"`
}

type civitaiModelOut struct {
	ID           int64               `json:"id"`
	Name         string              `json:"name"`
	Type         string              `json:"type"`
	Creator      string              `json:"creator,omitempty"`
	CreatorImage string              `json:"creatorImage,omitempty"`
	Downloads    int64               `json:"downloads"`
	Likes        int64               `json:"likes"`
	NSFW         bool                `json:"nsfw"`
	Tags         []string            `json:"tags"`
	Description  string              `json:"description,omitempty"`
	Versions     []civitaiVersionOut `json:"versions"`
	// Installed is true when any version of the model is in InvokeAI.
	Installed bool `json:"installed"`
}

type civitaiCategoryOut struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// civitaiPreviewURLs keeps the stills of a version, proxied later, capped so a
// version with ninety showcase images does not become ninety proxied loads.
func civitaiPreviewURLs(images []civitaiRawImage, max int) []string {
	out := []string{}
	for _, img := range images {
		if img.Type != "" && img.Type != "image" {
			continue
		}
		if civitaiHostAllowed(img.URL) {
			out = append(out, img.URL)
		}
		if len(out) >= max {
			break
		}
	}
	return out
}

// civitaiVersionOutOf converts a version, marking it installed when one of its
// files' hashes is in InvokeAI. detail adds the fields a search page leaves out.
func civitaiVersionOutOf(v civitaiRawVersion, installed map[string]string, detail bool) civitaiVersionOut {
	ver := civitaiVersionOut{
		ID: v.ID, Name: v.Name, Base: v.BaseModel,
		TrainedWords: v.TrainedWords,
		DownloadURL:  v.DownloadURL,
		Images:       civitaiPreviewURLs(v.Images, 4),
	}
	if ver.TrainedWords == nil {
		ver.TrainedWords = []string{}
	}
	for _, f := range v.Files {
		if f.Primary || (ver.SizeMB == 0 && f.Type == "Model") {
			ver.SizeMB = int64(f.SizeKB / 1024)
		}
		if key, ok := installed[strings.ToUpper(f.Hashes["BLAKE3"])]; ok && f.Hashes["BLAKE3"] != "" {
			ver.Installed, ver.InstalledKey = true, key
		}
		if detail {
			ver.Files = append(ver.Files, civitaiFileOut{
				Name: f.Name, SizeMB: int64(f.SizeKB / 1024), Type: f.Type,
				Format: f.Metadata.Format, Precision: f.Metadata.Fp,
				SHA256: f.Hashes["SHA256"], BLAKE3: f.Hashes["BLAKE3"],
				Primary: f.Primary, DownloadURL: f.DownloadURL,
			})
		}
	}
	if detail {
		ver.Images = civitaiPreviewURLs(v.Images, 12)
		ver.Description = sanitizeCivitaiHTML(v.Description)
		ver.PublishedAt = v.PublishedAt
		ver.Downloads, ver.Likes = v.Stats.DownloadCount, v.Stats.ThumbsUpCount
		if ver.Files == nil {
			ver.Files = []civitaiFileOut{}
		}
	}
	return ver
}

func civitaiModelOutOf(m civitaiRawModel, installed map[string]string, detail bool) civitaiModelOut {
	model := civitaiModelOut{
		ID: m.ID, Name: m.Name, Type: m.Type,
		Creator: m.Creator.Username, Downloads: m.Stats.DownloadCount, Likes: m.Stats.ThumbsUpCount,
		NSFW: m.NSFW, Tags: m.Tags, Versions: []civitaiVersionOut{},
	}
	if civitaiHostAllowed(m.Creator.Image) {
		model.CreatorImage = m.Creator.Image
	}
	if model.Tags == nil {
		model.Tags = []string{}
	}
	if detail {
		model.Description = sanitizeCivitaiHTML(m.Description)
	}
	for _, v := range m.ModelVersions {
		ver := civitaiVersionOutOf(v, installed, detail)
		model.Installed = model.Installed || ver.Installed
		model.Versions = append(model.Versions, ver)
	}
	return model
}

// ── talking to the catalogue ────────────────────────────────────────────────

// errCivitaiNotFound is a 404 from the catalogue: a hash nobody has uploaded, a
// model that was taken down. Callers that expect it check for it; everything else
// is reported as the catalogue being unreachable.
var errCivitaiNotFound = errors.New("not on Civitai")

// errCivitaiNoKey is a request that needs the account the API key belongs to when
// no key has been configured.
var errCivitaiNoKey = errors.New("no Civitai API key is set — add one under Settings")

// civitaiRequest builds an authenticated catalogue request from the live Settings.
// The key is header-only, so it never lands in URLs, logs or browser history.
func (s *Server) civitaiRequest(ctx context.Context, endpoint string, params url.Values) (*http.Response, error) {
	set := s.settings.Get()
	base := strings.TrimRight(set.CivitaiAPIURL, "/")
	target := base + endpoint
	if len(params) > 0 {
		target += "?" + params.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "OppaiLib")
	if set.CivitaiAPIKey != "" {
		req.Header.Set("Authorization", "Bearer "+set.CivitaiAPIKey)
	}
	return civitaiHTTP.Do(req)
}

// civitaiGet fetches and decodes one catalogue endpoint, with the error shapes
// the handlers turn into HTTP statuses.
func (s *Server) civitaiGet(ctx context.Context, endpoint string, params url.Values, out any, limit int64) error {
	resp, err := s.civitaiRequest(ctx, endpoint, params)
	if err != nil {
		return fmt.Errorf("Civitai is unreachable: %w", err)
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
	case http.StatusNotFound:
		return errCivitaiNotFound
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("Civitai refused the request (%d): check the API key under Settings", resp.StatusCode)
	default:
		return fmt.Errorf("Civitai returned %d", resp.StatusCode)
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, limit)).Decode(out); err != nil {
		return fmt.Errorf("Civitai sent an unreadable answer")
	}
	return nil
}

// civitaiStatus maps a catalogue error to the status the client should see.
func civitaiStatus(err error) int {
	switch {
	case errors.Is(err, errCivitaiNotFound):
		return http.StatusNotFound
	case errors.Is(err, errCivitaiNoKey):
		return http.StatusBadRequest
	default:
		return http.StatusBadGateway
	}
}

func (s *Server) civitaiModel(ctx context.Context, id int64) (*civitaiRawModel, error) {
	var m civitaiRawModel
	if err := s.civitaiGet(ctx, "/models/"+strconv.FormatInt(id, 10), url.Values{"nsfw": {"true"}}, &m, 8<<20); err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *Server) civitaiVersionByHash(ctx context.Context, hash string) (*civitaiRawVersion, error) {
	var v civitaiRawVersion
	if err := s.civitaiGet(ctx, "/model-versions/by-hash/"+url.PathEscape(hash), nil, &v, 4<<20); err != nil {
		return nil, err
	}
	return &v, nil
}

// installedByHash is what InvokeAI holds, keyed by upper-case BLAKE3, which is the
// hash both catalogues publish. Cached briefly: a search page asks once, not once
// per model card. Empty (not an error) when there is no InvokeAI to ask.
func (s *Server) installedByHash(ctx context.Context) map[string]string {
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		return map[string]string{}
	}
	out, err := s.installedHashCache.get(ctx, set.ImageGenURL, func(ctx context.Context) (map[string]string, error) {
		records, err := s.imagegen.ModelRecords(ctx, set.ImageGenURL)
		if err != nil {
			return nil, err
		}
		m := make(map[string]string, len(records))
		for _, r := range records {
			if h := blake3Of(r.Hash); h != "" {
				m[h] = r.Key
			}
		}
		return m, nil
	})
	if err != nil {
		return map[string]string{}
	}
	return out
}

// blake3Of reads InvokeAI's "blake3:…" hash as the upper-case hex Civitai uses.
// Other schemes ("random:", "blake3_multi:" for diffusers folders) have no
// counterpart on Civitai and read as no hash.
func blake3Of(h string) string {
	rest, ok := strings.CutPrefix(strings.ToLower(strings.TrimSpace(h)), "blake3:")
	if !ok || rest == "" {
		return ""
	}
	return strings.ToUpper(rest)
}

// ── search ──────────────────────────────────────────────────────────────────

// civitaiTypes maps the client's type filter to the catalogue's. "lora" covers the
// three LoRA-shaped formats, which InvokeAI loads alike.
var civitaiTypes = map[string][]string{
	"checkpoint": {"Checkpoint"},
	"lora":       {"LORA", "LoCon", "DoRA"},
	"embedding":  {"TextualInversion"},
	"vae":        {"VAE"},
	"controlnet": {"Controlnet"},
	"upscaler":   {"Upscaler"},
}

var civitaiSorts = map[string]string{
	"":           "Most Downloaded",
	"downloaded": "Most Downloaded",
	"rated":      "Highest Rated",
	"newest":     "Newest",
	"liked":      "Most Liked",
	"discussed":  "Most Discussed",
	"collected":  "Most Collected",
	"images":     "Most Images",
}

var civitaiPeriods = map[string]string{
	"day": "Day", "week": "Week", "month": "Month", "year": "Year", "all": "AllTime",
}

// handleCivitaiSearch proxies one page of Civitai's model search.
//
//	q=…            words in the name and description
//	type=lora      checkpoint | lora | embedding | vae | controlnet | upscaler
//	category=…     one of the catalogue's tags (see /categories)
//	base=SDXL 1.0  one base model, as the catalogue names them
//	period=month   day | week | month | year | all (the window the sort ranks in)
//	sort=rated     downloaded (default) | rated | newest | liked | discussed | collected | images
//	creator=…      one username
//	nsfw=0         hide adult models; on by default, this being what it is
//	cursor=…       from the previous page's nextCursor
func (s *Server) handleCivitaiSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	params := url.Values{}
	params.Set("limit", "24")
	params.Set("nsfw", strconv.FormatBool(q.Get("nsfw") == "" || isTruthy(q.Get("nsfw"))))
	if term := strings.TrimSpace(q.Get("q")); term != "" {
		params.Set("query", term)
	}
	if tag := strings.TrimSpace(q.Get("category")); tag != "" {
		params.Set("tag", tag)
	}
	if base := strings.TrimSpace(q.Get("base")); base != "" {
		params.Set("baseModels", base)
	}
	if creator := strings.TrimSpace(q.Get("creator")); creator != "" {
		params.Set("username", creator)
	}
	if period, ok := civitaiPeriods[strings.ToLower(q.Get("period"))]; ok {
		params.Set("period", period)
	}
	params.Set("primaryFileOnly", "true")
	for _, t := range civitaiTypes[q.Get("type")] {
		params.Add("types", t)
	}
	if sort, ok := civitaiSorts[q.Get("sort")]; ok {
		params.Set("sort", sort)
	} else {
		params.Set("sort", "Most Downloaded")
	}
	if cursor := q.Get("cursor"); cursor != "" {
		if page, ok := strings.CutPrefix(cursor, "page:"); ok {
			params.Set("page", page)
		} else {
			params.Set("cursor", cursor)
		}
	}

	var listing civitaiListing
	if err := s.civitaiGet(r.Context(), "/models", params, &listing, 16<<20); err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	installed := s.installedByHash(r.Context())
	out := make([]civitaiModelOut, 0, len(listing.Items))
	for _, m := range listing.Items {
		out = append(out, civitaiModelOutOf(m, installed, false))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":      out,
		"nextCursor": nextCursorOf(listing.Metadata),
	})
}

// handleCivitaiModel is one model's page: the description, every version with its
// files and showcase images, and which of them InvokeAI already has.
func (s *Server) handleCivitaiModel(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if id <= 0 {
		writeErr(w, http.StatusBadRequest, "bad model id")
		return
	}
	m, err := s.civitaiModel(r.Context(), id)
	if err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, civitaiModelOutOf(*m, s.installedByHash(r.Context()), true))
}

// handleCivitaiCategories returns Civitai's most-used model tags. They are the
// catalogue's category system and can be passed back as the model endpoint's tag
// filter without maintaining a stale hard-coded taxonomy.
func (s *Server) handleCivitaiCategories(w http.ResponseWriter, r *http.Request) {
	var listing struct {
		Items []struct {
			Name       string `json:"name"`
			ModelCount int64  `json:"modelCount"`
		} `json:"items"`
	}
	if err := s.civitaiGet(r.Context(), "/tags", url.Values{"limit": {"100"}}, &listing, 2<<20); err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
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

// ── images ──────────────────────────────────────────────────────────────────

// civitaiImageOut is one picture from the catalogue's image feed, with the prompt
// that made it when the poster kept it — the reason to browse a version's gallery
// is to see what it does and take a prompt that works.
type civitaiImageOut struct {
	ID             int64   `json:"id"`
	URL            string  `json:"url"`
	Width          int     `json:"width"`
	Height         int     `json:"height"`
	NSFWLevel      int     `json:"nsfwLevel"`
	Username       string  `json:"username,omitempty"`
	Prompt         string  `json:"prompt,omitempty"`
	NegativePrompt string  `json:"negativePrompt,omitempty"`
	Sampler        string  `json:"sampler,omitempty"`
	Steps          int     `json:"steps,omitempty"`
	CfgScale       float64 `json:"cfgScale,omitempty"`
	Seed           int64   `json:"seed,omitempty"`
	Model          string  `json:"model,omitempty"`
	Size           string  `json:"size,omitempty"`
}

func metaString(m map[string]any, keys ...string) string {
	for _, k := range keys {
		switch v := m[k].(type) {
		case string:
			if v != "" {
				return v
			}
		case float64:
			return strconv.FormatFloat(v, 'f', -1, 64)
		}
	}
	return ""
}

func metaNumber(m map[string]any, keys ...string) float64 {
	for _, k := range keys {
		switch v := m[k].(type) {
		case float64:
			return v
		case string:
			if f, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
				return f
			}
		}
	}
	return 0
}

// handleCivitaiImages lists posted images: a version's showcase, a model's, or a
// user's, newest or most-reacted first. The image URLs come back for the proxy.
//
//	versionId= | modelId= | username=   what to list (one of)
//	sort=newest | reactions | comments   default reactions
//	period=… nsfw=0 cursor=…             as for search
func (s *Server) handleCivitaiImages(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	params := url.Values{"limit": {"30"}}
	params.Set("nsfw", map[bool]string{true: "X", false: "None"}[q.Get("nsfw") == "" || isTruthy(q.Get("nsfw"))])
	if id, _ := strconv.ParseInt(q.Get("versionId"), 10, 64); id > 0 {
		params.Set("modelVersionId", strconv.FormatInt(id, 10))
	} else if id, _ := strconv.ParseInt(q.Get("modelId"), 10, 64); id > 0 {
		params.Set("modelId", strconv.FormatInt(id, 10))
	} else if user := strings.TrimSpace(q.Get("username")); user != "" {
		params.Set("username", user)
	} else {
		writeErr(w, http.StatusBadRequest, "versionId, modelId or username is required")
		return
	}
	switch q.Get("sort") {
	case "newest":
		params.Set("sort", "Newest")
	case "comments":
		params.Set("sort", "Most Comments")
	default:
		params.Set("sort", "Most Reactions")
	}
	if period, ok := civitaiPeriods[strings.ToLower(q.Get("period"))]; ok {
		params.Set("period", period)
	}
	if cursor := q.Get("cursor"); cursor != "" {
		if page, ok := strings.CutPrefix(cursor, "page:"); ok {
			params.Set("page", page)
		} else {
			params.Set("cursor", cursor)
		}
	}
	var listing struct {
		Items []struct {
			ID       int64  `json:"id"`
			Username string `json:"username"`
			civitaiRawImage
		} `json:"items"`
		Metadata struct {
			NextCursor any    `json:"nextCursor"`
			NextPage   string `json:"nextPage"`
		} `json:"metadata"`
	}
	if err := s.civitaiGet(r.Context(), "/images", params, &listing, 8<<20); err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	out := make([]civitaiImageOut, 0, len(listing.Items))
	for _, it := range listing.Items {
		if (it.Type != "" && it.Type != "image") || !civitaiHostAllowed(it.URL) {
			continue
		}
		img := civitaiImageOut{
			ID: it.ID, URL: it.URL, Width: it.Width, Height: it.Height,
			NSFWLevel: int(it.NSFWLevel), Username: it.Username,
		}
		if m := it.Meta; m != nil {
			img.Prompt = metaString(m, "prompt")
			img.NegativePrompt = metaString(m, "negativePrompt")
			img.Sampler = metaString(m, "sampler")
			img.Steps = int(metaNumber(m, "steps"))
			img.CfgScale = metaNumber(m, "cfgScale")
			img.Seed = int64(metaNumber(m, "seed"))
			img.Model = metaString(m, "Model", "model")
			img.Size = metaString(m, "Size", "size")
		}
		out = append(out, img)
	}
	// The catalogue shares generation data (the prompt behind a picture) only with
	// an API key; without one every meta comes back null. Say so, so the client can
	// explain an empty prompt panel rather than look broken.
	withPrompts := 0
	for _, img := range out {
		if img.Prompt != "" {
			withPrompts++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":       out,
		"nextCursor":  nextCursorOf(listing.Metadata),
		"withPrompts": withPrompts,
		"keySet":      s.settings.Get().CivitaiAPIKey != "",
	})
}

// handleCivitaiImage streams one Civitai preview image through the server, so the
// browser never talks to Civitai and hotlink rules can't blank the tiles.
func (s *Server) handleCivitaiImage(w http.ResponseWriter, r *http.Request) {
	raw := r.URL.Query().Get("url")
	if !civitaiHostAllowed(raw) {
		writeErr(w, http.StatusBadRequest, "not a Civitai image URL")
		return
	}
	data, ct, err := s.civitaiFetchImage(r.Context(), raw)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(ct))
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// civitaiFetchImage downloads one preview, for the proxy and for cover art.
//
// A grid opening is a burst of thirty image loads at once, and the image CDN
// answers a burst with 429s for some of them; one short retry turns a blank tile
// into a picture without the browser having to know.
func (s *Server) civitaiFetchImage(ctx context.Context, raw string) ([]byte, string, error) {
	var lastStatus int
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			select {
			case <-time.After(time.Duration(attempt) * 400 * time.Millisecond):
			case <-ctx.Done():
				return nil, "", ctx.Err()
			}
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, raw, nil)
		if err != nil {
			return nil, "", fmt.Errorf("bad URL")
		}
		req.Header.Set("User-Agent", "OppaiLib")
		resp, err := civitaiHTTP.Do(req)
		if err != nil {
			return nil, "", fmt.Errorf("Civitai is unreachable")
		}
		if resp.StatusCode == http.StatusOK {
			data, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
			resp.Body.Close()
			if err != nil {
				return nil, "", fmt.Errorf("Civitai cut the image short")
			}
			return data, resp.Header.Get("Content-Type"), nil
		}
		resp.Body.Close()
		lastStatus = resp.StatusCode
		if resp.StatusCode != http.StatusTooManyRequests && resp.StatusCode < 500 {
			break
		}
	}
	return nil, "", fmt.Errorf("Civitai returned %d", lastStatus)
}

// ── the account ─────────────────────────────────────────────────────────────

// handleCivitaiMe says who the configured API key belongs to, so the browser can
// show that person's models and posted images as "yours". Without a key there is
// no account to show, and that is reported rather than guessed.
func (s *Server) handleCivitaiMe(w http.ResponseWriter, r *http.Request) {
	if s.settings.Get().CivitaiAPIKey == "" {
		writeErr(w, http.StatusBadRequest, errCivitaiNoKey.Error())
		return
	}
	var me struct {
		ID       int64  `json:"id"`
		Username string `json:"username"`
		Image    string `json:"image"`
	}
	if err := s.civitaiGet(r.Context(), "/me", nil, &me, 1<<20); err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	if me.Username == "" {
		writeErr(w, http.StatusBadGateway, "Civitai did not say whose key this is")
		return
	}
	if !civitaiHostAllowed(me.Image) {
		me.Image = ""
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": me.ID, "username": me.Username, "image": me.Image})
}

// ── installs ────────────────────────────────────────────────────────────────

type civitaiInstallReq struct {
	URL string `json:"url"`
	// ModelID and VersionID name what the URL is, so the catalogue's cover,
	// description and trigger words can be applied once InvokeAI has the file.
	// Optional: an older client sends just the URL and gets a bare install.
	ModelID   int64 `json:"modelId"`
	VersionID int64 `json:"versionId"`
}

// handleCivitaiInstall asks InvokeAI to download and register a model. The
// download happens on the InvokeAI box; progress shows up under /installs, and the
// metadata follows once the job completes (civitai_installs.go).
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
	if req.ModelID > 0 && req.VersionID > 0 {
		if err := s.db.AddCivitaiInstall(r.Context(), req.URL, req.ModelID, req.VersionID); err != nil {
			s.log.Warn("civitai: record install", "err", err)
		} else {
			s.civitaiWatchInstalls()
		}
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
	// Someone is watching, so make sure the promises are being kept — a restart
	// between the install and its completion would otherwise leave them waiting for
	// the next install to start the watcher.
	s.civitaiWatchInstalls()
	writeJSON(w, http.StatusOK, map[string]any{"jobs": jobs})
}

// handleCivitaiInstalled is the studio's models with their catalogue records: what
// each one is on Civitai, its previews, and whether a newer version exists.
// ?refresh=1 asks the catalogue again for everything rather than trusting the
// day-old answers.
func (s *Server) handleCivitaiInstalled(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()
	out, err := s.civitaiInstalledModels(ctx, base, isTruthy(r.URL.Query().Get("refresh")))
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"models": out})
}

type civitaiSyncReq struct {
	Key string `json:"key"`
	// VersionID pins the model to a catalogue version by hand, for a file whose
	// hash the catalogue does not know (a renamed or converted download).
	VersionID int64 `json:"versionId"`
}

// handleCivitaiSync applies the catalogue's cover, description and trigger words
// to one installed model now — the same dressing an install gets, for models that
// were already there.
func (s *Server) handleCivitaiSync(w http.ResponseWriter, r *http.Request) {
	var req civitaiSyncReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Key == "" {
		writeErr(w, http.StatusBadRequest, "key is required")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	link, err := s.civitaiSyncModel(ctx, base, req.Key, req.VersionID)
	if err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, civitaiLinkAnswer(link))
}
