package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"path"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
)

// Naming LoRAs and ADetailer's detectors after what they are.
//
// A file from Civitai is named whatever its uploader called it. A picker of two
// hundred LoRAs read "makima_v2-000014", "pony_lora_final", "char_v1" twice over;
// ADetailer's list was "adetailerAfterDetailer_v10.pt" for a feet model and a lips
// model both. The catalogue knows what each one is, so a name is made from that —
// "Makima Chainsaw Man - Pony v2", "feet_yolov8s.pt" — for an install as it arrives,
// and on asking for the ones already there (found by link or by hash, as the LoRA
// sorter finds them). A1111 names a model by its file, so naming one is renaming its
// file (imagegen/a1111_rename.go); what was kept under the old name moves with it.

// loraNoise are words a LoRA's catalogue name carries that say nothing about it.
var loraNoise = map[string]bool{
	"lora": true, "loras": true, "locon": true, "lycoris": true, "lyco": true, "dora": true, "lokr": true, "loha": true,
}

// baseWords are the model families a name is tagged with; a bracketed group of
// nothing else ("[Pony/SDXL]") is dropped from a name, since the version says it.
var baseWords = map[string]bool{
	"sd": true, "sd1": true, "sd1.5": true, "sd15": true, "1.5": true, "sdxl": true, "xl": true, "pony": true,
	"ponyxl": true, "illustrious": true, "il": true, "noobai": true, "noob": true, "flux": true, "flux.1": true,
	"sd3": true, "sd3.5": true, "nai": true,
}

var (
	bracketGroup  = regexp.MustCompile(`[\(\[\{]([^\)\]\}]*)[\)\]\}]`)
	firstVersion  = regexp.MustCompile(`(?i)^v?\s*1(\.0+)?$`)
	wordSplit     = regexp.MustCompile(`[\s_\-/|,+&]+`)
	yoloVariant   = regexp.MustCompile(`(?i)yolo(?:v\d+|\d+)[nsmlx]?`)
	segWord       = regexp.MustCompile(`(?i)(^|[^a-z])seg(ment\w*)?([^a-z]|$)`)
	detectorNoise = regexp.MustCompile(`^(yolo\w*|v\d+(\.\d+)*|\d+(\.\d+)*|seg|segm|segment\w*|bbox)$`)
)

var detectorNoiseWords = map[string]bool{
	"adetailer": true, "after": true, "detailer": true, "afterdetailer": true, "detection": true, "detector": true,
	"detectors": true, "detect": true, "model": true, "models": true, "for": true, "a1111": true, "webui": true,
	"ultralytics": true, "the": true, "and": true, "pt": true, "by": true,
}

// dropBaseGroups takes out bracketed groups that only name model families.
func dropBaseGroups(name string) string {
	return bracketGroup.ReplaceAllStringFunc(name, func(g string) string {
		inner := bracketGroup.FindStringSubmatch(g)[1]
		words := wordSplit.Split(strings.ToLower(strings.TrimSpace(inner)), -1)
		for _, w := range words {
			if w != "" && !baseWords[w] && !loraNoise[w] {
				return " " + inner + " "
			}
		}
		return " "
	})
}

// dropWords takes the words in noise out of a name, keeping its other words as written.
func dropWords(name string, noise map[string]bool) string {
	fields := strings.Fields(name)
	out := fields[:0]
	for _, f := range fields {
		if !noise[strings.ToLower(strings.Trim(f, ".-_"))] {
			out = append(out, f)
		}
	}
	return strings.Join(out, " ")
}

// loraNameFor is the name a LoRA is given from its catalogue model and version:
// "Makima (Chainsaw Man) | LoRA [Pony]", version "Pony v2" → "Makima Chainsaw Man -
// Pony v2". The first version's "v1.0" is left off, and a version the model's name
// already says is not said twice.
func loraNameFor(model, version string) string {
	m := imagegen.CleanModelName(dropWords(imagegen.CleanModelName(dropBaseGroups(model)), loraNoise))
	if m == "" {
		return ""
	}
	v := imagegen.CleanModelName(dropWords(imagegen.CleanModelName(version), loraNoise))
	if v == "" || firstVersion.MatchString(v) || strings.Contains(strings.ToLower(m), strings.ToLower(v)) {
		return m
	}
	return imagegen.CleanModelName(m + " - " + v)
}

// detectorNameFor is the file name a detector is given, in ADetailer's own style:
// what it finds, then the YOLO it is ("face_yolov8n.pt", "nipples_yolov8s-seg.pt").
// The words come from the catalogue's name, or from the file's own when the version
// is a set of several (each file finds something different and the set's name says
// none of them). "-world" is kept: ADetailer reads it off the name to load a
// YOLO-World model.
func detectorNameFor(model, version, file string, fromSet bool) string {
	stemOf := strings.TrimSuffix(file, path.Ext(file))
	source := model
	if fromSet || model == "" {
		source = stemOf
	}
	var words []string
	for _, w := range wordSplit.Split(strings.ToLower(imagegen.CleanModelName(dropBaseGroups(source))), -1) {
		w = strings.Trim(w, ".")
		if w == "" || detectorNoiseWords[w] || detectorNoise.MatchString(w) || yoloVariant.MatchString(w) {
			continue
		}
		words = append(words, w)
	}
	name := strings.Join(words, "_")
	if len(name) > 40 {
		name = strings.TrimRight(name[:40], "_")
	}
	if name == "" {
		return ""
	}
	variant := ""
	for _, s := range []string{stemOf, version, model} {
		if variant = strings.ToLower(yoloVariant.FindString(s)); variant != "" {
			name += "_" + variant
			break
		}
	}
	for _, s := range []string{stemOf, version, model} {
		if segWord.MatchString(s) {
			if variant != "" {
				name += "-seg" // as ADetailer's own: person_yolov8n-seg.pt
			} else {
				name += "_seg"
			}
			break
		}
	}
	if strings.Contains(strings.ToLower(stemOf), "-world") {
		name += "-world"
	}
	return name + ".pt"
}

// civitaiVersionName is the name of one of a model's versions, "" when it has none.
func civitaiVersionName(m *civitaiRawModel, versionID int64) string {
	for _, v := range m.ModelVersions {
		if v.ID == versionID {
			return v.Name
		}
	}
	return ""
}

// ── asking for names ────────────────────────────────────────────────────────

// nameSuggestion is the name the catalogue gives one LoRA or detector.
type nameSuggestion struct {
	Name string `json:"name"`
	// To is the suggested name, "" when there is none.
	To      string `json:"to,omitempty"`
	Civitai string `json:"civitai,omitempty"`
	// Outcome: named | same (already called that) | unknown | unhashed | error.
	Outcome string `json:"outcome"`
	Error   string `json:"error,omitempty"`
}

type nameSuggestReq struct {
	// Kind is "lora" or "detector".
	Kind  string   `json:"kind"`
	Names []string `json:"names"`
}

// nameBatch caps one request, as the LoRA sorter's does: each name is up to two
// catalogue calls, and the client asks in batches so it can say how far it has got.
const nameBatch = 24

// handleNameSuggest asks the catalogue what each LoRA or detector is and says what
// it would be called. Nothing is renamed; the studio shows the list first.
func (s *Server) handleNameSuggest(w http.ResponseWriter, r *http.Request) {
	var req nameSuggestReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Kind != "lora" && req.Kind != "detector" {
		writeErr(w, http.StatusBadRequest, `kind is "lora" or "detector"`)
		return
	}
	if len(req.Names) == 0 || len(req.Names) > nameBatch {
		writeErr(w, http.StatusBadRequest, "name between 1 and "+strconv.Itoa(nameBatch))
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 100*time.Second)
	defer cancel()
	links, _ := s.db.CivitaiLinks(ctx)

	// Each name's file: its key, and how to get the hash it is looked up by.
	type target struct {
		key  string
		hash func() string
	}
	targets := map[string]target{}
	setSize := map[int64]int{} // detector files per catalogue version
	if req.Kind == "lora" {
		loras, err := s.imagegen.Loras(ctx, base)
		if err != nil {
			writeErr(w, http.StatusBadGateway, err.Error())
			return
		}
		hashes := map[string]string{}
		if records, err := s.imagegen.ModelRecords(ctx, base); err == nil {
			for _, rec := range records {
				hashes[rec.Key] = rec.Hash
			}
		}
		for _, l := range loras {
			l := l
			targets[l.Name] = target{key: l.Key, hash: func() string {
				if h := civitaiHashOf(hashes[l.Key]); h != "" {
					return h
				}
				return civitaiHashOf(l.Hash)
			}}
		}
	} else {
		files, err := s.imagegen.A1111DetectorFiles()
		if err != nil {
			writeErr(w, installErrStatus(err), err.Error())
			return
		}
		for _, f := range files {
			key := f.Key
			targets[f.Name] = target{key: key, hash: func() string {
				sum, _ := s.imagegen.A1111FileHash(key)
				return strings.ToUpper(sum)
			}}
			if l, ok := links[key]; ok && l.VersionID > 0 {
				setSize[l.VersionID]++
			}
		}
	}

	out := make([]nameSuggestion, len(req.Names))
	sem := make(chan struct{}, 4)
	var wg sync.WaitGroup
	for i, name := range req.Names {
		name = strings.TrimSpace(name)
		out[i] = nameSuggestion{Name: name}
		t, ok := targets[name]
		if !ok {
			out[i].Outcome, out[i].Error = "error", "there is nothing called that"
			continue
		}
		wg.Add(1)
		go func(res *nameSuggestion, t target) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			m, versionID, outcome, err := s.civitaiFindFile(ctx, t.key, t.hash(), links[t.key])
			if m == nil {
				res.Outcome = outcome
				if err != nil {
					res.Error = err.Error()
				}
				return
			}
			res.Civitai = m.Name
			version := civitaiVersionName(m, versionID)
			if req.Kind == "lora" {
				res.To = loraNameFor(m.Name, version)
			} else {
				res.To = detectorNameFor(m.Name, version, res.Name, setSize[versionID] > 1)
			}
			switch {
			case res.To == "":
				res.Outcome = "unknown"
			case res.To == res.Name:
				res.Outcome = "same"
			default:
				res.Outcome = "named"
			}
		}(&out[i], t)
	}
	wg.Wait()
	writeJSON(w, http.StatusOK, map[string]any{"suggestions": out})
}

// ── renaming ────────────────────────────────────────────────────────────────

type renameReq struct {
	Kind    string `json:"kind"`
	Renames []struct {
		Name string `json:"name"`
		To   string `json:"to"`
	} `json:"renames"`
}

type renameFailure struct {
	Name  string `json:"name"`
	Error string `json:"error"`
}

// handleRename renames LoRAs or detectors, one file at a time; a name that fails
// leaves the others done. Automatic1111 only: InvokeAI keeps a model's name in its
// own records, and its model manager renames them.
func (s *Server) handleRename(w http.ResponseWriter, r *http.Request) {
	var req renameReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256<<10)).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Kind != "lora" && req.Kind != "detector" {
		writeErr(w, http.StatusBadRequest, `kind is "lora" or "detector"`)
		return
	}
	if len(req.Renames) == 0 || len(req.Renames) > 500 {
		writeErr(w, http.StatusBadRequest, "rename between 1 and 500")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
	defer cancel()
	if kind, err := s.imagegen.Backend(ctx, base); err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	} else if kind != imagegen.KindA1111 {
		writeErr(w, http.StatusConflict, "InvokeAI keeps its own names for models — rename them in its model manager")
		return
	}
	var keys map[string]string // detector name → key
	if req.Kind == "detector" {
		files, err := s.imagegen.A1111DetectorFiles()
		if err != nil {
			writeErr(w, installErrStatus(err), err.Error())
			return
		}
		keys = map[string]string{}
		for _, f := range files {
			keys[f.Name] = f.Key
		}
	}
	renamed := []imagegen.ModelRename{}
	failed := []renameFailure{}
	for _, rn := range req.Renames {
		var done *imagegen.ModelRename
		var err error
		if req.Kind == "lora" {
			done, err = s.imagegen.A1111RenameLora(ctx, base, rn.Name, rn.To)
		} else if key, ok := keys[rn.Name]; ok {
			done, err = s.imagegen.A1111RenameDetector(key, rn.To)
		} else {
			err = errors.New("ADetailer's folder has no file called that")
		}
		if errors.Is(err, imagegen.ErrNoModelsDir) {
			writeErr(w, http.StatusConflict, err.Error())
			return
		}
		if err != nil {
			failed = append(failed, renameFailure{Name: rn.Name, Error: err.Error()})
			continue
		}
		if done.OldKey == done.NewKey {
			continue
		}
		if err := s.db.RenameModel(ctx, done.OldKey, done.NewKey, done.OldName, done.NewName); err != nil {
			s.log.Warn("rename: move what was kept", "model", done.OldKey, "err", err)
		}
		renamed = append(renamed, *done)
	}
	if req.Kind == "lora" && len(renamed) > 0 {
		s.renameLibbyLoras(ctx, renamed)
		s.installedHashCache.forget(base) // the model list changed
	}
	writeJSON(w, http.StatusOK, map[string]any{"renamed": renamed, "failed": failed})
}

// renameLibbyLoras puts the new names into the LoRAs Libby draws with, which are
// kept by name in the settings and would otherwise be sent to A1111 as LoRAs it no
// longer has.
func (s *Server) renameLibbyLoras(ctx context.Context, renamed []imagegen.ModelRename) {
	to := map[string]string{}
	for _, rn := range renamed {
		to[rn.OldName] = rn.NewName
	}
	cur := s.settings.Get()
	next := cur
	changed := false
	next.LibbyGenLoras = append(next.LibbyGenLoras[:0:0], cur.LibbyGenLoras...)
	for i, l := range next.LibbyGenLoras {
		if n, ok := to[l.Name]; ok {
			next.LibbyGenLoras[i].Name, changed = n, true
		}
	}
	next.LibbyCameraLoras = append(next.LibbyCameraLoras[:0:0], cur.LibbyCameraLoras...)
	for i, l := range next.LibbyCameraLoras {
		if n, ok := to[l.Name]; ok {
			next.LibbyCameraLoras[i].Name, changed = n, true
		}
	}
	if !changed {
		return
	}
	next.Clamp()
	if err := s.db.PutSettings(ctx, next.Map()); err != nil {
		s.log.Warn("rename: Libby's LoRAs", "err", err)
		return
	}
	s.ApplySettings(next)
}

// civitaiNameDetectors gives the detectors an install left the names the catalogue's
// model says, before they are linked. A file whose name is taken keeps its own.
func (s *Server) civitaiNameDetectors(keys []string, m *civitaiRawModel, versionID int64) []string {
	version := civitaiVersionName(m, versionID)
	out := make([]string, 0, len(keys))
	for _, key := range keys {
		to := detectorNameFor(m.Name, version, path.Base(key), len(keys) > 1)
		if to == "" || to == path.Base(key) {
			out = append(out, key)
			continue
		}
		done, err := s.imagegen.A1111RenameDetector(key, to)
		if err != nil {
			out = append(out, key)
			continue
		}
		out = append(out, done.NewKey)
	}
	return out
}

// ── restarting ──────────────────────────────────────────────────────────────

// handleRestart asks Automatic1111 to restart itself. It answers at once; the studio
// follows the status until the generator is back. A generator that cannot restart
// from here is a 409 with what to change, never a 401 (which would sign the web
// client out).
func (s *Server) handleRestart(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	if err := s.imagegen.Restart(ctx, base); err != nil {
		status := http.StatusBadGateway
		if errors.Is(err, imagegen.ErrRestartUnsupported) {
			status = http.StatusConflict
		}
		writeErr(w, status, err.Error())
		return
	}
	s.log.Info("imagegen: asked Automatic1111 to restart")
	writeJSON(w, http.StatusAccepted, map[string]any{"status": "restarting"})
}
