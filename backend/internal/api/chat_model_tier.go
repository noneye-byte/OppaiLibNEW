package api

import (
	"regexp"
	"strconv"
	"strings"
)

// How big the model is, and what that is allowed to change.
//
// Every number in chat_sampling.go was chosen against a 7B quant on an 8 GB card, and
// the file says so. Most of them are still right at any size — a reaction is a beat
// because a reaction is a beat, and a factual answer is cold because invention is the
// failure there. Two of them are not. They are crutches for a small model, and on a
// large one they are damage:
//
//   - The repetition penalty. At 1.10–1.18 it is what stops a 7B writing the same
//     paragraph twice. A 24B does not need it, and pays for it: the penalty falls on
//     every token it has already used, which in a long scene means the ordinary words —
//     her name, "you", the punctuation of the protocol tags — and the reply drifts into
//     thesaurus prose and then into dropped tags. It is the commonest reason a good
//     local model reads worse in an app than it does in a bare chat window.
//   - The length cap on a scene. 1024 tokens is roughly where a 7B stops being worth
//     reading. It is nowhere near where a 24B does.
//
// So the tier is read once and those two are relaxed. Nothing else moves, and the
// automatic path is still clamped — see largeSamplingBounds — because "bigger model"
// is a reason to loosen the envelope, never to remove it.

// modelTier is how much slack the sampler gets.
type modelTier int

const (
	// tierSmall is the original envelope: 7B-to-13B class, and the safe assumption
	// whenever the model will not say what it is.
	tierSmall modelTier = iota
	// tierLarge is a 24B and up, which is what a 32 GB card is for.
	tierLarge
)

func (t modelTier) String() string {
	if t == tierLarge {
		return "large"
	}
	return "small"
}

// largeTierBillions is where a model stops wanting the small-model crutches.
//
// Drawn at 20 rather than at some rounder number because of what actually sits either
// side of it: a 12B–14B still loops without help, and the 24B/27B/32B dense instruct
// models — the ones a 32 GB card is bought to run at a useful quant — do not. A 14B is
// deliberately on the cautious side of the line; someone who disagrees sets the tier by
// hand, which is what the setting is for.
const largeTierBillions = 20

// paramCount reads a parameter count out of a model name: "Qwen3-32B-Q5_K_M" → 32,
// "Mistral-Small-3.2-24B-Instruct" → 24, "Llama-3.2-1B" → 1.
//
// The leading boundary is what makes this safe on the names people actually have.
// Without it "3.2-24B" would also offer "2" from the version, and a quantisation
// suffix or a date in the folder name would offer more. With it, only a number that
// starts a word and ends in B counts, which is the convention every published GGUF
// follows. A mixture-of-experts name ("8x7B") matches nothing, because the 7 has no
// boundary before it — the right answer there anyway, since an 8x7B behaves like its
// active 13B for everything this decides.
var paramCountPattern = regexp.MustCompile(`(?i)(^|[^0-9a-z])([0-9]{1,3}(?:\.[0-9])?)\s?b([^0-9a-z]|$)`)

// tierFromModelName reads the tier off a model name, largest count wins. An empty or
// unreadable name is small: the crutches cost a large model some polish, whereas their
// absence costs a small one a looping reply, so the unknown case leans that way.
func tierFromModelName(name string) modelTier {
	best := 0.0
	for _, m := range paramCountPattern.FindAllStringSubmatch(name, -1) {
		if v, err := strconv.ParseFloat(m[2], 64); err == nil && v > best {
			best = v
		}
	}
	if best >= largeTierBillions {
		return tierLarge
	}
	return tierSmall
}

// resolveModelTier is the tier for a turn: what the operator set, or what the loaded
// model's name says.
//
// The setting wins outright and is not sanity-checked against the name. Someone running
// a 12B merge that holds together without the penalty, or a 30B that does not, knows
// something this cannot read off a filename.
func resolveModelTier(setting, modelName string) modelTier {
	switch strings.ToLower(strings.TrimSpace(setting)) {
	case "small":
		return tierSmall
	case "large":
		return tierLarge
	}
	return tierFromModelName(modelName)
}
