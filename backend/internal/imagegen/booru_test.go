package imagegen

import "testing"

func TestSuggestTagsCorrectsCommonTypo(t *testing.T) {
	suggestions, correction := SuggestTags("blonde hiar", nil, 12)
	if correction != "blonde hair" {
		t.Fatalf("correction = %q, want blonde hair (suggestions=%v)", correction, suggestions)
	}
}

func TestSuggestTagsNormalizesUnderscores(t *testing.T) {
	suggestions, _ := SuggestTags("long_ha", []string{"long_hair"}, 12)
	if len(suggestions) == 0 || suggestions[0] != "long hair" {
		t.Fatalf("suggestions = %v, want normalized long hair first", suggestions)
	}
}
