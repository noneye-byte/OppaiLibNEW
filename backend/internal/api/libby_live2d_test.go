package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// vtuberModelZip is a model laid out the way one rigged for VTube Studio arrives: in a
// folder named in Chinese, its model3.json naming no expressions or motions, the
// expressions beside it bound to hotkeys in the .vtube.json, and the idle loop named
// there too.
func vtuberModelZip(t *testing.T) []byte {
	t.Helper()
	var tex bytes.Buffer
	_ = png.Encode(&tex, image.NewRGBA(image.Rect(0, 0, 64, 32)))
	files := map[string]string{
		"魔女/魔女.model3.json": `{"Version":3,"FileReferences":{"Moc":"魔女.moc3","Textures":["魔女.8192/texture_00.png"],"Physics":"魔女.physics3.json"},` +
			`"Groups":[{"Target":"Parameter","Name":"LipSync","Ids":["ParamMouthOpenY"]}]}`,
		"魔女/魔女.moc3":              "MOC3\x05\x00\x00\x00rest",
		"魔女/魔女.8192/texture_00.png": tex.String(),
		"魔女/魔女.physics3.json":      `{"Version":3}`,
		"魔女/ku.exp3.json":          `{"Type":"Live2D Expression","Parameters":[{"Id":"Param68","Value":30,"Blend":"Add"}]}`,
		"魔女/x.exp3.json":           `{"Type":"Live2D Expression","Parameters":[{"Id":"Param60","Value":30,"Blend":"Add"}]}`,
		"魔女/mz.exp3.json":          `{"Type":"Live2D Expression","Parameters":[{"Id":"Param71","Value":30,"Blend":"Add"}]}`,
		"魔女/Scene1.motion3.json":   `{"Version":3,"Meta":{"Duration":3,"Loop":true}}`,
		"魔女/魔女.vtube.json": "\xef\xbb\xbf" + `{"Name":"Witch","FileReferences":{"Model":"魔女.model3.json","IdleAnimation":"Scene1.motion3.json"},` +
			`"Hotkeys":[{"Name":"哭哭","Action":"ToggleExpression","File":"ku.exp3.json"},{"Name":"爱心眼","Action":"ToggleExpression","File":"x.exp3.json"},` +
			`{"Name":"帽子切换","Action":"ToggleExpression","File":"mz.exp3.json"},{"Name":"归零","Action":"RemoveAllExpressions","File":""}]}`,
		"魔女/魔女.8192/Thumbs.db": "junk",
	}
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, body := range files {
		f, _ := zw.Create(name)
		_, _ = f.Write([]byte(body))
	}
	_ = zw.Close()
	return buf.Bytes()
}

func TestAVTuberModelIsReadWithTheExpressionsItsModelFileLeavesOut(t *testing.T) {
	m, err := readLive2DZip(vtuberModelZip(t))
	if err != nil {
		t.Fatal(err)
	}
	if m.Name != "Witch" || m.Texture != 64 || m.Idle == "" || m.Motions != 1 {
		t.Fatalf("model: name %q texture %d idle %q motions %d", m.Name, m.Texture, m.Idle, m.Motions)
	}
	labels := map[string]string{}
	for _, e := range m.Expressions {
		labels[e.Name] = e.Label
		if !strings.HasPrefix(e.File, "exp/") {
			t.Fatalf("expression served as %q", e.File)
		}
	}
	if labels["ku"] != "哭哭" || labels["x"] != "爱心眼" || len(m.Expressions) != 3 {
		t.Fatalf("expressions: %+v", m.Expressions)
	}
	// Every name the browser will ask for is plain, and the model file names only those.
	var model struct {
		FileReferences struct {
			Moc         string `json:"Moc"`
			Textures    []string
			Physics     string
			Expressions []struct{ Name, File string }
			Motions     map[string][]struct{ File string }
		}
	}
	if err := json.Unmarshal(m.Files[live2dModelFile], &model); err != nil {
		t.Fatal(err)
	}
	refs := model.FileReferences
	if refs.Moc != "model.moc3" || refs.Textures[0] != "tex0.png" || refs.Physics != "physics.physics3.json" ||
		len(refs.Expressions) != 3 || len(refs.Motions["Idle"]) != 1 {
		t.Fatalf("rewritten: %+v", refs)
	}
	for name := range m.Files {
		for _, r := range name {
			if r > 127 {
				t.Fatalf("a served name is not plain: %q", name)
			}
		}
		if strings.Contains(name, "Thumbs") {
			t.Fatal("a file the model never named was kept")
		}
	}
}

func TestHerMoodsAreGuessedFromTheExpressionsAndPropsAreLeftAlone(t *testing.T) {
	moods := guessLive2DMoods([]live2dExpression{
		{Name: "ku", Label: "哭哭"}, {Name: "sq", Label: "生气"}, {Name: "x", Label: "爱心眼"}, {Name: "xx", Label: "星星眼"},
		{Name: "mz", Label: "帽子切换"}, {Name: "yj", Label: "眼镜切换"}, {Name: "Blush"},
	})
	want := map[string]string{"sad": "ku", "annoyed": "sq", "loving": "x", "excited": "xx", "shy": "Blush"}
	for mood, name := range want {
		if got := moods[mood]; len(got) != 1 || got[0] != name {
			t.Fatalf("%s: %v (all %v)", mood, got, moods)
		}
	}
	for _, names := range moods {
		for _, n := range names {
			if n == "mz" || n == "yj" {
				t.Fatalf("a prop was put on a mood: %v", moods)
			}
		}
	}
}

func TestACubism2ModelIsTurnedAwayByName(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	f, _ := zw.Create("old/model.model.json")
	_, _ = f.Write([]byte("{}"))
	f, _ = zw.Create("old/model.moc")
	_, _ = f.Write([]byte("moc"))
	_ = zw.Close()
	if _, err := readLive2DZip(buf.Bytes()); err == nil || !strings.Contains(err.Error(), "Cubism 2") {
		t.Fatalf("err = %v", err)
	}
}

func TestHerModelIsUploadedServedAndTuned(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	rec := do(t, h, token, http.MethodPost, "/api/libby/live2d", string(vtuberModelZip(t)))
	if rec.Code != http.StatusOK {
		t.Fatalf("upload: %d %s", rec.Code, rec.Body)
	}
	var view live2dView
	_ = json.Unmarshal(rec.Body.Bytes(), &view)
	if view.Model == nil || !view.Model.Enabled || view.Core || view.Model.Moods["sad"][0] != "ku" {
		t.Fatalf("view: %+v", view)
	}
	rec = do(t, h, token, http.MethodGet, "/api/libby/live2d/files/model.model3.json", "")
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "application/json" || !strings.Contains(rec.Body.String(), "tex0.png") {
		t.Fatalf("model file: %d %s", rec.Code, rec.Body)
	}
	if rec := do(t, h, token, http.MethodGet, "/api/libby/live2d/files/exp/0.exp3.json", ""); rec.Code != http.StatusOK {
		t.Fatalf("expression file: %d", rec.Code)
	}
	if rec := do(t, h, token, http.MethodGet, "/api/libby/live2d/files/..%2Fmodel.enc", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("a name it was not stored under: %d", rec.Code)
	}
	rec = do(t, h, token, http.MethodPatch, "/api/libby/live2d", `{"moods":{"happy":["x","nope"],"bogus":["ku"]},"worn":["mz","ghost"],"scale":9}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body)
	}
	var tuned live2dSettings
	_ = json.Unmarshal(rec.Body.Bytes(), &tuned)
	if len(tuned.Moods) != 1 || tuned.Moods["happy"][0] != "x" || len(tuned.Worn) != 1 || tuned.Scale != 4 {
		t.Fatalf("tuned: %+v", tuned)
	}
	if rec := do(t, h, token, http.MethodDelete, "/api/libby/live2d", ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", rec.Code)
	}
	if rec := do(t, h, token, http.MethodGet, "/api/libby/live2d/files/model.model3.json", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("after delete: %d", rec.Code)
	}
}

func fakeCore() string {
	return "/**\n * Live2D Cubism Core\n * (C) 2019 Live2D Inc. All rights reserved.\n */\nvar Live2DCubismCore;" + strings.Repeat(" ", 60<<10)
}

func TestOnlyLive2DsOwnRuntimeIsKeptAndServedAsScript(t *testing.T) {
	s, token := newTestServer(t)
	h := s.Handler()
	if rec := do(t, h, token, http.MethodPost, "/api/libby/live2d/core", "alert(document.cookie)"+strings.Repeat(" ", 60<<10)); rec.Code != http.StatusBadRequest {
		t.Fatalf("any script was kept: %d", rec.Code)
	}
	if rec := do(t, h, token, http.MethodPost, "/api/libby/live2d/core", fakeCore()); rec.Code != http.StatusOK {
		t.Fatalf("core: %d %s", rec.Code, rec.Body)
	}
	rec := do(t, h, token, http.MethodGet, "/api/libby/live2d/core.js", "")
	if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "text/javascript") {
		t.Fatalf("served: %d %q", rec.Code, rec.Header().Get("Content-Type"))
	}
}

func TestTheRuntimeCanBeFetchedFromLive2D(t *testing.T) {
	cdn := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(fakeCore())) }))
	defer cdn.Close()
	old := live2dCoreSource
	live2dCoreSource = cdn.URL
	defer func() { live2dCoreSource = old }()
	s, token := newTestServer(t)
	if rec := do(t, s.Handler(), token, http.MethodPost, "/api/libby/live2d/core/fetch", ""); rec.Code != http.StatusOK {
		t.Fatalf("fetch: %d %s", rec.Code, rec.Body)
	}
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/libby/live2d", "")
	if !strings.Contains(rec.Body.String(), `"core":true`) {
		t.Fatalf("view: %s", rec.Body)
	}
}

// WebAssembly may be compiled; JavaScript may still not be evaluated.
func TestThePolicyAllowsWasmButNotEval(t *testing.T) {
	if !strings.Contains(contentSecurityPolicy, "'wasm-unsafe-eval'") {
		t.Fatal("Cubism Core cannot compile")
	}
	if strings.Contains(strings.ReplaceAll(contentSecurityPolicy, "'wasm-unsafe-eval'", ""), "unsafe-eval") {
		t.Fatal("the policy allows eval")
	}
}
