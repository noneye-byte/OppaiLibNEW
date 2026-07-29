package ai

import "testing"

func TestAppearanceSuggestionExcludesSceneAndActions(t *testing.T) {
	for _, tag := range []string{"long hair", "blue eyes", "freckles", "school uniform"} {
		if !isAppearanceSuggestion(Suggestion{Name: tag, Category: catGeneral}) {
			t.Errorf("%q should be retained as appearance", tag)
		}
	}
	for _, tag := range []Suggestion{
		{Name: "holding sword", Category: catGeneral},
		{Name: "beach", Category: catGeneral},
		{Name: "hatsune miku", Category: catCharacter},
		{Name: "explicit", Category: catRating},
	} {
		if isAppearanceSuggestion(tag) {
			t.Errorf("%q (%s) should be excluded", tag.Name, tag.Category)
		}
	}
}
