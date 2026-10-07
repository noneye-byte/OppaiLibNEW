package api

import (
	"net/http"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/settings"
)

// The rules under her tags that outlived them: rooms resolve, boundaries hold, offers are
// validated, and she fits the windows she runs in. Each was tested through the tag that
// carried it; these test it through the tool that carries it now.

func TestRoomsStoreResolveAndAreToldToHer(t *testing.T) {
	s, token := newTestServer(t)
	bedroom := seedBackground(t, s, token, "Bedroom", "bed", "night", "lamp")
	kitchen := seedBackground(t, s, token, "Kitchen", "morning", "coffee")
	list := s.listLibbyBackgrounds()
	if len(list) != 2 || !list[0].HasImage {
		t.Fatalf("list = %+v", list)
	}
	for _, tc := range []struct {
		label, want string
		ok          bool
	}{
		{"Bedroom", bedroom, true},
		{"bedroom", bedroom, true},
		{"somewhere with coffee", kitchen, true},
		{"going to bed now", bedroom, true},
		{"none", "", true},
		{"the moon", "", false},
	} {
		got, ok := resolveBackground(tc.label, list)
		if got != tc.want || ok != tc.ok {
			t.Errorf("%q: (%q, %v), want (%q, %v)", tc.label, got, ok, tc.want, tc.ok)
		}
	}
	directive := placeToolDirective(list, kitchen, false)
	for _, want := range []string{"set_state's place", "Bedroom (bed, night, lamp)", "Right now you are in Kitchen"} {
		if !strings.Contains(directive, want) {
			t.Fatalf("directive missing %q: %s", want, directive)
		}
	}
	if placeToolDirective(nil, "", false) != "" {
		t.Fatal("a directive with nowhere to go")
	}
	if !strings.Contains(placeToolDirective(nil, "", true), "yours to make") {
		t.Fatal("with a generator she was not told she can make a place")
	}
}

func TestARememberedBoundaryRulesAStateOutOfTheToolToo(t *testing.T) {
	store := libbyMemoryStore{Memories: []libbyMemory{
		{Text: "They asked me never to bring toys into it", Kind: memoryBoundary},
		{Text: "They love it when I tease", Kind: memoryPreference},
	}}
	limits := activityLimits(store)
	if !limits["vibrator"] || !limits["dildo"] || limits["teasing"] || limits["fingering"] {
		t.Fatalf("limits = %v", limits)
	}
	if withinLimits(allowedActivity("vibrator", 5), limits) != "" {
		t.Error("the heat gate let a limited state through")
	}
	if directive := activityToolDirective(5, "", limits); strings.Contains(directive, "vibrator") || !strings.Contains(directive, "fingering") {
		t.Errorf("the vocabulary did not follow the limits: %s", directive)
	}
	blanket := activityLimits(libbyMemoryStore{Memories: []libbyMemory{{Text: "keep it clean, nothing sexual", Kind: memoryBoundary}}})
	for _, a := range libbyActivities {
		if a.Group == activityIntimate && !blanket[a.ID] {
			t.Errorf("%s survived a blanket limit", a.ID)
		}
		if a.Group == activityIdle && blanket[a.ID] {
			t.Errorf("%s, an idle state, was ruled out", a.ID)
		}
	}
}

func TestActivitySlotsAreDistinctFromEmotions(t *testing.T) {
	seen := map[string]bool{}
	for _, slot := range libbySlots {
		if seen[slot] || !libbySlotValid(slot) {
			t.Fatalf("slot %q is repeated or refused", slot)
		}
		seen[slot] = true
	}
	for _, activity := range libbyActivities {
		if libbyEmotionValid(activity.ID) || activity.Says == "" || activity.Label == "" {
			t.Fatalf("the state %q collides with an emotion or has nothing to show", activity.ID)
		}
	}
}

func TestPictureRequestSubject(t *testing.T) {
	cases := map[string]string{
		"Can you send me a snap of you in the tub with bubbles": "tub with bubbles",
		"send me a pic of you": "",
		"send me a nude":       "nude",
		"send me nudes":        "nude",
		"Hey babe can you send me a picture of you nude? A new one":        "nude",
		"let me see you in the red dress":                                  "red dress",
		"pic of you wearing the black tank top":                            "black tank top",
		"i want to see you":                                                "",
		"How about one of you in a cat maid outfit?":                       "cat maid outfit",
		"I just wanna see you in a green sundres... please babe for me :3": "green sundress",
	}
	for text, want := range cases {
		if got := pictureRequestSubject(text); got != want {
			t.Errorf("pictureRequestSubject(%q) = %q, want %q", text, got, want)
		}
	}
}

func TestACopiedCatalogueLineIsNotSpeech(t *testing.T) {
	if got, emptied := scrubDirectivesReporting("[attach: 0f2e_86c.mp4] (gif; square)"); !emptied {
		t.Fatalf("a reply that was only a tag and a catalogue line came back as %q", got)
	}
	got, _ := scrubDirectivesReporting("it’s in the hentai folder — 1788917477638.mp4\n(video; 1girl, anus, ass, photo (medium), pussy, solo)\n\nyou can watch it anytime.")
	if strings.Contains(got, "1girl") || strings.Contains(got, "(video") || !strings.Contains(got, "anytime") {
		t.Fatalf("scrubbed = %q", got)
	}
}

// An offer is the same validated proposal it always was: a rename of a real title to a
// different one, approved and performed by the act endpoint.
func TestARenameSheOffersIsACardAndAllowPerformsIt(t *testing.T) {
	s, token, _ := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("That name is a serial number. Want me to?",
			callTool("o", toolOffer, map[string]any{"kind": "rename", "item": "Untitled import 4192", "value": `"Beach afternoon"`}))
	})
	id := seedTitledMedia(t, s, "Untitled import 4192", "video", "beach")
	runTurn(t, s, token, turnFor("can you rename that untitled video to something better?", ""))
	c := storedConversation(t, s)
	last := c.Messages[len(c.Messages)-1]
	if len(last.Actions) != 1 || last.Actions[0].Kind != "rename" || last.Actions[0].MediaID != id || last.Actions[0].Title != "Beach afternoon" {
		t.Fatalf("actions = %+v", last.Actions)
	}
	rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/act", `{"kind":"rename","mediaId":`+jsonInt(id)+`,"title":"Beach afternoon"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("act: %d %s", rec.Code, rec.Body)
	}
	item, _ := s.db.GetMedia(t.Context(), id)
	if got := s.decrypt(item.TitleEnc, "title"); got != "Beach afternoon" {
		t.Fatalf("title after rename = %q", got)
	}
}

func TestServerOffersNeedTheServerCapabilityAndARealModel(t *testing.T) {
	s, _ := newTestServer(t)
	caps := actionCapabilities{Library: true, Models: []string{"Qwen3-32B-Q4_K_M"}}
	for _, v := range offerVerbs(caps) {
		if v == "load" || v == "cleanup" {
			t.Fatalf("%s offered without the server capability", v)
		}
	}
	caps.Server = true
	if _, ok := s.buildLibbyAction("load", offerArgument("load", "", "Qwen3-32B-Q4_K_M"), caps, nil); !ok {
		t.Fatal("a listed model could not be offered")
	}
	if _, ok := s.buildLibbyAction("load", offerArgument("load", "", "Llama-3.3-70B"), caps, nil); ok {
		t.Fatal("an invented model became a card")
	}
}

// Every tool's definition is rendered into her prompt. A window that cannot hold the
// full set gets fewer tools rather than no her: at 4K what is fixed — her card, her
// self-knowledge, how she speaks and acts, and the tools — must leave room for the
// conversation and a reply.
func TestHerFixedPromptAndToolsFitTheWindowsSheRunsIn(t *testing.T) {
	card := defaultLibbyCard()
	fixed := estimateTokens(strings.Join([]string{
		libbyAutonomousStyle, libbyAdultStance, card.Description, card.Appearance, card.Personality, card.Kinks,
		card.Routine, card.Tastes, card.Limits, card.Scenario, card.ExampleDialogue, card.SystemPrompt,
		(&Server{}).libbySelfDirective(settings.Settings{ImageGenURL: "x"}, card), linkDirective,
		feelingsPromptBlock("hello"), moodMovementDirective, heatScaleDirective, toolDirective, textCountDirective(2),
	}, "\n"))
	everything := toolsetOptions{libby: true, camera: true, edit: true, clip: true, saved: true, voice: true, emotions: libbyEmotions,
		activities: []string{"reading", "gaming", "lounging", "drinking", "eating", "stretching", "napping", "dancing", "tidying", "drawing", "waving"},
		places:     []string{"Bedroom", "Kitchen"}}
	for _, window := range []int{4096, 8192, 32768} {
		o := everything
		o.level = toolLevelFor(window)
		cost := fixed + toolsTokens(libbyToolset(o))
		t.Logf("%d-token window: fixed %d + tools = %d", window, fixed, cost)
		// At least a quarter of the window left for her memory, the conversation and
		// the reply — and more than that wherever there is room.
		if left := window - cost; left < window/4 {
			t.Errorf("at %d tokens only %d are left after her fixed prompt and tools", window, left)
		}
	}
}

// The browse-together drawer is commentary, not correspondence: she answers it with her
// whole self, and none of the lines is filed in a conversation.
func TestAnEphemeralTurnAnswersAndKeepsNothing(t *testing.T) {
	s, token, f := turnServer(t, func(n int, body map[string]any) (int, map[string]any) {
		return http.StatusOK, say("ooh that one's good", callTool("s", toolSetState, map[string]any{"mood": "excited"}))
	})
	events := runTurn(t, s, token, `{"ephemeral":true,"characterId":"libby","mode":"playful","emotion":"happy","intensity":2,`+
		`"history":[{"role":"user","content":"look at this"}],"cue":"(I have just opened \"Night Drive\". Say what you think of it.)"}`)
	if len(eventsNamed(events, "message")) != 1 || len(eventsNamed(events, "state")) != 1 {
		t.Fatalf("events = %+v", events)
	}
	body := mustJSON(lastChat(f))
	if !strings.Contains(body, "Night Drive") || !strings.Contains(body, "look at this") {
		t.Fatal("the cue or the drawer's history did not reach her")
	}
	u, _ := s.db.UserByName(t.Context(), "tester")
	ws, _ := s.readChatWorkspace(u.ID)
	if len(ws.Conversations) != 0 {
		t.Fatalf("an ephemeral turn filed a conversation: %+v", ws.Conversations)
	}
}
