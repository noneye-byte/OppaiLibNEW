package scraper

import (
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

const galleryHTML = `
<html><body>
  <h1 class="title">Test Gallery</h1>
  <div id="tags">
    <a href="/artist/kantoku/">kantoku</a>
    <a href="/parody/original/">original</a>
    <a href="/character/alice/">alice</a>
    <a href="/tag/schoolgirl/">schoolgirl</a>
    <a href="/tag/glasses/">glasses</a>
  </div>
  <div id="pages"><img src="/p/1.jpg"><img src="/p/2.jpg"></div>
</body></html>`

// loadSpec writes one parser YAML into a temp dir and loads it, exercising the
// same LoadDir path the server uses at startup.
func loadSpec(t *testing.T, yaml string) Parser {
	t.Helper()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "site.yaml"), []byte(yaml), 0o600); err != nil {
		t.Fatal(err)
	}
	parsers, err := LoadDir(dir)
	if err != nil {
		t.Fatalf("LoadDir: %v", err)
	}
	if len(parsers) != 1 {
		t.Fatalf("loaded %d parsers, want 1", len(parsers))
	}
	return parsers[0]
}

func parseGallery(t *testing.T, p Parser) map[string]string {
	t.Helper()
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(galleryHTML))
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse("https://example.com/g/1")
	res, err := p.Parse(doc, u)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	got := map[string]string{}
	for _, tag := range res.CategorizedTags {
		got[tag.Name] = tag.Category
	}
	return got
}

func TestYAMLTagGroupsCategorize(t *testing.T) {
	p := loadSpec(t, `
name: gallery
match_hosts: [example.com]
kind: comic
selectors:
  title: {selector: "h1.title"}
  media: {selector: "#pages img", attr: src}
  tags: {selector: "#tags a[href^='/tag/']"}
  tag_groups:
    artist:    {selector: "#tags a[href^='/artist/']"}
    parody:    {selector: "#tags a[href^='/parody/']"}
    character: {selector: "#tags a[href^='/character/']"}
`)
	got := parseGallery(t, p)

	for name, want := range map[string]string{
		"kantoku":  "artist",
		"original": "parody",
		"alice":    "character",
	} {
		if got[name] != want {
			t.Errorf("%q: category = %q, want %q", name, got[name], want)
		}
	}
	// Plain content tags stay out of the categorized set — they ride in via the
	// flat Tags list and are imported as general.
	if _, ok := got["schoolgirl"]; ok {
		t.Errorf("schoolgirl should not be categorized, got %q", got["schoolgirl"])
	}
}

// Every categorized tag must also appear in the flat Tags union, so clients that
// only understand a string list still show artists and characters.
func TestYAMLTagGroupsJoinFlatTags(t *testing.T) {
	p := loadSpec(t, `
name: gallery
match_hosts: [example.com]
selectors:
  tags: {selector: "#tags a[href^='/tag/']"}
  tag_groups:
    artist: {selector: "#tags a[href^='/artist/']"}
`)
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(galleryHTML))
	u, _ := url.Parse("https://example.com/g/1")
	res, _ := p.Parse(doc, u)

	var hasArtist, hasPlain bool
	for _, tag := range res.Tags {
		switch tag {
		case "kantoku":
			hasArtist = true
		case "schoolgirl":
			hasPlain = true
		}
	}
	if !hasArtist || !hasPlain {
		t.Errorf("flat Tags = %v, want it to include both kantoku and schoolgirl", res.Tags)
	}

	// …and the importer must still file the artist as an artist, not twice.
	got := map[string][]string{}
	for _, tag := range res.ImportTags() {
		got[tag.Name] = append(got[tag.Name], tag.Category)
	}
	if cats := got["kantoku"]; len(cats) != 1 || cats[0] != "artist" {
		t.Errorf("kantoku: %v, want [artist] only", cats)
	}
}

// A spec with no tag_groups must behave exactly as it did before the feature.
func TestYAMLWithoutTagGroupsIsUnchanged(t *testing.T) {
	p := loadSpec(t, `
name: gallery
match_hosts: [example.com]
selectors:
  tags: {selector: "#tags a[href^='/tag/']"}
`)
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(galleryHTML))
	u, _ := url.Parse("https://example.com/g/1")
	res, _ := p.Parse(doc, u)

	if len(res.CategorizedTags) != 0 {
		t.Errorf("CategorizedTags = %v, want none", res.CategorizedTags)
	}
	if len(res.Tags) != 2 {
		t.Errorf("Tags = %v, want [schoolgirl glasses]", res.Tags)
	}
}
