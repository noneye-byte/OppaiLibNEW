// Package config loads OppaiLib configuration from environment variables.
package config

import (
	"os"
	"path/filepath"
	"strconv"
	"time"
)

// DefaultScrapeUserAgent is a browser-like UA: many sites only emit
// OpenGraph/Twitter card metadata (or serve any HTML at all) to recognized
// agents. Override with OPPAI_SCRAPE_USER_AGENT — or from the Settings screen —
// to advertise the tool honestly.
const DefaultScrapeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

type Config struct {
	HTTPAddr   string
	MediaDir   string
	ConfigDir  string
	DBPath     string
	Passphrase string

	// Growing data, kept out of the container's own filesystem.
	//
	// A Docker image allocation is fixed and shared with every other container on the
	// box; upload staging for a 12 GB video, ffmpeg's scratch files and the download
	// cache are none of them small, and none of them belong there. Each has its own
	// variable so an Unraid template can point it at a different share — a fast SSD
	// pool for scratch, spinning disks for the library — while the defaults keep a
	// single /cache mapping sufficient for someone who does not care.
	//
	// CacheDir holds regenerable data: upload staging, download cache. Deleting it
	// while the server is stopped costs unfinished uploads and nothing else.
	CacheDir string
	// TempDir is short-lived processing scratch: ffmpeg thumbnail and poster frames,
	// archives being built. Defaults inside CacheDir so one mapping covers both.
	TempDir string

	// Character cards, Libby's memories and the chat workspaces. They default inside
	// ConfigDir — where they have always lived, so an existing install moves nothing —
	// and are separable because they are the data an operator is most likely to want
	// on redundant storage and in a backup schedule of its own.
	CharacterDir string
	LibbyDir     string
	ChatDir      string

	AdminUser     string
	AdminPassword string

	AIEnabled  bool
	AIModelDir string
	AIDevice   string // cpu|cuda
	// AIVideoFrames is the baseline frame count sampled per video; a longer clip is
	// sampled at more (see ai.framesForDuration). 0 means "let the ai package pick"
	// (ai.DefaultVideoFrames) — config stays free of an ai import.
	AIVideoFrames int

	ScrapeDelay         time.Duration
	ScrapeUserAgent     string
	ScrapeRespectRobots bool

	// F95 login. Most f95zone.to game threads are members-only, so the scraper
	// signs in with these to fetch them. Empty leaves F95 as a public-only scrape
	// (and threads that need an account return an actionable error). The Settings
	// screen can set them at runtime; these env vars are just the startup default.
	F95Username string
	F95Password string

	// ImageGenURL is the base URL of a local Automatic1111 / SD.Next-compatible
	// image-generation WebUI (the one exposing /sdapi/v1/txt2img). Empty disables the
	// image-generation feature. It stays on the user's own network — nothing here
	// reaches a cloud service. Settable at runtime from the Settings screen.
	ImageGenURL string

	// Optional catalogue credentials. They are startup defaults; Settings can
	// replace them live and never returns the secret values to clients.
	CivitaiAPIURL string
	CivitaiAPIKey string
	Rule34UserID  string
	Rule34APIKey  string

	// ChatURL is an OpenAI-compatible local LLM endpoint (LM Studio, Ollama's
	// OpenAI bridge, llama.cpp server, etc.). ChatModel is an optional fallback;
	// when possible OppaiLib detects the model loaded by the backend itself.
	ChatURL    string
	ChatModel  string
	ChatAPIKey string

	// APKPath is the Android app the server offers for download. CI bakes the
	// built APK into the image here; pointing this at /config lets an operator drop
	// in their own build instead (a self-signed one, say, so updates install over
	// the top of an existing install).
	APKPath string

	SessionTTL time.Duration
	// WebIdleTimeout is how long a *browser* session may go unused before it is
	// rejected. It is separate from SessionTTL (the absolute lifetime) and applies
	// only to the web UI: the Android app holds a long-lived session on a device you
	// own, and logging the phone out every hour would make it unusable. Zero disables
	// the idle check.
	WebIdleTimeout time.Duration
	Debug          bool
}

func Load() *Config {
	configDir := env("OPPAI_CONFIG_DIR", "/config")
	cacheDir := env("OPPAI_CACHE_DIR", "/cache")
	return &Config{
		HTTPAddr:            env("OPPAI_HTTP_ADDR", ":8080"),
		MediaDir:            env("OPPAI_MEDIA_DIR", "/media"),
		ConfigDir:           configDir,
		CacheDir:            cacheDir,
		TempDir:             env("OPPAI_TEMP_DIR", filepath.Join(cacheDir, "tmp")),
		CharacterDir:        env("OPPAI_CHARACTER_DIR", filepath.Join(configDir, "characters")),
		LibbyDir:            env("OPPAI_LIBBY_DIR", filepath.Join(configDir, "libby")),
		ChatDir:             env("OPPAI_CHAT_DIR", filepath.Join(configDir, "chat")),
		DBPath:              env("OPPAI_DB_PATH", "/db/oppailib.sqlite"),
		Passphrase:          env("OPPAI_PASSPHRASE", ""),
		AdminUser:           env("OPPAI_ADMIN_USER", "admin"),
		AdminPassword:       env("OPPAI_ADMIN_PASSWORD", ""),
		AIEnabled:           envBool("OPPAI_AI_ENABLED", true),
		AIModelDir:          env("OPPAI_AI_MODEL_DIR", "/config/models"),
		AIDevice:            env("OPPAI_AI_DEVICE", "cpu"),
		AIVideoFrames:       envInt("OPPAI_AI_VIDEO_FRAMES", 0),
		ScrapeDelay:         time.Duration(envInt("OPPAI_SCRAPE_DELAY_MS", 1500)) * time.Millisecond,
		ScrapeUserAgent:     env("OPPAI_SCRAPE_USER_AGENT", DefaultScrapeUserAgent),
		ScrapeRespectRobots: envBool("OPPAI_SCRAPE_RESPECT_ROBOTS", true),
		F95Username:         env("OPPAI_F95_USERNAME", ""),
		F95Password:         env("OPPAI_F95_PASSWORD", ""),
		ImageGenURL:         env("OPPAI_IMAGEGEN_URL", ""),
		CivitaiAPIURL:       env("OPPAI_CIVITAI_API_URL", "https://civitai.red/api/v1"),
		CivitaiAPIKey:       env("OPPAI_CIVITAI_API_KEY", ""),
		Rule34UserID:        env("OPPAI_RULE34_USER_ID", ""),
		Rule34APIKey:        env("OPPAI_RULE34_API_KEY", ""),
		ChatURL:             env("OPPAI_CHAT_URL", ""),
		ChatModel:           env("OPPAI_CHAT_MODEL", ""),
		ChatAPIKey:          env("OPPAI_CHAT_API_KEY", ""),
		APKPath:             env("OPPAI_APK_PATH", "/app/apk/oppailib.apk"),
		SessionTTL:          time.Duration(envInt("OPPAI_SESSION_TTL_HOURS", 720)) * time.Hour,
		WebIdleTimeout:      time.Duration(envInt("OPPAI_WEB_IDLE_MINUTES", 60)) * time.Minute,
		Debug:               envBool("OPPAI_DEBUG", false),
	}
}

func env(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v, ok := os.LookupEnv(key); ok {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func envBool(key string, def bool) bool {
	if v, ok := os.LookupEnv(key); ok {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return def
}
