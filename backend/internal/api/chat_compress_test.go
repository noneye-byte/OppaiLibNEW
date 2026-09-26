package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestTheOlderPartOfAConversationIsSummarisedAndCarried(t *testing.T) {
	s, token := newTestServer(t)
	prompt, history := chatStub(t, s, "You and they planned a picnic for Saturday; you promised to bring the blanket.")
	h := s.Handler()

	rec := do(t, h, token, http.MethodPost, "/api/chat/compress", `{"characterId":"libby","summary":"You met in the library.","messages":[
		{"role":"user","content":"want to go on a picnic saturday?"},
		{"role":"assistant","content":"yes!! i'll bring the blanket"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("compress: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		Summary string `json:"summary"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if !strings.Contains(out.Summary, "picnic") {
		t.Fatalf("summary = %q", out.Summary)
	}
	// The summariser saw the previous summary and the transcript, labelled by speaker.
	sent := (*history)[0].Content
	if !strings.Contains(sent, "Previous summary:\nYou met in the library.") || !strings.Contains(sent, "Libby: yes!! i'll bring the blanket") {
		t.Fatalf("the summariser was handed %q", sent)
	}
	if !strings.Contains(*prompt, "memory of a long, ongoing text conversation") {
		t.Fatalf("the summariser was not told its job: %q", *prompt)
	}

	// A turn that carries the summary hands it to her as her notes.
	rec = do(t, h, token, http.MethodPost, "/api/chat",
		`{"mode":"sweet","characterId":"libby","summary":"You promised to bring the blanket on Saturday.","messages":[{"id":"a","role":"user","content":"so are we still on?"}]}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body)
	}
	if !strings.Contains(*prompt, "Earlier in this conversation") || !strings.Contains(*prompt, "bring the blanket on Saturday") {
		t.Fatal("the summary did not reach her")
	}

	if rec := do(t, h, token, http.MethodPost, "/api/chat/compress", `{"characterId":"libby","messages":[]}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("an empty compress was accepted: %d", rec.Code)
	}
}
