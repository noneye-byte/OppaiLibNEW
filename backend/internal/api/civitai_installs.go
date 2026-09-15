package api

import (
	"context"
	"errors"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
)

// Dressing the studio's models with what the catalogue knows about them.
//
// A model installed from the Civitai browser used to arrive in InvokeAI as a bare
// filename: no cover, no description, no trigger words, a black tile in the picker
// until somebody opened the record editor and typed it all in from the site. The
// catalogue had all of it, and InvokeAI's model record has a field for each — its
// own model manager writes the same fields — so the install is followed through:
// when InvokeAI reports the download complete, the record it registered is given
// the model's description as plain text, the version's trained words as trigger
// phrases, and its first showcase image as cover art. The showcase gallery, the
// catalogue ids and the newest version are kept on our side (civitai_models), which
// is what the picker draws on to show "installed from Civitai · update available".
//
// The same dressing is offered to models that were already there: InvokeAI hashes
// every file it registers with BLAKE3 and Civitai publishes the BLAKE3 of every
// file it hosts, so a model can be found on the site without anyone remembering
// where it came from.

// civitaiInstallWatchEvery is how often the watcher asks InvokeAI about jobs that
// still owe their metadata. A download takes minutes; nothing is lost by asking
// every twenty seconds and nothing is gained by asking more.
const civitaiInstallWatchEvery = 20 * time.Second

// civitaiInstallGiveUp retires a promise whose job never showed up as finished —
// InvokeAI restarted with an empty queue, say — rather than polling forever.
const civitaiInstallGiveUp = 24 * time.Hour

// civitaiLinkStale is how long a by-hash answer is trusted before the catalogue is
// asked again, for a file that was not on Civitai last time and for whether a
// linked model has a newer version.
const civitaiLinkStale = 24 * time.Hour

// civitaiWatchInstalls starts the watcher if it is not already running. Called on
// every install and every poll of the install list, so a promise made before a
// restart is still kept once anyone looks.
func (s *Server) civitaiWatchInstalls() {
	s.civitaiMu.Lock()
	defer s.civitaiMu.Unlock()
	if s.civitaiWatching {
		return
	}
	s.civitaiWatching = true
	go s.civitaiInstallLoop()
}

func (s *Server) civitaiInstallLoop() {
	defer func() {
		s.civitaiMu.Lock()
		s.civitaiWatching = false
		s.civitaiMu.Unlock()
	}()
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		remaining := s.civitaiApplyFinishedInstalls(ctx)
		cancel()
		if remaining == 0 {
			return
		}
		time.Sleep(civitaiInstallWatchEvery)
	}
}

// civitaiApplyFinishedInstalls keeps every promise whose job has completed and
// drops the ones whose job failed or vanished. It returns how many are still
// waiting on a download.
func (s *Server) civitaiApplyFinishedInstalls(ctx context.Context) int {
	pending, err := s.db.CivitaiInstalls(ctx)
	if err != nil || len(pending) == 0 {
		return 0
	}
	set := s.settings.Get()
	if !set.ImageGenEnabled {
		return len(pending)
	}
	jobs, err := s.imagegen.InstallJobs(ctx, set.ImageGenURL)
	if err != nil {
		s.log.Warn("civitai: install jobs", "err", err)
		return len(pending)
	}
	bySource := map[string]imagegen.InstallJob{}
	for _, job := range jobs {
		// The newest job for a source wins: a retried download appears twice.
		if _, seen := bySource[job.Source]; !seen {
			bySource[job.Source] = job
		}
	}
	waiting := 0
	for _, p := range pending {
		job, ok := bySource[p.Source]
		switch {
		case !ok && time.Since(time.Unix(p.CreatedAt, 0)) > civitaiInstallGiveUp:
			_ = s.db.DeleteCivitaiInstall(ctx, p.Source)
		case !ok:
			waiting++
		case job.Status == "completed":
			if job.ModelKey == "" {
				// InvokeAI finished but did not say what it registered; the hash lookup
				// will find it the next time the studio's models are listed.
				_ = s.db.DeleteCivitaiInstall(ctx, p.Source)
				continue
			}
			if _, err := s.civitaiApplyToModel(ctx, set.ImageGenURL, job.ModelKey, p.ModelID, p.VersionID); err != nil {
				s.log.Warn("civitai: apply metadata after install", "model", job.ModelKey, "err", err)
			}
			_ = s.db.DeleteCivitaiInstall(ctx, p.Source)
			s.installedHashCache.forget(set.ImageGenURL) // the model list changed
		case job.Status == "error" || job.Status == "cancelled":
			_ = s.db.DeleteCivitaiInstall(ctx, p.Source)
		default:
			waiting++
		}
	}
	return waiting
}

// civitaiLinkFrom builds what is kept about a model from its catalogue page and
// the version InvokeAI holds. Previews are the version's showcase stills, falling
// back to any version's so a model whose own version has no pictures still gets a
// cover.
func civitaiLinkFrom(key, hash string, m *civitaiRawModel, versionID int64) db.CivitaiLink {
	link := db.CivitaiLink{
		ModelKey: key, Hash: hash, ModelID: m.ID, ModelName: m.Name, ModelType: m.Type,
		Creator: m.Creator.Username, Description: civitaiPlainText(m.Description),
		TrainedWords: []string{}, Previews: []string{},
	}
	if len(m.ModelVersions) > 0 {
		link.LatestVersionID = m.ModelVersions[0].ID
	}
	var version *civitaiRawVersion
	for i := range m.ModelVersions {
		if m.ModelVersions[i].ID == versionID {
			version = &m.ModelVersions[i]
			break
		}
	}
	if version == nil && len(m.ModelVersions) > 0 {
		version = &m.ModelVersions[0]
	}
	if version != nil {
		link.VersionID, link.VersionName, link.BaseModel = version.ID, version.Name, version.BaseModel
		if version.TrainedWords != nil {
			link.TrainedWords = version.TrainedWords
		}
		link.Previews = civitaiPreviewURLs(version.Images, 12)
	}
	if len(link.Previews) == 0 {
		for _, v := range m.ModelVersions {
			if link.Previews = civitaiPreviewURLs(v.Images, 12); len(link.Previews) > 0 {
				break
			}
		}
	}
	return link
}

// civitaiApplyToModel fetches a model's catalogue page and writes its description,
// trigger words and cover onto the InvokeAI record, recording the link. The cover
// is best-effort: a description without a picture is still worth having.
func (s *Server) civitaiApplyToModel(ctx context.Context, base, key string, modelID, versionID int64) (db.CivitaiLink, error) {
	m, err := s.civitaiModel(ctx, modelID)
	if err != nil {
		return db.CivitaiLink{}, err
	}
	hash := ""
	if records, err := s.imagegen.ModelRecords(ctx, base); err == nil {
		for _, r := range records {
			if r.Key == key {
				hash = blake3Of(r.Hash)
			}
		}
	}
	link := civitaiLinkFrom(key, hash, m, versionID)

	// InvokeAI's description is one plain-text field shown in a small panel; the
	// whole of a long model card would be noise there. The full text stays on our
	// record for the detail view.
	desc := link.Description
	if runes := []rune(desc); len(runes) > 1500 {
		desc = strings.TrimSpace(string(runes[:1500])) + "…"
	}
	words := link.TrainedWords
	if _, err := s.imagegen.UpdateModel(ctx, base, key, imagegen.ModelChanges{
		Description:    &desc,
		TriggerPhrases: &words,
	}); err != nil {
		return db.CivitaiLink{}, err
	}
	if len(link.Previews) > 0 {
		if data, ct, err := s.civitaiFetchImage(ctx, link.Previews[0]); err == nil {
			if err := s.imagegen.UpdateCover(ctx, base, key, data, ct); err != nil {
				s.log.Warn("civitai: cover art", "model", key, "err", err)
			}
		} else {
			s.log.Warn("civitai: fetch preview", "model", key, "err", err)
		}
	}
	if err := s.db.PutCivitaiLink(ctx, link); err != nil {
		return db.CivitaiLink{}, err
	}
	return link, nil
}

// civitaiSyncModel dresses one installed model: by the version it is pinned to,
// by hand, or by finding its file's hash on the catalogue.
func (s *Server) civitaiSyncModel(ctx context.Context, base, key string, versionID int64) (db.CivitaiLink, error) {
	records, err := s.imagegen.ModelRecords(ctx, base)
	if err != nil {
		return db.CivitaiLink{}, err
	}
	var record *imagegen.ModelRecord
	for i := range records {
		if records[i].Key == key {
			record = &records[i]
			break
		}
	}
	if record == nil {
		return db.CivitaiLink{}, errors.New("InvokeAI has no such model")
	}
	var modelID int64
	if versionID > 0 {
		var v civitaiRawVersion
		if err := s.civitaiGet(ctx, "/model-versions/"+strconv.FormatInt(versionID, 10), nil, &v, 4<<20); err != nil {
			return db.CivitaiLink{}, err
		}
		modelID = v.ModelID
	} else {
		if link, ok, _ := s.db.CivitaiLink(ctx, key); ok && link.ModelID > 0 {
			modelID, versionID = link.ModelID, link.VersionID
		} else {
			hash := blake3Of(record.Hash)
			if hash == "" {
				return db.CivitaiLink{}, errors.New("InvokeAI has no file hash for this model, so it cannot be looked up; pick the version by hand")
			}
			v, err := s.civitaiVersionByHash(ctx, hash)
			if err != nil {
				return db.CivitaiLink{}, err
			}
			modelID, versionID = v.ModelID, v.ID
		}
	}
	if modelID <= 0 {
		return db.CivitaiLink{}, errCivitaiNotFound
	}
	return s.civitaiApplyToModel(ctx, base, key, modelID, versionID)
}

// civitaiInstalledOut is one studio model with its catalogue record, if any.
type civitaiInstalledOut struct {
	Key      string          `json:"key"`
	Name     string          `json:"name"`
	Type     string          `json:"type"`
	Base     string          `json:"base,omitempty"`
	HasCover bool            `json:"hasCover"`
	Civitai  *civitaiLinkOut `json:"civitai,omitempty"`
}

type civitaiLinkOut struct {
	ModelID         int64    `json:"modelId"`
	VersionID       int64    `json:"versionId"`
	LatestVersionID int64    `json:"latestVersionId"`
	UpdateAvailable bool     `json:"updateAvailable"`
	ModelName       string   `json:"modelName"`
	VersionName     string   `json:"versionName"`
	ModelType       string   `json:"modelType"`
	BaseModel       string   `json:"baseModel"`
	Creator         string   `json:"creator"`
	Description     string   `json:"description"`
	TrainedWords    []string `json:"trainedWords"`
	Previews        []string `json:"previews"`
	CheckedAt       int64    `json:"checkedAt"`
}

func civitaiLinkOutOf(l db.CivitaiLink) *civitaiLinkOut {
	if l.ModelID == 0 {
		return nil
	}
	return &civitaiLinkOut{
		ModelID: l.ModelID, VersionID: l.VersionID, LatestVersionID: l.LatestVersionID,
		UpdateAvailable: l.LatestVersionID != 0 && l.VersionID != 0 && l.LatestVersionID != l.VersionID,
		ModelName: l.ModelName, VersionName: l.VersionName, ModelType: l.ModelType,
		BaseModel: l.BaseModel, Creator: l.Creator, Description: l.Description,
		TrainedWords: l.TrainedWords, Previews: l.Previews, CheckedAt: l.CheckedAt,
	}
}

// civitaiLinkAnswer is the sync endpoint's answer: the record, or an empty object
// when the model turned out not to be on Civitai.
func civitaiLinkAnswer(l db.CivitaiLink) any {
	if out := civitaiLinkOutOf(l); out != nil {
		return out
	}
	return map[string]any{}
}

// civitaiInstalledModels lists InvokeAI's models with their catalogue records,
// looking up the ones that have never been looked up (or are stale, or when
// refresh is set) by hash, a few at a time. A lookup that does not finish within
// the request's context simply leaves that model unlinked until next time.
func (s *Server) civitaiInstalledModels(ctx context.Context, base string, refresh bool) ([]civitaiInstalledOut, error) {
	records, err := s.imagegen.ModelRecords(ctx, base)
	if err != nil {
		return nil, err
	}
	links, err := s.db.CivitaiLinks(ctx)
	if err != nil {
		return nil, err
	}
	// Forget models InvokeAI no longer has.
	present := map[string]bool{}
	for _, r := range records {
		present[r.Key] = true
	}
	for key := range links {
		if !present[key] {
			_ = s.db.DeleteCivitaiLink(ctx, key)
			delete(links, key)
		}
	}

	// What needs the catalogue: never looked up, looked up too long ago, or
	// everything when asked to refresh.
	var todo []imagegen.ModelRecord
	for _, r := range records {
		link, ok := links[r.Key]
		stale := !ok || refresh || time.Since(time.Unix(link.CheckedAt, 0)) > civitaiLinkStale
		if stale && blake3Of(r.Hash) != "" {
			todo = append(todo, r)
		}
	}
	if len(todo) > 0 {
		var (
			mu   sync.Mutex
			wg   sync.WaitGroup
			sem  = make(chan struct{}, 4)
			done = map[string]db.CivitaiLink{}
		)
		for _, r := range todo {
			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				break
			}
			if ctx.Err() != nil {
				break
			}
			wg.Add(1)
			go func(r imagegen.ModelRecord) {
				defer wg.Done()
				defer func() { <-sem }()
				link, err := s.civitaiLookupByHash(ctx, r, links[r.Key])
				if err != nil {
					return
				}
				mu.Lock()
				done[r.Key] = link
				mu.Unlock()
			}(r)
		}
		wg.Wait()
		for key, link := range done {
			links[key] = link
		}
	}

	out := make([]civitaiInstalledOut, 0, len(records))
	for _, r := range records {
		item := civitaiInstalledOut{Key: r.Key, Name: r.Name, Type: r.Type, Base: r.Base, HasCover: r.HasCover}
		if link, ok := links[r.Key]; ok {
			item.Civitai = civitaiLinkOutOf(link)
		}
		out = append(out, item)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Type != out[j].Type {
			return out[i].Type < out[j].Type
		}
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	return out, nil
}

// civitaiLookupByHash asks the catalogue what a file is and records the answer —
// including "nothing", so the question is not repeated for a day. A model already
// linked is only refreshed for its newest version.
func (s *Server) civitaiLookupByHash(ctx context.Context, r imagegen.ModelRecord, known db.CivitaiLink) (db.CivitaiLink, error) {
	hash := blake3Of(r.Hash)
	modelID, versionID := known.ModelID, known.VersionID
	if modelID == 0 {
		v, err := s.civitaiVersionByHash(ctx, hash)
		if errors.Is(err, errCivitaiNotFound) {
			link := db.CivitaiLink{ModelKey: r.Key, Hash: hash}
			return link, s.db.PutCivitaiLink(ctx, link)
		}
		if err != nil {
			return db.CivitaiLink{}, err
		}
		modelID, versionID = v.ModelID, v.ID
	}
	m, err := s.civitaiModel(ctx, modelID)
	if err != nil {
		if errors.Is(err, errCivitaiNotFound) {
			link := db.CivitaiLink{ModelKey: r.Key, Hash: hash}
			return link, s.db.PutCivitaiLink(ctx, link)
		}
		return db.CivitaiLink{}, err
	}
	link := civitaiLinkFrom(r.Key, hash, m, versionID)
	return link, s.db.PutCivitaiLink(ctx, link)
}
