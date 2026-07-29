// Package settings holds the runtime-tunable knobs the Settings screen edits.
//
// Precedence is: env var (config.Config) supplies the default, a row in the
// settings table overrides it. Anything that can't be changed without a restart
// (model directory, inference device, listen address) stays env-only and is
// reported read-only to the UI.
package settings

import (
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/youruser/oppailib/internal/config"
)

// Settings is the live, editable configuration. Field tags double as the JSON
// shape the web UI reads and writes.
type Settings struct {
	// AI auto-tagging.
	AIEnabled  bool    `json:"aiEnabled"`
	AIAutoTag  bool    `json:"aiAutoTag"`  // tag automatically on upload/import
	AIMinScore float64 `json:"aiMinScore"` // drop suggestions below this confidence
	AIMaxTags  int     `json:"aiMaxTags"`  // keep at most this many per item

	// Scraper / import.
	ScrapeDelayMs       int    `json:"scrapeDelayMs"` // politeness delay per host
	ScrapeUserAgent     string `json:"scrapeUserAgent"`
	ScrapeRespectRobots bool   `json:"scrapeRespectRobots"`

	// F95 login, used to fetch members-only f95zone.to game threads. The password
	// is write-only over the API: it is stored and used, but never sent back in a
	// GET (see Redacted). F95PasswordSet lets the UI show whether one is on file.
	F95Username    string `json:"f95Username"`
	F95Password    string `json:"f95Password"`
	F95PasswordSet bool   `json:"f95PasswordSet"`

	// Image generation. ImageGenURL points at a local Automatic1111 / SD.Next WebUI;
	// empty disables the feature. ImageGenEnabled is a derived, read-only convenience
	// for the UI (true when a URL is set) — it isn't stored separately.
	ImageGenURL     string `json:"imageGenUrl"`
	ImageGenEnabled bool   `json:"imageGenEnabled"`

	// External catalogue APIs. Secret keys are write-only; the Set flags let the
	// Settings screen distinguish "configured" from "blank" after redaction.
	CivitaiAPIURL   string `json:"civitaiApiUrl"`
	CivitaiAPIKey   string `json:"civitaiApiKey"`
	CivitaiKeySet   bool   `json:"civitaiKeySet"`
	Rule34UserID    string `json:"rule34UserId"`
	Rule34APIKey    string `json:"rule34ApiKey"`
	Rule34APIKeySet bool   `json:"rule34ApiKeySet"`

	// Local OpenAI-compatible chat backend. No cloud service is contacted by
	// OppaiLib; the operator explicitly chooses this URL and model.
	ChatURL       string `json:"chatUrl"`
	ChatModel     string `json:"chatModel"`
	ChatAPIKey    string `json:"chatApiKey"`
	ChatAPIKeySet bool   `json:"chatApiKeySet"`
	ChatEnabled   bool   `json:"chatEnabled"`
	// ChatModelDir is text-generation-webui's models folder, as this container sees it.
	//
	// Required for deleting a model and for nothing else: text-generation-webui exposes
	// no delete endpoint, so removing one is a filesystem operation and this is the only
	// way to know where. Deliberately not defaulted — guessing a path and deleting what
	// is found there is not a thing to do on someone's model collection. Blank means the
	// delete controls are simply absent.
	ChatModelDir string `json:"chatModelDir"`

	// Storage housekeeping.
	//
	// Deliberately conservative, and deliberately narrow: the only things these ever
	// delete are bytes the application can recreate — chunks of an upload nobody came
	// back to finish, and scratch files from a job that has ended. Original media,
	// Libby's memories and model files are never touched by a policy; removing one of
	// those stays an explicit act by the user, in the screen that owns it.
	StorageWarnPercent int `json:"storageWarnPercent"` // warn below this much free space; 0 disables
	UploadStaleHours   int `json:"uploadStaleHours"`   // abandoned upload staging is reclaimed after this
	TempStaleHours     int `json:"tempStaleHours"`     // leftover processing scratch is reclaimed after this

	// How Libby generates pictures when the user approves one of her offers.
	//
	// Separate from whatever the image studio's controls are set to, and deliberately
	// so: the studio is a workbench whose settings change with every experiment, and
	// her offer has to produce her, consistently, without the user having to leave the
	// conversation and set up a generation first. These are the defaults that make
	// "make me a picture of you on the balcony" mean something.
	LibbyGenModel      string  `json:"libbyGenModel"`      // checkpoint, blank = the generator's own default
	LibbyGenLora       string  `json:"libbyGenLora"`       // one LoRA applied to everything she makes
	LibbyGenLoraWeight float64 `json:"libbyGenLoraWeight"` // its strength, -2..2
	LibbyGenBoard      string  `json:"libbyGenBoard"`      // InvokeAI board her pictures are filed into
	// LibbyGenPrompt is who she is, in generator words: the tokens that make a picture
	// look like Libby rather than like a stranger. Prefixed to whatever she describes,
	// so her offer only has to say what is happening in the picture.
	LibbyGenPrompt string `json:"libbyGenPrompt"`
	// LibbyGenNegativePrompt is what to keep out of every picture she makes.
	LibbyGenNegativePrompt string `json:"libbyGenNegativePrompt"`

	// Incognito dresses this install as a Nextcloud instance.
	//
	// A private media library is a thing you may not want to explain — to someone
	// glancing at a browser tab, to a housemate who opens the bookmark, to whoever
	// reads a reverse-proxy access log. With this on, the sign-in page, the tab's
	// title and icon, the response headers and the endpoints a scanner probes all
	// answer as Nextcloud, and the app drops the mascot and speaks in plain error
	// messages. Signing in with real credentials still opens the real library.
	//
	// It is deliberately a server setting rather than a per-device preference:
	// half of it *is* the server (headers, decoy endpoints, the served HTML), and a
	// disguise that only some of your browsers wear is not a disguise.
	Incognito bool `json:"incognito"`
}

// Setting keys as stored in the settings table.
const (
	keyAIEnabled           = "ai.enabled"
	keyAIAutoTag           = "ai.auto_tag"
	keyAIMinScore          = "ai.min_score"
	keyAIMaxTags           = "ai.max_tags"
	keyScrapeDelayMs       = "scrape.delay_ms"
	keyScrapeUserAgent     = "scrape.user_agent"
	keyScrapeRespectRobots = "scrape.respect_robots"
	keyF95Username         = "f95.username"
	keyF95Password         = "f95.password"
	keyImageGenURL         = "imagegen.url"
	keyCivitaiAPIURL       = "civitai.api_url"
	keyCivitaiAPIKey       = "civitai.api_key"
	keyRule34UserID        = "rule34.user_id"
	keyRule34APIKey        = "rule34.api_key"
	keyChatURL             = "chat.url"
	keyChatModel           = "chat.model"
	keyChatModelDir        = "chat.model_dir"
	keyChatAPIKey          = "chat.api_key"

	keyStorageWarnPercent = "storage.warn_percent"
	keyUploadStaleHours   = "storage.upload_stale_hours"
	keyTempStaleHours     = "storage.temp_stale_hours"

	keyLibbyGenModel      = "libby.gen.model"
	keyLibbyGenLora       = "libby.gen.lora"
	keyLibbyGenLoraWeight = "libby.gen.lora_weight"
	keyLibbyGenBoard      = "libby.gen.board"
	keyLibbyGenPrompt     = "libby.gen.prompt"
	keyLibbyGenNegative   = "libby.gen.negative_prompt"

	keyIncognito = "ui.incognito"
)

// Defaults derives the baseline from environment config.
func Defaults(cfg *config.Config) Settings {
	return Settings{
		AIEnabled:           cfg.AIEnabled,
		AIAutoTag:           true,
		AIMinScore:          0.35,
		AIMaxTags:           20,
		ScrapeDelayMs:       int(cfg.ScrapeDelay / time.Millisecond),
		ScrapeUserAgent:     cfg.ScrapeUserAgent,
		ScrapeRespectRobots: cfg.ScrapeRespectRobots,
		F95Username:         cfg.F95Username,
		F95Password:         cfg.F95Password,
		ImageGenURL:         cfg.ImageGenURL,
		CivitaiAPIURL:       cfg.CivitaiAPIURL,
		CivitaiAPIKey:       cfg.CivitaiAPIKey,
		Rule34UserID:        cfg.Rule34UserID,
		Rule34APIKey:        cfg.Rule34APIKey,
		ChatURL:             cfg.ChatURL,
		ChatModel:           cfg.ChatModel,
		ChatAPIKey:          cfg.ChatAPIKey,
		StorageWarnPercent:  10,
		UploadStaleHours:    48,
		TempStaleHours:      24,
	}
}

// Merge layers stored overrides on top of a baseline. Unparseable or absent
// values leave the baseline field untouched, so a corrupt row can never wedge
// the server into a bad config.
func Merge(base Settings, stored map[string]string) Settings {
	s := base
	if v, ok := parseBool(stored[keyAIEnabled]); ok {
		s.AIEnabled = v
	}
	if v, ok := parseBool(stored[keyAIAutoTag]); ok {
		s.AIAutoTag = v
	}
	if v, err := strconv.ParseFloat(stored[keyAIMinScore], 64); err == nil {
		s.AIMinScore = v
	}
	if v, err := strconv.Atoi(stored[keyAIMaxTags]); err == nil {
		s.AIMaxTags = v
	}
	if v, err := strconv.Atoi(stored[keyScrapeDelayMs]); err == nil {
		s.ScrapeDelayMs = v
	}
	if v := stored[keyScrapeUserAgent]; v != "" {
		s.ScrapeUserAgent = v
	}
	if v, ok := parseBool(stored[keyScrapeRespectRobots]); ok {
		s.ScrapeRespectRobots = v
	}
	// Presence, not emptiness, decides these: an empty stored value is a real choice
	// ("no F95 login"), so a saved row always wins over the config default.
	if v, ok := stored[keyF95Username]; ok {
		s.F95Username = v
	}
	if v, ok := stored[keyF95Password]; ok {
		s.F95Password = v
	}
	// Presence wins here too: clearing the URL from the Settings screen is a real
	// choice (disable image generation), not a fall-back to the env default.
	if v, ok := stored[keyImageGenURL]; ok {
		s.ImageGenURL = v
	}
	if v, ok := stored[keyCivitaiAPIURL]; ok {
		s.CivitaiAPIURL = v
	}
	if v, ok := stored[keyCivitaiAPIKey]; ok {
		s.CivitaiAPIKey = v
	}
	if v, ok := stored[keyRule34UserID]; ok {
		s.Rule34UserID = v
	}
	if v, ok := stored[keyRule34APIKey]; ok {
		s.Rule34APIKey = v
	}
	if v, ok := stored[keyChatURL]; ok {
		s.ChatURL = v
	}
	if v, ok := stored[keyChatModel]; ok {
		s.ChatModel = v
	}
	if v, ok := stored[keyChatModelDir]; ok {
		s.ChatModelDir = v
	}
	if v, ok := stored[keyChatAPIKey]; ok {
		s.ChatAPIKey = v
	}
	if v, err := strconv.Atoi(stored[keyStorageWarnPercent]); err == nil {
		s.StorageWarnPercent = v
	}
	if v, err := strconv.Atoi(stored[keyUploadStaleHours]); err == nil {
		s.UploadStaleHours = v
	}
	if v, err := strconv.Atoi(stored[keyTempStaleHours]); err == nil {
		s.TempStaleHours = v
	}
	// Presence wins throughout: clearing Libby's model or LoRA is a real choice
	// ("use the generator's default"), not a fallback to anything.
	if v, ok := stored[keyLibbyGenModel]; ok {
		s.LibbyGenModel = v
	}
	if v, ok := stored[keyLibbyGenLora]; ok {
		s.LibbyGenLora = v
	}
	if v, err := strconv.ParseFloat(stored[keyLibbyGenLoraWeight], 64); err == nil {
		s.LibbyGenLoraWeight = v
	}
	if v, ok := stored[keyLibbyGenBoard]; ok {
		s.LibbyGenBoard = v
	}
	if v, ok := stored[keyLibbyGenPrompt]; ok {
		s.LibbyGenPrompt = v
	}
	if v, ok := stored[keyLibbyGenNegative]; ok {
		s.LibbyGenNegativePrompt = v
	}
	if v, ok := parseBool(stored[keyIncognito]); ok {
		s.Incognito = v
	}
	s.Clamp()
	return s
}

// Map renders settings as storable strings.
func (s Settings) Map() map[string]string {
	return map[string]string{
		keyAIEnabled:           strconv.FormatBool(s.AIEnabled),
		keyAIAutoTag:           strconv.FormatBool(s.AIAutoTag),
		keyAIMinScore:          strconv.FormatFloat(s.AIMinScore, 'f', -1, 64),
		keyAIMaxTags:           strconv.Itoa(s.AIMaxTags),
		keyScrapeDelayMs:       strconv.Itoa(s.ScrapeDelayMs),
		keyScrapeUserAgent:     s.ScrapeUserAgent,
		keyScrapeRespectRobots: strconv.FormatBool(s.ScrapeRespectRobots),
		keyF95Username:         s.F95Username,
		keyF95Password:         s.F95Password,
		keyImageGenURL:         s.ImageGenURL,
		keyCivitaiAPIURL:       s.CivitaiAPIURL,
		keyCivitaiAPIKey:       s.CivitaiAPIKey,
		keyRule34UserID:        s.Rule34UserID,
		keyRule34APIKey:        s.Rule34APIKey,
		keyChatURL:             s.ChatURL,
		keyChatModel:           s.ChatModel,
		keyChatModelDir:        s.ChatModelDir,
		keyChatAPIKey:          s.ChatAPIKey,

		keyStorageWarnPercent: strconv.Itoa(s.StorageWarnPercent),
		keyUploadStaleHours:   strconv.Itoa(s.UploadStaleHours),
		keyTempStaleHours:     strconv.Itoa(s.TempStaleHours),

		keyLibbyGenModel:      s.LibbyGenModel,
		keyLibbyGenLora:       s.LibbyGenLora,
		keyLibbyGenLoraWeight: strconv.FormatFloat(s.LibbyGenLoraWeight, 'f', -1, 64),
		keyLibbyGenBoard:      s.LibbyGenBoard,
		keyLibbyGenPrompt:     s.LibbyGenPrompt,
		keyLibbyGenNegative:   s.LibbyGenNegativePrompt,

		keyIncognito: strconv.FormatBool(s.Incognito),
	}
}

// Redacted returns a copy safe to hand back over the API: the F95 password is
// stripped and reduced to the F95PasswordSet flag, so a GET never echoes the
// stored credential.
func (s Settings) Redacted() Settings {
	s.F95PasswordSet = s.F95Password != ""
	s.F95Password = ""
	s.CivitaiKeySet = s.CivitaiAPIKey != ""
	s.CivitaiAPIKey = ""
	s.Rule34APIKeySet = s.Rule34APIKey != ""
	s.Rule34APIKey = ""
	s.ChatAPIKeySet = s.ChatAPIKey != ""
	s.ChatAPIKey = ""
	return s
}

// Clamp forces every field into a sane range. Called on load and before every
// save, so neither a hand-edited DB row nor a malformed PUT can e.g. set a
// zero-delay scraper loose on a host.
func (s *Settings) Clamp() {
	if s.AIMinScore < 0 {
		s.AIMinScore = 0
	}
	if s.AIMinScore > 1 {
		s.AIMinScore = 1
	}
	if s.AIMaxTags < 1 {
		s.AIMaxTags = 1
	}
	if s.AIMaxTags > 100 {
		s.AIMaxTags = 100
	}
	if s.ScrapeDelayMs < 250 {
		s.ScrapeDelayMs = 250
	}
	if s.ScrapeDelayMs > 60_000 {
		s.ScrapeDelayMs = 60_000
	}
	if s.ScrapeUserAgent == "" {
		s.ScrapeUserAgent = config.DefaultScrapeUserAgent
	}
	// Normalize the image-gen base URL to "scheme://host[:port]" without a trailing
	// slash, so handlers can append "/sdapi/..." without doubling slashes. The derived
	// enabled flag simply tracks whether a URL is configured.
	s.ImageGenURL = strings.TrimRight(strings.TrimSpace(s.ImageGenURL), "/")
	s.ImageGenEnabled = s.ImageGenURL != ""
	s.CivitaiAPIURL = strings.TrimRight(strings.TrimSpace(s.CivitaiAPIURL), "/")
	if s.CivitaiAPIURL == "" {
		s.CivitaiAPIURL = "https://civitai.red/api/v1"
	}
	s.CivitaiAPIKey = strings.TrimSpace(s.CivitaiAPIKey)
	s.Rule34UserID = strings.TrimSpace(s.Rule34UserID)
	s.Rule34APIKey = strings.TrimSpace(s.Rule34APIKey)
	s.ChatURL = strings.TrimRight(strings.TrimSpace(s.ChatURL), "/")
	s.ChatModel = strings.TrimSpace(s.ChatModel)
	s.ChatModelDir = strings.TrimRight(strings.TrimSpace(s.ChatModelDir), "/")
	s.ChatAPIKey = strings.TrimSpace(s.ChatAPIKey)
	// A text-generation-webui model is selected in its own WebUI/startup config;
	// its OpenAI endpoint does not require OppaiLib to own that lifecycle or even
	// send a model field. The live readiness probe decides whether Chat can run.
	s.ChatEnabled = s.ChatURL != ""
	// A warning threshold above half is not a warning, it is a permanent banner; zero
	// switches the warning off, which is a legitimate choice on a box the operator
	// monitors elsewhere.
	if s.StorageWarnPercent < 0 {
		s.StorageWarnPercent = 0
	}
	if s.StorageWarnPercent > 50 {
		s.StorageWarnPercent = 50
	}
	// A floor of an hour on both: these delete files, and a policy set to zero would
	// reclaim an upload the moment its first chunk landed.
	if s.UploadStaleHours < 1 {
		s.UploadStaleHours = 48
	}
	if s.UploadStaleHours > 24*90 {
		s.UploadStaleHours = 24 * 90
	}
	if s.TempStaleHours < 1 {
		s.TempStaleHours = 24
	}
	if s.TempStaleHours > 24*90 {
		s.TempStaleHours = 24 * 90
	}
	s.LibbyGenModel = strings.TrimSpace(s.LibbyGenModel)
	s.LibbyGenLora = strings.TrimSpace(s.LibbyGenLora)
	// The same range the image studio allows, so a weight set here behaves the way the
	// identical number does there. Zero means "unset" and is filled in at use, not
	// here, so an explicit 0 is still storable.
	if s.LibbyGenLoraWeight < -2 {
		s.LibbyGenLoraWeight = -2
	} else if s.LibbyGenLoraWeight > 2 {
		s.LibbyGenLoraWeight = 2
	}
	s.LibbyGenBoard = strings.TrimSpace(s.LibbyGenBoard)
	s.LibbyGenPrompt = strings.TrimSpace(s.LibbyGenPrompt)
	s.LibbyGenNegativePrompt = strings.TrimSpace(s.LibbyGenNegativePrompt)
}

// ScrapeDelay is the politeness delay as a Duration.
func (s Settings) ScrapeDelay() time.Duration {
	return time.Duration(s.ScrapeDelayMs) * time.Millisecond
}

// Store holds the live settings for concurrent readers (request handlers) and
// the occasional writer (a save from the Settings screen).
type Store struct {
	mu  sync.RWMutex
	cur Settings
}

func NewStore(s Settings) *Store {
	s.Clamp()
	return &Store{cur: s}
}

func (st *Store) Get() Settings {
	st.mu.RLock()
	defer st.mu.RUnlock()
	return st.cur
}

func (st *Store) Set(s Settings) {
	s.Clamp()
	st.mu.Lock()
	st.cur = s
	st.mu.Unlock()
}

// parseBool reports ok=false for an absent/garbage value so Merge can skip it.
func parseBool(v string) (bool, bool) {
	if v == "" {
		return false, false
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return false, false
	}
	return b, true
}
