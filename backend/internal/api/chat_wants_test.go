package api

import (
	"net/http"
	"strings"
	"testing"
)

func TestFindWantTags(t *testing.T) {
	// One want, in her own words, read out of the middle of a reply.
	wants := findWantTags("god i'd kill for [want: a black lace set to wear] anyway. how was your day?")
	if len(wants) != 1 || wants[0] != "a black lace set to wear" {
		t.Fatalf("got %#v, want the single desire", wants)
	}
	// [craving: …] is the same tag under another word models reach for.
	wants = findWantTags("[craving: something rougher than what's on the shelves]")
	if len(wants) != 1 || wants[0] != "something rougher than what's on the shelves" {
		t.Fatalf("got %#v, want the craving", wants)
	}
	// Hard cap at one, even when a model tries to file a wishlist.
	if wants = findWantTags("[want: a] [want: b] [want: c]"); len(wants) != maxWantsPerReply {
		t.Fatalf("got %d wants, want it capped at %d", len(wants), maxWantsPerReply)
	}
	if got := findWantTags("just a normal line with no desire in it."); got != nil {
		t.Errorf("found a want in prose that has none: %#v", got)
	}
	if got := findWantTags("[want:   ]"); got != nil {
		t.Errorf("accepted an empty want tag: %#v", got)
	}
}

// The want tag is machinery the user must never read, so scrubbing takes it out the same
// way it takes out the remember tag it is modelled on.
func TestScrubDirectivesRemovesWantTag(t *testing.T) {
	cases := []struct{ reply, want string }{
		{"mm. [want: a black lace set] anyway, hi.", "mm. anyway, hi."},
		{"i keep thinking about it. [craving: something rougher]", "i keep thinking about it."},
	}
	for _, tc := range cases {
		if got := scrubDirectives(tc.reply); got != tc.want {
			t.Errorf("scrubDirectives(%q)\n got %q\nwant %q", tc.reply, got, tc.want)
		}
	}
	// Ordinary prose that merely uses "want" or "desire" is her voice, not a tag, and
	// must survive untouched.
	for _, reply := range []string{
		"i want you to come here.",
		"you're everything i desire.",
		"*wants to pull you closer* come here.",
	} {
		if got := scrubDirectives(reply); got != reply {
			t.Errorf("scrubDirectives(%q) = %q, want it unchanged", reply, got)
		}
	}
}

func TestWantsPromptBlock(t *testing.T) {
	if got := wantsPromptBlock(libbyWantStore{}); got != "" {
		t.Errorf("empty store produced a block: %q", got)
	}
	block := wantsPromptBlock(libbyWantStore{Wants: []libbyWant{{Text: "a black lace set to wear"}}})
	if !strings.Contains(block, "a black lace set to wear") {
		t.Errorf("block omitted the want: %q", block)
	}
}

// The store dedups, caps oldest-out, and clears — same contract as memory.
func TestLibbyWantsStoreRoundTrip(t *testing.T) {
	s, _ := newTestServer(t)
	const uid = int64(1)

	changed, err := s.appendLibbyWants(uid, []string{"a black lace set", "more femdom on the shelves"})
	if err != nil || !changed {
		t.Fatalf("first append: changed=%v err=%v", changed, err)
	}
	// Re-voicing a want she already holds is a no-op, no disk churn.
	changed, err = s.appendLibbyWants(uid, []string{"a black lace set", "A BLACK LACE SET"})
	if err != nil || changed {
		t.Fatalf("dedup append: changed=%v err=%v (want no change)", changed, err)
	}
	store, err := s.readLibbyWants(uid)
	if err != nil || len(store.Wants) != 2 {
		t.Fatalf("read back: %d wants, err=%v", len(store.Wants), err)
	}

	// Past the cap, the oldest fall away and the newest survive.
	many := make([]string, maxLibbyWants+5)
	for i := range many {
		many[i] = "want number " + string(rune('a'+i%26)) + itoa(int64(i))
	}
	if _, err := s.appendLibbyWants(uid, many); err != nil {
		t.Fatalf("bulk append: %v", err)
	}
	store, _ = s.readLibbyWants(uid)
	if len(store.Wants) != maxLibbyWants {
		t.Fatalf("after overflow: %d wants, want cap %d", len(store.Wants), maxLibbyWants)
	}
	if store.Wants[len(store.Wants)-1].Text != many[len(many)-1] {
		t.Errorf("newest want was dropped: last is %q", store.Wants[len(store.Wants)-1].Text)
	}
}

// The settings endpoints read and clear what the chat path wrote.
func TestLibbyWantsEndpoints(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	if _, err := s.appendLibbyWants(1, []string{"a black lace set to wear"}); err != nil {
		t.Fatalf("seed want: %v", err)
	}

	rec := do(t, h, token, http.MethodGet, "/api/libby/wants", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "a black lace set to wear") {
		t.Fatalf("get wants: %d %s", rec.Code, rec.Body)
	}

	rec = do(t, h, token, http.MethodDelete, "/api/libby/wants", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("clear wants: %d %s", rec.Code, rec.Body)
	}
	rec = do(t, h, token, http.MethodGet, "/api/libby/wants", "")
	if strings.Contains(rec.Body.String(), "a black lace set to wear") {
		t.Fatalf("wants survived clear: %s", rec.Body)
	}
}
