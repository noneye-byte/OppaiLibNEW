package api

import "testing"

func TestCivitaiHashesReadEveryGeneratorsScheme(t *testing.T) {
	for in, want := range map[string]string{
		"blake3:abc123":     "ABC123", // InvokeAI
		"sha256:deadbeef":   "DEADBEEF",
		"autov2:0123456789": "0123456789", // an A1111 checkpoint before it is read in full
		"autov3:feedface":   "FEEDFACE",   // a LoRA's trainer hash
		"blake3_multi:abc":  "",           // a diffusers folder has no counterpart
		"random:whatever":   "",
		"":                  "",
	} {
		if got := civitaiHashOf(in); got != want {
			t.Errorf("civitaiHashOf(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestACatalogueFileIsFoundByAnyHashItLists(t *testing.T) {
	installed := map[string]string{"0123456789": "Stable-diffusion/dream.safetensors"}
	f := civitaiRawFile{Hashes: map[string]string{
		"BLAKE3": "AAAA", "SHA256": "0123456789FFFF", "AutoV2": "0123456789",
	}}
	key, ok := civitaiFileInstalled(f, installed)
	if !ok || key != "Stable-diffusion/dream.safetensors" {
		t.Fatalf("got %q, %v", key, ok)
	}
	if _, ok := civitaiFileInstalled(civitaiRawFile{Hashes: map[string]string{"SHA256": "BBBB"}}, installed); ok {
		t.Fatal("a file with no matching hash was found")
	}
}
