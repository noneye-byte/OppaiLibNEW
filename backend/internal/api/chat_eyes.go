package api

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/vision"
)

// Her own eyes.
//
// Until now Libby never saw a picture. A photo shared with her reached her as the
// tagger's word list, and prose about a picture came from a separate vision model on
// its own endpoint. Both were right for the card this was written against: an 8 GB
// card holds one model, that model has to be picked for obedience to her tag protocol,
// and the obedient small models are text-only builds.
//
// A 32 GB card changes the first half of that. The 24B–32B models that card is bought
// to run are, more often than not, multimodal — Mistral-Small-3.1/3.2, Gemma 3, the
// Qwen-VL family — so the model already answering her is one that can look. Handing it
// six tags about a picture it could simply have been shown is the same waste as the
// repetition penalty chat_model_tier.go takes off: a crutch the model no longer needs,
// and one that costs her the point. "What do you think of my outfit" answered from
// "1girl, skirt, standing, indoors" is not an answer about the outfit.
//
// So on a turn that carries a picture, and when her model can see, the picture goes to
// her with the user's words. Three things are deliberate:
//
//   - The tags still go too. A backend that accepts image parts and quietly drops them
//     — a text-only GGUF loaded without its projector does exactly that on some
//     loaders — would otherwise leave her told "you can see it" and seeing nothing,
//     which is how a model invents a picture. With the tags beside it she is grounded
//     either way, and the directive tells her the picture wins where they disagree.
//   - A backend that refuses images is retried once without them, and remembered, so
//     "auto" is safe to leave on: the cost of guessing wrong is one failed request per
//     model per half hour, never a turn she cannot answer.
//   - Only this turn's pictures are sent. The history keeps describing earlier ones in
//     words, which is what keeps the front of the prompt byte-identical from turn to
//     turn and so cacheable by the backend. A picture in the last message costs one
//     turn's prefill; a picture in every message of the history costs every turn's.

const (
	// pictureEdge is the longer side a picture is shown to her at. Below the describer's
	// 1024: at 896 the common multimodal encoders land close to a thousand tokens a
	// picture (Qwen-VL's 28px merged patches, Pixtral's 32), and she is being asked to
	// react to a photo, not to read the fine print in it.
	pictureEdge = 896
	// pictureTokens is what one picture is budgeted at, at pictureEdge. An estimate on
	// the high side of the encoders above, because an underestimate here is the one
	// that silently truncates the front of the prompt — her character card.
	pictureTokens = 1100
	// maxTurnPictures caps the pictures in one turn whatever the window: a shared GIF
	// and a photo and the picture they are asking about, and not a slideshow.
	maxTurnPictures = 6
	// pictureWindowShare is the most of the window pictures may take between them. A
	// quarter keeps her card, the protocol and a real history in the rest — so an 8K
	// window sees one picture and a 32K window sees the full six.
	pictureWindowShare = 4
	// blindRememberedFor is how long a model that refused a picture is believed. Long
	// enough not to fail a request every turn, short enough that loading its projector
	// and trying again is noticed the same evening.
	blindRememberedFor = 30 * time.Minute
	// libraryPictureTimeout bounds reading one library item's frames on the chat path.
	libraryPictureTimeout = 15 * time.Second
)

// visionModelName reads a model name as a multimodal one.
//
// A name is not proof: a Mistral-Small-3.2 GGUF loaded without its mmproj file is text-
// only whatever it is called. That is why this only decides "auto", why a refusal is
// remembered, and why the tags travel with the picture regardless.
var visionModelName = regexp.MustCompile(`(?i)(^|[^a-z0-9])(vl|vlm|vision|llava|bakllava|pixtral|gemma-?3|mistral-small-3\.[12]|minicpm-?v|internvl|moondream|llama-?4|qwen2\.5-?omni|qwen3-?vl|molmo|idefics|phi-?3\.5-vision|phi-?4-multimodal)([^a-z0-9]|$)`)

// chatSeesPictures says whether this turn's pictures should be sent to her as
// pictures: what the operator set, or — on auto — what the model's name says.
func chatSeesPictures(setting, modelName string) bool {
	switch setting {
	case "on":
		return true
	case "off":
		return false
	}
	return visionModelName.MatchString(modelName)
}

// blindModels remembers which backends refused a picture. Keyed by URL and model: the
// same name behind a different loader, or the same loader after a reload with the
// projector, is a different answer.
var blindModels = struct {
	mu sync.Mutex
	at map[string]time.Time
}{at: map[string]time.Time{}}

func blindKey(url, model string) string { return url + "\x00" + model }

// rememberBlind records that this backend refused a picture.
func rememberBlind(url, model string) {
	blindModels.mu.Lock()
	blindModels.at[blindKey(url, model)] = time.Now()
	blindModels.mu.Unlock()
}

// knownBlind reports whether this backend refused a picture recently.
func knownBlind(url, model string) bool {
	blindModels.mu.Lock()
	defer blindModels.mu.Unlock()
	at, ok := blindModels.at[blindKey(url, model)]
	if ok && time.Since(at) > blindRememberedFor {
		delete(blindModels.at, blindKey(url, model))
		return false
	}
	return ok
}

// picturesFor is how many pictures a window of limit tokens can afford.
func picturesFor(limit int) int {
	n := limit / pictureWindowShare / pictureTokens
	if n > maxTurnPictures {
		n = maxTurnPictures
	}
	if n < 0 {
		n = 0
	}
	return n
}

// eyesDirective tells her the pictures are real. Removed again, word for word, when a
// backend refuses them and the turn is retried blind — see withoutEyes.
const eyesDirective = "The pictures attached to their latest message are real and you can see them. " +
	"Answer from what you actually see — colours, faces, clothes, what is happening, what it makes you feel — the way someone looking at a photo on their phone would. " +
	"Anything written above about what a picture shows came from a scanner: where it and the picture disagree, the picture is right. " +
	"Never mention attachments, scanning or being able to see."

// pictureSource is one thing this turn could show her.
type pictureSource struct {
	chatImage string // a chat image id, theirs or hers
	mediaID   int64  // or a library item
}

// turnPictureSources is what this turn could show her, most important first: the photo
// they just sent, the picture they are asking about, the library items they attached.
func turnPictureSources(in chatRequest, inQuestion chatMessage, inQuestionOK bool) []pictureSource {
	var out []pictureSource
	seenImage := map[string]bool{}
	seenMedia := map[int64]bool{}
	addImage := func(id string) {
		if id != "" && !seenImage[id] {
			seenImage[id] = true
			out = append(out, pictureSource{chatImage: id})
		}
	}
	addMedia := func(id int64) {
		if id > 0 && !seenMedia[id] {
			seenMedia[id] = true
			out = append(out, pictureSource{mediaID: id})
		}
	}
	addImage(in.PhotoImageID)
	if inQuestionOK {
		addImage(inQuestion.ImageID)
		if len(inQuestion.MediaIDs) > 0 {
			addMedia(inQuestion.MediaIDs[0])
		}
	}
	for _, id := range in.SharedMediaIDs {
		addMedia(id)
	}
	return out
}

// turnPictures reads and encodes up to room pictures for this turn. Best-effort per
// picture: one that cannot be read is skipped, and she still has its tags.
func (s *Server) turnPictures(ctx context.Context, userID int64, sources []pictureSource, room int) []map[string]any {
	var parts []map[string]any
	for _, src := range sources {
		if len(parts) >= room {
			break
		}
		var frames []image.Image
		if src.chatImage != "" {
			if img, err := s.chatImageDecoded(userID, src.chatImage); err == nil {
				frames = []image.Image{img}
			}
		} else {
			frames = s.libraryPictureFrames(ctx, src.mediaID, room-len(parts))
		}
		for _, frame := range frames {
			if len(parts) >= room {
				break
			}
			if part, err := vision.Part(frame, pictureEdge); err == nil {
				parts = append(parts, part)
			}
		}
	}
	return parts
}

// chatImageDecoded opens one of the user's chat images. The id is validated before it
// becomes a path, and the additional data binds the blob to this user, so an id from
// another account decrypts to nothing rather than to their picture.
func (s *Server) chatImageDecoded(userID int64, id string) (image.Image, error) {
	if !validChatID(id, false) {
		return nil, fmt.Errorf("bad chat image id")
	}
	blob, err := os.ReadFile(s.chatImagePath(userID, id))
	if err != nil {
		return nil, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, []byte(fmt.Sprintf("chat-image:%d:%s", userID, id)))
	if err != nil {
		return nil, err
	}
	img, _, err := image.Decode(bytes.NewReader(raw))
	return img, err
}

// libraryPictureFrames is what she is shown of a library item.
//
// A still is itself and a GIF is two of its frames, both cheap. A video is its poster,
// not frames sampled from the clip: sampling decrypts the whole file and runs scene
// detection over it, which is minutes on a long clip, and this is a reply someone is
// waiting for. The poster was chosen to represent the clip anyway. A comic or a game
// is its cover, by the same route.
func (s *Server) libraryPictureFrames(ctx context.Context, id int64, room int) []image.Image {
	if room <= 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(ctx, libraryPictureTimeout)
	defer cancel()
	row, err := s.db.GetMedia(ctx, id)
	if err != nil {
		return nil
	}
	switch models.MediaKind(row.Kind) {
	case models.KindImage:
		frames, _ := s.ai.SampleFrames(ctx, row.BlobPath, row.Kind, 1)
		return frames
	case models.KindGIF:
		frames, _ := s.ai.SampleFrames(ctx, row.BlobPath, row.Kind, min(2, room))
		return frames
	}
	if !row.ThumbPath.Valid || row.ThumbPath.String == "" {
		return nil
	}
	rc, err := s.store.Open(row.ThumbPath.String)
	if err != nil {
		return nil
	}
	defer rc.Close()
	img, _, err := image.Decode(rc)
	if err != nil {
		return nil
	}
	return []image.Image{img}
}

// withPictures is the payload's message list with this turn's pictures attached to the
// last user message, in the array form of OpenAI-compatible content. Every other
// message stays a plain string, which is what keeps them cacheable.
func withPictures(messages []chatMessage, parts []map[string]any) []any {
	last := -1
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			last = i
			break
		}
	}
	out := make([]any, 0, len(messages))
	for i, m := range messages {
		if i != last || len(parts) == 0 {
			out = append(out, map[string]any{"role": m.Role, "content": m.Content})
			continue
		}
		content := make([]map[string]any, 0, len(parts)+1)
		content = append(content, map[string]any{"type": "text", "text": m.Content})
		content = append(content, parts...)
		out = append(out, map[string]any{"role": m.Role, "content": content})
	}
	return out
}

// withoutEyes is the message list with the eyes directive taken back out, for the retry
// after a backend refused the pictures: told she can see and shown nothing, she would
// describe a picture she made up.
func withoutEyes(messages []chatMessage) []chatMessage {
	out := make([]chatMessage, len(messages))
	for i, m := range messages {
		if m.Role == "system" {
			m.Content = strings.Replace(m.Content, "\n\n"+eyesDirective, "", 1)
		}
		out[i] = m
	}
	return out
}
