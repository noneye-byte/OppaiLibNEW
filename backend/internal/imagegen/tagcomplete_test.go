package imagegen

import (
	"strings"
	"testing"
)

func tagsOf(items []TagSuggestion) []string {
	out := make([]string, 0, len(items))
	for _, s := range items {
		out = append(out, s.Tag)
	}
	return out
}

func TestCompletionPutsTheMostUsedPrefixMatchFirst(t *testing.T) {
	got := tagsOf(CompleteTags("long h", nil, 5))
	if len(got) == 0 || got[0] != "long hair" {
		t.Fatalf("got %v", got)
	}
}

func TestCompletionFindsATagByALaterWord(t *testing.T) {
	got := tagsOf(CompleteTags("ornam", nil, 5))
	joined := "|" + strings.Join(got, "|") + "|"
	if !strings.Contains(joined, "|hair ornament|") {
		t.Fatalf("\"ornam\" did not reach hair ornament: %v", got)
	}
}

func TestCompletionReadsUnderscoresAsSpaces(t *testing.T) {
	got := tagsOf(CompleteTags("long_ha", nil, 3))
	if len(got) == 0 || got[0] != "long hair" {
		t.Fatalf("got %v", got)
	}
}

func TestCompletionFollowsAnAliasToTheTagItMeans(t *testing.T) {
	items := CompleteTags("boob", nil, 12)
	for _, s := range items {
		if s.Tag == "breasts" && s.Alias != "" {
			return
		}
	}
	t.Fatalf("alias did not lead to breasts: %+v", items)
}

func TestCompletionIncludesTheLibrarysOwnTags(t *testing.T) {
	items := CompleteTags("zzqx", []string{"zzqx_custom_tag"}, 5)
	if len(items) != 1 || items[0].Tag != "zzqx custom tag" || items[0].Category != TagLibrary {
		t.Fatalf("got %+v", items)
	}
}

func TestATypoIsCorrectedToTheTagItWasMeantToBe(t *testing.T) {
	if got := TagCorrection("blonde hiar"); got != "blonde hair" {
		t.Fatalf("correction = %q", got)
	}
	if got := TagCorrection("blonde hair"); got != "" {
		t.Fatalf("a known tag was corrected to %q", got)
	}
}
