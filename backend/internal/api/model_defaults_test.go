package api

import (
	"context"
	"net/http"
	"strings"
	"testing"
)

func TestAFreshInstallTakesTheCardsRecommendedSettings(t *testing.T) {
	s, token, inv := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/install",
		`{"url":"https://civitai.com/api/download/models/999","modelId":4384,"versionId":999}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("install: %d %s", rec.Code, rec.Body)
	}
	inv.mu.Lock()
	inv.jobDone = true
	inv.mu.Unlock()
	ctx := context.Background()
	s.civitaiApplyFinishedInstalls(ctx)

	inv.mu.Lock()
	var steps any
	for _, p := range inv.patches {
		if ds, ok := p["default_settings"].(map[string]any); ok {
			steps = ds["steps"]
		}
	}
	inv.mu.Unlock()
	if steps != float64(25) {
		t.Fatalf("steps sent to the generator = %v", steps)
	}
	x, err := s.db.GetModelDefaults(ctx, "k-new")
	if err != nil || x.Negative != "lowres, bad hands" || x.ClipSkip != 2 {
		t.Fatalf("kept here = %+v, %v", x, err)
	}
}

func TestTheEditorsDefaultsAreSplitBetweenTheGeneratorAndHere(t *testing.T) {
	s, token, inv := civitaiTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodPatch, "/api/imagegen/model",
		`{"key":"k-dream","defaults":{"steps":30,"positive":"masterpiece, best quality","negative":"lowres","clipSkip":2}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body)
	}
	inv.mu.Lock()
	ds, _ := inv.patched["default_settings"].(map[string]any)
	inv.mu.Unlock()
	if ds["steps"] != float64(30) || ds["positive"] != nil || ds["negative"] != nil {
		t.Fatalf("generator was sent %v", ds)
	}
	if !strings.Contains(rec.Body.String(), `"positive":"masterpiece, best quality"`) {
		t.Fatalf("the answer lacks what is kept here: %s", rec.Body)
	}

	// A client that knows nothing of these fields saves the generator's settings
	// alone, and what is kept here stays.
	rec = do(t, s.Handler(), token, http.MethodPatch, "/api/imagegen/model", `{"key":"k-dream","defaults":{"steps":20}}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("old client patch: %d %s", rec.Code, rec.Body)
	}
	x, _ := s.db.GetModelDefaults(context.Background(), "k-dream")
	if x.Negative != "lowres" || x.ClipSkip != 2 {
		t.Fatalf("an older client's save cleared %+v", x)
	}

	// The studio's listing carries them on the model.
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/status", "")
	if !strings.Contains(rec.Body.String(), `"negative":"lowres"`) {
		t.Fatalf("status lacks the negative: %s", rec.Body)
	}

	// Naming a field empty clears it.
	do(t, s.Handler(), token, http.MethodPatch, "/api/imagegen/model", `{"key":"k-dream","defaults":{"negative":"","positive":"","clipSkip":0}}`)
	if x, _ := s.db.GetModelDefaults(context.Background(), "k-dream"); !x.Empty() {
		t.Fatalf("not cleared: %+v", x)
	}
}

func TestTheSuggestionForAnInstalledModelFindsItByHashAndReadsItsVersion(t *testing.T) {
	s, token, _ := civitaiTestServer(t)
	// k-lora's hash is not on the fake catalogue.
	if rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/suggest?key=k-lora", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("not on Civitai: %d %s", rec.Code, rec.Body)
	}
	// k-dream was never linked; asking links it by hash, to version 8.
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/suggest?key=k-dream", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"modelName":"DreamShaper"`) {
		t.Fatalf("by hash: %d %s", rec.Code, rec.Body)
	}
	if link, ok, _ := s.db.CivitaiLink(context.Background(), "k-dream"); !ok || link.VersionID != 128713 {
		t.Fatalf("not linked: %+v", link)
	}
	// Version 9's card has settings.
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/suggest?key=k-dream&versionId=999", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"steps":25`) ||
		!strings.Contains(rec.Body.String(), `"triggerWords":["dream"]`) {
		t.Fatalf("suggest: %d %s", rec.Code, rec.Body)
	}
}
