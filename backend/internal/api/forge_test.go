package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/trainer"
)

func TestACatalogueBaseFinerThanTheFileIsKept(t *testing.T) {
	s, _ := newTestServer(t)
	ctx := context.Background()
	for key, base := range map[string]string{
		"Stable-diffusion/il.safetensors":    "Illustrious",
		"Stable-diffusion/wrong.safetensors": "Pony",
		"Stable-diffusion/open.safetensors":  "Anima",
		"Lora/ink.safetensors":               "NoobAI",
	} {
		if err := s.db.PutCivitaiLink(ctx, db.CivitaiLink{ModelKey: key, Hash: "h" + key, BaseModel: base}); err != nil {
			t.Fatal(err)
		}
	}
	models := []imagegen.Model{
		{Key: "Stable-diffusion/il.safetensors", Base: "SDXL", Family: imagegen.FamilySDXL},
		// The tensors say Anima, so a link saying Pony is the link being wrong.
		{Key: "Stable-diffusion/wrong.safetensors", Base: "Anima", Family: imagegen.FamilyAnima},
		// Nothing was read: the catalogue is all there is.
		{Key: "Stable-diffusion/open.safetensors"},
		{Key: "Stable-diffusion/unlinked.safetensors", Base: "SDXL", Family: imagegen.FamilySDXL},
	}
	loras := []imagegen.Lora{{Key: "Lora/ink.safetensors", Base: "SDXL", Family: imagegen.FamilySDXL}}
	s.overlayStatusBases(ctx, models, loras)
	for i, want := range [][2]string{
		{"Illustrious", imagegen.FamilySDXL}, {"Anima", imagegen.FamilyAnima},
		{"Anima", imagegen.FamilyAnima}, {"SDXL", imagegen.FamilySDXL},
	} {
		if models[i].Base != want[0] || models[i].Family != want[1] {
			t.Errorf("model %d = %q %q, want %v", i, models[i].Base, models[i].Family, want)
		}
	}
	if loras[0].Base != "NoobAI" {
		t.Errorf("LoRA = %q", loras[0].Base)
	}
}

func TestWhetherATrainerCanTrainAFamilySaysWhatToDoAboutIt(t *testing.T) {
	current := &trainer.Health{Families: []string{"sd1", "sdxl", "anima"}}
	old := &trainer.Health{}
	if err := trainerCanTrain(current, "anima"); err != nil {
		t.Error(err)
	}
	if err := trainerCanTrain(old, "sdxl"); err != nil {
		t.Errorf("an old trainer still trains SDXL: %v", err)
	}
	if err := trainerCanTrain(current, ""); err != nil {
		t.Errorf("a family nothing could read is left for the run to find out: %v", err)
	}
	if err := trainerCanTrain(old, "anima"); err == nil || !strings.Contains(err.Error(), "update") {
		t.Errorf("an old trainer should say to update: %v", err)
	}
	if err := trainerCanTrain(current, "ernie"); err == nil || strings.Contains(err.Error(), "update") {
		t.Errorf("updating does not help a family no tool has: %v", err)
	}
}

func TestTrainedLorasAreFiledUnderTheCataloguesNames(t *testing.T) {
	for family, want := range map[string]string{
		imagegen.FamilySDXL: "SDXL 1.0", imagegen.FamilySD1: "SD 1.5", imagegen.FamilyAnima: "Anima", imagegen.FamilyFlux2: "Flux.2 Klein",
	} {
		got := trainedBase(family)
		if got != want {
			t.Errorf("%s = %q", family, got)
		}
		if imagegen.FamilyOfBase(got) != family {
			t.Errorf("%q does not read back as %s", got, family)
		}
	}
}

func TestAskingCivitaiKeepsWhatABaseIs(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/model-versions/by-hash/AAA":
			fmt.Fprint(w, `{"id":11,"modelId":1}`)
		case "/models/1":
			fmt.Fprint(w, `{"id":1,"type":"LORA","name":"Ink","modelVersions":[{"id":11,"baseModel":"Illustrious"}]}`)
		default:
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, `{"error":"Model not found"}`)
		}
	}))
	t.Cleanup(upstream.Close)
	s, token := newTestServer(t)
	enableImageGen(t, s, sortA1111(t).URL)
	set := s.settings.Get()
	set.CivitaiAPIURL = upstream.URL
	s.settings.Set(set)
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/imagegen/bases/civitai", `{"keys":["Lora/ink.safetensors","Lora/mika.safetensors","Lora/plain.safetensors"]}`)
	var got struct {
		Results []baseLookup `json:"results"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
	want := []baseLookup{
		{Key: "Lora/ink.safetensors", Base: "Illustrious", Outcome: "found"},
		{Key: "Lora/mika.safetensors", Outcome: "unknown"},
		{Key: "Lora/plain.safetensors", Outcome: "unhashed"},
	}
	for i, w := range want {
		if got.Results[i] != w {
			t.Errorf("result %d = %+v, want %+v", i, got.Results[i], w)
		}
	}
	if link, ok, _ := s.db.CivitaiLink(context.Background(), "Lora/ink.safetensors"); !ok || link.BaseModel != "Illustrious" {
		t.Errorf("the answer was not kept: %+v %v", link, ok)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/imagegen/bases/civitai", `{"keys":[]}`); rec.Code != http.StatusBadRequest {
		t.Errorf("an empty batch answered %d", rec.Code)
	}
}

func TestGettingModulesIsRefusedOffForge(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, sortA1111(t).URL)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/modules/get", `{"family":"anima"}`)
	// 409, never 401: a 401 from any endpoint signs the web client out.
	if rec.Code != http.StatusConflict {
		t.Fatalf("%d %s", rec.Code, rec.Body)
	}
}
