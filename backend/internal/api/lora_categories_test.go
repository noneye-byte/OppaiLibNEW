package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// loraA1111 is an Automatic1111 with three LoRAs and nothing else worth asking.
func loraA1111(t *testing.T) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sdapi/v1/sd-models":
			_, _ = w.Write([]byte(`[{"title":"rev.safetensors [abc123]","model_name":"rev","hash":"abc123"}]`))
		case "/sdapi/v1/loras":
			_, _ = w.Write([]byte(`[{"name":"ink"},{"name":"mika"},{"name":"glasses"}]`))
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

type categoryStatus struct {
	Loras []struct {
		Name        string `json:"name"`
		CategoryKey string `json:"categoryKey"`
	} `json:"loras"`
}

func statusCategories(t *testing.T, h http.Handler, token string) map[string]string {
	t.Helper()
	var st categoryStatus
	_ = json.Unmarshal(do(t, h, token, http.MethodGet, "/api/imagegen/status", "").Body.Bytes(), &st)
	got := map[string]string{}
	for _, l := range st.Loras {
		got[l.Name] = l.CategoryKey
	}
	return got
}

func TestLorasAreFiledUnderTheFixedCategoriesTheStatusHandsBack(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, loraA1111(t).URL)
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/assign", `{"category":"style","loras":["ink","glasses"]}`)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("assign: %d %s", rec.Code, rec.Body)
	}
	// Filing one under another category takes it out of the first.
	do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/assign", `{"category":"character","loras":["glasses","mika"]}`)
	if got := statusCategories(t, h, token); got["ink"] != "style" || got["glasses"] != "character" || got["mika"] != "character" {
		t.Fatalf("categories = %v", got)
	}

	if rec := do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/assign", `{"category":"","loras":["mika"]}`); rec.Code != http.StatusNoContent {
		t.Fatalf("take out: %d %s", rec.Code, rec.Body)
	}
	if got := statusCategories(t, h, token); got["mika"] != "" {
		t.Fatalf("mika is still filed: %v", got)
	}
}

func TestACategoryOffTheListIsRefused(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, loraA1111(t).URL)
	h := s.Handler()
	for _, body := range []string{`{"category":"Art styles","loras":["ink"]}`, `{"category":3,"loras":["ink"]}`} {
		if rec := do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/assign", body); rec.Code != http.StatusBadRequest {
			t.Fatalf("%s: %d %s", body, rec.Code, rec.Body)
		}
	}
	if got := statusCategories(t, h, token); got["ink"] != "" {
		t.Fatalf("ink was filed anyway: %v", got)
	}
}

func TestACivitaiLorasCategoryTagSaysWhereItIsFiled(t *testing.T) {
	cases := []struct {
		kind string
		tags []string
		want string
	}{
		{"LORA", []string{"anime", "character", "woman"}, "character"},
		{"LORA", []string{"celebrity"}, "character"},
		{"LoCon", []string{"style", "artist"}, "style"},
		{"LORA", []string{"clothing", "outfit"}, "concept"},
		{"LORA", []string{"tool", "slider"}, "tools"},
		{"LORA", []string{"poses"}, "poses"},
		{"LORA", []string{"buildings"}, "background"},
		{"LORA", []string{"vehicle"}, "etc"},
		{"LORA", []string{"anime", "girl"}, ""},
		{"Checkpoint", []string{"style"}, ""},
	}
	for _, c := range cases {
		if got := civitaiLoraCategory(c.kind, c.tags); got != c.want {
			t.Errorf("%s %v = %q, want %q", c.kind, c.tags, got, c.want)
		}
	}
}
