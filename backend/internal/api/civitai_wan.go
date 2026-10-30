package api

import (
	"context"
	"net/http"
	"path"
	"regexp"
	"strings"
	"unicode"

	"github.com/youruser/oppailib/internal/imagegen"
)

// The catalogue's Wan models, for ComfyUI.
//
// Wan 2.2's 14B models are a pair of experts, high noise and low noise, and Civitai
// files the halves of a pair as two versions of one model — "I2V High v3.0" and
// "I2V Low v3.0", "Q8 H" and "Q8 L" — whether it is a fine-tune or a LoRA. Half a pair
// does not make a clip, so the browser's video mode installs both, and names the two
// files so the Video settings can read the pair back off them (web/src/clip-models.ts):
// the same name for both, ending "_high" and "_low". A file on its own keeps the name
// its uploader gave it.

// The words that say which half a version is: "high", "low", "high noise", "Highnoise",
// or a lone capital H or L.
var (
	wanHighWords = regexp.MustCompile(`(?i)high[\s_-]?noise|(^|[^a-z])high([^a-z]|$)`)
	wanLowWords  = regexp.MustCompile(`(?i)low[\s_-]?noise|(^|[^a-z])low([^a-z]|$)`)
	wanHighLone  = regexp.MustCompile(`(^|[^A-Za-z0-9])H([^A-Za-z0-9]|$)`)
	wanLowLone   = regexp.MustCompile(`(^|[^A-Za-z0-9])L([^A-Za-z0-9]|$)`)
)

// wanStage is which half of a pair a version's name says it is: "high", "low", or ""
// for neither, or for a name that says both (a bundle of the two).
func wanStage(name string) string {
	high := wanHighWords.MatchString(name)
	low := wanLowWords.MatchString(name)
	if !high && !low {
		high, low = wanHighLone.MatchString(name), wanLowLone.MatchString(name)
	}
	switch {
	case high && !low:
		return "high"
	case low && !high:
		return "low"
	}
	return ""
}

// wanWithoutStage is a version's name with the half it is taken out.
func wanWithoutStage(name string) string {
	for _, re := range []*regexp.Regexp{wanHighWords, wanLowWords, wanHighLone, wanLowLone} {
		name = re.ReplaceAllString(name, " ")
	}
	return strings.Join(strings.Fields(name), " ")
}

// wanStem is what two halves of a pair share: the name without its half, letters and
// digits only, so "High noise - v1.1" and "Low Noise - v1.1" meet.
func wanStem(name string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return unicode.ToLower(r)
		}
		return -1
	}, wanWithoutStage(name))
}

func isWanBase(base string) bool { return strings.HasPrefix(strings.ToLower(base), "wan video") }

// wanTwin is the other half of v's pair among a model's versions, or nil.
func wanTwin(versions []civitaiRawVersion, v civitaiRawVersion) *civitaiRawVersion {
	stage := wanStage(v.Name)
	if stage == "" || !isWanBase(v.BaseModel) {
		return nil
	}
	stem := wanStem(v.Name)
	for i := range versions {
		w := &versions[i]
		if w.ID != v.ID && w.BaseModel == v.BaseModel && wanStage(w.Name) != "" && wanStage(w.Name) != stage && wanStem(w.Name) == stem {
			return w
		}
	}
	return nil
}

// wanDirection is the short name of what a Wan base model does, for the file name:
// the settings' first guess tells a picture model from a words one by it.
func wanDirection(base string) string {
	b := strings.ToLower(base)
	for _, d := range []string{"ti2v", "i2v", "t2v"} {
		if strings.Contains(b, d) {
			return d
		}
	}
	return ""
}

// wanPairNames names the two halves of a pair after what their uploaded files' names
// share, then which half each is — "smoothMixWan2214BI2V_i2vV20High" and "…Low" become
// "smoothMixWan2214BI2V_i2vV20_high" and "_low" — so the Video settings read the pair
// back off them, and a second quantisation of the same model keeps a name of its own.
// stage is file's half; twinFile is the other.
func wanPairNames(file, twinFile, stage, base string) (string, string) {
	ext, twinExt := path.Ext(file), path.Ext(twinFile)
	a, b := strings.TrimSuffix(file, ext), strings.TrimSuffix(twinFile, twinExt)
	la, lb := strings.ToLower(a), strings.ToLower(b)
	p := 0
	for p < len(la) && p < len(lb) && la[p] == lb[p] {
		p++
	}
	s := 0
	for s < len(la)-p && s < len(lb)-p && la[len(la)-1-s] == lb[len(lb)-1-s] {
		s++
	}
	const seps = "-_ ."
	stem := strings.TrimRight(a[:p], seps)
	if tail := strings.TrimLeft(a[len(a)-s:], seps); tail != "" {
		if stem != "" {
			stem += "_"
		}
		stem += tail
	}
	if stem == "" {
		stem = a
	}
	if d := wanDirection(base); d != "" && !strings.Contains(strings.ToLower(stem), d) {
		stem += "_" + d
	}
	other := "low"
	if stage == "low" {
		other = "high"
	}
	return stem + "_" + stage + ext, stem + "_" + other + twinExt
}

// civitaiComfySpecs is what to download into ComfyUI for one version: its file, and
// with pair set the other half of its pair when it has one, the two named alike.
func (s *Server) civitaiComfySpecs(ctx context.Context, source string, modelID, versionID int64, pair bool) ([]imagegen.InstallSpec, error) {
	token := s.settings.Get().CivitaiAPIKey
	if modelID <= 0 {
		return []imagegen.InstallSpec{{Source: source, Token: token}}, nil
	}
	m, err := s.civitaiModel(ctx, modelID)
	if err != nil {
		return nil, err
	}
	kind := civitaiInstallType(m.Type)
	for _, v := range m.ModelVersions {
		if versionID > 0 && v.ID != versionID {
			continue
		}
		spec := imagegen.InstallSpec{Source: source, Type: kind, Token: token}
		f := civitaiPrimaryFile(v, source)
		if f != nil {
			spec.FileName = f.Name
		}
		twin := wanTwin(m.ModelVersions, v)
		if !pair || twin == nil || f == nil {
			return []imagegen.InstallSpec{spec}, nil
		}
		tf := civitaiPrimaryFile(*twin, "")
		if tf == nil || !civitaiHostAllowed(tf.DownloadURL) {
			return []imagegen.InstallSpec{spec}, nil
		}
		other := imagegen.InstallSpec{Source: tf.DownloadURL, Type: kind, Token: token}
		spec.FileName, other.FileName = wanPairNames(f.Name, tf.Name, wanStage(v.Name), v.BaseModel)
		return []imagegen.InstallSpec{spec, other}, nil
	}
	return []imagegen.InstallSpec{{Source: source, Type: kind, Token: token}}, nil
}

// comfyPlaces is where installs into ComfyUI go, by the Video settings' folders.
func (s *Server) comfyPlaces() imagegen.ComfyPlaces {
	cur := s.settings.Get()
	return imagegen.ComfyPlacesFor(cur.ComfyModelsDir, cur.ComfyDiffusionDir, cur.ComfyLoraDir)
}

// civitaiComfyInstall downloads a version, and its other half, into ComfyUI's folder
// for its kind. Nothing is recorded for the catalogue's dressing afterwards: ComfyUI
// keeps no cover or description, and the file's name already says what it is.
func (s *Server) civitaiComfyInstall(w http.ResponseWriter, r *http.Request, req civitaiInstallReq) {
	places := s.comfyPlaces()
	if places.Models == "" && places.Diffusion == "" && places.Loras == "" {
		// Not worth asking Civitai about a file there is nowhere to put.
		problem := places.ModelsProblem
		if problem == "" {
			problem = "ComfyUI has no API that takes a download; map its models folder into the OppaiLib container at " +
				"/comfy-models, or set where it is under Settings → Image generation → Video"
		}
		writeErr(w, http.StatusConflict, problem)
		return
	}
	specs, err := s.civitaiComfySpecs(r.Context(), req.URL, req.ModelID, req.VersionID, req.Pair)
	if err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	if err := places.CanInstall(specs[0]); err != nil {
		writeErr(w, http.StatusConflict, err.Error())
		return
	}
	var first *imagegen.InstallJob
	for _, spec := range specs {
		job, err := s.imagegen.ComfyInstall(places, spec)
		if err != nil {
			if first == nil {
				writeErr(w, http.StatusConflict, err.Error())
				return
			}
			// The first half is on its way; the second's refusal ("already downloading",
			// "already in the models folder") is not worth failing it for.
			s.log.Warn("comfy install: second half", "err", err)
			continue
		}
		if first == nil {
			first = job
		}
	}
	writeJSON(w, http.StatusOK, first)
}
