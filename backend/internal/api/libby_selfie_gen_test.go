package api

import (
	"strings"
	"testing"
)

// A picture she makes of herself is drawn in what she has on and what she is doing,
// not in the default sprite's clothes — and the state is gated the way the state is.
func TestASelfieSheMakesIsDrawnInHerCurrentState(t *testing.T) {
	s, _ := newTestServer(t)
	prompt, tags := s.libbySelfiePrompt("libby, orange hair, glasses", "in the bath", "", "napping", 1)
	for _, want := range []string{"libby, orange hair, glasses", "black tank top", "sleeping", "in the bath"} {
		if !strings.Contains(prompt, want) {
			t.Errorf("prompt lacks %q: %s", want, prompt)
		}
	}
	if len(tags) != 1 || tags[0] != "napping" {
		t.Errorf("tags = %v", tags)
	}
	// Likeness first, subject last: the picture is of her, doing the thing.
	if !strings.HasPrefix(prompt, "libby, orange hair") || !strings.HasSuffix(prompt, "in the bath") {
		t.Errorf("order: %s", prompt)
	}

	// An intimate state at a calm heat does not reach the prompt.
	calm, calmTags := s.libbySelfiePrompt("", "on the sofa", "", "vibrator", 2)
	if strings.Contains(calm, "vibrator") || len(calmTags) != 0 {
		t.Errorf("calm heat drew an explicit state: %s %v", calm, calmTags)
	}
	hot, hotTags := s.libbySelfiePrompt("", "on the sofa", "", "vibrator", 4)
	if !strings.Contains(hot, "vibrator") || len(hotTags) != 1 {
		t.Errorf("heat 4 refused the state: %s %v", hot, hotTags)
	}
	// The bundled wardrobe follows the heat tier.
	if !strings.Contains(hot, "orange bra visible") {
		t.Errorf("heat-4 clothes missing: %s", hot)
	}
}

// A worn wardrobe the studio rendered is drawn in its own clothing terms.
func TestASelfieWearsTheStudioOutfit(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, "POST", "/api/libby/outfits", `{"name":"Red Dress","prompt":"red dress, black heels"}`)
	if rec.Code != 200 {
		t.Fatalf("save outfit: %d %s", rec.Code, rec.Body)
	}
	id := strings.Split(strings.Split(rec.Body.String(), `"id":"`)[1], `"`)[0]
	prompt, tags := s.libbySelfiePrompt("libby", "at the beach", id, "", 3)
	if !strings.Contains(prompt, "red dress, black heels") || strings.Contains(prompt, "tank top") {
		t.Errorf("prompt = %s", prompt)
	}
	if len(tags) != 1 || tags[0] != "outfit:red dress" {
		t.Errorf("tags = %v", tags)
	}
	// A rename keeps the prompt the studio wrote.
	rec = do(t, s.Handler(), token, "POST", "/api/libby/outfits", `{"id":"`+id+`","name":"Red Dress II"}`)
	if rec.Code != 200 {
		t.Fatalf("rename: %d %s", rec.Code, rec.Body)
	}
	if outfit, err := s.readLibbyOutfit(id); err != nil || outfit.Prompt != "red dress, black heels" || outfit.Name != "Red Dress II" {
		t.Errorf("after rename: %+v %v", outfit, err)
	}
}

func TestSelfieSubjectBecomesTags(t *testing.T) {
	if got := strings.Join(selfieSubjectTags("you in the bath with bubbles"), "|"); got != "bath|with|bubbles" && got != "bath|bubbles" {
		t.Errorf("sentence tags = %q", got)
	}
	if got := strings.Join(selfieSubjectTags("red dress, on the balcony"), "|"); got != "red dress|balcony" {
		t.Errorf("phrase tags = %q", got)
	}
	if got := selfieSubjectTags("send me a pic"); len(got) != 0 {
		t.Errorf("asking words became tags: %v", got)
	}
}
