package scraper

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestTwitterHandleReadsWhatAPersonPastes(t *testing.T) {
	cases := map[string]string{
		"@inkartist":              "inkartist",
		"inkartist":               "inkartist",
		"  ink_artist ":           "ink_artist",
		"https://x.com/inkartist": "inkartist",
		"x.com/inkartist/media":   "inkartist",
		"https://twitter.com/inkartist/status/12345": "inkartist",
		"https://example.com/inkartist":              "",
		"https://x.com/i/web/status/1":               "",
		"has spaces":                                 "",
		"waytoolongforahandle1":                      "",
	}
	for in, want := range cases {
		if got := TwitterHandle(in); got != want {
			t.Errorf("TwitterHandle(%q) = %q, want %q", in, got, want)
		}
	}
}

// fakeFx is the mirror, including its habit of answering a page 404 now and then.
func fakeFx(t *testing.T, flaky int32) (*httptest.Server, *int32) {
	t.Helper()
	var misses int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/inkartist":
			fmt.Fprint(w, `{"code":200,"user":{"screen_name":"inkartist","name":"Ink","media_count":3,"avatar_url":"https://pbs.twimg.com/a.jpg"}}`)
		case r.URL.Path == "/nobody":
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprint(w, `{"code":404,"message":"User not found"}`)
		case r.URL.Path == "/2/profile/inkartist/media":
			if atomic.AddInt32(&misses, 1) <= flaky {
				w.WriteHeader(http.StatusNotFound)
				fmt.Fprint(w, `{"code":404,"results":[],"cursor":{"top":null,"bottom":null}}`)
				return
			}
			if r.URL.Query().Get("cursor") == "next" {
				fmt.Fprint(w, `{"code":200,"results":[],"cursor":{"bottom":"again"}}`)
				return
			}
			fmt.Fprint(w, `{"code":200,"results":[
				{"id":"1","url":"https://x.com/inkartist/status/1","text":"two pictures","author":{"screen_name":"inkartist"},
				 "media":{"photos":[
					{"id":"p1","url":"https://pbs.twimg.com/media/AAA.jpg?name=orig","width":1200,"height":1600},
					{"id":"p2","url":"https://pbs.twimg.com/media/BBB.png?name=orig","width":800,"height":800}]}},
				{"id":"2","url":"https://x.com/someone/status/2","author":{"screen_name":"someone"},"reposted_by":{"screen_name":"inkartist"},
				 "media":{"photos":[{"id":"p3","url":"https://pbs.twimg.com/media/CCC.jpg?name=orig"}]}},
				{"id":"3","url":"https://x.com/inkartist/status/3","author":{"screen_name":"inkartist"},
				 "media":{"videos":[{"url":"https://video.twimg.com/v.mp4"}]}}
			],"cursor":{"bottom":"next"}}`)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	oldBase, oldBackoff := fxAPIBase, fxBackoff
	fxAPIBase, fxBackoff = srv.URL, time.Millisecond
	t.Cleanup(func() { fxAPIBase, fxBackoff = oldBase, oldBackoff })
	return srv, &misses
}

func TestAnAccountsPicturesAreReadPastTheMirrorsSpurious404s(t *testing.T) {
	fakeFx(t, 2)
	e := New(Options{AllowPrivateHosts: true})
	page, err := e.TwitterUserMedia(context.Background(), "inkartist", "")
	if err != nil {
		t.Fatal(err)
	}
	if page.Account == nil || page.Account.ScreenName != "inkartist" || page.Account.MediaCount != 3 {
		t.Fatalf("account = %+v", page.Account)
	}
	if len(page.Pictures) != 3 {
		t.Fatalf("want the three photos and not the video, got %+v", page.Pictures)
	}
	first := page.Pictures[0]
	if first.URL != "https://pbs.twimg.com/media/AAA.jpg?name=orig" || !strings.Contains(first.Thumb, "name=small") {
		t.Errorf("sizes: %q / %q", first.URL, first.Thumb)
	}
	if first.TweetURL != "https://x.com/inkartist/status/1" || first.Width != 1200 || first.Repost {
		t.Errorf("first picture: %+v", first)
	}
	if !page.Pictures[2].Repost {
		t.Error("a post the account shared is marked as a repost")
	}
	if page.Cursor != "next" {
		t.Errorf("cursor = %q", page.Cursor)
	}
}

func TestAnEmptyPageIsTheEndWhateverCursorTheMirrorSends(t *testing.T) {
	fakeFx(t, 0)
	e := New(Options{AllowPrivateHosts: true})
	page, err := e.TwitterUserMedia(context.Background(), "inkartist", "next")
	if err != nil {
		t.Fatal(err)
	}
	if page.Account != nil || len(page.Pictures) != 0 || page.Cursor != "" {
		t.Fatalf("page = %+v", page)
	}
}

func TestAMirrorThatNeverAnswersIsAnErrorNotTheEnd(t *testing.T) {
	fakeFx(t, 100)
	e := New(Options{AllowPrivateHosts: true})
	if _, err := e.TwitterUserMedia(context.Background(), "inkartist", "next"); err == nil {
		t.Fatal("want an error to try again on, not an empty last page")
	}
}

func TestAnAccountThatDoesNotExistSaysSo(t *testing.T) {
	fakeFx(t, 0)
	e := New(Options{AllowPrivateHosts: true})
	if _, err := e.TwitterUserMedia(context.Background(), "nobody", ""); !errors.Is(err, ErrTwitterNoAccount) {
		t.Fatalf("err = %v", err)
	}
}
