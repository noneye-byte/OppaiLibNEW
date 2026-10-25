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
	got := loraCaption("ohwx", tags, nil, "tags")
	if got != "ohwx, red scarf, smile, long hair, ^_^" {
		t.Errorf("caption %q", got)
	}
}

func TestTheTagsTheTriggerStandsForAreLeftOut(t *testing.T) {
	tags := []models.Tag{{Name: "blonde_hair", Score: 0.9}, {Name: "blue eyes", Score: 0.8}, {Name: "beach", Score: 0.7}, {Name: "OHWX", Score: 0.6}}
	got := loraCaption("ohwx", tags, loraLeaveOut([]string{"blonde hair, Blue_Eyes"}), "tags")
	if got != "ohwx, beach" {
		t.Errorf("caption %q", got)
	}
	if got := loraCaption("ohwx style", tags, nil, "trigger"); got != "ohwx style" {
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
