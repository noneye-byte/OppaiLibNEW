package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestTextsForTurnVariesTheWayPeopleDo(t *testing.T) {
	counts := map[int]int{}
	for i := 0; i < 100; i++ {
		counts[textsForTurn(taskCasual, "so what did you get up to today while i was out", float64(i)/100)]++
	}
	if counts[1] < counts[2] || counts[2] < counts[3] || counts[3] == 0 {
		t.Fatalf("casual turns should be mostly one text, sometimes two, now and then three: %v", counts)
	}
	for n := range counts {
		if n < 1 || n > maxTextsPerReply {
			t.Fatalf("drew %d texts: %v", n, counts)
		}
	}
}

func TestABeatIsOneTextWhateverTheDiceSay(t *testing.T) {
	for _, task := range []chatTask{taskReaction, taskObservation, taskFactual, taskPlanning} {
		if n := textsForTurn(task, "look at this", 0.99); n != 1 {
			t.Errorf("%s drew %d texts", task, n)
		}
	}
	if n := textsForTurn(taskAutonomous, "", 0.99); n > 2 {
		t.Errorf("speaking first drew %d texts", n)
	}
}

func TestAShortMessageNeverGetsThreeTextsBack(t *testing.T) {
	if n := textsForTurn(taskEmotional, "i missed you", 0.99); n > 2 {
		t.Fatalf("three words got %d texts", n)
	}
}

func TestCapTextsDropsTheInventedTail(t *testing.T) {
	burst := "omg you're back\n\nyeah i missed you too\n\nlol stop it\n\nno you stop\n\nfine"
	if got := capTexts(burst, 1); got != "omg you're back\n\nyeah i missed you too" {
		t.Fatalf("asked for one, allowed two: %q", got)
	}
	if got := capTexts(burst, 3); strings.Count(got, "\n\n") != maxTextsPerReply-1 {
		t.Fatalf("never more than the cap: %q", got)
	}
	within := "hey\n\nwhere've you been"
	if got := capTexts(within, 2); got != within {
		t.Fatalf("a reply inside the cap was changed: %q", got)
	}
	single := "one line\nand a second line of the same text"
	if got := capTexts(single, 1); got != single {
		t.Fatalf("a single newline is not a new text: %q", got)
	}
}

func TestTheDirectiveSaysWhoseTextsTheyAre(t *testing.T) {
	for n := 1; n <= 3; n++ {
		d := textCountDirective(n)
		if !strings.Contains(d, "never write their side") || !strings.Contains(d, "never reply to your own texts") {
			t.Fatalf("n=%d: %q", n, d)
		}
	}
	if !strings.Contains(textCountDirective(1), "one text") {
		t.Fatalf("one: %q", textCountDirective(1))
	}
}

// The punctuation tidy-up used to pull any colon back onto the word before it, which
// turned "hehe :3" into "hehe:3" — harmless until she was asked to use emoticons.
func TestTheScrubbersLeaveEmoticonsAlone(t *testing.T) {
	for _, in := range []string{"i missed you <3", "nooo T_T come here", "ugh >_< fine", "hehe :3", "ok ;) xD :D :P", "lmao ngl fr tbh"} {
		out := fillNamePlaceholders(scrubInventedURLs(scrubDirectives(in), map[string]bool{}), "Owen")
		if out != in {
			t.Errorf("%q came out as %q", in, out)
		}
	}
	// And the tidy-up still does its job where a tag left a gap.
	if out := scrubDirectives("fine [mood: happy 2] , whatever"); strings.Contains(out, " ,") {
		t.Errorf("a stranded comma was left: %q", out)
	}
}

func TestAnUntouchedStyleLineMovesToTheNewOne(t *testing.T) {
	card := chatCharacter{ID: "libby", Style: legacyLibbyStyle, ExampleDialogue: legacyLibbyDoingExampleDialogue}
	backfillLibbyCard(&card)
	if card.Style != libbyStyle || !strings.Contains(card.ExampleDialogue, "T_T") {
		t.Fatalf("the shipped style and examples did not migrate: %q", card.Style)
	}
	edited := chatCharacter{ID: "libby", Style: legacyLibbyStyle + " Mine.", ExampleDialogue: legacyLibbyDoingExampleDialogue + "Mine."}
	backfillLibbyCard(&edited)
	if !strings.HasSuffix(edited.Style, "Mine.") || !strings.HasSuffix(edited.ExampleDialogue, "Mine.") {
		t.Fatal("an edited style or example set was overwritten")
	}
}

// End to end: a model that writes a five-text burst comes back with at most three, and
// the prompt it was handed said how many to send.
func TestChatCapsAFiveTextBurst(t *testing.T) {
	s, token := newTestServer(t)
	prompt, _ := chatStub(t, s, "hey you\n\nwhat are you up to\n\nnothing much, you?\n\nsame lol\n\nok good\n[mood: happy 2]")
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[{"id":"a","role":"user","content":"hey libby, how has your evening been going so far"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Message string `json:"message"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if texts := strings.Count(out.Message, "\n\n") + 1; texts > maxTextsPerReply {
		t.Fatalf("%d texts came back: %q", texts, out.Message)
	}
	if strings.Contains(out.Message, "ok good") {
		t.Fatalf("the invented tail survived: %q", out.Message)
	}
	if !strings.Contains(*prompt, "Send this reply as") {
		t.Fatalf("the prompt never said how many texts to send")
	}
}
