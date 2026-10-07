package api

import (
	"strings"
	"testing"
)

// The call frame appears only when a call is open, and says the three things a model
// otherwise invents: that she is the one on camera, that they are not, and that what
// they see is her sprite.
func TestCallPromptBlock(t *testing.T) {
	if callPromptBlock(false) != "" {
		t.Fatal("a turn with no call contributed a call frame")
	}
	block := callPromptBlock(true)
	for _, want := range []string{"video call", "fill their screen", "no camera pointed at them", "Do not describe them"} {
		if !strings.Contains(block, want) {
			t.Fatalf("the call frame is missing %q: %s", want, block)
		}
	}
}
