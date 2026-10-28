package db

import (
	"context"
	"path/filepath"
	"testing"
)

func TestTheOldPersonMadeCategoriesAreFoldedIntoTheFixedOnesOnOpen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "old.sqlite")
	d, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	// The 0.65 tables, as a database from then has them.
	for _, stmt := range []string{
		`CREATE TABLE lora_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at INTEGER NOT NULL)`,
		`CREATE TABLE lora_category_members (lora TEXT PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES lora_categories(id) ON DELETE CASCADE)`,
		`INSERT INTO lora_categories(id, name, created_at) VALUES (1, 'Characters', 0), (2, 'Art styles', 0), (3, 'Favourites', 0), (4, 'Sliders', 0)`,
		`INSERT INTO lora_category_members(lora, category_id) VALUES ('mika', 1), ('ink', 2), ('shiny', 3), ('age', 4)`,
	} {
		if _, err := d.sql.Exec(stmt); err != nil {
			t.Fatal(err)
		}
	}
	d.Close()

	d, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer d.Close()
	got, err := d.LoraCategories(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{"mika": LoraCharacter, "ink": LoraStyle, "shiny": LoraEtc, "age": LoraTools}
	for lora, key := range want {
		if got[lora] != key {
			t.Errorf("%s = %q, want %q", lora, got[lora], key)
		}
	}
	var n int
	_ = d.sql.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE name IN ('lora_categories', 'lora_category_members')`).Scan(&n)
	if n != 0 {
		t.Fatalf("the old tables are still there")
	}
}

func TestAnInstallFilesALoraOnlyWhenNobodyHasYet(t *testing.T) {
	d := openTestDB(t)
	ctx := context.Background()
	if err := d.SetLoraCategory(ctx, LoraPoses, []string{"mika"}); err != nil {
		t.Fatal(err)
	}
	_ = d.FileLoraIfUnsorted(ctx, "mika", LoraCharacter)
	_ = d.FileLoraIfUnsorted(ctx, "ink", LoraStyle)
	got, _ := d.LoraCategories(ctx)
	if got["mika"] != LoraPoses || got["ink"] != LoraStyle {
		t.Fatalf("got %v", got)
	}
}
