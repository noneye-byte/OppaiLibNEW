package net.fourbakers.oppailib.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class MediaTag(
    val id: Long = 0,
    val name: String,
    val category: String = "general",
    val source: String? = null,
    val score: Double? = null,
)

@Serializable
data class Media(
    val id: Long,
    val kind: String,
    val sha256: String,
    val size: Long,
    val title: String = "",
    val notes: String? = null,
    val source: String? = null,
    val rating: Int = 0,
    val favorite: Boolean = false,
    val duration: Double? = null,
    val width: Int? = null,
    val height: Int? = null,
    val pageCount: Int? = null,
    val hasThumb: Boolean = false,
    /** Where to actually get a game — usually its store page. */
    val download: String? = null,
    /** Screenshot URLs for a game. They live on the origin site, not on us. */
    val gallery: List<String> = emptyList(),
    val tags: List<MediaTag> = emptyList(),
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
) {
    /**
     * The platforms the scraper found, lowercased. Filed as their own tag category,
     * so this is a fact about the release and not a guess from a general tag that
     * might just be describing the subject matter.
     */
    val platforms: List<String>
        get() = tags.filter { it.category == "platform" }.map { it.name.lowercase() }

    /**
     * Null when the source never told us — which is not the same as "no". Games
     * imported before the scraper learned to read platforms have no platform tags
     * at all, and claiming those don't run on Android would be a lie.
     */
    val runsOnAndroid: Boolean?
        get() = if (platforms.isEmpty()) null else "android" in platforms
}

/**
 * Whether a comic's archive can be paged through in-app, and how many pages it
 * holds. [reason] carries the server's explanation when it can't be opened (an
 * unsupported archive format, say) so the reader can show it instead of a blank.
 */
@Serializable
data class ComicInfo(
    val readable: Boolean = false,
    val pages: Int = 0,
    val reason: String? = null,
)

/**
 * An edit to one item. Every field is nullable and defaults to null, and the Json
 * encoder omits defaults — so a patch carries only what the user actually touched,
 * and the server leaves the rest of the row alone. Sending `favorite = false` still
 * writes, because false differs from the null default.
 */
@Serializable
data class MediaPatch(
    val title: String? = null,
    val notes: String? = null,
    /** Stars, 0–5. Zero means unrated; the server clamps anything out of range. */
    val rating: Int? = null,
    val favorite: Boolean? = null,
    val addTags: List<String> = emptyList(),
    val removeTags: List<String> = emptyList(),
)

/** [action] is "delete" or "update"; [patch] is ignored for a delete. */
@Serializable
data class BulkRequest(
    val action: String,
    val ids: List<Long>,
    val patch: MediaPatch = MediaPatch(),
)

/**
 * Which ids the server actually applied the action to. One bad id doesn't sink the
 * batch, so the two lists are how the caller learns a partial result happened.
 */
@Serializable
data class BulkResponse(
    val ok: List<Long> = emptyList(),
    val failed: List<Long> = emptyList(),
)

@Serializable
data class KindStat(val kind: String, val count: Long = 0, val bytes: Long = 0)

@Serializable
data class Stats(
    val kinds: List<KindStat> = emptyList(),
    val items: Long = 0,
    val bytes: Long = 0,
    val tags: Long = 0,
)

@Serializable
data class PasswordRequest(
    val current: String,
    @SerialName("new") val newPassword: String,
)

/**
 * The APK this server is offering. [available] is false when the image was built
 * without one.
 *
 * There is no version number here, and that's deliberate: the server holds a file,
 * not a release manifest, and an operator can drop their own build into /config. So
 * the app decides whether an update is on offer by comparing [sha256] against the
 * hash of the APK it is itself running — a build that differs is a build worth
 * offering, and after installing it the two hashes agree and the offer goes away.
 */
@Serializable
data class ApkInfo(
    val available: Boolean = false,
    val size: Long = 0,
    val sha256: String = "",
    val modified: Long = 0,
    val filename: String = "oppailib.apk",
)

@Serializable
data class User(val id: Long, val username: String, val isAdmin: Boolean = false)

/**
 * [client] identifies this as the phone app rather than a browser.
 *
 * It is load-bearing, not decoration: the server idles browser sessions out after an
 * hour and drops them when it restarts. A phone is a device you own and signed in on
 * once — there is nobody at the keyboard to re-authenticate it — so the app says who
 * it is and the server exempts it from both rules.
 */
@Serializable
data class LoginRequest(
    val username: String,
    val password: String,
    val client: String = "android",
)

@Serializable
data class LoginResponse(val token: String, val user: User)

@Serializable
data class MediaListResponse(val items: List<Media> = emptyList())

/**
 * One backed-up save file for a game.
 *
 * Not a [Media]: a save is an attachment on a game, so it never appears in the
 * library grid, in search, or in tagging. [createdAt] is unix seconds.
 */
@Serializable
data class GameSave(
    val id: Long,
    val gameId: Long,
    val label: String = "",
    val size: Long = 0,
    val sha256: String = "",
    val createdAt: Long = 0,
)

@Serializable
data class GameSaveListResponse(val items: List<GameSave> = emptyList())

/** Whether a game ships a browser-playable build, and the file it starts at. */
@Serializable
data class GamePlayInfo(val playable: Boolean = false, val entry: String = "")

@Serializable
data class UploadResponse(val id: Long, val sha256: String, val deduped: Boolean)

/**
 * A resumable upload as the server sees it.
 *
 * [received] is the authoritative list of chunk indices it already holds. The client
 * sends the complement of that set — which is the whole reason an upload can survive
 * the app being killed halfway through a two-gigabyte video.
 */
@Serializable
data class UploadSession(
    val id: String,
    val filename: String = "",
    val title: String = "",
    val size: Long = 0,
    val chunkSize: Long = 0,
    val mime: String = "",
    val kind: String = "",
    val status: String = "open",
    val received: List<Int> = emptyList(),
    val receivedBytes: Long = 0,
    val chunkCount: Int = 0,
    val mediaId: Long = 0,
    val error: String = "",
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
)

@Serializable
data class UploadSessionList(val items: List<UploadSession> = emptyList())

@Serializable
data class CreateUploadRequest(
    val filename: String,
    val size: Long,
    val mime: String = "",
    val title: String = "",
    val kind: String = "",
    /** Name, size and last-modified: what makes a second attempt resume the first
        rather than upload the same file twice. */
    val fingerprint: String,
    val chunkSize: Long = 0,
)

@Serializable
data class CompleteUploadRequest(val sha256: String = "")

@Serializable
data class CompleteUploadResponse(
    val id: Long = 0,
    val sha256: String = "",
    val deduped: Boolean = false,
    val kind: String = "",
    val status: String = "",
)

@Serializable
data class AutotagResponse(val tags: List<MediaTag> = emptyList())

@Serializable
data class HealthResponse(
    val status: String,
    val aiEnabled: Boolean = false,
    val aiTagger: String = "",
)

@Serializable
data class ChatMessage(val role: String, val content: String)

@Serializable
data class ChatRequest(
    val mode: String,
    val messages: List<ChatMessage>,
    val emotion: String = "neutral",
    val intensity: Int = 1,
    val options: JsonObject = JsonObject(emptyMap()),
    val characterId: String = "libby",
    /** Tags and id for the photo attached to the newest user message. Text-only
        models receive the tags, while the id keeps that same photo out of replies. */
    val photoTags: List<String> = emptyList(),
    val photoImageId: String = "",
    /**
     * Pictures already seen in this conversation, oldest first. The server keeps no
     * memory between requests, so what has already been shown has to travel with the
     * turn — it is what stops the same photo coming back every reply.
     */
    val recentImageIds: List<String> = emptyList(),
    /**
     * The id of the outfit Libby is wearing on this device, empty for her bundled
     * artwork. Which outfit is worn is a per-device choice the server does not
     * store, so it has to be told — otherwise she describes the default sprite
     * while you are looking at something else. The server resolves the id to the
     * outfit's name itself.
     */
    val outfit: String = "",
)

@Serializable
data class LibbyLink(
    val id: Long,
    val title: String = "",
    val kind: String = "",
    val hasThumb: Boolean = false,
)

/**
 * Something Libby has offered to do.
 *
 * Nothing here has happened. The server parses these out of her reply and hands them
 * over as proposals; only [ApiService.libbyAct] performs one, and only an Allow button
 * calls that — so the user's press is the sole path by which anything she says changes
 * the library. [label] and [detail] are written server-side, so a card renders without
 * this client holding a table of action kinds.
 */
@Serializable
data class LibbyAction(
    val id: String = "",
    val kind: String = "",
    val label: String = "",
    val detail: String = "",
    val prompt: String = "",
    val url: String = "",
    val mediaId: Long = 0,
    val mediaTitle: String = "",
    val tags: List<String> = emptyList(),
)

/** The approved half of a [LibbyAction], as the act endpoint takes it. */
@Serializable
data class LibbyActRequest(
    val kind: String,
    val prompt: String = "",
    val url: String = "",
    val mediaId: Long = 0,
    val tags: List<String> = emptyList(),
)

/**
 * Something Libby wrote that was not addressed to you.
 *
 * "thought" is private — she thought it and did not say it. "aside" is her talking to
 * herself out loud, which you overhear. The distinction is whether you were meant to
 * have heard it, which is why it is two kinds and not one.
 */
@Serializable
data class LibbyThought(val kind: String = "thought", val text: String = "")

@Serializable
data class ChatResponse(
    /** What she actually said. Blank is legal — see [thoughts]. */
    val message: String = "",
    val emotion: String = "neutral",
    val intensity: Int = 1,
    val imageId: String = "",
    /** Library items this reply points at. The titles are already substituted into
        the prose server-side, so a client that does not draw chips still reads right. */
    val links: List<LibbyLink> = emptyList(),
    /** Things Libby has asked to do. Proposals only — a card with an Allow button is
        what turns one into an action. */
    val actions: List<LibbyAction> = emptyList(),
    /**
     * What she thought or muttered rather than said. Drawn as its own kind of entry
     * and never as speech. When [message] is blank and this is not, she looked at
     * something, had a reaction, and decided to say nothing — a turn, not a failure.
     */
    val thoughts: List<LibbyThought> = emptyList(),
    /**
     * True when the character stated its own mood rather than one being inferred.
     * A stated mood is applied as-is; an inferred one drifts by the session
     * multiplier. Absent from older servers, which is treated as inferred.
     */
    val declared: Boolean = false,
)

@Serializable
data class ChatStatus(
    val enabled: Boolean = false,
    val configured: Boolean = false,
    val model: String = "",
    val message: String = "",
    val modes: List<String> = emptyList(),
    val advancedOptions: Boolean = false,
    val modelBackend: Boolean = false,
    val modelManagement: Boolean = false,
    val contextLimit: Int = 0,
)

@Serializable
data class ChatModels(
    val models: List<String> = emptyList(),
    val loaded: String = "",
    val supported: Boolean = false,
)

@Serializable
data class LoadChatModelRequest(
    val modelName: String,
    val args: JsonObject = JsonObject(emptyMap()),
)

@Serializable
data class LoadChatModelResponse(val status: String = "", val loaded: String = "")

@Serializable
data class ChatProfile(
    val displayName: String = "",
    val persona: String = "",
    val avatarImageId: String = "",
)

@Serializable
data class ChatCharacter(
    val id: String,
    val name: String,
    val description: String = "",
    /** What they look like, written as picture tags. Also the likeness a shared
        photo is matched against, which is how they recognise a picture of themselves. */
    val appearance: String = "",
    val personality: String = "",
    /** What they are into. Colours how they flirt; never recited as a list. */
    val kinks: String = "",
    val scenario: String = "",
    val firstMessage: String = "",
    val exampleDialogue: String = "",
    val systemPrompt: String = "",
    val creatorNotes: String = "",
    val avatarImageId: String = "",
    val promptWeight: Double = 1.0,
    val defaultMode: String = "sweet",
    val builtIn: Boolean = false,
)

@Serializable
data class StoredChatMessage(
    val id: String,
    val role: String,
    val content: String,
    val at: Long,
    val imageId: String = "",
    /** Library items this message pointed at. Carried so a workspace round-trip
        through this client does not strip what the web UI draws as chips. */
    val links: List<LibbyLink> = emptyList(),
    /** Offers Libby made in this message, kept so the card survives a redraw. Whether
        one was approved is session state, deliberately not part of the log. */
    val actions: List<LibbyAction> = emptyList(),
    /** "thought" or "aside" when this entry is something she thought or muttered
        rather than said; blank for ordinary speech. Carried through this client
        because dropping it would turn a private thought back into a message
        addressed to the user on the next round-trip. */
    val thought: String = "",
)

@Serializable
data class ChatConversation(
    val id: String,
    val characterId: String,
    val title: String = "New conversation",
    val mode: String = "sweet",
    val emotion: String = "neutral",
    val intensity: Int = 1,
    val progress: Double = intensity.toDouble(),
    val options: JsonObject = JsonObject(emptyMap()),
    val messages: List<StoredChatMessage> = emptyList(),
    val createdAt: Long,
    val updatedAt: Long,
)

@Serializable
data class ChatImage(
    val id: String,
    val characterId: String,
    val name: String,
    val tags: List<String> = emptyList(),
    val mime: String = "image/jpeg",
    val createdAt: Long = 0,
)

@Serializable
data class ChatWorkspace(
    val profile: ChatProfile = ChatProfile(),
    val characters: List<ChatCharacter> = emptyList(),
    val conversations: List<ChatConversation> = emptyList(),
    val images: List<ChatImage> = emptyList(),
)

@Serializable
data class ChatImageUpload(
    val characterId: String,
    val name: String,
    val imageData: String,
    val tags: List<String> = emptyList(),
)

// ── image generation ─────────────────────────────────────────────────────────
// Mirrors the web client's shapes: /api/imagegen/status lists what the generator
// offers, /generate returns in-memory preview ids, /save files one into the library.

@Serializable
data class GenModel(
    val title: String,
    @SerialName("model_name") val modelName: String = "",
    val base: String = "",
    val defaults: GenModelDefaults? = null,
)

/** The generator's recommended settings for a model; applied when it's picked. */
@Serializable
data class GenModelDefaults(
    val steps: Int = 0,
    val cfgScale: Double = 0.0,
    val scheduler: String = "",
    val width: Int = 0,
    val height: Int = 0,
    val vae: String = "",
    /** A LoRA's recommended strength; zero on main models. */
    val weight: Double = 0.0,
)

/** The full editable record of a model or LoRA, mirrored from InvokeAI. */
@Serializable
data class GenModelMeta(
    val key: String,
    val name: String,
    val base: String = "",
    val type: String = "main",
    val description: String = "",
    val triggerPhrases: List<String> = emptyList(),
    val defaults: GenModelDefaults? = null,
)

/**
 * A partial edit to a model record. Like [MediaPatch], null fields are omitted by
 * the encoder and left unchanged server-side; [defaults] replaces the whole
 * recommended-settings blob when present.
 */
@Serializable
data class GenModelMetaPatch(
    val key: String,
    val name: String? = null,
    val description: String? = null,
    val triggerPhrases: List<String>? = null,
    val defaults: GenModelDefaults? = null,
)

// ── InvokeAI gallery ─────────────────────────────────────────────────────────

/** One gallery board. Board id "none" is InvokeAI's uncategorized pile. */
@Serializable
data class GalleryBoard(val id: String, val name: String, val count: Int = 0)

@Serializable
data class GalleryBoardsResponse(val boards: List<GalleryBoard> = emptyList())

@Serializable
data class GalleryImage(
    val name: String,
    val width: Int = 0,
    val height: Int = 0,
    val created: String = "",
)

@Serializable
data class GalleryPageResponse(val items: List<GalleryImage> = emptyList(), val total: Int = 0)

@Serializable
data class GallerySaveRequest(val name: String, val title: String = "", val tags: List<String> = emptyList())

/** Batch delete: several gallery images removed in one request. */
@Serializable
data class GalleryNamesRequest(val names: List<String>)

/** Move several gallery images onto a board ("none" clears their board). */
@Serializable
data class GalleryBoardRequest(val board: String, val names: List<String>)

// ── Civitai catalogue ────────────────────────────────────────────────────────

@Serializable
data class CivitaiVersion(
    val id: Long,
    val name: String = "",
    val base: String = "",
    val trainedWords: List<String> = emptyList(),
    val downloadUrl: String = "",
    val sizeMB: Long = 0,
    val images: List<String> = emptyList(),
)

@Serializable
data class CivitaiModel(
    val id: Long,
    val name: String = "",
    val type: String = "",
    val creator: String = "",
    val downloads: Long = 0,
    val likes: Long = 0,
    val versions: List<CivitaiVersion> = emptyList(),
)

@Serializable
data class CivitaiSearchResponse(
    val items: List<CivitaiModel> = emptyList(),
    val nextCursor: String = "",
)

@Serializable
data class CivitaiCategory(val name: String, val count: Long = 0)

@Serializable
data class CivitaiCategoriesResponse(val categories: List<CivitaiCategory> = emptyList())

@Serializable
data class CivitaiInstallRequest(val url: String)

/** One model download InvokeAI is running (or has finished). */
@Serializable
data class InstallJob(
    val id: Long = 0,
    val status: String = "",
    val source: String = "",
    val error: String = "",
    val bytes: Long = 0,
    val totalBytes: Long = 0,
)

@Serializable
data class InstallJobsResponse(val jobs: List<InstallJob> = emptyList())

// ── Libby outfits ────────────────────────────────────────────────────────────

/** A Libby outfit: a name plus which emotions/tiers have art uploaded. */
@Serializable
data class LibbyOutfit(
    val id: String,
    val name: String = "",
    /** Emotions with baseline (tier 0) art. */
    val emotions: List<String> = emptyList(),
    /** For each emotion, which horniness tiers (0..4) have art. */
    val emotionLevels: Map<String, List<Int>> = emptyMap(),
    /** Whether the cover endpoint will return a picture — an explicit cover, or any
        slot art to fall back on. Absent from older servers, which reads as false. */
    val hasThumb: Boolean = false,
    /** How many (emotion, tier) squares have art. What a card can honestly show. */
    val slots: Int = 0,
)

@Serializable
data class LibbyOutfitsResponse(val outfits: List<LibbyOutfit> = emptyList())

/** One durable fact Libby has kept about you, carried between conversations. */
@Serializable
data class LibbyMemory(
    val id: String,
    val text: String = "",
    /** When she noted it, epoch millis. */
    val at: Long = 0,
)

@Serializable
data class LibbyMemoryResponse(val memories: List<LibbyMemory> = emptyList())

/** One candidate poster frame. [image] is an inline data URL, so the whole strip
    arrives in a single response — every frame read costs a decrypt server-side. */
@Serializable
data class PosterFrame(val at: Double, val image: String = "")

@Serializable
data class PosterFramesResponse(val duration: Double = 0.0, val frames: List<PosterFrame> = emptyList())

/** [at] is an offset in seconds; the server re-renders the poster from that frame. */
@Serializable
data class SetPosterRequest(val at: Double)

@Serializable
data class LibbyOutfitSaveRequest(val id: String? = null, val name: String)

/** [imageData] is a data URL or bare base64 image, same as the web client sends. */
@Serializable
data class LibbyEmotionRequest(val imageData: String)

@Serializable
data class GenLora(
    val name: String,
    val alias: String = "",
    val triggerPhrases: List<String> = emptyList(),
)

@Serializable
data class GenVae(val key: String, val name: String, val base: String = "")

/** A prompt template (InvokeAI style preset); `prompt` may contain "{prompt}". */
@Serializable
data class GenTemplate(
    val id: String,
    val name: String,
    val prompt: String = "",
    val negativePrompt: String = "",
    /** True for presets that ship with the generator; false for the user's own.
        Built-ins are hidden by default in the picker. */
    val builtIn: Boolean = false,
)

@Serializable
data class GenCharacter(
    val id: String,
    val name: String,
    val prompt: String = "",
    val negativePrompt: String = "",
    val hasThumb: Boolean = false,
)

/** Create (empty/absent id) or update a character. [imageData] is an optional new
    thumbnail as a data URL; leaving it null keeps the existing one. */
@Serializable
data class SaveCharacterRequest(
    val id: String? = null,
    val name: String,
    val prompt: String = "",
    val negativePrompt: String = "",
    val imageData: String? = null,
)

/** A line for Libby to say around the app, with the pose she says it in
    (one of the emotion slots: neutral | happy | mischievous | surprised | thinking). */
data class MascotSay(val message: String, val emotion: String = "surprised")

/** Scan an image for booru tags (image is a data URL; never stored server-side). */
@Serializable
data class ScanImageRequest(val imageData: String)

@Serializable
data class ScanTag(val tag: String, val category: String = "", val score: Double = 0.0)

@Serializable
data class ScanImageResponse(val tags: List<ScanTag> = emptyList())

@Serializable
data class GenCharacterListResponse(val characters: List<GenCharacter> = emptyList())

@Serializable
data class ImageGenStatus(
    val enabled: Boolean = false,
    val reachable: Boolean = false,
    val backend: String = "",
    val error: String = "",
    val models: List<GenModel> = emptyList(),
    val loras: List<GenLora> = emptyList(),
    val vaes: List<GenVae> = emptyList(),
    val templates: List<GenTemplate> = emptyList(),
    val detailerAvailable: Boolean = false,
)

@Serializable
data class GenLoraPick(val name: String, val weight: Double)

@Serializable
data class DetailerRequest(
    val enabled: Boolean = false,
    val model: String = "face_yolov8n.pt",
    val prompt: String = "",
    val negativePrompt: String = "",
    val confidence: Double = 0.3,
    val denoise: Double = 0.4,
    val maskBlur: Int = 4,
)

@Serializable
data class GenerateRequest(
    val prompt: String,
    val negativePrompt: String = "",
    val checkpoint: String = "",
    val vae: String = "",
    val sampler: String = "",
    val steps: Int = 25,
    val width: Int = 512,
    val height: Int = 768,
    val cfgScale: Double = 7.0,
    val seed: Long = -1,
    val count: Int = 1,
    /** Which InvokeAI gallery board the finished images are filed into. */
    val board: String = "none",
    val loras: List<GenLoraPick> = emptyList(),
    val detailer: DetailerRequest? = null,
)

@Serializable
data class GenPreview(val id: String, val seed: Long = 0)

@Serializable
data class GenerateResponse(val images: List<GenPreview> = emptyList(), val prompt: String = "")

@Serializable
data class GenSaveRequest(val id: String, val title: String = "", val tags: List<String> = emptyList())

@Serializable
data class GenSaveResponse(val id: Long, val existed: Boolean = false)

@Serializable
data class TagSuggestions(val suggestions: List<String> = emptyList(), val correction: String = "")

@Serializable
data class UrlRequest(val url: String)

/** A tag the site's parser filed under a taxonomy (artist, character, parody, …). */
@Serializable
data class ScrapedTag(
    val name: String = "",
    val category: String = "general",
)

@Serializable
data class ScrapeResult(
    val title: String = "",
    val description: String = "",
    val tags: List<String> = emptyList(),
    val performers: List<String> = emptyList(),
    val mediaUrls: List<String> = emptyList(),
    val sourceUrl: String = "",
    val kind: String = "image",
    // Only populated by parsers that categorize. `tags` still holds the flat union
    // of every tag, so display can ignore this — but the import has to send it
    // back, since the server doesn't re-fetch the page when we supply mediaUrls.
    val categorizedTags: List<ScrapedTag> = emptyList(),
)

@Serializable
data class ScrapeImportRequest(
    val url: String? = null,
    val mediaUrls: List<String> = emptyList(),
    val title: String? = null,
    val tags: List<String> = emptyList(),
    val categorizedTags: List<ScrapedTag> = emptyList(),
)

@Serializable
data class ImportResponse(val imported: List<Long> = emptyList(), val count: Int = 0)

// ── remote sources ───────────────────────────────────────────────────────────

/** One ordering a feed offers. The first is the default. */
@Serializable
data class SourceSort(val id: String, val label: String)

/**
 * One browsable listing inside a source: a board, a category, a search.
 *
 * [query] marks a feed that needs a search term — the UI shows a search box for it
 * rather than browsing it blindly, since a term-less search is an error upstream, not
 * an empty page.
 */
@Serializable
data class SourceFeed(
    val id: String,
    val label: String,
    val query: Boolean = false,
    val sorts: List<SourceSort> = emptyList(),
)

@Serializable
data class RemoteSource(
    val id: String,
    val name: String,
    val feeds: List<SourceFeed> = emptyList(),
    /** Access declarations come from the adapter, not from a client-side guess. */
    val authentication: String = "unknown",
    val authNote: String? = null,
    val contentWarning: String? = null,
)

@Serializable
data class SourceListResponse(val sources: List<RemoteSource> = emptyList())

/**
 * An item that lives on the remote source and is *not* in the library. Every URL on
 * it is remote — the app never fetches them directly, it asks the server to proxy
 * them (see [Repository.sourceStreamUrl]).
 */
@Serializable
data class SourceItem(
    val id: String,
    val title: String = "",
    val kind: String = "image",
    val thumbUrl: String = "",
    val mediaUrl: String = "",
    val pageUrl: String = "",
    /**
     * Set when the item is a *container* — a 4chan thread — rather than a file. The
     * tile stands for a set, so opening it browses [feedId] instead of putting the
     * OP's image in the viewer.
     */
    val feedId: String = "",
    /**
     * The discussion this item was posted in, for sources that have one. A file from a
     * 4chan thread carries its thread's id, which is all the viewer needs to pull up
     * the conversation around the image on screen.
     */
    val threadId: String = "",
    /** This item's own post in that thread, so its comment can be marked in the list. */
    val postNo: Long = 0,
    /** How many files a container holds. Zero on anything else. */
    val count: Int = 0,
    val width: Int = 0,
    val height: Int = 0,
    val tags: List<String> = emptyList(),
) {
    val isContainer: Boolean get() = feedId.isNotEmpty()

    /** Whether there is a conversation to show for this item. */
    val hasComments: Boolean get() = threadId.isNotEmpty()
}

/** [cursor] is opaque; empty means there is nothing after this page. */
@Serializable
data class SourceListing(
    val items: List<SourceItem> = emptyList(),
    val cursor: String = "",
)

// ── server diagnostics ──────────────────────────────────────────────────────

/** One bounded latency histogram from the server. */
@Serializable
data class DiagnosticTiming(
    val name: String = "",
    val count: Long = 0,
    val avgMs: Double = 0.0,
    val p50Ms: Double = 0.0,
    val p95Ms: Double = 0.0,
    val p99Ms: Double = 0.0,
    val maxMs: Double = 0.0,
)

@Serializable
data class DiagnosticMetrics(
    val windowSeconds: Double = 0.0,
    val counters: Map<String, Long> = emptyMap(),
    val timings: List<DiagnosticTiming> = emptyList(),
)

/** Process, database, and route timing snapshot exposed to administrators. */
@Serializable
data class Diagnostics(
    val version: String = "",
    val uptimeSeconds: Double = 0.0,
    val goroutines: Int = 0,
    val heapMB: Double = 0.0,
    val sysMB: Double = 0.0,
    val gcCount: Long = 0,
    val numCpu: Int = 0,
    val dbWal: Boolean = false,
    val dbOpenConns: Int = 0,
    val dbInUse: Int = 0,
    val dbWaitCount: Long = 0,
    val dbWaitMs: Long = 0,
    val metrics: DiagnosticMetrics = DiagnosticMetrics(),
)

// ── server storage ──────────────────────────────────────────────────────────

@Serializable
data class StorageItem(
    val label: String = "",
    val bytes: Long = 0,
    val count: Long = 0,
    val note: String? = null,
)

@Serializable
data class StorageMapping(
    val key: String = "",
    val label: String = "",
    val path: String = "",
    val env: String = "",
    val purpose: String = "",
    val exists: Boolean = false,
    val writable: Boolean = false,
    val freeBytes: Long = 0,
    val totalBytes: Long = 0,
    val usedBytes: Long = 0,
    val error: String? = null,
    val contents: List<StorageItem> = emptyList(),
)

@Serializable
data class StorageReport(
    val mappings: List<StorageMapping> = emptyList(),
    val pendingBytes: Long = 0,
    val warnings: List<String> = emptyList(),
    val reclaimable: List<StorageItem> = emptyList(),
    val warnPercent: Int = 0,
)

@Serializable
data class StorageCleanupRequest(val categories: List<String> = emptyList())

@Serializable
data class StorageCleanupResponse(
    val freedBytes: Long = 0,
    val freedHuman: String = "",
    val categories: List<String> = emptyList(),
    val storage: StorageReport = StorageReport(),
)

@Serializable
data class SourcePagesResponse(val pages: List<String> = emptyList(), val count: Int = 0)

/**
 * One post in a source's discussion thread.
 *
 * Flat rather than nested: a 4chan post quotes by number and can quote several posts
 * at once, so the conversation is a graph. [quotes] carries those numbers and the list
 * renders in post order — which is how the site itself shows a thread.
 */
@Serializable
data class SourceComment(
    val no: Long = 0,
    val time: Long = 0,
    val name: String = "",
    val subject: String = "",
    val text: String = "",
    val thumbUrl: String = "",
    val mediaUrl: String = "",
    /**
     * The post's upload described as an item — the same [SourceItem.kind] vocabulary,
     * and the id the feed knows that file by. Both empty when the post has no file.
     *
     * 4chan renders a JPEG thumbnail for everything, so [thumbUrl] alone can't tell a
     * webm from a photo: [kind] is how a video gets a play badge, and [itemId] is how
     * tapping it lands on that exact item rather than something that looks like it.
     */
    val kind: String = "",
    val itemId: String = "",
    val quotes: List<Long> = emptyList(),
    val op: Boolean = false,
)

@Serializable
data class SourceCommentsResponse(
    val comments: List<SourceComment> = emptyList(),
    val count: Int = 0,
)

@Serializable
data class SourceSaveRequest(
    val mediaUrl: String? = null,
    val itemId: String? = null,
    val pageUrl: String? = null,
    val title: String? = null,
    val kind: String? = null,
    val tags: List<String> = emptyList(),
)
