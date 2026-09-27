package tts

import (
	"regexp"
	"strings"
	"unicode"
)

// How a text reads when it is said out loud.
//
// She texts like a person, and a person's texts are not a script. "fr" came out as
// "eff are", "idk" as three letters, "sooo" as something espeak had to guess at, and a
// stage direction — "*giggles*", "*leans in*" — was read out as if she had said the
// word. Nobody says "giggles"; they giggle. So before a line reaches any engine it is
// turned into what the person who wrote it would actually have said: the shorthand
// expanded, the drawn-out letters drawn back in, the emoticons and the tildes gone,
// and an action either made into the sound it describes or left silent.
//
// This runs for every engine. Piper, Kokoro and a remote server all phonemise with
// espeak or something like it, and none of them knows "ngl".

// slang is texting shorthand in the words it stands for. Keys are lowercase; matching
// is whole-word and case-insensitive except where noted in spokenWord. An empty value
// drops the word: "smh" and "xoxo" are things you type, not things you say.
var slang = map[string]string{
	"fr": "for real", "frfr": "for real for real", "ngl": "not gonna lie", "tbh": "to be honest", "tbf": "to be fair",
	"idk": "I don't know", "idc": "I don't care", "idgaf": "I don't give a fuck", "ik": "I know", "ikr": "I know, right",
	"icl": "I can't lie", "rn": "right now", "omg": "oh my god", "omfg": "oh my fucking god", "btw": "by the way",
	"imo": "in my opinion", "imho": "in my honest opinion", "ily": "I love you", "ilysm": "I love you so much",
	"lol": "haha", "lmao": "haha", "lmfao": "haha", "rofl": "haha", "wyd": "what are you doing", "wya": "where are you",
	"hbu": "how about you", "wbu": "what about you", "hru": "how are you", "ty": "thank you", "tysm": "thank you so much",
	"thx": "thanks", "np": "no problem", "pls": "please", "plz": "please", "u": "you", "ur": "your", "r": "are",
	"bc": "'cause", "cuz": "'cause", "cos": "'cause", "coz": "'cause", "smth": "something", "sth": "something",
	"abt": "about", "tho": "though", "k": "okay", "kk": "okay", "ok": "okay", "brb": "be right back", "gtg": "gotta go",
	"g2g": "gotta go", "ttyl": "talk to you later", "nvm": "never mind", "istg": "I swear to god", "jk": "just kidding",
	"jfc": "jesus fucking christ", "wtf": "what the fuck", "wth": "what the hell", "ffs": "for fuck's sake",
	"stfu": "shut up", "af": "as fuck", "asf": "as fuck", "bf": "boyfriend", "gf": "girlfriend", "bby": "baby",
	"luv": "love", "gn": "good night", "gm": "good morning", "ppl": "people", "probs": "probably", "tmrw": "tomorrow",
	"tmr": "tomorrow", "tn": "tonight", "rly": "really", "srsly": "seriously", "sry": "sorry", "obv": "obviously",
	"obvi": "obviously", "ofc": "of course", "fs": "for sure", "irl": "in real life", "im": "I'm", "ive": "I've",
	"dont": "don't", "cant": "can't", "wont": "won't", "didnt": "didn't", "isnt": "isn't", "thats": "that's",
	"ya": "you", "yall": "y'all", "smh": "", "xoxo": "", "xo": "", "xx": "", "xxx": "",
}

// caseSensitiveSlang are the entries that are a word only in lowercase: "R" is a
// language and a letter, "K" is a grade.
var caseSensitiveSlang = map[string]bool{"r": true, "k": true}

// shoutWords are short capitalised words that are shouting, not an acronym. Longer
// all-caps words are always read as shouting; espeak spells a short one out.
var shoutWords = map[string]bool{
	"NO": true, "YES": true, "OH": true, "AND": true, "THE": true, "YOU": true, "ME": true, "MY": true, "SO": true,
	"GO": true, "HI": true, "WHY": true, "HOW": true, "NOW": true, "WOW": true, "OMG": true, "BUT": true, "OK": true,
}

var (
	spokenWord = regexp.MustCompile(`[A-Za-z]+(?:'[A-Za-z]+)?`)
	withSlash  = regexp.MustCompile(`(?i)\bw/o\b|\bw/`)
	// An action between single asterisks. The characters either side are captured
	// because Go's regexp has no lookaround, and bold (**) must not match.
	actionSpan = regexp.MustCompile(`(^|[^*])\*([^*\n]{1,160})\*([^*]|$)`)
	emoticon   = regexp.MustCompile(`(?i)(?:^|\s)(?:[:;=][-']?[)(\]\[dpo3/\\|*]+|<3+|</3|\^[_.]?\^|>[_.]<|t[_.]t|x[d]+|uwu|owo|:3)(?:\s|$|[.,!?])`)
	punctRun   = regexp.MustCompile(`[!?]{2,}`)
	tilde      = regexp.MustCompile(`~+`)
)

// SoundStyle is how an engine takes a laugh or a sigh.
//
// Most voices can only say words, so a laugh is written as one ("haha") and a sigh is
// left out. The expressive GPU voices perform them: Chatterbox Turbo reads "[laugh]" and
// Orpheus reads "<laugh>" as the sound itself, in the voice, which is most of what makes
// them sound like a person rather than a reader. Each spells its own set, and a tag it
// does not know is read out as the word — so a sound with no tag in that engine's set
// falls back to the words, never to a guessed tag.
type SoundStyle int

const (
	// SoundWords is every engine that only reads text.
	SoundWords SoundStyle = iota
	// SoundBrackets is Chatterbox Turbo's paralinguistic tags: [laugh], [sigh].
	SoundBrackets
	// SoundAngles is Orpheus's emotion tags: <laugh>, <sigh>.
	SoundAngles
)

// actionSound is what a stage direction sounds like, when it describes a sound: a laugh
// is heard, a lean is not. Checked in order; the first match wins. brackets and angles
// are the engines' tags for it, empty where the engine has none.
var actionSound = []struct {
	pattern          *regexp.Regexp
	say              string
	brackets, angles string
}{
	{regexp.MustCompile(`(?i)\bgiggl|\bteehee|\btitter`), "hehe", "laugh", "giggle"},
	{regexp.MustCompile(`(?i)\bchuckl|\bsnicker`), "haha", "chuckle", "chuckle"},
	{regexp.MustCompile(`(?i)\blaugh|\bcackl`), "haha", "laugh", "laugh"},
	{regexp.MustCompile(`(?i)\bsigh`), "", "sigh", "sigh"},
	{regexp.MustCompile(`(?i)\bgroan|\bmoan|\bwhimper`), "", "groan", "groan"},
	{regexp.MustCompile(`(?i)\bgasp`), "oh!", "gasp", "gasp"},
	{regexp.MustCompile(`(?i)\byawn`), "", "", "yawn"},
	{regexp.MustCompile(`(?i)\bcough`), "", "cough", "cough"},
	{regexp.MustCompile(`(?i)\bsniff`), "", "sniff", "sniffle"},
	{regexp.MustCompile(`(?i)\bhum(?:s|ming)?\b|\bmm+\b|\bhmm+\b`), "hmm", "", ""},
}

// speakActions replaces each *action* with the sound it makes, or with nothing.
func speakActions(text string, style SoundStyle) string {
	replace := func(m string) string {
		parts := actionSpan.FindStringSubmatch(m)
		say := " "
		for _, sound := range actionSound {
			if !sound.pattern.MatchString(parts[2]) {
				continue
			}
			switch {
			case style == SoundBrackets && sound.brackets != "":
				say = " [" + sound.brackets + "] "
			case style == SoundAngles && sound.angles != "":
				say = " <" + sound.angles + "> "
			case sound.say != "":
				say = " " + sound.say + " "
			}
			break
		}
		return parts[1] + say + parts[3]
	}
	// Twice, because two actions side by side share the character between them and a
	// single pass can only consume it once.
	text = actionSpan.ReplaceAllStringFunc(text, replace)
	return actionSpan.ReplaceAllStringFunc(text, replace)
}

// collapseDrawl shortens a letter held for effect — "sooo", "pleeease", "nooo" — to
// the word it is. Three or more of one letter is never English; two often is. An
// "m" keeps two, which is what makes "mmm" a hum rather than a letter.
func collapseDrawl(text string) string {
	var b strings.Builder
	runes := []rune(text)
	for i := 0; i < len(runes); {
		j := i
		for j < len(runes) && unicode.ToLower(runes[j]) == unicode.ToLower(runes[i]) {
			j++
		}
		n := j - i
		if n >= 3 && unicode.IsLetter(runes[i]) {
			keep := 1
			if unicode.ToLower(runes[i]) == 'm' {
				keep = 2
			}
			n = keep
		}
		b.WriteString(string(runes[i : i+n]))
		i = j
	}
	return b.String()
}

// Spoken turns a written line into the words that would be said.
func Spoken(text string) string { return SpokenWith(text, SoundWords) }

// SpokenWith is Spoken for an engine that performs sounds in the given style.
func SpokenWith(text string, style SoundStyle) string {
	text = speakActions(text, style)
	text = withSlash.ReplaceAllStringFunc(text, func(m string) string {
		if strings.HasSuffix(strings.ToLower(m), "o") {
			return "without"
		}
		return "with "
	})
	// Emoticons go before the drawl pass, which would otherwise turn ":DDD" into ":D"
	// and leave it to be read. Spaced out so a neighbour does not shelter one.
	for range 2 {
		text = emoticon.ReplaceAllStringFunc(text, func(m string) string {
			tail := ""
			if last := m[len(m)-1]; strings.ContainsRune(".,!?", rune(last)) {
				tail = string(last)
			}
			return " " + tail + " "
		})
	}
	text = tilde.ReplaceAllString(text, " ")
	text = collapseDrawl(text)
	text = spokenWord.ReplaceAllStringFunc(text, func(word string) string {
		lower := strings.ToLower(word)
		if say, ok := slang[lower]; ok && (!caseSensitiveSlang[lower] || word == lower) {
			return say
		}
		if isShouting(word) {
			return lower
		}
		return word
	})
	text = punctRun.ReplaceAllStringFunc(text, func(m string) string {
		if strings.Contains(m, "?") {
			return "?"
		}
		return "!"
	})
	// Spaces collapsed, line breaks kept: CleanForSpeech reads a break as a sentence end.
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = strings.Join(strings.Fields(line), " ")
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

// isShouting is a capitalised word that is emphasis rather than an acronym.
func isShouting(word string) bool {
	if strings.ToUpper(word) != word || strings.ToLower(word) == word {
		return false
	}
	letters := 0
	for _, r := range word {
		if unicode.IsLetter(r) {
			letters++
		}
	}
	return letters >= 4 || shoutWords[word]
}
