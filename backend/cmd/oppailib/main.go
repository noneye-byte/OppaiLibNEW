// Command oppailib is the OppaiLib server: a single static binary that serves
// the API and the embedded web UI, backed by SQLite metadata and an encrypted
// blob store. All configuration comes from environment variables.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/youruser/oppailib/internal/ai"
	"github.com/youruser/oppailib/internal/api"
	"github.com/youruser/oppailib/internal/auth"
	"github.com/youruser/oppailib/internal/buildinfo"
	"github.com/youruser/oppailib/internal/config"
	"github.com/youruser/oppailib/internal/crypto"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/scraper"
	"github.com/youruser/oppailib/internal/settings"
	"github.com/youruser/oppailib/internal/storage"
)

func main() {
	cfg := config.Load()
	log := newLogger(cfg.Debug)
	// Log the build identity up front so a deployment can be verified against the
	// source (also surfaced at GET /api/health as "version").
	log.Info("OppaiLib starting", "version", buildinfo.String())

	if err := run(cfg, log); err != nil {
		log.Error("fatal", "err", err)
		os.Exit(1)
	}
}

func run(cfg *config.Config, log *slog.Logger) error {
	// 1. Resolve the master passphrase / keystore.
	ks, err := openKeystore(cfg, log)
	if err != nil {
		return err
	}

	// 2. Database + schema.
	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0o700); err != nil {
		return err
	}

	// Scratch space, pointed at the configured cache volume rather than the container's
	// own filesystem.
	//
	// ffmpeg's thumbnail and poster frames, the AI tagger's decoded stills and the CBZ
	// being built for a saved thread all go through os.CreateTemp(""), which reads
	// TMPDIR. Redirecting the variable once here moves every one of them, including the
	// ones inside packages that have no business being told about deployment layout.
	// The alternative — threading a temp directory through four packages — is the same
	// change written five times, and it would still miss whatever is added next.
	if cfg.TempDir != "" {
		if err := os.MkdirAll(cfg.TempDir, 0o700); err != nil {
			log.Warn("could not create the temp directory; falling back to the system default",
				"path", cfg.TempDir, "err", err)
		} else {
			os.Setenv("TMPDIR", cfg.TempDir) // POSIX
			os.Setenv("TMP", cfg.TempDir)    // Windows, for local development
			os.Setenv("TEMP", cfg.TempDir)
			log.Info("scratch space", "path", cfg.TempDir)
		}
	}
	database, err := db.Open(cfg.DBPath)
	if err != nil {
		return err
	}
	defer database.Close()

	// 3. First-run admin bootstrap.
	if err := bootstrapAdmin(cfg, database, log); err != nil {
		return err
	}

	// A restart signs the web UI out. Browser sessions are meant to be short-lived —
	// bounded by an idle window and by the life of the server they were issued by —
	// so a token that survived a restart would be the one thing that outlived both.
	// The Android app is exempt: it signs in once, on a device you own, and there is
	// nobody at the keyboard to re-authenticate it.
	// Worth one line at startup. Without WAL every query in the process queues on a
	// single connection, which is the difference between a library page that loads
	// while a thumbnail job runs and one that waits for it — and it is otherwise
	// completely invisible. The usual cause is the database living on a network share
	// rather than a local disk.
	if database.WAL() {
		log.Info("database ready", "journal", "wal", "concurrent_reads", true)
	} else {
		log.Warn("database could not enter WAL mode; queries are serialized on one connection",
			"hint", "put the database on local disk rather than a network share")
	}

	if n, err := database.PurgeBrowserSessions(context.Background()); err != nil {
		log.Warn("could not purge browser sessions", "err", err)
	} else if n > 0 {
		log.Info("signed out web sessions on restart", "sessions", n)
	}

	// 4. Encrypted blob store.
	store, err := storage.New(cfg.MediaDir, ks.KEK())
	if err != nil {
		return err
	}

	// 5. Scraper engine (loads user-defined YAML parsers from /config/parsers).
	parsers, err := scraper.LoadDir(filepath.Join(cfg.ConfigDir, "parsers"))
	if err != nil {
		log.Warn("loading site parsers", "err", err)
	}
	// Built-in parsers that need real code (not just CSS selectors): the X/Twitter
	// API bypass, the Hanime guest API, the itch.io game extractor, and the F95 game
	// extractor (which also signs in for members-only threads). User YAML parsers
	// still take priority for any host they match (they're earlier in the slice). The F95 login is pushed in
	// by ApplySettings below, so nothing here needs the credentials yet.
	parsers = append(parsers, &scraper.Rule34Parser{}, &scraper.TwitterParser{}, &scraper.HanimeParser{}, &scraper.ItchParser{}, &scraper.F95Parser{})
	log.Info("scraper ready", "site_parsers", len(parsers))
	sc := scraper.New(scraper.Options{
		UserAgent:     cfg.ScrapeUserAgent,
		Delay:         cfg.ScrapeDelay,
		RespectRobots: cfg.ScrapeRespectRobots,
		SiteParsers:   parsers,
	})

	// 6. AI auto-tagging manager (heuristic fallback, or ONNX if built + model).
	aiMgr := ai.NewManager(ai.Config{
		Enabled:     cfg.AIEnabled,
		ModelDir:    cfg.AIModelDir,
		Device:      cfg.AIDevice,
		VideoFrames: cfg.AIVideoFrames,
	}, store, database, log)

	// 7. Runtime settings: env vars are the defaults, rows in the settings table
	// (written from the Settings screen) override them.
	stored, err := database.AllSettings(context.Background())
	if err != nil {
		return err
	}
	cur := settings.Merge(settings.Defaults(cfg), stored)
	set := settings.NewStore(cur)

	// 8. HTTP server.
	srv := api.NewServer(cfg, database, store, sc, aiMgr, set, ks.KEK(), log)
	// Push the stored settings into the AI + scraper subsystems before serving.
	srv.ApplySettings(cur)
	// Repair missed auto-tags and backfill video posters/comic indexes.
	srv.StartBackgroundJobs()
	httpServer := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 15 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Info("OppaiLib listening", "addr", cfg.HTTPAddr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("http server", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return httpServer.Shutdown(shutdownCtx)
}

// openKeystore loads or initializes the keystore, generating a passphrase on
// first run if none was supplied.
func openKeystore(cfg *config.Config, log *slog.Logger) (*crypto.Keystore, error) {
	pass := cfg.Passphrase
	keystorePath := filepath.Join(cfg.ConfigDir, "keystore.json")
	_, statErr := os.Stat(keystorePath)
	firstRun := errors.Is(statErr, os.ErrNotExist)

	if pass == "" {
		if !firstRun {
			return nil, errors.New("OPPAI_PASSPHRASE is required (keystore already exists)")
		}
		gen, err := crypto.RandomBytes(18)
		if err != nil {
			return nil, err
		}
		pass = encodePass(gen)
		log.Warn("no passphrase supplied — generated one; SAVE THIS, it is unrecoverable",
			"passphrase", pass)
	}
	return crypto.OpenKeystore(cfg.ConfigDir, pass)
}

func bootstrapAdmin(cfg *config.Config, database *db.DB, log *slog.Logger) error {
	ctx := context.Background()
	n, err := database.CountUsers(ctx)
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	pw := cfg.AdminPassword
	if pw == "" {
		gen, err := crypto.RandomBytes(12)
		if err != nil {
			return err
		}
		pw = encodePass(gen)
		log.Warn("no admin password supplied — generated one", "username", cfg.AdminUser, "password", pw)
	}
	hash, err := auth.HashPassword(pw)
	if err != nil {
		return err
	}
	if _, err := database.CreateUser(ctx, cfg.AdminUser, hash, true); err != nil {
		return err
	}
	log.Info("created admin user", "username", cfg.AdminUser)
	return nil
}

func encodePass(b []byte) string {
	const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"
	out := make([]byte, len(b))
	for i, c := range b {
		out[i] = alphabet[int(c)%len(alphabet)]
	}
	return string(out)
}

func newLogger(debug bool) *slog.Logger {
	level := slog.LevelInfo
	if debug {
		level = slog.LevelDebug
	}
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
}
