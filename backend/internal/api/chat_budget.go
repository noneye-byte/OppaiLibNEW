package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// Fitting a turn into the model's context, and saying so when something had to go.
//
// The previous arrangement had no notion of a budget at all: the client capped history at
// 80 messages, the system prompt grew with the library, memory, wants and the bond, and
// whatever came out the other end was posted to the backend. Past the model's window a
// local backend silently drops the *front* of the prompt — which is the system prompt, so
// the first thing lost is the character card. She stops being Libby a few dozen messages
// into a long night and nothing anywhere reports it.
//
// So the budget is computed here, before the request goes out, and it is spent in a stated
// order of priority: the system prompt and the newest exchanges are kept, older history is
// folded into a local digest, and the reply allowance shrinks only as a last resort. What
// was cut comes back in the response so the UI can say so out loud — see chatBudgetReport.
//
// No model call is involved in the digest. Summarising with a second inference pass would
// double the latency of every long conversation on hardware that is already the bottleneck,
// and a 7B model summarising its own transcript reliably invents. A mechanical digest of
// what was said is less elegant and cannot lie.

const (
	// targetContextLimit is the context OppaiLib asks the backend to use for Libby.
	// OpenHermes/Mistral can comfortably run this window, and current text-generation-
	// webui uses 8192 as the default ctx-size for non-llama.cpp loaders. The value is
	// also sent as truncation_length on every generation; merely budgeting for 8K while
	// leaving the backend's request default at 4K would recreate silent truncation.
	targetContextLimit = 8192
	// contextLimitTTL is how long a probed window is trusted. Loading a different model
	// changes it, and a load is a user action they will be watching the screen for.
	contextLimitTTL = 2 * time.Minute
	// replyHeadroom is the slack left beyond the reply allowance, for the chat template's
	// own scaffolding and for the token estimate below running short.
	replyHeadroom = 128
	// minKeptMessages is how many of the newest turns survive any budget. Below about this
	// she loses the thread of the immediate conversation, at which point trimming has cost
	// more than the truncation it was avoiding.
	minKeptMessages = 6
	// minReplyTokens is the smallest reply allowance worth generating. If the budget cannot
	// afford even this, the request is refused with an explanation rather than sent to
	// produce a sentence that stops mid-word.
	minReplyTokens = 64
	// digestLines bounds the folded-history block.
	digestLines = 12
	// digestLineLen bounds one line of it.
	digestLineLen = 120
)

// contextLimitCache memoises the probed window. Guarded by its own mutex rather than
// chatMu: this is read on the chat path and has nothing to do with the workspace files.
var contextLimitCache struct {
	mu    sync.Mutex
	value int
	at    time.Time
	url   string // invalidates the cache when the operator repoints the backend
}

// chatContextLimit is the model's context window in tokens.
//
// OppaiLib chooses the requested input window, then asks the backend only for hard
// loader ceilings: n_ctx is llama.cpp's, max_seq_len is ExLlama's, and max_model_len
// is vLLM's. text-generation-webui's truncation_length is a per-request generation
// option, so its shared default must not lower Libby's 8K target.
func (s *Server) chatContextLimit(ctx context.Context) int {
	cur := s.settings.Get()
	contextLimitCache.mu.Lock()
	if contextLimitCache.value > 0 && contextLimitCache.url == cur.ChatURL && time.Since(contextLimitCache.at) < contextLimitTTL {
		limit := contextLimitCache.value
		contextLimitCache.mu.Unlock()
		return limit
	}
	contextLimitCache.mu.Unlock()

	limit := targetContextLimit
	probeCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if status, raw, err := s.chatBackendRequest(probeCtx, http.MethodGet, "/v1/internal/model/info", nil); err == nil && status >= 200 && status < 300 {
		var info struct {
			NCtx        int `json:"n_ctx"`
			MaxSeqLen   int `json:"max_seq_len"`
			MaxModelLen int `json:"max_model_len"`
		}
		if json.Unmarshal(raw, &info) == nil {
			limit = effectiveContextLimit(info.NCtx, info.MaxSeqLen, info.MaxModelLen)
		}
	}
	contextLimitCache.mu.Lock()
	contextLimitCache.value, contextLimitCache.at, contextLimitCache.url = limit, time.Now(), cur.ChatURL
	contextLimitCache.mu.Unlock()
	return limit
}

// effectiveContextLimit keeps the 8K request beneath a loader's reported hard
// capacity. truncation_length is intentionally absent: text-generation-webui treats
// it as a per-generation input limit, and OppaiLib overrides it on the request. n_ctx,
// max_seq_len and max_model_len describe the loaded model/loader and cannot safely be
// exceeded. When several are present, the smallest is the real ceiling.
func effectiveContextLimit(hardLimits ...int) int {
	limit := targetContextLimit
	for _, reported := range hardLimits {
		if reported >= 1024 && reported <= 131072 && reported < limit {
			limit = reported
		}
	}
	return limit
}

// estimateTokens approximates a string's token count.
//
// Deliberately an estimate. The alternative is asking the backend to tokenise, which is a
// round trip per message on the hot path, against a tokeniser that changes with the loaded
// model. Four characters per token is the standard approximation for English and it is
// close enough for a budget whose whole job is to leave slack — and it is biased to
// over-count (see the whitespace term), because over-counting costs a little context and
// under-counting costs the character card.
func estimateTokens(text string) int {
	if text == "" {
		return 0
	}
	// Runes, not bytes: a byte count would badly over-estimate non-ASCII text.
	runes := len([]rune(text))
	// Prose is denser than 4 chars/token wherever punctuation and short words cluster, so
	// word count sets a floor.
	words := len(strings.Fields(text))
	if estimate := runes / 4; estimate > words {
		return estimate
	}
	return words
}

// messageOverhead is the per-message cost of the chat template's own role markers, which
// the text of the message does not include. ChatML spends four or five on every turn.
const messageOverhead = 5

// estimateMessagesTokens is the whole conversation's cost, scaffolding included.
func estimateMessagesTokens(messages []chatMessage) int {
	total := 0
	for _, m := range messages {
		total += estimateTokens(m.Content) + messageOverhead
	}
	return total
}

// promptSection is one optional block of the system prompt, with a name to report it by
// and a rank saying how readily it can be given up.
//
// The system prompt is not one thing. Her identity, the protocol tags, and the character
// card are what make the reply hers at all; the library shortlist, the picture catalogue and
// the standing wants are context that improves a reply which is already recognisably her.
// Measured on a small context window the first group alone can consume most of the budget, so treating
// the whole prompt as indivisible meant a fully-furnished Libby simply did not fit — which
// is how this ended up as a list rather than a string.
//
// Rank is shed order, lowest first. Ties keep their given order.
type promptSection struct {
	Name string
	Text string
	Rank int
}

// Shed ranks. Spaced so a section can be slotted between two without renumbering, and
// ordered by what a reply loses without it: a recommendation shortlist is a nicety, whereas
// what she remembers about the person she is talking to is most of why she is not a chatbot.
const (
	rankLibrarySnapshot = 10 // the shelves, the shortlists, the recent additions
	rankPhotoCatalogue  = 20 // which selfies she could send
	rankThoughts        = 25 // that she may think something instead of saying it
	rankWantsList       = 30 // her own standing desires
	rankBond            = 40 // the gap, carried mood, closeness
	rankActions         = 50 // what she may offer to do to the collection
	rankMemoryList      = 60 // what she knows about them — shed last
)

// assembleSystemPrompt fits the optional sections into what is left between head and tail.
//
// The prompt has a fixed end as well as a fixed beginning: the mood tag, the picture tag and
// the silence rule are written to be the final word on every tag described above them, so
// they cannot have optional context appended after them. Hence two fixed halves with the
// sheddable middle between.
//
// Sections are offered the budget most-valuable first, and one that does not fit is skipped
// rather than ending the walk — so a bulky library snapshot cannot squeeze out three small
// high-value blocks ranked below it.
// budget is what the sections may spend between them; head and tail are already paid for
// by the caller and are always written.
func assembleSystemPrompt(head string, optional []promptSection, tail string, budget int) (string, []string) {
	ordered := make([]promptSection, len(optional))
	copy(ordered, optional)
	sort.SliceStable(ordered, func(a, b int) bool { return ordered[a].Rank > ordered[b].Rank })

	spent := 0
	kept := make([]promptSection, 0, len(ordered))
	var dropped []string
	for _, section := range ordered {
		if strings.TrimSpace(section.Text) == "" {
			continue
		}
		cost := estimateTokens(section.Text)
		if spent+cost > budget {
			dropped = append(dropped, section.Name)
			continue
		}
		spent += cost
		kept = append(kept, section)
	}
	// Back into authored order for the prompt itself: the model reads a card, then what she
	// knows, then what is on screen, and shuffling that by rank would put the shared screen
	// above her own identity.
	sort.SliceStable(kept, func(a, b int) bool { return kept[a].Rank < kept[b].Rank })
	var b strings.Builder
	b.WriteString(head)
	for _, section := range kept {
		b.WriteString(section.Text)
	}
	b.WriteString(tail)
	sort.Strings(dropped)
	return b.String(), dropped
}

// chatBudgetReport is what the client is told about the fit.
//
// It exists because the brief's requirement is not "never truncate" — with a 4k window and
// a real memory store that is not always possible — but "never truncate silently". Every
// field here is something the UI can put in front of the user, and Note is written for them
// rather than for a log.
type chatBudgetReport struct {
	// Limit is the model's context window in tokens, as reported or assumed.
	Limit int `json:"limit"`
	// PromptTokens is the estimated cost of what was actually sent.
	PromptTokens int `json:"promptTokens"`
	// ReplyTokens is the allowance left for her answer.
	ReplyTokens int `json:"replyTokens"`
	// SystemTokens is the system prompt's share, which is the part that grows with her
	// memory and the library and is worth showing separately.
	SystemTokens int `json:"systemTokens"`
	// CoreTokens is the inviolable part of that: her identity, card and the tag protocol.
	// Reported because it is the number that decides whether a given model can run her at
	// all, and because SystemTokens minus this is what the budget actually got to choose.
	CoreTokens int `json:"coreTokens"`
	// Dropped is how many older messages were folded into the digest.
	Dropped int `json:"dropped"`
	// DroppedSections names the optional parts of the system prompt that did not fit — her
	// wants, the library shortlist, the picture catalogue. Named rather than counted because
	// "Libby couldn't see your library this turn" is actionable and "1 section dropped" is not.
	DroppedSections []string `json:"droppedSections,omitempty"`
	// Digested says whether a summary of those messages was inserted in their place.
	Digested bool `json:"digested"`
	// Squeezed says whether the reply allowance had to be cut below the preset's.
	Squeezed bool `json:"squeezed"`
	// Note is the user-facing explanation, empty when everything fitted.
	Note string `json:"note,omitempty"`
	// Estimated is always true, and says so on purpose: these are approximations, and a
	// diagnostic that presents an estimate as a measurement is worse than no diagnostic.
	Estimated bool `json:"estimated"`
}

// digestMessages folds dropped history into one system note.
//
// Mechanical on purpose (see the file comment): each message contributes its opening clause,
// labelled with who said it. That is enough for her to know the shape of what came before —
// what was discussed, who wanted what — without claiming to know details it cannot recover.
func digestMessages(dropped []chatMessage) string {
	if len(dropped) == 0 {
		return ""
	}
	// The newest of the dropped run is the part still bearing on the conversation, so when
	// there are more than fit, keep the tail rather than the head.
	if len(dropped) > digestLines {
		dropped = dropped[len(dropped)-digestLines:]
	}
	var b strings.Builder
	b.WriteString("Earlier in this same conversation, before the part you can still see. " +
		"This is a compressed record of what was said, not the wording — you remember these things happening, " +
		"so do not quote from it, and do not mention that anything was shortened.\n")
	for _, m := range dropped {
		who := "They said"
		if m.Role == "assistant" {
			who = "You said"
		}
		line := strings.Join(strings.Fields(m.Content), " ")
		if len([]rune(line)) > digestLineLen {
			line = string([]rune(line)[:digestLineLen]) + "…"
		}
		fmt.Fprintf(&b, "- %s: %s\n", who, line)
	}
	return b.String()
}

// historyReserve is the share of the window kept back for the conversation itself, as a
// fraction of the whole. Without a floor like this the system prompt expands to fill
// everything the reply does not need — she arrives fully briefed on a library she cannot
// remember three messages of talking about.
const historyReserveFraction = 0.30

// fitChatTurn assembles a turn that fits the model's window, and reports what gave way.
//
// The order of sacrifice is the design and it is fixed:
//  1. The core system prompt — identity, card, protocol tags — is never touched.
//  2. Optional prompt sections are shed by rank, cheapest to lose first.
//  3. Older messages are dropped and folded into a local digest.
//  4. The reply allowance is cut, last, and only if the above was not enough.
//
// Anything below that is a request that cannot be served, and it fails with an explanation
// rather than being sent for the backend to truncate from the front.
func fitChatTurn(head string, optional []promptSection, tail string, history []chatMessage, limit, wantReply int) ([]chatMessage, int, chatBudgetReport, error) {
	report := chatBudgetReport{Limit: limit, ReplyTokens: wantReply, Estimated: true}
	if strings.TrimSpace(head) == "" {
		return nil, wantReply, report, fmt.Errorf("chat budget: the core system prompt is empty")
	}
	coreTokens := estimateTokens(head) + estimateTokens(tail) + messageOverhead
	report.CoreTokens = coreTokens

	// The one genuinely unservable case: her own character prompt plus the shortest reply
	// worth generating does not fit. Sending it anyway would have the backend truncate the
	// front — the card — and produce a stranger, so this is refused with an explanation.
	if coreTokens+minReplyTokens+replyHeadroom > limit {
		report.Note = fmt.Sprintf("Libby's character prompt is %d tokens and the model's context window is only %d. "+
			"Raise the context length in text-generation-webui (or load a model with a larger window) — below about %d she cannot be herself and answer in the same breath.",
			coreTokens, limit, coreTokens+minReplyTokens+replyHeadroom)
		return nil, wantReply, report, fmt.Errorf("context window too small: core prompt needs %d of %d tokens", coreTokens, limit)
	}

	// What is left over for the reply, the optional sections, and the conversation.
	spare := limit - coreTokens - replyHeadroom
	// The conversation's floor: a third of what is spare, capped at a share of the whole
	// window so a huge context does not reserve absurd amounts for six short texts. Without
	// a floor the sections expand to fill everything and she arrives fully briefed on a
	// library she cannot remember three messages of talking about.
	historyFloor := clampInt(spare/3, 0, int(float64(limit)*historyReserveFraction))
	reply := wantReply
	if reply > spare-historyFloor {
		// Cut the reply before cutting either — a shorter answer from a Libby who knows who
		// she is beats a long one from a model that lost its card.
		reply = clampInt(spare-historyFloor, minReplyTokens, wantReply)
		report.Squeezed = reply < wantReply
	}
	report.ReplyTokens = reply

	systemPrompt, droppedSections := assembleSystemPrompt(head, optional, tail, spare-reply-historyFloor)
	report.DroppedSections = droppedSections
	system := chatMessage{Role: "system", Content: systemPrompt}
	report.SystemTokens = estimateTokens(systemPrompt) + messageOverhead

	historyBudget := spare - reply - (report.SystemTokens - coreTokens)
	// Walk backwards from the newest, keeping what fits. Newest-first is the whole point:
	// the immediate exchange is what the reply has to answer.
	kept := 0
	spent := 0
	for i := len(history) - 1; i >= 0; i-- {
		cost := estimateTokens(history[i].Content) + messageOverhead
		if spent+cost > historyBudget && kept >= minKeptMessages {
			break
		}
		spent += cost
		kept++
	}
	if kept > len(history) {
		kept = len(history)
	}
	dropped := history[:len(history)-kept]
	out := make([]chatMessage, 0, kept+2)
	out = append(out, system)
	if len(dropped) > 0 {
		report.Dropped = len(dropped)
		// The digest is a second system message rather than being appended to the first, so
		// the character card keeps the byte-identical prefix the backend caches on. Only if
		// it fits: a digest that pushes the prompt back over the limit has defeated itself.
		if digest := digestMessages(dropped); digest != "" {
			if cost := estimateTokens(digest) + messageOverhead; spent+cost <= historyBudget {
				out = append(out, chatMessage{Role: "system", Content: digest})
				spent += cost
				report.Digested = true
			}
		}
	}
	out = append(out, history[len(history)-kept:]...)
	report.PromptTokens = report.SystemTokens + spent

	// One note, assembled from whatever actually gave way. Sections come first because they
	// are the loss the user can act on — clear some memory, or load a model with a bigger
	// window — whereas a trimmed history is normal housekeeping in a long conversation.
	var notes []string
	if len(report.DroppedSections) > 0 {
		notes = append(notes, fmt.Sprintf("Libby went into this reply without %s", strings.Join(report.DroppedSections, ", ")))
	}
	if report.Dropped > 0 {
		what := "dropped"
		if report.Digested {
			what = "summarised"
		}
		notes = append(notes, fmt.Sprintf("%s from earlier were %s", plural(report.Dropped, "message", "messages"), what))
	}
	if report.Squeezed {
		notes = append(notes, "her reply length was reduced")
	}
	if len(notes) > 0 {
		report.Note = fmt.Sprintf("%s — the model's %d-token context could not hold everything.",
			capitalizeFirst(strings.Join(notes, ", and ")), limit)
	}
	return out, report.ReplyTokens, report, nil
}

func capitalizeFirst(s string) string {
	if s == "" {
		return s
	}
	runes := []rune(s)
	if runes[0] >= 'a' && runes[0] <= 'z' {
		runes[0] -= 'a' - 'A'
	}
	return string(runes)
}

func plural(n int, one, many string) string {
	if n == 1 {
		return "1 " + one
	}
	return fmt.Sprintf("%d %s", n, many)
}
