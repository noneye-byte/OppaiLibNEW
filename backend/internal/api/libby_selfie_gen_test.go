package api

import (
	"strings"
	"testing"
)

// A picture she makes of herself is drawn in what she has on and what she is doing,
// not in the default sprite's clothes — and the state is gated the way the state is.
func TestASelfieSheMakesIsDrawnInHerCurrentState(t *testing.T) {
	s, _ := newTestServer(t)
	prompt, tags := s.libbySelfiePrompt("libby, orange hair, glasses", "on the sofa", "", "", "napping", 1)
	for _, want := range []string{"libby, orange hair, glasses", "black tank top", "sleeping", "on the sofa"} {
		if !strings.Contains(prompt, want) {
			t.Errorf("prompt lacks %q: %s", want, prompt)
		}
	}
	if len(tags) != 1 || tags[0] != "napping" {
		t.Errorf("tags = %v", tags)
	}
	// Likeness first, subject last: the picture is of her, doing the thing.
	if !strings.HasPrefix(prompt, "libby, orange hair") || !strings.HasSuffix(prompt, "on the sofa") {
		t.Errorf("order: %s", prompt)
	}

	// An intimate state at a calm heat does not reach the prompt.
	calm, calmTags := s.libbySelfiePrompt("", "on the sofa", "", "", "vibrator", 2)
	if strings.Contains(calm, "vibrator") || len(calmTags) != 0 {
		t.Errorf("calm heat drew an explicit state: %s %v", calm, calmTags)
	}
	hot, hotTags := s.libbySelfiePrompt("", "on the sofa", "", "", "vibrator", 4)
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
	prompt, tags := s.libbySelfiePrompt("libby", "at the beach", id, "", "", 3)
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

// Asked for her in a red dress, she is drawn in a red dress — not in the red dress and
// the default tank top and shorts at once, which is the blend the generator made of it.
func TestAPictureThatNamesHerClothesIsDrawnInOnlyThose(t *testing.T) {
	s, token := newTestServer(t)
	for _, subject := range []string{"in a red dress", "wearing a white hoodie", "naked on the bed", "in the bath", "in a bikini at the beach"} {
		prompt, _ := s.libbySelfiePrompt("libby", subject, "", "", "", 3)
		if strings.Contains(prompt, "tank top") || strings.Contains(prompt, "orange shorts") {
			t.Errorf("%q still carries the default outfit: %s", subject, prompt)
		}
		if !strings.HasSuffix(prompt, subject) {
			t.Errorf("%q lost the subject: %s", subject, prompt)
		}
	}
	rec := do(t, s.Handler(), token, "POST", "/api/libby/outfits", `{"name":"Maid","prompt":"maid outfit, frilled apron"}`)
	if rec.Code != 200 {
		t.Fatalf("save outfit: %d %s", rec.Code, rec.Body)
	}
	id := strings.Split(strings.Split(rec.Body.String(), `"id":"`)[1], `"`)[0]
	if prompt, tags := s.libbySelfiePrompt("libby", "in pyjamas", id, "", "", 1); strings.Contains(prompt, "apron") || len(tags) != 0 {
		t.Errorf("the worn studio outfit joined the pyjamas: %s %v", prompt, tags)
	}
	// Somewhere that says nothing about clothes still gets what she has on.
	if prompt, _ := s.libbySelfiePrompt("libby", "at the beach", "", "", "", 1); !strings.Contains(prompt, "tank top") {
		t.Errorf("a subject silent on clothes lost hers: %s", prompt)
	}
	// Words that merely contain a garment are not one.
	for _, subject := range []string{"at my address", "by the brass lamp", "with a teapot"} {
		if subjectDressesHer(subject) {
			t.Errorf("%q was read as naming clothes", subject)
		}
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
