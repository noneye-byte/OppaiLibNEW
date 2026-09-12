package api

import (
	"strings"
	"testing"
)

// The dial turns both ways without a tag: heat in the exchange moves it up, an
// ordinary or cooling exchange moves it down, and small talk leaves it alone.
func TestInferHeatDeltaMovesBothWays(t *testing.T) {
	if got := inferHeatDelta("you look so cute tonight", "stop, you're making me blush... come closer"); got < 1 {
		t.Fatalf("flirting inferred %d, want up", got)
	}
	if got := inferHeatDelta("anyway, how many videos do i have?", "lol ok, library mode. you've got about forty"); got > -1 {
		t.Fatalf("a practical turn inferred %d, want down", got)
	}
	if got := inferHeatDelta("did you eat?", "yeah, leftovers"); got != 0 {
		t.Fatalf("small talk inferred %d, want 0", got)
	}
}

func TestHeatStuckDirectiveNamesTheRun(t *testing.T) {
	if got := heatStuckDirective(4, heatRunLength([]int{4, 4, 4, 4}, 4)); !strings.Contains(got, "sat at 4 for your last 5 replies") {
		t.Fatalf("stuck run not named: %q", got)
	}
	if got := heatStuckDirective(4, heatRunLength([]int{2, 3, 4}, 4)); got != "" {
		t.Fatalf("a fresh heat was called stuck: %q", got)
	}
	if got := heatStuckDirective(3, heatRunLength(nil, 3)); got != "" {
		t.Fatalf("no evidence was called stuck: %q", got)
	}
}
