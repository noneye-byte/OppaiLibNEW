package api

import "testing"

func TestFindThoughtTagsSeparatesThinkingFromMuttering(t *testing.T) {
	reply := "Yeah, that one's mine. [think: he still hasn't noticed the frame] Anyway — what did you want to watch?"
	got := findThoughtTags(reply)
	if len(got) != 1 {
		t.Fatalf("expected one thought, got %#v", got)
	}
	if got[0].Kind != thoughtPrivate {
		t.Errorf("a [think: …] tag is private, got %q", got[0].Kind)
	}
	if got[0].Text != "he still hasn't noticed the frame" {
		t.Errorf("thought text: %q", got[0].Text)
	}
	// The spellings models actually reach for, not only the documented one.
	for _, tag := range []string{"[aside: god, he's slow]", "[mutters: god, he's slow]", "[to herself: god, he's slow]"} {
		got := findThoughtTags("Sure. " + tag)
		if len(got) != 1 || got[0].Kind != thoughtAside {
			t.Errorf("%s should read as something said aloud, got %#v", tag, got)
		}
	}
}

func TestFindThoughtTagsIsBounded(t *testing.T) {
	// A model padding every turn with an inner monologue gets two and no more.
	reply := "[think: one] a [think: two] b [think: three] c [aside: four]"
	if got := findThoughtTags(reply); len(got) != maxThoughtsPerReply {
		t.Errorf("expected %d thoughts, got %d", maxThoughtsPerReply, len(got))
	}
	// Empty and punctuation-only thoughts are dropped rather than drawn as blank bubbles.
	if got := findThoughtTags("[think: ] [aside: ...]"); len(got) != 0 {
		t.Errorf("a thought with nothing in it should be dropped, got %#v", got)
	}
}

func TestThoughtsNeverStayInTheSpokenReply(t *testing.T) {
	// The one thing a thought must never be is said. Whatever the parser did with it,
	// the scrubber has to take it out of the prose.
	for _, reply := range []string{
		"Nice pick. [think: he always goes for these]",
		"[aside: honestly...] Fine, put it on.",
		"Sure thing [To Myself: why do I bother] but only one episode.",
	} {
		if cleaned := scrubDirectives(reply); looseThoughtTag.MatchString(cleaned) {
			t.Errorf("thought survived scrubbing: %q -> %q", reply, cleaned)
		}
	}
	// Bracketed prose is not a tag and survives: the delimiter is what makes one.
	if cleaned := scrubDirectives("Right. [thinks] Let's go."); cleaned != "Right. [thinks] Let's go." {
		t.Errorf("bracketed stage direction was eaten: %q", cleaned)
	}
}

func TestRepliedOnlyWithThoughtDetectsSilence(t *testing.T) {
	if !repliedOnlyWithThought("[think: he looks wrecked tonight, leave him be]") {
		t.Error("a reply that is only a thought is her deciding to say nothing")
	}
	if repliedOnlyWithThought("[think: he looks wrecked] You okay?") {
		t.Error("a thought alongside speech is not silence")
	}
}
