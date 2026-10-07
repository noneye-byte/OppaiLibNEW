package api

import "testing"

func TestScrubDirectivesRemovesProtocolNarration(t *testing.T) {
	cases := []struct {
		name  string
		reply string
		want  string
	}{
		{
			"mood tag mid-paragraph",
			"That one's a keeper. [mood: mischievous 4] Want another?",
			"That one's a keeper. Want another?",
		},
		{
			"emphasised mood tag on its own line",
			"Come here.\n\n*[mood: happy 3]*\n\nI missed you.",
			"Come here.\n\nI missed you.",
		},
		{
			"send tag mid-reply",
			"Here, look. [send: lingerie, bed] Told you.",
			"Here, look. Told you.",
		},
		{
			"narrated attachment",
			"You've earned it. *sending you a picture* Tell me what you think.",
			"You've earned it. Tell me what you think.",
		},
		{
			"narrated meter move",
			"*progressing mood to 4* God, say that again.",
			"God, say that again.",
		},
		{
			"parenthesised mood change",
			"Mm. (changes mood to mischievous) You're trouble.",
			"Mm. You're trouble.",
		},
		{
			"bare mood readout",
			"Fine by me.\n**Mood: happy 2**",
			"Fine by me.",
		},
		{
			"several at once",
			"[send: bathrobe] Look at this. *raising intensity* [mood: happy 5]",
			"Look at this.",
		},
		{
			"bracketed picture noun",
			"Okay okay. [image: me in the mirror] Happy now?",
			"Okay okay. Happy now?",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := scrubDirectives(tc.reply); got != tc.want {
				t.Errorf("scrubDirectives(%q)\n got %q\nwant %q", tc.reply, got, tc.want)
			}
		})
	}
}

// Her own voice is the thing this must not damage. Italic action lines, bracketed
// asides, and sentences that merely mention a picture are prose, not plumbing.
func TestScrubDirectivesLeavesProseAlone(t *testing.T) {
	for _, reply := range []string{
		"*leans in* You were saying?",
		"*bites her lip* Keep going.",
		"[laughs] You're impossible.",
		"I'm still looking at the photo you sent me.",
		"*picks up the picture and studies it* Who took this?",
		"That put me in a mood, and not the good kind.",
		"**Come here.** Now.",
		"(You know exactly what you're doing.)",
	} {
		if got := scrubDirectives(reply); got != reply {
			t.Errorf("scrubDirectives(%q) = %q, want it unchanged", reply, got)
		}
	}
}

// A reply that was nothing but tags must survive intact, so the caller's "no message"
// check reports a backend problem rather than an empty bubble.
func TestScrubDirectivesKeepsATagOnlyReply(t *testing.T) {
	reply := "[mood: happy 3]"
	if got := scrubDirectives(reply); got != reply {
		t.Errorf("scrubDirectives(%q) = %q, want it unchanged", reply, got)
	}
}
