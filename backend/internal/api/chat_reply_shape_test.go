package api

import (
	"net/http"
	"strings"
	"testing"
)

func shapeOf(latest string) replyShape {
	return readReplyShape(shapeInput{task: taskCasual, latest: latest, intensity: 1})
}

func TestSmallTalkIsTexted(t *testing.T) {
	for _, msg := range []string{"hey", "how was your day?", "lol", "what are you up to", "i'm home"} {
		if got := shapeOf(msg); got != shapeTexts {
			t.Fatalf("%q came out as %s", msg, got)
		}
	}
}

func TestAQuestionThatWantsTellingGetsOneProperAnswer(t *testing.T) {
	for _, msg := range []string{
		"tell me about the last game you played", "how does that even work?", "why did they cancel it",
		"what was the film about", "what do you think of the new one?", "what's the plot",
		"explain it to me", "any tips for a first date?",
	} {
		if got := shapeOf(msg); got != shapeAnswer {
			t.Fatalf("%q came out as %s", msg, got)
		}
	}
}

func TestAskedToDescribeSomethingSheDescribesItRatherThanActingItOut(t *testing.T) {
	if got := shapeOf("describe the movie in detail"); got != shapeAnswer {
		t.Fatalf("a description came out as %s", got)
	}
	if d := shapeDirective(shapeAnswer, "describe the movie in detail", 1); d == detailDirective || !strings.Contains(d, "one long message") {
		t.Fatalf("directive: %q", d)
	}
	// Asked for the scene, or with a scene already under way, it is the scene.
	if got := shapeOf("describe what you'd do to me"); got != shapeDetail {
		t.Fatalf("a scene asked for came out as %s", got)
	}
	heated := readReplyShape(shapeInput{task: taskCreative, latest: "describe it in detail", intensity: 4})
	if heated != shapeDetail {
		t.Fatalf("a heated ask came out as %s", heated)
	}
}

func TestWritingWhatYouDoPutsHerInTheScene(t *testing.T) {
	for _, msg := range []string{"*pulls you closer* missed you", "*smiles*", "hey there *waves*", "I sit down next to you. *leans on your shoulder*"} {
		if got := shapeOf(msg); got != shapeScene {
			t.Fatalf("%q came out as %s", msg, got)
		}
	}
	// A starred word mid-sentence is emphasis, and bold is bold.
	for _, msg := range []string{"that was *so* good", "**important** thing"} {
		if got := shapeOf(msg); got == shapeScene {
			t.Fatalf("%q was read as an action", msg)
		}
	}
	// "yes" inside a scene they are both writing is still inside it.
	inside := readReplyShape(shapeInput{task: taskCasual, latest: "yes", previous: "*takes your hand*", herLast: "*leads you upstairs* come on"})
	if inside != shapeScene {
		t.Fatalf("a short line mid-scene came out as %s", inside)
	}
	outside := readReplyShape(shapeInput{task: taskCasual, latest: "yes", previous: "*takes your hand*", herLast: "ok!"})
	if outside != shapeTexts {
		t.Fatalf("a scene only one of them was writing came out as %s", outside)
	}
}

func TestABeatIsTextedWhateverItSays(t *testing.T) {
	got := readReplyShape(shapeInput{task: taskReaction, latest: "*shows you a photo* what do you think of it?"})
	if got != shapeTexts {
		t.Fatalf("a reaction came out as %s", got)
	}
}

func TestAFewWordsAreAnsweredInKind(t *testing.T) {
	d := shapeDirective(shapeTexts, "lol ok", 1)
	if !strings.Contains(d, briefDirective) || !strings.Contains(d, "one text") {
		t.Fatalf("brief: %q", d)
	}
	if strings.Contains(shapeDirective(shapeTexts, "what did you get up to today then", 2), briefDirective) {
		t.Fatal("a real message was told to be brief")
	}
	for _, shape := range []replyShape{shapeTexts, shapeAnswer} {
		if !strings.Contains(shapeDirective(shape, "hm", 1), noQuestionTic) {
			t.Fatalf("%s was not told it may stop without a question", shape)
		}
	}
}

func TestAnAnswerArrivesAsOneMessage(t *testing.T) {
	answer := "Okay so it starts in a lighthouse, which is already the best part.\n\nThen the keeper finds the letters and it all goes sideways from there.\n\nThe ending got me, honestly."
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) { return http.StatusOK, say(answer) })
	events := runTurn(t, s, token, turnFor("what was the film about?", ""))
	if got := len(eventsNamed(events, "message")); got != 1 {
		t.Fatalf("an answer arrived as %d texts", got)
	}
	if !strings.Contains(systemPrompt(lastChat(f)), answerDirective) {
		t.Fatal("she was not told to answer properly")
	}
}

func TestHerLastMessageIsTheOneBeforeTheirRun(t *testing.T) {
	msgs := []chatMessage{{Role: "assistant", Content: "first"}, {Role: "user", Content: "a"}, {Role: "assistant", Content: "*waves*"}, {Role: "user", Content: "b"}, {Role: "user", Content: "c"}}
	if got := lastAssistantText(msgs); got != "*waves*" {
		t.Fatalf("got %q", got)
	}
	if got := lastAssistantText([]chatMessage{{Role: "user", Content: "hi"}}); got != "" {
		t.Fatalf("got %q", got)
	}
}
