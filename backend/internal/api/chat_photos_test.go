package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func libbyGallery() chatWorkspace {
	return chatWorkspace{Images: []chatImage{
		{ID: "a", CharacterID: "libby", Tags: []string{"bedroom", "lingerie", "lying down"}},
		{ID: "b", CharacterID: "libby", Tags: []string{"bedroom", "lingerie", "mirror"}},
		{ID: "c", CharacterID: "libby", Tags: []string{"beach", "swimsuit"}},
	}}
}

// The repeat this exists to stop: she asks for "bedroom lingerie" turn after turn,
// and without a memory of what she has already sent the same file wins every time.
func TestSentPicturesAreNotOfferedAgain(t *testing.T) {
	ws := libbyGallery()
	first := requestedChatImage(ws, "libby", "bedroom lingerie", "", nil)
	if first == "" {
		t.Fatal("first request resolved to nothing")
	}
	sent, last := recentlySentPhotos([]string{first})
	if last != first {
		t.Fatalf("last sent = %q, want %q", last, first)
	}
	second := requestedChatImage(ws, "libby", "bedroom lingerie", "", sent)
	if second == first {
		t.Fatalf("the same picture came back: %q", second)
	}
	if second == "" {
		t.Fatal("a second bedroom picture exists and should have been offered")
	}
	// Both bedroom pictures spent: rather than repeat, she is left with nothing to
	// send, which is the correct outcome — the fallback is silence, not a rerun.
	sent, _ = recentlySentPhotos([]string{first, second})
	if third := requestedChatImage(ws, "libby", "bedroom lingerie", "", sent); third != "" {
		t.Fatalf("exhausted gallery still produced %q", third)
	}
}

// An unrequested picture needs real overlap — three independent words, not one or two.
// One or two shared words is the whole reason a gallery's best-scoring image used to
// ride along with nearly every reply.
func TestUnpromptedPictureNeedsRealOverlap(t *testing.T) {
	ws := libbyGallery()
	if got := matchingChatImage(ws, "libby", "the bedroom was cold", "", nil); got != "" {
		t.Fatalf("one incidental word attached %q", got)
	}
	// Two words used to be enough, and fired far too often; now it is not.
	if got := matchingChatImage(ws, "libby", "you in that lingerie, in the bedroom", "", nil); got != "" {
		t.Fatalf("two incidental words attached %q", got)
	}
	if got := matchingChatImage(ws, "libby", "you in that lingerie in the bedroom, lying down", "", nil); got == "" {
		t.Fatal("three matching words should still attach a picture")
	}
}

// Asking for one relaxes the rule — except for the picture already on screen.
func TestAskingForAPictureIsRecognised(t *testing.T) {
	for _, asked := range []string{"send me a pic", "show me you", "another one?", "got any photos"} {
		if !userAskedForPhoto(asked) {
			t.Fatalf("%q was not read as asking for a picture", asked)
		}
	}
	for _, idle := range []string{"how was your day", "I finished that comic"} {
		if userAskedForPhoto(idle) {
			t.Fatalf("%q was read as asking for a picture", idle)
		}
	}
}

// The catalogue keeps spent pictures visible but marked. Hiding them would leave a
// model that remembers sending one unable to see it, which is how invented pictures
// get promised.
func TestPhotoCatalogueMarksWhatWasAlreadySent(t *testing.T) {
	catalogue := photoCatalogue(libbyGallery(), "libby", map[string]bool{"a": true})
	if !strings.Contains(catalogue, "[already sent]") {
		t.Fatalf("spent picture not marked: %s", catalogue)
	}
	if !strings.Contains(catalogue, "unless the user asks") {
		t.Fatalf("catalogue never states the rule: %s", catalogue)
	}
	if strings.Contains(photoCatalogue(libbyGallery(), "libby", nil), "[already sent]") {
		t.Fatal("a fresh conversation marked a picture as sent")
	}
}

// She knows her own face. Two of her features in one picture is a likeness; one is
// a coincidence, and telling her a stranger's photo is a selfie would be worse than
// saying nothing.
func TestSheRecognisesAPictureOfHerself(t *testing.T) {
	libby := defaultLibbyCard()
	self := photoDirective([]string{"1girl", "long orange hair", "red eyes", "smiling"}, libby)
	if !strings.Contains(self, "picture of you") {
		t.Fatalf("her own likeness was not recognised: %s", self)
	}

	stranger := photoDirective([]string{"1girl", "blonde hair", "blue eyes"}, libby)
	if strings.Contains(stranger, "picture of you") {
		t.Fatalf("someone else's photo was claimed as hers: %s", stranger)
	}
	// One feature is not enough — plenty of pictures have red eyes and nothing else
	// of hers.
	coincidence := photoDirective([]string{"1girl", "red eyes", "blonde hair"}, libby)
	if strings.Contains(coincidence, "picture of you") {
		t.Fatalf("a single shared feature was treated as a likeness: %s", coincidence)
	}
	// A card with no appearance written in cannot recognise anything, and must not
	// guess.
	if strings.Contains(photoDirective([]string{"long orange hair", "red eyes"}, chatCharacter{ID: "x"}), "picture of you") {
		t.Fatal("a character with no appearance claimed a likeness")
	}
}

// The colour is the identifying half: "long hair" alone must not satisfy "long
// orange hair", or every dark-haired photo becomes a selfie.
func TestSelfPortraitMatchNeedsTheWholeFeature(t *testing.T) {
	hits := selfPortraitMatch([]string{"long hair", "brown eyes"}, "long orange hair, red eyes")
	if len(hits) != 0 {
		t.Fatalf("partial feature matched: %v", hits)
	}
	hits = selfPortraitMatch([]string{"long_orange_hair", "red_eyes"}, "long orange hair, red eyes")
	if len(hits) != 2 {
		t.Fatalf("underscored scanner tags did not match: %v", hits)
	}
}

// What she has on has to track the sprite the user is looking at, which undresses
// as the meter climbs. A character describing her hoodie next to a picture of her
// in nothing is worse than saying nothing at all.
func TestSheKnowsWhatSheIsWearing(t *testing.T) {
	s, _ := newTestServer(t)
	libby := defaultLibbyCard()

	calm := s.wardrobeDirective(libby, 1, "")
	if !strings.Contains(calm, "tank top") || !strings.Contains(calm, "sweatpants") {
		t.Fatalf("tier 1 wardrobe = %q", calm)
	}
	if peak := s.wardrobeDirective(libby, 5, ""); !strings.Contains(peak, "nothing at all") {
		t.Fatalf("tier 5 wardrobe = %q", peak)
	}
	// Every tier the artwork has must describe something; a gap here is a tier where
	// she would be told nothing while the user can plainly see her.
	for tier := 1; tier <= 5; tier++ {
		if strings.TrimSpace(s.wardrobeDirective(libby, tier, "")) == "" {
			t.Fatalf("tier %d has no wardrobe", tier)
		}
	}
	// Somebody else's character has no bundled sprite, so inventing clothes for them
	// would be describing art that does not exist.
	if got := s.wardrobeDirective(chatCharacter{ID: strings.Repeat("a", 32)}, 1, ""); got != "" {
		t.Fatalf("an imported character was dressed: %q", got)
	}
}

// A user-made outfit replaces the sprite, so the tier table no longer describes
// what is on screen — the outfit's own name is all that is known, and the server
// resolves it from the id the client holds.
func TestAWornOutfitReplacesTheTierWardrobe(t *testing.T) {
	s, token := newTestServer(t)
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/outfits", `{"name":"Nurse"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("create outfit: %d %s", rec.Code, rec.Body)
	}
	var outfit struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &outfit); err != nil || outfit.ID == "" {
		t.Fatalf("outfit response: %v %s", err, rec.Body)
	}

	worn := s.wardrobeDirective(defaultLibbyCard(), 1, outfit.ID)
	if !strings.Contains(worn, "Nurse") {
		t.Fatalf("worn outfit not named: %q", worn)
	}
	if strings.Contains(worn, "sweatpants") {
		t.Fatalf("worn outfit still described the default wardrobe: %q", worn)
	}
	// An outfit that has been deleted since it was selected falls back to the
	// bundled wardrobe rather than naming something that no longer exists.
	missing := s.wardrobeDirective(defaultLibbyCard(), 1, strings.Repeat("b", 32))
	if !strings.Contains(missing, "tank top") {
		t.Fatalf("a stale outfit id did not fall back: %q", missing)
	}
}

// The built-in card carries what she looks like and what she is into, and a
// workspace saved before those fields existed picks them up without losing edits.
func TestLibbyCardBackfillsNewFieldsOnly(t *testing.T) {
	shipped := defaultLibbyCard()
	if !strings.Contains(shipped.Appearance, "orange hair") || !strings.Contains(shipped.Appearance, "red eyes") {
		t.Fatalf("built-in card does not describe her: %q", shipped.Appearance)
	}
	if strings.TrimSpace(shipped.Kinks) == "" {
		t.Fatal("built-in card has no kinks")
	}

	old := chatCharacter{ID: "libby", Name: "Libby", Personality: "mine, edited"}
	backfillLibbyCard(&old)
	if old.Appearance != shipped.Appearance || old.Kinks != shipped.Kinks {
		t.Fatal("new fields were not filled in")
	}
	if old.Personality != "mine, edited" {
		t.Fatalf("an edited field was overwritten: %q", old.Personality)
	}
	mine := chatCharacter{ID: "libby", Appearance: "silver hair", Kinks: "mine"}
	backfillLibbyCard(&mine)
	if mine.Appearance != "silver hair" || mine.Kinks != "mine" {
		t.Fatalf("a written field was overwritten: %+v", mine)
	}
}
