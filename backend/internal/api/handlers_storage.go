package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Storage mappings, usage and housekeeping.
//
// The problem this answers is specific to the deployment: an Unraid container has a
// small fixed image allocation and a set of host paths mapped into it, and when
// something runs out of room the failure surfaces as an upload that dies, a
// generation that errors, or a thumbnail that never appears — never as "the share
// holding your media is full". Worse, the operator has no way to tell *which*
// mapping is the one to expand, because from inside the container they are just
// directories.
//
// So this reports the mappings by name, with the volume each actually landed on,
// what is on it, and — when one is tight — which environment variable to repoint.
// Everything here is read from the filesystem and the database rather than
// remembered, because a mapping can be changed under a running container and a
// remembered number would then be a lie.

// storageMapping is one configurable location and the volume it resolved to.
type storageMapping struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Path  string `json:"path"`
	// Env is the variable that moves this mapping, named so a warning can tell the
	// operator what to change rather than leaving them to guess.
	Env     string `json:"env"`
	Purpose string `json:"purpose"`
	Exists  bool   `json:"exists"`
	// Writable is checked rather than assumed: a read-only bind mount is a common
	// Unraid mistake and produces failures nowhere near their cause.
	Writable   bool   `json:"writable"`
	FreeBytes  int64  `json:"freeBytes"`
	TotalBytes int64  `json:"totalBytes"`
	UsedBytes  int64  `json:"usedBytes"`
	Error      string `json:"error,omitempty"`
	// Contents is what this mapping is holding, when it is something we can measure
	// cheaply and attribute honestly.
	Contents []storageItem `json:"contents,omitempty"`
}

// storageItem is one measured category inside a mapping.
type storageItem struct {
	Label string `json:"label"`
	Bytes int64  `json:"bytes"`
	Count int64  `json:"count,omitempty"`
	Note  string `json:"note,omitempty"`
}

type storageReport struct {
	Mappings []storageMapping `json:"mappings"`
	// PendingBytes is what unfinished uploads still expect to write. It is the
	// "estimated space required for pending operations" the brief asks for, and it is
	// the only such estimate that can be made honestly — a generation's output size
	// is not known until it exists.
	PendingBytes int64 `json:"pendingBytes"`
	// Warnings name the mapping to expand, in plain words.
	Warnings []string `json:"warnings"`
	// Reclaimable is what a cleanup would free right now, by category.
	Reclaimable []storageItem `json:"reclaimable"`
	WarnPercent int           `json:"warnPercent"`
}

// handleStorage reports the mappings and their usage.
//
// Not admin-only, deliberately: "why did my upload fail" is a question the person
// uploading needs answered, and nothing here is a secret beyond the paths, which the
// existing settings endpoint already returns.
func (s *Server) handleStorage(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.storageReport(r.Context()))
}

func (s *Server) storageReport(ctx context.Context) storageReport {
	cur := s.settings.Get()
	rep := storageReport{WarnPercent: cur.StorageWarnPercent, Warnings: []string{}, Reclaimable: []storageItem{}}

	mediaBytes, mediaCount := s.libraryBytes(ctx)
	stagingBytes, _ := s.db.UploadStagingBytes(ctx)
	pending, _ := s.db.LiveUploadBytes(ctx)
	rep.PendingBytes = pending - stagingBytes
	if rep.PendingBytes < 0 {
		rep.PendingBytes = 0
	}

	defs := []struct {
		key, label, path, env, purpose string
		contents                       []storageItem
	}{
		{
			"media", "Media library", s.cfg.MediaDir, "OPPAI_MEDIA_DIR",
			"Every uploaded, imported and saved-from-generation file, encrypted. Thumbnails and video posters live here too — they are blobs in the same store, not a separate directory.",
			[]storageItem{{Label: "Library items", Bytes: mediaBytes, Count: mediaCount, Note: "original bytes, before encryption overhead"}},
		},
		{
			"db", "Database", filepath.Dir(s.cfg.DBPath), "OPPAI_DB_PATH",
			"Metadata: titles, tags, ratings, progress, upload sessions. Small, but the one thing a full volume corrupts rather than merely inconveniences.",
			[]storageItem{{Label: "SQLite file", Bytes: s.databaseBytes(), Note: "including the write-ahead log"}},
		},
		{
			"config", "Configuration", s.cfg.ConfigDir, "OPPAI_CONFIG_DIR",
			"Keystore, site parsers and saved source definitions.", nil,
		},
		{
			"characters", "Character data", s.characterDir, "OPPAI_CHARACTER_DIR",
			"Imported character cards and their artwork.", nil,
		},
		{
			"libby", "Libby's memories", s.libbyDir, "OPPAI_LIBBY_DIR",
			"Her memory store, bond, mood, outfits and identity references. Never touched by any cleanup policy.", nil,
		},
		{
			"chat", "Chat workspaces", s.chatDir, "OPPAI_CHAT_DIR",
			"Conversations, profile and the images shared into chat.", nil,
		},
		{
			"cache", "Cache", s.cfg.CacheDir, "OPPAI_CACHE_DIR",
			"Upload staging. Regenerable: everything here can be deleted while the server is stopped, at the cost of unfinished uploads.",
			[]storageItem{{Label: "Upload staging", Bytes: stagingBytes, Note: "chunks of uploads not yet finished"}},
		},
		{
			"temp", "Processing scratch", s.cfg.TempDir, "OPPAI_TEMP_DIR",
			"ffmpeg frames, archives being built, AI tagger stills. Short-lived; leftovers are reclaimed automatically.",
			[]storageItem{{Label: "Leftover scratch files", Bytes: dirBytes(s.cfg.TempDir)}},
		},
		{
			"models", "AI tagger model", s.cfg.AIModelDir, "OPPAI_AI_MODEL_DIR",
			"The local auto-tagging model. Ships inside the image by default; map it out only to use your own.", nil,
		},
	}
	if dir := strings.TrimSpace(cur.ChatModelDir); dir != "" {
		defs = append(defs, struct {
			key, label, path, env, purpose string
			contents                       []storageItem
		}{
			"textgen", "Text-generation models", dir, "Settings → Libby → model folder",
			"Where text-generation-webui keeps its models, as this container sees it. Read for the delete controls; never cleaned automatically.", nil,
		})
	}

	// Volumes are deduplicated for the warning pass only. Two mappings on one share
	// are one storage problem, and repeating the same "12 GB free" three times is how
	// a diagnostics page becomes unreadable.
	warned := map[string]bool{}
	for _, d := range defs {
		if strings.TrimSpace(d.path) == "" {
			continue
		}
		m := storageMapping{Key: d.key, Label: d.label, Path: d.path, Env: d.env, Purpose: d.purpose, Contents: d.contents}
		if fi, err := os.Stat(d.path); err == nil && fi.IsDir() {
			m.Exists = true
			m.Writable = writable(d.path)
		}
		free, total, err := diskSpace(existingAncestor(d.path))
		if err != nil {
			m.Error = "could not read this volume's free space"
		} else {
			m.FreeBytes, m.TotalBytes, m.UsedBytes = free, total, total-free
		}
		rep.Mappings = append(rep.Mappings, m)

		if !m.Exists {
			rep.Warnings = append(rep.Warnings, fmt.Sprintf(
				"%s (%s) does not exist inside the container. Add the mapping, or set %s.", d.label, d.path, d.env))
			continue
		}
		if !m.Writable {
			rep.Warnings = append(rep.Warnings, fmt.Sprintf(
				"%s (%s) is not writable. Check the mapping's mode is rw.", d.label, d.path))
		}
		if err != nil || total == 0 || cur.StorageWarnPercent <= 0 {
			continue
		}
		volKey := fmt.Sprintf("%d/%d", total, free)
		if warned[volKey] {
			continue
		}
		if free*100 < total*int64(cur.StorageWarnPercent) {
			warned[volKey] = true
			rep.Warnings = append(rep.Warnings, fmt.Sprintf(
				"%s is nearly full: %s free of %s. Expand the share behind %s, or point %s somewhere larger.",
				d.label, humanBytes(free), humanBytes(total), d.path, d.env))
		}
	}

	// A pending upload that cannot fit is worth saying before it fails, since the
	// user is watching a progress bar that is going to stop.
	if rep.PendingBytes > 0 {
		if free, _, err := diskSpace(existingAncestor(s.cfg.MediaDir)); err == nil && free < rep.PendingBytes {
			rep.Warnings = append(rep.Warnings, fmt.Sprintf(
				"Uploads in progress still need about %s, and the media volume has %s free. They will fail unless space is freed.",
				humanBytes(rep.PendingBytes), humanBytes(free)))
		}
	}

	rep.Reclaimable = append(rep.Reclaimable,
		storageItem{Label: "Abandoned upload staging", Bytes: s.abandonedUploadBytes(ctx),
			Note: fmt.Sprintf("chunks of uploads untouched for over %d hours", cur.UploadStaleHours)},
		storageItem{Label: "Leftover processing scratch", Bytes: staleFileBytes(s.cfg.TempDir, time.Duration(cur.TempStaleHours)*time.Hour),
			Note: fmt.Sprintf("scratch files older than %d hours", cur.TempStaleHours)},
	)
	return rep
}

type cleanupReq struct {
	// Categories to reclaim. Explicit rather than "clean everything", because the two
	// have different risk and the user should be able to choose one.
	Categories []string `json:"categories"`
}

// handleStorageCleanup runs the reclaim policies on demand.
//
// The same code the periodic sweep runs, exposed as a button, because "it will
// happen within six hours" is not an answer to somebody who needs the room now.
// Admin-only: it deletes files.
func (s *Server) handleStorageCleanup(w http.ResponseWriter, r *http.Request) {
	var req cleanupReq
	if r.Body != nil {
		_ = json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&req)
	}
	want := map[string]bool{}
	for _, c := range req.Categories {
		want[strings.ToLower(strings.TrimSpace(c))] = true
	}
	if len(want) == 0 {
		want["uploads"], want["temp"] = true, true
	}

	freed := int64(0)
	done := []string{}
	if want["uploads"] {
		before := s.abandonedUploadBytes(r.Context())
		s.sweepUploads()
		freed += before
		done = append(done, "abandoned upload staging")
	}
	if want["temp"] {
		freed += s.sweepTemp()
		done = append(done, "leftover processing scratch")
	}
	s.log.Info("storage cleanup", "categories", strings.Join(done, ", "), "freed", freed, "user", userFrom(r))
	writeJSON(w, http.StatusOK, map[string]any{
		"freedBytes": freed,
		"freedHuman": humanBytes(freed),
		"categories": done,
		"storage":    s.storageReport(r.Context()),
	})
}

// ── measurement ────────────────────────────────────────────────────────

// libraryBytes totals the library from the database rather than by walking the blob
// store: the sum is one indexed query, and walking a media share with a hundred
// thousand encrypted blobs on spinning disks is not something to do on a page load.
func (s *Server) libraryBytes(ctx context.Context) (bytes, count int64) {
	row := s.db.SQL().QueryRowContext(ctx, `SELECT COALESCE(SUM(size),0), COUNT(*) FROM media`)
	if err := row.Scan(&bytes, &count); err != nil {
		return 0, 0
	}
	return bytes, count
}

// databaseBytes includes the WAL, which on a busy install is not a rounding error.
func (s *Server) databaseBytes() int64 {
	var total int64
	for _, suffix := range []string{"", "-wal", "-shm"} {
		if fi, err := os.Stat(s.cfg.DBPath + suffix); err == nil {
			total += fi.Size()
		}
	}
	return total
}

func (s *Server) abandonedUploadBytes(ctx context.Context) int64 {
	cur := s.settings.Get()
	cutoff := time.Now().Add(-time.Duration(cur.UploadStaleHours) * time.Hour).Unix()
	rows, err := s.db.StaleUploads(ctx, cutoff, 0)
	if err != nil {
		return 0
	}
	var total int64
	for _, row := range rows {
		total += dirBytes(s.stagingDir(row.ID))
	}
	return total
}

// dirBytes sums a directory tree. Only ever pointed at the small, shallow ones —
// staging and scratch — never at the media share.
func dirBytes(dir string) int64 {
	if strings.TrimSpace(dir) == "" {
		return 0
	}
	var total int64
	_ = filepath.WalkDir(dir, func(_ string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil //nolint:nilerr // an unreadable entry is worth skipping, not failing over
		}
		if fi, err := d.Info(); err == nil {
			total += fi.Size()
		}
		return nil
	})
	return total
}

func staleFileBytes(dir string, age time.Duration) int64 {
	if strings.TrimSpace(dir) == "" {
		return 0
	}
	cutoff := time.Now().Add(-age)
	var total int64
	_ = filepath.WalkDir(dir, func(_ string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil //nolint:nilerr
		}
		if fi, err := d.Info(); err == nil && fi.ModTime().Before(cutoff) {
			total += fi.Size()
		}
		return nil
	})
	return total
}

// sweepTemp removes scratch files nothing is using any more, and reports what it
// freed.
//
// Age is the only safe signal available: a temp file belonging to a job still
// running has been written recently, and one older than the policy window belongs to
// a process that ended — normally by being killed, which is exactly why it is still
// there. The window is a setting so an operator whose imports genuinely run for
// hours can widen it.
func (s *Server) sweepTemp() int64 {
	dir := s.cfg.TempDir
	if strings.TrimSpace(dir) == "" {
		return 0
	}
	cutoff := time.Now().Add(-time.Duration(s.settings.Get().TempStaleHours) * time.Hour)
	var freed int64
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0
	}
	for _, e := range entries {
		fi, err := e.Info()
		if err != nil || !fi.ModTime().Before(cutoff) {
			continue
		}
		path := filepath.Join(dir, e.Name())
		size := fi.Size()
		if e.IsDir() {
			size = dirBytes(path)
		}
		if err := os.RemoveAll(path); err != nil {
			s.log.Warn("temp sweep", "path", path, "err", err)
			continue
		}
		freed += size
	}
	if freed > 0 {
		s.log.Info("reclaimed processing scratch", "bytes", freed)
	}
	return freed
}

// writable probes by creating and removing a file, which is the only answer that
// survives a read-only bind mount, a full volume and a permissions mismatch alike —
// all three of which os.Stat reports as a perfectly good directory.
func writable(dir string) bool {
	f, err := os.CreateTemp(dir, ".writable-*")
	if err != nil {
		return false
	}
	name := f.Name()
	f.Close()
	os.Remove(name)
	return true
}
