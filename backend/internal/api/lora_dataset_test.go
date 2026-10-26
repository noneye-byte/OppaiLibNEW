package api

import (
	"reflect"
	"testing"

	"github.com/youruser/oppailib/internal/models"
)

func TestACaptionIsTheTriggerThenThePicturesStrongestTags(t *testing.T) {
	tags := []models.Tag{
		{Name: "rating:explicit", Category: "rating", Score: 1},
		{Name: "long_hair", Category: "general", Source: "ai", Score: 0.6},
		{Name: "smile", Category: "general", Source: "ai", Score: 0.9},
		{Name: "red_scarf", Category: "general", Source: "manual"},
		{Name: "portrait", Category: "meta", Score: 1},
		{Name: "^_^", Category: "general", Source: "ai", Score: 0.5},
	}
	got := loraCaption("ohwx", tags, nil, nil, "tags")
	if got != "ohwx, red scarf, smile, long hair, ^_^" {
		t.Errorf("caption %q", got)
	}
}

func TestTheTagsTheTriggerStandsForAreLeftOut(t *testing.T) {
	tags := []models.Tag{{Name: "blonde_hair", Score: 0.9}, {Name: "blue eyes", Score: 0.8}, {Name: "beach", Score: 0.7}, {Name: "OHWX", Score: 0.6}}
	got := loraCaption("ohwx", tags, loraLeaveOut([]string{"blonde hair, Blue_Eyes"}), nil, "tags")
	if got != "ohwx, beach" {
		t.Errorf("caption %q", got)
	}
	if got := loraCaption("ohwx style", tags, nil, nil, "trigger"); got != "ohwx style" {
		t.Errorf("trigger-only caption %q", got)
	}
}

func TestTheCommonTagsAreCountedOncePerPicture(t *testing.T) {
	sets := [][]models.Tag{
		{{Name: "smile"}, {Name: "smile"}, {Name: "long_hair"}},
		{{Name: "long hair"}, {Name: "rating:safe", Category: "rating"}},
		{{Name: "beach"}},
	}
	want := []loraTagCount{{"long hair", 2}, {"beach", 1}, {"smile", 1}}
	if got := loraCommonTags(sets, 10); !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v", got)
	}
}

func TestALorasNameIsSafeInAFileAndAPrompt(t *testing.T) {
	cases := map[string]string{"Ink Style v2": "Ink_Style_v2", "../../evil": "evil", "  ": "", "a:b<c>": "a_b_c"}
	for in, want := range cases {
		if got := loraFileName(in); got != want {
			t.Errorf("%q → %q, want %q", in, got, want)
		}
	}
}

func TestAnEpochIsAboutTwoHundredStepsWhateverTheSetsSize(t *testing.T) {
	for images, want := range map[int]int{1: 40, 10: 20, 20: 10, 40: 5, 300: 1} {
		if got := loraRepeats(images); got != want {
			t.Errorf("%d pictures: %d repeats, want %d", images, got, want)
		}
	}
}

func TestOnlyStillsTheTrainerReadsAreSent(t *testing.T) {
	png := []byte("\x89PNG\r\n\x1a\n0000")
	gif := []byte("GIF89a000000")
	if loraPictureExt(png) != ".png" || loraPictureExt(gif) != "" {
		t.Errorf("png %q gif %q", loraPictureExt(png), loraPictureExt(gif))
	}
}

// glassesSet is twenty pictures, fourteen of them with glasses.
func glassesSet() [][]models.Tag {
	sets := make([][]models.Tag, 20)
	for i := range sets {
		sets[i] = []models.Tag{{Name: "1girl", Score: 0.9}}
		if i < 14 {
			sets[i] = append(sets[i], models.Tag{Name: "glasses", Score: 0.8})
		}
	}
	return sets
}

func TestAPlayedDownTagIsNamedInEveryCaptionThatHasIt(t *testing.T) {
	tags := []models.Tag{{Name: "1girl", Score: 0.9}, {Name: "smile", Score: 0.7}, {Name: "glasses", Score: 0.4}}
	named := loraPlayDownNamed([]loraPlayDown{{Tag: "Glasses", Keep: 0.5}})
	// Straight after the trigger, and even when it was struck or the captions are the
	// trigger alone: an unnamed trait is learnt as the LoRA.
	if got := loraCaption("ohwx", tags, loraLeaveOut([]string{"glasses"}), named, "tags"); got != "ohwx, glasses, 1girl, smile" {
		t.Fatalf("caption = %q", got)
	}
	if got := loraCaption("ohwx", tags, nil, named, "trigger"); got != "ohwx, glasses" {
		t.Fatalf("trigger-only caption = %q", got)
	}
	if got := loraCaption("ohwx", tags[:2], nil, named, "trigger"); got != "ohwx" {
		t.Fatalf("a picture without the tag = %q", got)
	}
}

func TestPlayingATagDownShowsItsPicturesLessAndTheRestMore(t *testing.T) {
	sets := glassesSet()
	playDown := []loraPlayDown{{Tag: "glasses", Keep: 0.5}}
	repeats := loraPlayDownRepeats(sets, playDown, 10)
	if repeats[0] >= 10 || repeats[19] <= 10 {
		t.Fatalf("repeats = %v; glasses pictures less than 10, the rest more", repeats)
	}
	total := 0
	for _, r := range repeats {
		total += r
	}
	// The epoch is about as long as it was: twenty pictures at ten.
	if total < 180 || total > 220 {
		t.Fatalf("an epoch is %d steps, want about 200", total)
	}
	sh := loraPlayDownShares(sets, playDown, repeats)[0]
	if sh.Pictures != 14 || sh.Before != 0.7 || sh.After < 0.3 || sh.After > 0.4 {
		t.Fatalf("share = %+v; 70%% of pictures should train as about 35%%", sh)
	}
}

func TestATagOnEveryPictureCannotBeWeighedAgainstAnything(t *testing.T) {
	sets := glassesSet()
	for _, r := range loraPlayDownRepeats(sets, []loraPlayDown{{Tag: "1girl", Keep: 0.3}}, 10) {
		if r != 10 {
			t.Fatal("a tag on every picture changed the repeats")
		}
	}
	for _, r := range loraPlayDownRepeats(sets, []loraPlayDown{{Tag: "glasses", Keep: 1}}, 10) {
		if r != 10 {
			t.Fatal("keeping all of a tag changed the repeats")
		}
	}
	// A large set at one repeat still gets its rebalancing, never a zero.
	big := append(append([][]models.Tag{}, sets...), sets...)
	big = append(big, big...)
	for _, r := range loraPlayDownRepeats(big, []loraPlayDown{{Tag: "glasses", Keep: 0.2}}, 1) {
		if r < 1 {
			t.Fatal("a picture was given no repeats")
		}
	}
}
