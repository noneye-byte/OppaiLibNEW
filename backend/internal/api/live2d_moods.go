package api

import "strings"

// Which of a model's expressions she wears for which mood.
//
// A Live2D model's expressions are whatever its rigger made: some are faces (crying,
// heart eyes, a scowl), most on a VTuber model are props (a hat, glasses, a summoned
// staff), and they are named in the rigger's language or not at all — "x.exp3.json". She
// has twelve moods. The guess here pairs them up by the words in each expression's name
// and label, in English, Chinese and Japanese, and leaves alone anything it cannot
// place; the user corrects it in her settings. A prop is never guessed into a mood: a
// hat that comes and goes with her temper is worse than no hat.

// live2dMoodWords are, per mood, the words that put an expression on it. Order matters
// only within a mood: an expression matching an earlier word is preferred.
var live2dMoodWords = map[string][]string{
	"sad":         {"cry", "crying", "tear", "sad", "sob", "哭", "泣", "悲", "伤心", "涙", "なみだ"},
	"annoyed":     {"angry", "anger", "mad", "annoy", "pout", "生气", "生氣", "怒", "气", "不爽", "ぷんぷん"},
	"loving":      {"heart", "love", "爱心", "愛心", "爱", "愛", "ハート", "♥", "❤"},
	"excited":     {"star", "sparkle", "excite", "星星", "星", "キラ", "闪", "閃"},
	"happy":       {"happy", "smile", "joy", "笑", "开心", "開心", "嬉"},
	"shy":         {"blush", "shy", "embarrass", "脸红", "臉紅", "害羞", "红", "照れ", "赤"},
	"surprised":   {"surprise", "shock", "gasp", "惊", "驚", "びっくり"},
	"sleepy":      {"sleep", "tired", "drowsy", "困", "睡", "眠"},
	"smug":        {"smug", "得意", "ドヤ"},
	"thinking":    {"think", "ponder", "思", "想", "考"},
	"mischievous": {"wink", "tongue", "tease", "坏笑", "壞笑", "舌", "ウインク"},
}

// live2dPropWords mark an expression as a prop — something worn or held — which no mood
// takes, whatever else its name says. "Heart-shaped glasses" are glasses.
var live2dPropWords = []string{
	"hat", "glasses", "glass", "bow", "ribbon", "staff", "wand", "mic", "microphone", "gesture", "hand", "game", "controller", "ghost", "pet", "toggle", "outfit", "cloth", "coat", "hair",
	"帽", "眼镜", "眼鏡", "蝴蝶结", "蝴蝶結", "杖", "法杖", "话筒", "話筒", "麦", "手势", "手勢", "游戏", "遊戲", "幽灵", "幽靈", "切换", "切換", "衣", "发型", "髪", "メガネ", "帽子", "リボン",
}

// guessLive2DMoods pairs her moods with expressions by name. A mood with no likely
// expression is left out; so is any expression that reads as a prop.
func guessLive2DMoods(exprs []live2dExpression) map[string][]string {
	out := map[string][]string{}
	for _, mood := range libbyEmotions {
		words := live2dMoodWords[mood]
		best, bestRank := "", len(words)
		for _, e := range exprs {
			hay := strings.ToLower(e.Name + " " + e.Label)
			if live2dIsProp(hay) {
				continue
			}
			for rank, w := range words {
				if rank < bestRank && strings.Contains(hay, w) {
					best, bestRank = e.Name, rank
					break
				}
			}
		}
		if best != "" {
			out[mood] = []string{best}
		}
	}
	return out
}

func live2dIsProp(hay string) bool {
	for _, w := range live2dPropWords {
		if strings.Contains(hay, w) {
			return true
		}
	}
	return false
}

// cleanLive2DMoods keeps only real moods and real expressions, at most three a mood.
func cleanLive2DMoods(moods map[string][]string, exprs []live2dExpression) map[string][]string {
	known := map[string]bool{}
	for _, e := range exprs {
		known[e.Name] = true
	}
	out := map[string][]string{}
	for mood, names := range moods {
		if !supportedLibbyEmotions[mood] {
			continue
		}
		var kept []string
		seen := map[string]bool{}
		for _, n := range names {
			if known[n] && !seen[n] && len(kept) < 3 {
				seen[n] = true
				kept = append(kept, n)
			}
		}
		if len(kept) > 0 {
			out[mood] = kept
		}
	}
	return out
}

// cleanLive2DWorn keeps the expressions worn all the time that really exist.
func cleanLive2DWorn(worn []string, exprs []live2dExpression) []string {
	known := map[string]bool{}
	for _, e := range exprs {
		known[e.Name] = true
	}
	var out []string
	seen := map[string]bool{}
	for _, n := range worn {
		if known[n] && !seen[n] {
			seen[n] = true
			out = append(out, n)
		}
	}
	return out
}
