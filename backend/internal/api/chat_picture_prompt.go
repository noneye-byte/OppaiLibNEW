package api

import (
	"context"
	"regexp"
	"sort"
	"strings"
	"time"
)

// Writing the picture she is taking.
//
// The fresh picture's prompt was the request less the asking: "send me a pic of you rn"
// less its asking words is "rn", and "you rn" is what reached the generator — her
// likeness, her clothes, and two words that describe nothing. Every picture she took
// was the same woman standing nowhere, because nothing in the prompt said where she was,
// what she was doing, or how the picture was framed. The conversation knew all of it;
// the prompt was built from one line of it.
//
// So the picture is written by the model, after her reply, from what the server knows
// about the moment: what they asked for, what she just said as she took it, the room
// she is in, what she has on, what she is doing, and the words the generator already
// draws her with — the tags on the pictures of her. It is a separate, small, cold call
// rather than a tag in her reply, because her reply is already juggling a dozen
// directives and a small model drops the one at the end; asked for nothing but the
// picture, it writes the picture.
//
// Best-effort: a backend that fails, times out or answers in prose leaves the prompt
// as it was, which is a worse picture and not a missing one.

// pictureSceneMark opens the scene writer's instructions. Tests that stub the backend
// with one canned reply use it to tell this call from her turn.
const pictureSceneMark = "You write the prompt for an image generator."

// pictureScene is what the scene writer is told about the moment.
type pictureScene struct {
	// asked is their message asking to see her; subject is what they asked to see her
	// in, "" for just her (pictureRequestSubject).
	asked, subject string
	// reply is what she said as she took it.
	reply string
	// recent is the last few lines before the ask, for what the scene has been.
	recent []chatMessage
	// place, wearing and doing are her state leaving this turn, in words.
	place, wearing, doing string
	// vocabulary is the tags the pictures of her carry, most common first.
	vocabulary []string
}

const (
	pictureSceneTimeout  = 25 * time.Second
	pictureSceneTokens   = 160
	pictureSceneRecent   = 6
	pictureSceneVocab    = 40
	maxPictureSceneRunes = 400
)

// pictureSceneDirective is the scene writer's system message.
//
// Her likeness and her clothes are left out of what it writes because the server adds
// both (libbySelfiePrompt), from settings the user tuned; a model restating them in its
// own words changes her face and, via clothesFromSubject, what she is wearing.
func pictureSceneDirective() string {
	return pictureSceneMark + " The picture is a photo Libby is taking of herself right now, for the person she is texting. " +
		"Write it as comma-separated Danbooru-style tags on one line: the framing and camera angle (selfie, from above, full body, close-up, mirror selfie…), " +
		"her pose and what her hands are doing, her expression, where she is and what is around her, the lighting and time of day. " +
		"Make it match the conversation and what she just said, and give them exactly what they asked to see. " +
		"Do not describe her face, hair, body or clothes — those are added separately — unless they asked for different clothes or for none, and then name exactly that. " +
		"No sentences, no quotes, no explanation: 8 to 20 tags and nothing else."
}

// pictureSceneRequest is the user message: the moment, laid out as facts.
func pictureSceneRequest(sc pictureScene) string {
	var b strings.Builder
	if len(sc.recent) > 0 {
		b.WriteString("The conversation just before:\n")
		for _, m := range sc.recent {
			who := "Them"
			if strings.EqualFold(m.Role, "assistant") {
				who = "Libby"
			}
			text := strings.Join(strings.Fields(scrubDirectives(m.Content)), " ")
			if text == "" {
				continue
			}
			b.WriteString(who + ": " + truncateRunes(text, 300) + "\n")
		}
		b.WriteString("\n")
	}
	b.WriteString("They asked: " + truncateRunes(strings.TrimSpace(sc.asked), 300) + "\n")
	if sc.subject != "" {
		b.WriteString("What they asked to see: " + sc.subject + "\n")
	}
	if reply := strings.Join(strings.Fields(sc.reply), " "); reply != "" {
		b.WriteString("Libby, taking it: " + truncateRunes(reply, 400) + "\n")
	}
	if sc.place != "" {
		b.WriteString("Where she is: " + sc.place + "\n")
	}
	if sc.wearing != "" {
		b.WriteString("What she has on: " + sc.wearing + "\n")
	}
	if sc.doing != "" {
		b.WriteString("What she is doing: " + sc.doing + "\n")
	}
	if len(sc.vocabulary) > 0 {
		b.WriteString("Tags the generator already draws her with, to borrow from where they fit: " + strings.Join(sc.vocabulary, ", ") + "\n")
	}
	b.WriteString("\nThe tags:")
	return b.String()
}

// sceneLeadIn is what a model puts in front of the tags when it cannot help itself.
var sceneLeadIn = regexp.MustCompile(`(?i)^\s*(?:(?:here(?:'s| is| are)[^:\n]*|the )?(?:tags|prompt|picture)\s*:)\s*`)

// cleanPictureScene reads the scene writer's answer, or "" when it did not write tags.
//
// A reply in prose — "one sec, let me grab my phone" — is her voice leaking into a call
// that was not hers, and fed to the generator it draws a phone. Tags have commas; a
// line with fewer than three parts is not a list of them.
func cleanPictureScene(raw string) string {
	raw = strings.TrimSpace(scrubDirectives(raw))
	if line, _, found := strings.Cut(raw, "\n"); found {
		raw = line
	}
	raw = sceneLeadIn.ReplaceAllString(raw, "")
	raw = strings.Trim(raw, " \t\"'`*.")
	var kept []string
	seen := map[string]bool{}
	for _, part := range strings.Split(raw, ",") {
		part = strings.Trim(strings.TrimSpace(part), "\"'`*.")
		// "you" and "Libby" are who, not what: the likeness says who.
		lower := strings.ToLower(part)
		if part == "" || seen[lower] || lower == "you" || lower == "libby" {
			continue
		}
		seen[lower] = true
		kept = append(kept, part)
	}
	if len(kept) < 3 {
		return ""
	}
	return truncateRunes(strings.Join(kept, ", "), maxPictureSceneRunes)
}

// freshPicturePrompt is the prompt the picture is generated from: what they asked for
// first, since that is the one part that must be in it, then the scene written for it.
// Without a scene it is the old form, which still says what was asked.
func freshPicturePrompt(subject, scene string) string {
	switch {
	case scene == "" && subject == "":
		return "you, a selfie"
	case scene == "":
		return "you " + subject
	case subject == "":
		return scene
	}
	return subject + ", " + scene
}

// pictureVocabulary is the tags on the pictures of her, most common first: the words
// this generator already draws her with. Her identity tag and the tags that name her
// are dropped, since the likeness is added separately.
func pictureVocabulary(ws chatWorkspace, selfPics []selfPicture) []string {
	counts := map[string]int{}
	for _, img := range ws.Images {
		if img.CharacterID == "libby" && isSelfPicture(img) {
			for _, tag := range img.Tags {
				counts[normalizeChatTag(tag)]++
			}
		}
	}
	for _, pic := range selfPics {
		for _, tag := range pic.tags {
			counts[normalizeChatTag(tag)]++
		}
	}
	delete(counts, "")
	delete(counts, "libby")
	delete(counts, libbyIdentityTag)
	tags := make([]string, 0, len(counts))
	for tag := range counts {
		if strings.Contains(tag, ":") {
			continue
		}
		tags = append(tags, tag)
	}
	sort.Slice(tags, func(i, j int) bool {
		if counts[tags[i]] != counts[tags[j]] {
			return counts[tags[i]] > counts[tags[j]]
		}
		return tags[i] < tags[j]
	})
	return tags[:min(len(tags), pictureSceneVocab)]
}

// recentBeforeAsk is the last few messages before the one asking, which is given on
// its own line.
func recentBeforeAsk(messages []chatMessage) []chatMessage {
	if len(messages) < 2 {
		return nil
	}
	earlier := messages[:len(messages)-1]
	return earlier[max(0, len(earlier)-pictureSceneRecent):]
}

// backgroundWords is a room in words: its name and what it was tagged as.
func backgroundWords(id string, backgrounds []libbyBackgroundView) string {
	for _, bg := range backgrounds {
		if bg.ID == id {
			words := strings.TrimSpace(bg.Name)
			if len(bg.Tags) > 0 {
				words += " (" + strings.Join(bg.Tags, ", ") + ")"
			}
			return words
		}
	}
	return ""
}

// writePictureScene asks the model for the picture, or returns "" when it could not.
func (s *Server) writePictureScene(ctx context.Context, model string, sc pictureScene) string {
	ctx, cancel := context.WithTimeout(ctx, pictureSceneTimeout)
	defer cancel()
	payload := map[string]any{
		"messages": []chatMessage{
			{Role: "system", Content: pictureSceneDirective()},
			{Role: "user", Content: pictureSceneRequest(sc)},
		},
		"stream": false, "temperature": 0.5, "top_p": 0.9, "max_tokens": pictureSceneTokens,
	}
	if model != "" {
		payload["model"] = model
	}
	raw, err := s.postChatCompletion(ctx, payload)
	if err != nil {
		s.log.Debug("libby picture scene", "err", err)
		return ""
	}
	return cleanPictureScene(raw)
}
