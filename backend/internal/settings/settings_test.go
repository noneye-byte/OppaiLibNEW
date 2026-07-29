package settings

import "testing"

func TestRedactedCatalogueKeys(t *testing.T) {
	s := Settings{CivitaiAPIKey: "civ", Rule34APIKey: "r34", F95Password: "f95"}.Redacted()
	if s.CivitaiAPIKey != "" || !s.CivitaiKeySet || s.Rule34APIKey != "" || !s.Rule34APIKeySet || s.F95Password != "" || !s.F95PasswordSet {
		t.Fatalf("redacted settings = %+v", s)
	}
}
