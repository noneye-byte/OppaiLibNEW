package api

import (
	"reflect"
	"testing"
)

// The cards below are lines from real model pages (2026-10), flattened the way
// civitaiPlainText flattens them.

func TestCivitaiSuggestReadsACheckpointCardsSettingsAndPromptHeadings(t *testing.T) {
	card := "Please do not add too many quality and aesthetic-related tags, nor overly long negative prompts.\n" +
		"Steps: 15-30\nCFG scale: 5-7\nSampler: Euler a\n" +
		"Example images use 1024×1344.Hires upscale: 1.5, Hires steps: 20, Denoising strength: 0.35~0.5\n" +
		"Users are expected to consciously add \"nsfw\" to negative prompts to filter inappropriate content.\n" +
		"Positive Prompt\n,masterpiece,best quality,amazing quality,\n" +
		"Negative Prompt\nbad quality,worst quality,worst detail,sketch,censor,\n"
	s := civitaiSuggest(civitaiSuggestInput{Descriptions: []string{card}})
	want := civitaiSuggestion{
		TriggerWords: []string{}, Positive: "masterpiece, best quality, amazing quality",
		Negative: "bad quality, worst quality, worst detail, sketch, censor",
		Steps:    23, CfgScale: 6, Scheduler: "euler_a", Width: 1024, Height: 1344,
	}
	s.Sources = nil
	if !reflect.DeepEqual(s, want) {
		t.Errorf("got  %+v\nwant %+v", s, want)
	}
}

func TestCivitaiSuggestFindsSettingsWrittenAsSentences(t *testing.T) {
	card := "Make sure you load this model with clip skip 2 (or -2 in some software), otherwise you will be getting low quality blobs.\n" +
		"This model supports a wide array of styles and aesthetics but provides an opinionated default prompt template\n" +
		"score_9, score_8_up, score_7_up, score_6_up, score_5_up\n" +
		"The model is designed to not need negative prompts in most cases.\n" +
		"Using Euler a with 25 steps and resolution of 1024px is recommended.\n"
	s := civitaiSuggest(civitaiSuggestInput{Descriptions: []string{card}})
	if s.ClipSkip != 2 || s.Steps != 25 || s.Scheduler != "euler_a" {
		t.Errorf("clip skip %d, steps %d, scheduler %q", s.ClipSkip, s.Steps, s.Scheduler)
	}
	if s.Positive != "score_9, score_8_up, score_7_up, score_6_up, score_5_up" {
		t.Errorf("positive %q", s.Positive)
	}
	if s.Negative != "" {
		t.Errorf("a sentence about negative prompts became one: %q", s.Negative)
	}
}

func TestCivitaiSuggestTakesALabelledPromptOnTheSameLineAndStopsAtTheNextLabel(t *testing.T) {
	card := "CFG : 5-6\npositive: masterpiece,best quality,amazing quality,absurdres,\n" +
		"negative: bad quality,worst quality,worst detail,sketch,censored,watermark, signature, artist name\n" +
		"Clip Skip: 2\nResolution: 896x1152 / 832x1216\n"
	s := civitaiSuggest(civitaiSuggestInput{Descriptions: []string{card}})
	if s.Positive != "masterpiece, best quality, amazing quality, absurdres" {
		t.Errorf("positive %q", s.Positive)
	}
	if s.Negative != "bad quality, worst quality, worst detail, sketch, censored, watermark, signature, artist name" {
		t.Errorf("negative %q", s.Negative)
	}
	if s.CfgScale != 5.5 || s.ClipSkip != 2 || s.Width != 896 || s.Height != 1152 {
		t.Errorf("cfg %v, clip %d, size %dx%d", s.CfgScale, s.ClipSkip, s.Width, s.Height)
	}

	run := "positive:\nmasterpiece, best quality, very aestheticnegative:\n"
	if got := civitaiSuggest(civitaiSuggestInput{Descriptions: []string{run}}).Positive; got != "masterpiece, best quality, very aesthetic" {
		t.Errorf("a label run on without a break: %q", got)
	}
}

func TestCivitaiSuggestReadsALorasWeightRangeAndLeavesTheCheckpointsSettingsAlone(t *testing.T) {
	cases := map[string][3]float64{
		"Works on: 0.5-1.5 weights, feel free to experiment":                {1, 0.5, 1.5},
		"-Recommended strength <0.8>":                                       {0.8, 0, 0},
		"Recomanded weight is 0.8":                                          {0.8, 0, 0},
		"Best result with weight between : 0.8-1.":                          {0.9, 0.8, 1},
		"Recommend to use with strength 0.85-0.9":                           {0.9, 0.85, 0.9},
		"Less than 2 Loras: Lora weight 0.7 ~ 1.2":                          {0.95, 0.7, 1.2},
		"Use it like <lora:my_style_v2:0.65> at the end":                    {0.65, 0, 0},
		"Hires upscale: 1.5, Hires steps: 20, Denoising strength: 0.35~0.5": {0, 0, 0},
	}
	for line, want := range cases {
		s := civitaiSuggest(civitaiSuggestInput{IsLora: true, Descriptions: []string{line + "\nSteps: 30\nCFG: 7"}})
		if got := [3]float64{s.Weight, s.WeightMin, s.WeightMax}; got != want {
			t.Errorf("%q: weight %v, want %v", line, got, want)
		}
		if s.Steps != 0 || s.CfgScale != 0 {
			t.Errorf("%q: a LoRA took the card's steps %d / cfg %v", line, s.Steps, s.CfgScale)
		}
	}
}

func TestCivitaiSuggestPrefersTheVersionsCardOverTheModels(t *testing.T) {
	s := civitaiSuggest(civitaiSuggestInput{Descriptions: []string{"Steps: 40", "Steps: 20\nCFG: 4"}})
	if s.Steps != 40 || s.CfgScale != 4 || s.Sources["steps"] != "description" {
		t.Errorf("steps %d cfg %v sources %v", s.Steps, s.CfgScale, s.Sources)
	}
}

func TestCivitaiSuggestFillsTheGapsFromTheShowcase(t *testing.T) {
	examples := []map[string]any{
		{"prompt": "score_9, score_8_up, 1girl, solo, <lora:InkStyle:0.7>", "negativePrompt": "worst quality, lowres",
			"steps": 28.0, "cfgScale": 6.0, "sampler": "DPM++ 2M Karras", "Size": "832x1216", "clipSkip": 2.0,
			"civitaiResources": []any{map[string]any{"type": "lora", "weight": 0.7, "modelVersionId": 99.0}}},
		{"prompt": "score_9, score_8_up, 1boy, (masterpiece:1.2)", "negativePrompt": "worst quality, lowres",
			"steps": "28", "cfgScale": 7.0, "sampler": "DPM++ 2M Karras", "Size": "832x1216",
			"resources": []any{map[string]any{"type": "lora", "name": "ink_style", "weight": 0.9}}},
		{"prompt": "score_9, landscape, <lora:InkStyle:0.8>", "negativePrompt": "blurry",
			"steps": 28.0, "cfgScale": 6.0, "sampler": "Euler a", "Size": "1024x1024"},
	}
	ckpt := civitaiSuggest(civitaiSuggestInput{Descriptions: []string{"CFG scale: 5"}, Examples: examples})
	if ckpt.CfgScale != 5 || ckpt.Sources["cfgScale"] != "description" {
		t.Errorf("the card's CFG gave way to the showcase: %v", ckpt.CfgScale)
	}
	if ckpt.Steps != 28 || ckpt.Scheduler != "dpmpp_2m_k" || ckpt.Width != 832 || ckpt.Height != 1216 || ckpt.ClipSkip != 2 {
		t.Errorf("showcase settings: %+v", ckpt)
	}
	if ckpt.Negative != "worst quality, lowres" || ckpt.Sources["negative"] != "examples" {
		t.Errorf("negative %q", ckpt.Negative)
	}
	if ckpt.Positive != "score_9, score_8_up" {
		t.Errorf("positive %q (subject tags are not the model's)", ckpt.Positive)
	}

	lora := civitaiSuggest(civitaiSuggestInput{IsLora: true, Examples: examples, VersionID: 99, FileStem: "InkStyle"})
	if lora.Weight != 0.8 || lora.WeightMin != 0.7 || lora.WeightMax != 0.9 {
		t.Errorf("LoRA weight %v (%v–%v)", lora.Weight, lora.WeightMin, lora.WeightMax)
	}
}

func TestCivitaiSuggestKeepsOnePicturesNegativeToItself(t *testing.T) {
	s := civitaiSuggest(civitaiSuggestInput{Examples: []map[string]any{
		{"negativePrompt": "a"}, {"negativePrompt": "b"}, {"negativePrompt": "c"},
	}})
	if s.Negative != "" {
		t.Errorf("negative %q", s.Negative)
	}
}

func TestCivitaiSuggestTidiesTrainedWords(t *testing.T) {
	got := civitaiCleanTriggers([]string{"abstractionism, brush stroke, traditional media, ", " ", "usnr", "USNR"})
	want := []string{"abstractionism, brush stroke, traditional media", "usnr"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %q", got)
	}
}
