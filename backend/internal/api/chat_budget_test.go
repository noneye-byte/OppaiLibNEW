package api

import (
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/settings"
)

// words builds filler costing about n estimated tokens, so a budget test can say "a
// 400-token library snapshot" without pasting 400 tokens of prose. Two-character words put
// the word count above the characters-per-token term, so estimateTokens returns n.
func words(n int) string {
	return strings.TrimSpace(strings.Repeat("aa ", n))
}

func TestEstimateTokens(t *testing.T) {
	if got := estimateTokens(""); got != 0 {
		t.Errorf("empty = %d, want 0", got)
	}
	// Word count is the floor, so short punctuated text is never under-counted.
	if got := estimateTokens("a b c d e"); got < 5 {
		t.Errorf("five words estimated at %d, want at least 5", got)
	}
	// Runes, not bytes: a byte count would roughly triple this.
	if got, ascii := estimateTokens(strings.Repeat("あ", 40)), estimateTokens(strings.Repeat("a", 40)); got > ascii*2 {
		t.Errorf("non-ASCII estimated at %d vs %d for the same length", got, ascii)
	}
}

func TestEffectiveContextLimitTargetsEightKAndHonorsHardCaps(t *testing.T) {
	if got := effectiveContextLimit(); got != 8192 {
		t.Fatalf("unreported context = %d, want 8192", got)
	}
	if got := effectiveContextLimit(32768, 16384); got != 8192 {
		t.Fatalf("roomy loader context = %d, want target 8192", got)
	}
	if got := effectiveContextLimit(4096, 32768); got != 4096 {
		t.Fatalf("hard-capped loader context = %d, want 4096", got)
	}
	if got := effectiveContextLimit(0, 999999); got != 8192 {
		t.Fatalf("invalid reports changed target to %d", got)
	}
}

func TestLibbyFixedPromptLeavesRoomAtFourK(t *testing.T) {
	card := defaultLibbyCard()
	parts := []string{
		libbyAutonomousStyle, card.Description, card.Appearance, card.Personality, card.Kinks,
		card.Scenario, card.ExampleDialogue, card.SystemPrompt,
		(&Server{}).libbySelfDirective(settings.Settings{}), linkDirective, memoryDirective,
		wantsDirective, bondDirective, feelingsPromptBlock("hello"), moodDirective, silenceDirective,
	}
	tokens := estimateTokens(strings.Join(parts, "\n"))
	t.Logf("Libby's fixed prompt estimate: %d tokens", tokens)
	// Leave over half a 4096-token window for dynamic memory/library sections, recent
	// conversation, and the reply. This is the regression behind the red budget banner.
	if tokens > 1800 {
		t.Fatalf("Libby's fixed prompt costs %d estimated tokens; want at most 1800", tokens)
	}
}

func TestBackfillCompactsUntouchedLibbyPrompt(t *testing.T) {
	card := chatCharacter{ID: "libby", SystemPrompt: legacyLibbySystemPrompt}
	backfillLibbyCard(&card)
	if card.SystemPrompt != defaultLibbySystemPrompt {
		t.Fatal("the untouched legacy prompt was not migrated")
	}
	custom := chatCharacter{ID: "libby", SystemPrompt: legacyLibbySystemPrompt + "\nMine."}
	backfillLibbyCard(&custom)
	if !strings.HasSuffix(custom.SystemPrompt, "Mine.") {
		t.Fatal("a user-edited Libby prompt must not be overwritten")
	}
}

func TestAssembleSystemPromptShedsByRank(t *testing.T) {
	head, tail := "WHO SHE IS", "THE PROTOCOL"
	sections := []promptSection{
		// Deliberately the cheapest to lose *and* the biggest, which is the real shape of
		// the problem: the library snapshot is what actually crowds out everything else.
		{Name: "your library", Rank: rankLibrarySnapshot, Text: words(400)},
		{Name: "what she remembers about you", Rank: rankMemoryList, Text: words(40)},
		{Name: "her own wants", Rank: rankWantsList, Text: words(30)},
	}
	got, dropped := assembleSystemPrompt(head, sections, tail, 100)

	// Both fixed halves survive any budget, and in that order.
	if !strings.HasPrefix(got, head) || !strings.HasSuffix(got, tail) {
		t.Fatalf("head and tail must bracket the prompt, got %q", got)
	}
	// The budget bought the two small valuable blocks rather than the one bulky cheap one:
	// a walk that stopped at the first section too large would have kept nothing.
	if len(dropped) != 1 || dropped[0] != "your library" {
		t.Errorf("dropped = %v, want just the library snapshot", dropped)
	}
	if strings.Contains(got, words(400)) {
		t.Error("the library snapshot should not have fitted")
	}

	// A budget that covers everything drops nothing.
	if _, dropped := assembleSystemPrompt(head, sections, tail, 10_000); len(dropped) != 0 {
		t.Errorf("a roomy budget dropped %v", dropped)
	}
}

func TestFitChatTurnKeepsCoreAndReportsWhatGave(t *testing.T) {
	history := []chatMessage{}
	for i := 0; i < 40; i++ {
		history = append(history, chatMessage{Role: "user", Content: words(60)}, chatMessage{Role: "assistant", Content: words(60)})
	}
	sections := []promptSection{
		{Name: "your library", Rank: rankLibrarySnapshot, Text: words(300)},
		{Name: "what she remembers about you", Rank: rankMemoryList, Text: words(60)},
	}
	core := words(300)
	tail := words(200)

	// A roomy window fits everything: nothing dropped, nothing squeezed, no note.
	msgs, reply, report, err := fitChatTurn(core, sections, tail, history, 32768, 220)
	if err != nil {
		t.Fatalf("roomy window: %v", err)
	}
	if report.Note != "" || report.Dropped != 0 || len(report.DroppedSections) != 0 || report.Squeezed {
		t.Errorf("roomy window should fit cleanly, got %+v", report)
	}
	if reply != 220 {
		t.Errorf("reply allowance = %d, want the preset's 220", reply)
	}
	if len(msgs) != len(history)+1 {
		t.Errorf("sent %d messages, want %d + the system prompt", len(msgs), len(history))
	}

	// A tight window drops older history and says so — and the newest exchange survives,
	// because that is what the reply has to answer.
	msgs, _, report, err = fitChatTurn(core, sections, tail, history, 4096, 220)
	if err != nil {
		t.Fatalf("tight window: %v", err)
	}
	if report.Dropped == 0 {
		t.Error("a tight window should have dropped older messages")
	}
	if report.Note == "" {
		t.Error("anything dropped must produce a user-facing note")
	}
	if last := msgs[len(msgs)-1]; last.Content != history[len(history)-1].Content {
		t.Error("the newest message must always be sent")
	}
	if msgs[0].Role != "system" || !strings.HasPrefix(msgs[0].Content, core) {
		t.Error("the core prompt must lead, untouched")
	}
	if report.CoreTokens == 0 || report.PromptTokens > 4096 {
		t.Errorf("prompt does not fit its own report: %+v", report)
	}

	// Her prompt alone larger than the window is the one unservable case: sending it would
	// have the backend truncate the card off the front, so it fails with an explanation.
	if _, _, report, err := fitChatTurn(words(5000), nil, "", history, 4096, 220); err == nil {
		t.Error("an oversized core prompt should be refused, not truncated")
	} else if !strings.Contains(report.Note, "context window") {
		t.Errorf("refusal note should name the cause, got %q", report.Note)
	}
}

func TestDigestMessagesKeepsTheNewest(t *testing.T) {
	var dropped []chatMessage
	for i := 0; i < digestLines+5; i++ {
		dropped = append(dropped, chatMessage{Role: "user", Content: words(3) + " marker" + string(rune('a'+i))})
	}
	digest := digestMessages(dropped)
	// The tail of the dropped run is what still bears on the conversation.
	if !strings.Contains(digest, "marker"+string(rune('a'+len(dropped)-1))) {
		t.Error("digest should keep the newest dropped message")
	}
	if strings.Contains(digest, "markera") {
		t.Error("digest should have shed the oldest dropped messages")
	}
	// Roles are labelled as her and them, never as "assistant"/"user".
	if strings.Contains(digest, "assistant") || strings.Contains(digest, "role") {
		t.Errorf("digest leaks protocol vocabulary: %q", digest)
	}
	if digestMessages(nil) != "" {
		t.Error("nothing dropped means no digest")
	}
}
