package api

import (
	"encoding/json"
	"regexp"
	"strings"
)

// What a model sends back when it may act as well as speak.
//
// Libby used to act by writing bracketed tags into her prose — [mood: …], [send: …],
// [wearing: …] — which the server read back out with anchored patterns, with a second
// layer deleting whatever the model mangled. That protocol was the ceiling on her: a
// small model asked to juggle a dozen tags at the end of a reply drops the last one,
// and every release that "fixed the picture she sends" was fixing a tag that did not
// arrive. The models she runs on now speak OpenAI tool calls natively, so actions are
// typed calls with arguments the server validates, and her text is only her text.
//
// Three shapes arrive in practice, and all three are read here:
//
//  1. Native tool_calls on the message — the backend's template parsed them.
//  2. The call written into the content in the model's own markup, because the loader's
//     template did not parse it: Hermes/Qwen's <tool_call>{…}</tool_call>, Mistral's
//     [TOOL_CALLS][…] or [TOOL_CALLS]name[ARGS]{…}. Those are documented formats, not
//     guesses, and a call the model meant should not be read out to the user as JSON.
//  3. JSON mode, for a backend that refuses tools outright: the whole reply is one
//     object, {"messages": [...], "actions": [{"tool": …, "args": {…}}]}.
//
// Only names in the turn's tool set are accepted from the second and third shapes — a
// JSON-looking line that happens to name nothing she can do stays prose.

// llmToolCall is one call in the OpenAI wire shape. Arguments is a JSON string there,
// which is how it is kept; argsMap decodes it.
type llmToolCall struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

func newToolCall(id, name string, args any) llmToolCall {
	var c llmToolCall
	c.ID, c.Type = id, "function"
	c.Function.Name = name
	switch v := args.(type) {
	case string:
		c.Function.Arguments = v
	case json.RawMessage:
		c.Function.Arguments = string(v)
	default:
		raw, _ := json.Marshal(v)
		c.Function.Arguments = string(raw)
	}
	if strings.TrimSpace(c.Function.Arguments) == "" || c.Function.Arguments == "null" {
		c.Function.Arguments = "{}"
	}
	return c
}

// argsMap is the call's arguments, decoded. A call whose arguments do not parse is
// still a call — the model meant the action — so it decodes to an empty map and each
// tool's own validation decides whether that is enough to act on.
func (c llmToolCall) argsMap() map[string]any {
	out := map[string]any{}
	raw := strings.TrimSpace(c.Function.Arguments)
	if raw == "" {
		return out
	}
	if json.Unmarshal([]byte(raw), &out) == nil {
		return out
	}
	// Some templates double-encode: the arguments are a JSON string holding JSON.
	var inner string
	if json.Unmarshal([]byte(raw), &inner) == nil {
		_ = json.Unmarshal([]byte(inner), &out)
	}
	return out
}

// llmMessage is one message in a tool-capable conversation. Content is a string or a
// list of parts (a turn that carries pictures); an assistant message with calls keeps
// an empty string rather than null, because several local chat templates index into
// content unconditionally and fail on a null.
type llmMessage struct {
	Role       string        `json:"role"`
	Content    any           `json:"content"`
	ToolCalls  []llmToolCall `json:"tool_calls,omitempty"`
	ToolCallID string        `json:"tool_call_id,omitempty"`
	Name       string        `json:"name,omitempty"`
}

// llmReply is what one round of the model produced, already split into what she said
// and what she did.
type llmReply struct {
	Text  string
	Calls []llmToolCall
}

var (
	hermesCall  = regexp.MustCompile(`(?s)<tool_call>\s*(.*?)\s*</tool_call>`)
	mistralArgs = regexp.MustCompile(`(?s)\[TOOL_CALLS\]\s*([A-Za-z_][A-Za-z0-9_]*)\s*\[ARGS\]\s*(\{.*?\})\s*(?:</s>|$|\[TOOL_CALLS\])`)
	mistralList = regexp.MustCompile(`(?s)\[TOOL_CALLS\]\s*(\[.*\])`)
	// A model that has learned the call shape from its template sometimes emits it
	// bare at the very end of a reply, inside a code fence or not.
	bareCall = regexp.MustCompile("(?s)(?:```(?:json)?\\s*)?(\\{\\s*\"name\"\\s*:\\s*\"[A-Za-z_][A-Za-z0-9_]*\"\\s*,\\s*\"(?:arguments|parameters)\"\\s*:\\s*\\{.*?\\}\\s*\\})\\s*(?:```)?\\s*$")
)

// embeddedCall is the {"name", "arguments"} object every in-text format carries.
type embeddedCall struct {
	Name       string          `json:"name"`
	Arguments  json.RawMessage `json:"arguments"`
	Parameters json.RawMessage `json:"parameters"`
}

func (e embeddedCall) args() json.RawMessage {
	if len(e.Arguments) > 0 {
		return e.Arguments
	}
	return e.Parameters
}

// extractEmbeddedToolCalls pulls tool calls the model wrote into its content, and
// returns the content without them. known is the turn's tool set; anything else is
// left as text.
func extractEmbeddedToolCalls(content string, known map[string]bool) (string, []llmToolCall) {
	var calls []llmToolCall
	add := func(name string, args json.RawMessage) bool {
		if !known[name] {
			return false
		}
		calls = append(calls, newToolCall(embeddedID(len(calls)), name, args))
		return true
	}
	content = hermesCall.ReplaceAllStringFunc(content, func(block string) string {
		inner := hermesCall.FindStringSubmatch(block)[1]
		var e embeddedCall
		if json.Unmarshal([]byte(inner), &e) == nil && add(e.Name, e.args()) {
			return ""
		}
		return block
	})
	content = mistralArgs.ReplaceAllStringFunc(content, func(block string) string {
		m := mistralArgs.FindStringSubmatch(block)
		if add(m[1], json.RawMessage(m[2])) {
			return ""
		}
		return block
	})
	if m := mistralList.FindStringSubmatchIndex(content); m != nil {
		var list []embeddedCall
		if json.Unmarshal([]byte(content[m[2]:m[3]]), &list) == nil {
			taken := false
			for _, e := range list {
				if add(e.Name, e.args()) {
					taken = true
				}
			}
			if taken {
				content = content[:m[0]] + content[m[1]:]
			}
		}
	}
	// Repeatedly, since a model that writes one bare call at the end often writes two.
	for {
		m := bareCall.FindStringSubmatchIndex(content)
		if m == nil {
			break
		}
		var e embeddedCall
		if json.Unmarshal([]byte(content[m[2]:m[3]]), &e) != nil || !add(e.Name, e.args()) {
			break
		}
		content = content[:m[0]]
	}
	return strings.TrimSpace(content), calls
}

func embeddedID(n int) string { return "call_text_" + string(rune('a'+n%26)) }

// jsonTurn is the JSON-mode envelope.
type jsonTurn struct {
	Messages []string `json:"messages"`
	Actions  []struct {
		Tool string          `json:"tool"`
		Args json.RawMessage `json:"args"`
	} `json:"actions"`
}

// jsonFence strips a code fence a model wraps a JSON answer in despite being told not to.
var jsonFence = regexp.MustCompile("(?s)^\\s*```(?:json)?\\s*(.*?)\\s*```\\s*$")

// envelopeStart finds the envelope where a model wrote it after prose. Unconstrained,
// Cydonia wrote the scene out first and the envelope last, in bold.
var envelopeStart = regexp.MustCompile(`\{\s*"messages"\s*:`)

// parseJSONTurn reads a JSON-mode reply. A reply that is not the envelope is prose —
// a model that ignored the format still said something, and losing it would be worse
// than losing the actions it might have taken.
func parseJSONTurn(content string, known map[string]bool) llmReply {
	raw := strings.TrimSpace(content)
	if m := jsonFence.FindStringSubmatch(raw); m != nil {
		raw = m[1]
	}
	if loc := envelopeStart.FindStringIndex(raw); loc != nil && loc[0] > 0 {
		// The envelope repeats what the prose before it said, and it is the half that
		// carries her actions; the prose is the half that was not asked for.
		raw = raw[loc[0]:]
	}
	if !strings.HasPrefix(raw, "{") {
		return llmReply{Text: strings.TrimSpace(content)}
	}
	var turn jsonTurn
	// Decode rather than Unmarshal: what trails a complete envelope ("**", a stray
	// bracket) is not a reason to throw the envelope away.
	if json.NewDecoder(strings.NewReader(raw)).Decode(&turn) != nil {
		// Cut off by the token limit or malformed past its texts: keep the texts, which
		// is what she said, rather than reading the JSON out to them as her words.
		if texts := salvageTexts(raw); len(texts) > 0 {
			return llmReply{Text: strings.Join(texts, "\n\n")}
		}
		return llmReply{Text: strings.TrimSpace(content)}
	}
	var out llmReply
	var texts []string
	for _, m := range turn.Messages {
		if m = strings.TrimSpace(m); m != "" {
			texts = append(texts, m)
		}
	}
	// Each entry was a separate text; a blank line is how a reply is split into bubbles.
	out.Text = strings.Join(texts, "\n\n")
	for i, a := range turn.Actions {
		if known[a.Tool] {
			out.Calls = append(out.Calls, newToolCall("call_json_"+string(rune('a'+i%26)), a.Tool, a.Args))
		}
	}
	return out
}

// salvageTexts reads the complete strings at the head of an envelope's messages array
// and stops at the first thing that is not one. The grammar puts messages first, so a
// reply cut off anywhere after them has lost only its actions.
func salvageTexts(raw string) []string {
	dec := json.NewDecoder(strings.NewReader(raw))
	for _, want := range []any{json.Delim('{'), "messages", json.Delim('[')} {
		if tok, err := dec.Token(); err != nil || tok != want {
			return nil
		}
	}
	var texts []string
	for {
		tok, err := dec.Token()
		s, ok := tok.(string)
		if err != nil || !ok {
			return texts
		}
		if s = strings.TrimSpace(s); s != "" {
			texts = append(texts, s)
		}
	}
}

// jsonModeGrammar is the envelope as GBNF, for text-generation-webui, which ignores
// response_format and passes grammar_string to llama.cpp instead. It is the only thing
// that holds a roleplay model to the format: told in words, Cydonia wrote prose with
// the envelope tacked on the end, in bold, with its brackets unbalanced — then stopped
// writing it at all. Under a grammar the first token she can write is "{", the tool
// can only be one she has, and messages come first, so a reply cut off by the token
// limit has still said its texts (salvageTexts).
//
// Whitespace is capped at four characters a seam: unbounded, a sampler can wander into
// a run of newlines that never ends. Strings exclude raw control characters, which Go's
// decoder would refuse and lose the whole turn over.
func jsonModeGrammar(tools []llmTool) string {
	names := make([]string, 0, len(tools))
	for _, t := range tools {
		names = append(names, `"\"`+t.Function.Name+`\""`)
	}
	return `root ::= "{" ws "\"messages\"" ws ":" ws "[" ws texts ws "]" ws "," ws "\"actions\"" ws ":" ws "[" ws actions ws "]" ws "}"
texts ::= (string (ws "," ws string)*)?
actions ::= (action (ws "," ws action)*)?
action ::= "{" ws "\"tool\"" ws ":" ws tool ws "," ws "\"args\"" ws ":" ws object ws "}"
tool ::= ` + strings.Join(names, " | ") + `
object ::= "{" ws (string ws ":" ws value (ws "," ws string ws ":" ws value)*)? ws "}"
array ::= "[" ws (value (ws "," ws value)*)? ws "]"
value ::= object | array | string | number | "true" | "false" | "null"
string ::= "\"" char* "\""
char ::= [^"\\\x7F\x00-\x1F] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F])
number ::= "-"? [0-9]+ ("." [0-9]+)? ([eE] [-+]? [0-9]+)?
ws ::= ([ \t\n] ([ \t\n] ([ \t\n] [ \t\n]?)?)?)?
`
}

// jsonModeSchema is the envelope as a JSON schema, for backends that constrain output
// to one. The actions' arguments are left open: each tool's schema is in the prompt,
// and a grammar for the union of all of them is more than llama.cpp's converter likes.
func jsonModeSchema(tools []llmTool) map[string]any {
	names := make([]any, 0, len(tools))
	for _, t := range tools {
		names = append(names, t.Function.Name)
	}
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"messages": map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
			"actions": map[string]any{"type": "array", "items": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"tool": map[string]any{"type": "string", "enum": names},
					"args": map[string]any{"type": "object"},
				},
				"required": []any{"tool", "args"},
			}},
		},
		"required": []any{"messages", "actions"},
	}
}

// jsonModeDirective tells a model without tools how to act. The tool list is written
// out because there is no other channel for it.
func jsonModeDirective(tools []llmTool) string {
	var b strings.Builder
	b.WriteString("\n\nAnswer with one JSON object and nothing else: {\"messages\": [\"each text you send, in order\"], \"actions\": [{\"tool\": \"<name>\", \"args\": {…}}]}. ")
	b.WriteString("messages is what you say; actions is what you do, and may be empty. The actions you can take:\n")
	for _, t := range tools {
		params, _ := json.Marshal(t.Function.Parameters)
		b.WriteString("- " + t.Function.Name + ": " + t.Function.Description + " Args schema: " + string(params) + "\n")
	}
	return b.String()
}
