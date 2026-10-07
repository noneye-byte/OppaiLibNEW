package api

import (
	"context"
	"errors"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
)

// A few seconds of her, made from a picture she already sent.
//
// The clip starts from her last picture rather than from words, because that is what
// keeps it her: image-to-video models hold a face and an outfit they are shown far
// better than ones they are told about. The workflow is the operator's own (see
// imagegen/comfy.go); this side fills in what moves, checks it against the same line
// every picture of her is held to, and files what comes back in her gallery as a video.

// clipTimeout bounds a clip. Image-to-video on a consumer card is minutes, not seconds;
// past a quarter of an hour something is stuck.
const clipTimeout = 15 * time.Minute

func clipsEnabled(clipURL, workflow string) bool {
	return strings.TrimSpace(clipURL) != "" && strings.TrimSpace(workflow) != ""
}

// makeClip animates one of her pictures and files the result.
func (s *Server) makeClip(ctx context.Context, userID int64, imageID, motion string, progress func(cameraProgress)) (chatImage, error) {
	cur := s.settings.Get()
	if !clipsEnabled(cur.LibbyClipURL, cur.LibbyClipWorkflow) {
		return chatImage{}, errors.New("clips are not set up")
	}
	if shotIsRefused(motion) {
		return chatImage{}, errShotRefused
	}
	raw, meta, err := s.chatImageRaw(userID, imageID)
	if err != nil {
		return chatImage{}, errors.New("the picture to animate is gone")
	}
	prompt := cleanShot(motion)
	if meta.Gen != nil && meta.Gen.Prompt != "" {
		// What made the still, so the clip is of the same picture: motion first.
		prompt = prompt + ", " + meta.Gen.Prompt
	}
	vars := map[string]string{
		"prompt":   prompt,
		"negative": withAdultNegative(cur.LibbyGenNegativePrompt),
		"seed":     strconv.FormatInt(rand.Int63n(1<<32), 10),
	}
	ctx, cancel := context.WithTimeout(ctx, clipTimeout)
	defer cancel()
	release := s.lendCardToImages(ctx)
	defer release()
	outs, err := s.imagegen.RunComfyWorkflow(ctx, cur.LibbyClipURL, cur.LibbyClipWorkflow, vars, raw, func(p imagegen.Progress) {
		if progress != nil {
			progress(cameraProgress{Phase: "animating", Percent: p.Percent, Of: 1})
		}
	})
	if err != nil {
		return chatImage{}, err
	}
	out := outs[0]
	tags := append([]string{"libby", "clip"}, firstN(meta.Tags, 20)...)
	clip := chatImage{
		ID: randomID(), CharacterID: "libby", Name: libbyImageTitle("clip: " + motion), Tags: dedupeTags(tags),
		MIME: safeInlineContentType(out.MIME), CreatedAt: time.Now().UnixMilli(), Subject: chatSubjectSelf,
	}
	saved, _, err := s.fileChatImage(userID, clip, out.Data)
	return saved, err
}

func dedupeTags(tags []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(tags))
	for _, t := range tags {
		if t = normalizeChatTag(t); t != "" && !seen[t] {
			seen[t] = true
			out = append(out, t)
		}
	}
	return out
}
