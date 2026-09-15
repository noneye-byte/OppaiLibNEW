package api

import (
	"context"
	"database/sql"
	"errors"
	"image"
	"image/color"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/models"
	"github.com/youruser/oppailib/internal/vision"
)

// Describing pictures in prose.
//
// The tagger answers "what is in this" with a word list, which is what a filter
// chip wants and what a search for a tag wants. It is not what a person wants
// under a picture, and it is not what Libby wants when asked "what's happening in
// that one" — she used to be handed six tags and asked to make a memory of them. A
// local vision model writes the sentence: who is where, doing what, in what style.
//
// The description is a field like a note: encrypted at rest, decrypted into the
// search index so "red dress balcony" finds the picture the model described that
// way, shown in the viewer, editable, and handed to Libby beside the tags when a
// picture comes up. A clip is described from the same frames the tagger samples,
// shown to the model as a sequence.
//
// It runs after tagging on import when the setting is on, because the tags make
// a small vision model markedly more accurate; and on demand for one item or for
// everything that has none.

// describeFrames is how many frames of each kind the model is shown. A vision
// model spends its window per image, so a clip gets a few, not the tagger's dozens.
func describeFrames(kind string) int {
	switch models.MediaKind(kind) {
	case models.KindVideo:
		return 6
	case models.KindGIF:
		return 4
	default:
		return 1
	}
}

// describeTimeout bounds one description: sampling a long clip and a CPU model
// thinking about six frames can take a while, but not forever.
const describeTimeout = 6 * time.Minute

// visionClient is the describer as the live settings configure it.
func (s *Server) visionClient() *vision.Client {
	set := s.settings.Get()
	return vision.New(set.VisionURL, set.VisionModel, set.VisionAPIKey)
}

// describeMedia samples, asks, stores. Returns the prose it stored.
func (s *Server) describeMedia(ctx context.Context, row *db.MediaRow) (string, error) {
	client := s.visionClient()
	if !client.Enabled() {
		return "", errors.New("no vision model is configured — add one under Settings → AI")
	}
	frames, err := s.ai.SampleFrames(ctx, row.BlobPath, row.Kind, describeFrames(row.Kind))
	if err != nil {
		return "", err
	}
	var hints []string
	if tags, err := s.db.TagsForMedia(ctx, row.ID); err == nil {
		for _, t := range tags {
			if t.Category == "general" || t.Category == "character" || t.Category == "" {
				hints = append(hints, t.Name)
			}
		}
	}
	text, err := client.Describe(ctx, vision.Request{Frames: frames, Kind: row.Kind, Tags: hints})
	if err != nil {
		return "", err
	}
	if err := s.storeDescription(ctx, row.ID, text); err != nil {
		return "", err
	}
	return text, nil
}

// storeDescription writes prose for an item, encrypted; empty clears it. The
// index is told either way, since the words a row can be found by just changed.
func (s *Server) storeDescription(ctx context.Context, id int64, text string) error {
	var enc []byte
	if text != "" {
		var err error
		if enc, err = crypto.SealBytes(s.kek, []byte(text), []byte("description")); err != nil {
			return err
		}
	}
	if err := s.db.SetDescription(ctx, id, enc); err != nil {
		return err
	}
	s.touchLibraryIndex()
	return nil
}

// mediaDescription reads one item's prose, "" when it has none.
func (s *Server) mediaDescription(ctx context.Context, id int64) string {
	blob, err := s.db.Description(ctx, id)
	if err != nil {
		return ""
	}
	return s.decrypt(blob, "description")
}

// ── the background workers ──────────────────────────────────────────────────

// describeQueue serializes descriptions: a vision model on a CPU box is one job
// at a time, and two clips being sampled beside it would only slow each other.
type describeQueue struct {
	mu       sync.Mutex
	inFlight map[int64]bool
	sem      chan struct{}
	// backfilling is the one loop that walks everything undescribed; a second
	// request while it runs is a no-op rather than a second loop.
	backfilling bool
	stop        bool
}

func newDescribeQueue() *describeQueue {
	return &describeQueue{inFlight: map[int64]bool{}, sem: make(chan struct{}, 1)}
}

// describeMediaAsync describes one item in the background when a vision model is
// configured, skipping items that already have prose. The ingest path calls it
// from the tagger's completion hook, so the tags are there to steer the model.
func (s *Server) describeMediaAsync(id int64, force bool) {
	set := s.settings.Get()
	if !set.VisionEnabled {
		return
	}
	q := s.describe
	q.mu.Lock()
	if q.inFlight[id] {
		q.mu.Unlock()
		return
	}
	q.inFlight[id] = true
	q.mu.Unlock()
	go func() {
		defer func() {
			q.mu.Lock()
			delete(q.inFlight, id)
			q.mu.Unlock()
		}()
		q.sem <- struct{}{}
		defer func() { <-q.sem }()
		ctx, cancel := context.WithTimeout(context.Background(), describeTimeout)
		defer cancel()
		row, err := s.db.GetMedia(ctx, id)
		if err != nil {
			return
		}
		switch models.MediaKind(row.Kind) {
		case models.KindImage, models.KindGIF, models.KindVideo:
		default:
			return
		}
		if !force {
			if blob, err := s.db.Description(ctx, id); err == nil && len(blob) > 0 {
				return
			}
		}
		if _, err := s.describeMedia(ctx, row); err != nil {
			s.log.Warn("vision: describe failed", "media", id, "err", err)
		}
	}()
}

// onTaggedDescribe is the tagger's completion hook: a freshly tagged picture is
// the moment to describe it, when the setting asks for that.
func (s *Server) onTaggedDescribe(id int64) {
	if set := s.settings.Get(); set.VisionEnabled && set.VisionAuto {
		s.describeMediaAsync(id, false)
	}
}

// ingestDescribe is the ingest path when the tagger will not run — disabled, or
// auto-tag off — so a description does not depend on a tagger being installed.
func (s *Server) ingestDescribe(id int64) {
	set := s.settings.Get()
	if !set.VisionEnabled || !set.VisionAuto {
		return
	}
	if o := s.ai.Options(); o.Enabled && o.AutoTag {
		return // the tagger's hook will do it, with tags in hand
	}
	s.describeMediaAsync(id, false)
}

// startDescribeBackfill walks everything undescribed, one at a time, until it runs
// out or is stopped. Returns false when a walk is already running.
func (s *Server) startDescribeBackfill() bool {
	q := s.describe
	q.mu.Lock()
	if q.backfilling {
		q.mu.Unlock()
		return false
	}
	q.backfilling, q.stop = true, false
	q.mu.Unlock()
	go func() {
		defer func() {
			q.mu.Lock()
			q.backfilling = false
			q.mu.Unlock()
		}()
		// Items that failed are remembered so the walk moves past them rather than
		// asking the model the same unanswerable question until the box is switched
		// off; the log has each reason.
		failed := map[int64]bool{}
		for {
			q.mu.Lock()
			stopped := q.stop
			q.mu.Unlock()
			if stopped || !s.settings.Get().VisionEnabled {
				return
			}
			rows, err := s.db.Undescribed(context.Background(), 200)
			if err != nil {
				return
			}
			progressed := false
			for _, row := range rows {
				if failed[row.ID] {
					continue
				}
				q.mu.Lock()
				stopped := q.stop
				q.mu.Unlock()
				if stopped {
					return
				}
				progressed = true
				q.sem <- struct{}{}
				ctx, cancel := context.WithTimeout(context.Background(), describeTimeout)
				_, err := s.describeMedia(ctx, row)
				cancel()
				<-q.sem
				if err != nil {
					s.log.Warn("vision: backfill describe failed", "media", row.ID, "err", err)
					failed[row.ID] = true
				}
			}
			if !progressed {
				return
			}
		}
	}()
	return true
}

func (s *Server) stopDescribeBackfill() {
	q := s.describe
	q.mu.Lock()
	q.stop = true
	q.mu.Unlock()
}

// ── endpoints ───────────────────────────────────────────────────────────────

// handleDescribeMedia describes one item now and returns the prose. Slow by
// nature — a CPU vision model — so the client shows a spinner.
func (s *Server) handleDescribeMedia(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad id")
		return
	}
	row, err := s.db.GetMedia(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	switch models.MediaKind(row.Kind) {
	case models.KindImage, models.KindGIF, models.KindVideo:
	default:
		writeErr(w, http.StatusBadRequest, "only pictures, animations and videos can be described")
		return
	}
	if !s.settings.Get().VisionEnabled {
		writeErr(w, http.StatusServiceUnavailable, "no vision model is configured — add one under Settings → AI")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), describeTimeout)
	defer cancel()
	s.describe.sem <- struct{}{}
	text, err := s.describeMedia(ctx, row)
	<-s.describe.sem
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"description": text})
}

// handleDescribeStatus is what the AI settings page shows: whether a model is
// set, how many items still have no prose, and whether the backfill is walking.
func (s *Server) handleDescribeStatus(w http.ResponseWriter, r *http.Request) {
	set := s.settings.Get()
	pending, _ := s.db.CountUndescribed(r.Context())
	s.describe.mu.Lock()
	running := s.describe.backfilling
	s.describe.mu.Unlock()
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled":     set.VisionEnabled,
		"model":       set.VisionModel,
		"auto":        set.VisionAuto,
		"undescribed": pending,
		"backfilling": running,
	})
}

func (s *Server) handleDescribeBackfill(w http.ResponseWriter, r *http.Request) {
	if !s.settings.Get().VisionEnabled {
		writeErr(w, http.StatusServiceUnavailable, "no vision model is configured")
		return
	}
	started := s.startDescribeBackfill()
	writeJSON(w, http.StatusOK, map[string]any{"started": started})
}

func (s *Server) handleDescribeBackfillStop(w http.ResponseWriter, _ *http.Request) {
	s.stopDescribeBackfill()
	w.WriteHeader(http.StatusNoContent)
}

// handleDescribeProbe checks that the configured endpoint answers with a vision
// model, using a tiny generated frame, so a wrong URL or a text-only model is found
// out on the settings page rather than on the first import.
func (s *Server) handleDescribeProbe(w http.ResponseWriter, r *http.Request) {
	client := s.visionClient()
	if !client.Enabled() {
		writeErr(w, http.StatusBadRequest, "no vision model is configured")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Minute)
	defer cancel()
	text, err := client.Describe(ctx, vision.Request{Frames: []image.Image{probeFrame()}, Kind: "image"})
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "description": text})
}

// probeFrame is a small two-tone picture: enough for a vision model to say
// something about, and nothing from the library.
func probeFrame() image.Image {
	img := image.NewRGBA(image.Rect(0, 0, 256, 256))
	for y := 0; y < 256; y++ {
		for x := 0; x < 256; x++ {
			if (x/32+y/32)%2 == 0 {
				img.Set(x, y, color.RGBA{230, 120, 40, 255})
			} else {
				img.Set(x, y, color.RGBA{30, 30, 60, 255})
			}
		}
	}
	return img
}
