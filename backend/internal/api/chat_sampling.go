package api

import (
	"fmt"
	"strings"
)

// Sampler settings, chosen per turn instead of pinned once.
//
// Before this the web client shipped one set of numbers with every request — temperature
// 0.8, top_p 0.95, repetition_penalty 1.1, 400 tokens — and they were wrong for most of
// what she does. 400 tokens invites a 7B model to keep writing past the end of a one-line
// answer; 0.8/0.95 is loose enough that a factual question about the library gets a
// confidently invented answer; and nothing in the set discourages the loops a small model
// falls into over a long scene.
//
// So the task decides. Each class below is a bounded preset, and "bounded" is the whole
// design: every value stays inside what OpenHermes-2.5-Mistral-7B actually behaves well at
// (see samplingBounds), because the model this runs against is a 7B quant on 8 GB and the
// failure modes at the edges — loops, word salad, three-minute replies — are worse than any
// preset being slightly off. An advanced user's explicit numbers still win; see handleChat,
// where in.Options is layered over these.

// chatTask is what this turn is for. The vocabulary is the brief's, and each one exists
// because it wants genuinely different numbers, not because more classes is better.
type chatTask string

const (
	// taskCasual is ordinary conversation: the default and much the commonest.
	taskCasual chatTask = "casual"
	// taskEmotional is a turn with feeling in it — comfort, a fight, being wanted.
	taskEmotional chatTask = "emotional"
	// taskFactual is a question with a real answer, usually about the library or the app.
	taskFactual chatTask = "factual"
	// taskCreative is a long scene, roleplay, or explicit writing that has to stay novel.
	taskCreative chatTask = "creative"
	// taskReaction is a beat, not a reply: reacting to a picture or to what is on screen.
	taskReaction chatTask = "reaction"
	// taskAutonomous is her speaking first, unprompted.
	taskAutonomous chatTask = "autonomous"
	// taskObservation is a private thought she may or may not decide to say.
	taskObservation chatTask = "observation"
	// taskPlanning is working out an action to propose. Nearly deterministic on purpose.
	taskPlanning chatTask = "planning"
)

// samplingPreset is the full set of knobs for one task.
//
// Every field is sent on every request rather than relying on the backend's defaults:
// text-generation-webui, llama.cpp and vLLM disagree about what an unset sampler means,
// and a preset that only holds half the values is a preset whose behaviour depends on
// which backend the user happens to be running.
type samplingPreset struct {
	Temperature      float64 `json:"temperature"`
	TopP             float64 `json:"top_p"`
	TopK             int     `json:"top_k"`
	MinP             float64 `json:"min_p"`
	RepetitionPen    float64 `json:"repetition_penalty"`
	RepetitionRange  int     `json:"repetition_penalty_range"`
	MaxTokens        int     `json:"max_tokens"`
	FrequencyPenalty float64 `json:"frequency_penalty,omitempty"`
	PresencePenalty  float64 `json:"presence_penalty,omitempty"`
}

// samplingPresets is the table. Read it as: how much surprise does this task want, and how
// long may the answer be.
//
// The recurring shape is min_p carrying the truncation rather than top_p. On a 7B quant,
// min_p is the sampler that keeps a high temperature coherent — it cuts the long tail
// relative to the top token, so raising temperature buys variety instead of nonsense. That
// is why the creative preset can sit at 0.95 without falling apart.
var samplingPresets = map[chatTask]samplingPreset{
	// Roomy enough to sound unrehearsed, short enough that she texts rather than writes.
	taskCasual: {Temperature: 0.85, TopP: 0.92, TopK: 40, MinP: 0.05, RepetitionPen: 1.10, RepetitionRange: 1024, MaxTokens: 220},
	// Slightly tighter and a little longer: feeling wants coherence more than novelty, and
	// a hurt or tender turn is where she is allowed a few more lines.
	taskEmotional: {Temperature: 0.80, TopP: 0.90, TopK: 40, MinP: 0.06, RepetitionPen: 1.12, RepetitionRange: 1536, MaxTokens: 280},
	// Cold, because this is the class where a small model invents. Facts about the library
	// are all in the prompt; the job is to read them out in her voice, not to imagine them.
	taskFactual: {Temperature: 0.40, TopP: 0.85, TopK: 20, MinP: 0.10, RepetitionPen: 1.05, RepetitionRange: 1024, MaxTokens: 320},
	// The one preset that runs hot. A long scene has to keep finding new words, and the
	// wide repetition range is what stops the paragraph-level loops a 7B falls into.
	taskCreative: {Temperature: 0.95, TopP: 0.95, TopK: 60, MinP: 0.04, RepetitionPen: 1.15, RepetitionRange: 2048, MaxTokens: 480},
	// A beat. The hard cap is doing the real work here — asked to react to a picture with
	// 400 tokens available, a model writes an essay about it.
	taskReaction: {Temperature: 0.90, TopP: 0.92, TopK: 40, MinP: 0.05, RepetitionPen: 1.12, RepetitionRange: 1024, MaxTokens: 100},
	// Opening a conversation from nothing. High penalties because unprompted messages are
	// the ones that come out as the same greeting every time.
	taskAutonomous: {Temperature: 0.92, TopP: 0.93, TopK: 50, MinP: 0.05, RepetitionPen: 1.18, RepetitionRange: 2048, MaxTokens: 140, PresencePenalty: 0.2},
	// A private thought: short, plain, and not a performance.
	taskObservation: {Temperature: 0.70, TopP: 0.90, TopK: 40, MinP: 0.08, RepetitionPen: 1.10, RepetitionRange: 1024, MaxTokens: 120},
	// Working out an action to propose. Nearly deterministic: this output is parsed, and
	// creativity in a tag's arguments is only ever a bug.
	taskPlanning: {Temperature: 0.30, TopP: 0.80, TopK: 20, MinP: 0.10, RepetitionPen: 1.05, RepetitionRange: 512, MaxTokens: 200},
}

// samplingBounds is the envelope every preset and every adjustment is clamped into.
//
// This is the safety rail for a 7B-class local model, and it applies to the tuner's own
// output — not to the user's explicit overrides, which are layered on afterwards and are
// theirs to get wrong. Nothing the automatic path chooses can push the model into the
// regions where it loops (repetition penalty at 1.0), degenerates (temperature past 1.1
// with a loose tail), or takes minutes to answer (unbounded max_tokens).
var samplingBounds = struct {
	tempMin, tempMax   float64
	topPMin, topPMax   float64
	topKMin, topKMax   int
	minPMin, minPMax   float64
	repMin, repMax     float64
	rangeMin, rangeMax int
	maxTokMin          int
	maxTokMax          int
}{
	tempMin: 0.20, tempMax: 1.05,
	topPMin: 0.70, topPMax: 0.98,
	topKMin: 10, topKMax: 100,
	minPMin: 0.00, minPMax: 0.20,
	repMin: 1.00, repMax: 1.25,
	rangeMin: 256, rangeMax: 4096,
	maxTokMin: 48, maxTokMax: 768,
}

func (p *samplingPreset) clamp() {
	p.Temperature = clampFloat(p.Temperature, samplingBounds.tempMin, samplingBounds.tempMax)
	p.TopP = clampFloat(p.TopP, samplingBounds.topPMin, samplingBounds.topPMax)
	p.MinP = clampFloat(p.MinP, samplingBounds.minPMin, samplingBounds.minPMax)
	p.RepetitionPen = clampFloat(p.RepetitionPen, samplingBounds.repMin, samplingBounds.repMax)
	p.TopK = clampInt(p.TopK, samplingBounds.topKMin, samplingBounds.topKMax)
	p.RepetitionRange = clampInt(p.RepetitionRange, samplingBounds.rangeMin, samplingBounds.rangeMax)
	p.MaxTokens = clampInt(p.MaxTokens, samplingBounds.maxTokMin, samplingBounds.maxTokMax)
}

// clampFloat is the float twin of clampInt (handlers_imagegen.go), which this reuses.
func clampFloat(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// chatStops keeps a small model inside its own turn.
//
// The failure this prevents is the commonest one in the whole system: handed a transcript,
// a 7B model finishes its reply and then writes the user's next line too. The names are
// the labels it reaches for when it does. "<|im_end|>" is ChatML's own terminator, which
// leaks as literal text through some builds of text-generation-webui.
//
// The mood and send tags are safe from these because they are the last thing in a reply and
// none of these strings can appear inside one.
func chatStops(userName string) []string {
	stops := []string{"\nUser:", "\nuser:", "\nYou:", "\nHuman:", "<|im_end|>", "<|im_start|>"}
	if userName = strings.TrimSpace(userName); userName != "" && len(userName) <= 40 {
		stops = append(stops, "\n"+userName+":")
	}
	return stops
}

// questionShaped recognises a turn that wants an answer rather than a reply. Deliberately
// crude — a question mark and the interrogatives — because the cost of a miss is only that
// a factual turn is sampled at conversational temperature.
var factualOpeners = []string{
	"what ", "what's", "whats", "which ", "how many", "how much", "how big", "when did",
	"when was", "where is", "where are", "do i have", "do we have", "have i", "is there",
	"are there", "how long", "list ", "show me all", "count ",
}

// libraryWords are the nouns that make a question a question about the collection — the
// class where invention is worst and cold sampling helps most.
var libraryWords = []string{
	"library", "collection", "shelves", "tag", "tags", "tagged", "how many", "storage",
	"disk", "space", "version", "uptime", "server", "recently", "added", "gallery",
}

// classifyChatTask decides what this turn is for.
//
// Ordered by how confident the signal is, most confident first: an explicit task from the
// client beats any guess, a picture or a shared screen is unambiguous, and only then does
// it fall back to reading the text. Nothing here is a hard call — an unrecognised turn is
// casual conversation, which is what most turns are.
func classifyChatTask(in chatRequest, latestUser string) chatTask {
	// The client knows things the text cannot show: an idle nudge is autonomous however it
	// is worded, and a private observation is never a reply at all. Validated against the
	// table so a client cannot invent a task with no preset behind it.
	if requested := chatTask(strings.ToLower(strings.TrimSpace(in.Task))); requested != "" {
		if _, known := samplingPresets[requested]; known {
			return requested
		}
	}
	// A picture just arrived, or they are holding something up on a shared screen. Either
	// way what is wanted is a sentence or two about the thing in front of her, not a reply
	// to a message — and the length cap is what makes that happen.
	if len(in.PhotoTags) > 0 || in.Viewing != nil {
		return taskReaction
	}
	lower := strings.ToLower(strings.TrimSpace(latestUser))
	// A question about the collection, answered from facts already in the prompt.
	if strings.Contains(lower, "?") || hasAnyPrefix(lower, factualOpeners) {
		if containsAny(lower, libraryWords) {
			return taskFactual
		}
	}
	// A long scene, or an explicitly explicit one. Both want the hot preset: the mode is
	// the user's own statement of what this conversation is, and a wall of text from them
	// is a scene in progress rather than texting.
	if in.Mode == "roleplay" || in.Mode == "horny" || in.Intensity >= 4 || len(latestUser) > 600 {
		return taskCreative
	}
	// Feeling, either theirs or hers. Checked after the scene classes so an emotional line
	// inside a roleplay stays creative.
	if containsAny(lower, emotionalWords) {
		return taskEmotional
	}
	return taskCasual
}

// emotionalWords are what a turn with feeling in it says. Kept short and unambiguous:
// a false positive here only tightens temperature slightly and lengthens the cap.
var emotionalWords = []string{
	"sorry", "i love", "love you", "miss you", "missed you", "hurt", "upset", "sad",
	"lonely", "scared", "anxious", "tired of", "angry", "mad at", "hate", "fuck you",
	"shut up", "stupid", "worthless", "thank you", "thanks for", "proud of", "mean a lot",
	"i need you", "don't leave", "dont leave", "forgive",
}

func hasAnyPrefix(s string, prefixes []string) bool {
	for _, p := range prefixes {
		if strings.HasPrefix(s, p) {
			return true
		}
	}
	return false
}

func containsAny(s string, needles []string) bool {
	for _, n := range needles {
		if strings.Contains(s, n) {
			return true
		}
	}
	return false
}

// tuneSampling picks the preset for a turn and applies the bounded adjustments the moment
// calls for. Returns the task alongside the values so both can be reported and logged.
//
// The adjustments are small and few by design. A preset table plus per-request nudges is
// already two systems deciding one number; a third would make the chosen values impossible
// to reason about from the outside, which is exactly what the copyable log below is for.
func tuneSampling(in chatRequest, latestUser string) (chatTask, samplingPreset) {
	task := classifyChatTask(in, latestUser)
	preset, known := samplingPresets[task]
	if !known {
		task, preset = taskCasual, samplingPresets[taskCasual]
	}
	// Heat loosens her. A peaked scene should not read like the same sentences at a higher
	// word count, and the clamp keeps this from ever reaching the incoherent range.
	if in.Intensity >= 4 && task != taskFactual && task != taskPlanning {
		preset.Temperature += 0.03 * float64(in.Intensity-3)
		preset.RepetitionPen += 0.01
	}
	// A long history is where a small model starts repeating itself, so the penalty rises
	// with the conversation rather than being set once for a chat that has barely started.
	if len(in.Messages) > 24 {
		preset.RepetitionPen += 0.02
		preset.RepetitionRange += 512
	}
	preset.clamp()
	return task, preset
}

// samplingFields renders a preset as the JSON keys the backend expects.
//
// One map, both dialects: text-generation-webui reads min_p and repetition_penalty_range,
// while a strict OpenAI-compatible server ignores them and reads temperature/top_p/
// max_tokens. Sending the union is what makes one code path work against both — an unknown
// sampler key is dropped by every backend this talks to, whereas a missing one silently
// falls back to that backend's own default.
func samplingFields(p samplingPreset) map[string]any {
	fields := map[string]any{
		"temperature":              p.Temperature,
		"top_p":                    p.TopP,
		"top_k":                    p.TopK,
		"min_p":                    p.MinP,
		"repetition_penalty":       p.RepetitionPen,
		"repetition_penalty_range": p.RepetitionRange,
		"max_tokens":               p.MaxTokens,
	}
	if p.FrequencyPenalty != 0 {
		fields["frequency_penalty"] = p.FrequencyPenalty
	}
	if p.PresencePenalty != 0 {
		fields["presence_penalty"] = p.PresencePenalty
	}
	return fields
}

// samplingSummary is the one-line, copyable record of what a generation actually used.
//
// The brief asks for the selected values to be logged and copyable, and this is both: it
// goes to the server log and comes back in the response for the UI's copy button. Written
// as key=value in a fixed order so two generations can be diffed by eye.
func samplingSummary(task chatTask, p samplingPreset, overridden []string) string {
	out := fmt.Sprintf("task=%s temperature=%.2f top_p=%.2f top_k=%d min_p=%.2f repetition_penalty=%.2f repetition_penalty_range=%d max_tokens=%d",
		task, p.Temperature, p.TopP, p.TopK, p.MinP, p.RepetitionPen, p.RepetitionRange, p.MaxTokens)
	if len(overridden) > 0 {
		out += " overridden=" + strings.Join(overridden, ",")
	}
	return out
}
