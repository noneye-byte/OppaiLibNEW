package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Finding cards on chub.ai.
//
// Chub (chub.ai, its API at gateway.chub.ai and its files on charhub.io) is where most
// SillyTavern cards live, and many come with an expression pack. The clients cannot go
// there themselves — the web's CSP allows nothing off this origin, and the app is meant
// to work on a LAN — so the server goes for them: a search, the cards' avatars, a card
// as a Character Card V2 object both clients' importers already read, and its
// expression pack filed straight into the character's pack (chat_expressions.go).
//
// The card is rebuilt from chub's definition rather than taken from the PNG it can
// export, because not every card has that PNG (it 404s for older ones) and the
// definition always exists. Chub names its fields its own way, read off a card whose
// PNG and definition were compared: the card's description is chub's "personality",
// its personality is "tavern_personality", and its creator's notes are chub's
// "description".
//
// api.chub.ai answers a script with Cloudflare's challenge page; the gateway does not,
// given a browser's User-Agent. Nothing identifying is sent.

var (
	// chubGateway and chubFiles are overridden by the tests.
	chubGateway = "https://gateway.chub.ai"
	chubFiles   = "https://avatars.charhub.io"
	// chubAssetHosts are where a definition's pack may be fetched from: chub's own
	// file hosts, so a card cannot point the server at anything else.
	chubAssetHosts = []string{"charhub.io", "chub.ai"}
	chubHTTP       = &http.Client{Timeout: 45 * time.Second}
	chubPackHTTP   = &http.Client{Timeout: 5 * time.Minute}
)

const chubUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

// maxChubPack bounds a downloaded expression pack. Real ones run to 30 MB.
const maxChubPack = 200 << 20

// chubPath is a card's "creator/name". Letters, digits and the punctuation chub uses;
// never a dot segment.
var chubPath = regexp.MustCompile(`^[\p{L}\p{N}_.\-~]{1,120}/[\p{L}\p{N}_.\-~]{1,200}$`)

func validChubPath(p string) bool {
	if !chubPath.MatchString(p) {
		return false
	}
	for _, part := range strings.Split(p, "/") {
		if part == "." || part == ".." {
			return false
		}
	}
	return true
}

func escapeChubPath(p string) string {
	parts := strings.Split(p, "/")
	for i, part := range parts {
		parts[i] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}

// chubSorts are the orders offered, as chub names them.
var chubSorts = map[string]bool{
	"download_count": true, "trending_downloads": true, "star_count": true,
	"rating": true, "created_at": true, "last_activity_at": true,
}

// chubGet fetches one of chub's URLs. A refusal is a 502 to the caller, never its 401:
// a 401 from here would sign the web client out (see the memory note on third parties).
func chubGet(ctx context.Context, client *http.Client, target string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", chubUserAgent)
	req.Header.Set("Accept", "application/json, image/*, */*")
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("chub.ai could not be reached: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		if resp.StatusCode == http.StatusNotFound {
			return nil, errChubNotFound
		}
		return nil, fmt.Errorf("chub.ai answered %s", resp.Status)
	}
	return resp, nil
}

var errChubNotFound = errors.New("chub.ai has no such card")

func chubFail(w http.ResponseWriter, err error) {
	if errors.Is(err, errChubNotFound) {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	writeErr(w, http.StatusBadGateway, err.Error())
}

// chubCard is one search result, as the clients draw it.
type chubCard struct {
	Path    string   `json:"path"`
	Name    string   `json:"name"`
	Tagline string   `json:"tagline"`
	Topics  []string `json:"topics"`
	Stars   int      `json:"stars"`
	Chats   int      `json:"chats"`
	Tokens  int      `json:"tokens"`
	NSFW    bool     `json:"nsfw"`
	Avatar  string   `json:"avatar"`
	Created string   `json:"created,omitempty"`
}

// chubNode is the part of chub's node the server reads.
type chubNode struct {
	Name       string          `json:"name"`
	FullPath   string          `json:"fullPath"`
	Tagline    string          `json:"tagline"`
	Topics     []string        `json:"topics"`
	StarCount  int             `json:"starCount"`
	NChats     int             `json:"nChats"`
	NTokens    int             `json:"nTokens"`
	NSFWImage  bool            `json:"nsfw_image"`
	CreatedAt  string          `json:"createdAt"`
	AvatarURL  string          `json:"avatar_url"`
	MaxResURL  string          `json:"max_res_url"`
	Definition *chubDefinition `json:"definition"`
}

type chubDefinition struct {
	Name                    string          `json:"name"`
	ProjectName             string          `json:"project_name"`
	Description             string          `json:"description"`
	Personality             string          `json:"personality"`
	TavernPersonality       string          `json:"tavern_personality"`
	Scenario                string          `json:"scenario"`
	FirstMessage            string          `json:"first_message"`
	ExampleDialogs          string          `json:"example_dialogs"`
	SystemPrompt            string          `json:"system_prompt"`
	PostHistoryInstructions string          `json:"post_history_instructions"`
	AlternateGreetings      []string        `json:"alternate_greetings"`
	EmbeddedLorebook        json.RawMessage `json:"embedded_lorebook"`
	Extensions              struct {
		Chub struct {
			Expressions *chubExpressions `json:"expressions"`
		} `json:"chub"`
	} `json:"extensions"`
}

// chubExpressions is a card's default expression pack: a zip of it, and each picture.
// The map names all 28 of SillyTavern's labels whatever the pack covers, with "" for
// the ones it has no picture for.
type chubExpressions struct {
	Version     string            `json:"version"`
	Compressed  string            `json:"compressed"`
	Expressions map[string]string `json:"expressions"`
}

// pictured is how many expressions the pack really has a picture for.
func (e *chubExpressions) pictured() int {
	count := 0
	for _, raw := range e.Expressions {
		if strings.TrimSpace(raw) != "" {
			count++
		}
	}
	return count
}

func (n chubNode) card() chubCard {
	c := chubCard{
		Path: n.FullPath, Name: n.Name, Tagline: strings.TrimSpace(n.Tagline), Topics: n.Topics,
		Stars: n.StarCount, Chats: n.NChats, Tokens: n.NTokens, NSFW: n.NSFWImage, Created: n.CreatedAt,
		Avatar: "/api/chub/avatar?path=" + url.QueryEscape(n.FullPath),
	}
	// A card's pictures stay under the path it was made at, which is not its path
	// once its creator has been renamed: the node's own URL is the one that works.
	if src, ok := chubAssetURL(n.AvatarURL); ok {
		c.Avatar = "/api/chub/avatar?src=" + url.QueryEscape(src)
	}
	if c.Topics == nil {
		c.Topics = []string{}
	}
	for _, t := range n.Topics {
		if strings.EqualFold(t, "nsfw") {
			c.NSFW = true
		}
	}
	return c
}

// handleChubSearch is GET /api/chub/search?q=&page=&sort=&nsfw=&topics=&expressions=.
// nsfw defaults to on: this is an adult library. Chub's NSFL (gore and worse) is never
// asked for. expressions=1 keeps to cards with an expression pack.
func (s *Server) handleChubSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	page = clampInt(page, 1, 500)
	sort := q.Get("sort")
	if !chubSorts[sort] {
		sort = "download_count"
	}
	params := url.Values{}
	params.Set("first", "24")
	params.Set("page", strconv.Itoa(page))
	params.Set("sort", sort)
	params.Set("asc", "false")
	params.Set("nsfw", strconv.FormatBool(q.Get("nsfw") != "0" && q.Get("nsfw") != "false"))
	params.Set("nsfl", "false")
	params.Set("include_forks", "true")
	if text, _ := cleanLimited(strings.TrimSpace(q.Get("q")), 200); text != "" {
		params.Set("search", text)
	}
	if topics, _ := cleanLimited(strings.TrimSpace(q.Get("topics")), 300); topics != "" {
		params.Set("topics", topics)
	}
	if q.Get("expressions") == "1" || q.Get("expressions") == "true" {
		params.Set("require_expressions", "true")
	}
	resp, err := chubGet(r.Context(), chubHTTP, chubGateway+"/search?"+params.Encode())
	if err != nil {
		chubFail(w, err)
		return
	}
	defer resp.Body.Close()
	var out struct {
		Data struct {
			Count int        `json:"count"`
			Nodes []chubNode `json:"nodes"`
		} `json:"data"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 8<<20)).Decode(&out); err != nil {
		writeErr(w, http.StatusBadGateway, "chub.ai sent a search this could not read")
		return
	}
	items := make([]chubCard, 0, len(out.Data.Nodes))
	for _, n := range out.Data.Nodes {
		if validChubPath(n.FullPath) {
			items = append(items, n.card())
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items": items, "total": out.Data.Count, "page": page, "more": page*24 < out.Data.Count,
	})
}

// handleChubAvatar is GET /api/chub/avatar?src= (the URL a search gave, on chub's own
// hosts) or ?path= — a card's small avatar, for the results grid.
func (s *Server) handleChubAvatar(w http.ResponseWriter, r *http.Request) {
	target := ""
	if src := r.URL.Query().Get("src"); src != "" {
		ok := false
		if target, ok = chubAssetURL(src); !ok {
			writeErr(w, http.StatusBadRequest, "that picture is not chub.ai's")
			return
		}
	} else if p := r.URL.Query().Get("path"); validChubPath(p) {
		target = chubFiles + "/avatars/" + escapeChubPath(p) + "/avatar.webp"
	} else {
		writeErr(w, http.StatusBadRequest, "bad card path")
		return
	}
	data, err := chubImage(r.Context(), target)
	if err != nil {
		chubFail(w, err)
		return
	}
	w.Header().Set("Content-Type", safeInlineContentType(http.DetectContentType(data)))
	w.Header().Set("Cache-Control", "private, max-age=86400")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(data)
}

// chubImage fetches a picture, refusing anything that is not one.
func chubImage(ctx context.Context, target string) ([]byte, error) {
	resp, err := chubGet(ctx, chubHTTP, target)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxModelThumbBytes+1))
	if err != nil || len(data) == 0 || len(data) > maxModelThumbBytes {
		return nil, errors.New("chub.ai's picture was unreadable or too large")
	}
	if !strings.HasPrefix(safeInlineContentType(http.DetectContentType(data)), "image/") {
		return nil, errors.New("chub.ai's picture is not a picture")
	}
	return data, nil
}

func (s *Server) chubDefinition(ctx context.Context, p string) (chubNode, error) {
	resp, err := chubGet(ctx, chubHTTP, chubGateway+"/api/characters/"+escapeChubPath(p)+"?full=true")
	if err != nil {
		return chubNode{}, err
	}
	defer resp.Body.Close()
	var out struct {
		Node chubNode `json:"node"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 16<<20)).Decode(&out); err != nil || out.Node.Definition == nil {
		return chubNode{}, errors.New("chub.ai sent a card this could not read")
	}
	return out.Node, nil
}

// chubV2Card is a chub definition as a Character Card V2 object, the shape every card
// importer reads. See the file comment for why the fields cross over.
func chubV2Card(n chubNode) map[string]any {
	d := n.Definition
	name := strings.TrimSpace(firstNonEmpty(d.Name, d.ProjectName, n.Name))
	greetings := d.AlternateGreetings
	if greetings == nil {
		greetings = []string{}
	}
	data := map[string]any{
		"name": name, "description": d.Personality, "personality": d.TavernPersonality,
		"scenario": d.Scenario, "first_mes": d.FirstMessage, "mes_example": d.ExampleDialogs,
		"creator_notes": d.Description, "system_prompt": d.SystemPrompt,
		"post_history_instructions": d.PostHistoryInstructions, "alternate_greetings": greetings,
		"tags": n.Topics, "creator": strings.SplitN(n.FullPath, "/", 2)[0], "character_version": "main",
		"extensions": map[string]any{"chub": map[string]any{"full_path": n.FullPath}},
	}
	if book := bytes.TrimSpace(d.EmbeddedLorebook); len(book) > 0 && string(book) != "null" {
		data["character_book"] = json.RawMessage(book)
	}
	return map[string]any{"spec": "chara_card_v2", "spec_version": "2.0", "data": data}
}

// handleChubCharacter is GET /api/chub/character?path= → {card, avatar, expressions}:
// the card as V2, its full-size art as a data URL (the client uploads it as the
// character's portrait, as it does a card file's), and how many expressions its pack
// has, 0 for none.
func (s *Server) handleChubCharacter(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Query().Get("path")
	if !validChubPath(p) {
		writeErr(w, http.StatusBadRequest, "bad card path")
		return
	}
	n, err := s.chubDefinition(r.Context(), p)
	if err != nil {
		chubFail(w, err)
		return
	}
	out := map[string]any{"card": chubV2Card(n), "path": p, "expressions": 0, "avatar": ""}
	if ex := n.Definition.Extensions.Chub.Expressions; ex != nil {
		out["expressions"] = ex.pictured()
	}
	// The full-size art when there is one, the avatar when not; no art is not a failure.
	// The node's own URLs first: see chubNode.card.
	var candidates []string
	for _, raw := range []string{n.MaxResURL, n.AvatarURL} {
		if u, ok := chubAssetURL(raw); ok && raw != "" {
			candidates = append(candidates, u)
		}
	}
	candidates = append(candidates,
		chubFiles+"/avatars/"+escapeChubPath(p)+"/chara_card_v2.png",
		chubFiles+"/avatars/"+escapeChubPath(p)+"/avatar.webp")
	for _, candidate := range candidates {
		if data, err := chubImage(r.Context(), candidate); err == nil {
			out["avatar"] = "data:" + safeInlineContentType(http.DetectContentType(data)) + ";base64," + base64.StdEncoding.EncodeToString(data)
			break
		}
	}
	writeJSON(w, http.StatusOK, out)
}

// chubAssetURL is a pack URL a definition named, if it is on chub's own hosts.
func chubAssetURL(raw string) (string, bool) {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "https" && !strings.HasPrefix(chubFiles, "http://")) {
		return "", false
	}
	host := strings.ToLower(u.Hostname())
	for _, allowed := range chubAssetHosts {
		if host == allowed || strings.HasSuffix(host, "."+allowed) {
			return u.String(), true
		}
	}
	// The tests' fake serves the files from the same place it serves the avatars.
	if files, err := url.Parse(chubFiles); err == nil && u.Host == files.Host {
		return u.String(), true
	}
	return "", false
}

type chubExpressionsReq struct {
	Path        string `json:"path"`
	CharacterID string `json:"characterId"`
}

// handleChubExpressions is POST /api/chub/expressions {path, characterId}: the card's
// expression pack, fetched and filed into that character's pack. The zip when chub has
// one (one download), the pictures one by one when not. The reply is the pack's
// listing with what was saved and skipped, as an upload's is.
func (s *Server) handleChubExpressions(w http.ResponseWriter, r *http.Request) {
	u, ok := s.chatUser(r)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid user")
		return
	}
	var req chubExpressionsReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&req); err != nil || !validChubPath(req.Path) ||
		req.CharacterID == "libby" || !validChatID(req.CharacterID, false) {
		writeErr(w, http.StatusBadRequest, "a card path and a card character are needed")
		return
	}
	n, err := s.chubDefinition(r.Context(), req.Path)
	if err != nil {
		chubFail(w, err)
		return
	}
	ex := n.Definition.Extensions.Chub.Expressions
	if ex == nil || (ex.Compressed == "" && ex.pictured() == 0) {
		writeErr(w, http.StatusNotFound, "that card has no expression pack on chub.ai")
		return
	}
	st, err := s.newExpressionStore(u.ID, req.CharacterID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "couldn't store expressions")
		return
	}
	if zipURL, ok := chubAssetURL(ex.Compressed); ok && ex.Compressed != "" {
		if err := s.chubPackZip(r.Context(), zipURL, st); err == nil {
			writeJSON(w, http.StatusOK, st.result())
			return
		} else {
			s.log.Info("chub pack zip failed; fetching pictures one by one", "path", req.Path, "err", err)
		}
	}
	for label, raw := range ex.Expressions {
		if strings.TrimSpace(raw) == "" {
			continue
		}
		target, ok := chubAssetURL(raw)
		if !ok || !expressionLabel.MatchString(strings.ToLower(label)) {
			st.skipped = append(st.skipped, label)
			continue
		}
		resp, err := chubGet(r.Context(), chubHTTP, target)
		if err != nil {
			st.skipped = append(st.skipped, label+" (couldn't be fetched)")
			continue
		}
		data, _ := io.ReadAll(io.LimitReader(resp.Body, maxExpressionBytes+1))
		resp.Body.Close()
		st.store(strings.ToLower(label)+extensionOf(target), data)
	}
	writeJSON(w, http.StatusOK, st.result())
}

// extensionOf is a URL path's image extension, ".png" when it names none.
func extensionOf(target string) string {
	u, err := url.Parse(target)
	if err == nil {
		lower := strings.ToLower(u.Path)
		for _, ext := range []string{".png", ".webp", ".gif", ".jpg", ".jpeg"} {
			if strings.HasSuffix(lower, ext) {
				return ext
			}
		}
	}
	return ".png"
}

// chubPackZip downloads a pack's zip to a temporary file — a zip is read from its end,
// and a 30 MB one is not held in memory — and files its pictures.
func (s *Server) chubPackZip(ctx context.Context, target string, st *expressionStore) error {
	resp, err := chubGet(ctx, chubPackHTTP, target)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	tmp, err := os.CreateTemp("", "chub-pack-*.zip")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	defer tmp.Close()
	size, err := io.Copy(tmp, io.LimitReader(resp.Body, maxChubPack+1))
	if err != nil {
		return err
	}
	if size > maxChubPack {
		return errors.New("the pack is over 200 MB")
	}
	return eachZipPicture(tmp, size, st.store)
}
