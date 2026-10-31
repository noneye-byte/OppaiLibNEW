package api

import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/youruser/oppailib/internal/imagegen"
)

// pngTexts reads a PNG's text chunks, keyword to text.
func pngTexts(t *testing.T, data []byte) map[string]string {
	t.Helper()
	if !bytes.Equal(data[:8], pngSignature) {
		t.Fatal("not a PNG")
	}
	out := map[string]string{}
	for at := 8; at+12 <= len(data); {
		n := int(binary.BigEndian.Uint32(data[at:]))
		kind, body := string(data[at+4:at+8]), data[at+8:at+8+n]
		if kind == "tEXt" || kind == "iTXt" {
			i := bytes.IndexByte(body, 0)
			text := body[i+1:]
			if kind == "iTXt" {
				text = text[4:]
			}
			if _, dup := out[string(body[:i])]; dup {
				t.Fatalf("two %q chunks", body[:i])
			}
			out[string(body[:i])] = string(text)
		}
		at += 12 + n
	}
	return out
}

func galleryRecordOf(t *testing.T, s *Server, token, name string) genRecord {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/image/"+name+"/metadata", "")
	var out genRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("metadata: %d %s", rec.Code, rec.Body)
	}
	return out
}

func galleryNames(t *testing.T, s *Server, token, query string) []string {
	t.Helper()
	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/images?"+query, "")
	var page galleryPageOut
	_ = json.Unmarshal(rec.Body.Bytes(), &page)
	names := []string{}
	for _, it := range page.Items {
		names = append(names, it.Name)
	}
	return names
}

func TestAnUpscaleKeepsThePromptAndSettingsOfThePictureItEnlarged(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, &galleryA1111{}).URL)

	from := generateOn(t, s, token, `{"prompt":"a red fox in snow","negativePrompt":"blurry","checkpoint":"rev.safetensors [abc123]",
		"steps":12,"cfgScale":6,"seed":-1,"loras":[{"name":"fur","weight":0.7}]}`).Images[0].Gallery
	// The studio sends what its form says, which is nothing to do with the picture.
	up := generateOn(t, s, token, fmt.Sprintf(`{"prompt":"","initGallery":%q,"upscaleOnly":true,
		"upscale":{"upscaler":"4x-UltraSharp","scale":2}}`, from)).Images[0].Gallery

	rec := galleryRecordOf(t, s, token, up)
	if rec.Prompt != "a red fox in snow" || rec.NegativePrompt != "blurry" || rec.Model != "rev.safetensors [abc123]" ||
		rec.Steps != 12 || rec.CfgScale != 6 || rec.Seed != 4242 || len(rec.Loras) != 1 || rec.Loras[0].Name != "fur" {
		t.Fatalf("the upscale lost how the picture was made: %+v", rec)
	}
	if rec.Width != 128 || rec.Height != 192 || rec.Upscaled == nil || rec.Upscaled.Upscaler != "4x-UltraSharp" ||
		rec.Upscaled.Scale != 2 || rec.StartedFrom == nil || rec.StartedFrom.Mode != "upscale" {
		t.Fatalf("the upscale itself is not recorded: %+v", rec)
	}

	// Enlarged again, it is enlarged by the product of the two.
	again := generateOn(t, s, token, fmt.Sprintf(`{"initGallery":%q,"upscaleOnly":true,"upscale":{"upscaler":"Lanczos","scale":2}}`, up)).Images[0].Gallery
	if r := galleryRecordOf(t, s, token, again); r.Prompt != "a red fox in snow" || r.Upscaled.Scale != 4 {
		t.Fatalf("twice enlarged: %+v", r.Upscaled)
	}
}

func TestTheGalleryListsPicturesUpscalesAndClipsApart(t *testing.T) {
	s, token, _, _ := clipStudio(t)
	picture := generateOn(t, s, token, `{"prompt":"a face"}`).Images[0].Gallery
	upscaled := generateOn(t, s, token, fmt.Sprintf(`{"initGallery":%q,"upscaleOnly":true,"upscale":{"scale":2}}`, picture)).Images[0].Gallery
	clip := animate(t, s, token).Clip.Gallery

	for query, want := range map[string][]string{
		"board=all":               {clip, upscaled, picture},
		"board=all&type=pictures": {picture},
		"board=all&type=upscaled": {upscaled},
		"board=all&type=videos":   {clip},
		"board=none&type=videos":  {clip},
		"board=all&type=nonsense": {clip, upscaled, picture},
	} {
		if got := galleryNames(t, s, token, query); strings.Join(got, ",") != strings.Join(want, ",") {
			t.Errorf("%s = %v, want %v", query, got, want)
		}
	}
}

func TestItemsKeptBeforeTheTypeFilterAreSortedOutAtStart(t *testing.T) {
	s, token := newTestServer(t)
	enableImageGen(t, s, newGalleryA1111(t, &galleryA1111{}).URL)
	picture := generateOn(t, s, token, `{"prompt":"a face"}`).Images[0].Gallery
	upscaled := generateOn(t, s, token, fmt.Sprintf(`{"initGallery":%q,"upscaleOnly":true,"upscale":{"scale":2}}`, picture)).Images[0].Gallery
	// As a database from before the column has them.
	if _, err := s.db.SQL().Exec(`UPDATE gen_images SET upscaled = NULL`); err != nil {
		t.Fatal(err)
	}
	s.backfillGenUpscaled()
	if got := galleryNames(t, s, token, "board=all&type=upscaled"); len(got) != 1 || got[0] != upscaled {
		t.Fatalf("upscaled = %v", got)
	}
	if got := galleryNames(t, s, token, "board=all&type=pictures"); len(got) != 1 || got[0] != picture {
		t.Fatalf("pictures = %v", got)
	}
}

func readZip(t *testing.T, body []byte) map[string][]byte {
	t.Helper()
	zr, err := zip.NewReader(bytes.NewReader(body), int64(len(body)))
	if err != nil {
		t.Fatalf("not a zip: %v", err)
	}
	out := map[string][]byte{}
	for _, f := range zr.File {
		rc, _ := f.Open()
		out[f.Name], _ = io.ReadAll(rc)
		rc.Close()
	}
	return out
}

func TestAnExportCarriesEachItemsParametersInsideItBesideItAndInTheManifest(t *testing.T) {
	s, token, _, _ := clipStudio(t)
	picture := generateOn(t, s, token, `{"prompt":"a red fox in snow","negativePrompt":"blurry","checkpoint":"rev.safetensors [abc123]",
		"steps":12,"loras":[{"name":"fur","weight":0.7}]}`).Images[0].Gallery
	clip := animate(t, s, token).Clip.Gallery

	rec := do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/export?names="+picture+","+clip, "")
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "application/zip" ||
		!strings.Contains(rec.Header().Get("Content-Disposition"), "attachment") {
		t.Fatalf("export: %d %v", rec.Code, rec.Header())
	}
	files := readZip(t, rec.Body.Bytes())
	png := files["picture-"+picture+".png"]
	if png == nil {
		t.Fatalf("files: %v", keysOf(files))
	}
	texts := pngTexts(t, png)
	params := texts["parameters"]
	// The prompt with its LoRA as a token, and the checkpoint's hash for Civitai to
	// link it by — the record names the model, the generator knows its hash.
	if !strings.HasPrefix(params, "a red fox in snow <lora:fur:0.7>\nNegative prompt: blurry\nSteps: 12,") ||
		!strings.Contains(params, "Model: rev.safetensors [abc123]") || !strings.Contains(params, "Model hash: abc123") {
		t.Fatalf("parameters = %q", params)
	}
	var lossless genRecord
	if json.Unmarshal([]byte(texts["oppailib"]), &lossless) != nil || lossless.Prompt != "a red fox in snow" {
		t.Fatalf("oppailib = %q", texts["oppailib"])
	}
	if string(files["picture-"+picture+".txt"]) != params+"\n" {
		t.Fatalf("the .txt beside it says %q", files["picture-"+picture+".txt"])
	}
	// A clip's parameters are beside it, which is where Civitai's form is filled from.
	if files["clip-"+clip+".mp4"] == nil || !strings.HasPrefix(string(files["clip-"+clip+".txt"]), "she waves <lora:") ||
		!strings.Contains(string(files["clip-"+clip+".txt"]), "Video from: image") {
		t.Fatalf("clip files: %v, txt %q", keysOf(files), files["clip-"+clip+".txt"])
	}
	var manifest struct {
		Items []exportManifestItem `json:"items"`
	}
	if json.Unmarshal(files["metadata.json"], &manifest) != nil || len(manifest.Items) != 2 ||
		manifest.Items[1].Kind != "clip" || len(manifest.Items[1].Record) == 0 {
		t.Fatalf("metadata.json = %s", files["metadata.json"])
	}

	// A whole board, narrowed to its clips.
	board := readZip(t, do(t, s.Handler(), token, http.MethodGet, "/api/imagegen/gallery/export?board=none&type=videos", "").Body.Bytes())
	if board["clip-"+clip+".mp4"] == nil || board["picture-"+picture+".png"] != nil {
		t.Fatalf("board export: %v", keysOf(board))
	}
}

func keysOf(m map[string][]byte) []string {
	var out []string
	for k := range m {
		out = append(out, k)
	}
	return out
}

func TestPNGTextReplacesTheFieldsAlreadyThereAndCarriesAnyScript(t *testing.T) {
	pic := pngOf(t, 4, 4, 1)
	once, ok := pngWithText(pic, [][2]string{{"parameters", "old"}})
	if !ok {
		t.Fatal("a PNG was not written to")
	}
	twice, _ := pngWithText(once, [][2]string{{"parameters", "少女, smiling"}, {"oppailib", "{}"}})
	texts := pngTexts(t, twice)
	if texts["parameters"] != "少女, smiling" || texts["oppailib"] != "{}" {
		t.Fatalf("texts = %q", texts)
	}
	if _, ok := pngWithText([]byte("GIF89a not a png at all"), nil); ok {
		t.Fatal("a GIF was taken for a PNG")
	}
}

func TestInfotextSaysWhatAClipAndAHiresPictureWereMadeWith(t *testing.T) {
	pic := genInfotext(genRecord{
		Prompt: "a fox <lora:fur:0.7>", Model: "rev", ModelHash: "abc123", Sampler: "Euler a", Steps: 20, CfgScale: 7, Seed: 5,
		Width: 512, Height: 768, VAEPrecision: "fp32", CPUNoise: true, Backend: "a1111",
		Loras: []imagegen.ImageMetadataLora{{Name: "fur", Weight: 0.7, Hash: "f00d"}, {Name: "ink", Weight: -0.5}},
		Hires: &genRecordUpscale{Upscaler: "Latent", Scale: 1.5, Denoise: 0.45, Steps: 10},
	})
	want := "a fox <lora:fur:0.7> <lora:ink:-0.5>\n" +
		"Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 5, Size: 512x768, Model: rev, Model hash: abc123, " +
		`Lora hashes: "fur: f00d", VAE precision: fp32, Hires upscale: 1.5, Hires steps: 10, Hires upscaler: Latent, ` +
		"Denoising strength: 0.45, Backend: a1111"
	if pic != want {
		t.Fatalf("picture:\n%s\nwant\n%s", pic, want)
	}
	clip := genInfotext(genRecord{Prompt: "she waves", Steps: 4, CfgScale: 1, Sampler: "euler", Width: 480, Height: 832, Backend: "comfyui",
		Clip: &genRecordClip{From: "image", Frames: 81, FPS: 16, Shift: 8, Scheduler: "simple", LowModel: "low.safetensors", Loop: true}})
	if !strings.Contains(clip, "Frames: 81, FPS: 16, Shift: 8, Schedule type: simple, Low noise model: low.safetensors, Video from: image, Loop: true") ||
		strings.Contains(clip, "Noise device") {
		t.Fatalf("clip: %s", clip)
	}
}
