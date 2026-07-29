package db

import (
	"context"
	"path/filepath"
	"testing"
)

func openTestDB(t *testing.T) *DB {
	t.Helper()
	d, err := Open(filepath.Join(t.TempDir(), "test.sqlite"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { d.Close() })
	return d
}

func insertMedia(t *testing.T, d *DB, sha string) int64 {
	t.Helper()
	id, _, err := d.InsertMedia(context.Background(), &MediaRow{
		Kind: "video", SHA256: sha, Size: 1, BlobPath: "a/b/" + sha,
	})
	if err != nil {
		t.Fatalf("insert media: %v", err)
	}
	return id
}

func TestTagMomentsRoundTrip(t *testing.T) {
	ctx := context.Background()
	d := openTestDB(t)
	id := insertMedia(t, d, "sha-1")

	if err := d.AddTag(ctx, id, "cat", "general", "ai", 0.9); err != nil {
		t.Fatalf("add tag: %v", err)
	}
	if err := d.SetTagMoments(ctx, id, "cat", "general",
		[]Moment{{At: 30, Score: 0.5}, {At: 10, Score: 0.9}}); err != nil {
		t.Fatalf("set moments: %v", err)
	}
	// A tag with no moments (a manual one) must still come back, just bare.
	if err := d.AddTag(ctx, id, "favourite", "general", "manual", 0); err != nil {
		t.Fatalf("add tag: %v", err)
	}

	tags, err := d.TagsForMedia(ctx, id)
	if err != nil {
		t.Fatalf("tags: %v", err)
	}
	if len(tags) != 2 {
		t.Fatalf("got %d tags, want 2: %+v", len(tags), tags)
	}
	byName := map[string][]float64{}
	for _, tg := range tags {
		byName[tg.Name] = tg.Moments
	}
	// Stored out of order; must come back ascending — the viewer draws them as-is.
	if got := byName["cat"]; len(got) != 2 || got[0] != 10 || got[1] != 30 {
		t.Errorf("cat moments = %v, want [10 30]", got)
	}
	if got := byName["favourite"]; len(got) != 0 {
		t.Errorf("manual tag got moments: %v", got)
	}
}

// Re-tagging must not leave offsets from the previous run behind.
func TestClearTagMoments(t *testing.T) {
	ctx := context.Background()
	d := openTestDB(t)
	id := insertMedia(t, d, "sha-2")

	if err := d.AddTag(ctx, id, "cat", "general", "ai", 0.9); err != nil {
		t.Fatalf("add tag: %v", err)
	}
	if err := d.SetTagMoments(ctx, id, "cat", "general", []Moment{{At: 5, Score: 1}}); err != nil {
		t.Fatalf("set moments: %v", err)
	}
	if err := d.ClearTagMoments(ctx, id); err != nil {
		t.Fatalf("clear moments: %v", err)
	}
	tags, err := d.TagsForMedia(ctx, id)
	if err != nil {
		t.Fatalf("tags: %v", err)
	}
	if len(tags) != 1 || len(tags[0].Moments) != 0 {
		t.Errorf("moments survived a clear: %+v", tags)
	}
}

// Removing a tag must take its timeline with it, or a later tag reusing that id
// would inherit offsets that were never about it.
func TestRemoveTagDropsMoments(t *testing.T) {
	ctx := context.Background()
	d := openTestDB(t)
	id := insertMedia(t, d, "sha-3")

	if err := d.AddTag(ctx, id, "cat", "general", "ai", 0.9); err != nil {
		t.Fatalf("add tag: %v", err)
	}
	if err := d.SetTagMoments(ctx, id, "cat", "general", []Moment{{At: 5, Score: 1}}); err != nil {
		t.Fatalf("set moments: %v", err)
	}
	if err := d.RemoveTag(ctx, id, "cat"); err != nil {
		t.Fatalf("remove tag: %v", err)
	}

	moments, err := d.momentsForMedia(ctx, id)
	if err != nil {
		t.Fatalf("moments: %v", err)
	}
	if len(moments) != 0 {
		t.Errorf("removing a tag left its moments behind: %v", moments)
	}
}

// Moments are per-media: two items sharing a tag must not share its timeline.
func TestMomentsAreScopedToMedia(t *testing.T) {
	ctx := context.Background()
	d := openTestDB(t)
	a := insertMedia(t, d, "sha-a")
	b := insertMedia(t, d, "sha-b")

	for _, id := range []int64{a, b} {
		if err := d.AddTag(ctx, id, "cat", "general", "ai", 0.9); err != nil {
			t.Fatalf("add tag: %v", err)
		}
	}
	if err := d.SetTagMoments(ctx, a, "cat", "general", []Moment{{At: 12, Score: 1}}); err != nil {
		t.Fatalf("set moments: %v", err)
	}

	tagsA, _ := d.TagsForMedia(ctx, a)
	tagsB, _ := d.TagsForMedia(ctx, b)
	if len(tagsA[0].Moments) != 1 {
		t.Errorf("media a lost its moments: %+v", tagsA[0])
	}
	if len(tagsB[0].Moments) != 0 {
		t.Errorf("media b inherited media a's moments: %+v", tagsB[0])
	}
}

func TestTagsForMediaBatch(t *testing.T) {
	ctx := context.Background()
	d := openTestDB(t)
	a := insertMedia(t, d, "sha-x")
	b := insertMedia(t, d, "sha-y")
	c := insertMedia(t, d, "sha-z") // untagged

	if err := d.AddTag(ctx, a, "cat", "general", "ai", 0.9); err != nil {
		t.Fatalf("add tag: %v", err)
	}
	if err := d.AddTag(ctx, b, "dog", "general", "manual", 0); err != nil {
		t.Fatalf("add tag: %v", err)
	}
	if err := d.AddTag(ctx, b, "cat", "general", "scrape", 0); err != nil {
		t.Fatalf("add tag: %v", err)
	}

	got, err := d.TagsForMediaBatch(ctx, []int64{a, b, c})
	if err != nil {
		t.Fatalf("batch: %v", err)
	}
	if len(got[a]) != 1 || got[a][0].Name != "cat" {
		t.Errorf("media a tags = %+v", got[a])
	}
	if len(got[b]) != 2 {
		t.Errorf("media b tags = %+v, want 2", got[b])
	}
	if len(got[c]) != 0 {
		t.Errorf("untagged media got tags: %+v", got[c])
	}

	// An empty id list must not build a broken `IN ()` query.
	empty, err := d.TagsForMediaBatch(ctx, nil)
	if err != nil {
		t.Fatalf("batch(nil): %v", err)
	}
	if len(empty) != 0 {
		t.Errorf("batch(nil) = %v", empty)
	}
}

func TestMediaMissingAITagsIgnoresManualAndNonTaggableItems(t *testing.T) {
	ctx := context.Background()
	d := openTestDB(t)
	wanted := insertMedia(t, d, "sha-missing")
	manual := insertMedia(t, d, "sha-manual")
	complete := insertMedia(t, d, "sha-complete")
	comic, _, err := d.InsertMedia(ctx, &MediaRow{Kind: "comic", SHA256: "sha-comic", Size: 1, BlobPath: "comic.cbz"})
	if err != nil {
		t.Fatalf("insert comic: %v", err)
	}
	if err := d.AddTag(ctx, manual, "favourite", "general", "manual", 0); err != nil {
		t.Fatalf("add manual tag: %v", err)
	}
	if err := d.AddTag(ctx, complete, "portrait", "meta", "ai", 1); err != nil {
		t.Fatalf("add ai tag: %v", err)
	}

	rows, err := d.MediaMissingAITags(ctx, 20)
	if err != nil {
		t.Fatalf("missing AI tags: %v", err)
	}
	got := map[int64]bool{}
	for _, row := range rows {
		got[row.ID] = true
	}
	if !got[wanted] || !got[manual] {
		t.Errorf("taggable items without AI tags missing: %+v", got)
	}
	if got[complete] || got[comic] {
		t.Errorf("completed/non-taggable items returned: %+v", got)
	}
}
