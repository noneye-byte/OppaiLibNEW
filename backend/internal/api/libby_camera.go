package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/settings"
	"github.com/youruser/oppailib/internal/vision"
)

// Libby's camera.
//
// A picture she sent used to be one generation of a prompt assembled from her reply,
// sent whatever came out. Nothing checked that the woman in it was her, that she had on
// what the conversation said, or that her hands had five fingers — and she described it
// before it existed, from what she meant to take, so her words and the picture often
// disagreed.
//
// The camera is the server's now, and runs inside the turn:
//
//  1. The shot she described is checked against the line no picture of her crosses
//     (camera_shot.go), then built into a prompt with her likeness, her clothes, what
//     she is doing and where she is — the same libbySelfiePrompt approved offers use.
//  2. Several candidates are made in one run, the card lent to the generator for it.
//  3. A model that can see — the vision model, or hers — scores them: is it her, is it
//     the shot, is it clean, is everyone in it an adult. The best cleared one goes;
//     what they have rated well before breaks a tie.
//  4. If none was good enough, the judge's fix is added and it is retaken once.
//  5. The picture is filed in her gallery with its recipe, so "same but…" can start
//     from it, and she is told what it actually shows before she says anything about it.
//
// Without a model that can see, only the first candidate is made and it is sent as it
// came, which is exactly what the old path did.

// cameraRequest is one picture, a set, or an edit.
type cameraRequest struct {
	userID int64
	// r files a library copy when the operator asked for one; nil skips it (a story
	// taken with nobody's request behind it).
	r     *http.Request
	jobID string

	shot, framing, outfit string
	count                 int
	// poseFrom is their photo to copy a pose from.
	poseFrom string
	// editOf, when set, makes this an edit of one of her pictures.
	editOf, change, strength string

	// Her state at the moment the picture is taken.
	outfitID, wearing, activity, place string
	intensity                          int
	weights                            map[string]float64
	progress                           func(cameraProgress)
}

// cameraProgress is what the conversation is shown while she takes it.
type cameraProgress struct {
	Phase   string  `json:"phase"` // generating | judging | retaking | saving
	Percent float64 `json:"percent"`
	Preview string  `json:"preview,omitempty"`
	Of      int     `json:"of"`
}

type cameraResult struct {
	images []chatImage
	// seen is what she sent, as a model that looked at it says, for her to react to.
	seen  string
	notes []string
	// wearing is what she has on afterwards, when the shot put her in something.
	wearing    string
	wearingSet bool
}

// cameraRetakeBelow is the best score under which a shot is retaken with the judge's fix.
const cameraRetakeBelow = 4.5

type cameraJudgeFunc func(ctx context.Context, frames []image.Image, prompt string) (string, error)

// cameraJudge is the model that looks at the candidates, or nil when there is none: the
// vision model first, since it is configured for exactly this, then her own model when
// it can see.
func (s *Server) cameraJudge(cur settings.Settings) cameraJudgeFunc {
	if cur.VisionEnabled {
		client := s.visionClient()
		return func(ctx context.Context, frames []image.Image, prompt string) (string, error) {
			return client.Ask(ctx, prompt, frames, 360, 0.2)
		}
	}
	if cur.ChatURL != "" && chatSeesPictures(cur.ChatVision, cur.ChatModel) && !knownBlind(cur.ChatURL, cur.ChatModel) {
		return func(ctx context.Context, frames []image.Image, prompt string) (string, error) {
			// On a card shared by swapping her model was just lent to the generator; it has
			// to be back before it can look.
			s.awaitCardBack(ctx, 2*time.Minute)
			content := []map[string]any{{"type": "text", "text": prompt}}
			for _, f := range frames {
				part, err := visionPart(f)
				if err != nil {
					return "", err
				}
				content = append(content, part)
			}
			payload := map[string]any{
				"messages":    []map[string]any{{"role": "user", "content": content}},
				"temperature": 0.2, "max_tokens": 360, "stream": false,
			}
			if cur.ChatModel != "" {
				payload["model"] = cur.ChatModel
			}
			return s.postChatCompletion(ctx, payload)
		}
	}
	return nil
}

// awaitCardBack hands the card back to her model now, if it was lent, and waits for the
// reload — bounded, since a reload that never finishes must not hold a turn forever.
func (s *Server) awaitCardBack(ctx context.Context, limit time.Duration) {
	if s.card.parkedModel() == "" {
		return
	}
	s.handBackCardNow()
	deadline := time.Now().Add(limit)
	for s.card.parkedModel() != "" && time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return
		case <-time.After(500 * time.Millisecond):
		}
	}
}

// takePictures runs the camera.
func (s *Server) takePictures(ctx context.Context, req cameraRequest) (cameraResult, error) {
	var res cameraResult
	cur := s.settings.Get()
	if !cur.ImageGenEnabled {
		return res, errors.New("no image generator is connected")
	}
	emit := func(p cameraProgress) {
		if req.progress != nil {
			req.progress(p)
		}
	}
	if shotIsRefused(req.shot, req.outfit, req.change) {
		return res, errShotRefused
	}
	wearing := req.wearing
	if strings.TrimSpace(req.outfit) != "" {
		wearing = normalizeWearing(req.outfit)
		res.wearing, res.wearingSet = wearing, true
	}

	shot := req.shot
	count := clampInt(req.count, 1, maxPhotoSet)
	var init []byte
	seed := int64(-1)
	width, height := 0, 0
	if req.editOf != "" {
		raw, meta, err := s.chatImageRaw(req.userID, req.editOf)
		if err != nil {
			return res, errors.New("the picture to redo is gone")
		}
		original := strings.Join(meta.Tags, ", ")
		if meta.Gen != nil {
			original = meta.Gen.Shot
			seed = meta.Gen.Seed
		}
		if strings.EqualFold(strings.TrimSpace(req.strength), "big") {
			seed = -1
		}
		shot, init, count = editedShot(original, req.change), raw, 1
		if cfg, _, err := image.DecodeConfig(bytes.NewReader(raw)); err == nil {
			width, height = roundTo8(clampInt(cfg.Width, 256, 1536)), roundTo8(clampInt(cfg.Height, 256, 1536))
		}
	}

	judge := s.cameraJudge(cur)
	candidates := 1
	if count == 1 && judge != nil && init == nil {
		candidates = cur.LibbyCameraCandidates
	}
	subject := shotSubject(req.framing, shot, req.place)
	// A shot she described says what she is doing in it. Her standing activity adds its
	// own pose words otherwise — "lying on couch" from lounging beside the "lying on bed"
	// she asked for — and the generator draws the argument between them.
	activity := req.activity
	if strings.TrimSpace(shot) != "" {
		activity = ""
	}
	prompt, stateTags := s.libbySelfiePrompt(cur.LibbyGenPrompt, subject, req.outfitID, wearing, activity, req.intensity)
	gr := generateReq{
		Prompt:         prompt,
		NegativePrompt: withAdultNegative(cur.LibbyGenNegativePrompt),
		Checkpoint:     cur.LibbyGenModel,
		Board:          cur.LibbyGenBoard,
		Count:          count * candidates,
		Seed:           seed,
		Width:          width,
		Height:         height,
		Loras:          libbyLoras(cur),
	}
	gen, record, _ := s.prepareGenerate(&gr)
	gen.InitImage, gen.Denoise = init, editDenoise(req.strength)
	var controlNotes []string
	gen.Controls, controlNotes = s.cameraControls(cur, req.userID, req.poseFrom, wearing)
	res.notes = append(res.notes, controlNotes...)

	run := func(g imagegen.GenerateRequest, phase string) (*imagegen.GenerateResult, error) {
		runCtx := ctx
		var job *genJob
		if genJobIDPattern.MatchString(req.jobID) {
			runCtx, job = s.genJobs.start(ctx, req.jobID)
			defer s.genJobs.finish(req.jobID, job)
		}
		total := max(g.Count, 1)
		g.Progress = func(p imagegen.Progress) {
			if job != nil {
				job.report(p)
			}
			emit(cameraProgress{Phase: phase, Percent: (float64(p.Index) + p.Percent) / float64(total), Preview: p.Image, Of: count})
		}
		emit(cameraProgress{Phase: phase, Of: count})
		release := s.lendCardToImages(ctx)
		defer release()
		out, err := s.imagegen.Generate(runCtx, cur.ImageGenURL, g)
		if errors.Is(err, imagegen.ErrControlUnsupported) && len(g.Controls) > 0 {
			res.notes = append(res.notes, "the pose and face references could not be used on this generator, so it was taken without them")
			g.Controls = nil
			out, err = s.imagegen.Generate(runCtx, cur.ImageGenURL, g)
		}
		return out, err
	}

	first, err := run(gen, "generating")
	if err != nil {
		return res, err
	}
	pool := cameraPool(first, prompt)

	type pick struct {
		raw    []byte
		seed   int64
		prompt string
		score  float64
		tags   []string
	}
	var picks []pick
	seen := ""
	if judge != nil {
		emit(cameraProgress{Phase: "judging", Percent: 1, Of: len(pool)})
		verdict, idx, ok := s.judgeCandidates(ctx, judge, pool, subject, cur.LibbyGenPrompt, req.weights)
		if ok && count == 1 && len(idx) > 0 && verdict.Scores[idx[0]] < cameraRetakeBelow && verdict.Fix != "" && init == nil {
			// Not good enough: once more with what the judge said was wrong.
			retake := gen
			retake.Prompt = gen.Prompt + ", " + verdict.Fix
			if again, err := run(retake, "retaking"); err == nil {
				more := cameraPool(again, retake.Prompt)
				emit(cameraProgress{Phase: "judging", Percent: 1, Of: len(more)})
				if v2, idx2, ok2 := s.judgeCandidates(ctx, judge, more, subject+", "+verdict.Fix, cur.LibbyGenPrompt, req.weights); ok2 && len(idx2) > 0 && v2.Scores[idx2[0]] > verdict.Scores[idx[0]] {
					pool, verdict, idx = more, v2, idx2
				}
			}
		}
		switch {
		case ok && len(idx) == 0:
			// The judge cleared nothing. Not sent — said to her instead.
			return res, errors.New("none of the pictures came out right, so nothing was sent")
		case ok:
			keep := idx[:1]
			if count > 1 {
				// A set keeps every picture that is not broken, in the judge's order.
				keep = nil
				for _, i := range idx {
					if verdict.Scores[i] >= 3 {
						keep = append(keep, i)
					}
				}
				if len(keep) == 0 {
					keep = idx[:1]
				}
			}
			for _, i := range keep {
				picks = append(picks, pick{raw: pool[i].raw, seed: pool[i].seed, prompt: pool[i].prompt, score: verdict.Scores[i], tags: pool[i].tags})
			}
			seen = verdict.Description
			if len(keep) > 1 {
				seen = fmt.Sprintf("a set of %d; the best of them shows %s", len(keep), verdict.Description)
			}
		}
	}
	if len(picks) == 0 {
		// No judge, or one that said nothing usable: the first of each shot, as before.
		for i := 0; i < len(pool) && len(picks) < count; i += candidates {
			picks = append(picks, pick{raw: pool[i].raw, seed: pool[i].seed, prompt: pool[i].prompt})
		}
	}

	emit(cameraProgress{Phase: "saving", Percent: 1, Of: len(picks)})
	title := libbyImageTitle(firstNonEmpty(req.change, shot, "Libby"))
	baseTags := append([]string{"libby"}, stateTags...)
	baseTags = append(baseTags, selfieSubjectTags(shot)...)
	for _, p := range picks {
		meta := s.cameraImageMeta(ctx, p.raw, title, baseTags, p.tags)
		meta.Gen = &chatImageGen{Prompt: p.prompt, Negative: gen.NegativePrompt, Seed: p.seed, Shot: shot, Score: p.score}
		if cur.LibbyGenToLibrary && req.r != nil {
			id := s.genCache.put(&genPreview{data: p.raw, prompt: record, negative: gen.NegativePrompt, seed: p.seed, model: cur.LibbyGenModel})
			meta.Kept = s.saveGeneratedToLibrary(req.r, id, title, meta.Tags)
		}
		saved, _, err := s.fileChatImage(req.userID, meta, p.raw)
		if err != nil {
			return res, err
		}
		res.images = append(res.images, saved)
	}
	if seen == "" && len(res.images) > 0 {
		seen = "nobody has looked at it; the tagger reads it as " + strings.Join(firstN(res.images[0].Tags, 14), ", ")
	}
	res.seen = seen
	return res, nil
}

// cameraCandidate is one generated picture, before it is chosen or filed.
type cameraCandidate struct {
	raw    []byte
	seed   int64
	prompt string
	img    image.Image
	tags   []string
}

func cameraPool(out *imagegen.GenerateResult, prompt string) []cameraCandidate {
	pool := make([]cameraCandidate, 0, len(out.Images))
	for i, raw := range out.Images {
		seed := out.Seed
		if i < len(out.Seeds) {
			seed = out.Seeds[i]
		}
		c := cameraCandidate{raw: raw, seed: seed, prompt: prompt}
		if img, _, err := image.Decode(bytes.NewReader(raw)); err == nil {
			c.img = img
		}
		pool = append(pool, c)
	}
	return pool
}

// judgeCandidates asks the judge about every candidate in the pool and returns the ones
// it cleared, best first; the caller sends the first of a single shot and the unbroken
// ones of a set. The tagger runs here too, so taste can break ties and the tags are not
// computed twice.
func (s *Server) judgeCandidates(ctx context.Context, judge cameraJudgeFunc, pool []cameraCandidate, wanted, likeness string, weights map[string]float64) (judgement, []int, bool) {
	var frames []image.Image
	var at []int
	for i := range pool {
		if pool[i].img == nil {
			continue
		}
		frames = append(frames, pool[i].img)
		at = append(at, i)
		if suggestions, err := s.ai.TagImage(ctx, pool[i].img); err == nil {
			for _, sg := range suggestions {
				pool[i].tags = append(pool[i].tags, sg.Name)
			}
		}
	}
	if len(frames) == 0 {
		return judgement{}, nil, false
	}
	jctx, cancel := context.WithTimeout(ctx, 3*time.Minute)
	defer cancel()
	answer, err := judge(jctx, frames, judgePrompt(len(frames), wanted, likeness))
	if err != nil {
		s.log.Info("libby camera: the judge did not answer", "err", err)
		return judgement{}, nil, false
	}
	j, ok := parseJudgement(answer, len(frames))
	if !ok {
		return judgement{}, nil, false
	}
	// Back onto pool indexes, which differ only if a candidate failed to decode.
	full := judgement{Scores: make([]float64, len(pool)), Adult: make([]bool, len(pool)), Description: j.Description, Fix: j.Fix}
	taste := make([]float64, len(pool))
	for k, i := range at {
		full.Scores[i], full.Adult[i] = j.Scores[k], j.Adult[k]
		taste[i] = tasteScore(pool[i].tags, weights)
		if j.Best == k+1 {
			full.Best = i + 1
		}
	}
	order := make([]int, 0, len(pool))
	for {
		best, ok := pickCandidate(full, taste)
		if !ok {
			break
		}
		order = append(order, best)
		full.Adult[best] = false // taken; the next pass picks among the rest
	}
	for _, i := range order {
		full.Adult[i] = true
	}
	return full, order, true
}

// cameraControls is the pose and face references this picture can use, and a note for
// each one that was asked for and could not be.
func (s *Server) cameraControls(cur settings.Settings, userID int64, poseFrom, wearing string) ([]imagegen.ControlUnit, []string) {
	var units []imagegen.ControlUnit
	var notes []string
	if poseFrom != "" {
		if cur.LibbyPoseModel == "" {
			notes = append(notes, "copying a pose is not set up, so it was taken without their pose")
		} else if raw, _, err := s.chatImageRaw(userID, poseFrom); err == nil {
			units = append(units, imagegen.ControlUnit{Image: raw, Module: cur.LibbyPoseModule, Model: cur.LibbyPoseModel, Weight: 0.9})
		}
	}
	if cur.LibbyFaceModel != "" {
		slot := referenceClothed
		if wearing == wearingNothing {
			slot = referenceNude
		}
		if !s.hasReference(slot) {
			slot = map[string]string{referenceClothed: referenceNude, referenceNude: referenceClothed}[slot]
		}
		if raw, err := s.referenceRaw(slot); err == nil {
			units = append(units, imagegen.ControlUnit{Image: raw, Module: cur.LibbyFaceModule, Model: cur.LibbyFaceModel, Weight: 0.6})
		}
	}
	return units, notes
}

// cameraImageMeta is the gallery record for a picture she took. Like generatedChatImage
// but with the tagger's words already in hand when the judge ran.
func (s *Server) cameraImageMeta(ctx context.Context, raw []byte, title string, tags, scanned []string) chatImage {
	if len(scanned) == 0 {
		return generatedChatImageCtx(ctx, s, raw, title, tags, true)
	}
	return generatedChatImageCtx(ctx, s, raw, title, append(append([]string{}, tags...), scanned...), false)
}

// chatImageRaw is one of the user's chat pictures, decrypted, with its record.
func (s *Server) chatImageRaw(userID int64, id string) ([]byte, chatImage, error) {
	if !validChatID(id, false) {
		return nil, chatImage{}, fmt.Errorf("bad chat image id")
	}
	meta, ok := s.ownedChatImage(userID, id)
	if !ok {
		return nil, chatImage{}, fmt.Errorf("no such picture")
	}
	blob, err := os.ReadFile(s.chatImagePath(userID, id))
	if err != nil {
		return nil, meta, err
	}
	raw, err := crypto.OpenBytes(s.kek, blob, []byte(fmt.Sprintf("chat-image:%d:%s", userID, id)))
	return raw, meta, err
}

// referenceRaw is one of her reference pictures, decrypted, as bytes.
func (s *Server) referenceRaw(slot string) ([]byte, error) {
	if !validReferenceSlot(slot) {
		return nil, errors.New("no such reference")
	}
	referenceMu.Lock()
	blob, err := os.ReadFile(s.referencePath(slot))
	referenceMu.Unlock()
	if err != nil {
		return nil, err
	}
	return crypto.OpenBytes(s.kek, blob, referenceAAD(slot))
}

// visionPart is a candidate as an image part for her own model, at the vision path's size.
func visionPart(img image.Image) (map[string]any, error) { return vision.Part(img, 768) }

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func firstN(list []string, n int) []string {
	if len(list) > n {
		return list[:n]
	}
	return list
}
