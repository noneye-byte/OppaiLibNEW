package imagegen

import (
	"strings"
	"testing"
)

func TestBuildPromptStripsFillerAndKeepsSubject(t *testing.T) {
	prompt, neg := BuildPrompt("please draw me a picture of a girl with long red hair on a beach")
	if strings.Contains(strings.ToLower(prompt), "draw me") || strings.Contains(strings.ToLower(prompt), "picture of") {
		t.Errorf("prompt kept the spoken request framing: %q", prompt)
	}
	if !strings.Contains(prompt, "girl with long red hair on a beach") {
		t.Errorf("prompt dropped the subject: %q", prompt)
	}
	if !strings.Contains(prompt, "best quality") && !strings.Contains(prompt, "photorealistic") {
		t.Errorf("prompt has no quality boosters: %q", prompt)
	}
	if neg == "" {
		t.Error("negative prompt is empty; a bare positive prompt gives worse results")
	}
}

func TestBuildPromptStyleDetection(t *testing.T) {
	photo, negPhoto := BuildPrompt("a realistic photo of a woman")
	if !strings.Contains(photo, "photorealistic") {
		t.Errorf("photo intent didn't lead with photoreal tags: %q", photo)
	}
	// A photo's negative prompt should push *away* from illustration.
	if !strings.Contains(negPhoto, "anime") {
		t.Errorf("photo negative prompt should exclude anime/drawing: %q", negPhoto)
	}

	anime, _ := BuildPrompt("anime girl with cat ears")
	if !strings.Contains(anime, "anime") {
		t.Errorf("anime intent didn't add anime tags: %q", anime)
	}
}

func TestBuildPromptEmptyStillUsable(t *testing.T) {
	prompt, neg := BuildPrompt("   ")
	if prompt == "" || neg == "" {
		t.Errorf("empty speech should still yield quality + negative scaffolding, got %q / %q", prompt, neg)
	}
}
