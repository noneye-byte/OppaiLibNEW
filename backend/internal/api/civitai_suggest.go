package api

import (
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// What a model's page recommends, read as settings.
//
// Civitai's public API has no field for a model's recommended settings. Creators
// write them into the model card instead — "Steps: 15-30", "CFG scale: 5-7",
// "Sampler: Euler a", a "Positive Prompt" heading with the quality tags on the next
// line, "Recommended strength 0.6–0.8" for a LoRA — and the pictures they post with
// a version carry the settings that made them (when an API key lets the catalogue
// share them). This reads both: the card first, since that is the creator saying
// what to use, and the showcase to fill what the card leaves out, since that is what
// the creator actually used. The answer is a suggestion; the editor shows it before
// anything is saved, and an install only fills settings the model has none for.

// civitaiSuggestion is what the catalogue recommends for one version. Zero fields
// mean the catalogue said nothing usable. Sources says, per field, whether it came
// from the "description" or the "examples".
type civitaiSuggestion struct {
	TriggerWords []string          `json:"triggerWords"`
	Positive     string            `json:"positive,omitempty"`
	Negative     string            `json:"negative,omitempty"`
	Steps        int               `json:"steps,omitempty"`
	CfgScale     float64           `json:"cfgScale,omitempty"`
	Scheduler    string            `json:"scheduler,omitempty"`
	ClipSkip     int               `json:"clipSkip,omitempty"`
	Width        int               `json:"width,omitempty"`
	Height       int               `json:"height,omitempty"`
	Weight       float64           `json:"weight,omitempty"`
	WeightMin    float64           `json:"weightMin,omitempty"`
	WeightMax    float64           `json:"weightMax,omitempty"`
	Sources      map[string]string `json:"sources"`
}

// civitaiSuggestInput is everything the suggestion is read from.
type civitaiSuggestInput struct {
	// IsLora decides which settings apply: a LoRA has a weight and a negative, a
	// checkpoint has everything a generation needs.
	IsLora bool
	// Descriptions are the version's card and then the model's, as plain text.
	Descriptions []string
	TrainedWords []string
	// Examples are the showcase pictures' generation data, as the catalogue gives it.
	Examples  []map[string]any
	VersionID int64
	// FileStem is the LoRA's file name without its extension, which is how a prompt's
	// <lora:…> names it.
	FileStem string
}

func civitaiSuggest(in civitaiSuggestInput) civitaiSuggestion {
	s := civitaiSuggestion{TriggerWords: civitaiCleanTriggers(in.TrainedWords), Sources: map[string]string{}}
	for _, desc := range in.Descriptions {
		s.fillFromDescription(desc, in.IsLora)
	}
	s.fillFromExamples(in)
	if in.IsLora {
		// A checkpoint's settings in a LoRA's card are the creator's test setup, not
		// something the LoRA asks for; picking a LoRA does not change the sampler.
		s.Positive, s.Steps, s.CfgScale, s.Scheduler, s.ClipSkip, s.Width, s.Height = "", 0, 0, "", 0, 0, 0
		for _, k := range []string{"positive", "steps", "cfgScale", "scheduler", "clipSkip", "size"} {
			delete(s.Sources, k)
		}
	} else {
		s.Weight, s.WeightMin, s.WeightMax = 0, 0, 0
		delete(s.Sources, "weight")
	}
	return s
}

// civitaiCleanTriggers trims the stray commas and spaces trained words often carry
// ("abstractionism, brush stroke, "), drops empties and repeats.
func civitaiCleanTriggers(words []string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, w := range words {
		w = strings.Trim(strings.TrimSpace(w), ", ")
		if w == "" || seen[strings.ToLower(w)] {
			continue
		}
		seen[strings.ToLower(w)] = true
		out = append(out, w)
	}
	return out
}

// ── the card ────────────────────────────────────────────────────────────────

var (
	// A range is written every way there is: 5-7, 5 – 7, 5~7, 5 to 7, 5 and 7.
	sugNum   = `(-?\d+(?:[.,]\d+)?)`
	sugRange = sugNum + `(?:\s*(?:-|–|—|~|～|to|and)\s*` + sugNum + `)?`

	sugStepsLabel = regexp.MustCompile(`(?i)\b(?:sampling\s+)?steps?\s*[:=：]?\s*(?:between\s+)?` + sugRange)
	sugStepsAfter = regexp.MustCompile(`(?i)` + sugRange + `\s*(?:sampling\s+)?steps\b`)
	sugCfg        = regexp.MustCompile(`(?i)\bcfg(?:\s*scale)?\s*[:=：]?\s*(?:of\s+|between\s+|at\s+)?` + sugRange)
	sugClipSkip   = regexp.MustCompile(`(?i)\bclip\s*-?skip\s*(?:of\s+)?[:=：]?\s*-?(\d{1,2})\b`)
	sugSize       = regexp.MustCompile(`(?i)\b(\d{3,4})\s*[x×*]\s*(\d{3,4})\b`)
	sugSizeLine   = regexp.MustCompile(`(?i)\b(resolution|size|res|dimensions?|images?\s+use|recommended)\b`)
	sugWeightKey  = regexp.MustCompile(`(?i)\b(?:weights?|strength|lora\s+strength)\b`)
	sugWeightNum  = regexp.MustCompile(`(?i)` + sugRange)
	sugAngled     = regexp.MustCompile(`<\s*(\d+(?:\.\d+)?)\s*>`)
	sugLoraTag    = regexp.MustCompile(`(?i)<lora:([^:>]+):\s*(-?\d+(?:\.\d+)?)[^>]*>`)
	// Not a LoRA's weight: an img2img or hires pass's denoising strength, a CFG
	// rescale, a block weight.
	sugNotWeight = regexp.MustCompile(`(?i)(denois|hires|hi-res|highres|upscal|block\s+weight|rescale|ipadapter|controlnet)`)
	// Not the steps a generation takes: the steps a training took, or a hires pass.
	sugNotSteps = regexp.MustCompile(`(?i)(hires|hi-res|highres|train|upscal|refiner|epoch|\bsteps?\s+(?:per|of\s+training))`)

	// A prompt label at the start of a line (after any bullet or emoji), with the
	// rest of the line or the next line being the prompt.
	sugPositiveLabel = regexp.MustCompile(`(?i)^(?:optional\s+|recommended\s+|suggested\s+|default\s+|my\s+)?(?:positive(?:\s+prompts?)?|quality\s+tags?|quality\s+prompts?|prompt\s+template)\s*(?:\([^)]*\))?\s*[:：]?\s*(.*)$`)
	sugNegativeLabel = regexp.MustCompile(`(?i)^(?:optional\s+|recommended\s+|suggested\s+|default\s+|my\s+)?(?:negative(?:\s+prompts?)?|negatives|neg(?:ative)?\s+prompts?)(?:\s+examples?)?\s*(?:\([^)]*\))?\s*[:：]?\s*(.*)$`)
	// Where a prompt pasted in after a label stops: the next label run on without a
	// line break, which a flattened card often has ("very aestheticnegative:").
	sugPromptEnd = regexp.MustCompile(`(?i)(?:negative(?:\s+prompts?)?|positive(?:\s+prompts?)?|prompts?)\s*(?:\([^)]*\))?\s*[:：]|(?:negative|positive)\s+prompts?\b|\b(?:steps|cfg|sampler|clip\s*skip)\s*[:：]`)
	sugLeadJunk  = regexp.MustCompile(`^[^\p{L}\p{N}(]+`)
	sugScoreLine = regexp.MustCompile(`(?i)^score_9\b`)
)

// fillFromDescription reads one card. A field already set by an earlier card (the
// version's, read before the model's) is kept.
func (s *civitaiSuggestion) fillFromDescription(desc string, isLora bool) {
	if strings.TrimSpace(desc) == "" {
		return
	}
	lines := []string{}
	for _, l := range strings.Split(desc, "\n") {
		l = strings.TrimSpace(sugLeadJunk.ReplaceAllString(strings.TrimSpace(l), ""))
		if l != "" {
			lines = append(lines, l)
		}
	}
	set := func(field string) bool {
		if _, done := s.Sources[field]; done {
			return false
		}
		s.Sources[field] = "description"
		return true
	}
	for i, line := range lines {
		next := ""
		if i+1 < len(lines) {
			next = lines[i+1]
		}
		if _, done := s.Sources["steps"]; !done && !sugNotSteps.MatchString(line) {
			if m := sugStepsLabel.FindStringSubmatch(line); m != nil {
				if n := sugMid(m[1], m[2], 1); n >= 4 && n <= 150 && set("steps") {
					s.Steps = int(n)
				}
			} else if m := sugStepsAfter.FindStringSubmatch(line); m != nil {
				if n := sugMid(m[1], m[2], 1); n >= 4 && n <= 150 && set("steps") {
					s.Steps = int(n)
				}
			}
		}
		if m := sugCfg.FindStringSubmatch(line); m != nil && !strings.Contains(strings.ToLower(line), "rescale") {
			if c := sugMid(m[1], m[2], 0.5); c >= 1 && c <= 30 && set("cfgScale") {
				s.CfgScale = c
			}
		}
		if m := sugClipSkip.FindStringSubmatch(line); m != nil {
			if n, _ := strconv.Atoi(m[1]); n >= 1 && n <= 12 && set("clipSkip") {
				s.ClipSkip = n
			}
		}
		if _, done := s.Sources["scheduler"]; !done {
			if id := civitaiSamplerInLine(line); id != "" && set("scheduler") {
				s.Scheduler = id
			}
		}
		if _, done := s.Sources["size"]; !done && sugSizeLine.MatchString(line) {
			if m := sugSize.FindStringSubmatch(line); m != nil {
				w, _ := strconv.Atoi(m[1])
				h, _ := strconv.Atoi(m[2])
				if w >= 256 && h >= 256 && w <= 2048 && h <= 2048 && set("size") {
					s.Width, s.Height = w, h
				}
			}
		}
		if isLora {
			if _, done := s.Sources["weight"]; !done {
				if w, lo, hi, ok := civitaiWeightInLine(line); ok && set("weight") {
					s.Weight, s.WeightMin, s.WeightMax = w, lo, hi
				}
			}
		}
		if _, done := s.Sources["positive"]; !done {
			if p := civitaiPromptAfter(sugPositiveLabel, line, next); p != "" && set("positive") {
				s.Positive = p
			} else if sugScoreLine.MatchString(line) {
				// Pony's card gives its quality template as a bare line of score tags.
				if p := civitaiTagLine(line); p != "" && set("positive") {
					s.Positive = p
				}
			}
		}
		if _, done := s.Sources["negative"]; !done {
			if p := civitaiPromptAfter(sugNegativeLabel, line, next); p != "" && set("negative") {
				s.Negative = p
			}
		}
	}
}

// sugMid reads a number or a range as one value: a range's middle, rounded to step.
func sugMid(a, b string, step float64) float64 {
	x, err := strconv.ParseFloat(strings.ReplaceAll(a, ",", "."), 64)
	if err != nil {
		return 0
	}
	if b != "" {
		if y, err := strconv.ParseFloat(strings.ReplaceAll(b, ",", "."), 64); err == nil {
			x = (x + y) / 2
		}
	}
	return math.Round(x/step) * step
}

// civitaiWeightInLine finds a LoRA's recommended weight in a line that talks about
// weight or strength: a number or a range near the word, or the <0.8> and
// <lora:name:0.8> forms creators paste.
func civitaiWeightInLine(line string) (w, lo, hi float64, ok bool) {
	if m := sugLoraTag.FindStringSubmatch(line); m != nil {
		if v, err := strconv.ParseFloat(m[2], 64); err == nil && v != 0 && math.Abs(v) <= 5 {
			return v, 0, 0, true
		}
	}
	loc := sugWeightKey.FindStringIndex(line)
	if loc == nil || sugNotWeight.MatchString(line) {
		return 0, 0, 0, false
	}
	if m := sugAngled.FindStringSubmatch(line); m != nil {
		if v, err := strconv.ParseFloat(m[1], 64); err == nil && v != 0 && v <= 5 {
			return v, 0, 0, true
		}
	}
	// The number is after the word ("strength 0.7", "weight between 0.8-1") or just
	// before it ("0.5-1.5 weights"), within a few words either way.
	after := line[loc[1]:]
	if len(after) > 40 {
		after = after[:40]
	}
	before := line[:loc[0]]
	if len(before) > 16 {
		before = before[len(before)-16:]
	}
	for _, part := range []string{after, before} {
		m := sugWeightNum.FindStringSubmatch(part)
		if m == nil {
			continue
		}
		a, errA := strconv.ParseFloat(strings.ReplaceAll(m[1], ",", "."), 64)
		if errA != nil || math.Abs(a) > 5 {
			continue
		}
		if m[2] != "" {
			b, err := strconv.ParseFloat(strings.ReplaceAll(m[2], ",", "."), 64)
			if err != nil || math.Abs(b) > 5 {
				continue
			}
			if a > b {
				a, b = b, a
			}
			mid := math.Round((a+b)/2*20) / 20
			if mid == 0 {
				continue
			}
			return mid, a, b, true
		}
		if a != 0 {
			return a, 0, 0, true
		}
	}
	return 0, 0, 0, false
}

// civitaiPromptAfter reads a labelled prompt: the rest of the line when there is
// one, else the next line. Only something shaped like a prompt counts — a sentence
// that happens to start with "Negative prompts are…" does not.
func civitaiPromptAfter(label *regexp.Regexp, line, next string) string {
	m := label.FindStringSubmatch(line)
	if m == nil {
		return ""
	}
	if p := civitaiTagLine(m[1]); p != "" {
		return p
	}
	if strings.TrimSpace(m[1]) != "" {
		// The label was followed by prose ("Negative prompt is not needed"): that
		// line is not a heading over a prompt either.
		return ""
	}
	if label.MatchString(next) {
		return ""
	}
	return civitaiTagLine(next)
}

// civitaiPlaceholder is a slot in a template rather than a tag: {{tags}}, [subject],
// (SUBJECT), "your prompt", "...".
var civitaiPlaceholder = regexp.MustCompile(`(?i)(\{|\}|\[|\]|^\(?\s*subject\s*\)?$|your\s+prompt|\.\.\.|…|^etc\.?$|^prompt$|^tag\s*\d*$|describe|what you want|rest of)`)

// civitaiTagLabel is a label run into the first tag — prefix: "masterpiece, …, or
// a version's name, v5x: sketch, … — told from a weighted tag (masterpiece:1.2) by
// the space after the colon.
var civitaiTagLabel = regexp.MustCompile(`^[\p{L}\p{N} ._-]{1,16}[:：]\s+["“]?`)

// civitaiTagLine keeps the prompt part of text that should be a comma-separated
// list of tags, or returns "" when it is not one: too long, too few tags, or tags
// that are really sentences.
func civitaiTagLine(text string) string {
	text = strings.TrimSpace(text)
	if loc := sugPromptEnd.FindStringIndex(text); loc != nil {
		text = text[:loc[0]]
	}
	if len(text) > 600 {
		return ""
	}
	if strings.Contains(text, "=") {
		// "embeddings SDXL = ac-neg1, …" is a note about a setup, not a prompt.
		return ""
	}
	text = civitaiTagLabel.ReplaceAllString(text, "")
	var tags []string
	for _, part := range strings.Split(text, ",") {
		part = strings.Trim(strings.TrimSpace(part), "\"'“”")
		if part == "" || civitaiPlaceholder.MatchString(part) {
			continue
		}
		if len(strings.Fields(part)) > 6 {
			return ""
		}
		tags = append(tags, part)
	}
	if len(tags) < 2 {
		return ""
	}
	return strings.Join(tags, ", ")
}

// civitaiSamplers are A1111's sampler names, lower-cased, as the studio's scheduler
// ids — the same table as web/src/civitai-prompt.ts, which maps a showcase picture's
// settings onto the form.
var civitaiSamplers = map[string]string{
	"euler a": "euler_a", "euler_a": "euler_a", "euler ancestral": "euler_a", "euler": "euler", "euler karras": "euler_k",
	"lms": "lms", "lms karras": "lms_k", "heun": "heun", "heun karras": "heun_k",
	"dpm2": "kdpm_2", "dpm2 karras": "kdpm_2_k", "dpm2 a": "kdpm_2_a", "dpm2 a karras": "kdpm_2_a_k",
	"dpm++ 2s a": "dpmpp_2s", "dpm++ 2s a karras": "dpmpp_2s_k",
	"dpm++ 2m": "dpmpp_2m", "dpm++ 2m karras": "dpmpp_2m_k",
	"dpm++ 2m sde": "dpmpp_2m_sde", "dpm++ 2m sde karras": "dpmpp_2m_sde_k",
	"dpm++ 3m sde": "dpmpp_3m", "dpm++ 3m sde karras": "dpmpp_3m_k",
	"dpm++ sde": "dpmpp_sde", "dpm++ sde karras": "dpmpp_sde_k",
	"ddim": "ddim", "ddpm": "ddpm", "deis": "deis", "unipc": "unipc", "lcm": "lcm", "pndm": "pndm", "tcd": "tcd",
}

// civitaiSamplerNames are the keys longest first, so "dpm++ 2m sde karras" is
// matched before "dpm++ 2m".
var civitaiSamplerNames = func() []string {
	names := make([]string, 0, len(civitaiSamplers))
	for k := range civitaiSamplers {
		names = append(names, k)
	}
	sort.Slice(names, func(i, j int) bool {
		if len(names[i]) != len(names[j]) {
			return len(names[i]) > len(names[j])
		}
		return names[i] < names[j]
	})
	return names
}()

// civitaiSamplerFor maps one sampler name as a picture's metadata gives it.
func civitaiSamplerFor(name string) string {
	key := strings.Join(strings.Fields(strings.ToLower(name)), " ")
	if id, ok := civitaiSamplers[key]; ok {
		return id
	}
	for _, id := range civitaiSamplers {
		if id == key {
			return id
		}
	}
	words := strings.Fields(key)
	for n := len(words) - 1; n >= 1; n-- {
		if id, ok := civitaiSamplers[strings.Join(words[:n], " ")]; ok {
			return id
		}
	}
	return ""
}

var (
	sugSamplerContext = regexp.MustCompile(`(?i)\b(sampler|sampling\s+method|scheduler|recommend|using|use)\b`)
	sugWordBreaks     = regexp.MustCompile(`[^\p{L}\p{N}+_]+`)
)

// civitaiSamplerInLine finds the first sampler a line that talks about samplers
// names: "Sampler: Euler a", "use CFG 6 with the Euler a sampler".
func civitaiSamplerInLine(line string) string {
	if !sugSamplerContext.MatchString(line) {
		return ""
	}
	// Punctuation between words reads as a space, so "Sampler：Euler a，" matches.
	norm := " " + strings.Join(strings.Fields(sugWordBreaks.ReplaceAllString(strings.ToLower(line), " ")), " ") + " "
	best, bestAt := "", len(norm)
	for _, name := range civitaiSamplerNames {
		if at := strings.Index(norm, " "+name+" "); at >= 0 && at < bestAt {
			best, bestAt = name, at
		}
	}
	if best == "" {
		return ""
	}
	return civitaiSamplers[best]
}

// ── the showcase ────────────────────────────────────────────────────────────

// civitaiQualityTag is a tag about quality rather than subject: what a checkpoint's
// recommended positive prefix is made of. Anything else common to the showcase
// ("1girl", "solo") is what those pictures were of, not what the model asks for.
var civitaiQualityTag = regexp.MustCompile(`(?i)^(score_\d+(_up)?|masterpiece|best quality|high quality|amazing quality|great quality|good quality|very aesthetic|aesthetic|absurdres|highres|newest|ultra[- ]detailed|highly detailed|8k|4k|uhd|hdr|raw photo|photorealistic|realistic|source_(anime|pony|furry|cartoon|real)|rating_(safe|questionable|explicit)|very awa|year \d{4})$`)

// fillFromExamples fills what the card left out from the showcase: the most common
// value of each setting, and for a LoRA the weight it was used at.
func (s *civitaiSuggestion) fillFromExamples(in civitaiSuggestInput) {
	if len(in.Examples) == 0 {
		return
	}
	set := func(field string) bool {
		if _, done := s.Sources[field]; done {
			return false
		}
		s.Sources[field] = "examples"
		return true
	}
	steps, cfgs, samplers, clips, sizes, negatives := counter{}, counter{}, counter{}, counter{}, counter{}, counter{}
	var weights []float64
	var prompts [][]string
	for _, m := range in.Examples {
		if m == nil {
			continue
		}
		if n := int(metaNumber(m, "steps")); n >= 4 && n <= 150 {
			steps.add(strconv.Itoa(n))
		}
		if c := metaNumber(m, "cfgScale"); c >= 1 && c <= 30 {
			cfgs.add(strconv.FormatFloat(c, 'f', -1, 64))
		}
		if id := civitaiSamplerFor(metaString(m, "sampler")); id != "" {
			samplers.add(id)
		}
		if c := int(math.Abs(metaNumber(m, "clipSkip", "Clip skip"))); c >= 1 && c <= 12 {
			clips.add(strconv.Itoa(c))
		}
		if size := metaString(m, "Size", "size"); sugSize.MatchString(size) {
			sizes.add(strings.ToLower(strings.ReplaceAll(size, " ", "")))
		}
		if neg := strings.TrimSpace(metaString(m, "negativePrompt")); neg != "" {
			negatives.add(neg)
		}
		if in.IsLora {
			if w, ok := civitaiExampleWeight(m, in.VersionID, in.FileStem); ok {
				weights = append(weights, w)
			}
		}
		if p := metaString(m, "prompt"); p != "" {
			prompts = append(prompts, civitaiPromptTags(p))
		}
	}
	if v, ok := steps.top(1); ok && set("steps") {
		s.Steps, _ = strconv.Atoi(v)
	}
	if v, ok := cfgs.top(1); ok && set("cfgScale") {
		s.CfgScale, _ = strconv.ParseFloat(v, 64)
	}
	if v, ok := samplers.top(1); ok && set("scheduler") {
		s.Scheduler = v
	}
	if v, ok := clips.top(1); ok && set("clipSkip") {
		s.ClipSkip, _ = strconv.Atoi(v)
	}
	if v, ok := sizes.top(1); ok {
		if m := sugSize.FindStringSubmatch(v); m != nil && set("size") {
			s.Width, _ = strconv.Atoi(m[1])
			s.Height, _ = strconv.Atoi(m[2])
		}
	}
	// A negative is taken only when the creator reused it: one picture's negative
	// is that picture's.
	if v, ok := negatives.top(min(2, len(in.Examples))); ok && set("negative") {
		s.Negative = v
	}
	if len(weights) > 0 && set("weight") {
		sort.Float64s(weights)
		s.Weight = weights[len(weights)/2]
		if lo, hi := weights[0], weights[len(weights)-1]; lo != hi {
			s.WeightMin, s.WeightMax = lo, hi
		}
	}
	if len(prompts) >= 2 {
		if p := civitaiCommonQuality(prompts); p != "" && set("positive") {
			s.Positive = p
		}
	}
}

// civitaiExampleWeight is the weight a showcase picture used this LoRA at: from the
// resources the catalogue lists by version, else from the prompt's <lora:name:w>.
func civitaiExampleWeight(m map[string]any, versionID int64, stem string) (float64, bool) {
	for _, key := range []string{"civitaiResources", "resources"} {
		list, _ := m[key].([]any)
		for _, item := range list {
			r, _ := item.(map[string]any)
			if r == nil || !strings.EqualFold(metaString(r, "type"), "lora") {
				continue
			}
			matches := versionID > 0 && int64(metaNumber(r, "modelVersionId")) == versionID
			if !matches && stem != "" {
				matches = civitaiSameName(metaString(r, "name"), stem)
			}
			if !matches {
				continue
			}
			if w := metaNumber(r, "weight", "strength"); w != 0 && math.Abs(w) <= 5 {
				return w, true
			}
		}
	}
	if stem == "" {
		return 0, false
	}
	for _, tag := range sugLoraTag.FindAllStringSubmatch(metaString(m, "prompt"), -1) {
		if civitaiSameName(tag[1], stem) {
			if w, err := strconv.ParseFloat(tag[2], 64); err == nil && w != 0 && math.Abs(w) <= 5 {
				return w, true
			}
		}
	}
	return 0, false
}

var sugNameJunk = regexp.MustCompile(`[^a-z0-9]+`)

func civitaiSameName(a, b string) bool {
	a = sugNameJunk.ReplaceAllString(strings.ToLower(a), "")
	b = sugNameJunk.ReplaceAllString(strings.ToLower(b), "")
	return a != "" && a == b
}

var sugWeightParens = regexp.MustCompile(`^[(\[]+|[)\]]+$|:\s*\d+(?:\.\d+)?\)?$`)

// civitaiPromptTags splits a prompt into its tags, without the weighting brackets
// and without <lora:…> tags.
func civitaiPromptTags(prompt string) []string {
	prompt = sugLoraTag.ReplaceAllString(prompt, "")
	var out []string
	for _, part := range strings.FieldsFunc(prompt, func(r rune) bool { return r == ',' || r == '\n' || r == '|' }) {
		part = strings.TrimSpace(sugWeightParens.ReplaceAllString(strings.TrimSpace(part), ""))
		part = strings.TrimSpace(sugWeightParens.ReplaceAllString(part, ""))
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

// civitaiCommonQuality is the quality tags most of the showcase's prompts share, in
// the order the first such prompt has them.
func civitaiCommonQuality(prompts [][]string) string {
	count := map[string]int{}
	for _, tags := range prompts {
		seen := map[string]bool{}
		for _, t := range tags {
			k := strings.ToLower(strings.ReplaceAll(t, "_", " "))
			if civitaiQualityTag.MatchString(t) && !seen[k] {
				seen[k] = true
				count[k]++
			}
		}
	}
	need := (len(prompts)*3 + 4) / 5 // three in five
	var out []string
	added := map[string]bool{}
	for _, tags := range prompts {
		for _, t := range tags {
			k := strings.ToLower(strings.ReplaceAll(t, "_", " "))
			if count[k] >= need && !added[k] {
				added[k] = true
				out = append(out, t)
			}
		}
	}
	if len(out) == 0 {
		return ""
	}
	return strings.Join(out, ", ")
}

// counter is a tally of values, for the most common one.
type counter map[string]int

func (c counter) add(v string) { c[v]++ }

// top is the most common value seen at least least times; ties go to the
// lexically smaller, so the answer does not depend on map order.
func (c counter) top(least int) (string, bool) {
	best, n := "", 0
	for v, k := range c {
		if k > n || (k == n && v < best) {
			best, n = v, k
		}
	}
	return best, n >= least && n > 0
}
