package imagegen

import (
	"math/rand"
	"strings"
	"testing"
)

func testLookup(lists map[string][]string) WildcardLookup {
	return func(name string) []string { return lists[strings.ToLower(name)] }
}

func TestExpandWildcardsPicksFromList(t *testing.T) {
	lookup := testLookup(map[string][]string{"hair": {"red hair", "blue hair"}})
	rng := rand.New(rand.NewSource(1))
	seen := map[string]bool{}
	for i := 0; i < 40; i++ {
		out, changed := ExpandWildcards("1girl, __hair__, smile", lookup, rng)
		if !changed {
			t.Fatal("expected an expansion")
		}
		if out != "1girl, red hair, smile" && out != "1girl, blue hair, smile" {
			t.Fatalf("unexpected expansion %q", out)
		}
		seen[out] = true
	}
	if len(seen) != 2 {
		t.Fatalf("expected both lines to be drawn over 40 rolls, saw %v", seen)
	}
}

func TestExpandWildcardsLeavesUnknownNames(t *testing.T) {
	out, changed := ExpandWildcards("a __missing__ b", testLookup(nil), nil)
	if changed || out != "a __missing__ b" {
		t.Fatalf("unknown wildcard should be left alone, got %q (changed=%v)", out, changed)
	}
}

func TestExpandWildcardsChoices(t *testing.T) {
	rng := rand.New(rand.NewSource(3))
	for i := 0; i < 30; i++ {
		out, _ := ExpandWildcards("a {red|green|blue} dress", nil, rng)
		if out != "a red dress" && out != "a green dress" && out != "a blue dress" {
			t.Fatalf("unexpected choice %q", out)
		}
	}
	// Two of three, without repeats, joined with a comma.
	for i := 0; i < 30; i++ {
		out, _ := ExpandWildcards("{2$$a|b|c}", nil, rng)
		parts := strings.Split(out, ", ")
		if len(parts) != 2 || parts[0] == parts[1] {
			t.Fatalf("expected two distinct picks, got %q", out)
		}
	}
	// A zero-weight option is never drawn.
	for i := 0; i < 30; i++ {
		if out, _ := ExpandWildcards("{0::never|5::always}", nil, rng); out != "always" {
			t.Fatalf("weighted choice drew %q", out)
		}
	}
}

func TestExpandWildcardsEmptyOptionTidiesSeams(t *testing.T) {
	// Force the empty branch: with one empty and one zero-weight option the empty
	// one always wins, and the doubled comma it leaves is cleaned up.
	out, _ := ExpandWildcards("1girl, {|0::x}, smile", nil, nil)
	if out != "1girl, smile" {
		t.Fatalf("got %q", out)
	}
}

func TestExpandWildcardsNestedAndRecursive(t *testing.T) {
	lookup := testLookup(map[string][]string{
		"outfit": {"{red|red} __fabric__ dress"},
		"fabric": {"silk"},
		"loop":   {"__loop__"},
	})
	out, _ := ExpandWildcards("__outfit__", lookup, nil)
	if out != "red silk dress" {
		t.Fatalf("nested expansion got %q", out)
	}
	// A list that names itself stops at the depth limit rather than hanging.
	if out, _ := ExpandWildcards("__loop__", lookup, nil); out != "__loop__" {
		t.Fatalf("recursive list should settle on itself, got %q", out)
	}
}

func TestExpandWildcardsKeepsEmphasisBraces(t *testing.T) {
	// NovelAI-style emphasis and LoRA tags are not choices.
	in := "{{masterpiece}}, <lora:thing:0.8>, (detailed:1.2)"
	out, changed := ExpandWildcards(in, nil, nil)
	if changed || out != in {
		t.Fatalf("plain prompt should be untouched, got %q", out)
	}
}
