package models

import "testing"

// index turns the result into a name→categories lookup for order-independent
// assertions (except where order itself is under test).
func index(tags []ScrapedTag) map[string][]string {
	out := map[string][]string{}
	for _, t := range tags {
		out[t.Name] = append(out[t.Name], t.Category)
	}
	return out
}

func TestImportTagsCategorizes(t *testing.T) {
	r := &ScrapeResult{
		CategorizedTags: []ScrapedTag{
			{Name: "kantoku", Category: "artist"},
			{Name: "original", Category: "parody"},
		},
		Performers: []string{"alice"},
		Tags:       []string{"schoolgirl"},
	}
	got := index(r.ImportTags())

	for name, want := range map[string]string{
		"kantoku":    "artist",
		"original":   "parody",
		"alice":      "performer",
		"schoolgirl": "general",
	} {
		if cats := got[name]; len(cats) != 1 || cats[0] != want {
			t.Errorf("%q: category = %v, want [%s]", name, cats, want)
		}
	}
}

// A categorizing parser puts every categorized name into the flat Tags union
// too. That name must not also be filed as a general tag — otherwise importing
// an artist leaves a duplicate general tag shadowing it.
func TestImportTagsDoesNotDuplicateClaimedNamesAsGeneral(t *testing.T) {
	r := &ScrapeResult{
		CategorizedTags: []ScrapedTag{{Name: "kantoku", Category: "artist"}},
		Tags:            []string{"kantoku", "schoolgirl"},
	}
	got := index(r.ImportTags())

	if cats := got["kantoku"]; len(cats) != 1 || cats[0] != "artist" {
		t.Errorf("kantoku: category = %v, want [artist] only", cats)
	}
	if cats := got["schoolgirl"]; len(cats) != 1 || cats[0] != "general" {
		t.Errorf("schoolgirl: category = %v, want [general]", cats)
	}
}

// The same name can legitimately be two different things (a character and the
// parody it comes from), so identity is (name, category), not name.
func TestImportTagsKeepsSameNameInDifferentCategories(t *testing.T) {
	r := &ScrapeResult{CategorizedTags: []ScrapedTag{
		{Name: "fate", Category: "parody"},
		{Name: "fate", Category: "character"},
		{Name: "fate", Category: "parody"}, // exact dupe: collapses
	}}
	if cats := index(r.ImportTags())["fate"]; len(cats) != 2 {
		t.Errorf("fate: categories = %v, want parody + character", cats)
	}
}

// A parser that doesn't categorize (and tags the user typed into the import
// dialog) must keep behaving exactly as before: everything lands as general.
func TestImportTagsFlatOnlyStaysGeneral(t *testing.T) {
	r := &ScrapeResult{Tags: []string{"a", "b", "a"}}
	got := r.ImportTags()
	if len(got) != 2 {
		t.Fatalf("got %d tags, want 2 (deduped)", len(got))
	}
	for _, tag := range got {
		if tag.Category != "general" {
			t.Errorf("%q: category = %q, want general", tag.Name, tag.Category)
		}
	}
}

func TestImportTagsSkipsBlankAndDefaultsEmptyCategory(t *testing.T) {
	r := &ScrapeResult{
		CategorizedTags: []ScrapedTag{
			{Name: "  ", Category: "artist"},          // blank name: dropped
			{Name: "loose", Category: ""},             // no category: general
			{Name: "  padded  ", Category: "artist"},  // trimmed
		},
		Tags: []string{"", "   "},
	}
	got := index(r.ImportTags())
	if len(got) != 2 {
		t.Fatalf("got %v, want just loose + padded", got)
	}
	if cats := got["loose"]; len(cats) != 1 || cats[0] != "general" {
		t.Errorf("loose: category = %v, want [general]", cats)
	}
	if _, ok := got["padded"]; !ok {
		t.Errorf("padded name was not trimmed: %v", got)
	}
}
