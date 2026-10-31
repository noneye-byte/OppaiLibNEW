package api

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"hash/crc32"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/thumbnail"
)

// Exporting the studio's gallery for Civitai, many at a time.
//
// Civitai reads how a picture was made off the picture itself: the A1111 "parameters"
// text in a PNG, which is how it links the model and LoRAs and fills in the prompt. A
// picture straight out of the gallery has none — A1111 is asked not to write it, and
// the record is kept apart, sealed — so the studio's one-at-a-time export writes it in
// the browser (web/src/png-metadata.ts). Doing that for a whole folder in the browser
// meant every picture held in the page's memory at once; here the server writes the
// archive as it reads each item, and the browser only saves the download.
//
// Every item gets its parameters three ways, because the readers differ: inside the
// file (a PNG's text chunks; a clip's comment tag, which ffmpeg writes when it is
// there), as a .txt beside it to paste into Civitai's form — which it needs for a
// clip, since it does not read a video's tags — and, losslessly, in metadata.json,
// every record in full.

// maxExportItems bounds one archive: a folder of a few thousand would be a download of
// gigabytes and an hour of reading.
const maxExportItems = 2000

type exportItem struct {
	name  string // the gallery name: own gallery's id, or InvokeAI's image name
	label string // the file's name in the archive, without its extension
	clip  bool
	mime  string
}

type exportManifestItem struct {
	File       string          `json:"file"`
	Kind       string          `json:"kind"`
	Parameters string          `json:"parameters"`
	Record     json.RawMessage `json:"record,omitempty"`
}

type exportSkipped struct {
	Name   string `json:"name"`
	Reason string `json:"reason"`
}

// handleGalleryExport answers GET /api/imagegen/gallery/export with a zip: of the
// pictures named in names (comma-separated), or of a whole board, narrowed by type.
// It is a GET so the browser can save it as a plain download, never held in the page.
func (s *Server) handleGalleryExport(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	q := r.URL.Query()
	ctx := r.Context()
	own := s.ownGallery(ctx, base)
	items, err := s.exportItems(ctx, base, own, q)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if len(items) == 0 {
		writeErr(w, http.StatusNotFound, "there is nothing there to export")
		return
	}
	hashes := s.exportHashes(ctx, base)

	stamp := time.Now()
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="oppailib-civitai-%s.zip"`, stamp.Format("20060102-1504")))
	w.Header().Set("Cache-Control", "no-store")
	zw := zip.NewWriter(w)
	manifest := struct {
		Exported string               `json:"exported"`
		Items    []exportManifestItem `json:"items"`
		Skipped  []exportSkipped      `json:"skipped,omitempty"`
	}{Exported: stamp.UTC().Format(time.RFC3339), Items: []exportManifestItem{}}
	used := map[string]bool{}
	for _, it := range items {
		if ctx.Err() != nil {
			return
		}
		data, raw, err := s.exportRead(ctx, base, own, it)
		if err != nil {
			manifest.Skipped = append(manifest.Skipped, exportSkipped{Name: it.label, Reason: err.Error()})
			continue
		}
		var rec genRecord
		if len(raw) > 0 {
			_ = json.Unmarshal(raw, &rec)
		}
		hashes.fill(&rec)
		if filled, err := json.Marshal(rec); err == nil && len(raw) > 0 {
			raw = filled
		}
		params := ""
		if len(raw) > 0 {
			params = genInfotext(rec)
		}
		ext := exportExt(data, it.mime)
		label := uniqueLabel(used, it.label)
		file := label + ext
		if params != "" {
			if it.clip {
				data = tagClip(ctx, data, ext, params)
			} else if tagged, ok := pngWithText(data, [][2]string{{"parameters", params}, {"oppailib", string(raw)}}); ok {
				data = tagged
			}
		}
		if err := zipPut(zw, file, data, stamp, false); err != nil {
			return
		}
		if params != "" {
			if err := zipPut(zw, label+".txt", []byte(params+"\n"), stamp, true); err != nil {
				return
			}
		}
		kind := "picture"
		if it.clip {
			kind = "clip"
		}
		manifest.Items = append(manifest.Items, exportManifestItem{File: file, Kind: kind, Parameters: params, Record: raw})
	}
	body, _ := json.MarshalIndent(manifest, "", "  ")
	if err := zipPut(zw, "metadata.json", body, stamp, true); err != nil {
		return
	}
	if err := zw.Close(); err != nil {
		s.log.Debug("gallery export", "err", err)
	}
}

// exportItems is what an export covers: the names asked for, or a board's contents.
func (s *Server) exportItems(ctx context.Context, base string, own bool, q map[string][]string) ([]exportItem, error) {
	get := func(k string) string {
		if v := q[k]; len(v) > 0 {
			return strings.TrimSpace(v[0])
		}
		return ""
	}
	var names []string
	for _, n := range strings.Split(get("names"), ",") {
		if n = strings.TrimSpace(n); n != "" {
			names = append(names, n)
		}
	}
	if len(names) > maxExportItems {
		return nil, fmt.Errorf("that is more than %d at once — export a folder at a time", maxExportItems)
	}
	if !own {
		if len(names) == 0 {
			// A page at a time: InvokeAI's own page size is not one to lean on.
			for len(names) < maxExportItems {
				page, err := s.imagegen.BoardImages(ctx, base, get("board"), "newest", len(names), 100)
				if err != nil {
					return nil, err
				}
				for _, img := range page.Items {
					names = append(names, img.Name)
				}
				if len(page.Items) < 100 || len(names) >= page.Total {
					break
				}
			}
		}
		out := make([]exportItem, 0, len(names))
		for _, n := range names {
			out = append(out, exportItem{name: n, label: strings.TrimSuffix(n, filepath.Ext(n))})
		}
		return out, nil
	}
	var rows []db.GenImage
	if len(names) > 0 {
		for _, n := range names {
			if g, err := s.genImageNamed(ctx, n); err == nil {
				rows = append(rows, g)
			}
		}
	} else {
		board := get("board")
		scope := db.GenScope{All: board == genGalleryAll || board == ""}
		if !scope.All && board != "none" {
			id, err := strconv.ParseInt(board, 10, 64)
			if err != nil || id <= 0 {
				return nil, fmt.Errorf("no such folder")
			}
			scope.FolderID = id
		}
		switch t := get("type"); t {
		case db.GenTypePictures, db.GenTypeUpscaled, db.GenTypeVideos:
			scope.Type = t
		}
		var err error
		rows, _, err = s.db.GenImages(ctx, scope, "oldest", 0, maxExportItems)
		if err != nil {
			return nil, err
		}
	}
	out := make([]exportItem, 0, len(rows))
	for _, g := range rows {
		it := exportItem{name: genImageName(g.ID), label: fmt.Sprintf("picture-%d", g.ID), clip: isClip(g), mime: g.MIME}
		if it.clip {
			it.label = fmt.Sprintf("clip-%d", g.ID)
		}
		if g.Upscaled {
			it.label += "-upscaled"
		}
		out = append(out, it)
	}
	return out, nil
}

// exportRead is one item's bytes and record.
func (s *Server) exportRead(ctx context.Context, base string, own bool, it exportItem) ([]byte, json.RawMessage, error) {
	if own {
		g, err := s.genImageNamed(ctx, it.name)
		if err != nil {
			return nil, nil, err
		}
		data, err := s.genImageBytes(g, false)
		if err != nil {
			return nil, nil, err
		}
		return data, s.genInfo(g), nil
	}
	data, _, err := s.imagegen.GalleryImage(ctx, base, it.name, false)
	if err != nil {
		return nil, nil, err
	}
	var raw json.RawMessage
	if meta, err := s.imagegen.GalleryImageMetadata(ctx, base, it.name); err == nil && meta != nil {
		raw, _ = json.Marshal(meta)
	}
	return data, raw, nil
}

// exportHashes is the generator's model and LoRA hashes by name, which Civitai links
// a picture's resources by: a record keeps the names it was made with, not hashes.
type exportHashes struct {
	models map[string]string
	loras  map[string]string
}

func (s *Server) exportHashes(ctx context.Context, base string) exportHashes {
	out := exportHashes{models: map[string]string{}, loras: map[string]string{}}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if models, err := s.imagegen.Models(ctx, base); err == nil {
		for _, m := range models {
			if m.Hash != "" {
				out.models[m.Title] = m.Hash
				if m.Name != "" {
					out.models[m.Name] = m.Hash
				}
			}
		}
	}
	if loras, err := s.imagegen.Loras(ctx, base); err == nil {
		for _, l := range loras {
			if l.Hash != "" {
				out.loras[l.Name] = l.Hash
			}
		}
	}
	return out
}

func (h exportHashes) fill(rec *genRecord) {
	if rec.ModelHash == "" && rec.Clip == nil {
		rec.ModelHash = h.models[rec.Model]
	}
	for i, l := range rec.Loras {
		if l.Hash == "" {
			rec.Loras[i].Hash = h.loras[l.Name]
		}
	}
}

// genInfotext writes a record in A1111's parameters format, as the web client's
// toInfotext (web/src/gen-info.ts) does — the two are kept saying the same thing.
// The shape is what readers parse by: the prompt, "Negative prompt: …" on its own
// line, then one line of comma-separated key: value pairs.
func genInfotext(rec genRecord) string {
	num := func(f float64) string { return strconv.FormatFloat(f, 'f', -1, 64) }
	// LoRAs travel as prompt tokens, which is what tells Civitai both the resource and
	// its strength; a prompt that already carries one keeps it as it is.
	var tokens []string
	for _, l := range rec.Loras {
		if !strings.Contains(rec.Prompt, "<lora:"+l.Name+":") {
			tokens = append(tokens, fmt.Sprintf("<lora:%s:%s>", l.Name, num(l.Weight)))
		}
	}
	prompt := rec.Prompt
	if len(tokens) > 0 {
		prompt = strings.TrimSpace(prompt + " " + strings.Join(tokens, " "))
	}
	lines := []string{prompt}
	if rec.NegativePrompt != "" {
		lines = append(lines, "Negative prompt: "+rec.NegativePrompt)
	}
	sampler := rec.Sampler
	if sampler == "" {
		sampler = "default"
	}
	kv := []string{
		fmt.Sprintf("Steps: %d", rec.Steps),
		"Sampler: " + sampler,
		"CFG scale: " + num(rec.CfgScale),
		fmt.Sprintf("Seed: %d", rec.Seed),
		fmt.Sprintf("Size: %dx%d", rec.Width, rec.Height),
	}
	add := func(cond bool, s string) {
		if cond {
			kv = append(kv, s)
		}
	}
	add(rec.Model != "", "Model: "+rec.Model)
	add(rec.ModelHash != "", "Model hash: "+rec.ModelHash)
	add(rec.VAE != "", "VAE: "+rec.VAE)
	add(rec.ClipSkip > 0, fmt.Sprintf("Clip skip: %d", rec.ClipSkip))
	add(rec.CfgRescale > 0, "CFG Rescale: "+num(rec.CfgRescale))
	var hashed []string
	for _, l := range rec.Loras {
		if l.Hash != "" {
			hashed = append(hashed, l.Name+": "+l.Hash)
		}
	}
	add(len(hashed) > 0, `Lora hashes: "`+strings.Join(hashed, ", ")+`"`)
	if rec.SeamlessX || rec.SeamlessY {
		var axes []string
		if rec.SeamlessX {
			axes = append(axes, "x")
		}
		if rec.SeamlessY {
			axes = append(axes, "y")
		}
		kv = append(kv, "Seamless: "+strings.Join(axes, "+"))
	}
	if c := rec.Clip; c != nil {
		// A clip's own numbers, under names a reader that knows Wan can use.
		add(c.Frames > 0, fmt.Sprintf("Frames: %d", c.Frames))
		add(c.FPS > 0, fmt.Sprintf("FPS: %d", c.FPS))
		add(c.Shift > 0, "Shift: "+num(c.Shift))
		add(c.Scheduler != "", "Schedule type: "+c.Scheduler)
		add(c.LowModel != "", "Low noise model: "+c.LowModel)
		add(c.TextEncoder != "", "Text encoder: "+c.TextEncoder)
		add(c.From != "", "Video from: "+c.From)
		add(c.Loop, "Loop: true")
	} else {
		add(rec.VAEPrecision != "", "VAE precision: "+rec.VAEPrecision)
		add(!rec.CPUNoise, "Noise device: gpu")
	}
	if h := rec.Hires; h != nil {
		kv = append(kv, "Hires upscale: "+num(h.Scale))
		add(h.Steps > 0, fmt.Sprintf("Hires steps: %d", h.Steps))
		kv = append(kv, "Hires upscaler: "+h.Upscaler)
		add(h.Denoise > 0 && rec.Denoise == 0, "Denoising strength: "+num(h.Denoise))
	}
	if u := rec.Upscaled; u != nil {
		kv = append(kv, fmt.Sprintf("Upscaled: %sx with %s", num(u.Scale), u.Upscaler))
	}
	if d := rec.Refiner; d != nil {
		kv = append(kv, "ADetailer model: "+d.Model)
		for i, m := range d.Models {
			if i > 0 {
				kv = append(kv, fmt.Sprintf("ADetailer model %s: %s", ordinal(i+1), m))
			}
		}
		kv = append(kv, "ADetailer confidence: "+num(d.Confidence), "ADetailer denoising strength: "+num(d.Denoise),
			fmt.Sprintf("ADetailer mask blur: %d", d.MaskBlur))
		add(d.Prompt != "", "ADetailer prompt: "+d.Prompt)
		add(d.NegativePrompt != "", "ADetailer negative prompt: "+d.NegativePrompt)
	}
	add(len(rec.Triggers) > 0, "Trigger phrases: "+strings.Join(rec.Triggers, " "))
	add(len(rec.Characters) > 0, "Characters: "+strings.Join(rec.Characters, ", "))
	add(rec.Denoise > 0, "Denoising strength: "+num(rec.Denoise))
	if f := rec.StartedFrom; f != nil {
		kv = append(kv, fmt.Sprintf("Started from: %s (%s)", f.Name, f.Mode))
	}
	add(rec.Backend != "", "Backend: "+rec.Backend)
	lines = append(lines, strings.Join(kv, ", "))
	return strings.Join(lines, "\n")
}

// ordinal is ADetailer's name for its later tabs: "ADetailer model 2nd".
func ordinal(n int) string {
	switch n {
	case 2:
		return "2nd"
	case 3:
		return "3rd"
	}
	return fmt.Sprintf("%dth", n)
}

// exportExt is the extension a file is saved under, by its first bytes.
func exportExt(data []byte, mime string) string {
	ct := mime
	if ct == "" {
		ct = http.DetectContentType(data)
	}
	switch {
	case strings.HasPrefix(ct, "image/png"):
		return ".png"
	case strings.HasPrefix(ct, "image/jpeg"):
		return ".jpg"
	case strings.HasPrefix(ct, "image/webp"):
		return ".webp"
	case strings.HasPrefix(ct, "image/gif"):
		return ".gif"
	case strings.HasPrefix(ct, "video/webm"):
		return ".webm"
	case strings.HasPrefix(ct, "video/quicktime"):
		return ".mov"
	case strings.HasPrefix(ct, "video/"):
		return ".mp4"
	}
	return ".bin"
}

func uniqueLabel(used map[string]bool, label string) string {
	if label == "" {
		label = "item"
	}
	label = strings.NewReplacer("/", "_", "\\", "_").Replace(label)
	out := label
	for i := 2; used[strings.ToLower(out)]; i++ {
		out = fmt.Sprintf("%s-%d", label, i)
	}
	used[strings.ToLower(out)] = true
	return out
}

// zipPut writes one file into the archive: stored when it is already compressed (a
// picture, a clip), deflated when it is text.
func zipPut(zw *zip.Writer, name string, data []byte, at time.Time, deflate bool) error {
	method := zip.Store
	if deflate {
		method = zip.Deflate
	}
	f, err := zw.CreateHeader(&zip.FileHeader{Name: name, Method: method, Modified: at})
	if err != nil {
		return err
	}
	_, err = f.Write(data)
	return err
}

var pngSignature = []byte{137, 80, 78, 71, 13, 10, 26, 10}

// pngWithText is the PNG with these text fields written before its end, replacing any
// of the same keyword already there: two "parameters" are read differently by
// different readers. ok is false for anything that is not a whole PNG, which is left
// as it is. The Go twin of embedGenerationMetadata in web/src/png-metadata.ts.
func pngWithText(data []byte, fields [][2]string) ([]byte, bool) {
	if len(data) < 20 || !bytes.Equal(data[:8], pngSignature) {
		return nil, false
	}
	replaced := map[string]bool{}
	for _, f := range fields {
		replaced[f[0]] = true
	}
	var out bytes.Buffer
	out.Write(pngSignature)
	at := 8
	for at+12 <= len(data) {
		n := int(binary.BigEndian.Uint32(data[at:]))
		end := at + 12 + n
		if n < 0 || end > len(data) {
			return nil, false
		}
		kind := string(data[at+4 : at+8])
		if kind == "IEND" {
			for _, f := range fields {
				writePNGText(&out, f[0], f[1])
			}
			out.Write(data[at:end])
			return out.Bytes(), true
		}
		if kind == "tEXt" || kind == "iTXt" {
			body := data[at+8 : at+8+n]
			if i := bytes.IndexByte(body, 0); i >= 0 && replaced[string(body[:i])] {
				at = end
				continue
			}
		}
		out.Write(data[at:end])
		at = end
	}
	return nil, false
}

// writePNGText writes one text chunk: tEXt for Latin-1 text, iTXt (uncompressed,
// UTF-8) for anything else — a prompt with an emoji or Wan's Chinese negative.
func writePNGText(out *bytes.Buffer, keyword, text string) {
	var body []byte
	kind := "tEXt"
	latin1 := true
	for _, r := range text {
		if r > 255 {
			latin1 = false
			break
		}
	}
	body = append(body, keyword...)
	body = append(body, 0)
	if latin1 {
		for _, r := range text {
			body = append(body, byte(r))
		}
	} else {
		kind = "iTXt"
		// Compression flag and method, then an empty language tag and translated keyword.
		body = append(body, 0, 0, 0, 0)
		body = append(body, text...)
	}
	var head [8]byte
	binary.BigEndian.PutUint32(head[:4], uint32(len(body)))
	copy(head[4:], kind)
	out.Write(head[:])
	out.Write(body)
	crc := crc32.NewIEEE()
	crc.Write([]byte(kind))
	crc.Write(body)
	var sum [4]byte
	binary.BigEndian.PutUint32(sum[:], crc.Sum32())
	out.Write(sum[:])
}

// tagClip is the clip with its parameters in its comment and description tags, which
// ffmpeg copies in without touching a frame. Without ffmpeg, or with a clip it cannot
// read, it is the clip as it was: the .txt beside it carries the same words.
func tagClip(ctx context.Context, data []byte, ext, params string) []byte {
	if !thumbnail.Available() || (ext != ".mp4" && ext != ".webm" && ext != ".mov") {
		return data
	}
	dir, err := os.MkdirTemp("", "oppai-export-*")
	if err != nil {
		return data
	}
	defer os.RemoveAll(dir)
	in, out := filepath.Join(dir, "in"+ext), filepath.Join(dir, "out"+ext)
	if os.WriteFile(in, data, 0o600) != nil {
		return data
	}
	ctx, cancel := context.WithTimeout(ctx, time.Minute)
	defer cancel()
	args := []string{"-v", "error", "-y", "-i", in, "-map", "0", "-c", "copy", "-map_metadata", "0",
		"-metadata", "comment=" + params, "-metadata", "description=" + params}
	if ext != ".webm" {
		args = append(args, "-movflags", "+faststart")
	}
	if err := exec.CommandContext(ctx, "ffmpeg", append(args, out)...).Run(); err != nil {
		return data
	}
	tagged, err := os.ReadFile(out)
	if err != nil || len(tagged) == 0 {
		return data
	}
	return tagged
}
