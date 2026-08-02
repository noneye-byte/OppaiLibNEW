// Package api wires the HTTP router, middleware and handlers.
package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/ai"
	"github.com/youruser/oppailib/internal/config"
	"github.com/youruser/oppailib/internal/db"
	"github.com/youruser/oppailib/internal/imagegen"
	"github.com/youruser/oppailib/internal/obs"
	"github.com/youruser/oppailib/internal/scraper"
	"github.com/youruser/oppailib/internal/settings"
	"github.com/youruser/oppailib/internal/sources"
	"github.com/youruser/oppailib/internal/storage"
	oweb "github.com/youruser/oppailib/internal/web"
)

type Server struct {
	cfg      *config.Config
	db       *db.DB
	store    *storage.Store
	scraper  *scraper.Engine
	sources  *sources.Registry
	ai       *ai.Manager
	settings *settings.Store
	kek      []byte
	log      *slog.Logger

	// Request counters and latencies. Deliberately the *scraper's* registry rather
	// than a second one: the question this exists to answer is "did that request
	// spend its time in our handler or waiting on someone else's site", and two
	// registries would put the two halves of that answer on two different pages.
	metrics *obs.Registry

	// When this process came up, so Libby can answer "how long have you been up?".
	startedAt time.Time

	// Image generation. The client is stateless (the A1111 URL is read from settings
	// per call); genCache holds just-generated images in memory so they can be
	// previewed and saved without ever touching disk — the "don't save unless asked"
	// rule. Model and LoRA cover art always lives in InvokeAI itself.
	imagegen     *imagegen.Client
	genCache     *genCache
	characterDir string // encrypted character-library records + thumbnails
	libbyDir     string // encrypted Libby outfit records + emotion art
	chatDir      string // encrypted per-user chat workspaces + tagged character images
	chatMu       sync.Mutex

	// Staging for resumable uploads: one directory per session, holding the chunks
	// received so far. Under the cache root rather than anywhere durable — these are
	// bytes in transit, and the sweeper is allowed to delete an abandoned one.
	// See handlers_uploads.go.
	uploadDir string

	// Model load/unload is serialized process-wide. Two concurrent loads against
	// text-generation-webui race each other and can leave the backend with the
	// API alive but no model resident, so only one mutation is ever in flight.
	modelMu sync.Mutex

	thumbSem  chan struct{} // bounds concurrent ffmpeg thumbnail jobs
	thumbWarn sync.Once     // warn once if ffmpeg is missing

	login *loginGuard // rate-limits + bounds the cost of the login endpoint

	// In-flight WebAuthn challenges. In memory rather than the database: a challenge
	// lives for one exchange over a few seconds and is worthless afterwards, so
	// persisting it would add a write per login attempt for nothing — and a restart
	// invalidating in-flight ceremonies is correct rather than a limitation.
	// See handlers_passkeys.go.
	ceremonies *ceremonyStore

	// Resolving a remote item costs a throttled round trip to someone else's site,
	// so the answers are cached. A gallery's page list is immutable, so it keeps for
	// a while; a thread's comments are not, so they keep only long enough to absorb
	// a double-tap. See resolveCache.
	pageCache    *resolveCache[[]string]
	commentCache *resolveCache[[]sources.Comment]
	// One page of a feed. This is the tab's first paint: opening Browse, switching
	// source, or coming back from a comic all ask for the same listing, and each ask
	// was a fresh throttled fetch and parse of someone else's index page. A feed
	// moves on the order of minutes, so a short TTL costs nothing in freshness and
	// turns a revisit into an instant paint. See handleBrowseSource.
	listCache *resolveCache[*sources.Listing]
	// Links the user has handed to Libby, previewed. A chat turn reads this and never
	// fetches, so a message cannot make the server hit an address — the preview
	// endpoint is the only thing that goes out. See handlers_libby_links.go.
	linkCache *resolveCache[sharedLink]
	// Site favicons for the Browse tab's source tabs. Fetched through the server (the
	// page's CSP forbids third-party image origins, and a browser shouldn't be opening
	// connections to these hosts just to draw a tab icon) and kept for a day, because
	// a favicon is about as immutable as anything on the web.
	iconCache *resolveCache[favicon]

	// The Discord poll loop, when the connection is on. nil when it is not; replaced
	// wholesale whenever the settings change. See discord_relay.go.
	discord *discordRuntime
}

const (
	sourcePagesTTL    = 10 * time.Minute
	sourceCommentsTTL = 30 * time.Second
	// A feed's front page turns over in minutes, not seconds. Two is long enough to
	// cover the back-and-forth of actually browsing — open an item, return to the
	// grid, scroll, open another — without ever showing a listing that feels stale.
	sourceListingTTL = 2 * time.Minute
)

func NewServer(cfg *config.Config, database *db.DB, store *storage.Store, sc *scraper.Engine, aiMgr *ai.Manager, set *settings.Store, kek []byte, log *slog.Logger) *Server {
	// Cap thumbnail workers well below core count: ffmpeg is CPU-heavy and this is
	// background work that must not starve request handling on a lean Unraid box.
	workers := runtime.GOMAXPROCS(0) / 2
	if workers < 1 {
		workers = 1
	}
	if workers > 4 {
		workers = 4
	}
	// One registry for the whole process. The engine owns it because it is
	// constructed first; a server built without an engine (some tests) gets its own
	// so nothing has to nil-check it.
	metrics := obs.NewRegistry()
	if sc != nil {
		metrics = sc.Metrics()
	}
	s := &Server{
		cfg: cfg, db: database, store: store, scraper: sc, ai: aiMgr, settings: set,
		metrics: metrics,
		// Built-in source definitions are embedded; /config/sources overrides them, so
		// a site that restyles can be repaired without a rebuild.
		sources:    sources.NewRegistry(scraperFetcher{e: sc}, filepath.Join(cfg.ConfigDir, "sources"), log),
		kek:        kek,
		log:        log,
		startedAt:  time.Now(),
		thumbSem:   make(chan struct{}, workers),
		login:      newLoginGuard(),
		ceremonies: newCeremonyStore(),

		imagegen:     imagegen.New(),
		genCache:     newGenCache(),
		characterDir: dirOr(cfg.CharacterDir, filepath.Join(cfg.ConfigDir, "characters")),
		libbyDir:     dirOr(cfg.LibbyDir, filepath.Join(cfg.ConfigDir, "libby")),
		chatDir:      dirOr(cfg.ChatDir, filepath.Join(cfg.ConfigDir, "chat")),
		uploadDir:    filepath.Join(dirOr(cfg.CacheDir, filepath.Join(cfg.ConfigDir, "cache")), "uploads"),

		pageCache:    newResolveCache[[]string](sourcePagesTTL),
		commentCache: newResolveCache[[]sources.Comment](sourceCommentsTTL),
		listCache:    newResolveCache[*sources.Listing](sourceListingTTL),
		linkCache:    newResolveCache[sharedLink](sharedLinkTTL),
		iconCache:    newResolveCache[favicon](faviconTTL),
	}
	// A picture that has just been tagged is the moment to ask whether it is one of
	// Libby. Registered here rather than inside the tagger because who Libby is, and
	// what she looks like, is nothing the ai package should have to know.
	// See handlers_libby_identity.go.
	aiMgr.SetOnTagged(s.recognizeLibbyMedia)
	return s
}

// dirOr falls back when a path is unset, which is what keeps every test that builds
// a Config by hand — and every install that predates these variables — working
// unchanged.
func dirOr(configured, fallback string) string {
	if strings.TrimSpace(configured) == "" {
		return fallback
	}
	return configured
}

// StartBackgroundJobs kicks off one-time startup repair work. Call once after
// the server is constructed.
func (s *Server) StartBackgroundJobs() {
	go s.backfillAutoTags()
	go s.backfillThumbnails()
	go s.backfillImageThumbs()
	go s.backfillComics()
	// Only actually starts anything when a Discord connection is configured and on.
	// See discord_relay.go.
	go s.startDiscord()
	// Abandoned upload staging is the one thing here that grows without bound on the
	// cache volume, so it is swept at startup and then periodically. See
	// handlers_uploads.go.
	go func() {
		s.sweepUploads()
		for range time.Tick(6 * time.Hour) {
			s.sweepUploads()
		}
	}()
}

// Handler builds the full http.Handler (API + static web UI).
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// Health / readiness. The body is trimmed to a bare "ok" under incognito, where
	// naming the product and build to an unauthenticated caller would give the whole
	// disguise away in one GET. See healthBody.
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, s.healthBody())
	})

	// Auth (public).
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("POST /api/auth/logout", s.requireAuth(s.handleLogout))
	// /me is the session *probe*, so it must not count as activity — the web client
	// polls it to notice a session that has been invalidated, and a poll that kept
	// the session alive would mean an idle tab never idles out. See requireSession.
	mux.HandleFunc("GET /api/auth/me", s.requireSession(s.handleMe, false))
	mux.HandleFunc("POST /api/auth/password", s.requireAuth(s.handleChangePassword))

	// Passkeys (WebAuthn). See handlers_passkeys.go.
	//
	// The two login endpoints are public by necessity — they are how you sign in — and
	// carry the same rate limit as password login. Registration and management require
	// an existing session: a passkey is added to an account you are already in, rather
	// than being a second way to create one. Password sign-in stays exactly as it was,
	// which the brief asks for and which is also the recovery path when an
	// authenticator is lost.
	mux.HandleFunc("POST /api/auth/passkey/login/begin", s.handleBeginPasskeyLogin)
	mux.HandleFunc("POST /api/auth/passkey/login/finish", s.handleFinishPasskeyLogin)
	mux.HandleFunc("GET /api/auth/passkeys", s.requireAuth(s.handleListPasskeys))
	mux.HandleFunc("POST /api/auth/passkeys/begin", s.requireAuth(s.handleBeginPasskeyRegistration))
	mux.HandleFunc("POST /api/auth/passkeys/finish", s.requireAuth(s.handleFinishPasskeyRegistration))
	mux.HandleFunc("PATCH /api/auth/passkeys/{id}", s.requireAuth(s.handleRenamePasskey))
	mux.HandleFunc("POST /api/auth/passkeys/{id}/revoke", s.requireAuth(s.handleRevokePasskey))

	// Settings + library stats (protected; writing settings is admin-only).
	mux.HandleFunc("GET /api/settings", s.requireAuth(s.handleGetSettings))
	mux.HandleFunc("PUT /api/settings", s.requireAuth(s.requireAdmin(s.handlePutSettings)))
	mux.HandleFunc("GET /api/stats", s.requireAuth(s.handleStats))

	// Performance diagnostics. Admin-only: the snapshot names every route and every
	// third-party host this install talks to. See observability.go.
	mux.HandleFunc("GET /api/diagnostics", s.requireAuth(s.requireAdmin(s.handleDiagnostics)))
	mux.HandleFunc("POST /api/diagnostics/reset", s.requireAuth(s.requireAdmin(s.handleResetDiagnostics)))

	// Media (protected).
	mux.HandleFunc("GET /api/media", s.requireAuth(s.handleListMedia))
	mux.HandleFunc("POST /api/media", s.requireAuth(s.handleUploadMedia))
	mux.HandleFunc("POST /api/media/bulk", s.requireAuth(s.handleBulkMedia))

	// Resumable uploads. POST /api/media stays exactly as it was — a picture is one
	// request and should remain one — and this is the path a large file takes.
	// See handlers_uploads.go.
	mux.HandleFunc("GET /api/uploads", s.requireAuth(s.handleListUploads))
	mux.HandleFunc("POST /api/uploads", s.requireAuth(s.handleCreateUpload))
	mux.HandleFunc("GET /api/uploads/{id}", s.requireAuth(s.handleGetUpload))
	mux.HandleFunc("PUT /api/uploads/{id}/chunk/{idx}", s.requireAuth(s.handlePutUploadChunk))
	mux.HandleFunc("POST /api/uploads/{id}/complete", s.requireAuth(s.handleCompleteUpload))
	mux.HandleFunc("DELETE /api/uploads/{id}", s.requireAuth(s.handleCancelUpload))

	// Storage mappings, usage and cleanup. See handlers_storage.go.
	mux.HandleFunc("GET /api/storage", s.requireAuth(s.handleStorage))
	mux.HandleFunc("POST /api/storage/cleanup", s.requireAuth(s.requireAdmin(s.handleStorageCleanup)))
	mux.HandleFunc("GET /api/media/{id}", s.requireAuth(s.handleGetMedia))
	mux.HandleFunc("PATCH /api/media/{id}", s.requireAuth(s.handleUpdateMedia))
	mux.HandleFunc("DELETE /api/media/{id}", s.requireAuth(s.handleDeleteMedia))
	mux.HandleFunc("GET /api/media/{id}/stream", s.requireAuth(s.handleStreamMedia))
	mux.HandleFunc("GET /api/media/{id}/thumb", s.requireAuth(s.handleThumb))
	mux.HandleFunc("GET /api/media/{id}/frames", s.requireAuth(s.handlePosterFrames))
	mux.HandleFunc("PUT /api/media/{id}/thumb", s.requireAuth(s.handleSetPoster))
	mux.HandleFunc("POST /api/media/{id}/autotag", s.requireAuth(s.handleAutotag))
	mux.HandleFunc("POST /api/ai/scan-image", s.requireAuth(s.handleScanImage))

	// Comics: read page-by-page out of the archive instead of downloading it.
	mux.HandleFunc("GET /api/media/{id}/comic", s.requireAuth(s.handleComicInfo))
	mux.HandleFunc("GET /api/media/{id}/page/{n}", s.requireAuth(s.handleComicPage))

	// Scraper (protected).
	// Remote sources: browse and stream a catalogue without importing anything.
	// Only /save crosses over into the library.
	mux.HandleFunc("GET /api/sources", s.requireAuth(s.handleListSources))
	mux.HandleFunc("GET /api/sources/{id}/browse", s.requireAuth(s.handleBrowseSource))
	mux.HandleFunc("GET /api/sources/{id}/item/{item}/pages", s.requireAuth(s.handleSourcePages))
	// The conversation an item was posted in — a 4chan thread's comments.
	mux.HandleFunc("GET /api/sources/{id}/item/{item}/comments", s.requireAuth(s.handleSourceComments))
	mux.HandleFunc("GET /api/sources/stream", s.requireAuth(s.handleSourceStream))
	mux.HandleFunc("POST /api/sources/{id}/save", s.requireAuth(s.handleSourceSave))
	// The site's own favicon, fetched by the server. See handlers_source_admin.go.
	mux.HandleFunc("GET /api/sources/{id}/icon", s.requireAuth(s.handleSourceIcon))
	// Adding a browsable site. Admin-only: a saved definition widens the streaming
	// proxy's host allowlist.
	mux.HandleFunc("POST /api/sources/analyze", s.requireAuth(s.requireAdmin(s.handleAnalyzeSource)))
	mux.HandleFunc("POST /api/sources", s.requireAuth(s.requireAdmin(s.handleSaveSource)))
	mux.HandleFunc("DELETE /api/sources/{id}", s.requireAuth(s.requireAdmin(s.handleDeleteSource)))

	// The Android app, served from the box that holds the library it talks to.
	mux.HandleFunc("GET /api/apk/info", s.requireAuth(s.handleAPKInfo))
	mux.HandleFunc("GET /api/apk", s.requireAuth(s.handleAPKDownload))

	// Image-generation controls are protected. Generated images live only in memory
	// until explicitly saved; the opaque preview read capability is the one exception so
	// completed outfit states remain visible after a web login expires.
	mux.HandleFunc("GET /api/imagegen/status", s.requireAuth(s.handleImageGenStatus))
	mux.HandleFunc("POST /api/imagegen/prompt", s.requireAuth(s.handleImageGenPrompt))
	mux.HandleFunc("POST /api/imagegen/generate", s.requireAuth(s.handleImageGenGenerate))
	// Preview ids are 128-bit random capabilities and expire from memory. Keeping the
	// read route independent of the login lets a long outfit run remain visible if the
	// web session expires; mutation and saving still require authentication.
	mux.HandleFunc("GET /api/imagegen/preview/{id}", s.handleImageGenPreview)
	mux.HandleFunc("PUT /api/imagegen/preview/{id}", s.requireAuth(s.handleReplaceImageGenPreview))
	mux.HandleFunc("DELETE /api/imagegen/preview/{id}", s.requireAuth(s.handleDeleteImageGenPreview))
	mux.HandleFunc("POST /api/imagegen/save", s.requireAuth(s.handleImageGenSave))
	mux.HandleFunc("GET /api/imagegen/model-thumb", s.requireAuth(s.handleGetModelThumb))
	mux.HandleFunc("PUT /api/imagegen/model-thumb", s.requireAuth(s.handleSetModelThumb))
	mux.HandleFunc("GET /api/imagegen/lora-thumb", s.requireAuth(s.handleGetLoraThumb))
	mux.HandleFunc("PUT /api/imagegen/lora-thumb", s.requireAuth(s.handleSetLoraThumb))
	mux.HandleFunc("GET /api/imagegen/tags", s.requireAuth(s.handleBooruTags))
	// The character library: reusable prompt fragments with a name and a face. Not
	// media items — they live encrypted beside the config, like model thumbnails.
	mux.HandleFunc("GET /api/imagegen/characters", s.requireAuth(s.handleListCharacters))
	mux.HandleFunc("POST /api/imagegen/characters", s.requireAuth(s.handleSaveCharacter))
	mux.HandleFunc("DELETE /api/imagegen/characters/{id}", s.requireAuth(s.handleDeleteCharacter))
	mux.HandleFunc("GET /api/imagegen/characters/{id}/thumb", s.requireAuth(s.handleCharacterThumb))
	// Model metadata: reads and writes InvokeAI's own model records, so edits here
	// are the same edits its model manager would make.
	mux.HandleFunc("GET /api/imagegen/model", s.requireAuth(s.handleGetModelMeta))
	mux.HandleFunc("PATCH /api/imagegen/model", s.requireAuth(s.handlePatchModelMeta))
	// The InvokeAI gallery: browse the generator's own boards and images, stream
	// them through the server, delete from them, or copy one into the library.
	mux.HandleFunc("GET /api/imagegen/gallery/boards", s.requireAuth(s.handleGalleryBoards))
	mux.HandleFunc("POST /api/imagegen/gallery/boards", s.requireAuth(s.handleGalleryCreateBoard))
	mux.HandleFunc("DELETE /api/imagegen/gallery/boards/{id}", s.requireAuth(s.handleGalleryDeleteBoard))
	mux.HandleFunc("GET /api/imagegen/gallery/images", s.requireAuth(s.handleGalleryImages))
	mux.HandleFunc("GET /api/imagegen/gallery/image/{name}", s.requireAuth(s.handleGalleryFull))
	mux.HandleFunc("GET /api/imagegen/gallery/image/{name}/thumb", s.requireAuth(s.handleGalleryThumb))
	mux.HandleFunc("GET /api/imagegen/gallery/image/{name}/metadata", s.requireAuth(s.handleGalleryMetadata))
	mux.HandleFunc("DELETE /api/imagegen/gallery/image/{name}", s.requireAuth(s.handleGalleryDelete))
	mux.HandleFunc("POST /api/imagegen/gallery/delete", s.requireAuth(s.handleGalleryDeleteBatch))
	mux.HandleFunc("POST /api/imagegen/gallery/board", s.requireAuth(s.handleGalleryAddToBoard))
	mux.HandleFunc("POST /api/imagegen/gallery/save", s.requireAuth(s.handleGallerySave))
	// Civitai catalogue (via the civitai.red mirror), proxied like every other
	// remote source; install hands a download URL to InvokeAI.
	mux.HandleFunc("GET /api/imagegen/civitai/search", s.requireAuth(s.handleCivitaiSearch))
	mux.HandleFunc("GET /api/imagegen/civitai/categories", s.requireAuth(s.handleCivitaiCategories))
	mux.HandleFunc("GET /api/imagegen/civitai/image", s.requireAuth(s.handleCivitaiImage))
	mux.HandleFunc("POST /api/imagegen/civitai/install", s.requireAuth(s.handleCivitaiInstall))
	mux.HandleFunc("GET /api/imagegen/civitai/installs", s.requireAuth(s.handleCivitaiInstalls))

	// Libby outfits: user-made wardrobes for the mascot, one image per emotion.
	// Which outfit is worn is a per-device choice; the server only stores the art.
	// What Libby knows about the library and the box she runs on. Read by the web
	// client so her built-in replies can answer library questions with no model loaded.
	mux.HandleFunc("GET /api/libby/context", s.requireAuth(s.handleLibbyContext))
	// Performs one action the user has approved in the chat. Nothing reaches here
	// without an explicit press; see handlers_libby_actions.go.
	mux.HandleFunc("POST /api/libby/act", s.requireAuth(s.handleLibbyAct))
	// Libby's memory: the durable facts she keeps about the user between conversations.
	// Written from her own replies on the chat path; these endpoints only read and clear
	// it, for the settings screen. See handlers_libby_memory.go.
	mux.HandleFunc("GET /api/libby/memory", s.requireAuth(s.handleGetLibbyMemory))
	// Adding and editing are the user's side of a store she otherwise writes herself: a
	// memory she got wrong can be corrected, and one that matters can be pinned so it is
	// never forgotten. See handlers_libby_memory.go.
	mux.HandleFunc("POST /api/libby/memory", s.requireAuth(s.handleAddLibbyMemory))
	mux.HandleFunc("PATCH /api/libby/memory/{id}", s.requireAuth(s.handleUpdateLibbyMemory))
	mux.HandleFunc("DELETE /api/libby/memory", s.requireAuth(s.handleClearLibbyMemory))
	mux.HandleFunc("DELETE /api/libby/memory/{id}", s.requireAuth(s.handleForgetLibbyMemory))
	// Libby's own wants: her standing desires, kept the same way as her memory and
	// written from her own replies on the chat path. These endpoints only read and clear
	// them, for the settings screen. See handlers_libby_wants.go.
	mux.HandleFunc("GET /api/libby/wants", s.requireAuth(s.handleGetLibbyWants))
	mux.HandleFunc("DELETE /api/libby/wants", s.requireAuth(s.handleClearLibbyWants))
	mux.HandleFunc("DELETE /api/libby/wants/{id}", s.requireAuth(s.handleForgetLibbyWant))
	// Libby's bond: where the two of you left off — time since last, carried mood and
	// heat, closeness, pet name. Written from her own turns on the chat path; GET seeds the
	// opening sprite and the settings screen, DELETE resets it. See handlers_libby_bond.go.
	// When she is allowed to speak first: quiet hours, frequency, back-off when ignored, and
	// the record of what triggered each unprompted message. The client owns the timer, the
	// server owns the decision. See handlers_libby_auto.go.
	mux.HandleFunc("GET /api/libby/auto", s.requireAuth(s.handleGetLibbyAuto))
	mux.HandleFunc("PUT /api/libby/auto", s.requireAuth(s.handlePutLibbyAutoSettings))
	mux.HandleFunc("POST /api/libby/auto/check", s.requireAuth(s.handleCheckLibbyAuto))
	mux.HandleFunc("POST /api/libby/auto/sent", s.requireAuth(s.handleRecordLibbyAuto))
	mux.HandleFunc("POST /api/libby/auto/answered", s.requireAuth(s.handleAnswerLibbyAuto))

	// Libby on Discord. The token is write-only from a client's point of view: it goes
	// in through connect and is never returned by anything. See handlers_discord.go.
	mux.HandleFunc("GET /api/discord", s.requireAuth(s.handleGetDiscord))
	mux.HandleFunc("POST /api/discord/connect", s.requireAuth(s.handleConnectDiscord))
	mux.HandleFunc("POST /api/discord/disconnect", s.requireAuth(s.handleDisconnectDiscord))
	mux.HandleFunc("PUT /api/discord/settings", s.requireAuth(s.handlePutDiscordSettings))
	mux.HandleFunc("GET /api/discord/places", s.requireAuth(s.handleDiscordPlaces))
	mux.HandleFunc("POST /api/discord/say", s.requireAuth(s.handleDiscordSay))

	// A link the user wants to show her. This is the only path that fetches; a chat turn
	// can only use a link that was previewed here first. See handlers_libby_links.go.
	mux.HandleFunc("POST /api/libby/link", s.requireAuth(s.handleLibbyLink))

	// Which pictures in the library are of her. The tag itself lives on the media row;
	// these endpoints own the settings, the manual verdicts, and the reference set.
	// See handlers_libby_identity.go.
	mux.HandleFunc("GET /api/libby/identity", s.requireAuth(s.handleGetLibbyIdentity))
	mux.HandleFunc("PUT /api/libby/identity", s.requireAuth(s.handlePutLibbyIdentity))
	mux.HandleFunc("POST /api/libby/identity/mark", s.requireAuth(s.handleMarkLibbyIdentity))
	mux.HandleFunc("POST /api/libby/identity/scan", s.requireAuth(s.handleScanLibbyIdentity))

	mux.HandleFunc("GET /api/libby/bond", s.requireAuth(s.handleGetLibbyBond))
	mux.HandleFunc("DELETE /api/libby/bond", s.requireAuth(s.handleResetLibbyBond))
	mux.HandleFunc("GET /api/libby/outfits", s.requireAuth(s.handleListLibbyOutfits))
	mux.HandleFunc("POST /api/libby/outfits", s.requireAuth(s.handleSaveLibbyOutfit))
	mux.HandleFunc("DELETE /api/libby/outfits/{id}", s.requireAuth(s.handleDeleteLibbyOutfit))
	mux.HandleFunc("GET /api/libby/outfits/{id}/thumb", s.requireAuth(s.handleGetLibbyOutfitThumb))
	mux.HandleFunc("PUT /api/libby/outfits/{id}/thumb", s.requireAuth(s.handleSetLibbyOutfitThumb))
	mux.HandleFunc("DELETE /api/libby/outfits/{id}/thumb", s.requireAuth(s.handleDeleteLibbyOutfitThumb))
	mux.HandleFunc("GET /api/libby/outfits/{id}/emotions/{emotion}", s.requireAuth(s.handleGetLibbyEmotion))
	mux.HandleFunc("PUT /api/libby/outfits/{id}/emotions/{emotion}", s.requireAuth(s.handleSetLibbyEmotion))
	mux.HandleFunc("DELETE /api/libby/outfits/{id}/emotions/{emotion}", s.requireAuth(s.handleDeleteLibbyEmotion))
	// Work in progress: generated squares that are not finished sprites yet. Persisted
	// on disk so a wardrobe survives a restart, an expired preview and a closed tab.
	mux.HandleFunc("GET /api/libby/outfits/{id}/wip", s.requireAuth(s.handleListLibbyOutfitWIP))
	mux.HandleFunc("GET /api/libby/outfits/{id}/wip/{emotion}", s.requireAuth(s.handleGetLibbyOutfitWIPImage))
	mux.HandleFunc("PUT /api/libby/outfits/{id}/wip/{emotion}", s.requireAuth(s.handlePutLibbyOutfitWIP))
	mux.HandleFunc("DELETE /api/libby/outfits/{id}/wip/{emotion}", s.requireAuth(s.handleDeleteLibbyOutfitWIP))

	// Outfit loadouts: the *recipe* an outfit is built from — which garment and colour
	// sits in each equipment slot. Separate from the wardrobes above because one recipe
	// can be rendered into several of them. See handlers_libby_loadouts.go.
	mux.HandleFunc("GET /api/libby/loadouts", s.requireAuth(s.handleListLibbyLoadouts))
	mux.HandleFunc("POST /api/libby/loadouts", s.requireAuth(s.handleSaveLibbyLoadout))
	mux.HandleFunc("DELETE /api/libby/loadouts/{id}", s.requireAuth(s.handleDeleteLibbyLoadout))
	mux.HandleFunc("GET /api/libby/loadouts/{id}/thumb", s.requireAuth(s.handleGetLibbyLoadoutThumb))
	mux.HandleFunc("PUT /api/libby/loadouts/{id}/thumb", s.requireAuth(s.handleSetLibbyLoadoutThumb))
	mux.HandleFunc("DELETE /api/libby/loadouts/{id}/thumb", s.requireAuth(s.handleDeleteLibbyLoadoutThumb))

	// Photos, GIFs, and videos uploaded by users for a game.
	mux.HandleFunc("GET /api/media/{id}/gallery", s.requireAuth(s.handleListGameGallery))
	mux.HandleFunc("POST /api/media/{id}/gallery", s.requireAuth(s.handleUploadGameGallery))
	mux.HandleFunc("DELETE /api/media/{id}/gallery/{media}", s.requireAuth(s.handleRemoveGameGallery))

	// Save-file backup for a game. Sits alongside the gallery because it is the same
	// idea — an attachment on a game — and shares its game-id resolution.
	// See handlers_game_saves.go.
	mux.HandleFunc("GET /api/media/{id}/saves", s.requireAuth(s.handleListGameSaves))
	mux.HandleFunc("POST /api/media/{id}/saves", s.requireAuth(s.handleUploadGameSave))
	mux.HandleFunc("GET /api/media/{id}/saves/{save}", s.requireAuth(s.handleDownloadGameSave))
	mux.HandleFunc("DELETE /api/media/{id}/saves/{save}", s.requireAuth(s.handleDeleteGameSave))

	// Playing an imported HTML5 game build in place. See handlers_webgame.go for why
	// serving a game's own scripts from this origin is safe.
	mux.HandleFunc("GET /api/media/{id}/play", s.requireAuth(s.handleGamePlayInfo))
	mux.HandleFunc("GET /api/media/{id}/play/{path...}", s.requireAuth(s.handleGamePlayAsset))

	// Chat workspaces are encrypted per user and shared by the WebUI and Android app.
	// Character images are scanned locally before being made available to a character.
	mux.HandleFunc("GET /api/chat/status", s.requireAuth(s.handleChatStatus))
	mux.HandleFunc("GET /api/chat/workspace", s.requireAuth(s.handleGetChatWorkspace))
	mux.HandleFunc("GET /api/chat/models", s.requireAuth(s.handleChatModels))
	mux.HandleFunc("POST /api/chat/models/load", s.requireAuth(s.handleLoadChatModel))
	mux.HandleFunc("POST /api/chat/models/unload", s.requireAuth(s.handleUnloadChatModel))
	// Deleting a model is a filesystem operation on a directory shared with
	// text-generation-webui, so it is admin-only. See handlers_chat_model_delete.go.
	mux.HandleFunc("GET /api/chat/models/inspect", s.requireAuth(s.requireAdmin(s.handleInspectChatModel)))
	mux.HandleFunc("POST /api/chat/models/delete", s.requireAuth(s.requireAdmin(s.handleDeleteChatModel)))
	mux.HandleFunc("PUT /api/chat/workspace", s.requireAuth(s.handlePutChatWorkspace))
	mux.HandleFunc("POST /api/chat/images", s.requireAuth(s.handleUploadChatImage))
	mux.HandleFunc("GET /api/chat/images/{id}", s.requireAuth(s.handleGetChatImage))
	mux.HandleFunc("DELETE /api/chat/images/{id}", s.requireAuth(s.handleDeleteChatImage))
	mux.HandleFunc("POST /api/chat", s.requireAuth(s.handleChat))

	mux.HandleFunc("POST /api/scrape", s.requireAuth(s.handleScrape))
	mux.HandleFunc("POST /api/scrape/bulk", s.requireAuth(s.handleScrapeBulk))
	mux.HandleFunc("POST /api/scrape/import", s.requireAuth(s.handleScrapeImport))
	mux.HandleFunc("GET /api/scrape/proxy", s.requireAuth(s.handleScrapeProxy))

	// Static web UI (SPA) for everything else. The handler consults the incognito
	// setting per request: under it the shell is served with a different title,
	// icon and manifest, and the branded assets are aliased to their cloud
	// counterparts. See internal/web.
	webUI := oweb.Handler(s.incognito)

	// The paths a Nextcloud answers and this app otherwise would not. Registered
	// before the catch-all and falling through to it when incognito is off, so a
	// plain install behaves exactly as it did. See incognito.go.
	s.registerIncognitoDecoys(mux, webUI)

	mux.Handle("/", webUI)

	// nextcloudHeaders sits inside securityHeaders so it can never weaken it: the
	// CSP, nosniff and framing rules are written first and the disguise only adds
	// the headers a PHP stack would send alongside them.
	return securityHeaders(s.nextcloudHeaders(s.observe(mux)))
}

// ── middleware ─────────────────────────────────────────────────────────

type ctxKey string

const userKey ctxKey = "user"

// requireAuth gates a handler on a valid session and counts the request as user
// activity, which is what holds an idle-expiring session open.
func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return s.requireSession(next, true)
}

// requireSession gates a handler on a valid session. activity says whether reaching
// this handler means the user is *doing* something.
//
// The distinction is the whole of the idle rule. A browser session dies after
// s.cfg.WebIdleTimeout of inactivity (see db.SessionUser), and "inactivity" has to
// mean "the user isn't using the app" — not "the app isn't making requests". The web
// client polls /api/auth/me to find out whether its session is still good, and if
// that poll refreshed the session, a tab left open overnight would keep itself alive
// forever and the idle timeout would be decorative. So the probe reads the session
// without touching it, and every endpoint that exists because the user asked for
// something touches it.
//
// The Android app is exempt from idling entirely (it holds a long-lived token by
// design), so the touch is a no-op for it — see db.TouchSession.
func (s *Server) requireSession(next http.HandlerFunc, activity bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r)
		if token == "" {
			writeErr(w, http.StatusUnauthorized, "missing token")
			return
		}
		user, err := s.db.SessionUser(r.Context(), token, s.cfg.WebIdleTimeout)
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "invalid or expired session")
			return
		}
		if activity {
			// Best-effort: a failed heartbeat write must not fail the request the user
			// actually made. The worst case is an early idle-out, not a wrong answer.
			if err := s.db.TouchSession(r.Context(), token, s.cfg.WebIdleTimeout); err != nil {
				s.log.Debug("touch session", "err", err)
			}
		}
		ctx := context.WithValue(r.Context(), userKey, user)
		next(w, r.WithContext(ctx))
	}
}

// requireAdmin gates a handler that has already passed requireAuth. Settings
// affect every user of the install (and the scraper's behaviour toward third-party
// hosts), so only an admin may change them.
func (s *Server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u, ok := r.Context().Value(userKey).(*db.UserRow)
		if !ok || !u.IsAdmin {
			writeErr(w, http.StatusForbidden, "admin only")
			return
		}
		next(w, r)
	}
}

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if after, ok := strings.CutPrefix(h, "Bearer "); ok {
		return after
	}
	// Fall back to cookie for browser SPA.
	if c, err := r.Cookie("oppai_session"); err == nil {
		return c.Value
	}
	return ""
}

// ── helpers ────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
