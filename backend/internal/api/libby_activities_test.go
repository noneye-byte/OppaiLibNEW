package api

import (
	"testing"
)

// The heat gate is the part that holds. The directive asks her to keep the intimate
// states for scenes that have got there, which is a request to a model; this is what
// happens when the model ignores it.
func TestActivityHeatGate(t *testing.T) {
	if got := allowedActivity("vibrator", 2); got != "" {
		t.Fatalf("an intimate state took at heat 2: %q", got)
	}
	if got := allowedActivity("vibrator", 4); got != "vibrator" {
		t.Fatalf("an intimate state was refused at its own floor: %q", got)
	}
	if got := allowedActivity("reading", 1); got != "reading" {
		t.Fatalf("an idle state was gated: %q", got)
	}
	// The typing slot is set by the client while she composes and is never a state she
	// can put herself into, whatever the heat.
	if got := allowedActivity("typing", 5); got != "" {
		t.Fatalf("the app-driven typing slot was accepted as a declared state: %q", got)
	}
	if got := allowedActivity("not-a-state", 5); got != "" {
		t.Fatalf("an invented state resolved: %q", got)
	}
}
