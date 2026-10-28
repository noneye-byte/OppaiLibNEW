package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
)

// ADetailer's detectors: what is in its folder, and getting more from Civitai
// without leaving the studio's ADetailer drawer.
//
// The catalogue has hundreds — eyes, feet, nipples, speech bubbles — and they were
// reachable only through the full Civitai browser's "Detectors" type, where most of
// them then failed to work: they are published as a .zip around the .pt (unpacked
// on install now, see imagegen/a1111_detectors.go), and a good share are filed as
// type "Other" with an "adetailer" tag, which the browser's install refused as a
// type Automatic1111 has no folder for. The search here asks for both.
//
// ADetailer reads its folder once, when A1111 starts, so a detector that has just
// arrived is on disk but not yet in ADetailer's list. The listing says which, so the
// drawer can say "restart Automatic1111" instead of leaving a pass that does nothing.

// detectorOut is one detector as the drawer shows it.
type detectorOut struct {
	// Name is what ADetailer calls it and what a pass sends: the file name, or the
	// name of one of ADetailer's own (mediapipe_face_full).
	Name string `json:"name"`
	// Key is the file under the models folder; absent for ADetailer's own, which
	// live in its install rather than the folder.
	Key  string `json:"key,omitempty"`
	Size int64  `json:"size,omitempty"`
	// Listed says ADetailer has it now. A file not yet listed needs A1111 restarted.
	Listed bool `json:"listed"`
	// Civitai is the catalogue model it was installed from, when it was.
	Civitai *detectorCivitai `json:"civitai,omitempty"`
}

type detectorCivitai struct {
	ModelID   int64  `json:"modelId"`
	VersionID int64  `json:"versionId"`
	Name      string `json:"name"`
	Creator   string `json:"creator,omitempty"`
	Cover     string `json:"cover,omitempty"`
}

// handleDetectors lists ADetailer's detectors: every one it reports and every file
// in its folder, merged by name.
func (s *Server) handleDetectors(w http.ResponseWriter, r *http.Request) {
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	listed, listErr := s.imagegen.Detectors(ctx, base)
	files, fileErr := s.imagegen.A1111DetectorFiles()
	links, _ := s.db.CivitaiLinks(ctx)
	out := detectorsOutOf(listed, files, links)
	resp := map[string]any{"detectors": out, "folder": fileErr == nil}
	if listErr != nil {
		resp["listError"] = listErr.Error()
	}
	if fileErr != nil && !errors.Is(fileErr, imagegen.ErrNoModelsDir) {
		resp["folderError"] = fileErr.Error()
	}
	writeJSON(w, http.StatusOK, resp)
}

// detectorsOutOf merges what ADetailer lists with what is on disk: the files first,
// in their order, then ADetailer's own models that are no file of the folder.
func detectorsOutOf(listed []string, files []imagegen.DetectorFile, links map[string]db.CivitaiLink) []detectorOut {
	isListed := map[string]bool{}
	for _, n := range listed {
		isListed[n] = true
	}
	out := make([]detectorOut, 0, len(listed)+len(files))
	onDisk := map[string]bool{}
	for _, f := range files {
		onDisk[f.Name] = true
		d := detectorOut{Name: f.Name, Key: f.Key, Size: f.Size, Listed: isListed[f.Name]}
		if l, ok := links[f.Key]; ok && l.ModelID > 0 {
			d.Civitai = &detectorCivitai{ModelID: l.ModelID, VersionID: l.VersionID, Name: l.ModelName, Creator: l.Creator, Cover: linkCover(l)}
		}
		out = append(out, d)
	}
	for _, n := range listed {
		if !onDisk[n] {
			out = append(out, detectorOut{Name: n, Listed: true})
		}
	}
	return out
}

func linkCover(l db.CivitaiLink) string {
	if l.CoverURL != "" {
		return l.CoverURL
	}
	if len(l.Previews) > 0 {
		return l.Previews[0]
	}
	return ""
}

// handleDetectorDelete removes a detector file from ADetailer's folder.
func (s *Server) handleDetectorDelete(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimSpace(r.URL.Query().Get("key"))
	if key == "" {
		writeErr(w, http.StatusBadRequest, "key is required")
		return
	}
	if err := s.imagegen.A1111DeleteDetector(key); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, imagegen.ErrNoModelsDir) {
			status = http.StatusConflict
		}
		writeErr(w, status, err.Error())
		return
	}
	s.civitaiForgetModel(r.Context(), key)
	w.WriteHeader(http.StatusNoContent)
}

// ── the catalogue ───────────────────────────────────────────────────────────

// detectorCursor pages two listings at once: the catalogue's "Detection" type, and
// "Other" models tagged adetailer. "" is a first page, "-" a listing that has run out.
type detectorCursor struct {
	D string `json:"d"`
	O string `json:"o"`
}

func (c detectorCursor) encode() string {
	if c.D == "-" && c.O == "-" {
		return ""
	}
	b, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeDetectorCursor(s string) detectorCursor {
	var c detectorCursor
	if b, err := base64.RawURLEncoding.DecodeString(s); err == nil {
		_ = json.Unmarshal(b, &c)
	}
	return c
}

// civitaiIsDetector says whether a catalogue model is an ADetailer detector: filed
// as one, or filed as "Other" and tagged or named for ADetailer or YOLO.
func civitaiIsDetector(m civitaiRawModel) bool {
	switch strings.ToLower(m.Type) {
	case "detection":
		return true
	case "other":
	default:
		return false
	}
	for _, t := range m.Tags {
		if t = strings.ToLower(t); t == "adetailer" || t == "yolov8" || t == "yolo" {
			return true
		}
	}
	name := strings.ToLower(m.Name)
	return strings.Contains(name, "adetailer") || strings.Contains(name, "yolo")
}

// detectorOutOf is a catalogue detector as the drawer's shop shows it, with which
// of its versions are already in the folder.
type detectorModelOut struct {
	civitaiModelOut
	// Cover is the first still of the newest version, for the card.
	Cover string `json:"cover,omitempty"`
	// InstalledVersions are the versions a file in the folder came from.
	InstalledVersions []int64 `json:"installedVersions"`
}

// handleDetectorCivitai searches the catalogue for detectors.
//
//	q=…       words in the name
//	nsfw=0    hide adult ones; on by default, as in the browser
//	cursor=…  from the previous page's nextCursor
func (s *Server) handleDetectorCivitai(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	cur := decodeDetectorCursor(q.Get("cursor"))
	term := strings.TrimSpace(q.Get("q"))
	nsfw := strconv.FormatBool(q.Get("nsfw") == "" || isTruthy(q.Get("nsfw")))

	page := func(cursor string, limit int, types, tag string) (*civitaiListing, error) {
		if cursor == "-" {
			return &civitaiListing{}, nil
		}
		p := url.Values{"limit": {strconv.Itoa(limit)}, "nsfw": {nsfw}, "types": {types}, "sort": {"Most Downloaded"}}
		if term != "" {
			p.Set("query", term)
		}
		if tag != "" {
			p.Set("tag", tag)
		}
		if cursor != "" {
			if n, ok := strings.CutPrefix(cursor, "page:"); ok {
				p.Set("page", n)
			} else {
				p.Set("cursor", cursor)
			}
		}
		var l civitaiListing
		return &l, s.civitaiGet(r.Context(), "/models", p, &l, 16<<20)
	}
	var wg sync.WaitGroup
	var det, other *civitaiListing
	var detErr, otherErr error
	wg.Add(2)
	go func() { defer wg.Done(); det, detErr = page(cur.D, 18, "Detection", "") }()
	go func() { defer wg.Done(); other, otherErr = page(cur.O, 8, "Other", "adetailer") }()
	wg.Wait()
	if detErr != nil && otherErr != nil {
		writeErr(w, civitaiStatus(detErr), detErr.Error())
		return
	}
	next := detectorCursor{D: "-", O: "-"}
	installed := s.installedDetectorVersions(r.Context())
	seen := map[int64]bool{}
	out := []detectorModelOut{}
	add := func(l *civitaiListing, err error, into *string) {
		if err != nil || l == nil {
			return
		}
		if c := nextCursorOf(l.Metadata); c != "" {
			*into = c
		}
		for _, m := range l.Items {
			if seen[m.ID] || !civitaiIsDetector(m) {
				continue
			}
			seen[m.ID] = true
			d := detectorModelOut{civitaiModelOut: civitaiModelOutOf(m, nil, false), InstalledVersions: []int64{}}
			for _, v := range d.Versions {
				if installed[v.ID] {
					d.InstalledVersions = append(d.InstalledVersions, v.ID)
				}
				if d.Cover == "" && len(v.Images) > 0 {
					d.Cover = v.Images[0]
				}
			}
			d.Installed = len(d.InstalledVersions) > 0
			out = append(out, d)
		}
	}
	add(det, detErr, &next.D)
	add(other, otherErr, &next.O)
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "nextCursor": next.encode()})
}

// installedDetectorVersions is every catalogue version a file in the detector folder
// came from, by the links its installs left.
func (s *Server) installedDetectorVersions(ctx context.Context) map[int64]bool {
	out := map[int64]bool{}
	links, err := s.db.CivitaiLinks(ctx)
	if err != nil {
		return out
	}
	for key, l := range links {
		if strings.HasPrefix(key, imagegen.A1111InstallFolder("detection")+"/") && l.VersionID > 0 {
			out[l.VersionID] = true
		}
	}
	return out
}

type detectorInstallReq struct {
	ModelID   int64 `json:"modelId"`
	VersionID int64 `json:"versionId"`
}

// handleDetectorInstall downloads one catalogue version into ADetailer's folder.
// The version's own file goes in when it is a .pt; an archive is unpacked there.
func (s *Server) handleDetectorInstall(w http.ResponseWriter, r *http.Request) {
	var req detectorInstallReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&req); err != nil || req.ModelID <= 0 {
		writeErr(w, http.StatusBadRequest, "modelId is required")
		return
	}
	base, ok := s.galleryBase(w)
	if !ok {
		return
	}
	m, err := s.civitaiModel(r.Context(), req.ModelID)
	if err != nil {
		writeErr(w, civitaiStatus(err), err.Error())
		return
	}
	if !civitaiIsDetector(*m) {
		writeErr(w, http.StatusBadRequest, "that model isn't an ADetailer detector")
		return
	}
	var version *civitaiRawVersion
	for i := range m.ModelVersions {
		if req.VersionID <= 0 || m.ModelVersions[i].ID == req.VersionID {
			version = &m.ModelVersions[i]
			break
		}
	}
	if version == nil {
		writeErr(w, http.StatusNotFound, "no such version")
		return
	}
	file := detectorFileOf(version.Files)
	if file == nil {
		writeErr(w, http.StatusBadRequest, "this version has no .pt or .zip file to install")
		return
	}
	existing := map[string]bool{}
	if files, err := s.imagegen.A1111DetectorFiles(); err == nil {
		for _, f := range files {
			existing[strings.ToLower(f.Name)] = true
		}
	}
	spec := imagegen.InstallSpec{
		Source: file.DownloadURL, Type: "detection", Token: s.settings.Get().CivitaiAPIKey,
		FileName: detectorFileName(file.Name, version.ID, existing),
	}
	job, err := s.imagegen.InstallModel(r.Context(), base, spec)
	if err != nil {
		writeErr(w, installErrStatus(err), err.Error())
		return
	}
	if err := s.db.AddCivitaiInstall(r.Context(), file.DownloadURL, m.ID, version.ID, ""); err != nil {
		s.log.Warn("detectors: record install", "err", err)
	} else {
		s.civitaiWatchInstalls()
	}
	writeJSON(w, http.StatusOK, job)
}

// detectorFileOf is the file of a version to install: a .pt if it has one — the
// detector itself, nothing to unpack — else its archive.
func detectorFileOf(files []civitaiRawFile) *civitaiRawFile {
	var archive *civitaiRawFile
	for i := range files {
		f := &files[i]
		switch strings.ToLower(path.Ext(f.Name)) {
		case ".pt":
			return f
		case ".zip":
			if archive == nil {
				archive = f
			}
		}
	}
	return archive
}

// detectorFileName keeps the catalogue's name for a .pt unless the folder already has
// one called that — "adetailerAfterDetailer_v10.pt" is the name of a feet model and
// a lips model both — when the version's id tells them apart. An archive's name does
// not matter; what it unpacks to does, and that keeps whatever is there already.
func detectorFileName(name string, versionID int64, existing map[string]bool) string {
	ext := path.Ext(name)
	if !strings.EqualFold(ext, ".pt") || !existing[strings.ToLower(name)] {
		return name
	}
	return strings.TrimSuffix(name, ext) + "-" + strconv.FormatInt(versionID, 10) + ext
}

// civitaiLinkDetectors records the catalogue model a detector install came from,
// once per file it unpacked to. A detector has no record A1111 can describe — no
// card, no sidecar ADetailer reads — so the link alone is the dressing: the drawer
// shows the catalogue's name and picture for it.
func (s *Server) civitaiLinkDetectors(ctx context.Context, keys []string, modelID, versionID int64) error {
	m, err := s.civitaiModel(ctx, modelID)
	if err != nil {
		return err
	}
	for _, key := range keys {
		if err := s.db.PutCivitaiLink(ctx, civitaiLinkFrom(key, "", m, versionID)); err != nil {
			return err
		}
	}
	return nil
}

// detectorKeys is every file a finished detector job left in the folder.
func detectorKeys(job imagegen.InstallJob) []string {
	if len(job.Files) == 0 {
		return []string{job.ModelKey}
	}
	folder := imagegen.A1111InstallFolder("detection")
	out := make([]string, 0, len(job.Files))
	for _, f := range job.Files {
		out = append(out, folder+"/"+f)
	}
	return out
}

func isDetectorKey(key string) bool {
	return strings.HasPrefix(key, imagegen.A1111InstallFolder("detection")+"/")
}
