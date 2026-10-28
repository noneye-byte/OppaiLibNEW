package db

import (
	"context"
	"path/filepath"
	"testing"
)

func TestARenamedModelKeepsItsLinkDefaultsAndCategoryAndReplacesStaleRowsUnderItsNewName(t *testing.T) {
	d, err := Open(filepath.Join(t.TempDir(), "x.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer d.Close()
	ctx := context.Background()
	_ = d.PutCivitaiLink(ctx, CivitaiLink{ModelKey: "Lora/old.safetensors", ModelID: 1})
	// A row left by a file that once had the new name, deleted outside the studio.
	_ = d.PutCivitaiLink(ctx, CivitaiLink{ModelKey: "Lora/New.safetensors", ModelID: 9})
	_ = d.SetLoraCategory(ctx, LoraStyle, []string{"old"})
	_ = d.SetLoraCategory(ctx, LoraPoses, []string{"Lora/old.safetensors"})

	if err := d.RenameModel(ctx, "Lora/old.safetensors", "Lora/New.safetensors", "old", "New"); err != nil {
		t.Fatal(err)
	}
	links, _ := d.CivitaiLinks(ctx)
	if links["Lora/New.safetensors"].ModelID != 1 || len(links) != 1 {
		t.Errorf("links = %+v", links)
	}
	cats, _ := d.LoraCategories(ctx)
	if cats["New"] != LoraStyle || cats["Lora/New.safetensors"] != LoraPoses || cats["old"] != "" {
		t.Errorf("categories = %v", cats)
	}
}
