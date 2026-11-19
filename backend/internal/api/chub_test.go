package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// fakeChub serves chub.ai's gateway and file host from one place, recording queries.
func fakeChub(t *testing.T) (*httptest.Server, *[]string) {
	t.Helper()
	var mu sync.Mutex
	var seen []string
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		seen = append(seen, r.URL.RequestURI())
		mu.Unlock()
		switch {
		case r.URL.Path == "/search":
			json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"count": 30, "nodes": []any{
				map[string]any{"name": "Mira", "fullPath": "someone/mira", "tagline": "A barmaid.", "topics": []string{"NSFW", "Female"},
					"starCount": 12, "nChats": 40, "nTokens": 900},
				map[string]any{"name": "Bad", "fullPath": "../etc"},
			}}})
		case r.URL.Path == "/api/characters/someone/mira":
			json.NewEncoder(w).Encode(map[string]any{"node": map[string]any{
				"name": "Mira (project)", "fullPath": "someone/mira", "topics": []string{"Female"},
				"definition": map[string]any{
					"name": "Mira", "description": "Made for the tavern pack.", "personality": "{{char}} runs the bar.",
					"tavern_personality": "Fiery.", "scenario": "A tavern.", "first_message": "*She wipes the bar.*",
					"example_dialogs": "<START>", "alternate_greetings": []string{"Hello again."}, "embedded_lorebook": nil,
					"extensions": map[string]any{"chub": map[string]any{"expressions": map[string]any{
						"compressed":  srv.URL + "/lfs/pack.zip",
						"expressions": map[string]any{"joy": srv.URL + "/lfs/joy.png", "anger": "https://evil.example/anger.png", "grief": ""},
					}}},
				},
			}})
		case r.URL.Path == "/avatars/someone/mira/chara_card_v2.png":
			w.Write(testPNG(9))
		case r.URL.Path == "/lfs/pack.zip":
			w.Write(spritePack(t))
		case r.URL.Path == "/lfs/joy.png":
			w.Write(testPNG(3))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	gateway, files := chubGateway, chubFiles
	chubGateway, chubFiles = srv.URL, srv.URL
	t.Cleanup(func() { chubGateway, chubFiles = gateway, files })
	return srv, &seen
}

func TestAChubSearchIsNarrowedToAdultsWithoutTheExtremeAndKeepsOnlySafePaths(t *testing.T) {
	_, seen := fakeChub(t)
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chub/search?q=barmaid&sort=star_count&expressions=1&page=2", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("search = %d %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Items []chubCard `json:"items"`
		More  bool       `json:"more"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out.Items) != 1 || out.Items[0].Path != "someone/mira" || !out.Items[0].NSFW || !strings.HasPrefix(out.Items[0].Avatar, "/api/chub/avatar?") {
		t.Fatalf("items = %+v", out.Items)
	}
	if out.More {
		t.Fatal("page 2 of 30 at 24 a page has no more")
	}
	q := (*seen)[0]
	for _, want := range []string{"search=barmaid", "sort=star_count", "require_expressions=true", "nsfl=false", "nsfw=true", "page=2"} {
		if !strings.Contains(q, want) {
			t.Errorf("chub was asked %s, missing %s", q, want)
		}
	}
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/chub/avatar?path=..%2F..%2Fetc", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("a dot path was fetched: %d", rec.Code)
	}
}

func TestAChubCardComesBackAsAV2CardWithChubsFieldsPutRight(t *testing.T) {
	fakeChub(t)
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chub/character?path=someone/mira", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("character = %d %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Card struct {
			Spec string         `json:"spec"`
			Data map[string]any `json:"data"`
		} `json:"card"`
		Avatar      string `json:"avatar"`
		Expressions int    `json:"expressions"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)
	d := out.Card.Data
	if out.Card.Spec != "chara_card_v2" || d["name"] != "Mira" || d["description"] != "{{char}} runs the bar." ||
		d["personality"] != "Fiery." || d["creator_notes"] != "Made for the tavern pack." || d["first_mes"] != "*She wipes the bar.*" {
		t.Fatalf("card = %+v", d)
	}
	if _, ok := d["character_book"]; ok {
		t.Fatal("a null lorebook became one")
	}
	if !strings.HasPrefix(out.Avatar, "data:image/png;base64,") || out.Expressions != 2 {
		t.Fatalf("avatar %q, expressions %d", out.Avatar[:min(30, len(out.Avatar))], out.Expressions)
	}
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/chub/character?path=someone/nobody", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("a missing card = %d, want 404 (and never 401)", rec.Code)
	}
}

func TestAChubCardsPackIsFiledIntoTheCharactersExpressions(t *testing.T) {
	fakeChub(t)
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say("hi") })
	saveCard(t, s, token, map[string]any{"description": "A barmaid."}, "roleplay")
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chub/expressions", `{"path":"someone/mira","characterId":"`+cardID+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("import = %d %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"anger":["anger.png"]`) || !strings.Contains(rec.Body.String(), `"joy-1.png","joy.png"`) {
		t.Fatalf("pack = %s", rec.Body.String())
	}
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/chub/expressions", `{"path":"someone/mira","characterId":"libby"}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("Libby took a chub pack: %d", rec.Code)
	}
}

func TestAPackURLOffChubsHostsIsNeverFetched(t *testing.T) {
	for raw, want := range map[string]bool{
		"https://lfs.charhub.io/lfs/1/emotions/zip/x.zip": true,
		"https://avatars.charhub.io/a/b.png":              true,
		"https://evil.example/anger.png":                  false,
		"https://charhub.io.evil.example/x.png":           false,
		"http://lfs.charhub.io/x.png":                     false,
	} {
		if _, ok := chubAssetURL(raw); ok != want {
			t.Errorf("%s: %v, want %v", raw, ok, want)
		}
	}
}
