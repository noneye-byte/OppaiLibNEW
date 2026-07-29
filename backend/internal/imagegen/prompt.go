package imagegen

import (
	"regexp"
	"strings"
)

// BuildPrompt turns a scrap of natural speech ("draw me a girl with long red hair on a
// beach at sunset") into a fuller image-generation prompt plus a matching negative
// prompt. It's deliberately rule-based, not a model: there is no LLM in this project,
// and a handful of transforms gets most of the way for a single-user tool.
//
// The transforms, in order:
//   - strip the filler a person says out loud but a prompt shouldn't carry ("draw me
//     a", "can you make", "please", …);
//   - detect a style intent (photo vs anime vs art) and lead with the quality tags
//     that style wants;
//   - keep the spoken subject, lightly cleaned;
//   - append the always-useful detail boosters;
//   - pick the negative prompt that matches the style (a photo and a drawing fail in
//     different ways).
//
// The result is a starting point the user edits, not a final answer — the web view
// drops it into an editable box before anything is generated.
func BuildPrompt(speech string) (prompt, negative string) {
	subject := cleanSpeech(speech)
	style := detectStyle(speech)

	var lead string
	switch style {
	case stylePhoto:
		lead = "RAW photo, photorealistic, ultra detailed, 8k uhd, sharp focus, natural lighting"
		negative = negativePhoto
	case styleAnime:
		lead = "masterpiece, best quality, highly detailed, anime style, vibrant colors"
		negative = negativeArt
	default:
		lead = "masterpiece, best quality, highly detailed, intricate detail, sharp focus"
		negative = negativeArt
	}

	parts := []string{lead}
	if subject != "" {
		parts = append(parts, subject)
	}
	prompt = strings.Join(parts, ", ")
	return prompt, negative
}

type promptStyle int

const (
	styleDefault promptStyle = iota
	stylePhoto
	styleAnime
)

// detectStyle reads the intent words out of the raw speech (before they're stripped as
// filler), so "a photo of…" leads to photoreal tags and "anime girl" to anime ones.
func detectStyle(speech string) promptStyle {
	s := strings.ToLower(speech)
	switch {
	case containsAny(s, "photo", "photograph", "photorealistic", "realistic", "real life", "irl"):
		return stylePhoto
	case containsAny(s, "anime", "manga", "hentai", "waifu", "2d", "cartoon", "drawing", "illustration"):
		return styleAnime
	default:
		return styleDefault
	}
}

// fillerRe strips the spoken lead-in ("draw me a", "generate an image of", …) that a
// person naturally says but a prompt shouldn't repeat. Anchored to the start so it
// only removes an opening request, not the word "image" wherever it appears.
var fillerRe = regexp.MustCompile(`(?i)^\s*(please\s+)?(can you\s+|could you\s+)?(draw|generate|create|make|render|paint|show|give)( me)?( an?| the)?\s*(image|picture|photo|photograph|drawing|render|pic)?( of)?\s*`)

// wsRe collapses runs of whitespace left behind by stripping.
var wsRe = regexp.MustCompile(`\s+`)

// cleanSpeech removes the request framing and tidies whitespace/punctuation, leaving
// the subject of the picture.
func cleanSpeech(speech string) string {
	s := strings.TrimSpace(speech)
	s = fillerRe.ReplaceAllString(s, "")
	s = strings.Trim(s, " .,!?")
	s = wsRe.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}

const (
	negativeArt   = "lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, username, blurry, text, error"
	negativePhoto = "cartoon, anime, drawing, painting, illustration, 3d render, lowres, bad anatomy, bad hands, missing fingers, extra digit, cropped, worst quality, low quality, jpeg artifacts, watermark, signature, blurry, deformed, disfigured"
)
