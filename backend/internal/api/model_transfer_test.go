package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func transferCall(t *testing.T, s *Server, token, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, req)
	return w
}

func TestATransferNamesItsPlacesAndNeverAPath(t *testing.T) {
	s, token := newTestServer(t)
	for _, body := range []string{
		`{"from":"/etc","to":"comfy","kinds":["loras"]}`,
		`{"from":"models","to":"/tmp/anywhere","kinds":["loras"]}`,
		`{"from":"../models","to":"comfy","kinds":["loras"]}`,
	} {
		if w := transferCall(t, s, token, http.MethodPost, "/api/imagegen/transfer/plan", body); w.Code != http.StatusBadRequest {
			t.Fatalf("%s: %d %s", body, w.Code, w.Body.String())
		}
		if w := transferCall(t, s, token, http.MethodPost, "/api/imagegen/transfer", body); w.Code != http.StatusBadRequest {
			t.Fatalf("%s: %d %s", body, w.Code, w.Body.String())
		}
	}
}

func TestATransferToItselfOrOfNothingIsRefused(t *testing.T) {
	s, token := newTestServer(t)
	for _, body := range []string{
		`{"from":"comfy","to":"comfy","kinds":["loras"]}`,
		`{"from":"models","to":"comfy","kinds":[]}`,
		`{"from":"models","to":"comfy","kinds":["passwords"]}`,
	} {
		if w := transferCall(t, s, token, http.MethodPost, "/api/imagegen/transfer/plan", body); w.Code != http.StatusBadRequest {
			t.Fatalf("%s: %d %s", body, w.Code, w.Body.String())
		}
	}
}

func TestAPlaceWithNoFoldersSaysSoRatherThanLookingEmpty(t *testing.T) {
	s, token := newTestServer(t)
	w := transferCall(t, s, token, http.MethodPost, "/api/imagegen/transfer/plan", `{"from":"models","to":"comfy","kinds":["loras"]}`)
	if w.Code != http.StatusConflict {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}
