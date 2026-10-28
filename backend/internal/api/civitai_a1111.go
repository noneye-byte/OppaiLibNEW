package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/youruser/oppailib/internal/imagegen"
)

// The catalogue against Automatic1111.
//
// Everything in civitai_installs.go and civitai_manage.go was written against
// InvokeAI's model manager, and runs unchanged against A1111 because the imagegen
// client gives A1111 the same verbs: records with hashes, a download queue, a record
// to write a description and a cover onto. What is different lives here — an A1111
// install has to be told what kind of file it is and what to call it, because the
// file is put in a folder by name rather than handed over to a model manager that
// reads it and decides — and so does the fallback for a picker tile whose A1111 model
// has no preview file but whose catalogue page has pictures.

// civitaiInstallSpec describes an install from what the catalogue says about the
// version: its type, which says which folder, and its primary file's name. A URL the
// catalogue does not tie to a model (an older client sends only the URL) still
// installs into InvokeAI, which reads the file to decide; A1111 refuses it, since a
// file in the wrong folder never appears.
func (s *Server) civitaiInstallSpec(ctx context.Context, source string, modelID, versionID int64) (imagegen.InstallSpec, error) {
	spec := imagegen.InstallSpec{Source: source, Token: s.settings.Get().CivitaiAPIKey}
	if modelID <= 0 {
		return spec, nil
	}
	m, err := s.civitaiModel(ctx, modelID)
	if err != nil {
		return spec, err
	}
	spec.Type = civitaiInstallType(m.Type)
	if strings.EqualFold(spec.Type, "other") && civitaiIsDetector(*m) {
		// Half the catalogue's ADetailer models are filed as "Other"; see detectors.go.
		spec.Type = "detection"
	}
	for _, v := range m.ModelVersions {
		if versionID > 0 && v.ID != versionID {
			continue
		}
		var primary *civitaiRawFile
		for i := range v.Files {
			f := &v.Files[i]
			if f.DownloadURL == source {
				primary = f
				break
			}
			if primary == nil && (f.Primary || f.Type == "Model") {
				primary = f
			}
		}
		if primary != nil {
			spec.FileName = primary.Name
		}
		break
	}
	return spec, nil
}

// civitaiInstallType reads the catalogue's model type as the search filter names it,
// which is how the imagegen client chooses a folder.
func civitaiInstallType(t string) string {
	switch strings.ToLower(t) {
	case "checkpoint":
		return "checkpoint"
	case "lora", "locon", "dora", "lycoris":
		return "lora"
	case "vae":
		return "vae"
	case "controlnet":
		return "controlnet"
	case "upscaler":
		return "upscaler"
	case "detection":
		return "detection"
	}
	return t
}

// installErrStatus is the status for an install the generator would not start. A
// missing models folder is the operator's to fix in Settings, not an upstream fault.
func installErrStatus(err error) int {
	if errors.Is(err, imagegen.ErrNoModelsDir) {
		return http.StatusConflict
	}
	return http.StatusBadGateway
}

// civitaiCoverFor is the picture the catalogue has for a model the generator keeps no
// cover for: the one chosen, else the version's first. The picker name is whatever
// the tile was drawn from (a checkpoint's title, a LoRA's name); it is resolved to
// the record the link is kept under.
func (s *Server) civitaiCoverFor(ctx context.Context, base, name string) ([]byte, string, bool) {
	detail, err := s.imagegen.ModelDetail(ctx, base, name)
	if err != nil {
		return nil, "", false
	}
	link, ok, err := s.db.CivitaiLink(ctx, detail.Key)
	if err != nil || !ok {
		return nil, "", false
	}
	cover := link.CoverURL
	if cover == "" && len(link.Previews) > 0 {
		cover = link.Previews[0]
	}
	if cover == "" || !civitaiHostAllowed(cover) {
		return nil, "", false
	}
	fetchCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	data, ct, err := s.civitaiFetchImage(fetchCtx, cover)
	if err != nil {
		return nil, "", false
	}
	return data, ct, true
}

// civitaiTriggerWords gives an A1111 LoRA the catalogue's trained words when its own
// sidecar names none. A1111 keeps a LoRA's activation text in a file beside it, which
// this side can only write with the models folder mounted; a LoRA linked by hash
// without it would otherwise come to the picker with no trigger words at all.
func (s *Server) civitaiTriggerWords(ctx context.Context, loras []imagegen.Lora) {
	links, err := s.db.CivitaiLinks(ctx)
	if err != nil || len(links) == 0 {
		return
	}
	for i := range loras {
		if len(loras[i].TriggerPhrases) > 0 || loras[i].Key == "" {
			continue
		}
		if link, ok := links[loras[i].Key]; ok && len(link.TrainedWords) > 0 {
			loras[i].TriggerPhrases = link.TrainedWords
		}
	}
}
