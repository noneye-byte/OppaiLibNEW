package db

import (
	"context"
	"path/filepath"
	"testing"
)

func TestBriasSwitchBecomesComfyUIsCutAndItsKeyIsNotKept(t *testing.T) {
	path := filepath.Join(t.TempDir(), "old.sqlite")
	d, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	// What 0.92.0 saved with Bria on.
	if err := d.PutSettings(context.Background(), map[string]string{
		"clip.cut_bria": "true", "clip.comfy_org_api_key": "comfyui-secret", "clip.url": "http://comfy:8188",
	}); err != nil {
		t.Fatal(err)
	}
	d.Close()

	d, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer d.Close()
	got, err := d.AllSettings(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if got["clip.cut_comfy"] != "true" || got["clip.url"] != "http://comfy:8188" {
		t.Fatalf("settings = %v", got)
	}
	if _, kept := got["clip.comfy_org_api_key"]; kept {
		t.Fatal("the Comfy.org key was kept")
	}
	if _, kept := got["clip.cut_bria"]; kept {
		t.Fatal("Bria's switch was kept beside the new one")
	}
}
