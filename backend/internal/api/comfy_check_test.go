package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/youruser/oppailib/internal/settings"
)

// fakeComfyLists answers the calls the Test makes: what it runs on, its queue, and
// each node's entry, listing files for the loaders and nothing for unknown nodes.
func fakeComfyLists(t *testing.T) *httptest.Server {
	t.Helper()
	lists := map[string]string{
		"UNETLoader":          `"unet_name": [["wan_high.safetensors", "wan_low.safetensors"]]`,
		"CLIPLoader":          `"clip_name": [["umt5.safetensors"]]`,
		"VAELoader":           `"vae_name": [["wan_2.1_vae.safetensors"]]`,
		"LoraLoaderModelOnly": `"lora_name": [["motion/bounce_high.safetensors"]]`,
	}
	present := map[string]bool{"WanImageToVideo": true, "ModelSamplingSD3": true, "CreateVideo": true, "SaveVideo": true, "LoadImage": true}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /system_stats", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"system":{"comfyui_version":"0.3.62"},"devices":[{"name":"cuda:0 NVIDIA GeForce RTX 4090 : cudaMallocAsync","vram_total":25769803776,"vram_free":21474836480}]}`)
	})
	mux.HandleFunc("GET /queue", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"queue_running":[[1]],"queue_pending":[[2],[3]]}`)
	})
	mux.HandleFunc("GET /object_info/{class}", func(w http.ResponseWriter, r *http.Request) {
		class := r.PathValue("class")
		if l, ok := lists[class]; ok {
			fmt.Fprintf(w, `{%q: {"input": {"required": {%s}}}}`, class, l)
			return
		}
		if present[class] {
			fmt.Fprintf(w, `{%q: {"input": {"required": {}}}}`, class)
			return
		}
		_, _ = io.WriteString(w, `{}`)
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func checksByID(checks []genCheck) map[string]genCheck {
	out := map[string]genCheck{}
	for _, c := range checks {
		out[c.ID] = c
	}
	return out
}

func TestTheComfyTestSaysWhichLinkIsBroken(t *testing.T) {
	comfy := fakeComfyLists(t)
	s, _ := newTestServer(t)
	root := t.TempDir()
	loras, vaes := filepath.Join(root, "loras"), filepath.Join(root, "vae")
	for _, f := range []string{filepath.Join(loras, "motion", "bounce_high.safetensors"), filepath.Join(vaes, "someone_elses.safetensors")} {
		if err := os.MkdirAll(filepath.Dir(f), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(f, []byte("w"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	cur := s.settings.Get()
	cur.LibbyClipURL = comfy.URL
	cur.ClipImageModels = settings.ClipModels{Model: "wan_high.safetensors", LowModel: "wan_low.safetensors", TextEncoder: "umt5.safetensors",
		VAE: "wan_2.1_vae.safetensors", Loras: []settings.ClipLora{{Name: "motion/bounce_high.safetensors", Weight: 1}, {Name: "deleted.safetensors", Weight: 1}}}
	cur.ClipTextWorkflow = `{"nodes": [{"id": 1, "type": "KSampler"}], "links": []}`
	cur.ComfyLoraDir, cur.ComfyVaeDir = loras, vaes
	cur.ComfyDiffusionDir, cur.ComfyCheckpointDir = "", filepath.Join(root, "typo")
	s.settings.Set(cur)

	got := checksByID(s.comfyChecks(context.Background()))
	for _, c := range []struct {
		id     string
		ok     bool
		saying string
	}{
		{"comfy", true, "ComfyUI 0.3.62 at " + comfy.URL + ", on NVIDIA GeForce RTX 4090 — 20.0 of 24.0 GB free."},
		{"queue", true, "2 more waiting"},
		{"image", false, "deleted.safetensors (a LoRA)"},
		{"text", false, "not the API export"},
		{"folder-diffusion_models", true, "Not set"},
		{"folder-checkpoints", false, "does not exist"},
		{"folder-loras", true, "The one file in"},
		{"folder-vae", false, "someone_elses.safetensors, is not among the VAEs"},
	} {
		g, ok := got[c.id]
		if !ok || g.OK != c.ok || !strings.Contains(g.Detail, c.saying) {
			t.Errorf("%s = %+v; want ok=%v saying %q", c.id, g, c.ok, c.saying)
		}
	}

	// Once the LoRA is dropped and words get a real API export, both directions pass.
	cur.ClipImageModels.Loras = cur.ClipImageModels.Loras[:1]
	cur.ClipTextWorkflow = `{"1": {"class_type": "LoadImage", "inputs": {}}, "2": {"class_type": "SaveVideo", "inputs": {"text": "{{prompt}}"}}}`
	s.settings.Set(cur)
	got = checksByID(s.comfyChecks(context.Background()))
	if !got["image"].OK || !strings.Contains(got["image"].Detail, "high- and low-noise pair") {
		t.Errorf("image = %+v", got["image"])
	}
	if !got["text"].OK || !strings.Contains(got["text"].Detail, `no "{{seed}}"`) {
		t.Errorf("text = %+v", got["text"])
	}
	cur.ClipTextWorkflow = `{"1": {"class_type": "WanVideoSampler", "inputs": {}}}`
	s.settings.Set(cur)
	if c := checksByID(s.comfyChecks(context.Background()))["text"]; c.OK || !strings.Contains(c.Detail, "WanVideoSampler") {
		t.Errorf("a workflow with a node ComfyUI lacks = %+v", c)
	}
}

func TestTheComfyTestStillLooksAtTheFoldersWhenComfyIsDown(t *testing.T) {
	s, _ := newTestServer(t)
	dead := httptest.NewServer(http.NotFoundHandler())
	dead.Close()
	cur := s.settings.Get()
	cur.LibbyClipURL = dead.URL
	cur.ComfyLoraDir = t.TempDir()
	s.settings.Set(cur)
	got := checksByID(s.comfyChecks(context.Background()))
	if c := got["comfy"]; c.OK || !strings.Contains(c.Detail, "refused the connection") {
		t.Errorf("comfy = %+v", c)
	}
	if _, ok := got["image"]; ok {
		t.Error("the files were judged without ComfyUI's lists")
	}
	if c := got["folder-loras"]; !c.OK || !strings.Contains(c.Detail, "is empty") {
		t.Errorf("folder-loras = %+v", c)
	}
}

func TestAnUnreachableComfyIsExplainedByHowItFailed(t *testing.T) {
	s, _ := newTestServer(t)
	orig := comfyReachWait
	t.Cleanup(func() { comfyReachWait = orig })
	comfyReachWait = 300 * time.Millisecond

	closed := httptest.NewServer(http.NotFoundHandler())
	closed.Close()
	notComfy := httptest.NewServer(http.NotFoundHandler())
	t.Cleanup(notComfy.Close)
	// Accepts the connection and never answers, as a request a firewall drops looks.
	silent, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { silent.Close() })
	go func() {
		for {
			c, err := silent.Accept()
			if err != nil {
				return
			}
			t.Cleanup(func() { c.Close() })
		}
	}()

	for _, c := range []struct{ base, saying string }{
		{closed.URL, "refused the connection"},
		{notComfy.URL, "not as ComfyUI does"},
		{"http://" + silent.Addr().String(), "dropping the connection"},
	} {
		_, err := s.comfyReach(context.Background(), c.base)
		if err == nil {
			t.Fatalf("%s answered", c.base)
		}
		if got := comfyUnreachable(c.base, err); !strings.Contains(got, c.saying) {
			t.Errorf("%s: %v → %q; want it to say %q", c.base, err, got, c.saying)
		}
	}
	if got := comfyUnreachable("http://localhost:8188", errors.New("connect: connection refused")); !strings.Contains(got, "OppaiLib's own container") {
		t.Errorf("localhost → %q", got)
	}
}
