package api

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// fakeMP4 is enough of an MP4 for the kind sniffer: a box whose type is ftyp.
var fakeMP4 = append([]byte("\x00\x00\x00\x18ftypisom\x00\x00\x02\x00isomiso2"), make([]byte, 64)...)

// fakeComfy answers the four calls a clip makes and records the graph it was queued.
func fakeComfy(t *testing.T) (*httptest.Server, func() map[string]any, func() int) {
	t.Helper()
	var mu sync.Mutex
	var graph map[string]any
	uploads := 0
	mux := http.NewServeMux()
	mux.HandleFunc("POST /upload/image", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		uploads++
		mu.Unlock()
		_, _ = io.WriteString(w, `{"name":"start.png","subfolder":""}`)
	})
	mux.HandleFunc("POST /prompt", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Prompt map[string]any `json:"prompt"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		mu.Lock()
		graph = body.Prompt
		mu.Unlock()
		_, _ = io.WriteString(w, `{"prompt_id":"p1"}`)
	})
	mux.HandleFunc("GET /history/p1", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"p1":{"outputs":{"9":{"images":[{"filename":"clip.mp4","subfolder":"","type":"output"}]}},"status":{"status_str":"success"}}}`)
	})
	mux.HandleFunc("GET /view", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(fakeMP4)
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv, func() map[string]any { mu.Lock(); defer mu.Unlock(); return graph },
		func() int { mu.Lock(); defer mu.Unlock(); return uploads }
}

const pictureWorkflow = `{"1":{"class_type":"LoadImage","inputs":{"image":"{{image}}"}},
	"2":{"class_type":"WanImageToVideo","inputs":{"width":"{{width}}","height":"{{height}}","length":"{{frames}}","text":"{{prompt}}"}}}`

func TestAClipFromAPictureRunsThePictureWorkflowAndWaitsAsAPlayablePreview(t *testing.T) {
	comfy, graph, uploads := fakeComfy(t)
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.LibbyClipURL = comfy.URL
	cur.LibbyClipWorkflow = pictureWorkflow
	s.settings.Set(cur)
	h := s.Handler()

	picture := "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("\x89PNG\r\n\x1a\nnot really"))
	body, _ := json.Marshal(map[string]any{
		"from": "image", "prompt": "she waves", "initImage": picture, "width": 835, "height": 480, "frames": 81,
	})
	rec := do(t, h, token, "POST", "/api/imagegen/clip", string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("clip: %d %s", rec.Code, rec.Body)
	}
	var res genResult
	_ = json.Unmarshal(rec.Body.Bytes(), &res)
	if res.Clip == nil || res.Clip.MIME != "video/mp4" || res.Clip.Seed <= 0 {
		t.Fatalf("result = %s", rec.Body)
	}
	if uploads() != 1 {
		t.Fatalf("the picture was uploaded %d times", uploads())
	}
	inputs := graph()["2"].(map[string]any)["inputs"].(map[string]any)
	if inputs["width"] != 832.0 || inputs["height"] != 480.0 || inputs["length"] != 81.0 || inputs["text"] != "she waves" {
		t.Fatalf("queued inputs = %#v", inputs)
	}
	if graph()["1"].(map[string]any)["inputs"].(map[string]any)["image"] != "start.png" {
		t.Fatalf("the LoadImage node was not given the upload")
	}

	// The preview plays: it says it is a video, and answers the range a <video> asks for.
	req := httptest.NewRequest("GET", "/api/imagegen/preview/"+res.Clip.ID, nil)
	req.Header.Set("Range", "bytes=4-11")
	prev := httptest.NewRecorder()
	h.ServeHTTP(prev, req)
	if prev.Code != http.StatusPartialContent || prev.Header().Get("Content-Type") != "video/mp4" || prev.Body.String() != "ftypisom" {
		t.Fatalf("preview: %d %q %q", prev.Code, prev.Header().Get("Content-Type"), prev.Body.String())
	}

	// Saved, it is a video in the library.
	saved := do(t, h, token, "POST", "/api/imagegen/save", `{"id":"`+res.Clip.ID+`","tags":["clip"]}`)
	if saved.Code != http.StatusOK {
		t.Fatalf("save: %d %s", saved.Code, saved.Body)
	}
	var out struct {
		ID int64 `json:"id"`
	}
	_ = json.Unmarshal(saved.Body.Bytes(), &out)
	row, err := s.db.GetMedia(t.Context(), out.ID)
	if err != nil || row.Kind != "video" {
		t.Fatalf("library row = %+v, %v", row, err)
	}
}

func TestAClipFromWordsIsRefusedUntilItsWorkflowIsSetUp(t *testing.T) {
	s, token := newTestServer(t)
	cur := s.settings.Get()
	cur.LibbyClipURL = "http://127.0.0.1:1"
	cur.LibbyClipWorkflow = pictureWorkflow
	s.settings.Set(cur)
	rec := do(t, s.Handler(), token, "POST", "/api/imagegen/clip", `{"from":"text","prompt":"she waves"}`)
	if rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "Video") {
		t.Fatalf("got %d %s", rec.Code, rec.Body)
	}
	if st := clipsStatus(s.settings.Get()); st.Image == nil || st.Text != nil || strings.Join(st.Image.Takes, ",") != "image,width,height,frames,prompt" {
		t.Fatalf("status = %+v", st)
	}
}

func TestAClipsKnobsAreSentOnlyWhenSetAndSizesFallToSixteens(t *testing.T) {
	vars := clipVars(clipReq{Prompt: " waves ", Seed: 7, Width: 849, Height: 10, Frames: 5000})
	if vars["width"] != "848" || vars["height"] != "64" || vars["frames"] != "1025" || vars["prompt"] != "waves" || vars["seed"] != "7" {
		t.Fatalf("vars = %v", vars)
	}
	if _, sent := vars["fps"]; sent {
		t.Fatal("an unset fps was sent, overriding the workflow's own")
	}
}
