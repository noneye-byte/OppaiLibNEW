package api

import (
	"testing"
)

func TestAskingForDetailIsRecognised(t *testing.T) {
	for _, ask := range []string{
		"go into detail", "can you go into more detail?", "describe it", "tell me exactly what you'd do",
		"in detail please", "walk me through it", "be more descriptive", "i want all the details", "roleplay it",
	} {
		if !detailAsked(ask) {
			t.Fatalf("%q was not read as asking for detail", ask)
		}
	}
	for _, ask := range []string{"the details are boring", "hey how was your day", "send me a pic"} {
		if detailAsked(ask) {
			t.Fatalf("%q was read as asking for detail", ask)
		}
	}
}
