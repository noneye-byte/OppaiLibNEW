package api

import (
	"encoding/json"
	"fmt"
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
		Name     string `json:"name"`
		Category int64  `json:"category"`
	} `json:"loras"`
	LoraCategories []loraCategoryOut `json:"loraCategories"`
}

func TestLorasAreSortedIntoCategoriesTheStatusHandsBack(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, loraA1111(t).URL)
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories", `{"name":"Styles"}`)
	var styles loraCategoryOut
	_ = json.Unmarshal(rec.Body.Bytes(), &styles)
	if rec.Code != http.StatusCreated || styles.ID == 0 || styles.Name != "Styles" {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories", `{"name":"  styles "}`)
	var again loraCategoryOut
	_ = json.Unmarshal(rec.Body.Bytes(), &again)
	if again.ID != styles.ID {
		t.Fatalf("the same name in other capitals made a second category: %s", rec.Body)
	}
	rec = do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories", `{"name":"Characters"}`)
	var chars loraCategoryOut
	_ = json.Unmarshal(rec.Body.Bytes(), &chars)

	rec = do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/assign",
		fmt.Sprintf(`{"category":%d,"loras":["ink","glasses"]}`, styles.ID))
	if rec.Code != http.StatusOK {
		t.Fatalf("assign: %d %s", rec.Code, rec.Body)
	}
	// Moving one into another category takes it out of the first.
	do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/assign",
		fmt.Sprintf(`{"category":%d,"loras":["glasses","mika"]}`, chars.ID))

	var st categoryStatus
	_ = json.Unmarshal(do(t, h, token, http.MethodGet, "/api/imagegen/status", "").Body.Bytes(), &st)
	got := map[string]int64{}
	for _, l := range st.Loras {
		got[l.Name] = l.Category
	}
	if got["ink"] != styles.ID || got["glasses"] != chars.ID || got["mika"] != chars.ID {
		t.Fatalf("categories = %v", got)
	}
	// Listed by name, counted over the LoRAs there are.
	if len(st.LoraCategories) != 2 || st.LoraCategories[0].Name != "Characters" || st.LoraCategories[0].Count != 2 || st.LoraCategories[1].Count != 1 {
		t.Fatalf("loraCategories = %+v", st.LoraCategories)
	}

	rec = do(t, h, token, http.MethodPatch, fmt.Sprintf("/api/imagegen/lora-categories/%d", styles.ID), `{"name":"characters"}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("renaming onto another category: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPatch, fmt.Sprintf("/api/imagegen/lora-categories/%d", styles.ID), `{"name":"Art styles"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("rename: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/assign", `{"category":0,"loras":["mika"]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("take out: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodPost, "/api/imagegen/lora-categories/assign", `{"category":9999,"loras":["mika"]}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("a category that isn't there: %d %s", rec.Code, rec.Body)
	}

	rec = do(t, h, token, http.MethodDelete, fmt.Sprintf("/api/imagegen/lora-categories/%d", chars.ID), "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body)
	}
	st = categoryStatus{}
	_ = json.Unmarshal(do(t, h, token, http.MethodGet, "/api/imagegen/status", "").Body.Bytes(), &st)
	for _, l := range st.Loras {
		if l.Name != "ink" && l.Category != 0 {
			t.Fatalf("%s is still in a deleted category", l.Name)
		}
	}
	if len(st.LoraCategories) != 1 || st.LoraCategories[0].Name != "Art styles" {
		t.Fatalf("loraCategories = %+v", st.LoraCategories)
	}
}
