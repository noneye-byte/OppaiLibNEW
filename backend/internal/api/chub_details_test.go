package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAChubCardsPageShowsTheCardItselfBeforeItIsAdded(t *testing.T) {
	s, token := newTestServer(t)
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/characters/someone/mira":
			json.NewEncoder(w).Encode(map[string]any{"node": map[string]any{
				"id": 125370, "name": "Mira (project)", "fullPath": "someone/mira", "tagline": "A barmaid.",
				"topics": []string{"Female", "NSFW"}, "starCount": 12, "nChats": 40, "nTokens": 900,
				"rating": 4.5, "ratingCount": 50, "n_favorites": 1532, "forksCount": 3, "nMessages": 9000,
				"lastActivityAt": "2026-10-08T17:39:02Z", "hasGallery": true,
				"max_res_url": srv.URL + "/avatars/someone/mira/chara_card_v2.png",
				"labels":      []any{map[string]any{"title": "TOKEN_COUNTS", "description": `{"description":849,"first_mes":331,"total":875}`}},
				"definition": map[string]any{
					"name": "Mira", "description": "Made for the tavern pack.", "personality": "{{char}} runs the bar.",
					"tavern_personality": "Fiery.", "scenario": "A tavern.", "first_message": "*She wipes the bar.*",
					"example_dialogs": "<START>", "alternate_greetings": []string{"Hello again.", "  "},
					// SillyTavern's world info: entries keyed by uid, keys under "key", the title under "comment".
					"embedded_lorebook": map[string]any{"name": "The Tavern", "entries": map[string]any{
						"10": map[string]any{"key": []string{"cellar"}, "content": "Kegs.", "comment": "Cellar"},
						"2":  map[string]any{"key": []string{"bar", " "}, "content": "Oak.", "comment": "Bar", "disable": true},
						"3":  map[string]any{"key": []string{}, "content": ""},
					}},
					"extensions": map[string]any{"chub": map[string]any{"expressions": map[string]any{
						"version":     "Mira_v1",
						"expressions": map[string]any{"joy": srv.URL + "/lfs/joy.png", "anger": "https://evil.example/anger.png", "grief": ""},
					}}},
				},
			}})
		case "/api/gallery/project/125370":
			if r.URL.Query().Get("nsfw") != "true" || r.URL.Query().Get("page") != "2" {
				t.Errorf("gallery asked %s", r.URL.RawQuery)
			}
			json.NewEncoder(w).Encode(map[string]any{"count": 30, "nodes": []any{
				map[string]any{"uuid": "u1", "primary_image_path": srv.URL + "/avatars/uploads/1.webp", "description": "On a couch.", "nsfw_image": true},
				map[string]any{"uuid": "u2", "primary_image_path": "https://evil.example/2.webp"},
			}})
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()
	gateway, files := chubGateway, chubFiles
	chubGateway, chubFiles = srv.URL, srv.URL
	defer func() { chubGateway, chubFiles = gateway, files }()

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/chub/details?path=someone/mira", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("details: %d %s", rec.Code, rec.Body.String())
	}
	var d chubDetails
	_ = json.Unmarshal(rec.Body.Bytes(), &d)
	// The crossover the import uses: chub's description is the creator's notes.
	if d.Name != "Mira" || d.CreatorNotes != "Made for the tavern pack." || d.Description != "{{char}} runs the bar." || d.Personality != "Fiery." {
		t.Fatalf("card fields: %+v", d)
	}
	if d.ID != 125370 || d.Creator != "someone" || d.Rating != 4.5 || d.Favorites != 1532 || !d.HasGallery || !d.NSFW {
		t.Fatalf("figures: %+v", d)
	}
	if len(d.Greetings) != 1 || d.TokenCounts["total"] != 875 || !strings.Contains(d.Art, "chara_card_v2.png") {
		t.Fatalf("greetings %v tokens %v art %q", d.Greetings, d.TokenCounts, d.Art)
	}
	if d.LorebookName != "The Tavern" || len(d.Lorebook) != 2 || d.Lorebook[0].Name != "Bar" || !d.Lorebook[0].Disabled ||
		len(d.Lorebook[0].Keys) != 1 || d.Lorebook[1].Name != "Cellar" {
		t.Fatalf("lorebook, by number and without the empty entry: %+v", d.Lorebook)
	}
	// Only chub's own hosts are proxied, and the pack's holes are not pictures.
	if len(d.Expressions) != 1 || d.Expressions[0].Label != "joy" || !strings.HasPrefix(d.Expressions[0].URL, "/api/chub/avatar?src=") {
		t.Fatalf("expressions: %+v", d.Expressions)
	}

	rec = do(t, s.Handler(), token, http.MethodGet, "/api/chub/gallery?id=125370&page=2", "")
	var g struct {
		Items []struct{ URL, Description string } `json:"items"`
		More  bool                                `json:"more"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &g)
	if rec.Code != http.StatusOK || len(g.Items) != 1 || g.More || g.Items[0].Description != "On a couch." {
		t.Fatalf("gallery: %d %s", rec.Code, rec.Body.String())
	}
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/chub/details?path=../x", ""); rec.Code != http.StatusBadRequest {
		t.Fatalf("a bad path: %d", rec.Code)
	}
}
