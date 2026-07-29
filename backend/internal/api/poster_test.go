package api

import "testing"

func TestPosterOffsetsSpreadAcrossTheVideoWithoutTheEdges(t *testing.T) {
	const dur = 100.0
	got := posterOffsets(dur, 5)
	if len(got) != 5 {
		t.Fatalf("got %d offsets, want 5", len(got))
	}
	// Inset at both ends: a strip that opens on the black lead-in and closes on the
	// credits fade offers two frames nobody would pick.
	if got[0] <= 0 || got[0] >= dur*0.1 {
		t.Errorf("first offset %.2f is not just inside the start", got[0])
	}
	if got[len(got)-1] >= dur || got[len(got)-1] <= dur*0.9 {
		t.Errorf("last offset %.2f is not just inside the end", got[len(got)-1])
	}
	// Evenly spaced, so the strip reads as a timeline.
	step := got[1] - got[0]
	for i := 2; i < len(got); i++ {
		if diff := (got[i] - got[i-1]) - step; diff > 0.001 || diff < -0.001 {
			t.Errorf("offsets are not evenly spaced: %v", got)
			break
		}
	}
}

func TestPosterOffsetsHandleDegenerateInputs(t *testing.T) {
	if got := posterOffsets(100, 1); len(got) != 1 || got[0] != 50 {
		t.Errorf("a single sample should be the midpoint, got %v", got)
	}
	// A count below one is a client bug, not a reason to hand back an empty strip.
	if got := posterOffsets(100, 0); len(got) != 1 {
		t.Errorf("count 0 should still yield one offset, got %v", got)
	}
	// An unprobed duration still has to be scrubbable.
	got := posterOffsets(0, 4)
	if len(got) != 4 {
		t.Fatalf("got %d offsets for an unknown duration, want 4", len(got))
	}
	for i, at := range got {
		if at < 0 {
			t.Errorf("offset %d is negative: %v", i, got)
		}
	}
}
