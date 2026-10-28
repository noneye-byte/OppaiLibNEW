package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// detectTrainer is a trainer that finds one person in whatever it is sent, and says
// it can only when features does.
func detectTrainer(t *testing.T, features string, got *[]byte) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = io.WriteString(w, `{"error":"wrong trainer token"}`)
			return
		}
		switch r.URL.Path {
		case "/health":
			_, _ = io.WriteString(w, `{"ok":true,"version":"3","features":[`+features+`]}`)
		case "/detect":
			*got, _ = io.ReadAll(r.Body)
			_, _ = io.WriteString(w, `{"width":64,"height":96,"model":"person_yolov8m-seg.pt",
				"people":[{"box":[4,8,40,90],"score":0.91,"outline":[[4,8],[40,8],[40,90]]}]}`)
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func detect(t *testing.T, s *Server, token string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/imagegen/train/detect?conf=0.4", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	return rec
}

func TestAPanelIsSentToTheTrainerAndItsPeopleComeBack(t *testing.T) {
	s, token := newTestServer(t)
	var sent []byte
	trSrv := detectTrainer(t, `"repeats-per-file","detect-people"`, &sent)
	set := s.settings.Get()
	set.TrainerURL, set.TrainerToken = trSrv.URL, "tok"
	s.settings.Set(set)

	panel := pngOf(t, 64, 96, 3)
	rec := detect(t, s, token, panel)
	if rec.Code != http.StatusOK {
		t.Fatalf("detect: %d %s", rec.Code, rec.Body)
	}
	var out struct {
		People []struct {
			Box     [4]int   `json:"box"`
			Outline [][2]int `json:"outline"`
		} `json:"people"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out.People) != 1 || out.People[0].Box != [4]int{4, 8, 40, 90} || len(out.People[0].Outline) != 3 {
		t.Fatalf("people = %s", rec.Body)
	}
	if !bytes.Equal(sent, panel) {
		t.Fatalf("the trainer was sent %d bytes, not the panel", len(sent))
	}
	if rec := detect(t, s, token, []byte("not a picture")); rec.Code != http.StatusBadRequest {
		t.Fatalf("a non-picture: %d", rec.Code)
	}
}

func TestFindingPeopleSaysWhatIsMissingAndNeverAnswers401(t *testing.T) {
	s, token := newTestServer(t)
	panel := pngOf(t, 8, 8, 1)
	if rec := detect(t, s, token, panel); rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "trainer") {
		t.Fatalf("no trainer: %d %s", rec.Code, rec.Body)
	}

	var sent []byte
	old := detectTrainer(t, `"repeats-per-file"`, &sent)
	set := s.settings.Get()
	set.TrainerURL, set.TrainerToken = old.URL, "tok"
	s.settings.Set(set)
	if rec := detect(t, s, token, panel); rec.Code != http.StatusConflict || !strings.Contains(rec.Body.String(), "update") {
		t.Fatalf("an older trainer: %d %s", rec.Code, rec.Body)
	}

	// The trainer refusing its token is the trainer's business, not a reason to sign
	// the person out of OppaiLib.
	set.TrainerToken = "wrong"
	s.settings.Set(set)
	if rec := detect(t, s, token, panel); rec.Code != http.StatusBadGateway {
		t.Fatalf("a refused token: %d %s", rec.Code, rec.Body)
	}
}
