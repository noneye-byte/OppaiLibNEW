package api

// Showing the turn's own working.
//
// Everything about a reply that is worth arguing with happens before the model sees
// anything: which sections were assembled, what they said, which ones the budget shed,
// and what came back before the scrubbers took the protocol tags out of it. None of
// that was visible from outside. A reply that described a picture nobody was looking at
// was indistinguishable, from the client, from a model that simply made something up —
// the two have entirely different fixes, and no way to tell them apart.
//
// So a turn can be asked to keep its receipts. `debug: true` on the request adds a
// `debug` object to the response carrying the assembled prompt, the sections it was
// built from, and the raw reply. The client stores it against the turn, and the
// conversation export writes the lot out.
//
// Three deliberate limits.
//
// It is opt-in per request, not a server mode: the payload is several times the size of
// the reply, and nobody wants that on every turn of a long evening.
//
// It is the user's own data and nobody else's. Every section here was assembled from
// this user's workspace, memory and library in response to their own message, and the
// endpoint already requires their session — so there is nothing to redact that they did
// not write. It carries no key, no session token and no other user's anything.
//
// And it is truthful about the order of operations: `raw` is what the model returned,
// before the tag parsers and the URL scrubber ran, which is exactly the text you need to
// see to know whether she wrote a tag that was then dropped or never wrote one at all.

// chatDebugSection is one assembled prompt section as it was offered to the budget.
type chatDebugSection struct {
	Name string `json:"name"`
	Rank int    `json:"rank"`
	// Deferred marks a section the turn had no particular use for — offered last.
	Deferred bool `json:"deferred"`
	// Kept says whether it survived into the prompt that was sent.
	Kept bool `json:"kept"`
	Text string `json:"text"`
}

// chatDebug is the whole record of how one turn was built.
type chatDebug struct {
	// Messages is exactly what was posted to the backend, system prompt included.
	Messages []chatMessage `json:"messages"`
	// Sections are the optional blocks, in the order they were offered.
	Sections []chatDebugSection `json:"sections"`
	// Raw is the model's reply before any tag was parsed or scrubbed out of it.
	Raw string `json:"raw"`
	// Signals is what the turn read the latest message as being about, which is what
	// decides whether half these sections were offered at all.
	Signals map[string]bool `json:"signals"`
}

// buildChatDebug records the sections and which of them survived the budget.
//
// `dropped` and `cleared` are the budget's own two lists of what did not fit; a section
// named in either was offered and lost, everything else was kept. Matching by name is
// sound because the names are fixed strings written at the call sites, not user text.
func buildChatDebug(sections []promptSection, dropped, cleared []string, messages []chatMessage, signals turnSignals) *chatDebug {
	lost := make(map[string]bool, len(dropped)+len(cleared))
	for _, name := range dropped {
		lost[name] = true
	}
	for _, name := range cleared {
		lost[name] = true
	}
	out := &chatDebug{
		Messages: messages,
		Sections: make([]chatDebugSection, 0, len(sections)),
		Signals: map[string]bool{
			"recommend": signals.recommend,
			"recent":    signals.recent,
			"library":   signals.library,
			"photo":     signals.photo,
			"act":       signals.act,
			"past":      signals.past,
			"place":     signals.place,
		},
	}
	for _, section := range sections {
		out.Sections = append(out.Sections, chatDebugSection{
			Name:     section.Name,
			Rank:     section.Rank,
			Deferred: section.Deferred,
			Kept:     !lost[section.Name],
			Text:     section.Text,
		})
	}
	return out
}
