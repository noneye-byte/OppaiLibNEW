// Package hanime implements the small, public portion of hanime.tv used by
// OppaiLib: its guest catalogue and the guest download-link handshake.
package hanime

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultOrigin    = "https://hanime.tv"
	defaultSearchURL = "https://guest.freeanimehentai.net/api/v11/search_hvs"
	defaultCSRFURL   = "https://ct.hanime.tv/csrf-token"
	defaultAuthURL   = "https://auth.hanime.tv/api/v11/handshake"
	guestCacheTTL    = 15 * time.Minute
	maxIndexBytes    = 32 << 20
)

var (
	handshakeKey = sha256.Sum256([]byte("htv-insecure-handshake-v1"))
	handshakeAAD = []byte("htv-insecure-v1")
)

// Video is one entry in Hanime's public guest search database.
type Video struct {
	ID             int64    `json:"id"`
	Name           string   `json:"name"`
	SearchTitles   string   `json:"search_titles"`
	Slug           string   `json:"slug"`
	Description    string   `json:"description"`
	Views          int64    `json:"views"`
	CoverURL       string   `json:"cover_url"`
	PosterURL      string   `json:"poster_url"`
	Brand          string   `json:"brand"`
	BrandID        int64    `json:"brand_id"`
	Likes          int64    `json:"likes"`
	Tags           []string `json:"tags"`
	CreatedAtUnix  int64    `json:"created_at_unix"`
	ReleasedAtUnix int64    `json:"released_at_unix"`
}

// Options exists primarily to keep the protocol testable against httptest.
// Production callers should use New with an empty Options value.
type Options struct {
	Origin    string
	SearchURL string
	CSRFURL   string
	AuthURL   string
}

// Client is safe for concurrent use. The public index and resolved download
// links are cached: opening or seeking a video must not repeat the handshake.
type Client struct {
	http      *http.Client
	origin    string
	searchURL string
	csrfURL   string
	authURL   string

	mu          sync.Mutex
	index       []Video
	indexAt     time.Time
	downloadURL map[string]string
}

func New(base *http.Client, opts Options) *Client {
	if base == nil {
		base = http.DefaultClient
	}
	hc := *base
	jar, _ := cookiejar.New(nil)
	hc.Jar = jar
	origin := strings.TrimRight(opts.Origin, "/")
	if origin == "" {
		origin = defaultOrigin
	}
	searchURL := opts.SearchURL
	if searchURL == "" {
		searchURL = defaultSearchURL
	}
	csrfURL := opts.CSRFURL
	if csrfURL == "" {
		csrfURL = defaultCSRFURL
	}
	authURL := opts.AuthURL
	if authURL == "" {
		authURL = defaultAuthURL
	}
	return &Client{
		http: &hc, origin: origin, searchURL: searchURL, csrfURL: csrfURL, authURL: authURL,
		downloadURL: make(map[string]string),
	}
}

func (c *Client) Index(ctx context.Context, userAgent string) ([]Video, error) {
	c.mu.Lock()
	if len(c.index) > 0 && time.Since(c.indexAt) < guestCacheTTL {
		out := append([]Video(nil), c.index...)
		c.mu.Unlock()
		return out, nil
	}
	c.mu.Unlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.searchURL, nil)
	if err != nil {
		return nil, err
	}
	c.decorate(req, userAgent, time.Now().Unix())
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("hanime catalogue: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("hanime catalogue returned %d", resp.StatusCode)
	}
	var videos []Video
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxIndexBytes)).Decode(&videos); err != nil {
		return nil, fmt.Errorf("decode hanime catalogue: %w", err)
	}
	for i := range videos {
		if videos[i].Tags == nil {
			videos[i].Tags = []string{}
		}
	}
	c.mu.Lock()
	c.index, c.indexAt = append([]Video(nil), videos...), time.Now()
	c.mu.Unlock()
	return videos, nil
}

func (c *Client) Find(ctx context.Context, userAgent, slug string) (*Video, error) {
	videos, err := c.Index(ctx, userAgent)
	if err != nil {
		return nil, err
	}
	for i := range videos {
		if videos[i].Slug == slug {
			v := videos[i]
			return &v, nil
		}
	}
	return nil, fmt.Errorf("hanime video %q was not found", slug)
}

// DownloadURL returns the best guest-accessible MP4 (normally 720p).
func (c *Client) DownloadURL(ctx context.Context, userAgent string, video Video) (string, error) {
	c.mu.Lock()
	if cached := c.downloadURL[video.Slug]; cached != "" {
		c.mu.Unlock()
		return cached, nil
	}
	c.mu.Unlock()

	var response struct {
		Token string `json:"token"`
	}
	now := time.Now().Unix()
	payload := map[string]any{
		"timestamp_unix":  now,
		"directive":       "get_download_links",
		"slug":            video.Slug,
		"hentai_video_id": video.ID,
	}
	if err := c.handshake(ctx, userAgent, now, payload, &response, nil); err != nil {
		return "", err
	}
	plain, err := decryptEnvelope(response.Token)
	if err != nil {
		return "", fmt.Errorf("decode hanime download links: %w", err)
	}
	var links struct {
		Links []struct {
			Label  string `json:"label"`
			Height int    `json:"height"`
			URL    string `json:"url"`
		} `json:"download_links"`
	}
	if err := json.Unmarshal(plain, &links); err != nil {
		return "", fmt.Errorf("decode hanime download links: %w", err)
	}
	bestURL, bestHeight := "", -1
	for _, link := range links.Links {
		if link.URL != "" && link.Height > bestHeight && link.Height <= 720 {
			bestURL, bestHeight = link.URL, link.Height
		}
	}
	if bestURL == "" {
		for _, link := range links.Links {
			if link.URL != "" && link.Height > bestHeight {
				bestURL, bestHeight = link.URL, link.Height
			}
		}
	}
	if bestURL == "" {
		return "", fmt.Errorf("hanime: no guest download is available for %q", video.Name)
	}
	bestURL = directPixeldrainURL(bestURL)
	c.mu.Lock()
	c.downloadURL[video.Slug] = bestURL
	c.mu.Unlock()
	return bestURL, nil
}

func (c *Client) handshake(ctx context.Context, userAgent string, now int64, payload any, out any, responseToken *string) error {
	csrfReq, err := http.NewRequestWithContext(ctx, http.MethodGet, c.csrfURL, nil)
	if err != nil {
		return err
	}
	c.decorate(csrfReq, userAgent, now)
	csrfResp, err := c.http.Do(csrfReq)
	if err != nil {
		return fmt.Errorf("hanime security token: %w", err)
	}
	defer csrfResp.Body.Close()
	if csrfResp.StatusCode != http.StatusOK {
		return fmt.Errorf("hanime security token returned %d", csrfResp.StatusCode)
	}
	var csrf struct {
		Token string `json:"csrf_token"`
	}
	if err := json.NewDecoder(io.LimitReader(csrfResp.Body, 1<<20)).Decode(&csrf); err != nil || csrf.Token == "" {
		return fmt.Errorf("hanime security token was invalid")
	}

	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	token, err := encryptEnvelope(b)
	if err != nil {
		return err
	}
	body, _ := json.Marshal(map[string]string{"token": token})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.authURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	c.decorate(req, userAgent, now)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-csrf-token", csrf.Token)
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("hanime handshake: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		return fmt.Errorf("hanime handshake returned %d: %s", resp.StatusCode, strings.TrimSpace(string(msg)))
	}
	if responseToken != nil {
		*responseToken = resp.Header.Get("x-token")
	}
	if out == nil {
		return nil
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(out); err != nil {
		return fmt.Errorf("decode hanime handshake: %w", err)
	}
	return nil
}

func (c *Client) decorate(req *http.Request, userAgent string, unix int64) {
	if strings.TrimSpace(userAgent) == "" {
		userAgent = "Mozilla/5.0 (compatible; OppaiLib/1.0)"
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Origin", c.origin)
	req.Header.Set("Referer", c.origin+"/")
	req.Header.Set("x-signature-version", "web2")
	req.Header.Set("x-time", strconv.FormatInt(unix, 10))
	sum := sha256.Sum256([]byte(fmt.Sprintf("%d,Xkdi29,%s,mn2,%d", unix, c.origin, unix)))
	req.Header.Set("x-signature", hex.EncodeToString(sum[:]))
}

type envelope struct {
	Version int    `json:"v"`
	Alg     string `json:"alg"`
	IV      string `json:"iv"`
	Tag     string `json:"tag"`
	Data    string `json:"data"`
}

func encryptEnvelope(plain []byte) (string, error) {
	block, err := aes.NewCipher(handshakeKey[:])
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	iv := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(iv); err != nil {
		return "", err
	}
	sealed := gcm.Seal(nil, iv, plain, handshakeAAD)
	tagAt := len(sealed) - gcm.Overhead()
	e := envelope{Version: 1, Alg: "AES-256-GCM", IV: rawB64(iv), Data: rawB64(sealed[:tagAt]), Tag: rawB64(sealed[tagAt:])}
	b, err := json.Marshal(e)
	if err != nil {
		return "", err
	}
	return rawB64(b), nil
}

func decryptEnvelope(token string) ([]byte, error) {
	b, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return nil, err
	}
	var e envelope
	if err := json.Unmarshal(b, &e); err != nil {
		return nil, err
	}
	iv, err := base64.RawURLEncoding.DecodeString(e.IV)
	if err != nil {
		return nil, err
	}
	data, err := base64.RawURLEncoding.DecodeString(e.Data)
	if err != nil {
		return nil, err
	}
	tag, err := base64.RawURLEncoding.DecodeString(e.Tag)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(handshakeKey[:])
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return gcm.Open(nil, iv, append(data, tag...), handshakeAAD)
}

func rawB64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func directPixeldrainURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	host := strings.ToLower(u.Hostname())
	if host != "pixeldrain.com" && host != "pixeldrain.net" {
		return raw
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) == 2 && parts[0] == "d" && parts[1] != "" {
		u.Scheme, u.Host = "https", "pixeldrain.com"
		u.Path = path.Join("/api/filesystem", parts[1])
		u.RawQuery, u.Fragment = "", ""
		return u.String()
	}
	return raw
}
