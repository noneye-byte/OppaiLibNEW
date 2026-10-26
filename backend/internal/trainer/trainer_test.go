package trainer

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"slices"
	"sync"
	"testing"
)

func TestAPicturesOwnRepeatsGoWithItsCaptionAndTheJobsDoNot(t *testing.T) {
	var mu sync.Mutex
	var puts []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/jobs":
			fmt.Fprint(w, `{"id":"j1","state":"receiving"}`)
		case r.Method == http.MethodPut:
			mu.Lock()
			puts = append(puts, r.URL.RequestURI())
			mu.Unlock()
			w.WriteHeader(http.StatusNoContent)
		case r.URL.Path == "/jobs/j1/start":
			fmt.Fprint(w, `{"id":"j1","state":"queued"}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()
	pics := []Picture{
		{Ext: ".png", Data: []byte("a"), Caption: "ohwx", Repeats: 10},
		{Ext: ".png", Data: []byte("b"), Caption: "ohwx, glasses", Repeats: 4},
	}
	i := 0
	_, err := New().Submit(context.Background(), srv.URL, "", Spec{Name: "x", Repeats: 10}, func() (Picture, bool, error) {
		if i == len(pics) {
			return Picture{}, false, nil
		}
		i++
		return pics[i-1], true, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	want := []string{
		"/jobs/j1/files/0001.png", "/jobs/j1/files/0001.txt",
		"/jobs/j1/files/0002.png?repeats=4", "/jobs/j1/files/0002.txt?repeats=4",
	}
	if !slices.Equal(puts, want) {
		t.Fatalf("puts = %q\nwant %q", puts, want)
	}
}

func TestHealthSaysWhatTheTrainerCanDo(t *testing.T) {
	var old *Health
	if old.Has(FeatureRepeatsPerFile) {
		t.Fatal("no health has no features")
	}
	if (&Health{Version: "1"}).Has(FeatureRepeatsPerFile) {
		t.Fatal("a version 1 trainer cannot place a picture's repeats")
	}
	if !(&Health{Features: []string{"repeats-per-file"}}).Has(FeatureRepeatsPerFile) {
		t.Fatal("the feature was not read")
	}
}
