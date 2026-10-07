package api

import (
	"errors"
	"testing"
)

var testTools = map[string]bool{"take_photo": true, "set_state": true}

func TestAHermesToolCallInTheTextIsActedOnAndNotSaid(t *testing.T) {
	text, calls := extractEmbeddedToolCalls("one sec 😏\n<tool_call>\n{\"name\": \"take_photo\", \"arguments\": {\"shot\": \"mirror selfie\"}}\n</tool_call>", testTools)
	if text != "one sec 😏" {
		t.Fatalf("text = %q", text)
	}
	if len(calls) != 1 || calls[0].Function.Name != "take_photo" || calls[0].argsMap()["shot"] != "mirror selfie" {
		t.Fatalf("calls = %+v", calls)
	}
}

func TestMistralsTwoCallShapesAreBothRead(t *testing.T) {
	_, calls := extractEmbeddedToolCalls(`hey[TOOL_CALLS][{"name":"set_state","arguments":{"mood":"happy"}},{"name":"take_photo","arguments":{}}]`, testTools)
	if len(calls) != 2 {
		t.Fatalf("list form: %+v", calls)
	}
	text, calls := extractEmbeddedToolCalls(`hey [TOOL_CALLS]set_state[ARGS]{"mood":"shy"}`, testTools)
	if text != "hey" || len(calls) != 1 || calls[0].argsMap()["mood"] != "shy" {
		t.Fatalf("args form: %q %+v", text, calls)
	}
}

func TestABareCallAtTheEndIsReadButOnlyForToolsSheHas(t *testing.T) {
	text, calls := extractEmbeddedToolCalls("ok\n```json\n{\"name\": \"set_state\", \"arguments\": {\"heat\": 3}}\n```", testTools)
	if text != "ok" || len(calls) != 1 {
		t.Fatalf("%q %+v", text, calls)
	}
	prose := `she wrote {"name": "launch_rockets", "arguments": {}}`
	text, calls = extractEmbeddedToolCalls(prose, testTools)
	if text != prose || len(calls) != 0 {
		t.Fatalf("an unknown tool was taken out of her prose: %q %+v", text, calls)
	}
}

func TestDoubleEncodedArgumentsStillDecode(t *testing.T) {
	c := newToolCall("x", "set_state", `"{\"mood\":\"sad\"}"`)
	if c.argsMap()["mood"] != "sad" {
		t.Fatalf("args = %v", c.argsMap())
	}
}

func TestAJSONTurnSplitsIntoTextsAndActions(t *testing.T) {
	reply := parseJSONTurn("```json\n{\"messages\":[\"hi\",\"miss me?\"],\"actions\":[{\"tool\":\"set_state\",\"args\":{\"mood\":\"loving\"}},{\"tool\":\"nope\",\"args\":{}}]}\n```", testTools)
	if reply.Text != "hi\n\nmiss me?" {
		t.Fatalf("text = %q", reply.Text)
	}
	if len(reply.Calls) != 1 || reply.Calls[0].argsMap()["mood"] != "loving" {
		t.Fatalf("calls = %+v", reply.Calls)
	}
}

func TestAJSONModeReplyThatIgnoredTheFormatIsStillHerWords(t *testing.T) {
	reply := parseJSONTurn("lol no", testTools)
	if reply.Text != "lol no" || len(reply.Calls) != 0 {
		t.Fatalf("%+v", reply)
	}
}

func TestOnlyARefusalOfToolsSwitchesToJSONMode(t *testing.T) {
	if !refusedTools(&chatBackendStatusError{Status: 400, msg: "tools are not supported by this template"}) {
		t.Fatal("a tools refusal was not recognised")
	}
	if refusedTools(&chatBackendStatusError{Status: 503, msg: "no model loaded"}) {
		t.Fatal("a backend that is down was taken for one without tools")
	}
	if refusedTools(errors.New("dial tcp: refused")) {
		t.Fatal("a network error was taken for a tools refusal")
	}
}

func TestToolExchangesBecomeTextForATemplateWithoutTools(t *testing.T) {
	msgs := withJSONMode([]llmMessage{
		{Role: "system", Content: "you are her"},
		{Role: "assistant", Content: "", ToolCalls: []llmToolCall{newToolCall("a", "take_photo", map[string]any{})}},
		{Role: "tool", Name: "take_photo", ToolCallID: "a", Content: "sent"},
	}, []llmTool{{Type: "function", Function: llmToolFunction{Name: "take_photo", Description: "d", Parameters: map[string]any{}}}})
	for _, m := range msgs {
		if m.Role == "tool" || len(m.ToolCalls) > 0 {
			t.Fatalf("a tool-shaped message survived: %+v", m)
		}
	}
	if s, _ := msgs[0].Content.(string); len(s) < len("you are her")+20 {
		t.Fatal("the JSON instruction was not added to the system prompt")
	}
}

func TestAPinnedModeWinsAndAToollessBackendIsRemembered(t *testing.T) {
	if resolveToolMode("json", "u", "m") != toolsJSON || resolveToolMode("native", "u", "m") != toolsNative {
		t.Fatal("a pinned mode was not honoured")
	}
	rememberToolless("u-remember", "m")
	if resolveToolMode("auto", "u-remember", "m") != toolsJSON {
		t.Fatal("a backend that refused tools was asked again")
	}
}
