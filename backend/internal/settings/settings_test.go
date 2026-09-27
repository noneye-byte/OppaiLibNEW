package settings

import "testing"

func TestRedactedCatalogueKeys(t *testing.T) {
	s := Settings{CivitaiAPIKey: "civ", Rule34APIKey: "r34", F95Password: "f95"}.Redacted()
	if s.CivitaiAPIKey != "" || !s.CivitaiKeySet || s.Rule34APIKey != "" || !s.Rule34APIKeySet || s.F95Password != "" || !s.F95PasswordSet {
		t.Fatalf("redacted settings = %+v", s)
	}
}

func TestZeroIsAutoAndAnyOtherContextWindowIsBounded(t *testing.T) {
	// 0 has to survive Clamp untouched: it is not "no context", it is "ask the loader".
	auto := Settings{}
	auto.Clamp()
	if auto.ChatContextTokens != 0 {
		t.Fatalf("auto became %d", auto.ChatContextTokens)
	}
	// A typo is still a statement that they wanted something other than auto, so it is
	// bounded rather than thrown away.
	tiny := Settings{ChatContextTokens: 80}
	tiny.Clamp()
	if tiny.ChatContextTokens != minContextTokens {
		t.Errorf("a window of 80 clamped to %d, want %d", tiny.ChatContextTokens, minContextTokens)
	}
	huge := Settings{ChatContextTokens: 8_000_000}
	huge.Clamp()
	if huge.ChatContextTokens != maxContextTokens {
		t.Errorf("a window of 8M clamped to %d, want %d", huge.ChatContextTokens, maxContextTokens)
	}
	// And a real one is left alone.
	real := Settings{ChatContextTokens: 32768}
	real.Clamp()
	if real.ChatContextTokens != 32768 {
		t.Errorf("32768 clamped to %d", real.ChatContextTokens)
	}
}

func TestAnUnknownModelTierReadsAsAuto(t *testing.T) {
	for given, want := range map[string]string{
		"": "", "auto": "", "nonsense": "", "Large": "large", " SMALL ": "small",
	} {
		s := Settings{ChatModelTier: given}
		s.Clamp()
		if s.ChatModelTier != want {
			t.Errorf("tier %q clamped to %q, want %q", given, s.ChatModelTier, want)
		}
	}
}

func TestHerEyesAndTheCardReadAnythingUnknownAsTheDefault(t *testing.T) {
	s := Settings{ChatVision: " ON ", GPUShare: "Swap"}
	s.Clamp()
	if s.ChatVision != "on" || s.GPUShare != "swap" {
		t.Errorf("known values clamped to %q / %q", s.ChatVision, s.GPUShare)
	}
	s = Settings{ChatVision: "maybe", GPUShare: "unload everything"}
	s.Clamp()
	if s.ChatVision != "" || s.GPUShare != "" {
		t.Errorf("unknown values clamped to %q / %q, want both default", s.ChatVision, s.GPUShare)
	}
}

// Her one LoRA from before the list existed is the first of the list after an upgrade,
// with the old "unset means on" strength kept — and once the list is saved it is the
// only thing read, so clearing it does not bring the old one back.
func TestHerOldSingleLoraBecomesTheFirstOfHerList(t *testing.T) {
	got := Merge(Settings{}, map[string]string{keyLibbyGenLora: "libby_v2", keyLibbyGenLoraWeight: "0"})
	if len(got.LibbyGenLoras) != 1 || got.LibbyGenLoras[0] != (LoraChoice{Name: "libby_v2", Weight: 1}) {
		t.Fatalf("upgraded list = %+v", got.LibbyGenLoras)
	}
	cleared := Merge(Settings{}, map[string]string{keyLibbyGenLora: "libby_v2", keyLibbyGenLoras: "[]"})
	if len(cleared.LibbyGenLoras) != 0 {
		t.Fatalf("a cleared list came back as %+v", cleared.LibbyGenLoras)
	}
	s := Settings{LibbyGenLoras: []LoraChoice{{Name: " libby ", Weight: 3}, {Name: ""}, {Name: "detail", Weight: -5}, {Name: "libby", Weight: 0.5}}}
	s.Clamp()
	want := []LoraChoice{{Name: "libby", Weight: 2}, {Name: "detail", Weight: -2}}
	if len(s.LibbyGenLoras) != 2 || s.LibbyGenLoras[0] != want[0] || s.LibbyGenLoras[1] != want[1] {
		t.Fatalf("cleaned list = %+v", s.LibbyGenLoras)
	}
	back := Merge(Settings{}, s.Map())
	if len(back.LibbyGenLoras) != 2 || back.LibbyGenLoras[1] != want[1] {
		t.Fatalf("round trip = %+v", back.LibbyGenLoras)
	}
}
