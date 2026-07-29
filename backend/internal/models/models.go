// Package models holds shared domain types serialized over the API.
package models

import "strings"

type MediaKind string

const (
	KindVideo MediaKind = "video"
	KindGIF   MediaKind = "gif"
	KindImage MediaKind = "image"
	KindComic MediaKind = "comic"
	KindGame  MediaKind = "game"
)

// Media is the API-facing view. Encrypted DB fields (title, notes, source) are
// decrypted before serialization by the handler layer.
type Media struct {
	ID        int64     `json:"id"`
	Kind      MediaKind `json:"kind"`
	SHA256    string    `json:"sha256"`
	Size      int64     `json:"size"`
	Title     string    `json:"title"`
	Notes     string    `json:"notes,omitempty"`
	Source    string    `json:"source,omitempty"`
	Rating    int       `json:"rating"`
	Favorite  bool      `json:"favorite"`
	Duration  float64   `json:"duration,omitempty"`
	Width     int       `json:"width,omitempty"`
	Height    int       `json:"height,omitempty"`
	PageCount int       `json:"pageCount,omitempty"`
	HasThumb  bool      `json:"hasThumb,omitempty"`
	Download  string    `json:"download,omitempty"` // external download URL (games)
	Gallery   []string  `json:"gallery,omitempty"`  // screenshot URLs (games)
	Tags      []Tag     `json:"tags,omitempty"`
	CreatedAt int64     `json:"createdAt"`
	UpdatedAt int64     `json:"updatedAt"`
}

type Tag struct {
	ID       int64   `json:"id"`
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Source   string  `json:"source,omitempty"`
	Score    float64 `json:"score,omitempty"`
	// Moments are the timestamps (seconds) at which the AI saw this tag in a
	// time-based item, ascending. Only populated for single-item fetches of
	// videos; list responses omit them.
	Moments []float64 `json:"moments,omitempty"`
}

type User struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"isAdmin"`
}

type Collection struct {
	ID    int64   `json:"id"`
	Name  string  `json:"name"`
	Items []int64 `json:"items,omitempty"`
}

// ScrapedTag is a tag a parser could attribute to a specific taxonomy — an
// artist, a character, a parody — rather than dumping into the general pile.
// Category matches the tags.category column and is open-ended: a YAML parser
// names its own categories, and unknown ones are created on demand.
type ScrapedTag struct {
	Name     string `json:"name"`
	Category string `json:"category"`
}

// ScrapeResult is what a site parser returns for a fetched URL.
type ScrapeResult struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Performers  []string `json:"performers"`
	MediaURLs   []string `json:"mediaUrls"`
	SourceURL   string   `json:"sourceUrl"`
	Kind        string   `json:"kind"`
	// CategorizedTags is the structured view of the tags a parser recognized:
	// artist, character, parody, language, … Parsers that categorize populate
	// both this and Tags — Tags stays the flat union so existing clients (which
	// type it as a plain string list) keep rendering. The importer prefers this.
	CategorizedTags []ScrapedTag `json:"categorizedTags,omitempty"`
	// Game-oriented fields (populated by the itch.io / generic parsers). Cover is
	// the preferred single image for a game entry; Screenshots is a gallery;
	// DownloadURL is where to actually get the game.
	Cover       string   `json:"cover,omitempty"`
	Screenshots []string `json:"screenshots"`
	DownloadURL string   `json:"downloadUrl,omitempty"`
}

// ImportTags flattens everything the scrape learned into the exact set of
// (name, category) rows to persist, deduped.
//
// The three sources overlap by design: CategorizedTags carries the structure,
// Tags is the flat union a categorizing parser also fills (plus whatever the
// user typed into the import dialog), and Performers is its own category. So a
// plain name is only filed as "general" when no category claimed it — otherwise
// importing an artist would also leave a stray general tag with the same name.
func (r *ScrapeResult) ImportTags() []ScrapedTag {
	out := make([]ScrapedTag, 0, len(r.CategorizedTags)+len(r.Tags)+len(r.Performers))
	// seen holds the exact (name, category) rows already emitted; claimed holds
	// the names that some non-general category has already taken.
	seen := map[ScrapedTag]bool{}
	claimed := map[string]bool{}

	add := func(name, category string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		t := ScrapedTag{Name: name, Category: category}
		if seen[t] {
			return
		}
		seen[t] = true
		out = append(out, t)
		if category != "general" {
			claimed[name] = true
		}
	}

	for _, t := range r.CategorizedTags {
		category := strings.TrimSpace(t.Category)
		if category == "" {
			category = "general"
		}
		add(t.Name, category)
	}
	for _, p := range r.Performers {
		add(p, "performer")
	}
	for _, name := range r.Tags {
		if claimed[strings.TrimSpace(name)] {
			continue
		}
		add(name, "general")
	}
	return out
}

// EnsureSlices replaces nil slices with empty ones so JSON encodes [] rather
// than null. The web/Android clients type these fields as arrays and call
// .length/.map on them; a null there crashes the client's render.
func (r *ScrapeResult) EnsureSlices() {
	if r.Tags == nil {
		r.Tags = []string{}
	}
	if r.Performers == nil {
		r.Performers = []string{}
	}
	if r.MediaURLs == nil {
		r.MediaURLs = []string{}
	}
	if r.Screenshots == nil {
		r.Screenshots = []string{}
	}
}
