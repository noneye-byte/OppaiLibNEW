package api

import (
	"strings"
	"testing"
)

func TestClassifyChatTask(t *testing.T) {
	cases := []struct {
		name   string
		in     chatRequest
		latest string
		want   chatTask
	}{
		{"plain conversation is casual", chatRequest{Mode: "sweet", Intensity: 1}, "what did you get up to today", taskCasual},
		{"a shared photo is a beat", chatRequest{Mode: "sweet", Intensity: 1, PhotoTags: []string{"beach"}}, "look at this", taskReaction},
		{"a shared screen is a beat", chatRequest{Mode: "sweet", Intensity: 1, Viewing: &chatViewing{FocusID: 3}}, "thoughts?", taskReaction},
		{"a library question is factual", chatRequest{Mode: "sweet", Intensity: 1}, "how many videos are in my library?", taskFactual},
		{"a question about her is not", chatRequest{Mode: "sweet", Intensity: 1}, "what are you thinking about?", taskCasual},
		{"roleplay is creative", chatRequest{Mode: "roleplay", Intensity: 1}, "we keep walking", taskCreative},
		{"heat is creative", chatRequest{Mode: "sweet", Intensity: 5}, "come here", taskCreative},
		{"feeling is emotional", chatRequest{Mode: "sweet", Intensity: 1}, "i'm sorry, that was shitty of me", taskEmotional},
		{"the client can say so outright", chatRequest{Mode: "sweet", Intensity: 1, Task: "autonomous"}, "", taskAutonomous},
		{"an unknown task falls through", chatRequest{Mode: "sweet", Intensity: 1, Task: "nonsense"}, "hey", taskCasual},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := classifyChatTask(c.in, c.latest); got != c.want {
				t.Errorf("classifyChatTask = %q, want %q", got, c.want)
			}
		})
	}
}

func TestTuneSamplingStaysInBounds(t *testing.T) {
	// Every preset, at the most extreme request that can reach it, must land inside the
	// envelope a 7B quant behaves well in. This is the guard the whole file rests on.
	for task := range samplingPresets {
		in := chatRequest{Mode: "horny", Intensity: 5, Task: string(task)}
		for i := 0; i < 60; i++ {
			in.Messages = append(in.Messages, chatMessage{Role: "user", Content: "x"})
		}
		got, preset := tuneSampling(in, "more")
		if got != task {
			t.Fatalf("explicit task %q classified as %q", task, got)
		}
		if preset.Temperature < samplingBounds.tempMin || preset.Temperature > samplingBounds.tempMax {
			t.Errorf("%s: temperature %v out of bounds", task, preset.Temperature)
		}
		if preset.RepetitionPen < samplingBounds.repMin || preset.RepetitionPen > samplingBounds.repMax {
			t.Errorf("%s: repetition_penalty %v out of bounds", task, preset.RepetitionPen)
		}
		if preset.MaxTokens < samplingBounds.maxTokMin || preset.MaxTokens > samplingBounds.maxTokMax {
			t.Errorf("%s: max_tokens %d out of bounds", task, preset.MaxTokens)
		}
		// A repetition penalty of exactly 1.0 is the setting a small model loops at, and no
		// automatic choice may land there.
		if preset.RepetitionPen <= 1.0 && task != taskFactual && task != taskPlanning {
			t.Errorf("%s: repetition_penalty %v invites loops", task, preset.RepetitionPen)
		}
	}

	// The classes that exist to be short must stay short, and the one that exists to be
	// accurate must stay cold. These are the two behaviours the presets are *for*.
	_, reaction := tuneSampling(chatRequest{Mode: "sweet", Intensity: 1, PhotoTags: []string{"x"}}, "look")
	if reaction.MaxTokens > 140 {
		t.Errorf("a reaction may not be long: max_tokens = %d", reaction.MaxTokens)
	}
	_, factual := tuneSampling(chatRequest{Mode: "sweet", Intensity: 1}, "how many tags are in my library?")
	if factual.Temperature > 0.5 {
		t.Errorf("a factual answer may not run hot: temperature = %v", factual.Temperature)
	}
}

func TestSamplingFieldsCoverBothDialects(t *testing.T) {
	fields := samplingFields(samplingPresets[taskCasual])
	// text-generation-webui's samplers and the portable OpenAI ones both have to be present:
	// a missing key silently falls back to whichever backend the user happens to run.
	for _, key := range []string{"temperature", "top_p", "top_k", "min_p", "repetition_penalty", "repetition_penalty_range", "max_tokens"} {
		if _, ok := fields[key]; !ok {
			t.Errorf("samplingFields is missing %q", key)
		}
	}
}

func TestChatStopsGuardTheTurnBoundary(t *testing.T) {
	stops := chatStops("Owen")
	joined := strings.Join(stops, "|")
	for _, want := range []string{"\nUser:", "<|im_end|>", "\nOwen:"} {
		if !strings.Contains(joined, want) {
			t.Errorf("chatStops missing %q, got %v", want, stops)
		}
	}
	// A profile name absurd enough to be a paste is not turned into a stop string.
	if got := chatStops(strings.Repeat("x", 200)); len(got) != len(chatStops("")) {
		t.Error("an over-long display name should not become a stop sequence")
	}
}

func TestSamplingSummaryIsCopyable(t *testing.T) {
	summary := samplingSummary(taskCreative, samplingPresets[taskCreative], []string{"temperature"})
	for _, want := range []string{"task=creative", "temperature=", "max_tokens=", "overridden=temperature"} {
		if !strings.Contains(summary, want) {
			t.Errorf("summary missing %q: %q", want, summary)
		}
	}
	if strings.Contains(samplingSummary(taskCasual, samplingPresets[taskCasual], nil), "overridden") {
		t.Error("nothing overridden should not mention overrides")
	}
}
