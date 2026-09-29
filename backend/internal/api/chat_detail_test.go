package api

import (
	"net/http"
	"strings"
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

// Asked for detail in an ordinary conversation, she writes the scene out — told to, and
// sampled with room for it — and every paragraph of it is kept.
func TestAskedForDetailSheWritesTheSceneOut(t *testing.T) {
	s, token := newTestServer(t)
	scene := "*leans in close*\n\nfirst paragraph\n\nsecond paragraph\n\nthird paragraph\n\nfourth paragraph"
	prompt, _ := chatStub(t, s, scene+"\n[mood: flirty 3]")
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","messages":[{"id":"a","role":"user","content":"go into detail about what you'd do"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	if !strings.Contains(*prompt, "write it out as roleplay") || strings.Contains(*prompt, "short texts") || strings.Contains(*prompt, "as one text") {
		t.Fatalf("she was not told to write the scene out")
	}
	if !strings.Contains(rec.Body.String(), "fourth paragraph") {
		t.Fatalf("the scene was cut: %s", rec.Body)
	}
	if got := classifyChatTask(chatRequest{Mode: "sweet"}, "go into detail"); got != taskCreative {
		t.Fatalf("a detail turn was sampled as %s", got)
	}
}
