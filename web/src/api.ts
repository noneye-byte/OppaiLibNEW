// Typed client for the OppaiLib API. The session token is stored in
// localStorage and sent as a Bearer header (the backend also accepts a cookie).

export interface MediaTag {
  id: number;
  name: string;
  category: string;
  source?: string;
  score?: number;
  /**
   * Timestamps (seconds, ascending) where the AI saw this tag in a video.
   * Only present on single-item fetches; list responses omit them.
   */
  moments?: number[];
}

export interface Media {
  id: number;
  kind: "video" | "gif" | "image" | "comic" | "game";
  sha256: string;
  size: number;
  title: string;
  notes?: string;
  source?: string;
  rating: number;
  favorite: boolean;
  duration?: number;
  width?: number;
  height?: number;
  pageCount?: number;
  hasThumb?: boolean;
  download?: string; // external download URL (games)
  gallery?: string[]; // screenshot URLs (games)
  tags?: MediaTag[];
  createdAt: number;
  updatedAt: number;
}

// Editable subset of a media item. Omitted fields are left unchanged; tags are
// add/remove lists.
export interface MediaPatch {
  title?: string;
  notes?: string;
  kind?: Media["kind"];
  rating?: number;
  addTags?: string[];
  removeTags?: string[];
}

export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

/**
 * A resumable upload as the server sees it.
 *
 * `received` is the authoritative list of chunk indices it holds — the client sends
 * the complement of that set, which is what makes an upload survivable across a
 * closed tab, a killed app or a restarted server.
 */
export interface UploadSession {
  id: string;
  filename: string;
  title?: string;
  size: number;
  chunkSize: number;
  mime?: string;
  kind?: string;
  status: "open" | "assembling" | "completed" | "failed" | "cancelled";
  received: number[];
  receivedBytes: number;
  chunkCount: number;
  mediaId?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

/** One configurable storage location and what is on the volume behind it. */
export interface StorageMapping {
  key: string;
  label: string;
  path: string;
  env: string;
  purpose: string;
  exists: boolean;
  writable: boolean;
  freeBytes: number;
  totalBytes: number;
  usedBytes: number;
  error?: string;
  contents?: { label: string; bytes: number; count?: number; note?: string }[];
}

export interface StorageReport {
  mappings: StorageMapping[];
  pendingBytes: number;
  warnings: string[];
  reclaimable: { label: string; bytes: number; note?: string }[];
  warnPercent: number;
}

/** One registered passkey, as its owner sees it. No key material: the public key is
    harmless but of no use here, and leaving it out keeps this about the decision the
    user is making — which device is this, and do I still have it. */
export interface Passkey {
  id: number;
  name: string;
  /** Backed up to an account (iCloud, Google). Worth showing: a synced key survives
      losing the device and a device-bound one does not, which changes whether a second
      one is needed. */
  synced: boolean;
  transports?: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface PasskeyList {
  passkeys: Passkey[];
  /** Whether the browser will attempt WebAuthn here at all. False on plain HTTP away
      from localhost, where it refuses without a message the user can act on. */
  available: boolean;
  reason?: string;
  /** The domain these passkeys are bound to. Shown because one created at a hostname is
      not offered at the LAN IP, which is otherwise baffling. */
  relyingPartyId?: string;
}

/** A challenge the server issued, plus the raw WebAuthn options to hand the browser. */
export interface PasskeyCeremony {
  ceremony: string;
  options: unknown;
}

// A tag the parser could attribute to a taxonomy (artist, character, parody, …).
export interface ScrapedTag {
  name: string;
  category: string;
}

export interface ScrapeResult {
  title: string;
  description: string;
  tags: string[];
  performers: string[];
  mediaUrls: string[];
  sourceUrl: string;
  kind: string;
  // Present only when the site's parser categorizes its tags. `tags` still holds
  // the flat union of everything, so rendering can ignore this; the import must
  // echo it back, or the categories are lost on the round-trip.
  categorizedTags?: ScrapedTag[];
  cover?: string;
  screenshots: string[];
  downloadUrl?: string;
}

export interface BulkScrapeItem {
  url: string;
  result?: ScrapeResult;
  error?: string;
}

// Server-side settings, editable from the Settings screen (admins only).
export interface Settings {
  aiEnabled: boolean;
  aiAutoTag: boolean;
  aiMinScore: number;
  aiMaxTags: number;
  scrapeDelayMs: number;
  scrapeUserAgent: string;
  scrapeRespectRobots: boolean;
  // F95 login for members-only game threads. The password is write-only: a GET
  // returns it blank and reports f95PasswordSet instead; sending a new value sets
  // it, sending blank leaves it unchanged.
  f95Username: string;
  f95Password: string;
  f95PasswordSet: boolean;
  // Image generation: the base URL of a local Automatic1111 / SD.Next WebUI. Empty
  // disables the feature; imageGenEnabled is a derived, read-only mirror of "URL set".
  imageGenUrl: string;
  imageGenEnabled: boolean;
  civitaiApiUrl: string;
  civitaiApiKey: string;
  civitaiKeySet: boolean;
  rule34UserId: string;
  rule34ApiKey: string;
  rule34ApiKeySet: boolean;
  chatUrl: string;
  chatModel: string;
  chatApiKey: string;
  chatApiKeySet: boolean;
  chatEnabled: boolean;
  /** text-generation-webui's models folder, as the OppaiLib container sees it. Needed
      only to delete a model — that backend exposes no delete API, so it is a filesystem
      operation. Blank means the delete control is simply absent. */
  chatModelDir: string;

  /** Storage housekeeping. These only ever remove what can be recreated — staged
      chunks of unfinished uploads, and scratch files from jobs that have ended. */
  storageWarnPercent: number;
  uploadStaleHours: number;
  tempStaleHours: number;

  /** How Libby generates a picture when you approve one of her offers. Separate from
      the studio's own controls: this is the fixed setup that makes what she produces
      look like her, without the user leaving the conversation to configure a run. */
  libbyGenModel: string;
  libbyGenLora: string;
  libbyGenLoraWeight: number;
  libbyGenBoard: string;
  /** Who she is in generator words, prefixed to whatever she describes. */
  libbyGenPrompt: string;
  libbyGenNegativePrompt: string;
  /** Dresses the whole install as a Nextcloud instance: the sign-in page, the tab's
      identity, the response headers and the endpoints a scanner probes. Server-side
      rather than per-device, because half of the disguise is the server. */
  incognito: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatStatus {
  enabled: boolean;
  configured?: boolean;
  model?: string;
  message?: string;
  modes: string[];
  advancedOptions?: boolean;
  modelBackend?: boolean;
  modelManagement?: boolean;
  /** Context OppaiLib fitted and requested for this loaded model. */
  contextLimit?: number;
}

export interface ChatModels {
  models: string[];
  loaded: string;
  supported: boolean;
}

/** What deleting one text-generation model would remove. */
export interface ChatModelInspection {
  name: string;
  /** The directory or weight file that will go. */
  path: string;
  /** Every file, relative to the models directory — so a dialog can show what is being
      lost rather than a count. */
  files: string[];
  bytes: number;
  /** True for an HF-style model laid out as a folder. */
  directory: boolean;
  /** True when the weights are shards. Deleting one shard of a set leaves a model that
      looks present and cannot load, so the whole set goes together. */
  split: boolean;
  /** The resident model cannot be deleted: removing weights under a loaded model leaves
      the backend alive and broken until someone restarts it. */
  loaded: boolean;
  /** Space available on the models filesystem, so "frees 14 GB" reads against how much
      room there is. */
  freeBytes: number;
  /** Where a delete moves it, so the offer to recover is concrete. */
  trashPath: string;
}

export interface ChatModelDeletion {
  name: string;
  /** Where it went; absent when permanently removed. */
  movedTo?: string;
  bytes: number;
  files: number;
  /** The refreshed list, so the client needn't make a second call. */
  models: string[];
}

/** Any text-generation-webui ChatCompletionRequest field not owned by OppaiLib. */
export type ChatOptions = Record<string, unknown>;

/** A library item a reply points at, resolved server-side from what she named. */
export interface LibbyLink {
  id: number;
  title: string;
  kind: string;
  hasThumb?: boolean;
}

/**
 * What the two of them are looking at while browsing together.
 *
 * Ids only: the server reads the titles and tags out of the database itself, so
 * what a character is told about the collection is what the collection says.
 */
export interface ChatViewing {
  /** The item that is actually open, if any. */
  focusId?: number;
  /** The rest of what is on screen, in the order it is laid out. */
  ids?: number[];
  /** Remote browse tiles cannot be represented by library ids. They are explicitly
      untrusted labels from an outside catalogue and are fenced that way server-side. */
  external?: ChatViewingItem[];
  /** The remote item actually open in the browse viewer, when there is one. */
  focusExternal?: ChatViewingItem;
  /** Where in the library they are — a section name or a search term. */
  section?: string;
}

export interface ChatViewingItem {
  title: string;
  kind: string;
  tags?: string[];
}

/**
 * One turn asked of a character.
 *
 * An object rather than a positional argument list: this grew a photo, then the
 * photo's tags, then what has already been sent, then what is on screen, and every
 * caller passing `"", [], ""` to reach the parameter it cared about was a bug
 * waiting to happen.
 */
export interface ChatTurn {
  mode: string;
  messages: ChatMessage[];
  emotion?: string;
  intensity?: number;
  options?: ChatOptions;
  characterId?: string;
  /** Content tags of a photo the user attached, from the local scanner. */
  photoTags?: string[];
  /** That photo's id, so it is never handed straight back as the reply's picture. */
  photoImageId?: string;
  /** The name of the outfit Libby is wearing on this device, "" for her default
      artwork. Which outfit is worn is a per-device choice the server never sees,
      so it has to be told, or she describes clothes the user is not looking at. */
  outfit?: string;
  /** Pictures this character has already sent in this conversation, oldest first.
      The server holds them back so the same one does not come round again. */
  recentImageIds?: string[];
  /** What the two of them are looking at, in a browse-together session. */
  viewing?: ChatViewing;
  /** A web address the user is showing her with this message. The URL only — what
      she is told about the page is the server's summary of what it fetched for the
      preview. A link that was never previewed is ignored rather than fetched. */
  link?: string;
  /** What this turn is for, when the caller knows something the text cannot show:
      an idle nudge is an autonomous message however it is worded. Drives the
      server's sampler choice; omit it and the server classifies the turn itself. */
  task?: string;
}

/**
 * Something Libby wrote that was not addressed to you.
 *
 * `thought` is private — she thought it and did not say it. `aside` is her talking
 * to herself out loud, which you overhear. Both are drawn as their own kind of
 * message and never as speech; that separation is the point of them existing.
 */
export interface LibbyThought {
  kind: "thought" | "aside";
  text: string;
}

export interface ChatResponse {
  /** What she actually said. Empty is legal and means she had a thought and decided
      not to speak — check `thoughts` before treating it as a failed turn. */
  message: string;
  emotion?: string;
  intensity?: number;
  imageId?: string;
  /** Library items this reply points at. Absent from older servers. */
  links?: LibbyLink[];
  /** Things Libby has asked to do. Proposals only — the server performs none of
      them; a card with an Allow button is what turns one into an action. */
  actions?: LibbyAction[];
  /** What she thought or muttered rather than said. Absent from older servers. */
  thoughts?: LibbyThought[];
  /** True when the character stated its own mood rather than one being inferred.
      A stated mood is applied as-is; an inferred one drifts by the session
      multiplier. Absent from older servers, which is treated as inferred. */
  declared?: boolean;
  /** How this turn was sampled. The server classifies what the turn is for and
      picks bounded settings to match, so the client no longer ships a fixed set;
      these come back so the advanced panel can show what was actually used and
      offer it as one copyable line. Absent from older servers. */
  sampling?: ChatSampling;
  /** How the turn fitted the model's context window. A non-empty `note` means
      something was cut — older messages, or part of what Libby knows — and is
      meant to be shown, because the alternative is it happening invisibly.
      Absent from older servers. */
  context?: ChatContextReport;
}

/** What the server chose for this generation, and what the caller overrode. */
export interface ChatSampling {
  /** casual | emotional | factual | creative | reaction | autonomous | observation | planning */
  task: string;
  /** The whole set as one copyable key=value line. */
  summary: string;
  values: ChatOptions;
  /** Keys the caller's own options replaced. */
  overridden?: string[];
}

/** Token accounting for one turn. Every figure is an estimate and says so. */
export interface ChatContextReport {
  limit: number;
  promptTokens: number;
  replyTokens: number;
  systemTokens: number;
  /** The part of the prompt that cannot be shed: her identity, card and tag protocol. */
  coreTokens: number;
  /** How many older messages were left out. */
  dropped: number;
  /** Whether those were replaced by a summary. */
  digested?: boolean;
  /** Parts of what Libby knows that did not fit, named. */
  droppedSections?: string[];
  /** Whether her reply length had to be cut. */
  squeezed?: boolean;
  /** The user-facing explanation, empty when everything fitted. */
  note?: string;
  estimated?: boolean;
}

/** One allowed Discord channel, and what she may do in it. Reading and posting are
    separate grants: "she can see that channel" and "she can post in it" are
    different decisions and are stored as different flags. */
export interface DiscordChannel {
  guildId: string;
  guildName?: string;
  channelId: string;
  name?: string;
  read: boolean;
  write: boolean;
}

/** One line of the Discord audit log. A refusal names the rule that refused it,
    which is what makes "why did she answer that" and "why didn't she" answerable. */
export interface DiscordEvent {
  at: number;
  kind: string;
  channel?: string;
  user?: string;
  detail?: string;
}

/** A server the bot is in, and its channels — for building the allowlist by
    choosing rather than by pasting ids. */
export interface DiscordPlace {
  guildId: string;
  name: string;
  channels: { channelId: string; name: string }[];
}

/**
 * The Discord connection, as a client is allowed to see it.
 *
 * The bot token is never part of this. `hasToken` says whether one is stored and
 * `connected` whether Discord accepted it, because those need different things said
 * to the user; the token itself only ever travels inward.
 */
export interface DiscordState {
  enabled: boolean;
  connected: boolean;
  botName?: string;
  hasToken: boolean;
  users: string[];
  channels: DiscordChannel[];
  /** "shared" — one person, one memory across both surfaces. "none" — Discord is
      told nothing she learned in the app, and keeps nothing from it. */
  memory: string;
  pollSeconds: number;
  perHour: number;
  log: DiscordEvent[];
  /** The connection's actual condition in a sentence, so the flags do not have to be
      added up by the reader. */
  note: string;
}

/**
 * A link the user is about to show Libby, as the server read it.
 *
 * The summary is the server's, not the page's raw content: what reaches the model is
 * bounded, stripped of anything invisible, and fenced as untrusted. A failed fetch
 * comes back as a `failed` preview with a reason rather than an error, so a link that
 * cannot be opened is explained instead of vanishing.
 */
export interface SharedLink {
  /** The normalized address — tracking parameters and fragment removed. */
  url: string;
  host: string;
  /** Set when the link points back into this library, in which case nothing was
      fetched and the item itself is the answer. */
  internal?: LibbyLink;
  title?: string;
  /** The page's own description, capped. Never its whole body. */
  text?: string;
  kind?: string;
  tags?: string[];
  /** How many media files the page offers, which is what makes offering to add it
      to the library sensible rather than a guess. */
  media?: number;
  failed?: boolean;
  error?: string;
}

/**
 * What the app knows about Libby's own likeness.
 *
 * The persistent part of this is not here — it is the `character:libby` tag on the
 * library items themselves, which is what makes the identity visible to chat,
 * browsing, generation and search alike. This is the rest: the settings, the pictures
 * chosen as references, and the counts that make the state legible.
 */
export interface LibbyIdentity {
  /** The tag itself, so a client can show or search for it without hardcoding it. */
  tag: string;
  /** Whether recognition may tag pictures by itself. */
  auto: boolean;
  /** How many of her features an automatic verdict needs. */
  floor: number;
  /** Her likeness, mirrored from her character card. */
  appearance: string;
  /** That likeness split into the individual features matching works on. */
  features: string[];
  /** The pictures picked out as showing what she looks like, newest first. */
  references: { id: number; title: string; kind: string }[];
  /** How many library items carry the tag. */
  tagged: number;
  /** How many were ruled out by hand. Shown so "why is nothing recognised?" has an
      answer rather than a shrug. */
  rejected: number;
}

/** What the user has said about themselves.
 *
 * Every field here is *stated*. What Libby worked out on her own lives in the memory
 * store, is labelled as hers, and is corrected there — nothing from the memory store
 * ever writes back into this, so "your profile" always means "what you told it".
 *
 * The fields are separate rather than one persona blob because the server uses them
 * differently: boundaries are a hard instruction placed above the character card, while
 * interests are colour and are among the first things dropped when context is tight. */
export interface ChatProfile {
  displayName: string;
  persona: string;
  avatarImageId?: string;
  /** Pronouns, or a preferred form of address. Voluntary; blank means "don't guess",
      which the server honours by telling the model nothing rather than defaulting. */
  address?: string;
  interests?: string;
  preferences?: string;
  /** Lines not to cross. Treated as a hard rule that outranks the character card. */
  boundaries?: string;
  communication?: string;
  /** Whether Libby may form new memories about you. Absent means yes — the memory
      system predates this control, and switching it off on upgrade would look like
      data loss. */
  memoryConsent?: boolean;
}

export interface ChatCharacter {
  id: string;
  name: string;
  description?: string;
  /** What they look like, written as picture tags. Doubles as the likeness a
      shared photo is matched against, which is how a character recognises a
      picture of herself — see the server's selfPortraitMatch. */
  appearance?: string;
  personality?: string;
  /** What they are into. Colours how they flirt; never recited as a list. */
  kinks?: string;
  scenario?: string;
  firstMessage?: string;
  exampleDialogue?: string;
  systemPrompt?: string;
  creatorNotes?: string;
  avatarImageId?: string;
  promptWeight: number;
  defaultMode: string;
  builtIn?: boolean;
}

export interface StoredChatMessage extends ChatMessage {
  id: string;
  at: number;
  imageId?: string;
  /** Library items this message pointed at, kept so an old reply still opens what
      it named rather than the chips vanishing on reload. */
  links?: LibbyLink[];
  /** Things Libby offered to do in this message. Kept so the card survives a
      re-render; whether one was approved is session state, not part of the log. */
  actions?: LibbyAction[];
  /** Set when this entry is something she thought or muttered rather than said to
      you. Drawn as its own kind of message, and held out of the history the model
      is given — a thought fed back in as an assistant line is a thought that was
      said after all, and it teaches the model to keep writing them inline. */
  thought?: LibbyThought["kind"];
}

export interface ChatConversation {
  id: string;
  characterId: string;
  title: string;
  mode: string;
  emotion: string;
  intensity: number;
  progress?: number;
  options?: ChatOptions;
  messages: StoredChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatImage {
  id: string;
  characterId: string;
  name: string;
  tags: string[];
  mime: string;
  createdAt: number;
}

export interface ChatWorkspace {
  profile: ChatProfile;
  /** Generation settings new conversations start from. Existing chats keep their own. */
  defaults?: ChatOptions;
  characters: ChatCharacter[];
  conversations: ChatConversation[];
  images: ChatImage[];
}

/** Owner id for the user's own avatar, kept out of every character's gallery. */
export const PROFILE_IMAGE_OWNER = "profile";

// Environment/build facts the Settings screen shows but can't change — these come
// from env vars and only take effect at startup.
export interface ReadOnlyInfo {
  version: string;
  features: string[];
  aiTagger: string;
  aiModelDir: string;
  aiDevice: string;
  mediaDir: string;
  dbPath: string;
  ffmpeg: boolean;
  sessionHours: number;
}

export interface SettingsResponse {
  settings: Settings;
  readOnly: ReadOnlyInfo;
}

export interface KindStat {
  kind: string;
  count: number;
  bytes: number;
}

export interface Stats {
  kinds: KindStat[];
  items: number;
  bytes: number;
  tags: number;
}

// Whether a comic can be paged through in-app, and how many pages it has.
// readable=false means the archive isn't a zip container (.cbr/.pdf) — the
// viewer then offers the file as a download rather than a broken reader.
export interface ComicInfo {
  readable: boolean;
  pages: number;
  reason?: string;
}

// ── remote sources ───────────────────────────────────────────────────────────
// Browsing a source streams from the origin and stores nothing; only save() copies
// an item into the library.

/** One ordering a feed offers. The first is the default. */
export interface SourceSort {
  id: string;
  label: string;
}

/**
 * One browsable listing inside a source: a board, a category, a search.
 *
 * `query` marks a feed that needs a search term — the UI shows a search box for it
 * rather than browsing it blindly, since a term-less search is an error upstream,
 * not an empty page.
 */
export interface SourceFeed {
  id: string;
  label: string;
  query?: boolean;
  sorts?: SourceSort[];
}

export interface RemoteSource {
  id: string;
  name: string;
  feeds: SourceFeed[];
  /** The site itself, for the tab's tooltip. */
  host?: string;
  /** True for a site added from the UI, which is the only kind that can be removed
      again — a built-in lives in the binary and is overridden, not deleted. */
  userAdded?: boolean;
  /** Explicit adapter declaration. Unknown identifies an older custom adapter that
      predates access metadata; it must not be silently presented as public. */
  authentication: "none" | "optional" | "required" | "unknown";
  authNote?: string;
  contentWarning?: string;
}

/** One thing the reviewer should know about a proposed site adapter: a gap the
    analysis couldn't fill, or an assumption it made. `blocking` means the proposal
    won't work as-is. */
export interface SourceNote {
  field?: string;
  text: string;
  blocking?: boolean;
}

/** What analysing a listing page produced.
 *
 * `preview` is the important field: it holds the items the proposed adapter actually
 * extracted from the page that was just fetched. Selectors can't be judged by
 * reading them, so the review step is "do these tiles look right", not "is this YAML
 * correct". */
export interface SourceProposal {
  yaml: string;
  notes: SourceNote[];
  preview: SourceItem[];
  previewError?: string;
  /** Set when a source is already registered under the proposed id, so saving would
      replace it. */
  existing?: string;
}

/**
 * An item that lives on the remote source and is *not* in the library. Every URL on
 * it is remote — the browser never fetches them directly, it asks the server to
 * proxy them (see `api.sourceStreamURL`).
 */
export interface SourceItem {
  id: string;
  title: string;
  /**
   * "thread" is a *container* — an item you browse into rather than view. A 4chan
   * board lists threads, and a thread stands for a set of files, so opening it must
   * list the set rather than put the OP's image in the viewer. Containers carry
   * `feedId`; nothing else does.
   */
  kind: "video" | "gif" | "image" | "comic" | "thread";
  thumbUrl: string;
  mediaUrl?: string;
  pageUrl?: string;
  /** The feed to browse when this item is opened. Set only on a container. */
  feedId?: string;
  /**
   * The discussion this item belongs to, for sources that have one. A file posted in
   * a 4chan thread carries its thread's id, which is what the viewer asks for
   * comments on — so showing the conversation around an image needs nothing else.
   */
  threadId?: string;
  /** This item's own post in that thread, so its comment can be marked. */
  postNo?: number;
  /** How many files a container holds. */
  count?: number;
  width?: number;
  height?: number;
  tags?: string[];
}

/**
 * One post in a source's discussion thread.
 *
 * Flat, not a tree: a 4chan post quotes by number and can quote several posts, so the
 * conversation is a graph. `quotes` carries those numbers and the list renders in post
 * order, which is how the site itself shows a thread.
 */
export interface SourceComment {
  no: number;
  time: number;
  name?: string;
  subject?: string;
  text: string;
  thumbUrl?: string;
  mediaUrl?: string;
  /**
   * The post's upload, described the way a `SourceItem` is. Both are set only when
   * the post has a file.
   *
   * A 4chan thumbnail is a JPEG whatever it stands for, so `thumbUrl` alone can't
   * tell a webm apart from a photo — `kind` is what lets the panel put a play badge
   * on a video, and `itemId` is what lets clicking it land on that exact item.
   */
  kind?: SourceItem["kind"];
  itemId?: string;
  quotes?: number[];
  op?: boolean;
}

/** `cursor` is opaque; empty means there is nothing after this page. */
export interface SourceListing {
  items: SourceItem[];
  cursor?: string;
}

/**
 * The Android APK this server offers for download. `available` is false when the
 * image was built without one — a normal state, not an error.
 */
export interface APKInfo {
  available: boolean;
  size?: number;
  sha256?: string;
  modified?: number; // unix seconds
  filename?: string;
}

// ── image generation ───────────────────────────────────────────────────────────

/** One checkpoint the generator can load. `title` is the selector value the API wants. */
export interface GenModel {
  title: string;
  model_name: string;
  hash?: string;
  /** Model family — "sd-1", "sd-2", "sdxl" — when the generator reports one. */
  base?: string;
  /** The generator's recommended settings for this model, applied on selection. */
  defaults?: GenModelDefaults;
}

export interface GenModelDefaults {
  steps?: number;
  cfgScale?: number;
  cfgRescale?: number;
  scheduler?: string;
  width?: number;
  height?: number;
  vae?: string;
  vaePrecision?: "fp32" | "fp16";
}

export interface GenLora {
  name: string;
  alias?: string;
  path?: string;
  hash?: string;
  base?: string;
  weight?: number;
  triggerPhrases?: string[];
}

/** A standalone VAE. `key` is the selector value the generate call wants. */
export interface GenVae {
  key: string;
  name: string;
  base?: string;
}

/** A prompt template (InvokeAI style preset). `prompt` may contain "{prompt}". */
export interface GenTemplate {
  id: string;
  name: string;
  prompt: string;
  negativePrompt: string;
  /** True for presets that ship with the generator (InvokeAI "default"/"project"),
      false for the user's own. Built-ins are hidden by default in the picker. */
  builtIn?: boolean;
}

/** A character from the library: a reusable prompt fragment with a thumbnail. */
export interface GenCharacter {
  id: string;
  name: string;
  prompt: string;
  negativePrompt?: string;
  hasThumb: boolean;
}

/**
 * Whether image generation is configured and, if so, reachable. `enabled` is false when
 * no generator URL is set; `reachable` is false when a URL is set but the box didn't
 * answer (then `error` says why). `models` is the checkpoint list on success.
 */
export interface ImageGenStatus {
  enabled: boolean;
  reachable?: boolean;
  /** Which API the generator speaks — "a1111" or "invokeai" — detected server-side. */
  backend?: string;
  error?: string;
  models?: GenModel[];
  loras?: GenLora[];
  loraError?: string;
  vaes?: GenVae[];
  templates?: GenTemplate[];
  boards?: GalleryBoard[];
  detailerAvailable?: boolean;
}

/** A just-generated image, held server-side in memory until saved. `id` streams it. */
export interface GenPreview {
  id: string;
  seed: number;
}

/** One txt2img job. Only `prompt` is required; the server clamps the rest to sane ranges. */
export interface GenerateParams {
  prompt: string;
  negativePrompt?: string;
  checkpoint?: string;
  vae?: string;
  sampler?: string;
  steps?: number;
  width?: number;
  height?: number;
  cfgScale?: number;
  cfgRescale?: number;
  clipSkip?: number;
  seamlessX?: boolean;
  seamlessY?: boolean;
  vaePrecision?: "fp32" | "fp16";
  cpuNoise?: boolean;
  board?: string;
  seed?: number;
  count?: number;
  loras?: { name: string; weight: number }[];
  detailer?: {
    enabled: boolean;
    model?: string;
    prompt?: string;
    negativePrompt?: string;
    confidence?: number;
    denoise?: number;
    maskBlur?: number;
  };
}

/** The full editable record of a model or LoRA, mirrored from InvokeAI. */
export interface GenModelMeta {
  key: string;
  name: string;
  base?: string;
  type: string;
  description?: string;
  triggerPhrases: string[];
  defaults?: GenModelDefaults & { weight?: number };
}

/** One InvokeAI gallery board. Board id "none" is the uncategorized pile. */
export interface GalleryBoard {
  id: string;
  name: string;
  count: number;
}

export interface GalleryImage {
  name: string;
  width?: number;
  height?: number;
  created?: string;
}

export interface GalleryPage {
  items: GalleryImage[];
  total: number;
}

/** Portable generation settings read from an InvokeAI gallery image. */
export interface GalleryImageMetadata {
  prompt: string;
  negativePrompt: string;
  model: string;
  modelHash?: string;
  vae?: string;
  sampler: string;
  seed: number;
  steps: number;
  cfgScale: number;
  cfgRescale: number;
  clipSkip: number;
  width: number;
  height: number;
  seamlessX: boolean;
  seamlessY: boolean;
  cpuNoise: boolean;
  loras: { name: string; hash?: string; weight: number }[];
  backend: string;
}

/** One model from the Civitai catalogue (via civitai.red). */
export interface CivitaiModel {
  id: number;
  name: string;
  type: string;
  creator?: string;
  downloads: number;
  likes: number;
  versions: CivitaiVersion[];
}

export interface CivitaiVersion {
  id: number;
  name: string;
  base: string;
  trainedWords: string[];
  downloadUrl: string;
  sizeMB?: number;
  images: string[];
}

export interface CivitaiCategory {
  name: string;
  count: number;
}

/** One model download InvokeAI is running (or has finished). */
export interface InstallJob {
  id: number;
  status: string;
  source: string;
  error?: string;
  bytes?: number;
  totalBytes?: number;
}

/**
 * What Libby knows about this server: the library in numbers, plus what was added
 * most recently. Read so her built-in replies can answer library questions with no
 * model loaded — the same snapshot is folded into the system prompt when one is.
 */
export interface LibbyContext {
  version: string;
  uptimeSec: number;
  items: number;
  bytes: number;
  tags: number;
  kinds: KindStat[];
  aiEnabled: boolean;
  aiTagger: string;
  imageGen: boolean;
  chatModel?: string;
  recent: LibbyRecentItem[];
  /** Where the collection is thin or empty, as short facts — texture for the wants she
      voices, so a craving is grounded in what's actually missing. */
  gaps?: string[];
}

export interface LibbyRecentItem {
  id: number;
  title: string;
  kind: string;
  tags?: string[];
  at: number;
}

/** A Libby outfit: a name plus which emotions/tiers have art uploaded. */
/**
 * Something Libby has offered to do.
 *
 * Nothing here has happened. The server parses these out of her reply and hands them
 * over as proposals; only `api.libbyAct` performs one, and only a client draws that —
 * which means the user pressing Allow is the sole path by which anything she says
 * changes the library. `label` and `detail` are written server-side so a card renders
 * without the client holding a table of action kinds.
 */
export interface LibbyAction {
  id: string;
  kind: "generate" | "import" | "tag" | "favorite" | string;
  label: string;
  detail: string;
  prompt?: string;
  url?: string;
  mediaId?: number;
  mediaTitle?: string;
  tags?: string[];
}

/** One durable fact Libby has kept, carried between conversations. */
export interface LibbyMemory {
  id: string;
  text: string;
  /** When she noted it, epoch millis. */
  at: number;
  /** What sort of fact it is: boundary | relationship | preference | user | libby |
      emotional | shared. Absent on records written before memories had kinds; the
      server fills it in on read, so a listing always has one. */
  kind?: string;
  /** Importance, 1–5. Rises each time she learns the same thing again. */
  weight?: number;
  /** How sure she is, 0–1. Below the server's floor it is shown as uncertain. */
  confidence?: number;
  /** Exempt from being forgotten when the store fills up. The user's override. */
  pinned?: boolean;
  /** "libby" when she noticed it herself, "user" when it was typed in here. */
  source?: string;
  /** How many times it has been re-learned. */
  recalls?: number;
  updatedAt?: number;
  /** What it is worth right now — importance, discounted by certainty and age.
      Decides both what a prompt carries and what is eventually forgotten. */
  score?: number;
  /** The server's own verdict on `confidence`, so the floor lives in one place. */
  uncertain?: boolean;
}

/** What she may be told to remember, and how much she can hold. */
export interface LibbyMemoryListing {
  memories: LibbyMemory[];
  /** The kind vocabulary, server-owned so the editor's picker cannot drift from it. */
  kinds?: string[];
  /** How many memories the store keeps before it starts forgetting the weakest. */
  limit?: number;
}

/** The user's control over Libby starting conversations. */
export interface LibbyAutoSettings {
  /** The complete off switch. When false, nothing else here is consulted. */
  enabled: boolean;
  /** Local hours she leaves you alone between, 0–23. Equal values mean no quiet hours;
      from > to wraps midnight, which is the normal case for overnight. */
  quietFrom: number;
  quietTo: number;
  /** Her own floor between unprompted messages. The server enforces a hard minimum
      below this, which doubles as the guard against her replying to herself. */
  minGapMinutes: number;
  /** How many conversations she may start in one local day. 0 for no daily cap. */
  maxPerDay: number;
  /** Whether something she judges genuinely worth saying may get past the back-off
      that engages when she has gone unanswered. */
  allowImportant: boolean;
}

/** One record of her having spoken first, kept so "she keeps messaging me" is diagnosable. */
export interface LibbyAutoEvent {
  at: number;
  /** idle | mood | absence | want-arrived | unfinished */
  trigger: string;
  importance: number;
  detail?: string;
  /** Whether the user ever replied to this one. Written retroactively when they do. */
  answered?: boolean;
}

export interface LibbyAutoState {
  settings: LibbyAutoSettings;
  /** Consecutive unprompted messages with no reply since. */
  unanswered: number;
  lastAutoAt: number;
  sentToday: number;
  log: LibbyAutoEvent[];
  /** Whether a plain idle nudge would be allowed right now, and why not if it would
      not — so the settings screen can explain her silence without waiting to find out. */
  idle: LibbyAutoDecision;
}

/** The answer to "may she say something now?". */
export interface LibbyAutoDecision {
  allow: boolean;
  /** Always populated, allowed or not, and written for a person to read. */
  reason: string;
  /** When it is worth asking again, so a client sets its timer from the server's own
      arithmetic rather than guessing. */
  retryAfterSec?: number;
  trigger: string;
  importance: number;
}

/** One standing want of Libby's own — an outfit, some media, how a night goes — kept
    and carried between conversations the same way her memory is. */
export interface LibbyWant {
  id: string;
  text: string;
  /** When she voiced it, epoch millis. */
  at: number;
}

/** Where the two of you left off — the single standing record Libby carries between
    conversations, so she can open to the time that has passed and the mood she left on
    instead of cold. All fields zero for someone she has never talked to. */
export interface LibbyBond {
  /** Her last turn, epoch millis; 0 if there is no history yet. */
  lastSeenAt: number;
  /** The canonical emotion she ended the last turn on. */
  mood: string;
  /** Her arousal baseline as last stored, 1–5. */
  heat: number;
  /** That baseline decayed for the time she has been left alone — where she opens now. */
  heatNow: number;
  /** Closeness, 0–1, grown slowly across days talked. */
  warmth: number;
  /** The endearment she has settled on for you, if any. */
  petname: string;
  /** Last write, epoch millis. */
  updatedAt: number;
}

export interface LibbyOutfit {
  id: string;
  name: string;
  /** Emotions with baseline (tier 0) art — kept for older clients. */
  emotions: string[];
  /** For each emotion, which horniness tiers (0..4) have art. */
  emotionLevels?: Record<string, number[]>;
  /** Whether the cover endpoint will return a picture — an explicit cover, or any
      slot art to fall back on. Absent from older servers, which is treated as false. */
  hasThumb?: boolean;
  /** How many (emotion, tier) squares have art. What a card can honestly show. */
  slots?: number;
  /** How many squares exist in this wardrobe's work in progress, finished or not.
      Absent from older servers, which is treated as none. */
  wip?: number;
}

/**
 * One generated wardrobe square, held server-side until the outfit is deleted.
 *
 * This is the record, not the picture: the bytes come from libbyOutfitWipImageURL, so
 * a sixty-square board is one request plus lazily-loaded images. `reviewed` is whether
 * its background cutout has been checked by hand, and `config` fingerprints the
 * loadout it was generated from, so a board that has since been edited can tell which
 * squares still belong to it.
 */
export interface LibbyWipSquare {
  emotion: string;
  level: number;
  filename?: string;
  seed: number;
  reviewed: boolean;
  config?: string;
  /** The generation record, stored opaquely — the studio's own GenInfo shape. */
  info?: Record<string, unknown>;
  updatedAt: number;
}

/**
 * A saved equipment recipe: what the outfit studio's board was set to.
 *
 * Distinct from LibbyOutfit, which is the rendered wardrobe. One recipe can be
 * generated into several wardrobes, and exists before any image does. The server
 * stores `loadout` opaquely, so the shape below can gain axes without a server change —
 * clients spread it over their own defaults rather than trusting it wholesale.
 */
export interface LibbyLoadout {
  id: string;
  name: string;
  loadout: Record<string, unknown>;
  /** Client-supplied epoch millis, used only to break ties in the picker. */
  updatedAt?: number;
  /** Whether the cover endpoint will return a picture. Unlike a wardrobe there is no
      slot art to fall back on, so false means the card draws a placeholder. */
  hasThumb?: boolean;
}

/** One latency series: a route, or one outbound host the server fetches from.
    Percentiles are interpolated from fixed buckets, so they are close estimates
    rather than exact order statistics. */
export interface Timing {
  name: string;
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

/** The server's own account of where its time went. Read by the Diagnostics panel. */
export interface Diagnostics {
  version: string;
  uptimeSeconds: number;
  goroutines: number;
  heapMB: number;
  sysMB: number;
  gcCount: number;
  numCpu: number;
  /** False means the database could not enter WAL mode and every query in the
      process is serialized on one connection — which outweighs everything else
      on the panel, so it is called out first. */
  dbWal: boolean;
  dbOpenConns: number;
  dbInUse: number;
  dbWaitCount: number;
  dbWaitMs: number;
  metrics: {
    windowSeconds: number;
    counters: Record<string, number>;
    timings: Timing[];
  };
}

const TOKEN_KEY = "oppai_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function mascotSay(
  message: string,
  tone: "success" | "error" = "error",
  detail: { emotion?: string; intensity?: number; outfit?: string } = {},
) {
  window.dispatchEvent(new CustomEvent("oppai-mascot", { detail: { message, tone, ...detail } }));
}

/** GET requests currently in flight, keyed by URL.
 *
 * The client fires the same GET from more than one place on purpose — a view
 * mounts and asks for the library, the sidebar asks for the same counts, a
 * refresh handler fires while the first answer is still on the wire. Each of
 * those was a separate request, and on a box where the database was serialized
 * they queued behind each other for an answer that was already coming.
 *
 * Only GETs are shared. A POST or DELETE is an action, and two of them mean the
 * user asked twice; collapsing those would silently drop work. */
const inFlight = new Map<string, Promise<unknown>>();

async function request<T>(path: string, opts: RequestInit = {}, timeoutMs = 0): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  // Sharing is only safe when nothing about the call is per-caller: no body, no
  // caller-supplied abort signal (one caller's cancellation must never cancel
  // another's request).
  const shareable = method === "GET" && !opts.body && !opts.signal;
  if (shareable) {
    const existing = inFlight.get(path);
    if (existing) return existing as Promise<T>;
  }
  const p = requestOnce<T>(path, opts, timeoutMs);
  if (shareable) {
    inFlight.set(path, p);
    // Cleared on settle, not on success: a failed GET must be retryable, and
    // leaving a rejected promise in the map would keep handing back the failure.
    void p.catch(() => {}).finally(() => {
      if (inFlight.get(path) === p) inFlight.delete(path);
    });
  }
  return p;
}

async function requestOnce<T>(path: string, opts: RequestInit = {}, timeoutMs = 0): Promise<T> {
  const headers = new Headers(opts.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (opts.body && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  // A client-side deadline covering the WHOLE exchange — response headers *and*
  // body. The timer is cleared only after the response is fully read, so a
  // server that sends 200 headers then stalls the body (or trickles it) can't
  // leave the UI hung forever. Previously the timer was cleared as soon as the
  // headers arrived, leaving res.json() unbounded.
  //
  // A caller may also pass its own signal to cancel a request it no longer wants —
  // a view being navigated away from, a search box whose query has moved on. That
  // signal is *linked* rather than replaced: passing `signal: ctl.signal` straight
  // through used to discard the caller's, so cancellation was silently a no-op
  // whenever a timeout was set, and the abandoned request ran to completion and
  // still occupied a connection.
  const ctl = new AbortController();
  const caller = opts.signal;
  if (caller) {
    if (caller.aborted) ctl.abort(caller.reason);
    else caller.addEventListener("abort", () => ctl.abort(caller.reason), { once: true });
  }
  const timer = timeoutMs > 0 ? setTimeout(() => ctl.abort(new DOMException("timeout", "TimeoutError")), timeoutMs) : null;
  const timedOut = () => ctl.signal.aborted && (ctl.signal.reason as DOMException)?.name === "TimeoutError";
  try {
    const res = await fetch(path, { ...opts, headers, signal: ctl.signal });
    if (res.status === 401) {
      if (path !== "/api/auth/login") {
        setToken(null);
        window.dispatchEvent(new CustomEvent("oppai-logout"));
        mascotSay("Your session ended. Please sign in again.");
      }
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const body = await res.json();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    if (timedOut()) {
      const error = new Error("Timed out — the site was too slow or unreachable.");
      if (path !== "/api/auth/login") mascotSay(error.message);
      throw error;
    }
    // A caller-initiated cancellation is not a failure and must not be announced.
    // The user navigated away; telling them their own navigation went wrong is
    // noise, and the old code reported every abort as a timeout.
    if (ctl.signal.aborted) throw new DOMException("cancelled", "AbortError");
    if (path !== "/api/auth/login" && e instanceof Error && e.message !== "unauthorized") {
      mascotSay(e.message || "Something went wrong.");
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const api = {
  health: () => request<{ status: string; version: string; aiEnabled: boolean; aiTagger: string }>("/api/health"),

  // `client: "web"` is what opts this session into the browser rules: it idles out
  // after an hour of inactivity and it does not survive a server restart. The Android
  // app says "android" instead and is exempt from both.
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, client: "web" }),
    }),
  // The session probe. Deliberately does NOT count as activity server-side, so polling
  // it to check whether we're still signed in can't itself keep an idle tab alive.
  me: () => request<User>("/api/auth/me"),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),

  // ── passkeys ───────────────────────────────────────────────────────────
  // The ceremony handle is the server's own reference to the challenge it issued; the
  // client carries it back but never the challenge itself, which is what makes a
  // replay impossible. See passkeys.ts for the browser-side conversions.
  beginPasskeyLogin: (username?: string) =>
    request<PasskeyCeremony>("/api/auth/passkey/login/begin", {
      method: "POST",
      body: JSON.stringify(username ? { username } : {}),
    }),
  finishPasskeyLogin: (ceremony: string, credential: unknown) =>
    request<{ token: string; user: User }>("/api/auth/passkey/login/finish", {
      method: "POST",
      body: JSON.stringify({ ceremony, credential, client: "web" }),
    }),
  passkeys: () => request<PasskeyList>("/api/auth/passkeys"),
  beginPasskeyRegistration: () =>
    request<PasskeyCeremony>("/api/auth/passkeys/begin", { method: "POST" }),
  finishPasskeyRegistration: (ceremony: string, name: string, credential: unknown) =>
    request<Passkey>("/api/auth/passkeys/finish", {
      method: "POST",
      body: JSON.stringify({ ceremony, name, credential }),
    }),
  renamePasskey: (id: number, name: string) =>
    request<{ status: string }>(`/api/auth/passkeys/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  /** Revoking asks for the password: a live session is not proof that the person at the
      keyboard owns the account, and it is the only factor guaranteed to be available —
      you cannot confirm revoking a passkey with the passkey you are revoking. */
  revokePasskey: (id: number, password: string) =>
    request<void>(`/api/auth/passkeys/${id}/revoke`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  listMedia: (kind = "", limit = 60, offset = 0) => {
    const q = new URLSearchParams();
    if (kind) q.set("kind", kind);
    q.set("limit", String(limit));
    q.set("offset", String(offset));
    return request<{ items: Media[] }>(`/api/media?${q}`);
  },
  getMedia: (id: number) => request<Media>(`/api/media/${id}`),
  // <img>/<video> can't set headers; auth rides on the HttpOnly session cookie
  // set at login (same-origin request).
  streamURL: (id: number) => `/api/media/${id}/stream`,
  // Poster/thumbnail: a generated video frame, or the item's own bytes for
  // image/gif. Cheap enough to use for every grid tile.
  thumbURL: (id: number) => `/api/media/${id}/thumb`,
  // Route a remote asset through the server so hotlink/referer-guarded hosts
  // still preview (and so a preview matches what import will actually fetch).
  proxyURL: (u: string) => `/api/scrape/proxy?url=${encodeURIComponent(u)}`,
  upload: (file: File, title?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (title) fd.append("title", title);
    return request<{ id: number; sha256: string; deduped: boolean }>("/api/media", {
      method: "POST",
      body: fd,
    });
  },
  // ── resumable uploads ──────────────────────────────────────────────────
  // The whole-file POST above stays the path for a picture. These back the upload
  // manager, where the server owns the session and the client's job is to send the
  // chunks it does not already have. See uploads.ts.
  listUploadSessions: () => request<{ items: UploadSession[] }>("/api/uploads"),
  createUploadSession: (body: {
    filename: string;
    size: number;
    mime?: string;
    title?: string;
    kind?: string;
    fingerprint: string;
    chunkSize?: number;
  }) => request<UploadSession>("/api/uploads", { method: "POST", body: JSON.stringify(body) }),
  uploadSession: (id: string) => request<UploadSession>(`/api/uploads/${id}`),
  completeUploadSession: (id: string, sha256?: string) =>
    request<{ id: number; sha256: string; deduped: boolean; kind?: string }>(
      `/api/uploads/${id}/complete`,
      { method: "POST", body: JSON.stringify(sha256 ? { sha256 } : {}) },
    ),
  cancelUploadSession: (id: string) =>
    request<{ status: string }>(`/api/uploads/${id}`, { method: "DELETE" }),

  storage: () => request<StorageReport>("/api/storage"),
  cleanupStorage: (categories: string[]) =>
    request<{ freedBytes: number; freedHuman: string; categories: string[]; storage: StorageReport }>(
      "/api/storage/cleanup",
      { method: "POST", body: JSON.stringify({ categories }) },
    ),

  autotag: (id: number) =>
    request<{ tags: MediaTag[] }>(`/api/media/${id}/autotag`, { method: "POST" }),
  /** Runs the AI tagger over an uploaded image without importing it — used to
      derive booru tags for a character from a reference picture. */
  scanImage: (imageData: string) =>
    request<{ tags: { tag: string; category: string; score: number }[] }>(
      "/api/ai/scan-image",
      { method: "POST", body: JSON.stringify({ imageData }) },
      60_000,
    ),

  // Comics are read page-by-page from the server-side archive; the client never
  // downloads the whole file.
  comicInfo: (id: number) => request<ComicInfo>(`/api/media/${id}/comic`),
  pageURL: (id: number, page: number) => `/api/media/${id}/page/${page}`,

  getSettings: () => request<SettingsResponse>("/api/settings"),
  saveSettings: (patch: Partial<Settings>) =>
    request<SettingsResponse>("/api/settings", { method: "PUT", body: JSON.stringify(patch) }),
  stats: () => request<Stats>("/api/stats"),
  /** Server performance snapshot. Admin-only; see Diagnostics in Settings. */
  diagnostics: () => request<Diagnostics>("/api/diagnostics"),
  /** Zero the counters so the next interaction can be measured on its own. */
  resetDiagnostics: () => request<{ status: string }>("/api/diagnostics/reset", { method: "POST" }),
  changePassword: (current: string, next: string) =>
    request<{ status: string }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify({ current, new: next }),
    }),
  updateMedia: (id: number, patch: MediaPatch) =>
    request<Media>(`/api/media/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteMedia: (id: number) =>
    request<void>(`/api/media/${id}`, { method: "DELETE" }),
  bulkMedia: (action: "delete" | "update", ids: number[], patch?: MediaPatch) =>
    request<{ ok: number[]; failed: number[] }>("/api/media/bulk", {
      method: "POST",
      body: JSON.stringify({ action, ids, patch: patch ?? {} }),
    }),

  scrape: (url: string) =>
    request<ScrapeResult>(
      "/api/scrape",
      { method: "POST", body: JSON.stringify({ url }) },
      45_000,
    ),
  scrapeBulk: (urls: string[]) =>
    request<{ items: BulkScrapeItem[] }>(
      "/api/scrape/bulk",
      { method: "POST", body: JSON.stringify({ urls }) },
      // Server caps each URL at ~30s and fetches them concurrently, so the whole
      // batch resolves within that; give generous headroom before giving up.
      75_000,
    ),
  scrapeImport: (payload: {
    url?: string;
    mediaUrls?: string[];
    title?: string;
    tags?: string[];
    categorizedTags?: ScrapedTag[];
    kind?: string;
  }) =>
    request<{ imported: number[]; count: number }>("/api/scrape/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // The companion Android app, served from the box that holds the library.
  apkInfo: () => request<APKInfo>("/api/apk/info"),

  // ── remote sources ─────────────────────────────────────────────────────
  sources: () => request<{ sources: RemoteSource[] }>("/api/sources"),

  /** The site's own favicon, fetched by the server.
   *
   * Not loaded directly by the browser: the page's CSP forbids third-party image
   * origins, and there's no reason for a browser to open a connection to one of these
   * hosts just to draw a tab icon. 404 when the site has no usable icon, which the
   * tab renders as a monogram. */
  sourceIconURL: (id: string) => `/api/sources/${encodeURIComponent(id)}/icon`,

  /** Inspect a listing page and propose an adapter for it. Admin-only. Takes a while:
      it fetches the page, then dry-runs the proposal against it. */
  analyzeSource: (url: string) =>
    request<SourceProposal>("/api/sources/analyze", { method: "POST", body: JSON.stringify({ url }) }, 60_000),
  /** Install a reviewed adapter. The server validates it and it becomes browsable
      immediately — no restart. */
  saveSource: (yaml: string) =>
    request<{ id: string; name: string }>("/api/sources", { method: "POST", body: JSON.stringify({ yaml }) }),
  /** Remove a site that was added from the UI. Built-ins can't be removed. */
  deleteSource: (id: string) =>
    request<void>(`/api/sources/${encodeURIComponent(id)}`, { method: "DELETE" }),

  browseSource: (
    id: string,
    opts: { feed?: string; cursor?: string; q?: string; sort?: string } = {},
  ) => {
    const p = new URLSearchParams();
    if (opts.feed) p.set("feed", opts.feed);
    if (opts.cursor) p.set("cursor", opts.cursor);
    if (opts.q) p.set("q", opts.q);
    if (opts.sort) p.set("sort", opts.sort);
    // Someone else's site is on the other end of this; give it room to answer.
    return request<SourceListing>(`/api/sources/${id}/browse?${p}`, {}, 45_000);
  },

  sourcePages: (id: string, item: string) =>
    request<{ pages: string[]; count: number }>(
      `/api/sources/${encodeURIComponent(id)}/item/${encodeURIComponent(item)}/pages`,
      {},
      45_000,
    ),

  // The conversation an item was posted in. `item` is a SourceItem.threadId; sources
  // without discussions answer 404, which the caller shows as "no comments here".
  sourceComments: (id: string, item: string) =>
    request<{ comments: SourceComment[]; count: number }>(
      `/api/sources/${encodeURIComponent(id)}/item/${encodeURIComponent(item)}/comments`,
      {},
      45_000,
    ),

  // Remote media is proxied so the origin never sees the browser's IP, and so
  // hotlink-guarded hosts render. The server refuses any host that isn't a
  // registered source, which is what keeps this from being an open proxy.
  sourceStreamURL: (u: string) => `/api/sources/stream?url=${encodeURIComponent(u)}`,

  saveFromSource: (
    id: string,
    body: { mediaUrl?: string; itemId?: string; pageUrl?: string; title?: string; kind?: string; tags?: string[] },
  ) =>
    request<{ imported: number[]; count: number }>(
      `/api/sources/${encodeURIComponent(id)}/save`,
      { method: "POST", body: JSON.stringify(body) },
      // A comic save downloads every page with a politeness delay between them, so a
      // long gallery is minutes, not seconds. The server finishes the import even if
      // this gives up (it detaches from the connection) — this deadline only decides
      // how long we wait to report it.
      15 * 60_000,
    ),

  // ── image generation ───────────────────────────────────────────────────────
  // Generated images live only in memory on the server until saveGenerated copies one
  // into the library. Everything here talks to a local generator on the user's network.

  imageGenStatus: () => request<ImageGenStatus>("/api/imagegen/status", {}, 12_000),

  booruTags: (q: string) => request<{ suggestions: string[]; correction?: string }>(
    `/api/imagegen/tags?q=${encodeURIComponent(q)}`,
  ),
  gameGallery: (gameId: number) => request<{ items: Media[] }>(`/api/media/${gameId}/gallery`),
  uploadGameGallery: (gameId: number, file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return request<Media>(`/api/media/${gameId}/gallery`, { method: "POST", body: fd });
  },
  removeGameGallery: (gameId: number, mediaId: number) =>
    request<void>(`/api/media/${gameId}/gallery/${mediaId}`, { method: "DELETE" }),
  // Turn a scrap of (spoken) natural language into a fuller prompt + negative prompt.
  optimizePrompt: (text: string) =>
    request<{ prompt: string; negativePrompt: string }>("/api/imagegen/prompt", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // Generation is slow (tens of seconds on CPU, longer for a batch); give it room.
  generate: (params: GenerateParams) =>
    request<{ images: GenPreview[]; prompt: string }>(
      "/api/imagegen/generate",
      { method: "POST", body: JSON.stringify(params) },
      10 * 60_000,
    ),

  // Streams an in-memory preview through its short-lived opaque id. Reads remain
  // available after a web session expires; replacing, deleting and saving stay gated.
  genPreviewURL: (id: string) => `/api/imagegen/preview/${encodeURIComponent(id)}`,

  replaceGenPreview: (id: string, imageData: string) =>
    request<{ status: string }>(`/api/imagegen/preview/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ imageData }),
    }),

  deleteGenPreview: (id: string) =>
    request<{ status: string }>(`/api/imagegen/preview/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  saveGenerated: (body: { id: string; title?: string; tags?: string[] }) =>
    request<{ id: number; existed: boolean }>("/api/imagegen/save", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Cover art is read from and written to InvokeAI's model manager.
  modelThumbURL: (model: string) => `/api/imagegen/model-thumb?model=${encodeURIComponent(model)}`,
  setModelThumb: (body: { model: string; previewId: string }) =>
    request<{ status: string }>("/api/imagegen/model-thumb", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  chatStatus: () => request<ChatStatus>("/api/chat/status", {}, 12_000),
  chat: (body: ChatTurn) =>
    request<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ emotion: "neutral", intensity: 1, characterId: "libby", ...body }),
    }, 125_000),
  // Bounded, like every other chat call. This one is what the Chat screen blocks its
  // spinner on, so an unbounded fetch here is the difference between "an error you can
  // act on" and a view that spins forever with nothing on screen to explain it.
  chatWorkspace: () => request<ChatWorkspace>("/api/chat/workspace", {}, 30_000),
  chatModels: () => request<ChatModels>("/api/chat/models", {}, 20_000),
  loadChatModel: (modelName: string, args: Record<string, unknown> = {}) =>
    request<{ status: string; loaded: string }>("/api/chat/models/load", {
      method: "POST", body: JSON.stringify({ modelName, args }),
    }, 10 * 60_000),
  unloadChatModel: () => request<{ status: string }>("/api/chat/models/unload", { method: "POST" }, 130_000),

  /** What deleting a model would actually remove: the path, every file, the bytes, and
      whether it is the resident model. Read before asking, so the confirmation can show
      what is being lost. Admin-only. */
  inspectChatModel: (model: string) =>
    request<ChatModelInspection>(`/api/chat/models/inspect?model=${encodeURIComponent(model)}`, {}, 30_000),
  /** Deletes a model. `confirm` must repeat the model's name — a boolean would be
      satisfied by any retry and proves nothing about what the user saw. Moves to a
      recoverable trash folder unless `permanent`. */
  deleteChatModel: (model: string, confirm: string, permanent = false) =>
    request<ChatModelDeletion>("/api/chat/models/delete", {
      method: "POST",
      body: JSON.stringify({ model, confirm, permanent }),
    }, 120_000),
  saveChatWorkspace: (workspace: ChatWorkspace) =>
    request<ChatWorkspace>("/api/chat/workspace", {
      method: "PUT",
      body: JSON.stringify(workspace),
    }, 30_000),
  uploadChatImage: (body: { characterId: string; name: string; imageData: string; tags?: string[] }) =>
    request<ChatImage>("/api/chat/images", { method: "POST", body: JSON.stringify(body) }, 120_000),
  deleteChatImage: (id: string) =>
    request<{ status: string }>(`/api/chat/images/${encodeURIComponent(id)}`, { method: "DELETE" }),
  chatImageURL: (id: string) => `/api/chat/images/${encodeURIComponent(id)}`,
  loraThumbURL: (name: string) => `/api/imagegen/lora-thumb?name=${encodeURIComponent(name)}`,

  // ── character library ──────────────────────────────────────────────────────
  // Reusable prompt fragments with a name and a face; stored encrypted server-side.

  characters: () => request<{ characters: GenCharacter[] }>("/api/imagegen/characters"),
  saveCharacter: (body: {
    id?: string;
    name: string;
    prompt: string;
    negativePrompt?: string;
    previewId?: string;
    imageData?: string;
  }) =>
    request<GenCharacter>("/api/imagegen/characters", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteCharacter: (id: string) =>
    request<{ status: string }>(`/api/imagegen/characters/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  characterThumbURL: (id: string) => `/api/imagegen/characters/${encodeURIComponent(id)}/thumb`,

  // ── model metadata (InvokeAI model manager) ────────────────────────────────
  // Reads and writes the generator's own model records, so edits here are the
  // same edits InvokeAI's model manager would make.

  modelMeta: (name: string) =>
    request<GenModelMeta>(`/api/imagegen/model?name=${encodeURIComponent(name)}`, {}, 20_000),
  patchModelMeta: (body: {
    key: string;
    name?: string;
    description?: string;
    triggerPhrases?: string[];
    defaults?: GenModelMeta["defaults"];
  }) =>
    request<GenModelMeta>("/api/imagegen/model", {
      method: "PATCH",
      body: JSON.stringify(body),
    }, 25_000),

  // ── InvokeAI gallery ───────────────────────────────────────────────────────
  // The generator's own gallery (it keeps every finished image), browsed and
  // pruned from here. Save copies one image into the library.

  galleryBoards: () => request<{ boards: GalleryBoard[] }>("/api/imagegen/gallery/boards", {}, 20_000),
  createGalleryBoard: (name: string) =>
    request<GalleryBoard>("/api/imagegen/gallery/boards", {
      method: "POST",
      body: JSON.stringify({ name }),
    }, 20_000),
  // Removes the board itself; its images survive, dropped back to Uncategorized.
  deleteGalleryBoard: (id: string) =>
    request<{ status: string }>(`/api/imagegen/gallery/boards/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }, 20_000),
  galleryImages: (board: string, offset = 0, limit = 60) =>
    request<GalleryPage>(
      `/api/imagegen/gallery/images?board=${encodeURIComponent(board)}&offset=${offset}&limit=${limit}`,
      {},
      20_000,
    ),
  galleryThumbURL: (name: string) => `/api/imagegen/gallery/image/${encodeURIComponent(name)}/thumb`,
  galleryFullURL: (name: string) => `/api/imagegen/gallery/image/${encodeURIComponent(name)}`,
  galleryImageMetadata: (name: string) =>
    request<GalleryImageMetadata>(
      `/api/imagegen/gallery/image/${encodeURIComponent(name)}/metadata`,
      {},
      20_000,
    ),
  deleteGalleryImage: (name: string) =>
    request<{ status: string }>(`/api/imagegen/gallery/image/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),
  deleteGalleryImages: (names: string[]) =>
    request<{ status: string }>("/api/imagegen/gallery/delete", {
      method: "POST",
      body: JSON.stringify({ names }),
    }, 40_000),
  addGalleryImagesToBoard: (board: string, names: string[]) =>
    request<{ status: string }>("/api/imagegen/gallery/board", {
      method: "POST",
      body: JSON.stringify({ board, names }),
    }, 40_000),
  saveGalleryImage: (body: { name: string; title?: string; tags?: string[] }) =>
    request<{ id: number; existed: boolean }>("/api/imagegen/gallery/save", {
      method: "POST",
      body: JSON.stringify(body),
    }, 90_000),

  // ── Civitai browser ────────────────────────────────────────────────────────
  // The public catalogue via civitai.red, proxied through the server. Install
  // hands a download URL to InvokeAI, which fetches the file itself.

  civitaiSearch: (opts: { q?: string; type?: string; category?: string; sort?: string; cursor?: string } = {}) => {
    const p = new URLSearchParams();
    if (opts.q) p.set("q", opts.q);
    if (opts.type) p.set("type", opts.type);
    if (opts.category) p.set("category", opts.category);
    if (opts.sort) p.set("sort", opts.sort);
    if (opts.cursor) p.set("cursor", opts.cursor);
    return request<{ items: CivitaiModel[]; nextCursor?: string }>(
      `/api/imagegen/civitai/search?${p}`,
      {},
      45_000,
    );
  },
  civitaiCategories: () =>
    request<{ categories: CivitaiCategory[] }>("/api/imagegen/civitai/categories", {}, 30_000),
  civitaiImageURL: (u: string) => `/api/imagegen/civitai/image?url=${encodeURIComponent(u)}`,
  civitaiInstall: (url: string) =>
    request<InstallJob>("/api/imagegen/civitai/install", {
      method: "POST",
      body: JSON.stringify({ url }),
    }, 30_000),
  civitaiInstalls: () => request<{ jobs: InstallJob[] }>("/api/imagegen/civitai/installs", {}, 20_000),

  // ── Libby outfits ──────────────────────────────────────────────────────────
  // User-made wardrobes for the mascot: one image per emotion, stored encrypted
  // server-side. Which outfit is worn is a per-device choice (see libby.ts).

  libbyContext: () => request<LibbyContext>("/api/libby/context", {}, 15_000),

  // ── Libby memory ─────────────────────────────────────────────────────────
  // The durable facts Libby keeps about you between conversations. She writes them from
  // her own replies on the chat path, silently; these are the user's side of that store —
  // read it, correct what she got wrong, pin what must never be forgotten, add what she
  // has not noticed, and clear it.
  libbyMemory: () => request<LibbyMemoryListing>("/api/libby/memory", {}, 15_000),
  addLibbyMemory: (body: { text: string; kind?: string; weight?: number; pinned?: boolean }) =>
    request<LibbyMemory>("/api/libby/memory", { method: "POST", body: JSON.stringify(body) }),
  // A PATCH, so only the fields present change: unpinning must not also blank the text.
  updateLibbyMemory: (id: string, body: { text?: string; kind?: string; weight?: number; pinned?: boolean }) =>
    request<LibbyMemory>(`/api/libby/memory/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  clearLibbyMemory: () =>
    request<{ status: string }>("/api/libby/memory", { method: "DELETE" }),
  forgetLibbyMemory: (id: string) =>
    request<{ status: string }>(`/api/libby/memory/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ── Libby speaking first ─────────────────────────────────────────────────
  // The client owns the idle timer — it is the only thing that knows whether anyone is
  // looking at the screen — but the server owns the decision: quiet hours, how often, and
  // how long she keeps trying before she gives up on being answered. Unlike an in-memory
  // guard, its state survives the reload that used to buy another nudge every time.
  libbyAuto: () => request<LibbyAutoState>("/api/libby/auto", {}, 15_000),
  saveLibbyAuto: (settings: LibbyAutoSettings) =>
    request<{ settings: LibbyAutoSettings }>("/api/libby/auto", { method: "PUT", body: JSON.stringify(settings) }),
  // Checking changes nothing: generating her message can fail, and a check that spent the
  // allowance would let a broken backend silence her for hours.
  libbyAutoCheck: (body: { trigger: string }) =>
    request<LibbyAutoDecision>("/api/libby/auto/check", { method: "POST", body: JSON.stringify(body) }, 10_000),
  libbyAutoSent: (body: { trigger: string; detail?: string }) =>
    request<{ status: string }>("/api/libby/auto/sent", { method: "POST", body: JSON.stringify(body) }, 10_000),
  libbyAutoAnswered: () =>
    request<{ status: string }>("/api/libby/auto/answered", { method: "POST" }, 10_000),

  // ── Libby wants ──────────────────────────────────────────────────────────
  // Her own standing desires, kept the same way as her memory. Written from her own
  // replies on the chat path (server-side, silent); these only read and clear them.
  libbyWants: () => request<{ wants: LibbyWant[] }>("/api/libby/wants", {}, 15_000),
  clearLibbyWants: () =>
    request<{ status: string }>("/api/libby/wants", { method: "DELETE" }),
  forgetLibbyWant: (id: string) =>
    request<{ status: string }>(`/api/libby/wants/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // ── Libby on Discord ─────────────────────────────────────────────────────
  // The token is write-only from here: it goes in through connect and is never
  // returned by anything. Everything else is the policy — who may talk to her, which
  // channels she may read, which she may post in — plus the audit log of what she
  // actually did and what was refused.
  discord: () => request<DiscordState>("/api/discord", {}, 15_000),
  connectDiscord: (token: string) =>
    request<DiscordState>("/api/discord/connect", { method: "POST", body: JSON.stringify({ token }) }, 30_000),
  disconnectDiscord: () =>
    request<{ status: string; note: string }>("/api/discord/disconnect", { method: "POST" }),
  saveDiscordSettings: (patch: Partial<Pick<DiscordState, "enabled" | "users" | "channels" | "memory" | "pollSeconds" | "perHour">>) =>
    request<DiscordState>("/api/discord/settings", { method: "PUT", body: JSON.stringify(patch) }),
  /** The servers the bot has been added to, and their channels. Listing is not
      access — nothing is read until a channel is on the allowlist. */
  discordPlaces: () =>
    request<{ servers: DiscordPlace[] }>("/api/discord/places", {}, 40_000),
  /** Sends one message as the bot, subject to the same channel allowlist. */
  discordSay: (channelId: string, text: string) =>
    request<{ status: string }>("/api/discord/say", { method: "POST", body: JSON.stringify({ channelId, text }) }),

  // ── A link handed to Libby ───────────────────────────────────────────────
  // The one path that fetches. A chat turn can only use a link that was previewed
  // here first, so a message can never make the server hit an address — and you have
  // seen what she is about to be shown before she is shown it.
  libbyLink: (url: string) =>
    request<SharedLink>("/api/libby/link", { method: "POST", body: JSON.stringify({ url }) }, 60_000),

  // ── Libby's own likeness ─────────────────────────────────────────────────
  // Which pictures in the library are of her. The label itself lives on the media row
  // as a `character:libby` tag, so it is visible and searchable like any other; these
  // endpoints own the settings, the manual verdicts, and the reference set.
  libbyIdentity: () => request<LibbyIdentity>("/api/libby/identity", {}, 15_000),
  saveLibbyIdentity: (settings: { auto?: boolean; floor?: number }) =>
    request<LibbyIdentity>("/api/libby/identity", { method: "PUT", body: JSON.stringify(settings) }),
  /** "This is Libby", or "this is not". A no is remembered, so recognition does not
      simply put the tag back on the next pass. */
  markLibbyIdentity: (body: { mediaId: number; isLibby: boolean; reference?: boolean }) =>
    request<LibbyIdentity>("/api/libby/identity/mark", { method: "POST", body: JSON.stringify(body) }),
  /** Runs recognition over what is already on the shelves — the ingest hook only ever
      sees imports from now on. Safe to press twice. */
  scanLibbyIdentity: () =>
    request<{ checked: number; tagged: number }>("/api/libby/identity/scan", { method: "POST" }, 120_000),

  // ── Libby bond ───────────────────────────────────────────────────────────
  // Where the two of you left off. Written from her own turns on the chat path; GET seeds
  // the opening sprite (heatNow, mood) and the settings panel, DELETE resets it.
  libbyBond: () => request<LibbyBond>("/api/libby/bond", {}, 15_000),
  resetLibbyBond: () =>
    request<{ status: string }>("/api/libby/bond", { method: "DELETE" }),

  /** Candidate poster frames for a video, evenly spaced across its running time.
      One request, because every frame read costs a decrypt of the whole blob. */
  posterFrames: (id: number, count = 20) =>
    request<{ duration: number; frames: { at: number; image: string }[] }>(
      `/api/media/${id}/frames?count=${count}`,
    ),
  /** Re-renders the poster from a chosen offset, in seconds. */
  setPoster: (id: number, at: number) =>
    request<{ status: string; at: number }>(`/api/media/${id}/thumb`, {
      method: "PUT", body: JSON.stringify({ at }),
    }),

  /** Performs one action the user has approved. The only call in the app that acts
      on something Libby said, and it exists solely to be made by an Allow button. */
  libbyAct: (action: LibbyAction) =>
    request<Record<string, unknown>>("/api/libby/act", {
      method: "POST",
      body: JSON.stringify({
        kind: action.kind, prompt: action.prompt, url: action.url,
        mediaId: action.mediaId, tags: action.tags,
      }),
    }),

  libbyOutfits: () => request<{ outfits: LibbyOutfit[] }>("/api/libby/outfits"),
  saveLibbyOutfit: (body: { id?: string; name: string }) =>
    request<LibbyOutfit>("/api/libby/outfits", { method: "POST", body: JSON.stringify(body) }),
  deleteLibbyOutfit: (id: string) =>
    request<{ status: string }>(`/api/libby/outfits/${encodeURIComponent(id)}`, { method: "DELETE" }),
  setLibbyEmotion: (id: string, emotion: string, imageData: string, level = 0) =>
    request<{ status: string }>(
      `/api/libby/outfits/${encodeURIComponent(id)}/emotions/${encodeURIComponent(emotion)}${level ? `?level=${level}` : ""}`,
      { method: "PUT", body: JSON.stringify({ imageData }) },
    ),
  deleteLibbyEmotion: (id: string, emotion: string, level = 0) =>
    request<{ status: string }>(
      `/api/libby/outfits/${encodeURIComponent(id)}/emotions/${encodeURIComponent(emotion)}${level ? `?level=${level}` : ""}`,
      { method: "DELETE" },
    ),
  libbyEmotionURL: (id: string, emotion: string, level = 0) =>
    `/api/libby/outfits/${encodeURIComponent(id)}/emotions/${encodeURIComponent(emotion)}${level ? `?level=${level}` : ""}`,
  /** An outfit's cover art. `v` busts the browser cache after a cover is changed —
      the URL is otherwise stable, and a card that keeps showing the old picture is
      indistinguishable from a save that did not work. */
  libbyOutfitThumbURL: (id: string, v?: number) =>
    `/api/libby/outfits/${encodeURIComponent(id)}/thumb${v ? `?v=${v}` : ""}`,
  setLibbyOutfitThumb: (id: string, imageData: string) =>
    request<{ status: string }>(`/api/libby/outfits/${encodeURIComponent(id)}/thumb`, {
      method: "PUT", body: JSON.stringify({ imageData }),
    }),
  clearLibbyOutfitThumb: (id: string) =>
    request<{ status: string }>(`/api/libby/outfits/${encodeURIComponent(id)}/thumb`, { method: "DELETE" }),

  /** Every square generated into a wardrobe so far, without the image bytes. */
  libbyOutfitWip: (id: string) =>
    request<{ squares: LibbyWipSquare[] }>(`/api/libby/outfits/${encodeURIComponent(id)}/wip`),
  /** Files one generated square. Overwrites whatever take was there before, which is
      what makes a redo a replacement rather than a second copy. */
  putLibbyOutfitWip: (
    id: string,
    emotion: string,
    level: number,
    body: {
      imageData: string;
      filename?: string;
      seed?: number;
      reviewed?: boolean;
      config?: string;
      info?: unknown;
    },
  ) =>
    request<LibbyWipSquare>(
      `/api/libby/outfits/${encodeURIComponent(id)}/wip/${encodeURIComponent(emotion)}${level ? `?level=${level}` : ""}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  deleteLibbyOutfitWip: (id: string, emotion: string, level = 0) =>
    request<{ status: string }>(
      `/api/libby/outfits/${encodeURIComponent(id)}/wip/${encodeURIComponent(emotion)}${level ? `?level=${level}` : ""}`,
      { method: "DELETE" },
    ),
  /** A stored square's picture. `v` busts the cache after a redo replaces the bytes
      under an otherwise stable URL. */
  libbyOutfitWipImageURL: (id: string, emotion: string, level = 0, v?: number) => {
    const query = [level ? `level=${level}` : "", v ? `v=${v}` : ""].filter(Boolean).join("&");
    return `/api/libby/outfits/${encodeURIComponent(id)}/wip/${encodeURIComponent(emotion)}${query ? `?${query}` : ""}`;
  },

  libbyLoadouts: () => request<{ loadouts: LibbyLoadout[] }>("/api/libby/loadouts"),
  saveLibbyLoadout: (body: { id?: string; name: string; loadout: Record<string, unknown> }) =>
    request<LibbyLoadout>("/api/libby/loadouts", {
      method: "POST", body: JSON.stringify({ ...body, updatedAt: Date.now() }),
    }),
  deleteLibbyLoadout: (id: string) =>
    request<{ status: string }>(`/api/libby/loadouts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  /** A loadout's cover art. `v` busts the browser cache after a save, for the same
      reason libbyOutfitThumbURL does. */
  libbyLoadoutThumbURL: (id: string, v?: number) =>
    `/api/libby/loadouts/${encodeURIComponent(id)}/thumb${v ? `?v=${v}` : ""}`,
  setLibbyLoadoutThumb: (id: string, imageData: string) =>
    request<{ status: string }>(`/api/libby/loadouts/${encodeURIComponent(id)}/thumb`, {
      method: "PUT", body: JSON.stringify({ imageData }),
    }),
  clearLibbyLoadoutThumb: (id: string) =>
    request<{ status: string }>(`/api/libby/loadouts/${encodeURIComponent(id)}/thumb`, { method: "DELETE" }),
};
