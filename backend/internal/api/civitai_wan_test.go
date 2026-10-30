package api

import (
	"net/http"
	"strings"
	"testing"
)

// The version names are real ones from the catalogue's most downloaded Wan 2.2 models.
func TestAWanVersionsHalfIsReadOffItsNameHoweverItIsWritten(t *testing.T) {
	for name, want := range map[string]string{
		"I2V v2.0 High":           "high",
		"I2V Low v3.0":            "low",
		"High noise - v1.1":       "high",
		"Low Noise - v1.1":        "low",
		"Wan2.2 I2V Highnoise":    "high",
		"NSFW FAST MOVE V2 Q8 H":  "high",
		"NSFW FAST MOVE V2 Q8 L":  "low",
		"DR34ML4Y_I2V_14B_LOW_v2": "low",
		"2.2 HIGH v0.08a":         "high",
		"v1.0":                    "",
		"Slow motion v2":          "",
		"High + Low bundle":       "",
		"HelloWorld XL":           "",
	} {
		if got := wanStage(name); got != want {
			t.Errorf("wanStage(%q) = %q, want %q", name, got, want)
		}
	}
}

func TestAHalfFindsTheOtherHalfWithTheSameNameAndBase(t *testing.T) {
	const base = "Wan Video 2.2 I2V-A14B"
	versions := []civitaiRawVersion{
		{ID: 1, Name: "SnatchKiss High v11", BaseModel: base},
		{ID: 2, Name: "SnatchKiss Low v11", BaseModel: base},
		{ID: 3, Name: "SnatchKiss High v10", BaseModel: base},
		{ID: 4, Name: "SnatchKiss Low v10", BaseModel: base},
		{ID: 5, Name: "Q8 High", BaseModel: base},
		{ID: 6, Name: "Q8 Low", BaseModel: "Wan Video 2.2 T2V-A14B"},
	}
	for id, want := range map[int64]int64{1: 2, 2: 1, 3: 4, 4: 3} {
		var v civitaiRawVersion
		for _, x := range versions {
			if x.ID == id {
				v = x
			}
		}
		if twin := wanTwin(versions, v); twin == nil || twin.ID != want {
			t.Errorf("twin of %d = %v, want %d", id, twin, want)
		}
	}
	if twin := wanTwin(versions, versions[4]); twin != nil {
		t.Errorf("a half was paired across base models: %v", twin)
	}
	if twin := wanTwin([]civitaiRawVersion{{ID: 1, Name: "High", BaseModel: "SDXL 1.0"}, {ID: 2, Name: "Low", BaseModel: "SDXL 1.0"}},
		civitaiRawVersion{ID: 1, Name: "High", BaseModel: "SDXL 1.0"}); twin != nil {
		t.Error("a picture model's versions were read as a Wan pair")
	}
}

// The file names are real uploads' high and low halves.
func TestBothHalvesAreNamedAfterWhatTheirFilesShareEndingInTheirHalf(t *testing.T) {
	const i2v = "Wan Video 2.2 I2V-A14B"
	for _, c := range []struct{ file, twin, stage, wantFile, wantTwin string }{
		{"smoothMixWan2214BI2V_i2vV20High.safetensors", "smoothMixWan2214BI2V_i2vV20Low.safetensors", "high",
			"smoothMixWan2214BI2V_i2vV20_high.safetensors", "smoothMixWan2214BI2V_i2vV20_low.safetensors"},
		{"wan22EnhancedNSFWSVICamera_nsfwFASTMOVEV2Q8L.gguf", "wan22EnhancedNSFWSVICamera_nsfwFASTMOVEV2Q8H.gguf", "low",
			"wan22EnhancedNSFWSVICamera_nsfwFASTMOVEV2Q8_i2v_low.gguf", "wan22EnhancedNSFWSVICamera_nsfwFASTMOVEV2Q8_i2v_high.gguf"},
		{"DasiwaWAN22I2V14BLightspeed_snatchkissHighV11_pruned_fp8.safetensors", "DasiwaWAN22I2V14BLightspeed_snatchkissLowV11_pruned_fp8.safetensors", "high",
			"DasiwaWAN22I2V14BLightspeed_snatchkiss_V11_pruned_fp8_high.safetensors", "DasiwaWAN22I2V14BLightspeed_snatchkiss_V11_pruned_fp8_low.safetensors"},
		{"NSFW-22-H-e8.safetensors", "NSFW-22-L-e8.safetensors", "high", "NSFW-22_e8_i2v_high.safetensors", "NSFW-22_e8_i2v_low.safetensors"},
	} {
		file, twin := wanPairNames(c.file, c.twin, c.stage, i2v)
		if file != c.wantFile || twin != c.wantTwin {
			t.Errorf("%s: got %s, %s; want %s, %s", c.file, file, twin, c.wantFile, c.wantTwin)
		}
	}
}

func TestInstallingIntoComfyUIWithoutItsFolderSaysWhereToMapIt(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/imagegen/civitai/install",
		`{"url":"https://civitai.com/api/download/models/1","target":"comfy"}`)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "/comfy-models") {
		t.Fatalf("got %d %s", rec.Code, rec.Body)
	}
	jobs := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/civitai/installs?target=comfy", "")
	if jobs.Code != http.StatusOK || !strings.Contains(jobs.Body.String(), `"jobs":[]`) {
		t.Fatalf("installs: %d %s", jobs.Code, jobs.Body)
	}
}

func TestAShowcaseClipIsShownByItsFirstFrame(t *testing.T) {
	for raw, want := range map[string]string{
		"https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/eec3b217/original=true/115359352.mp4": "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/eec3b217/anim=false,transcode=true,width=720/115359352.jpeg",
		"https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/eec3b217/115359352.webm":              "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/eec3b217/anim=false,transcode=true,width=720/115359352.jpeg",
		"https://image.civitai.com/x.mp4":                                                       "",
	} {
		if got := civitaiVideoStill(raw); got != want {
			t.Errorf("%s → %s, want %s", raw, got, want)
		}
	}
	urls := civitaiPreviewURLs([]civitaiRawImage{{URL: "https://image.civitai.com/k/u/original=true/1.mp4", Type: "video"}, {URL: "https://image.civitai.com/k/u/original=true/2.jpeg", Type: "image"}}, 5)
	if len(urls) != 2 || !strings.HasSuffix(urls[0], "/anim=false,transcode=true,width=720/1.jpeg") {
		t.Fatalf("previews = %v", urls)
	}
}
