package api

import (
	"encoding/base64"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestTheLineIsHeldWhateverWordsAShotUses(t *testing.T) {
	for _, shot := range []string{"loli", "dressed like a kid", "16 years old", "17yo", "middle schooler uniform", "little girl pose"} {
		if !shotIsRefused(shot) {
			t.Errorf("not refused: %q", shot)
		}
	}
	for _, shot := range []string{"school uniform, cosplay", "kidding around, grin", "young woman, 25", "babydoll lingerie", "childhood bedroom poster"} {
		if shotIsRefused(shot) {
			t.Errorf("an adult shot was refused: %q", shot)
		}
	}
}

func TestAShotIsFramedThenDescribedThenPlaced(t *testing.T) {
	got := shotSubject("mirror selfie", `"you", lying on bed, *smiling*`, "bedroom (night)")
	if got != "mirror selfie, holding phone, reflection, mirror, lying on bed, smiling, bedroom (night)" {
		t.Fatalf("got %q", got)
	}
}

func TestAnEditPutsTheChangeFirst(t *testing.T) {
	if got := editedShot("lying on bed, smiling", "from behind"); got != "from behind, lying on bed, smiling" {
		t.Fatalf("got %q", got)
	}
	if editDenoise("subtle") >= editDenoise("medium") || editDenoise("medium") >= editDenoise("big") {
		t.Fatal("edit strengths are out of order")
	}
}

func TestTheJudgeNeverSendsACandidateItDidNotClearAsAdult(t *testing.T) {
	j, ok := parseJudgement(`sure: {"scores":[9,6],"adult":[false,true],"best":1,"description":"x","fix":""}`, 2)
	if !ok {
		t.Fatal("not parsed")
	}
	if i, ok := pickCandidate(j, nil); !ok || i != 1 {
		t.Fatalf("picked %d %v", i, ok)
	}
	none, _ := parseJudgement(`{"scores":[9],"adult":[false]}`, 1)
	if _, ok := pickCandidate(none, nil); ok {
		t.Fatal("a candidate nobody cleared was picked")
	}
	// Missing answers are the cautious way round.
	short, _ := parseJudgement(`{"scores":["8"]}`, 2)
	if short.Scores[0] != 8 || short.Adult[0] || short.Adult[1] {
		t.Fatalf("short = %+v", short)
	}
}

func TestTasteBreaksATieButNeverRescuesABadPicture(t *testing.T) {
	j := judgement{Scores: []float64{7, 7, 3}, Adult: []bool{true, true, true}, Best: 1}
	if i, _ := pickCandidate(j, []float64{0, 0.8, 1}); i != 1 {
		t.Fatalf("taste did not break the tie: %d", i)
	}
	if i, _ := pickCandidate(j, []float64{0, 0, 1}); i == 2 {
		t.Fatal("taste rescued a 3")
	}
}

func TestRatingLeansTagsAndChangingItDoesNotStack(t *testing.T) {
	w := rateTags(nil, []string{"bedroom", "smile", "character:libby"}, "", "love")
	if w["bedroom"] <= 1 || w["character:libby"] != 0 {
		t.Fatalf("after love: %v", w)
	}
	w = rateTags(w, []string{"bedroom", "smile", "character:libby"}, "love", "dislike")
	if w["bedroom"] >= 1 {
		t.Fatalf("after changing to dislike: %v", w)
	}
	for i := 0; i < 50; i++ {
		w = rateTags(w, []string{"bedroom"}, "", "dislike")
	}
	if w["bedroom"] < ratedFloor-1e-9 {
		t.Fatalf("ratings pushed a tag to never: %v", w["bedroom"])
	}
}

func TestStoriesKeepToTheDayAndLeaveRoomBetween(t *testing.T) {
	noon := time.Date(2026, 10, 6, 12, 0, 0, 0, time.Local)
	if !storyDue(noon, noon.Add(-4*time.Hour), time.Time{}, 0, 2) {
		t.Fatal("a quiet afternoon should allow a story")
	}
	if storyDue(noon, noon.Add(-time.Hour), time.Time{}, 0, 2) {
		t.Fatal("a story while they were just chatting")
	}
	if storyDue(noon.Add(-10*time.Hour), time.Time{}, time.Time{}, 0, 2) {
		t.Fatal("a story at 2am")
	}
	if storyDue(noon, time.Time{}, noon.Add(-time.Hour), 1, 2) {
		t.Fatal("two stories an hour apart")
	}
	if storyDue(noon, time.Time{}, time.Time{}, 2, 2) {
		t.Fatal("past the day's limit")
	}
}

func TestAWatchFrameMustBeAPicture(t *testing.T) {
	if _, err := decodeWatchFrame("data:text/html;base64,PGh0bWw+"); err == nil {
		t.Fatal("html accepted as a frame")
	}
	if _, err := decodeWatchFrame("data:image/png;base64," + base64.StdEncoding.EncodeToString(testPNG(9))); err != nil {
		t.Fatal(err)
	}
}

// With a vision model to judge, the camera makes candidates, the judge picks the one it
// cleared, and she is told the judge's description of what was sent.
func TestTheCameraSendsTheJudgesPickAndSaysWhatItShows(t *testing.T) {
	visionAnswer := `{"scores":[8,9],"adult":[true,false],"best":2,"description":"she is in a red dress by the window","fix":""}`
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		msgs := body["messages"].([]any)
		if content, ok := msgs[0].(map[string]any)["content"].([]any); ok && len(content) > 1 {
			// The judge's question to the vision endpoint (same fake).
			return http.StatusOK, say(visionAnswer)
		}
		if n == 0 {
			return http.StatusOK, say("ok ok", callTool("p", toolTakePhoto, map[string]any{"shot": "by the window", "outfit": "red dress"}))
		}
		return http.StatusOK, say("well?")
	})
	cur := s.settings.Get()
	cur.VisionURL = cur.ChatURL
	cur.LibbyCameraCandidates = 2
	s.settings.Set(cur)
	runTurn(t, s, token, firstTurn)
	if len(f.gens) != 1 || f.gens[0]["n_iter"].(float64) != 2 {
		t.Fatalf("expected one run of two candidates: %v", f.gens)
	}
	if !strings.Contains(f.gens[0]["prompt"].(string), "red dress") {
		t.Fatalf("the outfit she named is not in the prompt: %s", f.gens[0]["prompt"])
	}
	c := storedConversation(t, s)
	if c.Wearing != "red dress" {
		t.Fatalf("she is not left in what the picture put her in: %q", c.Wearing)
	}
	var result string
	for _, body := range f.chats() {
		msgs := body["messages"].([]any)
		if last, ok := msgs[len(msgs)-1].(map[string]any); ok && last["role"] == "tool" {
			result = last["content"].(string)
		}
	}
	if !strings.Contains(result, "red dress by the window") {
		t.Fatalf("she was not told what the picture shows: %q", result)
	}
	u, _ := s.db.UserByName(t.Context(), "tester")
	for _, m := range c.Messages {
		if m.ImageID != "" {
			meta, _ := s.ownedChatImage(u.ID, m.ImageID)
			if meta.Gen == nil || meta.Gen.Score != 8 {
				t.Fatalf("the judge's pick (the only cleared one) was not sent: %+v", meta.Gen)
			}
		}
	}
}

// "Same but from behind" starts from the last picture: img2img, its seed, the change first.
func TestAnEditRetakesHerLastPictureFromItself(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		switch n {
		case 0:
			return http.StatusOK, say("", callTool("p", toolTakePhoto, map[string]any{"shot": "sitting on the sofa"}))
		case 1:
			return http.StatusOK, say("there")
		case 2:
			return http.StatusOK, say("fine", callTool("e", toolEditPhoto, map[string]any{"change": "from behind", "strength": "medium"}))
		}
		return http.StatusOK, say("happy?")
	})
	runTurn(t, s, token, firstTurn)
	runTurn(t, s, token, `{"conversationId":"0123456789abcdef0123456789abcdef","messages":[{"id":"cccccccccccccccccccccccccccccccc","role":"user","content":"same but from behind","at":5}]}`)
	if len(f.gens) != 2 {
		t.Fatalf("generations = %d", len(f.gens))
	}
	edit := f.gens[1]
	if _, ok := edit["init_images"]; !ok || edit["seed"].(float64) != 1234 {
		t.Fatalf("the edit was not an img2img from the last picture's seed: %v", edit["seed"])
	}
	if !strings.Contains(edit["prompt"].(string), "from behind, sitting on the sofa") {
		t.Fatalf("prompt = %s", edit["prompt"])
	}
}
