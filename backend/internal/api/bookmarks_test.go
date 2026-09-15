package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestTimecodesRoundTrip(t *testing.T) {
	cases := map[float64]string{0: "0:00", 9: "0:09", 250: "4:10", 3725: "1:02:05"}
	for seconds, want := range cases {
		if got := formatTimecode(seconds); got != want {
			t.Errorf("format %v = %q, want %q", seconds, got, want)
		}
		if back, ok := parseTimecode(want); !ok || back != seconds {
			t.Errorf("parse %q = %v, %v; want %v", want, back, ok, seconds)
		}
	}
}

func TestParseTimecodeRefusesWhatIsNotATime(t *testing.T) {
	for _, text := range []string{"", "abc", "1:2:3:4", "-4:10", "the beach one"} {
		if _, ok := parseTimecode(text); ok {
			t.Errorf("%q parsed as a time", text)
		}
	}
}

func TestAnAttachRequestCanNameAMoment(t *testing.T) {
	query, at := splitAttachMoment("the beach one @ 4:10")
	if query != "the beach one" || at != 250 {
		t.Fatalf("got %q at %v", query, at)
	}
	query, at = splitAttachMoment("the beach one at 1:02:30")
	if query != "the beach one" || at != 3750 {
		t.Fatalf("got %q at %v", query, at)
	}
	// A title is a title; "at" mid-sentence and a bare number are not moments.
	query, at = splitAttachMoment("dinner at eight")
	if query != "dinner at eight" || at != 0 {
		t.Fatalf("got %q at %v", query, at)
	}
}

func TestWhereInVideoSpeaksInWatchingTerms(t *testing.T) {
	if got := whereInVideo(0, 0); got != "" {
		t.Fatalf("nothing known should say nothing, got %q", got)
	}
	if got := whereInVideo(5, 600); !strings.Contains(got, "only just started") || !strings.Contains(got, "0:05 of 10:00") {
		t.Fatalf("start: %q", got)
	}
	if got := whereInVideo(300, 600); !strings.Contains(got, "about halfway") {
		t.Fatalf("middle: %q", got)
	}
	if got := whereInVideo(580, 600); !strings.Contains(got, "nearly at the end") {
		t.Fatalf("end: %q", got)
	}
	if got := whereInVideo(90, 0); !strings.Contains(got, "1:30 in") {
		t.Fatalf("no duration: %q", got)
	}
}

// A bookmark is a moment you chose, named, and can get back to — and it is yours:
// somebody else on the install sees none of them.
func TestBookmarksAreNamedMomentsPerUser(t *testing.T) {
	s, token := newTestServer(t)
	clip := seedFull(t, s, seedRow{title: "The Beach One", kind: "video", at: 100})
	still := seedFull(t, s, seedRow{title: "A Photo", kind: "image", at: 100})

	rec := do(t, s.Handler(), token, http.MethodPost, fmt.Sprintf("/api/media/%d/bookmarks", clip), `{"position":250,"label":"the good part"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("add bookmark: %d %s", rec.Code, rec.Body)
	}
	var made bookmarkJSON
	if err := json.Unmarshal(rec.Body.Bytes(), &made); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if made.Position != 250 || made.Label != "the good part" || made.ID == 0 {
		t.Fatalf("bookmark = %+v", made)
	}
	// A still has no moments.
	if rec := do(t, s.Handler(), token, http.MethodPost, fmt.Sprintf("/api/media/%d/bookmarks", still), `{"position":1}`); rec.Code != http.StatusBadRequest {
		t.Fatalf("bookmarking an image: %d", rec.Code)
	}

	rec = do(t, s.Handler(), token, http.MethodGet, fmt.Sprintf("/api/media/%d/bookmarks", clip), "")
	var list struct {
		Bookmarks []bookmarkJSON `json:"bookmarks"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil || len(list.Bookmarks) != 1 {
		t.Fatalf("list = %s (%v)", rec.Body, err)
	}

	// The housemate sees nothing, and cannot delete it either.
	other := secondUserToken(t, s)
	rec = do(t, s.Handler(), other, http.MethodGet, fmt.Sprintf("/api/media/%d/bookmarks", clip), "")
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil || len(list.Bookmarks) != 0 {
		t.Fatalf("other user's list = %s", rec.Body)
	}
	do(t, s.Handler(), other, http.MethodDelete, fmt.Sprintf("/api/bookmarks/%d", made.ID), "")
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/bookmarks", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil || len(list.Bookmarks) != 1 || list.Bookmarks[0].Title != "The Beach One" {
		t.Fatalf("recent after a stranger's delete = %s", rec.Body)
	}

	// The owner can rename and remove it.
	rec = do(t, s.Handler(), token, http.MethodPatch, fmt.Sprintf("/api/bookmarks/%d", made.ID), `{"label":"the best part"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "the best part") {
		t.Fatalf("relabel: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, s.Handler(), token, http.MethodDelete, fmt.Sprintf("/api/bookmarks/%d", made.ID), ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", rec.Code)
	}
	rec = do(t, s.Handler(), token, http.MethodGet, "/api/bookmarks", "")
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil || len(list.Bookmarks) != 0 {
		t.Fatalf("recent after delete = %s", rec.Body)
	}
}

// Told what they are watching, she knows where in it they are and what they marked.
func TestSheKnowsWhereTheyAreInTheVideoAndWhatTheyMarked(t *testing.T) {
	s, token := newTestServer(t)
	clip := seedFull(t, s, seedRow{title: "The Beach One", kind: "video", at: 100})
	if rec := do(t, s.Handler(), token, http.MethodPost, fmt.Sprintf("/api/media/%d/bookmarks", clip), `{"position":250,"label":"the good part"}`); rec.Code != http.StatusOK {
		t.Fatalf("add bookmark: %d %s", rec.Code, rec.Body)
	}
	user, err := s.db.SessionUser(context.Background(), token, time.Hour)
	if err != nil {
		t.Fatalf("user: %v", err)
	}
	uid := user.ID
	block := s.viewingDirective(context.Background(), &chatViewing{FocusID: clip, Position: 200, Duration: 600}, "sweet", 1, true, uid)
	for _, want := range []string{"3:20 of 10:00", "4:10", "the good part", "coming up"} {
		if !strings.Contains(block, want) {
			t.Errorf("directive lacks %q:\n%s", want, block)
		}
	}
	// Somebody else's character is not shown this user's marks.
	if other := s.viewingDirective(context.Background(), &chatViewing{FocusID: clip, Position: 200, Duration: 600}, "sweet", 1, false, 0); strings.Contains(other, "the good part") {
		t.Errorf("an imported card saw the bookmarks")
	}
}

// What they had on a moment ago reaches the chat screen, and stays out once it is old.
func TestWhatTheyWereWatchingIsFedWhileItIsRecent(t *testing.T) {
	s, token := newTestServer(t)
	clip := seedFull(t, s, seedRow{title: "The Beach One", kind: "video", at: 100})
	user, err := s.db.SessionUser(context.Background(), token, time.Hour)
	if err != nil {
		t.Fatalf("user: %v", err)
	}
	uid := user.ID
	if err := s.db.SetProgress(context.Background(), uid, clip, 200); err != nil {
		t.Fatalf("progress: %v", err)
	}
	now := time.Now()
	block := s.libraryWatchingBlock(context.Background(), uid, now)
	if !strings.Contains(block, "The Beach One") || !strings.Contains(block, "3:20 in") {
		t.Fatalf("recent watching block = %q", block)
	}
	if late := s.libraryWatchingBlock(context.Background(), uid, now.Add(watchingRecency+time.Minute)); late != "" {
		t.Fatalf("stale progress was fed: %q", late)
	}
	if none := s.libraryWatchingBlock(context.Background(), 0, now); none != "" {
		t.Fatalf("no user, yet fed: %q", none)
	}
}
