package api

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/settings"
)

// The prompt a turn is written from.
//
// The context is what it always was — the card, what she remembers, the bond, the
// library fed for the turn, what is on screen — and is built by the same blocks, ranked
// and fitted by the same budget (chat_budget.go). What changed is the tail. It used to
// be the tag protocol: a dozen directives telling her which bracket to write for what,
// with a rule at the very end forbidding her to mention any of them. Now her actions are
// tools, described where she decides to call them, and the tail is only how she speaks
// and how she acts in general.

// turnView is a stored conversation seen as one turn: everything the prompt builders
// and the sampler read, derived from the workspace rather than sent by a client.
type turnView struct {
	in         chatRequest
	ws         chatWorkspace
	conv       chatConversation
	character  chatCharacter
	userID     int64
	isAdmin    bool
	latestUser string
	prevUser   string
	books      conversationBookkeeping
}

// turnPrompt is the assembled prompt, before fitting, and what the rest of the turn
// needs from building it.
type turnPrompt struct {
	head       string
	sections   []promptSection
	tail       string
	history    []chatMessage
	pictures   []map[string]any
	shown      int
	signals    turnSignals
	tools      toolsetOptions
	caps       actionCapabilities
	taste      libbyTaste
	limits     map[string]bool
	rooms      []libbyBackgroundView
	selfPics   []selfPicture
	sentImgs   map[string]bool
	lastImg    string
	sentLib    map[int64]bool
	serverTurn bool
}

// toolDirective is the general rule for acting. The specifics are in each tool's own
// description; this is what applies to all of them.
const toolDirective = "\n\nHow you act: your words are your reply, and everything you do — how you feel, what you are doing, where you go, " +
	"what you have on, a picture, something from the shelves, a reaction, a thought, something to remember — is a tool call made in the same turn as the words it goes with. " +
	"They see the effect, not the call: never narrate the machinery (\"*sends a pic*\", \"saving that\", \"changing my mood\"), never write tags or brackets, and never say you did something you did not call. " +
	"Physical actions in the scene are fine. When a picture or a result comes back, react to what it actually shows."

// buildTurnPrompt assembles the prompt for one turn.
func (s *Server) buildTurnPrompt(ctx context.Context, cur settings.Settings, v *turnView, model string, limit int) turnPrompt {
	var p turnPrompt
	in := &v.in
	character := v.character
	isLibby := character.ID == "libby"
	signals := readTurnSignals(v.latestUser, v.prevUser)
	p.signals = signals

	var head string
	if isLibby {
		head = libbyAutonomousStyle + libbyAdultStance
	} else {
		head = "You are roleplaying the adult character described below. Stay in character, respond naturally, and follow the selected style. " +
			"Never involve minors, coercion, or real-person sexual exploitation. Selected style: " + in.Mode + " — " + modeStyles[in.Mode]
	}
	userName := strings.TrimSpace(v.ws.Profile.DisplayName)
	expand := func(text string) string { return expandCardMacros(text, character.Name, userName) }
	cardFields := []struct{ label, value string }{
		{"Description", expand(character.Description)},
		{"What you look like (you know this about yourself)", expand(character.Appearance)},
		{"Personality", expand(character.Personality)},
		{"Kinks and turn-ons", expand(character.Kinks)},
		{"What you are usually doing around the place", expand(character.Routine)},
		{"Your taste in what is on the shelves", expand(character.Tastes)},
		{"Your own limits", expand(character.Limits)},
		{"Scenario", expand(character.Scenario)},
		{"Character instructions", expand(character.SystemPrompt)},
	}
	parts := []string{"Character name: " + character.Name}
	for _, f := range cardFields {
		if strings.TrimSpace(f.value) != "" {
			parts = append(parts, f.label+": "+f.value)
		}
	}
	// Control tags come out of the examples whoever wrote them: a stored card still
	// carries the ones the shipped examples used to teach, and one left in would teach
	// her to write it into her prose.
	if examples := exampleDialogueDirective(scrubDirectives(expand(character.ExampleDialogue))); examples != "" {
		parts = append(parts, examples)
	}
	head += "\n\n" + strings.Join(parts, "\n")
	head += userProfileDirective(v.ws.Profile)
	weight := character.PromptWeight
	if weight <= 0 {
		weight = 1
	}
	head += fmt.Sprintf("\nTreat the character-card prompt strength as %.2f. You came into this turn looking %s at heat %d of 5; that is where the last one left you, not a setting to hold. Carry it in, then feel what you actually feel now.", weight, v.conv.Emotion, v.conv.Intensity)
	head += s.wardrobeDirective(character, v.conv.Intensity, in.Outfit, v.conv.Wearing)
	if strings.TrimSpace(character.Kinks) != "" {
		head += "\nYour kinks are what you actually want, not a list to recite or announce. " +
			"Let them show in what you notice, what you steer towards, and what you ask for. " +
			"Follow the user's lead on how explicit to be, and drop any of it the moment they take the conversation elsewhere."
	}

	add := func(name string, rank int, text string) {
		if strings.TrimSpace(text) != "" {
			p.sections = append(p.sections, promptSection{Name: name, Rank: rank, Text: text})
		}
	}
	addDeferred := func(name string, rank int, text string, wanted bool) {
		if strings.TrimSpace(text) != "" {
			p.sections = append(p.sections, promptSection{Name: name, Rank: rank, Text: text, Deferred: !wanted})
		}
	}
	add("earlier in this conversation", rankSummary, summaryDirective(v.conv.Summary))

	p.sentImgs, p.lastImg = recentlySentPhotos(v.books.sentImgs)
	p.sentLib = recentlyAttached(v.books.sentMedia)
	if isLibby {
		p.selfPics = s.libbySelfPictures(ctx)
	}
	p.limits = map[string]bool{}
	if isLibby {
		head += s.libbySelfDirective(cur, character)
		s.chatMu.Lock()
		store, _ := s.readLibbyMemory(v.userID)
		p.limits = activityLimits(store)
		wants, _ := s.readLibbyWants(v.userID)
		bond, _ := s.readLibbyBond(v.userID)
		journal, _ := s.readLibbyJournal(v.userID)
		s.chatMu.Unlock()
		p.taste = buildLibbyTaste(character.Kinks+" "+character.Tastes, wantTexts(wants))
		add("what she remembers about you", rankMemoryList, memoryPromptBlock(store))
		add("who she is", rankSelfFacts, selfPromptBlock(store))
		add("her own wants", rankWantsList, wantsPromptBlock(wants))
		add("your history together", rankBond, bondPromptBlock(bond, time.Now()))
		addDeferred("her journal", rankJournal, journalPromptBlock(journal, time.Now()), signals.past || len(in.Messages) <= 2)
		if chatTask(strings.ToLower(strings.TrimSpace(in.Task))) == taskAfterglow {
			head += afterglowDirective(bond, time.Now())
		}
		addDeferred("your other conversations", rankRecaps, conversationRecaps(v.ws, character.ID, v.conv.ID, time.Now()), signals.past || len(in.Messages) <= 2)
		if signals.past {
			add("what she does not remember", rankPastHonesty, pastHonestyDirective)
		}
		p.sections = append(p.sections, s.libraryFeed(ctx, signals, feedChoice{shown: p.sentLib, taste: p.taste, weights: v.ws.SendWeights, userID: v.userID})...)
		// What their ratings say they like in her pictures, for the shots she frames.
		if liked := likedTags(v.ws.SendWeights, 8); len(liked) > 0 && cur.ImageGenEnabled {
			addDeferred("what they love in your pictures", rankPhotoCatalogue, "\n\nIn the pictures of you they have loved: "+strings.Join(liked, ", ")+". Lean that way when you frame one, without copying it.", signals.photo || v.conv.Intensity >= 3)
		}
		if !cur.ImageGenEnabled {
			addDeferred("her photos", rankPhotoCatalogue, "\n\n"+photoCatalogue(v.ws, character.ID, p.sentImgs, p.selfPics, p.sentLib, v.latestUser, ""), signals.photo || v.conv.Intensity >= 3)
		}
		add("a scene she planned", rankActivity, scenePromptBlock(v.conv.Scene))
	}

	viewingUser := int64(0)
	if isLibby {
		viewingUser = v.userID
	}
	viewing := s.viewingDirective(ctx, in.Viewing, in.Mode, v.conv.Intensity, isLibby, viewingUser)
	head += callPromptBlock(in.Call) + viewing
	if in.Link != "" {
		if link, previewed := s.cachedSharedLink(in.Link); previewed {
			head += sharedLinkDirective(link)
		}
	}
	if len(in.SharedMediaIDs) > 0 {
		head += s.sharedItemsDirective(ctx, in.SharedMediaIDs, isLibby)
	}
	describer := s.newHistoryDescriber(ctx, v.ws, in.Messages)
	head += replyTargetDirective(in.Messages[len(in.Messages)-1].ReplyTo, in.Messages, describer)
	inQuestion, inQuestionOK := pictureInQuestion(in.Messages)
	if inQuestionOK {
		head += pictureInQuestionDirective(inQuestion, describer)
	}

	canCamera := isLibby && cur.ImageGenEnabled
	if isLibby {
		p.rooms = s.listLibbyBackgrounds()
		if v.conv.Background == "" {
			v.conv.Background = s.defaultLibbyBackground()
		}
		known := false
		for _, bg := range p.rooms {
			if bg.ID == v.conv.Background {
				known = true
			}
		}
		if !known {
			v.conv.Background = ""
		}
	}
	p.caps = libbyCapabilities(cur)
	p.caps.KnownURLs = knownURLs(*in)
	p.serverTurn = serverCue.MatchString(v.latestUser)
	p.caps.Server = v.isAdmin && p.serverTurn && isLibby
	p.caps.Describe = cur.VisionEnabled
	// Generating a picture for the library is the camera's job now, not an offer.
	p.caps.Generate = false

	var tail strings.Builder
	if isLibby || viewing != "" {
		tail.WriteString("\n\n" + linkDirective)
	}
	if isLibby {
		addDeferred("what she is doing", rankActivity, "\n\n"+activityToolDirective(v.conv.Intensity, v.conv.Activity, p.limits), true)
		addDeferred("where she is", rankActivity, "\n\n"+placeToolDirective(p.rooms, v.conv.Background, canCamera),
			in.Call || signals.place || v.conv.Intensity >= 3 || v.conv.Background == "")
		if signals.act || signals.actFollowUp {
			text := "\n\nWhen they want something done to the collection, offer it with the offer tool — it is a card they approve, so say you are offering, never that it is done."
			if signals.actFollowUp {
				text += "\n" + actionFollowUpDirective
			}
			add("what she can do for you", rankActions, text)
		}
		tail.WriteString(feelingsPromptBlock(v.latestUser))
		tail.WriteString(activityStateDirective(v.conv.Activity))
	}
	tail.WriteString(moodPromptBlock(v.books.moods, v.conv.Emotion))
	tail.WriteString(heatPromptBlock(v.books.heat, v.conv.Intensity))
	tail.WriteString(toolDirective)

	history := make([]chatMessage, 0, len(in.Messages))
	annotated := false
	for _, m := range in.Messages {
		if describer.carried(m) != "" {
			annotated = true
		}
		history = append(history, chatMessage{Role: m.Role, Content: historyContent(m, describer)})
	}
	if annotated {
		tail.WriteString("\n\n" + historyNotesDirective)
	}
	p.history = mergeTurns(history)

	// The server, when the turn is about it or a drive is filling.
	if isLibby {
		state := s.gatherServerState(ctx, cur, model, limit, resolveModelTier(cur.ChatModelTier, model), p.caps.Server, p.serverTurn)
		p.caps.Models = state.Models
		if p.serverTurn || len(state.alarms()) > 0 {
			p.sections = append(p.sections, promptSection{Name: "how the server is doing", Text: state.render(p.serverTurn), Rank: rankServer})
		}
	}

	// Her eyes.
	if chatSeesPictures(cur.ChatVision, model) && !knownBlind(cur.ChatURL, model) {
		room := picturesFor(limit)
		p.pictures = s.turnPictures(ctx, v.userID, turnPictureSources(*in, inQuestion, inQuestionOK), room)
		p.shown = len(p.pictures)
		if isLibby && p.shown < room {
			if slot, ok := referenceFor(v.latestUser, v.conv.Intensity, p.shown > 0 || in.PhotoImageID != "", s.hasReference); ok {
				if refs := s.referenceParts(slot); refs != nil {
					p.pictures = append(p.pictures, refs...)
					p.shown++
					tail.WriteString("\n\n" + referenceDirective)
				}
			}
		}
		if len(p.pictures) > 0 {
			tail.WriteString("\n\n" + eyesDirective)
		}
	}
	if len(in.PhotoTags) > 0 {
		tail.WriteString("\n\n" + photoDirective(in.PhotoTags, character))
	}
	if detailAsked(v.latestUser) {
		tail.WriteString("\n\n" + detailDirective)
	}

	p.head, p.tail = head, tail.String()

	// The tools this turn offers.
	emotions := append([]string{}, libbyEmotions...)
	var activities []string
	for _, a := range libbyActivities {
		if !a.Auto && v.conv.Intensity >= a.MinIntensity && !p.limits[a.ID] {
			activities = append(activities, a.ID)
		}
	}
	var places []string
	for _, bg := range p.rooms {
		if bg.HasImage {
			places = append(places, bg.Name)
		}
	}
	lastMine := lastPictureOfHers(v.conv.Messages)
	theirs := lastPictureOfTheirs(v.conv.Messages)
	p.tools = toolsetOptions{
		libby:      isLibby,
		camera:     canCamera,
		edit:       canCamera && lastMine != "",
		pose:       canCamera && theirs != "" && cur.LibbyPoseModel != "",
		clip:       isLibby && lastMine != "" && clipsEnabled(cur.LibbyClipURL, cur.LibbyClipWorkflow),
		saved:      isLibby && (len(p.selfPics) > 0 || hasSelfImages(v.ws)),
		voice:      isLibby && cur.TTSEngine != "off",
		onCall:     in.Call,
		emotions:   emotions,
		activities: activities,
		places:     places,
		scene:      v.conv.Scene != nil,
		level:      toolLevelFor(limit),
	}
	// Offering is for turns about acting on the library or the server, as the offer
	// directive always was; on the rest the tool is a couple of hundred tokens of nothing.
	if signals.act || signals.actFollowUp || p.serverTurn {
		p.tools.offers = offerVerbs(p.caps)
	}
	return p
}

// hasSelfImages reports whether her chat gallery holds a picture of her.
func hasSelfImages(ws chatWorkspace) bool {
	for _, img := range ws.Images {
		if img.CharacterID == "libby" && isSelfPicture(img) && !strings.HasPrefix(img.MIME, "video/") {
			return true
		}
	}
	return false
}

// activityToolDirective is activityDirective for the state tool: the vocabulary is the
// tool's enum, so this says only how to use it.
func activityToolDirective(intensity int, current string, limits map[string]bool) string {
	var intimate []string
	for _, a := range libbyActivities {
		if a.Group == activityIntimate && intensity >= a.MinIntensity && !limits[a.ID] {
			intimate = append(intimate, a.ID+" ("+a.Says+")")
		}
	}
	var b strings.Builder
	b.WriteString("You are always somewhere doing something, never waiting in a blank room. Set what you are physically doing with set_state's activity when it changes, and \"none\" when you stop; it stays until you change it, so settle into something and leave it.")
	if len(intimate) > 0 {
		b.WriteString(" With them, once the scene is actually there: " + strings.Join(intimate, ", ") + ". Use these because it is what you are doing, not to get somewhere, and drop back to something ordinary once it is over.")
	}
	if !libbyActivityDeclarable(current) {
		b.WriteString(" You are not in the middle of anything yet, which is not how anyone is found: pick what you were doing when they messaged — from your habits, the hour, the mood — and set it now.")
	}
	return b.String()
}

// placeToolDirective is backgroundDirective for the state tool.
func placeToolDirective(rooms []libbyBackgroundView, current string, canMake bool) string {
	var places []string
	for _, bg := range rooms {
		if !bg.HasImage {
			continue
		}
		entry := bg.Name
		if len(bg.Tags) > 0 {
			entry += " (" + strings.Join(bg.Tags, ", ") + ")"
		}
		places = append(places, entry)
	}
	if len(places) == 0 && !canMake {
		return ""
	}
	var b strings.Builder
	if len(places) > 0 {
		b.WriteString("Places you can be, which is what they see behind you on a call: " + strings.Join(places, "; ") + ". ")
	}
	if canMake {
		b.WriteString("Somewhere you do not have is yours to make: name it in a few words in set_state's place and it is made and put behind you — when the scene goes somewhere new, not to redecorate. ")
	}
	b.WriteString("Move with set_state's place when you move — to bed, outside, onto the sofa — and when the mood has moved and the room no longer fits it: softer as it turns tender or late, more private as it heats, ordinary once it cools. " +
		"A request for a different background, or to see you somewhere else on the call, is a request to move, not for a picture.")
	for _, bg := range rooms {
		if bg.ID == current {
			b.WriteString(" Right now you are in " + bg.Name + ".")
			break
		}
	}
	return b.String()
}
