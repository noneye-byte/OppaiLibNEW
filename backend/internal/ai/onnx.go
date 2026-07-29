//go:build onnx

// This file is only compiled with `-tags onnx`. It depends on
// github.com/yalue/onnxruntime_go and the ONNX Runtime shared library at
// runtime. Before building, run:
//
//	go get github.com/yalue/onnxruntime_go
//	go build -tags onnx ./...
//
// and set ONNXRUNTIME_LIB_PATH (or place libonnxruntime.so where the loader
// looks). See docs/AI.md for model + label file setup.
package ai

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"io"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	ort "github.com/yalue/onnxruntime_go"
	"golang.org/x/image/draw"
)

// csvCategory maps the numeric category column of a wd14 selected_tags.csv onto
// our tag categories. Anything else (copyright=3, artist=1, meta=5) is lumped
// into the model's configured fallback category.
var csvCategory = map[string]string{
	"0": catGeneral,
	"4": catCharacter,
	"9": catRating,
}

// ortInit guards InitializeEnvironment, which must run exactly once per process.
var (
	ortInit    sync.Once
	ortInitErr error
)

// modelConfig is /config/models/model.json — describes how to feed the model.
// Every field is optional: names, input size and layout are read from the ONNX
// graph when omitted, so a bare `{}` works for any standard tagger.
type modelConfig struct {
	Model      string    `json:"model"`       // onnx file name
	Labels     string    `json:"labels"`      // labels.txt (one per line) or selected_tags.csv
	InputName  string    `json:"input_name"`  // graph input tensor name; auto-detected when empty
	OutputName string    `json:"output_name"` // graph output tensor name; auto-detected when empty
	InputSize  int       `json:"input_size"`  // square side, e.g. 448; from the graph when 0
	Layout     string    `json:"layout"`      // "nchw" | "nhwc"; from the graph when empty
	BGR        bool      `json:"bgr"`         // swap channels to BGR
	Scale      float32   `json:"scale"`       // multiply pixels by this (e.g. 1/255)
	Mean       []float32 `json:"mean"`        // per-channel mean (optional)
	Std        []float32 `json:"std"`         // per-channel std  (optional)
	// Activation is what turns a raw output into a confidence: "none" (default) or
	// "sigmoid". Exports disagree on whether the activation is part of the graph — a
	// wd14 tagger bakes it in and hands back probabilities, while JoyTag hands back
	// logits and expects the caller to squash them.
	//
	// Getting this wrong does not fail, it lies: thresholds stop meaning anything
	// (a logit of 2.4 clears a 0.4 threshold that a *less* confident 0.5 probability
	// would too), and the scores written to the database leave [0,1] entirely, which
	// is the range MinScore and the tag list are built on.
	Activation string  `json:"activation"`
	Threshold  float32 `json:"threshold"` // min score to emit a general tag
	// CharThreshold gates character tags, which are far more confidently
	// predicted than general ones — wd14's own UI defaults it to 0.85 against a
	// general threshold of 0.35. Only meaningful for CSV label files.
	CharThreshold float32 `json:"character_threshold"`
	Category      string  `json:"category"` // category for labels without one of their own
}

// label is one output index: the tag it names and the category it belongs to.
type label struct {
	name     string
	category string
}

type onnxTagger struct {
	cfg     modelConfig
	labels  []label
	session *ort.DynamicAdvancedSession
	inShape ort.Shape
	device  string // the execution provider actually in use
	sigmoid bool   // squash raw outputs into [0,1] before scoring; see modelConfig.Activation

	// hasRating reports whether any label is a rating. Rating labels are scored
	// by argmax rather than thresholded — they are mutually exclusive, and every
	// image has exactly one.
	hasRating bool
}

func newOnnxTagger(modelDir, device string, log *slog.Logger) (Tagger, error) {
	cfg, err := loadModelConfig(modelDir)
	if err != nil {
		return nil, err
	}
	labels, err := readLabels(filepath.Join(modelDir, cfg.Labels), cfg.Category)
	if err != nil {
		return nil, err
	}
	if len(labels) == 0 {
		return nil, fmt.Errorf("ai: %s contains no labels", cfg.Labels)
	}

	if err := initORT(); err != nil {
		return nil, err
	}

	modelPath := filepath.Join(modelDir, cfg.Model)
	if err := describeGraph(modelPath, &cfg); err != nil {
		return nil, err
	}

	opts, used, err := sessionOptions(device, log)
	if err != nil {
		return nil, err
	}
	if opts != nil {
		defer opts.Destroy()
	}

	sess, err := ort.NewDynamicAdvancedSession(modelPath,
		[]string{cfg.InputName}, []string{cfg.OutputName}, opts)
	if err != nil {
		return nil, err
	}

	t := &onnxTagger{
		cfg:     cfg,
		labels:  labels,
		session: sess,
		device:  used,
		sigmoid: cfg.Activation == activationSigmoid,
	}
	s := int64(cfg.InputSize)
	if cfg.Layout == "nhwc" {
		t.inShape = ort.NewShape(1, s, s, 3)
	} else {
		t.inShape = ort.NewShape(1, 3, s, s)
	}
	for _, l := range labels {
		if l.category == catRating {
			t.hasRating = true
			break
		}
	}
	log.Info("ai: onnx model loaded",
		"model", cfg.Model, "labels", len(labels), "input_size", cfg.InputSize,
		"layout", cfg.Layout, "activation", cfg.Activation, "device", used, "ratings", t.hasRating)
	return t, nil
}

func (t *onnxTagger) Name() string {
	return "onnx:" + filepath.Base(t.cfg.Model) + ":" + t.device
}

// Tag runs one forward pass. Input and output tensors are allocated per call
// rather than reused, so the Manager's worker pool can run several frames
// through the session concurrently — ORT's Run is safe for concurrent use, but
// a shared input tensor would not be.
func (t *onnxTagger) Tag(_ context.Context, img image.Image) ([]Suggestion, error) {
	in, err := ort.NewEmptyTensor[float32](t.inShape)
	if err != nil {
		return nil, err
	}
	defer in.Destroy()

	out, err := ort.NewEmptyTensor[float32](ort.NewShape(1, int64(len(t.labels))))
	if err != nil {
		return nil, err
	}
	defer out.Destroy()

	t.preprocess(img, in.GetData())
	if err := t.session.Run([]ort.Value{in}, []ort.Value{out}); err != nil {
		return nil, err
	}
	return t.collect(out.GetData()), nil
}

// collect turns a raw score vector into suggestions: rating labels compete for a
// single argmax slot, everything else is thresholded per category. Raw outputs are
// run through the model's activation first, so everything downstream — thresholds,
// the user's MinScore, the score stored on the tag — is a confidence in [0,1].
func (t *onnxTagger) collect(raw []float32) []Suggestion {
	var (
		res       []Suggestion
		bestRate  float32 = -1
		bestRateI         = -1
	)
	for i, out := range raw {
		if i >= len(t.labels) {
			break
		}
		sc := t.confidence(out)
		l := t.labels[i]
		if l.category == catRating {
			if sc > bestRate {
				bestRate, bestRateI = sc, i
			}
			continue
		}
		if sc >= t.threshold(l.category) {
			res = append(res, Suggestion{Name: l.name, Category: l.category, Score: float64(sc)})
		}
	}
	sort.Slice(res, func(a, b int) bool { return res[a].Score > res[b].Score })

	// Prepend the rating: it is the single most useful tag on an NSFW library, so
	// it leads regardless of how its raw score compares to the general tags.
	if bestRateI >= 0 {
		r := Suggestion{Name: t.labels[bestRateI].name, Category: catRating, Score: float64(bestRate)}
		res = append([]Suggestion{r}, res...)
	}
	return res
}

// confidence turns one raw model output into a probability in [0,1]. An export that
// already ends in an activation needs none, which is why "none" is the default: it is
// the identity, and it is what the wd14 family wants.
func (t *onnxTagger) confidence(out float32) float32 {
	if !t.sigmoid {
		return out
	}
	return float32(1 / (1 + math.Exp(float64(-out))))
}

func (t *onnxTagger) threshold(category string) float32 {
	if category == catCharacter && t.cfg.CharThreshold > 0 {
		return t.cfg.CharThreshold
	}
	return t.cfg.Threshold
}

// preprocess writes normalized pixels for img into dst.
//
// The image is first composited onto white and padded to a square, then resized
// — not stretched — to the model's input size. Both steps matter for a wd14-style
// tagger, which was trained on white-padded squares: stretching a portrait to
// 448×448 distorts every aspect-sensitive tag, and compositing is what keeps a
// transparent PNG from arriving as a black rectangle (Go's RGBA is
// alpha-premultiplied, so an untouched transparent pixel reads as zero).
func (t *onnxTagger) preprocess(src image.Image, dst []float32) {
	b := src.Bounds()
	side := b.Dx()
	if b.Dy() > side {
		side = b.Dy()
	}
	if side == 0 {
		return
	}

	square := image.NewRGBA(image.Rect(0, 0, side, side))
	draw.Draw(square, square.Bounds(), image.White, image.Point{}, draw.Src)
	off := image.Pt((side-b.Dx())/2, (side-b.Dy())/2)
	draw.Draw(square, image.Rectangle{Min: off, Max: off.Add(b.Size())}, src, b.Min, draw.Over)

	s := t.cfg.InputSize
	resized := image.NewRGBA(image.Rect(0, 0, s, s))
	draw.CatmullRom.Scale(resized, resized.Bounds(), square, square.Bounds(), draw.Src, nil)

	norm := func(v float32, ch int) float32 {
		v *= t.cfg.Scale
		if len(t.cfg.Mean) == 3 {
			v -= t.cfg.Mean[ch]
		}
		if len(t.cfg.Std) == 3 {
			v /= t.cfg.Std[ch]
		}
		return v
	}
	nhwc := t.cfg.Layout == "nhwc"
	plane := s * s
	// The canvas is fully opaque after compositing, so the premultiplied Pix
	// bytes are already the plain 0–255 channel values.
	for idx := 0; idx < plane; idx++ {
		p := resized.Pix[idx*4:]
		ch := [3]float32{float32(p[0]), float32(p[1]), float32(p[2])}
		if t.cfg.BGR {
			ch[0], ch[2] = ch[2], ch[0]
		}
		for c := 0; c < 3; c++ {
			v := norm(ch[c], c)
			if nhwc {
				dst[idx*3+c] = v
			} else {
				dst[c*plane+idx] = v
			}
		}
	}
}

// initORT points the binding at the shared library and initializes the runtime
// once per process.
func initORT() error {
	ortInit.Do(func() {
		if libPath := os.Getenv("ONNXRUNTIME_LIB_PATH"); libPath != "" {
			ort.SetSharedLibraryPath(libPath)
		}
		ortInitErr = ort.InitializeEnvironment()
	})
	return ortInitErr
}

// sessionOptions builds the execution-provider options for the requested device
// and reports which provider is actually in use. A CUDA request that the runtime
// cannot satisfy degrades to CPU with a warning rather than disabling tagging —
// but it says so, instead of silently pretending the GPU is in use.
func sessionOptions(device string, log *slog.Logger) (*ort.SessionOptions, string, error) {
	if !strings.EqualFold(device, "cuda") {
		return nil, "cpu", nil
	}
	opts, err := ort.NewSessionOptions()
	if err != nil {
		return nil, "", err
	}
	cuda, err := ort.NewCUDAProviderOptions()
	if err != nil {
		opts.Destroy()
		log.Warn("ai: CUDA requested but unavailable in this ONNX Runtime build, using CPU", "err", err)
		return nil, "cpu", nil
	}
	defer cuda.Destroy()
	if err := opts.AppendExecutionProviderCUDA(cuda); err != nil {
		opts.Destroy()
		log.Warn("ai: CUDA execution provider could not be enabled, using CPU", "err", err)
		return nil, "cpu", nil
	}
	return opts, "cuda", nil
}

// describeGraph fills in any input/output names, input size and layout the
// config left unset by inspecting the ONNX graph itself. Tagger exports disagree
// wildly on tensor names ("input_1:0", "input", "pixel_values"), so reading them
// beats making the user find them.
func describeGraph(modelPath string, cfg *modelConfig) error {
	inputs, outputs, err := ort.GetInputOutputInfo(modelPath)
	if err != nil {
		return fmt.Errorf("inspect %s: %w", modelPath, err)
	}
	if len(inputs) == 0 || len(outputs) == 0 {
		return errors.New("ai: model has no inputs or outputs")
	}
	if cfg.InputName == "" {
		cfg.InputName = inputs[0].Name
	}
	if cfg.OutputName == "" {
		cfg.OutputName = outputs[0].Name
	}

	// A 4-D image input is [N,C,H,W] or [N,H,W,C]; the channel axis is the one of
	// extent 3. Dimensions may be -1 (dynamic), which is why we look for the 3.
	d := inputs[0].Dimensions
	if len(d) == 4 {
		switch {
		case d[3] == 3:
			if cfg.Layout == "" {
				cfg.Layout = "nhwc"
			}
			if cfg.InputSize == 0 {
				cfg.InputSize = int(d[1])
			}
		case d[1] == 3:
			if cfg.Layout == "" {
				cfg.Layout = "nchw"
			}
			if cfg.InputSize == 0 {
				cfg.InputSize = int(d[2])
			}
		}
	}
	if cfg.Layout == "" {
		cfg.Layout = "nchw"
	}
	if cfg.InputSize <= 0 {
		return errors.New("ai: could not determine input_size from the model; set it in model.json")
	}
	return nil
}

func loadModelConfig(modelDir string) (modelConfig, error) {
	var cfg modelConfig
	cfgPath := filepath.Join(modelDir, "model.json")
	raw, err := os.ReadFile(cfgPath)
	if err != nil {
		return cfg, fmt.Errorf("read %s: %w", cfgPath, err)
	}
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return cfg, err
	}
	applyDefaults(&cfg)
	if err := validateConfig(cfg); err != nil {
		return cfg, err
	}
	return cfg, nil
}

// The activations a model.json may ask for. A typo here would otherwise be read as
// "none" and quietly produce a tagger that thresholds logits — plausible-looking tags,
// scores outside [0,1], and nothing to say it went wrong — so an unknown value is an
// error and the heuristic fallback takes over loudly.
const (
	activationNone    = "none"
	activationSigmoid = "sigmoid"
)

func applyDefaults(c *modelConfig) {
	if c.Scale == 0 {
		c.Scale = 1.0 / 255.0
	}
	if c.Threshold == 0 {
		c.Threshold = 0.35
	}
	if c.Category == "" {
		c.Category = catGeneral
	}
	if c.Model == "" {
		c.Model = "model.onnx"
	}
	if c.Labels == "" {
		c.Labels = "labels.txt"
	}
	if c.Activation == "" {
		c.Activation = activationNone
	}
	c.Activation = strings.ToLower(strings.TrimSpace(c.Activation))
}

func validateConfig(c modelConfig) error {
	switch c.Activation {
	case activationNone, activationSigmoid:
		return nil
	default:
		return fmt.Errorf("ai: unknown activation %q in model.json (want %q or %q)",
			c.Activation, activationNone, activationSigmoid)
	}
}

// tagName normalizes one label as it comes off disk.
//
// Both vocabularies here are Danbooru's, which spells a multi-word tag with
// underscores ("no_humans"). Spaces read better in a UI and are what someone types
// into the tag box, so the underscores go — and they have to go on *both* label
// paths, or the same tag is one thing when it comes from a CSV and another when it
// comes from a text file, and searching for it only finds half the library.
func tagName(s string) string {
	return strings.ReplaceAll(strings.TrimSpace(s), "_", " ")
}

// readLabels reads either a wd14 `selected_tags.csv` (tag_id,name,category,count)
// or a plain one-label-per-line text file. Either way the result is index-aligned
// to the model's output vector.
func readLabels(path, fallbackCategory string) ([]label, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	if strings.EqualFold(filepath.Ext(path), ".csv") {
		return readLabelsCSV(f, fallbackCategory)
	}
	raw, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}
	var labels []label
	for _, line := range strings.Split(string(raw), "\n") {
		if l := strings.TrimSpace(line); l != "" {
			labels = append(labels, label{name: tagName(l), category: fallbackCategory})
		}
	}
	return labels, nil
}

func readLabelsCSV(r io.Reader, fallbackCategory string) ([]label, error) {
	rows, err := csv.NewReader(r).ReadAll()
	if err != nil {
		return nil, err
	}
	var labels []label
	for i, row := range rows {
		if len(row) < 3 {
			continue
		}
		if i == 0 && strings.EqualFold(strings.TrimSpace(row[0]), "tag_id") {
			continue // header
		}
		cat, ok := csvCategory[strings.TrimSpace(row[2])]
		if !ok {
			cat = fallbackCategory
		}
		labels = append(labels, label{name: tagName(row[1]), category: cat})
	}
	return labels, nil
}
